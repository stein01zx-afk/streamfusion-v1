import tmi from "tmi.js";

let client = null;

const avatarCache = new Map();
const pendingAvatarRequests = new Map();

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


function normalizeImageSource(value) {
    const src = String(value ?? "").trim();
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src;
    return "";
}

function normalizeToken(value) {
    return String(value ?? "")
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
        .toLowerCase();
}

function parseTwitchEmoteRanges(emoteString) {
    const ranges = [];
    String(emoteString || "").split("/").forEach((chunk) => {
        const [id, positions] = chunk.split(":");
        if (!id || !positions) return;
        positions.split(",").forEach((pair) => {
            const [start, end] = pair.split("-").map((v) => Number(v));
            if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
                ranges.push({ start, end, id: String(id) });
            }
        });
    });
    return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

function buildTwitchMessageFragments(message, tags, sevenTvMap = new Map()) {
    const text = clean(message, "");
    if (!text) return [{ type: "text", content: "" }];

    const ranges = parseTwitchEmoteRanges(tags?.emotes || tags?.emote_sets || "");
    const fragments = [];
    const tokenRegex = /\s+|\S+/gu;
    let match;
    while ((match = tokenRegex.exec(text))) {
        const token = match[0];
        if (/^\s+$/u.test(token)) {
            if (fragments.length && fragments[fragments.length - 1].type === "text") {
                fragments[fragments.length - 1].content += token;
            } else {
                fragments.push({ type: "text", content: token });
            }
            continue;
        }

        const tokenStart = match.index;
        const tokenEnd = tokenStart + token.length - 1;
        const emoteRange = ranges.find((range) => range.start === tokenStart && range.end === tokenEnd);
        const normalized = normalizeToken(token);
        const sevenTvUrl = sevenTvMap.get(normalized);

        if (emoteRange) {
            fragments.push({
                type: "emote",
                url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteRange.id}/default/dark/3.0`,
                name: token,
            });
        } else if (sevenTvUrl) {
            fragments.push({ type: "emote", url: sevenTvUrl, name: token });
        } else {
            fragments.push({ type: "text", content: token });
        }
    }

    return fragments.length ? fragments : [{ type: "text", content: text }];
}

async function fetchJson(url, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "user-agent": "Mozilla/5.0",
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

async function fetchSevenTvEmoteMap(channel) {
    const map = new Map();
    const login = cleanLogin(channel).toLowerCase();
    if (!login) return map;

    const endpoints = [
        `https://7tv.io/v3/users/twitch/${encodeURIComponent(login)}`,
        `https://7tv.io/v3/users/twitch/${encodeURIComponent(login)}/emotes`,
    ];

    const pushEmote = (emote) => {
        if (!emote || typeof emote !== "object") return;
        const name = normalizeToken(emote.name || emote.code || emote.original_name || emote.id || emote?.data?.name);
        const url = normalizeImageSource(
            emote.image_url ||
            emote.url ||
            emote?.data?.host?.url ||
            emote?.data?.host?.files?.find?.((file) => file?.name?.includes("3x"))?.url ||
            emote?.data?.host?.files?.[0]?.url ||
            emote?.host?.url ||
            emote?.urls?.[0]?.[1] ||
            emote?.urls?.[0]
        );
        if (name && url && !map.has(name)) map.set(name, url);
    };

    for (const endpoint of endpoints) {
        const data = await fetchJson(endpoint);
        if (!data) continue;
        const possibleArrays = [
            data.emotes,
            data.emote_set?.emotes,
            data.emoteSet?.emotes,
            data?.emote_set?.data?.emotes,
            Array.isArray(data) ? data : null,
        ].filter(Boolean);
        for (const arr of possibleArrays) {
            if (Array.isArray(arr)) arr.forEach(pushEmote);
        }
    }

    return map;
}

async function fetchTwitchBadgeMap(roomId = "") {
    const map = new Map();
    const sources = [
        "https://badges.twitch.tv/v1/badges/global/display?language=en",
        roomId ? `https://badges.twitch.tv/v1/badges/channels/${encodeURIComponent(roomId)}/display?language=en` : "",
    ].filter(Boolean);

    const pushSet = (setName, version, badge) => {
        const url = normalizeImageSource(badge?.image_url_1x || badge?.image_url_2x || badge?.image_url_4x || badge?.imageUrl || badge?.url);
        if (!setName || !version || !url) return;
        const key = `${String(setName).toLowerCase()}/${String(version).toLowerCase()}`;
        if (!map.has(key)) map.set(key, url);
        const setKey = String(setName).toLowerCase();
        if (!map.has(setKey)) map.set(setKey, url);
    };

    for (const url of sources) {
        const data = await fetchJson(url);
        const sets = data?.badge_sets || data?.badgeSets || data?.sets || {};
        for (const [setName, setData] of Object.entries(sets)) {
            const versions = setData?.versions || setData?.versionsData || {};
            for (const [version, badge] of Object.entries(versions)) {
                pushSet(setName, version, badge);
            }
        }
    }

    return map;
}

function extractRealBadgeUrls(tags, badgeMap = new Map()) {
    const urls = [];
    const badges = tags?.badges || {};
    const badgeInfo = tags?.["badge-info"] || tags?.badgeInfo || {};
    const push = (value) => {
        const src = normalizeImageSource(value);
        if (src && !urls.includes(src)) urls.push(src);
    };
    const addFromKey = (setName, version) => {
        const key = `${String(setName || "").toLowerCase()}/${String(version || "").toLowerCase()}`;
        push(badgeMap.get(key) || badgeMap.get(String(setName || "").toLowerCase()));
    };
    if (badges && typeof badges === "object") {
        for (const [setName, version] of Object.entries(badges)) addFromKey(setName, version);
    }
    if (badgeInfo && typeof badgeInfo === "object") {
        for (const [setName, version] of Object.entries(badgeInfo)) addFromKey(setName, version);
    }
    return urls;
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
        message: clean(event.message, "Mensaje sin texto"),
        messageFragments: Array.isArray(event.messageFragments) ? event.messageFragments : [],
        realBadgeUrls: Array.isArray(event.realBadgeUrls) ? event.realBadgeUrls : [],
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
        message: clean(event.message, ""),
        messageFragments: Array.isArray(event.messageFragments) ? event.messageFragments : [],
        realBadgeUrls: Array.isArray(event.realBadgeUrls) ? event.realBadgeUrls : [],
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
    globalThis.__STREAMFUSION_IO__ = io;

    if (client) {
        try {
            await client.disconnect();
        } catch {}
        client = null;
    }

    const normalizedChannel = normalizeChannel(channel);

    if (!normalizedChannel) {
        throw new Error("Debes ingresar un canal válido de Twitch.");
    }

    resetSessionStats();

    const sevenTvMap = await fetchSevenTvEmoteMap(normalizedChannel);
    const twitchBadgeMap = await fetchTwitchBadgeMap();

    client = new tmi.Client({
        channels: [normalizedChannel],
        connection: {
            secure: true,
            reconnect: true,
        },
    });

    client.on("connected", () => {
        emitSystem(io, `Twitch conectado a #${normalizedChannel}.`);
        emitStats(io);
    });

    client.on("message", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);
        const roomId = clean(tags?.["room-id"] || tags?.roomId || "", "");
        if (roomId) {
            try {
                const roomMap = await fetchTwitchBadgeMap(roomId);
                for (const [key, value] of roomMap.entries()) twitchBadgeMap.set(key, value);
            } catch {}
        }

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Comentario",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message,
            messageFragments: buildTwitchMessageFragments(message, tags, sevenTvMap),
            realBadgeUrls: extractRealBadgeUrls(tags, twitchBadgeMap),
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            avatar: await resolveTwitchAvatar(login),
        });
    });

    client.on("action", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);
        const roomId = clean(tags?.["room-id"] || tags?.roomId || "", "");
        if (roomId) {
            try {
                const roomMap = await fetchTwitchBadgeMap(roomId);
                for (const [key, value] of roomMap.entries()) twitchBadgeMap.set(key, value);
            } catch {}
        }

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Acción",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message,
            messageFragments: buildTwitchMessageFragments(message, tags, sevenTvMap),
            realBadgeUrls: extractRealBadgeUrls(tags, twitchBadgeMap),
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            avatar: await resolveTwitchAvatar(login),
        });
    });

    client.on("subscription", async (channelName, username, method, message, userstate) => {
        const user = clean(username, "Usuario");
        const months = toNumber(userstate?.["msg-param-cumulative-months"] || userstate?.["msg-param-months"] || 1, 1);

        sessionStats.subs += 1;
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Sub",
            user,
            uniqueId: getUniqueId(userstate),
            color: getColor(userstate),
            badges: getBadges(userstate),
            avatar: await resolveTwitchAvatar(user),
            message: `${user} se suscribió${months > 0 ? ` (${months} meses)` : ""}`,
            amount: 1,
        });
    });

    client.on("resub", async (channelName, username, months, message, userstate, methods) => {
        const user = clean(username, "Usuario");
        const totalMonths = toNumber(months, 1);

        sessionStats.subs += 1;
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Re-Sub",
            user,
            uniqueId: getUniqueId(userstate),
            color: getColor(userstate),
            badges: getBadges(userstate),
            avatar: await resolveTwitchAvatar(user),
            message: `${user} renovó su sub por ${totalMonths} mes${totalMonths === 1 ? "" : "es"}`,
            amount: 1,
        });
    });

    client.on("subgift", async (channelName, username, streakMonths, recipient, methods, userstate) => {
        const gifter = clean(username, "Usuario");
        const target = clean(recipient, "Usuario");

        sessionStats.subs += 1;
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Gift Sub",
            user: gifter,
            uniqueId: getUniqueId(userstate),
            color: getColor(userstate),
            badges: getBadges(userstate),
            avatar: await resolveTwitchAvatar(gifter),
            message: `${gifter} regaló una sub a ${target}`,
            amount: 1,
        });
    });

    client.on("giftpaidupgrade", async (channelName, username, sender, userstate) => {
        const user = clean(username, "Usuario");
        const fromUser = clean(sender, "Usuario");

        sessionStats.subs += 1;
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Gift Sub",
            user,
            uniqueId: getUniqueId(userstate),
            color: getColor(userstate),
            badges: getBadges(userstate),
            avatar: await resolveTwitchAvatar(user),
            message: `${user} recibió una sub regalada por ${fromUser}`,
            amount: 1,
        });
    });

    client.on("anongiftpaidupgrade", async (channelName, username, userstate) => {
        const user = clean(username, "Usuario");

        sessionStats.subs += 1;
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Gift Sub",
            user,
            uniqueId: getUniqueId(userstate),
            avatar: await resolveTwitchAvatar(user),
            message: `${user} recibió una sub anónima`,
            amount: 1,
        });
    });

    client.on("cheer", async (channelName, tags, message) => {
        const user = getDisplayName(tags);
        const bits = toNumber(tags?.bits, 0);
        const login = getLogin(tags);

        if (bits > 0) {
            sessionStats.bits += bits;
            emitStats(io);
        }

        emitEvent(io, {
            platform: "twitch",
            type: "bits",
            action: "Bits",
            user,
            uniqueId: getUniqueId(tags),
            color: getColor(tags),
            badges: getBadges(tags),
            avatar: await resolveTwitchAvatar(login),
            message: `${user} envió ${bits} Bits`,
            amount: bits,
            bits,
        });
    });

    client.on("raided", async (channelName, username, viewers) => {
        const user = clean(username, "Usuario");
        const raidViewers = toNumber(viewers, 0);

        sessionStats.raids += 1;
        if (raidViewers > 0) {
            sessionStats.viewers = raidViewers;
        }
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "raid",
            action: "Raid",
            user,
            uniqueId: "",
            color: "",
            badges: [],
            avatar: await resolveTwitchAvatar(user),
            message: `${user} hizo raid`,
        });
    });

    client.on("hosttarget", async (channelName, username, viewers, autohost) => {
        const user = clean(username, "Usuario");
        const hostViewers = toNumber(viewers, 0);

        if (hostViewers > 0) {
            sessionStats.viewers = hostViewers;
            emitStats(io);
        }

        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Host",
            user,
            uniqueId: "",
            color: "",
            badges: [],
            avatar: await resolveTwitchAvatar(user),
            message: `${user} hosteó el canal`,
        });
    });

    client.on("notice", async (channelName, msgid, message, tags) => {
        const text = clean(message, "Aviso de Twitch");
        const user = getDisplayName(tags);
        const login = getLogin(tags);

        if (msgid === "sub") {
            sessionStats.subs += 1;
            emitStats(io);
            emitEvent(io, {
                platform: "twitch",
                type: "sub",
                action: "Sub",
                user,
                uniqueId: getUniqueId(tags),
                avatar: await resolveTwitchAvatar(login),
                message: text,
                amount: 1,
            });
            return;
        }

        if (msgid === "resub") {
            sessionStats.subs += 1;
            emitStats(io);
            emitEvent(io, {
                platform: "twitch",
                type: "sub",
                action: "Re-Sub",
                user,
                uniqueId: getUniqueId(tags),
                avatar: await resolveTwitchAvatar(login),
                message: text,
                amount: 1,
            });
            return;
        }

        if (msgid === "subgift") {
            sessionStats.subs += 1;
            emitStats(io);
            emitEvent(io, {
                platform: "twitch",
                type: "sub",
                action: "Gift Sub",
                user,
                uniqueId: getUniqueId(tags),
                avatar: await resolveTwitchAvatar(login),
                message: text,
                amount: 1,
            });
            return;
        }

        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: text,
        });
    });

    client.on("roomstate", async (channelName, state) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Sala",
            user: "Twitch",
            uniqueId: "",
            message: "Estado de sala actualizado",
        });
    });

    client.on("clearchat", async (channelName) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: "El chat fue limpiado",
        });
    });

    client.on("timeout", async (channelName, username, reason, duration, userstate) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue sancionado${duration ? ` por ${duration}s` : ""}`,
        });
    });

    client.on("ban", async (channelName, username, reason, userstate) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue baneado`,
        });
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
