const socket = io();

const $ = (id) => document.getElementById(id);

const el = {
    status: $("systemStatus"),
    ping: $("ping"),
    fps: $("eventsPerSecond"),
    clock: $("clock"),

    tiktokUser: $("tiktokUser"),
    twitchUser: $("twitchUser"),

    connectTikTok: $("connectTikTok"),
    disconnectTikTok: $("disconnectTikTok"),
    connectTwitch: $("connectTwitch"),
    disconnectTwitch: $("disconnectTwitch"),

    configButton: $("configButton"),
    overlayButton: $("overlayButton"),

    configWindow: $("configWindow"),
    overlayWindow: $("overlayWindow"),
    closeConfig: $("closeConfig"),
    closeOverlay: $("closeOverlay"),
    saveConfig: $("saveConfig"),
    generateOverlay: $("generateOverlay"),

    chatPanel: $("chatPanel"),
    eventPanel: $("eventPanel"),

    chatPlatformFilter: $("chatPlatformFilter"),
    eventPlatformFilter: $("eventPlatformFilter"),
    eventTypeFilter: $("eventTypeFilter"),

    tiktokStatusDot: $("tiktokStatusDot"),
    twitchStatusDot: $("twitchStatusDot"),
    tiktokStatusText: $("tiktokStatusText"),
    twitchStatusText: $("twitchStatusText"),

    leftTikTokStatus: $("leftTikTokStatus"),
    leftTwitchStatus: $("leftTwitchStatus"),
    leftTikTokText: $("leftTikTokText"),
    leftTwitchText: $("leftTwitchText"),

    ttViewers: $("ttViewers"),
    ttLikes: $("ttLikes"),
    ttGifts: $("ttGifts"),
    ttFollowers: $("ttFollowers"),
    ttShares: $("ttShares"),

    twViewers: $("twViewers"),
    twSubs: $("twSubs"),
    twBits: $("twBits"),
    twRaids: $("twRaids"),
    twFollowers: $("twFollowers"),

    generalTab: $("generalTab"),
    tiktokTab: $("tiktokTab"),
    twitchTab: $("twitchTab"),
    overlayTab: $("overlayTab"),
    appearanceTab: $("appearanceTab"),
    tabs: Array.from(document.querySelectorAll(".tab")),
};

const SETTINGS_KEY = "streamfusion.settings.v2";
const MAX_ITEMS = 250;

const defaultSettings = {
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
        stats: true,
        platform: "both",
    },
    appearance: {
        theme: "dark",
    },
};

const state = {
    settings: structuredClone(defaultSettings),
    connected: {
        tiktok: false,
        twitch: false,
    },
    stats: {
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
    },
    chatItems: [],
    eventItems: [],
    eventsPerSecond: 0,
    lastFpsTick: Date.now(),
};

function mergeDeep(base, incoming) {
    if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
    if (typeof base !== "object" || base === null) return incoming ?? base;
    if (typeof incoming !== "object" || incoming === null) return base;

    const result = { ...base };
    for (const key of Object.keys(incoming)) {
        if (key in base) {
            result[key] = mergeDeep(base[key], incoming[key]);
        } else {
            result[key] = incoming[key];
        }
    }
    return result;
}

function loadLocalSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function saveLocalSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
}

function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function formatNumber(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "0";

    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";

    const formats = [
        { limit: 1e12, suffix: "T" },
        { limit: 1e9, suffix: "B" },
        { limit: 1e6, suffix: "M" },
        { limit: 1e3, suffix: "K" },
    ];

    for (const item of formats) {
        if (abs >= item.limit) {
            const num = (abs / item.limit).toFixed(abs >= item.limit * 10 ? 0 : 1);
            return `${sign}${num}${item.suffix}`;
        }
    }

    return `${sign}${Math.round(abs)}`;
}

function getCheckbox(id, fallback = false) {
    const node = $(id);
    return node ? node.checked : fallback;
}

function setCheckbox(id, value) {
    const node = $(id);
    if (node) node.checked = Boolean(value);
}

function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
}

