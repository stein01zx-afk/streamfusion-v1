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

CREATE TABLE IF NOT EXISTS points_accounts (
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(platform, username)
);

CREATE TABLE IF NOT EXISTS voice_power_users (
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    granted_by TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    spent_points INTEGER NOT NULL DEFAULT 0,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(platform, username)
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


export function getPointsAccount(platform, username) {
    const row = db.prepare(`SELECT * FROM points_accounts WHERE platform = ? AND username = ?`).get(String(platform||"tiktok").toLowerCase(), String(username||"").toLowerCase());
    return row ? { platform: row.platform, username: row.username, displayName: row.display_name, points: Number(row.points||0), updatedAt: row.updated_at } : null;
}

export function upsertPointsAccount(platform, username, displayName = "", points = 0) {
    const p = String(platform||"tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const u = String(username||"").trim().replace(/^[@#]+/, "").toLowerCase();
    if (!u) return null;
    const n = Math.max(0, Math.floor(Number(points)||0));
    db.prepare(`INSERT INTO points_accounts(platform,username,display_name,points,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(platform,username) DO UPDATE SET display_name=excluded.display_name, points=excluded.points, updated_at=CURRENT_TIMESTAMP`).run(p,u,String(displayName||u),n);
    return getPointsAccount(p,u);
}

export function addPoints(platform, username, displayName, delta) {
    const current = getPointsAccount(platform, username);
    return upsertPointsAccount(platform, username, displayName, Math.max(0, Number(current?.points||0) + Math.floor(Number(delta)||0)));
}

export function spendPoints(platform, username, displayName, cost) {
    const current = getPointsAccount(platform, username);
    const amount = Math.max(0, Math.floor(Number(cost)||0));
    if (Number(current?.points||0) < amount) return null;
    return upsertPointsAccount(platform, username, displayName, Number(current.points||0) - amount);
}

export function listPointsAccounts(platform = "") {
    const rows = platform ? db.prepare(`SELECT * FROM points_accounts WHERE platform = ? ORDER BY points DESC, username ASC`).all(String(platform).toLowerCase()) : db.prepare(`SELECT * FROM points_accounts ORDER BY points DESC, username ASC`).all();
    return rows.map(row => ({ platform: row.platform, username: row.username, displayName: row.display_name, points: Number(row.points||0), updatedAt: row.updated_at }));
}

export function listVoicePowerUsers() {
    return db.prepare(`SELECT * FROM voice_power_users ORDER BY active DESC, updated_at DESC, username ASC`).all().map(row => ({ platform: row.platform, username: row.username, displayName: row.display_name, reason: row.reason, grantedBy: row.granted_by, createdAt: Number(row.created_at||0), updatedAt: Number(row.updated_at||0), expiresAt: Number(row.expires_at||0), active: Boolean(row.active), spentPoints: Number(row.spent_points||0), triggerCount: Number(row.trigger_count||0) }));
}

export function getVoicePowerUser(platform, username) {
    const p = String(platform||"tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const u = String(username||"").trim().replace(/^[@#]+/, "").toLowerCase();
    const row = db.prepare(`SELECT * FROM voice_power_users WHERE platform = ? AND username = ?`).get(p,u);
    return row ? { platform: row.platform, username: row.username, displayName: row.display_name, reason: row.reason, grantedBy: row.granted_by, createdAt: Number(row.created_at||0), updatedAt: Number(row.updated_at||0), expiresAt: Number(row.expires_at||0), active: Boolean(row.active), spentPoints: Number(row.spent_points||0), triggerCount: Number(row.trigger_count||0) } : null;
}

export function upsertVoicePowerUser(entry) {
    const p = String(entry?.platform||"tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const u = String(entry?.username||"").trim().replace(/^[@#]+/, "").toLowerCase();
    if (!u) return null;
    const now = Date.now();
    db.prepare(`INSERT INTO voice_power_users(platform,username,display_name,reason,granted_by,created_at,updated_at,expires_at,active,spent_points,trigger_count) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(platform,username) DO UPDATE SET display_name=excluded.display_name, reason=excluded.reason, granted_by=excluded.granted_by, updated_at=excluded.updated_at, expires_at=excluded.expires_at, active=excluded.active, spent_points=excluded.spent_points, trigger_count=excluded.trigger_count`).run(p,u,String(entry?.displayName||u),String(entry?.reason||""),String(entry?.grantedBy||"system"),Number(entry?.createdAt||now),now,Number(entry?.expiresAt||0),entry?.active===false?0:1,Number(entry?.spentPoints||0),Number(entry?.triggerCount||0));
    return getVoicePowerUser(p,u);
}

export function removeVoicePowerUser(platform, username) {
    const p = String(platform||"tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
    const u = String(username||"").trim().replace(/^[@#]+/, "").toLowerCase();
    db.prepare(`DELETE FROM voice_power_users WHERE platform = ? AND username = ?`).run(p,u);
}
