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

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS overlays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

function safeJsonParse(value, fallback = null) {
    if (value === null || value === undefined) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function safeJsonStringify(value) {
    return JSON.stringify(value ?? {});
}

export function getSettings() {
    const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();
    if (!row) return null;

    const parsed = safeJsonParse(row.data, null);
    return parsed ?? null;
}

export function saveSettings(settings) {
    db.prepare(`
        INSERT INTO settings(id, data)
        VALUES(1, ?)
        ON CONFLICT(id)
        DO UPDATE SET data = excluded.data
    `).run(safeJsonStringify(settings));
}

export function resetSettings() {
    db.prepare("DELETE FROM settings WHERE id = 1").run();
}

export function createOverlay(id, name, config) {
    const overlayId = String(id || "").trim();
    const overlayName = String(name || "").trim() || "Overlay";

    if (!overlayId) {
        throw new Error("Overlay ID inválido.");
    }

    db.prepare(`
        INSERT INTO overlays(id, name, config)
        VALUES(?, ?, ?)
    `).run(
        overlayId,
        overlayName,
        safeJsonStringify(config)
    );
}

export function updateOverlay(id, name, config) {
    const overlayId = String(id || "").trim();
    const overlayName = String(name || "").trim() || "Overlay";

    if (!overlayId) {
        throw new Error("Overlay ID inválido.");
    }

    db.prepare(`
        UPDATE overlays
        SET name = ?,
            config = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        overlayName,
        safeJsonStringify(config),
        overlayId
    );
}

export function upsertOverlay(id, name, config) {
    const existing = getOverlay(id);
    if (existing) {
        updateOverlay(id, name, config);
        return;
    }

    createOverlay(id, name, config);
}

export function deleteOverlay(id) {
    const overlayId = String(id || "").trim();
    if (!overlayId) return;

    db.prepare("DELETE FROM overlays WHERE id = ?").run(overlayId);
}

export function getOverlay(id) {
    const overlayId = String(id || "").trim();
    if (!overlayId) return null;

    const row = db.prepare(`
        SELECT *
        FROM overlays
        WHERE id = ?
    `).get(overlayId);

    if (!row) return null;

    return {
        ...row,
        config: safeJsonParse(row.config, {}),
    };
}

export function listOverlays() {
    const rows = db.prepare(`
        SELECT id, name, config, created_at, updated_at
        FROM overlays
        ORDER BY datetime(COALESCE(updated_at, created_at)) DESC
    `).all();

    return rows.map((row) => ({
        ...row,
        config: safeJsonParse(row.config, {}),
    }));
}

