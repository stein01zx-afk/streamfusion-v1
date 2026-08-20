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
    overlay_key TEXT UNIQUE,
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

CREATE TABLE IF NOT EXISTS point_balances (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    last_kind TEXT NOT NULL DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, platform, username)
);

CREATE TABLE IF NOT EXISTS viewer_profiles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    followed_before INTEGER NOT NULL DEFAULT 0,
    follow_rewarded INTEGER NOT NULL DEFAULT 0,
    ever_donated INTEGER NOT NULL DEFAULT 0,
    total_donations INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, platform, username)
);

CREATE TABLE IF NOT EXISTS user_voices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fish_id TEXT NOT NULL,
    label TEXT NOT NULL,
    author TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fish_id)
);
`);

try { db.exec("ALTER TABLE user_voices ADD COLUMN tags TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN overlay_key TEXT"); } catch {}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_overlay_key ON users(overlay_key)"); } catch {}

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
    const overlayKey = crypto.randomBytes(24).toString("base64url");
    const name = String(displayName || normalizedEmail.split("@")[0]).trim().slice(0, 50) || "Creador";
    try {
        db.prepare("INSERT INTO users(id, email, display_name, password_hash, overlay_key) VALUES(?, ?, ?, ?, ?)")
            .run(id, normalizedEmail, name, hashPassword(password), overlayKey);
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

export function getOrCreateOverlayKey(userId) {
    const existing = db.prepare("SELECT overlay_key FROM users WHERE id = ?").get(String(userId || ""));
    if (!existing) return "";
    if (existing.overlay_key) return String(existing.overlay_key);
    const key = crypto.randomBytes(24).toString("base64url");
    db.prepare("UPDATE users SET overlay_key = ? WHERE id = ?").run(key, String(userId));
    return key;
}

export function getUserByOverlayKey(overlayKey) {
    const row = db.prepare("SELECT id, email, display_name FROM users WHERE overlay_key = ?").get(String(overlayKey || ""));
    return row ? { id: row.id, email: row.email, displayName: row.display_name } : null;
}

export function listUserVoices(userId) {
    return db.prepare(`SELECT id, fish_id AS fishId, label, author, description, image_url AS imageUrl, tags, created_at AS createdAt, updated_at AS updatedAt FROM user_voices WHERE user_id = ? ORDER BY datetime(created_at) ASC, label ASC`).all(String(userId)).map((row) => ({ ...row, tags: String(row.tags || '').split(',').map((x) => x.trim()).filter(Boolean) }));
}

export function upsertUserVoice(userId, voice = {}) {
    const fishId = String(voice.fishId || voice.id || "").trim();
    if (!fishId) throw new Error("Falta el ID de Fish Audio.");
    if (fishId.length > 200) throw new Error("El ID de Fish Audio es demasiado largo.");
    const label = String(voice.label || voice.name || fishId).trim().slice(0, 120) || fishId;
    const author = String(voice.author || "").trim().slice(0, 120);
    const description = String(voice.description || "").trim().slice(0, 500);
    const imageUrl = String(voice.imageUrl || voice.avatarUrl || "").trim().slice(0, 1000);
    const tags = Array.isArray(voice.tags) ? voice.tags : String(voice.tags || '').split(',');
    const suggestedTags = [];
    const addSuggested = (value) => {
      const normalized = String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_/\\-]+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (!normalized) return;
      if (!suggestedTags.includes(normalized)) suggestedTags.push(normalized);
      normalized.split(' ').forEach((part) => {
        if (part.length >= 3 && !suggestedTags.includes(part)) suggestedTags.push(part);
      });
      const compact = normalized.replace(/\s+/g, '');
      if (compact && compact !== normalized && !suggestedTags.includes(compact)) suggestedTags.push(compact);
    };
    addSuggested(label);
    const cleanTags = [...new Set([...tags, ...suggestedTags].map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO user_voices(id,user_id,fish_id,label,author,description,image_url,tags,updated_at)
      VALUES(?,?,?,?,?,?,?, ?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, fish_id) DO UPDATE SET label=excluded.label,author=excluded.author,description=excluded.description,image_url=excluded.image_url,tags=excluded.tags,updated_at=CURRENT_TIMESTAMP`).run(id, String(userId), fishId, label, author, description, imageUrl, cleanTags.join(','));
    const row = db.prepare(`SELECT id, fish_id AS fishId, label, author, description, image_url AS imageUrl, tags, created_at AS createdAt, updated_at AS updatedAt FROM user_voices WHERE user_id=? AND fish_id=?`).get(String(userId), fishId);
    return row ? { ...row, tags: String(row.tags || '').split(',').map((x) => x.trim()).filter(Boolean) } : null;
}

