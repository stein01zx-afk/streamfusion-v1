const socket = io();
const STORAGE_KEY = "streamfusion.roulette.ui.v1";

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
    winnerComment: {
      enabled: true,
      waitSeconds: 30,
    },
    theme: {
      accent: "#9b5cff",
      accent2: "#22d3ee",
      accent3: "#f472b6",
      frame: "glass",
      background: "transparent",
      showGrid: true,
    },
  },
  state: {
    status: "idle",
    participants: [],
    winner: null,
    waitingComment: null,
    spin: null,
    lastSpinAt: 0,
    history: [],
  },
};

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
const safeClone = (value) => {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value ?? null)); }
};
const mergeDeep = (base, incoming) => {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const out = { ...base };
  for (const key of Object.keys(incoming)) out[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
  return out;
};
const normalizeText = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const palette = ["#9b5cff", "#22d3ee", "#f472b6", "#f59e0b", "#34d399", "#60a5fa", "#ef4444", "#f5d063"];

const els = {
  statusDot: $("statusDot"),
  headline: $("headline"),
  chipMode: $("chipMode"),
  chipAudience: $("chipAudience"),
  chipCount: $("chipCount"),
  view: $("view"),
  emptyState: $("emptyState"),
  footerText: $("footerText"),
  winnerName: $("winnerName"),
  winnerMeta: $("winnerMeta"),
  winnerAvatar: $("winnerAvatar"),
  participants: $("participants"),
  winnerCommentCard: $("winnerCommentCard"),
  winnerCommentAvatar: $("winnerCommentAvatar"),
  winnerCommentName: $("winnerCommentName"),
  winnerCommentMeta: $("winnerCommentMeta"),
  winnerCommentText: $("winnerCommentText"),
  commentTimerChip: $("commentTimerChip"),
  statusSummary: $("statusSummary"),
  modal: $("modal"),
  modalTitle: $("modalTitle"),
  modalDesc: $("modalDesc"),
  themeBtn: $("themeBtn"),
  settingsBtn: $("settingsBtn"),
  closeModalBtn: $("closeModalBtn"),
  startBtn: $("startBtn"),
  clearBtn: $("clearBtn"),
  resetBtn: $("resetBtn"),
  syncBtn: $("syncBtn"),
  modeSwitches: $("modeSwitches"),
  audienceSwitches: $("audienceSwitches"),
  platformSwitches: $("platformSwitches"),
  accentColor: $("accentColor"),
  accent2Color: $("accent2Color"),
  accent3Color: $("accent3Color"),
  backgroundMode: $("backgroundMode"),
  frameStyle: $("frameStyle"),
  showGrid: $("showGrid"),
  triggerMode: $("triggerMode"),
  triggerText: $("triggerText"),
  allowMultiple: $("allowMultiple"),
  maxEntries: $("maxEntries"),
  spamCooldown: $("spamCooldown"),
  winnerCommentEnabled: $("winnerCommentEnabled"),
  winnerCommentSeconds: $("winnerCommentSeconds"),
  modeTabButtons: [...document.querySelectorAll("[data-tab]")],
  sections: [...document.querySelectorAll("[data-section]")],
};

let snapshot = safeClone(DEFAULTS);
let accountState = { tiktok: { connected: false, live: false }, twitch: { connected: false, live: false } };
let ui = loadUI();
let spinAnimationTimer = null;
let countdownTimer = null;
let commentTimer = null;
let activeTab = "theme";
let autoThemeMode = "baraja";

function loadUI() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? mergeDeep({ modalTab: "theme" }, JSON.parse(raw)) : { modalTab: "theme" };
  } catch {
    return { modalTab: "theme" };
  }
}
function saveUI() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ui)); } catch {}
}
function savePatch(patch) {
  snapshot.config = mergeDeep(snapshot.config, patch || {});
  socket.emit("roulette:update", patch || {});
  render();
}
function openModal(tab = "theme") {
  activeTab = tab;
  ui.modalTab = tab;
  saveUI();
  els.modal.classList.add("show");
  els.modal.setAttribute("aria-hidden", "false");
  syncTabs();
}
function closeModal() {
  els.modal.classList.remove("show");
  els.modal.setAttribute("aria-hidden", "true");
}
function syncTabs() {
  els.modeTabButtons.forEach((btn) => btn.classList.toggle("active", String(btn.dataset.tab || "") === activeTab));
  els.sections.forEach((section) => section.classList.toggle("active", String(section.dataset.section || "") === activeTab));
  els.modalTitle.textContent = activeTab === "theme" ? "Tema de la ruleta" : "Ajustes de la ruleta";
  els.modalDesc.textContent = activeTab === "theme"
    ? "Ajusta colores, fondo y modo de visualización."
    : "Configura quién entra, cómo se participa y cómo se revela el ganador.";
}
function connectionInfo() {
  const anyConnected = Boolean(accountState.tiktok?.connected || accountState.twitch?.connected);
  const anyLive = Boolean((accountState.tiktok?.connected && accountState.tiktok?.live) || (accountState.twitch?.connected && accountState.twitch?.live));
  if (anyLive) return { cls: "live", text: "En directo" };
  if (anyConnected) return { cls: "waiting", text: "Conectado" };
  return { cls: "", text: "Desconectado" };
}
function updateConnectionDot() {
  const info = connectionInfo();
  els.statusDot.className = `rf-status ${info.cls}`.trim();
  els.statusDot.title = info.text;
}
function setThemeVars() {
  const theme = snapshot.config.theme || {};
  document.documentElement.style.setProperty("--rf-accent", theme.accent || "#9b5cff");
  document.documentElement.style.setProperty("--rf-accent-2", theme.accent2 || "#22d3ee");
  document.documentElement.style.setProperty("--rf-accent-3", theme.accent3 || "#f472b6");
  document.documentElement.style.setProperty("--rf-bg", theme.background === "solid" ? "#0f1118" : "#090b16");
  document.documentElement.style.setProperty("--rf-panel", theme.background === "solid" ? "rgba(14,18,31,.95)" : "rgba(10,14,28,.70)");
  document.documentElement.style.setProperty("--rf-line", theme.frame === "solid" ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.10)");
}
function resolveParticipants() {
  return Array.isArray(snapshot.state.participants) ? snapshot.state.participants.slice() : [];
}
function participantLabel(participant) {
  return participant.displayName || participant.user || participant.username || participant.uniqueId || "Usuario";
}
function participantHandle(participant) {
  const handle = participant.uniqueId || participant.username || participant.user || "";
  return handle ? `@${String(handle).replace(/^@+/, "")}` : "";
}
function participantAvatar(participant) {
  return String(participant.avatar || "").trim();
}
function getWinner() {
  return snapshot.state.winner || null;
}
function getWaitingComment() {
  return snapshot.state.waitingComment || null;
}
function renderChips() {
  els.chipMode.innerHTML = `<strong>Modo</strong> ${snapshot.config.mode === "roulette" ? "Ruleta" : "Baraja"}`;
  const audienceLabel = snapshot.config.audience === "followers" ? "Solo seguidores 👤" : snapshot.config.audience === "donors" ? "Solo donadores 🎁" : "Todos";
  els.chipAudience.innerHTML = `<strong>Participan</strong> ${audienceLabel}`;
  els.chipCount.innerHTML = `<strong>Entradas</strong> ${resolveParticipants().length}`;
}
function renderFooter() {
  const cfg = snapshot.config;
  const trigger = String(cfg.participation?.triggerMode || "text") === "all"
    ? "Todo el chat participa"
    : `Escribe \"${cfg.participation?.triggerText || "1"}\" para participar`;
  const multiple = cfg.participation?.allowMultiple ? `Múltiples entradas activas` : `Una entrada por usuario`;
  const platforms = [cfg.platforms?.tiktok ? "TikTok" : null, cfg.platforms?.twitch ? "Twitch" : null].filter(Boolean).join(" · ") || "Sin plataformas";
  els.footerText.innerHTML = `
    <span><strong>Regla:</strong> ${esc(trigger)}</span>
    <span><strong>Spam:</strong> ${esc(multiple)}</span>
    <span><strong>Plataformas:</strong> ${esc(platforms)}</span>
  `;
}
function renderParticipantsList() {
  const participants = resolveParticipants();
  if (!participants.length) {
    els.participants.innerHTML = `<div class="rf-mini"><div class="avatar"></div><div><strong>Sin participantes</strong><span>Los comentarios válidos aparecerán aquí.</span></div></div>`;
    return;
  }
  els.participants.innerHTML = participants.map((p) => {
    const name = participantLabel(p);
    const handle = participantHandle(p);
    const avatar = participantAvatar(p);
    return `
      <div class="rf-mini">
        <div class="avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;background:rgba(255,255,255,.06)">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        <div><strong>${esc(name)}</strong><span>${esc(handle || (p.platform === "twitch" ? "Twitch" : "TikTok"))}</span></div>
        <div class="count">×${esc(p.count || p.entries || 1)}</div>
      </div>
    `;
  }).join("");
}
function renderWinner() {
  const winner = getWinner();
  if (!winner) {
    els.winnerName.textContent = "—";
    els.winnerMeta.textContent = "Aún no hay ganador.";
    els.winnerAvatar.src = "";
    els.winnerAvatar.alt = "Avatar ganador";
    return;
  }
  const name = participantLabel(winner);
  const handle = participantHandle(winner);
  els.winnerName.textContent = name;
  els.winnerMeta.textContent = `Ganador: ${name} · Canal: ${handle || (winner.platform === "twitch" ? "Twitch" : "TikTok")}`;
  if (participantAvatar(winner)) els.winnerAvatar.src = participantAvatar(winner);
  else els.winnerAvatar.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0b1020"/><text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="64" font-weight="700" fill="#fff">${(name[0] || "U").toUpperCase()}</text></svg>`)}`;
}
function renderComment() {
  const waiting = getWaitingComment();
  const winner = getWinner();
  const visible = Boolean(winner && waiting && waiting.active && snapshot.config.winnerComment?.enabled !== false);
  els.winnerCommentCard.classList.toggle("show", visible);
  if (!visible) {
    els.winnerCommentMeta.textContent = winner ? "El comentario del ganador se mostrará aquí si aparece durante la espera." : "";
    els.winnerCommentText.textContent = "";
    return;
  }
  const secondsLeft = Math.max(0, Math.ceil((Number(waiting.expiresAt || 0) - Date.now()) / 1000));
  els.commentTimerChip.textContent = `⏳ ${secondsLeft}s`;
  els.winnerCommentName.textContent = participantLabel(winner);
  els.winnerCommentMeta.textContent = `Esperando el siguiente comentario del ganador · ${participantHandle(winner) || (winner.platform === "twitch" ? "Twitch" : "TikTok")}`;
  els.winnerCommentAvatar.src = participantAvatar(winner) || els.winnerAvatar.src || "";
  els.winnerCommentText.textContent = winner.comment || "";
}
function renderPrompt() {
  const cfg = snapshot.config;
  const modeText = cfg.mode === "roulette" ? "Ruleta" : "Baraja";
  const participants = resolveParticipants();
  const waiting = getWaitingComment();
  if (snapshot.state.status === "spinning") {
    els.headline.textContent = `Girando con ${participants.length} participante${participants.length === 1 ? "" : "s"}…`;
  } else if (snapshot.state.status === "result" && getWinner()) {
    els.headline.textContent = waiting?.active ? `Ganador listo. Esperando su comentario…` : `Ganador revelado.`;
  } else if (cfg.participation?.triggerMode === "text") {
    els.headline.textContent = `Escribe "${cfg.participation?.triggerText || "1"}" en el chat para participar.`;
  } else {
    els.headline.textContent = `La ruleta reúne participantes desde el chat.`;
  }
  els.statusSummary.textContent = `${modeText} · ${participants.length} participantes · ${waiting?.active ? `comentario en espera (${Math.max(0, Math.ceil((Number(waiting.expiresAt || 0) - Date.now()) / 1000))}s)` : snapshot.state.status}`;
}
function renderModeSwitches() {
  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.classList.toggle("active", String(btn.dataset.mode || "") === String(snapshot.config.mode || "baraja"));
  });
}
function renderAudienceSwitches() {
  document.querySelectorAll("[data-audience]").forEach((btn) => {
    btn.classList.toggle("active", String(btn.dataset.audience || "") === String(snapshot.config.audience || "all"));
  });
}
function renderPlatformSwitches() {
  document.querySelectorAll("[data-platform]").forEach((btn) => {
    const platform = String(btn.dataset.platform || "tiktok");
    btn.classList.toggle("active", Boolean(snapshot.config.platforms?.[platform]));
  });
}
function syncForm() {
  const cfg = snapshot.config;
  els.accentColor.value = cfg.theme?.accent || "#9b5cff";
  els.accent2Color.value = cfg.theme?.accent2 || "#22d3ee";
  els.accent3Color.value = cfg.theme?.accent3 || "#f472b6";
  els.backgroundMode.value = cfg.theme?.background || "transparent";
  els.frameStyle.value = cfg.theme?.frame || "glass";
  els.showGrid.value = String(cfg.theme?.showGrid !== false);
  els.triggerMode.value = cfg.participation?.triggerMode || "text";
  els.triggerText.value = cfg.participation?.triggerText || "1";
  els.allowMultiple.value = String(Boolean(cfg.participation?.allowMultiple));
  els.maxEntries.value = String(Math.max(1, Number(cfg.participation?.maxEntriesPerUser || 1)));
  els.spamCooldown.value = String(Math.max(500, Number(cfg.participation?.spamCooldownMs || 2400)));
  els.winnerCommentEnabled.value = String(cfg.winnerComment?.enabled !== false);
  els.winnerCommentSeconds.value = String(Math.max(5, Number(cfg.winnerComment?.waitSeconds || 30)));
  renderModeSwitches();
  renderAudienceSwitches();
  renderPlatformSwitches();
}
function renderWheel(participants) {
  const total = Math.max(1, participants.length);
  const theme = snapshot.config.theme || {};
  const wheelWrap = document.createElement("div");
  wheelWrap.className = "rf-wheel-wrap";
  const wheel = document.createElement("div");
  wheel.className = "rf-wheel";
  const pointer = document.createElement("div");
  pointer.className = "rf-pointer";
  const core = document.createElement("div");
  core.className = "rf-core";
  const winner = getWinner();
  core.innerHTML = winner ? `<div><strong>Ganador</strong><span>${esc(participantLabel(winner))}</span></div>` : `<div><strong>Ruleta</strong><span>${esc(participants.length ? `${participants.length} participantes` : "Esperando…")}</span></div>`;
  const slice = 360 / total;
  participants.forEach((p, index) => {
    const label = document.createElement("div");
    label.className = "rf-wheel-label";
    const angle = index * slice + slice / 2;
    label.style.transform = `rotate(${angle}deg) translateY(calc(-1 * min(34vw, 260px))) rotate(${-angle}deg)`;
    label.style.setProperty("--rf-card-a", index % 2 === 0 ? theme.accent : theme.accent2);
    label.style.setProperty("--rf-card-b", index % 3 === 0 ? theme.accent3 : theme.accent2);
    label.textContent = participantLabel(p);
    wheel.appendChild(label);
  });
  wheelWrap.append(pointer, wheel, core);
  return wheelWrap;
}
function renderDeck(participants) {
  const wrap = document.createElement("div");
  wrap.className = "rf-deck";
  const viewport = document.createElement("div");
  viewport.className = "rf-track-viewport";
  const track = document.createElement("div");
  track.className = "rf-track";
  const repeated = participants.length ? Array.from({ length: 7 }, () => participants).flat() : [];
  const winner = getWinner();
  repeated.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "rf-card";
    card.dataset.key = p.key || `${index}`;
    card.style.setProperty("--rf-card-a", index % 2 === 0 ? snapshot.config.theme?.accent || "#9b5cff" : snapshot.config.theme?.accent2 || "#22d3ee");
    card.style.setProperty("--rf-card-b", index % 3 === 0 ? snapshot.config.theme?.accent3 || "#f472b6" : snapshot.config.theme?.accent2 || "#22d3ee");
    const name = participantLabel(p);
    const handle = participantHandle(p);
    const avatar = participantAvatar(p);
    card.innerHTML = `
      <div class="rf-card-main">
        <div>
          <div class="rf-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}">` : `<div class="rf-avatarFallback">${esc((name[0] || "U").toUpperCase())}</div>`}</div>
        </div>
      </div>
      <div class="rf-card-foot">
        <div class="rf-card-name">${esc(name)}</div>
        <div class="rf-card-handle">${esc(handle || (p.platform === "twitch" ? "Twitch" : "TikTok"))}</div>
        <div class="rf-card-flag">${p.platform === "twitch" ? "🟣" : "🎵"}${p.count > 1 ? ` · x${esc(p.count)}` : ""}${winner && winner.key === p.key ? " · GANADOR" : ""}</div>
      </div>
    `;
    if (winner && winner.key === p.key) card.classList.add("is-winner");
    track.appendChild(card);
  });
  viewport.appendChild(track);
  wrap.appendChild(viewport);
  requestAnimationFrame(() => {
    const current = snapshot.state.spin;
    if (current?.target && participants.length) {
      const targetIndex = repeated.findIndex((p, idx) => idx > participants.length * 4 && p.key === current.target);
      if (targetIndex >= 0) {
        const targetCard = track.children[targetIndex];
        if (targetCard) {
          const targetOffset = Math.max(0, targetCard.offsetLeft + targetCard.offsetWidth / 2 - viewport.clientWidth / 2);
          track.style.transform = `translateX(${-targetOffset}px)`;
        }
      }
    } else {
      track.style.transform = "translateX(0px)";
    }
  });
  return wrap;
}
function renderEmptyParticipants() {
  const empty = document.createElement("div");
  empty.className = "rf-empty-state";
  empty.innerHTML = `<div><strong>Sin participantes</strong><span>Cuando el chat cumpla la regla, la lista se llenará sola.</span></div>`;
  return empty;
}
function renderView() {
  const participants = resolveParticipants();
  els.view.innerHTML = "";
  els.view.dataset.mode = snapshot.config.mode || "baraja";
  els.emptyState.hidden = participants.length > 0;
  if (!participants.length) {
    if (snapshot.config.mode === "roulette") els.view.appendChild(renderWheel([]));
    else els.view.appendChild(renderDeck([]));
    return;
  }
  els.view.appendChild(snapshot.config.mode === "roulette" ? renderWheel(participants) : renderDeck(participants));
}
function render() {
  setThemeVars();
  renderChips();
  renderFooter();
  renderParticipantsList();
  renderWinner();
  renderPrompt();
  renderComment();
  renderView();
  syncForm();
  updateConnectionDot();
}
function pushSnapshot(next) {
  snapshot = mergeDeep(safeClone(DEFAULTS), next || {});
  render();
}
function updateCountdown() {
  const waiting = getWaitingComment();
  if (!waiting?.active) return renderComment();
  const secondsLeft = Math.max(0, Math.ceil((Number(waiting.expiresAt || 0) - Date.now()) / 1000));
  if (els.commentTimerChip) els.commentTimerChip.textContent = `⏳ ${secondsLeft}s`;
  renderPrompt();
  if (secondsLeft <= 0) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}
function spinRail() {
  if (spinAnimationTimer) {
    clearTimeout(spinAnimationTimer);
    spinAnimationTimer = null;
  }
  const current = snapshot.state.spin;
  if (!current) return;
  const participants = resolveParticipants();
  if (!participants.length) return;
  if (snapshot.config.mode === "roulette") {
    const wheel = els.view.querySelector(".rf-wheel");
    if (!wheel) return;
    const targetIndex = participants.findIndex((p) => p.key === current.target);
    const slice = 360 / participants.length;
    const finalRotation = 360 * 6 + (360 - ((targetIndex < 0 ? 0 : targetIndex) + 0.5) * slice);
    wheel.style.transform = `rotate(${finalRotation}deg)`;
    spinAnimationTimer = setTimeout(() => {
      wheel.style.transform = `rotate(${finalRotation}deg)`;
    }, current.durationMs + 30);
  } else {
    const track = els.view.querySelector(".rf-track");
    const viewport = els.view.querySelector(".rf-track-viewport");
    if (!track || !viewport) return;
    const repeated = Array.from({ length: 7 }, () => participants).flat();
    const targetIndex = repeated.findIndex((p, idx) => idx > participants.length * 4 && p.key === current.target);
    if (targetIndex < 0) return;
    const targetCard = track.children[targetIndex];
    if (!targetCard) return;
    const targetOffset = Math.max(0, targetCard.offsetLeft + targetCard.offsetWidth / 2 - viewport.clientWidth / 2);
    track.style.transform = `translateX(0px)`;
    track.getBoundingClientRect();
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${-targetOffset}px)`;
    });
  }
}

