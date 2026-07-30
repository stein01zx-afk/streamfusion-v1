import tmi from "tmi.js";

let client = null;

const avatarCache = new Map();
const pendingAvatarRequests = new Map();
const sevenTvChannelCache = new Map();
const pendingSevenTvRequests = new Map();
const TWITCH_EMOTE_CDN = "https://static-cdn.jtvnw.net/emoticons/v2";

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


function fetchJson(url, timeoutMs = 7000) {
    return fetchText(url, timeoutMs).then((raw) => {
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    });
}

function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTwitchEmoteUrl(id) {
    const cleanId = clean(id, "");
    return cleanId ? `${TWITCH_EMOTE_CDN}/${encodeURIComponent(cleanId)}/default/dark/3.0` : "";
}

function normalizeFragmentText(value) {
    return clean(value, "");
}

function fragmentTextFromEmote(fragment) {
    if (!fragment || typeof fragment !== "object") return "";
    return clean(
        fragment.text ??
        fragment.alt ??
        fragment.name ??
        fragment.label ??
        fragment.value ??
        fragment.id ??
        "",
        ""
    );
}

function fragmentToText(fragment) {
    if (fragment === null || fragment === undefined) return "";
    if (typeof fragment === "string") return fragment;
    if (typeof fragment === "number" || typeof fragment === "boolean") return String(fragment);
    if (Array.isArray(fragment)) return fragment.map(fragmentToText).join("");
    if (typeof fragment !== "object") return "";
    if (fragment.type === "emote") {
        return fragmentTextFromEmote(fragment);
    }
    return normalizeFragmentText(
        fragment.text ??
        fragment.value ??
        fragment.content ??
        fragment.message ??
        fragment.name ??
        fragment.label ??
        ""
    );
}

function fragmentsToText(fragments) {
    if (!Array.isArray(fragments)) return clean(fragmentToText(fragments), "");
    return fragments.map(fragmentToText).join("");
}

function buildTextFragment(text) {
    const value = clean(text, "");
    return value ? [{ type: "text", text: value }] : [];
}

function buildTwitchEmoteFragments(message, emotes) {
    const text = clean(message, "");
    if (!text) return [];

    const ranges = [];
    if (emotes && typeof emotes === "object") {
        for (const [id, positions] of Object.entries(emotes)) {
            if (!positions) continue;
            String(positions).split(",").forEach((pair) => {
                const [start, end] = String(pair).split("-").map((value) => Number(value));
                if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start && end < text.length) {
                    ranges.push({ start, end, id: String(id) });
                }
            });
        }
    }

    if (!ranges.length) return buildTextFragment(text);

    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    const fragments = [];
    let cursor = 0;

    for (const range of ranges) {
        if (range.start < cursor) continue;
        if (range.start > cursor) {
            fragments.push({ type: "text", text: text.slice(cursor, range.start) });
        }

        const token = text.slice(range.start, range.end + 1);
        const url = buildTwitchEmoteUrl(range.id);

        fragments.push({
            type: "emote",
            source: "twitch",
            id: range.id,
            alt: token,
            text: token,
            url,
        });

        cursor = range.end + 1;
    }

    if (cursor < text.length) {
        fragments.push({ type: "text", text: text.slice(cursor) });
    }

    return fragments.filter((fragment) => fragment && (fragment.type === "emote" || clean(fragment.text, "") !== ""));
}

function extractSevenTvUrl(emote) {
    if (!emote || typeof emote !== "object") return "";

    const direct = [
        emote.image_url,
        emote.imageUrl,
        emote.url,
        emote?.data?.host?.url,
        emote?.data?.url,
        emote?.urls?.[0],
    ].map((value) => clean(value, "")).find(Boolean);

    if (direct) return direct;

    const files = emote?.data?.host?.files || emote?.data?.files || emote?.host?.files || emote?.files;
    if (Array.isArray(files) && files.length) {
        const ordered = [...files].filter(Boolean).sort((a, b) => Number(a?.scale || a?.width || 0) - Number(b?.scale || b?.width || 0));
        const best = ordered[ordered.length - 1] || ordered[0];
        const fileUrl = clean(best?.url || best?.src || best?.host || "", "");
        if (fileUrl) return fileUrl;
    }

    const host = clean(emote?.data?.host?.url || emote?.host?.url || "", "");
    if (host && Array.isArray(files) && files.length) {
        const best = [...files].filter(Boolean).sort((a, b) => Number(a?.scale || a?.width || 0) - Number(b?.scale || b?.width || 0)).at(-1);
        const suffix = clean(best?.name || best?.file || best?.path || "", "");
        if (suffix) return `${host.replace(/\/+$/, "")}/${suffix.replace(/^\/+/, "")}`;
    }

    return "";
}