function setDot(node, online) {
    if (!node) return;
    node.classList.toggle("online", online);
    node.classList.toggle("offline", !online);
}

function platformLabel(platform) {
    return platform === "twitch" ? "Twitch" : "TikTok";
}

function platformClass(platform) {
    return platform === "twitch" ? "twitch" : "tiktok";
}

function eventLabel(type) {
    const map = {
        chat: "Chat",
        gift: "Regalo",
        like: "Like",
        follow: "Follow",
        share: "Share",
        member: "Entrada",
        join: "Entrada",
        sub: "Sub",
        bits: "Bits",
        raid: "Raid",
        system: "Sistema",
        roomUser: "Espectadores",
        liveIntro: "Intro",
        streamEnd: "Fin",
        question: "Pregunta",
        emote: "Emote",
        envelope: "Sobre",
        superFan: "Super Fan",
        superFanJoin: "Super Fan",
        superFanBox: "Caja SF",
    };
    return map[type] || type || "Evento";
}

function eventClass(type) {
    const map = {
        gift: "gift",
        like: "like",
        follow: "follow",
        share: "share",
        member: "join",
        join: "join",
        sub: "sub",
        bits: "bits",
        raid: "raid",
        system: "system",
        roomUser: "system",
        liveIntro: "system",
        streamEnd: "system",
        question: "system",
        emote: "system",
        envelope: "gift",
        superFan: "sub",
        superFanJoin: "sub",
        superFanBox: "gift",
    };
    return map[type] || "system";
}

function isChatVisible(platform) {
    if (platform === "tiktok") return state.settings.tiktok.showChat;
    if (platform === "twitch") return state.settings.twitch.showChat;
    return true;
}

function isEventVisible(platform, type) {
    if (platform === "tiktok") {
        if (type === "chat") return state.settings.tiktok.showChat;
        if (type === "like") return state.settings.tiktok.showLikes;
        if (type === "gift") return state.settings.tiktok.showGifts;
        if (type === "follow") return state.settings.tiktok.showFollowers;
        if (type === "share") return state.settings.tiktok.showShares;
        if (type === "member" || type === "join") return state.settings.tiktok.showJoin;
        if (type === "system" || type === "roomUser" || type === "liveIntro" || type === "streamEnd" || type === "question" || type === "emote" || type === "envelope" || type === "superFan" || type === "superFanJoin" || type === "superFanBox") {
            return state.settings.tiktok.showSystem;
        }
        return true;
    }

    if (platform === "twitch") {
        if (type === "chat") return state.settings.twitch.showChat;
        if (type === "sub") return state.settings.twitch.showSubs;
        if (type === "bits") return state.settings.twitch.showBits;
        if (type === "raid") return state.settings.twitch.showRaids;
        if (type === "follow") return state.settings.twitch.showFollowers;
        if (type === "member" || type === "join") return state.settings.twitch.showJoin;
        if (type === "system") return state.settings.twitch.showSystem;
        return true;
    }

    return true;
}

function shouldShowByPlatformFilter(platform, filter) {
    if (filter === "all") return true;
    return platform === filter;
}

function getTimeStamp(item) {
    return item.timestamp ? formatTime(new Date(item.timestamp)) : formatTime();
}

function sanitizeText(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
}

function buildChatItem(data) {
    const platform = data.platform === "twitch" ? "twitch" : "tiktok";
    const type = sanitizeText(data.type, "chat");
    const user = sanitizeText(data.user || data.uniqueId, "Usuario");
    const message = sanitizeText(data.message, "Mensaje sin texto");
    const timestamp = data.timestamp || Date.now();

    return {
        platform,
        type,
        user,
        message,
        timestamp,
        color: data.color || "",
        badges: data.badges || [],
    };
}

function buildEventItem(data) {
    const platform = data.platform === "twitch" ? "twitch" : "tiktok";
    const type = sanitizeText(data.type, "system");
    const user = sanitizeText(data.user || data.uniqueId, "Usuario");
    const message = sanitizeText(data.message, "");
    const timestamp = data.timestamp || Date.now();

    return {
        platform,
        type,
        user,
        message,
        timestamp,
        amount: Number(data.amount || 0) || 0,
        gift: sanitizeText(data.gift, ""),
        likes: Number(data.likes || 0) || 0,
    };
}

