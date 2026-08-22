const rouletteParams = new URLSearchParams(location.search);
const rouletteOverlayKey = rouletteParams.get("overlayKey") || "";
const isEmbedPreview = rouletteParams.get("embed") === "1";
const socket = isEmbedPreview ? null : io({ auth: { overlayKey: rouletteOverlayKey }, transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity });
document.body.classList.toggle('embed-preview', isEmbedPreview);

const STORAGE_KEY = "streamfusion.roulette.local.v1";
const PREVIEW_SPIN_DURATION_MS = 7600;
const PREVIEW_SPIN_SETTLE_MS = 420;
const BARAJA_SPIN_CYCLES = 15;
const DEFAULTS = {
  config: {
    enabled: true,
    mode: "baraja",
    platforms: { tiktok: true, twitch: true },
    audience: "all",
    participation: {
      triggerMode: "text",
      triggerText: "1",
      allowMultiple: false,
      maxEntriesPerUser: 1,
      spamCooldownMs: 2400,
    },
    winnerComment: { enabled: true, voiceBotLinked: false, waitSeconds: 30 },
    auto: { enabled: false, startWaitSeconds: 60, restartWaitSeconds: 180 },
    theme: {
      preset: "midnight",
      accent: "#9b5cff",
      accent2: "#22d3ee",
      accent3: "#f472b6",
      frame: "glass",
      frameColor1: "#9b5cff",
      frameColor2: "#22d3ee",
      frameColor3: "#f472b6",
      showGrid: false,
      cardTheme: "midnight",
    },
  },
  state: { status: "idle", participants: [], winner: null, waitingComment: null, auto: { phase: "idle", startedAt: 0, expiresAt: 0, waitSeconds: 0, label: "" }, spin: null, lastSpinAt: 0, history: [] },
};

// Shared immutable shape used by the local preview/reset path.
const DEFAULT_STATE = safeClone(DEFAULTS.state);

const PRESETS = [
  { id: "crystal", name: "Crystal", desc: "Hielo brillante", accent: "#74c0fc", accent2: "#e7f5ff", accent3: "#c5f6fa" },
  { id: "neon", name: "Neon", desc: "Glow moderno", accent: "#9b5cff", accent2: "#22d3ee", accent3: "#f472b6" },
  { id: "gold", name: "Gold", desc: "Sorteo premium", accent: "#d8b35a", accent2: "#f8e3a1", accent3: "#fff4c7" },
  { id: "galaxy", name: "Galaxy", desc: "Cósmico y oscuro", accent: "#8b5cf6", accent2: "#38bdf8", accent3: "#ec4899" },
  { id: "fire", name: "Fire", desc: "Energía intensa", accent: "#ef4444", accent2: "#f97316", accent3: "#facc15" },
  { id: "ocean", name: "Ocean", desc: "Azul limpio", accent: "#38bdf8", accent2: "#22d3ee", accent3: "#60a5fa" },
  { id: "emerald", name: "Emerald", desc: "Verde vibrante", accent: "#10b981", accent2: "#34d399", accent3: "#a7f3d0" },
  { id: "candy", name: "Candy", desc: "Colorido suave", accent: "#f472b6", accent2: "#a78bfa", accent3: "#67e8f9" },
  { id: "midnight", name: "Midnight", desc: "Oscuro profesional", accent: "#64748b", accent2: "#22d3ee", accent3: "#9b5cff" },
];

const CARD_PRESETS = [
  { id: "midnight", name: "Midnight", desc: "Negro elegante", bg1: "#111827", bg2: "#0b1020", bg3: "#1f2937", border: "rgba(255,255,255,.10)", text: "#f8fafc" },
  { id: "royal", name: "Royal", desc: "Azul premium", bg1: "#1d4ed8", bg2: "#0f172a", bg3: "#312e81", border: "rgba(147,197,253,.22)", text: "#eff6ff" },
  { id: "sunset", name: "Sunset", desc: "Rojo y dorado", bg1: "#ef4444", bg2: "#f97316", bg3: "#7c2d12", border: "rgba(253,186,116,.24)", text: "#fff7ed" },
  { id: "ocean", name: "Ocean", desc: "Azul marino", bg1: "#0ea5e9", bg2: "#075985", bg3: "#0f172a", border: "rgba(125,211,252,.24)", text: "#ecfeff" },
  { id: "emerald", name: "Emerald", desc: "Verde intenso", bg1: "#10b981", bg2: "#064e3b", bg3: "#052e16", border: "rgba(167,243,208,.24)", text: "#ecfdf5" },
  { id: "candy", name: "Candy", desc: "Rosa y violeta", bg1: "#ec4899", bg2: "#8b5cf6", bg3: "#312e81", border: "rgba(244,114,182,.24)", text: "#fff1f2" },
  { id: "gold", name: "Gold", desc: "Premium brillante", bg1: "#d8b35a", bg2: "#8a6a2f", bg3: "#3f2d14", border: "rgba(255,243,205,.32)", text: "#fff9e8" },
  { id: "neon", name: "Neon", desc: "Fuerte y moderno", bg1: "#9b5cff", bg2: "#22d3ee", bg3: "#0f172a", border: "rgba(192,132,252,.22)", text: "#f8f7ff" },
];

const THEME_PRESET_MAP = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
const THEME_PRESET_ORDER = PRESETS.map((p) => p.id);

