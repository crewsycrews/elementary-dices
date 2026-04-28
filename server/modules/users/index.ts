import { Elysia, t } from "elysia";
import { UserService } from "./service";
import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateCurrencyDTO,
} from "./models";
import { requireAuth } from "../auth/middleware";
import { AuthService } from "../auth/service";
import { UnauthorizedError } from "../../shared/errors";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "../auth/cookie-options";

// Protected routes module with authentication
const protectedUsersRoutes = new Elysia()
  .use(requireAuth)
  .decorate("userService", new UserService())
  // Get user by ID with full profile (own profile only)
  .get(
    "/:id",
    async (context) => {
      const { params, userService } = context;
      const user = context.user;

      if (user.id !== params.id) {
        throw new UnauthorizedError("You can only access your own profile");
      }
      const userProfile = await userService.getUserProfile(params.id);
      return { user: userProfile };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  // Update user (own profile only)
  .patch(
    "/:id",
    async (context) => {
      const { params, body, userService } = context;
      const user = context.user;

      if (user.id !== params.id) {
        throw new UnauthorizedError("You can only update your own profile");
      }
      const updatedUser = await userService.update(params.id, body);
      return { user: updatedUser };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateUserDTO,
    },
  )
  // Update user currency (own account only)
  .patch(
    "/:id/currency",
    async (context) => {
      const { params, body, userService } = context;
      const user = context.user;

      if (user.id !== params.id) {
        throw new UnauthorizedError("You can only update your own currency");
      }
      const updatedUser = await userService.updateCurrency(params.id, body);
      return { user: updatedUser };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateCurrencyDTO,
    },
  )
  // Delete user (own account only)
  .delete(
    "/:id",
    async (context) => {
      const { params, userService } = context;
      const user = context.user;

      if (user.id !== params.id) {
        throw new UnauthorizedError("You can only delete your own account");
      }
      await userService.delete(params.id);
      return { message: "User deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  .get("/me", async ({ user }) => {
    return { user };
  });
// Main users module with public routes
export const usersModule = new Elysia({ prefix: "/api/users" })
  .decorate("userService", new UserService())
  .decorate("authService", new AuthService())

  // Public routes
  // Get all users (public for now - could be restricted later)
  .get("/", async ({ userService }) => {
    const users = await userService.findAll();
    return { users };
  })
  // Get user by username (public for profile pages)
  .get(
    "/username/:username",
    async ({ params, userService }) => {
      const user = await userService.findByUsername(params.username);
      return { user };
    },
    {
      params: t.Object({
        username: t.String(),
      }),
    },
  )
  // Create new user (registration - public)
  .post(
    "/",
    async ({ body, userService, authService, cookie }) => {
      await userService.create(body);

      const { user, accessToken, refreshToken } =
        await authService.loginWithPassword(body.username, body.password);

      cookie.access_token.set(getAccessTokenCookieOptions(accessToken));
      cookie.refresh_token.set(getRefreshTokenCookieOptions(refreshToken));

      return { user };
    },
    {
      body: CreateUserDTO,
    },
  )

  // Mount protected routes
  .use(protectedUsersRoutes);
