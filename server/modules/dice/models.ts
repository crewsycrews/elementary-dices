import { t } from 'elysia';

// Dice rarity type
export type DiceRarity = 'green' | 'blue' | 'purple' | 'gold';

// Dice notation type
export type DiceNotation = 'd4' | 'd6' | 'd10' | 'd12' | 'd20';

// Stat bonuses interface
export interface StatBonuses {
  bonus_multiplier: number;
  element_affinity?: string;
}

// Outcome thresholds interface
export interface OutcomeThresholds {
  crit_success_range: [number, number];
  success_range: [number, number];
  fail_range: [number, number];
  crit_fail_range: [number, number];
}

// Dice Type DTOs
export const DiceTypeResponseDTO = t.Object({
  id: t.String(),
  dice_notation: t.String(),
  rarity: t.String(),
  name: t.String(),
  stat_bonuses: t.Object({
    bonus_multiplier: t.Number(),
    element_affinity: t.Optional(t.String()),
  }),
  outcome_thresholds: t.Object({
    crit_success_range: t.Tuple([t.Number(), t.Number()]),
    success_range: t.Tuple([t.Number(), t.Number()]),
    fail_range: t.Tuple([t.Number(), t.Number()]),
    crit_fail_range: t.Tuple([t.Number(), t.Number()]),
  }),
  price: t.Number(),
  description: t.String(),
});

export const CreateDiceTypeDTO = t.Object({
  dice_notation: t.Union([
    t.Literal('d4'),
    t.Literal('d6'),
    t.Literal('d10'),
    t.Literal('d12'),
    t.Literal('d20'),
  ]),
  rarity: t.Union([
    t.Literal('green'),
    t.Literal('blue'),
    t.Literal('purple'),
    t.Literal('gold'),
  ]),
  name: t.String({ minLength: 1, maxLength: 100 }),
  stat_bonuses: t.Object({
    bonus_multiplier: t.Number({ minimum: 1 }),
    element_affinity: t.Optional(t.String()),
  }),
  outcome_thresholds: t.Object({
    crit_success_range: t.Tuple([t.Number(), t.Number()]),
    success_range: t.Tuple([t.Number(), t.Number()]),
    fail_range: t.Tuple([t.Number(), t.Number()]),
    crit_fail_range: t.Tuple([t.Number(), t.Number()]),
  }),
  price: t.Number({ minimum: 0 }),
  description: t.String({ minLength: 1 }),
});

export const UpdateDiceTypeDTO = t.Partial(CreateDiceTypeDTO);

// Player Dice DTOs
export const PlayerDiceResponseDTO = t.Object({
  id: t.String(),
  player_id: t.String(),
  dice_type_id: t.String(),
  dice_notation: t.String(),
  is_equipped: t.Boolean(),
  dice_type: t.Optional(DiceTypeResponseDTO),
});

export const AddPlayerDiceDTO = t.Object({
  dice_type_id: t.String(),
  is_equipped: t.Optional(t.Boolean()),
  dice_notation: t.Optional(t.String()),
});

export const UpdatePlayerDiceDTO = t.Object({
  is_equipped: t.Optional(t.Boolean()),
  dice_notation: t.Optional(t.String()),
});

// Query filters
export const DiceTypeQueryDTO = t.Object({
  rarity: t.Optional(t.String()),
  dice_notation: t.Optional(t.String()),
});

// Extract TypeScript types
export type DiceType = typeof DiceTypeResponseDTO.static;
export type CreateDiceTypeData = typeof CreateDiceTypeDTO.static;
export type UpdateDiceTypeData = typeof UpdateDiceTypeDTO.static;
export type PlayerDice = typeof PlayerDiceResponseDTO.static;
export type AddPlayerDiceData = typeof AddPlayerDiceDTO.static;
export type UpdatePlayerDiceData = typeof UpdatePlayerDiceDTO.static;
export type DiceTypeQuery = typeof DiceTypeQueryDTO.static;
