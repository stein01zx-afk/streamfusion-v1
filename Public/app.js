const socket = io();

const $ = (id) => document.getElementById(id);
const ESC = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const STORAGE_SETTINGS = "streamfusion.settings.v3";
const STORAGE_SESSION = "streamfusion.session.v3";
const DEFAULT_THEME = "twitch-dark";
const DEFAULT_FONT = "inter";
const DEFAULT_ANIMATION = "slide-up";
const PLACEHOLDER_AVATAR = (seed) => `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(seed || "StreamFusion")}`;

const defaults = {
  appearance: {
    theme: DEFAULT_THEME,
    font: DEFAULT_FONT,
    animation: DEFAULT_ANIMATION,
    avatarFrame: true,
    showAvatars: true,
    showBadges: true,
    showTwitchBadges: true,
    showTwitchEmotes: true,
    showTikTokBadges: true,
    showAtHandle: false,
    tiktokUsernameColor: "white",
    messageTtl: 0,
  },
  layout: {
    chat: true,
    events: true,
    gifts: true,
    order: "events-gifts",
  },
  overlay: {
    defaultView: "chat",
  },
};

const els = {
  tiktokUser: $("tiktokUser"),
  twitchUser: $("twitchUser"),
  connectModal: $("connectModal"),
  closeConnectBtn: $("closeConnectBtn"),
  connectTikTokBtn: $("connectTikTokBtn"),
  connectTwitchBtn: $("connectTwitchBtn"),
  connectBothBtn: $("connectBothBtn"),
  openConnectBtn: $("openConnectBtn"),
  openCustomizeBtn: $("openCustomizeBtn"),
  openOverlayBtn: $("openOverlayBtn"),
  manageTikTokBtn: $("manageTikTokBtn"),
  manageTwitchBtn: $("manageTwitchBtn"),
  disconnectTikTokBtn: $("disconnectTikTokBtn"),
  disconnectTwitchBtn: $("disconnectTwitchBtn"),
  tiktokAvatar: $("tiktokAvatar"),
  twitchAvatar: $("twitchAvatar"),
  tiktokName: $("tiktokName"),
  twitchName: $("twitchName"),
  tiktokChannel: $("tiktokChannel"),
  twitchChannel: $("twitchChannel"),
  tiktokState: $("tiktokState"),
  twitchState: $("twitchState"),
  tiktokDot: $("tiktokDot"),
  twitchDot: $("twitchDot"),
  dashboard: $("dashboard"),
  chatPanel: $("chatPanel"),
  chatList: $("chatList"),
  eventList: $("eventList"),
  giftList: $("giftList"),
  chatFilter: $("chatFilter"),
  eventFilter: $("eventFilter"),
  giftFilter: $("giftFilter"),
  customizeModal: $("customizeModal"),
  closeCustomizeBtn: $("closeCustomizeBtn"),
  saveCustomizeBtn: $("saveCustomizeBtn"),
  resetCustomizeBtn: $("resetCustomizeBtn"),
  themeSelect: $("themeSelect"),
  fontSelect: $("fontSelect"),
  animationSelect: $("animationSelect"),
  avatarFrameSelect: $("avatarFrameSelect"),
  showAtHandle: $("showAtHandle"),
  showAvatars: $("showAvatars"),
  showBadges: $("showBadges"),
  showTwitchBadges: $("showTwitchBadges"),
  showTwitchEmotes: $("showTwitchEmotes"),
  showTikTokBadges: $("showTikTokBadges"),
  tiktokUsernameColor: $("tiktokUsernameColor"),
  messageTtlSelect: $("messageTtlSelect"),
  chatVisible: $("chatVisible"),
  panelEventsVisible: $("panelEventsVisible"),
  panelGiftsVisible: $("panelGiftsVisible"),
  panelOrder: $("panelOrder"),
  overlayDefaultView: $("overlayDefaultView"),
  overlayModal: $("overlayModal"),
  closeOverlayBtn: $("closeOverlayBtn"),
  cancelOverlayBtn: $("cancelOverlayBtn"),
  toastWrap: $("toastWrap"),
};

