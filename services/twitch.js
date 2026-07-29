import tmi from "tmi.js";

const sessions = new Map();

const DEFAULT_AVATAR = (seed) => `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seed || "streamfusion")}`;

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function normalizeChannel(channel) {
  let value = clean(channel);
  value = value
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/^@/i, "")
    .replace(/^#/i, "");
  value = value.split(/[/?#]/)[0].trim();
  return value;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function avatarFromUsername(username) {
  return DEFAULT_AVATAR(username);
}

async function fetchText(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTwitchProfile(username) {
  const normalized = normalizeChannel(username);
  const profile = {
    username: normalized,
    displayName: normalized,
    avatarUrl: avatarFromUsername(normalized),
    exists: true,
    live: false,
    statusText: "Desconectado",
  };

  try {
    const avatarRes = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(normalized)}`, 8000);
    if (avatarRes.ok && avatarRes.text) {
      profile.avatarUrl = clean(avatarRes.text, profile.avatarUrl);
      profile.exists = true;
    }

    const statusRes = await fetchText(`https://decapi.me/twitch/status/${encodeURIComponent(normalized)}`, 8000);
    if (statusRes.ok && statusRes.text) {
      const text = statusRes.text.trim();
      profile.statusText = text;
      const lower = text.toLowerCase();
      if (lower.includes("offline") || lower.includes("is offline")) {
        profile.live = false;
      } else if (lower.includes("not found") || lower.includes("error")) {
        profile.exists = false;
      } else {
        profile.live = true;
      }
    }
  } catch {
    profile.exists = true;
    profile.live = false;
    profile.statusText = "Sin estado";
  }

  return profile;
}

function getDisplayName(tags, fallback) {
  return clean(tags?.["display-name"] || tags?.username || fallback || "Usuario", fallback || "Usuario");
}

function getUniqueId(tags, fallback) {
  return clean(tags?.["user-id"] || tags?.username || fallback || "", fallback || "");
}

function getColor(tags) {
  return tags?.color || "";
}

function getBadges(tags) {
  return tags?.badges || {};
}

function guessCountFromText(message) {
  const match = String(message || "").match(/(\d[\d,]*)/);
  if (!match) return 1;
  const n = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function setAccount(session, patch) {
  const account = session.accounts?.twitch || {};
  session.setAccount("twitch", {
    ...account,
    ...patch,
  });
}

function ensureCleanup(session) {
  if (session.twitch?.statusPoll) {
    clearInterval(session.twitch.statusPoll);
    session.twitch.statusPoll = null;
  }
  if (session.twitch?.client) {
    try {
      session.twitch.client.removeAllListeners?.();
      session.twitch.client.disconnect?.();
    } catch {}
    session.twitch.client = null;
  }
}

function updateLiveFromStatus(session, profile, reason = "") {
  const live = Boolean(profile.live);
  setAccount(session, {
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    exists: profile.exists !== false,
    connected: true,
    live,
    status: live ? "live" : profile.exists === false ? "error" : "offline",
    lastMessage: reason || profile.statusText || (live ? "En directo" : "No está en directo"),
  });
}

async function pollStatus(session, username) {
  const profile = await fetchTwitchProfile(username);
  updateLiveFromStatus(session, profile, profile.statusText);
  if (profile.live && session.twitch?.client) {
    session.updateStats("twitch", {
      viewers: session.stats.twitch?.viewers || 0,
    });
  }
}

export async function connectSession(session, channel) {
  if (!session) throw new Error("Sesión inválida.");

  ensureCleanup(session);

  const normalized = normalizeChannel(channel);
  if (!normalized) {
    throw new Error("Debes ingresar un canal válido de Twitch.");
  }

  session.twitch.username = normalized;

  const profile = await fetchTwitchProfile(normalized);

  setAccount(session, {
    username: normalized,
    displayName: profile.displayName || normalized,
    avatarUrl: profile.avatarUrl || avatarFromUsername(normalized),
    exists: profile.exists !== false,
    connected: true,
    live: Boolean(profile.live),
    status: profile.exists === false ? "error" : (profile.live ? "live" : "offline"),
    lastMessage: profile.statusText || (profile.live ? "En directo" : "No está en directo"),
  });

  if (profile.exists === false) {
    session.toast("Canal de Twitch no encontrado.", "error");
    return;
  }

  const client = new tmi.Client({
    channels: [normalized],
    connection: {
      secure: true,
      reconnect: true,
    },
  });

  session.twitch.client = client;

  client.on("connected", () => {
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: normalized,
      displayName: normalized,
      avatarUrl: profile.avatarUrl,
      message: `Twitch conectado a #${normalized}.`,
    });
    session.toast(`Twitch conectado: ${normalized}`, "success");
  });

  client.on("message", (channelName, tags, message, self) => {
    if (self) return;

    const user = getDisplayName(tags, normalized);
    const avatarUrl = avatarFromUsername(getUniqueId(tags, user) || user);
    session.pushChat({
      platform: "twitch",
      type: "chat",
      username: getUniqueId(tags, user) || user,
      displayName: user,
      avatarUrl,
      message,
      color: getColor(tags),
      badges: getBadges(tags),
    });
  });

  client.on("action", (channelName, tags, message, self) => {
    if (self) return;

    const user = getDisplayName(tags, normalized);
    const avatarUrl = avatarFromUsername(getUniqueId(tags, user) || user);
    session.pushChat({
      platform: "twitch",
      type: "chat",
      username: getUniqueId(tags, user) || user,
      displayName: user,
      avatarUrl,
      message,
      color: getColor(tags),
      badges: getBadges(tags),
    });
  });

  client.on("join", (channelName, username, self) => {
    if (self) return;
    const user = clean(username, "Usuario");
    session.pushEvent({
      platform: "twitch",
      type: "join",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} se unió al canal`,
    });
  });

  client.on("subscription", (channelName, username, method, message, userstate) => {
    const user = clean(username, "Usuario");
    session.updateStats("twitch", {
      subs: (session.stats.twitch?.subs || 0) + 1,
    });
    session.pushGift({
      platform: "twitch",
      type: "sub",
      subtype: "sub",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} se suscribió`,
    });
  });

  client.on("resub", (channelName, username, months, message, userstate, methods) => {
    const user = clean(username, "Usuario");
    session.updateStats("twitch", {
      subs: (session.stats.twitch?.subs || 0) + 1,
    });
    session.pushGift({
      platform: "twitch",
      type: "sub",
      subtype: "resub",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} renovó su sub por ${toNumber(months, 1)} mes${toNumber(months, 1) === 1 ? "" : "es"}`,
    });
  });

  client.on("subgift", (channelName, username, streakMonths, recipient, methods, userstate) => {
    const user = clean(username, "Usuario");
    const target = clean(recipient, "Usuario");
    session.updateStats("twitch", {
      subs: (session.stats.twitch?.subs || 0) + 1,
    });
    session.pushGift({
      platform: "twitch",
      type: "sub",
      subtype: "giftsub",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} regaló una sub a ${target}`,
    });
  });

  client.on("giftpaidupgrade", (channelName, username, sender, userstate) => {
    const user = clean(username, "Usuario");
    const fromUser = clean(sender, "Usuario");
    session.updateStats("twitch", {
      subs: (session.stats.twitch?.subs || 0) + 1,
    });
    session.pushGift({
      platform: "twitch",
      type: "sub",
      subtype: "giftupgrade",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} recibió una sub de ${fromUser}`,
    });
  });

  client.on("anongiftpaidupgrade", (channelName, username, userstate) => {
    const user = clean(username, "Usuario");
    session.updateStats("twitch", {
      subs: (session.stats.twitch?.subs || 0) + 1,
    });
    session.pushGift({
      platform: "twitch",
      type: "sub",
      subtype: "giftupgrade",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} recibió una sub anónima`,
    });
  });

  client.on("cheer", (channelName, tags, message) => {
    const user = getDisplayName(tags, normalized);
    const bits = toNumber(tags?.bits, guessCountFromText(message));
    session.updateStats("twitch", {
      bits: (session.stats.twitch?.bits || 0) + bits,
    });
    session.pushGift({
      platform: "twitch",
      type: "bits",
      subtype: "bits",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      amount: bits,
      message: `${user} envió ${bits} Bits`,
    });
  });

  client.on("raided", (channelName, username, viewers) => {
    const user = clean(username, "Usuario");
    const raidViewers = toNumber(viewers, 0);
    session.updateStats("twitch", {
      raids: (session.stats.twitch?.raids || 0) + 1,
      viewers: raidViewers > 0 ? raidViewers : (session.stats.twitch?.viewers || 0),
    });
    session.pushGift({
      platform: "twitch",
      type: "raid",
      subtype: "raid",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      amount: raidViewers,
      message: `${user} hizo raid con ${raidViewers} viewer${raidViewers === 1 ? "" : "s"}`,
    });
  });

  client.on("hosttarget", (channelName, username, viewers, autohost) => {
    const user = clean(username, "Usuario");
    const count = toNumber(viewers, 0);
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: `${user} hosteó con ${count} viewer${count === 1 ? "" : "s"}`,
      amount: count,
    });
  });

  client.on("notice", (channelName, msgid, message, tags) => {
    const user = getDisplayName(tags, normalized);
    const text = clean(message, "Aviso de Twitch");

    if (msgid === "sub" || msgid === "resub" || msgid === "subgift") {
      session.updateStats("twitch", {
        subs: (session.stats.twitch?.subs || 0) + 1,
      });
      session.pushGift({
        platform: "twitch",
        type: "sub",
        subtype: msgid,
        username: user,
        displayName: user,
        avatarUrl: avatarFromUsername(user),
        message: text,
      });
      return;
    }

    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: user,
      displayName: user,
      avatarUrl: avatarFromUsername(user),
      message: text,
    });
  });

  client.on("roomstate", () => {
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: normalized,
      displayName: normalized,
      avatarUrl: avatarFromUsername(normalized),
      message: "Estado del canal actualizado.",
    });
  });

  client.on("clearchat", () => {
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: normalized,
      displayName: normalized,
      avatarUrl: avatarFromUsername(normalized),
      message: "El chat fue limpiado.",
    });
  });

  client.on("timeout", (channelName, username, reason, duration, userstate) => {
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: clean(username, "Usuario"),
      displayName: clean(username, "Usuario"),
      avatarUrl: avatarFromUsername(username),
      message: `${clean(username, "Usuario")} fue sancionado${duration ? ` por ${duration}s` : ""}`,
    });
  });

  client.on("ban", (channelName, username, reason, userstate) => {
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: clean(username, "Usuario"),
      displayName: clean(username, "Usuario"),
      avatarUrl: avatarFromUsername(username),
      message: `${clean(username, "Usuario")} fue baneado`,
    });
  });

  client.on("connected", async () => {
    updateLiveFromStatus(session, {
      ...profile,
      live: profile.live,
      exists: profile.exists,
    }, profile.statusText);

    session.toast(`Twitch conectado: ${normalized}`, "success");

    if (session.twitch.statusPoll) {
      clearInterval(session.twitch.statusPoll);
    }
    session.twitch.statusPoll = setInterval(() => {
      pollStatus(session, normalized).catch(() => {});
    }, 60_000);

    await pollStatus(session, normalized).catch(() => {});
  });

  client.on("disconnected", (reason) => {
    setAccount(session, {
      username: normalized,
      displayName: profile.displayName || normalized,
      avatarUrl: profile.avatarUrl || avatarFromUsername(normalized),
      connected: false,
      live: false,
      status: profile.exists === false ? "error" : "offline",
      lastMessage: clean(reason, "Twitch desconectado."),
    });
    session.pushEvent({
      platform: "twitch",
      type: "system",
      username: normalized,
      displayName: normalized,
      avatarUrl: profile.avatarUrl || avatarFromUsername(normalized),
      message: clean(reason, "Twitch desconectado."),
    });
  });

  await client.connect();
}

export async function disconnectSession(session) {
  if (!session) return;
  if (session.twitch?.statusPoll) {
    clearInterval(session.twitch.statusPoll);
    session.twitch.statusPoll = null;
  }
  if (session.twitch?.client) {
    try {
      session.twitch.client.removeAllListeners?.();
      await session.twitch.client.disconnect?.();
    } catch {}
    session.twitch.client = null;
  }

  const account = session.accounts?.twitch || {};
  session.setAccount("twitch", {
    ...account,
    status: "idle",
    connected: false,
    live: false,
    lastMessage: "Twitch desconectado.",
  });
}
