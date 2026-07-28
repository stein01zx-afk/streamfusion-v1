const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataFolder = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const db = new Database(path.join(dataFolder, "streamfusion.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS overlays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

function getSettings() {
    const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();

    if (!row) {
        return null;
    }

    return JSON.parse(row.data);
}

function saveSettings(settings) {
    db.prepare(`
        INSERT INTO settings(id,data)
        VALUES(1,?)
        ON CONFLICT(id)
        DO UPDATE SET data=excluded.data
    `).run(JSON.stringify(settings));
}

function createOverlay(id, name, config) {
    db.prepare(`
        INSERT INTO overlays(id,name,config)
        VALUES(?,?,?)
    `).run(
        id,
        name,
        JSON.stringify(config)
    );
}

function getOverlay(id) {
    const row = db.prepare(`
        SELECT *
        FROM overlays
        WHERE id=?
    `).get(id);

    if (!row) {
        return null;
    }

    row.config = JSON.parse(row.config);

    return row;
}

module.exports = {
    db,
    getSettings,
    saveSettings,
    createOverlay,
    getOverlay
};
