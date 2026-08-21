import {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} from "tiktok-live-connector";
import { recordChat, recordEvent } from "./live-history.js";
import * as liveSession from "./live-session.js";
import * as database from "./database.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let connection = null;
let connectionGeneration = 0;
let connectionSessionId = "";

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
const recentShareEvents = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GIFT_CATALOG_PATH = path.join(__dirname, "../Public/data/tiktok-gifts.json");
let giftCatalog = [];
let giftCatalogByKey = new Map();

function normalizeGiftKey(value) {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "")
        .trim();
}

function loadGiftCatalog() {
    try {
        const raw = readFileSync(GIFT_CATALOG_PATH, "utf8");
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
        giftCatalog = items;
        giftCatalogByKey = new Map();
        for (const item of items) {
            for (const candidate of [item?.key, item?.name, item?.alt]) {
                const key = normalizeGiftKey(candidate);
                if (key && !giftCatalogByKey.has(key)) giftCatalogByKey.set(key, item);
            }
        }
    } catch {
        giftCatalog = [];
        giftCatalogByKey = new Map();
    }
}

function resolveGiftMedia(data) {
    const candidates = [
        data?.giftDetails?.giftName,
        data?.giftName,
        data?.gift?.name,
        data?.gift?.giftName,
        data?.giftId,
        data?.giftDetails?.giftId,
        data?.gift?.id,
        data?.gift?.title
    ];

    for (const candidate of candidates) {
        const key = normalizeGiftKey(candidate);
        if (!key) continue;
        const gift = giftCatalogByKey.get(key);
        if (gift) {
            return {
                name: clean(gift.name, clean(candidate, "Regalo")),
                image: clean(gift.image, ""),
                coins: toNumber(gift.coins, 0),
                alt: clean(gift.alt, clean(gift.name, clean(candidate, "Regalo")))
            };
        }
    }

    const fallbackName = clean(candidates.find(Boolean), "Regalo");
    return {
        name: fallbackName,
        image: "",
        coins: 0,
        alt: fallbackName
    };
}

