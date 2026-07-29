import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from "tiktok-live-connector";

const sessions = new Map();

const DEFAULT_AVATAR = (seed) => `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seed || "streamfusion")}`;

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function normalizeUsername(username) {
  let value = clean(username);
  value = value
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/i, "");
  value = value.split(/[/?#]/)[0].trim();
  return value;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchText(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function decodeEscapedString(value) {
  if (value === null || value === undefined) return "";
  try {
    return JSON.parse(`"${String(value)}"`);
  } catch {
    return String(value)
      .replace(/\\u002F/g, "/")
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function extractEscapedField(html, keys) {
  for (const key of keys) {
    const pattern = new RegExp(`"${key}":"(.*?)"`, "i");
    const match = String(html || "").match(pattern);
    if (match?.[1]) {
      return decodeEscapedString(match[1]);
    }
  }
  return "";
}

function extractTikTokProfileFromHtml(html, fallbackUsername) {
  const avatar = extractEscapedField(html, ["avatarLarger", "avatarMedium", "avatarThumb", "avatarUrl", "avatar"]);
  const displayName = extractEscapedField(html, ["nickname", "displayName", "uniqueId", "author", "authorName"]);
  const ogImage = String(html || "").match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || "";
  const ogTitle = String(html || "").match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || "";

  return {
    username: fallbackUsername,
    displayName: displayName || ogTitle || fallbackUsername,
    avatarUrl: avatar || ogImage || DEFAULT_AVATAR(fallbackUsername),
    exists: Boolean(avatar || displayName || ogImage || ogTitle),
  };
}

function profileFromUser(user, fallbackUsername) {
  const nickname = clean(
    user?.nickname ??
    user?.nickName ??
    user?.displayName ??
    user?.displayId ??
    user?.uniqueId ??
    fallbackUsername,
    fallbackUsername
  );

  const uniqueId = clean(
    user?.uniqueId ??
    user?.uniqueID ??
    user?.displayId ??
    user?.username ??
    fallbackUsername,
    fallbackUsername
  );

  const avatarUrl = clean(
    user?.avatarThumb ??
    user?.avatarMedium ??
    user?.avatarLarge ??
    user?.avatar ??
    DEFAULT_AVATAR(uniqueId || fallbackUsername)
  );

  return {
    username: uniqueId || fallbackUsername,
    displayName: nickname || fallbackUsername,
    avatarUrl,
  };
}

async function fetchTikTokProfile(username) {
  const normalized = normalizeUsername(username);
  const fallback = {
    username: normalized,
    displayName: normalized,
    avatarUrl: DEFAULT_AVATAR(normalized),
    exists: true,
  };

  const htmlUrl = `https://www.tiktok.com/@${normalized}`;
  const oEmbedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(htmlUrl)}`;

  try {
    const htmlRes = await fetchText(htmlUrl, 8000);
    if (htmlRes.ok && htmlRes.text) {
      const parsed = extractTikTokProfileFromHtml(htmlRes.text, normalized);
      if (parsed?.avatarUrl || parsed?.displayName) {
        return {
          username: normalized,
          displayName: clean(parsed.displayName, normalized),
          avatarUrl: clean(parsed.avatarUrl, fallback.avatarUrl),
          exists: true,
        };
      }
    }
  } catch {}

  try {
    const oEmbedRes = await fetchText(oEmbedUrl, 8000);
    if (oEmbedRes.ok && oEmbedRes.text) {
      const data = JSON.parse(oEmbedRes.text || "{}");
      const displayName = clean(data?.author_name || data?.title || normalized, normalized);
      const avatarUrl = clean(data?.thumbnail_url, fallback.avatarUrl);
      return {
        username: normalized,
        displayName,
        avatarUrl,
        exists: true,
      };
    }

    if (oEmbedRes.status === 404) {
      return {
        ...fallback,
        exists: false,
      };
    }
  } catch {}

  return fallback;
}

function getUser(data, fallbackUsername) {
  const user = data?.user || data?.details?.user || data?.author || data?.sender || data?.memberUser || null;
  const profile = profileFromUser(user, fallbackUsername);
  return profile;
}

function getComment(data) {
  return clean(
    data?.comment ??
    data?.text ??
    data?.message ??
    data?.msg ??
    data?.content,
    "Mensaje sin texto"
  );
}

function getGiftName(data) {
  return clean(
    data?.giftDetails?.giftName ??
    data?.giftName ??
    data?.gift?.name ??
    data?.giftId ??
    data?.gift?.giftName,
    "Regalo"
  );
}

function getGiftAmount(data) {
  const candidates = [
    data?.repeatCount,
    data?.repeatEndCount,
    data?.count,
    data?.giftCount,
    data?.amount,
  ];
  for (const candidate of candidates) {
    const n = toNumber(candidate, NaN);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function getLikeAmount(data) {
  const candidates = [
    data?.likeCount,
    data?.totalLikeCount,
    data?.likes,
    data?.count,
    data?.like_count,
  ];
  for (const candidate of candidates) {
    const n = toNumber(candidate, NaN);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function setLiveState(session, live, message = "") {
  session.setAccount("tiktok", {
    status: live ? "live" : "offline",
    connected: live,
    live,
    lastMessage: message || (live ? "En directo" : "Fuera de directo"),
  });
}

function setPendingState(session, message = "Buscando perfil...") {
  const current = session.accounts?.tiktok || {};
  session.setAccount("tiktok", {
    username: current.username || "",
    displayName: current.displayName || current.username || "",
    avatarUrl: current.avatarUrl || DEFAULT_AVATAR(current.username || "tiktok"),
    status: "pending",
    connected: false,
    live: false,
    exists: current.exists !== false,
    lastMessage: message,
  });
}

function setErrorState(session, message, username = "") {
  const current = session.accounts?.tiktok || {};
  session.setAccount("tiktok", {
    username: username || current.username || "",
    displayName: current.displayName || current.username || username || "",
    avatarUrl: current.avatarUrl || DEFAULT_AVATAR(username || current.username || "tiktok"),
    status: "error",
    connected: false,
    live: false,
    exists: false,
    lastMessage: message,
  });
}

function parseErrorMessage(err) {
  const msg = clean(
    err?.exception?.message ||
    err?.error?.message ||
    err?.message ||
    err?.info ||
    "Error de TikTok",
    "Error de TikTok"
  );

  const low = msg.toLowerCase();
  if (low.includes("not live") || low.includes("offline") || low.includes("no live")) {
    return { message: "El usuario existe, pero no está en directo.", code: "offline" };
  }
  if (low.includes("not found") || low.includes("404") || low.includes("user")) {
    return { message: "Usuario de TikTok no encontrado.", code: "not_found" };
  }
  return { message: msg, code: "error" };
}

function ensureSessionCleanup(session) {
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
}

export async function connectSession(session, username) {
  if (!session) throw new Error("Sesión inválida.");

  ensureSessionCleanup(session);

  const normalized = normalizeUsername(username);
  if (!normalized) {
    throw new Error("Debes ingresar un username válido de TikTok.");
  }

  const profile = await fetchTikTokProfile(normalized);
  session.tiktok.username = normalized;

  if (!profile.exists) {
    setErrorState(session, "Usuario de TikTok no encontrado.", normalized);
  } else {
    session.setAccount("tiktok", {
      username: normalized,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      status: "pending",
      connected: false,
      live: false,
      exists: true,
      lastMessage: "Perfil detectado. Conectando...",
    });
  }

  if (!profile.exists) {
    session.toast("Usuario de TikTok no encontrado.", "error");
    return;
  }

  const connection = new TikTokLiveConnection(normalized, {
    signApiKey: process.env.EULER_API_KEY,
    enableExtendedGiftInfo: true,
  });

  session.tiktok.connection = connection;

  connection.on(ControlEvent.CONNECTED, (state) => {
    setLiveState(session, true, "En directo");
    if (state?.roomId) {
      session.pushEvent({
        platform: "tiktok",
        type: "system",
        username: profile.displayName,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        message: `TikTok conectado. Room ID: ${state.roomId}`,
      });
    } else {
      session.pushEvent({
        platform: "tiktok",
        type: "system",
        username: profile.displayName,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        message: "TikTok conectado.",
      });
    }
    session.toast(`TikTok conectado: @${normalized}`, "success");
  });

  connection.on(ControlEvent.DISCONNECTED, () => {
    setLiveState(session, false, "No está en directo");
    session.pushEvent({
      platform: "tiktok",
      type: "system",
      username: profile.displayName,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      message: "TikTok salió del directo.",
    });
  });

  connection.on(ControlEvent.ERROR, (err) => {
    const parsed = parseErrorMessage(err);
    if (parsed.code === "offline") {
      setLiveState(session, false, parsed.message);
      session.toast(parsed.message, "warning");
    } else if (parsed.code === "not_found") {
      setErrorState(session, parsed.message, normalized);
      session.toast(parsed.message, "error");
    } else {
      session.setAccount("tiktok", {
        status: "error",
        connected: false,
        live: false,
        lastMessage: parsed.message,
      });
      session.toast(parsed.message, "error");
    }
  });

  connection.on(WebcastEvent.CHAT ?? "chat", (data) => {
    const user = getUser(data, normalized);
    const message = getComment(data);
    session.pushChat({
      platform: "tiktok",
      type: "chat",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message,
      badges: [],
      color: "#ff0050",
    });
  });

  connection.on(WebcastEvent.GIFT ?? "gift", (data) => {
    const user = getUser(data, normalized);
    const amount = getGiftAmount(data);
    const giftName = getGiftName(data);
    const streak = data?.giftDetails?.giftType === 1 && data?.repeatEnd === false ? " (en curso)" : "";

    session.updateStats("tiktok", {
      gifts: (session.stats.tiktok?.gifts || 0) + amount,
    });

    session.pushGift({
      platform: "tiktok",
      type: "gift",
      subtype: "gift",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      amount,
      message: `${giftName} ×${amount}${streak}`,
    });
  });

  connection.on(WebcastEvent.LIKE ?? "like", (data) => {
    const user = getUser(data, normalized);
    const likes = getLikeAmount(data);

    session.updateStats("tiktok", {
      likes: (session.stats.tiktok?.likes || 0) + likes,
    });

    session.pushEvent({
      platform: "tiktok",
      type: "like",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      amount: likes,
      message: `${user.displayName || user.username || normalized} dejó ${likes} like${likes === 1 ? "" : "s"}`,
    });
  });

  connection.on(WebcastEvent.MEMBER ?? "member", (data) => {
    const user = getUser(data, normalized);
    session.pushEvent({
      platform: "tiktok",
      type: "join",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: `${user.displayName || user.username || normalized} se unió al directo`,
    });
  });

  connection.on(WebcastEvent.SOCIAL ?? "social", (data) => {
    const user = getUser(data, normalized);
    const raw = clean(
      data?.action ||
      data?.socialType ||
      data?.shareType ||
      data?.type,
      "social"
    ).toLowerCase();

    if (raw.includes("follow")) {
      session.updateStats("tiktok", {
        followers: (session.stats.tiktok?.followers || 0) + 1,
      });
      session.pushEvent({
        platform: "tiktok",
        type: "follow",
        username: user.username || normalized,
        displayName: user.displayName || normalized,
        avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
        message: `${user.displayName || user.username || normalized} empezó a seguir`,
      });
      return;
    }

    if (raw.includes("share")) {
      session.updateStats("tiktok", {
        shares: (session.stats.tiktok?.shares || 0) + 1,
      });
      session.pushEvent({
        platform: "tiktok",
        type: "share",
        username: user.username || normalized,
        displayName: user.displayName || normalized,
        avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
        message: `${user.displayName || user.username || normalized} compartió el LIVE`,
      });
      return;
    }

    session.pushEvent({
      platform: "tiktok",
      type: "system",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: clean(data?.message ?? data?.text ?? data?.action, "Acción social"),
    });
  });

  if ((WebcastEvent.FOLLOW ?? "follow") !== (WebcastEvent.SOCIAL ?? "social")) {
    connection.on(WebcastEvent.FOLLOW ?? "follow", (data) => {
      const user = getUser(data, normalized);
      session.updateStats("tiktok", {
        followers: (session.stats.tiktok?.followers || 0) + 1,
      });
      session.pushEvent({
        platform: "tiktok",
        type: "follow",
        username: user.username || normalized,
        displayName: user.displayName || normalized,
        avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
        message: `${user.displayName || user.username || normalized} empezó a seguir`,
      });
    });
  }

  if ((WebcastEvent.SHARE ?? "share") !== (WebcastEvent.SOCIAL ?? "social")) {
    connection.on(WebcastEvent.SHARE ?? "share", (data) => {
      const user = getUser(data, normalized);
      session.updateStats("tiktok", {
        shares: (session.stats.tiktok?.shares || 0) + 1,
      });
      session.pushEvent({
        platform: "tiktok",
        type: "share",
        username: user.username || normalized,
        displayName: user.displayName || normalized,
        avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
        message: `${user.displayName || user.username || normalized} compartió el LIVE`,
      });
    });
  }

  connection.on(WebcastEvent.ROOM_USER ?? "roomUser", (data) => {
    const viewerCount = toNumber(data?.viewerCount ?? data?.viewers ?? data?.roomUserCount, 0);
    if (viewerCount > 0) {
      session.updateStats("tiktok", {
        viewers: viewerCount,
      });
    }
  });

  connection.on(WebcastEvent.LIVE_INTRO ?? "liveIntro", (data) => {
    const user = getUser(data, normalized);
    session.pushEvent({
      platform: "tiktok",
      type: "system",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: "Comenzó la intro del live.",
    });
  });

  connection.on(WebcastEvent.STREAM_END ?? "streamEnd", () => {
    setLiveState(session, false, "No está en directo");
    session.pushEvent({
      platform: "tiktok",
      type: "system",
      username: profile.displayName,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      message: "TikTok cerró el directo.",
    });
  });

  connection.on(WebcastEvent.ENVELOPE ?? "envelope", (data) => {
    const envelope = data?.envelopeInfo || {};
    const diamondCount = toNumber(envelope?.diamondCount ?? 0, 0);
    session.pushGift({
      platform: "tiktok",
      type: "gift",
      subtype: "envelope",
      username: clean(envelope?.sendUserName, profile.displayName),
      displayName: clean(envelope?.sendUserName, profile.displayName),
      avatarUrl: DEFAULT_AVATAR(clean(envelope?.sendUserName, normalized)),
      message: `Sobre: ${diamondCount} diamantes`,
    });
  });

  connection.on(WebcastEvent.SUPER_FAN ?? "superFan", (data) => {
    const user = getUser(data, normalized);
    session.pushGift({
      platform: "tiktok",
      type: "fanclub",
      subtype: "superfan",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: `${user.displayName || user.username || normalized} activó Super Fan`,
    });
  });

  connection.on(WebcastEvent.SUPER_FAN_JOIN ?? "superFanJoin", (data) => {
    const user = getUser(data, normalized);
    session.pushGift({
      platform: "tiktok",
      type: "fanclub",
      subtype: "superfan",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: `${user.displayName || user.username || normalized} se unió como Super Fan`,
    });
  });

  connection.on(WebcastEvent.SUPER_FAN_BOX ?? "superFanBox", (data) => {
    const user = getUser(data, normalized);
    session.pushGift({
      platform: "tiktok",
      type: "fanclub",
      subtype: "superfanbox",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: `${user.displayName || user.username || normalized} recibió una caja Super Fan`,
    });
  });

  connection.on(WebcastEvent.QUESTION_NEW ?? "questionNew", (data) => {
    const user = getUser(data, normalized);
    session.pushEvent({
      platform: "tiktok",
      type: "system",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: clean(
        data?.details?.questionText ??
        data?.questionText ??
        data?.text,
        "Nueva pregunta"
      ),
    });
  });

  connection.on(WebcastEvent.EMOTE ?? "emote", (data) => {
    const user = getUser(data, normalized);
    session.pushEvent({
      platform: "tiktok",
      type: "system",
      username: user.username || normalized,
      displayName: user.displayName || normalized,
      avatarUrl: user.avatarUrl || DEFAULT_AVATAR(user.username || normalized),
      message: `Emote: ${clean(data?.emoteList?.[0]?.emoteId ?? data?.emoteId ?? data?.emoteName, "emote")}`,
    });
  });

  session.setAccount("tiktok", {
    username: normalized,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    status: "pending",
    connected: false,
    live: false,
    exists: true,
    lastMessage: "Conectando al directo...",
  });

  await connection.connect();
}

export async function disconnectSession(session) {
  if (!session) return;
  if (session.tiktok?.profilePoll) {
    clearInterval(session.tiktok.profilePoll);
    session.tiktok.profilePoll = null;
  }
  if (session.tiktok?.connection) {
    try {
      session.tiktok.connection.removeAllListeners?.();
      await session.tiktok.connection.disconnect?.();
    } catch {}
    session.tiktok.connection = null;
  }

  const account = session.accounts?.tiktok || {};
  session.setAccount("tiktok", {
    ...account,
    status: "idle",
    connected: false,
    live: false,
    lastMessage: "TikTok desconectado.",
  });
}