function renderChatItem(item) {
    const card = document.createElement("div");
    card.className = `messageCard ${platformClass(item.platform)}`;

    const top = document.createElement("div");
    top.className = "messageTop";

    const meta = document.createElement("div");
    meta.className = "messageMeta";

    const tag = document.createElement("span");
    tag.className = `platformTag ${platformClass(item.platform)}`;
    tag.textContent = platformLabel(item.platform);

    const time = document.createElement("span");
    time.className = "msgTime";
    time.textContent = getTimeStamp(item);

    const user = document.createElement("div");
    user.className = "msgUser";
    user.textContent = item.user;

    if (item.color) user.style.color = item.color;

    const type = document.createElement("div");
    type.className = "msgType";
    type.textContent = eventLabel(item.type);

    meta.appendChild(tag);
    meta.appendChild(time);

    top.appendChild(meta);
    top.appendChild(type);

    const body = document.createElement("div");
    body.className = "msgBody";

    if (item.type === "member" || item.type === "join") {
        body.textContent = `${item.user} se unió al directo`;
    } else if (item.type === "system") {
        body.textContent = item.message;
    } else {
        body.textContent = item.message;
    }

    card.appendChild(top);
    card.appendChild(user);
    card.appendChild(body);

    return card;
}

function renderEventItem(item) {
    const card = document.createElement("div");
    card.className = `eventCard ${eventClass(item.type)} ${platformClass(item.platform)}`;

    const title = document.createElement("div");
    title.className = "eventTitle";

    const platform = document.createElement("span");
    platform.className = `platformTag ${platformClass(item.platform)}`;
    platform.textContent = platformLabel(item.platform);

    const label = document.createElement("span");
    label.textContent = `${eventLabel(item.type)}`;

    const time = document.createElement("span");
    time.className = "smallMuted";
    time.textContent = `• ${getTimeStamp(item)}`;

    title.appendChild(platform);
    title.appendChild(label);
    title.appendChild(time);

    const desc = document.createElement("div");
    desc.className = "eventDesc";

    if (item.type === "gift") {
        const amount = item.amount > 0 ? ` x${formatNumber(item.amount)}` : "";
        desc.textContent = `${item.user} envió ${item.gift || "Regalo"}${amount}`;
    } else if (item.type === "like") {
        desc.textContent = `${item.user} dio ${formatNumber(item.likes || 1)} like${(item.likes || 1) === 1 ? "" : "s"}`;
    } else if (item.type === "follow") {
        desc.textContent = `${item.user} comenzó a seguir`;
    } else if (item.type === "share") {
        desc.textContent = `${item.user} compartió el LIVE`;
    } else if (item.type === "member" || item.type === "join") {
        desc.textContent = `${item.user} entró al directo`;
    } else {
        desc.textContent = item.message || `${item.user}`;
    }

    card.appendChild(title);
    card.appendChild(desc);

    return card;
}

function refreshChatPanel() {
    const platformFilter = el.chatPlatformFilter?.value || "all";
    el.chatPanel.innerHTML = "";

    const items = state.chatItems.filter((item) => {
        if (!shouldShowByPlatformFilter(item.platform, platformFilter)) return false;
        return isChatVisible(item.platform);
    });

    if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "messageCard";
        empty.innerHTML = `
            <div class="msgUser">Sin mensajes</div>
            <div class="msgBody">Aquí aparecerán los comentarios del chat cuando se conecte TikTok o Twitch.</div>
        `;
        el.chatPanel.appendChild(empty);
        return;
    }

    for (const item of items) {
        el.chatPanel.appendChild(renderChatItem(item));
    }

    el.chatPanel.scrollTop = el.chatPanel.scrollHeight;
}

