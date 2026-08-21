const LIMIT = 600;
const RETENTION_MS = 5 * 60 * 1000;
const histories = new Map();

function ownerKey(ownerId){ return String(ownerId||'').trim() || '__anonymous__'; }
function ensure(ownerId){
  const key=ownerKey(ownerId);
  let h=histories.get(key);
  if(!h){ h={chat:[],events:[]}; histories.set(key,h); }
  return h;
}
function prune(list, now=Date.now()){
  const cutoff=now-RETENTION_MS;
  while(list.length && Number(list[0]?.timestamp||0)<cutoff) list.shift();
  if(list.length>LIMIT) list.splice(0,list.length-LIMIT);
}
function push(ownerId,bucket,payload){
  const h=ensure(ownerId), list=h[bucket];
  if(!list) return;
  const timestamp=Number(payload?.timestamp)||Date.now();
  list.push({ ...payload, timestamp });
  prune(list,timestamp);
}
export function recordChat(payload, ownerId){ push(ownerId,'chat',payload); }
export function recordEvent(payload, ownerId){ push(ownerId,'events',payload); }
export function snapshot(ownerId){ const h=ensure(ownerId); prune(h.chat); prune(h.events); return {chat:h.chat.slice(),events:h.events.slice()}; }
export function clear(ownerId, platform='all'){
  const h=histories.get(ownerKey(ownerId)); if(!h) return;
  if(platform==='all'){ h.chat.length=0; h.events.length=0; return; }
  const p=String(platform||'').toLowerCase();
  if(['tiktok','twitch'].includes(p)){ h.chat=h.chat.filter(x=>String(x?.platform||'').toLowerCase()!==p); h.events=h.events.filter(x=>String(x?.platform||'').toLowerCase()!==p); }
}
export function clearOwner(ownerId){ histories.delete(ownerKey(ownerId)); }

setInterval(()=>{
  for(const h of histories.values()){ prune(h.chat); prune(h.events); }
}, 30000).unref?.();
