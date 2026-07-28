import {
    TikTokLiveConnection,
    WebcastEvent,
    ControlEvent
} from "tiktok-live-connector";

let connection = null;

export async function connect(username, io) {

    if (connection) {
        try {
            await connection.disconnect();
        } catch {}
    }

    connection = new TikTokLiveConnection(username, {
        signApiKey: process.env.EULER_API_KEY
    });

    connection.on(ControlEvent.CONNECTED, () => {

        io.emit("system", {
            message: "TikTok conectado."
        });

    });

    connection.on(ControlEvent.DISCONNECTED, () => {

        io.emit("system", {
            message: "TikTok desconectado."
        });

    });

    connection.on(ControlEvent.ERROR, ({ info, exception }) => {

        io.emit("system", {
            message: exception?.message || info || "Error de TikTok"
        });

    });

    connection.on(WebcastEvent.CHAT, (data) => {

        io.emit("chat", {
            platform: "tiktok",
            type: "chat",
            user: data.user?.nickname,
            uniqueId: data.user?.uniqueId,
            message: data.comment
        });

    });

    connection.on(WebcastEvent.GIFT, (data) => {

        io.emit("chat", {
            platform: "tiktok",
            type: "gift",
            user: data.user?.nickname,
            uniqueId: data.user?.uniqueId,
            gift: data.giftDetails?.giftName ?? data.giftId,
            amount: data.repeatCount
        });

    });

    connection.on(WebcastEvent.LIKE, (data) => {

        io.emit("chat", {
            platform: "tiktok",
            type: "like",
            user: data.user?.nickname,
            likes: data.likeCount
        });

    });

    connection.on(WebcastEvent.FOLLOW, (data) => {

        io.emit("chat", {
            platform: "tiktok",
            type: "follow",
            user: data.user?.nickname
        });

    });

    connection.on(WebcastEvent.SHARE, (data) => {

        io.emit("chat", {
            platform: "tiktok",
            type: "share",
            user: data.user?.nickname
        });

    });

    await connection.connect();

}

export async function disconnect() {

    if (!connection) return;

    try {
        await connection.disconnect();
    } catch {}

    connection = null;

}
