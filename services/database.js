import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "node:crypto";

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

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_voices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fish_id TEXT NOT NULL,
    label TEXT NOT NULL,
    author TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fish_id)
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

// Authentication is deliberately kept in the local SQLite database: no third party
// login is required to watch a public TikTok/Twitch live. Passwords are never stored
// as plain text and sessions are opaque, expiring tokens.
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const digest = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return `${salt}:${digest}`;
}

function passwordMatches(password, encoded) {
    const [salt, digest] = String(encoded || "").split(":");
    if (!salt || !digest) return false;
    const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(digest, "hex"));
}

export function createUser({ email, password, displayName }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Ingresa un correo válido.");
    if (String(password || "").length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    const id = crypto.randomUUID();
    const name = String(displayName || normalizedEmail.split("@")[0]).trim().slice(0, 50) || "Creador";
    try {
        db.prepare("INSERT INTO users(id, email, display_name, password_hash) VALUES(?, ?, ?, ?)")
            .run(id, normalizedEmail, name, hashPassword(password));
    } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new Error("Ese correo ya tiene una cuenta.");
        throw error;
    }
    return { id, email: normalizedEmail, displayName: name };
}

export function authenticateUser({ email, password }) {
    const user = db.prepare("SELECT id, email, display_name, password_hash FROM users WHERE email = ?")
        .get(String(email || "").trim().toLowerCase());
    if (!user || !passwordMatches(password, user.password_hash)) throw new Error("Correo o contraseña incorrectos.");
    return { id: user.id, email: user.email, displayName: user.display_name };
}

export function createSession(userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
    db.prepare("INSERT INTO user_sessions(token, user_id, expires_at) VALUES(?, ?, ?)").run(token, userId, expiresAt);
    return token;
}

export function getSession(token) {
    if (!token) return null;
    const row = db.prepare(`SELECT u.id, u.email, u.display_name FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?`)
        .get(String(token), Date.now());
    return row ? { id: row.id, email: row.email, displayName: row.display_name } : null;
}

export function deleteSession(token) { if (token) db.prepare("DELETE FROM user_sessions WHERE token=?").run(String(token)); }

export function getUserSettings(userId) {
    const row = db.prepare("SELECT data FROM user_settings WHERE user_id=?").get(userId);
    return row ? safeJsonParse(row.data, {}) : {};
}

export function saveUserSettings(userId, settings) {
    db.prepare(`INSERT INTO user_settings(user_id,data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP`).run(userId, safeJsonStringify(settings));
}


export function getUserById(userId) {
    const row = db.prepare("SELECT id, email, display_name FROM users WHERE id = ?").get(String(userId || ""));
    return row ? { id: row.id, email: row.email, displayName: row.display_name } : null;
}

export function listUserVoices(userId) {
    return db.prepare(`SELECT id, fish_id AS fishId, label, author, description, image_url AS imageUrl, created_at AS createdAt, updated_at AS updatedAt FROM user_voices WHERE user_id = ? ORDER BY datetime(created_at) ASC, label ASC`).all(String(userId));
}

export function upsertUserVoice(userId, voice = {}) {
    const fishId = String(voice.fishId || voice.id || "").trim();
    if (!fishId) throw new Error("Falta el ID de Fish Audio.");
    if (fishId.length > 200) throw new Error("El ID de Fish Audio es demasiado largo.");
    const label = String(voice.label || voice.name || fishId).trim().slice(0, 120) || fishId;
    const author = String(voice.author || "").trim().slice(0, 120);
    const description = String(voice.description || "").trim().slice(0, 500);
    const imageUrl = String(voice.imageUrl || voice.avatarUrl || "").trim().slice(0, 1000);
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO user_voices(id,user_id,fish_id,label,author,description,image_url,updated_at)
      VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, fish_id) DO UPDATE SET label=excluded.label,author=excluded.author,description=excluded.description,image_url=excluded.image_url,updated_at=CURRENT_TIMESTAMP`).run(id, String(userId), fishId, label, author, description, imageUrl);
    return db.prepare(`SELECT id, fish_id AS fishId, label, author, description, image_url AS imageUrl, created_at AS createdAt, updated_at AS updatedAt FROM user_voices WHERE user_id=? AND fish_id=?`).get(String(userId), fishId);
}

export function deleteUserVoice(userId, fishId) {
    return db.prepare("DELETE FROM user_voices WHERE user_id = ? AND fish_id = ?").run(String(userId), String(fishId || "").trim()).changes > 0;
}
