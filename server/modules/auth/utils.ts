import { createHash, randomUUID } from 'crypto';
import type { AccessTokenPayload, RefreshTokenPayload } from './models';

// JWT secret keys from environment
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

// Token expiration times
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m'; // 15 minutes
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days

/**
 * Parse expiration string to milliseconds
 * Supports: '15m', '7d', '1h'
 */
function parseExpirationToMs(expiration: string): number {
  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiration format: ${expiration}`);

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Create a simple JWT manually (Bun-compatible)
 * Format: base64(header).base64(payload).signature
 */
function createToken(payload: any, secret: string, expiresIn: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(parseExpirationToMs(expiresIn) / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = { ...payload, iat: now, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${secret}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
function verifyToken<T = any>(token: string, secret: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature
  const expectedSignature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${secret}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  // Decode payload
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Generate an access token (short-lived)
 */
export function generateAccessToken(userId: string, username: string, email: string): string {
  const payload: AccessTokenPayload = {
    userId,
    username,
    email,
    type: 'access',
  };

  return createToken(payload, ACCESS_SECRET, ACCESS_EXPIRES_IN);
}

/**
 * Generate a refresh token (long-lived)
 */
export function generateRefreshToken(userId: string, tokenFamily?: string): { token: string; tokenFamily: string } {
  const family = tokenFamily || randomUUID();

  const payload: RefreshTokenPayload = {
    userId,
    tokenFamily: family,
    type: 'refresh',
  };

  const token = createToken(payload, REFRESH_SECRET, REFRESH_EXPIRES_IN);
  return { token, tokenFamily: family };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = verifyToken<AccessTokenPayload>(token, ACCESS_SECRET);

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw new Error(`Invalid access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = verifyToken<RefreshTokenPayload>(token, REFRESH_SECRET);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Hash a token for secure storage (SHA256)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Get expiration date for refresh tokens
 */
export function getRefreshTokenExpiration(): Date {
  const ms = parseExpirationToMs(REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
}

/**
 * Generate a random state for CSRF protection
 */
export function generateState(): string {
  return randomUUID();
}
