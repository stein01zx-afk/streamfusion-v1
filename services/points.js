import * as database from './database.js';
import * as liveSession from './live-session.js';
import { findVoiceRuleByAlias, getVoiceRuleOptions } from './voice-rules.js';
import crypto from 'node:crypto';

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
  voicePowerRules: [],
};

const clampInt = (value, min=0, max=1000000) => Math.min(max, Math.max(min, Number.parseInt(value,10) || 0));
const norm = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'');
const platformOf = (p) => { const value=String(p||'tiktok').toLowerCase(); return value==='twitch'?'twitch':value==='both'?'both':'tiktok'; };
const platformMatches = (configured, actual) => configured==='both' || configured===actual;

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
  out.voicePower.source = ['gift','points','activity','any'].includes(out.voicePower.source)?out.voicePower.source:'gift';
  out.voicePower.platform = platformOf(out.voicePower.platform);
  out.voicePower.commandPrefix = ['@','.','/','-'].includes(String(out.voicePower.commandPrefix||'')) ? String(out.voicePower.commandPrefix) : '.';
  out.voicePower.amount = clampInt(out.voicePower.amount,1,1000000);
  out.voicePower.bitsAmount = clampInt(out.voicePower.bitsAmount || out.voicePower.amount,1,100000000);
  out.voicePower.pointCost = clampInt(out.voicePower.pointCost,1,100000000);
  out.voicePower.activity = ['like','share','follow','moderator'].includes(out.voicePower.activity)?out.voicePower.activity:'follow';
  out.voicePower.commandCaseSensitive = out.voicePower.commandCaseSensitive === true;
  const legacy = out.voicePower || {};
  let rules = Array.isArray(input.voicePowerRules) ? input.voicePowerRules : [];
  if (!rules.length && legacy.enabled) {
    rules = [{
      id: `legacy-${crypto.createHash('sha1').update(JSON.stringify(legacy)).digest('hex').slice(0,10)}`,
      source: legacy.source || 'gift', platform: legacy.platform || 'tiktok',
      voiceKey: legacy.targetVoiceKey || legacy.voiceKey || legacy.targetKey || '',
      voiceLabel: legacy.targetVoiceLabel || legacy.targetLabel || '',
      activationKey: legacy.activationKey || legacy.targetKey || '',
      activationLabel: legacy.activationLabel || legacy.targetLabel || '',
      targetKey: legacy.targetKey || '', targetLabel: legacy.targetLabel || '',
      amount: legacy.amount || 1, pointCost: legacy.pointCost || 1, activity: legacy.activity || 'follow',
      commandPrefix: legacy.commandPrefix || '.', commandCaseSensitive: legacy.commandCaseSensitive === true,
      consumePoints: legacy.consumePoints !== false, active: true, createdAt: Date.now()
    }];
  }
  out.voicePowerRules = rules.map((r) => ({
    id: String(r?.id || crypto.randomUUID()),
    source: ['gift','points','activity','any'].includes(String(r?.source||'')) ? String(r.source) : 'points',
    platform: platformOf(r?.platform),
    voiceKey: String(r?.voiceKey || '').trim(), voiceLabel: String(r?.voiceLabel || '').trim(),
    activationKey: String(r?.activationKey || r?.targetKey || '').trim(),
    activationLabel: String(r?.activationLabel || r?.targetLabel || '').trim(),
    targetKey: String(r?.targetKey || '').trim(), targetLabel: String(r?.targetLabel || '').trim(),
    amount: clampInt(r?.amount,1,100000000), pointCost: clampInt(r?.pointCost,1,100000000),
    activity: ['like','share','follow','moderator'].includes(String(r?.activity||'')) ? String(r.activity) : 'follow',
    commandPrefix: ['@','.','/','-'].includes(String(r?.commandPrefix||'')) ? String(r.commandPrefix) : '.',
    commandCaseSensitive: r?.commandCaseSensitive === true, consumePoints: r?.consumePoints !== false,
    active: r?.active !== false, createdAt: Number(r?.createdAt || Date.now()), updatedAt: Number(r?.updatedAt || Date.now())
  })).filter((r) => r.voiceKey);
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

function normalizeCommandPrefix(value){ const v=String(value||'.').trim(); return ['@','.','/','-'].includes(v)?v:'.'; }
function resolvePowerRuleForCommand(ownerId, text, rules){
  const raw=String(text||'').trim(); if(!raw) return null;
  for(const rule of rules.filter(r=>r.active && r.source==='points')){
    const prefix=normalizeCommandPrefix(rule.commandPrefix); if(!raw.startsWith(prefix)) continue;
    const rest=raw.slice(prefix.length).trim(); if(!rest) continue;
    const firstTokens=rest.split(/\s+/);
    for(let n=Math.min(firstTokens.length,6); n>=1; n--){
      const token=firstTokens.slice(0,n).join(' ');
      const match=findVoiceRuleByAlias(ownerId, token);
      const tokenNorm=token.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'').replace(/\s+/g,'');
      const ruleNorm=[rule.activationKey,rule.activationLabel,rule.voiceLabel].map(v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'')).filter(Boolean);
      const matchesRule = match && match.voiceKey===rule.voiceKey || ruleNorm.includes(tokenNorm);
      if(matchesRule){
        const remaining=firstTokens.slice(n).join(' ').trim();
        return {rule, remaining, voiceKey:rule.voiceKey, voiceLabel:rule.voiceLabel || match?.voiceLabel || token};
      }
    }
  }
  return null;
}

