const socket = io();

const $ = (id) => document.getElementById(id);
const ESC = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const SETTINGS_KEY = "streamfusion.ui.settings.v2";
const LEGACY_SETTINGS_KEY = "streamfusion.ui.settings.v1";
const SESSION_KEY = "streamfusion.ui.session.v2";
function PLACEHOLDER_AVATAR(seed, platform = "user") {
  const label = String(seed || platform || "U")
    .replace(/^@+/, "")
    .replace(/^#+/, "")
    .trim();
  const safeSeed = encodeURIComponent(label || String(platform || "user"));
  return `https://api.dicebear.com/10.x/notionists/svg?seed=${safeSeed}`;
}
const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

const els = {
  tiktokUser: $("tiktokUser"),
  twitchUser: $("twitchUser"),
  connectTikTokBtn: $("connectTikTokBtn"),
  connectTwitchBtn: $("connectTwitchBtn"),
  connectBothBtn: $("connectBothBtn"),
  closeConnectBtn: $("closeConnectBtn"),
  connectModal: $("connectModal"),
  openConnectBtn: $("openConnectBtn"),
  manageTikTokBtn: $("manageTikTokBtn"),
  manageTwitchBtn: $("manageTwitchBtn"),
  disconnectTikTokBtn: $("disconnectTikTokBtn"),
  disconnectTwitchBtn: $("disconnectTwitchBtn"),
  tiktokName: $("tiktokName"),
  twitchName: $("twitchName"),
  tiktokHandle: $("tiktokHandle"),
  twitchHandle: $("twitchHandle"),
  tiktokDot: $("tiktokDot"),
  twitchDot: $("twitchDot"),
  tiktokAvatar: $("tiktokAvatar"),
  twitchAvatar: $("twitchAvatar"),
  tiktokAvatarUrl: $("tiktokAvatarUrl"),
  tiktokAvatarFile: $("tiktokAvatarFile"),
  tiktokAvatarPreview: $("tiktokAvatarPreview"),
  clearTikTokAvatarBtn: $("clearTikTokAvatarBtn"),
  tiktokState: $("tiktokState"),
  twitchState: $("twitchState"),
  dashboard: $("dashboard"),
  chatList: $("chatList"),
  eventList: $("eventList"),
  giftList: $("giftList"),
  chatFilter: $("chatFilter"),
  chatJumpBtn: $("chatJumpBtn"),
  eventFilter: $("eventFilter"),
  giftFilter: $("giftFilter"),
  showLikes: $("showLikes"),
  showFollows: $("showFollows"),
  showShares: $("showShares"),
  showJoins: $("showJoins"),
  showSystem: $("showSystem"),
  showGifts: $("showGifts"),
  showSubs: $("showSubs"),
  showBits: $("showBits"),
  showRaids: $("showRaids"),
  openSettingsBtn: $("openSettingsBtn"),
  closeSettingsBtn: $("closeSettingsBtn"),
  saveSettingsBtn: $("saveSettingsBtn"),
  resetSettingsBtn: $("resetSettingsBtn"),
  settingsModal: $("settingsModal"),
  panelChatVisible: $("panelChatVisible"),
  panelEventsVisible: $("panelEventsVisible"),
  panelGiftsVisible: $("panelGiftsVisible"),
  panelOrder: $("panelOrder"),
  openPersonalizeBtn: $("openPersonalizeBtn"),
  closePersonalizeBtn: $("closePersonalizeBtn"),
  savePersonalizeBtn: $("savePersonalizeBtn"),
  resetPersonalizeBtn: $("resetPersonalizeBtn"),
  personalizeModal: $("personalizeModal"),
  themeSelect: $("themeSelect"),
  fontSelect: $("fontSelect"),
  animationSelect: $("animationSelect"),
  chatLayoutSelect: $("chatLayoutSelect"),
  chatDirectionSelect: $("chatDirectionSelect"),
  chatThemeSelect: $("chatThemeSelect"),
  avatarFrameSelect: $("avatarFrameSelect"),
  bubbleFrameSelect: $("bubbleFrameSelect"),
  badgeStyleSelect: $("badgeStyleSelect"),
  twitchNameColorSelect: $("twitchNameColorSelect"),
  tiktokNameColorSelect: $("tiktokNameColorSelect"),
  showBadges: $("showBadges"),
  showEmotes: $("showEmotes"),
  autoClearChat: $("autoClearChat"),
  clearChatSeconds: $("clearChatSeconds"),
  clearChatSecondsWrap: $("clearChatSecondsWrap"),
  openOverlayBtn: $("openOverlayBtn"),
  closeOverlayBtn: $("closeOverlayBtn"),
  overlayModal: $("overlayModal"),
  overlayChatBtn: $("overlayChatBtn"),
  overlayEventsBtn: $("overlayEventsBtn"),
  overlayGiftsBtn: $("overlayGiftsBtn"),
  toastWrap: $("toastWrap"),
  eventsCard: $("eventsCard"),
  giftsCard: $("giftsCard"),
};

const defaults = {
  panels: {
    chat: true,
    events: true,
    gifts: true,
  },
  order: "events-gifts",
  filters: {
    chat: "all",
    event: "all",
    gift: "all",
  },
  appearance: {
    theme: "dark",
  },
  profile: {
    tiktokAvatar: "",
    tiktokAvatarMode: "",
  },
  personal: {
    theme: "dark",
    font: "inter",
    animation: "slide",
    chatLayout: "vertical",
    chatDirection: "down",
    chatTheme: "glass",
    avatarFrame: "platform",
    bubbleFrame: "platform",
    badgeStyle: "emoji",
    twitchNameColor: "real",
    tiktokNameColor: "white",
    showBadges: true,
    showEmotes: true,
    autoClearChat: false,
    clearChatSeconds: 30,
  },
};

const state = {
  settings: loadSettings(),
  session: loadJSON(SESSION_KEY, {
    tiktok: { username: "", connected: false, avatarUrl: "" },
    twitch: { username: "", connected: false, avatarUrl: "" },
  }),
  chat: [],
  events: [],
  gifts: [],
  stats: {
    tiktok: {},
    twitch: {},
  },
  presence: {
    tiktok: { connected: false, live: false, lastSignal: 0, mode: "saved" },
    twitch: { connected: false, live: false, lastSignal: 0, mode: "saved" },
  },
  chatScroll: {
    unread: false,
    follow: true,
  },
};

const avatarCache = new Map();
const pendingAvatarRequests = new Map();

const platformColors = {
  tiktok: "#fe2c55",
  twitch: "#9146ff",
};

const roleBadges = {
  broadcaster: { emoji: "👑", color: "#f5d063" },
  moderator: { emoji: "🛡️", color: "#22c55e" },
  vip: { emoji: "💎", color: "#38bdf8" },
  subscriber: { emoji: "⭐", color: "#f59e0b" },
  founder: { emoji: "🏁", color: "#fb7185" },
  staff: { emoji: "🧰", color: "#a78bfa" },
  verified: { emoji: "✅", color: "#60a5fa" },
  artist: { emoji: "🎨", color: "#f472b6" },
  premium: { emoji: "✨", color: "#fcd34d" },
  tiktok: { emoji: "🎵", color: "#fe2c55" },
  twitch: { emoji: "🟣", color: "#9146ff" },
};


function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function makePlaceholderAvatar(seed, platform = "user") {
  return PLACEHOLDER_AVATAR(seed, platform);
}

function avatarKey(platform, username) {
  return `${String(platform || "user").toLowerCase()}:${normalizeUsername(username || "").toLowerCase()}`;
}

function fallbackAvatar(username, platform) {
  return makePlaceholderAvatar(`${platform || "user"}-${username || "guest"}`, platform);
}

function getThemeValue() {
  return state.settings.appearance?.theme || state.settings.personal?.theme || "dark";
}

function getTikTokAvatarOverride() {
  return safeText(state.settings.profile?.tiktokAvatar, "");
}

function setTikTokAvatarOverride(value, mode = "url") {
  const next = safeText(value, "");
  state.settings.profile = state.settings.profile || {};
  state.settings.profile.tiktokAvatar = next;
  state.settings.profile.tiktokAvatarMode = next ? mode : "";
  saveJSON(SETTINGS_KEY, state.settings);
  saveJSON(LEGACY_SETTINGS_KEY, state.settings);
  socket.emit("saveSettings", state.settings);
  renderTopbar();
  refreshTikTokAvatarPreview();
}

function sessionStatusInfo(platform) {
  const session = state.session[platform] || { username: "", connected: false, avatarUrl: "" };
  const presence = state.presence[platform] || { connected: false, live: false, lastSignal: 0, mode: "saved" };
  const username = safeText(session.username, "");
  const connected = Boolean(session.connected);
  const live = Boolean(presence.live && connected);
  const recentlyActive = presence.lastSignal ? (Date.now() - presence.lastSignal) < 150000 : false;

  let displayName = username || "Sin conectar";
  let handle = username ? `@${username}` : "—";
  let status = username ? "Guardado, listo para reconectar" : "Listo para agregar cuenta";
  let badge = "offline";

  if (username && connected) {
    badge = "online";
    if (live) {
      status = "En directo";
    } else {
      status = recentlyActive ? "Esperando directo" : "Conectado, esperando actividad";
    }
  }

  return { displayName, handle, status, badge };
}

function updatePresence(platform, patch = {}) {
  const key = String(platform || "").toLowerCase();
  if (!state.presence[key]) return;
  state.presence[key] = {
    ...state.presence[key],
    ...patch,
  };
  if (patch.lastSignal !== undefined) {
    state.presence[key].lastSignal = patch.lastSignal;
  }
}

function applyChatLayout() {
  const layout = String(state.settings.personal.chatLayout || "vertical");
  document.body.classList.toggle("chat-horizontal", layout === "horizontal");
  document.body.classList.toggle("chat-vertical", layout !== "horizontal");
  document.body.classList.remove("chat-theme-glass", "chat-theme-neon", "chat-theme-minimal");
  document.body.classList.add(`chat-theme-${state.settings.personal.chatTheme || "glass"}`);
}

function isChatAtEdge() {
  const layout = String(state.settings.personal.chatLayout || "vertical");
  const direction = String(state.settings.personal.chatDirection || "down");
  const el = els.chatList;
  if (!el) return true;
  if (layout === "horizontal") {
    if (direction === "up") return el.scrollLeft <= 24;
    return el.scrollLeft + el.clientWidth >= el.scrollWidth - 24;
  }
  if (direction === "up") return el.scrollTop <= 24;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
}

function scrollChatToEdge(smooth = true) {
  const layout = String(state.settings.personal.chatLayout || "vertical");
  const direction = String(state.settings.personal.chatDirection || "down");
  const behavior = smooth ? "smooth" : "auto";
  const el = els.chatList;
  if (!el) return;
  if (layout === "horizontal") {
    const left = direction === "up" ? 0 : Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({ left, top: 0, behavior });
    return;
  }
  const top = direction === "up" ? 0 : Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTo({ top, left: 0, behavior });
}

function syncChatNotice() {
  if (!els.chatJumpBtn) return;
  els.chatJumpBtn.classList.toggle("hidden", !state.chatScroll.unread);
}

function bindChatScroll() {
  if (!els.chatList) return;
  els.chatList.addEventListener("scroll", () => {
    if (isChatAtEdge()) {
      state.chatScroll.follow = true;
      state.chatScroll.unread = false;
    } else {
      state.chatScroll.follow = false;
    }
    syncChatNotice();
  }, { passive: true });
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return mergeDeep(structuredClone(fallback), JSON.parse(raw));
  } catch {
    return structuredClone(fallback);
  }
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    return loadJSON(SETTINGS_KEY, defaults);
  }
  const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (legacy) {
    try {
      return mergeDeep(structuredClone(defaults), JSON.parse(legacy));
    } catch {
      return structuredClone(defaults);
    }
  }
  return structuredClone(defaults);
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function mergeDeep(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const out = { ...base };
  for (const key of Object.keys(incoming)) {
    out[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
  }
  return out;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/^@+/, "")
    .replace(/^#+/, "")
    .split(/[/?#]/)[0]
    .trim();
}

function timeLabel(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function toast(title, body = "", kind = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${kind === "err" ? "err" : "ok"}`;
  el.innerHTML = `<div class="t">${ESC(title)}</div>${body ? `<div class="b">${ESC(body)}</div>` : ""}`;
  els.toastWrap.appendChild(el);
  window.setTimeout(() => el.remove(), 3200);
}

function openModal(modal) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function avatarForItem(item) {
  return item.avatar || fallbackAvatar(item.displayName || item.user || "Usuario", item.platform);
}

async function primeAvatar(platform, username, onResolved, options = {}) {
  const cleanName = normalizeUsername(username || "");
  if (!cleanName) return Promise.resolve("");

  const key = avatarKey(platform, cleanName);
  const allowFallback = options?.allowFallback !== false;

  const finish = (value) => {
    const resolved = String(value || "").trim();
    if (typeof onResolved === "function") onResolved(resolved);
    return resolved;
  };

  if (avatarCache.has(key)) {
    return Promise.resolve(finish(avatarCache.get(key)));
  }

  if (pendingAvatarRequests.has(key)) {
    const pending = pendingAvatarRequests.get(key);
    if (typeof onResolved === "function") pending.then(finish).catch(() => finish(allowFallback ? fallbackAvatar(cleanName, platform) : BLANK_PIXEL));
    return pending;
  }

  const request = fetch(`/api/avatar?platform=${encodeURIComponent(platform || "user")}&username=${encodeURIComponent(cleanName)}`)
    .then(async (res) => {
      if (!res.ok) throw new Error("Avatar lookup failed");
      return res.json();
    })
    .then((data) => {
      const apiAvatar = String(data?.avatarUrl || "").trim();
      const resolved = apiAvatar || (allowFallback ? fallbackAvatar(cleanName, platform) : BLANK_PIXEL);
      avatarCache.set(key, resolved);
      return resolved;
    })
    .catch(() => {
      const resolved = allowFallback ? fallbackAvatar(cleanName, platform) : BLANK_PIXEL;
      avatarCache.set(key, resolved);
      return resolved;
    })
    .finally(() => {
      pendingAvatarRequests.delete(key);
    });

  pendingAvatarRequests.set(key, request);
  request.then(finish).catch(() => finish(allowFallback ? fallbackAvatar(cleanName, platform) : BLANK_PIXEL));
  return request;
}

function setAvatarImage(img, platform, username, customSrc = "") {
  const seedAvatar = fallbackAvatar(username || platform || "user", platform);
  const resolvedCustom = safeText(customSrc, "");
  img.onerror = () => {
    img.onerror = null;
    img.src = seedAvatar;
  };
  img.src = resolvedCustom || seedAvatar;
  if (resolvedCustom) return;

  primeAvatar(platform, username, (url) => {
    img.src = url || seedAvatar;
  });
}

function platformTag(platform) {
  return `<span class="platformTag ${platform}">${platform === "twitch" ? "Twitch" : "TikTok"}</span>`;
}

function badgeEmoji(key, platform) {
  const lower = String(key || "").toLowerCase();
  if (roleBadges[lower]) return roleBadges[lower].emoji;
  if (lower === "mod") return roleBadges.moderator.emoji;
  if (lower === "broadcaster") return roleBadges.broadcaster.emoji;
  if (lower === "sub" || lower === "subscriber") return roleBadges.subscriber.emoji;
  if (lower === "vip") return roleBadges.vip.emoji;
  if (lower === "verified") return roleBadges.verified.emoji;
  if (lower === "staff") return roleBadges.staff.emoji;
  if (lower === "founder") return roleBadges.founder.emoji;
  if (lower === "premium") return roleBadges.premium.emoji;
  if (lower === "tiktok") return roleBadges.tiktok.emoji;
  if (lower === "twitch") return roleBadges.twitch.emoji;
  if (lower.includes("mod")) return roleBadges.moderator.emoji;
  if (lower.includes("vip")) return roleBadges.vip.emoji;
  if (lower.includes("sub")) return roleBadges.subscriber.emoji;
  return platform === "tiktok" ? "🎵" : "🟣";
}

function normalizeBadgeKeys(raw) {
  if (!raw) return [];
  const items = [];
  const push = (key) => {
    const clean = String(key || "").trim();
    if (clean) items.push(clean);
  };

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === "string") push(item);
      else if (item && typeof item === "object") push(item.name || item.type || item.label || item.id);
    });
  } else if (typeof raw === "object") {
    Object.entries(raw).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      push(key);
    });
  } else if (typeof raw === "string") {
    raw.split(/[,\s|]+/).forEach(push);
  }

  return items;
}

function badgeText(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.includes("broadcaster")) return "Broadcaster";
  if (lower.includes("mod")) return "Mod";
  if (lower.includes("vip")) return "VIP";
  if (lower.includes("sub")) return "Sub";
  if (lower.includes("staff")) return "Staff";
  if (lower.includes("verified")) return "Verified";
  if (lower.includes("founder")) return "Founder";
  if (lower.includes("premium")) return "Premium";
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("twitch")) return "Twitch";
  return lower.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function badgeChips(raw, platform) {
  const keys = normalizeBadgeKeys(raw);
  if (!state.settings.personal.showBadges) return "";
  const style = state.settings.personal.badgeStyle || "emoji";
  return keys.map((key) => {
    const content = style === "compact" ? badgeText(key) : badgeEmoji(key, platform);
    return `<span class="badge">${ESC(content)}</span>`;
  }).join("");
}

function resolveNameColor(item) {
  const platform = String(item?.platform || "tiktok").toLowerCase();
  if (platform === "twitch") {
    const mode = state.settings.personal.twitchNameColor || "real";
    if (mode === "real") return item?.color || platformColors.twitch;
    if (mode === "white") return "#f4f7ff";
    return platformColors.twitch;
  }

  const mode = state.settings.personal.tiktokNameColor || "white";
  if (mode === "pink") return platformColors.tiktok;
  if (mode === "platform") return platformColors.tiktok;
  return "#f4f7ff";
}

function parseTwitchEmotes(message, emoteString) {
  const text = String(message ?? "");
  if (!text) return "";
  if (!state.settings.personal.showEmotes || String(emoteString || "").trim() === "") {
    return ESC(text).replace(/\n/g, "<br>");
  }

  const ranges = [];
  String(emoteString).split("/").forEach((chunk) => {
    const [id, positions] = chunk.split(":");
    if (!id || !positions) return;
    positions.split(",").forEach((pair) => {
      const [start, end] = pair.split("-").map((v) => Number(v));
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
        ranges.push({ start, end, id });
      }
    });
  });

  if (!ranges.length) return ESC(text).replace(/\n/g, "<br>");
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);

  let out = "";
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    out += ESC(text.slice(cursor, range.start));
    const token = text.slice(range.start, range.end + 1);
    out += `<span class="twitchEmote" title="Twitch emote ${ESC(range.id)}">${ESC(token)}</span>`;
    cursor = range.end + 1;
  }
  out += ESC(text.slice(cursor));
  return out.replace(/\n/g, "<br>");
}

function getRenderedMessage(item) {
  const text = String(item?.message ?? "");
  if (String(item?.platform || "").toLowerCase() === "twitch") {
    return parseTwitchEmotes(text, item?.emotes);
  }
  return ESC(text).replace(/\n/g, "<br>");
}

function getRoleAccent(item) {
  const badges = normalizeBadgeKeys(item.badges);
  const rawKeys = Array.isArray(item.badges)
    ? item.badges.map((b) => String(b || "").toLowerCase())
    : item.badges && typeof item.badges === "object"
      ? Object.keys(item.badges).map((k) => String(k || "").toLowerCase())
      : [];
  if (rawKeys.some((k) => k.includes("broadcaster"))) return roleBadges.broadcaster.color;
  if (rawKeys.some((k) => k.includes("mod"))) return roleBadges.moderator.color;
  if (rawKeys.some((k) => k.includes("vip"))) return roleBadges.vip.color;
  if (rawKeys.some((k) => k.includes("staff"))) return roleBadges.staff.color;
  if (rawKeys.some((k) => k.includes("sub"))) return roleBadges.subscriber.color;
  if (rawKeys.some((k) => k.includes("verified"))) return roleBadges.verified.color;
  return badges.length ? platformColors[item.platform] : platformColors[item.platform];
}

function itemAccent(item) {
  const frameMode = state.settings.personal.avatarFrame || "platform";
  if (frameMode === "none") return "transparent";
  if (frameMode === "role") return getRoleAccent(item);
  return platformColors[item.platform] || "var(--accent)";
}

function frameClass() {
  return `frame-${state.settings.personal.avatarFrame || "platform"}`;
}

function bubbleClass() {
  return `frame-${state.settings.personal.bubbleFrame || "platform"}`;
}

function animationClass() {
  return `anim-${state.settings.personal.animation || "slide"}`;
}

function themeClass() {
  return `theme-${getThemeValue()}`;
}

function fontFamily(font) {
  const map = {
    inter: 'Inter, Segoe UI, Arial, sans-serif',
    system: 'Segoe UI, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    serif: 'Georgia, "Times New Roman", serif',
    emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Segoe UI, Arial, sans-serif',
  };
  return map[font] || map.inter;
}

function applyTheme() {
  document.body.classList.remove("theme-dark", "theme-matrix", "theme-neon", "theme-sunset", "theme-aurora");
  document.body.classList.add(themeClass());
  document.body.style.setProperty("--app-font", fontFamily(state.settings.personal.font));
}

function persistSettings() {
  state.settings.panels.chat = els.panelChatVisible.checked;
  state.settings.panels.events = els.panelEventsVisible.checked;
  state.settings.panels.gifts = els.panelGiftsVisible.checked;
  state.settings.order = els.panelOrder.value;
  state.settings.filters.chat = els.chatFilter.value;
  state.settings.filters.event = els.eventFilter.value;
  state.settings.filters.gift = els.giftFilter.value;
  state.settings.appearance = state.settings.appearance || {};
  state.settings.appearance.theme = els.themeSelect.value;
  state.settings.personal.theme = els.themeSelect.value; // compatibilidad con ajustes antiguos
  state.settings.personal.font = els.fontSelect.value;
  state.settings.profile = state.settings.profile || {};
  const customAvatarInput = safeText(els.tiktokAvatarUrl?.value, "");
  if (customAvatarInput) {
    state.settings.profile.tiktokAvatar = customAvatarInput;
    state.settings.profile.tiktokAvatarMode = "url";
  } else if (state.settings.profile.tiktokAvatarMode === "url") {
    state.settings.profile.tiktokAvatar = "";
    state.settings.profile.tiktokAvatarMode = "";
  }
  state.settings.personal.animation = els.animationSelect.value;
  state.settings.personal.chatLayout = els.chatLayoutSelect.value;
  state.settings.personal.chatDirection = els.chatDirectionSelect.value;
  state.settings.personal.chatTheme = els.chatThemeSelect.value;
  state.settings.personal.avatarFrame = els.avatarFrameSelect.value;
  state.settings.personal.bubbleFrame = els.bubbleFrameSelect.value;
  state.settings.personal.badgeStyle = els.badgeStyleSelect.value;
  state.settings.personal.twitchNameColor = els.twitchNameColorSelect.value;
  state.settings.personal.tiktokNameColor = els.tiktokNameColorSelect.value;
  state.settings.personal.showBadges = els.showBadges.checked;
  state.settings.personal.showEmotes = els.showEmotes.checked;
  state.settings.personal.autoClearChat = els.autoClearChat.checked;
  state.settings.personal.clearChatSeconds = Number(els.clearChatSeconds.value || 30);

  saveJSON(SETTINGS_KEY, state.settings);
  saveJSON(LEGACY_SETTINGS_KEY, state.settings);
  socket.emit("saveSettings", state.settings);
}

function loadSettingsToUI() {
  const s = state.settings;
  els.panelChatVisible.checked = s.panels?.chat !== false;
  els.panelEventsVisible.checked = s.panels?.events !== false;
  els.panelGiftsVisible.checked = s.panels?.gifts !== false;
  els.panelOrder.value = s.order || "events-gifts";
  els.chatFilter.value = s.filters?.chat || "all";
  els.eventFilter.value = s.filters?.event || "all";
  els.giftFilter.value = s.filters?.gift || "all";
  els.themeSelect.value = s.appearance?.theme || s.personal?.theme || "dark";
  els.fontSelect.value = s.personal?.font || "inter";
  els.animationSelect.value = s.personal?.animation || "slide";
  els.chatLayoutSelect.value = s.personal?.chatLayout || "vertical";
  els.chatDirectionSelect.value = s.personal?.chatDirection || "down";
  els.chatThemeSelect.value = s.personal?.chatTheme || "glass";
  els.avatarFrameSelect.value = s.personal?.avatarFrame || "platform";
  els.bubbleFrameSelect.value = s.personal?.bubbleFrame || "platform";
  els.badgeStyleSelect.value = s.personal?.badgeStyle || "emoji";
  els.twitchNameColorSelect.value = s.personal?.twitchNameColor || "real";
  els.tiktokNameColorSelect.value = s.personal?.tiktokNameColor || "white";
  els.showBadges.checked = s.personal?.showBadges !== false;
  els.showEmotes.checked = s.personal?.showEmotes !== false;
  els.autoClearChat.checked = s.personal?.autoClearChat === true;
  els.clearChatSeconds.value = String(s.personal?.clearChatSeconds || 30);
  const savedTikTokAvatar = s.profile?.tiktokAvatar || "";
  const savedTikTokAvatarMode = s.profile?.tiktokAvatarMode || "";
  els.tiktokAvatarUrl.value = savedTikTokAvatarMode === "url" || (savedTikTokAvatar && !String(savedTikTokAvatar).startsWith("data:image/"))
    ? savedTikTokAvatar
    : "";
  els.clearChatSecondsWrap.classList.toggle("hidden", !els.autoClearChat.checked);
  applyTheme();
  refreshTikTokAvatarPreview();
}

function renderTopbar() {
  const tiktok = state.session.tiktok;
  const twitch = state.session.twitch;
  const tiktokInfo = sessionStatusInfo("tiktok");
  const twitchInfo = sessionStatusInfo("twitch");

  els.tiktokName.textContent = tiktokInfo.displayName;
  els.twitchName.textContent = twitchInfo.displayName;
  if (els.tiktokHandle) els.tiktokHandle.textContent = tiktokInfo.handle;
  if (els.twitchHandle) els.twitchHandle.textContent = twitchInfo.handle;

  els.tiktokDot.classList.toggle("online", tiktokInfo.badge === "online");
  els.tiktokDot.classList.toggle("offline", tiktokInfo.badge !== "online");
  els.twitchDot.classList.toggle("online", twitchInfo.badge === "online");
  els.twitchDot.classList.toggle("offline", twitchInfo.badge !== "online");

  const customTikTokAvatar = getTikTokAvatarOverride();
  setAvatarImage(els.tiktokAvatar, "tiktok", tiktok.username || "tiktok", customTikTokAvatar || tiktok.avatarUrl || "");
  setAvatarImage(els.twitchAvatar, "twitch", twitch.username || "twitch");

  els.tiktokState.textContent = tiktokInfo.status;
  els.twitchState.textContent = twitchInfo.status;

  els.manageTikTokBtn.textContent = tiktok.username ? "Cambiar" : "Agregar";
  els.manageTwitchBtn.textContent = twitch.username ? "Cambiar" : "Agregar";
  els.disconnectTikTokBtn.classList.toggle("hidden", !tiktok.connected);
  els.disconnectTwitchBtn.classList.toggle("hidden", !twitch.connected);
}

function renderLayout() {
  els.chatList.closest(".panel").style.display = state.settings.panels.chat ? "flex" : "none";
  els.eventsCard.style.display = state.settings.panels.events ? "flex" : "none";
  els.giftsCard.style.display = state.settings.panels.gifts ? "flex" : "none";

  if (state.settings.order === "gifts-events") {
    els.giftsCard.style.order = 1;
    els.eventsCard.style.order = 2;
  } else {
    els.eventsCard.style.order = 1;
    els.giftsCard.style.order = 2;
  }

  applyTheme();
  applyChatLayout();
}

function openConnectModal(focus = "both", closable = true) {
  els.closeConnectBtn.classList.toggle("hidden", !closable);
  openModal(els.connectModal);
  const focusTarget = focus === "tiktok" ? els.tiktokUser : focus === "twitch" ? els.twitchUser : els.connectBothBtn;
  window.setTimeout(() => focusTarget?.focus?.(), 60);
}

function openOverlayModal() {
  openModal(els.overlayModal);
}

function openPersonalizeModal() {
  openModal(els.personalizeModal);
}

function openSettingsModal() {
  openModal(els.settingsModal);
}

function closeAllModals() {
  [els.connectModal, els.settingsModal, els.personalizeModal, els.overlayModal].forEach((modal) => {
    closeModal(modal);
  });
}

function setSession(platform, username, connected) {
  state.session[platform] = {
    username: username || state.session[platform].username || "",
    connected: Boolean(connected),
    avatarUrl: state.session[platform]?.avatarUrl || "",
  };
  saveJSON(SESSION_KEY, state.session);
  renderTopbar();
  primeAvatar(platform, username, (url) => {
    state.session[platform].avatarUrl = url || "";
    saveJSON(SESSION_KEY, state.session);
    renderTopbar();
  });
}

function connectTikTok() {
  const username = normalizeUsername(els.tiktokUser.value);
  if (!username) return toast("Escribe un username de TikTok.", "", "err");
  socket.emit("connectTikTok", username);
  setSession("tiktok", username, true);
  updatePresence("tiktok", { connected: true, live: false, mode: "waiting", lastSignal: Date.now() });
  els.tiktokUser.value = username;
  toast("TikTok conectado", `@${username}`);
}

function connectTwitch() {
  const username = normalizeUsername(els.twitchUser.value);
  if (!username) return toast("Escribe un canal de Twitch.", "", "err");
  socket.emit("connectTwitch", username);
  setSession("twitch", username, true);
  updatePresence("twitch", { connected: true, live: false, mode: "waiting", lastSignal: Date.now() });
  els.twitchUser.value = username;
  toast("Twitch conectado", username);
}

function disconnectPlatform(platform) {
  const current = state.session[platform]?.username || "";
  if (platform === "tiktok") socket.emit("disconnectTikTok");
  else socket.emit("disconnectTwitch");
  setSession(platform, current, false);
  updatePresence(platform, { connected: false, live: false, mode: "saved", lastSignal: 0 });
  toast(`${platform === "tiktok" ? "TikTok" : "Twitch"} desconectado`, current ? `@${current}` : "");
}

function openOverlay(view) {
  const safeView = ["chat", "events", "gifts"].includes(view) ? view : "chat";
  const w = window.open(`overlay.html?view=${encodeURIComponent(safeView)}`, `StreamFusionOverlay-${safeView}`, "width=1280,height=720,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no");
  if (w) {
    toast("Overlay abierto", `Vista ${safeView}`);
  } else {
    toast("No se pudo abrir el overlay.", "Permite ventanas emergentes.", "err");
  }
}

function typeAllowed(item) {
  const type = String(item.type || "system").toLowerCase();
  const text = String(item.message || "").toLowerCase();
  if (item.group === "gift") return true;
  if (type === "like") return els.showLikes.checked;
  if (type === "follow") return els.showFollows.checked;
  if (type === "share") return els.showShares.checked;
  if (type === "join" || type === "member" || text.includes("entr") || text.includes("joined") || text.includes("se unió")) return els.showJoins.checked;
  if (type === "system" || type === "question") return els.showSystem.checked;
  return true;
}

function giftAllowed(item) {
  const type = String(item.type || "gift").toLowerCase();
  if (type === "gift" || type === "envelope" || type === "fanclub") return els.showGifts.checked;
  if (type === "sub" || type === "subscription" || type === "resub") return els.showSubs.checked;
  if (type === "bits") return els.showBits.checked;
  if (type === "raid" || type === "host") return els.showRaids.checked;
  return true;
}

function renderItem(item, kind) {
  const name = item.displayName || item.user || "Usuario";
  const platform = item.platform || "tiktok";
  const accent = itemAccent(item);
  const roleAccent = getRoleAccent(item);
  const badges = badgeChips(item.badges, platform);
  const color = resolveNameColor(item);
  const text = kind === "chat"
    ? item.message || ""
    : kind === "gift"
      ? item.message || `${name} envió un regalo`
      : item.message || "";
  const action = kind === "chat" ? (item.action || "Mensaje") : (item.action || kind);
  const kindLabel = kind === "chat" ? "Chat" : kind === "gift" ? "Regalo" : "Evento";
  const bubbleFrame = bubbleClass();

  return `
    <article class="${kind === "chat" ? "message" : kind === "gift" ? "giftItem" : "eventItem"} ${kind === "chat" ? animationClass() : ""}" style="--item-accent:${accent}; --role-accent:${roleAccent}; --name-color:${color}">
      <div class="entryAvatarWrap ${frameClass()}">
        <img class="entryAvatar" src="${ESC(avatarForItem(item))}" alt="avatar" loading="lazy" />
      </div>
      <div class="entryBody">
        <div class="entryBubble ${bubbleFrame}">
          <div class="entryTop">
            <span class="user">${ESC(name)}</span>
            ${platformTag(platform)}
            <span class="actionTag">${ESC(action)}</span>
            <span class="timeTag">${timeLabel(item.timestamp)}</span>
          </div>
          <div class="entryText">${kind === "chat" ? getRenderedMessage(item) : ESC(text).replace(/\n/g, "<br>")}</div>
          ${item.gift ? `<div class="entryActionLine"><span class="giftTag">🎁 ${ESC(item.gift)}</span>${item.amount ? `<span class="kindTag">x${ESC(item.amount)}</span>` : ""}</div>` : ""}
          ${badges ? `<div class="entryMeta">${badges}</div>` : ""}
        </div>
      </div>
    </article>`;
}

function renderChat() {
  const filter = els.chatFilter.value;
  const direction = String(state.settings.personal.chatDirection || "down");
  const rows = state.chat
    .filter((item) => (filter === "all" || item.platform === filter))
    .sort((a, b) => direction === "up"
      ? (b.timestamp || 0) - (a.timestamp || 0)
      : (a.timestamp || 0) - (b.timestamp || 0));

  els.chatList.innerHTML = rows.length
    ? rows.map((item) => renderItem(item, "chat")).join("")
    : `<div class="emptyState"><strong>Sin chat aún</strong><span>Cuando entren mensajes aparecerán aquí.</span></div>`;

  if (rows.length && state.chatScroll.follow) {
    scrollChatToEdge(false);
    state.chatScroll.unread = false;
    syncChatNotice();
  }
}

function renderEvents() {
  const filter = els.eventFilter.value;
  const rows = state.events.filter((item) => (filter === "all" || item.platform === filter) && typeAllowed(item));
  els.eventList.innerHTML = rows.length
    ? rows.map((item) => renderItem(item, "event")).join("")
    : `<div class="emptyState"><strong>Sin eventos</strong><span>Likes, follows, joins y avisos aparecerán aquí.</span></div>`;
}

function renderGifts() {
  const filter = els.giftFilter.value;
  const rows = state.gifts.filter((item) => (filter === "all" || item.platform === filter) && giftAllowed(item));
  els.giftList.innerHTML = rows.length
    ? rows.map((item) => renderItem(item, "gift")).join("")
    : `<div class="emptyState"><strong>Sin regalos</strong><span>Subs, bits, gifts y raids aparecerán aquí.</span></div>`;
}

function renderAll() {
  renderLayout();
  renderTopbar();
  renderChat();
  renderEvents();
  renderGifts();
}

function refreshTikTokAvatarPreview() {
  if (!els.tiktokAvatarPreview) return;
  const custom = getTikTokAvatarOverride();
  const sessionName = state.session.tiktok?.username || "tiktok";
  els.tiktokAvatarPreview.src = custom || PLACEHOLDER_AVATAR(sessionName, "tiktok");
  els.tiktokAvatarPreview.alt = custom ? "Foto de perfil TikTok personalizada" : "Vista previa de TikTok";
}

function syncTikTokAvatarField(value) {
  const next = safeText(value, "");
  if (els.tiktokAvatarUrl) els.tiktokAvatarUrl.value = next;
  setTikTokAvatarOverride(next, "url");
}

function loadAvatarFromFile(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    toast("Archivo inválido", "El archivo debe ser una imagen.", "err");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    if (!dataUrl) return;
    if (els.tiktokAvatarUrl) els.tiktokAvatarUrl.value = "";
    setTikTokAvatarOverride(dataUrl, "upload");
    if (els.tiktokAvatarFile) els.tiktokAvatarFile.value = "";
    toast("Foto de TikTok actualizada", "Se guardó la imagen subida.");
  };
  reader.readAsDataURL(file);
}

function pushChat(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: data.avatar || fallbackAvatar(data.displayName || data.user || "Usuario", data.platform),
    timestamp: data.timestamp || Date.now(),
  };
  state.chat.push(item);
  if (state.chat.length > 240) state.chat.splice(0, state.chat.length - 240);
  const follow = state.chatScroll.follow && isChatAtEdge();
  renderChat();
  if (!follow) {
    state.chatScroll.unread = true;
    state.chatScroll.follow = false;
    syncChatNotice();
  }
  primeAvatar(item.platform, item.displayName || item.user, (url) => {
    item.avatar = url || item.avatar;
    renderChat();
  });
}

function pushEvent(data, group = "event") {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    group,
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: data.avatar || fallbackAvatar(data.displayName || data.user || "Usuario", data.platform),
    timestamp: data.timestamp || Date.now(),
  };
  state.events.unshift(item);
  state.events = state.events.slice(0, 240);
  renderEvents();
  primeAvatar(item.platform, item.displayName || item.user, (url) => {
    item.avatar = url || item.avatar;
    renderEvents();
  });
}

function pushGift(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    group: "gift",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: data.avatar || fallbackAvatar(data.displayName || data.user || "Usuario", data.platform),
    timestamp: data.timestamp || Date.now(),
  };
  state.gifts.unshift(item);
  state.gifts = state.gifts.slice(0, 240);
  renderGifts();
  primeAvatar(item.platform, item.displayName || item.user, (url) => {
    item.avatar = url || item.avatar;
    renderGifts();
  });
}

function clearOldChat() {
  if (!state.settings.personal.autoClearChat) return;
  const maxAge = Math.max(10, Number(state.settings.personal.clearChatSeconds || 30)) * 1000;
  const cutoff = Date.now() - maxAge;
  const before = state.chat.length;
  state.chat = state.chat.filter((item) => (item.timestamp || 0) >= cutoff);
  if (state.chat.length !== before) renderChat();
}

function bindEvents() {
  els.openConnectBtn.addEventListener("click", () => openConnectModal("both", true));
  els.manageTikTokBtn.addEventListener("click", () => openConnectModal("tiktok", true));
  els.manageTwitchBtn.addEventListener("click", () => openConnectModal("twitch", true));
  els.disconnectTikTokBtn.addEventListener("click", () => disconnectPlatform("tiktok"));
  els.disconnectTwitchBtn.addEventListener("click", () => disconnectPlatform("twitch"));
  els.connectTikTokBtn.addEventListener("click", connectTikTok);
  els.connectTwitchBtn.addEventListener("click", connectTwitch);
  els.connectBothBtn.addEventListener("click", () => {
    connectTikTok();
    connectTwitch();
  });
  els.closeConnectBtn.addEventListener("click", () => closeModal(els.connectModal));

  els.openOverlayBtn.addEventListener("click", openOverlayModal);
  els.closeOverlayBtn.addEventListener("click", () => closeModal(els.overlayModal));
  els.overlayChatBtn.addEventListener("click", () => openOverlay("chat"));
  els.overlayEventsBtn.addEventListener("click", () => openOverlay("events"));
  els.overlayGiftsBtn.addEventListener("click", () => openOverlay("gifts"));

  if (els.chatJumpBtn) {
    els.chatJumpBtn.addEventListener("click", () => {
      state.chatScroll.unread = false;
      state.chatScroll.follow = true;
      syncChatNotice();
      scrollChatToEdge(true);
    });
  }

  els.openPersonalizeBtn.addEventListener("click", openPersonalizeModal);
  els.closePersonalizeBtn.addEventListener("click", () => closeModal(els.personalizeModal));
  els.openSettingsBtn.addEventListener("click", openSettingsModal);
  els.closeSettingsBtn.addEventListener("click", () => closeModal(els.settingsModal));

  els.saveSettingsBtn.addEventListener("click", () => {
    persistSettings();
    renderAll();
    toast("Ajustes guardados", "Paneles, tema y foto actualizados.");
    closeModal(els.settingsModal);
  });

  els.resetSettingsBtn.addEventListener("click", () => {
    state.settings.panels.chat = true;
    state.settings.panels.events = true;
    state.settings.panels.gifts = true;
    state.settings.order = "events-gifts";
    state.settings.filters.chat = "all";
    state.settings.filters.event = "all";
    state.settings.filters.gift = "all";
    state.settings.appearance = state.settings.appearance || {};
    state.settings.appearance.theme = defaults.appearance.theme;
    state.settings.personal.theme = defaults.appearance.theme;
    state.settings.profile = state.settings.profile || {};
    state.settings.profile.tiktokAvatar = "";
    state.settings.profile.tiktokAvatarMode = "";
    saveJSON(SETTINGS_KEY, state.settings);
    saveJSON(LEGACY_SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    renderAll();
    toast("Ajustes restaurados", "Se recuperó la vista base.");
  });

  els.savePersonalizeBtn.addEventListener("click", () => {
    persistSettings();
    renderAll();
    toast("Personalización aplicada", "Se guardó también para el overlay.");
    closeModal(els.personalizeModal);
  });

  els.tiktokAvatarUrl?.addEventListener("change", () => {
    syncTikTokAvatarField(els.tiktokAvatarUrl.value);
    renderAll();
  });

  els.tiktokAvatarFile?.addEventListener("change", () => {
    const file = els.tiktokAvatarFile.files?.[0];
    loadAvatarFromFile(file);
  });

  els.clearTikTokAvatarBtn?.addEventListener("click", () => {
    if (els.tiktokAvatarUrl) els.tiktokAvatarUrl.value = "";
    if (els.tiktokAvatarFile) els.tiktokAvatarFile.value = "";
    setTikTokAvatarOverride("", "");
    renderAll();
    toast("Foto de TikTok borrada", "Se volverá al avatar real o al marcador de carga.");
  });

  els.resetPersonalizeBtn.addEventListener("click", () => {
    Object.assign(state.settings.personal, structuredClone(defaults.personal));
    saveJSON(SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    renderAll();
    toast("Personalización restaurada", "Se volvió al tema base.");
  });

  [
    els.chatFilter,
    els.eventFilter,
    els.giftFilter,
    els.themeSelect,
    els.fontSelect,
    els.animationSelect,
    els.chatLayoutSelect,
    els.chatDirectionSelect,
    els.chatThemeSelect,
    els.avatarFrameSelect,
    els.bubbleFrameSelect,
    els.badgeStyleSelect,
    els.twitchNameColorSelect,
    els.tiktokNameColorSelect,
    els.showBadges,
    els.showEmotes,
    els.autoClearChat,
    els.clearChatSeconds,
    els.panelChatVisible,
    els.panelEventsVisible,
    els.panelGiftsVisible,
    els.panelOrder,
    els.showLikes,
    els.showFollows,
    els.showShares,
    els.showJoins,
    els.showSystem,
    els.showGifts,
    els.showSubs,
    els.showBits,
    els.showRaids,
  ].forEach((el) => {
    el.addEventListener("change", () => {
      if (el === els.autoClearChat) {
        els.clearChatSecondsWrap.classList.toggle("hidden", !els.autoClearChat.checked);
      }
      persistSettings();
      renderAll();
    });
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeAllModals();
  });

  window.addEventListener("click", (ev) => {
    [els.connectModal, els.settingsModal, els.personalizeModal, els.overlayModal].forEach((modal) => {
      if (ev.target === modal) closeModal(modal);
    });
  });

  window.addEventListener("storage", (ev) => {
    if (ev.key === SETTINGS_KEY && ev.newValue) {
      try {
        state.settings = mergeDeep(structuredClone(defaults), JSON.parse(ev.newValue));
        loadSettingsToUI();
        renderAll();
      } catch {}
    }
  });

  window.setInterval(clearOldChat, 5000);
}

function bootstrap() {
  loadSettingsToUI();
  renderAll();
  bindEvents();
  bindChatScroll();

  if (state.session.tiktok.username) {
    els.tiktokUser.value = state.session.tiktok.username;
    primeAvatar("tiktok", state.session.tiktok.username, renderTopbar);
  }
  if (state.session.twitch.username) {
    els.twitchUser.value = state.session.twitch.username;
    primeAvatar("twitch", state.session.twitch.username, renderTopbar);
  }

  if (!state.session.tiktok.username && !state.session.twitch.username) {
    openConnectModal("both", false);
  }

  socket.on("connect", () => {
    toast("Conectado", "StreamFusion está listo.");
  });

  socket.on("disconnect", () => {
    toast("Desconectado", "Se perdió la conexión con el servidor.", "err");
  });

  socket.on("settings", (serverSettings) => {
    state.settings = mergeDeep(structuredClone(defaults), serverSettings || {});
    saveJSON(SETTINGS_KEY, state.settings);
    saveJSON(LEGACY_SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    renderAll();
  });

  socket.on("system", (data) => {
    if (data?.message) {
      toast("Sistema", data.message);
      const msg = String(data.message || "").toLowerCase();
      if (msg.includes("tiktok")) {
        if (msg.includes("desconect")) updatePresence("tiktok", { connected: false, live: false, mode: "saved", lastSignal: 0 });
        else if (msg.includes("conect")) updatePresence("tiktok", { connected: true, live: false, mode: "waiting", lastSignal: Date.now() });
      }
      if (msg.includes("twitch")) {
        if (msg.includes("desconect")) updatePresence("twitch", { connected: false, live: false, mode: "saved", lastSignal: 0 });
        else if (msg.includes("conect")) updatePresence("twitch", { connected: true, live: false, mode: "waiting", lastSignal: Date.now() });
      }
    }
  });

  socket.on("chat", (data) => {
    const platform = data?.platform || "tiktok";
    const displayName = data?.displayName || data?.user || data?.uniqueId || "Usuario";
    pushChat({
      platform,
      type: data?.type || "chat",
      action: data?.action || "Comentario",
      user: data?.user || displayName,
      displayName,
      avatar: data?.avatar || "",
      message: data?.message || "",
      badges: data?.badges || [],
      emotes: data?.emotes || "",
      color: data?.color || "",
      timestamp: data?.timestamp || Date.now(),
    });
    updatePresence(platform, { connected: true, live: true, mode: "live", lastSignal: Date.now() });
  });

  socket.on("event", (data) => {
    const platform = data?.platform || "tiktok";
    const type = String(data?.type || "system").toLowerCase();
    const action = String(data?.action || "Evento");
    const message = String(data?.message || "");
    const item = {
      platform,
      type,
      action,
      user: data?.user || data?.displayName || "Usuario",
      displayName: data?.displayName || data?.user || "Usuario",
      avatar: data?.avatar || "",
      message,
      gift: data?.gift || "",
      amount: data?.amount || "",
      bits: data?.bits || "",
      timestamp: data?.timestamp || Date.now(),
    };

    if (type === "gift" || type === "sub" || type === "bits" || type === "raid" || type === "host") {
      pushGift(item);
    } else if (type === "follow" || type === "share" || type === "join" || type === "question" || type === "like" || type === "system") {
      pushEvent(item, "event");
    } else {
      pushEvent(item, "event");
    }
    updatePresence(platform, { connected: true, live: true, mode: "live", lastSignal: Date.now() });
  });

  socket.on("accountState", (data) => {
    const platform = String(data?.platform || "").toLowerCase();
    if (!platform) return;
    const current = state.session[platform]?.username || "";
    setSession(platform, data?.username || current, Boolean(data?.connected));
    updatePresence(platform, {
      connected: Boolean(data?.connected),
      live: Boolean(data?.live),
      mode: data?.mode || (data?.connected ? "waiting" : "saved"),
      lastSignal: data?.live ? Date.now() : 0,
    });
    renderTopbar();
  });

  socket.on("stats", (data) => {
    state.stats = data || {};
  });
}

bootstrap();
