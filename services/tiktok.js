const { WebcastPushConnection } = require("tiktok-live-connector");

let connection = null;

async function connect(username, io) {

    if (connection) {
        try {
            connection.disconnect();
        } catch {}
    }

    connection = new WebcastPushConnection(username);

    connection.on("chat", data => {

        io.emit("chat", {
            platform: "tiktok",
            type: "chat",
            user: data.nickname,
            uniqueId: data.uniqueId,
            message: data.comment
        });

    });

    connection.on("gift", data => {

        io.emit("chat", {
            platform: "tiktok",
            type: "gift",
            user: data.nickname,
            uniqueId: data.uniqueId,
            gift: data.giftName,
            amount: data.repeatCount
        });

    });

    connection.on("like", data => {

        io.emit("chat", {
            platform: "tiktok",
            type: "like",
            user: data.nickname,
            likes: data.likeCount
        });

    });

    connection.on("follow", data => {

        io.emit("chat", {
            platform: "tiktok",
            type: "follow",
            user: data.nickname
        });

    });

    connection.on("share", data => {

        io.emit("chat", {
            platform: "tiktok",
            type: "share",
            user: data.nickname
        });

    });

    connection.on("connected", () => {

        io.emit("system", {
            message: "TikTok conectado."
        });

    });

    connection.on("disconnected", () => {

        io.emit("system", {
            message: "TikTok desconectado."
        });

    });

    connection.on("error", error => {

        io.emit("system", {
            message: error.toString()
        });

    });

    await connection.connect();

}

function disconnect() {

    if (connection) {

        try {
            connection.disconnect();
        } catch {}

        connection = null;

    }

}

module.exports = {
    connect,
    disconnect
};
