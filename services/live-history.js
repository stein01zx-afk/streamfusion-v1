const LIMIT = 600;
const history = { chat: [], events: [] };

function push(bucket, payload) {
  const list = history[bucket];
  if (!list) return;
  list.push({ ...payload, timestamp: payload?.timestamp || Date.now() });
  if (list.length > LIMIT) list.splice(0, list.length - LIMIT);
}

export function recordChat(payload) { push('chat', payload); }
export function recordEvent(payload) { push('events', payload); }
export function snapshot() { return { chat: history.chat.slice(), events: history.events.slice() }; }
export function clear() { history.chat.length = 0; history.events.length = 0; }
