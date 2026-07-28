const socket = io();

const status = document.getElementById("status");
const chat = document.getElementById("chat");

const tiktokUser = document.getElementById("tiktokUser");
const twitchUser = document.getElementById("twitchUser");

const connectTikTok = document.getElementById("connectTikTok");
const connectTwitch = document.getElementById("connectTwitch");

const configWindow = document.getElementById("configWindow");
const configButton = document.getElementById("configButton");
const closeConfig = document.getElementById("closeConfig");
const saveConfig = document.getElementById("saveConfig");

let settings = {
    tiktok: {
        chat: true,
        gifts: true,
        likes: true
    },
    twitch: {
        chat: true
    }
};

function mergeSettings(base, incoming) {
    return {
        ...base,
        ...incoming,
        tiktok: {
            ...base.tiktok,
            ...(incoming?.tiktok || {})
        },
        twitch: {
            ...base.twitch,
            ...(incoming?.twitch || {})
        }
    };
}

function shouldRenderMessage(data) {
    if (!data || !data.platform) return true;

    if (data.platform === "tiktok") {
        if (data.type === "chat") return settings.tiktok.chat;
        if (data.type === "gift") return settings.tiktok.gifts;
        if (data.type === "like") return settings.tiktok.likes;

        return true;
    }

    if (data.platform === "twitch") {
        return settings.twitch.chat;
    }

    return true;
}

function safeText(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
}

function iconForType(type) {
    const icons = {
        chat: "💬",
        gift: "🎁",
        like: "❤️",
        follow: "➕",
        share: "📤",
        member: "👋",
        emote: "✨",
        question: "❓",
        roomUser: "📊",
        social: "🔔",
        liveIntro: "🎬",
        streamEnd: "⛔",
        superFan: "⭐",
        superFanJoin: "⭐",
        superFanBox: "🎁",
        envelope: "🧧"
    };

    return icons[type] || "🎥";
}

function titleFor(data) {
    if (!data) return "Acción";

    const titles = {
        chat: "Comentario",
        gift: "Regalo",
        like: "Like",
        follow: "Nuevo seguidor",
        share: "Compartió",
        member: "Nuevo espectador",
        emote: "Emote",
        question: "Pregunta",
        roomUser: "Espectadores",
        social: "Acción social",
        liveIntro: "Intro",
        streamEnd: "Fin del live",
        superFan: "Super Fan",
        superFanJoin: "Super Fan",
        superFanBox: "Caja Super Fan",
        envelope: "Sobre"
    };

    return safeText(data.action, titles[data.type] || data.type || "Acción TikTok");
}

function renderMessage(data) {
    if (!shouldRenderMessage(data)) return;

    const div = document.createElement("div");
    div.className = `message ${safeText(data.platform, "unknown")}`;

    const header = document.createElement("div");
    header.className = "user";
    header.textContent = `${iconForType(data.type)} ${titleFor(data)}`;

    const body = document.createElement("div");

    if (data.type === "chat") {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        const message = safeText(data.message, "Mensaje sin texto");
        body.textContent = `${user}: ${message}`;
    } else if (data.type === "gift") {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        const gift = safeText(data.gift, "Regalo");
        const amount = Number(data.amount || 1);
        body.textContent = `${user} envió ${gift} x${amount}`;
    } else if (data.type === "like") {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        const likes = Number(data.likes || 0);
        body.textContent = `${user} dio ${likes} like${likes === 1 ? "" : "s"}`;
    } else if (data.type === "follow") {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        body.textContent = `${user} comenzó a seguir`;
    } else if (data.type === "share") {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        body.textContent = `${user} compartió el LIVE`;
    } else if (data.type === "member") {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        body.textContent = `${user} entró al directo`;
    } else if (data.type === "roomUser") {
        body.textContent = safeText(data.message, "Sin datos");
    } else if (data.type === "streamEnd") {
        body.textContent = safeText(data.message, "TikTok cerró el directo");
    } else {
        const user = safeText(data.user || data.uniqueId, "Usuario");
        const message = safeText(data.message, "");
        body.textContent = message ? `${user}: ${message}` : user;
    }

    div.appendChild(header);
    div.appendChild(body);

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

configButton.onclick = () => {
    configWindow.style.display = "flex";
};

closeConfig.onclick = () => {
    configWindow.style.display = "none";
};

connectTikTok.onclick = () => {
    if (tiktokUser.value.trim() === "") return;
    socket.emit("connectTikTok", tiktokUser.value.trim());
};

connectTwitch.onclick = () => {
    if (twitchUser.value.trim() === "") return;
    socket.emit("connectTwitch", twitchUser.value.trim());
};

saveConfig.onclick = () => {
    const config = {
        tiktok: {
            chat: document.getElementById("showTikTokChat").checked,
            gifts: document.getElementById("showTikTokGifts").checked,
            likes: document.getElementById("showTikTokLikes").checked
        },
        twitch: {
            chat: document.getElementById("showTwitchChat").checked
        }
    };

    settings = mergeSettings(settings, config);

    socket.emit("saveSettings", config);
    configWindow.style.display = "none";
};

socket.emit("loadSettings");

socket.on("settings", (config) => {
    if (!config) return;

    settings = mergeSettings(settings, config);

    document.getElementById("showTikTokChat").checked = settings.tiktok.chat;
    document.getElementById("showTikTokGifts").checked = settings.tiktok.gifts;
    document.getElementById("showTikTokLikes").checked = settings.tiktok.likes;
    document.getElementById("showTwitchChat").checked = settings.twitch.chat;
});

socket.on("system", (data) => {
    status.textContent = safeText(data?.message, "Listo");
});

socket.on("chat", (data) => {
    renderMessage(data);
});
