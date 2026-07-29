const socket = io();

const $ = (id) => document.getElementById(id);

const sessionToken = getOrCreateSessionToken();
window.__streamfusion = window.__streamfusion || {};
window.__streamfusion.socket = socket;
window.__streamfusion.sessionToken = sessionToken;

const DEFAULT_SETTINGS = {
  general: {
    language: "es",
    theme: "dark",
    startMinimized: false,
    playSounds: true,
    saveLogs: true,
  },
  chat: {
    showAvatar: true,
    showUsername: true,
    showPlatform: true,
    showTime: true,
    compactMode: false,
    bubbleStyle: "bubble",
    maxVisibleMessages: 120,
    autoScroll: true,
    showBadges: true,
  },
  events: {
    showJoin: true,
    showLike: true,
    showFollow: true,
    showShare: true,
    showSystem: true,
    showViewer: true,
  },
  gifts: {
    showGift: true,
    showFanClub: true,
    showSuperFan: true,
    showEnvelope: true,
    showSub: true,
    showBits: true,
    showRaid: true,
  },
  panels: {
    showStats: false,
    showEvents: false,
    showGifts: false,
  },
};

const I18N = {
  es: {
    "welcome.title": "StreamFusion",
    "welcome.subtitle": "Conecta tus plataformas para comenzar",
    "welcome.tiktok": "TikTok Username",
    "welcome.twitch": "Twitch Username",
    "welcome.connect": "Conectar",
    "welcome.settings": "Configuración",
    "welcome.hint": "Puedes conectar una o ambas plataformas",
    "topbar.tagline": "Live dashboard",
    "panel.chat": "Chat",
    "panel.chat.subtitle": "Mensajes en tiempo real",
    "panel.events": "Eventos",
    "panel.events.subtitle": "Likes, follows, joins y shares",
    "panel.gifts": "Regalos",
    "panel.gifts.subtitle": "Gifts, fan club, subs, bits y raids",
    "settings.title": "Configuración",
    "settings.general": "General",
    "settings.chat": "Chat",
    "settings.events": "Eventos",
    "settings.gifts": "Regalos",
    "settings.panels": "Paneles",
    "settings.appearance": "Apariencia",
    "settings.language": "Idioma",
    "settings.theme": "Tema",
    "settings.startMinimized": "Iniciar minimizado",
    "settings.sounds": "Sonidos",
    "settings.logs": "Guardar historial",
    "settings.reset": "Restaurar",
    "settings.save": "Guardar",
    "chat.avatar": "Mostrar avatar",
    "chat.username": "Mostrar username",
    "chat.platform": "Mostrar plataforma",
    "chat.time": "Mostrar hora",
    "chat.compact": "Modo compacto",
    "chat.style": "Estilo",
    "chat.style.bubble": "Bubble",
    "chat.style.glass": "Glass",
    "chat.style.minimal": "Minimal",
    "chat.max": "Máximo mensajes",
    "chat.autoscroll": "Auto scroll inteligente",
    "chat.badges": "Mostrar insignias",
    "events.join": "Se unió",
    "events.like": "Likes",
    "events.follow": "Seguir",
    "events.share": "Compartió",
    "events.system": "Sistema",
    "events.viewer": "Espectadores",
    "gifts.gift": "Regalos",
    "gifts.fanclub": "Fan Club",
    "gifts.superfan": "Super Fan",
    "gifts.envelope": "Envelopes",
    "gifts.sub": "Subs",
    "gifts.bits": "Bits",
    "gifts.raid": "Raids",
    "panels.stats": "Mostrar estadísticas",
    "panels.events": "Mostrar eventos",
    "panels.gifts": "Mostrar regalos",
    "appearance.accent": "Accent",
    "appearance.radius": "Bordes",
    "filters.all": "Ambos",
    "filters.tiktok": "TikTok",
    "filters.twitch": "Twitch",
    "toast.saved": "Configuración guardada.",
    "toast.overlay": "Overlay abierto.",
    "toast.login": "Sesión activa.",
    "toast.connecting": "Conectando...",
    "toast.done": "Realizado",
    "status.idle": "Desconectado",
    "status.pending": "Conectando",
    "status.live": "En directo",
    "status.offline": "Conectado",
    "status.error": "Error",
  },
  en: {
    "welcome.title": "StreamFusion",
    "welcome.subtitle": "Connect your platforms to begin",
    "welcome.tiktok": "TikTok Username",
    "welcome.twitch": "Twitch Username",
    "welcome.connect": "Connect",
    "welcome.settings": "Settings",
    "welcome.hint": "You can connect one or both platforms",
    "topbar.tagline": "Live dashboard",
    "panel.chat": "Chat",
    "panel.chat.subtitle": "Real-time messages",
    "panel.events": "Events",
    "panel.events.subtitle": "Likes, follows, joins and shares",
    "panel.gifts": "Gifts",
    "panel.gifts.subtitle": "Gifts, fan club, subs, bits and raids",
    "settings.title": "Settings",
    "settings.general": "General",
    "settings.chat": "Chat",
    "settings.events": "Events",
    "settings.gifts": "Gifts",
    "settings.panels": "Panels",
    "settings.appearance": "Appearance",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.startMinimized": "Start minimized",
    "settings.sounds": "Sounds",
    "settings.logs": "Save history",
    "settings.reset": "Reset",
    "settings.save": "Save",
    "chat.avatar": "Show avatar",
    "chat.username": "Show username",
    "chat.platform": "Show platform",
    "chat.time": "Show time",
    "chat.compact": "Compact mode",
    "chat.style": "Style",
    "chat.style.bubble": "Bubble",
    "chat.style.glass": "Glass",
    "chat.style.minimal": "Minimal",
    "chat.max": "Max messages",
    "chat.autoscroll": "Smart auto scroll",
    "chat.badges": "Show badges",
    "events.join": "Join",
    "events.like": "Likes",
    "events.follow": "Follow",
    "events.share": "Shared",
    "events.system": "System",
    "events.viewer": "Viewers",
    "gifts.gift": "Gifts",
    "gifts.fanclub": "Fan Club",
    "gifts.superfan": "Super Fan",
    "gifts.envelope": "Envelopes",
    "gifts.sub": "Subs",
    "gifts.bits": "Bits",
    "gifts.raid": "Raids",
    "panels.stats": "Show stats",
    "panels.events": "Show events",
    "panels.gifts": "Show gifts",
    "appearance.accent": "Accent",
    "appearance.radius": "Corners",
    "filters.all": "Both",
    "filters.tiktok": "TikTok",
    "filters.twitch": "Twitch",
    "toast.saved": "Settings saved.",
    "toast.overlay": "Overlay opened.",
    "toast.login": "Session active.",
    "toast.connecting": "Connecting...",
    "toast.done": "Done",
    "status.idle": "Disconnected",
    "status.pending": "Connecting",
    "status.live": "Live",
    "status.offline": "Connected",
    "status.error": "Error",
  }
};

