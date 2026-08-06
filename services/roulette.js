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
    triggerMode: "text", // legacy: text | all
    entrySource: "viewers", // viewers | comment
    viewerEntryMode: "none", // none | any | custom
    commentEntryMode: "any", // any | custom
    triggerText: "",
    presenceTimeoutMs: 60000,
    allowMultiple: false,
    maxEntriesPerUser: 1,
    spamCooldownMs: PARTICIPANT_SPAM_WINDOW_MS,
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
const participantPresence = new Map();

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

function ensureDefaults() {
  snapshot = safeClone(snapshot || {});
  snapshot.config = mergeDeep(safeClone(DEFAULT_CONFIG), snapshot.config || {});
  snapshot.state = mergeDeep(safeClone(DEFAULT_STATE), snapshot.state || {});
  snapshot.state.participants = Array.isArray(snapshot.state.participants) ? snapshot.state.participants : [];
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


function getParticipationConfig() {
  const part = snapshot.config.participation || {};
  const triggerMode = String(part.triggerMode || "text");
  const entrySource = String(part.entrySource || (triggerMode === "all" ? "viewers" : "comment"));
  const viewerEntryMode = String(part.viewerEntryMode || (triggerMode === "all" ? "none" : "custom"));
  const commentEntryMode = String(part.commentEntryMode || "any");
  return {
    entrySource: entrySource === "comment" ? "comment" : "viewers",
    viewerEntryMode: ["none", "any", "custom"].includes(viewerEntryMode) ? viewerEntryMode : "none",
    commentEntryMode: ["any", "custom"].includes(commentEntryMode) ? commentEntryMode : "any",
    triggerText: String(part.triggerText || ""),
  };
}

function currentEntryMode(part = getParticipationConfig()) {
  return part.entrySource === "viewers" ? part.viewerEntryMode : part.commentEntryMode;
}

function normalizeEntryText(item = {}) {
  return normalizeText(item.message || item.text || item.comment || "");
}

function audienceMatches(identity, item = {}) {
  const audience = String(snapshot.config.audience || "all");
  const tags = identity?.tags instanceof Set ? identity.tags : new Set(Array.isArray(identity?.tags) ? identity.tags : []);
  if (audience === "all") return true;
  if (audience === "followers") {
    return tags.has("follower") || normalizeText(item.action).includes("follow") || normalizeText(item.group).includes("follow") || normalizeText(item.type).includes("follow");
  }
  if (audience === "donors") {
    return tags.has("donor") || normalizeText(item.action).includes("gift") || normalizeText(item.group).includes("gift") || normalizeText(item.type).includes("gift") || normalizeText(item.action).includes("sub") || normalizeText(item.type).includes("bits");
  }
  if (audience === "likers") {
    return tags.has("liker") || normalizeText(item.action).includes("like") || normalizeText(item.group).includes("like") || normalizeText(item.type).includes("like") || normalizeText(item.action).includes("heart") || normalizeText(item.type).includes("heartme");
  }
  return true;
}

function matchesCurrentParticipation(item = {}) {
  const part = getParticipationConfig();
  const mode = currentEntryMode(part);
  const message = normalizeEntryText(item);
  if (part.entrySource === "viewers" && mode === "none") {
    return true;
  }
  if (!message) return false;
  if (mode === "any") return true;
  return message === normalizeText(part.triggerText || "");
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
    tags: [...(source.tags instanceof Set ? source.tags : new Set(source.tags || []))],
  };
}

