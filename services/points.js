import * as database from './database.js';
import * as liveSession from './live-session.js';
import { findVoiceRuleFromComment } from './voice-rules.js';

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
    powerRules:[],
  },
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
  out.voicePower.powerRules = (Array.isArray(out.voicePower.powerRules) ? out.voicePower.powerRules : []).map((r)=>{
    const rule={...r};
    rule.id=String(rule.id||`vpr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
    rule.platform=platformOf(rule.platform);
    rule.source=['points','gift','activity','any'].includes(String(rule.source||''))?String(rule.source):'points';
    rule.voiceKey=String(rule.voiceKey||'').trim();
    rule.voiceLabel=String(rule.voiceLabel||'').trim();
    rule.commandPrefix=['@','.','/','-'].includes(String(rule.commandPrefix||''))?String(rule.commandPrefix):'.';
    rule.pointCost=clampInt(rule.pointCost,1,100000000);
    rule.amount=clampInt(rule.amount,1,100000000);
    rule.activity=['like','share','follow','moderator','subscription'].includes(String(rule.activity||''))?String(rule.activity):'follow';
    rule.giftKey=String(rule.giftKey||rule.targetKey||'').trim();
    rule.giftLabel=String(rule.giftLabel||rule.targetLabel||'').trim();
    rule.active=rule.active!==false;
    rule.createdAt=Number(rule.createdAt||Date.now());
    rule.updatedAt=Number(rule.updatedAt||Date.now());
    return rule;
  }).filter(r=>r.id);
  out.voicePower.commandCaseSensitive = out.voicePower.commandCaseSensitive === true;
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

function upsertPowerUser(ownerId, settings, payload, trigger, pointsAfter=0, rule=null, resolvedVoice=null){
  const platform=platformOf(payload?.platform);
  const username=String(payload?.uniqueId || payload?.username || payload?.user || payload?.displayName || '').trim();
  if(!username) return {changed:false,entry:null};
  const displayName=String(payload?.displayName || payload?.user || payload?.username || username).trim();
  const nextEntry={ username, displayName, badge:'🔥', grantedAt:Date.now(), source:trigger, points:pointsAfter,
    ruleId:String(rule?.id||''), voiceKey:String(resolvedVoice?.voiceKey||'verity'), voiceLabel:String(resolvedVoice?.voiceLabel||'').trim(), commandPrefix:String(rule?.commandPrefix||'.'),
    ruleSource:String(rule?.source||trigger||''), active:true };
  const current=liveSession.getPowerUsers(ownerId,platform).find((u)=>String(u?.username||'').toLowerCase()===username.toLowerCase());
  const changed=!current || String(current.voiceKey||'')!==String(nextEntry.voiceKey||'') || String(current.ruleId||'')!==String(nextEntry.ruleId||'');
  const entry=liveSession.grantPower(ownerId,platform,username,nextEntry);
  return {changed,entry};
}

function normVoicePrefix(value){ return String(value||'').trim().slice(0,4); }
function parseVoicePowerCommand(text, rules=[], ownerId=''){
  const raw=String(text||'').trim(); if(!raw) return null;
  const candidates=rules.filter(r=>r?.active!==false);
  for(const rule of candidates){
    const prefix=normVoicePrefix(rule.commandPrefix||'.');
    if(!prefix || !raw.startsWith(prefix)) continue;
    const after=raw.slice(prefix.length).trim();
    if(/^borrar$/iu.test(after)) return {clear:true,rule};
    if(!after) continue;

    // El comando de Poder de Voz solo activa la voz cuando el mensaje es
    // exactamente "<prefijo><voz>". No debe llevar texto adicional.
    const voiceRule=findVoiceRuleFromComment(after,ownerId);
    if(!voiceRule) continue;
    const aliases=Array.isArray(voiceRule.aliases) ? voiceRule.aliases : [];
    const normalizedAfter=norm(after);
    const exactAlias=aliases.some(alias => norm(alias)===normalizedAfter);
    if(!exactAlias) continue;

    return {rule, clear:false, voiceKey:String(voiceRule.voiceKey||''), voiceLabel:String(voiceRule.voiceLabel||''), text:'', prefix};
  }
  return null;
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
  let voicePowerCommand=null;
  const legacyRules = effectivePower.enabled && (!Array.isArray(effectivePower.powerRules) || !effectivePower.powerRules.length) ? [{
    id:'legacy-power', source:effectivePower.source, platform:effectivePower.platform, commandPrefix: effectivePower.commandPrefix || '.', pointCost: effectivePower.pointCost || 1, amount:effectivePower.amount||1, activity:effectivePower.activity||'follow', giftKey:effectivePower.targetKey||effectivePower.giftKey||'', giftLabel:effectivePower.targetLabel||effectivePower.giftLabel||''
  }] : [];
  const powerRules=effectivePower.enabled ? [...(Array.isArray(effectivePower.powerRules)?effectivePower.powerRules:[]), ...legacyRules] : [];
  if(username && powerRules.length){
    const commentText=String(payload?.comment || payload?.message || payload?.text || '');
    const command=parseVoicePowerCommand(commentText,powerRules,ownerId);
    if(command?.clear){
      liveSession.revokePower(ownerId,platform,username);
      voicePowerCommand={clear:true, text:'', ruleId:String(command.rule?.id||'')};
    } else if(command?.rule){
      const rule=command.rule;
      const platformOk=platformMatches(platformOf(rule.platform),platform);
      if(platformOk && (rule.source==='points' || rule.source==='any' || rule.source==='gift' || rule.source==='activity')){
        const pointCost=Math.max(1,Number(rule.pointCost||1));
        const balance=Number(database.getPoints(ownerId,platform,username)?.points ?? account?.points ?? 0);
        let sourceEligible=true;
        if(rule.source==='points') sourceEligible=pointsCfg.enabled && balance>=pointCost;
        if(rule.source==='gift'){
          const liveBadges=liveSession.getBadges(ownerId,platform,username);
          const target=norm(rule.giftKey||'');
          sourceEligible=Boolean(liveBadges?.giftBadge && (!target || [liveBadges.giftBadge.key,liveBadges.giftBadge.id,liveBadges.giftBadge.name].some(v=>norm(v)===target)));
        } else if(rule.source==='activity'){
          const countType=String(rule.activity||'follow');
          if(countType==='follow') sourceEligible=Boolean(liveSession.getBadges(ownerId,platform,username)?.followed);
          else if(countType==='moderator') sourceEligible=isConfiguredModerator(ownerId,platform,username,current);
          else if(countType==='like' || countType==='share') sourceEligible=liveSession.getActivityCount(ownerId,platform,username,countType)>=Number(rule.amount||1);
          else if(countType==='subscription') sourceEligible=classified.kind==='subscription';
        }
        if(rule.source==='any') sourceEligible=true;
        const canUse=sourceEligible;
        if(canUse){
          if(rule.source==='points' && pointCost>0) database.spendPoints(ownerId,platform,username,pointCost);
          const pointsAfter=Number(database.getPoints(ownerId,platform,username)?.points ?? 0);
          const result=upsertPowerUser(ownerId,current,payload,rule.source,pointsAfter,rule,{voiceKey:command.voiceKey,voiceLabel:command.voiceLabel});
          unlocked=result.changed;
          voicePowerCommand={used:true, ruleId:String(rule.id), voiceKey:String(command.voiceKey||''), voiceLabel:String(command.voiceLabel||''), text:String(command.text||''), cost:rule.source==='points'?pointCost:0, balance:pointsAfter};
        } else {
          voicePowerCommand={denied:true, ruleId:String(rule.id), voiceKey:String(command.voiceKey||''), voiceLabel:String(command.voiceLabel||''), text:'', cost:rule.source==='points'?pointCost:0, balance};
        }
      }
    }
    // Gift/activity rules are eligibility sources; the viewer chooses the voice with prefix+voice in chat.

  }


  const out={...payload};
  if(voicePowerCommand) out.voicePowerCommand=voicePowerCommand;
  const rawType=norm(payload?.type || payload?.event || payload?.action || '');
  const activePower=username ? liveSession.getPowerUsers(ownerId,platform).find((u)=>String(u?.username||'').toLowerCase()===username.toLowerCase()) : null;
  if(activePower){ out.voicePower=true; out.voicePowerAssignment={voiceKey:String(activePower.voiceKey||'verity'),voiceLabel:String(activePower.voiceLabel||''),ruleId:String(activePower.ruleId||''),source:String(activePower.ruleSource||activePower.source||''),commandPrefix:String(activePower.commandPrefix||'.')}; }
  if(username && (rawType.includes('join') || rawType.includes('member'))) liveSession.addBadge(ownerId, platform, username, 'join');
  const liveBadges=username ? liveSession.getBadges(ownerId, platform, username) : null;
  const outBadges=Array.isArray(payload.badges)?[...payload.badges]:[];
  if(voicePowerCommand?.clear===true){ for(let i=outBadges.length-1;i>=0;i--){ const b=outBadges[i]; if(norm(b)==='voicepower'||norm(b)==='voice-power'||String(b)==='🔥') outBadges.splice(i,1); } }
  if(username && isConfiguredModerator(ownerId,platform,username,current) && !outBadges.some(b=>norm(b)==='moderator'||norm(b)==='mod')) outBadges.push('moderator');
  if(nextProfile?.followedBefore && !outBadges.some(b=>String(b||'')==='👤'||norm(b)==='follow'||norm(b)==='follower')) outBadges.push('follow');
  if(nextProfile?.everDonated && !outBadges.some(b=>norm(b)==='donor'||norm(b)==='supporter'||String(b)==='🎁')) outBadges.push('donor');
  if(liveBadges?.joined && !outBadges.includes('join')) outBadges.push('join');
  if(liveBadges?.liked && !outBadges.includes('like')) outBadges.push('like');
  if(liveBadges?.shared && !outBadges.includes('share')) outBadges.push('share');
  if(username && userHasVoicePower(ownerId,platform,username) && voicePowerCommand?.clear!==true){
    if(!outBadges.some(b=>norm(b)==='voicepower'||norm(b)==='voice-power'||String(b)==='🔥')) outBadges.push('voice-power');
    out.voicePower=true;
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
  settings.voiceBot={...(settings.voiceBot||{}), power: structuredClone(normalized.voicePower)};
  // Active voice-power grants belong to the current LIVE only; never persist them in user settings.
  if (settings.voiceBot?.powerUsers) delete settings.voiceBot.powerUsers;
  database.saveUserSettings(ownerId,settings);
  return normalized;
}
