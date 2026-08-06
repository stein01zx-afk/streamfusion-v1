const socket = io();

const STORAGE_KEY = "streamfusion.roulette.local.v1";
const DEFAULTS = {
  config: {
    enabled: true,
    mode: "baraja",
    platforms: { tiktok: true, twitch: true },
    audience: "all",
    participation: {
      entrySource: "viewers",
      viewerEntryMode: "none",
      commentEntryMode: "any",
      triggerText: "",
      allowMultiple: false,
      maxEntriesPerUser: 1,
      spamCooldownMs: 2400,
    },
    winnerComment: { enabled: true, waitSeconds: 30 },
    theme: {
      preset: "midnight",
      accent: "#9b5cff",
      accent2: "#22d3ee",
      accent3: "#f472b6",
      frame: "glass",
      showGrid: false,
    },
  },
  state: { status: "idle", participants: [], winner: null, waitingComment: null, spin: null, lastSpinAt: 0, history: [] },
};

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

const THEME_PRESET_MAP = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
const THEME_PRESET_ORDER = PRESETS.map((p) => p.id);

const els = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  center: document.getElementById("center"),
  playBtn: document.getElementById("playBtn"),
  stopBtn: document.getElementById("stopBtn"),
  participantsBtn: document.getElementById("participantsBtn"),
  themeBtn: document.getElementById("themeBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  participantsDrawer: document.getElementById("participantsDrawer"),
  participantsList: document.getElementById("participantsList"),
  closeParticipantsBtn: document.getElementById("closeParticipantsBtn"),
  themeModal: document.getElementById("themeModal"),
  closeThemeBtn: document.getElementById("closeThemeBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  presetScroller: document.getElementById("presetScroller"),
  accentColor: document.getElementById("accentColor"),
  accent2Color: document.getElementById("accent2Color"),
  accent3Color: document.getElementById("accent3Color"),
  localBackground: document.getElementById("localBackground"),
  frameStyle: document.getElementById("frameStyle"),
  audienceSwitches: document.getElementById("audienceSwitches"),
  platformSwitches: document.getElementById("platformSwitches"),
  entrySource: document.getElementById("entrySource"),
  entryModeLabel: document.getElementById("entryModeLabel"),
  viewerEntryModeField: document.getElementById("viewerEntryModeField"),
  viewerEntryMode: document.getElementById("viewerEntryMode"),
  commentEntryModeField: document.getElementById("commentEntryModeField"),
  commentEntryMode: document.getElementById("commentEntryMode"),
  triggerTextField: document.getElementById("triggerTextField"),
  triggerText: document.getElementById("triggerText"),
  applyTriggerTextBtn: document.getElementById("applyTriggerTextBtn"),
  allowMultiple: document.getElementById("allowMultiple"),
  maxEntries: document.getElementById("maxEntries"),
  spamCooldown: document.getElementById("spamCooldown"),
  winnerCommentEnabled: document.getElementById("winnerCommentEnabled"),
  winnerCommentSeconds: document.getElementById("winnerCommentSeconds"),
  statusSummary: document.getElementById("statusSummary"),
  startBtn: document.getElementById("startBtn"),
  stopBtnModal: document.getElementById("stopBtnModal"),
  clearBtn: document.getElementById("clearBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

let snapshot = safeClone(DEFAULTS);
let accountState = { tiktok: { connected: false, live: false }, twitch: { connected: false, live: false } };
let ui = loadLocalState();
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
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? mergeDeep({ bg: "transparent", activeTab: "logic", themePreset: "midnight" }, JSON.parse(raw)) : { bg: "transparent", activeTab: "logic", themePreset: "midnight" };
  } catch {
    return { bg: "transparent", activeTab: "logic", themePreset: "midnight" };
  }
}
function saveLocalState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ui)); } catch {}
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
function applyThemeVars() {
  const theme = currentTheme();
  const preset = ensureThemePreset(theme.preset || ui.themePreset || "midnight");
  const accent = theme.accent || preset.accent;
  const accent2 = theme.accent2 || preset.accent2;
  const accent3 = theme.accent3 || preset.accent3;
  document.documentElement.style.setProperty("--rf-accent", accent);
  document.documentElement.style.setProperty("--rf-accent-2", accent2);
  document.documentElement.style.setProperty("--rf-accent-3", accent3);
  document.documentElement.style.setProperty("--rf-gold", preset.id === "gold" ? "#d8b35a" : "#d8b35a");
  document.documentElement.style.setProperty("--rf-gold-2", preset.id === "gold" ? "#fff1bf" : "#f8e3a1");
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
function currentMode() { return snapshot.config.mode === "roulette" ? "roulette" : "baraja"; }
function isSpinning() { return snapshot.state.status === "spinning"; }
function isResult() { return snapshot.state.status === "result" && !!getWinner(); }


function getParticipationConfig() {
  const part = snapshot.config.participation || {};
  const entrySource = String(part.entrySource || (String(part.triggerMode || "text") === "all" ? "viewers" : "comment"));
  const viewerEntryMode = String(part.viewerEntryMode || (String(part.triggerMode || "text") === "all" ? "none" : "custom"));
  const commentEntryMode = String(part.commentEntryMode || "any");
  const triggerText = String(part.triggerText || "");
  return { entrySource, viewerEntryMode, commentEntryMode, triggerText };
}

function getActiveEntryMode(part = getParticipationConfig()) {
  return part.entrySource === "viewers" ? part.viewerEntryMode : part.commentEntryMode;
}

function usesCommentGate(part = getParticipationConfig()) {
  return (part.entrySource === "viewers" && part.viewerEntryMode !== "none") || part.entrySource === "comment";
}

function syncEntryModeVisibility() {
  const part = getParticipationConfig();
  if (els.viewerEntryModeField) els.viewerEntryModeField.hidden = part.entrySource !== "viewers";
  if (els.commentEntryModeField) els.commentEntryModeField.hidden = part.entrySource !== "comment";
  if (els.triggerTextField) els.triggerTextField.hidden = getActiveEntryMode(part) !== "custom";
  if (els.applyTriggerTextBtn) els.applyTriggerTextBtn.hidden = getActiveEntryMode(part) !== "custom";
  if (els.entryModeLabel) {
    els.entryModeLabel.textContent = part.entrySource === "viewers" ? "Modo de espectadores" : "Modo de comentario";
  }
}

function syncForm() {
  const cfg = snapshot.config || DEFAULTS.config;
  const theme = cfg.theme || DEFAULTS.config.theme;
  const part = getParticipationConfig();
  const preset = ensureThemePreset(theme.preset || ui.themePreset || "midnight");
  els.accentColor.value = theme.accent || preset.accent;
  els.accent2Color.value = theme.accent2 || preset.accent2;
  els.accent3Color.value = theme.accent3 || preset.accent3;
  els.localBackground.value = ui.bg || "transparent";
  els.frameStyle.value = theme.frame || "glass";
  els.entrySource.value = part.entrySource;
  els.viewerEntryMode.value = part.viewerEntryMode;
  els.commentEntryMode.value = part.commentEntryMode;
  els.triggerText.value = part.triggerText || "";
  els.allowMultiple.value = String(Boolean(cfg.participation?.allowMultiple));
  els.maxEntries.value = String(Math.max(1, Number(cfg.participation?.maxEntriesPerUser || 1)));
  els.spamCooldown.value = String(Math.max(500, Number(cfg.participation?.spamCooldownMs || 2400)));
  els.winnerCommentEnabled.value = String(cfg.winnerComment?.enabled !== false);
  els.winnerCommentSeconds.value = String(Math.max(5, Number(cfg.winnerComment?.waitSeconds || 30)));
  document.querySelectorAll("[data-tab]").forEach((btn) => btn.classList.toggle("active", String(btn.dataset.tab) === activeSettingsTab));
  document.querySelectorAll("[data-section]").forEach((section) => section.classList.toggle("active", String(section.dataset.section) === activeSettingsTab));
  document.querySelectorAll("[data-audience]").forEach((btn) => btn.classList.toggle("active", String(btn.dataset.audience) === String(cfg.audience || "all")));
  document.querySelectorAll("[data-platform]").forEach((btn) => btn.classList.toggle("active", Boolean(cfg.platforms?.[btn.dataset.platform])));
  document.querySelectorAll("[data-preset]").forEach((card) => card.classList.toggle("active", String(card.dataset.preset) === String(theme.preset || ui.themePreset || "midnight")));
  syncEntryModeVisibility();
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
function renderThemePresets() {
  els.presetScroller.innerHTML = PRESETS.map((preset) => `
    <button type="button" class="rf-themeCard ${String((currentTheme().preset || ui.themePreset || "midnight") === preset.id ? "active" : "")}" data-preset="${esc(preset.id)}">
      <div>
        <strong>${esc(preset.name)}</strong>
        <span>${esc(preset.desc)}</span>
      </div>
      <div class="rf-swatchRow">
        <span class="rf-swatch" style="background:${esc(preset.accent)}"></span>
        <span class="rf-swatch" style="background:${esc(preset.accent2)}"></span>
        <span class="rf-swatch" style="background:${esc(preset.accent3)}"></span>
      </div>
    </button>
  `).join("");
}
function renderWinnerCard() {
  const winner = getWinner();
  if (!winner) return `<div class="rf-core"><div><div class="rf-coreQuestion">?</div><span style="display:block;margin-top:6px;color:var(--rf-muted)">Centro listo</span></div></div>`;
  const name = participantLabel(winner);
  const handle = participantHandle(winner);
  const avatar = participantAvatar(winner);
  return `
    <div class="rf-winningWrap">
      <div class="rf-winningCard">
        <div class="rf-winningAvatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div class="rf-avatarFallback" style="font-size:42px">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div class="rf-winningLabel">${isResult() ? "👑 Ganador" : "👾 Participante"}</div>
        <div class="rf-winningTitle">${esc(name)}</div>
        <div class="rf-winningHandle">${esc(handle || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}</div>
      </div>
    </div>
  `;
}
function renderCommentPrompt() {
  const winner = getWinner();
  const waiting = getWaitingComment();
  const enabled = Boolean(snapshot.config.winnerComment?.enabled !== false);
  if (!winner || !enabled) return "";
  const hasComment = Boolean(String(winner.comment || "").trim());
  if (hasComment) {
    const name = participantLabel(winner);
    const handle = participantHandle(winner);
    return `
      <div class="rf-winningCommentMask show" style="top:20px;">
        <div class="bubbleAvatar">${winner.commentAvatar || winner.avatar ? `<img src="${esc(winner.commentAvatar || winner.avatar)}" alt="${esc(name)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div style="min-width:0;flex:1">
          <div class="bubbleTitle">Comentario del ganador</div>
          <div class="bubbleMain">${esc(winner.comment || "")}</div>
          <div class="bubbleMeta">${esc(name)} · ${esc(handle || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}</div>
        </div>
      </div>
    `;
  }
  if (!waiting?.active) return "";
  const secondsLeft = Math.max(0, Math.ceil((Number(waiting.expiresAt || 0) - Date.now()) / 1000));
  const startedAt = Number(waiting.startedAt || 0) || Date.now();
  const showPromptOnly = Date.now() - startedAt < 2200;
  return `
    <div class="rf-winningCommentMask show" style="top:20px;">
      <div class="bubbleAvatar">${winner.avatar ? `<img src="${esc(winner.avatar)}" alt="${esc(participantLabel(winner))}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:1000">${esc((participantLabel(winner)[0] || "U").toUpperCase())}</div>`}</div>
      <div style="min-width:0;flex:1">
        <div class="bubbleTitle">Por favor comenta</div>
        <div class="bubbleMain">${esc(participantLabel(winner))}</div>
        <div class="bubbleMeta">${esc(participantHandle(winner) || (winner.platform === "twitch" ? "Twitch" : "TikTok"))}</div>
        ${showPromptOnly ? "" : `<div class="rf-countdown"><span>Tiempo restante</span><strong>${secondsLeft}</strong></div>`}
      </div>
    </div>
  `;
}
function renderBaraja() {
  const participants = getParticipants();
  if (isResult() && getWinner()) {
    return `${renderWinnerCard()}${renderCommentPrompt()}`;
  }
  if (!participants.length) {
    return `
      <div class="rf-emptyGrid">
        <div class="rf-placeholderCard"><span>?</span></div>
        <div class="rf-placeholderCard"><span>?</span></div>
        <div class="rf-placeholderCard"><span>?</span></div>
        <div class="rf-placeholderCard"><span>?</span></div>
      </div>
    `;
  }
  const repeated = Array.from({ length: 7 }, () => participants).flat();
  const winner = getWinner();
  const targetKey = snapshot.state.spin?.target || winner?.key || null;
  return `
    <div class="rf-deck">
      <div class="rf-trackViewport">
        <div class="rf-track" id="rfTrack">
          ${repeated.map((p, index) => {
            const name = participantLabel(p);
            const handle = participantHandle(p);
            const avatar = participantAvatar(p);
            const isWinnerCard = Boolean(winner && winner.key === p.key);
            return `
              <div class="rf-card ${isWinnerCard ? "is-winner" : ""}" data-key="${esc(p.key || `${index}`)}">
                <div class="rf-cardMain">
                  <div class="rf-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div class="rf-avatarFallback">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
                </div>
                <div class="rf-cardFoot">
                  <div class="rf-cardName">${esc(name)}</div>
                  <div class="rf-cardHandle">${esc(handle || (p.platform === "twitch" ? "Twitch" : "TikTok"))}</div>
                  <div class="rf-cardRole"><span class="badge">${isWinnerCard ? "👑 Ganador" : "👾 Participante"}</span>${p.count > 1 ? `<span class="badge">x${esc(p.count)}</span>` : ""}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
      ${winner ? renderWinnerCard() : ""}
      ${renderCommentPrompt()}
    </div>
  `;
}
function renderRoulette() {
  const participants = getParticipants();
  if (isResult() && getWinner()) {
    return `${renderWheel(participants, true)}${renderWinnerCard()}${renderCommentPrompt()}`;
  }
  return `${renderWheel(participants, false)}${renderCommentPrompt()}`;
}
function renderWheel(participants, dimmed) {
  const total = Math.max(1, participants.length || 1);
  const winner = getWinner();
  const slice = 360 / total;
  const labels = participants.length ? participants : [{ key: "placeholder", displayName: "?", uniqueId: "?" }];
  return `
    <div class="rf-wheelWrap" style="opacity:${dimmed ? .18 : 1};transform:${dimmed ? "scale(.92)" : "none"};">
      <div class="rf-pointer"></div>
      <div class="rf-wheel" id="rfWheel">
        ${labels.map((p, index) => {
          const name = participantLabel(p);
          const angle = index * slice + slice / 2;
          return `<div class="rf-wheelLabel" style="transform:rotate(${angle}deg) translateY(calc(-1 * min(34vw, 270px))) rotate(${-angle}deg)">${esc(name)}</div>`;
        }).join("")}
      </div>
      <div class="rf-core" id="rfCore">
        <div>
          <div class="rf-coreQuestion">${participants.length ? (winner ? "👑" : "") : "?"}</div>
          <strong>${participants.length ? (winner ? "Ganador" : "Ruleta") : ""}</strong>
          <span>${participants.length ? (winner ? participantLabel(winner) : `${participants.length} participantes`) : ""}</span>
        </div>
      </div>
    </div>
  `;
}
function renderCenter() {
  els.center.innerHTML = currentMode() === "roulette" ? renderRoulette() : renderBaraja();
  if (currentMode() === "baraja" && getParticipants().length && !isResult()) {
    requestAnimationFrame(() => {
      const track = document.getElementById("rfTrack");
      const viewport = track?.parentElement;
      const spin = snapshot.state.spin;
      if (!track || !viewport || !spin) return;
      const repeated = Array.from({ length: 7 }, () => getParticipants()).flat();
      const targetIndex = repeated.findIndex((p, idx) => idx > getParticipants().length * 4 && p.key === spin.target);
      if (targetIndex < 0) return;
      const targetCard = track.children[targetIndex];
      if (!targetCard) return;
      const offset = Math.max(0, targetCard.offsetLeft + targetCard.offsetWidth / 2 - viewport.clientWidth / 2);
      track.style.transform = `translateX(${-offset}px)`;
    });
  }
  if (currentMode() === "roulette" && getParticipants().length && snapshot.state.spin) {
    requestAnimationFrame(() => {
      const wheel = document.getElementById("rfWheel");
      const participants = getParticipants();
      const targetIndex = participants.findIndex((p) => p.key === snapshot.state.spin?.target);
      const slice = 360 / Math.max(1, participants.length);
      const finalRotation = 360 * 6 + (360 - ((targetIndex < 0 ? 0 : targetIndex) + 0.5) * slice);
      if (wheel) wheel.style.transform = `rotate(${finalRotation}deg)`;
    });
  }
}
function renderStatusSummary() {
  const cfg = snapshot.config || DEFAULTS.config;
  const part = getParticipationConfig();
  const audience = cfg.audience === "followers" ? "Seguidores" : cfg.audience === "donors" ? "Donadores" : cfg.audience === "likers" ? "Likers" : "Todos espectadores";
  const multi = cfg.participation?.allowMultiple ? `Múltiples (${Math.max(1, Number(cfg.participation?.maxEntriesPerUser || 1))})` : "Una participación";
  const sourceLabel = part.entrySource === "viewers" ? "Espectadores" : "Comentarios";
  const mode = getActiveEntryMode(part);
  const modeLabel = part.entrySource === "viewers"
    ? (mode === "none" ? "sin comentario" : mode === "any" ? "con comentario" : `comentario personalizado: ${part.triggerText || "personalizado"}`)
    : (mode === "any" ? "cualquier comentario" : `comentario personalizado: ${part.triggerText || "vacío"}`);
  const freshness = usesCommentGate(part) && Number(snapshot.state?.participationStartedAt || 0)
    ? `desde ${new Date(Number(snapshot.state.participationStartedAt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  els.statusSummary.textContent = `${sourceLabel} · ${modeLabel}${freshness ? ` · ${freshness}` : ""} · ${audience} · ${multi}`;
}
function renderAll() {

  applyThemeVars();
  applyLocalBackground(ui.bg || "transparent");
  renderTop();
  renderParticipantsList();
  renderThemePresets();
  renderCenter();
  renderStatusSummary();
  syncForm();
}

function savePatch(patch) {
  snapshot.config = mergeDeep(snapshot.config, patch || {});
  socket.emit("roulette:update", patch || {});
  renderAll();
}
function saveThemePatch(patch) {
  const theme = mergeDeep(currentTheme(), patch || {});
  savePatch({ theme });
}
function setPreset(id) {
  const preset = ensureThemePreset(id);
  ui.themePreset = preset.id;
  saveLocalState();
  saveThemePatch({ preset: preset.id, accent: preset.accent, accent2: preset.accent2, accent3: preset.accent3 });
}
function openDrawer(which) {
  if (which === "participants") {
    els.participantsDrawer.classList.add("show");
    els.participantsDrawer.setAttribute("aria-hidden", "false");
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
  } else if (which === "theme") {
    els.themeModal.classList.remove("show");
    els.themeModal.setAttribute("aria-hidden", "true");
  } else if (which === "settings") {
    els.settingsModal.classList.remove("show");
    els.settingsModal.setAttribute("aria-hidden", "true");
  }
}
function startRoulette() { socket.emit("roulette:start"); }
function stopRoulette() { socket.emit("roulette:stop"); }
function clearParticipants() { socket.emit("roulette:clearParticipants"); }
function resetRoulette() { socket.emit("roulette:reset"); }


function saveParticipationPatch(partial = {}) {
  const current = snapshot.config.participation || {};
  const merged = { ...current, ...partial };
  merged.entrySource = String(merged.entrySource || getParticipationConfig().entrySource || "viewers");
  merged.viewerEntryMode = String(merged.viewerEntryMode || "none");
  merged.commentEntryMode = String(merged.commentEntryMode || "any");
  merged.triggerText = String(merged.triggerText || "");
  merged.triggerMode = merged.entrySource === "viewers" && merged.viewerEntryMode === "none" ? "all" : "text";
  savePatch({ participation: merged });
}

function syncCountDown() {
  const waiting = getWaitingComment();
  if (!waiting?.active) {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    renderCenter();
    return;
  }
  if (!countdownTimer) countdownTimer = setInterval(syncCountDown, 1000);
  renderCenter();
}

function buildThemeCards() {
  els.presetScroller.querySelectorAll("[data-preset]").forEach((btn) => btn.classList.toggle("active", String(btn.dataset.preset) === String(currentTheme().preset || ui.themePreset || "midnight")));
}

socket.on("connect", () => socket.emit("roulette:getState"));
socket.on("roulette:sync", (data) => {
  pushSnapshot(mergeDeep(safeClone(DEFAULTS), data || {}));
  if (snapshot.state.waitingComment?.active) {
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
socket.on("roulette:error", (data) => {
  els.statusSummary.textContent = String(data?.message || "No se pudo iniciar la ruleta.");
});
socket.on("accountState", (data) => {
  if (!data?.platform) return;
  accountState[String(data.platform)] = { connected: Boolean(data.connected), live: Boolean(data.live) };
  setConnectionDot();
});
socket.on("disconnect", setConnectionDot);

els.playBtn.addEventListener("click", startRoulette);
els.stopBtn.addEventListener("click", stopRoulette);
els.participantsBtn.addEventListener("click", () => openDrawer("participants"));
els.themeBtn.addEventListener("click", () => openDrawer("theme"));
els.settingsBtn.addEventListener("click", () => openDrawer("settings"));
els.closeParticipantsBtn.addEventListener("click", () => closeDrawer("participants"));
els.closeThemeBtn.addEventListener("click", () => closeDrawer("theme"));
els.closeSettingsBtn.addEventListener("click", () => closeDrawer("settings"));
els.participantsDrawer.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "participants") closeDrawer("participants"); });
els.themeModal.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "theme") closeDrawer("theme"); });
els.settingsModal.addEventListener("click", (ev) => { if (ev.target?.dataset?.close === "settings") closeDrawer("settings"); });

document.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
  activeSettingsTab = String(btn.dataset.tab || "logic");
  ui.activeTab = activeSettingsTab;
  saveLocalState();
  syncForm();
}));

document.querySelectorAll("[data-preset]").forEach((btn) => btn.addEventListener("click", () => setPreset(String(btn.dataset.preset))));
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

actionListeners();
function actionListeners() {
  els.accentColor.addEventListener("input", () => saveThemePatch({ accent: els.accentColor.value }));
  els.accent2Color.addEventListener("input", () => saveThemePatch({ accent2: els.accent2Color.value }));
  els.accent3Color.addEventListener("input", () => saveThemePatch({ accent3: els.accent3Color.value }));
  els.frameStyle.addEventListener("change", () => saveThemePatch({ frame: els.frameStyle.value }));
  els.localBackground.addEventListener("change", () => applyLocalBackground(els.localBackground.value));
  els.entrySource.addEventListener("change", () => {
    const entrySource = els.entrySource.value === "comment" ? "comment" : "viewers";
    const next = { ...snapshot.config.participation, entrySource };
    if (entrySource === "viewers") {
      next.viewerEntryMode = els.viewerEntryMode.value || "none";
    } else {
      next.commentEntryMode = els.commentEntryMode.value || "any";
    }
    saveParticipationPatch(next);
  });
  els.viewerEntryMode.addEventListener("change", () => {
    saveParticipationPatch({ viewerEntryMode: els.viewerEntryMode.value, entrySource: "viewers" });
  });
  els.commentEntryMode.addEventListener("change", () => {
    saveParticipationPatch({ commentEntryMode: els.commentEntryMode.value, entrySource: "comment" });
  });
  if (els.applyTriggerTextBtn) {
    els.applyTriggerTextBtn.addEventListener("click", () => saveParticipationPatch({ triggerText: String(els.triggerText.value || "").trim() }));
  }
  els.allowMultiple.addEventListener("change", () => saveParticipationPatch({ allowMultiple: els.allowMultiple.value === "true" }));
  els.maxEntries.addEventListener("change", () => saveParticipationPatch({ maxEntriesPerUser: Math.max(1, Number(els.maxEntries.value || 1)) }));
  els.spamCooldown.addEventListener("change", () => saveParticipationPatch({ spamCooldownMs: Math.max(500, Number(els.spamCooldown.value || 2400)) }));
  els.winnerCommentEnabled.addEventListener("change", () => savePatch({ winnerComment: { ...snapshot.config.winnerComment, enabled: els.winnerCommentEnabled.value === "true" } }));
  els.winnerCommentSeconds.addEventListener("change", () => savePatch({ winnerComment: { ...snapshot.config.winnerComment, waitSeconds: Math.max(5, Number(els.winnerCommentSeconds.value || 30)) } }));
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
syncEntryModeVisibility();
renderAll();
socket.emit("roulette:getState");
setInterval(() => {
  if (snapshot.state.waitingComment?.active) renderCenter();
}, 1000);
