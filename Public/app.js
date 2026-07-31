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
const PRESENCE_KEY = "streamfusion.ui.presence.v1";
const SUPPORTERS_KEY = "streamfusion.ui.supporters.v1";
const ACTIVITY_BADGES_KEY = "streamfusion.ui.activityBadges.v1";
function PLACEHOLDER_AVATAR(seed, platform = "user") {
  const label = String(seed || platform || "U")
    .replace(/^@+/, "")
    .replace(/^#+/, "")
    .trim();
  const initial = (label.match(/[A-Za-z0-9]/)?.[0] || String(platform || "U")[0] || "U").toUpperCase();
  const accent = platform === "twitch" ? "#9146ff" : platform === "tiktok" ? "#fe2c55" : "#64748b";
  const bg = platform === "twitch" ? "#0f172a" : platform === "tiktok" ? "#111827" : "#1f2937";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accent}" />
        <stop offset="100%" stop-color="${bg}" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle"
      font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#ffffff">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
let giftCatalogReady = false;
let giftCatalog = [];
let giftCatalogIndex = new Map();
let giftCatalogPromise = null;

function normalizeGiftKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function ensureGiftCatalog() {
  if (giftCatalogReady) return giftCatalog;
  if (!giftCatalogPromise) {
    giftCatalogPromise = fetch("/data/tiktok-gifts.json")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        giftCatalog = items;
        giftCatalogIndex = new Map();
        for (const item of items) {
          for (const candidate of [item?.key, item?.name, item?.alt]) {
            const key = normalizeGiftKey(candidate);
            if (key && !giftCatalogIndex.has(key)) giftCatalogIndex.set(key, item);
          }
        }
        giftCatalogReady = true;
        return giftCatalog;
      })
      .catch(() => {
        giftCatalogReady = true;
        giftCatalog = [];
        giftCatalogIndex = new Map();
        return giftCatalog;
      });
  }
  return giftCatalogPromise;
}

function lookupGiftCatalog(name) {
  const key = normalizeGiftKey(name);
  return key ? (giftCatalogIndex.get(key) || null) : null;
}

function normalizeImageSource(value) {
  const src = String(value ?? "").trim();
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src;
  return "";
}

function dicebearTikTokAvatar(seed) {
  const base = String(seed || "tiktok").trim() || "tiktok";
  return `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(base)}`;
}

function sanitizeTikTokUserAvatar(value) {
  const src = normalizeImageSource(value);
  if (!src) return "";
  if (/dicebear\.com/i.test(src)) return "";
  if (/data:image\/svg\+xml/i.test(src)) return "";
  return src;
}

function getTikTokTopbarAvatarUrl() {
  const custom = normalizeImageSource(state.settings?.personal?.tiktokAvatarUrl);
  if (custom) return custom;

  const sessionAvatar = normalizeImageSource(state.session?.tiktok?.avatarUrl);
  if (sessionAvatar) return sessionAvatar;

  const seed = safeText(state.session?.tiktok?.username, "tiktok") || "tiktok";
  return dicebearTikTokAvatar(seed);
}

