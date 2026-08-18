import * as database from "./database.js";
import { findVoiceRuleFromComment } from "./voice-rules.js";

const OVERLAY_ID = "roulette";
const STORAGE_NAME = "Ruleta";
const WELCOME_WAIT_FALLBACK = 30;
const AUTO_START_WAIT_FALLBACK = 60;
const AUTO_RESTART_WAIT_FALLBACK = 180;
const SPIN_DURATION_MS = 4200;
const SPIN_SETTLE_MS = 320;
const PARTICIPANT_SPAM_WINDOW_MS = 2400;

const DEFAULT_CONFIG = {
  enabled: true,
  mode: "baraja",
  platforms: {
    tiktok: true,
    twitch: true,
  },
  audience: "all", // all | followers | donors | likers
  participation: {
    entryMode: "comment", // comment | all
    commentMode: "any", // any | custom
    commentText: "1",
    allowMultiple: false,
    maxEntriesPerUser: 1,
    spamCooldownMs: PARTICIPANT_SPAM_WINDOW_MS,
  },
  winnerComment: {
    enabled: true,
    waitSeconds: WELCOME_WAIT_FALLBACK,
  },
  auto: {
    enabled: false,
    startWaitSeconds: AUTO_START_WAIT_FALLBACK,
    restartWaitSeconds: AUTO_RESTART_WAIT_FALLBACK,
  },
  theme: {
    accent: "#9b5cff",
    accent2: "#22d3ee",
    accent3: "#f472b6",
    preset: "neon",
    frame: "glass",
    background: "transparent",
    showGrid: true,
    cardTheme: "midnight",
  },
};

const DEFAULT_STATE = {
  status: "idle", // idle | spinning | result
  participants: [],
  winner: null,
  waitingComment: null,
  auto: {
    phase: "idle",
    startedAt: 0,
    expiresAt: 0,
    waitSeconds: 0,
    label: "",
  },
  spin: null,
  lastSpinAt: 0,
  history: [],
};

let snapshot = loadSnapshot();
let broadcaster = null;
let voiceAssignmentSync = null;
let activeOwnerId = "";
let winnerCommentTimer = null;
let autoTimer = null;
const identityCache = new Map();
const userActivity = new Map();

function safeClone(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}

