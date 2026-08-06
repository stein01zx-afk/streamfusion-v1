import * as database from "./database.js";

const OVERLAY_ID = "roulette";
const STORAGE_NAME = "Ruleta";
const WELCOME_WAIT_FALLBACK = 30;
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
    triggerMode: "text", // text | all
    triggerText: "1",
    allowMultiple: false,
    maxEntriesPerUser: 1,
    spamCooldownMs: PARTICIPANT_SPAM_WINDOW_MS,
    presenceStaleMs: 120000,
  },
  winnerComment: {
    enabled: true,
    waitSeconds: WELCOME_WAIT_FALLBACK,
  },
  theme: {
    accent: "#9b5cff",
    accent2: "#22d3ee",
    accent3: "#f472b6",
    frame: "glass",
    background: "transparent",
    showGrid: true,
  },
};

const DEFAULT_STATE = {
  status: "idle", // idle | spinning | result
  participants: [],
  winner: null,
  waitingComment: null,
  spin: null,
  lastSpinAt: 0,
  history: [],
};

let snapshot = loadSnapshot();
let broadcaster = null;
let winnerCommentTimer = null;
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

function normalizeUserKey(item = {}) {
  const platform = normalizePlatform(item.platform);
  const identity = String(item.uniqueId || item.username || item.user || item.displayName || "Usuario").trim();
  return `${platform}:${normalizeText(identity) || normalizeText(item.displayName || item.user || item.username || "usuario")}`;
}

function normalizeBadgeList(badges) {
  const values = Array.isArray(badges) ? badges : [];
  return values.map((badge) => String(badge || "").trim().toLowerCase()).filter(Boolean);
}

function isPresenceParticipationMode() {
  return String(snapshot.config.participation?.triggerMode || "text") === "all";
}

function getPresenceStaleMs() {
  return Math.max(15000, Number(snapshot.config.participation?.presenceStaleMs || 120000));
}

function normalizePresenceAction(item = {}) {
  const type = normalizeText(item.type || "");
  const action = normalizeText(item.action || "");
  const group = normalizeText(item.group || "");
  const status = normalizeText(item.status || "");
  return `${type} ${action} ${group} ${status}`.trim();
}

function isLeaveAction(item = {}) {
  const raw = normalizePresenceAction(item);
  return ["part", "leave", "left", "exit", "gone", "disconnect", "disconnected", "ban", "banned", "timeout", "timed out", "removed"].some((needle) => raw.includes(needle));
}

function isJoinAction(item = {}) {
  const raw = normalizePresenceAction(item);
  return ["join", "joined", "member", "enter", "entered", "view", "viewer", "presence", "live", "follow"].some((needle) => raw.includes(needle));
}

function clearParticipantMemory() {
  userActivity.clear();
  identityCache.clear();
}

function removeParticipantByKey(identityKey) {
  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  const next = participants.filter((entry) => entry.key !== identityKey);
  if (next.length === participants.length) return null;
  snapshot.state.participants = next;
  persist();
  emitSync();
  return true;
}

function pruneStaleParticipants(force = false) {
  if (!isPresenceParticipationMode()) return 0;
  const staleMs = getPresenceStaleMs();
  const now = Date.now();
  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  const next = participants.filter((entry) => {
    const lastPresenceAt = Number(entry.lastPresenceAt || entry.lastSeenAt || 0) || 0;
    if (lastPresenceAt <= 0) return true;
    if (force) return false;
    return now - lastPresenceAt <= staleMs;
  });
  if (next.length === participants.length) return 0;
  snapshot.state.participants = next;
  persist();
  emitSync();
  return participants.length - next.length;
}