export function deleteUserVoice(userId, fishId) {
    return db.prepare("DELETE FROM user_voices WHERE user_id = ? AND fish_id = ?").run(String(userId), String(fishId || "").trim()).changes > 0;
}


export function addPoints(userId, platform, username, displayName, amount, kind = "") {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u||!amount) return getPoints(uid,p,u);
    db.prepare(`INSERT INTO point_balances(user_id,platform,username,display_name,points,total_earned,last_kind,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id,platform,username) DO UPDATE SET display_name=excluded.display_name, points=point_balances.points+excluded.points, total_earned=point_balances.total_earned+excluded.total_earned,last_kind=excluded.last_kind,updated_at=CURRENT_TIMESTAMP`)
      .run(uid,p,u,String(displayName||u),Math.max(0,Math.floor(amount)),Math.max(0,Math.floor(amount)),String(kind||''));
    return getPoints(uid,p,u);
}

export function getPoints(userId, platform, username) {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u) return {userId:uid,platform:p,username:u,displayName:String(username||''),points:0,totalEarned:0,lastKind:''};
    const row=db.prepare(`SELECT user_id as userId,platform,username,display_name as displayName,points,total_earned as totalEarned,last_kind as lastKind,updated_at as updatedAt FROM point_balances WHERE user_id=? AND platform=? AND username=?`).get(uid,p,u);
    return row || {userId:uid,platform:p,username:u,displayName:String(username||''),points:0,totalEarned:0,lastKind:''};
}

export function spendPoints(userId, platform, username, amount) {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    const cost=Math.max(0,Math.floor(amount||0));
    if(!uid||!u||!cost) return getPoints(uid,p,u);
    db.prepare(`UPDATE point_balances SET points=MAX(0,points-?),updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND platform=? AND username=?`).run(cost,uid,p,u);
    return getPoints(uid,p,u);
}

export function listPointBalances(userId, limit=100, query="") {
    const uid=String(userId||'').trim(); if(!uid) return [];
    const lim=Math.max(1,Math.min(500,Number(limit)||100));
    const q=String(query||'').trim().toLowerCase();
    if (!q) return db.prepare(`SELECT platform,username,display_name as displayName,points,total_earned as totalEarned,last_kind as lastKind,updated_at as updatedAt FROM point_balances WHERE user_id=? ORDER BY points DESC, total_earned DESC LIMIT ?`).all(uid,lim);
    const like=`%${q}%`;
    const balances=db.prepare(`SELECT platform,username,display_name as displayName,points,total_earned as totalEarned,last_kind as lastKind,updated_at as updatedAt FROM point_balances WHERE user_id=? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) ORDER BY points DESC, total_earned DESC LIMIT ?`).all(uid,like,like,lim);
    const profiles=db.prepare(`SELECT vp.platform,vp.username,vp.display_name as displayName,COALESCE(pb.points,0) as points,COALESCE(pb.total_earned,0) as totalEarned,COALESCE(pb.last_kind,'') as lastKind,vp.updated_at as updatedAt FROM viewer_profiles vp LEFT JOIN point_balances pb ON pb.user_id=vp.user_id AND pb.platform=vp.platform AND pb.username=vp.username WHERE vp.user_id=? AND (LOWER(vp.username) LIKE ? OR LOWER(vp.display_name) LIKE ?) AND pb.username IS NULL ORDER BY vp.updated_at DESC LIMIT ?`).all(uid,like,like,lim);
    return [...balances,...profiles].slice(0,lim);
}

