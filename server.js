import "dotenv/config";

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import fs from "node:fs";
import { spawn } from "node:child_process";

import * as database from "./services/database.js";
import * as liveSession from "./services/live-session.js";
import * as points from "./services/points.js";
import * as tiktok from "./services/tiktok.js";
import * as twitch from "./services/twitch.js";
import * as roulette from "./services/roulette.js";
import { snapshot as liveHistorySnapshot } from "./services/live-history.js";
import { setCustomVoiceRules } from "./services/voice-rules.js";

globalThis.__STREAMFUSION_ROULETTE_HOOK__ = roulette;

globalThis.__STREAMFUSION_POINTS_HOOK__ = (ownerId, payload) => points.processLivePayload(ownerId, payload);
globalThis.__STREAMFUSION_LIVE_END_HOOK__ = (ownerId, platform) => { const id=String(ownerId||"").trim(); const p=String(platform||"tiktok").toLowerCase()==="twitch"?"twitch":"tiktok"; if(id){ liveSession.end(id,p); io.to(`user:${id}`).emit("liveEnded", {platform:p}); } };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "";
const FISH_AUDIO_MODEL = process.env.FISH_AUDIO_MODEL || "s2.1-pro-free";
const FISH_AUDIO_VOICE_CHANGER_WS = process.env.FISH_AUDIO_VOICE_CHANGER_WS || "";

const accountState = {
    tiktok: { username: "", connected: false, live: false, mode: "saved" },
    twitch: { username: "", connected: false, live: false, mode: "saved" },
};

const voiceListPresence = new Map();
function voiceListPresencePayload(userId) { const connections = Number(voiceListPresence.get(String(userId)) || 0); return { online: connections > 0, connections }; }
function emitVoiceListPresence(userId) { if (userId) io.to(`user:${userId}`).emit("voiceListPresence", voiceListPresencePayload(userId)); }
function addVoiceListPresence(userId) { const key=String(userId||""); if(!key)return; voiceListPresence.set(key,Number(voiceListPresence.get(key)||0)+1); emitVoiceListPresence(key); }
function removeVoiceListPresence(userId) { const key=String(userId||""); if(!key)return; const next=Math.max(0,Number(voiceListPresence.get(key)||0)-1); if(next)voiceListPresence.set(key,next); else voiceListPresence.delete(key); emitVoiceListPresence(key); }
const connectionOwners = { tiktok: "", twitch: "" };

