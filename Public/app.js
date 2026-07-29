const socket = io();

const $ = (id) => document.getElementById(id);
const ESC = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const SETTINGS_KEY = "streamfusion.ui.settings.v1";
const SESSION_KEY = "streamfusion.ui.session.v1";
const AVATAR = (seed) => `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(seed || "StreamFusion")}`;

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
  panelEventsVisible: $("panelEventsVisible"),
  panelGiftsVisible: $("panelGiftsVisible"),
  chatVisible: $("chatVisible"),
  overlayChatOnly: $("overlayChatOnly"),
  panelOrder: $("panelOrder"),
  generateOverlayBtn: $("generateOverlayBtn"),
  overlayModal: $("overlayModal"),
  closeOverlayBtn: $("closeOverlayBtn"),
  cancelOverlayBtn: $("cancelOverlayBtn"),
  confirmOverlayBtn: $("confirmOverlayBtn"),
  toastWrap: $("toastWrap"),
  eventsCard: $("eventsCard"),
  giftsCard: $("giftsCard"),
};

const defaults = {
  panels: { events: true, gifts: true, chat: true },
  overlay: { chatOnly: true },
  order: "events-gifts",
  filters: { chat: "all", event: "all", gift: "all" },
  show: {
    likes: true,
    follows: true,
    shares: true,
    joins: true,
    system: true,
    gifts: true,
    subs: true,
    bits: true,
    raids: true,
  },
};