export function addManualPoints(userId, platform, username, displayName, amount) {
    return addPoints(userId, platform, username, displayName || username, amount, 'manual');
}

export function deletePointBalance(userId, platform, username) {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u) return false; const info=db.prepare(`DELETE FROM point_balances WHERE user_id=? AND platform=? AND username=?`).run(uid,p,u); return info.changes>0;
}

export function touchViewerProfile(userId, platform, username, displayName='') {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u) return getViewerProfile(uid,p,u,displayName);
    db.prepare(`INSERT INTO viewer_profiles(user_id,platform,username,display_name,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,platform,username) DO UPDATE SET display_name=CASE WHEN excluded.display_name<>'' THEN excluded.display_name ELSE viewer_profiles.display_name END,updated_at=CURRENT_TIMESTAMP`).run(uid,p,u,String(displayName||u));
    return getViewerProfile(uid,p,u,displayName);
}

export function getViewerProfile(userId, platform, username, displayName='') {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u) return {userId:uid,platform:p,username:u,displayName:String(displayName||''),followedBefore:false,followRewarded:false,everDonated:false,totalDonations:0};
    const row=db.prepare(`SELECT user_id as userId,platform,username,display_name as displayName,followed_before as followedBefore,follow_rewarded as followRewarded,ever_donated as everDonated,total_donations as totalDonations,updated_at as updatedAt FROM viewer_profiles WHERE user_id=? AND platform=? AND username=?`).get(uid,p,u);
    return row ? {...row, followedBefore:Boolean(row.followedBefore), followRewarded:Boolean(row.followRewarded), everDonated:Boolean(row.everDonated), totalDonations:Number(row.totalDonations||0)} : {userId:uid,platform:p,username:u,displayName:String(displayName||u),followedBefore:false,followRewarded:false,everDonated:false,totalDonations:0};
}

export function markViewerFollow(userId, platform, username, displayName='') {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u) return getViewerProfile(uid,p,u,displayName);
    db.prepare(`INSERT INTO viewer_profiles(user_id,platform,username,display_name,followed_before,follow_rewarded,ever_donated,total_donations,updated_at) VALUES(?,?,?,?,1,1,0,0,CURRENT_TIMESTAMP) ON CONFLICT(user_id,platform,username) DO UPDATE SET display_name=excluded.display_name,followed_before=1,follow_rewarded=1,updated_at=CURRENT_TIMESTAMP`).run(uid,p,u,String(displayName||u));
    return getViewerProfile(uid,p,u,displayName);
}

export function markViewerDonated(userId, platform, username, displayName='', increment=1) {
    const uid=String(userId||'').trim(), p=String(platform||'tiktok').toLowerCase()==='twitch'?'twitch':'tiktok', u=String(username||'').trim().toLowerCase();
    if(!uid||!u) return getViewerProfile(uid,p,u,displayName);
    const inc=Math.max(1,Math.floor(Number(increment)||1));
    db.prepare(`INSERT INTO viewer_profiles(user_id,platform,username,display_name,followed_before,follow_rewarded,ever_donated,total_donations,updated_at) VALUES(?,?,?,?,0,0,1,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,platform,username) DO UPDATE SET display_name=excluded.display_name,ever_donated=1,total_donations=viewer_profiles.total_donations+excluded.total_donations,updated_at=CURRENT_TIMESTAMP`).run(uid,p,u,String(displayName||u),inc);
    return getViewerProfile(uid,p,u,displayName);
}
