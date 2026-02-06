import { t } from 'elysia';

// Evolution Recipe DTO
export const EvolutionRecipeDTO = t.Object({
  id: t.String(),
  result_elemental_id: t.String(),
  required_level: t.Number(),
  required_count: t.Number(),
  required_same_element: t.Optional(t.String()),
  required_element_1: t.Optional(t.String()),
  required_element_2: t.Optional(t.String()),
  required_elemental_ids: t.Optional(t.Array(t.String())),
  hint_text: t.Optional(t.String()),
  is_discovered_by_default: t.Boolean(),
});

// Combine Request DTO
export const CombineElementalsDTO = t.Object({
  player_id: t.String(),
  player_elemental_ids: t.Array(t.String()), // IDs from player_elementals table
});

// Combine Result DTO
export const CombineResultDTO = t.Object({
  success: t.Boolean(),
  message: t.String(),
  new_elemental: t.Optional(t.Object({
    id: t.String(),
    elemental_id: t.String(),
    elemental_name: t.String(),
    level: t.Number(),
  })),
  consumed_elementals: t.Array(t.String()),
  recipe_discovered: t.Optional(t.Boolean()),
});

// Extract TypeScript types
export type EvolutionRecipe = typeof EvolutionRecipeDTO.static;
export type CombineElementalsData = typeof CombineElementalsDTO.static;
export type CombineResult = typeof CombineResultDTO.static;
