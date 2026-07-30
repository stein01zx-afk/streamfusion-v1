const socket = io();
const list = document.getElementById('list');
const SETTINGS_KEY = "streamfusion.ui.settings.v2";
const LEGACY_SETTINGS_KEY = "streamfusion.ui.settings.v1";
const SESSION_KEY = "streamfusion.ui.session.v2";
const SUPPORTERS_KEY = "streamfusion.ui.supporters.v1";
const ACTIVITY_BADGES_KEY = "streamfusion.ui.activityBadges.v1";
const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
const platformColors = { tiktok: "#fe2c55", twitch: "#9146ff" };

const defaults = {
  panels: { chat: true, events: true, gifts: true },
  order: "events-gifts",
  filters: { chat: "all", event: "all", gift: "all" },
  personal: {
    theme: "dark",
    font: "inter",
    animation: "slide",
    chatLayout: "vertical",
    chatDirection: "down",
    chatTheme: "cloud",
    avatarFrame: "platform",
    bubbleFrame: "platform",
    avatarSize: "md",
    nameSize: "md",
    nameWeight: "800",
    chatHorizontalMode: "normal",
    badgeStyle: "emoji",
    badgeType: "emoji",
    twitchNameColor: "real",
    tiktokNameColor: "white",
    messageEffect: "shadow",
    nameEffect: "shadow",
    textColor: "auto",
    showBadges: true,
    showEmotes: true,
    highlightSupporters: true,
    highlightSupportersTikTok: true,
    highlightSupportersTwitch: true,
    supporterHighlightStyle: "gold",
    eventsLayout: "vertical",
    eventsDirection: "down",
    eventsPanelSize: "normal",
    eventsCardFrame: true,
    eventsAutoClear: false,
    eventsClearSeconds: 30,
    giftsLayout: "vertical",
    giftsDirection: "down",
    giftsPanelSize: "normal",
    giftsCardFrame: true,
    giftsAutoClear: false,
    giftsClearSeconds: 30,
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

function ESC(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return mergeDeep(structuredClone(fallback), JSON.parse(raw));
  } catch {
    return structuredClone(fallback);
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function mergeDeep(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (typeof base !== "object" || base === null) return incoming ?? base;
  if (typeof incoming !== "object" || incoming === null) return base;
  const result = { ...base };
  for (const key of Object.keys(incoming)) {
    result[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
  }
  return result;
}

function normalizeUsername(value) {
  return String(value || "").trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "").replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^@+/, "").replace(/^#+/, "").split(/[/?#]/)[0].trim();
}

function normalizeTypeName(value) { return String(value || "").toLowerCase().replace(/[\s_-]+/g, ""); }

function normalizeImageSource(value) {
  const src = String(value ?? "").trim();
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src;
  return "";
}

function normalizeBadgeImageUrls(raw) {
  const urls = [];
  const push = (value) => {
    const src = normalizeImageSource(value);
    if (src && !urls.includes(src)) urls.push(src);
  };
  if (!raw) return urls;
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === "string") push(item);
      else if (item && typeof item === "object") push(item.url || item.imageUrl || item.image_url || item.src || item.icon || item.link || item.value);
    });
  } else if (typeof raw === "object") {
    Object.values(raw).forEach((value) => {
      if (typeof value === "string") push(value);
      else if (value && typeof value === "object") push(value.url || value.imageUrl || value.image_url || value.src || value.icon || value.link || value.value);
    });
  }
  return urls;
}

function normalizeBadgeKeys(raw) {
  if (!raw) return [];
  const items = [];
  const push = (key) => { const clean = String(key || "").trim(); if (clean) items.push(clean); };
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === "string") push(item);
      else if (item && typeof item === "object") push(item.name || item.type || item.label || item.id);
    });
  } else if (typeof raw === "object") {
    Object.entries(raw).forEach(([key, value]) => { if (value !== false && value !== null && value !== undefined) push(key); });
  } else if (typeof raw === "string") {
    raw.split(/[,\s|]+/).forEach(push);
  }
  return items;
}

