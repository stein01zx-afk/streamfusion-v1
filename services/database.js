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
  const cols = new Set(db.prepare("PRAGMA table_info(overlays)").all().map((r) => r.name));
  if (!cols.has("owner_user_id")) db.exec("ALTER TABLE overlays ADD COLUMN owner_user_id INTEGER");
  if (!cols.has("public_token")) db.exec("ALTER TABLE overlays ADD COLUMN public_token TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_overlays_public_token ON overlays(public_token) WHERE public_token IS NOT NULL");
} catch {}

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS overlays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    owner_user_id INTEGER,
    public_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    password_salt TEXT,
    display_name TEXT NOT NULL,
    avatar TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password',
    tiktok_provider_id TEXT UNIQUE,
    tiktok_username TEXT,
    tiktok_access_token TEXT,
    tiktok_refresh_token TEXT,
    tiktok_expires_at INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    expires_at INTEGER NOT NULL
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


export function createUser({ username, email = null, passwordHash = null, passwordSalt = null, displayName, avatar = '', authProvider = 'password', tiktokProviderId = null, tiktokUsername = null, tiktokAccessToken = null, tiktokRefreshToken = null, tiktokExpiresAt = null }) {
    const result = db.prepare(`INSERT INTO users(username,email,password_hash,password_salt,display_name,avatar,auth_provider,tiktok_provider_id,tiktok_username,tiktok_access_token,tiktok_refresh_token,tiktok_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(username,email,passwordHash,passwordSalt,displayName,avatar,authProvider,tiktokProviderId,tiktokUsername,tiktokAccessToken,tiktokRefreshToken,tiktokExpiresAt);
    return getUserById(result.lastInsertRowid);
}

export function getUserById(id) { return db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id)); }
export function getUserByEmail(email) { return db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(String(email || '').trim()); }
export function getUserByUsername(username) { return db.prepare('SELECT * FROM users WHERE lower(username)=lower(?)').get(String(username || '').trim()); }
export function getUserByTikTokId(id) { return db.prepare('SELECT * FROM users WHERE tiktok_provider_id = ?').get(String(id || '')); }
export function updateUser(id, patch = {}) {
    const allowed = ['email','display_name','avatar','auth_provider','tiktok_provider_id','tiktok_username','tiktok_access_token','tiktok_refresh_token','tiktok_expires_at'];
    const keys = Object.keys(patch).filter(k => allowed.includes(k));
    if (!keys.length) return getUserById(id);
    const set = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...keys.map(k => patch[k]), Number(id));
    return getUserById(id);
}

export function createSession(token, userId, expiresAt) { db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(token, Number(userId), Number(expiresAt)); }
export function getSession(token) { return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token); }
export function touchSession(token, expiresAt) { db.prepare('UPDATE sessions SET expires_at=? WHERE token=?').run(Number(expiresAt), token); }
export function deleteSession(token) { db.prepare('DELETE FROM sessions WHERE token=?').run(token); }

export function getUserSettings(userId) {
    const row = db.prepare('SELECT data FROM user_settings WHERE user_id=?').get(Number(userId));
    return row ? safeJsonParse(row.data, null) : null;
}
export function saveUserSettings(userId, settings) {
    db.prepare(`INSERT INTO user_settings(user_id,data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP`).run(Number(userId), safeJsonStringify(settings));
}

export function createOAuthState(state, payload, expiresAt) { db.prepare('INSERT INTO oauth_states(state,payload,expires_at) VALUES(?,?,?)').run(state,payload,Number(expiresAt)); }
export function consumeOAuthState(state) { const row=db.prepare('SELECT * FROM oauth_states WHERE state=?').get(state); db.prepare('DELETE FROM oauth_states WHERE state=?').run(state); return row; }

export function setOverlayOwner(id, ownerUserId, publicToken) {
    db.prepare('UPDATE overlays SET owner_user_id=?, public_token=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(ownerUserId ? Number(ownerUserId) : null, publicToken || null, id);
}
export function getOverlayByPublicToken(token) {
    const row = db.prepare('SELECT * FROM overlays WHERE public_token=?').get(String(token || ''));
    return row ? { ...row, config: safeJsonParse(row.config, {}) } : null;
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
