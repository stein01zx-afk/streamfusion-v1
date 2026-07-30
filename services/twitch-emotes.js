function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstString(...values) {
  for (const value of values) {
    const text = clean(value, "");
    if (text) return text;
  }
  return "";
}

function twitchEmoteUrl(id, theme = "dark", size = "3.0") {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(String(id))}/default/${theme}/${size}`;
}

function parseOfficialRanges(message, emoteString) {
  const text = String(message ?? "");
  if (!text) return null;

  const ranges = [];
  String(emoteString || "").split("/").forEach((chunk) => {
    const [id, positions] = chunk.split(":");
    if (!id || !positions) return;
    positions.split(",").forEach((pair) => {
      const [start, end] = pair.split("-").map((v) => Number(v));
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
        ranges.push({ start, end, id });
      }
    });
  });

  if (!ranges.length) return null;
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);

  const parts = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    const slice = text.slice(cursor, range.start);
    if (slice) parts.push({ type: "text", text: slice });
    const token = text.slice(range.start, range.end + 1);
    parts.push({
      type: "emote",
      provider: "twitch",
      emoteId: String(range.id),
      url: twitchEmoteUrl(range.id),
      alt: token || `Twitch emote ${range.id}`,
      label: token || `Twitch emote ${range.id}`,
    });
    cursor = range.end + 1;
  }
  const tail = text.slice(cursor);
  if (tail) parts.push({ type: "text", text: tail });
  return parts.length ? parts : null;
}

function extractToken(value) {
  return String(value || "")
    .replace(/^[^A-Za-z0-9_]+/, "")
    .replace(/[^A-Za-z0-9_]+$/, "")
    .trim();
}

function makeMapEntry(code, url, provider = "third-party") {
  const key = extractToken(code);
  const finalUrl = clean(url, "");
  if (!key || !finalUrl) return null;
  return [key, { url: finalUrl, provider, code: key }];
}

function normalize7TVUrl(entry) {
  const url = firstString(
    entry?.url,
    entry?.host?.url,
    entry?.urls?.[0]?.[1],
    entry?.urls?.[0]?.url,
    entry?.data?.host?.url,
  );
  if (url) return url;

  const id = firstString(entry?.id, entry?.emoteId, entry?.idString);
  if (!id) return "";
  return `https://cdn.7tv.app/emote/${encodeURIComponent(id)}/3x.webp`;
}

function flatten7TVEntries(payload) {
  const found = [];
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value.emotes)) value.emotes.forEach(visit);
    if (Array.isArray(value.emote_set?.emotes)) value.emote_set.emotes.forEach(visit);
    if (Array.isArray(value.sets)) value.sets.forEach(visit);
    if (value.name || value.id || value.urls || value.host || value.data?.host) found.push(value);
  };
  visit(payload);
  return found;
}

function normalizeBTTVEntry(entry, provider = "bttv") {
  const code = firstString(entry?.code, entry?.name, entry?.id, entry?.keyword);
  const id = firstString(entry?.id, entry?.imageId, entry?.emoteId);
  const url = firstString(
    entry?.imageUrl,
    entry?.url,
    entry?.urls?.[0],
    entry?.host?.url,
    provider === "ffz"
      ? (id ? `https://cdn.betterttv.net/frankerfacez_emote/${encodeURIComponent(id)}/3` : "")
      : (id ? `https://cdn.betterttv.net/emote/${encodeURIComponent(id)}/3x` : ""),
  );
  return makeMapEntry(code, url, provider);
}

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "application/json,text/plain,*/*",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function extractTwitchChannelIdFromHtml(html) {
  const text = String(html || "");
  const patterns = [
    /"broadcasterId":"?(\d{4,})"?/i,
    /"broadcaster_id":"?(\d{4,})"?/i,
    /"channelId":"?(\d{4,})"?/i,
    /"channelID":"?(\d{4,})"?/i,
    /"userId":"?(\d{4,})"?/i,
    /"user_id":"?(\d{4,})"?/i,
    /"ownerId":"?(\d{4,})"?/i,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match?.[1]) return match[1];
  }
  return "";
}

const channelIdCache = new Map();
const channelIdPending = new Map();
const thirdPartyMapCache = new Map();
const thirdPartyMapPending = new Map();