function badgeText(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.includes("broadcaster")) return "Broadcaster";
  if (lower.includes("mod")) return "Mod";
  if (lower.includes("vip")) return "VIP";
  if (lower.includes("sub")) return "Sub";
  if (lower.includes("staff")) return "Staff";
  if (lower.includes("verified")) return "Verified";
  if (lower.includes("founder")) return "Founder";
  if (lower.includes("premium")) return "Premium";
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("twitch")) return "Twitch";
  return lower.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function badgeEmoji(key, platform) {
  const lower = String(key || "").toLowerCase();
  if (lower === "mod") return "🛡";
  if (lower === "broadcaster") return platform === "twitch" ? "👑" : "🎬";
  if (lower === "sub" || lower === "subscriber") return "⭐";
  if (lower === "vip") return "💎";
  if (lower === "verified") return "✅";
  if (lower === "staff") return "🧰";
  if (lower === "founder") return "🏅";
  if (lower === "premium") return "✨";
  if (lower === "tiktok") return "🎵";
  if (lower === "twitch") return "🟣";
  return "🏷";
}

function badgeChips(raw, platform, realBadgeUrls = []) {
  const keys = normalizeBadgeKeys(raw);
  if (!state.settings.personal.showBadges) return "";
  const style = state.settings.personal.badgeType || state.settings.personal.badgeStyle || "emoji";
  const realUrls = normalizeBadgeImageUrls(realBadgeUrls);
  return keys.map((key, index) => {
    const emoji = badgeEmoji(key, platform);
    const realUrl = realUrls[index] || realUrls[0] || "";
    if (style === "real") {
      return realUrl ? `<img src="${ESC(realUrl)}" class="chat-badge-img" alt="${ESC(key)}" loading="lazy" />` : `<span class="badge">${ESC(emoji)}</span>`;
    }
    if (style === "both" && String(platform || "").toLowerCase() === "tiktok") {
      return `${realUrl ? `<img src="${ESC(realUrl)}" class="chat-badge-img" alt="${ESC(key)}" loading="lazy" />` : ""}<span class="badge">${ESC(emoji)}</span>`;
    }
    return `<span class="badge">${ESC(emoji)}</span>`;
  }).join("");
}

function extractTextFromFragments(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") return part.text || part.value || part.content || part.name || part.label || "";
      return "";
    }).filter(Boolean).join("");
  }
  if (typeof value === "object") return value.text || value.value || value.content || value.message || value.name || value.label || "";
  return String(value || "");
}

function parseTwitchEmotes(message, emoteString) {
  const text = String(message ?? "");
  if (!text) return "";
  const ranges = [];
  String(emoteString || "").split("/").forEach((chunk) => {
    const [id, positions] = chunk.split(":");
    if (!id || !positions) return;
    positions.split(",").forEach((pair) => {
      const [start, end] = pair.split("-").map((v) => Number(v));
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) ranges.push({ start, end, id });
    });
  });
  if (!ranges.length) return ESC(text).replace(/\n/g, "<br>");
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  let out = "";
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    out += ESC(text.slice(cursor, range.start));
    const token = text.slice(range.start, range.end + 1);
    out += `<span class="twitchEmote" title="Twitch emote ${ESC(range.id)}">${ESC(token)}</span>`;
    cursor = range.end + 1;
  }
  out += ESC(text.slice(cursor));
  return out.replace(/\n/g, "<br>");
}

function renderMessageFragments(fragments, fallbackText = "") {
  if (Array.isArray(fragments) && fragments.length) {
    return fragments.map((fragment) => {
      if (!fragment || typeof fragment !== "object") return "";
      if (fragment.type === "emote") {
        const url = normalizeImageSource(fragment.url);
        if (!url) return "";
        const alt = ESC(fragment.name || fragment.label || "emote");
        return `<img src="${ESC(url)}" class="chat-emote-img" alt="${alt}" loading="lazy" />`;
      }
      const content = fragment.content ?? fragment.text ?? fragment.value ?? "";
      return ESC(content).replace(/\n/g, "<br>");
    }).join("");
  }
  return ESC(String(fallbackText || "")).replace(/\n/g, "<br>");
}

