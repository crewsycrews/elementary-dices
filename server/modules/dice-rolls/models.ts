import { t } from 'elysia';

// Outcome types
export type DiceRollOutcome = 'crit_success' | 'success' | 'fail' | 'crit_fail';
export type DiceRollContext = 'capture_attempt' | 'combat' | 'penalty_roll' | 'event_trigger' | 'initial_roll';

// Modifiers interface
export interface RollModifiers {
  element_bonus?: number;
  item_bonus?: number;
  total_bonus?: number;
}

// Dice Roll DTOs
export const DiceRollResponseDTO = t.Object({
  id: t.String(),
  battle_id: t.Optional(t.String()),
  player_id: t.String(),
  dice_type_id: t.String(),
  roll_value: t.Number(),
  outcome: t.String(),
  context: t.String(),
  modifiers: t.Optional(t.Any()),
});

export const PerformRollDTO = t.Object({
  player_id: t.String(),
  dice_type_id: t.Optional(t.String()), // If not provided, use equipped dice
  context: t.Union([
    t.Literal('capture_attempt'),
    t.Literal('combat'),
    t.Literal('penalty_roll'),
    t.Literal('event_trigger'),
    t.Literal('initial_roll'),
  ]),
  battle_id: t.Optional(t.String()),
  element_affinity: t.Optional(t.String()), // For element bonus calculation
  item_bonus: t.Optional(t.Number()),
});

// Roll Result (includes both the roll record and computed outcome details)
export const RollResultDTO = t.Object({
  roll: DiceRollResponseDTO,
  details: t.Object({
    dice_notation: t.String(),
    dice_name: t.String(),
    max_value: t.Number(),
    raw_roll: t.Number(),
    modifiers: t.Any(),
    final_value: t.Number(),
    outcome: t.String(),
    threshold_used: t.Object({
      crit_success_range: t.Tuple([t.Number(), t.Number()]),
      success_range: t.Tuple([t.Number(), t.Number()]),
      fail_range: t.Tuple([t.Number(), t.Number()]),
      crit_fail_range: t.Tuple([t.Number(), t.Number()]),
    }),
  }),
});

// Extract TypeScript types
export type DiceRoll = typeof DiceRollResponseDTO.static;
export type PerformRollData = typeof PerformRollDTO.static;
export type RollResult = typeof RollResultDTO.static;
