import tmi from "tmi.js";

let client = null;
let globalBadgeData = null;
const badgeDataCache = new Map();
const avatarCache = new Map();
const pendingAvatarRequests = new Map();

let sessionStats = { viewers: 0, subs: 0, bits: 0, raids: 0, followers: 0 };

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function avatarFallback(seed) {
  return `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(seed || "Twitch")}`;
}

async function fetchText(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs = 7000) {
  const text = await fetchText(url, timeoutMs);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function cleanLogin(value) {
  return clean(value, "")
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .split(/[/?#]/)[0]
    .trim();
}

async function resolveTwitchAvatar(username) {
  const login = cleanLogin(username).toLowerCase();
  if (!login) return avatarFallback("Twitch");
  if (avatarCache.has(login)) return avatarCache.get(login);
  if (pendingAvatarRequests.has(login)) return pendingAvatarRequests.get(login);

  const request = (async () => {
    const text = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`);
    const avatar = String(text || "").trim();
    return /^https?:\/\//i.test(avatar) ? avatar : avatarFallback(login);
  })().then((resolved) => {
    avatarCache.set(login, resolved);
    return resolved;
  }).catch(() => {
    const resolved = avatarFallback(login);
    avatarCache.set(login, resolved);
    return resolved;
  }).finally(() => {
    pendingAvatarRequests.delete(login);
  });

  pendingAvatarRequests.set(login, request);
  return request;
}

async function fetchBadgeData(roomId = "") {
  const key = roomId || "global";
  if (badgeDataCache.has(key)) return badgeDataCache.get(key);

  const request = (async () => {
    const [globalData, channelData] = await Promise.all([
      globalBadgeData || fetchJson("https://badges.twitch.tv/v1/badges/global/display"),
      roomId ? fetchJson(`https://badges.twitch.tv/v1/badges/channels/${encodeURIComponent(roomId)}/display`) : Promise.resolve(null),
    ]);
    if (!globalBadgeData && globalData) globalBadgeData = globalData;
    return {
      badges: {
        ...(globalData?.badge_sets || globalData?.sets || {}),
        ...(channelData?.badge_sets || channelData?.sets || {}),
      },
    };
  })().catch(() => ({ badges: {} }));

  badgeDataCache.set(key, request);
  return request;
}

function emojiFallback(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes('mod')) return '🛡️';
  if (n.includes('vip')) return '💎';
  if (n.includes('sub')) return '💜';
  if (n.includes('founder')) return '⭐';
  if (n.includes('broadcaster')) return '👑';
  return '🏷️';
}

function cleanChannel(channel) {
  return cleanLogin(channel);
}

function getDisplayName(tags) {
  return clean(tags?.["display-name"] || tags?.username || "Usuario", "Usuario");
}

function getLogin(tags) {
  return clean(tags?.username || tags?.login || tags?.["login"] || tags?.["display-name"] || "Usuario", "Usuario");
}

function getUniqueId(tags) {
  return clean(tags?.["user-id"] || tags?.username || "", "");
}

function getColor(tags) {
  return tags?.color || "";
}

function getRoomId(tags) {
  return clean(tags?.["room-id"] || tags?.["roomid"] || "", "");
}

