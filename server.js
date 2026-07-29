import "dotenv/config";

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";

import { randomUUID } from "crypto";

import * as database from "./services/database.js";
import * as tiktok from "./services/tiktok.js";
import * as twitch from "./services/twitch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const DEFAULT_SETTINGS = {
  general: {
    language: "es",
    theme: "dark",
    startMinimized: false,
    playSounds: true,
    saveLogs: true,
  },
  chat: {
    showAvatar: true,
    showUsername: true,
    showPlatform: true,
    showTime: true,
    compactMode: false,
    bubbleStyle: "bubble",
    maxVisibleMessages: 120,
    autoScroll: true,
    showBadges: true,
  },
  events: {
    showJoin: true,
    showLike: true,
    showFollow: true,
    showShare: true,
    showSystem: true,
    showViewer: true,
  },
  gifts: {
    showGift: true,
    showFanClub: true,
    showSuperFan: true,
    showEnvelope: true,
    showSub: true,
    showBits: true,
    showRaid: true,
  },
  panels: {
    showStats: false,
    showEvents: false,
    showGifts: false,
  },
};

const DEFAULT_STATS = () => ({
  tiktok: {
    viewers: 0,
    likes: 0,
    gifts: 0,
    followers: 0,
    shares: 0,
  },
  twitch: {
    viewers: 0,
    subs: 0,
    bits: 0,
    raids: 0,
    followers: 0,
  },
});

const sessions = new Map();

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

function clone(value) {
  return structuredClone(value);
}

function createHistory(limit = 120) {
  const items = [];
  return {
    items,
    push(item) {
      items.push(item);
      if (items.length > limit) items.splice(0, items.length - limit);
    },
    clear() {
      items.length = 0;
    },
  };
}

function normalizeSessionToken(token) {
  const clean = String(token || "").trim();
  return clean || randomUUID();
}

function createSession(token) {
  const memory = database.getSessionData(token) || {};

  const session = {
    token,
    sockets: new Set(),
    settings: deepMerge(clone(DEFAULT_SETTINGS), memory.settings || {}),
    stats: deepMerge(DEFAULT_STATS(), memory.stats || {}),
    accounts: {
      tiktok: {
        platform: "tiktok",
        username: "",
        displayName: "",
        avatarUrl: "",
        status: "idle", // idle | pending | online | live | offline | error
        connected: false,
        live: false,
        exists: false,
        lastMessage: "",
        ...(memory.accounts?.tiktok || {}),
      },
      twitch: {
        platform: "twitch",
        username: "",
        displayName: "",
        avatarUrl: "",
        status: "idle",
        connected: false,
        live: false,
        exists: false,
        lastMessage: "",
        ...(memory.accounts?.twitch || {}),
      },
    },
    history: {
      chat: Array.isArray(memory.history?.chat) ? memory.history.chat : [],
      events: Array.isArray(memory.history?.events) ? memory.history.events : [],
      gifts: Array.isArray(memory.history?.gifts) ? memory.history.gifts : [],
    },
    tiktok: {
      connection: null,
      profilePoll: null,
      username: "",
    },
    twitch: {
      client: null,
      statusPoll: null,
      username: "",
    },
    persistTimer: null,
    cleanupTimer: null,
  };

  session.broadcast = (event, payload) => {
    for (const sock of session.sockets) {
      sock.emit(event, payload);
    }
  };

  session.toast = (message, variant = "info") => {
    session.broadcast("toast", {
      message,
      variant,
      timestamp: Date.now(),
    });
  };

  session.setAccount = (platform, patch) => {
    const current = session.accounts[platform] || {};
    session.accounts[platform] = {
      platform,
      ...current,
      ...patch,
    };
    session.broadcast("accountUpdate", {
      platform,
      ...session.accounts[platform],
      timestamp: Date.now(),
    });
    schedulePersist(session);
  };

  session.updateStats = (platform, patch) => {
    session.stats[platform] = {
      ...(session.stats[platform] || {}),
      ...patch,
    };
    session.broadcast("stats", clone(session.stats));
    schedulePersist(session);
  };

  session.pushChat = (item) => {
    const entry = {
      platform: item.platform === "twitch" ? "twitch" : "tiktok",
      type: item.type || "chat",
      username: item.username || item.user || "Usuario",
      displayName: item.displayName || item.username || item.user || "Usuario",
      avatarUrl: item.avatarUrl || "",
      message: item.message || "Mensaje sin texto",
      badges: item.badges || [],
      timestamp: item.timestamp || Date.now(),
      color: item.color || "",
      id: item.id || randomUUID(),
    };
    session.history.chat.push(entry);
    if (session.history.chat.length > 150) session.history.chat.splice(0, session.history.chat.length - 150);
    session.broadcast("chat", entry);
    schedulePersist(session);
  };

  session.pushEvent = (item) => {
    const entry = {
      platform: item.platform === "twitch" ? "twitch" : "tiktok",
      type: item.type || "system",
      username: item.username || item.user || "Usuario",
      displayName: item.displayName || item.username || item.user || "Usuario",
      avatarUrl: item.avatarUrl || "",
      message: item.message || "",
      amount: item.amount ?? null,
      timestamp: item.timestamp || Date.now(),
      id: item.id || randomUUID(),
    };
    session.history.events.push(entry);
    if (session.history.events.length > 150) session.history.events.splice(0, session.history.events.length - 150);
    session.broadcast("event", entry);
    schedulePersist(session);
  };

  session.pushGift = (item) => {
    const entry = {
      platform: item.platform === "twitch" ? "twitch" : "tiktok",
      type: item.type || "gift",
      subtype: item.subtype || "",
      username: item.username || item.user || "Usuario",
      displayName: item.displayName || item.username || item.user || "Usuario",
      avatarUrl: item.avatarUrl || "",
      message: item.message || "",
      amount: item.amount ?? null,
      timestamp: item.timestamp || Date.now(),
      id: item.id || randomUUID(),
    };
    session.history.gifts.push(entry);
    if (session.history.gifts.length > 120) session.history.gifts.splice(0, session.history.gifts.length - 120);
    session.broadcast("gift", entry);
    schedulePersist(session);
  };

  session.snapshot = () => ({
    token: session.token,
    settings: clone(session.settings),
    stats: clone(session.stats),
    accounts: clone(session.accounts),
    history: {
      chat: clone(session.history.chat),
      events: clone(session.history.events),
      gifts: clone(session.history.gifts),
    },
  });

  return session;
}