const state = {
  token: sessionToken,
  settings: loadSettings(),
  accounts: {
    tiktok: null,
    twitch: null,
  },
  stats: {
    tiktok: { viewers: 0, likes: 0, gifts: 0, followers: 0, shares: 0 },
    twitch: { viewers: 0, subs: 0, bits: 0, raids: 0, followers: 0 },
  },
  histories: {
    chat: [],
    events: [],
    gifts: [],
  },
  filters: {
    chat: "all",
    events: "all",
    gifts: "all",
  },
  overlayOpened: false,
  locale: "es",
};

const el = {
  welcomeOverlay: $("welcomeOverlay"),
  welcomeTikTok: $("welcomeTikTok"),
  welcomeTwitch: $("welcomeTwitch"),
  welcomeConnect: $("welcomeConnect"),
  welcomeOpenSettings: $("welcomeOpenSettings"),

  appShell: $("appShell"),
  accountStrip: $("accountStrip"),
  viewerPill: $("viewerPill"),
  viewerCount: $("viewerCount"),
  statsRail: $("statsRail"),
  dashboard: $("dashboard"),

  chatPanel: $("chatPanel"),
  eventPanel: $("eventPanel"),
  giftPanel: $("giftPanel"),
  rightColumn: $("rightColumn"),
  chatList: $("chatList"),
  eventList: $("eventList"),
  giftList: $("giftList"),

  chatFilter: $("chatFilter"),
  eventFilter: $("eventFilter"),
  giftFilter: $("giftFilter"),

  openOverlay: $("openOverlay"),
  openSettings: $("openSettings"),
  settingsModal: $("settingsModal"),
  closeSettings: $("closeSettings"),
  settingsTabs: $("settingsTabs"),
  tabPages: {
    general: $("tab-general"),
    chat: $("tab-chat"),
    events: $("tab-events"),
    gifts: $("tab-gifts"),
    panels: $("tab-panels"),
    appearance: $("tab-appearance"),
  },
  saveSettings: $("saveSettings"),
  resetSettings: $("resetSettings"),

  languageSelect: $("languageSelect"),
  themeSelect: $("themeSelect"),
  startMinimized: $("startMinimized"),
  playSounds: $("playSounds"),
  saveLogs: $("saveLogs"),

  chatShowAvatar: $("chatShowAvatar"),
  chatShowUsername: $("chatShowUsername"),
  chatShowPlatform: $("chatShowPlatform"),
  chatShowTime: $("chatShowTime"),
  chatCompactMode: $("chatCompactMode"),
  chatBubbleStyle: $("chatBubbleStyle"),
  chatMaxMessages: $("chatMaxMessages"),
  chatAutoScroll: $("chatAutoScroll"),
  chatShowBadges: $("chatShowBadges"),

  eventShowJoin: $("eventShowJoin"),
  eventShowLike: $("eventShowLike"),
  eventShowFollow: $("eventShowFollow"),
  eventShowShare: $("eventShowShare"),
  eventShowSystem: $("eventShowSystem"),
  eventShowViewer: $("eventShowViewer"),

  giftShowGift: $("giftShowGift"),
  giftShowFanClub: $("giftShowFanClub"),
  giftShowSuperFan: $("giftShowSuperFan"),
  giftShowEnvelope: $("giftShowEnvelope"),
  giftShowSub: $("giftShowSub"),
  giftShowBits: $("giftShowBits"),
  giftShowRaid: $("giftShowRaid"),

  panelShowStats: $("panelShowStats"),
  panelShowEvents: $("panelShowEvents"),
  panelShowGifts: $("panelShowGifts"),

  accentSelect: $("accentSelect"),
  radiusSelect: $("radiusSelect"),

  toastContainer: $("toastContainer"),
};