function touchPresence(identity, item = {}) {
  const now = Date.now();
  const existing = participantPresence.get(identity.key) || {
    key: identity.key,
    platform: identity.platform,
    uniqueId: identity.uniqueId,
    username: identity.username,
    displayName: identity.displayName,
    avatar: identity.avatar || item.avatar || "",
    badges: [],
    tags: new Set(),
    lastMessage: "",
    commentText: "",
    commentAt: 0,
    commentCount: 0,
    firstSeenAt: now,
    lastSeenAt: now,
    lastItem: {},
  };

  existing.platform = normalizePlatform(identity.platform || existing.platform);
  existing.uniqueId = String(identity.uniqueId || existing.uniqueId || "").trim();
  existing.username = String(identity.username || existing.username || existing.uniqueId || existing.uniqueId || "").trim();
  existing.displayName = String(identity.displayName || existing.displayName || existing.username || existing.uniqueId || "Usuario").trim();
  existing.avatar = String(identity.avatar || existing.avatar || item.avatar || "").trim();
  existing.badges = [...new Set([...(existing.badges || []), ...normalizeBadgeList(item.badges)])];
  existing.tags = existing.tags instanceof Set ? existing.tags : new Set(existing.tags || []);
  if (identity.tags instanceof Set) for (const tag of identity.tags) existing.tags.add(tag);
  existing.lastMessage = String(item.message || item.comment || existing.lastMessage || "").trim();
  existing.lastSeenAt = now;
  existing.lastItem = {
    type: String(item.type || "").trim(),
    action: String(item.action || "").trim(),
    group: String(item.group || "").trim(),
    message: String(item.message || item.comment || "").trim(),
  };

  participantPresence.set(identity.key, existing);
  return existing;
}

function clearCommentEntries() {
  for (const record of participantPresence.values()) {
    record.commentText = "";
    record.commentAt = 0;
    record.commentCount = 0;
  }
}

function prunePresence() {
  const timeout = Math.max(5000, Number(snapshot.config.participation?.presenceTimeoutMs || 60000));
  const now = Date.now();
  let changed = false;
  for (const [key, record] of participantPresence.entries()) {
    if (now - Number(record.lastSeenAt || 0) > timeout) {
      participantPresence.delete(key);
      changed = true;
    }
  }
  if (changed) {
    rebuildParticipants();
    persist();
    emitSync();
  }
}

function removePresence(identityKey) {
  if (!identityKey || !participantPresence.has(identityKey)) return false;
  participantPresence.delete(identityKey);
  return true;
}

function rebuildParticipants() {
  const part = getParticipationConfig();
  const mode = currentEntryMode(part);
  const participants = [];
  const allowMultiple = Boolean(snapshot.config.participation?.allowMultiple);
  const maxEntries = Math.max(1, Number(snapshot.config.participation?.maxEntriesPerUser || 1));
  const now = Date.now();
  const timeout = Math.max(5000, Number(snapshot.config.participation?.presenceTimeoutMs || 60000));

  const records = [...participantPresence.values()].sort((a, b) => (Number(a.firstSeenAt || 0) - Number(b.firstSeenAt || 0)) || (Number(a.lastSeenAt || 0) - Number(b.lastSeenAt || 0)));

  for (const record of records) {
    if (now - Number(record.lastSeenAt || 0) > timeout) continue;
    if (!isPlatformEnabled(record.platform)) continue;
    if (!audienceMatches(record, record.lastItem || {})) continue;

    const hasComment = Boolean(String(record.commentText || "").trim());
    const exact = normalizeText(record.commentText || "") === normalizeText(part.triggerText || "");
    let eligible = false;

    if (part.entrySource === "viewers") {
      if (mode === "none") eligible = true;
      else if (mode === "any") eligible = hasComment;
      else eligible = exact;
    } else {
      if (mode === "any") eligible = hasComment;
      else eligible = exact;
    }

    if (!eligible) continue;

    const entries = Math.max(1, Number(record.commentCount || 1));
    const weight = allowMultiple ? Math.min(maxEntries, entries) : 1;
    participants.push({
      key: record.key,
      platform: record.platform,
      uniqueId: record.uniqueId,
      username: record.username,
      displayName: record.displayName,
      avatar: record.avatar,
      badges: [...new Set([...(record.badges || [])])],
      entries: weight,
      count: weight,
      lastMessage: String(record.commentText || record.lastMessage || ""),
      lastSeenAt: record.lastSeenAt,
      tags: [...(record.tags instanceof Set ? record.tags : new Set(record.tags || []))],
    });
  }

  snapshot.state.participants = participants;
  return participants;
}

