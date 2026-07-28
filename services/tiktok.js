import {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} from "tiktok-live-connector";

let connection = null;

let sessionStats = {
    viewers: 0,
    likes: 0,
    gifts: 0,
    followers: 0,
    shares: 0
};

const E = {
    CHAT: WebcastEvent.CHAT ?? "chat",
    GIFT: WebcastEvent.GIFT ?? "gift",
    LIKE: WebcastEvent.LIKE ?? "like",
    MEMBER: WebcastEvent.MEMBER ?? "member",
    SOCIAL: WebcastEvent.SOCIAL ?? "social",
    FOLLOW: WebcastEvent.FOLLOW ?? "follow",
    SHARE: WebcastEvent.SHARE ?? "share",
    EMOTE: WebcastEvent.EMOTE ?? "emote",
    QUESTION_NEW: WebcastEvent.QUESTION_NEW ?? "questionNew",
    ROOM_USER: WebcastEvent.ROOM_USER ?? "roomUser",
    LIVE_INTRO: WebcastEvent.LIVE_INTRO ?? "liveIntro",
    STREAM_END: WebcastEvent.STREAM_END ?? "streamEnd",
    ENVELOPE: WebcastEvent.ENVELOPE ?? "envelope",
    SUPER_FAN: WebcastEvent.SUPER_FAN ?? "superFan",
    SUPER_FAN_JOIN: WebcastEvent.SUPER_FAN_JOIN ?? "superFanJoin",
    SUPER_FAN_BOX: WebcastEvent.SUPER_FAN_BOX ?? "superFanBox"
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

function normalizeUsername(username) {
    let value = clean(username);

    value = value
        .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
        .replace(/^@/i, "");

    value = value.split(/[/?#]/)[0].trim();
    return value;
}

function pickUser(data) {
    const user =
        data?.user ||
        data?.details?.user ||
        data?.anchorInfo?.user ||
        data?.shareUser ||
        data?.memberUser ||
        data?.author ||
        data?.sender ||
        null;

    const uniqueId = clean(
        user?.uniqueId ??
        user?.uniqueID ??
        user?.displayId ??
        user?.username ??
        user?.nickName ??
        user?.nickname,
        "Usuario"
    );

    const nickname = clean(
        user?.nickname ??
        user?.nickName ??
        user?.displayName ??
        user?.displayId ??
        user?.uniqueId ??
        uniqueId,
        "Usuario"
    );

    return { uniqueId, nickname };
}

function getIO() {
    return globalThis.__STREAMFUSION_IO__ || null;
}

function emitSystem(io, message) {
    io?.emit("system", {
        platform: "tiktok",
        type: "system",
        message: clean(message, "Error desconocido"),
        timestamp: Date.now()
    });
}

function emitChat(io, event) {
    io?.emit("chat", {
        platform: "tiktok",
        timestamp: Date.now(),
        type: clean(event.type, "chat"),
        action: clean(event.action, "Comentario"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(event.message, "Mensaje sin texto"),
        gift: event.gift !== undefined ? event.gift : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        likes: event.likes !== undefined ? event.likes : undefined,
        color: event.color !== undefined ? event.color : undefined,
        badges: event.badges !== undefined ? event.badges : undefined
    });
}

function emitEvent(io, event) {
    io?.emit("event", {
        platform: "tiktok",
        timestamp: Date.now(),
        type: clean(event.type, "system"),
        action: clean(event.action, "Evento"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(event.message, ""),
        gift: event.gift !== undefined ? event.gift : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        likes: event.likes !== undefined ? event.likes : undefined
    });
}

function emitStats(io) {
    io?.emit("stats", {
        tiktok: {
            ...sessionStats
        }
    });
}

function resetSessionStats() {
    sessionStats = {
        viewers: 0,
        likes: 0,
        gifts: 0,
        followers: 0,
        shares: 0
    };
}

function setViewerCount(io, value) {
    const viewers = Math.max(0, toNumber(value, 0));
    if (viewers <= 0) return;
    sessionStats.viewers = viewers;
    emitStats(io);
}

function normalizeLikeCount(data) {
    const candidates = [
        data?.likeCount,
        data?.totalLikeCount,
        data?.likes,
        data?.like_count,
        data?.count
    ];

    for (const candidate of candidates) {
        const n = toNumber(candidate, NaN);
        if (Number.isFinite(n) && n >= 0) return n;
    }

    return 1;
}

function normalizeGiftAmount(data) {
    const candidates = [
        data?.repeatCount,
        data?.repeatEndCount,
        data?.count,
        data?.giftCount,
        data?.amount
    ];

    for (const candidate of candidates) {
        const n = toNumber(candidate, NaN);
        if (Number.isFinite(n) && n > 0) return n;
    }

    return 1;
}

function handleSocialEvent(io, data, forcedType = null) {
    const { nickname, uniqueId } = pickUser(data);

    const rawAction = clean(
        forcedType ||
        data?.action ||
        data?.socialType ||
        data?.shareType ||
        data?.type,
        "social"
    ).toLowerCase();

    if (rawAction.includes("follow") || rawAction.includes("followed")) {
        sessionStats.followers += 1;
        emitEvent(io, {
            type: "follow",
            action: "Follow",
            user: nickname,
            uniqueId,
            message: `${nickname} comenzó a seguir`
        });
        emitStats(io);
        return;
    }

    if (rawAction.includes("share")) {
        sessionStats.shares += 1;
        emitEvent(io, {
            type: "share",
            action: "Share",
            user: nickname,
            uniqueId,
            message: `${nickname} compartió el LIVE`
        });
        emitStats(io);
        return;
    }

    emitEvent(io, {
        type: "system",
        action: "Acción social",
        user: nickname,
        uniqueId,
        message: clean(data?.message ?? data?.text ?? data?.action, "Acción social")
    });
}

export async function connect(username, io) {
    globalThis.__STREAMFUSION_IO__ = io;

    if (connection) {
        try {
            await connection.disconnect();
        } catch {}
        connection = null;
    }

    const normalizedUser = normalizeUsername(username);

    if (!normalizedUser) {
        throw new Error("Debes ingresar un usuario válido de TikTok.");
    }

    resetSessionStats();

    connection = new TikTokLiveConnection(normalizedUser, {
        signApiKey: process.env.EULER_API_KEY
    });

    connection.on(ControlEvent.CONNECTED, (state) => {
        emitSystem(io, `TikTok conectado a @${normalizedUser}.`);

        if (state?.roomId) {
            emitSystem(io, `Room ID: ${state.roomId}`);
        }

        emitStats(io);
    });

    connection.on(ControlEvent.DISCONNECTED, () => {
        emitSystem(io, "TikTok desconectado.");
    });

    connection.on(ControlEvent.ERROR, (data) => {
        const msg =
            data?.exception?.message ||
            data?.info ||
            data?.message ||
            "Error de TikTok";
        emitSystem(io, msg);
    });

    connection.on(E.CHAT, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        const message = clean(
            data?.comment ??
            data?.text ??
            data?.message ??
            data?.msg ??
            data?.content,
            "Mensaje sin texto"
        );

        emitChat(io, {
            type: "chat",
            action: "Comentario",
            user: nickname,
            uniqueId,
            message
        });
    });

    connection.on(E.GIFT, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        const giftName = clean(
            data?.giftDetails?.giftName ??
            data?.giftName ??
            data?.gift?.name ??
            data?.giftId ??
            data?.gift?.giftName,
            "Regalo"
        );

        const amount = normalizeGiftAmount(data);
        sessionStats.gifts += amount;
        emitStats(io);

        const isStreak = data?.giftDetails?.giftType === 1;
        const suffix = isStreak && data?.repeatEnd === false ? " (en curso)" : "";

        emitEvent(io, {
            type: "gift",
            action: "Regalo",
            user: nickname,
            uniqueId,
            gift: giftName,
            amount,
            message: `${giftName} x${amount}${suffix}`
        });
    });

    connection.on(E.LIKE, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        const likes = normalizeLikeCount(data);

        sessionStats.likes += likes;
        emitStats(io);

        emitEvent(io, {
            type: "like",
            action: "Like",
            user: nickname,
            uniqueId,
            likes,
            message: `${nickname} dio ${likes} like${likes === 1 ? "" : "s"}`
        });
    });

    connection.on(E.MEMBER, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitEvent(io, {
            type: "join",
            action: "Entrada",
            user: nickname,
            uniqueId,
            message: `${nickname} entró al directo`
        });
    });

    connection.on(E.SOCIAL, (data) => {
        handleSocialEvent(io, data);
    });

    if (E.FOLLOW !== E.SOCIAL) {
        connection.on(E.FOLLOW, (data) => handleSocialEvent(io, data, "follow"));
    }

    if (E.SHARE !== E.SOCIAL) {
        connection.on(E.SHARE, (data) => handleSocialEvent(io, data, "share"));
    }

    connection.on(E.EMOTE, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        const emoteId = clean(
            data?.emoteList?.[0]?.emoteId ??
            data?.emoteId ??
            data?.emoteName,
            "emote"
        );

        emitEvent(io, {
            type: "system",
            action: "Emote",
            user: nickname,
            uniqueId,
            message: `Emote: ${emoteId}`
        });
    });

    connection.on(E.QUESTION_NEW, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        const question = clean(
            data?.details?.questionText ??
            data?.questionText ??
            data?.text ??
            data?.message,
            "Pregunta"
        );

        emitEvent(io, {
            type: "question",
            action: "Pregunta",
            user: nickname,
            uniqueId,
            message: question
        });
    });

    connection.on(E.ROOM_USER, (data) => {
        const viewers = toNumber(
            data?.viewerCount ??
            data?.viewers ??
            data?.userCount ??
            data?.roomUserCount,
            0
        );

        setViewerCount(io, viewers);

        emitEvent(io, {
            type: "system",
            action: "Espectadores",
            user: "TikTok",
            uniqueId: "",
            message: viewers > 0 ? `👥 ${viewers} espectadores` : "Actualizando espectadores..."
        });
    });

    connection.on(E.LIVE_INTRO, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitEvent(io, {
            type: "system",
            action: "Intro del directo",
            user: nickname,
            uniqueId,
            message: "Comenzó la intro del live"
        });
    });

    connection.on(E.STREAM_END, () => {
        emitEvent(io, {
            type: "system",
            action: "Fin del live",
            user: "TikTok",
            uniqueId: "",
            message: "TikTok cerró el directo"
        });
    });

    connection.on(E.ENVELOPE, (data) => {
        const envelope = data?.envelopeInfo || {};
        const diamondCount = toNumber(envelope?.diamondCount ?? 0, 0);

        emitEvent(io, {
            type: "system",
            action: "Sobre",
            user: clean(envelope?.sendUserName ?? "TikTok"),
            uniqueId: "",
            message: `Sobre: ${diamondCount} diamantes`
        });
    });

    connection.on(E.SUPER_FAN, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitEvent(io, {
            type: "system",
            action: "Super Fan",
            user: nickname,
            uniqueId,
            message: `${nickname} activó Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_JOIN, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitEvent(io, {
            type: "system",
            action: "Super Fan",
            user: nickname,
            uniqueId,
            message: `${nickname} se unió como Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_BOX, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitEvent(io, {
            type: "system",
            action: "Caja Super Fan",
            user: nickname,
            uniqueId,
            message: `${nickname} recibió una caja Super Fan`
        });
    });

    await connection.connect();
}

export async function disconnect() {
    if (!connection) return;

    try {
        await connection.disconnect();
    } catch {}

    connection = null;
                  }
