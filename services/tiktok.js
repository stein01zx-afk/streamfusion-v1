import {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} from "tiktok-live-connector";

let connection = null;

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

function emitChat(io, event) {
    io.emit("chat", {
        platform: "tiktok",
        timestamp: Date.now(),
        type: clean(event.type, "social"),
        action: clean(event.action, "Acción TikTok"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(event.message, ""),
        gift: event.gift !== undefined ? event.gift : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        likes: event.likes !== undefined ? event.likes : undefined,
        extra: event.extra !== undefined ? event.extra : undefined
    });
}

function emitSystem(io, message) {
    io.emit("system", {
        message: clean(message, "Error desconocido")
    });
}

function buildChatMessage(data) {
    const { nickname, uniqueId } = pickUser(data);
    const message = clean(
        data?.comment ??
        data?.text ??
        data?.message ??
        data?.msg,
        "Mensaje sin texto"
    );

    emitChat(globalThis.__STREAMFUSION_IO__, {
        type: "chat",
        action: "Comentario",
        user: nickname,
        uniqueId,
        message
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

    connection = new TikTokLiveConnection(normalizedUser, {
        signApiKey: process.env.EULER_API_KEY
    });

    connection.on(ControlEvent.CONNECTED, (state) => {
        emitSystem(io, `TikTok conectado a @${normalizedUser}.`);
        if (state?.roomId) {
            emitSystem(io, `Room ID: ${state.roomId}`);
        }
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
            data?.message,
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
            data?.giftId,
            "Regalo"
        );

        const amount = toNumber(
            data?.repeatCount ??
            data?.repeatEndCount ??
            data?.count ??
            1,
            1
        );

        const isStreak = data?.giftDetails?.giftType === 1;
        const suffix = isStreak && data?.repeatEnd === false ? " (en curso)" : "";

        emitChat(io, {
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
        const likes = toNumber(
            data?.likeCount ??
            data?.totalLikeCount ??
            data?.likes,
            0
        );

        emitChat(io, {
            type: "like",
            action: "Like",
            user: nickname,
            uniqueId,
            likes,
            message: `${likes} like${likes === 1 ? "" : "s"}`
        });
    });

    connection.on(E.MEMBER, (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitChat(io, {
            type: "member",
            action: "Nuevo espectador",
            user: nickname,
            uniqueId,
            message: `${nickname} entró al directo`
        });
    });

    const handleSocial = (data, forcedType = null) => {
        const { nickname, uniqueId } = pickUser(data);
        const rawAction = clean(
            forcedType ||
            data?.action ||
            data?.socialType ||
            data?.shareType,
            "social"
        ).toLowerCase();

        if (rawAction.includes("follow") || rawAction.includes("followed")) {
            emitChat(io, {
                type: "follow",
                action: "Siguió",
                user: nickname,
                uniqueId,
                message: `${nickname} comenzó a seguir`
            });
            return;
        }

        if (rawAction.includes("share")) {
            emitChat(io, {
                type: "share",
                action: "Compartió",
                user: nickname,
                uniqueId,
                message: `${nickname} compartió el LIVE`
            });
            return;
        }

        emitChat(io, {
            type: "social",
            action: "Acción social",
            user: nickname,
            uniqueId,
            message: clean(data?.message ?? data?.text ?? data?.action, "Acción social")
        });
    };

    connection.on(E.SOCIAL, handleSocial);

    if (E.FOLLOW !== E.SOCIAL) {
        connection.on(E.FOLLOW, (data) => handleSocial(data, "follow"));
    }

    if (E.SHARE !== E.SOCIAL) {
        connection.on(E.SHARE, (data) => handleSocial(data, "share"));
    }

    connection.on(E.EMOTE, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        const emoteId = clean(data?.emoteList?.[0]?.emoteId ?? data?.emoteId, "emote");

        emitChat(io, {
            type: "emote",
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
            data?.text,
            "Pregunta"
        );

        emitChat(io, {
            type: "question",
            action: "Pregunta",
            user: nickname,
            uniqueId,
            message: question
        });
    });

    connection.on(E.ROOM_USER, (data) => {
        const viewerCount = toNumber(data?.viewerCount ?? data?.viewers ?? 0, 0);
        emitChat(io, {
            type: "roomUser",
            action: "Espectadores",
            user: "TikTok",
            uniqueId: "",
            message: `👥 ${viewerCount} espectadores`
        });
    });

    connection.on(E.LIVE_INTRO, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        emitChat(io, {
            type: "liveIntro",
            action: "Intro del directo",
            user: nickname,
            uniqueId,
            message: "Comenzó la intro del live"
        });
    });

    connection.on(E.STREAM_END, () => {
        emitChat(io, {
            type: "streamEnd",
            action: "Fin del live",
            user: "TikTok",
            uniqueId: "",
            message: "TikTok cerró el directo"
        });
    });

    connection.on(E.ENVELOPE, (data) => {
        const envelope = data?.envelopeInfo || {};
        const diamondCount = toNumber(envelope?.diamondCount ?? 0, 0);

        emitChat(io, {
            type: "envelope",
            action: "Sobre",
            user: clean(envelope?.sendUserName ?? "TikTok"),
            uniqueId: "",
            message: `Sobre: ${diamondCount} diamantes`
        });
    });

    connection.on(E.SUPER_FAN, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        emitChat(io, {
            type: "superFan",
            action: "Super Fan",
            user: nickname,
            uniqueId,
            message: `${nickname} activó Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_JOIN, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        emitChat(io, {
            type: "superFanJoin",
            action: "Super Fan",
            user: nickname,
            uniqueId,
            message: `${nickname} se unió como Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_BOX, (data) => {
        const { nickname, uniqueId } = pickUser(data);
        emitChat(io, {
            type: "superFanBox",
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