socket.on("connect", () => socket.emit("roulette:getState"));
socket.on("roulette:sync", (data) => {
  pushSnapshot(mergeDeep(safeClone(DEFAULTS), data || {}));
  if (snapshot.state.status === "spinning") spinRail();
  if (snapshot.state.waitingComment?.active) {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(updateCountdown, 1000);
    updateCountdown();
  } else if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
socket.on("roulette:spin", () => {
  spinRail();
});
socket.on("roulette:error", (data) => {
  const message = String(data?.message || "No se pudo iniciar la ruleta.");
  els.statusSummary.textContent = message;
});
socket.on("accountState", (data) => {
  if (!data?.platform) return;
  accountState[String(data.platform || "tiktok")] = {
    connected: Boolean(data.connected),
    live: Boolean(data.live),
  };
  updateConnectionDot();
});
socket.on("disconnect", () => updateConnectionDot());

function applyThemePatch() {
  savePatch({ theme: { accent: els.accentColor.value, accent2: els.accent2Color.value, accent3: els.accent3Color.value, background: els.backgroundMode.value, frame: els.frameStyle.value, showGrid: els.showGrid.value === "true" } });
}
function applySettingsPatch() {
  savePatch({
    mode: els.modeSwitches.querySelector(".rf-switch.active")?.dataset.mode || snapshot.config.mode || "baraja",
    audience: els.audienceSwitches.querySelector(".rf-switch.active")?.dataset.audience || snapshot.config.audience || "all",
    platforms: {
      tiktok: Boolean(els.platformSwitches.querySelector('[data-platform="tiktok"]')?.classList.contains("active")),
      twitch: Boolean(els.platformSwitches.querySelector('[data-platform="twitch"]')?.classList.contains("active")),
    },
    participation: {
      triggerMode: els.triggerMode.value,
      triggerText: normalizeText(els.triggerText.value || "1"),
      allowMultiple: els.allowMultiple.value === "true",
      maxEntriesPerUser: Math.max(1, Number(els.maxEntries.value || 1)),
      spamCooldownMs: Math.max(500, Number(els.spamCooldown.value || 2400)),
    },
    winnerComment: {
      enabled: els.winnerCommentEnabled.value === "true",
      waitSeconds: Math.max(5, Number(els.winnerCommentSeconds.value || 30)),
    },
  });
}

els.themeBtn.addEventListener("click", () => openModal("theme"));
els.settingsBtn.addEventListener("click", () => openModal("settings"));
els.closeModalBtn.addEventListener("click", closeModal);
els.modal.addEventListener("click", (ev) => { if (ev.target === els.modal) closeModal(); });
document.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => { activeTab = String(btn.dataset.tab || "theme"); ui.modalTab = activeTab; saveUI(); syncTabs(); }));
document.querySelectorAll("[data-mode]").forEach((btn) => btn.addEventListener("click", () => { document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b === btn)); savePatch({ mode: String(btn.dataset.mode || "baraja") }); }));
document.querySelectorAll("[data-audience]").forEach((btn) => btn.addEventListener("click", () => { document.querySelectorAll("[data-audience]").forEach((b) => b.classList.toggle("active", b === btn)); savePatch({ audience: String(btn.dataset.audience || "all") }); }));
document.querySelectorAll("[data-platform]").forEach((btn) => btn.addEventListener("click", () => { btn.classList.toggle("active"); applySettingsPatch(); }));
els.accentColor.addEventListener("input", applyThemePatch);
els.accent2Color.addEventListener("input", applyThemePatch);
els.accent3Color.addEventListener("input", applyThemePatch);
els.backgroundMode.addEventListener("change", applyThemePatch);
els.frameStyle.addEventListener("change", applyThemePatch);
els.showGrid.addEventListener("change", applyThemePatch);
els.triggerMode.addEventListener("change", applySettingsPatch);
els.triggerText.addEventListener("change", applySettingsPatch);
els.allowMultiple.addEventListener("change", applySettingsPatch);
els.maxEntries.addEventListener("change", applySettingsPatch);
els.spamCooldown.addEventListener("change", applySettingsPatch);
els.winnerCommentEnabled.addEventListener("change", applySettingsPatch);
els.winnerCommentSeconds.addEventListener("change", applySettingsPatch);
els.startBtn.addEventListener("click", () => socket.emit("roulette:start"));
els.clearBtn.addEventListener("click", () => socket.emit("roulette:clearParticipants"));
els.resetBtn.addEventListener("click", () => socket.emit("roulette:reset"));
els.syncBtn.addEventListener("click", () => socket.emit("roulette:getState"));
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") closeModal();
});

const savedUI = loadUI();
activeTab = savedUI.modalTab || "theme";
ui = savedUI;
syncTabs();
render();
updateConnectionDot();
setInterval(updateCountdown, 1000);
socket.emit("roulette:getState");