function applyAvatarSource(img, primary, fallback = "") {
  if (!img) return;
  const safePrimary = normalizeImageSource(primary);
  const safeFallback = normalizeImageSource(fallback);
  const next = safePrimary || safeFallback || BLANK_PIXEL;

  if (!safePrimary && !safeFallback) {
    img.src = BLANK_PIXEL;
    return;
  }

  img.onerror = safeFallback && safeFallback !== safePrimary
    ? () => {
        img.onerror = null;
        img.src = safeFallback;
      }
    : null;

  img.src = next;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

const els = {
  tiktokUser: $("tiktokUser"),
  twitchUser: $("twitchUser"),
  connectTikTokBtn: $("connectTikTokBtn"),
  connectTwitchBtn: $("connectTwitchBtn"),
  connectBothBtn: $("connectBothBtn"),
  closeConnectBtn: $("closeConnectBtn"),
  connectModal: $("connectModal"),
  openConnectBtn: $("openConnectBtn"),
  openEventsPersonalizeBtn: $("openEventsPersonalizeBtn"),
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
  eventsLayoutSelect: $("eventsLayoutSelect"),
  eventsDirectionSelect: $("eventsDirectionSelect"),
  eventsModeSelect: $("eventsModeSelect"),
  eventsPanelSizeSelect: $("eventsPanelSizeSelect"),
  eventsOverlayShapeSelect: $("eventsOverlayShapeSelect"),
  giftsLayoutSelect: $("giftsLayoutSelect"),
  giftsDirectionSelect: $("giftsDirectionSelect"),
  giftsModeSelect: $("giftsModeSelect"),
  giftsPanelSizeSelect: $("giftsPanelSizeSelect"),
  giftsOverlayShapeSelect: $("giftsOverlayShapeSelect"),
  highlightStyleSelect: $("highlightStyleSelect"),
  overlayEventsHighlightSelect: $("overlayEventsHighlightSelect"),
  giftHighlightStyleSelect: $("giftHighlightStyleSelect"),
  overlayGiftImageSizeSelect: $("overlayGiftImageSizeSelect"),
  overlayGiftCompositionSelect: $("overlayGiftCompositionSelect"),
  overlayAutoReconnect: $("overlayAutoReconnect"),
  overlayReconnectInterval: $("overlayReconnectInterval"),
  overlayReconnectIntervalWrap: $("overlayReconnectIntervalWrap"),
  highlightEventUsername: $("highlightEventUsername"),
  highlightLikes: $("highlightLikes"),
  highlightFollows: $("highlightFollows"),
  highlightJoins: $("highlightJoins"),
  highlightShares: $("highlightShares"),
  highlightSystem: $("highlightSystem"),
  highlightFanclub: $("highlightFanclub"),
  highlightSuperfan: $("highlightSuperfan"),
  eventsCardFrame: $("eventsCardFrame"),
  eventsAutoClear: $("eventsAutoClear"),
  eventsClearSeconds: $("eventsClearSeconds"),
  giftsCardFrame: $("giftsCardFrame"),
  giftsAutoClear: $("giftsAutoClear"),
  giftsClearSeconds: $("giftsClearSeconds"),
  highlightGifts: $("highlightGifts"),
  highlightSubs: $("highlightSubs"),
  highlightBits: $("highlightBits"),
  highlightRaids: $("highlightRaids"),
  openSettingsBtn: $("openSettingsBtn"),
  closePersonalizeBtn: $("closePersonalizeBtn"),
  closeEventsPersonalizeBtn: $("closeEventsPersonalizeBtn"),
  eventsPersonalizeModal: $("eventsPersonalizeModal"),
  closeSettingsBtn: $("closeSettingsBtn"),
  saveSettingsBtn: $("saveSettingsBtn"),
  resetSettingsBtn: $("resetSettingsBtn"),
  settingsModal: $("settingsModal"),
  panelChatVisible: $("panelChatVisible"),
  panelEventsVisible: $("panelEventsVisible"),
  panelGiftsVisible: $("panelGiftsVisible"),
  panelOrder: $("panelOrder"),
  tiktokAvatarUrl: $("tiktokAvatarUrl"),
  tiktokAvatarFile: $("tiktokAvatarFile"),
  tiktokAvatarPreview: $("tiktokAvatarPreview"),
  clearTiktokAvatarBtn: $("clearTiktokAvatarBtn"),
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
  avatarSizeSelect: $("avatarSizeSelect"),
  nameSizeSelect: $("nameSizeSelect"),
  nameWeightSelect: $("nameWeightSelect"),
  chatHorizontalModeSelect: $("chatHorizontalModeSelect"),
  chatOverlayShapeSelect: $("chatOverlayShapeSelect"),
  badgeStyleSelect: $("badgeStyleSelect"),
  twitchNameColorSelect: $("twitchNameColorSelect"),
  tiktokNameColorSelect: $("tiktokNameColorSelect"),
  messageEffectSelect: $("messageEffectSelect"),
  nameEffectSelect: $("nameEffectSelect"),
  textColorSelect: $("textColorSelect"),
  chatAdjustMessages: $("chatAdjustMessages"),
  showBadges: $("showBadges"),
  showEmotes: $("showEmotes"),
  highlightSupportersTikTok: $("highlightSupportersTikTok"),
  highlightSupportersTwitch: $("highlightSupportersTwitch"),
  supporterHighlightSelect: $("supporterHighlightSelect"),
  autoClearChat: $("autoClearChat"),
  clearChatSeconds: $("clearChatSeconds"),
  clearChatSecondsWrap: $("clearChatSecondsWrap"),
  openOverlayBtn: $("openOverlayBtn"),
  openOverlayThemesBtn: $("openOverlayThemesBtn"),
  closeOverlayBtn: $("closeOverlayBtn"),
  overlayModal: $("overlayModal"),
  overlayThemesModal: $("overlayThemesModal"),
  closeOverlayThemesBtn: $("closeOverlayThemesBtn"),
  closeOverlayThemesBtnBottom: $("closeOverlayThemesBtnBottom"),
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
  personal: {
    theme: "dark",
    overlayTheme: "neon",
    font: "inter",
    animation: "slide",
    chatLayout: "vertical",
    chatDirection: "down",
    chatTheme: "cloud",
    chatAdjustMessages: false,
    avatarFrame: "platform",
    bubbleFrame: "platform",
    avatarSize: "md",
    nameSize: "md",
    nameWeight: "800",
    chatHorizontalMode: "normal",
    chatOverlayShape: "normal",
    badgeStyle: "emoji",
    twitchNameColor: "real",
    tiktokNameColor: "white",
    messageEffect: "shadow",
    nameEffect: "shadow",
    textColor: "auto",
    showBadges: true,
    showEmotes: true,
    highlightSupporters: true,
    highlightSupportersTikTok: true,
    highlightSupportersTwitch: true,
    supporterHighlightStyle: "gold",
    eventsLayout: "vertical",
    eventsDirection: "down",
    eventsMode: "slide",
    eventsPanelSize: "normal",
    eventsOverlayShape: "normal",
    eventsCardFrame: true,
    eventsAutoClear: false,
    eventsClearSeconds: 30,
    giftsLayout: "vertical",
    giftsDirection: "down",
    giftsMode: "slide",
    giftsPanelSize: "normal",
    giftsOverlayShape: "normal",
    giftsCardFrame: true,
    giftsAutoClear: false,
    giftsClearSeconds: 30,
    highlightStyle: "platform",
    giftHighlightStyle: "gold",
    overlayEventHighlightStyle: "platform",
    overlayGiftImageSize: "md",
    overlayGiftComposition: "normal",
    overlayAutoReconnect: false,
    overlayReconnectInterval: "smart",
    highlightEventUsername: true,
    highlightLikes: true,
    highlightFollows: true,
    highlightJoins: true,
    highlightShares: true,
    highlightSystem: true,
    highlightFanclub: true,
    highlightSuperfan: true,
    highlightGifts: true,
    highlightSubs: true,
    highlightBits: true,
    highlightRaids: true,
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
  supporters: loadJSON(SUPPORTERS_KEY, { tiktok: {}, twitch: {} }),
  activityBadges: loadJSON(ACTIVITY_BADGES_KEY, { tiktok: {}, twitch: {} }),
  chat: [],
  events: [],
  gifts: [],
  stats: {
    tiktok: {},
    twitch: {},
  },
  presence: loadJSON(PRESENCE_KEY, {
    tiktok: { connected: false, live: false, lastSignal: 0, mode: "saved" },
    twitch: { connected: false, live: false, lastSignal: 0, mode: "saved" },
  }),
  chatScroll: {
    unread: false,
    follow: true,
  },
  eventScroll: {
    unread: false,
    follow: true,
  },
  giftScroll: {
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
  saveJSON(PRESENCE_KEY, state.presence);
}

function applyChatLayout() {
  const layout = String(state.settings.personal.chatLayout || "vertical");
  document.body.classList.toggle("chat-horizontal", layout === "horizontal");
  document.body.classList.toggle("chat-vertical", layout !== "horizontal");
  document.body.classList.remove("chat-theme-glass", "chat-theme-neon", "chat-theme-minimal", "chat-theme-holo", "chat-theme-ribbon");
  document.body.classList.add(`chat-theme-${state.settings.personal.chatTheme || "glass"}`);
}

function isChatAtEdge() {
  const layout = String(state.settings.personal.chatLayout || "vertical");
  const direction = String(state.settings.personal.chatDirection || "down");
  const el = els.chatList;
  if (!el) return true;
  if (layout === "horizontal") {
    if (direction === "left") return el.scrollLeft <= 24;
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
    const left = direction === "left" ? 0 : Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({ left, behavior });
    return;
  }
  const top = direction === "up" ? 0 : Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTo({ top, behavior });
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

function isListAtEdge(el, layout, direction) {
  if (!el) return true;
  if (String(layout || "vertical") === "horizontal") {
    if (direction === "left") return el.scrollLeft <= 24;
    return el.scrollLeft + el.clientWidth >= el.scrollWidth - 24;
  }
  if (direction === "up") return el.scrollTop <= 24;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
}

function scrollListToEdge(el, layout, direction, smooth = true) {
  if (!el) return;
  const behavior = smooth ? "smooth" : "auto";
  if (String(layout || "vertical") === "horizontal") {
    const left = direction === "left" ? 0 : Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({ left, behavior });
    return;
  }
  const top = direction === "up" ? 0 : Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTo({ top, behavior });
}

function scrollEventsToEdge(smooth = true) {
  scrollListToEdge(els.eventList, state.settings.personal.eventsLayout, state.settings.personal.eventsDirection, smooth);
}

function scrollGiftsToEdge(smooth = true) {
  scrollListToEdge(els.giftList, state.settings.personal.giftsLayout, state.settings.personal.giftsDirection, smooth);
}

function bindActivityScroll(listEl, scrollState, layoutGetter, directionGetter) {
  if (!listEl) return;
  listEl.addEventListener("scroll", () => {
    if (isListAtEdge(listEl, layoutGetter(), directionGetter())) {
      scrollState.follow = true;
      scrollState.unread = false;
    } else {
      scrollState.follow = false;
    }
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
    return migrateSettings(loadJSON(SETTINGS_KEY, defaults));
  }
  const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (legacy) {
    try {
      return migrateSettings(mergeDeep(structuredClone(defaults), JSON.parse(legacy)));
    } catch {
      return migrateSettings(structuredClone(defaults));
    }
  }
  return structuredClone(defaults);
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalizeOverlayShape(value) {
  return String(value || "normal").toLowerCase() === "card" ? "card" : "normal";
}

function migrateSettings(settingsObj) {
  const s = settingsObj || {};
  if (!s.personal) s.personal = {};
  const p = s.personal;
  if (p.highlightSupportersTikTok === undefined) p.highlightSupportersTikTok = p.highlightSupporters !== false;
  if (p.highlightSupportersTwitch === undefined) p.highlightSupportersTwitch = p.highlightSupporters !== false;
  if (p.chatAdjustMessages === undefined) p.chatAdjustMessages = false;
  p.chatOverlayShape = normalizeOverlayShape(p.chatOverlayShape);
  if (p.overlayTheme === undefined) p.overlayTheme = "neon";
  if (p.overlayEventHighlightStyle === undefined) p.overlayEventHighlightStyle = "platform";
  if (p.overlayGiftImageSize === undefined) p.overlayGiftImageSize = "md";
  if (p.overlayGiftComposition === undefined) p.overlayGiftComposition = "normal";
  if (p.overlayAutoReconnect === undefined) p.overlayAutoReconnect = false;
  if (p.overlayReconnectInterval === undefined) p.overlayReconnectInterval = "smart";
  if (p.eventsCardFrame === undefined) p.eventsCardFrame = true;
  p.eventsOverlayShape = normalizeOverlayShape(p.eventsOverlayShape);
  if (p.eventsMode === undefined) p.eventsMode = "slide";
  if (p.eventsAutoClear === undefined) p.eventsAutoClear = false;
  if (p.eventsClearSeconds === undefined) p.eventsClearSeconds = 30;
  if (p.giftsCardFrame === undefined) p.giftsCardFrame = true;
  p.giftsOverlayShape = normalizeOverlayShape(p.giftsOverlayShape);
  if (p.giftsMode === undefined) p.giftsMode = "slide";
  if (p.giftsAutoClear === undefined) p.giftsAutoClear = false;
  if (p.giftsClearSeconds === undefined) p.giftsClearSeconds = 30;
  return s;
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
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function avatarForItem(item) {
  return sanitizeTikTokUserAvatar(item.avatar);
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
      const resolved = apiAvatar || (allowFallback ? (String(platform || "").toLowerCase() === "tiktok" ? dicebearTikTokAvatar(cleanName || "tiktok") : fallbackAvatar(cleanName, platform)) : BLANK_PIXEL);
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

function setAvatarImage(img, platform, username) {
  const seed = username || platform || "user";
  const fallback = String(platform || "").toLowerCase() === "tiktok"
    ? dicebearTikTokAvatar(seed)
    : fallbackAvatar(seed, platform);
  img.src = fallback;
  primeAvatar(platform, username, (url) => {
    img.src = url || fallback;
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
  if (lower === "member" || lower.includes("fanclub") || lower.includes("superfan")) return "👤";
  if (lower === "tiktok") return roleBadges.tiktok.emoji;
  if (lower === "twitch") return roleBadges.twitch.emoji;
  if (lower.includes("mod")) return roleBadges.moderator.emoji;
  if (lower.includes("vip")) return roleBadges.vip.emoji;
  if (lower.includes("sub")) return roleBadges.subscriber.emoji;
  if (lower.includes("member") || lower.includes("fanclub") || lower.includes("superfan")) return "👤";
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

function extractTextFromFragments(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") return part.text || part.value || part.content || part.name || part.label || "";
      return "";
    }).filter(Boolean).join("");
  }
  if (typeof value === "object") {
    return value.text || value.value || value.content || value.message || value.name || value.label || "";
  }
  return String(value || "");
}

function renderMessageText(item) {
  const platform = String(item?.platform || "").toLowerCase();
  const stickerLabel = extractTextFromFragments(item?.sticker?.name || item?.sticker?.title || item?.stickerName || item?.stickerText || item?.sticker || item?.stickerAlt);
  const stickerImage = normalizeImageSource(
    item?.stickerImage ||
    item?.emoteImage ||
    item?.sticker?.image ||
    item?.sticker?.imageUrl ||
    item?.sticker?.url ||
    item?.sticker?.uri ||
    item?.sticker?.urlList?.[0] ||
    item?.sticker?.url_list?.[0] ||
    item?.sticker?.image?.url ||
    item?.sticker?.image?.uri ||
    item?.sticker?.image?.src ||
    item?.sticker?.image?.urlList?.[0] ||
    item?.sticker?.image?.url_list?.[0] ||
    item?.emoteList?.[0]?.image?.urlList?.[0] ||
    item?.emoteList?.[0]?.image?.url_list?.[0] ||
    item?.emoteList?.[0]?.image?.url ||
    item?.emoteList?.[0]?.url ||
    item?.emoteList?.[0]?.uri ||
    item?.emoteList?.[0]?.imageUrl ||
    item?.emoteList?.[0]?.imageURL ||
    ""
  );
  const raw = [
    item?.message,
    item?.comment,
    item?.text,
    item?.messageText,
    item?.content,
    extractTextFromFragments(item?.fragments),
    extractTextFromFragments(item?.messageFragments),
    extractTextFromFragments(item?.textFragments),
    extractTextFromFragments(item?.commentFragments),
    stickerLabel,
  ].map((v) => String(v || "").trim()).find(Boolean) || "";

  if (platform === "twitch") {
    return parseTwitchEmotes(raw, item?.emotes);
  }

  const isSticker = normalizeTypeName(item?.type).includes("sticker") || Boolean(stickerLabel) || Boolean(stickerImage);
  if (isSticker) {
    const sticker = stickerLabel || item?.sticker || item?.stickerAlt || "Sticker";
    return stickerImage
      ? `<span class="stickerInline"><img class="chatSticker" src="${ESC(stickerImage)}" alt="${ESC(sticker)}" loading="lazy"><span class="stickerFallback">${ESC(sticker)}</span></span>`
      : `🧩 ${ESC(sticker)}`;
  }

  const fallback = item?.action ? String(item.action) : "Mensaje";
  return ESC(raw || fallback).replace(/\n/g, "<br>");
}

function getRenderedMessage(item) {
  return renderMessageText(item);
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

function giftAccent(item) {
  const mode = String(state.settings.personal.giftHighlightStyle || "gold");
  if (mode === "platform") return platformColors[item.platform] || platformColors.tiktok || "#f5d063";
  return "#f5d063";
}

function frameClass() {
  return `frame-${state.settings.personal.avatarFrame || "platform"}`;
}

function bubbleClass() {
  return `frame-${state.settings.personal.bubbleFrame || "platform"}`;
}

function avatarSizeClass() {
  return `avatar-${state.settings.personal.avatarSize || "md"}`;
}

function nameSizeClass() {
  return `name-${state.settings.personal.nameSize || "md"}`;
}

function nameWeightClass() {
  return `weight-${state.settings.personal.nameWeight || "800"}`;
}

function horizontalModeClass() {
  return `chat-horizontal-${state.settings.personal.chatHorizontalMode || "normal"}`;
}

function animationClass() {
  return `anim-${state.settings.personal.animation || "slide"}`;
}

function themeClass() {
  return `theme-${state.settings.personal.theme || "dark"}`;
}

function overlayThemeClass() {
  return `overlay-theme-${state.settings.personal.overlayTheme || "neon"}`;
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

function resolveChatTextColor(value) {
  const map = {
    auto: "",
    white: "#eef2ff",
    black: "#09090b",
    blue: "#60a5fa",
    pink: "#f472b6",
    green: "#4ade80",
    yellow: "#facc15",
    cyan: "#67e8f9",
    orange: "#fb923c",
  };
  return map[String(value || "auto")] ?? "";
}

function effectContrastColor(textColor) {
  const darkText = new Set(["black"]);
  return darkText.has(String(textColor || "").toLowerCase())
    ? "rgba(255,255,255,.92)"
    : "rgba(0,0,0,.72)";
}

function effectShadow(effect, contrastColor) {
  const shadow = String(effect || "none");
  if (shadow === "shadow") return `0 2px 10px ${contrastColor}`;
  if (shadow === "outline") return [
    `-1px -1px 0 ${contrastColor}`,
    `1px -1px 0 ${contrastColor}`,
    `-1px 1px 0 ${contrastColor}`,
    `1px 1px 0 ${contrastColor}`,
  ].join(", ");
  return "none";
}

function effectStroke(effect, contrastColor) {
  return String(effect || "none") === "outline" ? `1px ${contrastColor}` : "0 transparent";
}

function itemEmoji(item, kind) {
  const type = String(item?.type || kind || "").toLowerCase();
  const group = String(item?.group || "").toLowerCase();
  if (item?.emoji) return String(item.emoji);
  if (group === "gift" || type === "gift") return "🎁";
  if (type === "sub" || type === "subscription" || type === "resub" || type === "fanclub" || type === "superfan" || type === "super_fan") return "⭐";
  if (type === "bits" || type === "superchat") return "💎";
  if (type === "raid" || type === "host") return "⚡";
  if (type === "follow") return "👤";
  if (type === "share") return "🗣";
  if (type === "join" || type === "member") return "👻";
  if (type === "system") return "📣";
  if (type === "like") return "❤️";
  if (type === "heartme") return "❤️‍🔥";
  if (type === "question") return "❓";
  if (type === "emote") return "😄";
  if (kind === "chat") return "💬";
  return String(item?.platform || "") === "twitch" ? "🟣" : "🎵";
}

function panelSizeValue(size) {
  const map = { compact: 240, normal: 330, large: 430, xl: 540 };
  return map[String(size || "normal")] || map.normal;
}

function horizontalCardWidthValue(size) {
  const map = { compact: 280, normal: 340, large: 450, xl: 580 };
  return map[String(size || "normal")] || map.normal;
}

function panelModeClass(mode) {
  return `mode-${String(mode || "slide")}`;
}

function autoMessageScale(text) {
  const len = String(text || "").trim().length;
  if (!len) return 1;
  if (len > 280) return 0.74;
  if (len > 200) return 0.8;
  if (len > 140) return 0.88;
  if (len > 90) return 0.94;
  return 1;
}

function panelClasses(layout, direction, size) {
  return [
    `layout-${String(layout || "vertical")}`,
    `direction-${String(direction || "down")}`,
    `size-${String(size || "normal")}`,
  ].join(" ");
}

function normalizeTypeName(value) {
  return String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
}

function isSupporterBadge(item) {
  const badges = normalizeBadgeKeys(item?.badges);
  const keys = badges.map((k) => normalizeTypeName(k));
  const type = normalizeTypeName(item?.type);
  return keys.some((k) => ["subscriber", "sub", "member", "founder", "premium", "vip", "moderator", "mod", "verified", "superfan", "fanclub", "gift"].some((x) => k.includes(x))) ||
    ["subscriber", "sub", "resub", "member", "fanclub", "superfan", "superfanjoin", "heartme", "superchat", "gift"].some((x) => type.includes(x));
}

function supporterHighlightEnabled(platform) {
  const key = String(platform || "tiktok").toLowerCase();
  if (key === "twitch") return state.settings.personal.highlightSupportersTwitch !== false;
  return state.settings.personal.highlightSupportersTikTok !== false;
}

function supporterKey(item) {
  return normalizeUsername(item?.user || item?.displayName || item?.username || item?.uniqueId || "");
}

function supporterStore(platform) {
  const key = String(platform || "tiktok").toLowerCase();
  if (!state.supporters[key]) state.supporters[key] = {};
  return state.supporters[key];
}

function saveSupporters() {
  saveJSON(SUPPORTERS_KEY, state.supporters);
}

function rememberSupporter(item) {
  if (!item) return false;
  const type = normalizeTypeName(item?.type);
  const badges = normalizeBadgeKeys(item?.badges).map((k) => normalizeTypeName(k));
  const supporterSignals = ["subscriber", "sub", "resub", "member", "fanclub", "superfan", "superfanjoin", "heartme", "superchat", "gift"].some((x) => type.includes(x))
    || badges.some((k) => ["subscriber", "sub", "member", "superfan", "fanclub", "vip", "premium", "founder", "gift"].some((x) => k.includes(x)));
  if (!supporterSignals) return false;

  const platform = String(item?.platform || "tiktok").toLowerCase();
  const key = supporterKey(item);
  if (!key) return false;
  const store = supporterStore(platform);
  if (!store[key]) {
    store[key] = {
      user: item?.user || item?.displayName || key,
      displayName: item?.displayName || item?.user || key,
      platform,
      at: Date.now(),
    };
    saveSupporters();
  }
  return true;
}

function isSupporterProfile(item) {
  if (!item) return false;
  if (isSupporterBadge(item)) return true;
  const platform = String(item?.platform || "tiktok").toLowerCase();
  const key = supporterKey(item);
  return Boolean(key && state.supporters?.[platform]?.[key]);
}

function supportBadgeMarkup(item) {
  if (!isSupporterProfile(item)) return "";
  const style = state.settings.personal.supporterHighlightStyle || "gold";
  const label = style === "marker" ? "Corazón brillante" : "Heart Me";
  return `<span class="badge supportBadge support-${style}">💖 ${ESC(label)}</span>`;
}

const ACTIVITY_BADGE_RULES = [
  { emoji: "🎁", label: "Envió regalo", match: ["gift", "envelope", "fanclub"] },
  { emoji: "⭐", label: "Suscripción", match: ["sub", "subscription", "resub", "superfan", "fanclub"] },
  { emoji: "💎", label: "Bits", match: ["bits", "superchat"] },
  { emoji: "⚡", label: "Raid", match: ["raid", "host"] },
  { emoji: "🗣", label: "Compartió", match: ["share"] },
  { emoji: "👻", label: "Se unió", match: ["join", "member"] },
  { emoji: "👤", label: "Siguió", match: ["follow"] },
  { emoji: "❤️", label: "Dio like", match: ["like", "heartme"] },
];

function activityBadgeStore(platform) {
  const key = String(platform || "tiktok").toLowerCase();
  if (!state.activityBadges[key]) state.activityBadges[key] = {};
  return state.activityBadges[key];
}

function activityBadgeKeys(item) {
  return [...new Set([
    normalizeUsername(item?.user || ""),
    normalizeUsername(item?.displayName || ""),
    normalizeUsername(item?.uniqueId || ""),
    normalizeUsername(item?.username || ""),
  ].filter(Boolean))];
}

function activityBadgeKeysForItem(item) {
  const type = normalizeTypeName(item?.type);
  const group = normalizeTypeName(item?.group);
  const found = [];
  for (const rule of ACTIVITY_BADGE_RULES) {
    if (rule.match.some((needle) => type.includes(needle) || group.includes(needle))) {
      found.push(rule);
    }
  }
  return found;
}

function saveActivityBadges() {
  saveJSON(ACTIVITY_BADGES_KEY, state.activityBadges);
}

function registerActivityBadges(item) {
  if (!item) return false;
  const platform = String(item?.platform || "tiktok").toLowerCase();
  const keys = activityBadgeKeys(item);
  const rules = activityBadgeKeysForItem(item);
  if (!keys.length || !rules.length) return false;

  const store = activityBadgeStore(platform);
  const primaryKey = keys[0];
  const entry = store[primaryKey] || {
    user: item?.user || item?.displayName || primaryKey,
    displayName: item?.displayName || item?.user || primaryKey,
    badges: {},
    at: 0,
  };

  let changed = false;
  for (const rule of rules) {
    if (!entry.badges[rule.emoji]) {
      entry.badges[rule.emoji] = true;
      changed = true;
    }
  }

  if (changed || !store[primaryKey]) {
    entry.at = Date.now();
    for (const key of keys) {
      store[key] = entry;
    }
    saveActivityBadges();
  }

  return changed;
}

function chatActivityBadgesMarkup(item) {
  if (!state.settings.personal.showBadges) return "";
  const platform = String(item?.platform || "tiktok").toLowerCase();
  const keys = activityBadgeKeys(item);
  if (!keys.length) return "";
  const entry = keys.map((key) => state.activityBadges?.[platform]?.[key]).find((value) => value?.badges);
  if (!entry?.badges) return "";

  const ordered = ACTIVITY_BADGE_RULES
    .filter((rule) => entry.badges[rule.emoji])
    .map((rule) => `<span class="badge activityBadge" title="${ESC(rule.label)}">${ESC(rule.emoji)}</span>`)
    .join("");

  return ordered;
}

function highlightColorFor(item, kind) {
  const mode = String(state.settings.personal.highlightStyle || "platform");
  const platform = String(item?.platform || "tiktok").toLowerCase();

  if (mode === "platform") return platformColors[platform] || platformColors.tiktok;
  if (mode === "gold") return "#f5d063";
  if (kind !== "event") return platformColors[platform] || platformColors.tiktok;

  const type = normalizeTypeName(item?.type);
  const group = normalizeTypeName(item?.group);
  const hit = (value) => type.includes(value) || group.includes(value);

  if (hit("like")) return "#ef4444";
  if (hit("follow")) return "#3b82f6";
  if (hit("share")) return "#22c55e";
  if (hit("join") || hit("member") || hit("heartme") || hit("fanclub") || hit("superfan")) return "#f97316";
  if (hit("gift")) return "#fb923c";
  if (hit("sub") || hit("subscription") || hit("resub") || hit("superfanjoin")) return "#a78bfa";
  if (hit("bits") || hit("superchat")) return "#22d3ee";
  if (hit("raid") || hit("host")) return "#facc15";
  if (hit("system")) return "#94a3b8";
  return platformColors[platform] || "#f5d063";
}


function isHighlightedEntry(item, kind) {
  const type = normalizeTypeName(item?.type);
  const group = normalizeTypeName(item?.group);
  const highlightStyle = kind === "gift"
    ? (state.settings.personal.giftHighlightStyle || "gold")
    : (state.settings.personal.highlightStyle || "platform");
  const hasSupport = isSupporterProfile(item);
  const supporterOn = state.settings.personal.highlightSupporters !== false;

  if (kind === "chat" && hasSupport && supporterOn) return "supporter-highlight support-gold";
  if (kind !== "event" && kind !== "gift") return "";

  const generic = {
    like: state.settings.personal.highlightLikes !== false,
    follow: state.settings.personal.highlightFollows !== false,
    join: state.settings.personal.highlightJoins !== false,
    share: state.settings.personal.highlightShares !== false,
    system: state.settings.personal.highlightSystem !== false,
    gift: state.settings.personal.highlightGifts !== false,
    sub: state.settings.personal.highlightSubs !== false,
    subscription: state.settings.personal.highlightSubs !== false,
    resub: state.settings.personal.highlightSubs !== false,
    bits: state.settings.personal.highlightBits !== false,
    raid: state.settings.personal.highlightRaids !== false,
    host: state.settings.personal.highlightRaids !== false,
    superchat: state.settings.personal.highlightBits !== false,
  };

  const hit = Object.entries(generic).some(([needle, enabled]) => enabled && (type.includes(needle) || group.includes(needle)));
  if (!hit) return "";

  const classes = [`highlight-${highlightStyle}`];
  if (kind === "event" && state.settings.personal.highlightEventUsername !== false) classes.push("highlight-username");
  return classes.join(" ");
}


function panelSizeStyle(size) {
  const px = panelSizeValue(size);
  return `--panel-block-size:${px}px;`;
}

function applyPanelSizing() {
  if (els.eventsCard) {
    const layout = state.settings.personal.eventsLayout || "vertical";
    const direction = state.settings.personal.eventsDirection || "down";
    const size = state.settings.personal.eventsPanelSize || "normal";
    const mode = state.settings.personal.eventsMode || "slide";
    els.eventsCard.dataset.layout = layout;
    els.eventsCard.dataset.direction = direction;
    els.eventsCard.dataset.size = size;
    els.eventsCard.dataset.mode = mode;
    els.eventsCard.style.setProperty("--panel-block-size", `${panelSizeValue(size)}px`);
    els.eventsCard.style.setProperty("--panel-inline-size", layout === "horizontal" ? "100%" : "auto");
    if (els.eventList) {
      els.eventList.className = `panelBody eventList layout-${layout} ${panelModeClass(mode)} direction-${direction} size-${size}`;
      els.eventList.style.setProperty("--panel-card-width", `${layout === "horizontal" ? horizontalCardWidthValue(size) : 290}px`);
    }
  }
  if (els.giftsCard) {
    const layout = state.settings.personal.giftsLayout || "vertical";
    const direction = state.settings.personal.giftsDirection || "down";
    const size = state.settings.personal.giftsPanelSize || "normal";
    const mode = state.settings.personal.giftsMode || "slide";
    els.giftsCard.dataset.layout = layout;
    els.giftsCard.dataset.direction = direction;
    els.giftsCard.dataset.size = size;
    els.giftsCard.dataset.mode = mode;
    els.giftsCard.style.setProperty("--panel-block-size", `${panelSizeValue(size)}px`);
    els.giftsCard.style.setProperty("--panel-inline-size", layout === "horizontal" ? "100%" : "auto");
    if (els.giftList) {
      els.giftList.className = `panelBody giftList layout-${layout} ${panelModeClass(mode)} direction-${direction} size-${size}`;
      els.giftList.style.setProperty("--panel-card-width", `${layout === "horizontal" ? horizontalCardWidthValue(size) : 290}px`);
    }
  }
}

function updateDirectionOptions(selectEl, layout, kind) {
  if (!selectEl) return;
  const current = String(selectEl.value || "");
  const isVertical = String(layout || "vertical") === "vertical";
  const options = isVertical
    ? [
        { value: "down", label: "Abajo" },
        { value: "up", label: "Arriba" },
      ]
    : [
        { value: "left", label: "Izquierda" },
        { value: "right", label: "Derecha" },
      ];
  selectEl.innerHTML = options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
  const fallback = options[0]?.value || (isVertical ? "down" : "left");
  selectEl.value = options.some((opt) => opt.value === current) ? current : fallback;
}

function updateChatControls() {
  const horizontal = String(els.chatLayoutSelect?.value || state.settings.personal.chatLayout || "vertical") === "horizontal";
  if (els.chatHorizontalModeSelect) els.chatHorizontalModeSelect.closest(".fieldRow")?.classList.toggle("hidden", !horizontal);
  updateDirectionOptions(els.chatDirectionSelect, els.chatLayoutSelect?.value || state.settings.personal.chatLayout || "vertical", "chat");
}

function updateEventGiftControls() {
  const eventLayout = els.eventsLayoutSelect?.value || state.settings.personal.eventsLayout || "vertical";
  const giftLayout = els.giftsLayoutSelect?.value || state.settings.personal.giftsLayout || "vertical";

  if (els.eventsDirectionWrap) els.eventsDirectionWrap.classList.toggle("hidden", eventLayout !== "horizontal");
  if (els.giftsDirectionWrap) els.giftsDirectionWrap.classList.toggle("hidden", giftLayout !== "horizontal");
  if (els.eventsModeWrap) els.eventsModeWrap.classList.toggle("hidden", eventLayout !== "horizontal");
  if (els.giftsModeWrap) els.giftsModeWrap.classList.toggle("hidden", giftLayout !== "horizontal");
  if (els.eventsPanelSizeWrap) els.eventsPanelSizeWrap.classList.toggle("hidden", eventLayout !== "horizontal");
  if (els.giftsPanelSizeWrap) els.giftsPanelSizeWrap.classList.toggle("hidden", giftLayout !== "horizontal");
  if (els.eventsClearSecondsWrap) els.eventsClearSecondsWrap.classList.toggle("hidden", !els.eventsAutoClear?.checked);
  if (els.giftsClearSecondsWrap) els.giftsClearSecondsWrap.classList.toggle("hidden", !els.giftsAutoClear?.checked);

  updateDirectionOptions(els.eventsDirectionSelect, eventLayout, "events");
  updateDirectionOptions(els.giftsDirectionSelect, giftLayout, "gifts");
}

function applyTheme() {
  document.body.classList.remove("theme-dark", "theme-matrix", "theme-neon", "theme-sunset", "theme-aurora");
  document.body.classList.add(themeClass());
  document.body.style.setProperty("--app-font", fontFamily(state.settings.personal.font));
  document.body.classList.remove("chat-theme-glass", "chat-theme-cloud", "chat-theme-bubble", "chat-theme-neon", "chat-theme-minimal", "chat-theme-aurora", "chat-theme-comic", "chat-theme-holo", "chat-theme-ribbon");
  document.body.classList.add(`chat-theme-${state.settings.personal.chatTheme || "cloud"}`);
}

function persistSettings() {
  state.settings.panels.chat = els.panelChatVisible.checked;
  state.settings.panels.events = els.panelEventsVisible.checked;
  state.settings.panels.gifts = els.panelGiftsVisible.checked;
  state.settings.order = els.panelOrder.value;
  state.settings.filters.chat = els.chatFilter.value;
  state.settings.filters.event = els.eventFilter.value;
  state.settings.filters.gift = els.giftFilter.value;
  state.settings.personal.theme = els.themeSelect.value;
  state.settings.personal.font = els.fontSelect.value;
  state.settings.personal.animation = els.animationSelect.value;
  state.settings.personal.chatLayout = els.chatLayoutSelect.value;
  state.settings.personal.chatDirection = els.chatDirectionSelect.value;
  state.settings.personal.chatTheme = els.chatThemeSelect.value;
  state.settings.personal.chatAdjustMessages = els.chatAdjustMessages?.checked === true;
  state.settings.personal.avatarFrame = els.avatarFrameSelect.value;
  state.settings.personal.bubbleFrame = els.bubbleFrameSelect.value;
  state.settings.personal.avatarSize = els.avatarSizeSelect.value;
  state.settings.personal.nameSize = els.nameSizeSelect.value;
  state.settings.personal.nameWeight = els.nameWeightSelect.value;
  state.settings.personal.chatHorizontalMode = els.chatHorizontalModeSelect.value;
  state.settings.personal.chatOverlayShape = normalizeOverlayShape(els.chatOverlayShapeSelect?.value);
  state.settings.personal.badgeStyle = els.badgeStyleSelect.value;
  state.settings.personal.twitchNameColor = els.twitchNameColorSelect.value;
  state.settings.personal.tiktokNameColor = els.tiktokNameColorSelect.value;
  state.settings.personal.messageEffect = els.messageEffectSelect.value;
  state.settings.personal.nameEffect = els.nameEffectSelect.value;
  state.settings.personal.textColor = els.textColorSelect.value;
  state.settings.personal.tiktokAvatarUrl = normalizeImageSource(els.tiktokAvatarUrl?.value) || "";
  state.settings.personal.showBadges = els.showBadges.checked;
  state.settings.personal.showEmotes = els.showEmotes.checked;
  state.settings.personal.highlightSupportersTikTok = els.highlightSupportersTikTok?.checked !== false;
  state.settings.personal.highlightSupportersTwitch = els.highlightSupportersTwitch?.checked !== false;
  state.settings.personal.highlightSupporters = state.settings.personal.highlightSupportersTikTok || state.settings.personal.highlightSupportersTwitch;
  state.settings.personal.supporterHighlightStyle = els.supporterHighlightSelect?.value || "gold";
  state.settings.personal.eventsLayout = els.eventsLayoutSelect?.value || "vertical";
  state.settings.personal.eventsDirection = els.eventsDirectionSelect?.value || "down";
  state.settings.personal.eventsMode = els.eventsModeSelect?.value || "slide";
  state.settings.personal.eventsPanelSize = els.eventsPanelSizeSelect?.value || "normal";
  state.settings.personal.eventsOverlayShape = normalizeOverlayShape(els.eventsOverlayShapeSelect?.value);
  state.settings.personal.eventsCardFrame = els.eventsCardFrame?.checked !== false;
  state.settings.personal.eventsAutoClear = els.eventsAutoClear?.checked === true;
  state.settings.personal.eventsClearSeconds = Number(els.eventsClearSeconds?.value || 30);
  state.settings.personal.giftsLayout = els.giftsLayoutSelect?.value || "vertical";
  state.settings.personal.giftsDirection = els.giftsDirectionSelect?.value || "down";
  state.settings.personal.giftsMode = els.giftsModeSelect?.value || "slide";
  state.settings.personal.giftsPanelSize = els.giftsPanelSizeSelect?.value || "normal";
  state.settings.personal.giftsOverlayShape = normalizeOverlayShape(els.giftsOverlayShapeSelect?.value);
  state.settings.personal.giftsCardFrame = els.giftsCardFrame?.checked !== false;
  state.settings.personal.giftsAutoClear = els.giftsAutoClear?.checked === true;
  state.settings.personal.giftsClearSeconds = Number(els.giftsClearSeconds?.value || 30);
  state.settings.personal.highlightStyle = els.highlightStyleSelect?.value || "platform";
  state.settings.personal.giftHighlightStyle = els.giftHighlightStyleSelect?.value || "gold";
  state.settings.personal.overlayEventHighlightStyle = els.overlayEventsHighlightSelect?.value || "platform";
  state.settings.personal.overlayGiftImageSize = els.overlayGiftImageSizeSelect?.value || "md";
  state.settings.personal.overlayGiftComposition = els.overlayGiftCompositionSelect?.value || "normal";
  state.settings.personal.overlayAutoReconnect = els.overlayAutoReconnect?.checked === true;
  state.settings.personal.overlayReconnectInterval = ["smart", "1", "3", "5", "10", "30"].includes(String(els.overlayReconnectInterval?.value || "smart")) ? String(els.overlayReconnectInterval.value || "smart") : "smart";
  state.settings.personal.highlightEventUsername = els.highlightEventUsername?.checked !== false;
  state.settings.personal.highlightLikes = els.highlightLikes?.checked !== false;
  state.settings.personal.highlightFollows = els.highlightFollows?.checked !== false;
  state.settings.personal.highlightJoins = els.highlightJoins?.checked !== false;
  state.settings.personal.highlightShares = els.highlightShares?.checked !== false;
  state.settings.personal.highlightSystem = els.highlightSystem?.checked !== false;
  state.settings.personal.highlightFanclub = els.highlightFanclub?.checked !== false;
  state.settings.personal.highlightSuperfan = els.highlightSuperfan?.checked !== false;
  state.settings.personal.highlightGifts = els.highlightGifts?.checked !== false;
  state.settings.personal.highlightSubs = els.highlightSubs?.checked !== false;
  state.settings.personal.highlightBits = els.highlightBits?.checked !== false;
  state.settings.personal.highlightRaids = els.highlightRaids?.checked !== false;
  state.settings.personal.autoClearChat = els.autoClearChat.checked;
  state.settings.personal.clearChatSeconds = Number(els.clearChatSeconds.value || 30);

  saveJSON(SETTINGS_KEY, state.settings);
  saveJSON(LEGACY_SETTINGS_KEY, state.settings);
  socket.emit("saveSettings", state.settings);
  refreshTikTokAvatarPreview();
}


function saveAndNotify(modal, title, body) {
  try {
    persistSettings();
    renderAll();
    loadSettingsToUI();
    toast(title, body);
    closeModal(modal);
  } catch (error) {
    console.error("No se pudo guardar la configuración:", error);
    toast("No se pudo guardar", error?.message || "Revisa la consola para ver el error.", "err");
  }
}

function refreshTikTokAvatarPreview() {
  if (!els.tiktokAvatarPreview) return;
  const src = normalizeImageSource(state.settings?.personal?.tiktokAvatarUrl) || getTikTokTopbarAvatarUrl();
  els.tiktokAvatarPreview.src = src;
  els.tiktokAvatarPreview.classList.toggle("is-empty", !normalizeImageSource(state.settings?.personal?.tiktokAvatarUrl));
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
  els.themeSelect.value = s.personal?.theme || "dark";
  els.fontSelect.value = s.personal?.font || "inter";
  els.animationSelect.value = s.personal?.animation || "slide";
  els.chatLayoutSelect.value = s.personal?.chatLayout || "vertical";
  els.chatThemeSelect.value = s.personal?.chatTheme || "cloud";
  updateChatControls();
  els.chatDirectionSelect.value = s.personal?.chatDirection || "down";
  els.avatarFrameSelect.value = s.personal?.avatarFrame || "platform";
  els.bubbleFrameSelect.value = s.personal?.bubbleFrame || "platform";
  els.avatarSizeSelect.value = s.personal?.avatarSize || "md";
  els.nameSizeSelect.value = s.personal?.nameSize || "md";
  els.nameWeightSelect.value = s.personal?.nameWeight || "800";
  els.chatHorizontalModeSelect.value = s.personal?.chatHorizontalMode || "normal";
  if (els.chatOverlayShapeSelect) els.chatOverlayShapeSelect.value = normalizeOverlayShape(s.personal?.chatOverlayShape);
  els.badgeStyleSelect.value = s.personal?.badgeStyle || "emoji";
  els.twitchNameColorSelect.value = s.personal?.twitchNameColor || "real";
  els.tiktokNameColorSelect.value = s.personal?.tiktokNameColor || "white";
  els.messageEffectSelect.value = s.personal?.messageEffect || "shadow";
  els.nameEffectSelect.value = s.personal?.nameEffect || "shadow";
  els.textColorSelect.value = s.personal?.textColor || "auto";
  if (els.tiktokAvatarUrl) els.tiktokAvatarUrl.value = s.personal?.tiktokAvatarUrl || "";
  els.showBadges.checked = s.personal?.showBadges !== false;
  els.showEmotes.checked = s.personal?.showEmotes !== false;
  if (els.highlightSupportersTikTok) els.highlightSupportersTikTok.checked = s.personal?.highlightSupportersTikTok !== false && s.personal?.highlightSupporters !== false;
  if (els.highlightSupportersTwitch) els.highlightSupportersTwitch.checked = s.personal?.highlightSupportersTwitch !== false && s.personal?.highlightSupporters !== false;
  if (els.supporterHighlightSelect) els.supporterHighlightSelect.value = s.personal?.supporterHighlightStyle || "gold";
  els.autoClearChat.checked = s.personal?.autoClearChat === true;
  els.clearChatSeconds.value = String(s.personal?.clearChatSeconds || 30);
  els.clearChatSecondsWrap.classList.toggle("hidden", !els.autoClearChat.checked);
  if (els.chatHorizontalModeSelect) {
    const horizontal = String(els.chatLayoutSelect.value || "vertical") === "horizontal";
    els.chatHorizontalModeSelect.closest(".fieldRow")?.classList.toggle("hidden", !horizontal);
  }
  if (els.chatAdjustMessages) els.chatAdjustMessages.checked = s.personal?.chatAdjustMessages === true;
  if (els.eventsLayoutSelect) els.eventsLayoutSelect.value = s.personal?.eventsLayout || "vertical";
  if (els.eventsDirectionSelect) els.eventsDirectionSelect.value = s.personal?.eventsDirection || "down";
  if (els.eventsModeSelect) els.eventsModeSelect.value = s.personal?.eventsMode || "slide";
  if (els.eventsPanelSizeSelect) els.eventsPanelSizeSelect.value = ["compact", "normal", "large", "xl"].includes(s.personal?.eventsPanelSize) ? s.personal.eventsPanelSize : "normal";
  if (els.eventsOverlayShapeSelect) els.eventsOverlayShapeSelect.value = normalizeOverlayShape(s.personal?.eventsOverlayShape);
  if (els.eventsCardFrame) els.eventsCardFrame.checked = s.personal?.eventsCardFrame !== false;
  if (els.eventsAutoClear) els.eventsAutoClear.checked = s.personal?.eventsAutoClear === true;
  if (els.eventsClearSeconds) els.eventsClearSeconds.value = String(s.personal?.eventsClearSeconds || 30);
  if (els.giftsLayoutSelect) els.giftsLayoutSelect.value = s.personal?.giftsLayout || "vertical";
  if (els.giftsDirectionSelect) els.giftsDirectionSelect.value = s.personal?.giftsDirection || "down";
  if (els.giftsModeSelect) els.giftsModeSelect.value = s.personal?.giftsMode || "slide";
  if (els.giftsPanelSizeSelect) els.giftsPanelSizeSelect.value = ["compact", "normal", "large", "xl"].includes(s.personal?.giftsPanelSize) ? s.personal.giftsPanelSize : "normal";
  if (els.giftsOverlayShapeSelect) els.giftsOverlayShapeSelect.value = normalizeOverlayShape(s.personal?.giftsOverlayShape);
  if (els.giftsCardFrame) els.giftsCardFrame.checked = s.personal?.giftsCardFrame !== false;
  if (els.giftsAutoClear) els.giftsAutoClear.checked = s.personal?.giftsAutoClear === true;
  if (els.giftsClearSeconds) els.giftsClearSeconds.value = String(s.personal?.giftsClearSeconds || 30);
  if (els.highlightStyleSelect) els.highlightStyleSelect.value = s.personal?.highlightStyle || "platform";
  if (els.overlayEventsHighlightSelect) els.overlayEventsHighlightSelect.value = s.personal?.overlayEventHighlightStyle || "platform";
  if (els.giftHighlightStyleSelect) els.giftHighlightStyleSelect.value = s.personal?.giftHighlightStyle || "gold";
  if (els.overlayGiftImageSizeSelect) els.overlayGiftImageSizeSelect.value = s.personal?.overlayGiftImageSize || "md";
  if (els.overlayGiftCompositionSelect) els.overlayGiftCompositionSelect.value = s.personal?.overlayGiftComposition || "normal";
  if (els.overlayAutoReconnect) els.overlayAutoReconnect.checked = s.personal?.overlayAutoReconnect === true;
  if (els.overlayReconnectInterval) els.overlayReconnectInterval.value = ["smart", "1", "3", "5", "10", "30"].includes(String(s.personal?.overlayReconnectInterval || "smart")) ? String(s.personal?.overlayReconnectInterval || "smart") : "smart";
  els.overlayReconnectIntervalWrap?.classList.toggle("hidden", !els.overlayAutoReconnect?.checked);
  if (els.highlightEventUsername) els.highlightEventUsername.checked = s.personal?.highlightEventUsername !== false;
  if (els.highlightLikes) els.highlightLikes.checked = s.personal?.highlightLikes !== false;
  if (els.highlightFollows) els.highlightFollows.checked = s.personal?.highlightFollows !== false;
  if (els.highlightJoins) els.highlightJoins.checked = s.personal?.highlightJoins !== false;
  if (els.highlightShares) els.highlightShares.checked = s.personal?.highlightShares !== false;
  if (els.highlightSystem) els.highlightSystem.checked = s.personal?.highlightSystem !== false;
  if (els.highlightFanclub) els.highlightFanclub.checked = s.personal?.highlightFanclub !== false;
  if (els.highlightSuperfan) els.highlightSuperfan.checked = s.personal?.highlightSuperfan !== false;
  if (els.highlightGifts) els.highlightGifts.checked = s.personal?.highlightGifts !== false;
  if (els.highlightSubs) els.highlightSubs.checked = s.personal?.highlightSubs !== false;
  if (els.highlightBits) els.highlightBits.checked = s.personal?.highlightBits !== false;
  if (els.highlightRaids) els.highlightRaids.checked = s.personal?.highlightRaids !== false;
  refreshTikTokAvatarPreview();
  applyTheme();
  applyPanelSizing();
  updateEventGiftControls();
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

  applyAvatarSource(els.tiktokAvatar, getTikTokTopbarAvatarUrl(), dicebearTikTokAvatar(tiktok.username || "tiktok"));
  setAvatarImage(els.twitchAvatar, "twitch", twitch.username || "twitch");

  els.tiktokState.textContent = tiktokInfo.status;
  els.twitchState.textContent = twitchInfo.status;

  els.manageTikTokBtn.textContent = tiktok.username ? "Cambiar" : "Agregar";
  els.manageTwitchBtn.textContent = twitch.username ? "Cambiar" : "Agregar";
  els.disconnectTikTokBtn.classList.toggle("hidden", !tiktok.connected);
  els.disconnectTwitchBtn.classList.toggle("hidden", !twitch.connected);
}

function renderLayout() {
  const horizontal = String(state.settings.personal.chatLayout || "vertical") === "horizontal";
  document.body.classList.toggle("chat-horizontal", horizontal);
  document.body.classList.toggle("chat-vertical", !horizontal);
  document.body.classList.remove("chat-horizontal-compact", "chat-horizontal-normal", "chat-horizontal-wide");
  if (horizontal) document.body.classList.add(horizontalModeClass());

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
  updateChatControls();
  applyPanelSizing();
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

function openEventsPersonalizeModal() {
  openModal(els.eventsPersonalizeModal);
}

function openSettingsModal() {
  openModal(els.settingsModal);
}

function closeAllModals() {
  [els.connectModal, els.settingsModal, els.personalizeModal, els.eventsPersonalizeModal, els.overlayModal, els.overlayThemesModal].forEach((modal) => {
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
  let accent = kind === "gift" ? giftAccent(item) : itemAccent(item);
  if (kind === "event") accent = highlightColorFor(item, kind);
  if (kind === "chat" && isSupporterProfile(item) && supporterHighlightEnabled(platform)) accent = "#f5d063";
  const highlightColor = kind === "event"
    ? highlightColorFor(item, kind)
    : accent;
  const roleAccent = getRoleAccent(item);
  const badges = badgeChips(item.badges, platform);
  const activityBadges = kind === "chat" ? chatActivityBadgesMarkup(item) : "";
  const color = resolveNameColor(item);
  const textColor = resolveChatTextColor(state.settings.personal.textColor);
  const textContrast = effectContrastColor(state.settings.personal.textColor);
  const textShadow = effectShadow(state.settings.personal.messageEffect, textContrast);
  const nameShadow = effectShadow(state.settings.personal.nameEffect, textContrast);
  const nameStroke = effectStroke(state.settings.personal.nameEffect, textContrast);
  const text = kind === "chat"
    ? item.message || ""
    : kind === "gift"
      ? item.message || `${name} envió un regalo`
      : item.message || "";
  const action = kind === "chat" ? (item.action || "Mensaje") : (item.action || kind);
  const bubbleFrame = kind === "chat"
    ? bubbleClass()
    : (kind === "event"
      ? (state.settings.personal.eventsCardFrame !== false ? "frame-platform" : "frame-none")
      : (state.settings.personal.giftsCardFrame !== false ? "frame-platform" : "frame-none"));
  const highlightClass = isHighlightedEntry(item, kind);
  const badgeEmojiMark = itemEmoji(item, kind);
  const avatar = avatarForItem(item);
  const hasAvatar = Boolean(avatar);
  const textScale = kind === "chat" && state.settings.personal.chatAdjustMessages === true ? autoMessageScale(text) : 1;

  return `
    <article class="${kind === "chat" ? "message" : kind === "gift" ? "giftItem" : "eventItem"} ${kind === "chat" ? animationClass() : ""} ${highlightClass}" style="--item-accent:${accent}; --highlight-color:${highlightColor}; --role-accent:${roleAccent}; --name-color:${color}; --entry-text-color:${textColor || 'var(--text)'}; --entry-text-scale:${textScale}; --entry-text-shadow:${textShadow}; --name-text-shadow:${nameShadow}; --name-stroke:${nameStroke}">
      <div class="entryAvatarWrap ${frameClass()} ${hasAvatar ? "" : "no-avatar"}">
        <img class="entryAvatar" src="${hasAvatar ? ESC(avatar) : BLANK_PIXEL}" alt="avatar" loading="lazy" ${hasAvatar ? "" : 'style="display:none"'} />
      </div>
      <div class="entryBody">
        <div class="entryBubble ${bubbleFrame}">
          <div class="entryTop">
            <span class="user">${ESC(name)}</span>
            ${activityBadges ? `<span class="entryActivityBadges">${activityBadges}</span>` : ""}
            <span class="itemEmoji">${ESC(badgeEmojiMark)}</span>
            ${platformTag(platform)}
            <span class="actionTag">${ESC(action)}</span>
            <span class="timeTag">${timeLabel(item.timestamp)}</span>
          </div>
          <div class="entryText">${kind === "chat" ? getRenderedMessage(item) : ESC(text).replace(/\n/g, "<br>")}</div>
          ${(item.gift || item.giftImage || item.giftCoins) ? (() => {
            const catalogHit = lookupGiftCatalog(item.gift || item.giftName || "");
            const giftName = item.gift || item.giftName || catalogHit?.name || "Regalo";
            const giftImage = normalizeImageSource(item.giftImage || catalogHit?.image || "");
            const giftCoins = Number(item.giftCoins ?? catalogHit?.coins ?? 0) || 0;
            return `<div class="giftMedia">${giftImage ? `<img class="giftMediaImg" src="${ESC(giftImage)}" alt="${ESC(item.giftAlt || giftName)}" loading="lazy" onerror="this.style.display='none'">` : ""}<div class="giftMediaMeta">${item.gift ? `<span class="giftTag">🎁 ${ESC(giftName)}</span>` : ""}${giftCoins ? `<span class="giftCoinBadge"><img src="/coin-logo.png" alt="" aria-hidden="true"> ${ESC(giftCoins)}</span>` : ""}${item.amount ? `<span class="kindTag">x${ESC(item.amount)}</span>` : ""}</div></div>`;
          })() : ""}
          ${badges ? `<div class="entryMeta">${badges}</div>` : ""}
        </div>
      </div>
    </article>`;
}


function renderChat() {
  const filter = els.chatFilter.value;
  const layout = String(state.settings.personal.chatLayout || "vertical");
  const direction = String(state.settings.personal.chatDirection || "down");
  const reverse = layout === "horizontal" ? direction === "left" : direction === "up";
  const rows = state.chat
    .filter((item) => (filter === "all" || item.platform === filter))
    .sort((a, b) => reverse
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
  const direction = String(state.settings.personal.eventsDirection || "down");
  const reverse = direction === "left" || direction === "up";
  state.events = pruneTimedItems(state.events, state.settings.personal.eventsAutoClear, state.settings.personal.eventsClearSeconds);
  const rows = state.events
    .filter((item) => (filter === "all" || item.platform === filter) && typeAllowed(item))
    .sort((a, b) => reverse
      ? (b.timestamp || 0) - (a.timestamp || 0)
      : (a.timestamp || 0) - (b.timestamp || 0));
  els.eventList.innerHTML = rows.length
    ? rows.map((item) => renderItem(item, "event")).join("")
    : `<div class="emptyState"><strong>Sin eventos</strong><span>Likes, follows, joins y avisos aparecerán aquí.</span></div>`;
  if (rows.length && (state.eventScroll.follow || isListAtEdge(els.eventList, state.settings.personal.eventsLayout, state.settings.personal.eventsDirection))) {
    scrollEventsToEdge(false);
    state.eventScroll.follow = true;
  }
}

function renderGifts() {
  const filter = els.giftFilter.value;
  const direction = String(state.settings.personal.giftsDirection || "down");
  const reverse = direction === "left" || direction === "up";
  state.gifts = pruneTimedItems(state.gifts, state.settings.personal.giftsAutoClear, state.settings.personal.giftsClearSeconds);
  const rows = state.gifts
    .filter((item) => (filter === "all" || item.platform === filter) && giftAllowed(item))
    .sort((a, b) => reverse
      ? (b.timestamp || 0) - (a.timestamp || 0)
      : (a.timestamp || 0) - (b.timestamp || 0));
  els.giftList.innerHTML = rows.length
    ? rows.map((item) => renderItem(item, "gift")).join("")
    : `<div class="emptyState"><strong>Sin regalos</strong><span>Subs, bits, gifts y raids aparecerán aquí.</span></div>`;
  if (rows.length && (state.giftScroll.follow || isListAtEdge(els.giftList, state.settings.personal.giftsLayout, state.settings.personal.giftsDirection))) {
    scrollGiftsToEdge(false);
    state.giftScroll.follow = true;
  }
}

function renderAll() {
  renderLayout();
  renderTopbar();
  renderChat();
  renderEvents();
  renderGifts();
}

function pushChat(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: sanitizeTikTokUserAvatar(data.avatar),
    timestamp: data.timestamp || Date.now(),
  };
  rememberSupporter(item);
  state.chat.push(item);
  if (state.chat.length > 240) state.chat.splice(0, state.chat.length - 240);
  state.chatScroll.follow = true;
  state.chatScroll.unread = false;
  renderChat();
  syncChatNotice();
}

function pushEvent(data, group = "event") {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    group,
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: sanitizeTikTokUserAvatar(data.avatar),
    timestamp: data.timestamp || Date.now(),
  };
  registerActivityBadges(item);
  rememberSupporter(item);
  state.events.unshift(item);
  state.events = state.events.slice(0, 240);
  state.eventScroll.follow = true;
  renderEvents();
}

function pushGift(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    group: "gift",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: sanitizeTikTokUserAvatar(data.avatar),
    timestamp: data.timestamp || Date.now(),
  };
  registerActivityBadges(item);
  rememberSupporter(item);
  state.gifts.unshift(item);
  state.gifts = state.gifts.slice(0, 240);
  state.giftScroll.follow = true;
  renderGifts();
}

function clearOldChat() {
  if (!state.settings.personal.autoClearChat) return;
  const maxAge = Math.max(10, Number(state.settings.personal.clearChatSeconds || 30)) * 1000;
  const cutoff = Date.now() - maxAge;
  const before = state.chat.length;
  state.chat = state.chat.filter((item) => (item.timestamp || 0) >= cutoff);
  if (state.chat.length !== before) renderChat();
}

function pruneTimedItems(items, enabled, seconds) {
  if (!enabled) return items;
  const maxAge = Math.max(10, Number(seconds || 30)) * 1000;
  const cutoff = Date.now() - maxAge;
  return items.filter((item) => (item.timestamp || 0) >= cutoff);
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
  els.openOverlayThemesBtn?.addEventListener("click", () => openModal(els.overlayThemesModal));
  els.closeOverlayBtn.addEventListener("click", () => closeModal(els.overlayModal));
  els.closeOverlayThemesBtn?.addEventListener("click", () => closeModal(els.overlayThemesModal));
  els.closeOverlayThemesBtnBottom?.addEventListener("click", () => closeModal(els.overlayThemesModal));
  els.overlayChatBtn.addEventListener("click", () => openOverlay("chat"));
  els.overlayEventsBtn.addEventListener("click", () => openOverlay("events"));
  els.overlayGiftsBtn.addEventListener("click", () => openOverlay("gifts"));
  els.overlayThemesModal?.addEventListener("click", (ev) => {
    const card = ev.target.closest("[data-overlay-theme]");
    if (!card) return;
    const theme = String(card.dataset.overlayTheme || "neon");
    state.settings.personal.overlayTheme = theme;
    saveJSON(SETTINGS_KEY, state.settings);
    saveJSON(LEGACY_SETTINGS_KEY, state.settings);
    socket.emit("saveSettings", state.settings);
    renderAll();
    loadSettingsToUI();
    toast("Tema overlay guardado", `Se aplicó ${theme} al overlay.`);
    closeModal(els.overlayThemesModal);
  });

  if (els.chatJumpBtn) {
    els.chatJumpBtn.addEventListener("click", () => {
      state.chatScroll.unread = false;
      state.chatScroll.follow = true;
      syncChatNotice();
      scrollChatToEdge(true);
    });
  }

  els.openPersonalizeBtn?.addEventListener("click", openPersonalizeModal);
  els.openEventsPersonalizeBtn?.addEventListener("click", openEventsPersonalizeModal);
  els.closePersonalizeBtn?.addEventListener("click", () => closeModal(els.personalizeModal));
  els.closeEventsPersonalizeBtn?.addEventListener("click", () => closeModal(els.eventsPersonalizeModal));
  els.openSettingsBtn?.addEventListener("click", openSettingsModal);
  els.closeSettingsBtn?.addEventListener("click", () => closeModal(els.settingsModal));

  els.saveSettingsBtn.addEventListener("click", () => {
    saveAndNotify(els.settingsModal, "Ajustes guardados", "Paneles y orden actualizados y enviados al overlay.");
  });

  els.resetSettingsBtn.addEventListener("click", () => {
    state.settings.panels.chat = true;
    state.settings.panels.events = true;
    state.settings.panels.gifts = true;
    state.settings.order = "events-gifts";
    state.settings.filters.chat = "all";
    state.settings.filters.event = "all";
    state.settings.filters.gift = "all";
    saveJSON(SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    renderAll();
    toast("Ajustes restaurados", "Se recuperó la vista base.");
  });

  els.savePersonalizeBtn.addEventListener("click", () => {
    saveAndNotify(els.personalizeModal, "Personalización aplicada", "Se guardó también para el overlay.");
  });

  els.resetPersonalizeBtn.addEventListener("click", () => {
    Object.assign(state.settings.personal, structuredClone(defaults.personal));
    saveJSON(SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    renderAll();
    toast("Personalización restaurada", "Se volvió al tema base.");
  });

  els.saveEventsPersonalizeBtn?.addEventListener("click", () => {
    saveAndNotify(els.eventsPersonalizeModal, "Eventos/regalos guardados", "La configuración se aplicó al overlay y quedó guardada.");
  });

  els.resetEventsPersonalizeBtn?.addEventListener("click", () => {
    state.settings.personal.eventsLayout = defaults.personal.eventsLayout;
    state.settings.personal.eventsDirection = defaults.personal.eventsDirection;
    state.settings.personal.eventsPanelSize = defaults.personal.eventsPanelSize;
    state.settings.personal.eventsCardFrame = defaults.personal.eventsCardFrame;
    state.settings.personal.eventsAutoClear = defaults.personal.eventsAutoClear;
    state.settings.personal.eventsClearSeconds = defaults.personal.eventsClearSeconds;
    state.settings.personal.giftsLayout = defaults.personal.giftsLayout;
    state.settings.personal.giftsDirection = defaults.personal.giftsDirection;
    state.settings.personal.giftsPanelSize = defaults.personal.giftsPanelSize;
    state.settings.personal.giftsCardFrame = defaults.personal.giftsCardFrame;
    state.settings.personal.giftsAutoClear = defaults.personal.giftsAutoClear;
    state.settings.personal.giftsClearSeconds = defaults.personal.giftsClearSeconds;
    state.settings.personal.highlightStyle = defaults.personal.highlightStyle;
    state.settings.personal.giftHighlightStyle = defaults.personal.giftHighlightStyle;
    state.settings.personal.overlayEventHighlightStyle = defaults.personal.overlayEventHighlightStyle;
    state.settings.personal.overlayGiftImageSize = defaults.personal.overlayGiftImageSize;
    state.settings.personal.overlayGiftComposition = defaults.personal.overlayGiftComposition;
    state.settings.personal.overlayAutoReconnect = defaults.personal.overlayAutoReconnect;
    state.settings.personal.overlayReconnectInterval = defaults.personal.overlayReconnectInterval;
    state.settings.personal.highlightLikes = defaults.personal.highlightLikes;
    state.settings.personal.highlightFollows = defaults.personal.highlightFollows;
    state.settings.personal.highlightJoins = defaults.personal.highlightJoins;
    state.settings.personal.highlightShares = defaults.personal.highlightShares;
    state.settings.personal.highlightSystem = defaults.personal.highlightSystem;
    state.settings.personal.highlightFanclub = defaults.personal.highlightFanclub;
    state.settings.personal.highlightSuperfan = defaults.personal.highlightSuperfan;
    state.settings.personal.highlightGifts = defaults.personal.highlightGifts;
    state.settings.personal.highlightSubs = defaults.personal.highlightSubs;
    state.settings.personal.highlightBits = defaults.personal.highlightBits;
    state.settings.personal.highlightRaids = defaults.personal.highlightRaids;
    saveJSON(SETTINGS_KEY, state.settings);
    saveJSON(LEGACY_SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    renderAll();
    toast("Eventos/regalos restaurados", "Se volvió a la vista base.");
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
    els.avatarSizeSelect,
    els.nameSizeSelect,
    els.nameWeightSelect,
    els.chatHorizontalModeSelect,
    els.badgeStyleSelect,
    els.twitchNameColorSelect,
    els.tiktokNameColorSelect,
    els.showBadges,
    els.showEmotes,
    els.highlightSupportersTikTok,
    els.highlightSupportersTwitch,
    els.supporterHighlightSelect,
    els.autoClearChat,
    els.clearChatSeconds,
    els.eventsLayoutSelect,
    els.eventsDirectionSelect,
    els.eventsPanelSizeSelect,
    els.eventsCardFrame,
    els.eventsAutoClear,
    els.eventsClearSeconds,
    els.giftsLayoutSelect,
    els.giftsDirectionSelect,
    els.giftsPanelSizeSelect,
    els.giftsCardFrame,
    els.giftsAutoClear,
    els.giftsClearSeconds,
    els.overlayAutoReconnect,
    els.overlayReconnectInterval,
    els.highlightStyleSelect,
    els.highlightLikes,
    els.highlightFollows,
    els.highlightJoins,
    els.highlightShares,
    els.highlightSystem,
    els.highlightFanclub,
    els.highlightSuperfan,
    els.highlightGifts,
    els.highlightSubs,
    els.highlightBits,
    els.highlightRaids,
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
    if (!el) return;
    el.addEventListener("change", () => {
      if (el === els.autoClearChat) {
        els.clearChatSecondsWrap.classList.toggle("hidden", !els.autoClearChat.checked);
      }
      if (el === els.overlayAutoReconnect) {
        els.overlayReconnectIntervalWrap?.classList.toggle("hidden", !els.overlayAutoReconnect.checked);
      }
      if (el === els.chatLayoutSelect) {
        updateChatControls();
      }
      if (el === els.eventsLayoutSelect || el === els.giftsLayoutSelect || el === els.eventsAutoClear || el === els.giftsAutoClear) {
        updateEventGiftControls();
      }
      persistSettings();
      renderAll();
    });
  });

  if (els.tiktokAvatarUrl) {
    els.tiktokAvatarUrl.addEventListener("input", () => {
      persistSettings();
      renderAll();
    });
  }

  if (els.tiktokAvatarFile) {
    els.tiktokAvatarFile.addEventListener("change", async () => {
      const file = els.tiktokAvatarFile.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("Archivo no válido", "Sube una imagen.", "err");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) {
        toast("No se pudo leer la imagen", "", "err");
        return;
      }
      els.tiktokAvatarUrl.value = dataUrl;
      persistSettings();
      renderAll();
      toast("Foto actualizada", "Se guardó la imagen de TikTok.");
    });
  }

  if (els.clearTiktokAvatarBtn) {
    els.clearTiktokAvatarBtn.addEventListener("click", () => {
      els.tiktokAvatarUrl.value = "";
      persistSettings();
      renderAll();
      toast("Foto restablecida", "Se usará el avatar predeterminado.");
    });
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeAllModals();
  });

  window.addEventListener("click", (ev) => {
    [els.connectModal, els.settingsModal, els.personalizeModal, els.eventsPersonalizeModal, els.overlayModal].forEach((modal) => {
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
    if (ev.key === SESSION_KEY && ev.newValue) {
      try {
        state.session = JSON.parse(ev.newValue);
        renderTopbar();
      } catch {}
    }
    if (ev.key === SUPPORTERS_KEY && ev.newValue) {
      try {
        state.supporters = JSON.parse(ev.newValue);
        renderAll();
      } catch {}
    }
    if (ev.key === PRESENCE_KEY && ev.newValue) {
      try {
        state.presence = JSON.parse(ev.newValue);
        renderTopbar();
      } catch {}
    }
  });

  window.setInterval(() => {
    clearOldChat();
    if (state.settings.personal.eventsAutoClear) renderEvents();
    if (state.settings.personal.giftsAutoClear) renderGifts();
  }, 5000);
}

function bootstrap() {
  loadSettingsToUI();
  renderAll();
  bindEvents();
  bindChatScroll();
  bindActivityScroll(els.eventList, state.eventScroll, () => state.settings.personal.eventsLayout || "vertical", () => state.settings.personal.eventsDirection || "down");
  bindActivityScroll(els.giftList, state.giftScroll, () => state.settings.personal.giftsLayout || "vertical", () => state.settings.personal.giftsDirection || "down");

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
      badges: data?.badges || [],
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

ensureGiftCatalog();
