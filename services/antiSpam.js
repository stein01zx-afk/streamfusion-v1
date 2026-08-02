import { sanitizeSpeechText } from "./textFilter.js";

const lastCommentByPlatform = {
  tiktok: new Map(),
  twitch: new Map(),
};

let runtimeSettings = {
  personal: {},
};

function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeMessage(value) {
  return sanitizeSpeechText(value, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getStore(platform) {
  return lastCommentByPlatform[String(platform || "").toLowerCase()] || lastCommentByPlatform.tiktok;
}

function evictOldest(store, maxEntries = 6000) {
  while (store.size > maxEntries) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export function setRuntimeSettings(settings) {
  runtimeSettings = settings || { personal: {} };
}

export function resetRepeatCache(platform = "") {
  const key = String(platform || "").toLowerCase();
  if (key && lastCommentByPlatform[key]) {
    lastCommentByPlatform[key].clear();
    return;
  }
  for (const store of Object.values(lastCommentByPlatform)) {
    store.clear();
  }
}

export function shouldDropRepeatedComment(platform, userKey, message) {
  if (runtimeSettings?.personal?.antiSpamSameUserComment !== true) {
    return false;
  }

  const normalizedUser = normalizeKey(userKey);
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedUser || !normalizedMessage) {
    return false;
  }

  const store = getStore(platform);
  const lastMessage = store.get(normalizedUser);

  if (lastMessage === normalizedMessage) {
    return true;
  }

  store.set(normalizedUser, normalizedMessage);
  evictOldest(store);
  return false;
}

export { normalizeKey as normalizeRepeatUserKey, normalizeMessage as normalizeRepeatMessage };
