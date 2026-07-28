import tmi from "tmi.js";

let client = null;

export async function connect(channel, io) {

    if (client) {
        try {
            await client.disconnect();
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
            message
        });

    });

    client.on("disconnected", (reason) => {

        io.emit("system", {
            message: reason
        });

    });

    await client.connect();

}

export function disconnect() {

    if (!client) return;

    try {
        client.disconnect();
    } catch {}

    client = null;

}