function getOrCreateSessionToken() {
  const key = "streamfusion.sessionToken";
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, token);
  }
  return token;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(settingsKey());
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    return mergeDeep(structuredClone(DEFAULT_SETTINGS), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(settingsKey(), JSON.stringify(settings));
  } catch {}
}

function settingsKey() {
  return `streamfusion.settings.${sessionToken}`;
}

function mergeDeep(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const result = { ...base };
  for (const key of Object.keys(incoming)) {
    result[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
  }
  return result;
}

function t(key) {
  return (I18N[state.locale] && I18N[state.locale][key]) || I18N.es[key] || key;
}

function applyTranslations() {
  document.documentElement.lang = state.locale;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  el.welcomeTikTok.placeholder = state.locale === "en" ? "@username" : "@usuario";
  el.welcomeTwitch.placeholder = state.locale === "en" ? "channel" : "canal";

  setLanguageOptions();
  renderFilters();
}

function setLanguageOptions() {
  if (el.languageSelect) {
    const esLabel = state.locale === "en" ? "Spanish" : "Español";
    const enLabel = "English";
    el.languageSelect.options[0].textContent = esLabel;
    el.languageSelect.options[1].textContent = enLabel;
  }
}

function fallbackAvatarUrl(seed) {
  return `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seed || "streamfusion")}`;
}

function proxiedAvatarUrl(url, seed) {
  const source = String(url || "").trim();
  if (!source) return fallbackAvatarUrl(seed);
  if (source.startsWith("data:")) return source;
  if (source.startsWith("/api/avatar")) return source;
  return `/api/avatar?seed=${encodeURIComponent(seed || "streamfusion")}&url=${encodeURIComponent(source)}`;
}

function makeAvatarNode(url, seed) {
  const wrap = document.createElement("div");
  wrap.className = "avatarWrap";
  const img = document.createElement("img");
  img.alt = seed || "avatar";
  img.referrerPolicy = "no-referrer";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = proxiedAvatarUrl(url, seed);
  img.onerror = () => {
    img.onerror = null;
    img.src = fallbackAvatarUrl(seed);
  };
  wrap.appendChild(img);
  return wrap;
}

function platformLabel(platform) {
  return platform === "twitch" ? "Twitch" : "TikTok";
}

function platformClass(platform) {
  return platform === "twitch" ? "twitch" : "tiktok";
}

function formatTime(ts = Date.now()) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: state.locale !== "es",
  });
}

function isAtBottom(container) {
  return container.scrollHeight - container.scrollTop - container.clientHeight < 40;
}

function showToast(message, variant = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.innerHTML = `
    <div class="toastTitle">${variant === "success" ? t("toast.done") : variant === "warning" ? "Warning" : variant === "error" ? "Error" : "Info"}</div>
    <div class="toastBody">${message}</div>
  `;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function setWelcomeVisible(visible) {
  el.welcomeOverlay.classList.toggle("modal-open", visible);
  el.appShell.classList.toggle("hidden", visible);
}

function renderFilters() {
  renderSegmented(el.chatFilter, "chat", state.filters.chat);
  renderSegmented(el.eventFilter, "events", state.filters.events);
  renderSegmented(el.giftFilter, "gifts", state.filters.gifts);
}

function renderSegmented(container, key, active) {
  if (!container) return;
  container.innerHTML = "";
  const values = ["all", "tiktok", "twitch"];
  values.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = `segBtn ${value === active ? "active" : ""} ${value !== "all" ? value : ""}`;
    btn.textContent = value === "all" ? t("filters.all") : t(`filters.${value}`);
    btn.addEventListener("click", () => {
      state.filters[key] = value;
      renderFilters();
      renderVisibleLists();
    });
    container.appendChild(btn);
  });
}

function shouldShowPlatform(platform, filter) {
  if (filter === "all") return true;
  return platform === filter;
}

function normalizeMessage(data) {
  return {
    platform: data.platform === "twitch" ? "twitch" : "tiktok",
    username: data.username || data.user || "Usuario",
    displayName: data.displayName || data.username || data.user || "Usuario",
    avatarUrl: data.avatarUrl || "",
    message: data.message || "Mensaje sin texto",
    timestamp: data.timestamp || Date.now(),
    type: data.type || "chat",
    amount: data.amount,
    subtype: data.subtype || "",
    color: data.color || "",
    badges: Array.isArray(data.badges) ? data.badges : [],
  };
}

function addHistory(type, item, limit = 150) {
  state.histories[type].push(item);
  if (state.histories[type].length > limit) {
    state.histories[type].splice(0, state.histories[type].length - limit);
  }
}

function updateLocaleFromSettings() {
  state.locale = state.settings.general.language || "es";
  applyTranslations();
}

