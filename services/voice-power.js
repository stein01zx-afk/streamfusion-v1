const DEFAULTS = {
  enabled: true,
  mode: "gift",
  commandPrefix: ".",
  voiceWindowSeconds: 900,
  gift: {
    tiktokGiftName: "",
    twitchBits: 0,
  },
  points: {
    cost: 100,
  },
  activity: {
    like: false,
    subscription: false,
    follower: false,
    moderator: false,
    moderatorTikTok: false,
    moderatorTwitch: false,
  },
};

const normalize = (value = "") => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim();

const cleanUser = (value = "") => normalize(value).replace(/^[@#]+/, "");

function merge(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (!base || typeof base !== "object") return incoming ?? base;
  if (!incoming || typeof incoming !== "object") return base;
  const out = { ...base };
  for (const k of Object.keys(incoming)) out[k] = k in base ? merge(base[k], incoming[k]) : incoming[k];
  return out;
}

export function normalizeConfig(raw = {}) {
  const cfg = merge(structuredClone(DEFAULTS), raw || {});
  cfg.enabled = cfg.enabled !== false;
  cfg.mode = ["gift", "points", "activity"].includes(String(cfg.mode)) ? String(cfg.mode) : "gift";
  cfg.commandPrefix = String(cfg.commandPrefix || ".").trim().slice(0, 4) || ".";
  cfg.voiceWindowSeconds = Math.max(60, Math.min(86400, Number(cfg.voiceWindowSeconds) || 900));
  cfg.gift.tiktokGiftName = String(cfg.gift.tiktokGiftName || "").trim();
  cfg.gift.twitchBits = Math.max(0, Number(cfg.gift.twitchBits) || 0);
  cfg.points.cost = Math.max(1, Math.floor(Number(cfg.points.cost) || 100));
  for (const key of Object.keys(cfg.activity)) cfg.activity[key] = Boolean(cfg.activity[key]);
  return cfg;
}

export function normalizeEntitlement(entry = {}) {
  const platform = String(entry.platform || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
  const username = cleanUser(entry.username || entry.uniqueId || entry.user);
  if (!username) return null;
  return {
    platform,
    username,
    displayName: String(entry.displayName || entry.user || username).trim() || username,
    grantedBy: String(entry.grantedBy || "system").trim(),
    reason: String(entry.reason || "manual").trim(),
    createdAt: Number(entry.createdAt || Date.now()),
    updatedAt: Date.now(),
    expiresAt: Number(entry.expiresAt || 0) || 0,
    active: entry.active !== false,
    spentPoints: Number(entry.spentPoints || 0) || 0,
    triggerCount: Number(entry.triggerCount || 0) || 0,
  };
}

export function entitlementKey(platform, username) {
  return `${String(platform || "tiktok").toLowerCase()}:${cleanUser(username)}`;
}

function moderatorBadge(raw) {
  const values = [];
  if (Array.isArray(raw)) values.push(...raw.map((x) => typeof x === "string" ? x : x?.name || x?.type || x?.label || ""));
  else if (raw && typeof raw === "object") values.push(...Object.keys(raw));
  else if (raw) values.push(String(raw));
  return values.some((v) => normalize(v).includes("mod"));
}

function hasType(item, wanted) {
  const type = normalize(item?.type || "");
  const action = normalize(item?.action || "");
  const group = normalize(item?.group || "");
  const hay = `${type} ${action} ${group}`;
  if (wanted === "like") return hay.includes("like");
  if (wanted === "subscription") return hay.includes("sub") || hay.includes("subscription");
  if (wanted === "follower") return hay.includes("follow");
  return false;
}

export function eventQualifiesActivity(item, cfg) {
  if (!cfg?.enabled || cfg.mode !== "activity") return null;
  const selected = Object.entries(cfg.activity || {}).filter(([, on]) => on).map(([k]) => k);
  if (!selected.length) return null;
  const platform = String(item?.platform || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
  if ((selected.includes("moderator") || (platform === "tiktok" && selected.includes("moderatorTikTok")) || (platform === "twitch" && selected.includes("moderatorTwitch"))) && moderatorBadge(item?.badges)) return platform === "twitch" ? "moderator_twitch" : "moderator_tiktok";
  for (const key of selected) {
    if (key !== "moderator" && hasType(item, key)) return key;
  }
  return null;
}

export function giftQualifies(item, cfg) {
  if (!cfg?.enabled || cfg.mode !== "gift") return null;
  const platform = String(item?.platform || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
  if (platform === "twitch") {
    const need = Number(cfg.gift.twitchBits || 0);
    const bits = Number(item?.bits ?? item?.amount ?? 0) || 0;
    if (need > 0 && bits >= need) return `bits:${need}`;
    return null;
  }
  const required = normalize(cfg.gift.tiktokGiftName);
  if (!required) return null;
  const giftName = normalize(item?.gift?.name || item?.giftName || item?.gift?.title || item?.action || "");
  return giftName && giftName.includes(required) ? `gift:${required}` : null;
}

export function isEntitled(entitlement, now = Date.now()) {
  if (!entitlement || entitlement.active === false) return false;
  return !entitlement.expiresAt || entitlement.expiresAt > now;
}

export function parseVoiceCommand(message, commandPrefix = ".") {
  const raw = String(message || "").trim();
  const prefix = String(commandPrefix || ".");
  if (!raw.startsWith(prefix)) return null;
  const query = raw.slice(prefix.length).trim();
  if (!query || query.length > 80) return null;
  return query;
}

export { DEFAULTS, cleanUser, normalize, moderatorBadge };