function emitAccountState(platform, overrides = {}, ownerId = "") {
    const key = String(platform || "").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    accountState[key] = { ...accountState[key], ...overrides, platform: key };
    const payload = { ...accountState[key], platform: key };
    if (ownerId) io.to(`user:${ownerId}`).emit("accountState", payload);
    else io.emit("accountState", payload);
    return payload;
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

roulette.setBroadcaster((event, payload) => {
    const ownerId = roulette.getOwnerId();
    if (ownerId) io.to(`user:${ownerId}`).emit(event, payload);
    else io.emit(event, payload);
});

roulette.setVoiceAssignmentSync((payload) => {
    if (!payload || payload.action !== "upsert" || !payload.assignment) return;
    upsertVoiceFixedUser(payload.assignment, payload.ownerId || payload.assignment?.ownerId || "");
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
    voiceFixedUsers: [],
    tiktokModerators: [],
    voiceList: {
        enabled: true,
        transparent: true,
        backgroundOpacity: 0,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 28,
        fontWeight: 700,
        fontStyle: "normal",
        textColor: "#000000",
        textShadow: "none",
        shadowColor: "#000000",
        outlineWidth: 0,
        outlineColor: "#000000",
        textTransform: "none",
        letterSpacing: 0,
        lineHeight: 1.2,
        itemGap: 10,
        align: "left",
        listPosition: "left",
        axis: "vertical",
        movementDirection: "forward",
        autoShowEnabled: false,
        autoShowEvery: 30,
        autoShowFor: 6,
        direction: "vertical",
        motion: "static",
        motionSpeed: 24,
        showIndex: false,
        showId: false,
        selectedVoice: "",
        overrides: {},
        roulette: {
            enabled: false,
            title: "¿Quieres una voz?",
            subtitle: "Para participar, comenta lo que se indique en el sorteo!",
            winnerText: "Si ganas, solo comenta una de las siguientes voces:",
            imageUrl: "",
            imageAlt: "",
            imagePosition: "top",
            imageFit: "contain",
            imageWidth: 260,
            imageHeight: 260,
            imageOpacity: 1,
            cardOpacity: 0.12,
            titleSeconds: 3,
            subtitleSeconds: 3,
            winnerSeconds: 3,
            introMotion: "fade",
            showListAfterIntro: true,
        },
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
        showPlatformPill: true,
        showTimestamps: true,
        showActivity: true,
        bubbleRadius: 12,
        avatarBorderWidth: 2,
        messagePadding: 7,
        rowGap: 5,
        tiktokNameColor: "white",
        twitchNameColor: "real",
        nameSize: "md",
        nameWeight: "800",
        chatHorizontalMode: "normal",
        chatOverlayShape: "normal",
        chatOverlayCardSide: "center",
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
        eventsOverlayCardSide: "center",
        giftsOverlayCardSide: "center",
        overlayNameColorMode: "platform",
        overlayNameColor: "#ffffff",
        overlayEventFont: "inherit",
        overlayGiftDisplayMode: "full",
        overlayGiftCompositionMode: "vertical-centered",
        eventVisibility: { likes:true, follows:true, joins:true, shares:true, system:true, gifts:true, subscriptions:true, bits:true, raids:true, hosts:true },
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

function normalizeVoiceFixedUserEntry(entry = {}) {
    const platform = String(entry?.platform || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const username = cleanUser(String(entry?.username || entry?.uniqueId || entry?.displayName || entry?.label || "").trim());
    if (!username) return null;
    const voiceKey = String(entry?.voiceKey || "verity").trim();
    const displayName = String(entry?.displayName || entry?.nickname || entry?.username || entry?.label || username).trim() || username;
    const source = String(entry?.source || "manual").toLowerCase() === "roulette" ? "roulette" : "manual";
    return {
        platform,
        username,
        displayName,
        voiceKey,
        voiceLabel: String(entry?.voiceLabel || entry?.label || entry?.voiceKey || "").trim(),
        source,
        sourceLabel: source === "roulette" ? "Ruleta" : "Manual",
        comment: String(entry?.comment || "").trim(),
        winnerKey: String(entry?.winnerKey || "").trim(),
        createdAt: Number(entry?.createdAt || Date.now()),
        updatedAt: Number(entry?.updatedAt || Date.now()),
        commentAt: Number(entry?.commentAt || 0) || 0,
        autoAssigned: Boolean(entry?.autoAssigned),
    };
}

function voiceFixedUserKey(entry = {}) {
    const platform = String(entry?.platform || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const username = cleanUser(String(entry?.username || entry?.uniqueId || "").trim());
    return platform && username ? `${platform}:${username}` : "";
}

function readVoiceFixedUsers(ownerId = "") {
    const settings = ownerId ? database.getUserSettings(ownerId) : (database.getSettings() || {});
    const list = Array.isArray(settings.voiceFixedUsers) ? settings.voiceFixedUsers : [];
    return list.map((entry) => normalizeVoiceFixedUserEntry(entry)).filter(Boolean);
}

function writeVoiceFixedUsers(list = [], ownerId = "") {
    const current = ownerId ? database.getUserSettings(ownerId) : (database.getSettings() || {});
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), current);
    merged.voiceFixedUsers = list.map((entry) => normalizeVoiceFixedUserEntry(entry)).filter(Boolean);
    if (ownerId) {
        database.saveUserSettings(ownerId, merged);
        io.to(`user:${ownerId}`).emit("settings", merged);
        return merged.voiceFixedUsers;
    }
    database.saveSettings(merged);
    io.emit("settings", merged);
    return merged.voiceFixedUsers;
}

function upsertVoiceFixedUser(entry = {}, ownerId = "") {
    const normalized = normalizeVoiceFixedUserEntry(entry);
    if (!normalized) return null;
    const list = readVoiceFixedUsers(ownerId);
    const key = voiceFixedUserKey(normalized);
    const idx = list.findIndex((item) => voiceFixedUserKey(item) === key);
    const now = Date.now();
    const next = {
        ...normalized,
        createdAt: idx >= 0 ? Number(list[idx]?.createdAt || now) : now,
        updatedAt: now,
    };
    if (idx >= 0) list[idx] = { ...list[idx], ...next };
    else list.unshift(next);
    writeVoiceFixedUsers(list, ownerId);
    return next;
}

function deleteVoiceFixedUser(entry = {}, ownerId = "") {
    const key = voiceFixedUserKey(entry);
    if (!key) return false;
    const list = readVoiceFixedUsers(ownerId);
    const next = list.filter((item) => voiceFixedUserKey(item) !== key);
    if (next.length === list.length) return false;
    writeVoiceFixedUsers(next, ownerId);
    return true;
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

function bearerToken(req) {
    return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function requireUser(req, res, next) {
    const user = database.getSession(bearerToken(req));
    if (!user) return res.status(401).json({ error: "Sesión requerida." });
    req.user = user;
    next();
}

app.post("/api/auth/register", (req, res) => {
    try {
        const user = database.createUser(req.body || {});
        const token = database.createSession(user.id);
        res.status(201).json({ token, user });
    } catch (error) { res.status(400).json({ error: error.message || "No se pudo crear la cuenta." }); }
});

app.post("/api/auth/login", (req, res) => {
    try {
        const user = database.authenticateUser(req.body || {});
        const token = database.createSession(user.id);
        res.json({ token, user });
    } catch (error) { res.status(401).json({ error: error.message || "No se pudo iniciar sesión." }); }
});

app.post("/api/auth/logout", requireUser, (req, res) => { database.deleteSession(bearerToken(req)); res.status(204).end(); });

app.get("/api/me", requireUser, (req, res) => res.json({ user: req.user }));

app.get("/api/live-history", requireUser, (req, res) => res.json(liveHistorySnapshot()));

app.get("/api/user/settings", requireUser, (req, res) => {
    const own = database.getUserSettings(req.user.id);
    res.json(deepMerge(structuredClone(DEFAULT_SETTINGS), own));
});

app.get("/api/overlay/key", requireUser, (req, res) => {
    res.json({ key: database.getOrCreateOverlayKey(req.user.id) });
});

app.put("/api/user/settings", requireUser, (req, res) => {
    const own = database.getUserSettings(req.user.id);
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), deepMerge(own, req.body || {}));
    database.saveUserSettings(req.user.id, merged);
    io.to(`user:${req.user.id}`).emit("settings", merged);
    res.json(merged);
});

app.get("/api/points/settings", requireUser, (req, res) => {
    res.json({ points: points.getConfigForUser(req.user.id) });
});

app.put("/api/points/settings", requireUser, (req, res) => {
    const cfg = points.setConfigForUser(req.user.id, req.body?.points || req.body || {});
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), database.getUserSettings(req.user.id) || {});
    io.to(`user:${req.user.id}`).emit("settings", sanitizeLiveOnlySettings(merged));
    res.json({ ok:true, points: cfg });
});

app.get("/api/points/leaderboard", requireUser, (req, res) => {
    const limit=Math.min(500,Math.max(1,Number(req.query.limit||100)||100));
    res.json({ users: database.listPointBalances(req.user.id, limit, req.query.q || '') });
});

app.get("/api/points/user", requireUser, async (req, res) => {
    const platform=String(req.query?.platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok';
    const username=String(req.query?.username||req.query?.uniqueId||'').trim().replace(/^@+/, '');
    if(!username) return res.status(400).json({error:'Escribe el usuario/uniqueId.'});

    // TikTok: solo se puede buscar a espectadores que ya hayan generado alguna actividad.
    // Así evitamos inventar perfiles y garantizamos que el avatar proviene del sistema de comentarios/actividad.
    if(platform==='tiktok'){
        if(!liveSession.hasViewerActivity(req.user.id, 'tiktok', username)) return res.status(404).json({error:'Ese usuario todavía no ha comentado ni generado actividad en este directo de TikTok.'});
        const viewer=database.findViewerProfile(req.user.id, 'tiktok', username);
        if(!viewer) return res.status(404).json({error:'Ese usuario todavía no aparece en tus actividades de TikTok.'});
        let avatarUrl=viewer.avatarUrl||'';
        if(!avatarUrl){
            avatarUrl=await resolveTiktokAvatar(username).catch(()=>'' );
            if(avatarUrl) database.touchViewerProfile(req.user.id,'tiktok',username,viewer.displayName||username,avatarUrl);
        }
        const account=database.getPoints(req.user.id, 'tiktok', username);
        const fresh=database.findViewerProfile(req.user.id,'tiktok',username) || viewer;
        return res.json({ ok:true, user:{ platform:'tiktok', username:fresh.username, displayName:fresh.displayName||account.displayName||username, avatarUrl:avatarUrl||fresh.avatarUrl||'', points:Number(account.points||0), totalEarned:Number(account.totalEarned||0), everDonated:Boolean(fresh.everDonated), followedBefore:Boolean(fresh.followedBefore), updatedAt:account.updatedAt||fresh.updatedAt||'' } });
    }

    // Twitch: no requiere que haya comentado previamente; el usuario se puede consultar por su canal.
    const account=database.getPoints(req.user.id, 'twitch', username);
    const viewer=database.findViewerProfile(req.user.id, 'twitch', username);
    const avatarUrl=viewer?.avatarUrl || await resolveTwitchAvatar(username).catch(()=>'' );
    const displayName=viewer?.displayName || account.displayName || username;
    if(!viewer && avatarUrl) database.touchViewerProfile(req.user.id,'twitch',username,displayName,avatarUrl);
    return res.json({ ok:true, user:{ platform:'twitch', username:account.username||username, displayName, avatarUrl, points:Number(account.points||0), totalEarned:Number(account.totalEarned||0), everDonated:Boolean(viewer?.everDonated), followedBefore:Boolean(viewer?.followedBefore), updatedAt:account.updatedAt||viewer?.updatedAt||'' } });
});

app.post("/api/points/user", requireUser, (req, res) => {
    const platform=String(req.body?.platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok';
    const username=String(req.body?.username||req.body?.uniqueId||'').trim().replace(/^@+/, '');
    const displayName=String(req.body?.displayName||username).trim() || username;
    const amount=Math.max(1,Math.min(100000000,Math.floor(Number(req.body?.amount)||0)));
    if(!username) return res.status(400).json({error:'Escribe el uniqueId/usuario.'});
    if(!amount) return res.status(400).json({error:'La cantidad de puntos debe ser mayor que 0.'});
    const account=database.addManualPoints(req.user.id, platform, username, displayName, amount);
    res.json({ok:true,account,message:`Puntos añadidos: +${amount}`});
});

app.delete("/api/points/user", requireUser, (req, res) => {
    const ok = database.deletePointBalance(req.user.id, req.body?.platform, req.body?.username);
    res.json({ ok });
});

app.get("/api/voicebot/power-users", (req, res) => {
    const requestedOwner = String(req.query?.owner || '').trim();
    const overlayKey = String(req.query?.overlayKey || '').trim();
    let ownerId = req.user?.id || null;
    if (!ownerId && requestedOwner && overlayKey) {
        const owner = database.getUserByOverlayKey(overlayKey);
        if (owner?.id === requestedOwner) ownerId = owner.id;
    }
    if (!ownerId) return res.status(403).json({ error:'No autorizado.' });
    const settings = database.getUserSettings(ownerId) || {};
    const power = settings?.voiceBot?.power || {};
    const tiktokUsers = liveSession.getPowerUsers(ownerId, 'tiktok');
    const twitchUsers = liveSession.getPowerUsers(ownerId, 'twitch');
    res.json({ powerUsers: [...tiktokUsers, ...twitchUsers], power });
});


app.get("/api/avatar", async (req, res) => {
    const platform = String(req.query.platform || "").toLowerCase();
    const username = cleanUser(req.query.username);

    if (!username) {
        return res.status(400).json({
            avatarUrl: "",
            platform,
            username: "",
            source: "none",
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

    res.json({
        avatarUrl: /^https?:\/\//i.test(String(avatarUrl || "")) ? avatarUrl : "",
        platform,
        username,
        source: avatarUrl ? source : "none",
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

function publicOwnerUserId(req) {
    const owner = String(req.query?.owner || "").trim();
    return owner && database.getUserById(owner) ? owner : null;
}

function getSettingsForUser(userId) {
    if (!userId) return getMergedSettings();
    return deepMerge(structuredClone(DEFAULT_SETTINGS), database.getUserSettings(userId));
}

app.get("/api/voice-list/settings", (req, res) => {
    const userId = req.user?.id || publicOwnerUserId(req);
    const settings = getSettingsForUser(userId);
    res.json({ voiceList: settings.voiceList || DEFAULT_SETTINGS.voiceList });
});

app.put("/api/voice-list/settings", requireUser, (req, res) => {
    const userId = req.user.id;
    const current = database.getUserSettings(userId) || {};
    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), deepMerge(current, { voiceList: incoming }));
    database.saveUserSettings(userId, merged);
    io.to(`user:${userId}`).emit("settings", merged);
    io.to(`user:${userId}`).emit("voiceListSettings", merged.voiceList || DEFAULT_SETTINGS.voiceList);
    res.json({ ok: true, voiceList: merged.voiceList || DEFAULT_SETTINGS.voiceList });
});

app.get("/api/user/voices", requireUser, (req, res) => {
    const voices = database.listUserVoices(req.user.id);
    setCustomVoiceRules(req.user.id, voices);
    res.json({ voices });
});

app.post("/api/user/voices", requireUser, (req, res) => {
    try {
        const input = req.body || {};
        const fishId = String(input.fishId || input.id || "").trim();
        if (!fishId) return res.status(400).json({ error: "Escribe el ID de Fish Audio." });
        const voice = database.upsertUserVoice(req.user.id, {
            fishId,
            label: input.label || input.name || fishId,
            author: input.author || "",
            description: input.description || "",
            imageUrl: input.imageUrl || input.avatarUrl || "",
            tags: input.tags || [],
        });
        const voices = database.listUserVoices(req.user.id);
        setCustomVoiceRules(req.user.id, voices);
        io.to(`user:${req.user.id}`).emit('voiceLibrary', { voices, updatedAt: Date.now() });
        res.status(201).json({ voice });
    } catch (error) {
        res.status(400).json({ error: error?.message || "No se pudo guardar la voz." });
    }
});

app.delete("/api/user/voices/:fishId", requireUser, (req, res) => {
    const ok = database.deleteUserVoice(req.user.id, req.params.fishId);
    if (!ok) return res.status(404).json({ error: "Voz no encontrada." });
    const voices = database.listUserVoices(req.user.id);
    setCustomVoiceRules(req.user.id, voices);
    io.to(`user:${req.user.id}`).emit('voiceLibrary', { voices, updatedAt: Date.now() });
    res.status(204).end();
});

app.get("/api/voices/search", requireUser, async (req, res) => {
    try {
        const query = String(req.query.q || req.query.title || "").trim();
        if (!query) return res.json({ voices: [] });
        if (!FISH_AUDIO_API_KEY) return res.json({ voices: [] });
        const result = await fishFetchJson("/model", { query: { page_size: 20, page_number: 1, title: query, sort_by: "score" } });
        const items = Array.isArray(result.json?.items) ? result.json.items : [];
        res.json({ voices: items.map((item) => ({ id: item._id || item.id || "", label: item.title || item.name || item._id || "Voz", author: item.author?.nickname || item.author?.name || "", description: item.description || "", imageUrl: item.image || item.cover || "" })).filter((x) => x.id) });
    } catch (error) {
        res.json({ voices: [], error: error?.message || "No se pudo buscar en Fish Audio." });
    }
});

app.get("/api/voices/catalog", (req, res) => {
    try {
        const catalogPath = path.join(__dirname, "Public", "data", "voice-catalog.json");
        const base = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
        const requestedOwner = String(req.query?.owner || "").trim();
        const overlayKey = String(req.query?.overlayKey || "").trim();
        let ownerId = req.user?.id || null;
        if (!ownerId && requestedOwner && overlayKey) {
            const owner = database.getUserByOverlayKey(overlayKey);
            if (owner?.id === requestedOwner) ownerId = owner.id;
        }
        if (!ownerId) ownerId = requestedOwner ? null : null;
        const custom = ownerId ? database.listUserVoices(ownerId) : [];
        const voices = Array.isArray(base?.voices) ? base.voices.map((v) => ({
            ...v, library: "streamfusion", fishId: v.fishId || v.id || "",
        })) : [];
        for (const v of custom) {
            const key = `fish:${v.fishId}`;
            const existing = voices.findIndex((x) => String(x.key || "") === key);
            const item = {
                key, id: v.fishId, fishId: v.fishId, label: v.label, author: v.author, description: v.description, image: v.imageUrl, tags: v.tags || [],
                library: "fish", referenceId: v.fishId,
            };
            if (existing >= 0) voices[existing] = item; else voices.push(item);
        }
        res.json({ voices });
    } catch (error) {
        res.status(500).json({ error: error?.message || "No se pudo cargar el catálogo." });
    }
});

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
        asrEndpoint: null,
        voicesEndpoint: "/api/realtime-voice/voices",
        voiceChangerWsUrl: FISH_AUDIO_VOICE_CHANGER_WS,
        browserSinkId: true,
        recognition: "web",
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

app.post("/api/voicebot/asr", async (req, res) => {
    try {
        if (!FISH_AUDIO_API_KEY) {
            return res.status(500).json({ error: "Falta FISH_AUDIO_API_KEY en el servidor." });
        }

        const audioBase64 = String(req.body?.audioBase64 || "").replace(/^data:[^;]+;base64,/, "");
        const mimeType = String(req.body?.mimeType || "audio/webm");
        const language = String(req.body?.language || "es").trim();
        const ignoreTimestamps = req.body?.ignore_timestamps !== false;

        if (!audioBase64) {
            return res.status(400).json({ error: "Falta el audio." });
        }

        const audioBuffer = Buffer.from(audioBase64, "base64");
        const form = new FormData();
        form.append("audio", new Blob([audioBuffer], { type: mimeType }), `chunk.${mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm"}`);
        if (language) form.append("language", language);
        form.append("ignore_timestamps", String(Boolean(ignoreTimestamps)));

        const fishRes = await fetch("https://api.fish.audio/v1/asr", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
            },
            body: form,
        });

        const data = await fishRes.json().catch(() => ({}));
        if (fishRes.status === 402) {
            return res.status(402).json({
                error: data?.error || "Fish Audio devolvió 402 Payment Required para ASR. Revisa créditos, plan o permisos de tu cuenta.",
                details: data,
            });
        }
        return res.status(fishRes.status).json(data);
    } catch (err) {
        return res.status(500).json({ error: err?.message || "No se pudo transcribir el audio." });
    }
});


function normalizeVoiceSpoofText(text) {
    return stripDiacriticsPreservingEnye(text)
        .toLowerCase()
        .replace(/[0]/g, "o")
        .replace(/[1!|]/g, "i")
        .replace(/[2]/g, "z")
        .replace(/[3]/g, "e")
        .replace(/[4@]/g, "a")
        .replace(/[5$]/g, "s")
        .replace(/[6]/g, "g")
        .replace(/[7]/g, "t")
        .replace(/[8]/g, "b")
        .replace(/[9]/g, "g")
        .replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function stripDiacriticsPreservingEnye(value) {
    const raw = String(value || "");
    if (!raw) return "";
    const lower = "__STREAMFUSION_ENYE_LOWER__";
    const upper = "__STREAMFUSION_ENYE_UPPER__";
    return raw
        .replace(/ñ/g, lower)
        .replace(/Ñ/g, upper)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(new RegExp(lower, "g"), "ñ")
        .replace(new RegExp(upper, "g"), "Ñ");
}


function buildProfanityFilterRegex() {
    const badWords = [
        "mierda", "mierdas", "mierdero", "mierderos", "mierdoso", "mierdosa", "mierd", "mrd", "mierda seca",
        "puta", "puta madre", "puto", "putos", "putas", "putísima", "putisima",
        "phuta", "phutha", "putha", "phuto", "phutho", "putho",
        "cabron", "cabrona", "cabrones", "cabronazo", "cabroncete",
        "coño", "cojon", "cojones", "coñazo", "coñito",
        "joder", "jodido", "jodida", "jodón", "jodona", "jodete",
        "chingar", "chingada", "chingado", "chingón", "chingona",
        "pendejo", "pendeja", "pendejazo", "pendejita",
        "mariquita", "marikita", "mariqta", "marica", "mariko", "marico", "maricon", "maricón", "marikon", "marikón", "marik", "maric", "marikhon", "mari khon", "maric hon", "mari con",
        "gay", "gey", "gei", "gai", "ghey", "ghei",
        "cachar", "kachar", "ca char", "ka char", "ca-char", "ka-char", "cchar", "kchar", "ch char", "ch-char",
        "verga", "vergon", "vergón", "vergota", "vergudo", "pinga", "gampi", "ganpi", "culo", "culero", "culera",
        "cagar", "cagada", "cagon", "cagón",
        "imbecil", "imbécil", "idiota", "gilipollas", "hijo de puta", "hijodeputa", "hijoputa",
        "hdp", "hp", "mrd", "pn", "phenhe", "violar", "zhemen", "cmen", "zemen", "semen",
        "maricon", "maricón", "marica", "mariko", "marik", "maricao", "putero", "mamon", "mamón",
        "estupido", "estúpido", "tarado", "subnormal", "mongol", "boludo", "boluda", "pelotudo", "pelotuda",
        "huevon", "huevona", "huevones", "huevonazo", "huevada", "huevadas", "weon", "weona", "weá", "wea", "weón", "wey", "guey", "güey", "webon", "webona", "webón",
        "zorra", "perra", "bitch", "fuck", "shit", "asshole",
        "coji", "cojí", "cojer", "coger", "cogi", "cogí", "cogida", "cogido", "cogeme", "cógeme",
        "teta", "tetas", "vagina", "vaginas", "pene", "penetrar", "penetracion", "penetración", "sexo", "sexual",
        "malparido", "malparida", "malparío", "malparia", "chupamela", "chupamelo", "chupame", "mamamela", "mamamelo", "mamame",
        "conchetumadre", "conchasumadre", "conchesumadre", "conchetumare", "conchatumadre",
        "qlo", "qliao", "ctmre", "csmre", "csmr", "ctmr", "ptm", "ptmr", "pta",
  "pito",
  "pene",
  "nepe",
  "pinga",
  "piho",
  "phito",
  "phinga",
  "culo",
  "culos",
  "culitos",
  "culero",
  "culera",
  "culiao",
  "culiada",
  "culh0",
  "culho",
  "teta",
  "tetas",
  "pezon",
  "pezones",
  "teton",
  "tetona",
  "tetonas",
  "vagina",
  "vaginas",
  "vulva",
  "clitoris",
  "clit",
  "anal",
  "ano",
  "ahno",
  "porno",
  "pornografia",
  "pornográfico",
  "pornografico",
  "pornhub",
  "sexo",
  "sexual",
  "semen",
  "masturbar",
  "masturbacion",
  "masturbación",
  "puta",
  "puto",
  "putos",
  "putas",
  "putísima",
  "putisima",
  "put4",
  "put0",
  "phuta",
  "phutha",
  "putha",
  "phuto",
  "phutho",
  "putho",
  "phu tha",
  "pu tha",
  "phu-tha",
  "pu-tha",
  "verga",
  "vergas",
  "vergon",
  "vergón",
  "vergota",
  "vergudo",
  "vrga",
  "v3rga",
  "verg4",
  "vergha",
  "v3rg4",
  "cabro",
  "cabrona",
  "cabrones",
  "cabron",
  "cabronazo",
  "cabroncete",
  "kbro",
  "ca bro",
  "c a b r o",
  "k bro",
  "marica",
  "marico",
  "maricon",
  "maricón",
  "marikon",
  "marik",
  "maric",
  "marikhon",
  "mariquita",
  "marikita",
  "mariqta",
  "mari khon",
  "mari k",
  "mari-k",
  "mari con",
  "mari c on",
  "maricona",
  "mariconazo",
  "gay",
  "gey",
  "gei",
  "gai",
  "ghey",
  "ghei",
  "g4y",
  "g3y",
  "weon",
  "weona",
  "weón",
  "weá",
  "wea",
  "webon",
  "webona",
  "webón",
  "wueon",
  "wueona",
  "guey",
  "güey",
  "guei",
  "güei",
  "huevon",
  "huevón",
  "huevona",
  "huevones",
  "huevonazo",
  "huevada",
  "huevadas",
  "pendejo",
  "pendeja",
  "pendejos",
  "pendejas",
  "pendejazo",
  "pendejita",
  "pinche",
  "pinchis",
  "pajero",
  "pajera",
  "pajear",
  "pajazo",
  "pelotudo",
  "pelotuda",
  "boludo",
  "boluda",
  "forro",
  "gilipollas",
  "capullo",
  "idiota",
  "imbecil",
  "imbécil",
  "tarado",
  "tarada",
  "baboso",
  "babosa",
  "subnormal",
  "mongol",
  "mierda",
  "mierdas",
  "mierdero",
  "mierderos",
  "mierdoso",
  "mierdosa",
  "mierd",
  "mrd",
  "mierda seca",
  "mierd4",
  "mi3rda",
  "m1erda",
  "m13rda",
  "mierdha",
  "cagar",
  "cagada",
  "cagado",
  "cagon",
  "cagón",
  "cagona",
  "chingar",
  "chingada",
  "chingado",
  "chingon",
  "chingón",
  "chingona",
  "ching4r",
  "chingad0",
  "joder",
  "jodido",
  "jodida",
  "jodón",
  "jodona",
  "jodete",
  "coño",
  "cojon",
  "cojones",
  "coñazo",
  "coñito",
  "cojudo",
  "cojuda",
  "gonorrea",
  "malparido",
  "malparida",
  "malparío",
  "malparia",
  "pirobo",
  "careverga",
  "careculo",
  "carepinga",
  "caremonda",
  "hdp",
  "hp",
  "ctm",
  "ctmr",
  "csm",
  "csmr",
  "ctmre",
  "csmre",
  "tmr",
  "ptm",
  "ptmr",
  "pta",
  "qlo",
  "qliao",
  "hijoputa",
  "hijo de puta",
  "hijodeputa",
  "hijueputa",
  "bitch",
  "fuck",
  "shit",
  "asshole",
  "chucha",
  "chucha madre",
  "chuchamadre",
  "chuchetu mare",
  "chu che tu mare",
  "con che tu mare",
  "conche tu mare",
  "conchetumadre",
  "conchetumare",
  "conchasumadre",
  "conchesumadre",
  "conchetu madre",
  "concha de tu madre",
  "concha tu madre",
  "violar",
  "coger",
  "cojer",
  "cogi",
  "coji",
  "cogido",
  "cogida",
  "cogeme",
  "cógeme",
  "mamon",
  "mamón",
  "mamada",
  "mamame",
,
        'byolar',
        'b.iolar',
        'b yolar',
        'bhyolar',
        'b-yolar',
        'b_yolar',
        'b y o l a r',
        'b.y.o.l.a.r',
        'violar',
        'biolar',
        'v i o l a r',
        'v.i.o.l.a.r',
        'v-yolar',
        'v_yolar',
        'vhyolar',
        'coji',
        'cojí',
        'cojer',
        'cojerse',
        'cojiendo',
        'cojido',
        'cojida',
        'cojan',
        'cojas',
        'cojo',
        'coja',
        'cogi',
        'cogí',
        'coger',
        'cogerse',
        'cogiendo',
        'cogido',
        'cogida',
        'cogeme',
        'cógeme',
        'kche',
        'kches',
        'kchar',
        'kchao',
        'kcharse',
        'kchando',
        'kchado',
        'kchada',
        'cchar',
        'cchao',
        'ccharse',
        'chchar',
              'carajo',
        'carajos',
        'carajito',
        'carajita',
        'carajazo',
        'carajear',
        'chingada madre',
        'chingadamadre',
        'chingadazo',
        'chingadera',
        'chingaderas',
        'chingón',
        'chingona',
        'chingon',
        'chingar',
        'chingue',
        'chingues',
        'chinga',
        'chingas',
        'chingado',
        'chingada',
        'chingados',
        'chingadas',
        'no mames',
        'nomames',
        'mames',
        'mamada',
        'mamadas',
        'mamon',
        'mamón',
        'mamona',
        'mamones',
        'pinche',
        'pinches',
        'pinchi',
        'pinchis',
        'pinche wey',
        'pinchewey',
        'pinche pendejo',
        'pinchependejo',
        'putamadre',
        'puta madre',
        'putazo',
        'putazos',
        'putiza',
        'putizas',
        'putear',
        'puteando',
        'puteo',
        'putero',
        'putera',
        'putón',
        'putona',
        'putones',
        'putonas',
        'putísimo',
        'putisima',
        'putisimo',
        'cabrón',
        'cabrona',
        'cabrones',
        'cabronazo',
        'cabronazos',
        'cabronería',
        'cabroneria',
        'cabronear',
        'cabrón de mierda',
        'cabron de mierda',
        'pendejo',
        'pendeja',
        'pendejos',
        'pendejas',
        'pendejez',
        'pendejada',
        'pendejadas',
        'pendejear',
        'pendejito',
        'pendejita',
        'pendejazo',
        'pendejazos',
        'culero',
        'culera',
        'culeros',
        'culeras',
        'culiado',
        'culiada',
        'culiaos',
        'culiadas',
        'culiao',
        'culiar',
        'culiando',
        'culiadito',
        'culiadita',
        'culo',
        'culos',
        'culote',
        'culotes',
        'culón',
        'culona',
        'verga',
        'vergas',
        'vergazo',
        'vergazos',
        'vergota',
        'vergotas',
        'vergudo',
        'verguero',
        'verguera',
        'vergüenza',
        'vale verga',
        'valeverga',
        'me vale verga',
        'mevaleverga',
        'a la verga',
        'alaverga',
        'pinga',
        'pingazo',
        'pingazos',
        'pingón',
        'pingona',
        'pito',
        'pitos',
        'pichula',
        'pichulazo',
        'pichulear',
        'pija',
        'pijas',
        'pijazo',
        'pijazos',
        'pijudo',
        'pijuda',
        'concha',
        'conchudo',
        'conchuda',
        'conchudos',
        'conchudas',
        'conchatumadre',
        'conchetumadre',
        'conchetumare',
        'conchesumadre',
        'conchasumadre',
        'concha de tu madre',
        'conchadetumadre',
        'chucha',
        'chuchamadre',
        'chucha madre',
        'chuchatumadre',
        'chuchetumadre',
        'chuchetu madre',
        'chucha tu madre',
        'gonorrea',
        'gonorreas',
        'gonorreo',
        'gonorrea hijueputa',
        'pirobo',
        'piroba',
        'pirobo hijueputa',
        'malparido',
        'malparida',
        'malparidos',
        'malparidas',
        'malparición',
        'malparicion',
        'hijueputa',
        'hijueputas',
        'hijueputada',
        'hijoputa',
        'hijos de puta',
        'hijodeputa',
        'hijo de puta',
        'hijuepucha',
        'maricón',
        'maricon',
        'marica',
        'marico',
        'maricas',
        'maricos',
        'maricona',
        'mariconazo',
        'mariconazos',
        'marikón',
        'marikon',
        'mariko',
        'marik',
        'mariquita',
        'marikita',
        'mariqta',
        'boludo',
        'boluda',
        'boludos',
        'boludas',
        'pelotudo',
        'pelotuda',
        'pelotudos',
        'pelotudas',
        'pelotudez',
        'pelotudear',
        'forro',
        'forra',
        'forros',
        'forras',
        'orto',
        'ortudo',
        'ortuda',
        'ortear',
        'la puta que te parió',
        'la puta que te pario',
        'weon',
        'weona',
        'weones',
        'weonas',
        'weón',
        'weónazo',
        'weonazo',
        'webon',
        'webona',
        'webones',
        'webonazo',
        'huevon',
        'huevón',
        'huevona',
        'huevones',
        'huevada',
        'huevadas',
        'huevonazo',
        'huevonazos',
        'huevear',
        'hueveando',
        'hueveo',
        'joder',
        'jodido',
        'jodida',
        'jodidos',
        'jodidas',
        'jodete',
        'jodanse',
        'jódete',
        'no jodas',
        'nojodas',
        'jodón',
        'jodona',
        'jodones',
        'mierda',
        'mierdas',
        'mierdero',
        'mierdera',
        'mierderos',
        'mierderas',
        'mierdoso',
        'mierdosa',
        'mierdón',
        'mierdon',
        'mierdazo',
        'mierdazos',
        'mierdada',
        'mierdadas',
        'mierd4',
        'mi3rda',
        'm1erda',
        'm13rda',
        'mierdha',
        'mrd',
        'mrdas',
        'mrdazo',
        'cagada',
        'cagadas',
        'cagado',
        'cagón',
        'cagona',
        'cagones',
        'cagonas',
        'cagar',
        'cagarse',
        'cagando',
        'cago',
        'cague',
        'cagues',
        'cagón de mierda',
        'cagon de mierda',
        'pajero',
        'pajera',
        'pajeros',
        'pajeras',
        'pajazo',
        'pajazos',
        'pajear',
        'pajeando',
        'pajeo',
        'pajas',
        'pajita',
        'pajitas',
        'idiota',
        'idiotas',
        'imbecil',
        'imbécil',
        'imbeciles',
        'imbéciles',
        'estupido',
        'estúpido',
        'estupida',
        'estúpida',
        'estupidos',
        'estúpidos',
        'tarado',
        'tarada',
        'tarados',
        'taradas',
        'baboso',
        'babosa',
        'babosos',
        'babosas',
                                'bruto',
        'bruta',
        'brutos',
        'brutas',
        'zoquete',
        'zoquetes',
        'majadero',
        'majadera',
        'menso',
        'mensa',
        'mensos',
        'mensas',
        'sonso',
        'sonsa',
        'zorra',
        'zorras',
        'perra',
        'perras',
        'perra maldita',
        'perramaldita',
        'maldita',
        'maldito',
        'malditos',
        'malditas',
        'desgraciado',
        'desgraciada',
        'desgraciados',
        'desgraciadas',
        'bastardo',
        'bastarda',
        'bastardos',
        'bastardas',
        'ctm',
        'ctmr',
        'ctmre',
        'csm',
        'csmr',
        'csmre',
        'tmr',
        'ptm',
        'ptmr',
        'pta',
        'qlo',
        'qliao',
        'qlia',
        'hdp',
        'hp',
        'hpt',
        'hpta',
        'nmm',
        'nmms',
        'ntp'    ];
    const makePattern = (word) => {
        const normalized = normalizeVoiceSpoofText(word).trim().replace(/\s+/g, " ");
        if (!normalized) return "";
        const collapsed = normalized.replace(/\s+/g, "");
        const core = normalized
            .split(" ")
            .filter(Boolean)
            .map((piece) => piece
                .split("")
                .map((ch, index, arr) => {
                    const safe = ch.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&");
                    return index < arr.length - 1
                        ? `${safe}+[\\s._-]*(?:h+[\\s._-]*)?`
                        : `${safe}+`;
                })
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
    let out = stripDiacriticsPreservingEnye(source);
    out = out.replace(VOICE_PROFANITY_RE, " ");
    out = out.replace(/\s+/g, " ").trim();
    return out;
}

const VOICE_EXPRESSION_CATALOG = {
    s: { emotion: "singing", marker: "[singing]" },
    a: { emotion: "angry", marker: "[angry]" },
    w: { emotion: "whispering", marker: "[whispering]" },
    g: { emotion: "laughing", marker: "[laughing]" },
    l: { emotion: "laughing", marker: "[laughing]" },
    e: { emotion: "excited", marker: "[excited]" },
    c: { emotion: "crying", marker: "[crying]" },
    p: { emotion: "pause", marker: "[pause]" },
    b: { emotion: "break", marker: "[break]" },
};

function parseVoiceExpressionPrefix(text, enabled = true) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return { text: "", emotion: "", markers: [], used: false };
    if (!enabled) return { text: raw, emotion: "", markers: [], used: false };

    const tokens = raw.split(" ").filter(Boolean);
    const markers = [];
    const remaining = [];
    let emotion = "";

    const commandSpecForToken = (token) => {
        const tokenText = String(token || "").trim();
        if (!tokenText) return null;
        const trimmed = tokenText.replace(/[.,;:!?]+$/g, "");
        const match = trimmed.match(/^([!/])([sawglecpb])$/i);
        if (match) return VOICE_EXPRESSION_CATALOG[match[2].toLowerCase()] || null;
        return null;
    };

    let consuming = true;
    for (const token of tokens) {
        const spec = consuming ? commandSpecForToken(token) : null;
        if (spec) {
            if (!emotion && spec.emotion) emotion = spec.emotion;
            if (!markers.includes(spec.marker)) markers.push(spec.marker);
            continue;
        }
        consuming = false;
        remaining.push(token);
    }

    const cleanText = remaining.join(" ").replace(/\s+/g, " ").trim();
    return { text: cleanText, emotion, markers, used: markers.length > 0 };
}

function fishEmotionMarker(emotion) {
    const key = String(emotion || "").trim().toLowerCase();
    if (!key) return "";
    return FISH_AUDIO_MODEL && String(FISH_AUDIO_MODEL).toLowerCase().startsWith("s1")
        ? `(${key})`
        : `[${key}]`;
}

function composeFishAudioText(rawText, emotion = "", singSlashCommand = true) {
    let safeText = String(rawText || "").trim();
    if (!safeText) return { text: "", emotion: "" };

    const parsed = parseVoiceExpressionPrefix(safeText, singSlashCommand);
    safeText = parsed.text;
    const effectiveEmotion = String(emotion || parsed.emotion || "").trim();

    if (!safeText) return { text: "", emotion: effectiveEmotion };
    if (effectiveEmotion && !/^\s*[\[\(][^\]\)]+[\]\)]/.test(safeText)) {
        safeText = `${fishEmotionMarker(effectiveEmotion)} ${safeText}`;
    }

    return { text: safeText, emotion: effectiveEmotion };
}

async function fishAudioTtsBuffer({ text, voiceId, customOwnerId = "", noFilter = false }) {
    if (!FISH_AUDIO_API_KEY) throw new Error("Falta FISH_AUDIO_API_KEY en el servidor.");
    const resolvedVoiceId = String(voiceId || "").startsWith("fish:") ? String(voiceId).slice(5) : String(voiceId || "");
    if (!resolvedVoiceId) throw new Error("Falta voiceId.");

    if (String(voiceId || "").startsWith("fish:")) {
        if (!customOwnerId || !database.listUserVoices(customOwnerId).some((voice) => String(voice.fishId) === resolvedVoiceId)) {
            const error = new Error("Esta voz personalizada no pertenece a esta cuenta.");
            error.statusCode = 403;
            throw error;
        }
    }

    let safeText = String(text || "").trim();
    if (!safeText) throw new Error("El texto está vacío.");
    if (!noFilter) safeText = censorVoiceProfanity(safeText);
    if (!safeText) throw new Error("El texto quedó vacío después del filtro.");

    const resolved = composeFishAudioText(safeText, "", true);
    safeText = resolved.text;
    if (!safeText) throw new Error("El texto quedó vacío después de quitar la expresión.");

    const fishRes = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
            "Content-Type": "application/json",
            model: FISH_AUDIO_MODEL,
        },
        body: JSON.stringify({
            text: safeText,
            reference_id: resolvedVoiceId,
            format: "wav",
            latency: "balanced",
            temperature: 0.7,
            top_p: 0.7,
            chunk_length: 160,
            normalize: true,
            sample_rate: 44100,
            max_new_tokens: 1024,
            repetition_penalty: 1.2,
            min_chunk_length: 50,
            condition_on_previous_chunks: true,
            early_stop_threshold: 1,
        }),
    });

    const bytes = Buffer.from(await fishRes.arrayBuffer());
    if (!fishRes.ok) {
        const message = bytes.toString("utf8");
        const error = new Error(message || "Fish Audio devolvió un error.");
        error.statusCode = fishRes.status;
        throw error;
    }
    return bytes;
}

function transcodeAudio(buffer, format) {
    const normalized = String(format || "").toLowerCase();
    const args = normalized === "mp3"
        ? ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-f", "mp3", "pipe:1"]
        : normalized === "ogg"
            ? ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-c:a", "libvorbis", "-q:a", "5", "-f", "ogg", "pipe:1"]
            : null;
    if (!args) return Promise.resolve({ buffer, contentType: "audio/wav" });

    return new Promise((resolve, reject) => {
        const child = spawn("ffmpeg", args);
        const chunks = [];
        const errors = [];
        child.stdout.on("data", (chunk) => chunks.push(chunk));
        child.stderr.on("data", (chunk) => errors.push(chunk));
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
            if (code !== 0) return reject(new Error(Buffer.concat(errors).toString("utf8") || `FFmpeg salió con código ${code}.`));
            resolve({
                buffer: Buffer.concat(chunks),
                contentType: normalized === "mp3" ? "audio/mpeg" : "audio/ogg",
            });
        });
        child.stdin.end(buffer);
    });
}

app.post("/api/user/voice-test", requireUser, async (req, res) => {
    try {
        const text = String(req.body?.text || "").trim();
        const voiceId = String(req.body?.voiceId || "").trim();
        const format = String(req.body?.format || "wav").toLowerCase();
        if (!text) return res.status(400).json({ error: "Escribe un texto para probar la voz." });
        if (!voiceId) return res.status(400).json({ error: "Falta la voz seleccionada." });
        if (!['wav', 'mp3', 'ogg'].includes(format)) return res.status(400).json({ error: "Formato no compatible." });

        const wav = await fishAudioTtsBuffer({ text, voiceId, customOwnerId: req.user.id, noFilter: false });
        const converted = await transcodeAudio(wav, format);
        res.setHeader("Content-Type", converted.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="voice-test.${format}"`);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        return res.send(converted.buffer);
    } catch (err) {
        const status = Number(err?.statusCode || 500);
        return res.status(status).json({ error: err?.message || "No se pudo generar el audio de prueba." });
    }
});

app.post("/api/voicebot/tts", async (req, res) => {
    try {
        if (!FISH_AUDIO_API_KEY) {
            return res.status(500).json({ error: "Falta FISH_AUDIO_API_KEY en el servidor." });
        }

        const text = String(req.body?.text || "").trim();
        const voiceId = String(req.body?.voiceId || "").trim();
        const ownerId = String(req.body?.ownerId || "").trim();
        const overlayKey = String(req.body?.overlayKey || "").trim();
        const customOwner = ownerId && overlayKey && database.getUserByOverlayKey(overlayKey)?.id === ownerId ? ownerId : "";
        const customVoiceId = voiceId.startsWith("fish:") ? voiceId.slice(5) : "";
        if (customVoiceId && !customOwner) return res.status(403).json({ error: "La voz personalizada no pertenece a esta sesión." });
        if (customVoiceId && !database.listUserVoices(customOwner).some((voice) => String(voice.fishId) === customVoiceId)) {
            return res.status(404).json({ error: "Esta voz personalizada ya no existe en la biblioteca de esta cuenta." });
        }
        const resolvedVoiceId = customVoiceId || voiceId;
        const noFilter = Boolean(req.body?.noFilter || String(req.body?.source || "").toLowerCase() === "realtime-voice");
        const profanityFilter = Boolean(req.body?.profanityFilter) && !noFilter;
        const emotion = String(req.body?.emotion || "").trim();
        const singSlashCommand = req.body?.singSlashCommand !== false;

        if (!text) return res.status(400).json({ error: "El texto está vacío." });
        if (!resolvedVoiceId) return res.status(400).json({ error: "Falta voiceId." });

        let safeText = profanityFilter ? censorVoiceProfanity(text) : text;
        if (!safeText) return res.status(400).json({ error: "El texto quedó vacío después del filtro." });

        const resolved = composeFishAudioText(safeText, emotion, singSlashCommand);
        safeText = resolved.text;
        const effectiveEmotion = resolved.emotion;
        if (!safeText) return res.status(400).json({ error: "El texto quedó vacío después de quitar la expresión." });

        const payload = {
            text: safeText,
            reference_id: resolvedVoiceId,
            format: "wav",
            latency: "balanced",
            temperature: 0.7,
            top_p: 0.7,
            chunk_length: 160,
            normalize: true,
            sample_rate: 44100,
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

io.use((socket, next) => {
    const token = String(socket.handshake.auth?.token || "").trim();
    const overlayKey = String(socket.handshake.auth?.overlayKey || "").trim();
    const widget = String(socket.handshake.auth?.widget || "").trim().toLowerCase();
    socket.user = database.getSession(token);
    socket.isOverlay = false;
    socket.isVoiceList = false;
    if (!socket.user && overlayKey) {
        socket.user = database.getUserByOverlayKey(overlayKey);
        socket.isOverlay = Boolean(socket.user);
        socket.isVoiceList = socket.isOverlay && widget === "voicelist";
    }
    next();
});

function scopedEventEmitter(userId) {
    const room = `user:${userId}`;
    return { emit: (event, payload) => io.to(room).emit(event, payload) };
}

io.on("connection", (socket) => {
    console.log("Cliente conectado");

    if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        setCustomVoiceRules(socket.user.id, database.listUserVoices(socket.user.id));
        if (socket.isVoiceList) addVoiceListPresence(socket.user.id);
    }

    socket.emit("system", {
        message: "Conectado a StreamFusion.",
    });

    const initialSettings = socket.user
        ? deepMerge(structuredClone(DEFAULT_SETTINGS), database.getUserSettings(socket.user.id))
        : getMergedSettings();
    socket.emit("settings", initialSettings);
    socket.emit("voiceListSettings", initialSettings.voiceList || DEFAULT_SETTINGS.voiceList);
    if (socket.user && !socket.isVoiceList) socket.emit("voiceListPresence", voiceListPresencePayload(socket.user.id));
    socket.emit("roulette:sync", roulette.getPublicSnapshot());
    for (const platform of ["tiktok", "twitch"]) {
        const owner = connectionOwners[platform];
        const visible = socket.user && owner === socket.user.id
            ? accountState[platform]
            : { username: "", connected: false, live: false, mode: "saved" };
        socket.emit("accountState", { ...visible, platform });
    }
    const history = liveHistorySnapshot();
    socket.emit("liveHistory", history);

    socket.on("connectTikTok", async (username) => {
        const cleanName = String(username || "").replace(/^@+/, "").trim();
        try {
            if (!socket.user) throw new Error("Sesión requerida para conectar TikTok.");
            if (connectionOwners.tiktok && connectionOwners.tiktok !== socket.user.id) throw new Error("TikTok ya está conectado desde otra cuenta de StreamFusion.");
            liveSession.begin(socket.user.id, "tiktok");
            await tiktok.connect(cleanName, scopedEventEmitter(socket.user.id), socket.user.id);
            connectionOwners.tiktok = socket.user.id;
            const avatarUrl = await resolveTiktokAvatar(cleanName).catch(() => "");
            emitAccountState("tiktok", {
                username: cleanName,
                avatarUrl,
                connected: true,
                live: false,
                mode: "waiting",
            }, socket.user?.id || "");
            socket.emit("system", {
                message: `TikTok conectado con @${cleanName}.`,
            });
        } catch (err) {
            globalThis.__STREAMFUSION_LIVE_END_HOOK__?.(socket.user?.id || connectionOwners.tiktok, "tiktok");
            emitAccountState("tiktok", {
                username: cleanName,
                connected: false,
                live: false,
                mode: "saved",
            }, socket.user?.id || "");
            socket.emit("system", {
                message: err?.message || "Error al conectar TikTok.",
            });
        }
    });

    socket.on("connectTwitch", async (channel) => {
        const cleanChannel = String(channel || "").replace(/^#+/, "").trim();
        try {
            if (!socket.user) throw new Error("Sesión requerida para conectar Twitch.");
            if (connectionOwners.twitch && connectionOwners.twitch !== socket.user.id) throw new Error("Twitch ya está conectado desde otra cuenta de StreamFusion.");
            await twitch.connect(cleanChannel, scopedEventEmitter(socket.user.id), socket.user.id);
            connectionOwners.twitch = socket.user.id;
            const avatarUrl = await resolveTwitchAvatar(cleanChannel).catch(() => "");
            emitAccountState("twitch", {
                username: cleanChannel,
                avatarUrl,
                connected: true,
                live: false,
                mode: "waiting",
            }, socket.user?.id || "");
            socket.emit("system", {
                message: `Twitch conectado a ${cleanChannel}.`,
            });
        } catch (err) {
            emitAccountState("twitch", {
                username: cleanChannel,
                connected: false,
                live: false,
                mode: "saved",
            }, socket.user?.id || "");
            socket.emit("system", {
                message: err?.message || "Error al conectar Twitch.",
            });
        }
    });

    socket.on("disconnectTikTok", async () => {
        try {
            if (connectionOwners.tiktok && connectionOwners.tiktok !== socket.user?.id) throw new Error("Esta conexión pertenece a otra cuenta de StreamFusion.");
            await tiktok.disconnect();
            globalThis.__STREAMFUSION_LIVE_END_HOOK__?.(socket.user?.id || connectionOwners.tiktok, "tiktok");
            connectionOwners.tiktok = "";
            emitAccountState("tiktok", {
                connected: false,
                live: false,
                mode: "saved",
                avatarUrl: "",
            }, socket.user?.id || "");
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
            if (connectionOwners.twitch && connectionOwners.twitch !== socket.user?.id) throw new Error("Esta conexión pertenece a otra cuenta de StreamFusion.");
            await twitch.disconnect();
            connectionOwners.twitch = "";
            emitAccountState("twitch", {
                connected: false,
                live: false,
                mode: "saved",
                avatarUrl: "",
            }, socket.user?.id || "");
            socket.emit("system", {
                message: "Twitch desconectado.",
            });
        } catch (err) {
            socket.emit("system", {
                message: err?.message || "No se pudo desconectar Twitch.",
            });
        }
    });

    socket.on("roulette:getState", () => {
        if (socket.user?.id) roulette.setOwnerId(socket.user.id);
        socket.emit("roulette:sync", roulette.getPublicSnapshot());
    });

    socket.on("roulette:update", (patch) => {
        if (socket.user?.id) roulette.setOwnerId(socket.user.id);
        roulette.updateConfig(patch || {});
        socket.emit("roulette:sync", roulette.getPublicSnapshot());
    });

    socket.on("roulette:start", () => {
        if (socket.user?.id) roulette.setOwnerId(socket.user.id);
        const result = roulette.startSpin();
        if (!result?.ok) {
            socket.emit("roulette:error", { message: result?.reason === "empty" ? "No hay participantes para iniciar la ruleta." : "No se pudo iniciar la ruleta." });
        }
    });

    socket.on("roulette:stop", () => {
        if (socket.user?.id) roulette.setOwnerId(socket.user.id);
        roulette.stopSpin();
        socket.emit("roulette:sync", roulette.getPublicSnapshot());
    });

    socket.on("roulette:reset", () => {
        if (socket.user?.id) roulette.setOwnerId(socket.user.id);
        roulette.reset();
        socket.emit("roulette:sync", roulette.getPublicSnapshot());
    });

    socket.on("roulette:clearParticipants", () => {
        if (socket.user?.id) roulette.setOwnerId(socket.user.id);
        roulette.clearParticipants();
        socket.emit("roulette:sync", roulette.getPublicSnapshot());
    });

    socket.on("voiceFixedUsers:upsert", (assignment) => {
        const saved = upsertVoiceFixedUser(assignment || {}, socket.user?.id || "");
        if (saved) {
            socket.emit("system", {
                message: `Voz sincronizada para @${saved.username}.`,
            });
        }
    });

    socket.on("voiceFixedUsers:delete", (entry) => {
        const removed = deleteVoiceFixedUser(entry || {}, socket.user?.id || "");
        if (removed) {
            socket.emit("system", {
                message: "Voz sincronizada eliminada.",
            });
        }
    });

    socket.on("saveSettings", (settings) => {
        if (socket.user) {
            const current = database.getUserSettings(socket.user.id);
            const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), deepMerge(current, settings || {}));
            database.saveUserSettings(socket.user.id, merged);
            io.to(`user:${socket.user.id}`).emit("settings", merged);
            io.to(`user:${socket.user.id}`).emit("voiceListSettings", merged.voiceList || DEFAULT_SETTINGS.voiceList);
            return;
        }
        const current = database.getSettings() || {};
        const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), deepMerge(current, settings || {}));
        database.saveSettings(merged);
        io.emit("settings", merged);
        io.emit("voiceListSettings", merged.voiceList || DEFAULT_SETTINGS.voiceList);
        socket.emit("system", {
            message: "Configuración guardada.",
        });
    });

    socket.on("loadSettings", () => {
        socket.emit("settings", socket.user
            ? deepMerge(structuredClone(DEFAULT_SETTINGS), database.getUserSettings(socket.user.id))
            : getMergedSettings());
    });

    socket.on("disconnect", () => {
        if (socket.isVoiceList && socket.user?.id) removeVoiceListPresence(socket.user.id);
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