function applySettingsToUI() {
  const s = state.settings;
  el.languageSelect.value = s.general.language || "es";
  el.themeSelect.value = s.general.theme || "dark";
  el.startMinimized.checked = !!s.general.startMinimized;
  el.playSounds.checked = !!s.general.playSounds;
  el.saveLogs.checked = !!s.general.saveLogs;

  el.chatShowAvatar.checked = !!s.chat.showAvatar;
  el.chatShowUsername.checked = !!s.chat.showUsername;
  el.chatShowPlatform.checked = !!s.chat.showPlatform;
  el.chatShowTime.checked = !!s.chat.showTime;
  el.chatCompactMode.checked = !!s.chat.compactMode;
  el.chatBubbleStyle.value = s.chat.bubbleStyle || "bubble";
  el.chatMaxMessages.value = s.chat.maxVisibleMessages || 120;
  el.chatAutoScroll.checked = !!s.chat.autoScroll;
  el.chatShowBadges.checked = !!s.chat.showBadges;

  el.eventShowJoin.checked = !!s.events.showJoin;
  el.eventShowLike.checked = !!s.events.showLike;
  el.eventShowFollow.checked = !!s.events.showFollow;
  el.eventShowShare.checked = !!s.events.showShare;
  el.eventShowSystem.checked = !!s.events.showSystem;
  el.eventShowViewer.checked = !!s.events.showViewer;

  el.giftShowGift.checked = !!s.gifts.showGift;
  el.giftShowFanClub.checked = !!s.gifts.showFanClub;
  el.giftShowSuperFan.checked = !!s.gifts.showSuperFan;
  el.giftShowEnvelope.checked = !!s.gifts.showEnvelope;
  el.giftShowSub.checked = !!s.gifts.showSub;
  el.giftShowBits.checked = !!s.gifts.showBits;
  el.giftShowRaid.checked = !!s.gifts.showRaid;

  el.panelShowStats.checked = !!s.panels.showStats;
  el.panelShowEvents.checked = !!s.panels.showEvents;
  el.panelShowGifts.checked = !!s.panels.showGifts;

  el.radiusSelect.value = String((s.appearance && s.appearance.radius) || 18);
  el.accentSelect.value = (s.appearance && s.appearance.accent) || "cyan";

  document.documentElement.style.setProperty("--radius", `${el.radiusSelect.value}px`);
  document.documentElement.style.setProperty("--accent", accentValue(el.accentSelect.value));
  document.documentElement.style.setProperty("--accent2", accentValue(el.accentSelect.value, true));
  document.body.dataset.theme = s.general.theme || "dark";
}

function accentValue(name, darker = false) {
  const map = {
    cyan: darker ? "#0ea5e9" : "#22d3ee",
    violet: darker ? "#7c3aed" : "#a78bfa",
    pink: darker ? "#db2777" : "#ff5ca8",
    blue: darker ? "#2563eb" : "#60a5fa",
  };
  return map[name] || (darker ? "#0ea5e9" : "#22d3ee");
}

function collectSettingsFromUI() {
  const next = structuredClone(state.settings);
  next.general.language = el.languageSelect.value;
  next.general.theme = el.themeSelect.value;
  next.general.startMinimized = el.startMinimized.checked;
  next.general.playSounds = el.playSounds.checked;
  next.general.saveLogs = el.saveLogs.checked;

  next.chat.showAvatar = el.chatShowAvatar.checked;
  next.chat.showUsername = el.chatShowUsername.checked;
  next.chat.showPlatform = el.chatShowPlatform.checked;
  next.chat.showTime = el.chatShowTime.checked;
  next.chat.compactMode = el.chatCompactMode.checked;
  next.chat.bubbleStyle = el.chatBubbleStyle.value;
  next.chat.maxVisibleMessages = Number(el.chatMaxMessages.value || 120);
  next.chat.autoScroll = el.chatAutoScroll.checked;
  next.chat.showBadges = el.chatShowBadges.checked;

  next.events.showJoin = el.eventShowJoin.checked;
  next.events.showLike = el.eventShowLike.checked;
  next.events.showFollow = el.eventShowFollow.checked;
  next.events.showShare = el.eventShowShare.checked;
  next.events.showSystem = el.eventShowSystem.checked;
  next.events.showViewer = el.eventShowViewer.checked;

  next.gifts.showGift = el.giftShowGift.checked;
  next.gifts.showFanClub = el.giftShowFanClub.checked;
  next.gifts.showSuperFan = el.giftShowSuperFan.checked;
  next.gifts.showEnvelope = el.giftShowEnvelope.checked;
  next.gifts.showSub = el.giftShowSub.checked;
  next.gifts.showBits = el.giftShowBits.checked;
  next.gifts.showRaid = el.giftShowRaid.checked;

  next.panels.showStats = el.panelShowStats.checked;
  next.panels.showEvents = el.panelShowEvents.checked;
  next.panels.showGifts = el.panelShowGifts.checked;

  next.appearance = next.appearance || {};
  next.appearance.radius = Number(el.radiusSelect.value || 18);
  next.appearance.accent = el.accentSelect.value;

  return next;
}

