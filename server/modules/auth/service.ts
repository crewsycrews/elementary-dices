import { Google } from "arctic";
import { AuthRepository } from "./repository";
import { UserRepository } from "../users/repository";
import { UserService } from "../users/service";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiration,
} from "./utils";
import type { GoogleUserInfo } from "./models";
import { UnauthorizedError, NotFoundError } from "../../shared/errors";

export class AuthService {
  private repository = new AuthRepository();
  private userRepository = new UserRepository();
  private userService = new UserService();
  private google: Google;

  constructor() {
    // Initialize Google OAuth client
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
    console.log("Initializing Google OAuth with:", {
      clientId,
      redirectUri,
    });
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing Google OAuth configuration. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env",
      );
    }

    this.google = new Google(clientId, clientSecret, redirectUri);
  }

  /**
   * Traditional password login (enhanced with JWT tokens)
   */
  async loginWithPassword(username: string, password: string) {
    const userWithPassword =
      await this.userRepository.findByUsernameWithPassword(username);

    if (!userWithPassword) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Verify password
    const expectedHash = await this.hashPassword(password);
    if (userWithPassword.password_hash !== expectedHash) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Update last login
    await this.repository.updateLastLogin(userWithPassword.id);

    // Generate tokens
    const accessToken = generateAccessToken(
      userWithPassword.id,
      userWithPassword.username,
      userWithPassword.email,
    );
    const { token: refreshToken, tokenFamily } = generateRefreshToken(
      userWithPassword.id,
    );

    // Store refresh token
    await this.repository.createRefreshToken(
      userWithPassword.id,
      hashToken(refreshToken),
      tokenFamily,
      getRefreshTokenExpiration(),
    );

    // Get full user data
    const user = await this.userRepository.findById(userWithPassword.id);
    if (!user) throw new NotFoundError("User");

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string, codeVerifier: string) {
    // Exchange code for tokens
    // Note: Google OAuth doesn't use PKCE by default, but Arctic may require the parameter
    const tokens = await this.google.validateAuthorizationCode(
      code,
      codeVerifier,
    );
    const accessToken = tokens.accessToken();

    // Fetch user info from Google
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    console.log("Google userinfo response status:", response.status);
    if (!response.ok) {
      throw new UnauthorizedError("Failed to fetch Google user info");
    }

    const googleUserData: unknown = await response.json();
    if (!this.isGoogleUserInfo(googleUserData)) {
      throw new UnauthorizedError("Invalid Google user info response");
    }
    const googleUser: GoogleUserInfo = googleUserData;

    console.log("Google user info:", googleUser);

    // Check if OAuth account exists
    let oauthAccount = await this.repository.findOAuthAccount(
      "google",
      googleUser.sub,
    );

    if (oauthAccount) {
      // Existing OAuth account - login
      const user = await this.userRepository.findById(oauthAccount.userId);
      if (!user) throw new NotFoundError("User");

      return await this.loginUser(user.id, user.username, user.email);
    }

    // New OAuth account - check if email exists
    let user = await this.userRepository.findByEmail(googleUser.email);

    if (user) {
      // Email exists - auto-link accounts
      await this.repository.createOAuthAccount(
        user.id,
        "google",
        googleUser.sub,
      );

      // Verify email if from Google
      if (googleUser.email_verified) {
        await this.repository.verifyUserEmail(user.id);
      }

      return await this.loginUser(user.id, user.username, user.email);
    }

    // New user - create account
    user = await this.userRepository.create({
      username: this.generateUsernameFromEmail(googleUser.email),
      email: googleUser.email,
      password: "", // Required by DTO but not used
      password_hash: "", // Empty hash for OAuth-only users (will be NULL after migration)
    });

    // Give starter dice to new user
    await this.userService.giveStarterDice(user.id);

    // Create OAuth account link
    await this.repository.createOAuthAccount(user.id, "google", googleUser.sub);

    // Verify email from Google
    if (googleUser.email_verified) {
      await this.repository.verifyUserEmail(user.id);
    }

    return await this.loginUser(user.id, user.username, user.email);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new UnauthorizedError("No refresh token provided");
    }

    // Verify refresh token signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenString);
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Check token in database
    const tokenHash = hashToken(refreshTokenString);
    const storedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedError("Refresh token not found");
    }

    // Check if revoked
    if (storedToken.revokedAt) {
      // Token reuse detected - revoke entire family
      await this.repository.revokeTokenFamily(storedToken.tokenFamily);
      throw new UnauthorizedError("Token reuse detected. Please login again.");
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expired");
    }

    // Revoke old token (rotation)
    await this.repository.revokeRefreshToken(storedToken.id);

    // Get user data
    const user = await this.userRepository.findById(payload.userId);
    if (!user) throw new NotFoundError("User");

    // Generate new tokens (keep same token family)
    const accessToken = generateAccessToken(user.id, user.username, user.email);
    const { token: newRefreshToken } = generateRefreshToken(
      user.id,
      storedToken.tokenFamily,
    );

    // Store new refresh token
    await this.repository.createRefreshToken(
      user.id,
      hashToken(newRefreshToken),
      storedToken.tokenFamily,
      getRefreshTokenExpiration(),
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout and revoke tokens
   */
  async logout(userId: string, refreshTokenString?: string) {
    if (refreshTokenString) {
      const tokenHash = hashToken(refreshTokenString);
      const storedToken =
        await this.repository.findRefreshTokenByHash(tokenHash);

      if (storedToken) {
        await this.repository.revokeRefreshToken(storedToken.id);
      }
    } else {
      // Revoke all user tokens if no specific token provided
      await this.repository.revokeAllUserTokens(userId);
    }
  }

  /**
   * Verify access token and return user
   */
  async verifyAccessTokenAndGetUser(token: string) {
    const payload = verifyAccessToken(token);

    const user = await this.userRepository.findById(payload.userId);
    if (!user) throw new NotFoundError("User");

    return this.formatUser(user);
  }

  // ===== Private Helper Methods =====

  private async loginUser(userId: string, username: string, email: string) {
    // Update last login
    await this.repository.updateLastLogin(userId);

    // Generate tokens
    const accessToken = generateAccessToken(userId, username, email);
    const { token: refreshToken, tokenFamily } = generateRefreshToken(userId);

    // Store refresh token
    await this.repository.createRefreshToken(
      userId,
      hashToken(refreshToken),
      tokenFamily,
      getRefreshTokenExpiration(),
    );

    // Get full user data
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    // This is the dummy implementation from existing code
    // Will be upgraded to bcrypt/argon2 in Phase 2
    return `hashed_${password}`;
  }

  private generateUsernameFromEmail(email: string): string {
    // Generate username from email (e.g., john.doe@gmail.com → johndoe)
    const baseName = email
      .split("@")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    // Add random suffix to avoid collisions
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    return `${baseName}${randomSuffix}`.slice(0, 20); // Max 20 chars
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      currency: user.currency,
      emailVerified: user.email_verified ?? false,
      lastLoginAt: user.last_login_at
        ? new Date(user.last_login_at).toISOString()
        : undefined,
      updated_at: user.updated_at
        ? new Date(user.updated_at).toISOString()
        : "",
    };
  }

  private isGoogleUserInfo(value: unknown): value is GoogleUserInfo {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<GoogleUserInfo>;
    return (
      typeof candidate.sub === "string" &&
      typeof candidate.email === "string" &&
      typeof candidate.email_verified === "boolean" &&
      typeof candidate.name === "string"
    );
  }
}