function refreshEventPanel() {
    const platformFilter = el.eventPlatformFilter?.value || "all";
    const typeFilter = el.eventTypeFilter?.value || "all";
    el.eventPanel.innerHTML = "";

    const items = state.eventItems.filter((item) => {
        if (!shouldShowByPlatformFilter(item.platform, platformFilter)) return false;
        if (typeFilter !== "all" && item.type !== typeFilter) return false;
        return isEventVisible(item.platform, item.type);
    });

    if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "eventCard system";
        empty.innerHTML = `
            <div class="eventTitle">Sin eventos</div>
            <div class="eventDesc">Aquí aparecerán regalos, likes, follows, subs, bits, raids y entradas.</div>
        `;
        el.eventPanel.appendChild(empty);
        return;
    }

    for (const item of items) {
        el.eventPanel.appendChild(renderEventItem(item));
    }

    el.eventPanel.scrollTop = el.eventPanel.scrollHeight;
}

function refreshPanels() {
    refreshChatPanel();
    refreshEventPanel();
}

function pushChat(data) {
    const item = buildChatItem(data);
    state.chatItems.push(item);
    if (state.chatItems.length > MAX_ITEMS) state.chatItems.shift();
    refreshChatPanel();
    bumpFps();
}

function pushEvent(data) {
    const item = buildEventItem(data);
    state.eventItems.push(item);
    if (state.eventItems.length > MAX_ITEMS) state.eventItems.shift();
    refreshEventPanel();
    bumpFps();
}

function addSystemEvent(message, platform = "tiktok") {
    pushEvent({
        platform,
        type: "system",
        user: "Sistema",
        message,
        timestamp: Date.now(),
    });
}

function bumpFps() {
    const now = Date.now();
    if (now - state.lastFpsTick < 1000) {
        state.eventsPerSecond += 1;
    } else {
        state.lastFpsTick = now;
        state.eventsPerSecond = 1;
    }
    el.fps.textContent = String(state.eventsPerSecond);
}

function updateClock() {
    el.clock.textContent = formatTime(new Date());
}

function updateStatsUI() {
    el.ttViewers.textContent = formatNumber(state.stats.tiktok.viewers);
    el.ttLikes.textContent = formatNumber(state.stats.tiktok.likes);
    el.ttGifts.textContent = formatNumber(state.stats.tiktok.gifts);
    el.ttFollowers.textContent = formatNumber(state.stats.tiktok.followers);
    el.ttShares.textContent = formatNumber(state.stats.tiktok.shares);

    el.twViewers.textContent = formatNumber(state.stats.twitch.viewers);
    el.twSubs.textContent = formatNumber(state.stats.twitch.subs);
    el.twBits.textContent = formatNumber(state.stats.twitch.bits);
    el.twRaids.textContent = formatNumber(state.stats.twitch.raids);
    el.twFollowers.textContent = formatNumber(state.stats.twitch.followers);
}

function parseCountFromText(text) {
    const match = String(text || "").match(/(\d[\d,.\s]*)/);
    if (!match) return 0;
    const raw = match[1].replace(/\s/g, "").replace(/,/g, "");
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
}

function updateStatsFromIncoming(data) {
    const platform = data.platform === "twitch" ? "twitch" : "tiktok";
    const type = sanitizeText(data.type, "chat");

    if (platform === "tiktok") {
        if (type === "like") {
            const likes = Number(data.likes || 1) || 1;
            state.stats.tiktok.likes += likes;
        } else if (type === "gift") {
            const gifts = Number(data.amount || 1) || 1;
            state.stats.tiktok.gifts += gifts;
        } else if (type === "follow") {
            state.stats.tiktok.followers += 1;
        } else if (type === "share") {
            state.stats.tiktok.shares += 1;
        } else if (type === "roomUser") {
            const current = Number(data.viewers || parseCountFromText(data.message)) || 0;
            if (current > 0) state.stats.tiktok.viewers = current;
        }
    }

    if (platform === "twitch") {
        if (type === "sub") {
            state.stats.twitch.subs += Number(data.amount || 1) || 1;
        } else if (type === "bits") {
            state.stats.twitch.bits += Number(data.amount || 0) || 0;
        } else if (type === "raid") {
            state.stats.twitch.raids += 1;
            const viewers = Number(data.amount || 0) || 0;
            if (viewers > 0) state.stats.twitch.viewers = viewers;
        } else if (type === "follow") {
            state.stats.twitch.followers += 1;
        } else if (type === "roomUser") {
            const current = Number(data.viewers || parseCountFromText(data.message)) || 0;
            if (current > 0) state.stats.twitch.viewers = current;
        }
    }

    updateStatsUI();
}