function renderAccountStrip() {
  el.accountStrip.innerHTML = "";
  const accounts = [
    ["tiktok", state.accounts.tiktok],
    ["twitch", state.accounts.twitch],
  ];

  accounts.forEach(([platform, acc]) => {
    const card = document.createElement("div");
    const status = acc?.status || "idle";
    const username = acc?.username || "";
    const displayName = acc?.displayName || username || (platform === "tiktok" ? "TikTok" : "Twitch");
    const isIdle = !username && status === "idle";
    card.className = `accountCard ${status}${isIdle ? " idle" : ""}`;
    card.dataset.platform = platform;

    const avatar = acc?.avatarUrl || "";
    const badgeLabel = platform === "twitch" ? "Twitch" : "TikTok";
    const message = acc?.lastMessage || (isIdle ? (platform === "tiktok" ? "Añade tu username de TikTok" : "Añade tu canal de Twitch") : "");
    card.innerHTML = `
      <div class="avatarWrap"></div>
      <div class="accountInfo">
        <div class="accountTop">
          <div class="accountName">${escapeHtml(displayName)}</div>
          <div class="accountStatus"><span class="statusDot ${status}"></span><span>${statusText(status)}</span></div>
        </div>
        <div class="accountSub">${escapeHtml(message)}</div>
      </div>
      <div class="accountBadge ${platform}">${badgeLabel}</div>
    `;
    card.querySelector(".avatarWrap").appendChild(
      makeAvatarNode(avatar || fallbackAccountAvatar(platform, displayName), displayName)
    );
    el.accountStrip.appendChild(card);
  });
}

function statusText(status) {
  if (status === "live") return t("status.live");
  if (status === "pending") return t("status.pending");
  if (status === "offline") return t("status.offline");
  if (status === "error") return t("status.error");
  return t("status.idle");
}

