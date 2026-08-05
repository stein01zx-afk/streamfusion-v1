import "dotenv/config";

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";

import * as database from "./services/database.js";
import * as tiktok from "./services/tiktok.js";
import * as twitch from "./services/twitch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "";
const FISH_AUDIO_MODEL = process.env.FISH_AUDIO_MODEL || "s2.1-pro-free";
const FISH_AUDIO_VOICE_CHANGER_WS = process.env.FISH_AUDIO_VOICE_CHANGER_WS || "";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const DEFAULT_SETTINGS = {
    general: {
        startMinimized: false,
        playSounds: true,
        saveLogs: true,
    },
    tiktok: {
        showChat: true,
        showLikes: true,
        showGifts: true,
        showFollowers: true,
        showShares: true,
        showJoin: true,
        showSystem: true,
    },
    twitch: {
        showChat: true,
        showSubs: true,
        showBits: true,
        showRaids: true,
        showFollowers: true,
        showJoin: true,
        showSystem: true,
    },
    overlay: {
        chat: true,
        events: true,
        gifts: true,
        platform: "both",
    },
    appearance: {
        theme: "dark",
    },
    personalization: {
        theme: "dark",
        font: "inter",
        animation: "slide",
        chatLayout: "vertical",
        chatDirection: "down",
        chatTheme: "cloud",
        chatAdjustMessages: false,
        avatarFrame: "platform",
        bubbleFrame: "platform",
        avatarSize: "md",
        nameSize: "md",
        nameWeight: "800",
        chatHorizontalMode: "normal",
        chatOverlayShape: "normal",
        badgeStyle: "emoji",
        tiktokNameColor: "white",
        twitchNameColor: "real",
        messageEffect: "shadow",
        nameEffect: "shadow",
        textColor: "auto",
        showBadges: true,
        showEmotes: true,
        highlightSupporters: true,
        supporterHighlightStyle: "gold",
        eventsLayout: "vertical",
        eventsDirection: "down",
        eventsMode: "slide",
        eventsPanelSize: "normal",
        eventsOverlayShape: "normal",
        giftsLayout: "vertical",
        giftsDirection: "down",
        giftsMode: "slide",
        giftsPanelSize: "normal",
        giftsOverlayShape: "normal",
        highlightStyle: "platform",
        giftHighlightStyle: "gold",
        highlightEventUsername: true,
        highlightLikes: true,
        highlightFollows: true,
        highlightJoins: true,
        highlightShares: true,
        highlightSystem: true,
        highlightFanclub: true,
        highlightSuperfan: true,
        highlightGifts: true,
        highlightSubs: true,
        highlightBits: true,
        highlightRaids: true,
        autoClearChat: false,
        clearChatSeconds: 30,
    },
};

function deepMerge(base, incoming) {
    if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
    if (typeof base !== "object" || base === null) return incoming ?? base;
    if (typeof incoming !== "object" || incoming === null) return base;

    const result = { ...base };

    for (const key of Object.keys(incoming)) {
        if (key in base) {
            result[key] = deepMerge(base[key], incoming[key]);
        } else {
            result[key] = incoming[key];
        }
    }

    return result;
}

function getMergedSettings() {
    const saved = database.getSettings();
    if (!saved) return structuredClone(DEFAULT_SETTINGS);
    return deepMerge(structuredClone(DEFAULT_SETTINGS), saved);
}

