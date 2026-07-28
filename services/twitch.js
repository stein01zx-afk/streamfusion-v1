import tmi from "tmi.js";

let client = null;

let sessionStats = {
    viewers: 0,
    subs: 0,
    bits: 0,
    raids: 0,
    followers: 0,
};

function clean(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

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

    client.on("message", (channelName, tags, message, self) => {
        if (self) return;

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Comentario",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message,
            color: getColor(tags),
            badges: getBadges(tags),
        });
    });

    client.on("action", (channelName, tags, message, self) => {
        if (self) return;

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Acción",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message,
            color: getColor(tags),
            badges: getBadges(tags),
        });
    });

    client.on("subscription", (channelName, username, method, message, userstate) => {
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
            message: `${user} se suscribió${months > 0 ? ` (${months} meses)` : ""}`,
            amount: 1,
        });
    });

    client.on("resub", (channelName, username, months, message, userstate, methods) => {
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
            message: `${user} renovó su sub por ${totalMonths} mes${totalMonths === 1 ? "" : "es"}`,
            amount: 1,
        });
    });

    client.on("subgift", (channelName, username, streakMonths, recipient, methods, userstate) => {
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
            message: `${gifter} regaló una sub a ${target}`,
            amount: 1,
        });
    });

    client.on("giftpaidupgrade", (channelName, username, sender, userstate) => {
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
            message: `${user} recibió una sub regalada por ${fromUser}`,
            amount: 1,
        });
    });

    client.on("anongiftpaidupgrade", (channelName, username, userstate) => {
        const user = clean(username, "Usuario");

        sessionStats.subs += 1;
        emitStats(io);

        emitEvent(io, {
            platform: "twitch",
            type: "sub",
            action: "Gift Sub",
            user,
            uniqueId: getUniqueId(userstate),
            message: `${user} recibió una sub anónima`,
            amount: 1,
        });
    });

    client.on("cheer", (channelName, tags, message) => {
        const user = getDisplayName(tags);
        const bits = toNumber(tags?.bits, 0);

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
            message: `${user} envió ${bits} Bits`,
            amount: bits,
            bits,
        });
    });

    client.on("raided", (channelName, username, viewers) => {
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
            message: `${user} hizo raid con ${raidViewers} viewer${raidViewers === 1 ? "" : "s"}`,
            amount: raidViewers,
        });
    });

    client.on("hosttarget", (channelName, username, viewers, autohost) => {
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
            message: `${user} hosteó con ${hostViewers} viewer${hostViewers === 1 ? "" : "s"}`,
            amount: hostViewers,
        });
    });

    client.on("notice", (channelName, msgid, message, tags) => {
        const text = clean(message, "Aviso de Twitch");

        if (msgid === "sub") {
            sessionStats.subs += 1;
            emitStats(io);
            emitEvent(io, {
                platform: "twitch",
                type: "sub",
                action: "Sub",
                user: getDisplayName(tags),
                uniqueId: getUniqueId(tags),
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
                user: getDisplayName(tags),
                uniqueId: getUniqueId(tags),
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
                user: getDisplayName(tags),
                uniqueId: getUniqueId(tags),
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

    client.on("roomstate", (channelName, state) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Sala",
            user: "Twitch",
            uniqueId: "",
            message: "Estado de sala actualizado",
        });
    });

    client.on("clearchat", (channelName) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Sistema",
            user: "Twitch",
            uniqueId: "",
            message: "El chat fue limpiado",
        });
    });

    client.on("timeout", (channelName, username, reason, duration, userstate) => {
        emitEvent(io, {
            platform: "twitch",
            type: "system",
            action: "Moderación",
            user: clean(username, "Usuario"),
            uniqueId: getUniqueId(userstate),
            message: `${clean(username, "Usuario")} fue sancionado${duration ? ` por ${duration}s` : ""}`,
        });
    });

    client.on("ban", (channelName, username, reason, userstate) => {
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
        emitStats(io);
    });

    client.on("disconnected", (reason) => {
        emitSystem(io, `Twitch desconectado. ${clean(reason, "")}`);
    });

    await client.connect();
}

export async function disconnect() {
    if (!client) return;

    try {
        client.disconnect();
    } catch {}

    client = null;
        }
