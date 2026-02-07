import { Elysia, t } from 'elysia';
import { UserService } from './service';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateCurrencyDTO,
  LoginDTO,
} from './models';

export const usersModule = new Elysia({ prefix: '/api/users' })
  .decorate('userService', new UserService())
  // Get all users
  .get('/', async ({ userService }) => {
    const users = await userService.findAll();
    return { users };
  })
  // Get user by ID with full profile
  .get(
    '/:id',
    async ({ params, userService }) => {
      const user = await userService.getUserProfile(params.id);
      return { user };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Get user by username
  .get(
    '/username/:username',
    async ({ params, userService }) => {
      const user = await userService.findByUsername(params.username);
      return { user };
    },
    {
      params: t.Object({
        username: t.String(),
      }),
    }
  )
  // Login endpoint
  .post(
    '/login',
    async ({ body, userService }) => {
      const user = await userService.login(body);
      return { user };
    },
    {
      body: LoginDTO,
    }
  )
  // Create new user
  .post(
    '/',
    async ({ body, userService }) => {
      const user = await userService.create(body);
      return { user };
    },
    {
      body: CreateUserDTO,
    }
  )
  // Update user
  .patch(
    '/:id',
    async ({ params, body, userService }) => {
      const user = await userService.update(params.id, body);
      return { user };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateUserDTO,
    }
  )
  // Update user currency
  .patch(
    '/:id/currency',
    async ({ params, body, userService }) => {
      const user = await userService.updateCurrency(params.id, body);
      return { user };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateCurrencyDTO,
    }
  )
  // Delete user
  .delete(
    '/:id',
    async ({ params, userService }) => {
      await userService.delete(params.id);
      return { message: 'User deleted successfully' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
