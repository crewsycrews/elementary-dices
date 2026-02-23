import { db } from '../../db';
import type { OAuthAccount, RefreshToken } from './models';

export class AuthRepository {
  // ===== OAuth Accounts =====

  async findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    const [account] = await db('oauth_accounts')
      .where({ provider, provider_user_id: providerUserId })
      .limit(1);

    return account ? this.mapOAuthAccount(account) : null;
  }

  async findOAuthAccountByUserId(userId: string, provider: string): Promise<OAuthAccount | null> {
    const [account] = await db('oauth_accounts')
      .where({ user_id: userId, provider })
      .limit(1);

    return account ? this.mapOAuthAccount(account) : null;
  }

  async createOAuthAccount(
    userId: string,
    provider: string,
    providerUserId: string
  ): Promise<OAuthAccount> {
    const [account] = await db('oauth_accounts')
      .insert({
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
      })
      .returning('*');

    return this.mapOAuthAccount(account);
  }

  async deleteOAuthAccount(id: string): Promise<void> {
    await db('oauth_accounts').where({ id }).delete();
  }

  // ===== Refresh Tokens =====

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    tokenFamily: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const [token] = await db('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        token_family: tokenFamily,
        expires_at: expiresAt,
      })
      .returning('*');

    return this.mapRefreshToken(token);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    const [token] = await db('refresh_tokens')
      .where({ token_hash: tokenHash })
      .limit(1);

    return token ? this.mapRefreshToken(token) : null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await db('refresh_tokens')
      .where({ id })
      .update({ revoked_at: db.fn.now() as unknown as Date });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await db('refresh_tokens')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .update({ revoked_at: db.fn.now() as unknown as Date });
  }

  async revokeTokenFamily(tokenFamily: string): Promise<void> {
    await db('refresh_tokens')
      .where({ token_family: tokenFamily })
      .whereNull('revoked_at')
      .update({ revoked_at: db.fn.now() as unknown as Date });
  }

  async cleanExpiredTokens(): Promise<number> {
    return await db('refresh_tokens')
      .where('expires_at', '<', db.fn.now())
      .whereNull('revoked_at')
      .update({ revoked_at: db.fn.now() as unknown as Date });
  }

  // ===== User Updates =====

  async updateLastLogin(userId: string): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({ last_login_at: db.fn.now() as unknown as Date });
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({ email_verified: true });
  }

  // ===== Helper Mappers =====

  private mapOAuthAccount(row: any): OAuthAccount {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      providerUserId: row.provider_user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRefreshToken(row: any): RefreshToken {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      tokenFamily: row.token_family,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    };
  }
}
