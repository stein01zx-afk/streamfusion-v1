import crypto from 'node:crypto';

const sessions = new Map();

function key(ownerId, platform){
  return `${String(ownerId||'').trim()}:${String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok'}`;
}

export function begin(ownerId, platform){
  const k=key(ownerId,platform);
  const existing=sessions.get(k);
  if(existing?.active) return existing.liveId;
  const liveId=`live-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
  sessions.set(k,{liveId,active:true,startedAt:Date.now(),powerUsers:new Map(),activity:new Map(),viewers:new Set(),badges:new Map()});
  return liveId;
}

export function setLive(ownerId, platform, live){
  return live ? begin(ownerId,platform) : end(ownerId,platform);
}

export function getLiveId(ownerId, platform){
  return sessions.get(key(ownerId,platform))?.liveId || '';
}

export function recordViewerActivity(ownerId, platform, identity){
  const session=sessions.get(key(ownerId,platform));
  if(!session?.active) return false;
  const id=String(identity||'').trim().toLowerCase();
  if(!id) return false;
  session.viewers.add(id);
  return true;
}


function ensureBadgeEntry(ownerId, platform, identity){
  const session=sessions.get(key(ownerId,platform));
  if(!session?.active) return null;
  const id=String(identity||'').trim().toLowerCase();
  if(!id) return null;
  let entry=session.badges.get(id);
  if(!entry){ entry={joined:false,followed:false,liked:false,shared:false,donor:false,giftBadge:null}; session.badges.set(id,entry); }
  return entry;
}

export function addBadge(ownerId, platform, identity, badge, meta={}){
  const entry=ensureBadgeEntry(ownerId,platform,identity);
  if(!entry) return null;
  const b=String(badge||'').toLowerCase();
  if(b==='join' || b==='joined') entry.joined=true;
  else if(b==='follow' || b==='followed') entry.followed=true;
  else if(b==='like' || b==='liked') entry.liked=true;
  else if(b==='share' || b==='shared') entry.shared=true;
  else if(b==='donor' || b==='gift') entry.donor=true;
  else if(b==='gift-image') entry.giftBadge={
    image:String(meta.image||''), name:String(meta.name||'Regalo'), key:String(meta.key||''), id:String(meta.id||''), updatedAt:Date.now()
  };
  return structuredClone(entry);
}

export function getBadges(ownerId, platform, identity){
  const session=sessions.get(key(ownerId,platform));
  const id=String(identity||'').trim().toLowerCase();
  if(!session?.active || !id) return null;
  const entry=session.badges.get(id);
  return entry ? structuredClone(entry) : {joined:false,followed:false,liked:false,shared:false,donor:false,giftBadge:null};
}

export function hasViewerActivity(ownerId, platform, identity){
  const session=sessions.get(key(ownerId,platform));
  const id=String(identity||'').trim().toLowerCase();
  return Boolean(session?.active && id && session.viewers?.has(id));
}

export function isActive(ownerId, platform){
  return Boolean(sessions.get(key(ownerId,platform))?.active);
}


export function addActivity(ownerId, platform, identity, amount=1){
  const k=key(ownerId,platform); const session=sessions.get(k); if(!session?.active) return 0;
  const id=String(identity||'').trim().toLowerCase(); if(!id) return 0;
  const entry=session.activity.get(id)||{like:0,share:0};
  if(Number(amount)>0){
    entry.like += 0;
  }
  session.activity.set(id,entry);
  return entry;
}
export function recordActivity(ownerId, platform, identity, type, amount=1){
  const k=key(ownerId,platform); const session=sessions.get(k); if(!session?.active) return 0;
  const id=String(identity||'').trim().toLowerCase(); if(!id) return 0;
  const entry=session.activity.get(id)||{like:0,share:0};
  const field=String(type||'').toLowerCase()==='share'?'share':'like';
  entry[field]+=Math.max(0,Number(amount)||0); session.activity.set(id,entry); return entry[field];
}
export function getActivityCount(ownerId, platform, identity, type){
  const k=key(ownerId,platform); const session=sessions.get(k); if(!session?.active) return 0;
  const id=String(identity||'').trim().toLowerCase(); const entry=session.activity.get(id)||{}; return Number(entry[String(type||'like').toLowerCase()]||0);
}

export function grantPower(ownerId, platform, identity, entry){
  const k=key(ownerId,platform);
  let session=sessions.get(k);
  if(!session?.active){ begin(ownerId,platform); session=sessions.get(k); }
  const id=String(identity||'').trim().toLowerCase();
  if(!id) return null;
  const next={...entry,platform:String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok',liveId:session.liveId,active:true,updatedAt:Date.now()};
  session.powerUsers.set(id,next);
  return next;
}


export function revokePower(ownerId, platform, identity){
  const session=sessions.get(key(ownerId,platform));
  const id=String(identity||'').trim().toLowerCase();
  if(!session?.active || !id) return false;
  return session.powerUsers.delete(id);
}

export function revokePowersByRule(ownerId, ruleId){
  const rid=String(ruleId||'').trim();
  if(!rid) return 0;
  let count=0;
  const prefix=`${String(ownerId||'').trim()}:`;
  for(const [k,session] of sessions){
    if(!k.startsWith(prefix) || !session?.active) continue;
    for(const [id,entry] of session.powerUsers){
      if(String(entry?.ruleId||'')===rid){ session.powerUsers.delete(id); count++; }
    }
  }
  return count;
}

export function hasPower(ownerId, platform, identity){
  const session=sessions.get(key(ownerId,platform));
  const id=String(identity||'').trim().toLowerCase();
  return Boolean(session?.active && id && session.powerUsers.has(id));
}

export function getPowerUsers(ownerId, platform){
  const session=sessions.get(key(ownerId,platform));
  return session?.active ? [...session.powerUsers.values()] : [];
}

export function end(ownerId, platform){
  const k=key(ownerId,platform);
  const session=sessions.get(k);
  if(!session) return null;
  const result={liveId:session.liveId,startedAt:session.startedAt,endedAt:Date.now(),powerUsers:[...session.powerUsers.values()]};
  sessions.delete(k);
  return result;
}

export function endAllForOwner(ownerId){
  const prefix=`${String(ownerId||'').trim()}:`;
  const closed=[];
  for(const [k,v] of sessions){ if(k.startsWith(prefix)){ closed.push({platform:k.endsWith(':twitch')?'twitch':'tiktok', ...end(ownerId,k.endsWith(':twitch')?'twitch':'tiktok')}); } }
  return closed;
}