function routeIncoming(data) {
    if (!data) return;

    updateStatsFromIncoming(data);

    const platform = data.platform === "twitch" ? "twitch" : "tiktok";
    const type = sanitizeText(data.type, "chat");

    if (type === "chat") {
        if (platform === "tiktok" && !state.settings.tiktok.showChat) return;
        if (platform === "twitch" && !state.settings.twitch.showChat) return;
        pushChat(data);
        return;
    }

    if (type === "member" || type === "join") {
        pushChat({
            platform,
            type,
            user: data.user || data.uniqueId || "Usuario",
            message: `${data.user || data.uniqueId || "Usuario"} se unió al directo`,
            timestamp: data.timestamp || Date.now(),
        });
        pushEvent(data);
        return;
    }

    pushEvent(data);

    if ((platform === "tiktok" && type === "system" && !state.settings.tiktok.showSystem) ||
        (platform === "twitch" && type === "system" && !state.settings.twitch.showSystem)) {
        return;
    }
}

function parseSystemMessage(message) {
    const text = sanitizeText(message, "Listo");

    if (/TikTok conectado/i.test(text)) {
        setConnectionState("tiktok", true, text);
    } else if (/TikTok desconectado/i.test(text)) {
        setConnectionState("tiktok", false, text);
    } else if (/Twitch conectado/i.test(text)) {
        setConnectionState("twitch", true, text);
    } else if (/Twitch desconectado/i.test(text)) {
        setConnectionState("twitch", false, text);
    }

    el.status.textContent = text;
}

function setConnectionState(platform, online, labelText = "") {
    state.connected[platform] = Boolean(online);

    if (platform === "tiktok") {
        setDot(el.tiktokStatusDot, online);
        setDot(el.leftTikTokStatus, online);
        setText(el.tiktokStatusText, labelText || (online ? "TikTok Conectado" : "TikTok Desconectado"));
        setText(el.leftTikTokText, labelText || (online ? "Conectado" : "Desconectado"));
    }

    if (platform === "twitch") {
        setDot(el.twitchStatusDot, online);
        setDot(el.leftTwitchStatus, online);
        setText(el.twitchStatusText, labelText || (online ? "Twitch Conectado" : "Twitch Desconectado"));
        setText(el.leftTwitchText, labelText || (online ? "Conectado" : "Desconectado"));
    }
}

function syncSettingsToUI() {
    setCheckbox("startMinimized", state.settings.general.startMinimized);
    setCheckbox("playSounds", state.settings.general.playSounds);
    setCheckbox("saveLogs", state.settings.general.saveLogs);

    setCheckbox("showTikTokChat", state.settings.tiktok.showChat);
    setCheckbox("showTikTokLikes", state.settings.tiktok.showLikes);
    setCheckbox("showTikTokGifts", state.settings.tiktok.showGifts);
    setCheckbox("showTikTokFollowers", state.settings.tiktok.showFollowers);
    setCheckbox("showTikTokShares", state.settings.tiktok.showShares);
    setCheckbox("showTikTokJoin", state.settings.tiktok.showJoin);

    setCheckbox("showTwitchChat", state.settings.twitch.showChat);
    setCheckbox("showTwitchSubs", state.settings.twitch.showSubs);
    setCheckbox("showTwitchBits", state.settings.twitch.showBits);
    setCheckbox("showTwitchRaids", state.settings.twitch.showRaids);
    setCheckbox("showTwitchFollowers", state.settings.twitch.showFollowers);

    const themeSelect = $("themeSelect");
    if (themeSelect) themeSelect.value = state.settings.appearance.theme || "dark";

    const overlayPlatform = $("overlayPlatform");
    if (overlayPlatform) overlayPlatform.value = state.settings.overlay.platform || "both";

    setCheckbox("overlayChat", state.settings.overlay.chat);
    setCheckbox("overlayEvents", state.settings.overlay.events);
    setCheckbox("overlayStats", state.settings.overlay.stats);
}

