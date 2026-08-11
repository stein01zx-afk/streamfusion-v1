import "dotenv/config";

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import crypto from "node:crypto";
import * as auth from "./services/auth.js";

import * as database from "./services/database.js";
import * as tiktok from "./services/tiktok.js";
import * as twitch from "./services/twitch.js";
import { createRouletteInstance } from "./services/roulette.js";

const rouletteByUser = new Map();
function getRoulette(userId = null) {
    const key = String(userId || "global");
    if (!rouletteByUser.has(key)) {
        const instance = createRouletteInstance(key);
        instance.setBroadcaster((event, payload) => {
            if (key === "global") io.emit(event, payload);
            else io.to(`user:${key}`).emit(event, payload);
        });
        instance.setVoiceAssignmentSync((payload) => {
            if (!payload || payload.action !== "upsert" || !payload.assignment) return;
            upsertVoiceFixedUser(payload.assignment, key === "global" ? null : Number(key));
        });
        rouletteByUser.set(key, instance);
    }
    return rouletteByUser.get(key);
}

globalThis.__STREAMFUSION_ROULETTE_HOOK__ = {
    ingestChat: (payload, userId) => getRoulette(userId).ingestChat(payload),
    ingestEvent: (payload, userId) => getRoulette(userId).ingestEvent(payload),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "";
const FISH_AUDIO_MODEL = process.env.FISH_AUDIO_MODEL || "s2.1-pro-free";
const FISH_AUDIO_VOICE_CHANGER_WS = process.env.FISH_AUDIO_VOICE_CHANGER_WS || "";

const accountStates = new Map();
function getAccountState(userId, platform) {
    const key = String(platform || "").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const owner = String(userId || "global");
    if (!accountStates.has(owner)) accountStates.set(owner, {
        tiktok: { username: "", connected: false, live: false, mode: "saved" },
        twitch: { username: "", connected: false, live: false, mode: "saved" },
    });
    return accountStates.get(owner)[key];
}
function emitAccountState(platform, overrides = {}, userId = null) {
    const key = String(platform || "").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const owner = String(userId || "global");
    const state = { ...getAccountState(owner, key), ...overrides, platform: key };
    accountStates.get(owner)[key] = state;
    if (userId) io.to(`user:${userId}`).emit("accountState", state);
    else io.emit("accountState", state);
    return state;
}

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
    voiceFixedUsers: [],
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

function getMergedSettings(userId = null) {
    const saved = userId ? database.getUserSettings(userId) : database.getSettings();
    if (!saved) return structuredClone(DEFAULT_SETTINGS);
    return deepMerge(structuredClone(DEFAULT_SETTINGS), saved);
}

function saveSettingsForUser(userId, settings) {
    if (userId) database.saveUserSettings(userId, settings);
    else database.saveSettings(settings);
}

function parseCookies(req) {
    const header = String(req.headers.cookie || '');
    const out = {};
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    return out;
}

function getRequestUser(req) { return auth.getUserFromSession(parseCookies(req).sf_session); }
function requireAuth(req, res, next) { const user = getRequestUser(req); if (!user) return res.status(401).json({ error: 'Necesitas iniciar sesión.' }); req.user = user; next(); }
function setSessionCookie(res, token) { res.setHeader('Set-Cookie', `sf_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie', 'sf_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'); }

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || '';
const TIKTOK_SCOPES = process.env.TIKTOK_SCOPES || 'user.info.basic';

async function tiktokTokenExchange(code) {
    const body = new URLSearchParams({ client_key: TIKTOK_CLIENT_KEY, client_secret: TIKTOK_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: TIKTOK_REDIRECT_URI });
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) throw new Error(data?.error_description || data?.description || 'TikTok rechazó la autorización.');
    return data;
}

async function tiktokGetUserInfo(accessToken) {
    const url = new URL('https://open.tiktokapis.com/v2/user/info/');
    url.searchParams.set('fields', 'open_id,union_id,avatar_url,avatar_large_url,display_name,username');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data?.error && data.error.code && data.error.code !== 'ok')) throw new Error(data?.error?.message || 'No se pudo obtener el perfil de TikTok.');
    return data?.data?.user || data?.user || null;
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

function readVoiceFixedUsers(userId = null) {
    const settings = userId ? (database.getUserSettings(userId) || {}) : (database.getSettings() || {});
    const list = Array.isArray(settings.voiceFixedUsers) ? settings.voiceFixedUsers : [];
    return list.map((entry) => normalizeVoiceFixedUserEntry(entry)).filter(Boolean);
}

function writeVoiceFixedUsers(list = [], userId = null) {
    const current = userId ? (database.getUserSettings(userId) || {}) : (database.getSettings() || {});
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), current);
    merged.voiceFixedUsers = list.map((entry) => normalizeVoiceFixedUserEntry(entry)).filter(Boolean);
    saveSettingsForUser(userId || null, merged);
    if (userId) io.to(`user:${userId}`).emit("settings", merged); else io.emit("settings", merged);
    return merged.voiceFixedUsers;
}

function upsertVoiceFixedUser(entry = {}, userId = null) {
    const normalized = normalizeVoiceFixedUserEntry(entry);
    if (!normalized) return null;
    const list = readVoiceFixedUsers(userId);
    const key = voiceFixedUserKey(normalized);
    const idx = list.findIndex((item) => voiceFixedUserKey(item) === key);
    const now = Date.now();
    const next = { ...normalized, createdAt: idx >= 0 ? Number(list[idx]?.createdAt || now) : now, updatedAt: now };
    if (idx >= 0) list[idx] = { ...list[idx], ...next }; else list.unshift(next);
    writeVoiceFixedUsers(list, userId);
    return next;
}

function deleteVoiceFixedUser(entry = {}, userId = null) {
    const key = voiceFixedUserKey(entry);
    if (!key) return false;
    const list = readVoiceFixedUsers(userId);
    const next = list.filter((item) => voiceFixedUserKey(item) !== key);
    if (next.length === list.length) return false;
    writeVoiceFixedUsers(next, userId);
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
app.use(express.json({ limit: "2mb" }));

app.get('/api/auth/me', (req, res) => { const user = getRequestUser(req); res.json({ authenticated: Boolean(user), user: auth.sanitizeUser(user) }); });

app.post('/api/auth/register', (req, res) => {
    try {
        const username = String(req.body?.username || '').trim().toLowerCase();
        const email = String(req.body?.email || '').trim().toLowerCase();
        const displayName = String(req.body?.displayName || username).trim().slice(0, 80) || username;
        const password = String(req.body?.password || '');
        if (!/^[a-z0-9._-]{3,32}$/.test(username)) return res.status(400).json({ error: 'Usuario inválido.' });
        if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Correo inválido.' });
        if (database.getUserByUsername(username)) return res.status(409).json({ error: 'Ese usuario ya existe.' });
        if (database.getUserByEmail(email)) return res.status(409).json({ error: 'Ese correo ya está registrado.' });
        const { hash, salt } = auth.createPasswordHash(password);
        const user = database.createUser({ username, email, passwordHash: hash, passwordSalt: salt, displayName, authProvider: 'password' });
        setSessionCookie(res, auth.createSession(user.id));
        res.json({ ok: true, user: auth.sanitizeUser(user) });
    } catch (err) { res.status(400).json({ error: err?.message || 'No se pudo crear la cuenta.' }); }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const login = String(req.body?.login || '').trim();
        const password = String(req.body?.password || '');
        const user = login.includes('@') ? database.getUserByEmail(login.toLowerCase()) : database.getUserByUsername(login.toLowerCase());
        if (!user || !user.password_hash || !auth.verifyPassword(password, user.password_hash, user.password_salt)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        setSessionCookie(res, auth.createSession(user.id));
        res.json({ ok: true, user: auth.sanitizeUser(user) });
    } catch (err) { res.status(400).json({ error: err?.message || 'No se pudo iniciar sesión.' }); }
});

app.post('/api/auth/logout', (req, res) => { auth.destroySession(parseCookies(req).sf_session); clearSessionCookie(res); res.json({ ok: true }); });

app.get('/auth/tiktok/start', (req, res) => {
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) return res.status(503).send('TikTok OAuth no está configurado. Completa TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET y TIKTOK_REDIRECT_URI en .env.');
    const returnTo = String(req.query.returnTo || '/').startsWith('/') ? String(req.query.returnTo) : '/';
    const existing = getRequestUser(req);
    const state = auth.createOAuthState({ returnTo, linkExistingUserId: existing?.id || null });
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.set('client_key', TIKTOK_CLIENT_KEY); url.searchParams.set('scope', TIKTOK_SCOPES); url.searchParams.set('response_type', 'code'); url.searchParams.set('redirect_uri', TIKTOK_REDIRECT_URI); url.searchParams.set('state', state);
    res.redirect(url.toString());
});

app.get('/auth/tiktok/callback', async (req, res) => {
    try {
        const payload = auth.consumeOAuthState(String(req.query.state || ''));
        if (!payload) return res.status(400).send('Estado OAuth inválido o expirado.');
        if (req.query.error) return res.redirect('/?auth_error=' + encodeURIComponent(String(req.query.error_description || req.query.error)));
        const token = await tiktokTokenExchange(String(req.query.code || ''));
        const profile = await tiktokGetUserInfo(token.access_token);
        if (!profile?.open_id) throw new Error('TikTok no devolvió open_id.');
        const avatar = profile.avatar_large_url || profile.avatar_url || '';
        const displayName = profile.display_name || `TikTok ${profile.open_id.slice(0, 6)}`;
        const tiktokUsername = profile.username || "";
        let user = payload.linkExistingUserId ? database.getUserById(payload.linkExistingUserId) : database.getUserByTikTokId(profile.open_id);
        if (!user) {
            const base = displayName.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'streamer';
            let username = base, n = 1; while (database.getUserByUsername(username)) username = `${base}${++n}`;
            user = database.createUser({ username, displayName, avatar, authProvider: 'tiktok', tiktokProviderId: profile.open_id, tiktokUsername: tiktokUsername || displayName, tiktokAccessToken: token.access_token, tiktokRefreshToken: token.refresh_token || null, tiktokExpiresAt: Date.now() + Number(token.expires_in || 86400) * 1000 });
        } else {
            user = database.updateUser(user.id, { avatar, display_name: displayName, tiktok_provider_id: profile.open_id, tiktok_username: tiktokUsername || displayName, tiktok_access_token: token.access_token, tiktok_refresh_token: token.refresh_token || null, tiktok_expires_at: Date.now() + Number(token.expires_in || 86400) * 1000 });
        }
        const settings = getMergedSettings(user.id);
        settings.connections = settings.connections || {};
        settings.connections.tiktok = { ...(settings.connections.tiktok || {}), username: tiktokUsername || displayName, connected: Boolean(settings.connections.tiktok?.connected), linkedAt: Date.now() };
        saveSettingsForUser(user.id, settings);
        setSessionCookie(res, auth.createSession(user.id));
        const returnTo = String(payload.returnTo || '/').startsWith('/') ? String(payload.returnTo) : '/';
        res.redirect(returnTo + (returnTo.includes('?') ? '&' : '?') + 'tiktok_connected=1');
    } catch (err) { res.redirect('/?auth_error=' + encodeURIComponent(err?.message || 'TikTok OAuth falló')); }
});

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

app.get("/api/voice-list/settings", (req, res) => {
    const settings = getMergedSettings(getRequestUser(req)?.id || null);
    res.json({ voiceList: settings.voiceList || DEFAULT_SETTINGS.voiceList });
});

app.put("/api/voice-list/settings", (req, res) => {
    const user = getRequestUser(req);
    const current = getMergedSettings(user?.id || null);
    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), deepMerge(current, { voiceList: incoming }));
    saveSettingsForUser(user?.id || null, merged);
    if (user?.id) { io.to(`user:${user.id}`).emit("settings", merged); io.to(`user:${user.id}`).emit("voiceListSettings", merged.voiceList || DEFAULT_SETTINGS.voiceList); } else { io.emit("settings", merged); io.emit("voiceListSettings", merged.voiceList || DEFAULT_SETTINGS.voiceList); }
    res.json({ ok: true, voiceList: merged.voiceList || DEFAULT_SETTINGS.voiceList });
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

app.post("/api/voicebot/tts", async (req, res) => {
    try {
        if (!FISH_AUDIO_API_KEY) {
            return res.status(500).json({ error: "Falta FISH_AUDIO_API_KEY en el servidor." });
        }

        const text = String(req.body?.text || "").trim();
        const voiceId = String(req.body?.voiceId || "").trim();
        const noFilter = Boolean(req.body?.noFilter || String(req.body?.source || "").toLowerCase() === "realtime-voice");
        const profanityFilter = Boolean(req.body?.profanityFilter) && !noFilter;
        const emotion = String(req.body?.emotion || "").trim();
        const singSlashCommand = req.body?.singSlashCommand !== false;

        if (!text) return res.status(400).json({ error: "El texto está vacío." });
        if (!voiceId) return res.status(400).json({ error: "Falta voiceId." });

        let safeText = profanityFilter ? censorVoiceProfanity(text) : text;
        if (!safeText) return res.status(400).json({ error: "El texto quedó vacío después del filtro." });

        const resolved = composeFishAudioText(safeText, emotion, singSlashCommand);
        safeText = resolved.text;
        const effectiveEmotion = resolved.emotion;
        if (!safeText) return res.status(400).json({ error: "El texto quedó vacío después de quitar la expresión." });

        const payload = {
            text: safeText,
            reference_id: voiceId,
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

app.post('/api/overlays/share', requireAuth, (req, res) => {
    const view = ['chat','events','gifts','roulette'].includes(String(req.body?.view)) ? String(req.body.view) : 'chat';
    const id = `user-${req.user.id}-${crypto.randomBytes(8).toString('hex')}`;
    const token = crypto.randomBytes(24).toString('hex');
    const name = String(req.body?.name || `Overlay ${view}`).trim().slice(0, 80) || `Overlay ${view}`;
    database.createOverlay(id, name, { ownerUserId: req.user.id, view, config: getMergedSettings(req.user.id) });
    database.setOverlayOwner(id, req.user.id, token);
    res.json({ ok: true, id, token, url: `/overlay.html?view=${encodeURIComponent(view)}&token=${encodeURIComponent(token)}` });
});

app.get('/api/overlays/public/:token', (req, res) => {
    const overlay = database.getOverlayByPublicToken(req.params.token);
    if (!overlay) return res.status(404).json({ error: 'Overlay no encontrado.' });
    res.set('Cache-Control', 'no-store');
    const ownerSettings = overlay.owner_user_id ? getMergedSettings(overlay.owner_user_id) : null;
    const storedConfig = overlay.config && typeof overlay.config === 'object' ? overlay.config : {};
    const currentConfig = ownerSettings
        ? { ...ownerSettings, view: storedConfig.view || ownerSettings.view || 'chat' }
        : storedConfig;
    res.json({ ok: true, overlay: { id: overlay.id, name: overlay.name, config: currentConfig } });
});

app.get("/api/status", (req, res) => {
    res.json({
        online: true,
        app: "StreamFusion",
        version: "3.1.0",
    });
});

io.use((socket, next) => {
    const cookies = parseCookies({ headers: socket.handshake.headers });
    socket.user = auth.getUserFromSession(cookies.sf_session);
    socket.overlay = null;
    const overlayToken = String(socket.handshake.auth?.overlayToken || "").trim();
    if (overlayToken) {
        const overlay = database.getOverlayByPublicToken(overlayToken);
        if (!overlay) return next(new Error("Overlay no encontrado."));
        socket.overlay = overlay;
    }
    next();
});

io.on("connection", (socket) => {
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);
    if (socket.overlay?.owner_user_id) socket.join(`user:${socket.overlay.owner_user_id}`);
    const ownerId = socket.user?.id || socket.overlay?.owner_user_id || null;
    console.log("Cliente conectado", ownerId || "anon", socket.overlay ? "overlay" : "app");
    socket.emit("system", { message: socket.overlay ? "Overlay conectado." : "Conectado a StreamFusion." });
    const initialSettings = getMergedSettings(ownerId);
    socket.emit("settings", initialSettings);
    socket.emit("voiceListSettings", initialSettings.voiceList || DEFAULT_SETTINGS.voiceList);
    socket.emit("roulette:sync", getRoulette(ownerId).getPublicSnapshot());
    const savedOwnerSettings = getMergedSettings(ownerId);
    const savedTikTokName = savedOwnerSettings.connections?.tiktok?.username || "";
    const savedTwitchName = savedOwnerSettings.connections?.twitch?.username || "";
    socket.emit("accountState", { ...getAccountState(ownerId, "tiktok"), username: savedTikTokName || getAccountState(ownerId, "tiktok").username, platform: "tiktok" });
    socket.emit("accountState", { ...getAccountState(ownerId, "twitch"), username: savedTwitchName || getAccountState(ownerId, "twitch").username, platform: "twitch" });

    socket.on("connectTikTok", async (username) => {
        if (!socket.user?.id) return socket.emit("system", { message: "Inicia sesión para conectar TikTok." });
        const cleanName = String(username || "").replace(/^@+/, "").trim();
        try {
            const account = database.getUserById(socket.user.id);
            const linkedName = String(account?.tiktok_username || "").replace(/^@+/, "").trim();
            const current = getAccountState(socket.user.id, "tiktok");
            if (linkedName && current.connected && cleanName.toLowerCase() !== linkedName.toLowerCase()) {
                throw new Error("Tu TikTok actual está bloqueado mientras el LIVE está conectado. Desconecta el LIVE para cambiarlo.");
            }
            await tiktok.connect(cleanName || linkedName, io, socket.user.id);
            if (socket.user?.id) { const current = getMergedSettings(socket.user.id); current.connections = current.connections || {}; current.connections.tiktok = { username: cleanName, connected: true, updatedAt: Date.now() }; saveSettingsForUser(socket.user.id, current); }
            emitAccountState("tiktok", {
                username: cleanName,
                connected: true,
                live: false,
                mode: "waiting",
            }, socket.user?.id);
            socket.emit("system", {
                message: `TikTok conectado con @${cleanName}.`,
            });
        } catch (err) {
            emitAccountState("tiktok", {
                username: cleanName,
                connected: false,
                live: false,
                mode: "saved",
            }, socket.user?.id);
            socket.emit("system", {
                message: err?.message || "Error al conectar TikTok.",
            });
        }
    });

    socket.on("connectTwitch", async (channel) => {
        if (!socket.user?.id) return socket.emit("system", { message: "Inicia sesión para conectar Twitch." });
        const cleanChannel = String(channel || "").replace(/^#+/, "").trim();
        try {
            await twitch.connect(cleanChannel, io, socket.user.id);
            if (socket.user?.id) { const current = getMergedSettings(socket.user.id); current.connections = current.connections || {}; current.connections.twitch = { username: cleanChannel, connected: true, updatedAt: Date.now() }; saveSettingsForUser(socket.user.id, current); }
            emitAccountState("twitch", {
                username: cleanChannel,
                connected: true,
                live: false,
                mode: "waiting",
            }, socket.user?.id);
            socket.emit("system", {
                message: `Twitch conectado a ${cleanChannel}.`,
            });
        } catch (err) {
            emitAccountState("twitch", {
                username: cleanChannel,
                connected: false,
                live: false,
                mode: "saved",
            }, socket.user?.id);
            socket.emit("system", {
                message: err?.message || "Error al conectar Twitch.",
            });
        }
    });

    socket.on("disconnectTikTok", async () => {
        if (!socket.user?.id) return;
        try {
            await tiktok.disconnect(socket.user.id);
            if (socket.user?.id) { const current = getMergedSettings(socket.user.id); current.connections = current.connections || {}; current.connections.tiktok = { ...(current.connections.tiktok || {}), connected: false, disconnectedAt: Date.now() }; saveSettingsForUser(socket.user.id, current); }
            emitAccountState("tiktok", {
                connected: false,
                live: false,
                mode: "saved",
            }, socket.user?.id);
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
        if (!socket.user?.id) return;
        try {
            await twitch.disconnect(socket.user.id);
            if (socket.user?.id) { const current = getMergedSettings(socket.user.id); current.connections = current.connections || {}; current.connections.twitch = { ...(current.connections.twitch || {}), connected: false, disconnectedAt: Date.now() }; saveSettingsForUser(socket.user.id, current); }
            emitAccountState("twitch", {
                connected: false,
                live: false,
                mode: "saved",
            }, socket.user?.id);
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
        socket.emit("roulette:sync", getRoulette(socket.user?.id || null).getPublicSnapshot());
    });

    socket.on("roulette:update", (patch) => {
        const r = getRoulette(socket.user?.id || null);
        r.updateConfig(patch || {});
        socket.emit("roulette:sync", r.getPublicSnapshot());
    });

    socket.on("roulette:start", () => {
        const result = getRoulette(socket.user?.id || null).startSpin();
        if (!result?.ok) socket.emit("roulette:error", { message: result?.reason === "empty" ? "No hay participantes para iniciar la ruleta." : "No se pudo iniciar la ruleta." });
    });

    socket.on("roulette:stop", () => {
        const r = getRoulette(socket.user?.id || null);
        r.stopSpin();
        socket.emit("roulette:sync", r.getPublicSnapshot());
    });

    socket.on("roulette:reset", () => {
        const r = getRoulette(socket.user?.id || null);
        r.reset();
        socket.emit("roulette:sync", r.getPublicSnapshot());
    });

    socket.on("roulette:clearParticipants", () => {
        const r = getRoulette(socket.user?.id || null);
        r.clearParticipants();
        socket.emit("roulette:sync", r.getPublicSnapshot());
    });

    socket.on("voiceFixedUsers:upsert", (assignment) => {
        const saved = upsertVoiceFixedUser(assignment || {}, socket.user?.id || null);
        if (saved) {
            socket.emit("system", {
                message: `Voz sincronizada para @${saved.username}.`,
            });
        }
    });

    socket.on("voiceFixedUsers:delete", (entry) => {
        const removed = deleteVoiceFixedUser(entry || {}, socket.user?.id || null);
        if (removed) {
            socket.emit("system", {
                message: "Voz sincronizada eliminada.",
            });
        }
    });

    socket.on("saveSettings", (settings) => {
        if (!socket.user?.id) return socket.emit("system", { message: "Inicia sesión para guardar configuración." });
        const current = getMergedSettings(socket.user?.id || null);
        const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), deepMerge(current, settings || {}));
        saveSettingsForUser(socket.user?.id || null, merged);
        if (socket.user?.id) io.to(`user:${socket.user.id}`).emit("settings", merged); else io.emit("settings", merged);
        io.to(`user:${socket.user.id}`).emit("voiceListSettings", merged.voiceList || DEFAULT_SETTINGS.voiceList);
        socket.emit("system", {
            message: "Configuración guardada.",
        });
    });

    socket.on("loadSettings", () => {
        socket.emit("settings", getMergedSettings(socket.user?.id || null));
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