const state = {
  settings: loadJSON(STORAGE_SETTINGS, defaults),
  session: loadJSON(STORAGE_SESSION, {
    tiktok: { username: "", connected: false, profile: null },
    twitch: { username: "", connected: false, profile: null },
  }),
  chat: [],
  events: [],
  gifts: [],
  timers: new Map(),
  badgeCache: new Map(),
  profileRequests: new Map(),
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return deepMerge(structuredClone(fallback), JSON.parse(raw));
  } catch {
    return structuredClone(fallback);
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function deepMerge(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const out = { ...base };
  for (const k of Object.keys(incoming)) out[k] = k in base ? deepMerge(base[k], incoming[k]) : incoming[k];
  return out;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/^@+/g, "")
    .replace(/^#+/g, "")
    .split(/[/?#]/)[0]
    .trim();
}

function uid() {
  return (crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function timeLabel(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function toast(title, body = "", kind = "ok") {
  const card = document.createElement("div");
  card.className = `toast ${kind === "err" ? "err" : "ok"}`;
  card.innerHTML = `<div class="t">${ESC(title)}</div>${body ? `<div class="b">${ESC(body)}</div>` : ""}`;
  els.toastWrap.appendChild(card);
  setTimeout(() => card.remove(), 3200);
}

function fallbackAvatar(seed, platform) {
  return PLACEHOLDER_AVATAR(`${platform || "user"}-${seed || "guest"}`);
}

function getProfile(platform) {
  return state.session?.[platform]?.profile || null;
}

function avatarFromProfile(platform, username) {
  const profile = getProfile(platform);
  if (profile?.avatarUrl) return profile.avatarUrl;
  return fallbackAvatar(username || platform, platform);
}

async function refreshProfile(platform, username) {
  const clean = normalizeUsername(username);
  if (!clean) return null;
  const key = `${platform}:${clean.toLowerCase()}`;
  if (state.profileRequests.has(key)) return state.profileRequests.get(key);

  const request = fetch(`/api/profile?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(clean)}`)
    .then(async (res) => res.ok ? res.json() : null)
    .then((data) => {
      if (!data) return null;
      const profile = {
        username: data.username || clean,
        channel: data.channel || data.username || clean,
        displayName: data.displayName || clean,
        avatarUrl: data.avatarUrl || fallbackAvatar(clean, platform),
        source: data.source || "fallback",
      };
      state.session[platform] = {
        ...(state.session[platform] || {}),
        username: profile.channel || profile.username || clean,
        connected: state.session[platform]?.connected ?? true,
        profile,
      };
      saveJSON(STORAGE_SESSION, state.session);
      renderTopbar();
      return profile;
    })
    .catch(() => null)
    .finally(() => state.profileRequests.delete(key));

  state.profileRequests.set(key, request);
  return request;
}

function setSession(platform, username, connected = true) {
  const clean = normalizeUsername(username);
  state.session[platform] = {
    username: clean,
    connected: Boolean(connected),
    profile: state.session[platform]?.profile || null,
  };
  saveJSON(STORAGE_SESSION, state.session);
  renderTopbar();
}

function platformLabel(platform) {
  return String(platform || "").toLowerCase() === "twitch" ? "Twitch" : "TikTok";
}

function platformClass(platform) {
  return String(platform || "").toLowerCase() === "twitch" ? "twitch" : "tiktok";
}

function itemIdentity(item) {
  return item.id || `${item.platform}-${item.channel || item.uniqueId || item.user || item.displayName || uid()}`;
}

function userHandle(item) {
  return item.channel || item.uniqueId || item.login || item.username || item.user || item.displayName || "";
}

function ensureAvatarFor(item) {
  const seed = userHandle(item) || item.displayName || item.user || item.platform;
  if (item.avatar) return item.avatar;
  return avatarFromProfile(item.platform, seed);
}

function renderTopbar() {
  const tiktok = state.session.tiktok || {};
  const twitch = state.session.twitch || {};

  const tiktokProfile = tiktok.profile || null;
  const twitchProfile = twitch.profile || null;

  els.tiktokDot.classList.toggle("online", Boolean(tiktok.connected));
  els.tiktokDot.classList.toggle("offline", !tiktok.connected);
  els.twitchDot.classList.toggle("online", Boolean(twitch.connected));
  els.twitchDot.classList.toggle("offline", !twitch.connected);

  els.tiktokAvatar.src = tiktokProfile?.avatarUrl || avatarFromProfile("tiktok", tiktok.username || "tiktok");
  els.twitchAvatar.src = twitchProfile?.avatarUrl || avatarFromProfile("twitch", twitch.username || "twitch");

  els.tiktokName.textContent = tiktokProfile?.displayName || (tiktok.username ? normalizeUsername(tiktok.username) : "Sin conectar");
  els.twitchName.textContent = twitchProfile?.displayName || (twitch.username ? normalizeUsername(twitch.username) : "Sin conectar");

  const tiktokChannel = tiktokProfile?.channel || tiktok.username || "";
  const twitchChannel = twitchProfile?.channel || twitch.username || "";

  els.tiktokChannel.textContent = tiktokChannel ? `@${normalizeUsername(tiktokChannel)}` : "@usuario";
  els.twitchChannel.textContent = twitchChannel ? `@${normalizeUsername(twitchChannel)}` : "@canal";

  els.tiktokState.textContent = tiktok.connected
    ? `Conectado${tiktokChannel ? ` · ${normalizeUsername(tiktokChannel)}` : ""}`
    : tiktok.username
      ? "Guardado, listo para reconectar"
      : "Listo para conectar";

  els.twitchState.textContent = twitch.connected
    ? `Conectado${twitchChannel ? ` · ${normalizeUsername(twitchChannel)}` : ""}`
    : twitch.username
      ? "Guardado, listo para reconectar"
      : "Listo para conectar";

  els.disconnectTikTokBtn.classList.toggle("hidden", !tiktok.connected);
  els.disconnectTwitchBtn.classList.toggle("hidden", !twitch.connected);
}

function setThemeFromSettings() {
  const appearance = state.settings.appearance || defaults.appearance;
  document.body.dataset.theme = appearance.theme || DEFAULT_THEME;
  document.body.dataset.font = appearance.font || DEFAULT_FONT;
  document.body.dataset.animation = appearance.animation || DEFAULT_ANIMATION;
  document.body.classList.toggle("no-avatar-frame", appearance.avatarFrame === false);
  document.body.classList.toggle("hide-avatars", appearance.showAvatars === false);
}

function loadSettingsToUI() {
  const s = state.settings;
  const a = s.appearance || defaults.appearance;
  const l = s.layout || defaults.layout;
  const o = s.overlay || defaults.overlay;

  els.themeSelect.value = a.theme || DEFAULT_THEME;
  els.fontSelect.value = a.font || DEFAULT_FONT;
  els.animationSelect.value = a.animation || DEFAULT_ANIMATION;
  els.avatarFrameSelect.value = a.avatarFrame === false ? "off" : "on";
  els.showAtHandle.checked = Boolean(a.showAtHandle);
  els.showAvatars.checked = a.showAvatars !== false;
  els.showBadges.checked = a.showBadges !== false;
  els.showTwitchBadges.checked = a.showTwitchBadges !== false;
  els.showTwitchEmotes.checked = a.showTwitchEmotes !== false;
  els.showTikTokBadges.checked = a.showTikTokBadges !== false;
  els.tiktokUsernameColor.value = a.tiktokUsernameColor || "white";
  els.messageTtlSelect.value = String(a.messageTtl || 0);
  els.chatVisible.checked = l.chat !== false;
  els.panelEventsVisible.checked = l.events !== false;
  els.panelGiftsVisible.checked = l.gifts !== false;
  els.panelOrder.value = l.order || "events-gifts";
  els.overlayDefaultView.value = o.defaultView || "chat";
}

function persistSettings() {
  saveJSON(STORAGE_SETTINGS, state.settings);
  socket.emit("saveSettings", state.settings);
  setThemeFromSettings();
  applyLayout();
}

function collectSettingsFromUI() {
  state.settings.appearance = {
    ...(state.settings.appearance || {}),
    theme: els.themeSelect.value,
    font: els.fontSelect.value,
    animation: els.animationSelect.value,
    avatarFrame: els.avatarFrameSelect.value !== "off",
    showAvatars: els.showAvatars.checked,
    showBadges: els.showBadges.checked,
    showTwitchBadges: els.showTwitchBadges.checked,
    showTwitchEmotes: els.showTwitchEmotes.checked,
    showTikTokBadges: els.showTikTokBadges.checked,
    showAtHandle: els.showAtHandle.checked,
    tiktokUsernameColor: els.tiktokUsernameColor.value,
    messageTtl: Number(els.messageTtlSelect.value || 0),
  };
  state.settings.layout = {
    ...(state.settings.layout || {}),
    chat: els.chatVisible.checked,
    events: els.panelEventsVisible.checked,
    gifts: els.panelGiftsVisible.checked,
    order: els.panelOrder.value,
  };
  state.settings.overlay = {
    ...(state.settings.overlay || {}),
    defaultView: els.overlayDefaultView.value,
  };
}

function applyLayout() {
  const layout = state.settings.layout || defaults.layout;
  els.chatPanel.style.display = layout.chat === false ? "none" : "flex";
  els.eventsCard.style.display = layout.events === false ? "none" : "flex";
  els.giftsCard.style.display = layout.gifts === false ? "none" : "flex";
  if (layout.order === "gifts-events") {
    els.giftsCard.style.order = "1";
    els.eventsCard.style.order = "2";
  } else {
    els.eventsCard.style.order = "1";
    els.giftsCard.style.order = "2";
  }
}

function openModal(modal) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function renderBadges(item) {
  const badges = Array.isArray(item.badges) ? item.badges : [];
  if (!badges.length || state.settings.appearance?.showBadges === false) return "";
  if (item.platform === 'twitch' && state.settings.appearance?.showTwitchBadges === false) return "";
  if (item.platform === 'tiktok' && state.settings.appearance?.showTikTokBadges === false) return "";

  return badges.map((badge) => {
    if (typeof badge === "string") {
      return `<span class="badge badgeEmoji">${ESC(badge)}</span>`;
    }
    if (badge?.kind === "image" && badge?.url) {
      return `<span class="badge badgeImage" title="${ESC(badge.title || badge.label || "badge")}"><img src="${ESC(badge.url)}" alt="badge" /></span>`;
    }
    if (badge?.emoji) {
      return `<span class="badge badgeEmoji" title="${ESC(badge.title || "badge")}">${ESC(badge.emoji)}</span>`;
    }
    return "";
  }).join("");
}

function renderHandle(item) {
  if (!state.settings.appearance?.showAtHandle) return "";
  const handle = userHandle(item);
  if (!handle) return "";
  return `<span class="handleTag">@${ESC(handle)}</span>`;
}

function tiktokNameClass() {
  return `tiktokName ${state.settings.appearance?.tiktokUsernameColor || "white"}`;
}

function renderTwitchMessage(text, emotes = {}, allowEmotes = true) {
  const message = String(text || "");
  if (!allowEmotes || !emotes || !Object.keys(emotes).length) return ESC(message).replace(/\n/g, "<br>");

  const entries = [];
  for (const [id, ranges] of Object.entries(emotes)) {
    for (const range of String(ranges).split(',')) {
      const [start, end] = range.split('-').map((n) => Number(n));
      if (Number.isFinite(start) && Number.isFinite(end)) entries.push({ start, end, id });
    }
  }
  entries.sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const emote of entries) {
    if (emote.start < cursor) continue;
    out += ESC(message.slice(cursor, emote.start));
    const token = message.slice(emote.start, emote.end + 1);
    const src = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/1.0`;
    out += `<img class="twitchEmote" src="${src}" alt="${ESC(token)}" title="${ESC(token)}" />`;
    cursor = emote.end + 1;
  }
  out += ESC(message.slice(cursor));
  return out.replace(/\n/g, "<br>");
}

function renderMessageText(item) {
  const text = String(item.message || "");
  if (item.platform === "twitch") {
    return renderTwitchMessage(text, item.emotes || {}, state.settings.appearance?.showTwitchEmotes !== false);
  }
  return ESC(text).replace(/\n/g, "<br>");
}

function createMessageCard(item, mode = "chat") {
  const article = document.createElement("article");
  article.className = `${mode === "gift" ? "giftItem" : mode === "event" ? "eventItem" : "messageItem"} enter`;
  article.dataset.id = item.id;

  const platform = platformClass(item.platform);
  const handle = renderHandle(item);
  const badges = renderBadges(item);
  const avatar = state.settings.appearance?.showAvatars === false ? "" : ensureAvatarFor(item);
  const topUser = item.platform === "tiktok" ? `<span class="user ${tiktokNameClass()}">${ESC(item.displayName || item.user || "Usuario")}</span>` : `<span class="user ${platform === 'twitch' ? 'twitchUser' : ''}">${ESC(item.displayName || item.user || "Usuario")}</span>`;
  const platformPill = `<span class="platformTag ${platform}">${platformLabel(item.platform)}</span>`;
  const time = `<span class="timeTag">${timeLabel(item.timestamp)}</span>`;

  article.innerHTML = `
    ${avatar ? `<img class="avatar" src="${ESC(avatar)}" alt="avatar" loading="lazy" />` : ''}
    <div class="content">
      <div class="rowTop">
        ${topUser}
        ${handle}
        ${badges}
        ${platformPill}
        ${time}
      </div>
      <div class="text">${renderMessageText(item)}</div>
    </div>
  `;
  return article;
}

function itemPassesFilter(item, filter) {
  return filter === 'all' || item.platform === filter;
}

function renderChat() {
  const filter = els.chatFilter.value;
  const rows = state.chat.filter((item) => itemPassesFilter(item, filter));
  els.chatList.innerHTML = '';
  if (!rows.length) {
    els.chatList.innerHTML = `<div class="emptyState"><strong>Sin mensajes</strong><span>Cuando alguien escriba, aparecerá aquí.</span></div>`;
    return;
  }
  for (const item of rows) {
    els.chatList.appendChild(createMessageCard(item, 'chat'));
  }
}

function renderEvents() {
  const filter = els.eventFilter.value;
  const rows = state.events.filter((item) => itemPassesFilter(item, filter));
  els.eventList.innerHTML = '';
  if (!rows.length) {
    els.eventList.innerHTML = `<div class="emptyState"><strong>Sin eventos</strong><span>Aquí verás follows, joins y acciones.</span></div>`;
    return;
  }
  for (const item of rows) {
    els.eventList.appendChild(createMessageCard(item, 'event'));
  }
}

function renderGifts() {
  const filter = els.giftFilter.value;
  const rows = state.gifts.filter((item) => itemPassesFilter(item, filter));
  els.giftList.innerHTML = '';
  if (!rows.length) {
    els.giftList.innerHTML = `<div class="emptyState"><strong>Sin regalos</strong><span>Los gifts, subs y bits aparecerán aquí.</span></div>`;
    return;
  }
  for (const item of rows) {
    els.giftList.appendChild(createMessageCard(item, 'gift'));
  }
}

function renderAll() {
  renderChat();
  renderEvents();
  renderGifts();
}

function removeMessage(listName, id) {
  const list = state[listName];
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) list.splice(idx, 1);
  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (el) {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 220);
  }
}

function scheduleAutoDelete(item) {
  const ttl = Number(state.settings.appearance?.messageTtl || 0);
  if (!ttl) return;
  const id = item.id;
  if (state.timers.has(id)) clearTimeout(state.timers.get(id));
  const timer = setTimeout(() => {
    removeMessage('chat', id);
    state.timers.delete(id);
  }, ttl);
  state.timers.set(id, timer);
}

function pushChat(item) {
  const normalized = {
    id: item.id || uid(),
    platform: item.platform || 'tiktok',
    type: item.type || 'chat',
    displayName: item.displayName || item.user || 'Usuario',
    user: item.user || item.displayName || 'Usuario',
    channel: item.channel || item.uniqueId || item.user || item.displayName || '',
    avatar: item.avatar || '',
    message: item.message || '',
    badges: item.badges || [],
    emotes: item.emotes || {},
    color: item.color || '',
    timestamp: item.timestamp || Date.now(),
  };
  state.chat.unshift(normalized);
  state.chat = state.chat.slice(0, 200);
  if (els.chatFilter.value === 'all' || els.chatFilter.value === normalized.platform) {
    els.chatList.prepend(createMessageCard(normalized, 'chat'));
    const empty = els.chatList.querySelector('.emptyState');
    if (empty) empty.remove();
  }
  scheduleAutoDelete(normalized);
}

function pushEvent(item) {
  const normalized = {
    id: item.id || uid(),
    platform: item.platform || 'tiktok',
    type: item.type || 'system',
    displayName: item.displayName || item.user || 'Usuario',
    user: item.user || item.displayName || 'Usuario',
    channel: item.channel || item.uniqueId || item.user || item.displayName || '',
    avatar: item.avatar || '',
    message: item.message || '',
    badges: item.badges || [],
    emotes: item.emotes || {},
    timestamp: item.timestamp || Date.now(),
  };
  state.events.unshift(normalized);
  state.events = state.events.slice(0, 220);
  if (els.eventFilter.value === 'all' || els.eventFilter.value === normalized.platform) {
    els.eventList.prepend(createMessageCard(normalized, 'event'));
    const empty = els.eventList.querySelector('.emptyState');
    if (empty) empty.remove();
  }
}

function pushGift(item) {
  const normalized = {
    id: item.id || uid(),
    platform: item.platform || 'tiktok',
    type: item.type || 'gift',
    displayName: item.displayName || item.user || 'Usuario',
    user: item.user || item.displayName || 'Usuario',
    channel: item.channel || item.uniqueId || item.user || item.displayName || '',
    avatar: item.avatar || '',
    message: item.message || '',
    badges: item.badges || [],
    emotes: item.emotes || {},
    amount: item.amount || 0,
    timestamp: item.timestamp || Date.now(),
  };
  state.gifts.unshift(normalized);
  state.gifts = state.gifts.slice(0, 180);
  if (els.giftFilter.value === 'all' || els.giftFilter.value === normalized.platform) {
    els.giftList.prepend(createMessageCard(normalized, 'gift'));
    const empty = els.giftList.querySelector('.emptyState');
    if (empty) empty.remove();
  }
}

function disconnectPlatform(platform) {
  socket.emit(platform === 'tiktok' ? 'disconnectTikTok' : 'disconnectTwitch');
  state.session[platform] = { username: '', connected: false, profile: null };
  saveJSON(STORAGE_SESSION, state.session);
  renderTopbar();
  toast(`${platformLabel(platform)} desconectado`, '', 'ok');
}

async function connectTikTok() {
  const username = normalizeUsername(els.tiktokUser.value);
  if (!username) return toast('Escribe un username de TikTok.', '', 'err');
  socket.emit('connectTikTok', username);
  setSession('tiktok', username, true);
  await refreshProfile('tiktok', username);
  closeModal(els.connectModal);
  toast('TikTok conectado', `@${username}`);
}

async function connectTwitch() {
  const username = normalizeUsername(els.twitchUser.value);
  if (!username) return toast('Escribe un canal de Twitch.', '', 'err');
  socket.emit('connectTwitch', username);
  setSession('twitch', username, true);
  await refreshProfile('twitch', username);
  closeModal(els.connectModal);
  toast('Twitch conectado', username);
}

async function connectBoth() {
  const tiktok = normalizeUsername(els.tiktokUser.value);
  const twitch = normalizeUsername(els.twitchUser.value);
  if (!tiktok && !twitch) return toast('Escribe al menos una cuenta.', '', 'err');
  if (tiktok) {
    socket.emit('connectTikTok', tiktok);
    setSession('tiktok', tiktok, true);
    refreshProfile('tiktok', tiktok);
  }
  if (twitch) {
    socket.emit('connectTwitch', twitch);
    setSession('twitch', twitch, true);
    refreshProfile('twitch', twitch);
  }
  closeModal(els.connectModal);
  toast('Cuentas conectadas', 'El top bar se actualizó.');
}

function openConnectModal(platform = 'both') {
  if (state.session.tiktok.username) els.tiktokUser.value = state.session.tiktok.username;
  if (state.session.twitch.username) els.twitchUser.value = state.session.twitch.username;
  openModal(els.connectModal);
  els.closeConnectBtn.classList.toggle('hidden', !(state.session.tiktok.username || state.session.twitch.username));
  if (platform === 'tiktok') els.tiktokUser.focus();
  else if (platform === 'twitch') els.twitchUser.focus();
  else els.tiktokUser.focus();
}

function openCustomize() {
  openModal(els.customizeModal);
}

function openOverlay(view = null) {
  const chosen = view || state.settings.overlay?.defaultView || 'chat';
  const url = `overlay.html?view=${encodeURIComponent(chosen)}`;
  window.open(url, 'StreamFusionOverlay', 'width=1280,height=720,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no');
  toast('Overlay abierto', `Vista ${chosen}`);
}

function rememberSettingsFromUI() {
  collectSettingsFromUI();
  persistSettings();
  renderAll();
}

function maybeReconnect() {
  if (state.session.tiktok.connected && state.session.tiktok.username) socket.emit('connectTikTok', state.session.tiktok.username);
  if (state.session.twitch.connected && state.session.twitch.username) socket.emit('connectTwitch', state.session.twitch.username);
}

function bootstrap() {
  loadSettingsToUI();
  setThemeFromSettings();
  applyLayout();
  renderTopbar();
  renderAll();

  if (state.session.tiktok.username) refreshProfile('tiktok', state.session.tiktok.username);
  if (state.session.twitch.username) refreshProfile('twitch', state.session.twitch.username);

  const needsConnect = !state.session.tiktok.username && !state.session.twitch.username;
  if (needsConnect) {
    openModal(els.connectModal);
    els.closeConnectBtn.classList.add('hidden');
  } else {
    closeModal(els.connectModal);
  }

  els.connectTikTokBtn.addEventListener('click', connectTikTok);
  els.connectTwitchBtn.addEventListener('click', connectTwitch);
  els.connectBothBtn.addEventListener('click', connectBoth);
  els.closeConnectBtn.addEventListener('click', () => closeModal(els.connectModal));
  els.openConnectBtn.addEventListener('click', () => openConnectModal('both'));
  els.manageTikTokBtn.addEventListener('click', () => openConnectModal('tiktok'));
  els.manageTwitchBtn.addEventListener('click', () => openConnectModal('twitch'));
  els.disconnectTikTokBtn.addEventListener('click', () => disconnectPlatform('tiktok'));
  els.disconnectTwitchBtn.addEventListener('click', () => disconnectPlatform('twitch'));
  els.openCustomizeBtn.addEventListener('click', openCustomize);
  els.closeCustomizeBtn.addEventListener('click', () => closeModal(els.customizeModal));
  els.saveCustomizeBtn.addEventListener('click', () => { rememberSettingsFromUI(); closeModal(els.customizeModal); toast('Ajustes guardados', 'La interfaz se actualizó.'); });
  els.resetCustomizeBtn.addEventListener('click', () => {
    state.settings = structuredClone(defaults);
    saveJSON(STORAGE_SETTINGS, state.settings);
    loadSettingsToUI();
    persistSettings();
    renderAll();
    toast('Restaurado', 'Se aplicó la configuración base.');
  });
  els.openOverlayBtn.addEventListener('click', () => openModal(els.overlayModal));
  els.closeOverlayBtn.addEventListener('click', () => closeModal(els.overlayModal));
  els.cancelOverlayBtn.addEventListener('click', () => closeModal(els.overlayModal));
  els.overlayModal.querySelectorAll('[data-overlay-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(els.overlayModal);
      openOverlay(btn.dataset.overlayView);
    });
  });

  els.chatFilter.addEventListener('change', renderChat);
  els.eventFilter.addEventListener('change', renderEvents);
  els.giftFilter.addEventListener('change', renderGifts);
  [
    els.themeSelect,
    els.fontSelect,
    els.animationSelect,
    els.avatarFrameSelect,
    els.showAtHandle,
    els.showAvatars,
    els.showBadges,
    els.showTwitchBadges,
    els.showTwitchEmotes,
    els.showTikTokBadges,
    els.tiktokUsernameColor,
    els.messageTtlSelect,
    els.chatVisible,
    els.panelEventsVisible,
    els.panelGiftsVisible,
    els.panelOrder,
    els.overlayDefaultView,
  ].forEach((el) => el.addEventListener('change', rememberSettingsFromUI));

  els.tiktokUser.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectTikTok(); });
  els.twitchUser.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectTwitch(); });

  socket.on('connect', () => {
    toast('Socket conectado', 'StreamFusion listo.');
    maybeReconnect();
  });
  socket.on('disconnect', () => toast('Socket desconectado', '', 'err'));
  socket.on('settings', (settings) => {
    if (!settings) return;
    state.settings = deepMerge(structuredClone(defaults), settings);
    saveJSON(STORAGE_SETTINGS, state.settings);
    loadSettingsToUI();
    setThemeFromSettings();
    applyLayout();
    renderAll();
  });

  socket.on('chat', (data) => {
    pushChat({
      id: data?.id,
      platform: data?.platform || 'tiktok',
      type: data?.type || 'chat',
      displayName: data?.displayName || data?.user || 'Usuario',
      user: data?.user || data?.displayName || 'Usuario',
      channel: data?.channel || data?.uniqueId || data?.user || data?.displayName || '',
      avatar: data?.avatar || '',
      message: data?.message || '',
      badges: data?.badges || [],
      emotes: data?.emotes || {},
      color: data?.color || '',
      timestamp: data?.timestamp || Date.now(),
    });
  });

  socket.on('event', (data) => {
    const type = String(data?.type || 'system').toLowerCase();
    const message = String(data?.message || '').toLowerCase();
    if (message.includes('espectador') || message.includes('viewer count')) return;
    const payload = {
      id: data?.id,
      platform: data?.platform || 'tiktok',
      type,
      displayName: data?.displayName || data?.user || 'Usuario',
      user: data?.user || data?.displayName || 'Usuario',
      channel: data?.channel || data?.uniqueId || data?.user || data?.displayName || '',
      avatar: data?.avatar || '',
      message: data?.message || '',
      badges: data?.badges || [],
      emotes: data?.emotes || {},
      timestamp: data?.timestamp || Date.now(),
    };
    if (['gift', 'sub', 'bits', 'raid', 'envelope', 'fanclub'].includes(type)) pushGift(payload);
    else pushEvent(payload);
  });

  socket.on('system', (data) => {
    if (data?.message) toast('Sistema', data.message, 'ok');
  });

  if (!state.session.tiktok.connected && !state.session.twitch.connected) {
    toast('Conecta TikTok y/o Twitch para comenzar.', '', 'ok');
  }
}

bootstrap();