function renderMessageText(item) {
  const platform = String(item?.platform || "").toLowerCase();
  const stickerLabel = extractTextFromFragments(item?.sticker?.name || item?.sticker?.title || item?.stickerName || item?.stickerText || item?.sticker);
  const raw = [
    item?.message,
    item?.comment,
    item?.text,
    item?.messageText,
    item?.content,
    extractTextFromFragments(item?.fragments),
    extractTextFromFragments(item?.messageFragments),
    extractTextFromFragments(item?.textFragments),
    extractTextFromFragments(item?.commentFragments),
    stickerLabel,
  ].map((v) => String(v || "").trim()).find(Boolean) || "";

  if (Array.isArray(item?.messageFragments) && item.messageFragments.length) {
    return renderMessageFragments(item.messageFragments, raw);
  }

  if (platform === "twitch") return parseTwitchEmotes(raw, item?.emotes);

  const isSticker = normalizeTypeName(item?.type).includes("sticker") || Boolean(stickerLabel);
  if (isSticker) return `🧩 ${ESC(stickerLabel || "Sticker")}`;
  const fallback = item?.action ? String(item.action) : "Mensaje";
  return ESC(raw || fallback).replace(/\n/g, "<br>");
}

function platformTag(platform) {
  const p = String(platform || "tiktok").toLowerCase();
  return `<span class="platformTag ${p}">${p === "twitch" ? "Twitch" : "TikTok"}</span>`;
}

function resolveChatTextColor(value) {
  const map = { auto: "", white: "#eef2ff", black: "#09090b", blue: "#60a5fa", pink: "#f472b6", green: "#4ade80", yellow: "#facc15", cyan: "#67e8f9", orange: "#fb923c" };
  return map[String(value || "auto")] ?? "";
}

function effectShadow(effect, contrastColor) {
  const shadow = String(effect || "none");
  if (shadow === "shadow") return `0 2px 10px ${contrastColor}`;
  if (shadow === "outline") return [`-1px -1px 0 ${contrastColor}`, `1px -1px 0 ${contrastColor}`, `-1px 1px 0 ${contrastColor}`, `1px 1px 0 ${contrastColor}`].join(", ");
  return "none";
}

function effectStroke(effect, contrastColor) { return String(effect || "none") === "outline" ? `1px ${contrastColor}` : "0 transparent"; }
function getRoleAccent(item) {
  const keys = normalizeBadgeKeys(item.badges).map((b) => normalizeTypeName(b));
  if (keys.some((k) => k.includes("broadcaster"))) return "#f472b6";
  if (keys.some((k) => k.includes("mod"))) return "#67e8f9";
  if (keys.some((k) => k.includes("vip"))) return "#f5d063";
  if (keys.some((k) => k.includes("staff"))) return "#a78bfa";
  if (keys.some((k) => k.includes("sub"))) return "#22c55e";
  if (keys.some((k) => k.includes("verified"))) return "#60a5fa";
  return platformColors[String(item.platform || "tiktok").toLowerCase()] || "var(--accent)";
}
function itemAccent(item) { return platformColors[String(item.platform || "tiktok").toLowerCase()] || "var(--accent)"; }
function giftAccent(item) { return String(state.settings.personal.giftHighlightStyle || "gold") === "platform" ? itemAccent(item) : "#f5d063"; }
function frameClass() { return `frame-${state.settings.personal.avatarFrame || "platform"}`; }
function bubbleClass() { return `frame-${state.settings.personal.bubbleFrame || "platform"}`; }
function animationClass() { return `anim-${state.settings.personal.animation || "slide"}`; }
function itemEmoji(item, kind) {
  const type = String(item?.type || kind || "").toLowerCase();
  if (item?.emoji) return String(item.emoji);
  if (type === "gift") return "🎁";
  if (type === "sub" || type === "subscription" || type === "resub" || type === "fanclub" || type === "superfan") return "⭐";
  if (type === "bits") return "💎";
  if (type === "raid" || type === "host") return "⚡";
  if (type === "follow") return "👤";
  if (type === "share") return "🗣";
  if (type === "join" || type === "member") return "👻";
  if (type === "system") return "📣";
  if (type === "like") return "❤️";
  if (type === "question") return "❓";
  if (type === "emote") return "😄";
  return kind === "gift" ? "🎁" : kind === "event" ? "✨" : "💬";
}

