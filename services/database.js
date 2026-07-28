import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFolder = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

export const db = new Database(path.join(dataFolder, "streamfusion.db"));

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

export function getSettings() {
    const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();

    if (!row) {
        return null;
    }

    return JSON.parse(row.data);
}

export function saveSettings(settings) {
    db.prepare(`
        INSERT INTO settings(id,data)
        VALUES(1,?)
        ON CONFLICT(id)
        DO UPDATE SET data=excluded.data
    `).run(JSON.stringify(settings));
}

export function createOverlay(id, name, config) {
    db.prepare(`
        INSERT INTO overlays(id,name,config)
        VALUES(?,?,?)
    `).run(
        id,
        name,
        JSON.stringify(config)
    );
}

export function getOverlay(id) {
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
