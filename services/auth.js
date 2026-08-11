import crypto from 'node:crypto';
import * as database from './database.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PENDING_TTL_MS = 1000 * 60 * 10;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  try {
    const derived = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function createPasswordHash(password) {
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  return hashPassword(password);
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  database.createSession(token, Number(userId), Date.now() + SESSION_TTL_MS);
  return token;
}

export function getUserFromSession(token) {
  if (!token) return null;
  const row = database.getSession(token);
  if (!row) return null;
  if (Number(row.expires_at || 0) < Date.now()) {
    database.deleteSession(token);
    return null;
  }
  database.touchSession(token, Date.now() + SESSION_TTL_MS);
  return database.getUserById(row.user_id);
}

export function destroySession(token) {
  if (token) database.deleteSession(token);
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || '',
    displayName: user.display_name || user.username,
    authProvider: user.auth_provider || 'password',
    createdAt: user.created_at,
    tiktokConnected: Boolean(user.tiktok_provider_id),
    tiktokUsername: user.tiktok_username || "",
    tiktokAvatar: user.avatar || "",
  };
}

export function createOAuthState(payload = {}) {
  const state = crypto.randomBytes(24).toString('hex');
  database.createOAuthState(state, JSON.stringify(payload), Date.now() + PENDING_TTL_MS);
  return state;
}

export function consumeOAuthState(state) {
  if (!state) return null;
  const row = database.consumeOAuthState(state);
  if (!row || Number(row.expires_at || 0) < Date.now()) return null;
  try { return JSON.parse(row.payload || '{}'); } catch { return {}; }
}