function fallbackAccountAvatar(platform, seed = "streamfusion") {
  const letter = platform === "twitch" ? "TW" : "TT";
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${platform === "twitch" ? "#9146ff" : "#ff0050"}"/>
          <stop offset="100%" stop-color="${platform === "twitch" ? "#b57cff" : "#ff7a9b"}"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="64" fill="url(#g)"/>
      <circle cx="128" cy="102" r="48" fill="rgba(255,255,255,.20)"/>
      <path d="M54 218c14-36 47-58 74-58s60 22 74 58" fill="rgba(255,255,255,.20)"/>
      <text x="128" y="154" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="800" fill="#ffffff">${letter}</text>
    </svg>
  `)}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function buildChatBubble(item) {
  const node = document.createElement("div");
  node.className = `bubble ${platformClass(item.platform)} ${state.settings.chat.compactMode ? "compact" : ""}`;
  node.dataset.id = item.id || `${item.timestamp}-${item.username}`;

  const inner = document.createElement("div");
  inner.className = "bubbleInner";

  if (state.settings.chat.showAvatar) {
    const avatar = makeAvatarNode(item.avatarUrl, item.displayName || item.username);
    avatar.classList.add("bubbleAvatar");
    inner.appendChild(avatar);
  }

  const content = document.createElement("div");
  content.className = "bubbleContent";

  const top = document.createElement("div");
  top.className = "bubbleTop";

  const nameWrap = document.createElement("div");
  nameWrap.className = "bubbleName";

  if (state.settings.chat.showPlatform) {
    const pill = document.createElement("span");
    pill.className = `platformPill ${platformClass(item.platform)}`;
    pill.textContent = platformLabel(item.platform);
    nameWrap.appendChild(pill);
  }

  if (state.settings.chat.showUsername) {
    const name = document.createElement("span");
    name.textContent = item.displayName || item.username || "Usuario";
    nameWrap.appendChild(name);
  }

  top.appendChild(nameWrap);

  if (state.settings.chat.showTime) {
    const time = document.createElement("span");
    time.className = "bubbleTime";
    time.textContent = formatTime(item.timestamp);
    top.appendChild(time);
  }

  const message = document.createElement("div");
  message.className = "bubbleMessage";
  message.textContent = item.message || "Mensaje sin texto";

  content.appendChild(top);
  content.appendChild(message);

  if (state.settings.chat.showBadges && Array.isArray(item.badges) && item.badges.length) {
    const meta = document.createElement("div");
    meta.className = "bubbleMeta";
    item.badges.slice(0, 4).forEach((badge) => {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = badge?.title || badge?.name || badge?.type || "badge";
      meta.appendChild(b);
    });
    if (meta.childNodes.length) content.appendChild(meta);
  }

  inner.appendChild(content);
  node.appendChild(inner);

  if (state.settings.chat.bubbleStyle === "glass") {
    node.style.background = "rgba(255,255,255,.06)";
  } else if (state.settings.chat.bubbleStyle === "minimal") {
    node.style.background = "rgba(255,255,255,.03)";
  }

  return node;
}

function buildEventCard(item) {
  const node = document.createElement("div");
  node.className = `eventCard ${platformClass(item.platform)}`;
  node.dataset.id = item.id || `${item.timestamp}-${item.username}`;

  const title = document.createElement("div");
  title.className = "eventTitle";
  title.innerHTML = `<span class="platformPill ${platformClass(item.platform)}">${platformLabel(item.platform)}</span><span>${eventTypeLabel(item.type)}</span>`;

  const desc = document.createElement("div");
  desc.className = "eventDesc";
  desc.textContent = item.message || "Evento";

  const meta = document.createElement("div");
  meta.className = "eventMeta";
  meta.innerHTML = `<span>${item.displayName || item.username || "Usuario"}</span><span>•</span><span>${formatTime(item.timestamp)}</span>`;

  node.appendChild(title);
  node.appendChild(desc);
  node.appendChild(meta);
  return node;
}

function buildGiftCard(item) {
  const node = document.createElement("div");
  node.className = `giftCard ${platformClass(item.platform)}`;
  node.dataset.id = item.id || `${item.timestamp}-${item.username}`;

  const title = document.createElement("div");
  title.className = "giftTitle";
  title.innerHTML = `<span class="platformPill ${platformClass(item.platform)}">${platformLabel(item.platform)}</span><span>${giftTypeLabel(item.type, item.subtype)}</span>`;

  const desc = document.createElement("div");
  desc.className = "giftDesc";
  desc.textContent = item.message || "Gift";

  const meta = document.createElement("div");
  meta.className = "giftMeta";
  meta.innerHTML = `<span>${item.displayName || item.username || "Usuario"}</span><span>•</span><span>${formatTime(item.timestamp)}</span>`;

  node.appendChild(title);
  node.appendChild(desc);
  node.appendChild(meta);
  return node;
}

function eventTypeLabel(type) {
  const map = {
    join: t("events.join"),
    like: t("events.like"),
    follow: t("events.follow"),
    share: t("events.share"),
    system: t("events.system"),
  };
  return map[type] || type || t("events.system");
}

function giftTypeLabel(type, subtype) {
  if (type === "sub") return t("gifts.sub");
  if (type === "bits") return t("gifts.bits");
  if (type === "raid") return t("gifts.raid");
  if (type === "fanclub") return t("gifts.fanclub");
  if (type === "gift") return t("gifts.gift");
  if (type === "envelope") return t("gifts.envelope");
  return subtype || type || t("gifts.gift");
}

function renderList(list, items, builder, filterKey, limit, settingsFn) {
  const keepScroll = isAtBottom(list);
  list.innerHTML = "";
  const filtered = items.filter((item) => shouldShowPlatform(item.platform, state.filters[filterKey]) && settingsFn(item));
  filtered.forEach((item) => list.appendChild(builder(item)));
  if (keepScroll && state.settings.chat.autoScroll !== false) {
    list.scrollTop = list.scrollHeight;
  }
}

function eventAllowed(item) {
  if (item.type === "join") return state.settings.events.showJoin;
  if (item.type === "like") return state.settings.events.showLike;
  if (item.type === "follow") return state.settings.events.showFollow;
  if (item.type === "share") return state.settings.events.showShare;
  if (item.type === "system") return state.settings.events.showSystem;
  return true;
}

function giftAllowed(item) {
  const type = item.type;
  if (type === "gift") return state.settings.gifts.showGift;
  if (type === "fanclub") return state.settings.gifts.showFanClub || state.settings.gifts.showSuperFan;
  if (type === "envelope") return state.settings.gifts.showEnvelope;
  if (type === "sub") return state.settings.gifts.showSub;
  if (type === "bits") return state.settings.gifts.showBits;
  if (type === "raid") return state.settings.gifts.showRaid;
  return true;
}

function chatAllowed(item) {
  return true;
}

function renderVisibleLists() {
  updatePanelVisibility();
  renderAccountStrip();
  renderStatsRail();

  renderList(el.chatList, state.histories.chat, buildChatBubble, "chat", state.settings.chat.maxVisibleMessages || 120, chatAllowed);
  renderList(el.eventList, state.histories.events, buildEventCard, "events", 150, eventAllowed);
  renderList(el.giftList, state.histories.gifts, buildGiftCard, "gifts", 120, giftAllowed);
}

function updatePanelVisibility() {
  const showEvents = !!state.settings.panels.showEvents;
  const showGifts = !!state.settings.panels.showGifts;
  const showStats = !!state.settings.panels.showStats;

  el.statsRail.classList.toggle("hidden", !showStats);
  el.rightColumn.classList.toggle("hidden", !(showEvents || showGifts));
  el.eventPanel.classList.toggle("hidden", !showEvents);
  el.giftPanel.classList.toggle("hidden", !showGifts);
  el.dashboard.classList.toggle("layout-chat-only", !(showEvents || showGifts));

  document.body.style.setProperty("--radius", `${state.settings.appearance.radius || 18}px`);
  document.documentElement.style.setProperty("--accent", accentValue(state.settings.appearance.accent || "cyan"));
  document.documentElement.style.setProperty("--accent2", accentValue(state.settings.appearance.accent || "cyan", true));
  updateViewerPill();
}

function renderStatsRail() {
  if (!state.settings.panels.showStats) {
    el.statsRail.innerHTML = "";
    return;
  }

  const chips = [];
  const showViewer = !!state.settings.events.showViewer;
  if (state.accounts.tiktok || state.stats.tiktok.viewers || state.stats.tiktok.likes || state.stats.tiktok.gifts) {
    if (showViewer) {
      chips.push({ platform: "tiktok", icon: "👁", num: state.stats.tiktok.viewers, label: "" });
    }
    chips.push(
      { platform: "tiktok", icon: "❤️", num: state.stats.tiktok.likes, label: "Likes" },
      { platform: "tiktok", icon: "🎁", num: state.stats.tiktok.gifts, label: "Gifts" },
      { platform: "tiktok", icon: "➕", num: state.stats.tiktok.followers, label: "Follow" },
      { platform: "tiktok", icon: "📤", num: state.stats.tiktok.shares, label: "Share" }
    );
  }
  if (state.accounts.twitch || state.stats.twitch.viewers || state.stats.twitch.subs || state.stats.twitch.bits) {
    if (showViewer) {
      chips.push({ platform: "twitch", icon: "👁", num: state.stats.twitch.viewers, label: "" });
    }
    chips.push(
      { platform: "twitch", icon: "⭐", num: state.stats.twitch.subs, label: "Subs" },
      { platform: "twitch", icon: "💎", num: state.stats.twitch.bits, label: "Bits" },
      { platform: "twitch", icon: "🚀", num: state.stats.twitch.raids, label: "Raids" },
      { platform: "twitch", icon: "➕", num: state.stats.twitch.followers, label: "Follow" }
    );
  }

  el.statsRail.innerHTML = "";
  chips.forEach((chip) => {
    const div = document.createElement("div");
    div.className = "statChip";
    div.dataset.platform = chip.platform;
    div.innerHTML = `
      <span class="eye">${chip.icon}</span>
      <span class="num">${formatCompact(chip.num)}</span>
      ${chip.label ? `<span class="lbl">${chip.label}</span>` : ""}
    `;
    el.statsRail.appendChild(div);
  });
}

function updateViewerPill() {
  if (!el.viewerPill || !el.viewerCount) return;
  const showViewer = !!state.settings.events.showViewer;
  const hasTikTok = Boolean(state.accounts.tiktok?.username || state.accounts.tiktok?.connected || state.stats.tiktok.viewers > 0);
  const visible = showViewer && hasTikTok;

  el.viewerPill.classList.toggle("hidden", !visible);
  el.viewerCount.textContent = formatCompact(state.stats.tiktok.viewers || 0);
}

function formatCompact(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(abs >= 1e13 ? 0 : 1)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
}

function renderAll() {
  applySettingsToUI();
  updateLocaleFromSettings();
  updatePanelVisibility();
  renderAccountStrip();
  renderStatsRail();
  updateViewerPill();
  renderVisibleLists();
}

function openSettings() {
  el.settingsModal.classList.add("modal-open");
}
function closeSettings() {
  el.settingsModal.classList.remove("modal-open");
}
function openOverlay() {
  if (!state.accounts.tiktok && !state.accounts.twitch) {
    showToast(t("toast.login"), "warning");
    return;
  }
  const url = `overlay.html?token=${encodeURIComponent(sessionToken)}&role=overlay`;
  window.open(url, "StreamFusionOverlay", "width=1280,height=720,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no");
  showToast(t("toast.overlay"), "success");
}

function bindUI() {
  el.welcomeConnect.addEventListener("click", () => {
    const tt = el.welcomeTikTok.value.trim();
    const tw = el.welcomeTwitch.value.trim();

    if (!tt && !tw) {
      showToast(state.locale === "en" ? "Enter at least one username." : "Escribe al menos un username.", "warning");
      return;
    }

    setWelcomeVisible(false);

    if (tt) {
      socket.emit("connectTikTok", { token: sessionToken, username: tt });
    }
    if (tw) {
      socket.emit("connectTwitch", { token: sessionToken, username: tw });
    }
  });

  el.welcomeOpenSettings.addEventListener("click", openSettings);
  el.openSettings.addEventListener("click", openSettings);
  el.closeSettings.addEventListener("click", closeSettings);
  el.openOverlay.addEventListener("click", openOverlay);

  el.settingsTabs.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".tab");
    if (!btn) return;
    el.settingsTabs.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(el.tabPages).forEach((page) => page.classList.add("hidden"));
    el.tabPages[btn.dataset.tab].classList.remove("hidden");
  });

  el.saveSettings.addEventListener("click", () => {
    state.settings = collectSettingsFromUI();
    saveSettings(state.settings);
    socket.emit("saveSettings", state.settings);
    updateLocaleFromSettings();
    applySettingsToUI();
    updatePanelVisibility();
    renderAll();
    showToast(t("toast.saved"), "success");
    closeSettings();
  });

  el.resetSettings.addEventListener("click", () => {
    state.settings = structuredClone(DEFAULT_SETTINGS);
    saveSettings(state.settings);
    socket.emit("saveSettings", state.settings);
    updateLocaleFromSettings();
    applySettingsToUI();
    updatePanelVisibility();
    renderAll();
    showToast(t("toast.done"), "success");
  });

  el.languageSelect.addEventListener("change", () => {
    state.locale = el.languageSelect.value;
    applyTranslations();
  });

  [el.themeSelect, el.startMinimized, el.playSounds, el.saveLogs,
    el.chatShowAvatar, el.chatShowUsername, el.chatShowPlatform, el.chatShowTime, el.chatCompactMode, el.chatBubbleStyle, el.chatMaxMessages, el.chatAutoScroll, el.chatShowBadges,
    el.eventShowJoin, el.eventShowLike, el.eventShowFollow, el.eventShowShare, el.eventShowSystem, el.eventShowViewer,
    el.giftShowGift, el.giftShowFanClub, el.giftShowSuperFan, el.giftShowEnvelope, el.giftShowSub, el.giftShowBits, el.giftShowRaid,
    el.panelShowStats, el.panelShowEvents, el.panelShowGifts, el.radiusSelect, el.accentSelect
  ].forEach((node) => node.addEventListener("change", () => {
    state.settings = collectSettingsFromUI();
    saveSettings(state.settings);
    updateLocaleFromSettings();
    applySettingsToUI();
    updatePanelVisibility();
    renderVisibleLists();
  }));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
  });

  el.settingsModal.addEventListener("click", (e) => {
    if (e.target === el.settingsModal) closeSettings();
  });
}

function bindSocket() {
  socket.on("connect", () => {
    socket.emit("registerSession", { token: sessionToken, role: "main" });
  });

  socket.on("sessionState", (snapshot) => {
    if (snapshot?.settings) {
      state.settings = mergeDeep(structuredClone(DEFAULT_SETTINGS), mergeDeep(state.settings, snapshot.settings));
      saveSettings(state.settings);
    }
    if (snapshot?.accounts) state.accounts = snapshot.accounts;
    if (snapshot?.stats) state.stats = snapshot.stats;
    if (snapshot?.history) {
      state.histories.chat = Array.isArray(snapshot.history.chat) ? snapshot.history.chat : [];
      state.histories.events = Array.isArray(snapshot.history.events) ? snapshot.history.events : [];
      state.histories.gifts = Array.isArray(snapshot.history.gifts) ? snapshot.history.gifts : [];
    }

    applyTranslations();
    applySettingsToUI();
    updatePanelVisibility();
    renderAll();

    if (hasAnyConfiguredAccount()) {
      setWelcomeVisible(false);
    }
  });

  socket.on("settings", (settings) => {
    if (!settings) return;
    state.settings = mergeDeep(structuredClone(DEFAULT_SETTINGS), mergeDeep(state.settings, settings));
    saveSettings(state.settings);
    applyTranslations();
    applySettingsToUI();
    updatePanelVisibility();
    renderAll();
    updateViewerPill();
  });

  socket.on("accountUpdate", (account) => {
    if (!account || !account.platform) return;
    state.accounts[account.platform] = account;
    renderAccountStrip();
    if (hasAnyConfiguredAccount()) setWelcomeVisible(false);
  });

  socket.on("stats", (stats) => {
    if (!stats) return;
    state.stats = {
      tiktok: { ...state.stats.tiktok, ...(stats.tiktok || {}) },
      twitch: { ...state.stats.twitch, ...(stats.twitch || {}) },
    };
    renderStatsRail();
    updateViewerPill();
  });

  socket.on("chat", (payload) => {
    const item = normalizeMessage(payload);
    addHistory("chat", item, state.settings.chat.maxVisibleMessages || 120);
    if (shouldShowPlatform(item.platform, state.filters.chat) && chatAllowed(item)) {
      const keepScroll = isAtBottom(el.chatList);
      const node = buildChatBubble(item);
      el.chatList.appendChild(node);
      while (el.chatList.children.length > (state.settings.chat.maxVisibleMessages || 120)) {
        el.chatList.removeChild(el.chatList.firstChild);
      }
      if (keepScroll && state.settings.chat.autoScroll) el.chatList.scrollTop = el.chatList.scrollHeight;
    }
  });

  socket.on("event", (payload) => {
    const item = normalizeMessage(payload);
    addHistory("events", item, 150);
    if (shouldShowPlatform(item.platform, state.filters.events) && eventAllowed(item)) {
      const keepScroll = isAtBottom(el.eventList);
      const node = buildEventCard(item);
      el.eventList.appendChild(node);
      while (el.eventList.children.length > 150) {
        el.eventList.removeChild(el.eventList.firstChild);
      }
      if (keepScroll) el.eventList.scrollTop = el.eventList.scrollHeight;
    }
  });

  socket.on("gift", (payload) => {
    const item = normalizeMessage(payload);
    addHistory("gifts", item, 120);
    if (shouldShowPlatform(item.platform, state.filters.gifts) && giftAllowed(item)) {
      const keepScroll = isAtBottom(el.giftList);
      const node = buildGiftCard(item);
      el.giftList.appendChild(node);
      while (el.giftList.children.length > 120) {
        el.giftList.removeChild(el.giftList.firstChild);
      }
      if (keepScroll) el.giftList.scrollTop = el.giftList.scrollHeight;
    }
  });

  socket.on("toast", (payload) => {
    const msg = payload?.message || "";
    const variant = payload?.variant || "info";
    showToast(msg, variant);
  });
}

function hasAnyConfiguredAccount() {
  return Boolean((state.accounts.tiktok && state.accounts.tiktok.username) || (state.accounts.twitch && state.accounts.twitch.username));
}

function initialize() {
  bindUI();
  bindSocket();
  state.locale = state.settings.general.language || "es";
  applyTranslations();
  applySettingsToUI();
  updatePanelVisibility();
  renderAll();
  socket.emit("requestSnapshot");
  if (!hasAnyConfiguredAccount()) {
    setWelcomeVisible(true);
  } else {
    setWelcomeVisible(false);
  }
}

initialize();

