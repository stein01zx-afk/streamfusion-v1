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

function typeEmoji(type, fallback = "") {
    const t = String(type || "").toLowerCase();
    if (t.includes("gift")) return "🎁";
    if (t.includes("sub")) return "⭐";
    if (t.includes("bits") || t.includes("superchat")) return "💎";
    if (t.includes("raid") || t.includes("host")) return "⚡";
    if (t.includes("follow")) return "💚";
    if (t.includes("share")) return "📣";
    if (t.includes("join") || t.includes("member") || t.includes("heartme")) return "💖";
    if (t.includes("fanclub") || t.includes("superfan")) return "🌟";
    if (t.includes("like")) return "❤️";
    if (t.includes("question")) return "❓";
    if (t.includes("emote")) return "😄";
    if (t.includes("social")) return "✨";
    return fallback || "💬";
}

function avatarFallback(seed) {
    const label = String(seed || "TikTok").replace(/^@+/, "").replace(/^#+/, "").trim();
    const initial = (label.match(/[A-Za-z0-9]/)?.[0] || "T").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fe2c55"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#fff">${initial}</text></svg>`;
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

function cleanLogin(value) {
    return clean(value, "")
        .replace(/^@+/, "")
        .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
        .split(/[/?#]/)[0]
        .trim();
}

function getAvatarFromUserObject(user) {
    const candidates = [
        user?.avatarThumb?.urlList?.[0],
        user?.avatarThumb?.url,
        user?.avatarMedium?.urlList?.[0],
        user?.avatarMedium?.url,
        user?.avatarLarge?.urlList?.[0],
        user?.avatarLarge?.url,
        user?.profilePictureUrl,
        user?.profile_picture_url,
        user?.avatarUrl,
        user?.avatar,
        user?.imageUrl,
    ].map((value) => clean(value, "")).filter(Boolean);
    return candidates[0] || "";
}

async function resolveTiktokAvatar(username, userObj = null) {
    const fromObject = getAvatarFromUserObject(userObj);
    if (fromObject) return fromObject;

    const login = cleanLogin(username).toLowerCase();
    if (!login) return "";

    if (avatarCache.has(login)) return avatarCache.get(login);
    if (pendingAvatarRequests.has(login)) return pendingAvatarRequests.get(login);

    const request = (async () => {
        const html = await fetchText(`https://www.tiktok.com/@${encodeURIComponent(login)}`);
        if (!html) return "";

        const patterns = [
            /property=["']og:image(?:secure_url)?["'][^>]*content=["']([^"']+)["']/i,
            /name=["']twitter:image(?:secure_url)?["'][^>]*content=["']([^"']+)["']/i,
            /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
            /content=["']([^"']+)["'][^>]*property=["']og:image/i,
        ];

        for (const re of patterns) {
            const match = html.match(re);
            if (match?.[1]) return String(match[1]).replace(/&amp;/g, "&");
        }

        const metaMatch = html.match(/"avatarThumb"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/i);
        if (metaMatch?.[1]) return String(metaMatch[1]).replace(/\u0026/g, "&");

        return "";
    })().then((avatar) => {
        const resolved = String(avatar || "").trim();
        avatarCache.set(login, resolved);
        return resolved;
    }).catch(() => {
        const resolved = "";
        avatarCache.set(login, resolved);
        return resolved;
    }).finally(() => {
        pendingAvatarRequests.delete(login);
    });

    pendingAvatarRequests.set(login, request);
    return request;
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

    return { uniqueId, nickname, user };
}

function collectBadges(data, user = null) {
    const source = user || data?.user || data?.details?.user || data?.author || data?.memberUser || null;
    const raw = [];

    const push = (value) => {
        if (value === null || value === undefined || value === false) return;
        if (Array.isArray(value)) {
            value.forEach(push);
            return;
        }
        if (typeof value === "object") {
            if (value.name || value.type || value.label || value.id) raw.push(value.name || value.type || value.label || value.id);
            return;
        }
        const text = String(value).trim();
        if (text) raw.push(text);
    };

    push(data?.badges);
    push(data?.badge);
    push(data?.badgeList);
    push(data?.badgeInfo);
    push(data?.badgeInfos);
    push(source?.badges);
    push(source?.badge);
    push(source?.badgeList);
    push(source?.badgeInfo);
    push(source?.badgeInfos);

    if (source?.isModerator || source?.moderator) push("moderator");
    if (source?.isVerified || source?.verified) push("verified");
    if (source?.isBroadcaster || source?.isOwner || source?.owner) push("broadcaster");
    if (source?.isSubscriber || source?.subscriber || source?.subscribed) push("subscriber");
    if (source?.isMember || source?.member || source?.fanClubMember || source?.isFanClubMember) push("member");
    if (source?.isSuperFan || source?.superFan || source?.superfan) push("superfan");
    if (source?.vip) push("vip");

    return [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];
}


function normalizeImageSource(value) {
    const src = String(value ?? "").trim();
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src;
    return "";
}

function extractRealBadgeUrls(data, user = null) {
    const source = user || data?.user || data?.details?.user || data?.author || data?.memberUser || null;
    const raw = [];
    const push = (value) => {
        const src = normalizeImageSource(value);
        if (src && !raw.includes(src)) raw.push(src);
    };

    const badgeLists = [
        data?.badgeList,
        data?.badges,
        data?.badgeInfo,
        data?.badgeInfos,
        source?.badgeList,
        source?.badges,
        source?.badgeInfo,
        source?.badgeInfos,
    ];

    for (const list of badgeLists) {
        if (!list) continue;
        if (Array.isArray(list)) {
            for (const item of list) {
                if (typeof item === "string") push(item);
                else if (item && typeof item === "object") push(item.imageUrl || item.image_url || item.url || item.icon || item.src || item.value);
            }
        } else if (typeof list === "object") {
            for (const value of Object.values(list)) {
                if (typeof value === "string") push(value);
                else if (value && typeof value === "object") push(value.imageUrl || value.image_url || value.url || value.icon || value.src || value.value);
            }
        }
    }

    return raw;
}

function buildTikTokMessageFragments(data) {
    const emotes = Array.isArray(data?.emotes) ? data.emotes.filter(Boolean) : [];
    if (emotes.length) {
        return emotes.map((emote) => ({
            type: "emote",
            url: normalizeImageSource(emote?.emoteImageUrl || emote?.imageUrl || emote?.url || emote?.src || emote?.image_url),
            name: String(emote?.emoteName || emote?.name || emote?.title || "emote"),
        })).filter((fragment) => fragment.url);
    }

    return [{
        type: "text",
        content: clean(data?.comment ?? data?.text ?? data?.message ?? "", ""),
    }];
}

function getIO() {
    return globalThis.__STREAMFUSION_IO__ || null;
}

function emitSystem(io, message) {
    io?.emit("system", {
        platform: "tiktok",
        type: "system",
        emoji: "ℹ️",
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
        message: clean(event.message, ""),
        messageFragments: Array.isArray(event.messageFragments) ? event.messageFragments : [],
        realBadgeUrls: Array.isArray(event.realBadgeUrls) ? event.realBadgeUrls : [],
        emoji: clean(event.emoji, typeEmoji(event.type, "💬")),
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        color: event.color !== undefined ? event.color : undefined,
        badges: event.badges !== undefined ? event.badges : undefined,
        gift: event.gift !== undefined ? event.gift : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        likes: event.likes !== undefined ? event.likes : undefined
    });
}

function emitEvent(io, event) {
    io?.emit("event", {
        platform: "tiktok",
        timestamp: Date.now(),
        type: clean(event.type, "system"),
        emoji: clean(event.emoji, typeEmoji(event.type, "✨")),
        action: clean(event.action, "Evento"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(event.message, ""),
        messageFragments: Array.isArray(event.messageFragments) ? event.messageFragments : [],
        realBadgeUrls: Array.isArray(event.realBadgeUrls) ? event.realBadgeUrls : [],
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        badges: event.badges !== undefined ? event.badges : undefined,
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
    return;
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

async function avatarFor(data, nickname, uniqueId) {
    return await resolveTiktokAvatar(uniqueId || nickname, data?.user || data?.details?.user || null);
}

function resolveChatMessage(data) {
    const emoteText = clean(
        data?.emoteList?.map?.((entry) => clean(entry?.emoteId || entry?.emoteName, "")).filter(Boolean).join(" "),
        ""
    );
    const stickerText = clean(
        data?.sticker?.name ??
        data?.sticker?.title ??
        data?.stickerName ??
        data?.sticker?.stickerName ??
        data?.sticker?.stickerTitle,
        ""
    );

    const candidates = [
        data?.comment,
        data?.text,
        data?.message,
        data?.msg,
        data?.content,
        data?.emoji,
        emoteText,
        stickerText ? `Sticker: ${stickerText}` : "",
    ];

    for (const candidate of candidates) {
        const value = clean(candidate, "");
        if (value) return value;
    }

    return "";
}

async function handleSocialEvent(io, data, forcedType = null) {
    const { nickname, uniqueId } = pickUser(data);

    const rawAction = clean(
        forcedType ||
        data?.action ||
        data?.socialType ||
        data?.shareType ||
        data?.type,
        "social"
    ).toLowerCase();

    const badges = collectBadges(data, data?.user || data?.details?.user || null);

    if (rawAction.includes("follow") || rawAction.includes("followed")) {
        sessionStats.followers += 1;
        emitEvent(io, {
            type: "follow",
            emoji: "👤",
            action: "Follow",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls: extractRealBadgeUrls(data, user),
            message: `${nickname} comenzó a seguir`
        });
        emitStats(io);
        return;
    }

    if (rawAction.includes("share")) {
        sessionStats.shares += 1;
        emitEvent(io, {
            type: "share",
            emoji: "🗣",
            action: "Share",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls: extractRealBadgeUrls(data, user),
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
        avatar: await avatarFor(data, nickname, uniqueId),
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

    connection.on(E.CHAT, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);
        const realBadgeUrls = extractRealBadgeUrls(data, user);
        const fragments = buildTikTokMessageFragments(data);

        const message = resolveChatMessage(data) || clean(data?.comment ?? data?.text ?? data?.message, "");
        const isSticker = Boolean(data?.sticker || data?.stickerName || data?.sticker?.name || data?.sticker?.title);
        const emoji = isSticker ? "🧩" : typeEmoji("chat", "💬");

        emitChat(io, {
            type: isSticker ? "sticker" : "chat",
            emoji,
            action: isSticker ? "Sticker" : "Comentario",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls,
            messageFragments: fragments,
            message: message || (isSticker ? clean(data?.sticker?.name || data?.stickerName || data?.sticker?.title, "Sticker") : "")
        });
    });

    connection.on(E.GIFT, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

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
            emoji: "🎁",
            action: "Regalo",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            gift: giftName,
            amount,
            message: `🎁 ${giftName} x${amount}${suffix}`
        });
    });

    connection.on(E.LIKE, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);
        const likes = normalizeLikeCount(data);

        sessionStats.likes += likes;
        emitStats(io);

        emitEvent(io, {
            type: "like",
            emoji: "❤️",
            action: "Like",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            likes,
            message: `${nickname} dio ${likes} like${likes === 1 ? "" : "s"}`
        });
    });

    connection.on(E.MEMBER, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEvent(io, {
            type: "join",
            emoji: "👻",
            action: "Entrada",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls: extractRealBadgeUrls(data, user),
            message: `${nickname} entró al directo`
        });
    });

    connection.on(E.SOCIAL, async (data) => {
        handleSocialEvent(io, data);
    });

    if (E.FOLLOW !== E.SOCIAL) {
        connection.on(E.FOLLOW, async (data) => handleSocialEvent(io, data, "follow"));
    }

    if (E.SHARE !== E.SOCIAL) {
        connection.on(E.SHARE, async (data) => handleSocialEvent(io, data, "share"));
    }

    connection.on(E.EMOTE, async (data) => {
        const { nickname, uniqueId } = pickUser(data);
        const emoteId = clean(
            data?.emoteList?.[0]?.emoteId ??
            data?.emoteId ??
            data?.emoteName,
            "emote"
        );

        emitEvent(io, {
            type: "system",
            emoji: "😄",
            action: "Emote",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            message: `😄 Emote: ${emoteId}`
        });
    });

    connection.on(E.QUESTION_NEW, async (data) => {
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
            emoji: "❓",
            action: "Pregunta",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            message: question
        });
    });



    connection.on(E.LIVE_INTRO, async (data) => {
        const { nickname, uniqueId } = pickUser(data);

        emitEvent(io, {
            type: "system",
            emoji: "🎬",
            action: "Intro del directo",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            message: "Comenzó la intro del live"
        });
    });

    connection.on(E.STREAM_END, () => {
        emitEvent(io, {
            type: "system",
            emoji: "⏹️",
            action: "Fin del live",
            user: "TikTok",
            uniqueId: "",
            avatar: avatarFallback("TikTok"),
            message: "TikTok cerró el directo"
        });
    });

    connection.on(E.ENVELOPE, async (data) => {
        const envelope = data?.envelopeInfo || {};
        const diamondCount = toNumber(envelope?.diamondCount ?? 0, 0);

        emitEvent(io, {
            type: "system",
            emoji: "💌",
            action: "Sobre",
            user: clean(envelope?.sendUserName ?? "TikTok"),
            uniqueId: "",
            avatar: avatarFallback(clean(envelope?.sendUserName ?? "TikTok")),
            message: `💌 Sobre: ${diamondCount} diamantes`
        });
    });

    connection.on(E.SUPER_FAN, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEvent(io, {
            type: "system",
            emoji: "🌟",
            action: "Super Fan",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls: extractRealBadgeUrls(data, user),
            message: `${nickname} activó Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_JOIN, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEvent(io, {
            type: "system",
            emoji: "🌟",
            action: "Super Fan",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls: extractRealBadgeUrls(data, user),
            message: `${nickname} se unió como Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_BOX, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEvent(io, {
            type: "system",
            emoji: "🎁",
            action: "Caja Super Fan",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            realBadgeUrls: extractRealBadgeUrls(data, user),
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
