import tmi from "tmi.js";
import { recordChat, recordEvent } from "./live-history.js";
import * as liveSession from "./live-session.js";

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


let connectionOwnerId = "";
let connectionSessionId = "";
function emitSystem(io, message, ownerId = connectionOwnerId) {
    const text = clean(message, "Error desconocido");
    const timestamp = Date.now();
    const payload = {
        id: `system:twitch:${timestamp}:${cleanLogin(text)}`,
        liveId: liveSession.getLiveId(ownerId, "twitch"),
        platform: "twitch",
        type: "system",
        action: "Sistema",
        emoji: "ℹ️",
        user: "Twitch",
        uniqueId: "",
        avatar: "",
        message: text,
        source: "system",
        connectionId: connectionSessionId,
        timestamp
    };
    recordEvent(payload, ownerId);
    io?.to?.(`user:${ownerId}`)?.emit?.("event", payload);
    io?.to?.(`user:${ownerId}`)?.emit?.("system", payload);
}

function emitChat(io, event, ownerId = connectionOwnerId) {
    const payload = {
        liveId: liveSession.getLiveId(ownerId, "twitch"),
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
        connectionId: event.connectionId || connectionSessionId,
    };
    const enrichedPayload = globalThis.__STREAMFUSION_POINTS_HOOK__?.(ownerId, payload) || payload;
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestChat?.({ ...enrichedPayload, _ownerId: ownerId });
    recordChat(enrichedPayload, ownerId);
    io?.emit("chat", enrichedPayload);
}

function emitEvent(io, event, ownerId = connectionOwnerId) {
    const payload = {
        liveId: liveSession.getLiveId(ownerId, "twitch"),
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
        connectionId: event.connectionId || connectionSessionId,
    };
    const enrichedPayload = globalThis.__STREAMFUSION_POINTS_HOOK__?.(ownerId, payload) || payload;
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestEvent?.({ ...enrichedPayload, _ownerId: ownerId });
    recordEvent(enrichedPayload, ownerId);
    io?.emit("event", enrichedPayload);
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
    let lastLive = false;
    const poll = async () => {
        if (generation !== connectionGeneration || !client) return;
        const live = await fetchTwitchLive(channel);
        if (generation !== connectionGeneration || !client) return;
        if (live && !lastLive) {
            liveSession.begin(connectionOwnerId, 'twitch');
            emitEvent(io, { type:'stream_start', action:'Comenzó el directo', user:cleanLogin(channel), uniqueId:cleanLogin(channel), avatar:await resolveTwitchAvatar(channel), message:`@${cleanLogin(channel)} ha comenzado el directo` }, connectionOwnerId);
        }
        if (!live && lastLive) liveSession.end(connectionOwnerId, 'twitch');
        lastLive = live;
        io?.emit('accountState', { platform:'twitch', username:cleanLogin(channel), connected:true, live, mode:live?'live':'waiting', connectionId:connectionSessionId, liveId:liveSession.getLiveId(connectionOwnerId,'twitch') || '' });
    };
    poll();
    liveStatusTimer = setInterval(poll, 30000);
}

