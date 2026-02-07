import { t } from 'elysia';
import {
  PlayerElementalSchema,
  CreatePlayerElementalSchema,
  UpdatePlayerElementalSchema,
  type PlayerElemental,
  type BaseStats,
  type ElementTypeValue,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const PlayerElementalResponseDTO = PlayerElementalSchema;
export const AddPlayerElementalDTO = CreatePlayerElementalSchema;
export const UpdatePlayerElementalDTO = UpdatePlayerElementalSchema;

// Module-specific DTOs
export const StartGameDTO = t.Object({
  player_id: t.String({ format: 'uuid' }),
});

// Response types with joined data
export interface PlayerElementalWithDetails extends PlayerElemental {
  elemental_name: string;
  elemental_level: number;
  element_types: ElementTypeValue[];
  image_url: string | null;
}

export interface StartGameResult {
  success: boolean;
  message: string;
  first_elemental: PlayerElementalWithDetails;
  dice_roll: {
    roll_value: number;
    selected_index: number;
  };
}

// Extract TypeScript types
export type { PlayerElemental, BaseStats };
export type AddPlayerElementalData = typeof AddPlayerElementalDTO.static;
export type UpdatePlayerElementalData = typeof UpdatePlayerElementalDTO.static;
export type StartGameData = typeof StartGameDTO.static;