function buildSevenTvEmoteMapFromPayload(payload) {
    const map = new Map();
    const emotes = [];

    const pushEmotes = (value) => {
        if (!value) return;
        if (Array.isArray(value)) {
            value.forEach(pushEmotes);
            return;
        }
        if (typeof value === "object") {
            if (Array.isArray(value.emotes)) {
                value.emotes.forEach(pushEmotes);
                return;
            }
            if (Array.isArray(value.items)) {
                value.items.forEach(pushEmotes);
                return;
            }
            if (value.id || value.name || value.data || value.host) {
                emotes.push(value);
            }
        }
    };

    pushEmotes(payload?.emotes);
    pushEmotes(payload?.emote_set?.emotes);
    pushEmotes(payload?.emote_set?.data?.emotes);
    pushEmotes(payload?.emote_set?.items);
    pushEmotes(payload?.data?.emotes);
    pushEmotes(payload?.data?.items);
    pushEmotes(payload?.emoteSet?.emotes);
    pushEmotes(payload?.emoteSet?.data?.emotes);

    for (const emote of emotes) {
        const name = clean(emote?.name || emote?.default_name || emote?.data?.name || emote?.data?.host?.name || "", "");
        const url = extractSevenTvUrl(emote);
        if (!name || !url) continue;
        map.set(name.toLowerCase(), { name, url });
    }

    return map;
}

