import { t } from 'elysia';
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  type User,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const UserResponseDTO = UserSchema;
export const CreateUserDTO = CreateUserSchema;
export const UpdateUserDTO = UpdateUserSchema;

// Module-specific DTOs
export const UpdateCurrencyDTO = t.Object({
  amount: t.Number(),
  operation: t.Union([t.Literal('add'), t.Literal('subtract'), t.Literal('set')]),
});

export const LoginDTO = t.Object({
  username: t.String({ minLength: 3, maxLength: 20 }),
  password: t.String({ minLength: 1 }),
});

// Extract TypeScript types
export type { User };
export type CreateUserData = typeof CreateUserDTO.static;
export type UpdateUserData = typeof UpdateUserDTO.static;
export type UpdateCurrencyData = typeof UpdateCurrencyDTO.static;
export type LoginData = typeof LoginDTO.static;

// User profile with stats
export const UserProfileDTO = t.Object({
  id: t.String(),
  username: t.String(),
  email: t.String(),
  currency: t.Number(),
  favorite_dice_id: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
  updated_at: t.String(),
  stats: t.Object({
    total_elementals: t.Number(),
    active_elementals: t.Number(),
    backpack_elementals: t.Number(),
    total_dice: t.Number(),
    total_items: t.Number(),
  }),
});

export type UserProfile = typeof UserProfileDTO.static;
