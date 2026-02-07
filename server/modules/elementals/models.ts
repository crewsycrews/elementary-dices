import { t } from 'elysia';
import {
  ElementalSchema,
  CreateElementalSchema,
  ElementType,
  StatsSchema,
  type Elemental,
  type ElementTypeValue,
  type BaseStats,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const ElementalResponseDTO = ElementalSchema;
export const CreateElementalDTO = CreateElementalSchema;
export const UpdateElementalDTO = t.Partial(CreateElementalSchema);

// Extract TypeScript types
export type { Elemental, ElementTypeValue as ElementType, BaseStats };
export type CreateElementalData = typeof CreateElementalDTO.static;
export type UpdateElementalData = typeof UpdateElementalDTO.static;

// Query filters
export const ElementalQueryDTO = t.Object({
  level: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  element_type: t.Optional(t.String()),
  is_base_elemental: t.Optional(t.Boolean()),
});

export type ElementalQuery = typeof ElementalQueryDTO.static;
