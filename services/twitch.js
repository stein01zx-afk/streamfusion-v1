import tmi from "tmi.js";
import { recordChat, recordEvent } from "./live-history.js";

let client = null;
let connectionGeneration = 0;
let liveStatusTimer = null;

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
    if (!login) return "";

    if (avatarCache.has(login)) return avatarCache.get(login);
    if (pendingAvatarRequests.has(login)) return pendingAvatarRequests.get(login);

    const request = (async () => {
        const text = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`);
        const avatar = String(text || "").trim();
        return /^https?:\/\//i.test(avatar) ? avatar : "";
    })()
        .then((resolved) => {
            avatarCache.set(login, resolved);
            return resolved;
        })
        .catch(() => {
            avatarCache.set(login, "");
            return "";
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


let connectionOwnerId = "";
function emitSystem(io, message) {
    io?.emit("system", {
        platform: "twitch",
        type: "system",
        message: clean(message, "Error desconocido"),
        timestamp: Date.now(),
    });
}

function emitChat(io, event, ownerId = connectionOwnerId) {
    const payload = {
        platform: "twitch",
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
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestChat?.({ ...payload, _ownerId: ownerId });
    recordChat(payload);
    io?.emit("chat", payload);
}

function emitEvent(io, event, ownerId = connectionOwnerId) {
    const payload = {
        platform: "twitch",
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
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestEvent?.({ ...payload, _ownerId: ownerId });
    recordEvent(payload);
    io?.emit("event", payload);
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

async function fetchTwitchLive(channel) {
    const login = cleanLogin(channel);
    if (!login) return false;
    try {
        const text = await fetchText(`https://decapi.me/twitch/uptime/${encodeURIComponent(login)}`, 5000);
        const value = String(text || '').trim().toLowerCase();
        if (!value) return false;
        return !/^offline$|^not live$|^not connected$|^error$/.test(value);
    } catch { return false; }
}

function startLiveStatusPolling(channel, io, generation) {
    if (liveStatusTimer) clearInterval(liveStatusTimer);
    const poll = async () => {
        if (generation !== connectionGeneration || !client) return;
        const live = await fetchTwitchLive(channel);
        if (generation !== connectionGeneration || !client) return;
        io?.emit('accountState', { platform:'twitch', username:cleanLogin(channel), connected:true, live, mode:live?'live':'waiting' });
    };
    poll();
    liveStatusTimer = setInterval(poll, 30000);
}

export async function connect(channel, io, ownerId = "") {
    const generation = ++connectionGeneration;
    globalThis.__STREAMFUSION_IO__ = io;
    connectionOwnerId = String(ownerId || "").trim();

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

    client = new tmi.Client({
        channels: [normalizedChannel],
        connection: {
            secure: true,
            reconnect: true,
        },
    });

    client.on("connected", () => {
        if (generation !== connectionGeneration || client === null) return;
        emitSystem(io, `Twitch conectado a #${normalizedChannel}.`);
        io?.emit("accountState", { platform:"twitch", username:normalizedChannel, connected:true, live:false, mode:"waiting" });
        emitStats(io);
        startLiveStatusPolling(normalizedChannel, io, generation);
    });

    client.on("message", async (channelName, tags, message, self) => {
        if (self || generation !== connectionGeneration || client === null) return;

        const login = getLogin(tags);

        emitChat(io, {
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

    client.on("action", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);

        emitChat(io, {
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

    client.on("connected", () => {
        io?.emit("accountState", { platform:"twitch", username:normalizedChannel, connected:true, live:true, mode:"live" });
    });

    client.on("disconnected", (reason) => {
        if (generation !== connectionGeneration) return;
        if (liveStatusTimer) { clearInterval(liveStatusTimer); liveStatusTimer = null; }
        io?.emit("accountState", { platform:"twitch", username:normalizedChannel, connected:false, live:false, mode:"saved" });
        emitSystem(io, `Twitch desconectado. ${clean(reason, "")}`);
    });

    await client.connect();
}

export async function disconnect() {
    connectionGeneration++;
    if (liveStatusTimer) { clearInterval(liveStatusTimer); liveStatusTimer = null; }
    if (!client) return;

    try {
        await client.disconnect();
    } catch {}

    client = null;
    connectionOwnerId = "";
}
