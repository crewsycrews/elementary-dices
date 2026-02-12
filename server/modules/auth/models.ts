import { t } from 'elysia';

// ===== Request DTOs =====

export const LoginDTO = t.Object({
  username: t.String({ minLength: 3, maxLength: 20 }),
  password: t.String({ minLength: 1 }),
});

export const GoogleCallbackDTO = t.Object({
  code: t.String(),
  state: t.String(),
});

// ===== Response DTOs =====

export const AuthResponseDTO = t.Object({
  user: t.Object({
    id: t.String({ format: 'uuid' }),
    username: t.String(),
    email: t.String({ format: 'email' }),
    currency: t.Integer({ minimum: 0 }),
    emailVerified: t.Boolean(),
    lastLoginAt: t.Optional(t.String({ format: 'date-time' })),
  }),
});

export const RefreshResponseDTO = t.Object({
  success: t.Boolean(),
});

export const LogoutResponseDTO = t.Object({
  success: t.Boolean(),
});

// ===== TypeScript Types =====

export type LoginData = typeof LoginDTO.static;
export type GoogleCallbackData = typeof GoogleCallbackDTO.static;
export type AuthResponse = typeof AuthResponseDTO.static;
export type RefreshResponse = typeof RefreshResponseDTO.static;
export type LogoutResponse = typeof LogoutResponseDTO.static;

// ===== Database Models =====

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  tokenFamily: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

// ===== JWT Payload Types =====

export interface AccessTokenPayload {
  userId: string;
  username: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenFamily: string;
  type: 'refresh';
}

// ===== Google OAuth Types =====

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}
