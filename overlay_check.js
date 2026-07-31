
    const socket = io();
    const list = document.getElementById('list');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySubtitle = document.getElementById('overlaySubtitle');
    const overlayStatus = document.getElementById('overlayStatus');

    const SETTINGS_KEY = "streamfusion.ui.settings.v2";
    const LEGACY_SETTINGS_KEY = "streamfusion.ui.settings.v1";
    const SESSION_KEY = "streamfusion.ui.session.v2";
    const SUPPORTERS_KEY = "streamfusion.ui.supporters.v1";
    const ACTIVITY_BADGES_KEY = "streamfusion.ui.activityBadges.v1";

    const defaults = {
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
        twitchNameColor: "real",
        tiktokNameColor: "white",
        messageEffect: "shadow",
        nameEffect: "shadow",
        textColor: "auto",
        showBadges: true,
        showEmotes: true,
        highlightSupporters: true,
        supporterHighlightStyle: "gold",
        eventsLayout: "vertical",
        eventsDirection: "down",
        eventsPanelSize: "normal",
        giftsLayout: "vertical",
        giftsDirection: "down",
        giftsPanelSize: "normal",
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
        tiktokAvatarUrl: "",
      },
    };

    const platformColors = { tiktok: "#fe2c55", twitch: "#9146ff" };
    const blankPixel = "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

    function esc(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function normalizeImageSource(value) {
      const src = String(value ?? "").trim();
      if (!src) return "";
      if (/^https?:\/\//i.test(src)) return src;
      if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src;
      return "";
    }

    function sanitizeTikTokAvatar(value) {
      const src = normalizeImageSource(value);
      if (!src) return "";
      if (/dicebear\.com/i.test(src)) return "";
      if (/data:image\/svg\+xml/i.test(src)) return "";
      return src;
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

    function mergeDeep(base, incoming) {
      if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
      if (typeof base !== "object" || base === null) return incoming ?? base;
      if (typeof incoming !== "object" || incoming === null) return base;
      const out = { ...base };
      for (const key of Object.keys(incoming)) out[key] = key in base ? mergeDeep(base[key], incoming[key]) : incoming[key];
      return out;
    }

    function loadSettings() {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return loadJSON(SETTINGS_KEY, defaults);
      const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
      if (legacy) {
        try {
          return mergeDeep(structuredClone(defaults), JSON.parse(legacy));
        } catch {
          return structuredClone(defaults);
        }
      }
      return structuredClone(defaults);
    }

    let settings = loadSettings();
    let state = {
      chat: [],
      events: [],
      gifts: [],
      activityBadges: loadJSON(ACTIVITY_BADGES_KEY, { tiktok: {}, twitch: {} }),
    };

    const view = new URLSearchParams(location.search).get("view") || "chat";
    const viewTitle = {
      chat: "Overlay Chat",
      events: "Overlay Eventos",
      gifts: "Overlay Regalos",
    }[view] || "Overlay";

    function normalizeUsername(value) {
      return String(value || "")
        .trim()
        .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
        .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
        .replace(/^@+/, "")
        .replace(/^#+/, "")
        .split(/[/?#]/)[0]
        .trim();
    }

    function normalizeTypeName(value) {
      return String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
    }

    function timeLabel(ts = Date.now()) {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    }

    function badgeEmoji(key) {
      const lower = String(key || "").toLowerCase();
      if (lower.includes("broadcaster")) return "👑";
      if (lower.includes("mod")) return "🛡️";
      if (lower.includes("vip")) return "💎";
      if (lower.includes("sub")) return "⭐";
      if (lower.includes("staff")) return "🧰";
      if (lower.includes("verified")) return "✅";
      if (lower.includes("founder")) return "🏁";
      if (lower.includes("premium")) return "✨";
      if (lower.includes("tiktok")) return "🎵";
      if (lower.includes("twitch")) return "🟣";
      return lower.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    }

    function normalizeBadgeKeys(raw) {
      if (!raw) return [];
      const items = [];
      const push = (key) => {
        const clean = String(key || "").trim();
        if (clean) items.push(clean);
      };
      if (Array.isArray(raw)) {
        raw.forEach((item) => {
          if (typeof item === "string") push(item);
          else if (item && typeof item === "object") push(item.name || item.type || item.label || item.id);
        });
      } else if (typeof raw === "object") {
        Object.entries(raw).forEach(([key, value]) => {
          if (value === false || value === null || value === undefined) return;
          push(key);
        });
      } else if (typeof raw === "string") {
        raw.split(/[,\s|]+/).forEach(push);
      }
      return items;
    }

    function badgeChips(raw) {
      const keys = normalizeBadgeKeys(raw);
      if (!settings.personal.showBadges) return "";
      const style = settings.personal.badgeStyle || "emoji";
      return keys.map((key) => `<span class="badge">${esc(style === "compact" ? key : badgeEmoji(key))}</span>`).join("");
    }

    const ACTIVITY_RULES = [
      { emoji: "🎁", label: "Envió regalo", match: ["gift", "envelope", "fanclub"] },
      { emoji: "⭐", label: "Suscripción", match: ["sub", "subscription", "resub", "superfan", "fanclub"] },
      { emoji: "💎", label: "Bits", match: ["bits", "superchat"] },
      { emoji: "⚡", label: "Raid", match: ["raid", "host"] },
      { emoji: "🗣", label: "Compartió", match: ["share"] },
      { emoji: "👻", label: "Se unió", match: ["join", "member"] },
      { emoji: "➕", label: "Siguió", match: ["follow"] },
      { emoji: "❤️", label: "Dio like", match: ["like", "heartme"] },
    ];

    function activityBadgeKeys(item) {
      return [...new Set([
        normalizeUsername(item?.user || ""),
        normalizeUsername(item?.displayName || ""),
        normalizeUsername(item?.uniqueId || ""),
        normalizeUsername(item?.username || ""),
      ].filter(Boolean))];
    }

    function activityBadgeMarkup(item) {
      if (!settings.personal.showBadges) return "";
      const platform = String(item?.platform || "tiktok").toLowerCase();
      const keys = activityBadgeKeys(item);
      const entry = keys.map((key) => state.activityBadges?.[platform]?.[key]).find((value) => value?.badges);
      if (!entry?.badges) return "";
      return ACTIVITY_RULES
        .filter((rule) => entry.badges[rule.emoji])
        .map((rule) => `<span class="badge activityBadge" title="${esc(rule.label)}">${esc(rule.emoji)}</span>`)
        .join("");
    }

    function ensureLayoutClasses() {
      document.body.classList.remove("theme-dark", "theme-matrix", "theme-neon", "theme-sunset", "theme-aurora");
      document.body.classList.add(`theme-${settings.personal.theme || "dark"}`);
      document.body.style.setProperty("--app-font", {
        inter: 'Inter, Segoe UI, Arial, sans-serif',
        system: 'Segoe UI, Arial, sans-serif',
        mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        serif: 'Georgia, "Times New Roman", serif',
        emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Segoe UI, Arial, sans-serif',
      }[settings.personal.font || "inter"] || 'Inter, Segoe UI, Arial, sans-serif');
    }

    function panelWidth(size) {
      const map = { compact: 280, normal: 340, wide: 440, large: 450, xl: 580 };
      return map[String(size || "normal")] || 340;
    }

    function avatarHtml(item) {
      const avatar = sanitizeTikTokAvatar(item.avatar);
      if (!avatar) return "";
      return `<div class="overlayAvatarWrap"><img class="overlayAvatar" src="${esc(avatar)}" alt="avatar" loading="lazy" /></div>`;
    }

    function renderText(item) {
      const text = String(item?.message || item?.text || item?.content || item?.action || "");
      return esc(text || "Mensaje").replace(/\n/g, "<br>");
    }

    function itemHtml(item, kind) {
      const name = item.displayName || item.user || "Usuario";
      const platform = String(item.platform || "tiktok").toLowerCase();
      const badgeHtml = kind === "chat" ? activityBadgeMarkup(item) : badgeChips(item.badges);
      const color = platform === "twitch"
        ? (settings.personal.twitchNameColor === "white" ? "#f4f7ff" : platformColors.twitch)
        : "#f4f7ff";
      const accent = platformColors[platform] || platformColors.tiktok;
      const text = kind === "chat"
        ? renderText(item)
        : kind === "gift"
          ? esc(item.message || `${name} envió un regalo`).replace(/\n/g, "<br>")
          : esc(item.message || "").replace(/\n/g, "<br>");
      const action = kind === "chat" ? (item.action || "Comentario") : (item.action || kind);
      const itemBadges = kind === "chat" ? badgeChips(item.badges) : "";
      return `
        <article class="overlayItem" style="--item-accent:${accent};--name-color:${color};">
          ${avatarHtml(item)}
          <div class="overlayBubble">
            <div class="overlayTop">
              <span class="overlayName">${esc(name)}</span>
              ${badgeHtml ? `<span class="overlayActivityBadges">${badgeHtml}</span>` : ""}
              <span class="platformTag ${platform}">${platform === "twitch" ? "Twitch" : "TikTok"}</span>
              <span class="actionTag">${esc(action)}</span>
              <span class="entryTime">${timeLabel(item.timestamp)}</span>
            </div>
            <div class="overlayText">${text}</div>
            ${kind === "gift" && item.gift ? `<div class="overlayMeta"><span class="giftTag">🎁 ${esc(item.gift)}</span>${item.amount ? `<span class="kindTag">x${esc(item.amount)}</span>` : ""}</div>` : ""}
            ${kind === "chat" && itemBadges ? `<div class="overlayMeta">${itemBadges}</div>` : ""}
          </div>
        </article>`;
    }

    function render() {
      const items = view === "chat" ? state.chat : view === "events" ? state.events : state.gifts;
      const layout = view === "chat" ? (settings.personal.chatLayout || "vertical") : (view === "events" ? (settings.personal.eventsLayout || "vertical") : (settings.personal.giftsLayout || "vertical"));
      const direction = view === "chat" ? (settings.personal.chatDirection || "down") : (view === "events" ? (settings.personal.eventsDirection || "down") : (settings.personal.giftsDirection || "down"));
      const size = view === "chat" ? (settings.personal.chatHorizontalMode || "normal") : (view === "events" ? (settings.personal.eventsPanelSize || "normal") : (settings.personal.giftsPanelSize || "normal"));
      const filtered = items.slice().sort((a, b) => {
        if (["up", "left"].includes(direction)) return (b.timestamp || 0) - (a.timestamp || 0);
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      list.className = `overlayList layout-${layout} direction-${direction} size-${size}`;
      list.style.setProperty("--overlay-card-width", `${panelWidth(size)}px`);
      list.innerHTML = filtered.length
        ? filtered.map((item) => itemHtml(item, view === "chat" ? "chat" : (item.group === "gift" || item.type === "gift" || view === "gifts" ? "gift" : "event"))).join("")
        : `<div class="overlayEmpty"><strong>Sin contenido</strong><span>Cuando haya actividad, aparecerá aquí.</span></div>`;

      overlayTitle.textContent = viewTitle;
      overlaySubtitle.textContent = view === "chat"
        ? "Mensajes con el mismo estilo guardado en la interfaz principal."
        : view === "events"
          ? "Eventos sincronizados con el panel principal."
          : "Regalos sincronizados con el panel principal.";
    }

    function applySettings(nextSettings) {
      settings = mergeDeep(structuredClone(defaults), nextSettings || {});
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings));
      ensureLayoutClasses();
      render();
    }

    function updateActivityBadgesFromStorage() {
      state.activityBadges = loadJSON(ACTIVITY_BADGES_KEY, { tiktok: {}, twitch: {} });
      render();
    }

    function pushChat(data) {
      state.chat.push({
        platform: data?.platform || "tiktok",
        user: data?.user || data?.displayName || "Usuario",
        displayName: data?.displayName || data?.user || "Usuario",
        avatar: sanitizeTikTokAvatar(data?.avatar || ""),
        message: data?.message || "",
        badges: data?.badges || [],
        action: data?.action || "Comentario",
        timestamp: data?.timestamp || Date.now(),
      });
      if (state.chat.length > 240) state.chat.splice(0, state.chat.length - 240);
      render();
    }

    function pushEvent(data) {
      const item = {
        platform: data?.platform || "tiktok",
        user: data?.user || data?.displayName || "Usuario",
        displayName: data?.displayName || data?.user || "Usuario",
        avatar: sanitizeTikTokAvatar(data?.avatar || ""),
        message: data?.message || "",
        badges: data?.badges || [],
        action: data?.action || "Evento",
        type: data?.type || "event",
        group: data?.group || "event",
        timestamp: data?.timestamp || Date.now(),
      };
      if (String(item.type).toLowerCase() === "gift" || String(item.group).toLowerCase() === "gift") {
        state.gifts.unshift(item);
        if (state.gifts.length > 240) state.gifts.length = 240;
      } else {
        state.events.unshift(item);
        if (state.events.length > 240) state.events.length = 240;
      }
      render();
    }

    function pushGift(data) {
      state.gifts.unshift({
        platform: data?.platform || "tiktok",
        user: data?.user || data?.displayName || "Usuario",
        displayName: data?.displayName || data?.user || "Usuario",
        avatar: sanitizeTikTokAvatar(data?.avatar || ""),
        message: data?.message || "",
        badge: data?.badges || [],
        badges: data?.badges || [],
        action: data?.action || "Regalo",
        type: data?.type || "gift",
        group: "gift",
        gift: data?.gift || "",
        amount: data?.amount || "",
        timestamp: data?.timestamp || Date.now(),
      });
      if (state.gifts.length > 240) state.gifts.length = 240;
      render();
    }

    socket.on("connect", () => {
      overlayStatus.textContent = "En línea";
      overlayStatus.className = "overlayBadge";
    });

    socket.on("disconnect", () => {
      overlayStatus.textContent = "Desconectado";
    });

    socket.on("settings", (serverSettings) => applySettings(serverSettings));

    socket.on("chat", (data) => {
      if (view !== "chat") return;
      pushChat(data || {});
    });

    socket.on("event", (data) => {
      const type = String(data?.type || "").toLowerCase();
      if (type === "gift" || type === "sub" || type === "bits" || type === "raid" || type === "host") {
        if (view === "gifts") pushGift(data || {});
        else pushEvent({ ...(data || {}), group: "gift" });
        return;
      }
      if (view === "events") pushEvent(data || {});
    });

    window.addEventListener("storage", (ev) => {
      if (ev.key === SETTINGS_KEY || ev.key === LEGACY_SETTINGS_KEY) {
        applySettings(loadSettings());
      }
      if (ev.key === ACTIVITY_BADGES_KEY) {
        updateActivityBadgesFromStorage();
      }
    });

    const savedSession = loadJSON(SESSION_KEY, { tiktok: {}, twitch: {} });
    void savedSession;

    ensureLayoutClasses();
    render();
  