function collectSettingsFromUI() {
    const next = structuredClone(state.settings);

    next.general.startMinimized = getCheckbox("startMinimized", next.general.startMinimized);
    next.general.playSounds = getCheckbox("playSounds", next.general.playSounds);
    next.general.saveLogs = getCheckbox("saveLogs", next.general.saveLogs);

    next.tiktok.showChat = getCheckbox("showTikTokChat", next.tiktok.showChat);
    next.tiktok.showLikes = getCheckbox("showTikTokLikes", next.tiktok.showLikes);
    next.tiktok.showGifts = getCheckbox("showTikTokGifts", next.tiktok.showGifts);
    next.tiktok.showFollowers = getCheckbox("showTikTokFollowers", next.tiktok.showFollowers);
    next.tiktok.showShares = getCheckbox("showTikTokShares", next.tiktok.showShares);
    next.tiktok.showJoin = getCheckbox("showTikTokJoin", next.tiktok.showJoin);

    next.twitch.showChat = getCheckbox("showTwitchChat", next.twitch.showChat);
    next.twitch.showSubs = getCheckbox("showTwitchSubs", next.twitch.showSubs);
    next.twitch.showBits = getCheckbox("showTwitchBits", next.twitch.showBits);
    next.twitch.showRaids = getCheckbox("showTwitchRaids", next.twitch.showRaids);
    next.twitch.showFollowers = getCheckbox("showTwitchFollowers", next.twitch.showFollowers);

    const themeSelect = $("themeSelect");
    if (themeSelect) next.appearance.theme = themeSelect.value || "dark";

    const overlayPlatform = $("overlayPlatform");
    if (overlayPlatform) next.overlay.platform = overlayPlatform.value || "both";

    next.overlay.chat = getCheckbox("overlayChat", next.overlay.chat);
    next.overlay.events = getCheckbox("overlayEvents", next.overlay.events);
    next.overlay.stats = getCheckbox("overlayStats", next.overlay.stats);

    return next;
}

function openModal(modal) {
    if (!modal) return;
    modal.style.display = "flex";
}

function closeModal(modal) {
    if (!modal) return;
    modal.style.display = "none";
}

function activateTab(tabName) {
    el.tabs.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    const map = {
        general: el.generalTab,
        tiktok: el.tiktokTab,
        twitch: el.twitchTab,
        overlay: el.overlayTab,
        appearance: el.appearanceTab,
    };

    Object.entries(map).forEach(([name, node]) => {
        if (!node) return;
        node.classList.toggle("hidden", name !== tabName);
    });
}

function applyTheme(theme) {
    document.body.dataset.theme = theme || "dark";
}

function refreshAll() {
    updateStatsUI();
    refreshPanels();
}

function initTabEvents() {
    el.tabs.forEach((btn) => {
        btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });
}