function currentGiftMatchesRule(payload, rule){
  const candidates=[payload?.giftId,payload?.giftKey,payload?.gift,payload?.giftName,payload?.giftAlt].map(norm).filter(Boolean);
  const target=norm(rule?.targetKey || rule?.activationKey);
  if(!target) return false;
  const amount=Math.max(1,Number(payload?.amount||1)||1);
  return candidates.includes(target) && amount>=Number(rule?.amount||1);
}

function activityMatchesRule(payload, rule, ownerId, platform, username, nextProfile, followFirstTime){
  if(!platformMatches(rule.platform,platform)) return false;
  const current=userSettings(ownerId);
  const kind=classify(ownerId,payload,current).kind;
  const isMod=isConfiguredModerator(ownerId,platform,username,current);
  if(rule.activity==='follow') return Boolean(nextProfile?.followedBefore || followFirstTime);
  if(rule.activity==='moderator') return isMod;
  if(rule.activity==='like' && kind==='like') {
    const units=clampInt(payload?.likes ?? payload?.amount ?? 1,1,100000);
    liveSession.recordActivity(ownerId,platform,username,'like',units);
    return liveSession.getActivityCount(ownerId,platform,username,'like')>=Number(rule.amount||1);
  }
  if(rule.activity==='share' && kind==='share') {
    liveSession.recordActivity(ownerId,platform,username,'share',1);
    return liveSession.getActivityCount(ownerId,platform,username,'share')>=Number(rule.amount||1);
  }
  return false;
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
  if(username) liveSession.recordViewerActivity(ownerId, platform, username);
  const profile=username ? database.touchViewerProfile(ownerId,platform,username,displayName,payload?.avatarUrl || payload?.avatar || payload?.profileImageUrl || '') : null;
  const liveBadgeType = classified.kind === 'follow' ? 'follow' : classified.kind === 'share' ? 'share' : classified.kind === 'like' ? 'like' : classified.kind === 'gift' ? 'gift' : null;
  if(username && liveBadgeType) liveSession.addBadge(ownerId, platform, username, liveBadgeType);
  if(username && (classified.kind === 'comment' || classified.kind === 'chat')) { /* keep current LIVE badges attached to normal chat */ }
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
    liveSession.addBadge(ownerId, platform, username, 'donor');
    const giftImage=String(payload?.giftImage || payload?.gift?.image || payload?.gift?.url || payload?.gift?.imageUrl || '').trim();
    const giftName=String(payload?.giftName || (typeof payload?.gift === 'string' ? payload.gift : payload?.gift?.name) || payload?.giftAlt || 'Regalo').trim();
    if(giftImage || giftName){
      liveSession.addBadge(ownerId, platform, username, 'gift-image', {
        image:giftImage, name:giftName, key:String(payload?.giftId || payload?.giftKey || payload?.giftName || payload?.giftAlt || '').trim(), id:String(payload?.giftId || '').trim()
      });
    }
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
  let voicePowerAssignment=null;
  let voicePowerPointsSpent=0;
  const powerRules = Array.isArray(pointsCfg.voicePowerRules) ? pointsCfg.voicePowerRules : [];
  if(username){
    const existing=liveSession.getPower(ownerId,platform,username);
    const rawComment=classified.kind==='comment' ? String(payload?.message || '').trim() : '';
    const existingPower = existing || null;
    if(rawComment){
      const prefixRule = resolvePowerRuleForCommand(ownerId, rawComment, powerRules);
      if(/^\.[Bb]orrar(?:\s|$)/i.test(rawComment) || powerRules.some(r=>{ const p=normalizeCommandPrefix(r.commandPrefix); return rawComment.toLowerCase()===`${p}borrar`.toLowerCase(); })){
        liveSession.removePower(ownerId,platform,username);
        payload = {...payload, message: ''};
      } else if(prefixRule && platformMatches(prefixRule.rule.platform,platform)){
        const cost=Number(prefixRule.rule.pointCost||0);
        const balance=Number(database.getPoints(ownerId,platform,username)?.points ?? account?.points ?? 0);
        if(cost<=0 || balance>=cost){
          if(cost>0 && prefixRule.rule.consumePoints!==false){
            const spent=database.spendPoints(ownerId,platform,username,cost);
            if(spent) voicePowerPointsSpent=cost;
            else { payload = {...payload, voicePowerDenied:true, voicePowerReason:'insufficient-points'}; }
          }
          const result=upsertPowerUser(ownerId,current,payload,'points',Math.max(0,balance-cost));
          if(result.changed){
            const entry=liveSession.grantPower(ownerId,platform,username,{ voiceKey:prefixRule.voiceKey, voiceLabel:prefixRule.voiceLabel, ruleId:prefixRule.rule.id, source:'points-command', badge:'🔥', grantedAt:Date.now(), points:Math.max(0,balance-cost) });
            unlocked=true; voicePowerAssignment=entry;
          }
          payload = {...payload, message: prefixRule.remaining};
        } else {
          payload = {...payload, message: '' , voicePowerDenied:true, voicePowerReason:'insufficient-points'};
        }
      }
    }

    if(!liveSession.hasPower(ownerId,platform,username)){
      for(const rule of powerRules.filter(r=>r.active && r.source!=='points')){
        let match=false;
        if(rule.source==='any') match=platformMatches(rule.platform,platform);
        else if(rule.source==='gift') match=currentGiftMatchesRule(payload,rule) && platformMatches(rule.platform,platform);
        else if(rule.source==='activity') match=activityMatchesRule(payload,rule,ownerId,platform,username,nextProfile,followFirstTime);
        if(!match) continue;
        const balance=Number(database.getPoints(ownerId,platform,username)?.points ?? account?.points ?? 0);
        if(rule.consumePoints!==false && Number(rule.pointCost||0)>0){
          if(balance<Number(rule.pointCost)) continue;
          const spent=database.spendPoints(ownerId,platform,username,Number(rule.pointCost));
          if(!spent) continue;
          voicePowerPointsSpent=Number(rule.pointCost);
        }
        voicePowerAssignment=liveSession.grantPower(ownerId,platform,username,{ voiceKey:rule.voiceKey, voiceLabel:rule.voiceLabel, ruleId:rule.id, source:rule.source, badge:'🔥', grantedAt:Date.now(), points:Math.max(0,balance-Number(rule.pointCost||0)) });
        unlocked=Boolean(voicePowerAssignment);
        break;
      }
    }
  }

  const out={...payload};
  const rawType=norm(payload?.type || payload?.event || payload?.action || '');
  if(username && (rawType.includes('join') || rawType.includes('member'))) liveSession.addBadge(ownerId, platform, username, 'join');
  const liveBadges=username ? liveSession.getBadges(ownerId, platform, username) : null;
  const outBadges=Array.isArray(payload.badges)?[...payload.badges]:[];
  if(username && isConfiguredModerator(ownerId,platform,username,current) && !outBadges.some(b=>norm(b)==='moderator'||norm(b)==='mod')) outBadges.push('moderator');
  if(nextProfile?.followedBefore && !outBadges.some(b=>String(b||'')==='👤'||norm(b)==='follow'||norm(b)==='follower')) outBadges.push('follow');
  if(nextProfile?.everDonated && !outBadges.some(b=>norm(b)==='donor'||norm(b)==='supporter'||String(b)==='🎁')) outBadges.push('donor');
  if(liveBadges?.joined && !outBadges.includes('join')) outBadges.push('join');
  if(liveBadges?.liked && !outBadges.includes('like')) outBadges.push('like');
  if(liveBadges?.shared && !outBadges.includes('share')) outBadges.push('share');
  const activePower = username ? liveSession.getPower(ownerId,platform,username) : null;
  if(activePower){
    if(!outBadges.some(b=>norm(b)==='voicepower'||norm(b)==='voice-power'||String(b)==='🔥')) outBadges.push('voice-power');
    out.voicePower=true;
    out.voicePowerVoiceKey=activePower.voiceKey || '';
    out.voicePowerVoiceLabel=activePower.voiceLabel || '';
    out.voicePowerRuleId=activePower.ruleId || '';
  }
  out.badges=outBadges;
  if(liveId) out.liveId=liveId;
  if(nextProfile){ out.viewer={ followedBefore:nextProfile.followedBefore, everDonated:nextProfile.everDonated, donorBadge:nextProfile.everDonated, liveId, liveBadges: liveBadges || {joined:false,followed:false,liked:false,shared:false,donor:false,giftBadge:null}, giftBadge: liveBadges?.giftBadge || null }; }
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
  const firstRule = Array.isArray(normalized.voicePowerRules) ? normalized.voicePowerRules.find(r=>r.active) : null;
  settings.voiceBot={...(settings.voiceBot||{}), power: structuredClone(firstRule ? {
    enabled:true, source:firstRule.source, platform:firstRule.platform, targetKey:firstRule.targetKey,
    targetLabel:firstRule.targetLabel, amount:firstRule.amount, pointCost:firstRule.pointCost,
    activity:firstRule.activity, commandPrefix:firstRule.commandPrefix, commandCaseSensitive:firstRule.commandCaseSensitive,
    consumePoints:firstRule.consumePoints, targetVoiceKey:firstRule.voiceKey, targetVoiceLabel:firstRule.voiceLabel,
  } : normalized.voicePower)};
  // Active voice-power grants belong to the current LIVE only; never persist them in user settings.
  if (settings.voiceBot?.powerUsers) delete settings.voiceBot.powerUsers;
  database.saveUserSettings(ownerId,settings);
  return normalized;
}
