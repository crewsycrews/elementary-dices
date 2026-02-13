import { Elysia } from "elysia";
import { AuthService } from "./service";
import { UnauthorizedError } from "../../shared/errors";
import type { User } from "../users/models";

/**
 * Authentication guard middleware
 * Requires a valid access token and injects the user into context
 */
export const requireAuth = new Elysia({ name: "auth" })
  .decorate("authService", new AuthService())
  .derive({ as: "global" }, async ({ cookie, headers, authService }) => {
    // Try to get token from cookie first, then Authorization header
    let token: string | undefined = cookie.access_token?.value as
      | string
      | undefined;
    if (!token && headers.authorization) {
      const authHeader = headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token || typeof token !== "string") {
      throw new UnauthorizedError("Missing or invalid access token");
    }

    try {
      const user = await authService.verifyAccessTokenAndGetUser(token);
      return { user };
    } catch (error) {
      throw new UnauthorizedError("Invalid access token");
    }
  });

// Type helper for routes that use requireAuth
export type AuthContext = {
  user: User;
};

/**
 * Optional authentication middleware
 * Does not throw if token is missing, returns null user instead
 */
export const optionalAuth = new Elysia({ name: "optionalAuth" })
  .decorate("authService", new AuthService())
  .derive(async ({ cookie, headers, authService }) => {
    // Try to get token from cookie first, then Authorization header
    let token: string | undefined = cookie.access_token?.value as
      | string
      | undefined;

    if (!token && headers.authorization) {
      const authHeader = headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token || typeof token !== "string") {
      return { user: null };
    }

    try {
      const user = await authService.verifyAccessTokenAndGetUser(token);
      return { user };
    } catch {
      return { user: null };
    }
  });
