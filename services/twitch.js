import tmi from "tmi.js";

let client = null;

const avatarCache = new Map();
const pendingAvatarRequests = new Map();

let global7tvEmotes = new Map();

function parseBadgeInfo(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.flatMap((item) => parseBadgeInfo(item));
    if (typeof raw === "object") {
        return Object.entries(raw).flatMap(([key, value]) => {
            if (value === false || value === null || value === undefined) return [];
            if (typeof value === "string") {
                return [{ key, label: key, url: value.startsWith("http") ? value : "", emoji: "" }];
            }
            if (typeof value === "object") {
                return [{
                    key: clean(value.name || value.type || value.label || value.id || key || ""),
                    label: clean(value.label || value.name || value.type || value.id || key || ""),
                    url: clean(value.url || value.imageUrl || value.image_url || value.icon || value.badgeUrl || value.iconUrl || "", ""),
                    emoji: clean(value.emoji || value.symbol || "", "")
                }];
            }
            return [{ key, label: key, url: "", emoji: "" }];
        });
    }
    if (typeof raw === "string") {
        return raw.split(/[,\s|]+/).filter(Boolean).map((key) => ({ key, label: key, url: "", emoji: "" }));
    }
    return [];
}

function badgeEmojiForTwitchBadge(setId) {
    const lower = String(setId || "").toLowerCase();
    if (lower.includes("broadcaster")) return "👑";
    if (lower.includes("moderator") || lower === "mod") return "🛡️";
    if (lower.includes("vip")) return "💎";
    if (lower.includes("subscriber") || lower.includes("sub")) return "⭐";
    if (lower.includes("staff")) return "🧰";
    if (lower.includes("founder")) return "🏁";
    if (lower.includes("verified")) return "✅";
    if (lower.includes("cheer")) return "💎";
    return "🎖️";
}

function normalizeTwitchBadges(tags = {}) {
    const badges = [];
    const raw = tags.badges || {};
    const info = tags["badge-info"] || tags.badge_info || {};

    if (Array.isArray(raw)) {
        raw.forEach((item) => {
            if (typeof item === "string") {
                badges.push({ key: item, label: item, emoji: badgeEmojiForTwitchBadge(item), url: "" });
            } else if (item && typeof item === "object") {
                badges.push({
                    key: clean(item.key || item.name || item.type || item.id || ""),
                    label: clean(item.label || item.name || item.type || item.id || ""),
                    emoji: clean(item.emoji || "", "") || badgeEmojiForTwitchBadge(item.key || item.name || item.type || item.id || ""),
                    url: clean(item.url || item.imageUrl || item.image_url || item.icon || item.badgeUrl || item.iconUrl || "", ""),
                    source: "twitch",
                });
            }
        });
        return badges;
    }

    if (raw && typeof raw === "object") {
        Object.entries(raw).forEach(([setId, version]) => {
            const label = clean(setId, setId);
            const item = {
                key: setId,
                label,
                emoji: badgeEmojiForTwitchBadge(setId),
                url: "",
                source: "twitch",
                version: clean(version, ""),
            };
            const setInfo = info?.[setId];
            if (setInfo && typeof setInfo === "object") {
                item.label = clean(setInfo.label || setInfo.name || setInfo.type || label, label);
                item.url = clean(setInfo.url || setInfo.imageUrl || setInfo.image_url || setInfo.icon || setInfo.badgeUrl || setInfo.iconUrl || "", "");
                item.emoji = clean(setInfo.emoji || "", "") || item.emoji;
            }
            badges.push(item);
        });
    }

    const extra = parseBadgeInfo(tags.badges_raw || tags.badgesList || tags.badgeList || tags.badgeInfo || tags["badge-info"]);
    extra.forEach((item) => badges.push(item));
    return badges;
}

function parse7tvUserPayload(payload) {
    const out = [];
    const seen = new Set();
    const collect = (entry) => {
        if (!entry || typeof entry !== "object") return;
        const code = clean(entry.name || entry.code || entry.label || entry.host || entry.text || "", "");
        const id = clean(entry.id || entry.emote_id || entry.emoteId || "", "");
        if (!code || !id || seen.has(code)) return;
        seen.add(code);
        out.push({ code, id });
    };
    const buckets = [
        payload?.emote_set?.emotes,
        payload?.emotes,
        payload?.data?.emotes,
        payload?.data?.emote_set?.emotes,
        payload?.emoteSet?.emotes,
        payload?.emoteSet?.data?.emotes,
        payload?.emote_set?.data?.emotes,
    ];
    buckets.flat().forEach(collect);
    return out;
}