function bindUIEvents() {
    el.configButton.addEventListener("click", () => openModal(el.configWindow));
    el.overlayButton.addEventListener("click", () => openModal(el.overlayWindow));
    el.closeConfig.addEventListener("click", () => closeModal(el.configWindow));
    el.closeOverlay.addEventListener("click", () => closeModal(el.overlayWindow));

    el.saveConfig.addEventListener("click", () => {
        state.settings = collectSettingsFromUI();
        applyTheme(state.settings.appearance.theme);
        saveLocalSettings(state.settings);
        socket.emit("saveSettings", state.settings);
        refreshPanels();
        el.status.textContent = "Configuración guardada.";
        closeModal(el.configWindow);
    });

    el.generateOverlay.addEventListener("click", () => {
        state.settings = collectSettingsFromUI();
        saveLocalSettings(state.settings);
        socket.emit("saveSettings", state.settings);

        const overlayConfig = {
            chat: state.settings.overlay.chat,
            events: state.settings.overlay.events,
            stats: state.settings.overlay.stats,
            platform: state.settings.overlay.platform,
            appearance: state.settings.appearance,
        };

        try {
            localStorage.setItem("streamfusion.overlay.config", JSON.stringify(overlayConfig));
        } catch {}

        el.status.textContent = "Overlay configurado y guardado.";
        closeModal(el.overlayWindow);
    });

    el.connectTikTok.addEventListener("click", () => {
        const username = sanitizeText(el.tiktokUser.value, "");
        if (!username) {
            el.status.textContent = "Escribe un usuario de TikTok.";
            return;
        }
        socket.emit("connectTikTok", username);
    });

    el.disconnectTikTok.addEventListener("click", () => {
        socket.emit("disconnectTikTok");
    });

    el.connectTwitch.addEventListener("click", () => {
        const channel = sanitizeText(el.twitchUser.value, "");
        if (!channel) {
            el.status.textContent = "Escribe un canal de Twitch.";
            return;
        }
        socket.emit("connectTwitch", channel);
    });

    el.disconnectTwitch.addEventListener("click", () => {
        socket.emit("disconnectTwitch");
    });

    el.chatPlatformFilter.addEventListener("change", refreshChatPanel);
    el.eventPlatformFilter.addEventListener("change", refreshEventPanel);
    el.eventTypeFilter.addEventListener("change", refreshEventPanel);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal(el.configWindow);
            closeModal(el.overlayWindow);
        }
    });

    [el.configWindow, el.overlayWindow].forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });
}

function loadInitialSettings() {
    const local = loadLocalSettings();
    if (local) {
        state.settings = mergeDeep(state.settings, local);
    }

    syncSettingsToUI();
    applyTheme(state.settings.appearance.theme);
}

function setupSocket() {
    socket.on("connect", () => {
        el.status.textContent = "Conectado al servidor.";
        setDot(el.tiktokStatusDot, state.connected.tiktok);
        setDot(el.twitchStatusDot, state.connected.twitch);
    });

    socket.on("disconnect", () => {
        el.status.textContent = "Servidor desconectado.";
        setConnectionState("tiktok", false, "TikTok Desconectado");
        setConnectionState("twitch", false, "Twitch Desconectado");
    });

    socket.on("connect_error", (err) => {
        el.status.textContent = err?.message ? `Error: ${err.message}` : "Error de conexión.";
    });

    socket.on("system", (data) => {
        const msg = sanitizeText(data?.message, "Listo");
        parseSystemMessage(msg);
    });

    socket.on("settings", (incoming) => {
        if (incoming) {
            state.settings = mergeDeep(state.settings, incoming);
            syncSettingsToUI();
            applyTheme(state.settings.appearance.theme);
            saveLocalSettings(state.settings);
            refreshPanels();
        }
    });

    socket.on("chat", (data) => {
        if (!data) return;
        routeIncoming(data);
    });

    socket.on("event", (data) => {
        if (!data) return;
        routeIncoming(data);
    });

    socket.on("stats", (incoming) => {
        if (!incoming) return;

        if (incoming.tiktok) {
            state.stats.tiktok = {
                ...state.stats.tiktok,
                ...incoming.tiktok,
            };
        }

        if (incoming.twitch) {
            state.stats.twitch = {
                ...state.stats.twitch,
                ...incoming.twitch,
            };
        }

        updateStatsUI();
    });
}

function bootstrapClock() {
    updateClock();
    setInterval(() => {
        updateClock();
        state.eventsPerSecond = 0;
        el.fps.textContent = "0";
    }, 1000);
}

function bootstrap() {
    loadInitialSettings();
    initTabEvents();
    bindUIEvents();
    setupSocket();
    bootstrapClock();
    updateStatsUI();
    refreshAll();
    socket.emit("loadSettings");
}

bootstrap();