function avatarUrl(item) {
  const src = normalizeImageSource(item?.avatar);
  if (src) return src;
  const name = normalizeUsername(item?.displayName || item?.user || item?.uniqueId || "");
  const initial = (name.match(/[A-Za-z0-9]/)?.[0] || "U").toUpperCase();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#1f2937"/><text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#fff">${initial}</text></svg>`)} `;
}

function renderItem(item, kind) {
  const name = item.displayName || item.user || "Usuario";
  const platform = item.platform || "tiktok";
  let accent = kind === "gift" ? giftAccent(item) : itemAccent(item);
  if (kind === "event") accent = getRoleAccent(item);
  const highlightColor = kind === "event" ? accent : accent;
  const roleAccent = getRoleAccent(item);
  const badges = badgeChips(item.badges, platform, item.realBadgeUrls || []);
  const color = String(item?.color || "").trim() || (platform === "twitch" ? platformColors.twitch : "#f4f7ff");
  const textColor = resolveChatTextColor(state.settings.personal.textColor);
  const textContrast = String(state.settings.personal.textColor || "auto") === "black" ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.72)";
  const textShadow = effectShadow(state.settings.personal.messageEffect, textContrast);
  const nameShadow = effectShadow(state.settings.personal.nameEffect, textContrast);
  const nameStroke = effectStroke(state.settings.personal.nameEffect, textContrast);
  const text = kind === "chat" ? renderMessageText(item) : ESC(item.message || (kind === "gift" ? `${name} envió un regalo` : "" )).replace(/\n/g, "<br>");
  const action = kind === "chat" ? (item.action || "Mensaje") : (item.action || kind);
  const bubbleFrame = kind === "chat" ? bubbleClass() : "frame-platform";
  const avatar = avatarUrl(item);
  const hasAvatar = Boolean(avatar);
  const highlightClass = String(item.type || "").toLowerCase() === "gift" ? "support-gold" : "";

  return `
    <article class="${kind === "chat" ? "message" : kind === "gift" ? "giftItem" : "eventItem"} ${kind === "chat" ? animationClass() : ""} ${highlightClass}" style="--item-accent:${accent}; --highlight-color:${highlightColor}; --role-accent:${roleAccent}; --name-color:${color}; --entry-text-color:${textColor || 'var(--text)'}; --entry-text-shadow:${textShadow}; --name-text-shadow:${nameShadow}; --name-stroke:${nameStroke}">
      <div class="entryAvatarWrap ${frameClass()} ${hasAvatar ? "" : "no-avatar"}">
        <img class="entryAvatar" src="${hasAvatar ? ESC(avatar) : BLANK_PIXEL}" alt="avatar" loading="lazy" ${hasAvatar ? "" : 'style="display:none"'} />
      </div>
      <div class="entryBody">
        <div class="entryBubble ${bubbleFrame}">
          <div class="entryTop">
            <span class="user">${ESC(name)}</span>
            <span class="itemEmoji">${ESC(itemEmoji(item, kind))}</span>
            ${platformTag(platform)}
            <span class="actionTag">${ESC(action)}</span>
          </div>
          <div class="entryText">${text}</div>
          ${item.gift ? `<div class="entryActionLine"><span class="giftTag">🎁 ${ESC(item.gift)}</span>${item.amount ? `<span class="kindTag">x${ESC(item.amount)}</span>` : ""}</div>` : ""}
          ${badges ? `<div class="entryMeta">${badges}</div>` : ""}
        </div>
      </div>
    </article>`;
}