function ensureDefaults() {
  snapshot = safeClone(snapshot || {});
  snapshot.config = mergeDeep(safeClone(DEFAULT_CONFIG), snapshot.config || {});
  snapshot.state = mergeDeep(safeClone(DEFAULT_STATE), snapshot.state || {});
  snapshot.state.participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants.map((entry) => ({
    ...entry,
    lastPresenceAt: Number(entry?.lastPresenceAt || entry?.lastSeenAt || Date.now()) || Date.now(),
  })) : [];
  snapshot.state.history = Array.isArray(snapshot.state.history) ? snapshot.state.history : [];
  snapshot.state.status = ["idle", "spinning", "result"].includes(snapshot.state.status) ? snapshot.state.status : "idle";
  snapshot.state.winner = snapshot.state.winner || null;
  snapshot.state.waitingComment = snapshot.state.waitingComment || null;
  snapshot.state.spin = snapshot.state.spin || null;
  snapshot.state.lastSpinAt = Number(snapshot.state.lastSpinAt || 0) || 0;
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
  const mode = String(snapshot.config.participation?.triggerMode || "text");
  if (mode === "all") return true;
  const expected = normalizeText(snapshot.config.participation?.triggerText || "1");
  if (!expected) return true;
  const message = normalizeText(item.message || item.text || item.comment || "");
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
    lastPresenceAt: Date.now(),
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

function upsertPresenceParticipant(item = {}) {
  if (!snapshot.config.enabled) return null;
  if (!isPresenceParticipationMode()) return null;
  const platform = normalizePlatform(item.platform);
  if (!isPlatformEnabled(platform)) return null;

  const identity = markIdentityFromTags(getIdentity({ ...item, platform }), item);
  if (!audienceMatches(identity, item)) return null;

  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  const existingIndex = participants.findIndex((entry) => entry.key === identity.key);
  const now = Number(item.timestamp || item.createdAt || item.eventAt || Date.now()) || Date.now();

  if (existingIndex >= 0) {
    participants[existingIndex] = {
      ...participants[existingIndex],
      platform: identity.platform,
      uniqueId: identity.uniqueId || participants[existingIndex].uniqueId,
      username: identity.username || participants[existingIndex].username,
      displayName: identity.displayName || participants[existingIndex].displayName,
      avatar: identity.avatar || participants[existingIndex].avatar,
      badges: [...new Set([...(participants[existingIndex].badges || []), ...identity.badges])],
      lastMessage: String(item.message || participants[existingIndex].lastMessage || "").trim(),
      lastSeenAt: now,
      lastPresenceAt: now,
      tags: [...new Set([...(participants[existingIndex].tags || []), ...identity.tags])],
      count: 1,
      entries: 1,
    };
  } else {
    participants.push({
      ...ensureParticipantShape(item, identity),
      lastPresenceAt: now,
      lastSeenAt: now,
      count: 1,
      entries: 1,
    });
  }

  snapshot.state.participants = participants;
  updateActivity(identity.key);
  persist();
  emitSync();
  return participants[existingIndex >= 0 ? existingIndex : participants.length - 1];
}

function ingestPresence(item = {}) {
  if (!item || typeof item !== "object") return null;
  if (!snapshot.config.enabled) return null;

  const platform = normalizePlatform(item.platform);
  if (!isPlatformEnabled(platform)) return null;

  const identity = markIdentityFromTags(getIdentity({ ...item, platform }), item);
  if (!audienceMatches(identity, item)) return null;

  if (isLeaveAction(item)) {
    if (!isPresenceParticipationMode()) return null;
    return removeParticipantByKey(identity.key);
  }

  if (isJoinAction(item) || isPresenceParticipationMode()) {
    return upsertPresenceParticipant({
      ...item,
      platform,
      uniqueId: item.uniqueId || identity.uniqueId || identity.username || identity.displayName,
      username: item.username || identity.username || identity.uniqueId,
      displayName: item.displayName || item.user || identity.displayName,
      avatar: item.avatar || identity.avatar || "",
      message: String(item.message || item.action || item.type || "").trim(),
      timestamp: Number(item.timestamp || Date.now()) || Date.now(),
    });
  }

  return null;
}

function maybeCaptureWinnerComment(item = {}) {
  const waiting = snapshot.state.waitingComment;
  if (!waiting || !waiting.active || !snapshot.state.winner) return false;
  if (Date.now() > Number(waiting.expiresAt || 0)) {
    snapshot.state.waitingComment = null;
    persist();
    emitSync();
    return false;
  }
  const winner = snapshot.state.winner;
  const identity = getIdentity(item);
  if (identity.key !== winner.key) return false;
  const eventTs = Number(item.timestamp || item.createdAt || item.commentAt || Date.now()) || Date.now();
  if (eventTs < Number(waiting.startedAt || 0)) return false;
  const message = String(item.message || item.comment || "").trim();
  if (!message) return false;
  snapshot.state.winner = {
    ...winner,
    comment: message,
    commentAt: eventTs,
    commentAvatar: item.avatar || winner.avatar || "",
  };
  snapshot.state.waitingComment = null;
  snapshot.state.status = "result";
  snapshot.state.history = [snapshot.state.winner, ...(snapshot.state.history || [])].slice(0, 20);
  persist();
  emitSync();
  if (typeof broadcaster === "function") {
    broadcaster("roulette:comment", snapshot.state.winner);
  }
  return true;
}

function ingestChat(item = {}) {
  if (!item || typeof item !== "object") return null;
  if (maybeCaptureWinnerComment(item)) return true;
  const result = upsertParticipant(item);
  maybeCaptureWinnerComment(item);
  return result;
}

function ingestEvent(item = {}) {
  if (!item || typeof item !== "object") return null;
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
  if (maybeCaptureWinnerComment(item)) return true;
  upsertParticipant({
    ...item,
    platform: normalizePlatform(item.platform),
    uniqueId: item.uniqueId || item.username || item.user || identity.uniqueId || identity.username || identity.displayName,
    username: item.username || item.uniqueId || identity.username || identity.uniqueId,
    displayName: item.displayName || item.user || identity.displayName,
    avatar: item.avatar || identity.avatar || "",
    message: String(item.message || item.action || item.type || "").trim(),
  });
  return true;
}

function clearWinnerTimer() {
  if (winnerCommentTimer) {
    clearTimeout(winnerCommentTimer);
    winnerCommentTimer = null;
  }
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
    const openedAt = Date.now();
    snapshot.state.waitingComment = {
      active: true,
      winnerKey: snapshot.state.winner.key,
      startedAt: openedAt,
      openedAt,
      expiresAt: openedAt + waitSeconds * 1000,
      waitSeconds,
      roundId: token,
    };
    winnerCommentTimer = setTimeout(() => {
      if (!snapshot.state.waitingComment || !snapshot.state.waitingComment.active) return;
      snapshot.state.waitingComment = null;
      persist();
      emitSync();
    }, waitSeconds * 1000);
  } else {
    snapshot.state.waitingComment = null;
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
  const participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
  if (!participants.length) {
    emitError("No hay participantes para iniciar la ruleta.");
    return { ok: false, reason: "empty" };
  }
  clearWinnerTimer();
  const winner = chooseWinner();
  if (!winner) {
    emitError("No se pudo seleccionar un ganador.");
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
  clearParticipantMemory();
  snapshot.state = mergeDeep(safeClone(DEFAULT_STATE), {
    participants: [],
    winner: null,
    waitingComment: null,
    spin: null,
    lastSpinAt: 0,
    history: snapshot.state?.history || [],
  });
  persist();
  emitSync();
  return getPublicSnapshot();
}

function clearParticipants() {
  clearWinnerTimer();
  clearParticipantMemory();
  snapshot.state.participants = [];
  snapshot.state.winner = null;
  snapshot.state.waitingComment = null;
  snapshot.state.spin = null;
  snapshot.state.status = "idle";
  snapshot.state.lastSpinAt = 0;
  persist();
  emitSync();
  return getPublicSnapshot();
}

function updateConfig(patch = {}) {
  snapshot.config = mergeDeep(safeClone(DEFAULT_CONFIG), mergeDeep(snapshot.config || {}, patch || {}));
  persist();
  emitSync();
  return getPublicSnapshot();
}

function getPublicSnapshot() {
  ensureDefaults();
  pruneStaleParticipants(false);
  if (snapshot.state.waitingComment && Number(snapshot.state.waitingComment.expiresAt || 0) > 0 && Date.now() > Number(snapshot.state.waitingComment.expiresAt || 0)) {
    snapshot.state.waitingComment = null;
    persist();
  }
  return safeClone({
    config: snapshot.config,
    state: snapshot.state,
  });
}

function setBroadcaster(fn) {
  broadcaster = typeof fn === "function" ? fn : null;
}

ensureDefaults();
persist();
setInterval(() => {
  try {
    pruneStaleParticipants(false);
    if (snapshot.state.waitingComment && Date.now() > Number(snapshot.state.waitingComment.expiresAt || 0)) {
      snapshot.state.waitingComment = null;
      persist();
      emitSync();
    }
  } catch {}
}, 15000).unref?.();

export {
  setBroadcaster,
  getPublicSnapshot,
  updateConfig,
  startSpin,
  reset,
  clearParticipants,
  stopSpin,
  ingestChat,
  ingestEvent,
  ingestPresence,
};