async function fetch7tvEmotes(channel) {
    const normalized = normalizeChannel(channel);
    if (!normalized) return new Map();
    const endpoints = [
        `https://7tv.io/v3/users/twitch/${encodeURIComponent(normalized)}`,
        `https://7tv.io/v3/users/twitch/${encodeURIComponent(normalized.toLowerCase())}`,
    ];
    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                headers: {
                    accept: "application/json,text/plain,*/*",
                    "user-agent": "Mozilla/5.0",
                },
            });
            if (!res.ok) continue;
            const data = await res.json();
            const emotes = parse7tvUserPayload(data);
            if (emotes.length) {
                return new Map(emotes.map((emote) => [emote.code, `https://cdn.7tv.app/emote/${emote.id}/4x.webp`]));
            }
        } catch {}
    }
    return new Map();
}

function splitTextIntoFragments(text, emoteMap = new Map()) {
    const fragments = [];
    const source = String(text || "");
    if (!source) return fragments;
    const tokens = source.split(/(\s+)/);
    for (const token of tokens) {
        if (!token) continue;
        const cleanToken = token.trim();
        if (cleanToken && emoteMap.has(cleanToken)) {
            fragments.push({ type: "emote", name: cleanToken, url: emoteMap.get(cleanToken) });
        } else {
            fragments.push({ type: "text", content: token });
        }
    }
    return fragments;
}

function buildTwitchMessageFragments(message, tags = {}) {
    const text = String(message || "");
    if (!text) return [];
    const ranges = [];
    const emotes = String(tags.emotes || "").trim();
    if (emotes) {
        emotes.split("/").forEach((chunk) => {
            const [id, positions] = chunk.split(":");
            if (!id || !positions) return;
            positions.split(",").forEach((pair) => {
                const [start, end] = pair.split("-").map((value) => Number(value));
                if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
                    ranges.push({ start, end, id });
                }
            });
        });
    }
    if (!ranges.length) return splitTextIntoFragments(text, global7tvEmotes);
    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    const fragments = [];
    let cursor = 0;
    for (const range of ranges) {
        if (range.start < cursor) continue;
        const before = text.slice(cursor, range.start);
        if (before) fragments.push(...splitTextIntoFragments(before, global7tvEmotes));
        const raw = text.slice(range.start, range.end + 1);
        fragments.push({
            type: "emote",
            name: raw || `emote-${range.id}`,
            url: `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(range.id)}/default/dark/3.0`,
        });
        cursor = range.end + 1;
    }
    const after = text.slice(cursor);
    if (after) fragments.push(...splitTextIntoFragments(after, global7tvEmotes));
    return fragments;
}

