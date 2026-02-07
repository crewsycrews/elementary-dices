import { t } from 'elysia';
import {
  ElementalEvolutionSchema,
  type ElementalEvolution,
} from '@elementary-dices/shared';

// Re-export shared schema for use in routes
export const EvolutionRecipeDTO = ElementalEvolutionSchema;

// Combine Request DTO
export const CombineElementalsDTO = t.Object({
  player_id: t.String({ format: 'uuid' }),
  player_elemental_ids: t.Array(t.String({ format: 'uuid' })), // IDs from player_elementals table
});

// Combine Result DTO
export const CombineResultDTO = t.Object({
  success: t.Boolean(),
  message: t.String(),
  new_elemental: t.Optional(t.Object({
    id: t.String({ format: 'uuid' }),
    elemental_id: t.String({ format: 'uuid' }),
    elemental_name: t.String(),
    level: t.Integer({ minimum: 1, maximum: 4 }),
  })),
  consumed_elementals: t.Array(t.String({ format: 'uuid' })),
  recipe_discovered: t.Optional(t.Boolean()),
});

// Extract TypeScript types
export type { ElementalEvolution as EvolutionRecipe };
export type CombineElementalsData = typeof CombineElementalsDTO.static;
export type CombineResult = typeof CombineResultDTO.static;