function persistSession(session) {
  database.saveSessionData(session.token, {
    settings: session.settings,
    stats: session.stats,
    accounts: session.accounts,
    history: session.history,
  });
}

function schedulePersist(session) {
  if (session.persistTimer) clearTimeout(session.persistTimer);
  session.persistTimer = setTimeout(() => {
    persistSession(session);
    session.persistTimer = null;
  }, 500);
}

function cleanupSession(session) {
  if (session.tiktok?.connection) {
    try {
      session.tiktok.connection.removeAllListeners?.();
      session.tiktok.connection.disconnect?.();
    } catch {}
    session.tiktok.connection = null;
  }

  if (session.tiktok?.profilePoll) {
    clearInterval(session.tiktok.profilePoll);
    session.tiktok.profilePoll = null;
  }

  if (session.twitch?.client) {
    try {
      session.twitch.client.removeAllListeners?.();
      session.twitch.client.disconnect?.();
    } catch {}
    session.twitch.client = null;
  }

  if (session.twitch?.statusPoll) {
    clearInterval(session.twitch.statusPoll);
    session.twitch.statusPoll = null;
  }
}

function ensureSession(token) {
  const sessionToken = normalizeSessionToken(token);
  if (sessions.has(sessionToken)) return sessions.get(sessionToken);

  const session = createSession(sessionToken);
  sessions.set(sessionToken, session);
  return session;
}

