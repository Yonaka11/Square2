// Optional, lightweight admin authentication for the local dashboard.
// ---------------------------------------------------------------------------
// Auth is DISABLED by default (local-first, single user). It turns ON only when
// ADMIN_PASSWORD is set in the environment. Tokens are HMAC-signed (no external
// JWT dependency) and carry an expiry. This keeps the frictionless local flow
// while providing a real gate when the app is exposed beyond localhost.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isAuthEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function signingSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'local-dev-secret';
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(data).digest('base64url');
}

/** Create a signed session token that expires after `ttlMs`. */
export function signToken(ttlMs: number = DEFAULT_TTL_MS): string {
  const payload = base64url(JSON.stringify({ exp: Date.now() + ttlMs }));
  return `${payload}.${hmac(payload)}`;
}

/** Validate a signed token (signature + expiry). Pure + unit-testable. */
export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = hmac(payload);
  // Constant-time comparison.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

/** Validate the admin password against ADMIN_PASSWORD (constant-time). */
export function checkPassword(password: string | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Express middleware that protects API routes when auth is enabled. Paths in
 * `openPaths` (prefix match) are always allowed (login, health, webhooks).
 */
export function requireAuth(openPaths: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isAuthEnabled()) return next();
    // Use originalUrl so matching is independent of the router mount prefix.
    const url = req.originalUrl.split('?')[0];
    if (openPaths.some((p) => url.startsWith(p))) return next();
    if (verifyToken(bearer(req))) return next();
    res.status(401).json({ error: 'Authentication required' });
  };
}
