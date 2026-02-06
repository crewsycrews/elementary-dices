import { t } from 'elysia';

// Element type
export type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'lightning';

// Base stats interface
export interface BaseStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
}

// Elemental DTOs
export const ElementalResponseDTO = t.Object({
  id: t.String(),
  name: t.String(),
  level: t.Number(),
  element_types: t.Array(t.String()),
  base_stats: t.Object({
    health: t.Number(),
    attack: t.Number(),
    defense: t.Number(),
    speed: t.Number(),
  }),
  description: t.String(),
  image_url: t.Optional(t.String()),
  is_base_elemental: t.Boolean(),
});

export const CreateElementalDTO = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  level: t.Number({ minimum: 1, maximum: 4 }),
  element_types: t.Array(t.String()),
  base_stats: t.Object({
    health: t.Number({ minimum: 1 }),
    attack: t.Number({ minimum: 1 }),
    defense: t.Number({ minimum: 1 }),
    speed: t.Number({ minimum: 1 }),
  }),
  description: t.String({ minLength: 1 }),
  image_url: t.Optional(t.String({ maxLength: 500 })),
  is_base_elemental: t.Optional(t.Boolean()),
});

export const UpdateElementalDTO = t.Partial(CreateElementalDTO);

// Extract TypeScript types
export type Elemental = typeof ElementalResponseDTO.static;
export type CreateElementalData = typeof CreateElementalDTO.static;
export type UpdateElementalData = typeof UpdateElementalDTO.static;

// Query filters
export const ElementalQueryDTO = t.Object({
  level: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  element_type: t.Optional(t.String()),
  is_base_elemental: t.Optional(t.Boolean()),
});

export type ElementalQuery = typeof ElementalQueryDTO.static;
