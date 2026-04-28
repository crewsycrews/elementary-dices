import { Elysia } from "elysia";
import { generateCodeVerifier, Google } from "arctic";
import { AuthService } from "./service";
import {
  LoginDTO,
  AuthResponseDTO,
  RefreshResponseDTO,
  LogoutResponseDTO,
} from "./models";
import { generateState } from "./utils";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "./cookie-options";

export const authModule = new Elysia({ prefix: "/api/auth" })
  .decorate("authService", new AuthService())
  .decorate(
    "google",
    new Google(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!,
    ),
  )

  /**
   * POST /api/auth/login
   * Traditional username/password login
   */
  .post(
    "/login",
    async ({ body, authService, cookie }) => {
      const { user, accessToken, refreshToken } =
        await authService.loginWithPassword(body.username, body.password);

      cookie.access_token.set(getAccessTokenCookieOptions(accessToken));
      cookie.refresh_token.set(getRefreshTokenCookieOptions(refreshToken));

      return { user };
    },
    {
      body: LoginDTO,
      response: AuthResponseDTO,
    },
  )
  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  .post("/refresh", async ({ cookie, authService }) => {
    const oldRefreshToken = cookie.refresh_token?.value as string | undefined;

    const { accessToken, refreshToken } = await authService.refreshAccessToken(
      oldRefreshToken!,
    );

    // Update cookies with new tokens
    cookie.access_token.set(getAccessTokenCookieOptions(accessToken));
    cookie.refresh_token.set(getRefreshTokenCookieOptions(refreshToken));

    return { success: true };
  }, {
    response: RefreshResponseDTO,
  })
  /**
   * POST /api/auth/logout
   * Logout and revoke refresh token
   */
  .post(
    "/logout",
    async ({ cookie, authService }) => {
      const refreshToken = cookie.refresh_token?.value as string | undefined;

      await authService.logout(undefined, refreshToken);

      cookie.access_token.remove();
      cookie.refresh_token.remove();

      return { success: true };
    },
    {
      response: LogoutResponseDTO,
    },
  )

  /**
   * GET /api/auth/google
   * Initiate Google OAuth flow
   */
  .get("/google", async ({ google, cookie }) => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    cookie.state.set({
      value: state,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });
    // Store codeVerifier in cookie for later use in callback
    cookie.code_verifier.set({
      value: codeVerifier,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    // Create authorization URL with profile and email scopes
    const url = google.createAuthorizationURL(state, codeVerifier, [
      "profile",
      "email",
    ]);

    // Redirect to Google OAuth consent screen
    return Response.redirect(url.toString());
  })

  /**
   * GET /api/auth/google/callback
   * Handle Google OAuth callback
   */
  .get("/google/callback", async ({ query, authService, cookie }) => {
    const { code } = query;

    if (!code || typeof code !== "string") {
      // Redirect to frontend with error
      return Response.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);
    }

    try {
      const codeVerifier = cookie.code_verifier?.value as string;
      const { accessToken, refreshToken } =
        await authService.handleGoogleCallback(code, codeVerifier);

      cookie.access_token.set(getAccessTokenCookieOptions(accessToken));
      cookie.refresh_token.set(getRefreshTokenCookieOptions(refreshToken));

      // Redirect to frontend with success
      return Response.redirect(`${process.env.CLIENT_URL}/?auth=success`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      // Redirect to frontend with error
      return Response.redirect(
        `${process.env.CLIENT_URL}/login?error=oauth_failed`,
      );
    }
  });
