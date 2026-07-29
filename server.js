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

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const DEFAULT_SETTINGS = {
  appearance: {
    theme: "twitch-dark",
    font: "inter",
    animation: "slide-up",
    avatarFrame: true,
    showAvatars: true,
    showBadges: true,
    showTwitchBadges: true,
    showTwitchEmotes: true,
    showTikTokBadges: true,
    showAtHandle: false,
    tiktokUsernameColor: "white",
    messageTtl: 0,
  },
  layout: {
    chat: true,
    events: true,
    gifts: true,
    order: "events-gifts",
  },
  overlay: {
    defaultView: "chat",
  },
};

function deepMerge(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const result = { ...base };
  for (const key of Object.keys(incoming)) {
    result[key] = key in base ? deepMerge(base[key], incoming[key]) : incoming[key];
  }
  return result;
}

function getMergedSettings() {
  const saved = database.getSettings();
  if (!saved) return structuredClone(DEFAULT_SETTINGS);
  return deepMerge(structuredClone(DEFAULT_SETTINGS), saved);
}

const AVATAR_FALLBACK = (seed) => `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(seed || "StreamFusion")}`;

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

async function fetchJson(url, timeoutMs = 7000) {
  const text = await fetchText(url, timeoutMs);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
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

async function resolveTiktokProfile(username) {
  const clean = cleanUser(username);
  if (!clean) return null;
  const html = await fetchText(`https://www.tiktok.com/@${encodeURIComponent(clean)}`);
  if (!html) {
    return {
      platform: "tiktok",
      username: clean,
      channel: clean,
      displayName: clean,
      avatarUrl: AVATAR_FALLBACK(clean),
      source: "fallback",
    };
  }

  const nicknamePatterns = [
    /"nickname"\s*:\s*"([^"]+)"/i,
    /property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /"author"\s*:\s*"([^"]+)"/i,
  ];
  let displayName = clean;
  for (const re of nicknamePatterns) {
    const match = html.match(re);
    if (match?.[1]) {
      displayName = String(match[1]).replace(/&amp;/g, "&").replace(/\s*\|\s*TikTok$/i, "").replace(/\s*on TikTok$/i, "").trim();
      break;
    }
  }

  const avatarUrl = (await resolveTiktokAvatar(clean)) || AVATAR_FALLBACK(clean);
  return {
    platform: "tiktok",
    username: clean,
    channel: clean,
    displayName,
    avatarUrl,
    source: avatarUrl.includes("dicebear") ? "fallback" : "tiktok",
  };
}

async function resolveTwitchAvatar(username) {
  const clean = cleanUser(username);
  if (!clean) return "";
  const text = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(clean)}`);
  const avatar = String(text || "").trim();
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return "";
}

async function resolveTwitchProfile(username) {
  const clean = cleanUser(username);
  if (!clean) return null;
  const avatarUrl = (await resolveTwitchAvatar(clean)) || AVATAR_FALLBACK(clean);
  const html = await fetchText(`https://www.twitch.tv/${encodeURIComponent(clean)}`);
  let displayName = clean;
  if (html) {
    const patterns = [
      /"displayName"\s*:\s*"([^"]+)"/i,
      /"display-name"\s*:\s*"([^"]+)"/i,
      /property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /"channelName"\s*:\s*"([^"]+)"/i,
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) {
        displayName = String(match[1]).replace(/&amp;/g, "&").replace(/\s*\|\s*Twitch$/i, "").trim();
        break;
      }
    }
  }
  return {
    platform: "twitch",
    username: clean,
    channel: clean,
    displayName,
    avatarUrl,
    source: avatarUrl.includes("dicebear") ? "fallback" : "twitch",
  };
}

const TWITCH_BADGE_CACHE = new Map();

