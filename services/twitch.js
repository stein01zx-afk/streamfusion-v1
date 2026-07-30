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

const sevenTvChannelCache = new Map();

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

function twitchEmoteUrl(id, size = "3.0", theme = "dark") {
    const emoteId = clean(id, "");
    if (!emoteId) return "";
    return `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(emoteId)}/default/${theme}/${size}`;
}

function normalizeEmotePositions(tagsEmotes) {
    const ranges = [];
    const source = tagsEmotes && typeof tagsEmotes === "object" ? tagsEmotes : {};
    for (const [id, positions] of Object.entries(source)) {
        if (!id || !Array.isArray(positions)) continue;
        for (const pos of positions) {
            const [start, end] = String(pos).split("-").map((n) => Number(n));
            if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
                ranges.push({ start, end, id: String(id) });
            }
        }
    }
    return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

function addRange(ranges, start, end, data) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return;
    ranges.push({ start, end, ...data });
}

function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickSevenTvImageUrl(emote) {
    if (!emote || typeof emote !== "object") return "";
    const candidates = [
        emote?.data?.host?.url,
        emote?.host?.url,
        emote?.urls?.[2]?.[1],
        emote?.urls?.[1]?.[1],
        emote?.urls?.[0]?.[1],
        emote?.image_url,
        emote?.imageUrl,
        emote?.url,
    ].filter(Boolean);

    for (const candidate of candidates) {
        const value = String(candidate).trim();
        if (!value) continue;
        if (/^https?:\/\//i.test(value)) {
            return value.replace(/\{width\}|\{height\}/gi, "3x").replace(/\{format\}/gi, "webp");
        }
    }

    const id = clean(emote?.id || emote?.emoteId, "");
    if (id) return `https://cdn.7tv.app/emote/${encodeURIComponent(id)}/3x.webp`;
    return "";
}

function buildMessageFragments(message, tagsEmotes, sevenTvMap = new Map()) {
    const text = String(message ?? "");
    if (!text) return [{ type: "text", text: "" }];

    const ranges = [];

    for (const range of normalizeEmotePositions(tagsEmotes)) {
        addRange(ranges, range.start, range.end, {
            provider: "twitch",
            id: range.id,
            src: twitchEmoteUrl(range.id, "3.0", "dark"),
            alt: `Twitch emote ${range.id}`,
        });
    }

    if (sevenTvMap && sevenTvMap.size) {
        const keys = [...sevenTvMap.keys()].sort((a, b) => b.length - a.length);
        for (const key of keys) {
            const url = sevenTvMap.get(key);
            if (!url) continue;
            const matcher = new RegExp(`(^|\s)(${escapeRegex(key)})(?=\s|$)`, "gi");
            let match;
            while ((match = matcher.exec(text)) !== null) {
                const prefixLen = match[1] ? match[1].length : 0;
                const start = match.index + prefixLen;
                const end = start + match[2].length - 1;
                addRange(ranges, start, end, {
                    provider: "7tv",
                    id: key,
                    src: url,
                    alt: `7TV emote ${key}`,
                });
            }
        }
    }

    ranges.sort((a, b) => a.start - b.start || (a.provider === "twitch" ? -1 : 1) || (b.end - a.end));

    const fragments = [];
    let cursor = 0;

    for (const range of ranges) {
        if (range.start < cursor) continue;
        if (range.start > cursor) {
            fragments.push({ type: "text", text: text.slice(cursor, range.start) });
        }
        fragments.push({
            type: "image",
            src: range.src,
            alt: range.alt,
            provider: range.provider,
            emoteId: range.id,
            size: 32,
        });
        cursor = range.end + 1;
    }

    if (cursor < text.length) {
        fragments.push({ type: "text", text: text.slice(cursor) });
    }

    return fragments.length ? fragments : [{ type: "text", text }];
}

async function resolveTwitchUserId(login) {
    const safeLogin = cleanLogin(login).toLowerCase();
    if (!safeLogin) return "";

    const text = await fetchText(`https://decapi.me/twitch/id/${encodeURIComponent(safeLogin)}`);
    const id = clean(text, "").replace(/[^\d]/g, "");
    return id || "";
}

async function primeSevenTvEmotes(channelLogin) {
    const login = cleanLogin(channelLogin).toLowerCase();
    if (!login) return new Map();

    if (sevenTvChannelCache.has(login)) return sevenTvChannelCache.get(login);

    const request = (async () => {
        let user = await fetchJson(`https://7tv.io/v3/users/twitch/${encodeURIComponent(login)}`);
        if (!user) {
            const twitchId = await resolveTwitchUserId(login);
            if (twitchId) user = await fetchJson(`https://7tv.io/v3/users/twitch/${encodeURIComponent(twitchId)}`);
        }

        const emotes = user?.emote_set?.emotes || user?.emoteSet?.emotes || user?.emote_sets?.[0]?.emotes || [];
        const map = new Map();

        if (Array.isArray(emotes)) {
            for (const emote of emotes) {
                const name = clean(emote?.name || emote?.code || emote?.alias || "", "");
                const url = pickSevenTvImageUrl(emote);
                if (name && url && !map.has(name)) map.set(name, url);
            }
        }

        return map;
    })()
        .then((resolved) => {
            sevenTvChannelCache.set(login, resolved);
            return resolved;
        })
        .catch(() => {
            const resolved = new Map();
            sevenTvChannelCache.set(login, resolved);
            return resolved;
        });

    sevenTvChannelCache.set(login, request);
    return request;
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

    await primeSevenTvEmotes(normalizedChannel);

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
        const sevenTvEmotes = sevenTvChannelCache.get(normalizedChannel) instanceof Promise
            ? await sevenTvChannelCache.get(normalizedChannel)
            : (sevenTvChannelCache.get(normalizedChannel) || new Map());

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Comentario",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message,
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            messageFragments: buildMessageFragments(message, tags?.emotes || {}, sevenTvEmotes),
            avatar: await resolveTwitchAvatar(login),
        });
    });

    client.on("action", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);
        const sevenTvEmotes = sevenTvChannelCache.get(normalizedChannel) instanceof Promise
            ? await sevenTvChannelCache.get(normalizedChannel)
            : (sevenTvChannelCache.get(normalizedChannel) || new Map());

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Acción",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message,
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            messageFragments: buildMessageFragments(message, tags?.emotes || {}, sevenTvEmotes),
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
