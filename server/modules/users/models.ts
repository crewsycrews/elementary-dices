import { t } from 'elysia';

// User DTOs
export const UserResponseDTO = t.Object({
  id: t.String(),
  username: t.String(),
  email: t.String(),
  currency: t.Number(),
  updated_at: t.String(),
});

export const CreateUserDTO = t.Object({
  username: t.String({ minLength: 3, maxLength: 20 }),
  email: t.String({ format: 'email', maxLength: 255 }),
  password: t.String({ minLength: 8 }),
});

export const UpdateUserDTO = t.Object({
  username: t.Optional(t.String({ minLength: 3, maxLength: 20 })),
  email: t.Optional(t.String({ format: 'email', maxLength: 255 })),
  password: t.Optional(t.String({ minLength: 8 })),
});

export const UpdateCurrencyDTO = t.Object({
  amount: t.Number(),
  operation: t.Union([t.Literal('add'), t.Literal('subtract'), t.Literal('set')]),
});

// Extract TypeScript types
export type User = typeof UserResponseDTO.static;
export type CreateUserData = typeof CreateUserDTO.static;
export type UpdateUserData = typeof UpdateUserDTO.static;
export type UpdateCurrencyData = typeof UpdateCurrencyDTO.static;

// User profile with stats
export const UserProfileDTO = t.Object({
  id: t.String(),
  username: t.String(),
  email: t.String(),
  currency: t.Number(),
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