export async function connect(channel, io, ownerId = "") {
    const isActiveGeneration = () => generation === connectionGeneration && client !== null;
    const emitChatActive = (event) => { if (!isActiveGeneration()) return; emitChat(io, event, connectionOwnerId); };
    const emitEventActive = (event) => { if (!isActiveGeneration()) return; emitEvent(io, event, connectionOwnerId); };
    const emitStatsActive = () => { if (!isActiveGeneration()) return; emitStats(io); };
    const emitSystemActive = (message) => { if (!isActiveGeneration()) return; emitSystem(io, message, connectionOwnerId); };

    const generation = ++connectionGeneration;
    connectionSessionId = `twitch-${Date.now()}-${generation}`;
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
        emitSystemActive(`Twitch conectado a #${normalizedChannel}.`);
        io?.emit("accountState", { platform:"twitch", username:normalizedChannel, connected:true, live:false, mode:"waiting", connectionId:connectionSessionId });
        emitStatsActive();
        startLiveStatusPolling(normalizedChannel, io, generation);
    });

    client.on("message", async (channelName, tags, message, self) => {
        if (self || generation !== connectionGeneration || client === null) return;

        const login = getLogin(tags);

        emitChatActive({
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

        emitChatActive({
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
        emitStatsActive();

        emitEventActive({
            platform: "twitch",
            type: "sub",
            activityKind: "gift",
            action: "Suscripción",
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
        emitStatsActive();

        emitEventActive({
            platform: "twitch",
            type: "sub",
            activityKind: "gift",
            action: "Renovación",
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
        emitStatsActive();

        emitEventActive({
            platform: "twitch",
            type: "sub",
            activityKind: "gift",
            action: "Gift Sub",
            user: gifter,
            uniqueId: getUniqueId(userstate),
            color: getColor(userstate),
            badges: getBadges(userstate),
            avatar: await resolveTwitchAvatar(gifter),
            message: `${gifter} regaló una sub a ${target}`,
            gift: "Suscripción de regalo",
            giftName: "Suscripción de regalo",
            giftEmoji: "⭐",
            amount: 1,
        });
    });

    client.on("giftpaidupgrade", async (channelName, username, sender, userstate) => {
        const user = clean(username, "Usuario");
        const fromUser = clean(sender, "Usuario");

        sessionStats.subs += 1;
        emitStatsActive();

        emitEventActive({
            platform: "twitch",
            type: "sub",
            activityKind: "gift",
            action: "Gift Sub",
            user,
            uniqueId: getUniqueId(userstate),
            color: getColor(userstate),
            badges: getBadges(userstate),
            avatar: await resolveTwitchAvatar(user),
            message: `${user} recibió una sub regalada por ${fromUser}`,
            gift: "Suscripción de regalo",
            giftName: "Suscripción de regalo",
            giftEmoji: "⭐",
            amount: 1,
        });
    });

    client.on("anongiftpaidupgrade", async (channelName, username, userstate) => {
        const user = clean(username, "Usuario");

        sessionStats.subs += 1;
        emitStatsActive();

        emitEventActive({
            platform: "twitch",
            type: "sub",
            activityKind: "gift",
            action: "Gift Sub",
            user,
            uniqueId: getUniqueId(userstate),
            avatar: await resolveTwitchAvatar(user),
            message: `${user} recibió una sub anónima`,
            gift: "Suscripción de regalo",
            giftName: "Suscripción de regalo",
            giftEmoji: "⭐",
            amount: 1,
        });
    });

    client.on("cheer", async (channelName, tags, message) => {
        const user = getDisplayName(tags);
        const bits = toNumber(tags?.bits, 0);
        const login = getLogin(tags);

        if (bits > 0) {
            sessionStats.bits += bits;
            emitStatsActive();
        }

        emitEventActive({
            platform: "twitch",
            type: "bits",
            activityKind: "gift",
            action: "Bits",
            user,
            uniqueId: getUniqueId(tags),
            color: getColor(tags),
            badges: getBadges(tags),
            avatar: await resolveTwitchAvatar(login),
            message: `${user} envió ${bits} Bits`,
            gift: "Bits",
            giftName: "Bits",
            giftEmoji: "💎",
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
        emitStatsActive();

        emitEventActive({
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
            emitStatsActive();
        }

        emitEventActive({
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
            emitStatsActive();
            emitEventActive({
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
            emitStatsActive();
            emitEventActive({
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
            emitStatsActive();
            emitEventActive({
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

        emitEventActive({
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: text,
        });
    });

    client.on("roomstate", async (channelName, state) => {
        emitEventActive({
            platform: "twitch",
            type: "system",
            action: "Sala",
            user: "Twitch",
            uniqueId: "",
            message: "Estado de sala actualizado",
        });
    });

    client.on("clearchat", async (channelName) => {
        emitEventActive({
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: "El chat fue limpiado",
        });
    });

    client.on("timeout", async (channelName, username, reason, duration, userstate) => {
        emitEventActive({
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue sancionado${duration ? ` por ${duration}s` : ""}`,
        });
    });

    client.on("ban", async (channelName, username, reason, userstate) => {
        emitEventActive({
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue baneado`,
        });
    });


    client.on("disconnected", (reason) => {
        if (generation !== connectionGeneration) return;
        if (liveStatusTimer) { clearInterval(liveStatusTimer); liveStatusTimer = null; }
        liveSession.end(connectionOwnerId, "twitch");
        io?.emit("accountState", { platform:"twitch", username:normalizedChannel, connected:false, live:false, mode:"saved", connectionId:"", liveId:"" });
        emitSystemActive(`Twitch desconectado. ${clean(reason, "")}`);
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
    liveSession.end(connectionOwnerId, "twitch");
    connectionOwnerId = "";
    connectionSessionId = "";
}

export function getConnectionId() { return connectionSessionId; }
