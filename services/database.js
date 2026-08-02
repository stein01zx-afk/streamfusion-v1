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

CREATE TABLE IF NOT EXISTS spectators (
    platform TEXT NOT NULL,
    unique_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    last_type TEXT NOT NULL DEFAULT 'chat',
    is_follower INTEGER NOT NULL DEFAULT 0,
    is_moderator INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT NOT NULL DEFAULT '',
    PRIMARY KEY(platform, unique_id)
);

CREATE INDEX IF NOT EXISTS idx_spectators_last_seen ON spectators(platform, last_seen_at DESC);
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

function normalizeSpectatorPlatform(platform) {
    return String(platform || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok";
}

function normalizeSpectatorKey(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

export function upsertSpectator(entry) {
    const platform = normalizeSpectatorPlatform(entry?.platform);
    const uniqueId = normalizeSpectatorKey(entry?.uniqueId || entry?.unique_id || entry?.username || entry?.displayName || entry?.display_name, "");
    if (!uniqueId) return null;

    const username = normalizeSpectatorKey(entry?.username || entry?.user || entry?.displayName || entry?.display_name || uniqueId, uniqueId);
    const displayName = normalizeSpectatorKey(entry?.displayName || entry?.display_name || username, username);
    const now = Number(entry?.lastSeenAt || entry?.last_seen_at || Date.now());
    const messageCount = Math.max(0, Number(entry?.messageCount ?? entry?.message_count ?? 0) || 0);
    const lastType = normalizeSpectatorKey(entry?.lastType || entry?.last_type || "chat", "chat");
    const isFollower = Number(Boolean(entry?.isFollower ?? entry?.is_follower)) ? 1 : 0;
    const isModerator = Number(Boolean(entry?.isModerator ?? entry?.is_moderator)) ? 1 : 0;
    const avatarUrl = normalizeSpectatorKey(entry?.avatarUrl || entry?.avatar_url || "", "");

    const existing = db.prepare(`
        SELECT message_count
        FROM spectators
        WHERE platform = ? AND unique_id = ?
    `).get(platform, uniqueId);

    const nextCount = Math.max(1, (Number(existing?.message_count || 0) || 0) + (messageCount > 0 ? messageCount : 1));

    db.prepare(`
        INSERT INTO spectators(
            platform, unique_id, username, display_name, last_seen_at, message_count,
            last_type, is_follower, is_moderator, avatar_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(platform, unique_id)
        DO UPDATE SET
            username = excluded.username,
            display_name = excluded.display_name,
            last_seen_at = excluded.last_seen_at,
            message_count = excluded.message_count,
            last_type = excluded.last_type,
            is_follower = excluded.is_follower,
            is_moderator = excluded.is_moderator,
            avatar_url = excluded.avatar_url
    `).run(platform, uniqueId, username, displayName, now, nextCount, lastType, isFollower, isModerator, avatarUrl);

    return {
        platform,
        uniqueId,
        username,
        displayName,
        lastSeenAt: now,
        messageCount: nextCount,
        lastType,
        isFollower: Boolean(isFollower),
        isModerator: Boolean(isModerator),
        avatarUrl,
    };
}

export function listSpectators({ platform = null, limit = 250 } = {}) {
    const max = Math.max(1, Math.min(1000, Number(limit) || 250));
    const normalizedPlatform = platform ? normalizeSpectatorPlatform(platform) : null;
    const rows = normalizedPlatform
        ? db.prepare(`
            SELECT platform, unique_id, username, display_name, last_seen_at, message_count, last_type, is_follower, is_moderator, avatar_url
            FROM spectators
            WHERE platform = ?
            ORDER BY last_seen_at DESC, message_count DESC, display_name COLLATE NOCASE ASC
            LIMIT ?
        `).all(normalizedPlatform, max)
        : db.prepare(`
            SELECT platform, unique_id, username, display_name, last_seen_at, message_count, last_type, is_follower, is_moderator, avatar_url
            FROM spectators
            ORDER BY last_seen_at DESC, message_count DESC, display_name COLLATE NOCASE ASC
            LIMIT ?
        `).all(max);

    return rows.map((row) => ({
        platform: row.platform,
        uniqueId: row.unique_id,
        username: row.username,
        displayName: row.display_name,
        lastSeenAt: row.last_seen_at,
        messageCount: row.message_count,
        lastType: row.last_type,
        isFollower: Boolean(row.is_follower),
        isModerator: Boolean(row.is_moderator),
        avatarUrl: row.avatar_url,
    }));
}
