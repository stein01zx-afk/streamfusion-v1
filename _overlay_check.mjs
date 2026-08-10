</script>
  
  <style>
    html, body { width:100%; height:100%; margin:0; background:transparent !important; overflow:hidden; font-family: var(--app-font, Inter, Segoe UI, Arial, sans-serif); }
    body.overlay-mode { background:transparent !important; overflow:hidden; }

    .overlayRoot {
      width:100%;
      height:100%;
      display:flex;
      padding:12px;
      box-sizing:border-box;
      background:transparent;
    }
    .overlayList {
      width:100%;
      height:100%;
      display:flex;
      flex-direction:column;
      gap:12px;
      overflow:auto;
      scrollbar-width:thin;
      min-height:0;
      align-content:start;
      background:transparent;
    }
    .overlayList::-webkit-scrollbar { width: 8px; height: 8px; }
    .overlayList.layout-horizontal { align-items:stretch; scroll-snap-type:x proximity; }
    .overlayList.layout-horizontal.mode-slide {
      display:flex;
      flex-direction:row;
      flex-wrap:nowrap;
      overflow-x:auto;
      overflow-y:hidden;
    }
    .overlayList.layout-horizontal.mode-slide.direction-right { direction: rtl; }
    .overlayList.layout-horizontal.mode-slide.direction-left { direction: ltr; }
    .overlayList.layout-horizontal.mode-slide .overlayItem { flex:0 0 auto; scroll-snap-align:start; align-self:flex-start; }
    .overlayList.layout-horizontal.mode-normal {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(min(100%, var(--panel-card-width, 320px)),1fr));
      overflow:auto;
    }
    .overlayList.layout-horizontal.mode-slide.size-compact .overlayItem { width:min(300px, 84vw); }
    .overlayList.layout-horizontal.mode-slide.size-normal .overlayItem { width:min(360px, 88vw); }
    .overlayList.layout-horizontal.mode-slide.size-wide .overlayItem { width:min(460px, 92vw); }
    .overlayList.layout-vertical { align-items:flex-start; }
    .overlayList.layout-vertical .overlayItem { width:min(100%, 560px); }

    .overlayItem {
      display:grid;
      grid-template-columns:60px minmax(0,1fr);
      gap:14px;
      align-items:start;
      width:100%;
      min-width:0;
      min-height:128px;
      padding:19px;
      border-radius:24px;
      background:rgba(255,255,255,.035);
      border:1px solid var(--line);
      box-shadow:0 16px 44px rgba(0,0,0,.24);
      backdrop-filter: blur(16px);
      position:relative;
      overflow:hidden;
      color:var(--text, #eef4ff);
    }
    .overlayItem::before {
      content:"";
      position:absolute;
      inset:0;
      border-radius:inherit;
      border:1px solid color-mix(in srgb, var(--item-accent) 58%, transparent);
      pointer-events:none;
      opacity:.62;
    }
    .overlayItem .entryAvatarWrap { width:60px; height:60px; --avatar-size:60px; flex:0 0 auto; }
    .overlayItem .entryBubble { flex:1; min-width:0; }
    .overlayItem .entryTop { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:4px; }
    .overlayItem .user { color:var(--name-color, #f4f7ff); text-shadow:var(--name-text-shadow, none); -webkit-text-stroke:var(--name-stroke, 0 transparent); }
    .overlayItem .supporter-highlight .user { color:#f5d063 !important; font-weight:900; }
    .overlayItem.support-gold .user { color:#f5d063 !important; font-weight:900; }
    .overlayItem.support-gold .entryBubble {
      background:linear-gradient(180deg, rgba(245,208,99,.16), rgba(255,255,255,.03));
      border-color:rgba(245,208,99,.30);
    }
    .overlayItem .entryText { color:var(--entry-text-color, #eaf1ff); line-height:1.58; font-size:calc(15px * var(--entry-text-scale, 1)); word-break:break-word; text-shadow:var(--entry-text-shadow, none); text-wrap:pretty; }
    .overlayItem .entryActivityBadges,
    .overlayItem .activityBadges { display:inline-flex; gap:4px; flex-wrap:wrap; align-items:center; }
    .overlayItem .badge { background:rgba(255,255,255,.06); color:#fff; }
    .overlayItem .activityBadge { background:rgba(245,208,99,.12); border-color:rgba(245,208,99,.20); }
    .overlayItem .overlayMeta { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; }
    .overlayItem .itemEmoji,
    .overlayItem .platformTag,
    .overlayItem .actionTag,
    .overlayItem .timeTag { font-size:12px; color:var(--muted, #aab5d0); white-space:nowrap; }
    .overlayItem .actionTag { color:var(--item-accent); }
    .overlayItem .platformTag.tiktok { color:#fe2c55; }
    .overlayItem .platformTag.twitch { color:#9146ff; }
    .overlayItem .timeTag { margin-left:auto; }
    .overlayItem .giftMedia { margin-top:10px; display:flex; flex-direction:column; gap:8px; }
    .overlayItem .giftMediaImg { width:min(220px, 100%); height:auto; border-radius:18px; border:1px solid rgba(255,255,255,.12); box-shadow:0 12px 24px rgba(0,0,0,.22); }
    .overlayItem .giftMediaMeta { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .overlayItem .giftCoinBadge { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:999px; background:rgba(245,208,99,.12); color:#f5d063; font-size:12px; font-weight:800; }
    .overlayItem .giftCoinBadge img { width:14px; height:14px; object-fit:contain; }
    .overlayEmpty { margin:auto; text-align:center; color:var(--muted, #aab5d0); padding:24px 12px; }
    .overlayEmpty strong { display:block; color:var(--text, #eef4ff); margin-bottom:6px; font-size:16px; }

    .overlayItem {
      overflow: visible !important;
      height: auto !important;
      min-height: unset !important;
      align-items: flex-start !important;
    }
    .overlayItem .entryBubble,
    .overlayItem .bubble {
      overflow: visible !important;
      min-width: 0;
      width: 100%;
    }
    .overlayItem .entryTop { align-items: flex-start; }
    .overlayItem .user {
      min-width: 0;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .overlayItem .entryText,
    .overlayItem .bubble .text {
      max-height: none !important;
      overflow: visible !important;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: normal;
      width: 100%;
    }
    .overlayItem .overlayMeta { width: 100%; }
  </style>

</head>
<body class="overlay-mode theme-dark">
  <div class="overlayRoot"><div class="overlayList" id="list"></div></div>
  <script>
    const socket = io();
    const list = document.getElementById('list');
    const SETTINGS_KEY = "streamfusion.ui.settings.v2";
    const LEGACY_SETTINGS_KEY = "streamfusion.ui.settings.v1";
    const SUPPORTERS_KEY = "streamfusion.ui.supporters.v1";
    const ACTIVITY_BADGES_KEY = "streamfusion.ui.activityBadges.v1";

    const defaults = { personal: { theme:"dark", font:"inter", animation:"slide", chatLayout:"vertical", chatDirection:"down", chatTheme:"cloud", avatarFrame:"platform", bubbleFrame:"platform", avatarSize:"md", nameSize:"md", nameWeight:"800", chatHorizontalMode:"normal", chatAdjustMessages:false, badgeStyle:"emoji", twitchNameColor:"real", tiktokNameColor:"white", messageEffect:"shadow", nameEffect:"shadow", textColor:"auto", showBadges:true, showEmotes:true, highlightSupporters:true, highlightSupportersTikTok:true, highlightSupportersTwitch:true, supporterHighlightStyle:"gold", eventsLayout:"vertical", eventsDirection:"down", eventsMode:"slide", eventsPanelSize:"normal", eventsCardFrame:true, eventsAutoClear:false, eventsClearSeconds:30, giftsLayout:"vertical", giftsDirection:"down", giftsMode:"slide", giftsPanelSize:"normal", giftsCardFrame:true, giftsAutoClear:false, giftsClearSeconds:30, highlightStyle:"platform", giftHighlightStyle:"gold", highlightEventUsername:true, highlightLikes:true, highlightFollows:true, highlightJoins:true, highlightShares:true, highlightSystem:true, highlightFanclub:true, highlightSuperfan:true, highlightGifts:true, highlightSubs:true, highlightBits:true, highlightRaids:true, autoClearChat:false, clearChatSeconds:30, tiktokAvatarUrl:"" } };
    let settings = loadSettings();
    let state = { chat:[], events:[], gifts:[], supporters: loadJSON(SUPPORTERS_KEY, { tiktok:{}, twitch:{} }), activityBadges: loadJSON(ACTIVITY_BADGES_KEY, { tiktok:{}, twitch:{} }) };
    let followState = { chat:true, events:true, gifts:true };
    const view = new URLSearchParams(location.search).get("view") || "chat";
    const platformColors = { tiktok: "#fe2c55", twitch: "#9146ff" };
    const roleBadges = {
      broadcaster: { emoji: "👑", color: "#f5d063" },
      moderator: { emoji: "🛡️", color: "#60a5fa" },
      vip: { emoji: "💎", color: "#22c55e" },
      subscriber: { emoji: "⭐", color: "#a78bfa" },
      staff: { emoji: "🧰", color: "#f97316" },
      verified: { emoji: "✅", color: "#22c55e" },
      founder: { emoji: "🏁", color: "#f5d063" },
      premium: { emoji: "✨", color: "#fb7185" },
      tiktok: { emoji: "🎵", color: "#fe2c55" },
      twitch: { emoji: "🟣", color: "#9146ff" },
    };
    const ACTIVITY_BADGE_RULES = [
      { emoji:'🎁',label:'Envió regalo' },
      { emoji:'⭐',label:'Suscripción' },
      { emoji:'💎',label:'Bits' },
      { emoji:'⚡',label:'Raid' },
      { emoji:'🗣',label:'Compartió' },
      { emoji:'👻',label:'Se unió' },
      { emoji:'➕',label:'Siguió' },
      { emoji:'❤️',label:'Dio like' }
    ];

    function esc(v){return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
    function mergeDeep(base, incoming){ if(Array.isArray(base)||Array.isArray(incoming)) return incoming ?? base; if(typeof base !== 'object' || base===null) return incoming ?? base; if(typeof incoming !== 'object' || incoming===null) return base; const out={...base}; for(const k of Object.keys(incoming)) out[k] = k in base ? mergeDeep(base[k], incoming[k]) : incoming[k]; return out; }
    function loadJSON(key,fallback){ try{ const raw=localStorage.getItem(key); if(!raw) return structuredClone(fallback); return mergeDeep(structuredClone(fallback), JSON.parse(raw)); } catch { return structuredClone(fallback); } }
    function normalizeImageSource(value){ const src = String(value ?? "").trim(); if(!src) return ""; if(/^https?:\/\//i.test(src)) return src; if(/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src; return ""; }
    function normalizeUsername(value){ return String(value||'').trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i,'').replace(/^https?:\/\/(www\.)?twitch\.tv\//i,'').replace(/^@+/, '').replace(/^#+/, '').split(/[/?#]/)[0].trim(); }
    function normalizeTypeName(value){ return String(value || '').trim().toLowerCase(); }
    function migrateSettings(settingsObj){ const s=settingsObj||{}; if(!s.personal) s.personal={}; const p=s.personal; if(p.highlightSupportersTikTok===undefined) p.highlightSupportersTikTok = p.highlightSupporters !== false; if(p.highlightSupportersTwitch===undefined) p.highlightSupportersTwitch = p.highlightSupporters !== false; if(p.chatAdjustMessages===undefined) p.chatAdjustMessages = false; if(p.eventsCardFrame===undefined) p.eventsCardFrame = true; if(p.eventsMode===undefined) p.eventsMode = "slide"; if(p.eventsAutoClear===undefined) p.eventsAutoClear = false; if(p.eventsClearSeconds===undefined) p.eventsClearSeconds = 30; if(p.giftsCardFrame===undefined) p.giftsCardFrame = true; if(p.giftsMode===undefined) p.giftsMode = "slide"; if(p.giftsAutoClear===undefined) p.giftsAutoClear = false; if(p.giftsClearSeconds===undefined) p.giftsClearSeconds = 30; return s; }
    function loadSettings(){ const saved=localStorage.getItem(SETTINGS_KEY); if(saved) return migrateSettings(loadJSON(SETTINGS_KEY, defaults)); const legacy=localStorage.getItem(LEGACY_SETTINGS_KEY); if(legacy){ try{return migrateSettings(mergeDeep(structuredClone(defaults), JSON.parse(legacy)));}catch{return structuredClone(defaults);} } return migrateSettings(structuredClone(defaults)); }
    function fontFamily(font){ const map = { inter: 'Inter, Segoe UI, Arial, sans-serif', system: 'Segoe UI, Arial, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', serif: 'Georgia, "Times New Roman", serif', emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Segoe UI, Arial, sans-serif' }; return map[String(font || 'inter')] || map.inter; }
    function resolveTextColor(value){ const map = { auto: "", white: "#eef2ff", black: "#09090b", blue: "#60a5fa", pink: "#f472b6", green: "#4ade80", yellow: "#facc15", cyan: "#67e8f9", orange: "#fb923c" }; return map[String(value || "auto")] ?? ""; }
    function effectContrastColor(textColor){ return String(textColor || "").toLowerCase() === "black" ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.72)"; }
    function effectShadow(effect, contrastColor){ const shadow = String(effect || "none"); if(shadow === "shadow") return `0 2px 10px ${contrastColor}`; if(shadow === "outline") return [`-1px -1px 0 ${contrastColor}`, `1px -1px 0 ${contrastColor}`, `-1px 1px 0 ${contrastColor}`, `1px 1px 0 ${contrastColor}`].join(", "); return "none"; }
    function effectStroke(effect, contrastColor){ return String(effect || "none") === "outline" ? `1px ${contrastColor}` : "0 transparent"; }
    function resolveChatTextColor(value) { return resolveTextColor(value); }
    function parseTwitchEmotes(message, emoteString) {
      const text = String(message ?? "");
      if (!text) return "";
      if (!settings.personal.showEmotes || String(emoteString || "").trim() === "") return esc(text).replace(/\n/g, "<br>");
      const ranges = [];
      String(emoteString).split("/").forEach((chunk) => {
        const [id, positions] = chunk.split(":");
        if (!id || !positions) return;
        positions.split(",").forEach((pair) => {
          const [start, end] = pair.split("-").map((v) => Number(v));
          if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) ranges.push({ start, end, id });
        });
      });
      if (!ranges.length) return esc(text).replace(/\n/g, "<br>");
      ranges.sort((a, b) => a.start - b.start || a.end - b.end);
      let out = "";
      let cursor = 0;
      for (const range of ranges) {
        if (range.start < cursor) continue;
        out += esc(text.slice(cursor, range.start));
        const token = text.slice(range.start, range.end + 1);
        out += `<span class="twitchEmote" title="Twitch emote ${esc(range.id)}">${esc(token)}</span>`;
        cursor = range.end + 1;
      }
      out += esc(text.slice(cursor));
      return out.replace(/\n/g, "<br>");
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
    function renderMessageText(item) {
      const platform = String(item?.platform || "").toLowerCase();
      const stickerLabel = extractTextFromFragments(item?.sticker?.name || item?.sticker?.title || item?.stickerName || item?.stickerText || item?.sticker);
      const raw = [ item?.message, item?.comment, item?.text, item?.messageText, item?.content, extractTextFromFragments(item?.fragments), extractTextFromFragments(item?.messageFragments), extractTextFromFragments(item?.textFragments), extractTextFromFragments(item?.commentFragments), stickerLabel ].map((v) => String(v || "").trim()).find(Boolean) || "";
      if (platform === "twitch") return parseTwitchEmotes(raw, item?.emotes);
      const isSticker = normalizeTypeName(item?.type).includes("sticker") || Boolean(stickerLabel);
      if (isSticker) return `🧩 ${esc(stickerLabel || "Sticker")}`;
      const fallback = item?.action ? String(item.action) : "Mensaje";
      return esc(raw || fallback).replace(/\n/g, "<br>");
    }
    function getRenderedMessage(item){ return renderMessageText(item); }
    function normalizeBadgeKeys(raw){ if(!raw) return []; const items=[]; const push=(k)=>{ const c=String(k||'').trim(); if(c) items.push(c); }; if(Array.isArray(raw)) raw.forEach((item)=>{ if(typeof item==='string') push(item); else if(item && typeof item==='object') push(item.name || item.type || item.label || item.id); }); else if(typeof raw==='object') Object.entries(raw).forEach(([k,v])=>{ if(v===false || v==null) return; push(k); }); else if(typeof raw==='string') raw.split(/[\,\s|]+/).forEach(push); return items; }
    function badgeEmoji(key, platform){ const lower=String(key||'').toLowerCase(); if(roleBadges[lower]) return roleBadges[lower].emoji; if(lower === 'mod') return roleBadges.moderator.emoji; if(lower === 'broadcaster') return roleBadges.broadcaster.emoji; if(lower === 'sub' || lower === 'subscriber') return roleBadges.subscriber.emoji; if(lower === 'vip') return roleBadges.vip.emoji; if(lower === 'verified') return roleBadges.verified.emoji; if(lower === 'staff') return roleBadges.staff.emoji; if(lower === 'founder') return roleBadges.founder.emoji; if(lower === 'premium') return roleBadges.premium.emoji; if(lower === 'tiktok') return roleBadges.tiktok.emoji; if(lower === 'twitch') return roleBadges.twitch.emoji; if(lower.includes('mod')) return roleBadges.moderator.emoji; if(lower.includes('vip')) return roleBadges.vip.emoji; if(lower.includes('sub')) return roleBadges.subscriber.emoji; return platform === 'tiktok' ? '🎵' : '🟣'; }
    function badgeText(key){ const lower=String(key||'').toLowerCase(); if(lower.includes('broadcaster')) return 'Broadcaster'; if(lower.includes('mod')) return 'Mod'; if(lower.includes('vip')) return 'VIP'; if(lower.includes('sub')) return 'Sub'; if(lower.includes('staff')) return 'Staff'; if(lower.includes('verified')) return 'Verified'; if(lower.includes('founder')) return 'Founder'; if(lower.includes('premium')) return 'Premium'; if(lower.includes('tiktok')) return 'TikTok'; if(lower.includes('twitch')) return 'Twitch'; return lower.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }
    function badgeChips(raw, platform){ const keys = normalizeBadgeKeys(raw); if(!settings.personal.showBadges) return ''; const style = settings.personal.badgeStyle || 'emoji'; return keys.map((key) => `<span class="badge">${esc(style === 'compact' ? badgeText(key) : badgeEmoji(key, platform))}</span>`).join(''); }
    function activityBadgeKeys(item){ return [...new Set([normalizeUsername(item?.user||''), normalizeUsername(item?.displayName||''), normalizeUsername(item?.uniqueId||''), normalizeUsername(item?.username||'')].filter(Boolean))]; }
    function activityBadgeMarkup(item){ if(!settings.personal.showBadges) return ''; const platform=String(item?.platform||'tiktok').toLowerCase(); const keys=activityBadgeKeys(item); const entry=keys.map((key)=>state.activityBadges?.[platform]?.[key]).find((value)=>value?.badges); if(!entry?.badges) return ''; return ACTIVITY_BADGE_RULES.filter((rule)=>entry.badges[rule.emoji]).map((rule)=>`<span class="badge activityBadge" title="${esc(rule.label)}">${esc(rule.emoji)}</span>`).join(''); }
    function supporterKey(item){ return normalizeUsername(item?.user || item?.displayName || item?.username || item?.uniqueId || ''); }
    function supporterHighlightEnabled(platform){ const key = String(platform || 'tiktok').toLowerCase(); if (key === 'twitch') return settings.personal.highlightSupportersTwitch !== false; return settings.personal.highlightSupportersTikTok !== false; }
    function isSupporterProfile(item){ if (!item) return false; const platform = String(item?.platform || 'tiktok').toLowerCase(); const key = supporterKey(item); return Boolean(key && state.supporters?.[platform]?.[key]); }
    const GIFT_KEY_RE = /[^a-z0-9]+/g;
    function normalizeGiftKey(value) { return String(value || "").trim().toLowerCase().replace(GIFT_KEY_RE, ""); }
    let giftCatalogPromise = null;
    let giftCatalogIndex = new Map();
    async function ensureGiftCatalog() {
      if (giftCatalogPromise) return giftCatalogPromise;
      giftCatalogPromise = fetch("/data/tiktok-gifts.json")
        .then(async (res) => { if (!res.ok) throw new Error("gift catalog load failed"); return res.json(); })
        .then((data) => {
          const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
          giftCatalogIndex = new Map();
          for (const item of items) {
            const keys = [item?.id, item?.key, item?.name, item?.alt].map(normalizeGiftKey).filter(Boolean);
            for (const key of keys) if (!giftCatalogIndex.has(key)) giftCatalogIndex.set(key, item);
          }
          return items;
        })
        .catch(() => { giftCatalogIndex = new Map(); return []; });
      return giftCatalogPromise;
    }
    function lookupGiftCatalog(name) { const key = normalizeGiftKey(name); return key ? (giftCatalogIndex.get(key) || null) : null; }
    function avatarForItem(item){ return normalizeImageSource(item?.avatar || item?.avatarUrl || ""); }
    function timeLabel(ts){ return new Date(ts || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }); }
    function platformTag(platform){ return `<span class="platformTag ${platform}">${platform === 'twitch' ? 'Twitch' : 'TikTok'}</span>`; }
    function getRoleAccent(item){ const badges = normalizeBadgeKeys(item.badges); const rawKeys = Array.isArray(item.badges) ? item.badges.map((b) => String(b || "").toLowerCase()) : item.badges && typeof item.badges === "object" ? Object.keys(item.badges).map((k) => String(k || "").toLowerCase()) : []; if (rawKeys.some((k) => k.includes("broadcaster"))) return roleBadges.broadcaster.color; if (rawKeys.some((k) => k.includes("mod"))) return roleBadges.moderator.color; if (rawKeys.some((k) => k.includes("vip"))) return roleBadges.vip.color; if (rawKeys.some((k) => k.includes("staff"))) return roleBadges.staff.color; if (rawKeys.some((k) => k.includes("sub"))) return roleBadges.subscriber.color; if (rawKeys.some((k) => k.includes("verified"))) return roleBadges.verified.color; return badges.length ? platformColors[item.platform] : platformColors[item.platform]; }
    function itemAccent(item){ const frameMode = settings.personal.avatarFrame || "platform"; if (frameMode === "none") return "transparent"; if (frameMode === "role") return getRoleAccent(item); return platformColors[item.platform] || "var(--accent)"; }
    function giftAccent(item){ const mode = String(settings.personal.giftHighlightStyle || "gold"); if (mode === "platform") return platformColors[item.platform] || platformColors.tiktok || "#f5d063"; return "#f5d063"; }
    function frameClass(){ return `frame-${settings.personal.avatarFrame || "platform"}`; }
    function animationClass(){ return `anim-${settings.personal.animation || "slide"}`; }
    function themeClass(){ return `theme-${settings.personal.theme || "dark"}`; }
    function autoMessageScale(text) { const len = String(text || "").length; return Math.max(0.74, Math.min(1, 1 - Math.max(0, len - 80) / 720)); }
    function itemEmoji(item, kind){ const type = String(item?.type || kind || "").toLowerCase(); const group = String(item?.group || "").toLowerCase(); if (item?.emoji) return String(item.emoji); if (group === "gift" || type === "gift") return "🎁"; if (type === "sub" || type === "subscription" || type === "resub" || type === "fanclub" || type === "superfan" || type === "super_fan") return "⭐"; if (type === "bits" || type === "superchat") return "💎"; if (type === "raid" || type === "host") return "⚡"; if (type === "follow") return "👤"; if (type === "share") return "🗣"; if (type === "join" || type === "member") return "👻"; if (type === "system") return "📣"; if (type === "like") return "❤️"; if (type === "heartme") return "❤️‍🔥"; if (type === "question") return "❓"; if (type === "emote") return "😄"; if (kind === "chat") return "💬"; return String(item?.platform || "") === "twitch" ? "🟣" : "🎵"; }
    function highlightColorFor(item, kind) { const mode = String(settings.personal.highlightStyle || "platform"); const platform = String(item?.platform || "tiktok").toLowerCase(); if (mode === "platform") return platformColors[platform] || platformColors.tiktok; if (mode === "gold") return "#f5d063"; if (kind !== "event") return platformColors[platform] || platformColors.tiktok; const type = normalizeTypeName(item?.type); const group = normalizeTypeName(item?.group); const hit = (value) => type.includes(value) || group.includes(value); if (hit("like")) return "#ef4444"; if (hit("follow")) return "#3b82f6"; if (hit("share")) return "#22c55e"; if (hit("join") || hit("member") || hit("heartme") || hit("fanclub") || hit("superfan")) return "#f97316"; if (hit("gift")) return "#fb923c"; if (hit("sub") || hit("subscription") || hit("resub") || hit("superfanjoin")) return "#a78bfa"; if (hit("bits") || hit("superchat")) return "#22d3ee"; if (hit("raid") || hit("host")) return "#facc15"; if (hit("system")) return "#94a3b8"; return platformColors[platform] || "#f5d063"; }
    function isHighlightedEntry(item, kind) { const type = normalizeTypeName(item?.type); const group = normalizeTypeName(item?.group); const hasSupport = isSupporterProfile(item); const supporterOn = settings.personal.highlightSupporters !== false; if (kind === "chat" && hasSupport && supporterOn) return "supporter-highlight support-gold"; if (kind !== "event" && kind !== "gift") return ""; const generic = { like: settings.personal.highlightLikes !== false, follow: settings.personal.highlightFollows !== false, join: settings.personal.highlightJoins !== false, share: settings.personal.highlightShares !== false, system: settings.personal.highlightSystem !== false, gift: settings.personal.highlightGifts !== false, sub: settings.personal.highlightSubs !== false, subscription: settings.personal.highlightSubs !== false, resub: settings.personal.highlightSubs !== false, bits: settings.personal.highlightBits !== false, raid: settings.personal.highlightRaids !== false, host: settings.personal.highlightRaids !== false, superchat: settings.personal.highlightBits !== false, }; const hit = Object.entries(generic).some(([needle, enabled]) => enabled && (type.includes(needle) || group.includes(needle))); if (!hit) return ""; return kind === "gift" ? "support-gold" : `highlight-${String(settings.personal.highlightStyle || "platform")}`; }

    function itemHtml(item, kind){
      const name = item.displayName || item.user || 'Usuario';
      const platform = String(item.platform || 'tiktok').toLowerCase();
      const isGift = kind === 'gift';
      const isChat = kind === 'chat';
      const isSupporter = isChat && isSupporterProfile(item) && settings.personal.highlightSupporters !== false && supporterHighlightEnabled(platform);
      const highlightClass = isHighlightedEntry(item, kind);
      const rawText = isChat ? getRenderedMessage(item) : isGift ? esc(item.message || `${name} envió un regalo`).replace(/\n/g,'<br>') : esc(item.message || '').replace(/\n/g,'<br>');
      const textScale = isChat && settings.personal.chatAdjustMessages === true ? autoMessageScale(rawText) : 1;
      const textColor = resolveChatTextColor(isGift || isSupporter ? 'yellow' : (platform === 'twitch' ? settings.personal.twitchNameColor : settings.personal.textColor));
      const nameTextColor = platform === 'twitch' ? settings.personal.twitchNameColor : settings.personal.textColor;
      const textContrast = effectContrastColor(nameTextColor);
      const textShadow = effectShadow(settings.personal.messageEffect, textContrast);
      const nameShadow = effectShadow(settings.personal.nameEffect, textContrast);
      const nameStroke = effectStroke(settings.personal.nameEffect, textContrast);
      const color = isGift || isSupporter ? '#f5d063' : (platform === 'twitch' ? (settings.personal.twitchNameColor === 'white' ? '#f4f7ff' : platformColors.twitch) : '#f4f7ff');
      const accent = isGift ? '#f5d063' : (platformColors[platform] || platformColors.tiktok);
      const bubbleFrame = isChat ? (settings.personal.bubbleFrame || 'platform') : (kind === 'event' ? (settings.personal.eventsCardFrame !== false ? 'frame-platform' : 'frame-none') : (settings.personal.giftsCardFrame !== false ? 'frame-platform' : 'frame-none'));
      const action = isChat ? (item.action || 'Comentario') : (item.action || kind);
      const topBadges = isChat ? activityBadgeMarkup(item) : badgeChips(item.badges, platform);
      const metaBadges = isChat ? badgeChips(item.badges, platform) : "";
      const avatar = avatarForItem(item);
      const hasAvatar = Boolean(avatar);
      const gift = lookupGiftCatalog(item.gift || item.giftName || item.giftAlt || "");
      const giftName = item.gift || item.giftName || gift?.name || gift?.alt || "Regalo";
      const giftImage = normalizeImageSource(item.giftImage || gift?.image || "");
      const giftCoins = Number(item.giftCoins ?? gift?.coins ?? 0) || 0;
      const giftMeta = (isGift && (giftName || giftCoins || item.amount))
        ? `<div class="giftMedia">${giftImage ? `<img class="giftMediaImg" src="${esc(giftImage)}" alt="${esc(item.giftAlt || giftName)}" loading="lazy" onerror="this.style.display='none'">` : ""}<div class="giftMediaMeta">${giftName ? `<span class="giftTag">🎁 ${esc(giftName)}</span>` : ""}${giftCoins ? `<span class="giftCoinBadge"><img src="/coin-logo.png" alt="" aria-hidden="true"> ${esc(giftCoins)}</span>` : ""}${item.amount ? `<span class="kindTag">x${esc(item.amount)}</span>` : ''}</div></div>`
        : "";
      return `<article class="overlayItem ${highlightClass}" style="--item-accent:${accent};--name-color:${color};--entry-text-scale:${textScale};--entry-text-color:${textColor || 'var(--text, #eaf1ff)'};--entry-text-shadow:${textShadow};--name-text-shadow:${nameShadow};--name-stroke:${nameStroke};">${hasAvatar ? `<div class="entryAvatarWrap ${frameClass()}"><img class="entryAvatar" src="${esc(avatar)}" alt="avatar" loading="lazy"></div>` : `<div class="entryAvatarWrap ${frameClass()} no-avatar"><img class="entryAvatar" src="" alt="avatar" loading="lazy" style="display:none"></div>`}<div class="entryBody"><div class="entryBubble ${bubbleFrame}"><div class="entryTop"><span class="user">${esc(name)}</span>${isChat && isSupporter ? `<span class="badge supportBadge support-gold">💖 ${esc(settings.personal.supporterHighlightStyle === 'marker' ? 'Corazón brillante' : 'Heart Me')}</span>` : ''}${topBadges ? `<span class="entryActivityBadges">${topBadges}</span>` : ''}<span class="itemEmoji">${esc(itemEmoji(item, kind))}</span>${platformTag(platform)}<span class="actionTag">${esc(action)}</span><span class="timeTag">${timeLabel(item.timestamp)}</span></div><div class="entryText">${isChat ? rawText : esc(rawText).replace(/\n/g, '<br>')}</div>${giftMeta}${isChat && metaBadges ? `<div class="overlayMeta">${metaBadges}</div>` : ''}</div></div></article>`;
    }

    function isAtEdge(el, layout, direction){ if(!el) return true; if(layout === 'horizontal'){ if(direction === 'left') return el.scrollLeft <= 24; return el.scrollLeft + el.clientWidth >= el.scrollWidth - 24; } if(direction === 'up') return el.scrollTop <= 24; return el.scrollTop + el.clientHeight >= el.scrollHeight - 24; }
    function scrollToEdge(el, layout, direction, smooth=true){ if(!el) return; const behavior = smooth ? 'smooth' : 'auto'; if(layout === 'horizontal'){ const left = direction === 'left' ? 0 : Math.max(0, el.scrollWidth - el.clientWidth); el.scrollTo({ left, behavior }); return; } const top = direction === 'up' ? 0 : Math.max(0, el.scrollHeight - el.clientHeight); el.scrollTo({ top, behavior }); }

    function render(){
      const items = view === 'chat' ? state.chat : view === 'events' ? state.events : state.gifts;
      const layout = view === 'chat' ? (settings.personal.chatLayout || 'vertical') : (view === 'events' ? (settings.personal.eventsLayout || 'vertical') : (settings.personal.giftsLayout || 'vertical'));
      const direction = view === 'chat' ? (settings.personal.chatDirection || 'down') : (view === 'events' ? (settings.personal.eventsDirection || 'down') : (settings.personal.giftsDirection || 'down'));
      const size = view === 'chat' ? (settings.personal.chatHorizontalMode || 'normal') : (view === 'events' ? (settings.personal.eventsPanelSize || 'normal') : (settings.personal.giftsPanelSize || 'normal'));
      const mode = view === 'chat' ? 'slide' : (view === 'events' ? (settings.personal.eventsMode || 'slide') : (settings.personal.giftsMode || 'slide'));
      const reverse = layout === 'horizontal' ? direction === 'left' : direction === 'up';
      const filtered = items.slice().sort((a,b)=> reverse ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0));
      document.body.style.setProperty('--app-font', fontFamily(settings.personal.font || 'inter'));
      document.body.classList.remove('theme-dark','theme-matrix','theme-neon','theme-sunset','theme-aurora','chat-theme-glass','chat-theme-cloud','chat-theme-bubble','chat-theme-neon','chat-theme-minimal','chat-theme-aurora','chat-theme-comic','chat-theme-holo','chat-theme-ribbon');
      document.body.classList.add(themeClass());
      document.body.classList.add(`chat-theme-${settings.personal.chatTheme || 'cloud'}`);
      document.body.classList.toggle('chat-horizontal', view === 'chat' && layout === 'horizontal');
      document.body.classList.toggle('chat-vertical', view === 'chat' && layout !== 'horizontal');
      document.body.classList.toggle(`chat-horizontal-${settings.personal.chatHorizontalMode || 'normal'}`, view === 'chat' && layout === 'horizontal');
      list.className = `overlayList layout-${layout} mode-${mode} direction-${direction} size-${size}`;
      list.innerHTML = filtered.length ? filtered.map((item)=>itemHtml(item, view === 'chat' ? 'chat' : (item.group === 'gift' || item.type === 'gift' || view === 'gifts' ? 'gift' : 'event'))).join('') : `<div class="overlayEmpty"><strong>Sin contenido</strong><span>Cuando haya actividad, aparecerá aquí.</span></div>`;
      const key = view === 'chat' ? 'chat' : view === 'events' ? 'events' : 'gifts';
      if(filtered.length && (followState[key] || isAtEdge(list, layout, direction))) scrollToEdge(list, layout, direction, false);
    }
    function applySettings(nextSettings){ settings = migrateSettings(mergeDeep(structuredClone(defaults), nextSettings || {})); render(); }
    function updateActivityBadgesFromStorage(){ state.activityBadges = loadJSON(ACTIVITY_BADGES_KEY, { tiktok:{}, twitch:{} }); state.supporters = loadJSON(SUPPORTERS_KEY, { tiktok:{}, twitch:{} }); render(); }
    function clearByAge(list, enabled, seconds){ if(!enabled) return list; const cutoff = Date.now() - Math.max(10, Number(seconds || 30)) * 1000; return list.filter((item)=> (item.timestamp || 0) >= cutoff); }
    function pushChat(data){ const item = { platform: data?.platform || 'tiktok', user: data?.user || data?.displayName || 'Usuario', displayName: data?.displayName || data?.user || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Comentario', timestamp: data?.timestamp || Date.now() }; state.chat.push(item); if(state.chat.length > 240) state.chat.splice(0, state.chat.length - 240); state.chat = clearByAge(state.chat, settings.personal.autoClearChat, settings.personal.clearChatSeconds); followState.chat = true; render(); }
    function pushEvent(data){ const item = { platform: data?.platform || 'tiktok', user: data?.user || data?.displayName || 'Usuario', displayName: data?.displayName || data?.user || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Evento', type: data?.type || 'event', group: data?.group || 'event', timestamp: data?.timestamp || Date.now() }; if(String(item.type).toLowerCase() === 'gift' || String(item.group).toLowerCase() === 'gift'){ pushGift(item); return; } state.events.unshift(item); if(state.events.length > 240) state.events.length = 240; state.events = clearByAge(state.events, settings.personal.eventsAutoClear, settings.personal.eventsClearSeconds); followState.events = true; render(); }
    function pushGift(data){ const item = { platform: data?.platform || 'tiktok', user: data?.user || data?.displayName || 'Usuario', displayName: data?.displayName || data?.user || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Regalo', type: data?.type || 'gift', group: 'gift', gift: data?.gift || '', amount: data?.amount || '', timestamp: data?.timestamp || Date.now() }; state.gifts.push(item); if(state.gifts.length > 240) state.gifts.length = 240; state.gifts = clearByAge(state.gifts, settings.personal.giftsAutoClear, settings.personal.giftsClearSeconds); followState.gifts = true; render(); }

    socket.on('settings', (serverSettings) => { settings = migrateSettings(mergeDeep(structuredClone(defaults), serverSettings || {})); ensureGiftCatalog().then(() => render()); });
    socket.on('chat', (data) => { if(view === 'chat') pushChat(data || {}); });
    socket.on('event', (data) => { const type = String(data?.type || '').toLowerCase(); if(type === 'gift' || type === 'sub' || type === 'bits' || type === 'raid' || type === 'host'){ if(view === 'gifts') pushGift(data || {}); else pushEvent({ ...(data || {}), group: 'gift' }); return; } if(view === 'events') pushEvent(data || {}); });
    window.addEventListener('storage', (ev) => { if(ev.key === SETTINGS_KEY || ev.key === LEGACY_SETTINGS_KEY) { settings = loadSettings(); ensureGiftCatalog().then(() => render()); } if(ev.key === ACTIVITY_BADGES_KEY || ev.key === SUPPORTERS_KEY) updateActivityBadgesFromStorage(); });
    window.addEventListener('resize', () => render());

    ensureGiftCatalog().finally(() => { settings = loadSettings(); updateActivityBadgesFromStorage(); render(); });
  