function normalizeChannel(channel) {
  let value = clean(channel);
  value = value.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^@/i, "").replace(/^#/i, "");
  return value.split(/[/?#]/)[0].trim();
}

function getIO() {
  return globalThis.__STREAMFUSION_IO__ || null;
}

function emitSystem(io, message) {
  io?.emit("system", { platform: "twitch", type: "system", message: clean(message, "Error desconocido"), timestamp: Date.now() });
}

function emitChat(io, event) {
  io?.emit("chat", {
    platform: "twitch",
    timestamp: Date.now(),
    type: clean(event.type, "chat"),
    action: clean(event.action, "Comentario"),
    user: clean(event.user, "Usuario"),
    displayName: clean(event.displayName ?? event.user, "Usuario"),
    channel: clean(event.channel ?? event.login ?? event.user, ""),
    uniqueId: clean(event.uniqueId, ""),
    message: clean(event.message, "Mensaje sin texto"),
    color: event.color !== undefined ? event.color : undefined,
    avatar: event.avatar !== undefined ? event.avatar : undefined,
    badges: event.badges !== undefined ? event.badges : undefined,
    emotes: event.emotes !== undefined ? event.emotes : undefined,
    roomId: event.roomId !== undefined ? event.roomId : undefined,
  });
}

function emitEvent(io, event) {
  io?.emit("event", {
    platform: "twitch",
    timestamp: Date.now(),
    type: clean(event.type, "system"),
    action: clean(event.action, "Evento"),
    user: clean(event.user, "Usuario"),
    displayName: clean(event.displayName ?? event.user, "Usuario"),
    channel: clean(event.channel ?? event.login ?? event.user, ""),
    uniqueId: clean(event.uniqueId, ""),
    message: clean(event.message, ""),
    amount: event.amount !== undefined ? event.amount : undefined,
    bits: event.bits !== undefined ? event.bits : undefined,
    gift: event.gift !== undefined ? event.gift : undefined,
    avatar: event.avatar !== undefined ? event.avatar : undefined,
    badges: event.badges !== undefined ? event.badges : undefined,
    emotes: event.emotes !== undefined ? event.emotes : undefined,
    roomId: event.roomId !== undefined ? event.roomId : undefined,
  });
}

function emitStats(io) {
  io?.emit("stats", { twitch: { ...sessionStats } });
}

function resetSessionStats() {
  sessionStats = { viewers: 0, subs: 0, bits: 0, raids: 0, followers: 0 };
}

function buildBadges(tags) {
  const badges = tags?.badges || {};
  const roomId = getRoomId(tags);
  return fetchBadgeData(roomId).then((map) => {
    const out = [];
    for (const [setName, version] of Object.entries(badges)) {
      const set = map.badges?.[setName] || {};
      const entry = set?.versions?.[version] || set?.versions?.['1'] || set?.[version] || set?.['1'] || null;
      if (entry?.image_url_1x) {
        out.push({ kind: 'image', url: entry.image_url_1x, title: entry.title || setName });
      } else {
        out.push({ kind: 'emoji', emoji: emojiFallback(setName), title: setName });
      }
    }
    return out;
  }).catch(() => {
    const out = [];
    for (const setName of Object.keys(tags?.badges || {})) out.push({ kind: 'emoji', emoji: emojiFallback(setName), title: setName });
    return out;
  });
}

function getSubCountFromMessage(message) {
  const text = clean(message, "");
  const match = text.match(/(\d+)/);
  if (!match) return 1;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function connect(channel, io) {
  globalThis.__STREAMFUSION_IO__ = io;

  if (client) {
    try { await client.disconnect(); } catch {}
    client = null;
  }

  const normalizedChannel = normalizeChannel(channel);
  if (!normalizedChannel) throw new Error('Debes ingresar un canal válido de Twitch.');

  resetSessionStats();
  client = new tmi.Client({ channels: [normalizedChannel], connection: { secure: true, reconnect: true } });

  client.on('connected', () => {
    emitSystem(io, `Twitch conectado a #${normalizedChannel}.`);
    emitStats(io);
  });

  client.on('message', async (channelName, tags, message, self) => {
    if (self) return;
    const displayName = getDisplayName(tags);
    const login = getLogin(tags);
    const roomId = getRoomId(tags);
    const badges = await buildBadges(tags);
    emitChat(io, {
      type: 'chat',
      action: 'Comentario',
      user: displayName,
      displayName,
      channel: login,
      login,
      uniqueId: getUniqueId(tags),
      message,
      color: getColor(tags),
      badges,
      emotes: tags?.emotes || {},
      avatar: await resolveTwitchAvatar(login || displayName),
      roomId,
    });
  });

  client.on('action', async (channelName, tags, message, self) => {
    if (self) return;
    const displayName = getDisplayName(tags);
    const login = getLogin(tags);
    const roomId = getRoomId(tags);
    const badges = await buildBadges(tags);
    emitChat(io, {
      type: 'action',
      action: 'Acción',
      user: displayName,
      displayName,
      channel: login,
      login,
      uniqueId: getUniqueId(tags),
      message,
      color: getColor(tags),
      badges,
      emotes: tags?.emotes || {},
      avatar: await resolveTwitchAvatar(login || displayName),
      roomId,
    });
  });

  client.on('subscription', async (channelName, username, method, message, userstate) => {
    const user = clean(username, 'Usuario');
    const months = toNumber(userstate?.['msg-param-cumulative-months'] || userstate?.['msg-param-months'] || 1, 1);
    sessionStats.subs += 1; emitStats(io);
    emitEvent(io, { platform: 'twitch', type: 'sub', action: 'Sub', user, displayName: user, channel: cleanChannel(userstate?.username || username), uniqueId: getUniqueId(userstate), message: `${user} se suscribió${months > 0 ? ` (${months} meses)` : ''}`, amount: 1, avatar: await resolveTwitchAvatar(cleanChannel(userstate?.username || username) || user), badges: await buildBadges(userstate || {}), roomId: getRoomId(userstate) });
  });

  client.on('resub', async (channelName, username, months, message, userstate, methods) => {
    const user = clean(username, 'Usuario');
    const totalMonths = toNumber(months, 1);
    sessionStats.subs += 1; emitStats(io);
    emitEvent(io, { platform: 'twitch', type: 'sub', action: 'Re-Sub', user, displayName: user, channel: cleanChannel(userstate?.username || username), uniqueId: getUniqueId(userstate), message: `${user} renovó su sub por ${totalMonths} mes${totalMonths === 1 ? '' : 'es'}`, amount: 1, avatar: await resolveTwitchAvatar(cleanChannel(userstate?.username || username) || user), badges: await buildBadges(userstate || {}), roomId: getRoomId(userstate) });
  });

  client.on('subgift', async (channelName, username, streakMonths, recipient, methods, userstate) => {
    const gifter = clean(username, 'Usuario');
    const target = clean(recipient, 'Usuario');
    sessionStats.subs += 1; emitStats(io);
    emitEvent(io, { platform: 'twitch', type: 'sub', action: 'Gift Sub', user: gifter, displayName: gifter, channel: cleanChannel(username), uniqueId: getUniqueId(userstate), message: `${gifter} regaló una sub a ${target}`, amount: 1, avatar: await resolveTwitchAvatar(cleanChannel(username) || gifter), badges: await buildBadges(userstate || {}), roomId: getRoomId(userstate) });
  });

  client.on('giftpaidupgrade', async (channelName, username, sender, userstate) => {
    const user = clean(username, 'Usuario');
    const fromUser = clean(sender, 'Usuario');
    sessionStats.subs += 1; emitStats(io);
    emitEvent(io, { platform: 'twitch', type: 'sub', action: 'Gift Sub', user, displayName: user, channel: cleanChannel(username), uniqueId: getUniqueId(userstate), message: `${user} recibió una sub regalada por ${fromUser}`, amount: 1, avatar: await resolveTwitchAvatar(cleanChannel(username) || user), badges: await buildBadges(userstate || {}), roomId: getRoomId(userstate) });
  });

  client.on('anongiftpaidupgrade', async (channelName, username, userstate) => {
    const user = clean(username, 'Usuario');
    sessionStats.subs += 1; emitStats(io);
    emitEvent(io, { platform: 'twitch', type: 'sub', action: 'Gift Sub', user, displayName: user, channel: cleanChannel(username), uniqueId: getUniqueId(userstate), message: `${user} recibió una sub anónima`, amount: 1, avatar: await resolveTwitchAvatar(cleanChannel(username) || user), badges: await buildBadges(userstate || {}), roomId: getRoomId(userstate) });
  });

  client.on('cheer', async (channelName, tags, message) => {
    const user = getDisplayName(tags);
    const login = getLogin(tags);
    const bits = toNumber(tags?.bits, 0);
    if (bits > 0) { sessionStats.bits += bits; emitStats(io); }
    emitEvent(io, { platform: 'twitch', type: 'bits', action: 'Bits', user, displayName: user, channel: login, uniqueId: getUniqueId(tags), message: `${user} envió ${bits} Bits`, avatar: await resolveTwitchAvatar(login || user), badges: await buildBadges(tags || {}), bits, amount: bits, roomId: getRoomId(tags) });
  });

  client.on('raided', async (channelName, username, viewers) => {
    const user = clean(username, 'Usuario');
    const raidViewers = toNumber(viewers, 0);
    sessionStats.raids += 1;
    if (raidViewers > 0) sessionStats.viewers = raidViewers;
    emitStats(io);
    emitEvent(io, { platform: 'twitch', type: 'raid', action: 'Raid', user, displayName: user, channel: cleanChannel(username), uniqueId: '', message: `${user} hizo raid con ${raidViewers} viewer${raidViewers === 1 ? '' : 's'}`, avatar: await resolveTwitchAvatar(cleanChannel(username) || user), badges: [], amount: raidViewers });
  });

  client.on('hosttarget', async (channelName, username, viewers, autohost) => {
    const user = clean(username, 'Usuario');
    const hostViewers = toNumber(viewers, 0);
    if (hostViewers > 0) { sessionStats.viewers = hostViewers; emitStats(io); }
    emitEvent(io, { platform: 'twitch', type: 'system', action: 'Host', user, displayName: user, channel: cleanChannel(username), uniqueId: '', message: `${user} hosteó con ${hostViewers} viewer${hostViewers === 1 ? '' : 's'}`, avatar: await resolveTwitchAvatar(cleanChannel(username) || user), badges: [], amount: hostViewers });
  });

  client.on('notice', async (channelName, msgid, message, tags) => {
    const text = clean(message, 'Aviso de Twitch');
    const displayName = getDisplayName(tags);
    const login = getLogin(tags);
    if (msgid === 'sub' || msgid === 'resub' || msgid === 'subgift') {
      sessionStats.subs += 1; emitStats(io);
      emitEvent(io, { platform: 'twitch', type: 'sub', action: msgid === 'resub' ? 'Re-Sub' : msgid === 'subgift' ? 'Gift Sub' : 'Sub', user: displayName, displayName, channel: login, uniqueId: getUniqueId(tags), avatar: await resolveTwitchAvatar(login || displayName), badges: await buildBadges(tags || {}), message: text, amount: 1, roomId: getRoomId(tags) });
      return;
    }
    emitEvent(io, { platform: 'twitch', type: 'system', action: 'Sistema', user: 'Twitch', displayName: 'Twitch', channel: cleanChannel(channelName), uniqueId: '', message: text });
  });

  client.on('roomstate', async () => {
    emitEvent(io, { platform: 'twitch', type: 'system', action: 'Sala', user: 'Twitch', displayName: 'Twitch', channel: normalizedChannel, uniqueId: '', message: 'Estado de sala actualizado' });
  });

  client.on('clearchat', async () => {
    emitEvent(io, { platform: 'twitch', type: 'system', action: 'Sistema', user: 'Twitch', displayName: 'Twitch', channel: normalizedChannel, uniqueId: '', message: 'El chat fue limpiado' });
  });

  client.on('timeout', async (channelName, username, reason, duration, userstate) => {
    emitEvent(io, { platform: 'twitch', type: 'system', action: 'Moderación', user: clean(username, 'Usuario'), displayName: clean(username, 'Usuario'), channel: cleanChannel(username), uniqueId: getUniqueId(userstate), message: `${clean(username, 'Usuario')} fue sancionado${duration ? ` por ${duration}s` : ''}` });
  });

  client.on('ban', async (channelName, username, reason, userstate) => {
    emitEvent(io, { platform: 'twitch', type: 'system', action: 'Moderación', user: clean(username, 'Usuario'), displayName: clean(username, 'Usuario'), channel: cleanChannel(username), uniqueId: getUniqueId(userstate), message: `${clean(username, 'Usuario')} fue baneado` });
  });

  client.on('connected', () => emitStats(io));
  client.on('disconnected', (reason) => emitSystem(io, `Twitch desconectado. ${clean(reason, '')}`));

  await client.connect();
}

export async function disconnect() {
  if (!client) return;
  try { await client.disconnect(); } catch {}
  client = null;
}