async function fetchTwitchBadgeData(roomId = "") {
  const key = roomId || "global";
  if (TWITCH_BADGE_CACHE.has(key)) return TWITCH_BADGE_CACHE.get(key);

  const promise = (async () => {
    const [globalData, channelData] = await Promise.all([
      fetchJson("https://badges.twitch.tv/v1/badges/global/display"),
      roomId ? fetchJson(`https://badges.twitch.tv/v1/badges/channels/${encodeURIComponent(roomId)}/display`) : Promise.resolve(null),
    ]);
    const badges = {
      ...(globalData?.badge_sets || globalData?.sets || {}),
      ...(channelData?.badge_sets || channelData?.sets || {}),
    };
    return { badges };
  })().catch(() => ({ badges: {} }));

  TWITCH_BADGE_CACHE.set(key, promise);
  return promise;
}

app.use(cors());
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));

app.get("/api/avatar", async (req, res) => {
  const platform = String(req.query.platform || "").toLowerCase();
  const username = cleanUser(req.query.username);

  if (!username) {
    return res.status(400).json({ avatarUrl: AVATAR_FALLBACK("guest"), platform, username: "", source: "fallback" });
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

  if (!avatarUrl) avatarUrl = AVATAR_FALLBACK(`${platform || "user"}-${username}`);

  res.json({ avatarUrl, platform, username, source });
});

app.get("/api/profile", async (req, res) => {
  const platform = String(req.query.platform || "").toLowerCase();
  const username = cleanUser(req.query.username);

  try {
    let profile = null;
    if (platform === "tiktok") profile = await resolveTiktokProfile(username);
    else if (platform === "twitch") profile = await resolveTwitchProfile(username);

    if (!profile) {
      profile = {
        platform,
        username,
        channel: username,
        displayName: username,
        avatarUrl: AVATAR_FALLBACK(`${platform || "user"}-${username || "guest"}`),
        source: "fallback",
      };
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({
      platform,
      username,
      channel: username,
      displayName: username,
      avatarUrl: AVATAR_FALLBACK(`${platform || "user"}-${username || "guest"}`),
      source: "fallback",
      error: err?.message || "profile lookup failed",
    });
  }
});

app.get("/api/twitch/badges", async (req, res) => {
  const roomId = String(req.query.roomId || "").trim();
  const data = await fetchTwitchBadgeData(roomId);
  res.json(data);
});

app.get("/api/status", (req, res) => {
  res.json({ online: true, app: "StreamFusion", version: "3.0.0" });
});

io.on("connection", (socket) => {
  socket.emit("system", { message: "Conectado a StreamFusion." });
  socket.emit("settings", getMergedSettings());

  socket.on("connectTikTok", async (username) => {
    try {
      await tiktok.connect(username, io);
      socket.emit("system", { message: `TikTok conectado con @${String(username).replace(/^@/, "")}.` });
    } catch (err) {
      socket.emit("system", { message: err?.message || "Error al conectar TikTok." });
    }
  });

  socket.on("connectTwitch", async (channel) => {
    try {
      await twitch.connect(channel, io);
      socket.emit("system", { message: `Twitch conectado a ${String(channel).replace(/^#/, "")}.` });
    } catch (err) {
      socket.emit("system", { message: err?.message || "Error al conectar Twitch." });
    }
  });

  socket.on("disconnectTikTok", async () => {
    try { await tiktok.disconnect(); socket.emit("system", { message: "TikTok desconectado." }); }
    catch (err) { socket.emit("system", { message: err?.message || "No se pudo desconectar TikTok." }); }
  });

  socket.on("disconnectTwitch", async () => {
    try { await twitch.disconnect(); socket.emit("system", { message: "Twitch desconectado." }); }
    catch (err) { socket.emit("system", { message: err?.message || "No se pudo desconectar Twitch." }); }
  });

  socket.on("saveSettings", (settings) => {
    const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), settings || {});
    database.saveSettings(merged);
    socket.emit("settings", merged);
    socket.emit("system", { message: "Configuración guardada." });
  });

  socket.on("loadSettings", () => socket.emit("settings", getMergedSettings()));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('=================================');
  console.log(' StreamFusion iniciado');
  console.log(' Puerto:', PORT);
  console.log('=================================');
});