const state = {
  settings: loadJSON(SETTINGS_KEY, defaults),
  session: loadJSON(SESSION_KEY, {
    tiktok: { username: "", connected: false },
    twitch: { username: "", connected: false },
  }),
  chat: [],
  events: [],
  gifts: [],
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return mergeDeep(structuredClone(fallback), JSON.parse(raw));
  } catch {
    return structuredClone(fallback);
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function mergeDeep(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const out = { ...base };
  for (const key of Object.keys(incoming)) out[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
  return out;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/^@+/g, "")
    .replace(/^#/g, "")
    .split(/[/?#]/)[0]
    .trim();
}

function timeLabel(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function toast(title, body = "", kind = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${kind === "err" ? "err" : "ok"}`;
  el.innerHTML = `<div class="t">${ESC(title)}</div>${body ? `<div class="b">${ESC(body)}</div>` : ""}`;
  els.toastWrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function avatarFor(username, platform) {
  const seed = `${platform || "user"}-${username || "guest"}`;
  return AVATAR(seed);
}

function setSession(platform, username, connected) {
  state.session[platform] = {
    username: username || state.session[platform].username || "",
    connected: Boolean(connected),
  };
  saveJSON(SESSION_KEY, state.session);
  renderTopbar();
  renderConnectionControls();
}

function renderTopbar() {
  const tiktok = state.session.tiktok;
  const twitch = state.session.twitch;

  els.tiktokName.textContent = tiktok.username ? `@${tiktok.username}` : "Sin conectar";
  els.twitchName.textContent = twitch.username ? twitch.username : "Sin conectar";

  els.tiktokDot.classList.toggle("online", tiktok.connected);
  els.tiktokDot.classList.toggle("offline", !tiktok.connected);
  els.twitchDot.classList.toggle("online", twitch.connected);
  els.twitchDot.classList.toggle("offline", !twitch.connected);

  els.tiktokAvatar.src = avatarFor(tiktok.username || "tiktok", "tiktok");
  els.twitchAvatar.src = avatarFor(twitch.username || "twitch", "twitch");

  els.tiktokState.textContent = tiktok.connected
    ? `Conectado${tiktok.username ? ` @${tiktok.username}` : ""}`
    : tiktok.username
      ? "Guardado, listo para reconectar"
      : "Listo para agregar cuenta";

  els.twitchState.textContent = twitch.connected
    ? `Conectado${twitch.username ? ` ${twitch.username}` : ""}`
    : twitch.username
      ? "Guardado, listo para reconectar"
      : "Listo para agregar cuenta";

  els.manageTikTokBtn.textContent = tiktok.username ? "Cambiar" : "Agregar";
  els.manageTwitchBtn.textContent = twitch.username ? "Cambiar" : "Agregar";
  els.disconnectTikTokBtn.classList.toggle("hidden", !tiktok.connected);
  els.disconnectTwitchBtn.classList.toggle("hidden", !twitch.connected);
}

function renderConnectionControls() {
  const anyConnected = Boolean(state.session.tiktok.connected || state.session.twitch.connected);
  if (!anyConnected) {
    els.dashboard.style.opacity = "1";
  }
}

function itemAvatar(item) {
  const platform = item.platform || "user";
  const name = item.displayName || item.username || item.user || "Usuario";
  return avatarFor(name, platform);
}

function commonTag(platform) {
  return `<span class="platformTag ${platform}">${platform === "tiktok" ? "TikTok" : "Twitch"}</span>`;
}

function renderChat() {
  const filter = els.chatFilter.value;
  const rows = state.chat.filter((it) => filter === "all" || it.platform === filter);
  els.chatList.innerHTML = rows.length ? rows.map((item) => {
    const badges = Array.isArray(item.badges) ? item.badges.filter(Boolean).map((b) => `<span class="badge">${ESC(b)}</span>`).join("") : "";
    return `
      <article class="message">
        <img class="avatar" src="${ESC(item.avatar || itemAvatar(item))}" alt="avatar" />
        <div class="content">
          <div class="rowTop">
            <span class="user">${ESC(item.displayName || item.user || "Usuario")}</span>
            ${commonTag(item.platform)}
            <span class="timeTag">${timeLabel(item.timestamp)}</span>
          </div>
          <div class="text">${ESC(item.message || "")}</div>
          <div class="meta">${badges}</div>
        </div>
      </article>`;
  }).join("") : `<div class="emptyState"><strong>Sin chat aún</strong><span>Cuando entren mensajes aparecerán aquí.</span></div>`;
}

function typeAllowed(item) {
  const type = String(item.type || "system").toLowerCase();
  const text = String(item.message || "").toLowerCase();
  if (item.group === "gift") return true;
  if (type === "like") return els.showLikes.checked;
  if (type === "follow") return els.showFollows.checked;
  if (type === "share") return els.showShares.checked;
  if (type === "join" || type === "member" || text.includes("entr") || text.includes("joined") || text.includes("se unió")) return els.showJoins.checked;
  if (type === "system") return els.showSystem.checked;
  return true;
}

function giftAllowed(item) {
  const type = String(item.type || "gift").toLowerCase();
  if (type === "gift" || type === "envelope" || type === "fanclub") return els.showGifts.checked;
  if (type === "sub" || type === "subscription" || type === "resub") return els.showSubs.checked;
  if (type === "bits") return els.showBits.checked;
  if (type === "raid") return els.showRaids.checked;
  return true;
}

function renderEventPanels() {
  const filter = els.eventFilter.value;
  const giftFilter = els.giftFilter.value;
  const events = state.events.filter((it) => (filter === "all" || it.platform === filter) && typeAllowed(it));
  const gifts = state.gifts.filter((it) => (giftFilter === "all" || it.platform === giftFilter) && giftAllowed(it));

  els.eventList.innerHTML = events.length ? events.map((item) => `
    <article class="eventItem ${item.type === "system" ? "systemLine" : ""}">
      <img class="avatar" src="${ESC(item.avatar || itemAvatar(item))}" alt="avatar" />
      <div class="content">
        <div class="rowTop">
          <span class="user">${ESC(item.displayName || item.user || "Usuario")}</span>
          ${commonTag(item.platform)}
          <span class="kindTag">${ESC(item.type || "evento")}</span>
          <span class="timeTag">${timeLabel(item.timestamp)}</span>
        </div>
        <div class="text">${ESC(item.message || "")}</div>
      </div>
    </article>`).join("") : `<div class="emptyState"><strong>Sin eventos</strong><span>Aquí aparecerán likes, follows y uniones.</span></div>`;

  els.giftList.innerHTML = gifts.length ? gifts.map((item) => `
    <article class="giftItem">
      <img class="avatar" src="${ESC(item.avatar || itemAvatar(item))}" alt="avatar" />
      <div class="content">
        <div class="rowTop">
          <span class="user">${ESC(item.displayName || item.user || "Usuario")}</span>
          ${commonTag(item.platform)}
          <span class="kindTag">${ESC(item.type || "gift")}</span>
          <span class="timeTag">${timeLabel(item.timestamp)}</span>
        </div>
        <div class="text">${ESC(item.message || "")}</div>
      </div>
    </article>`).join("") : `<div class="emptyState"><strong>Sin regalos</strong><span>Subs, bits y gifts aparecerán aquí.</span></div>`;
}

function applyLayout() {
  const eventsVisible = els.panelEventsVisible.checked;
  const giftsVisible = els.panelGiftsVisible.checked;
  const chatVisible = els.chatVisible.checked;

  els.chatList.closest(".panel").style.display = chatVisible ? "flex" : "none";
  els.eventsCard.style.display = eventsVisible ? "flex" : "none";
  els.giftsCard.style.display = giftsVisible ? "flex" : "none";

  const order = els.panelOrder.value;
  if (order === "gifts-events") {
    els.giftsCard.style.order = 1;
    els.eventsCard.style.order = 2;
  } else {
    els.eventsCard.style.order = 1;
    els.giftsCard.style.order = 2;
  }
}

function persistSettings() {
  state.settings.panels.events = els.panelEventsVisible.checked;
  state.settings.panels.gifts = els.panelGiftsVisible.checked;
  state.settings.panels.chat = els.chatVisible.checked;
  state.settings.overlay.chatOnly = els.overlayChatOnly.checked;
  state.settings.order = els.panelOrder.value;
  state.settings.show.likes = els.showLikes.checked;
  state.settings.show.follows = els.showFollows.checked;
  state.settings.show.shares = els.showShares.checked;
  state.settings.show.joins = els.showJoins.checked;
  state.settings.show.system = els.showSystem.checked;
  state.settings.show.gifts = els.showGifts.checked;
  state.settings.show.subs = els.showSubs.checked;
  state.settings.show.bits = els.showBits.checked;
  state.settings.show.raids = els.showRaids.checked;
  saveJSON(SETTINGS_KEY, state.settings);
  socket.emit("saveSettings", state.settings);
}

function loadSettingsToUI() {
  const s = state.settings;
  els.panelEventsVisible.checked = s.panels?.events !== false;
  els.panelGiftsVisible.checked = s.panels?.gifts !== false;
  els.chatVisible.checked = s.panels?.chat !== false;
  els.overlayChatOnly.checked = s.overlay?.chatOnly !== false;
  els.panelOrder.value = s.order || "events-gifts";
  els.showLikes.checked = s.show?.likes !== false;
  els.showFollows.checked = s.show?.follows !== false;
  els.showShares.checked = s.show?.shares !== false;
  els.showJoins.checked = s.show?.joins !== false;
  els.showSystem.checked = s.show?.system !== false;
  els.showGifts.checked = s.show?.gifts !== false;
  els.showSubs.checked = s.show?.subs !== false;
  els.showBits.checked = s.show?.bits !== false;
  els.showRaids.checked = s.show?.raids !== false;
}

function openModal(modal) { modal.classList.add("show"); modal.setAttribute("aria-hidden", "false"); }
function closeModal(modal) { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); }

function openConnectModal(focus = "both", closable = true) {
  if (state.session.tiktok.username) els.tiktokUser.value = state.session.tiktok.username;
  if (state.session.twitch.username) els.twitchUser.value = state.session.twitch.username;

  els.closeConnectBtn.classList.toggle("hidden", !closable);
  openModal(els.connectModal);

  const focusTarget = focus === "tiktok"
    ? els.tiktokUser
    : focus === "twitch"
      ? els.twitchUser
      : els.connectBothBtn;

  window.setTimeout(() => focusTarget?.focus?.(), 50);
}

function pushChat(data) {
  const item = {
    ...data,
    avatar: data.avatar || avatarFor(data.displayName || data.user || "Usuario", data.platform),
    timestamp: data.timestamp || Date.now(),
  };
  state.chat.unshift(item);
  state.chat = state.chat.slice(0, 200);
  renderChat();
}

function pushEvent(data, group = "event") {
  const item = {
    ...data,
    group,
    avatar: data.avatar || avatarFor(data.displayName || data.user || "Usuario", data.platform),
    timestamp: data.timestamp || Date.now(),
  };
  state.events.unshift(item);
  state.events = state.events.slice(0, 220);
  renderEventPanels();
}

function pushGift(data) {
  const item = {
    ...data,
    group: "gift",
    avatar: data.avatar || avatarFor(data.displayName || data.user || "Usuario", data.platform),
    timestamp: data.timestamp || Date.now(),
  };
  state.gifts.unshift(item);
  state.gifts = state.gifts.slice(0, 180);
  renderEventPanels();
}

function connectTikTok() {
  const username = normalizeUsername(els.tiktokUser.value);
  if (!username) return toast("Escribe un username de TikTok.", "", "err");
  socket.emit("connectTikTok", username);
  setSession("tiktok", username, true);
  els.tiktokUser.value = username;
  toast("TikTok conectado", `@${username}`);
}

function connectTwitch() {
  const username = normalizeUsername(els.twitchUser.value);
  if (!username) return toast("Escribe un canal de Twitch.", "", "err");
  socket.emit("connectTwitch", username);
  setSession("twitch", username, true);
  els.twitchUser.value = username;
  toast("Twitch conectado", username);
}

function disconnectPlatform(platform) {
  const current = state.session[platform]?.username || "";
  if (platform === "tiktok") {
    socket.emit("disconnectTikTok");
  } else {
    socket.emit("disconnectTwitch");
  }
  setSession(platform, current, false);
  toast(`${platform === "tiktok" ? "TikTok" : "Twitch"} desconectado`, current ? `@${current}` : "");
}

function openOverlay() {
  if (els.overlayChatOnly.checked === false) {
    toast("El overlay de chat está desactivado en ajustes.", "", "err");
    return;
  }
  localStorage.setItem("streamfusion.overlay.chatOnly", JSON.stringify(true));
  window.open("overlay.html", "StreamFusionOverlay", "width=1280,height=720,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no");
  toast("Overlay abierto", "Ventana de chat lista.");
}

function syncSettingsFromUI() {
  persistSettings();
  applyLayout();
  renderChat();
  renderEventPanels();
}

function maybeAutoReconnect() {
  if (state.session.tiktok.connected && state.session.tiktok.username) {
    socket.emit("connectTikTok", state.session.tiktok.username);
  }
  if (state.session.twitch.connected && state.session.twitch.username) {
    socket.emit("connectTwitch", state.session.twitch.username);
  }
}

function bootstrap() {
  loadSettingsToUI();
  applyLayout();
  renderTopbar();
  renderChat();
  renderEventPanels();

  if (state.session.tiktok.username) els.tiktokUser.value = state.session.tiktok.username;
  if (state.session.twitch.username) els.twitchUser.value = state.session.twitch.username;

  const shouldOpenConnect = !state.session.tiktok.username && !state.session.twitch.username;
  openModal(els.connectModal);
  els.closeConnectBtn.classList.toggle("hidden", shouldOpenConnect);
  els.connectModal.dataset.locked = shouldOpenConnect ? "1" : "0";
  if (shouldOpenConnect) {
    window.setTimeout(() => els.tiktokUser.focus(), 50);
  } else {
    closeModal(els.connectModal);
  }

  maybeAutoReconnect();

  els.connectTikTokBtn.addEventListener("click", connectTikTok);
  els.connectTwitchBtn.addEventListener("click", connectTwitch);
  els.connectBothBtn.addEventListener("click", () => {
    const tiktok = normalizeUsername(els.tiktokUser.value);
    const twitch = normalizeUsername(els.twitchUser.value);
    if (!tiktok && !twitch) return toast("Escribe al menos un username.", "", "err");
    if (tiktok) {
      socket.emit("connectTikTok", tiktok);
      setSession("tiktok", tiktok, true);
    }
    if (twitch) {
      socket.emit("connectTwitch", twitch);
      setSession("twitch", twitch, true);
    }
    if (tiktok) els.tiktokUser.value = tiktok;
    if (twitch) els.twitchUser.value = twitch;
    closeModal(els.connectModal);
    toast("Cuentas conectadas", "Los cambios quedaron en el top bar.");
  });

  els.closeConnectBtn.addEventListener("click", () => {
    if (els.connectModal.dataset.locked === "1") return;
    closeModal(els.connectModal);
  });

  els.openConnectBtn.addEventListener("click", () => openConnectModal("both", true));
  els.manageTikTokBtn.addEventListener("click", () => openConnectModal("tiktok", true));
  els.manageTwitchBtn.addEventListener("click", () => openConnectModal("twitch", true));
  els.disconnectTikTokBtn.addEventListener("click", () => disconnectPlatform("tiktok"));
  els.disconnectTwitchBtn.addEventListener("click", () => disconnectPlatform("twitch"));

  els.tiktokUser.addEventListener("keydown", (e) => { if (e.key === "Enter") connectTikTok(); });
  els.twitchUser.addEventListener("keydown", (e) => { if (e.key === "Enter") connectTwitch(); });

  els.chatFilter.addEventListener("change", renderChat);
  els.eventFilter.addEventListener("change", renderEventPanels);
  els.giftFilter.addEventListener("change", renderEventPanels);

  [els.showLikes, els.showFollows, els.showShares, els.showJoins, els.showSystem, els.showGifts, els.showSubs, els.showBits, els.showRaids]
    .forEach((el) => el.addEventListener("change", syncSettingsFromUI));

  [els.panelEventsVisible, els.panelGiftsVisible, els.chatVisible, els.overlayChatOnly, els.panelOrder]
    .forEach((el) => el.addEventListener("change", syncSettingsFromUI));

  els.openSettingsBtn.addEventListener("click", () => openModal(els.settingsModal));
  els.closeSettingsBtn.addEventListener("click", () => closeModal(els.settingsModal));
  els.saveSettingsBtn.addEventListener("click", () => { syncSettingsFromUI(); closeModal(els.settingsModal); toast("Ajustes guardados.", "Paneles actualizados."); });
  els.resetSettingsBtn.addEventListener("click", () => {
    state.settings = structuredClone(defaults);
    saveJSON(SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    applyLayout();
    renderEventPanels();
    toast("Ajustes restaurados.", "", "ok");
  });

  els.generateOverlayBtn.addEventListener("click", () => openModal(els.overlayModal));
  els.closeOverlayBtn.addEventListener("click", () => closeModal(els.overlayModal));
  els.cancelOverlayBtn.addEventListener("click", () => closeModal(els.overlayModal));
  els.confirmOverlayBtn.addEventListener("click", () => { closeModal(els.overlayModal); openOverlay(); });

  els.settingsModal.addEventListener("click", (ev) => { if (ev.target === els.settingsModal) closeModal(els.settingsModal); });
  els.overlayModal.addEventListener("click", (ev) => { if (ev.target === els.overlayModal) closeModal(els.overlayModal); });
  els.connectModal.addEventListener("click", (ev) => {
    if (ev.target === els.connectModal && els.connectModal.dataset.locked !== "1") closeModal(els.connectModal);
  });

  socket.on("connect", () => toast("Socket conectado", "StreamFusion listo."));
  socket.on("disconnect", () => toast("Socket desconectado", "", "err"));
  socket.on("settings", (settings) => {
    if (!settings) return;
    state.settings = mergeDeep(structuredClone(defaults), settings);
    saveJSON(SETTINGS_KEY, state.settings);
    loadSettingsToUI();
    applyLayout();
    renderEventPanels();
  });

  socket.on("system", (data) => {
    pushEvent({ platform: data?.platform || "tiktok", type: data?.type || "system", user: "Sistema", displayName: "Sistema", message: data?.message || "Evento del sistema" }, "event");
    toast("Sistema", data?.message || "", "ok");
  });

  socket.on("chat", (data) => {
    const platform = data?.platform || "tiktok";
    const username = data?.displayName || data?.user || data?.uniqueId || "Usuario";
    pushChat({
      platform,
      type: data?.type || "chat",
      user: data?.user || username,
      displayName: username,
      message: data?.message || "",
      badges: data?.badges || [],
      timestamp: data?.timestamp || Date.now(),
    });
  });

  socket.on("event", (data) => {
    const platform = data?.platform || "tiktok";
    const type = String(data?.type || "system").toLowerCase();
    const action = String(data?.action || "").toLowerCase();
    const message = String(data?.message || "").toLowerCase();

    if (platform === "tiktok" && (action === "espectadores" || message.includes("espectadores") || message.includes("viewer count"))) {
      return;
    }

    const item = {
      platform,
      type,
      user: data?.user || data?.displayName || "Usuario",
      displayName: data?.displayName || data?.user || "Usuario",
      message: data?.message || "",
      timestamp: data?.timestamp || Date.now(),
    };
    if (item.type === "gift" || item.type === "sub" || item.type === "bits" || item.type === "raid" || item.type === "fanclub" || item.type === "envelope") {
      pushGift(item);
    } else {
      pushEvent(item, "event");
    }
  });

  socket.on("stats", () => {});

  if (!state.session.tiktok.connected && !state.session.twitch.connected) {
    toast("Conecta TikTok y/o Twitch para comenzar.", "");
  }
}

bootstrap();

