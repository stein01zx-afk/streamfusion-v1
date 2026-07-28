require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");

const database = require("./services/database");
const tiktok = require("./services/tiktok");
const twitch = require("./services/twitch");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(compression());

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(express.json());

app.use(express.static(path.join(__dirname, "Public")));

app.get("/api/status", (req, res) => {

    res.json({
        online: true,
        app: "StreamFusion",
        version: "1.0.0"
    });

});

io.on("connection", (socket) => {

    console.log("Cliente conectado");

    socket.emit("system", {
        message: "Conectado a StreamFusion."
    });

    socket.on("connectTikTok", async (username) => {

        try {

            await tiktok.connect(username, io);

        } catch (err) {

            socket.emit("system", {
                message: err.message
            });

        }

    });

    socket.on("connectTwitch", async (channel) => {

        try {

            await twitch.connect(channel, io);

        } catch (err) {

            socket.emit("system", {
                message: err.message
            });

        }

    });

    socket.on("disconnectTikTok", () => {

        tiktok.disconnect();

    });

    socket.on("disconnectTwitch", () => {

        twitch.disconnect();

    });

    socket.on("saveSettings", (settings) => {

        database.saveSettings(settings);

    });

    socket.on("loadSettings", () => {

        socket.emit(
            "settings",
            database.getSettings()
        );

    });

    socket.on("disconnect", () => {

        console.log("Cliente desconectado");

    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log("=================================");
    console.log(" StreamFusion iniciado");
    console.log(" Puerto:", PORT);
    console.log("=================================");

});