function clearByAge(items, enabled, seconds) {
  if (!enabled) return items;
  const maxAge = Math.max(10, Number(seconds || 30)) * 1000;
  const cutoff = Date.now() - maxAge;
  return items.filter((item) => (item.timestamp || 0) >= cutoff);
}

function applyBodySettings() {
  const theme = state.settings.personal.theme || "dark";
  document.body.classList.remove("theme-dark", "theme-matrix", "theme-neon", "theme-sunset", "theme-aurora");
  document.body.classList.add(`theme-${theme}`);
  document.body.classList.remove("chat-theme-glass", "chat-theme-cloud", "chat-theme-bubble", "chat-theme-neon", "chat-theme-minimal", "chat-theme-aurora", "chat-theme-comic", "chat-theme-holo", "chat-theme-ribbon");
  document.body.classList.add(`chat-theme-${state.settings.personal.chatTheme || "cloud"}`);
  document.body.style.setProperty("--app-font", {
    inter: 'Inter, Segoe UI, Arial, sans-serif',
    system: 'Segoe UI, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    serif: 'Georgia, "Times New Roman", serif',
    emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Segoe UI, Arial, sans-serif',
  }[state.settings.personal.font || "inter"] || 'Inter, Segoe UI, Arial, sans-serif');
  document.body.dataset.order = state.settings.order || "events-gifts";
}

function syncOverlayListClass() {
  const layout = view === "chat"
    ? (state.settings.personal.chatLayout || "vertical")
    : view === "events"
      ? (state.settings.personal.eventsLayout || "vertical")
      : (state.settings.personal.giftsLayout || "vertical");
  const direction = view === "chat"
    ? (state.settings.personal.chatDirection || "down")
    : view === "events"
      ? (state.settings.personal.eventsDirection || "down")
      : (state.settings.personal.giftsDirection || "down");
  const size = view === "chat"
    ? (state.settings.personal.chatHorizontalMode || "normal")
    : view === "events"
      ? (state.settings.personal.eventsPanelSize || "normal")
      : (state.settings.personal.giftsPanelSize || "normal");
  list.className = `overlayList layout-${layout} direction-${direction} size-${size}`;
}

let state = {
  settings: loadJSON(SETTINGS_KEY, defaults),
  chat: [],
  events: [],
  gifts: [],
  supporters: loadJSON(SUPPORTERS_KEY, { tiktok: {}, twitch: {} }),
  activityBadges: loadJSON(ACTIVITY_BADGES_KEY, { tiktok: {}, twitch: {} }),
  session: loadJSON(SESSION_KEY, { tiktok: {}, twitch: {} }),
};
const view = new URLSearchParams(location.search).get('view') || 'chat';

function migrateSettings(settingsObj) {
  const s = settingsObj || {};
  if (!s.panels) s.panels = structuredClone(defaults.panels);
  if (!s.filters) s.filters = structuredClone(defaults.filters);
  if (!s.personal) s.personal = {};
  const p = s.personal;
  p.badgeType = p.badgeType || p.badgeStyle || "emoji";
  p.badgeStyle = p.badgeStyle || p.badgeType || "emoji";
  return mergeDeep(structuredClone(defaults), s);
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) return migrateSettings(loadJSON(SETTINGS_KEY, defaults));
  const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (legacy) {
    try { return migrateSettings(mergeDeep(structuredClone(defaults), JSON.parse(legacy))); } catch {}
  }
  return structuredClone(defaults);
}

function updateFromStorage() {
  state.supporters = loadJSON(SUPPORTERS_KEY, { tiktok: {}, twitch: {} });
  state.activityBadges = loadJSON(ACTIVITY_BADGES_KEY, { tiktok: {}, twitch: {} });
  state.session = loadJSON(SESSION_KEY, { tiktok: {}, twitch: {} });
}

