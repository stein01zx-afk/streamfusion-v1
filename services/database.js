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

try {
    const overlayColumns = db.prepare("PRAGMA table_info(overlays)").all().map((row) => row.name);
    if (!overlayColumns.includes("user_id")) db.exec("ALTER TABLE overlays ADD COLUMN user_id INTEGER");
} catch {}

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connected_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    provider_id TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    connected INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS overlays (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);


export function createUser({ username, email, passwordHash, avatarUrl = "" } = {}) {
    const u = String(username || "").trim();
    const e = String(email || "").trim().toLowerCase();
    const p = passwordHash ? String(passwordHash) : null;
    if (!u || !e) throw new Error("Usuario y correo son obligatorios.");
    const result = db.prepare(`
        INSERT INTO users(username, email, password_hash, avatar_url)
        VALUES(?, ?, ?, ?)
    `).run(u, e, p, String(avatarUrl || ""));
    return getUserById(result.lastInsertRowid);
}

export function getUserById(id) {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
    return row ? { ...row, id: Number(row.id) } : null;
}

export function getUserByEmail(email) {
    const row = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(String(email || "").trim());
    return row ? { ...row, id: Number(row.id) } : null;
}

export function getUserByUsername(username) {
    const row = db.prepare("SELECT * FROM users WHERE lower(username) = lower(?)").get(String(username || "").trim());
    return row ? { ...row, id: Number(row.id) } : null;
}

export function createSession(id, userId, expiresAt) {
    db.prepare("INSERT INTO sessions(id, user_id, expires_at) VALUES(?, ?, ?)").run(String(id), Number(userId), Number(expiresAt));
}

export function getSession(id) {
    const row = db.prepare(`
        SELECT s.id, s.user_id, s.expires_at, u.username, u.email, u.avatar_url
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > ?
    `).get(String(id), Date.now());
    return row || null;
}

export function deleteSession(id) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(String(id));
}

export function deleteExpiredSessions() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
}

export function getUserSettings(userId, fallback = null) {
    const row = db.prepare("SELECT data FROM user_settings WHERE user_id = ?").get(Number(userId));
    if (!row) return fallback;
    return safeJsonParse(row.data, fallback);
}

export function saveUserSettings(userId, data) {
    db.prepare(`
        INSERT INTO user_settings(user_id, data, updated_at)
        VALUES(?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id)
        DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
    `).run(Number(userId), safeJsonStringify(data));
}

export function getConnectedAccounts(userId) {
    return db.prepare(`
        SELECT platform, username, provider_id, avatar_url, connected, created_at, updated_at
        FROM connected_accounts
        WHERE user_id = ?
        ORDER BY platform
    `).all(Number(userId));
}

export function upsertConnectedAccount(userId, platform, data = {}) {
    db.prepare(`
        INSERT INTO connected_accounts(user_id, platform, username, provider_id, avatar_url, connected, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, platform)
        DO UPDATE SET
            username = excluded.username,
            provider_id = excluded.provider_id,
            avatar_url = excluded.avatar_url,
            connected = excluded.connected,
            updated_at = CURRENT_TIMESTAMP
    `).run(
        Number(userId),
        String(platform || "").toLowerCase(),
        String(data.username || ""),
        String(data.providerId || ""),
        String(data.avatarUrl || ""),
        data.connected ? 1 : 0
    );
}

export function getOverlaysByUser(userId) {
    const rows = db.prepare(`
        SELECT id, name, config, created_at, updated_at
        FROM overlays
        WHERE user_id = ?
        ORDER BY datetime(COALESCE(updated_at, created_at)) DESC
    `).all(Number(userId));
    return rows.map((row) => ({ ...row, config: safeJsonParse(row.config, {}) }));
}

export function getOverlayForUser(userId, id) {
    const row = db.prepare(`
        SELECT id, name, config, created_at, updated_at
        FROM overlays
        WHERE id = ? AND user_id = ?
    `).get(String(id || ""), Number(userId));
    return row ? { ...row, config: safeJsonParse(row.config, {}) } : null;
}

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

export function createOverlay(id, name, config, userId = null) {
    const overlayId = String(id || "").trim();
    const overlayName = String(name || "").trim() || "Overlay";

    if (!overlayId) {
        throw new Error("Overlay ID inválido.");
    }

    db.prepare(`
        INSERT INTO overlays(id, user_id, name, config)
        VALUES(?, ?, ?, ?)
    `).run(
        overlayId,
        userId === null ? null : Number(userId),
        overlayName,
        safeJsonStringify(config)
    );
}

export function updateOverlay(id, name, config, userId = null) {
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
          AND (? IS NULL OR user_id = ?)
    `).run(
        overlayName,
        safeJsonStringify(config),
        overlayId,
        userId === null ? null : Number(userId),
        userId === null ? null : Number(userId)
    );
}

export function upsertOverlay(id, name, config, userId = null) {
    const existing = userId === null ? getOverlay(id) : getOverlayForUser(userId, id);
    if (existing) {
        updateOverlay(id, name, config, userId);
        return;
    }

    createOverlay(id, name, config, userId);
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
