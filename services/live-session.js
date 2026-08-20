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
  sessions.set(k,{liveId,active:true,startedAt:Date.now(),powerUsers:new Map(),activity:new Map()});
  return liveId;
}

export function setLive(ownerId, platform, live){
  return live ? begin(ownerId,platform) : end(ownerId,platform);
}

export function getLiveId(ownerId, platform){
  return sessions.get(key(ownerId,platform))?.liveId || '';
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
