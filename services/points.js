import * as database from './database.js';
import * as liveSession from './live-session.js';

const DEFAULT_POINTS = {
  enabled: true,
  tiktok: { follow:100, comment:2, like:1, share:1, giftPer10Coins:1, subscription:250 },
  twitch: { follow:100, comment:2, like:0, share:0, bitsPer10:1, subscription:250, giftSubscription:250 },
  limits: { maxAwardPerEvent:1000 },
  voicePower: {
    enabled:false,
    source:'gift',
    platform:'tiktok',
    targetKey:'',
    targetLabel:'',
    amount:1,
    pointCost:1000,
    activity:'follow',
    commandPrefix:'.',
    commandCaseSensitive:false,
    consumePoints:true,
  },
};

const clampInt = (value, min=0, max=1000000) => Math.min(max, Math.max(min, Number.parseInt(value,10) || 0));
const norm = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'');
const platformOf = (p) => String(p||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok';

export function defaultPointsConfig(){ return structuredClone(DEFAULT_POINTS); }
export function normalizePointsConfig(input){
  const base = structuredClone(DEFAULT_POINTS);
  if (!input || typeof input !== 'object') return base;
  const out = {
    ...base,
    ...input,
    tiktok:{...base.tiktok,...(input.tiktok||{})},
    twitch:{...base.twitch,...(input.twitch||{})},
    limits:{...base.limits,...(input.limits||{})},
    voicePower:{...base.voicePower,...(input.voicePower||{})},
  };
  out.enabled = out.enabled !== false;
  out.voicePower.enabled = out.voicePower.enabled === true;
  out.voicePower.source = ['gift','points','activity'].includes(out.voicePower.source)?out.voicePower.source:'gift';
  out.voicePower.platform = platformOf(out.voicePower.platform);
  out.voicePower.commandPrefix = String(out.voicePower.commandPrefix || '.').slice(0,4);
  out.voicePower.amount = clampInt(out.voicePower.amount,1,1000000);
  out.voicePower.pointCost = clampInt(out.voicePower.pointCost,1,100000000);
  out.voicePower.activity = ['like','subscription','follow','moderator'].includes(out.voicePower.activity)?out.voicePower.activity:'follow';
  out.voicePower.consumePoints = out.voicePower.consumePoints !== false;
  return out;
}

function userSettings(ownerId){ return database.getUserSettings(ownerId) || {}; }
function isConfiguredModerator(ownerId, platform, identity, settings){
  const key = norm(identity);
  if (!key) return false;
  const configured = Array.isArray(settings?.[platform==='twitch'?'twitchModerators':'tiktokModerators']) ? settings[platform==='twitch'?'twitchModerators':'tiktokModerators'] : [];
  return configured.some(v => norm(v) === key);
}

function classify(ownerId, payload, settings){
  const platform = platformOf(payload?.platform);
  const type = norm(payload?.type || payload?.event || payload?.action || '');
  const group = norm(payload?.group || '');
  if (type.includes('follow') || group.includes('follow')) return {kind:'follow',units:1};
  if (type.includes('like') || group.includes('like')) return {kind:'like',units:clampInt(payload?.likes ?? payload?.amount ?? 1,1,100000)};
  if (type.includes('share') || group.includes('share')) return {kind:'share',units:1};
  if (type.includes('sub') || type.includes('subscription') || type.includes('resub') || group.includes('subscription') || norm(payload?.twitchGiftType||'').includes('subscription')) return {kind:'subscription',units:clampInt(payload?.amount ?? payload?.months ?? 1,1,100)};
  if (type.includes('cheer') || type.includes('bits') || platform==='twitch' && Number(payload?.bits)>0) return {kind:'bits',units:clampInt(payload?.bits ?? payload?.amount ?? 1,1,100000000)};
  if (type.includes('gift') || group.includes('gift') || payload?.gift || payload?.giftName) {
    const coins = clampInt(payload?.giftCoins ?? payload?.coins ?? 0,0,100000000);
    return {kind:'gift',units:Math.max(1, clampInt(payload?.amount ?? 1,1,100000)) , coins};
  }
  if (payload?.source==='chat' || type==='chat' || type.includes('comment') || type.includes('message')) return {kind:'comment',units:1};
  const identity = payload?.uniqueId || payload?.username || payload?.user || payload?.displayName;
  if (isConfiguredModerator(ownerId, platform, identity, settings)) return {kind:'moderator',units:1};
  return {kind:'other',units:0};
}

function awardAmount(platform, classified, cfg){
  const c = cfg[platform] || {};
  switch (classified.kind) {
    case 'follow': return clampInt(c.follow);
    case 'comment': return clampInt(c.comment);
    case 'like': return clampInt(c.like) * classified.units;
    case 'share': return clampInt(c.share) * classified.units;
    case 'subscription': return clampInt(c.subscription) * classified.units;
    case 'bits': return clampInt(c.bitsPer10) * Math.floor(classified.units / 10);
    case 'gift': return clampInt(c.giftPer10Coins) * Math.max(1, Math.floor((classified.coins || 0) / 10));
    default: return 0;
  }
}

function findGiftMatch(payload, targetKey=''){
  const candidates = [payload?.giftId,payload?.giftKey,payload?.gift,payload?.giftName,payload?.giftAlt,payload?.twitchGiftType].map(norm).filter(Boolean);
  const target = norm(targetKey);
  return Boolean(target && candidates.includes(target));
}

function voicePowerState(settings){
  const fallback = settings?.points?.voicePower && typeof settings.points.voicePower==='object' ? settings.points.voicePower : {};
  const botPart = settings?.voiceBot?.power && typeof settings.voiceBot.power==='object' ? settings.voiceBot.power : {};
  const power = { ...DEFAULT_POINTS.voicePower, ...fallback, ...botPart };
  return { ...power, enabled:power.enabled===true, commandPrefix:String(power.commandPrefix||'.').slice(0,4) };
}

export function userHasVoicePower(ownerId, platform, identity){
  return liveSession.hasPower(ownerId, platform, identity);
}

function upsertPowerUser(ownerId, settings, payload, trigger, pointsAfter=0){
  const platform=platformOf(payload?.platform);
  const username=String(payload?.uniqueId || payload?.username || payload?.user || payload?.displayName || '').trim();
  if(!username) return {changed:false,entry:null};
  const displayName=String(payload?.displayName || payload?.user || payload?.username || username).trim();
  const entry=liveSession.grantPower(ownerId,platform,username,{ username, displayName, badge:'🔥', grantedAt:Date.now(), source:trigger, points:pointsAfter });
  return {changed:Boolean(entry),entry};
}

export function processLivePayload(ownerId, payload){
  if (!ownerId || !payload || typeof payload!=='object') return payload;
  const current=userSettings(ownerId);
  const pointsCfg=normalizePointsConfig(current.points||{});
  const effectivePower=voicePowerState(current);
  const platform=platformOf(payload.platform);
  const classified=classify(ownerId,payload,current);
  const username=String(payload?.uniqueId || payload?.username || payload?.user || payload?.displayName || '').trim();
  const displayName=String(payload?.displayName || payload?.user || payload?.username || username).trim();
  const profile=username ? database.getViewerProfile(ownerId,platform,username,displayName) : null;
  const liveId=liveSession.getLiveId(ownerId,platform) || String(payload?.liveId||'');

  // Persistent identity rules: follow reward is granted once ever; donor status is permanent.
  let followFirstTime=false;
  if(classified.kind==='follow' && username && profile && !profile.followedBefore){
    followFirstTime=true;
    database.markViewerFollow(ownerId,platform,username,displayName);
  }
  const isDonation = ['gift','bits','subscription'].includes(classified.kind);
  if(isDonation && username){
    database.markViewerDonated(ownerId,platform,username,displayName,1);
  }
  const nextProfile=username ? database.getViewerProfile(ownerId,platform,username,displayName) : null;

  let account=null;
  let added=0;
  if(pointsCfg.enabled){
    const rawAward=awardAmount(platform,classified,pointsCfg);
    // Follow points are one-time historically, everything else follows the configured live rules.
    added=Math.min(followFirstTime || classified.kind!=='follow' ? rawAward : 0, pointsCfg.limits.maxAwardPerEvent || 1000);
    if(username && added>0) account=database.addPoints(ownerId,platform,username,displayName,added,classified.kind);
  }

  let unlocked=false;
  if(effectivePower.enabled && username){
    const power=effectivePower;
    const existing=userHasVoicePower(ownerId,platform,username);
    if(!existing){
      let match=false;
      if(power.source==='gift'){
        const target=norm(String(power.targetKey||''));
        const amount=Number(payload?.amount||1)||1;
        const bits=Number(payload?.bits||payload?.amount||0)||0;
        const type=norm(payload?.type || payload?.event || payload?.action || '');
        if(platform==='twitch' && target==='bits') match=(type.includes('bits')||type.includes('cheer')||bits>0) && bits>=Number(power.amount||1);
        else if(platform==='twitch' && (target==='subscription'||target==='subscriptiongift')) match=(type.includes('sub')||type.includes('subscription')) && amount>=Number(power.amount||1);
        else if(platform==='tiktok' && findGiftMatch(payload,target)) match=amount>=Number(power.amount||1);
      } else if(power.source==='points'){
        const balance=Number(account?.points ?? database.getPoints(ownerId,platform,username)?.points ?? 0);
        match=balance>=Number(power.pointCost||1);
        if(match && power.consumePoints) database.spendPoints(ownerId,platform,username,Number(power.pointCost||1));
      } else if(power.source==='activity'){
        if(platform===power.platform){
          const t=norm(payload?.type || payload?.event || payload?.action || '');
          const isMod=isConfiguredModerator(ownerId,platform,username,current) || (Array.isArray(payload?.badges) && payload.badges.some(b=>norm(b).includes('moderator') || norm(b)==='mod'));
          match=power.activity==='follow' ? t.includes('follow') && followFirstTime : power.activity==='like' ? t.includes('like') : power.activity==='subscription' ? (t.includes('sub')||t.includes('subscription')) : power.activity==='moderator' ? isMod : false;
        }
      }
      if(match){
        const pointsAfter=Number(database.getPoints(ownerId,platform,username)?.points ?? 0);
        const result=upsertPowerUser(ownerId,current,payload,power.source,pointsAfter);
        unlocked=result.changed;
      }
    }
  }

  const out={...payload};
  const outBadges=Array.isArray(payload.badges)?[...payload.badges]:[];
  if(username && isConfiguredModerator(ownerId,platform,username,current) && !outBadges.some(b=>norm(b)==='moderator'||norm(b)==='mod')) outBadges.push('moderator');
  if(nextProfile?.everDonated && !outBadges.some(b=>norm(b)==='donor'||norm(b)==='supporter'||String(b)==='🎁')) outBadges.push('donor');
  if(username && userHasVoicePower(ownerId,platform,username)){
    if(!outBadges.some(b=>norm(b)==='voicepower'||norm(b)==='voice-power'||String(b)==='🔥')) outBadges.push('voice-power');
    out.voicePower=true;
  }
  out.badges=outBadges;
  if(liveId) out.liveId=liveId;
  if(nextProfile){ out.viewer={ followedBefore:nextProfile.followedBefore, everDonated:nextProfile.everDonated, donorBadge:nextProfile.everDonated }; }
  if(account) out.pointsAwarded=added;
  if(username) out.pointsBalance=database.getPoints(ownerId,platform,username)?.points ?? account?.points ?? 0;
  out.followRewarded=followFirstTime;
  if(unlocked) out.voicePowerUnlocked=true;
  return out;
}

export function getConfigForUser(ownerId){
  const settings = userSettings(ownerId);
  const merged = normalizePointsConfig(settings.points||{});
  if (!settings.points?.voicePower && settings.voiceBot?.power) merged.voicePower = {...merged.voicePower, ...settings.voiceBot.power};
  return merged;
}
export function setConfigForUser(ownerId, cfg){
  const settings=userSettings(ownerId);
  const normalized=normalizePointsConfig(cfg);
  settings.points=normalized;
  settings.voiceBot={...(settings.voiceBot||{}), power: structuredClone(normalized.voicePower)};
  // Active voice-power grants belong to the current LIVE only; never persist them in user settings.
  if (settings.voiceBot?.powerUsers) delete settings.voiceBot.powerUsers;
  database.saveUserSettings(ownerId,settings);
  return normalized;
}