function firstNonEmptyUrl(values) {
    const queue = Array.isArray(values) ? values : [values];
    for (const value of queue) {
        if (!value) continue;
        if (Array.isArray(value)) {
            const nested = firstNonEmptyUrl(value);
            if (nested) return nested;
            continue;
        }
        if (typeof value === "object") {
            const nested = firstNonEmptyUrl([
                value?.url,
                value?.uri,
                value?.src,
                value?.link,
                value?.imageUrl,
                value?.image_url,
                value?.urlList,
                value?.url_list,
                value?.urls,
                value?.image?.url,
                value?.image?.uri,
                value?.image?.src,
                value?.image?.link,
                value?.image?.urlList,
                value?.image?.url_list,
                value?.image?.urls,
            ]);
            if (nested) return nested;
            continue;
        }

        const text = clean(value, "");
        if (/^https?:\/\//i.test(text) || /^data:image\//i.test(text)) return text.replace(/&amp;/g, "&");
    }
    return "";
}

function resolveStickerMedia(data) {
    const sticker = data?.sticker || data?.stickerInfo || data?.stickerDetails || null;
    const emote = Array.isArray(data?.emoteList) ? data.emoteList[0] : (data?.emote || null);

    const nameCandidates = [
        sticker?.name,
        sticker?.title,
        sticker?.stickerName,
        sticker?.stickerTitle,
        data?.stickerName,
        data?.stickerTitle,
        data?.stickerText,
        emote?.emoteName,
        emote?.name,
        emote?.title,
        emote?.emoteId,
        data?.emoteName,
        data?.emoteId
    ];

    const imageCandidates = [
        sticker?.image,
        sticker?.imageUrl,
        sticker?.imageURL,
        sticker?.url,
        sticker?.uri,
        sticker?.urlList,
        sticker?.url_list,
        sticker?.images,
        sticker?.image?.url,
        sticker?.image?.uri,
        sticker?.image?.src,
        sticker?.image?.urlList,
        sticker?.image?.url_list,
        sticker?.image?.images,
        data?.stickerImage,
        data?.stickerUrl,
        data?.sticker?.imageUrl,
        data?.sticker?.urlList,
        data?.sticker?.url_list,
        data?.sticker?.images,
        emote?.image,
        emote?.imageUrl,
        emote?.imageURL,
        emote?.url,
        emote?.uri,
        emote?.urlList,
        emote?.url_list,
        emote?.images,
        emote?.image?.url,
        emote?.image?.uri,
        emote?.image?.src,
        emote?.image?.urlList,
        emote?.image?.url_list,
        emote?.image?.images,
        data?.emoteImage,
        data?.emoteUrl,
        data?.emote?.imageUrl,
        data?.emote?.urlList,
        data?.emote?.url_list,
        data?.emote?.images
    ];

    const image = firstNonEmptyUrl(imageCandidates);
    const name = clean(nameCandidates.find((value) => clean(value, "")), image ? "Sticker" : "Sticker");
    const id = clean(
        sticker?.id ??
        sticker?.stickerId ??
        data?.stickerId ??
        emote?.emoteId ??
        emote?.id ??
        data?.emoteId,
        ""
    );

    return {
        name: clean(name, image ? "Sticker" : "Sticker"),
        image,
        alt: clean(sticker?.alt ?? sticker?.ariaLabel ?? sticker?.accessibilityLabel ?? name ?? id, name || "Sticker"),
        id
    };
}

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

function typeEmoji(type, fallback = "") {
    const t = String(type || "").toLowerCase();
    if (t.includes("gift")) return "🎁";
    if (t.includes("sub")) return "⭐";
    if (t.includes("bits") || t.includes("superchat")) return "💎";
    if (t.includes("raid") || t.includes("host")) return "⚡";
    if (t.includes("follow")) return "💚";
    if (t.includes("share")) return "🗣️";
    if (t.includes("join") || t.includes("member") || t.includes("heartme")) return "💖";
    if (t.includes("fanclub") || t.includes("superfan")) return "🌟";
    if (t.includes("like")) return "❤️";
    if (t.includes("question")) return "❓";
    if (t.includes("emote")) return "😄";
    if (t.includes("social")) return "✨";
    return fallback || "💬";
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
        user?.userDetails?.profilePictureUrl,
        user?.userDetails?.profilePictureUrls?.[0],
        user?.userDetails?.profile_picture_url,
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

function deepFindFirstObject(root, predicate, maxDepth = 5, depth = 0, seen = new Set()) {
    if (!root || typeof root !== "object" || depth > maxDepth || seen.has(root)) return null;
    seen.add(root);
    if (predicate(root)) return root;
    if (Array.isArray(root)) {
        for (const value of root) {
            const found = deepFindFirstObject(value, predicate, maxDepth, depth + 1, seen);
            if (found) return found;
        }
        return null;
    }
    for (const value of Object.values(root)) {
        if (!value || typeof value !== "object") continue;
        const found = deepFindFirstObject(value, predicate, maxDepth, depth + 1, seen);
        if (found) return found;
    }
    return null;
}

function deepFindString(root, predicate, maxDepth = 5, depth = 0, seen = new Set()) {
    if (root === null || root === undefined || depth > maxDepth) return "";
    if (typeof root === "string" || typeof root === "number") {
        const text = String(root);
        return predicate(text) ? text : "";
    }
    if (typeof root !== "object" || seen.has(root)) return "";
    seen.add(root);
    for (const value of Object.values(root)) {
        const found = deepFindString(value, predicate, maxDepth, depth + 1, seen);
        if (found) return found;
    }
    return "";
}

function looksLikeSharePayload(data = {}, preferredType = "") {
    if (String(preferredType || "").toLowerCase() === "share") return true;
    const known = [
        data?.action, data?.socialType, data?.shareType, data?.shareTarget, data?.type,
        data?.event, data?.eventType, data?.eventName, data?.displayType, data?.label,
        data?.share?.type, data?.share?.action, data?.share?.label, data?.social?.type,
        data?.social?.action, data?.social?.label
    ].filter(Boolean).map((value) => String(value).toLowerCase());
    if (known.some((value) => /\bshare(d|ing)?\b|\bcompart/.test(value))) return true;
    const deep = deepFindString(data, (text) => /pm_.*share|shared the live|share(d|ing)? the live|compart/i.test(text), 5);
    return Boolean(deep || data?.share || data?.userShare || data?.shareUser || data?.shareCount);
}

function pickUser(data, preferredType = "") {
    const socialLike = looksLikeSharePayload(data, preferredType) || String(preferredType || "").toLowerCase() === "follow";
    const directActor = socialLike && data && typeof data === "object" && Boolean(
        clean(data?.uniqueId ?? data?.uniqueID ?? data?.displayId ?? data?.username ?? data?.nickname ?? data?.displayName, "") ||
        getAvatarFromUserObject(data)
    ) ? data : null;
    const deepActor = deepFindFirstObject(data, (candidate) => {
        const id = clean(candidate?.uniqueId ?? candidate?.uniqueID ?? candidate?.displayId ?? candidate?.username, "");
        const name = clean(candidate?.nickname ?? candidate?.nickName ?? candidate?.displayName, "");
        const avatar = getAvatarFromUserObject(candidate);
        return Boolean(id && (name || avatar));
    }, 5);
    const userCandidates = [
        directActor,
        data?.user, data?.userDetails, data?.shareUser,
        data?.details?.user, data?.details?.userDetails,
        data?.share?.user, data?.share?.userDetails,
        data?.social?.user, data?.social?.userDetails,
        data?.memberUser, data?.author, data?.sender,
        data?.anchorInfo?.user, data?.event?.user, data?.event?.userDetails,
        deepActor, data
    ];
    const user = userCandidates.find((candidate) => candidate && typeof candidate === "object") || {};

    const uniqueId = clean(
        directActor?.uniqueId ?? directActor?.uniqueID ?? directActor?.displayId ?? directActor?.username,
        clean(
            user?.uniqueId ?? user?.uniqueID ?? user?.displayId ?? user?.username ??
            data?.uniqueId ?? data?.uniqueID ?? data?.displayId ?? data?.username,
            ""
        )
    );

    const nickname = clean(
        directActor?.nickname ?? directActor?.nickName ?? directActor?.displayName,
        clean(
            user?.nickname ?? user?.nickName ?? user?.displayName ?? user?.displayId ?? user?.uniqueId ??
            data?.nickname ?? data?.nickName ?? data?.displayName ?? data?.displayId ?? uniqueId,
            ""
        )
    );

    return { uniqueId: uniqueId || "Usuario", nickname: nickname || uniqueId || "Usuario", user };
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

function getIO() {
    return globalThis.__STREAMFUSION_IO__ || null;
}

function configuredTikTokModerator(uniqueId, ownerId = connectionOwnerId) {
    const id = String(uniqueId || "").trim().toLowerCase();
    if (!id || !ownerId) return false;
    try {
        const settings = database.getUserSettings(ownerId) || {};
        const list = Array.isArray(settings.tiktokModerators) ? settings.tiktokModerators : [];
        return list.some((value) => String(value || "").trim().toLowerCase() === id);
    } catch {
        return false;
    }
}

function withConfiguredModeratorBadge(badges, uniqueId, ownerId = connectionOwnerId) {
    const next = Array.isArray(badges) ? [...badges] : [];
    if (configuredTikTokModerator(uniqueId, ownerId) && !next.some((b) => String(b || "").toLowerCase().includes("moderator"))) {
        next.push("moderator");
    }
    return [...new Set(next)];
}

let connectionOwnerId = "";
function emitSystem(io, message, ownerId = connectionOwnerId) {
    const text = clean(message, "Error desconocido");
    const timestamp = Date.now();
    const payload = {
        id: `system:tiktok:${timestamp}:${normalizeUsername(text)}`,
        liveId: liveSession.getLiveId(ownerId, "tiktok"),
        platform: "tiktok",
        type: "system",
        action: "Sistema",
        emoji: "ℹ️",
        user: "TikTok",
        uniqueId: "",
        avatar: "",
        message: text,
        source: "system",
        connectionId: connectionSessionId,
        timestamp
    };
    recordEvent(payload, ownerId);
    const room = ownerId ? `user:${ownerId}` : null;
    if (room && getIO()?.to) getIO().to(room).emit("event", payload);
    else io?.emit("event", payload);
    if (room && getIO()?.to) getIO().to(room).emit("system", payload);
    else io?.emit("system", payload);
}

function emitChat(io, event, ownerId = connectionOwnerId) {
    const payload = {
        liveId: liveSession.getLiveId(ownerId, "tiktok"),
        platform: "tiktok",
        timestamp: Date.now(),
        type: clean(event.type, "chat"),
        action: clean(event.action, "Comentario"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        message: clean(event.message, ""),
        source: "chat",
        emoji: clean(event.emoji, typeEmoji(event.type, "💬")),
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        color: event.color !== undefined ? event.color : undefined,
        badges: withConfiguredModeratorBadge(event.badges, event.uniqueId, ownerId),
        gift: event.gift !== undefined ? event.gift : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        likes: event.likes !== undefined ? event.likes : undefined,
        sticker: event.sticker !== undefined ? event.sticker : undefined,
        stickerImage: event.stickerImage !== undefined ? event.stickerImage : undefined,
        stickerAlt: event.stickerAlt !== undefined ? event.stickerAlt : undefined,
        stickerId: event.stickerId !== undefined ? event.stickerId : undefined,
        connectionId: event.connectionId || connectionSessionId
    };
    const enrichedPayload = globalThis.__STREAMFUSION_POINTS_HOOK__?.(ownerId, payload) || payload;
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestChat?.({ ...enrichedPayload, _ownerId: ownerId });
    recordChat(enrichedPayload, ownerId);
    io?.emit("chat", enrichedPayload);
}

loadGiftCatalog();

function emitEvent(io, event, ownerId = connectionOwnerId) {
    const payload = {
        liveId: liveSession.getLiveId(ownerId, "tiktok"),
        platform: "tiktok",
        timestamp: Date.now(),
        type: clean(event.type, "system"),
        emoji: clean(event.emoji, typeEmoji(event.type, "✨")),
        action: (String(event.type || "").toLowerCase() === "share" || event.share === true) ? "Compartió" : clean(event.action, "Evento"),
        user: clean(event.user, "Usuario"),
        uniqueId: clean(event.uniqueId, ""),
        displayName: clean(event.displayName, event.user || "Usuario"),
        username: clean(event.username, event.uniqueId || ""),
        message: (String(event.type || "").toLowerCase() === "share" || event.share === true)
            ? clean(event.message, `${clean(event.displayName || event.user, "Usuario")} compartió el LIVE`)
            : clean(event.message, ""),
        source: "event",
        avatar: event.avatar !== undefined ? event.avatar : undefined,
        badges: withConfiguredModeratorBadge(event.badges, event.uniqueId, ownerId),
        gift: event.gift !== undefined ? event.gift : undefined,
        giftImage: event.giftImage !== undefined ? event.giftImage : undefined,
        giftCoins: event.giftCoins !== undefined ? event.giftCoins : undefined,
        giftAlt: event.giftAlt !== undefined ? event.giftAlt : undefined,
        amount: event.amount !== undefined ? event.amount : undefined,
        likes: event.likes !== undefined ? event.likes : undefined,
        sticker: event.sticker !== undefined ? event.sticker : undefined,
        stickerImage: event.stickerImage !== undefined ? event.stickerImage : undefined,
        stickerAlt: event.stickerAlt !== undefined ? event.stickerAlt : undefined,
        stickerId: event.stickerId !== undefined ? event.stickerId : undefined,
        connectionId: event.connectionId || connectionSessionId
    };
    const enrichedPayload = globalThis.__STREAMFUSION_POINTS_HOOK__?.(ownerId, payload) || payload;
    globalThis.__STREAMFUSION_ROULETTE_HOOK__?.ingestEvent?.({ ...enrichedPayload, _ownerId: ownerId });
    recordEvent(enrichedPayload, ownerId);
    io?.emit("event", enrichedPayload);
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
    // Social/share events are especially inconsistent: the actor may live in a
    // nested shareUser/social/event object while the top-level payload only
    // carries the action. Search every known actor container before falling
    // back to resolving the profile by username.
    const direct = getAvatarFromUserObject(data);
    if (direct) return direct;
    const candidates = [
        data?.user, data?.userDetails, data?.shareUser,
        data?.details?.user, data?.details?.userDetails,
        data?.share?.user, data?.share?.userDetails,
        data?.social?.user, data?.social?.userDetails,
        data?.memberUser, data?.author, data?.sender,
        data?.event?.user, data?.event?.userDetails
    ];
    for (const candidate of candidates) {
        const avatar = getAvatarFromUserObject(candidate);
        if (avatar) return avatar;
    }
    const deepActor = deepFindFirstObject(data, (candidate) => Boolean(getAvatarFromUserObject(candidate)));
    const deepAvatar = getAvatarFromUserObject(deepActor);
    if (deepAvatar) return deepAvatar;
    return await resolveTiktokAvatar(uniqueId || nickname, deepActor || data || null);
}

function resolveChatMessage(data) {
    const emoteText = clean(
        data?.emoteList?.map?.((entry) => clean(entry?.emoteId || entry?.emoteName, "")).filter(Boolean).join(" "),
        ""
    );
    const stickerMedia = resolveStickerMedia(data);
    const stickerText = clean(
        stickerMedia?.name ??
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
        const value = clean(stripBracketedSegments(candidate), "");
        if (value) return value;
    }

    return "";
}

async function handleSocialEvent(io, data, forcedType = null, isActive = () => true, emitEventFn = emitEvent, emitStatsFn = emitStats) {
    if (!isActive()) return;
    const { nickname, uniqueId } = pickUser(data, forcedType);

    const rawAction = clean(
        forcedType ||
        data?.action ||
        data?.socialType ||
        data?.shareType ||
        data?.shareTarget ||
        data?.type ||
        data?.label ||
        data?.displayType,
        "social"
    ).toLowerCase();
    const sharePayload = looksLikeSharePayload(data, forcedType);
    const shareSourceId = clean(data?.msgId ?? data?.messageId ?? data?.eventId ?? data?.shareId ?? "", "");

    const badges = collectBadges(data, data?.user || data?.details?.user || null);
    if (sharePayload) {
        const { uniqueId: shareUniqueId, nickname: shareNickname } = pickUser(data, "share");
        const shareKey = shareSourceId || `${shareUniqueId}|${shareNickname}|${String(data?.createTime ?? data?.timestamp ?? Date.now())}`;
        const now = Date.now();
        for (const [key, at] of recentShareEvents) if (now - at > 10000) recentShareEvents.delete(key);
        if (recentShareEvents.has(shareKey)) return;
        recentShareEvents.set(shareKey, now);
    }

    if (rawAction.includes("follow") || rawAction.includes("followed")) {
        sessionStats.followers += 1;
        const avatar = await avatarFor(data, nickname, uniqueId);
        if (!isActive()) return;
        emitEventFn(io, {
            type: "follow",
            emoji: "👤",
            action: "Follow",
            user: nickname,
            uniqueId,
            avatar,
            badges,
            message: `${nickname} comenzó a seguir`
        });
        if (isActive()) emitStatsFn(io);
        return;
    }

    if (rawAction.includes("share") || sharePayload) {
        sessionStats.shares += 1;
        const avatar = await avatarFor(data, nickname, uniqueId);
        if (!isActive()) return;
        emitEventFn(io, {
            type: "share",
            emoji: "🗣️",
            action: "Compartió",
            user: nickname,
            displayName: nickname,
            username: uniqueId,
            uniqueId,
            avatar,
            badges,
            message: `${nickname} compartió el LIVE`,
            share: true,
            label: "{0:user} shared the live",
            eventId: shareSourceId || `share:${uniqueId}:${Date.now()}`
        });
        if (isActive()) emitStatsFn(io);
        return;
    }

    const avatar = await avatarFor(data, nickname, uniqueId);
    if (!isActive()) return;
    emitEventFn(io, {
        type: "system",
        action: "Acción social",
        user: nickname,
        uniqueId,
        avatar,
        message: clean(data?.message ?? data?.text ?? data?.action, "Acción social")
    });
}

export async function connect(username, io, ownerId = "") {
    const isActiveGeneration = () => generation === connectionGeneration && connection !== null;
    const emitChatActive = (event) => { if (!isActiveGeneration()) return; emitChat(io, event, connectionOwnerId); };
    const emitEventActive = (event) => { if (!isActiveGeneration()) return; emitEvent(io, event, connectionOwnerId); };
    const emitStatsActive = () => { if (!isActiveGeneration()) return; emitStats(io); };
    const emitSystemActive = (message) => { if (!isActiveGeneration()) return; emitSystem(io, message, connectionOwnerId); };

    const generation = ++connectionGeneration;
    connectionSessionId = `tiktok-${Date.now()}-${generation}`;
    globalThis.__STREAMFUSION_IO__ = io;
    connectionOwnerId = String(ownerId || "").trim();

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

    connection.on(ControlEvent.CONNECTED, async (state) => {
        if (generation !== connectionGeneration || connection === null) return;
        liveSession.begin(connectionOwnerId, "tiktok");
        io?.emit("accountState", { platform:"tiktok", username:normalizedUser, connected:true, live:true, mode:"live", connectionId:connectionSessionId, liveId:liveSession.getLiveId(connectionOwnerId,"tiktok") });
        const streamerAvatar = await resolveTiktokAvatar(normalizedUser, state?.roomInfo?.owner?.user || state?.owner || state?.roomInfo?.owner || null);
        emitEventActive({ type:"stream_start", emoji:"🔴", action:"Comenzó el directo", user:normalizedUser, uniqueId:normalizedUser, avatar:streamerAvatar, message:`@${normalizedUser} ha comenzado el directo` });
        emitSystemActive(`TikTok conectado a @${normalizedUser}.`);

        if (state?.roomId) {
            emitSystemActive(`Room ID: ${state.roomId}`);
        }

        emitStatsActive();
    });

    connection.on(ControlEvent.DISCONNECTED, () => {
        if (generation !== connectionGeneration) return;
        liveSession.end(connectionOwnerId, "tiktok");
        io?.emit("accountState", { platform:"tiktok", username:normalizedUser, connected:false, live:false, mode:"saved", connectionId:"", liveId:"" });
        emitSystemActive("TikTok desconectado.");
    });

    connection.on(ControlEvent.ERROR, (data) => {
        if (generation !== connectionGeneration) return;
        const msg =
            data?.exception?.message ||
            data?.info ||
            data?.message ||
            "Error de TikTok";
        emitSystemActive(msg);
    });

    connection.on(E.CHAT, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);
        const stickerMedia = resolveStickerMedia(data);

        const message = resolveChatMessage(data) || clean(stripBracketedSegments(data?.comment ?? data?.text ?? data?.message), "");
        const isSticker = Boolean(
            stickerMedia?.image ||
            data?.sticker ||
            data?.stickerName ||
            data?.sticker?.name ||
            data?.sticker?.title ||
            data?.emoteList?.length
        );
        const emoji = isSticker ? "🧩" : typeEmoji("chat", "💬");

        emitChatActive({
            type: isSticker ? "sticker" : "chat",
            emoji,
            action: isSticker ? "Sticker" : "Comentario",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            sticker: stickerMedia?.name || "",
            stickerImage: stickerMedia?.image || "",
            stickerAlt: stickerMedia?.alt || "",
            stickerId: stickerMedia?.id || "",
            message: message || (isSticker ? clean(stickerMedia?.name || data?.sticker?.name || data?.stickerName || data?.sticker?.title, "Sticker") : "")
        });
    });

    connection.on(E.GIFT, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);
        const giftMedia = resolveGiftMedia(data);
        const giftName = giftMedia.name;

        const amount = normalizeGiftAmount(data);
        sessionStats.gifts += amount;
        emitStatsActive();

        const isStreak = data?.giftDetails?.giftType === 1;
        const suffix = isStreak && data?.repeatEnd === false ? " (en curso)" : "";

        emitEventActive({
            type: "gift",
            emoji: "🎁",
            action: "Regalo",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            gift: giftName,
            giftImage: giftMedia.image,
            giftCoins: giftMedia.coins,
            giftAlt: giftMedia.alt,
            amount,
            message: `🎁 ${giftName} x${amount}${suffix}`
        });
    });

    connection.on(E.LIKE, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);
        const likes = normalizeLikeCount(data);

        sessionStats.likes += likes;
        emitStatsActive();

        emitEventActive({
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

        emitEventActive({
            type: "join",
            emoji: "👻",
            action: "Entrada",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            message: `${nickname} entró al directo`
        });
    });

    connection.on(E.SOCIAL, async (data) => {
        handleSocialEvent(io, data, looksLikeSharePayload(data) ? "share" : null, isActiveGeneration, emitEventActive, emitStatsActive);
    });

    if (E.FOLLOW !== E.SOCIAL) {
        connection.on(E.FOLLOW, async (data) => handleSocialEvent(io, data, "follow", isActiveGeneration, emitEventActive, emitStatsActive));
    }

    if (E.SHARE !== E.SOCIAL) {
        connection.on(E.SHARE, async (data) => handleSocialEvent(io, data, "share", isActiveGeneration, emitEventActive, emitStatsActive));
    }
    // Always register the literal event name as well. Some connector builds
    // expose the custom share event even when the enum mapping changes.
    if (E.SHARE !== "share" && E.SOCIAL !== "share") {
        try { connection.on("share", async (data) => handleSocialEvent(io, data, "share", isActiveGeneration, emitEventActive, emitStatsActive)); } catch {}
    }
    // Some connector builds expose the share event under a literal event name
    // instead of WebcastEvent.SHARE. Register safe aliases without duplicating
    // the same event when the enum already points to them.
    for (const shareEventName of ["share", "shareEvent", "socialShare"]) {
        if (shareEventName !== E.SHARE && shareEventName !== E.SOCIAL) {
            try { connection.on(shareEventName, async (data) => handleSocialEvent(io, data, "share", isActiveGeneration, emitEventActive, emitStatsActive)); } catch {}
        }
    }

    connection.on(E.EMOTE, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);
        const stickerMedia = resolveStickerMedia(data);

        const emoteId = clean(
            data?.emoteList?.[0]?.emoteId ??
            data?.emoteId ??
            data?.emoteName,
            "emote"
        );

        emitChatActive({
            type: "sticker",
            emoji: "🧩",
            action: "Sticker",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            sticker: stickerMedia?.name || emoteId,
            stickerImage: stickerMedia?.image || "",
            stickerAlt: stickerMedia?.alt || emoteId,
            stickerId: stickerMedia?.id || emoteId,
            message: stickerMedia?.name || `Sticker: ${emoteId}`
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

        emitEventActive({
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

        emitEventActive({
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
        emitEventActive({
            type: "system",
            emoji: "⏹️",
            action: "Fin del live",
            user: "TikTok",
            uniqueId: "",
            avatar: "",
            message: "TikTok cerró el directo"
        });
    });

    connection.on(E.ENVELOPE, async (data) => {
        const envelope = data?.envelopeInfo || {};
        const diamondCount = toNumber(envelope?.diamondCount ?? 0, 0);

        emitEventActive({
            type: "system",
            emoji: "💌",
            action: "Sobre",
            user: clean(envelope?.sendUserName ?? "TikTok"),
            uniqueId: "",
            avatar: "",
            message: `💌 Sobre: ${diamondCount} diamantes`
        });
    });

    connection.on(E.SUPER_FAN, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEventActive({
            type: "superfan",
            emoji: "🌟",
            action: "Superfan",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            message: `${nickname} activó Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_JOIN, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEventActive({
            type: "superfan",
            emoji: "🌟",
            action: "Superfan",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            message: `${nickname} se unió como Super Fan`
        });
    });

    connection.on(E.SUPER_FAN_BOX, async (data) => {
        const { nickname, uniqueId, user } = pickUser(data);
        const badges = collectBadges(data, user);

        emitEventActive({
            type: "superfan",
            emoji: "🎁",
            action: "Caja Superfan",
            user: nickname,
            uniqueId,
            avatar: await avatarFor(data, nickname, uniqueId),
            badges,
            message: `${nickname} recibió una caja Super Fan`
        });
    });

    await connection.connect();
}

export async function disconnect() {
    connectionGeneration++;
    if (!connection) return;

    try {
        await connection.disconnect();
    } catch {}

    connection = null;
    liveSession.end(connectionOwnerId, "tiktok");
    connectionOwnerId = "";
    connectionSessionId = "";
}

export function getConnectionId() { return connectionSessionId; }
