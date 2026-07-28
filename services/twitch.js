const tmi = require("tmi.js");

let client = null;

async function connect(channel, io) {

    if (client) {
        try {
            client.disconnect();
        } catch {}
    }

    client = new tmi.Client({
        channels: [channel]
    });

    client.on("connected", () => {

        io.emit("system", {
            message: "Twitch conectado."
        });

    });

    client.on("message", (channel, tags, message, self) => {

        if (self) return;

        io.emit("chat", {
            platform: "twitch",
            type: "chat",
            user: tags["display-name"] || tags.username,
            color: tags.color,
            badges: tags.badges,
            message: message
        });

    });

    client.on("disconnected", reason => {

        io.emit("system", {
            message: reason
        });

    });

    await client.connect();

}

function disconnect() {

    if (client) {

        try {
            client.disconnect();
        } catch {}

        client = null;

    }

}

module.exports = {
    connect,
    disconnect
};