async function resolveTwitchChannelId(channel) {
  const cleanChannel = String(channel || "").replace(/^@+/, "").replace(/^#+/, "").trim();
  if (!cleanChannel) return "";
  const key = cleanChannel.toLowerCase();
  if (channelIdCache.has(key)) return channelIdCache.get(key);
  if (channelIdPending.has(key)) return channelIdPending.get(key);

  const pending = (async () => {
    const html = await fetchText(`https://www.twitch.tv/${encodeURIComponent(cleanChannel)}`);
    const id = extractTwitchChannelIdFromHtml(html);
    if (id) channelIdCache.set(key, id);
    return id;
  })().finally(() => {
    channelIdPending.delete(key);
  });

  channelIdPending.set(key, pending);
  return pending;
}

async function loadThirdPartyMaps(channelId) {
  const id = String(channelId || "").trim();
  if (!id) return new Map();
  if (thirdPartyMapCache.has(id)) return thirdPartyMapCache.get(id);
  if (thirdPartyMapPending.has(id)) return thirdPartyMapPending.get(id);

  const pending = (async () => {
    const [bttvGlobal, bttvChannel, ffzChannel, seventvUser, seventvGlobal] = await Promise.all([
      fetchJson("https://api.betterttv.net/3/cached/emotes/global"),
      fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(id)}`),
      fetchJson(`https://api.betterttv.net/3/cached/frankerfacez/users/twitch/${encodeURIComponent(id)}`),
      fetchJson(`https://7tv.io/v3/users/twitch/${encodeURIComponent(id)}`),
      fetchJson("https://7tv.io/v3/emote-sets/global"),
    ]);

    const map = new Map();
    const add = (entry, provider) => {
      const normalized =
        provider === "ffz"
          ? normalizeBTTVEntry(entry, "ffz")
          : provider === "bttv"
            ? normalizeBTTVEntry(entry, "bttv")
            : provider === "7tv"
              ? makeMapEntry(firstString(entry?.name, entry?.code, entry?.data?.name), normalize7TVUrl(entry), "7tv")
              : null;
      if (!normalized) return;
      const [key, value] = normalized;
      if (!map.has(key)) map.set(key, value);
    };

    toArray(bttvGlobal).forEach((entry) => add(entry, "bttv"));
    toArray(bttvChannel?.channelEmotes).forEach((entry) => add(entry, "bttv"));
    toArray(bttvChannel?.sharedEmotes).forEach((entry) => add(entry, "bttv"));
    toArray(ffzChannel?.channelEmotes).forEach((entry) => add(entry, "ffz"));
    toArray(ffzChannel?.sharedEmotes).forEach((entry) => add(entry, "ffz"));
    flatten7TVEntries(seventvGlobal).forEach((entry) => add(entry, "7tv"));
    flatten7TVEntries(seventvUser).forEach((entry) => add(entry, "7tv"));

    thirdPartyMapCache.set(id, map);
    return map;
  })().finally(() => {
    thirdPartyMapPending.delete(id);
  });

  thirdPartyMapPending.set(id, pending);
  return pending;
}

function mergeParts(parts) {
  const out = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.type === "text") {
      const last = out[out.length - 1];
      if (last && last.type === "text") last.text += part.text || "";
      else out.push({ type: "text", text: part.text || "" });
      continue;
    }
    out.push(part);
  }
  return out;
}

function splitPlainText(text, map) {
  const parts = [];
  const chunks = String(text ?? "").split(/(\s+)/);
  for (const chunk of chunks) {
    if (!chunk) continue;
    if (/^\s+$/.test(chunk)) {
      parts.push({ type: "text", text: chunk });
      continue;
    }
    const token = extractToken(chunk);
    const emote = map?.get?.(token);
    if (emote) {
      parts.push({
        type: "emote",
        provider: emote.provider || "third-party",
        code: token,
        url: emote.url,
        alt: token,
        label: token,
      });
    } else {
      parts.push({ type: "text", text: chunk });
    }
  }
  return parts;
}

function buildMessageParts(message, emoteString, thirdPartyMap = new Map()) {
  const text = String(message ?? "");
  const official = parseOfficialRanges(text, emoteString);
  if (!official) return mergeParts(splitPlainText(text, thirdPartyMap));

  const parts = [];
  for (const part of official) {
    if (part.type === "text") parts.push(...splitPlainText(part.text || "", thirdPartyMap));
    else parts.push(part);
  }
  return mergeParts(parts);
}

async function buildTwitchMessagePayload({ channel, roomId, message, emotes }) {
  const resolvedChannelId = roomId || await resolveTwitchChannelId(channel);
  const thirdPartyMap = resolvedChannelId ? await loadThirdPartyMaps(resolvedChannelId) : new Map();
  const parts = buildMessageParts(message, emotes, thirdPartyMap);
  return {
    parts,
    message: String(message ?? ""),
    emotes,
    channelId: resolvedChannelId,
  };
}

async function primeTwitchEmotes(channel, roomId) {
  try {
    await buildTwitchMessagePayload({ channel, roomId, message: "", emotes: "" });
  } catch {
    return null;
  }
  return true;
}

export {
  buildMessageParts,
  buildTwitchMessagePayload,
  primeTwitchEmotes,
  resolveTwitchChannelId,
  twitchEmoteUrl,
};