async function resolveTwitchUserId(login) {
    const channel = cleanLogin(login).toLowerCase();
    if (!channel) return "";

    const html = await fetchText(`https://www.twitch.tv/${encodeURIComponent(channel)}`);
    if (!html) return "";

    const patterns = [
        /"user_id":"?(\d+)"?/i,
        /"userID":"?(\d+)"?/i,
        /"channelID":"?(\d+)"?/i,
        /"id":"?(\d+)"?[^\d]/i,
        /data-user-id=["']?(\d+)["']?/i,
        /"id":\s*"?(\d+)"?,\s*"login":"/i,
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return String(match[1]);
    }

    return "";
}

async function fetchSevenTvUserPayload(login, twitchId) {
    const candidates = [];
    if (twitchId) {
        candidates.push(`https://7tv.io/v3/users/twitch/${encodeURIComponent(twitchId)}`);
        candidates.push(`https://api.7tv.app/v3/users/twitch/${encodeURIComponent(twitchId)}`);
    }
    if (login) {
        candidates.push(`https://7tv.io/v3/users/twitch/${encodeURIComponent(login)}`);
        candidates.push(`https://api.7tv.app/v3/users/twitch/${encodeURIComponent(login)}`);
    }

    for (const url of candidates) {
        const payload = await fetchJson(url);
        if (payload) return payload;
    }

    return null;
}

async function fetchSevenTvEmoteSet(setId) {
    if (!setId) return null;
    const candidates = [
        `https://7tv.io/v3/emote-sets/${encodeURIComponent(setId)}`,
        `https://api.7tv.app/v3/emote-sets/${encodeURIComponent(setId)}`
    ];

    for (const url of candidates) {
        const payload = await fetchJson(url);
        if (payload) return payload;
    }

    return null;
}

async function loadSevenTvEmotes(channel) {
    const login = cleanLogin(channel).toLowerCase();
    if (!login) return new Map();

    if (sevenTvChannelCache.has(login)) return sevenTvChannelCache.get(login);
    if (pendingSevenTvRequests.has(login)) return pendingSevenTvRequests.get(login);

    const request = (async () => {
        const twitchId = await resolveTwitchUserId(login);
        const userPayload = await fetchSevenTvUserPayload(login, twitchId);
        const setId = clean(
            userPayload?.emote_set?.id ||
            userPayload?.emoteSet?.id ||
            userPayload?.emote_sets?.[0]?.id ||
            userPayload?.emoteSets?.[0]?.id ||
            userPayload?.data?.emote_set?.id ||
            userPayload?.data?.emoteSets?.[0]?.id ||
            "",
            ""
        );

        let payload = userPayload;
        if (setId) {
            const setPayload = await fetchSevenTvEmoteSet(setId);
            if (setPayload) payload = setPayload;
        }

        const map = buildSevenTvEmoteMapFromPayload(payload);
        sevenTvChannelCache.set(login, map);
        return map;
    })()
        .catch(() => new Map())
        .finally(() => {
            pendingSevenTvRequests.delete(login);
        });

    pendingSevenTvRequests.set(login, request);
    return request;
}

function applySevenTvToFragments(fragments, emoteMap) {
    if (!Array.isArray(fragments) || !fragments.length || !emoteMap || !emoteMap.size) return fragments;

    const names = [...emoteMap.keys()].sort((a, b) => b.length - a.length);
    if (!names.length) return fragments;

    const pattern = new RegExp(`(?<!\\S)(${names.map(escapeRegExp).join("|")})(?!\\S)`, "gi");
    const output = [];

    for (const fragment of fragments) {
        if (!fragment || typeof fragment !== "object" || fragment.type !== "text") {
            output.push(fragment);
            continue;
        }

        const text = clean(fragment.text, "");
        if (!text) {
            output.push(fragment);
            continue;
        }

        let lastIndex = 0;
        let matched = false;
        for (const match of text.matchAll(pattern)) {
            const index = match.index ?? 0;
            const token = match[1] || match[0];
            const emote = emoteMap.get(String(token).toLowerCase());
            if (!emote) continue;
            matched = true;
            if (index > lastIndex) {
                output.push({ type: "text", text: text.slice(lastIndex, index) });
            }
            output.push({
                type: "emote",
                source: "7tv",
                name: emote.name,
                alt: emote.name,
                text: emote.name,
                url: emote.url,
            });
            lastIndex = index + token.length;
        }

        if (!matched) {
            output.push(fragment);
            continue;
        }

        if (lastIndex < text.length) {
            output.push({ type: "text", text: text.slice(lastIndex) });
        }
    }

    return output.filter((fragment) => fragment && (fragment.type === "emote" || clean(fragment.text, "") !== ""));
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
        fragments: event.fragments !== undefined ? event.fragments : undefined,
        messageFragments: event.messageFragments !== undefined ? event.messageFragments : undefined,
        textFragments: event.textFragments !== undefined ? event.textFragments : undefined,
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

    void loadSevenTvEmotes(normalizedChannel);

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
        const sevenTvMap = await loadSevenTvEmotes(normalizedChannel);
        const twitchFragments = buildTwitchEmoteFragments(message, tags?.emotes || {});
        const fragments = applySevenTvToFragments(twitchFragments, sevenTvMap);
        const plainMessage = fragmentsToText(fragments) || clean(message, "Mensaje sin texto");

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Comentario",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message: plainMessage,
            fragments,
            messageFragments: fragments,
            textFragments: fragments,
            color: getColor(tags),
            badges: getBadges(tags),
            emotes: tags?.emotes || "",
            avatar: await resolveTwitchAvatar(login),
        });
    });

    client.on("action", async (channelName, tags, message, self) => {
        if (self) return;

        const login = getLogin(tags);
        const sevenTvMap = await loadSevenTvEmotes(normalizedChannel);
        const twitchFragments = buildTwitchEmoteFragments(message, tags?.emotes || {});
        const fragments = applySevenTvToFragments(twitchFragments, sevenTvMap);
        const plainMessage = fragmentsToText(fragments) || clean(message, "Mensaje sin texto");

        emitChat(io, {
            platform: "twitch",
            type: "chat",
            action: "Acción",
            user: getDisplayName(tags),
            uniqueId: getUniqueId(tags),
            message: plainMessage,
            fragments,
            messageFragments: fragments,
            textFragments: fragments,
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