function detachSocketFromSession(socket) {
  const token = socket.data?.sessionToken;
  if (!token) return;

  const session = sessions.get(token);
  if (!session) return;

  session.sockets.delete(socket);
  if (session.sockets.size === 0) {
    if (session.cleanupTimer) clearTimeout(session.cleanupTimer);
    session.cleanupTimer = setTimeout(() => {
      const still = sessions.get(token);
      if (!still || still.sockets.size > 0) return;
      cleanupSession(still);
      persistSession(still);
      sessions.delete(token);
    }, 10 * 60 * 1000);
  }
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
  const rawUrl = String(req.query.url || "").trim();
  const seed = String(req.query.seed || "streamfusion").trim() || "streamfusion";

  const sendFallback = (statusCode = 200) => {
    const initials = seed.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "SF";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff0050"/>
            <stop offset="100%" stop-color="#9146ff"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" rx="64" fill="url(#g)"/>
        <circle cx="128" cy="102" r="48" fill="rgba(255,255,255,.20)"/>
        <path d="M54 218c14-36 47-58 74-58s60 22 74 58" fill="rgba(255,255,255,.20)"/>
        <text x="128" y="154" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="800" fill="#ffffff">${initials}</text>
      </svg>
    `.trim();

    res.status(statusCode);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  };

  if (!rawUrl) {
    return sendFallback(200);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return sendFallback(400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return sendFallback(400);
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return sendFallback(upstream.status);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch {
    return sendFallback(200);
  }
});
app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    app: "StreamFusion",
    version: "2.1.0",
  });
});

io.on("connection", (socket) => {
  socket.data = socket.data || {};
  socket.emit("system", {
    message: "Conectado a StreamFusion. Registra una sesión para comenzar.",
    type: "system",
    timestamp: Date.now(),
  });

  socket.on("registerSession", (payload = {}) => {
    const token = normalizeSessionToken(payload.token);
    const session = ensureSession(token);

    if (socket.data?.sessionToken && socket.data.sessionToken !== token) {
      detachSocketFromSession(socket);
    }

    socket.data.sessionToken = token;
    socket.data.sessionRole = payload.role || "main";
    session.sockets.add(socket);

    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
      session.cleanupTimer = null;
    }

    socket.emit("sessionState", session.snapshot());
    socket.emit("settings", clone(session.settings));
    socket.emit("stats", clone(session.stats));

    session.broadcast("toast", {
      message: socket.data.sessionRole === "overlay"
        ? "Overlay conectado."
        : "Sesión activa.",
      variant: "success",
      timestamp: Date.now(),
    });
  });

  socket.on("connectTikTok", async (payload = {}) => {
    const token = socket.data?.sessionToken;
    if (!token) {
      socket.emit("toast", { message: "Primero registra la sesión.", variant: "error", timestamp: Date.now() });
      return;
    }

    const session = sessions.get(token);
    if (!session) return;

    const username = String(payload.username || payload || "").trim();
    if (!username) {
      socket.emit("toast", { message: "Escribe un username de TikTok.", variant: "error", timestamp: Date.now() });
      return;
    }

    try {
      await tiktok.connectSession(session, username);
      socket.emit("toast", {
        message: `TikTok configurado: @${username.replace(/^@/, "")}.`,
        variant: "success",
        timestamp: Date.now(),
      });
    } catch (err) {
      session.setAccount("tiktok", {
        username,
        status: "error",
        connected: false,
        live: false,
        exists: false,
        lastMessage: err?.message || "Error al conectar TikTok",
      });
      socket.emit("toast", {
        message: err?.message || "Error al conectar TikTok",
        variant: "error",
        timestamp: Date.now(),
      });
    }
  });

  socket.on("connectTwitch", async (payload = {}) => {
    const token = socket.data?.sessionToken;
    if (!token) {
      socket.emit("toast", { message: "Primero registra la sesión.", variant: "error", timestamp: Date.now() });
      return;
    }

    const session = sessions.get(token);
    if (!session) return;

    const username = String(payload.username || payload || "").trim();
    if (!username) {
      socket.emit("toast", { message: "Escribe un canal de Twitch.", variant: "error", timestamp: Date.now() });
      return;
    }

    try {
      await twitch.connectSession(session, username);
      socket.emit("toast", {
        message: `Twitch configurado: ${username}.`,
        variant: "success",
        timestamp: Date.now(),
      });
    } catch (err) {
      session.setAccount("twitch", {
        username,
        status: "error",
        connected: false,
        live: false,
        exists: false,
        lastMessage: err?.message || "Error al conectar Twitch",
      });
      socket.emit("toast", {
        message: err?.message || "Error al conectar Twitch",
        variant: "error",
        timestamp: Date.now(),
      });
    }
  });

  socket.on("disconnectTikTok", async () => {
    const token = socket.data?.sessionToken;
    if (!token) return;
    const session = sessions.get(token);
    if (!session) return;
    await tiktok.disconnectSession(session);
    session.setAccount("tiktok", {
      status: "idle",
      connected: false,
      live: false,
      lastMessage: "TikTok desconectado.",
    });
    socket.emit("toast", { message: "TikTok desconectado.", variant: "info", timestamp: Date.now() });
  });

  socket.on("disconnectTwitch", async () => {
    const token = socket.data?.sessionToken;
    if (!token) return;
    const session = sessions.get(token);
    if (!session) return;
    await twitch.disconnectSession(session);
    session.setAccount("twitch", {
      status: "idle",
      connected: false,
      live: false,
      lastMessage: "Twitch desconectado.",
    });
    socket.emit("toast", { message: "Twitch desconectado.", variant: "info", timestamp: Date.now() });
  });

  socket.on("saveSettings", (settings = {}) => {
    const token = socket.data?.sessionToken;
    if (!token) return;

    const session = sessions.get(token);
    if (!session) return;

    session.settings = deepMerge(clone(DEFAULT_SETTINGS), deepMerge(session.settings, settings));
    session.broadcast("settings", clone(session.settings));
    socket.emit("toast", {
      message: "Configuración guardada.",
      variant: "success",
      timestamp: Date.now(),
    });
    schedulePersist(session);
  });

  socket.on("requestSnapshot", () => {
    const token = socket.data?.sessionToken;
    if (!token) return;
    const session = sessions.get(token);
    if (!session) return;
    socket.emit("sessionState", session.snapshot());
  });

  socket.on("disconnect", () => {
    detachSocketFromSession(socket);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("=================================");
  console.log(" StreamFusion iniciado");
  console.log(" Puerto:", PORT);
  console.log("=================================");
});

