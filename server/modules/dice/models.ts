import { t } from 'elysia';
import {
  DiceTypeSchema,
  CreateDiceTypeSchema,
  PlayerDiceSchema,
  CreatePlayerDiceSchema,
  DiceRarity,
  type DiceType,
  type PlayerDice,
  type DiceRarityValue,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const DiceTypeResponseDTO = DiceTypeSchema;
export const CreateDiceTypeDTO = CreateDiceTypeSchema;
export const UpdateDiceTypeDTO = t.Partial(CreateDiceTypeSchema);

// Player Dice DTOs
export const PlayerDiceResponseDTO = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.String({ format: 'uuid' }),
  is_equipped: t.Boolean(),
  dice_type: t.Optional(DiceTypeSchema),
});

export const AddPlayerDiceDTO = t.Object({
  dice_type_id: t.String({ format: 'uuid' }),
  is_equipped: t.Optional(t.Boolean()),
});

export const UpdatePlayerDiceDTO = t.Object({
  is_equipped: t.Optional(t.Boolean()),
});

// Query filters
export const DiceTypeQueryDTO = t.Object({
  rarity: t.Optional(DiceRarity),
  dice_notation: t.Optional(t.String()),
});

// Extract TypeScript types
export type { DiceType, PlayerDice, DiceRarityValue as DiceRarity };
export type CreateDiceTypeData = typeof CreateDiceTypeDTO.static;
export type UpdateDiceTypeData = typeof UpdateDiceTypeDTO.static;
export type PlayerDiceWithDetails = typeof PlayerDiceResponseDTO.static;
export type AddPlayerDiceData = typeof AddPlayerDiceDTO.static;
export type UpdatePlayerDiceData = typeof UpdatePlayerDiceDTO.static;
export type DiceTypeQuery = typeof DiceTypeQueryDTO.static;
