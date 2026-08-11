import tmi from "tmi.js";

const clients = new Map();
const statsByUser = new Map();

const avatarCache = new Map();
const pendingAvatarRequests = new Map();

function clean(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
}

function stripBracketedSegments(value) {
    return String(value ?? "")
        .replace(/\s*\[[^\]]*\]\s*/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
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

function eventIdFor(event = {}, type = "event") {
    const raw = event?.id ?? event?.eventId ?? event?.messageId ?? event?.['message-id'] ?? event?.tags?.id ?? event?.tags?.['id'];
    if (raw) return String(raw);
    const user = event?.uniqueId ?? event?.user ?? event?.displayName ?? "user";
    const message = event?.message ?? event?.type ?? type;
    return `${type}:${String(user)}:${String(message)}:${Math.floor(Date.now() / 250)}`;
}

function emitSystem(io, message) {
    io?.emit("system", {
        platform: "twitch",
        type: "system",
        message: clean(message, "Error desconocido"),
        timestamp: Date.now(),
    });
}

function emitChat(io, event, userId = null) {
    userId = userId || io?.__ownerId || null;
    const payload = {
        platform: "twitch",
        eventId: clean(event.eventId, eventIdFor(event, "chat")),
        timestamp: Date.now(),
        type: clean(event.type, "chat"),
        action: clean(event.action, "Comentario"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(stripBracketedSegments(event.message), "Mensaje sin texto"),
        source: "chat",
        color: event.color !== undefined ? event.color : undefined,
        badges: event.badges !== undefined ? event.badges : undefined,
        emotes: event.emotes !== undefined ? event.emotes : undefined,
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
    };
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestChat?.(payload, userId);
    const target = userId ? io?.to?.(`user:${userId}`) : io;
    target?.emit("chat", payload);
}

function emitEvent(io, event, userId = null) {
    userId = userId || io?.__ownerId || null;
    const payload = {
        platform: "twitch",
        eventId: clean(event.eventId, eventIdFor(event, event.type || "event")),
        timestamp: Date.now(),
        type: clean(event.type, "system"),
        action: clean(event.action, "Evento"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(stripBracketedSegments(event.message), ""),
        source: "event",
        color: event.color !== undefined ? event.color : undefined,
        badges: event.badges !== undefined ? event.badges : undefined,
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        bits: event.bits !== undefined ? event.bits : undefined,
        gift: event.gift !== undefined ? event.gift : undefined,
    };
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestEvent?.(payload, userId);
    const target = userId ? io?.to?.(`user:${userId}`) : io;
    target?.emit("event", payload);
}

function emitStats(io, userId = null) {
    userId = userId || io?.__ownerId || null;
    const stats = userId ? (statsByUser.get(String(userId)) || sessionStats) : sessionStats;
    const target = userId ? io?.to?.(`user:${userId}`) : io;
    target?.emit("stats", { twitch: { ...stats } });
}

function resetSessionStats(userId = null) {
    const fresh = { viewers: 0, subs: 0, bits: 0, raids: 0, followers: 0 };
    if (userId) statsByUser.set(String(userId), fresh); else sessionStats = fresh;
    return fresh;
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

export async function connect(channel, io, userId = null) {
    const ownerId = String(userId || "global");
    const previous = clients.get(ownerId);
    if (previous) { try { await previous.disconnect(); } catch {} }
    const ownerStats = resetSessionStats(ownerId);
    const roomIo = ownerId === "global" ? io : {
        __ownerId: ownerId,
        emit: (event, payload) => io.to(`user:${ownerId}`).emit(event, payload),
        to: (room) => io.to(room)
    };

    const normalizedChannel = normalizeChannel(channel);

    if (!normalizedChannel) {
        throw new Error("Debes ingresar un canal válido de Twitch.");
    }

    const liveClient = new tmi.Client({
        channels: [normalizedChannel],
        connection: {
            secure: true,
            reconnect: true,
        },
    });

    liveClient.on("connected", () => {
        roomIo.emit("accountState", { platform: "twitch", username: normalizedChannel, connected: true, live: true, mode: "live" });
        emitSystem(roomIo, `Twitch conectado a #${normalizedChannel}.`);
        emitStats(io, ownerId);
    });

    liveClient.on("message", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);

        emitChat(roomIo, {
            platform: "twitch",
            type: "chat",
            action: "Comentario",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message: stripBracketedSegments(message),
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            avatar: await resolveTwitchAvatar(login),
        });
    });

    liveClient.on("action", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);

        emitChat(roomIo, {
            platform: "twitch",
            type: "chat",
            action: "Acción",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message: stripBracketedSegments(message),
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            avatar: await resolveTwitchAvatar(login),
        });
    });

    liveClient.on("subscription", async (channelName, username, method, message, userstate) => {
        const user = clean(username, "Usuario");
        const months = toNumber(userstate?.["msg-param-cumulative-months"] || userstate?.["msg-param-months"] || 1, 1);

        ownerStats.subs += 1;
        emitStats(io, ownerId);

        emitEvent(roomIo, {
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

    liveClient.on("resub", async (channelName, username, months, message, userstate, methods) => {
        const user = clean(username, "Usuario");
        const totalMonths = toNumber(months, 1);

        ownerStats.subs += 1;
        emitStats(io, ownerId);

        emitEvent(roomIo, {
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

    liveClient.on("subgift", async (channelName, username, streakMonths, recipient, methods, userstate) => {
        const gifter = clean(username, "Usuario");
        const target = clean(recipient, "Usuario");

        ownerStats.subs += 1;
        emitStats(io, ownerId);

        emitEvent(roomIo, {
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

    liveClient.on("giftpaidupgrade", async (channelName, username, sender, userstate) => {
        const user = clean(username, "Usuario");
        const fromUser = clean(sender, "Usuario");

        ownerStats.subs += 1;
        emitStats(io, ownerId);

        emitEvent(roomIo, {
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

    liveClient.on("anongiftpaidupgrade", async (channelName, username, userstate) => {
        const user = clean(username, "Usuario");

        ownerStats.subs += 1;
        emitStats(io, ownerId);

        emitEvent(roomIo, {
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

    liveClient.on("cheer", async (channelName, tags, message) => {
        const user = getDisplayName(tags);
        const bits = toNumber(tags?.bits, 0);
        const login = getLogin(tags);

        if (bits > 0) {
            ownerStats.bits += bits;
            emitStats(io, ownerId);
        }

        emitEvent(roomIo, {
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

    liveClient.on("raided", async (channelName, username, viewers) => {
        const user = clean(username, "Usuario");
        const raidViewers = toNumber(viewers, 0);

        ownerStats.raids += 1;
        if (raidViewers > 0) {
            ownerStats.viewers = raidViewers;
        }
        emitStats(io, ownerId);

        emitEvent(roomIo, {
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

    liveClient.on("hosttarget", async (channelName, username, viewers, autohost) => {
        const user = clean(username, "Usuario");
        const hostViewers = toNumber(viewers, 0);

        if (hostViewers > 0) {
            ownerStats.viewers = hostViewers;
            emitStats(io, ownerId);
        }

        emitEvent(roomIo, {
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

    liveClient.on("notice", async (channelName, msgid, message, tags) => {
        const text = clean(message, "Aviso de Twitch");
        const user = getDisplayName(tags);
        const login = getLogin(tags);

        if (msgid === "sub") {
            ownerStats.subs += 1;
            emitStats(io, ownerId);
            emitEvent(roomIo, {
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
            ownerStats.subs += 1;
            emitStats(io, ownerId);
            emitEvent(roomIo, {
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
            ownerStats.subs += 1;
            emitStats(io, ownerId);
            emitEvent(roomIo, {
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

        emitEvent(roomIo, {
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: text,
        });
    });

    liveClient.on("roomstate", async (channelName, state) => {
        emitEvent(roomIo, {
            platform: "twitch",
            type: "system",
            action: "Sala",
            user: "Twitch",
            uniqueId: "",
            message: "Estado de sala actualizado",
        });
    });

    liveClient.on("clearchat", async (channelName) => {
        emitEvent(roomIo, {
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: "El chat fue limpiado",
        });
    });

    liveClient.on("timeout", async (channelName, username, reason, duration, userstate) => {
        emitEvent(roomIo, {
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue sancionado${duration ? ` por ${duration}s` : ""}`,
        });
    });

    liveClient.on("ban", async (channelName, username, reason, userstate) => {
        emitEvent(roomIo, {
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue baneado`,
        });
    });

    liveClient.on("disconnected", (reason) => {
        emitSystem(roomIo, `Twitch desconectado. ${clean(reason, "")}`);
    });

    clients.set(ownerId, liveClient);
    await liveClient.connect();
}

export async function disconnect(userId = null) {
    const ownerId = String(userId || "global");
    const liveClient = clients.get(ownerId);
    if (!liveClient) return;
    try { await liveClient.disconnect(); } catch {}
    clients.delete(ownerId);
    statsByUser.delete(ownerId);
}