function clean(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function avatarFallback(seed) {
    const label = String(seed || "Twitch").replace(/^@+/, "").replace(/^#+/, "").trim();
    const initial = (label.match(/[A-Za-z0-9]/)?.[0] || "T").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9146ff"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#fff">${initial}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function fetchText(url, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
                accept: "text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

function cleanLogin(value) {
    return clean(value, "")
        .replace(/^@+/, "")
        .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
        .split(/[/?#]/)[0]
        .trim();
}

async function resolveTwitchAvatar(username) {
    const login = cleanLogin(username).toLowerCase();
    if (!login) return avatarFallback("Twitch");

    if (avatarCache.has(login)) return avatarCache.get(login);
    if (pendingAvatarRequests.has(login)) return pendingAvatarRequests.get(login);

    const request = (async () => {
        const text = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`);
        const avatar = String(text || "").trim();
        return /^https?:\/\//i.test(avatar) ? avatar : avatarFallback(login);
    })()
        .then((resolved) => {
            avatarCache.set(login, resolved);
            return resolved;
        })
        .catch(() => {
            const resolved = avatarFallback(login);
            avatarCache.set(login, resolved);
            return resolved;
        })
        .finally(() => {
            pendingAvatarRequests.delete(login);
        });

    pendingAvatarRequests.set(login, request);
    return request;
}

let sessionStats = {
    viewers: 0,
    subs: 0,
    bits: 0,
    raids: 0,
    followers: 0,
};

function normalizeChannel(channel) {
    let value = clean(channel);

    value = value
        .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
        .replace(/^@/i, "")
        .replace(/^#/i, "");

    value = value.split(/[/?#]/)[0].trim();
    return value;
}

function getIO() {
    return globalThis.__STREAMFUSION_IO__ || null;
}

function emitSystem(io, message) {
    io?.emit("system", {
        platform: "twitch",
        type: "system",
        message: clean(message, "Error desconocido"),
        timestamp: Date.now(),
    });
}

function emitChat(io, event) {
    io?.emit("chat", {
        platform: "twitch",
        timestamp: Date.now(),
        type: clean(event.type, "chat"),
        action: clean(event.action, "Comentario"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        displayName: clean(event.displayName || event.user, "Usuario"),
        message: clean(event.message, "Mensaje sin texto"),
        messageFragments: Array.isArray(event.messageFragments) ? event.messageFragments : [],
        color: event.color !== undefined ? event.color : undefined,
        badges: event.badges !== undefined ? event.badges : undefined,
        emotes: event.emotes !== undefined ? event.emotes : undefined,
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
    });
}

function emitEvent(io, event) {
    io?.emit("event", {
        platform: "twitch",
        timestamp: Date.now(),
        type: clean(event.type, "system"),
        action: clean(event.action, "Evento"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        displayName: clean(event.displayName || event.user, "Usuario"),
        message: clean(event.message, ""),
        messageFragments: Array.isArray(event.messageFragments) ? event.messageFragments : [],
        color: event.color !== undefined ? event.color : undefined,
        badges: event.badges !== undefined ? event.badges : undefined,
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        bits: event.bits !== undefined ? event.bits : undefined,
        gift: event.gift !== undefined ? event.gift : undefined,
    });
}

function emitStats(io) {
    io?.emit("stats", {
        twitch: {
            ...sessionStats,
        },
    });
}

function resetSessionStats() {
    sessionStats = {
        viewers: 0,
        subs: 0,
        bits: 0,
        raids: 0,
        followers: 0,
    };
}

function getDisplayName(tags) {
    return clean(tags?.["display-name"] || tags?.username || "Usuario", "Usuario");
}

function getLogin(tags) {
    return clean(tags?.username || tags?.login || tags?.["login"] || tags?.["display-name"] || "Usuario", "Usuario");
}

function getUniqueId(tags) {
    return clean(tags?.["user-id"] || tags?.username || "", "");
}

function getBadges(tags) {
    return tags?.badges || {};
}

function getColor(tags) {
    return tags?.color || "";
}

function guessSubCountFromMessage(message) {
    const text = clean(message, "");
    const match = text.match(/(\d+)/);
    if (!match) return 1;
    const n = Number(match[1]);
    return Number.isFinite(n) && n > 0 ? n : 1;
}


export async function connect(channel, io) {
    const normalizedChannel = normalizeChannel(channel);
    if (!normalizedChannel) {
        emitSystem(io, "Canal de Twitch inválido");
        return;
    }

    if (client) {
        try {
            await client.disconnect();
        } catch {}
        client = null;
    }

    global7tvEmotes = await fetch7tvEmotes(normalizedChannel);

    client = new tmi.Client({
        options: {
            debug: false,
        },
        connection: {
            reconnect: true,
            secure: true,
        },
        identity: {
            username: process.env.TWITCH_BOT_USERNAME || process.env.TWITCH_USERNAME || "",
            password: process.env.TWITCH_BOT_OAUTH || process.env.TWITCH_OAUTH || "",
        },
        channels: [normalizedChannel],
    });

    client.on("message", async (channelName, tags, message, self) => {
        if (self) return;
        const login = clean(tags.username || tags["display-name"] || tags.username || "");
        const displayName = clean(tags["display-name"] || login || "Usuario", login || "Usuario");
        const text = clean(message, "");
        const badges = normalizeTwitchBadges(tags);
        const fragments = buildTwitchMessageFragments(text, tags);
        const avatar = await resolveTwitchAvatar(login || displayName);

        const payload = {
            platform: "twitch",
            type: "chat",
            action: "Comentario",
            user: login || displayName,
            uniqueId: getUniqueId(tags),
            displayName,
            avatar,
            message: text,
            messageFragments: fragments,
            badges,
            color: clean(tags.color, ""),
            emotes: clean(tags.emotes, ""),
            roomId: clean(tags["room-id"] || tags.roomId, ""),
            login,
            messageId: clean(tags.id || "", ""),
        };

        if (String(tags["message-type"] || "").toLowerCase() === "action") {
            payload.type = "action";
            payload.action = "Acción";
        }

        emitChat(io, payload);
    });

    client.on("sub", async (channelName, username, streakMonths, message, userstate) => {
        sessionStats.subs += 1;
        emitStats(io);
        const login = clean(username, "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Sub",
            user: login,
            uniqueId: getUniqueId(userstate),
            displayName: login,
            avatar: await resolveTwitchAvatar(login),
            message: clean(message, `${login} se suscribió`),
            amount: toNumber(streakMonths, 1),
            badges: normalizeTwitchBadges(userstate || {}),
        });
    });

    client.on("resub", async (channelName, username, months, message, userstate) => {
        sessionStats.subs += 1;
        emitStats(io);
        const login = clean(username, "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Resub",
            user: login,
            uniqueId: getUniqueId(userstate),
            displayName: login,
            avatar: await resolveTwitchAvatar(login),
            message: clean(message, `${login} renovó su suscripción`),
            amount: toNumber(months, 1),
            badges: normalizeTwitchBadges(userstate || {}),
        });
    });

    client.on("subgift", async (channelName, username, streakMonths, recipient, methods, userstate) => {
        sessionStats.subs += 1;
        emitStats(io);
        const login = clean(username, "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "gift",
            action: "Gift Sub",
            user: login,
            uniqueId: getUniqueId(userstate),
            displayName: login,
            avatar: await resolveTwitchAvatar(login),
            message: `${login} regaló una suscripción a ${clean(recipient, "alguien")}`,
            amount: toNumber(streakMonths, 1),
            badges: normalizeTwitchBadges(userstate || {}),
        });
    });

    client.on("cheer", async (channelName, userstate, message) => {
        sessionStats.bits += toNumber(userstate?.bits, 0);
        emitStats(io);
        const login = clean(userstate?.username || userstate?.["display-name"] || "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "cheer",
            action: "Bits",
            user: login,
            uniqueId: getUniqueId(userstate),
            displayName: clean(userstate?.["display-name"] || login, login),
            avatar: await resolveTwitchAvatar(login),
            message: clean(message, `${login} envió bits`),
            amount: toNumber(userstate?.bits, 0),
            badges: normalizeTwitchBadges(userstate || {}),
        });
    });

    client.on("follow", async (channelName, username, self) => {
        if (self) return;
        sessionStats.followers += 1;
        emitStats(io);
        const login = clean(username, "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "follow",
            action: "Follow",
            user: login,
            uniqueId: "",
            displayName: login,
            avatar: await resolveTwitchAvatar(login),
            message: `${login} siguió el canal`,
            badges: normalizeTwitchBadges({ badges: { follower: "1" } }),
        });
    });

    client.on("raided", async (channelName, username, viewers) => {
        sessionStats.raids += 1;
        emitStats(io);
        const login = clean(username, "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "raid",
            action: "Raid",
            user: login,
            uniqueId: "",
            displayName: login,
            avatar: await resolveTwitchAvatar(login),
            message: `${login} llegó con ${toNumber(viewers, 0)} viewers`,
            amount: toNumber(viewers, 0),
        });
    });

    client.on("hosted", async (channelName, username, viewers) => {
        const login = clean(username, "Usuario");
        emitEvent(io, {
            platform: "twitch",
            type: "host",
            action: "Host",
            user: login,
            uniqueId: "",
            displayName: login,
            avatar: await resolveTwitchAvatar(login),
            message: `${login} hosteó con ${toNumber(viewers, 0)} viewers`,
            amount: toNumber(viewers, 0),
        });
    });

    client.on("connected", async () => {
        emitSystem(io, `Conectado a Twitch: ${normalizedChannel}`);
    });

    client.on("disconnected", (reason) => {
        emitSystem(io, `Twitch desconectado. ${clean(reason, "")}`);
    });

    await client.connect();
}
export async function disconnect() {
    if (!client) return;

    try {
        await client.disconnect();
    } catch {}

    client = null;
}