function normalizePlatform(value) {
  return String(value || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCommentText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


function buildWinnerVoiceAssignment(winner = {}, voiceRule = null, message = "") {
  if (!winner || !voiceRule) return null;
  const now = Date.now();
  return {
    platform: normalizePlatform(winner.platform),
    uniqueId: String(winner.uniqueId || "").trim(),
    username: String(winner.username || winner.uniqueId || "").trim(),
    displayName: String(winner.displayName || winner.username || winner.uniqueId || "Usuario").trim(),
    voiceKey: String(voiceRule.voiceKey || "verity"),
    voiceLabel: String(voiceRule.voiceLabel || voiceRule.label || "Voz").trim(),
    source: "roulette",
    sourceLabel: "Ruleta",
    comment: String(message || "").trim(),
    winnerKey: String(winner.key || "").trim(),
    createdAt: Number(winner.createdAt || now),
    updatedAt: now,
    commentAt: now,
    autoAssigned: true,
  };
}

function normalizeUserKey(item = {}) {
  const platform = normalizePlatform(item.platform);
  const identity = String(item.uniqueId || item.username || item.user || item.displayName || "Usuario").trim();
  return `${platform}:${normalizeText(identity) || normalizeText(item.displayName || item.user || item.username || "usuario")}`;
}

function normalizeBadgeList(badges) {
  const values = Array.isArray(badges) ? badges : [];
  return values.map((badge) => String(badge || "").trim().toLowerCase()).filter(Boolean);
}

function ensureDefaults() {
  snapshot = safeClone(snapshot || {});
  snapshot.config = mergeDeep(safeClone(DEFAULT_CONFIG), snapshot.config || {});
  snapshot.state = mergeDeep(safeClone(DEFAULT_STATE), snapshot.state || {});
  snapshot.state.participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  snapshot.state.history = Array.isArray(snapshot.state.history) ? snapshot.state.history : [];
  snapshot.state.status = ["idle", "spinning", "result"].includes(snapshot.state.status) ? snapshot.state.status : "idle";
  snapshot.state.winner = snapshot.state.winner || null;
  snapshot.state.waitingComment = snapshot.state.waitingComment || null;
  snapshot.state.auto = mergeDeep({
    phase: "idle",
    startedAt: 0,
    expiresAt: 0,
    waitSeconds: 0,
    label: "",
  }, snapshot.state.auto || {});
  snapshot.state.spin = snapshot.state.spin || null;
  snapshot.state.lastSpinAt = Number(snapshot.state.lastSpinAt || 0) || 0;

  const participation = snapshot.config.participation || (snapshot.config.participation = {});
  const legacyMode = String(participation.triggerMode || "");
  if (!participation.entryMode || participation.entryMode === "all") {
    participation.entryMode = "comment";
  }
  if (!participation.commentMode) {
    participation.commentMode = legacyMode === "all" ? "any" : "custom";
  }
  if (!participation.commentText && participation.triggerText) {
    participation.commentText = String(participation.triggerText);
  }
  if (!participation.commentText) participation.commentText = "1";

  const theme = snapshot.config.theme || (snapshot.config.theme = {});
  if (!theme.cardTheme) theme.cardTheme = "midnight";

  const auto = snapshot.config.auto || (snapshot.config.auto = {});
  auto.enabled = Boolean(auto.enabled);
  auto.startWaitSeconds = Math.max(1, Number(auto.startWaitSeconds || AUTO_START_WAIT_FALLBACK));
  auto.restartWaitSeconds = Math.max(1, Number(auto.restartWaitSeconds || AUTO_RESTART_WAIT_FALLBACK));
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

function loadSnapshot() {
  const overlay = database.getOverlay(OVERLAY_ID);
  const saved = overlay?.config || {};
  const config = mergeDeep(safeClone(DEFAULT_CONFIG), saved.config || saved || {});
  const state = mergeDeep(safeClone(DEFAULT_STATE), saved.state || {});
  return { config, state };
}

function persist() {
  ensureDefaults();
  database.upsertOverlay(OVERLAY_ID, STORAGE_NAME, {
    config: snapshot.config,
    state: snapshot.state,
  });
}

function emitSync() {
  if (typeof broadcaster === "function") {
    broadcaster("roulette:sync", getPublicSnapshot());
  }
}

function emitSpin(payload) {
  if (typeof broadcaster === "function") {
    broadcaster("roulette:spin", payload);
  }
}

function emitError(message) {
  if (typeof broadcaster === "function") {
    broadcaster("roulette:error", { message: String(message || "Error desconocido") });
  }
}

function getIdentity(item = {}) {
  const key = normalizeUserKey(item);
  const current = identityCache.get(key) || {
    key,
    platform: normalizePlatform(item.platform),
    uniqueId: String(item.uniqueId || "").trim(),
    username: String(item.username || item.uniqueId || item.user || "").trim(),
    displayName: String(item.displayName || item.user || item.username || item.uniqueId || "Usuario").trim(),
    avatar: String(item.avatar || "").trim(),
    badges: [],
    tags: new Set(),
    lastSeenAt: 0,
  };

  current.platform = normalizePlatform(item.platform || current.platform);
  current.uniqueId = String(item.uniqueId || current.uniqueId || item.username || item.user || "").trim();
  current.username = String(item.username || current.username || item.uniqueId || item.user || "").trim();
  current.displayName = String(item.displayName || current.displayName || item.user || item.username || item.uniqueId || "Usuario").trim();
  current.avatar = String(item.avatar || current.avatar || "").trim();
  current.badges = normalizeBadgeList(item.badges?.length ? item.badges : current.badges);
  current.lastSeenAt = Date.now();

  const badgeSet = new Set(current.badges);
  if (current.tags instanceof Set) {
    for (const tag of current.tags) badgeSet.add(tag);
  }
  current.tags = badgeSet;
  identityCache.set(key, current);
  return current;
}

function markIdentityFromTags(identity, item = {}) {
  const badges = normalizeBadgeList(item.badges);
  const type = normalizeText(item.type);
  const group = normalizeText(item.group);
  const action = normalizeText(item.action);
  const message = normalizeText(item.message);
  const joined = `${type} ${group} ${action} ${message}`;

  const addFollower = () => identity.tags.add("follower");
  const addDonor = () => identity.tags.add("donor");
  const addLiker = () => identity.tags.add("liker");

  if (badges.some((badge) => ["follower", "follow", "member", "subscriber", "sub", "fanclub", "superfan"].some((needle) => badge.includes(needle)))) {
    addFollower();
  }
  if (badges.some((badge) => ["gift", "supporter", "donor", "bits", "sub", "subscriber", "superfan", "fanclub"].some((needle) => badge.includes(needle)))) {
    addDonor();
  }
  if (badges.some((badge) => ["like", "heart", "heartme", "react", "liker"].some((needle) => badge.includes(needle)))) {
    addLiker();
  }
  if (joined.includes("follow") || joined.includes("join") || joined.includes("member") || joined.includes("fanclub") || joined.includes("subscriber")) {
    addFollower();
  }
  if (joined.includes("gift") || joined.includes("donor") || joined.includes("bits") || joined.includes("sub") || joined.includes("superfan")) {
    addDonor();
  }
  if (joined.includes("like") || joined.includes("heart") || joined.includes("heartme") || joined.includes("react")) {
    addLiker();
  }

  return identity;
}

function isPlatformEnabled(platform) {
  return Boolean(snapshot.config.platforms?.[platform]);
}

function audienceMatches(identity, item = {}) {
  const audience = String(snapshot.config.audience || "all");
  if (audience === "all") return true;
  if (audience === "followers") {
    return identity.tags.has("follower") || normalizeText(item.action).includes("follow") || normalizeText(item.group).includes("follow") || normalizeText(item.type).includes("follow");
  }
  if (audience === "donors") {
    return identity.tags.has("donor") || normalizeText(item.action).includes("gift") || normalizeText(item.group).includes("gift") || normalizeText(item.type).includes("gift") || normalizeText(item.action).includes("sub") || normalizeText(item.type).includes("bits");
  }
  if (audience === "likers") {
    return identity.tags.has("liker") || normalizeText(item.action).includes("like") || normalizeText(item.group).includes("like") || normalizeText(item.type).includes("like") || normalizeText(item.action).includes("heart") || normalizeText(item.type).includes("heartme");
  }
  return true;
}

function triggerMatches(item = {}) {
  const participation = snapshot.config.participation || {};
  const entryMode = String(participation.entryMode || participation.triggerMode || "comment");
  if (entryMode === "all") return true;
  const commentMode = String(participation.commentMode || (entryMode === "all" ? "any" : "custom"));
  if (commentMode === "any") return true;
  const expected = normalizeCommentText(participation.commentText || participation.triggerText || "1");
  if (!expected) return true;
  const message = normalizeCommentText(item.message || item.text || item.comment || "");
  return message === expected;
}

function updateActivity(identityKey) {
  const now = Date.now();
  const current = userActivity.get(identityKey) || { lastEntryAt: 0, count: 0 };
  current.count += 1;
  current.lastEntryAt = now;
  userActivity.set(identityKey, current);
  return current;
}

function canEnter(identityKey) {
  const current = userActivity.get(identityKey) || { lastEntryAt: 0, count: 0 };
  const cooldown = Math.max(500, Number(snapshot.config.participation?.spamCooldownMs || PARTICIPANT_SPAM_WINDOW_MS));
  if (Date.now() - current.lastEntryAt < cooldown) return false;

  // En ruleta por comentario, un mismo usuario solo entra una vez por ronda.
  // Esto evita que un join/evento previo o varios mensajes seguidos bloqueen la detección real del comentario.
  const entryMode = String(snapshot.config.participation?.entryMode || snapshot.config.participation?.triggerMode || "comment");
  if (entryMode === "comment") return current.count === 0;

  const allowMultiple = Boolean(snapshot.config.participation?.allowMultiple);
  const maxEntries = Math.max(1, Number(snapshot.config.participation?.maxEntriesPerUser || 1));
  if (!allowMultiple && current.count > 0) return false;
  if (allowMultiple && current.count >= maxEntries) return false;
  return true;
}

function ensureParticipantShape(item = {}, identity = null) {
  const source = identity || getIdentity(item);
  return {
    key: source.key,
    platform: source.platform,
    uniqueId: source.uniqueId,
    username: source.username,
    displayName: source.displayName,
    avatar: source.avatar || item.avatar || "",
    badges: [...new Set([...(source.badges || []), ...normalizeBadgeList(item.badges)])],
    entries: 1,
    count: 1,
    lastMessage: String(item.message || "").trim(),
    lastSeenAt: Date.now(),
    tags: [...source.tags],
  };
}

function upsertParticipant(item = {}) {
  if (!snapshot.config.enabled) return null;
  const platform = normalizePlatform(item.platform);
  if (!isPlatformEnabled(platform)) return null;
  const identity = markIdentityFromTags(getIdentity({ ...item, platform }), item);
  if (!audienceMatches(identity, item)) return null;
  if (!triggerMatches(item)) return null;
  if (!canEnter(identity.key)) return null;

  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  const existingIndex = participants.findIndex((entry) => entry.key === identity.key);
  const allowMultiple = Boolean(snapshot.config.participation?.allowMultiple);
  const maxEntries = Math.max(1, Number(snapshot.config.participation?.maxEntriesPerUser || 1));

  if (existingIndex >= 0) {
    if (!allowMultiple) return null;
    const existing = participants[existingIndex];
    const count = Math.min(maxEntries, Number(existing.count || existing.entries || 1) + 1);
    participants[existingIndex] = {
      ...existing,
      displayName: identity.displayName,
      username: identity.username || existing.username,
      uniqueId: identity.uniqueId || existing.uniqueId,
      avatar: identity.avatar || existing.avatar,
      badges: [...new Set([...(existing.badges || []), ...identity.badges])],
      entries: count,
      count,
      lastMessage: String(item.message || existing.lastMessage || "").trim(),
      lastSeenAt: Date.now(),
      tags: [...new Set([...(existing.tags || []), ...identity.tags])],
    };
    updateActivity(identity.key);
    persist();
    emitSync();
    return participants[existingIndex];
  }

  const participant = ensureParticipantShape(item, identity);
  participant.entries = 1;
  participant.count = 1;
  participants.push(participant);
  updateActivity(identity.key);
  snapshot.state.participants = participants;
  persist();
  emitSync();
  return participant;
}

function maybeCaptureWinnerComment(item = {}) {
  const waiting = snapshot.state.waitingComment;
  if (!waiting || !waiting.active || !snapshot.state.winner) return false;

  const now = Date.now();
  if (now > Number(waiting.expiresAt || 0)) {
    snapshot.state.waitingComment = null;
    clearWinnerTimer();
    persist();
    emitSync();
    return false;
  }

  const winner = snapshot.state.winner;
  const identity = getIdentity(item);

  // Durante la espera solo aceptamos comentarios del ganador.
  // Los comentarios de otros usuarios siguen entrando al chat normal y
  // pueden servir para futuras rondas, pero jamás pueden cerrar esta espera.
  if (identity.key !== winner.key) return false;

  const message = String(item.message || item.comment || "").trim();
  if (!message) return false;

  // IMPORTANTE:
  // Un comentario cualquiera ("qué onda", emojis, saludos, etc.) NO significa
  // que el ganador haya elegido una voz. Solo una coincidencia real con una
  // regla de voz puede completar esta fase.
  const voiceRule = findVoiceRuleFromComment(message);

  if (!voiceRule) {
    // Conservamos el último intento para mostrar feedback en la ruleta,
    // pero mantenemos waitingComment activo y el mismo temporizador.
    snapshot.state.waitingComment = {
      ...waiting,
      lastComment: message,
      lastCommentAt: now,
      attempts: Math.max(0, Number(waiting.attempts || 0)) + 1,
    };
    persist();
    emitSync();
    return false;
  }

  const voiceAssignment = buildWinnerVoiceAssignment(winner, voiceRule, message);
  const updatedWinner = {
    ...winner,
    comment: message,
    commentAt: now,
    commentAvatar: item.avatar || winner.avatar || "",
    voiceKey: voiceRule.voiceKey,
    voiceLabel: voiceRule.voiceLabel,
    voiceBadge: `🤖 ${voiceRule.voiceLabel}`,
    voiceSource: "roulette",
  };

  snapshot.state.winner = updatedWinner;
  snapshot.state.waitingComment = null;
  snapshot.state.status = "result";
  snapshot.state.history = (snapshot.state.history || []).map((entry) => {
    if (String(entry?.spinToken || "") === String(updatedWinner.spinToken || "") || String(entry?.key || "") === String(updatedWinner.key || "")) {
      return { ...entry, ...updatedWinner };
    }
    return entry;
  });
  if (!snapshot.state.history.some((entry) => String(entry?.spinToken || "") === String(updatedWinner.spinToken || ""))) {
    snapshot.state.history = [updatedWinner, ...snapshot.state.history];
  }
  snapshot.state.history = snapshot.state.history.slice(0, 20);

  if (voiceAssignment && typeof voiceAssignmentSync === "function") {
    try {
      voiceAssignmentSync({
        action: "upsert",
        ownerId: item?._ownerId || item?.ownerId || "",
        assignment: voiceAssignment,
      });
    } catch {}
  }

  clearWinnerTimer();
  persist();
  emitSync();
  if (getAutoConfig().enabled) {
    scheduleAutoRestart();
  }
  if (typeof broadcaster === "function") {
    broadcaster("roulette:comment", snapshot.state.winner);
  }
  return true;
}

function ingestChat(item = {}) {
  if (!item || typeof item !== "object") return null;
  const ownerId = String(item?._ownerId || item?.ownerId || "").trim();
  if (activeOwnerId && ownerId && activeOwnerId !== ownerId) return null;
  if (!activeOwnerId && ownerId) activeOwnerId = ownerId;
  if (String(item.source || "").toLowerCase() === "event") return null;

  // La fase del ganador tiene prioridad: un comentario que coincide con una
  // voz válida completa la elección. Un comentario normal solo actualiza la
  // espera y no se procesa dos veces.
  if (maybeCaptureWinnerComment(item)) return true;

  return upsertParticipant(item);
}

function ingestEvent(item = {}) {
  if (!item || typeof item !== "object") return null;
  const ownerId = String(item?._ownerId || item?.ownerId || "").trim();
  if (activeOwnerId && ownerId && activeOwnerId !== ownerId) return null;
  if (!activeOwnerId && ownerId) activeOwnerId = ownerId;
  const identity = markIdentityFromTags(getIdentity(item), item);
  const type = normalizeText(item.type || item.action || item.group);
  if (type.includes("follow") || type.includes("join") || type.includes("member")) {
    identity.tags.add("follower");
    identityCache.set(identity.key, identity);
  }
  if (type.includes("gift") || type.includes("sub") || type.includes("bits") || type.includes("raid") || type.includes("host") || type.includes("superfan")) {
    identity.tags.add("donor");
    identityCache.set(identity.key, identity);
  }
  if (type.includes("like") || type.includes("heart") || type.includes("heartme") || type.includes("react")) {
    identity.tags.add("liker");
    identityCache.set(identity.key, identity);
  }
  // Los eventos no deben crear participantes en la ruleta por comentario.
  // Solo enriquecen la identidad para que, cuando llegue el chat real, se apliquen las insignias/audiencia correctas.
  return true;
}

function clearWinnerTimer() {
  if (winnerCommentTimer) {
    clearTimeout(winnerCommentTimer);
    winnerCommentTimer = null;
  }
}

function clearAutoTimer() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function getAutoConfig() {
  const auto = snapshot.config.auto || {};
  return {
    enabled: Boolean(auto.enabled),
    startWaitSeconds: Math.max(1, Number(auto.startWaitSeconds || AUTO_START_WAIT_FALLBACK)),
    restartWaitSeconds: Math.max(1, Number(auto.restartWaitSeconds || AUTO_RESTART_WAIT_FALLBACK)),
  };
}

function setAutoState(phase = "idle", waitSeconds = 0, label = "") {
  snapshot.state.auto = {
    phase,
    startedAt: phase === "idle" ? 0 : Date.now(),
    expiresAt: phase === "idle" ? 0 : Date.now() + Math.max(1, Number(waitSeconds || 1)) * 1000,
    waitSeconds: Math.max(0, Number(waitSeconds || 0)),
    label: String(label || "").trim(),
  };
}

function scheduleAutoStart() {
  const auto = getAutoConfig();
  if (!auto.enabled) return false;
  clearAutoTimer();
  const waitSeconds = Math.max(1, Number(auto.startWaitSeconds || AUTO_START_WAIT_FALLBACK));
  setAutoState("waiting_start", waitSeconds, "start");
  persist();
  emitSync();
  autoTimer = setTimeout(() => {
    autoTimer = null;
    if (!getAutoConfig().enabled) return;
    if (snapshot.state.status !== "idle" && snapshot.state.status !== "result") {
      scheduleAutoStart();
      return;
    }
    if ((snapshot.state.participants || []).length > 0) {
      startSpin();
    } else {
      scheduleAutoStart();
    }
  }, waitSeconds * 1000);
  return true;
}

function scheduleAutoRestart() {
  const auto = getAutoConfig();
  if (!auto.enabled) return false;
  clearAutoTimer();
  const waitSeconds = Math.max(1, Number(auto.restartWaitSeconds || AUTO_RESTART_WAIT_FALLBACK));
  setAutoState("restarting", waitSeconds, "restart");
  persist();
  emitSync();
  autoTimer = setTimeout(() => {
    autoTimer = null;
    if (!getAutoConfig().enabled) return;
    reset();
  }, waitSeconds * 1000);
  return true;
}

function clearAutoState() {
  clearAutoTimer();
  snapshot.state.auto = {
    phase: "idle",
    startedAt: 0,
    expiresAt: 0,
    waitSeconds: 0,
    label: "",
  };
}

function clearParticipationMemory() {
  userActivity.clear();
  identityCache.clear();
}

function finalizeSpin(token) {
  if (!snapshot.state.spin || snapshot.state.spin.token !== token) return;
  const target = snapshot.state.spin.target || null;
  const winner = snapshot.state.participants.find((entry) => entry.key === target) || null;
  snapshot.state.status = "result";
  snapshot.state.winner = winner ? { ...winner, spinToken: token, comment: "", commentAt: 0 } : null;
  snapshot.state.spin = null;
  snapshot.state.lastSpinAt = Date.now();
  clearWinnerTimer();
  if (snapshot.state.winner && snapshot.config.winnerComment?.enabled !== false) {
    const waitSeconds = Math.max(1, Number(snapshot.config.winnerComment?.waitSeconds || WELCOME_WAIT_FALLBACK));
    snapshot.state.waitingComment = {
      active: true,
      winnerKey: snapshot.state.winner.key,
      startedAt: Date.now(),
      expiresAt: Date.now() + waitSeconds * 1000,
      waitSeconds,
      attempts: 0,
      lastComment: "",
      lastCommentAt: 0,
    };
    winnerCommentTimer = setTimeout(() => {
      if (!snapshot.state.waitingComment || !snapshot.state.waitingComment.active) return;
      snapshot.state.waitingComment = null;
      persist();
      emitSync();
      if (getAutoConfig().enabled) scheduleAutoRestart();
    }, waitSeconds * 1000);
  } else {
    snapshot.state.waitingComment = null;
    if (getAutoConfig().enabled) {
      scheduleAutoRestart();
    }
  }
  if (snapshot.state.winner) {
    snapshot.state.history = [snapshot.state.winner, ...(snapshot.state.history || [])].slice(0, 20);
  }
  persist();
  emitSync();
}

function chooseWinner() {
  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  if (!participants.length) return null;
  const weighted = [];
  for (const participant of participants) {
    const weight = Math.max(1, Number(participant.count || participant.entries || 1));
    for (let i = 0; i < weight; i += 1) weighted.push(participant);
  }
  return weighted[Math.floor(Math.random() * weighted.length)] || participants[Math.floor(Math.random() * participants.length)] || null;
}

function startSpin() {
  ensureDefaults();
  clearAutoTimer();
  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  if (!participants.length) {
    emitError("No hay participantes para iniciar la ruleta.");
    if (getAutoConfig().enabled) scheduleAutoStart();
    return { ok: false, reason: "empty" };
  }
  clearWinnerTimer();
  const winner = chooseWinner();
  if (!winner) {
    emitError("No se pudo seleccionar un ganador.");
    if (getAutoConfig().enabled) scheduleAutoStart();
    return { ok: false, reason: "no_winner" };
  }

  snapshot.state.status = "spinning";
  snapshot.state.winner = null;
  snapshot.state.waitingComment = null;
  snapshot.state.spin = {
    token: Date.now(),
    target: winner.key,
    startedAt: Date.now(),
    durationMs: SPIN_DURATION_MS,
    settleMs: SPIN_SETTLE_MS,
  };
  snapshot.state.lastSpinAt = Date.now();
  persist();
  emitSync();
  emitSpin({
    mode: snapshot.config.mode || "baraja",
    targetKey: winner.key,
    durationMs: SPIN_DURATION_MS,
    settleMs: SPIN_SETTLE_MS,
    participants: snapshot.state.participants,
  });
  const token = snapshot.state.spin.token;
  setTimeout(() => finalizeSpin(token), SPIN_DURATION_MS + SPIN_SETTLE_MS);
  return { ok: true, targetKey: winner.key, durationMs: SPIN_DURATION_MS, settleMs: SPIN_SETTLE_MS };
}

function stopSpin() {
  clearWinnerTimer();
  clearAutoState();
  snapshot.state.status = "idle";
  snapshot.state.winner = null;
  snapshot.state.waitingComment = null;
  snapshot.state.spin = null;
  snapshot.state.lastSpinAt = Date.now();
  persist();
  emitSync();
  return getPublicSnapshot();
}

function reset() {
  clearWinnerTimer();
  clearAutoTimer();
  clearParticipationMemory();
  snapshot.state = mergeDeep(safeClone(DEFAULT_STATE), {
    participants: [],
    winner: null,
    waitingComment: null,
    auto: {
      phase: "idle",
      startedAt: 0,
      expiresAt: 0,
      waitSeconds: 0,
      label: "",
    },
    spin: null,
    lastSpinAt: 0,
    history: snapshot.state?.history || [],
  });
  persist();
  emitSync();
  if (getAutoConfig().enabled) scheduleAutoStart();
  return getPublicSnapshot();
}

function clearParticipants() {
  clearWinnerTimer();
  clearAutoTimer();
  clearParticipationMemory();
  snapshot.state.participants = [];
  snapshot.state.winner = null;
  snapshot.state.waitingComment = null;
  snapshot.state.auto = {
    phase: "idle",
    startedAt: 0,
    expiresAt: 0,
    waitSeconds: 0,
    label: "",
  };
  snapshot.state.spin = null;
  snapshot.state.status = "idle";
  snapshot.state.lastSpinAt = 0;
  persist();
  emitSync();
  if (getAutoConfig().enabled) scheduleAutoStart();
  return getPublicSnapshot();
}

function updateConfig(patch = {}) {
  const previousAutoEnabled = Boolean(snapshot.config?.auto?.enabled);
  snapshot.config = mergeDeep(safeClone(DEFAULT_CONFIG), mergeDeep(snapshot.config || {}, patch || {}));
  ensureDefaults();
  if (!snapshot.config.auto?.enabled) {
    clearAutoTimer();
    clearAutoState();
  } else if (!previousAutoEnabled && snapshot.state.status === "idle" && !snapshot.state.waitingComment?.active) {
    clearAutoTimer();
    scheduleAutoStart();
  }
  persist();
  emitSync();
  return getPublicSnapshot();
}

function getPublicSnapshot() {
  ensureDefaults();
  return safeClone({
    config: snapshot.config,
    state: snapshot.state,
  });
}

function setOwnerId(ownerId = "") {
  activeOwnerId = String(ownerId || "").trim();
}

function getOwnerId() {
  return activeOwnerId;
}

function setBroadcaster(fn) {
  broadcaster = typeof fn === "function" ? fn : null;
}

function setVoiceAssignmentSync(fn) {
  voiceAssignmentSync = typeof fn === "function" ? fn : null;
}

function resumeAutomationFromSnapshot() {
  ensureDefaults();
  clearAutoTimer();
  if (!getAutoConfig().enabled) {
    clearAutoState();
    return;
  }
  if (snapshot.state.waitingComment?.active && Number(snapshot.state.waitingComment.expiresAt || 0) > Date.now()) {
    const waitMs = Math.max(1, Number(snapshot.state.waitingComment.expiresAt || 0) - Date.now());
    clearWinnerTimer();
    winnerCommentTimer = setTimeout(() => {
      if (!snapshot.state.waitingComment || !snapshot.state.waitingComment.active) return;
      snapshot.state.waitingComment = null;
      persist();
      emitSync();
      if (getAutoConfig().enabled) scheduleAutoRestart();
    }, waitMs);
    return;
  }
  if (snapshot.state.auto?.phase === "restarting" && Number(snapshot.state.auto.expiresAt || 0) > Date.now()) {
    const waitMs = Math.max(1, Number(snapshot.state.auto.expiresAt || 0) - Date.now());
    clearAutoTimer();
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (!getAutoConfig().enabled) return;
      reset();
    }, waitMs);
    return;
  }
  if (snapshot.state.status === "result" && snapshot.state.winner) {
    scheduleAutoRestart();
    return;
  }
  if (snapshot.state.status === "idle") {
    scheduleAutoStart();
  }
}

ensureDefaults();
persist();
resumeAutomationFromSnapshot();

export {
  setBroadcaster,
  setOwnerId,
  getOwnerId,
  setVoiceAssignmentSync,
  getPublicSnapshot,
  updateConfig,
  startSpin,
  reset,
  clearParticipants,
  stopSpin,
  ingestChat,
  ingestEvent,
};