function registerCommentEntry(identity, item = {}) {
  if (!snapshot.config.enabled) return null;
  const platform = normalizePlatform(item.platform);
  if (!isPlatformEnabled(platform)) return null;
  const part = getParticipationConfig();
  const mode = currentEntryMode(part);
  const message = normalizeEntryText(item);
  if (!message) return null;
  if (part.entrySource === "viewers" && mode === "none") return null;
  if (!matchesCurrentParticipation(item)) return null;
  if (!audienceMatches(identity, item)) return null;
  if (!canEnter(identity.key)) return null;

  const record = touchPresence(identity, item);
  const maxEntries = Math.max(1, Number(snapshot.config.participation?.maxEntriesPerUser || 1));
  const nextCount = Math.min(maxEntries, Number(record.commentCount || 0) + 1);
  record.commentText = String(message || "").trim();
  record.commentAt = Date.now();
  record.commentCount = nextCount;
  record.lastMessage = record.commentText;
  updateActivity(identity.key);
  rebuildParticipants();
  persist();
  emitSync();
  return record;
}

function upsertParticipant(item = {}) {
  if (!snapshot.config.enabled) return null;
  const platform = normalizePlatform(item.platform);
  if (!isPlatformEnabled(platform)) return null;
  const rawLabel = normalizeText(item.user || item.displayName || item.username || item.uniqueId || "");
  const typeLabel = normalizeText(item.type || item.action || item.group || "");
  if (typeLabel.includes("system") && (!rawLabel || rawLabel === "tiktok" || rawLabel === "twitch")) return null;
  const identity = markIdentityFromTags(getIdentity({ ...item, platform }), item);

  if (String(item.type || item.action || item.group || "").toLowerCase().includes("leave") || String(item.type || item.action || item.group || "").toLowerCase().includes("part")) {
    removePresence(identity.key);
    rebuildParticipants();
    persist();
    emitSync();
    return null;
  }

  touchPresence(identity, item);
  if (matchesCurrentParticipation(item)) {
    const part = getParticipationConfig();
    const mode = currentEntryMode(part);
    const message = normalizeEntryText(item);
    if (part.entrySource === "viewers" && mode === "none") {
      rebuildParticipants();
      persist();
      emitSync();
      return participantPresence.get(identity.key) || null;
    }
    if (message && ((part.entrySource === "viewers" && mode !== "none") || part.entrySource === "comment")) {
      return registerCommentEntry(identity, item);
    }
  }

  rebuildParticipants();
  persist();
  emitSync();
  return participantPresence.get(identity.key) || null;
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
  const message = String(item.message || item.comment || "").trim();
  if (!message) return false;
  snapshot.state.winner = {
    ...winner,
    comment: message,
    commentAt: Date.now(),
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
  clearCommentEntries();
  userActivity.clear();
  rebuildParticipants();
  if (snapshot.state.winner && snapshot.config.winnerComment?.enabled !== false) {
    const waitSeconds = Math.max(1, Number(snapshot.config.winnerComment?.waitSeconds || WELCOME_WAIT_FALLBACK));
    snapshot.state.waitingComment = {
      active: true,
      winnerKey: snapshot.state.winner.key,
      startedAt: Date.now(),
      expiresAt: Date.now() + waitSeconds * 1000,
      waitSeconds,
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
  clearCommentEntries();
  userActivity.clear();
  rebuildParticipants();
  persist();
  emitSync();
  return getPublicSnapshot();
}

function reset() {
  clearWinnerTimer();
  participantPresence.clear();
  userActivity.clear();
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
  participantPresence.clear();
  userActivity.clear();
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
  const prevParticipation = safeClone(snapshot.config?.participation || {});
  snapshot.config = mergeDeep(safeClone(DEFAULT_CONFIG), mergeDeep(snapshot.config || {}, patch || {}));
  const nextParticipation = safeClone(snapshot.config?.participation || {});
  const participationChanged = JSON.stringify(prevParticipation) !== JSON.stringify(nextParticipation);
  if (participationChanged) {
    clearCommentEntries();
    userActivity.clear();
    rebuildParticipants();
  }
  persist();
  emitSync();
  return getPublicSnapshot();
}

function getPublicSnapshot() {
  ensureDefaults();
  prunePresence();
  rebuildParticipants();
  return safeClone({
    config: snapshot.config,
    state: snapshot.state,
  });
}

function setBroadcaster(fn) {
  broadcaster = typeof fn === "function" ? fn : null;
}

ensureDefaults();
rebuildParticipants();
setInterval(prunePresence, 15000).unref?.();
persist();

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
};