const els = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  center: document.getElementById("center"),
  playBtn: document.getElementById("playBtn"),
  stopBtn: document.getElementById("stopBtn"),
  participantsBtn: document.getElementById("participantsBtn"),
  winnersBtn: document.getElementById("winnersBtn"),
  themeBtn: document.getElementById("themeBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  participantsDrawer: document.getElementById("participantsDrawer"),
  participantsList: document.getElementById("participantsList"),
  closeParticipantsBtn: document.getElementById("closeParticipantsBtn"),
  winnersModal: document.getElementById("winnersModal"),
  winnersList: document.getElementById("winnersList"),
  rulesList: document.getElementById("rulesList"),
  closeWinnersBtn: document.getElementById("closeWinnersBtn"),
  themeModal: document.getElementById("themeModal"),
  closeThemeBtn: document.getElementById("closeThemeBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  cardThemeScroller: document.getElementById("cardThemeScroller"),
  classicThemeScroller: document.getElementById("classicThemeScroller"),
  deckThemeSection: document.getElementById("deckThemeSection"),
  classicThemeSection: document.getElementById("classicThemeSection"),
  accentColor: document.getElementById("accentColor"),
  accent2Color: document.getElementById("accent2Color"),
  accent3Color: document.getElementById("accent3Color"),
  frameColor1: document.getElementById("frameColor1"),
  frameColor2: document.getElementById("frameColor2"),
  frameColor3: document.getElementById("frameColor3"),
  localBackground: document.getElementById("localBackground"),
  frameStyle: document.getElementById("frameStyle"),
  audienceSwitches: document.getElementById("audienceSwitches"),
  platformSwitches: document.getElementById("platformSwitches"),
  entryMode: document.getElementById("entryMode"),
  commentMode: document.getElementById("commentMode"),
  commentText: document.getElementById("commentText"),
  commentConfig: document.getElementById("commentConfig"),
  commentTextField: document.getElementById("commentTextField"),
  commentRulePanel: document.getElementById("commentRulePanel"),
  commentRuleHint: document.getElementById("commentRuleHint"),
  applyCommentRule: document.getElementById("applyCommentRule"),
  allowMultiple: document.getElementById("allowMultiple"),
  maxEntries: document.getElementById("maxEntries"),
  spamCooldown: document.getElementById("spamCooldown"),
  winnerCommentEnabled: document.getElementById("winnerCommentEnabled"),
  winnerCommentLinked: document.getElementById("winnerCommentLinked"),
  winnerCommentSeconds: document.getElementById("winnerCommentSeconds"),
  autoEnabled: document.getElementById("autoEnabled"),
  autoConfig: document.getElementById("autoConfig"),
  autoStartSeconds: document.getElementById("autoStartSeconds"),
  autoRestartSeconds: document.getElementById("autoRestartSeconds"),
  statusSummary: document.getElementById("statusSummary"),
  startBtn: document.getElementById("startBtn"),
  stopBtnModal: document.getElementById("stopBtnModal"),
  clearBtn: document.getElementById("clearBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

let snapshot = safeClone(DEFAULTS);
let accountState = { tiktok: { connected: false, live: false }, twitch: { connected: false, live: false } };
let sharedVoiceUsers = [];
let activeVoicePanel = "winners";
let ui = loadLocalState();
let previewSpinTimer = null;
let previewSpinRequest = 0;
let previewMessageHandlerBound = false;
let activeSettingsTab = "logic";
let countdownTimer = null;
let renderTimer = null;

function safeClone(value) {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value ?? null)); }
}
function mergeDeep(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const out = { ...base };
  for (const key of Object.keys(incoming)) out[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
  return out;
}
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function normalizeText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function normalizeKey(value) { return normalizeText(value).toLowerCase(); }
function loadLocalState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? mergeDeep({ bg: "transparent", activeTab: "logic", themePreset: "midnight" }, JSON.parse(raw)) : { bg: "transparent", activeTab: "logic", themePreset: "midnight" };
  } catch {
    return { bg: "transparent", activeTab: "logic", themePreset: "midnight" };
  }
}
function saveLocalState() {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ui)); } catch {}
}
function applyLocalBackground(mode) {
  const safe = ["transparent", "green", "dark", "midnight", "soft-dark", "light"].includes(mode) ? mode : "transparent";
  ui.bg = safe;
  document.body.dataset.bg = safe;
  saveLocalState();
}
function ensureThemePreset(name) {
  const preset = THEME_PRESET_MAP[name] || THEME_PRESET_MAP.midnight;
  return preset;
}
function pushSnapshot(next) {
  snapshot = mergeDeep(safeClone(DEFAULTS), next || {});
  applyThemeVars();
  syncForm();
  renderAll();
}
function currentTheme() {
  return snapshot.config.theme || DEFAULTS.config.theme;
}
function ensureCardPreset(name) {
  return CARD_PRESETS.find((preset) => preset.id === String(name || "").toLowerCase()) || CARD_PRESETS[0];
}
function applyThemeVars() {
  const theme = currentTheme();
  const preset = ensureThemePreset(theme.preset || ui.themePreset || "midnight");
  const cardPreset = ensureCardPreset(theme.cardTheme || "midnight");
  const accent = theme.accent || preset.accent;
  const accent2 = theme.accent2 || preset.accent2;
  const accent3 = theme.accent3 || preset.accent3;
  document.documentElement.style.setProperty("--rf-accent", accent);
  document.documentElement.style.setProperty("--rf-accent-2", accent2);
  document.documentElement.style.setProperty("--rf-accent-3", accent3);
  document.documentElement.style.setProperty("--rf-gold", preset.id === "gold" ? "#d8b35a" : "#d8b35a");
  document.documentElement.style.setProperty("--rf-gold-2", preset.id === "gold" ? "#fff1bf" : "#f8e3a1");
  document.documentElement.style.setProperty("--rf-card-bg-1", cardPreset.bg1);
  document.documentElement.style.setProperty("--rf-card-bg-2", cardPreset.bg2);
  document.documentElement.style.setProperty("--rf-card-bg-3", cardPreset.bg3);
  document.documentElement.style.setProperty("--rf-card-border", cardPreset.border);
  document.documentElement.style.setProperty("--rf-card-text", cardPreset.text);
  document.documentElement.style.setProperty("--rf-frame-color-1", theme.frameColor1 || accent);
  document.documentElement.style.setProperty("--rf-frame-color-2", theme.frameColor2 || accent2);
  document.documentElement.style.setProperty("--rf-frame-color-3", theme.frameColor3 || accent3);
  document.documentElement.style.setProperty("--rf-frame-gradient", `linear-gradient(135deg, ${theme.frameColor1 || accent}, ${theme.frameColor2 || accent2} 52%, ${theme.frameColor3 || accent3})`);
  const shell = document.querySelector(".rf-shell");
  if (shell) {
    shell.classList.toggle("show-grid", theme.showGrid === true);
    shell.classList.toggle("frame-solid", String(theme.frame || "glass") === "solid");
    shell.classList.toggle("frame-minimal", String(theme.frame || "glass") === "minimal");
  }
}
function setConnectionDot() {
  const connected = Boolean(accountState.tiktok?.connected || accountState.twitch?.connected);
  const live = Boolean((accountState.tiktok?.connected && accountState.tiktok?.live) || (accountState.twitch?.connected && accountState.twitch?.live));
  els.statusDot.className = `rf-dot ${live ? "live" : connected ? "connected" : ""}`.trim();
  els.statusText.textContent = live ? "Conectado" : connected ? "Conectado" : "Desconectado";
}
function participantLabel(p) { return p.displayName || p.user || p.username || p.uniqueId || "Usuario"; }
function participantHandle(p) { const h = p.uniqueId || p.username || p.user || ""; return h ? `@${String(h).replace(/^@+/, "")}` : ""; }
function participantAvatar(p) { return String(p.avatar || "").trim(); }
function getParticipants() { return Array.isArray(snapshot.state.participants) ? snapshot.state.participants.slice() : []; }
function getWinner() { return snapshot.state.winner || null; }
function getWaitingComment() { return snapshot.state.waitingComment || null; }
function currentMode() { return "baraja"; }
function isSpinning() { return snapshot.state.status === "spinning"; }
function isResult() { return snapshot.state.status === "result" && !!getWinner(); }

function getAutoConfigLocal() {
  const auto = snapshot.config?.auto || {};
  return {
    enabled: Boolean(auto.enabled),
    startWaitSeconds: Math.max(1, Number(auto.startWaitSeconds || 60)),
    restartWaitSeconds: Math.max(1, Number(auto.restartWaitSeconds || 180)),
  };
}