const AVATAR_FALLBACK = (seed, platform = "user") => {
    const label = String(seed || platform || "U").replace(/^@+/, "").replace(/^#+/, "").trim();
    if (platform === "tiktok") {
        return `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(label || "tiktok")}`;
    }
    const initial = (label.match(/[A-Za-z0-9]/)?.[0] || String(platform || "U")[0] || "U").toUpperCase();
    const accent = platform === "twitch" ? "#9146ff" : "#64748b";
    const bg = platform === "twitch" ? "#0f172a" : "#1f2937";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="${bg}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#fff">${initial}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

function cleanUser(value) {
    return String(value || "")
        .trim()
        .replace(/^@+/, "")
        .replace(/^#+/, "")
        .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
        .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
        .split(/[/?#]/)[0]
        .trim();
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

async function resolveTiktokAvatar(username) {
    const html = await fetchText(`https://www.tiktok.com/@${encodeURIComponent(username)}`);
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
}

async function resolveTwitchAvatar(username) {
    const text = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(username)}`);
    const avatar = String(text || "").trim();
    if (/^https?:\/\//i.test(avatar)) return avatar;
    return "";
}

app.use(cors());
app.use(compression());
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));

app.get("/api/avatar", async (req, res) => {
    const platform = String(req.query.platform || "").toLowerCase();
    const username = cleanUser(req.query.username);

    if (!username) {
        return res.status(400).json({
            avatarUrl: AVATAR_FALLBACK("guest"),
            platform,
            username: "",
            source: "fallback",
        });
    }

    let avatarUrl = "";
    let source = "fallback";

    if (platform === "twitch") {
        avatarUrl = await resolveTwitchAvatar(username);
        source = avatarUrl ? "twitch" : "fallback";
    } else if (platform === "tiktok") {
        avatarUrl = await resolveTiktokAvatar(username);
        source = avatarUrl ? "tiktok" : "fallback";
    }

    if (!avatarUrl) {
        avatarUrl = AVATAR_FALLBACK(`${platform || "user"}-${username}`, platform || "user");
    }

    res.json({
        avatarUrl,
        platform,
        username,
        source,
    });
});


async function fishFetchJson(pathname, { query = {}, method = "GET", body = null } = {}) {
    if (!FISH_AUDIO_API_KEY) {
        throw new Error("Falta FISH_AUDIO_API_KEY en el servidor.");
    }

    const url = new URL(`https://api.fish.audio${pathname}`);
    for (const [key, value] of Object.entries(query || {})) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
    }

    const headers = {
        Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
    };

    const options = { method, headers };
    if (body !== null && body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "application/json";
    const raw = await response.text();

    let parsed = null;
    if (contentType.includes("application/json") || raw.trim().startsWith("{")) {
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }

    return {
        ok: response.ok,
        status: response.status,
        contentType,
        raw,
        json: parsed,
    };
}

app.get("/api/realtime-voice/status", async (req, res) => {
    let voiceCount = 0;
    let apiReachable = false;

    if (FISH_AUDIO_API_KEY) {
        try {
            const check = await fishFetchJson("/model", { query: { page_size: 1, page_number: 1 } });
            apiReachable = check.ok;
            voiceCount = Number(check.json?.total || check.json?.items?.length || 0) || 0;
        } catch {
            apiReachable = false;
        }
    }

    res.json({
        online: true,
        apiKeyConfigured: Boolean(FISH_AUDIO_API_KEY),
        apiReachable,
        voiceCount,
        model: FISH_AUDIO_MODEL,
        ttsEndpoint: "/api/voicebot/tts",
        voicesEndpoint: "/api/realtime-voice/voices",
        transcriptionEngine: "browser-web-speech",
        voiceChangerWsUrl: FISH_AUDIO_VOICE_CHANGER_WS,
        browserSinkId: true,
    });
});

app.get("/api/realtime-voice/voices", async (req, res) => {
    try {
        if (!FISH_AUDIO_API_KEY) {
            return res.status(500).json({ error: "Falta FISH_AUDIO_API_KEY en el servidor." });
        }

        const all = String(req.query.all || "0").toLowerCase() === "1" || String(req.query.all || "").toLowerCase() === "true";
        const baseQuery = {
            page_size: Math.min(Math.max(Number(req.query.page_size || 100) || 100, 1), 100),
            page_number: Math.max(Number(req.query.page_number || 1) || 1, 1),
            title: String(req.query.title || "").trim(),
            tag: String(req.query.tag || "").trim(),
            self: String(req.query.self || "false"),
            author_id: String(req.query.author_id || "").trim(),
            language: String(req.query.language || "").trim(),
            title_language: String(req.query.title_language || "").trim(),
            sort_by: String(req.query.sort_by || "score").trim(),
        };

        if (!all) {
            const result = await fishFetchJson("/model", { query: baseQuery });
            return res.status(result.status).json(result.json || { error: result.raw });
        }

        const items = [];
        const seen = new Set();
        let page = baseQuery.page_number;
        let hasMore = true;
        let lastTotal = 0;

        while (hasMore && page < 20) {
            const result = await fishFetchJson("/model", { query: { ...baseQuery, page_number: page } });
            if (!result.ok) return res.status(result.status).json(result.json || { error: result.raw });
            const payload = result.json || {};
            lastTotal = Number(payload.total || lastTotal || 0) || 0;
            for (const item of payload.items || []) {
                if (!item?._id || seen.has(item._id)) continue;
                seen.add(item._id);
                items.push(item);
            }
            hasMore = Boolean(payload.has_more);
            page += 1;
            if (!payload.items?.length) break;
        }

        return res.json({
            total: lastTotal || items.length,
            items,
            has_more: false,
            loaded_all: true,
        });
    } catch (err) {
        return res.status(500).json({ error: err?.message || "No se pudieron cargar las voces." });
    }
});

function buildProfanityFilterRegex() {
    const badWords = [
        "mierda", "mierdas", "mierdero", "mierderos", "mierdoso", "mierdosa", "mierd", "mrd",
        "puta", "puta madre", "puto", "putos", "putas", "putísima", "putisima",
        "cabron", "cabrona", "cabrones", "cabronazo", "cabronazo", "cabroncete",
        "coño", "cojon", "cojones", "coñazo", "coñito", "coñazo",
        "joder", "jodido", "jodida", "jodón", "jodona",
        "chingar", "chingada", "chingado", "chingón", "chingona",
        "pendejo", "pendeja", "pendeja", "pendejazo", "pendejita",
        "verga", "vergon", "vergón", "culo", "culero", "culera",
        "cagar", "cagada", "cagon", "cagón", "cagada",
        "imbecil", "imbécil", "idiota", "gilipollas", "hijo de puta", "hijodeputa", "hijoputa",
        "hdp", "hp", "mrd", "mierd", "pn", "phenhe", "violar", "zhemen", "cmen",
        "maricon", "maricón", "marica", "putero", "puta madre", "puta madre", "mamon", "mamón",
        "estupido", "estúpido", "tarado", "subnormal", "mongol", "boludo", "boluda", "pelotudo", "pelotuda",
        "zorra", "perra", "bitch", "fuck", "shit",
    ];
    const makePattern = (word) => {
        const normalized = normalizeVoiceSpoofText(word).trim().replace(/\s+/g, " ");
        if (!normalized) return "";
        const collapsed = normalized.replace(/\s+/g, "");
        const core = normalized
            .split(" ")
            .filter(Boolean)
            .map((piece) => piece
                .split("")
                .map((ch) => `${ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s._-]*`)
                .join(""))
            .join("[\\s._-]+");
        return collapsed.length <= 4
            ? `(^|[^\\p{L}\\p{N}])(?:${core})(?=$|[^\\p{L}\\p{N}])`
            : `(?:${core})`;
    };
    const parts = [...new Set(badWords.map(makePattern).filter(Boolean))];
    return parts.length ? new RegExp(parts.join("|"), "giu") : null;
}

const VOICE_PROFANITY_RE = buildProfanityFilterRegex();

function censorVoiceProfanity(text) {
    const source = String(text || "");
    if (!source || !VOICE_PROFANITY_RE) return source;
    let out = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    out = out.replace(/\b\d{6,}\b/g, (match) => match.slice(0, 3));
    out = out.replace(VOICE_PROFANITY_RE, " ");
    out = out.replace(/\s+/g, " ").trim();
    return out;
}

app.post("/api/voicebot/tts", async (req, res) => {
    try {
        if (!FISH_AUDIO_API_KEY) {
            return res.status(500).json({ error: "Falta FISH_AUDIO_API_KEY en el servidor." });
        }

        const text = String(req.body?.text || "").trim();
        const voiceId = String(req.body?.voiceId || "").trim();
        const profanityFilter = Boolean(req.body?.profanityFilter);

        if (!text) return res.status(400).json({ error: "El texto está vacío." });
        if (!voiceId) return res.status(400).json({ error: "Falta voiceId." });

        const safeText = profanityFilter ? censorVoiceProfanity(text) : text;
        if (!safeText) return res.status(400).json({ error: "El texto quedó vacío después del filtro." });

        const payload = {
            text: safeText,
            reference_id: voiceId,
            format: "mp3",
            latency: "balanced",
            temperature: 0.7,
            top_p: 0.7,
            chunk_length: 160,
            normalize: true,
            sample_rate: 44100,
            mp3_bitrate: 128,
            max_new_tokens: 1024,
            repetition_penalty: 1.2,
            min_chunk_length: 50,
            condition_on_previous_chunks: true,
            early_stop_threshold: 1,
        };

        const fishRes = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
                "Content-Type": "application/json",
                model: FISH_AUDIO_MODEL,
            },
            body: JSON.stringify(payload),
        });

        const contentType = fishRes.headers.get("content-type") || "audio/mpeg";
        const arrayBuffer = await fishRes.arrayBuffer();

        res.status(fishRes.status);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-store");

        if (!fishRes.ok) {
            const message = Buffer.from(arrayBuffer).toString("utf8");
            return res.send(message || JSON.stringify({ error: "Fish Audio devolvió un error." }));
        }

        return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        return res.status(500).json({
            error: err?.message || "No se pudo generar audio.",
        });
    }
});


app.get("/api/realtime-voice/config", (req, res) => {
    res.json({
        voiceChangerWsUrl: FISH_AUDIO_VOICE_CHANGER_WS,
        hasVoiceChangerWsUrl: Boolean(FISH_AUDIO_VOICE_CHANGER_WS),
        ttsEndpoint: "/api/voicebot/tts",
        model: FISH_AUDIO_MODEL,
    });
});

app.get("/api/status", (req, res) => {
    res.json({
        online: true,
        app: "StreamFusion",
        version: "3.0.0",
    });
});

io.on("connection", (socket) => {
    console.log("Cliente conectado");

    socket.emit("system", {
        message: "Conectado a StreamFusion.",
    });

    socket.emit("settings", getMergedSettings());

    socket.on("connectTikTok", async (username) => {
        const cleanName = String(username || "").replace(/^@+/, "").trim();
        try {
            await tiktok.connect(cleanName, io);
            socket.emit("accountState", {
                platform: "tiktok",
                username: cleanName,
                connected: true,
                live: false,
                mode: "waiting",
            });
            socket.emit("system", {
                message: `TikTok conectado con @${cleanName}.`,
            });
        } catch (err) {
            socket.emit("accountState", {
                platform: "tiktok",
                username: cleanName,
                connected: false,
                live: false,
                mode: "saved",
            });
            socket.emit("system", {
                message: err?.message || "Error al conectar TikTok.",
            });
        }
    });

    socket.on("connectTwitch", async (channel) => {
        const cleanChannel = String(channel || "").replace(/^#+/, "").trim();
        try {
            await twitch.connect(cleanChannel, io);
            socket.emit("accountState", {
                platform: "twitch",
                username: cleanChannel,
                connected: true,
                live: false,
                mode: "waiting",
            });
            socket.emit("system", {
                message: `Twitch conectado a ${cleanChannel}.`,
            });
        } catch (err) {
            socket.emit("accountState", {
                platform: "twitch",
                username: cleanChannel,
                connected: false,
                live: false,
                mode: "saved",
            });
            socket.emit("system", {
                message: err?.message || "Error al conectar Twitch.",
            });
        }
    });

    socket.on("disconnectTikTok", async () => {
        try {
            await tiktok.disconnect();
            socket.emit("accountState", {
                platform: "tiktok",
                connected: false,
                live: false,
                mode: "saved",
            });
            socket.emit("system", {
                message: "TikTok desconectado.",
            });
        } catch (err) {
            socket.emit("system", {
                message: err?.message || "No se pudo desconectar TikTok.",
            });
        }
    });

    socket.on("disconnectTwitch", async () => {
        try {
            await twitch.disconnect();
            socket.emit("accountState", {
                platform: "twitch",
                connected: false,
                live: false,
                mode: "saved",
            });
            socket.emit("system", {
                message: "Twitch desconectado.",
            });
        } catch (err) {
            socket.emit("system", {
                message: err?.message || "No se pudo desconectar Twitch.",
            });
        }
    });

    socket.on("saveSettings", (settings) => {
        const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), settings || {});
        database.saveSettings(merged);
        io.emit("settings", merged);
        socket.emit("system", {
            message: "Configuración guardada.",
        });
    });

    socket.on("loadSettings", () => {
        socket.emit("settings", getMergedSettings());
    });

    socket.on("disconnect", () => {
        console.log("Cliente desconectado");
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("=================================");
    console.log(" StreamFusion iniciado");
    console.log(" Puerto:", PORT);
    console.log("=================================");
});
