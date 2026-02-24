import { t } from 'elysia';
import {
  DiceRollSchema,
  DiceRollContext,
  ElementType,
  type DiceRoll,
  type DiceRollContextValue,
  type ElementTypeValue,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const DiceRollResponseDTO = DiceRollSchema;

// Module-specific DTOs for performing rolls
export const PerformRollDTO = t.Object({
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.Optional(t.String({ format: 'uuid' })), // If not provided, use equipped dice
  context: DiceRollContext,
});

// Roll Result (includes both the roll record and computed details)
export const RollResultDTO = t.Object({
  roll: DiceRollSchema,
  details: t.Object({
    dice_notation: t.String(),
    dice_name: t.String(),
    face_count: t.Integer(),
    face_index: t.Integer(),
    result_element: ElementType,
  }),
});

// Extract TypeScript types
export type { DiceRoll, DiceRollContextValue, ElementTypeValue };
export type PerformRollData = typeof PerformRollDTO.static;
export type RollResult = typeof RollResultDTO.static;

// Type aliases for convenience
export type DiceRollContext = DiceRollContextValue;