function pushChat(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: normalizeImageSource(data.avatar),
    messageFragments: Array.isArray(data.messageFragments) ? data.messageFragments : [],
    realBadgeUrls: Array.isArray(data.realBadgeUrls) ? data.realBadgeUrls : [],
    timestamp: data.timestamp || Date.now(),
  };
  state.chat.push(item);
  if (state.chat.length > 240) state.chat.splice(0, state.chat.length - 240);
  state.chat = clearByAge(state.chat, state.settings.personal.autoClearChat, state.settings.personal.clearChatSeconds);
  render();
}

function pushEvent(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: normalizeImageSource(data.avatar),
    messageFragments: Array.isArray(data.messageFragments) ? data.messageFragments : [],
    realBadgeUrls: Array.isArray(data.realBadgeUrls) ? data.realBadgeUrls : [],
    timestamp: data.timestamp || Date.now(),
  };
  const type = String(item.type || "event").toLowerCase();
  if (type === "gift") { pushGift(item); return; }
  state.events.unshift(item);
  if (state.events.length > 240) state.events.length = 240;
  state.events = clearByAge(state.events, state.settings.personal.eventsAutoClear, state.settings.personal.eventsClearSeconds);
  render();
}

function pushGift(data) {
  const item = {
    ...data,
    platform: data.platform || "tiktok",
    group: "gift",
    user: data.user || data.displayName || "Usuario",
    displayName: data.displayName || data.user || "Usuario",
    avatar: normalizeImageSource(data.avatar),
    messageFragments: Array.isArray(data.messageFragments) ? data.messageFragments : [],
    realBadgeUrls: Array.isArray(data.realBadgeUrls) ? data.realBadgeUrls : [],
    timestamp: data.timestamp || Date.now(),
  };
  state.gifts.unshift(item);
  if (state.gifts.length > 240) state.gifts.length = 240;
  state.gifts = clearByAge(state.gifts, state.settings.personal.giftsAutoClear, state.settings.personal.giftsClearSeconds);
  render();
}

function render() {
  applyBodySettings();
  syncOverlayListClass();

  const items = view === 'chat' ? state.chat : view === 'events' ? state.events : state.gifts;
  const direction = view === 'chat'
    ? (state.settings.personal.chatDirection || 'down')
    : view === 'events'
      ? (state.settings.personal.eventsDirection || 'down')
      : (state.settings.personal.giftsDirection || 'down');
  const reverse = String(direction || 'down') === 'up' || String(direction || 'down') === 'left';
  const rows = items.slice().sort((a, b) => reverse ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0));

  list.innerHTML = rows.length
    ? rows.map((item) => renderItem(item, view === 'chat' ? 'chat' : (String(item.type || '').toLowerCase() === 'gift' || view === 'gifts' ? 'gift' : 'event'))).join('')
    : `<div class="overlayEmpty"><strong>Sin contenido</strong><span>Cuando haya actividad, aparecerá aquí.</span></div>`;
}

function applySettings(nextSettings) {
  state.settings = migrateSettings(mergeDeep(structuredClone(defaults), nextSettings || {}));
  render();
}

socket.on('settings', (serverSettings) => applySettings(serverSettings));
socket.on('chat', (data) => pushChat(data || {}));
socket.on('event', (data) => {
  const type = String(data?.type || '').toLowerCase();
  if (type === 'gift' || type === 'sub' || type === 'bits' || type === 'raid' || type === 'host') {
    pushGift(data || {});
    return;
  }
  pushEvent(data || {});
});
window.addEventListener('storage', (ev) => {
  if (ev.key === SETTINGS_KEY || ev.key === LEGACY_SETTINGS_KEY) applySettings(loadSettings());
  if (ev.key === SESSION_KEY || ev.key === SUPPORTERS_KEY || ev.key === ACTIVITY_BADGES_KEY) { updateFromStorage(); render(); }
});

render();