function getAutoSecondsLeft() {
  const auto = snapshot.state?.auto || {};
  const expiresAt = Number(auto.expiresAt || 0);
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function getParticipationPromptText() {
  const cfg = snapshot.config || DEFAULTS.config;
  const participation = cfg.participation || {};
  const entryMode = String(participation.entryMode === "all" ? "comment" : (participation.entryMode || participation.triggerMode || "comment"));
  const commentMode = String(participation.commentMode || (entryMode === "all" ? "any" : "custom"));
  const commentText = normalizeText(participation.commentText || participation.triggerText || "1") || "1";
  if (entryMode === "all") return "Escribe para participar!";
  if (commentMode === "any") return "Escribe cualquier comentario para participar!";
  return `Escribe "${commentText}" para participar!`;
}

function renderFloatingBubble(title, main, meta = "", avatar = "", countdown = "") {
  const bodyMain = countdown ? `${main} (${countdown})` : main;
  return `
    <div class="rf-participationPrompt">
      <div class="rf-winningCommentMask show">
      <div class="bubbleAvatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(main)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000">${esc((String(main || "U")[0] || "U").toUpperCase())}</div>`}</div>
      <div style="min-width:0;flex:1">
        <div class="bubbleTitle">${esc(title)}</div>
        <div class="bubbleMain">${esc(bodyMain)}</div>
        ${meta ? `<div class="bubbleMeta">${esc(meta)}</div>` : ""}
      </div>
    </div>
  `;
}

function renderEntryPrompt() {
  const auto = getAutoConfigLocal();
  const autoState = snapshot.state?.auto || {};
  if (autoState.phase === "restarting") return "";
  const countdown = auto.enabled && autoState.phase === "waiting_start" ? `${getAutoSecondsLeft()}s` : "";
  const prompt = getParticipationPromptText();
  return renderFloatingBubble(
    auto.enabled ? "Participación automática" : "Participa",
    prompt,
    "",
    getWinner()?.avatar || "",
    countdown,
  );
}

function renderRestartPrompt() {
  const auto = getAutoConfigLocal();
  const autoState = snapshot.state?.auto || {};
  if (!auto.enabled || autoState.phase !== "restarting") return "";
  const winner = getWinner();
  const secondsLeft = getAutoSecondsLeft();
  return renderFloatingBubble("Reiniciando", `Reiniciando ruleta`, "", winner?.avatar || "", `${secondsLeft}s`);
}

function syncForm() {
  const cfg = snapshot.config || DEFAULTS.config;
  const theme = cfg.theme || DEFAULTS.config.theme;
  const preset = ensureThemePreset(theme.preset || ui.themePreset || "midnight");
  const participation = cfg.participation || {};
  const legacyMode = String(participation.triggerMode || "");
  const entryMode = String(participation.entryMode === "all" ? "comment" : (participation.entryMode || (legacyMode === "all" ? "comment" : "comment")));
  const commentMode = String(participation.commentMode || (legacyMode === "all" ? "any" : "custom"));
  const commentText = normalizeText(participation.commentText || participation.triggerText || "1") || "1";

  els.accentColor.value = theme.accent || preset.accent;
  els.accent2Color.value = theme.accent2 || preset.accent2;
  els.accent3Color.value = theme.accent3 || preset.accent3;
  els.localBackground.value = ui.bg || "transparent";
  els.frameStyle.value = theme.frame || "glass";
  els.frameColor1.value = theme.frameColor1 || theme.accent || preset.accent;
  els.frameColor2.value = theme.frameColor2 || theme.accent2 || preset.accent2;
  els.frameColor3.value = theme.frameColor3 || theme.accent3 || preset.accent3;
  els.entryMode.value = entryMode;
  els.commentMode.value = commentMode;
  els.commentText.value = commentText;
  els.allowMultiple.value = String(Boolean(participation.allowMultiple));
  els.maxEntries.value = String(Math.max(1, Number(participation.maxEntriesPerUser || 1)));
  els.spamCooldown.value = String(Math.max(500, Number(participation.spamCooldownMs || 2400)));
  if (els.winnerCommentLinked) els.winnerCommentLinked.value = String(cfg.winnerComment?.voiceBotLinked === true);
  els.winnerCommentEnabled.value = String(cfg.winnerComment?.enabled !== false);
  els.winnerCommentSeconds.value = String(Math.max(5, Number(cfg.winnerComment?.waitSeconds || 30)));
  els.autoEnabled.value = String(Boolean(cfg.auto?.enabled));
  els.autoStartSeconds.value = String(Math.max(5, Number(cfg.auto?.startWaitSeconds || 60)));
  els.autoRestartSeconds.value = String(Math.max(5, Number(cfg.auto?.restartWaitSeconds || 180)));
  if (els.autoConfig) els.autoConfig.style.display = cfg.auto?.enabled ? "block" : "none";
  document.querySelectorAll("[data-tab]").forEach((btn) => btn.classList.toggle("active", String(btn.dataset.tab) === activeSettingsTab));
  document.querySelectorAll("[data-section]").forEach((section) => section.classList.toggle("active", String(section.dataset.section) === activeSettingsTab));
  document.querySelectorAll("[data-audience]").forEach((btn) => btn.classList.toggle("active", String(btn.dataset.audience) === String(cfg.audience || "all")));
  document.querySelectorAll("[data-platform]").forEach((btn) => btn.classList.toggle("active", Boolean(cfg.platforms?.[btn.dataset.platform])));
  updateCommentRuleUI();
}

function updateCommentRuleUI() {
  const cfg = snapshot.config || DEFAULTS.config;
  const participation = cfg.participation || {};
  const entryMode = String(participation.entryMode === "all" ? "comment" : (participation.entryMode || participation.triggerMode || "comment"));
  const commentMode = String(participation.commentMode || (entryMode === "all" ? "any" : "custom"));
  const commentText = normalizeText(participation.commentText || participation.triggerText || "1") || "1";
  const showCommentConfig = entryMode !== "all";
  if (els.commentConfig) els.commentConfig.style.display = showCommentConfig ? "block" : "none";
  if (els.commentTextField) els.commentTextField.style.display = commentMode === "custom" ? "flex" : "none";
  if (els.commentRulePanel) {
    const ruleHtml = entryMode === "all"
      ? `<strong>Entrada activa</strong><span class="muted">Entrada fija por comentario.</span>`
      : commentMode === "any"
        ? `<strong>Entrada por comentario</strong><span class="muted">Cualquier comentario participa.</span>`
        : `<strong>Entrada por comentario</strong><span>Debe comentar: <b>${esc(commentText)}</b></span>`;
    els.commentRulePanel.innerHTML = ruleHtml;
  }
  if (els.commentRuleHint) {
    els.commentRuleHint.style.display = showCommentConfig ? "block" : "none";
  }
}

function renderTop() {
  setConnectionDot();
}
function renderParticipantsList() {
  const participants = getParticipants();
  if (!participants.length) {
    els.participantsList.innerHTML = `<div class="rf-mini"><div class="rf-miniAvatar"></div><div><strong>Sin participantes</strong><span>No hay usuarios dentro de la regla actual.</span></div></div>`;
    return;
  }
  els.participantsList.innerHTML = participants.map((p) => {
    const name = participantLabel(p);
    const handle = participantHandle(p);
    const avatar = participantAvatar(p);
    return `
      <div class="rf-mini">
        <div class="rf-miniAvatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000;background:rgba(255,255,255,.05)">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div><strong>${esc(name)}</strong><span>${esc(handle || (p.platform === "twitch" ? "Twitch" : "TikTok"))}</span></div>
        <div class="count">×${esc(p.count || p.entries || 1)}</div>
      </div>
    `;
  }).join("");
}
function renderCardThemes() {
  if (!els.cardThemeScroller) return;
  const activeCardTheme = String(currentTheme().cardTheme || "midnight");
  els.cardThemeScroller.innerHTML = CARD_PRESETS.map((preset) => `
    <button type="button" class="rf-themeCard ${activeCardTheme === preset.id ? "active" : ""}" data-card-theme="${esc(preset.id)}" style="background:linear-gradient(180deg, ${preset.bg1}, ${preset.bg2})">
      <div>
        <strong>${esc(preset.name)}</strong>
        <span>${esc(preset.desc)}</span>
      </div>
      <div class="rf-swatchRow">
        <span class="rf-swatch" style="background:${esc(preset.bg1)}"></span>
        <span class="rf-swatch" style="background:${esc(preset.bg2)}"></span>
        <span class="rf-swatch" style="background:${esc(preset.bg3)}"></span>
      </div>
    </button>
  `).join("");
}
function renderWinnerVoiceBadge(winner) {
  const voiceLabel = String(winner?.voiceLabel || "").trim();
  if (!voiceLabel) return "";
  return `<span class="badge">🤖 ${esc(voiceLabel)}</span>`;
}

function renderWinnersHistoryList() {
  const history = Array.isArray(snapshot.state.history) ? snapshot.state.history.slice() : [];
  const clearButton = `<div class="rf-winnerHistoryActions"><button type="button" class="rf-action danger" data-clear-winner-history ${history.length ? "" : "disabled"}>🗑️ Borrar historial de ganadores</button></div>`;
  if (!history.length) {
    els.winnersList.innerHTML = `${clearButton}<div class="rf-mini"><div class="rf-miniAvatar"></div><div><strong>Sin ganadores</strong><span>Aquí aparecerán los ganadores después de cada sorteo.</span></div></div>`;
    return;
  }
  els.winnersList.innerHTML = `${clearButton}${history.map((winner) => {
    const name = participantLabel(winner);
    const handle = participantHandle(winner);
    const avatar = participantAvatar(winner);
    const voice = String(winner.voiceLabel || "").trim();
    const comment = String(winner.comment || "").trim();
    return `
      <div class="rf-mini">
        <div class="rf-miniAvatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000;background:rgba(255,255,255,.05)">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div>
          <strong>${esc(name)}</strong>
          <span>${esc(handle || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}</span>
          ${voice ? `<span>🤖 ${esc(voice)}</span>` : ""}
          ${comment ? `<span>💬 ${esc(comment)}</span>` : ""}
        </div>
        <button type="button" class="rf-action danger rf-deleteWinnerBtn" data-delete-winner="${esc(winner.key || winner.spinToken || winner.createdAt || "")}" title="Borrar ganador" aria-label="Borrar ganador">🗑️</button>
      </div>
    `;
  }).join("")}`;
}

function renderVoiceRulesList() {
  const list = Array.isArray(sharedVoiceUsers) ? sharedVoiceUsers.filter((entry) => String(entry?.source || "").toLowerCase() === "roulette") : [];
  if (!list.length) {
    els.rulesList.innerHTML = `<div class="rf-mini"><div class="rf-miniAvatar"></div><div><strong>Sin reglas sincronizadas</strong><span>Cuando un ganador escriba una voz, aparecerá aquí y en Bot de Voz.</span></div></div>`;
    return;
  }
  els.rulesList.innerHTML = list.map((entry) => {
    const name = String(entry.displayName || entry.username || "Usuario").trim();
    const handle = `${entry.platform === "twitch" ? "Twitch" : "TikTok"} · @${String(entry.username || "").trim()}`;
    const voice = String(entry.voiceLabel || entry.voiceKey || "Voz").trim();
    const comment = String(entry.comment || "").trim();
    return `
      <div class="rf-ruleCard">
        <strong>🤖 ${esc(voice)}</strong>
        <span>${esc(name)}</span>
        <span class="muted">${esc(handle)}</span>
        ${comment ? `<span class="muted">Comentario: ${esc(comment)}</span>` : ""}
        <div class="rf-actions">
          <button type="button" class="rf-action" data-delete-voice-rule="${esc(entry.platform || "tiktok")}" data-delete-voice-user="${esc(entry.username || "")}">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderVoiceModal() {
  if (els.winnersModal) {
    els.winnersModal.querySelectorAll("[data-voice-panel]").forEach((btn) => {
      btn.classList.toggle("active", String(btn.dataset.voicePanel) === activeVoicePanel);
    });
    els.winnersModal.querySelectorAll("[data-voice-section]").forEach((section) => {
      section.classList.toggle("active", String(section.dataset.voiceSection) === activeVoicePanel);
    });
  }
  renderWinnersHistoryList();
  renderVoiceRulesList();
}

function renderWinnerCard(extraClass = '') {
  const winner = getWinner();
  if (!winner) return `<div class="rf-core"><div><div class="rf-coreQuestion">?</div><span style="display:block;margin-top:6px;color:var(--rf-muted)">Centro listo</span></div></div>`;
  const name = participantLabel(winner);
  const handle = participantHandle(winner);
  const avatar = participantAvatar(winner);
  const voiceBadge = renderWinnerVoiceBadge(winner);
  return `
    <div class="rf-winningWrap ${extraClass}">
      <div class="rf-winningCard">
        <div class="rf-winningLabel">${isResult() ? "👑 Ganador" : "👾 Participante"}</div>
        <div class="rf-winningAvatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div class="rf-avatarFallback" style="font-size:42px">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div class="rf-winningTitle">${esc(name)}</div>
        <div class="rf-winningHandle">${esc(handle || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}</div>
        ${voiceBadge ? `<div class="rf-cardRole">${voiceBadge}</div>` : ""}
      </div>
    </div>
  `;
}
function renderCommentPrompt() {
  const winner = getWinner();
  const waiting = getWaitingComment();
  const auto = getAutoConfigLocal();
  const autoState = snapshot.state?.auto || {};
  const enabled = Boolean(snapshot.config.winnerComment?.enabled !== false && snapshot.config.winnerComment?.voiceBotLinked === true);
  if (!winner || !enabled) return "";
  if (auto.enabled && autoState.phase === "restarting") {
    return renderRestartPrompt();
  }
  const hasComment = Boolean(String(winner.comment || "").trim());
  if (hasComment) {
    const name = participantLabel(winner);
    const handle = participantHandle(winner);
    return `
      <div class="rf-winningCommentMask show" style="top:20px;z-index:20;">
        <div class="bubbleAvatar">${winner.commentAvatar || winner.avatar ? `<img src="${esc(winner.commentAvatar || winner.avatar)}" alt="${esc(name)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div style="min-width:0;flex:1">
          <div class="bubbleTitle">Comentario del ganador</div>
          <div class="bubbleMain">${esc(winner.comment || "")}</div>
          <div class="bubbleMeta">${esc(name)} · ${esc(handle || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}${winner.voiceLabel ? ` · 🤖 ${esc(winner.voiceLabel)}` : ""}</div>
        </div>
      </div>
    `;
  }
  if (!waiting?.active) return "";
  const secondsLeft = Math.max(0, Math.ceil((Number(waiting.expiresAt || 0) - Date.now()) / 1000));
  const lastComment = String(waiting.lastComment || "").trim();
  return `
    <div class="rf-winningCommentMask show" style="top:20px;z-index:20;">
      <div class="bubbleAvatar">${winner.avatar ? `<img src="${esc(winner.avatar)}" alt="${esc(participantLabel(winner))}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000">${esc((participantLabel(winner)[0] || "U").toUpperCase())}</div>`}</div>
      <div style="min-width:0;flex:1">
        <div class="bubbleTitle">${lastComment ? "Comentario recibido · falta la voz" : "Por favor comenta una voz"}</div>
        <div class="bubbleMain">${lastComment ? esc(lastComment) : esc(participantLabel(winner))}</div>
        <div class="bubbleMeta">${esc(participantHandle(winner) || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}${lastComment ? " · Di el nombre de la voz que quieres" : ""}</div>
        <div class="rf-countdown"><span data-countdown-label>${lastComment ? "Esperando una voz" : "Tiempo restante"}</span><strong data-countdown-value>${secondsLeft}</strong></div>
      </div>
    </div>
  `;
}

// Preview centering v11: participant layer intentionally mirrors rf-winningWrap exactly.
function renderPreviewScene(topPrompt, centerMarkup) {
  return `
    <div class="rf-previewRoot" aria-label="Vista previa de ruleta">
      <div class="rf-previewNotificationLayer" data-notification-layer></div>
      <div class="rf-previewStage" id="rfPreviewStage">
        <div class="rf-previewStageFrame">
          <div class="rf-previewStageCenter" id="rfPreviewCenter">${centerMarkup}</div>
        </div>
      </div>
    </div>
  `;
}

let previewResizeObserver = null;
let previewNotificationSignature = "";
let previewSceneMode = "";

function notificationSignature(markup) {
  return String(markup || "").replace(/\s+/g, " ").trim();
}

function updatePreviewNotification(topPrompt) {
  const layer = els.center.querySelector?.('[data-notification-layer]');
  if (!layer) return;
  const signature = notificationSignature(topPrompt);
  if (signature === previewNotificationSignature) return;
  layer.innerHTML = topPrompt || "";
  previewNotificationSignature = signature;
}

function mountPreviewScene(topPrompt, centerMarkup) {
  const root = els.center.querySelector?.('.rf-previewRoot');
  const mode = currentMode();
  if (!root || previewSceneMode !== mode) {
    els.center.innerHTML = renderPreviewScene(topPrompt, centerMarkup);
    previewSceneMode = mode;
    previewNotificationSignature = "";
    updatePreviewNotification(topPrompt);
  } else {
    const stageCenter = root.querySelector('#rfPreviewCenter');
    if (stageCenter) stageCenter.innerHTML = centerMarkup;
    updatePreviewNotification(topPrompt);
  }
}

function syncSpinFocusToCard() {
  if (!isEmbedPreview) return;
  const center = document.getElementById('rfPreviewCenter');
  const focus = center?.querySelector('.rf-spinFocus');
  const card = center?.querySelector('.rf-track .rf-card');
  if (!focus || !card) return;

  const rect = card.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const computed = getComputedStyle(card);
  focus.style.width = `${Math.round(rect.width)}px`;
  focus.style.height = `${Math.round(rect.height)}px`;
  focus.style.borderRadius = computed.borderRadius;
}

function fitPreviewContent() {
  const stage = document.getElementById('rfPreviewStage');
  const center = document.getElementById('rfPreviewCenter');
  if (!stage || !center) return;

  const staticCards = center.querySelector('.rf-staticCards');
  if (staticCards) {
    staticCards.style.setProperty('--rf-fit-scale', '1');
    const availableW = Math.max(1, stage.clientWidth - 24);
    const availableH = Math.max(1, stage.clientHeight - 24);
    const rect = staticCards.getBoundingClientRect();
    // Use the real horizontal content width, not only the clipped viewport box.
    // This lets a long participant row shrink smoothly until it fits.
    const naturalW = Math.max(1, staticCards.scrollWidth || rect.width);
    const naturalH = Math.max(1, rect.height);
    const scale = Math.min(1, availableW / naturalW, availableH / naturalH);
    staticCards.style.setProperty('--rf-fit-scale', String(Math.max(0.42, scale)));
  }

  const winning = center.querySelector('.rf-winningCard');
  if (winning) {
    const maxW = Math.max(0, Math.min(stage.clientWidth - 24, 430));
    if (maxW > 0) winning.style.width = `${maxW}px`;
  }
}

function bindPreviewResizeObserver() {
  if (typeof ResizeObserver === 'undefined') return;
  if (previewResizeObserver) previewResizeObserver.disconnect();
  const root = document.getElementById('rfPreviewStage');
  if (!root) return;
  previewResizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      fitPreviewContent();
      syncSpinFocusToCard();
    });
  });
  previewResizeObserver.observe(root);
  requestAnimationFrame(() => {
    fitPreviewContent();
    syncSpinFocusToCard();
  });
}

function renderBaraja() {
  const participants = getParticipants();
  const resultPrompt = renderCommentPrompt();
  const topPrompt = resultPrompt || (!isResult() ? renderEntryPrompt() : "");

  if (isResult() && getWinner()) {
    return { topPrompt, centerMarkup: renderWinnerCard('rf-resultOverlay') };
  }

  if (!participants.length) {
    const empty = `
      <div class="rf-winningWrap rf-participantLayer rf-emptyCenter" aria-hidden="true">
        <div class="rf-placeholderCard rf-singlePlaceholder"><span>?</span></div>
      </div>
    `;
    return { topPrompt, centerMarkup: empty };
  }

  const spinning = isSpinning();
  if (!spinning) {
    const countClass = `count-${Math.min(participants.length, 6)}`;
    const cards = `
      <div class="rf-winningWrap rf-participantLayer" aria-label="Participantes de la baraja">
        <div class="rf-staticCards ${countClass}" id="rfStaticCards">
          ${participants.map((p, index) => {
            const name = participantLabel(p);
            const handle = participantHandle(p);
            const avatar = participantAvatar(p);
            const isWinnerCard = Boolean(getWinner() && getWinner().key === p.key);
            const platform = String(p.platform || '').toLowerCase();
            const isNew = isEmbedPreview && snapshot.state.lastAddedKey === p.key;
            return `
              <div class="rf-card ${isWinnerCard ? 'is-winner' : ''} ${isNew ? 'rf-card-enter' : ''}" style="--rf-delay:${Math.min(index, 7) * 45}ms" data-key="${esc(p.key || `${index}`)}">
                <div class="rf-cardTopLine">
                  <span class="rf-platformBadge ${platform}">${platform === 'twitch' ? 'Twitch' : platform === 'tiktok' ? 'TikTok' : 'Live'}</span>
                  <span class="rf-cardIndex">${String(index + 1).padStart(2, '0')}</span>
                </div>
                <div class="rf-cardBody">
                  <div class="rf-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div class="rf-avatarFallback">${esc((name[0] || 'U').toUpperCase())}</div>`}</div>
                  <div class="rf-cardIdentity">
                    <div class="rf-cardName">${esc(name)}</div>
                    <div class="rf-cardHandle">${esc(handle || (platform === 'twitch' ? 'Twitch' : platform === 'tiktok' ? 'TikTok' : 'Participante'))}</div>
                  </div>
                  <div class="rf-cardRole"><span class="badge">👾 Participante</span>${p.count > 1 ? `<span class="badge">x${esc(p.count)}</span>` : ''}</div>
                  ${p.comment ? `<div class="rf-cardComment">“${esc(p.comment)}”</div>` : `<div class="rf-cardComment rf-cardCommentEmpty">Listo para participar</div>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    return { topPrompt, centerMarkup: cards };
  }

  const repeated = Array.from({ length: BARAJA_SPIN_CYCLES }, () => participants).flat();
  const spin = `
    <div class="rf-winningWrap rf-participantLayer rf-spinLayer" aria-label="Animación de la baraja">
      <div class="rf-spinFocus" aria-hidden="true"><span></span></div>
      <div class="rf-trackViewport">
        <div class="rf-track rf-track-spinning" id="rfTrack">
          ${repeated.map((p, index) => {
            const name = participantLabel(p);
            const handle = participantHandle(p);
            const avatar = participantAvatar(p);
            const platform = String(p.platform || '').toLowerCase();
            return `
              <div class="rf-card" style="--rf-delay:${Math.min(index, 7) * 45}ms" data-key="${esc(p.key || `${index}`)}">
                <div class="rf-cardTopLine">
                  <span class="rf-platformBadge ${platform}">${platform === 'twitch' ? 'Twitch' : platform === 'tiktok' ? 'TikTok' : 'Live'}</span>
                  <span class="rf-cardIndex">${String((index % participants.length) + 1).padStart(2, '0')}</span>
                </div>
                <div class="rf-cardBody">
                  <div class="rf-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div class="rf-avatarFallback">${esc((name[0] || 'U').toUpperCase())}</div>`}</div>
                  <div class="rf-cardIdentity">
                    <div class="rf-cardName">${esc(name)}</div>
                    <div class="rf-cardHandle">${esc(handle || (platform === 'twitch' ? 'Twitch' : platform === 'tiktok' ? 'TikTok' : 'Participante'))}</div>
                  </div>
                  <div class="rf-cardRole"><span class="badge">👾 Participante</span></div>
                  ${p.comment ? `<div class="rf-cardComment">“${esc(p.comment)}”</div>` : `<div class="rf-cardComment rf-cardCommentEmpty">Listo para participar</div>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  return { topPrompt, centerMarkup: spin };
}

function renderWheel(participants, dimmed, hasPrompt=false) {
  const total = Math.max(1, participants.length || 1);
  const winner = getWinner();
  const slice = 360 / total;
  const labels = participants.length ? participants : [{ key: "placeholder", displayName: "?", uniqueId: "?" }];
  const palette = ['var(--rf-accent)', 'var(--rf-accent-2)', 'var(--rf-accent-3)', '#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa'];
  const stops = labels.map((_, i) => `${palette[i % palette.length]} ${i * slice}deg ${(i + 1) * slice}deg`).join(',');
  const isWinner = Boolean(winner && isResult());
  const winnerName = isWinner ? participantLabel(winner) : '';
  const winnerHandle = isWinner ? participantHandle(winner) : '';
  const winnerAvatar = isWinner ? participantAvatar(winner) : '';
  if (isWinner) {
    return `
      <div class="rf-wheelArea hasWinner rf-cleanWinnerStage">
        <div class="rf-cleanWinnerOnly" aria-live="polite">
          <div class="rf-coreWinnerAvatar">${winnerAvatar ? `<img src="${esc(winnerAvatar)}" alt="${esc(winnerName)}">` : `<div class="rf-coreWinnerFallback">${esc((winnerName[0] || 'U').toUpperCase())}</div>`}</div>
          <strong>${esc(winnerName)}</strong>
          <span>${esc(winnerHandle || (winner.platform === 'twitch' ? 'Twitch' : 'TikTok'))}</span>
        </div>
      </div>`;
  }
  return `
    <div class="rf-wheelArea ${hasPrompt ? 'hasPrompt' : ''}">
      <div class="rf-wheelWrap" style="--rf-wheel-size:min(68vw,560px);--rf-count:${total};opacity:${dimmed ? .22 : 1};transform:${dimmed ? "scale(.95)" : "none"};">
        <div class="rf-pointer" aria-hidden="true"></div>
        <div class="rf-wheel" id="rfWheel" style="background:conic-gradient(from -90deg, ${stops});">
          ${labels.map((p, index) => {
            const name = participantLabel(p);
            const handle = participantHandle(p);
            const avatar = participantAvatar(p);
            const angle = index * slice + slice / 2;
            const fontSize = total <= 6 ? 15 : total <= 8 ? 13 : total <= 10 ? 11.5 : total <= 13 ? 10 : 8.5;
            const safeName = String(name || 'Usuario').trim();
            const safeHandle = String(handle || '').trim();
            const halfSliceRad = (slice * Math.PI / 180) / 2;
            const widthFactor = Math.max(0.10, Math.min(0.29, Math.sin(halfSliceRad) * 0.62));
            const avatarFactor = total <= 8 ? 0.09 : total <= 10 ? 0.078 : total <= 13 ? 0.066 : 0.055;
            const xPct = Math.sin(angle * Math.PI / 180) * 34;
            const yPct = -Math.cos(angle * Math.PI / 180) * 34;
            return `<div class="rf-wheelLabel" title="${esc(safeName)}" style="--rf-x:${xPct}%;--rf-y:${yPct}%;--rf-label-factor:${widthFactor};--rf-avatar-factor:${avatarFactor};font-size:${fontSize}px"><div class="rf-wheelLabelInner"><div class="rf-wheelAvatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(safeName)}">` : `<span>${esc((safeName[0] || 'U').toUpperCase())}</span>`}</div><strong>${esc(safeName)}</strong>${safeHandle ? `<span class="rf-wheelHandle">${esc(safeHandle)}</span>` : ''}</div></div>`;
          }).join("")}
        </div>
        <div class="rf-core" id="rfCore" aria-live="polite"><div class="rf-coreDice" aria-label="Preparado para girar">🎲</div></div>
      </div>
    </div>`;
}

function renderRoulette() {
  const participants = getParticipants();
  const resultPrompt = renderCommentPrompt();
  const topPrompt = resultPrompt || (!isResult() ? renderEntryPrompt() : "");
  const centerMarkup = renderWheel(participants, Boolean(isResult() && getWinner()), false);
  return { topPrompt, centerMarkup };
}

function renderCenter() {
  if (previewResizeObserver) { previewResizeObserver.disconnect(); previewResizeObserver = null; }
  const scene = renderBaraja();
  // The preview and the real overlay intentionally mount the identical scene wrapper.
  // This keeps geometry, notification placement and card positioning in one code path.
  mountPreviewScene(scene.topPrompt, scene.centerMarkup);
  bindPreviewResizeObserver();

  if (currentMode() === 'baraja' && isSpinning()) {
    requestAnimationFrame(() => {
      const track = document.getElementById('rfTrack');
      if (!track) return;
      track.style.transform = 'translateX(0)';
      const viewport = track.parentElement;
      const spin = snapshot.state.spin;
      if (!viewport || !spin) return;
      const participants = getParticipants();
      const repeated = Array.from({ length: BARAJA_SPIN_CYCLES }, () => participants).flat();
      const targetBaseIndex = participants.findIndex((p) => p.key === spin.target);
      const targetIndex = targetBaseIndex >= 0 ? (participants.length * 11) + targetBaseIndex : -1;
      if (targetIndex < 0) return;
      const targetCard = track.children[targetIndex];
      if (!targetCard) return;
      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = targetCard.getBoundingClientRect();
      const offset = (targetRect.left + targetRect.width / 2) - (viewportRect.left + viewportRect.width / 2);
      const totalDuration = Math.max(1200, Number(spin.durationMs || spin.duration || PREVIEW_SPIN_DURATION_MS));
      const elapsed = Math.max(0, Date.now() - Number(spin.startedAt || Date.now()));
      const remaining = Math.max(0, totalDuration - elapsed);
      // Ease-out keeps the first part fast and makes the final cards visibly slow down.
      const t = Math.min(1, elapsed / totalDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = -offset * eased;
      track.style.transition = 'none';
      track.style.transform = `translateX(${current}px)`;
      requestAnimationFrame(() => {
        if (remaining <= 0) { track.style.transform = `translateX(${-offset}px)`; return; }
        track.style.transition = `transform ${remaining}ms cubic-bezier(.12,.82,.05,1)`;
        track.style.transform = `translateX(${-offset}px)`;
      });
    });
  }
  if (currentMode() === 'roulette' && getParticipants().length && snapshot.state.spin) {
    requestAnimationFrame(() => {
      const wheel = document.getElementById('rfWheel');
      const participants = getParticipants();
      const targetIndex = participants.findIndex((p) => p.key === snapshot.state.spin?.target);
      const slice = 360 / Math.max(1, participants.length);
      const totalDuration = Math.max(1200, Number(snapshot.state.spin.durationMs || snapshot.state.spin.duration || PREVIEW_SPIN_DURATION_MS));
      const elapsed = Math.max(0, Date.now() - Number(snapshot.state.spin.startedAt || Date.now()));
      const t = Math.min(1, elapsed / totalDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      const finalRotation = 360 * 18 + (360 - ((targetIndex < 0 ? 0 : targetIndex) + 0.5) * slice);
      const currentRotation = finalRotation * eased;
      if (wheel) {
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${currentRotation}deg)`;
        requestAnimationFrame(() => {
          const remaining = Math.max(0, totalDuration - elapsed);
          if (remaining <= 0) { wheel.style.transform = `rotate(${finalRotation}deg)`; return; }
          wheel.style.transition = `transform ${remaining}ms cubic-bezier(.12,.82,.05,1)`;
          wheel.style.transform = `rotate(${finalRotation}deg)`;
        });
      }
    });
  }
  requestAnimationFrame(() => {
    fitPreviewContent();
    syncSpinFocusToCard();
  });
}

function renderStatusSummary() {
  const cfg = snapshot.config || DEFAULTS.config;
  const participation = cfg.participation || {};
  const auto = cfg.auto || {};
  const entryMode = String(participation.entryMode === "all" ? "comment" : (participation.entryMode || participation.triggerMode || "comment"));
  const commentMode = String(participation.commentMode || (entryMode === "all" ? "any" : "custom"));
  const commentText = normalizeText(participation.commentText || participation.triggerText || "1") || "1";
  let trig = "Todos los espectadores";
  if (entryMode !== "all") {
    trig = commentMode === "any" ? "Cualquier comentario" : `Comentario: ${commentText}`;
  }
  const audience = cfg.audience === "followers" ? "Seguidores" : cfg.audience === "donors" ? "Donadores" : cfg.audience === "likers" ? "Likers" : "Todos espectadores";
  const multi = participation.allowMultiple ? `Múltiples (${Math.max(1, Number(participation.maxEntriesPerUser || 1))})` : "Una participación";
  const autoInfo = auto.enabled ? `Auto: inicia ${Math.max(1, Number(auto.startWaitSeconds || 60))}s / reinicia ${Math.max(1, Number(auto.restartWaitSeconds || 180))}s` : "Auto: desactivado";
  els.statusSummary.textContent = `${trig} · ${audience} · ${multi} · ${autoInfo}`;
}
function bindPreviewMessageHandler(){
  if(!isEmbedPreview || previewMessageHandlerBound) return;
  previewMessageHandlerBound=true;
  window.addEventListener('message',(ev)=>{
    const data=ev?.data;
    if(!data || data.source!=='streamfusion-roulette-preview') return;
    if(data.type==='config'){ snapshot.config=mergeDeep(safeClone(DEFAULTS.config), data.config||{}); applyThemeVars(); if(isEmbedPreview) applyLocalBackground(ui.bg || "transparent"); renderAll(); }
    else if(data.type==='newRound'){
      previewSpinRequest++;
      if(previewSpinTimer) clearTimeout(previewSpinTimer);
      previewSpinTimer=null;
      snapshot.state.participants=[];
      snapshot.state.winner=null;
      snapshot.state.status='idle';
      snapshot.state.spin=null;
      snapshot.state.lastAddedKey=null;
      renderAll();
    }
    else if(data.type==='addParticipant') previewAddParticipant(data.participant||{});
    else if(data.type==='spin') previewSpin();
    else if(data.type==='reset'){ if(previewSpinTimer) clearTimeout(previewSpinTimer); previewSpinTimer=null; previewSpinRequest++; snapshot.state=safeClone(DEFAULT_STATE); renderAll(); }
  });
  setTimeout(()=>window.parent?.postMessage({source:'streamfusion-roulette-preview',type:'ready'},'*'),0);
}

function renderAll() {
  applyThemeVars();
  bindPreviewMessageHandler();
  applyLocalBackground(ui.bg || "transparent");
  renderTop();
  renderParticipantsList();
  renderCardThemes();
  buildThemeCards();
  renderCenter();
  renderStatusSummary();
  syncForm();
  if (els.winnersModal?.classList.contains("show")) renderVoiceModal();
}

function savePatch(patch) {
  snapshot.config = mergeDeep(snapshot.config, patch || {});
  if (!isEmbedPreview && socket) socket.emit("roulette:update", patch || {});
  renderAll();
}
function saveThemePatch(patch) {
  const theme = mergeDeep(currentTheme(), patch || {});
  savePatch({ theme });
}
function setCardTheme(id) {
  const preset = ensureCardPreset(id);
  saveThemePatch({ cardTheme: preset.id });
}
function openDrawer(which) {
  if (which === "participants") {
    els.participantsDrawer.classList.add("show");
    els.participantsDrawer.setAttribute("aria-hidden", "false");
  } else if (which === "winners") {
    activeVoicePanel = activeVoicePanel || "winners";
    renderVoiceModal();
    els.winnersModal.classList.add("show");
    els.winnersModal.setAttribute("aria-hidden", "false");
  } else if (which === "theme") {
    els.themeModal.classList.add("show");
    els.themeModal.setAttribute("aria-hidden", "false");
  } else if (which === "settings") {
    els.settingsModal.classList.add("show");
    els.settingsModal.setAttribute("aria-hidden", "false");
  }
}
function closeDrawer(which) {
  if (which === "participants") {
    els.participantsDrawer.classList.remove("show");
    els.participantsDrawer.setAttribute("aria-hidden", "true");
  } else if (which === "winners") {
    els.winnersModal.classList.remove("show");
    els.winnersModal.setAttribute("aria-hidden", "true");
  } else if (which === "theme") {
    els.themeModal.classList.remove("show");
    els.themeModal.setAttribute("aria-hidden", "true");
  } else if (which === "settings") {
    els.settingsModal.classList.remove("show");
    els.settingsModal.setAttribute("aria-hidden", "true");
  }
}
function startRoulette() {
  if (isEmbedPreview) return previewSpin();
  socket?.emit("roulette:start");
}
function stopRoulette() {
  if (isEmbedPreview) { snapshot.state.status = "idle"; snapshot.state.spin = null; renderAll(); return; }
  socket?.emit("roulette:stop");
}
function clearParticipants() {
  if (isEmbedPreview) { snapshot.state.participants=[]; snapshot.state.winner=null; snapshot.state.status='idle'; renderAll(); return; }
  socket?.emit("roulette:clearParticipants");
}
function resetRoulette() {
  if (isEmbedPreview) { if(previewSpinTimer) clearTimeout(previewSpinTimer); previewSpinTimer=null; snapshot.state=safeClone(DEFAULT_STATE); renderAll(); return; }
  socket?.emit("roulette:reset");
}
function resetPreviewRoundForAdd(){
  if(!isEmbedPreview) return;
  // Starting a new participant always begins a fresh visual round.
  // Invalidate any pending result timer so an old winner cannot reappear.
  previewSpinRequest++;
  if(previewSpinTimer){ clearTimeout(previewSpinTimer); previewSpinTimer=null; }
  snapshot.state.status='idle';
  snapshot.state.spin=null;
  snapshot.state.winner=null;
}

function previewAddParticipant(participant){
  if(!isEmbedPreview) return;
  resetPreviewRoundForAdd();
  const p={...participant,key:String(participant.key||`preview-${Date.now()}-${Math.random()}`),createdAt:Date.now()};
  snapshot.state.participants=[...(snapshot.state.participants||[]),p];
  snapshot.state.lastAddedKey=p.key;
  renderAll();
  setTimeout(()=>{ if(snapshot.state.lastAddedKey===p.key) snapshot.state.lastAddedKey=null; }, 650);
  try{ window.parent?.postMessage({source:'streamfusion-roulette-preview',type:'participantComment',comment:String(p.comment||'1'),participant:p},'*'); }catch{}
}
function previewSpin(){
  if(!isEmbedPreview || snapshot.config?.enabled === false || snapshot.state.status==='spinning') return;
  const list=snapshot.state.participants||[];
  if(!list.length) return;
  const requestId=++previewSpinRequest;
  const winner=list[Math.floor(Math.random()*list.length)];
  snapshot.state.status='spinning';
  snapshot.state.winner=null;
  snapshot.state.spin={target:winner.key,startedAt:Date.now(),durationMs:PREVIEW_SPIN_DURATION_MS,settleMs:PREVIEW_SPIN_SETTLE_MS};
  renderAll();
  if(previewSpinTimer) clearTimeout(previewSpinTimer);
  previewSpinTimer=setTimeout(()=>{
    if(requestId!==previewSpinRequest) return;
    snapshot.state.status='result';
    snapshot.state.winner={...winner,createdAt:Date.now(),awardGranted:snapshot.config?.winnerComment?.voiceBotLinked===true?false:true,voicePending:snapshot.config?.winnerComment?.voiceBotLinked===true};
    snapshot.state.spin=null;
    if(snapshot.config?.winnerComment?.voiceBotLinked===true){
      const waitSeconds=Math.max(1,Number(snapshot.config?.winnerComment?.waitSeconds||30));
      snapshot.state.waitingComment={active:true,winnerKey:winner.key,startedAt:Date.now(),expiresAt:Date.now()+waitSeconds*1000,waitSeconds,attempts:0,lastComment:'',lastCommentAt:0};
      if(previewSpinTimer) clearTimeout(previewSpinTimer);
      previewSpinTimer=setTimeout(()=>{
        if(requestId!==previewSpinRequest) return;
        snapshot.state.waitingComment=null;
        snapshot.state.winner=null;
        snapshot.state.status='idle';
        previewSpinTimer=null;
        renderAll();
      },waitSeconds*1000);
    } else {
      snapshot.state.history=[snapshot.state.winner,...(snapshot.state.history||[])].slice(0,30);
    }
    renderAll();
    try{ window.parent?.postMessage({source:'streamfusion-roulette-preview',type:'result',winner:snapshot.state.winner},'*'); }catch{}
  },PREVIEW_SPIN_DURATION_MS + PREVIEW_SPIN_SETTLE_MS);
}

function syncCountDown() {
  const waiting = getWaitingComment();
  const autoState = snapshot.state?.auto || {};
  const autoActive = Boolean(snapshot.config?.auto?.enabled && (autoState.phase === "waiting_start" || autoState.phase === "restarting"));
  const valueNode = document.querySelector('[data-countdown-value]');
  const labelNode = document.querySelector('[data-countdown-label]');
  if (waiting?.active) {
    const secondsLeft = Math.max(0, Math.ceil((Number(waiting.expiresAt || 0) - Date.now()) / 1000));
    if (valueNode) valueNode.textContent = String(secondsLeft);
    if (labelNode) labelNode.textContent = String(waiting.lastComment || '').trim() ? 'Esperando una voz' : 'Tiempo restante';
  }
  if (!waiting?.active && !autoActive) {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    return;
  }
  if (!countdownTimer) countdownTimer = setInterval(syncCountDown, 1000);
}

function buildThemeCards() {
  const rouletteMode = false;
  if (els.deckThemeSection) els.deckThemeSection.style.display = "block";
  if (els.cardThemeScroller) {
    els.cardThemeScroller.querySelectorAll("[data-card-theme]").forEach((btn) => btn.classList.toggle("active", String(btn.dataset.cardTheme) === String(currentTheme().cardTheme || "midnight")));
  }
}

if (!isEmbedPreview) {
  socket.on("connect", () => socket.emit("roulette:getState"));
  socket.on("roulette:sync", (data) => {
    pushSnapshot(mergeDeep(safeClone(DEFAULTS), data || {}));
    const waiting = snapshot.state.waitingComment?.active;
    const autoActive = Boolean(snapshot.config?.auto?.enabled && ((snapshot.state?.auto || {}).phase === "waiting_start" || (snapshot.state?.auto || {}).phase === "restarting"));
    if (waiting || autoActive) {
      if (!countdownTimer) countdownTimer = setInterval(syncCountDown, 1000);
    } else if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    renderAll();
  });
  socket.on("roulette:spin", () => {
    renderAll();
  });
  socket.on("roulette:comment", () => {
    renderAll();
  });
  socket.on("settings", (serverSettings) => {
    sharedVoiceUsers = Array.isArray(serverSettings?.voiceFixedUsers) ? serverSettings.voiceFixedUsers.slice() : [];
    renderAll();
  });
  socket.on("roulette:error", (data) => {
    els.statusSummary.textContent = String(data?.message || "No se pudo iniciar la ruleta.");
  });
  socket.on("accountState", (data) => {
    if (!data?.platform) return;
    accountState[String(data.platform)] = { connected: Boolean(data.connected), live: Boolean(data.live) };
    setConnectionDot();
  });
  socket.on("disconnect", setConnectionDot);

}

els.participantsBtn.addEventListener("click", () => openDrawer("participants"));
els.winnersBtn?.addEventListener("click", () => openDrawer("winners"));
els.themeBtn.addEventListener("click", () => openDrawer("theme"));
els.settingsBtn.addEventListener("click", () => openDrawer("settings"));
els.closeParticipantsBtn.addEventListener("click", () => closeDrawer("participants"));
els.closeWinnersBtn?.addEventListener("click", () => closeDrawer("winners"));
els.closeThemeBtn.addEventListener("click", () => closeDrawer("theme"));
els.closeSettingsBtn.addEventListener("click", () => closeDrawer("settings"));
els.participantsDrawer.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "participants") closeDrawer("participants"); });
els.winnersModal?.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "winners") closeDrawer("winners"); });
els.themeModal.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "theme") closeDrawer("theme"); });
els.settingsModal.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "settings") closeDrawer("settings"); });

document.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
  activeSettingsTab = String(btn.dataset.tab || "logic");
  ui.activeTab = activeSettingsTab;
  saveLocalState();
  syncForm();
}));

document.querySelectorAll("[data-voice-panel]").forEach((btn) => btn.addEventListener("click", () => {
  activeVoicePanel = String(btn.dataset.voicePanel || "winners");
  renderVoiceModal();
}));

document.addEventListener("click", (ev) => {
  const cardThemeBtn = ev.target.closest?.("[data-card-theme]");
  if (cardThemeBtn && currentMode() === "baraja") setCardTheme(String(cardThemeBtn.dataset.cardTheme || "midnight"));
  const deleteWinnerBtn = ev.target.closest?.("[data-delete-winner]");
  if (deleteWinnerBtn && !isEmbedPreview) {
    const key = String(deleteWinnerBtn.getAttribute("data-delete-winner") || "");
    if (key) socket?.emit("roulette:deleteWinner", key);
    return;
  }
  const clearWinnerHistoryBtn = ev.target.closest?.("[data-clear-winner-history]");
  if (clearWinnerHistoryBtn && !isEmbedPreview && !clearWinnerHistoryBtn.disabled) {
    socket?.emit("roulette:clearWinnerHistory");
    return;
  }
  const deleteVoiceRuleBtn = ev.target.closest?.("[data-delete-voice-rule]");
  if (deleteVoiceRuleBtn) {
    const platform = String(deleteVoiceRuleBtn.getAttribute("data-delete-voice-rule") || "tiktok");
    const username = String(deleteVoiceRuleBtn.getAttribute("data-delete-voice-user") || "");
    if (!isEmbedPreview) socket?.emit("voiceFixedUsers:delete", { platform, username });
    sharedVoiceUsers = (sharedVoiceUsers || []).filter((entry) => `${String(entry.platform || "tiktok").toLowerCase()}:${String(entry.username || "").toLowerCase()}` !== `${platform.toLowerCase()}:${username.toLowerCase()}`);
    renderVoiceModal();
  }
});
document.querySelectorAll("[data-audience]").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll("[data-audience]").forEach((b) => b.classList.toggle("active", b === btn));
  savePatch({ audience: String(btn.dataset.audience || "all") });
}));
document.querySelectorAll("[data-platform]").forEach((btn) => btn.addEventListener("click", () => {
  btn.classList.toggle("active");
  const platforms = {
    tiktok: Boolean(document.querySelector('[data-platform="tiktok"]')?.classList.contains("active")),
    twitch: Boolean(document.querySelector('[data-platform="twitch"]')?.classList.contains("active")),
  };
  savePatch({ platforms });
}));


// The preview iframe is a fully usable mini-overlay too: its own controls drive the same local simulation.
els.playBtn.addEventListener("click", startRoulette);
els.stopBtn.addEventListener("click", stopRoulette);

actionListeners();
function actionListeners() {
  els.accentColor.addEventListener("input", () => saveThemePatch({ accent: els.accentColor.value }));
  els.accent2Color.addEventListener("input", () => saveThemePatch({ accent2: els.accent2Color.value }));
  els.accent3Color.addEventListener("input", () => saveThemePatch({ accent3: els.accent3Color.value }));
  els.frameColor1.addEventListener("input", () => saveThemePatch({ frameColor1: els.frameColor1.value }));
  els.frameColor2.addEventListener("input", () => saveThemePatch({ frameColor2: els.frameColor2.value }));
  els.frameColor3.addEventListener("input", () => saveThemePatch({ frameColor3: els.frameColor3.value }));
  els.frameStyle.addEventListener("change", () => saveThemePatch({ frame: els.frameStyle.value }));
  els.localBackground.addEventListener("change", () => applyLocalBackground(els.localBackground.value));
  els.entryMode.addEventListener("change", () => {
    savePatch({ participation: { ...snapshot.config.participation, entryMode: "comment", commentMode: snapshot.config.participation?.commentMode || "any" } });
  });
  els.commentMode.addEventListener("change", () => {
    savePatch({ participation: { ...snapshot.config.participation, commentMode: els.commentMode.value === "custom" ? "custom" : "any", entryMode: "comment" } });
  });
  els.applyCommentRule.addEventListener("click", () => {
    savePatch({ participation: { ...snapshot.config.participation, entryMode: "comment", commentMode: els.commentMode.value === "custom" ? "custom" : "any", commentText: normalizeText(els.commentText.value || "1") || "1" } });
  });
  els.allowMultiple.addEventListener("change", () => savePatch({ participation: { ...snapshot.config.participation, allowMultiple: els.allowMultiple.value === "true" } }));
  els.maxEntries.addEventListener("change", () => savePatch({ participation: { ...snapshot.config.participation, maxEntriesPerUser: Math.max(1, Number(els.maxEntries.value || 1)) } }));
  els.spamCooldown.addEventListener("change", () => savePatch({ participation: { ...snapshot.config.participation, spamCooldownMs: Math.max(500, Number(els.spamCooldown.value || 2400)) } }));
  els.winnerCommentLinked?.addEventListener("change", () => savePatch({ winnerComment: { ...snapshot.config.winnerComment, voiceBotLinked: els.winnerCommentLinked.value === "true" } }));
  els.winnerCommentEnabled.addEventListener("change", () => savePatch({ winnerComment: { ...snapshot.config.winnerComment, enabled: els.winnerCommentEnabled.value === "true" } }));
  els.winnerCommentSeconds.addEventListener("change", () => savePatch({ winnerComment: { ...snapshot.config.winnerComment, waitSeconds: Math.max(5, Number(els.winnerCommentSeconds.value || 30)) } }));
  els.autoEnabled.addEventListener("change", () => savePatch({ auto: { ...snapshot.config.auto, enabled: els.autoEnabled.value === "true" } }));
  els.autoStartSeconds.addEventListener("change", () => savePatch({ auto: { ...snapshot.config.auto, startWaitSeconds: Math.max(5, Number(els.autoStartSeconds.value || 60)) } }));
  els.autoRestartSeconds.addEventListener("change", () => savePatch({ auto: { ...snapshot.config.auto, restartWaitSeconds: Math.max(5, Number(els.autoRestartSeconds.value || 180)) } }));
  els.entryMode.addEventListener("input", updateCommentRuleUI);
  els.commentMode.addEventListener("input", updateCommentRuleUI);
  els.commentText.addEventListener("input", updateCommentRuleUI);
  els.startBtn.addEventListener("click", startRoulette);
  els.stopBtnModal.addEventListener("click", stopRoulette);
  els.clearBtn.addEventListener("click", clearParticipants);
  els.resetBtn.addEventListener("click", resetRoulette);
}

window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    closeDrawer("participants");
    closeDrawer("theme");
    closeDrawer("settings");
  }
});

applyLocalBackground(ui.bg || "transparent");
activeSettingsTab = ui.activeTab || "logic";
renderAll();
if (!isEmbedPreview) socket.emit("roulette:getState");
if (!isEmbedPreview) setInterval(() => {
  if (snapshot.state.waitingComment?.active || (snapshot.config?.auto?.enabled && ((snapshot.state?.auto || {}).phase === "waiting_start" || (snapshot.state?.auto || {}).phase === "restarting"))) renderCenter();
}, 1000);
