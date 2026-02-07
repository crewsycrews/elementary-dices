import { t } from 'elysia';
import {
  DiceRollSchema,
  CreateDiceRollSchema,
  DiceRollOutcome,
  DiceRollContext,
  type DiceRoll,
  type DiceRollOutcomeValue,
  type DiceRollContextValue,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const DiceRollResponseDTO = DiceRollSchema;

// Module-specific DTOs for performing rolls
export const PerformRollDTO = t.Object({
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.Optional(t.String({ format: 'uuid' })), // If not provided, use equipped dice
  context: DiceRollContext,
  battle_id: t.Optional(t.String({ format: 'uuid' })),
  element_affinity: t.Optional(t.String()), // For element bonus calculation
  item_bonus: t.Optional(t.Integer()),
});

// Roll Result (includes both the roll record and computed outcome details)
export const RollResultDTO = t.Object({
  roll: DiceRollSchema,
  details: t.Object({
    dice_notation: t.String(),
    dice_name: t.String(),
    max_value: t.Integer(),
    raw_roll: t.Integer(),
    modifiers: t.Optional(
      t.Object({
        element_bonus: t.Optional(t.Integer()),
        item_bonus: t.Optional(t.Integer()),
        total_bonus: t.Optional(t.Integer()),
      })
    ),
    final_value: t.Integer(),
    outcome: DiceRollOutcome,
    threshold_used: t.Object({
      crit_success_range: t.Tuple([t.Integer(), t.Integer()]),
      success_range: t.Tuple([t.Integer(), t.Integer()]),
      fail_range: t.Tuple([t.Integer(), t.Integer()]),
      crit_fail_range: t.Tuple([t.Integer(), t.Integer()]),
    }),
  }),
});

// Extract TypeScript types
export type { DiceRoll, DiceRollOutcomeValue, DiceRollContextValue };
export type PerformRollData = typeof PerformRollDTO.static;
export type RollResult = typeof RollResultDTO.static;

// Modifiers type extracted from DiceRoll schema
export type RollModifiers = {
  element_bonus?: number;
  item_bonus?: number;
  total_bonus?: number;
};

// Type aliases for backward compatibility
export type DiceRollOutcome = DiceRollOutcomeValue;
export type DiceRollContext = DiceRollContextValue;
