import { t } from "elysia";
import {
  EncounterType,
  type EncounterTypeValue,
} from "@elementary-dices/shared";

// Event types (alias for EncounterType)
export type EventType = EncounterTypeValue;

// Event probabilities (as per game design)
export const EVENT_PROBABILITIES = {
  wild_encounter: 0.5, // 50%
  pvp_battle: 0.3, // 30%
  merchant: 0.2, // 20%
} as const;

// Event Response DTO
export const EventResponseDTO = t.Object({
  event_type: t.String(),
  description: t.String(),
  data: t.Any(), // Event-specific data
});

export const TriggerEventDTO = t.Object({
  player_id: t.String(),
});

// Wild Encounter specific
export const WildEncounterDataDTO = t.Object({
  elemental_id: t.String(),
  elemental_name: t.String(),
  elemental_level: t.Number(),
  capture_difficulty: t.String(), // 'easy', 'medium', 'hard'
});

// Merchant Event specific
export const MerchantDataDTO = t.Object({
  available_items: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      price: t.Number(),
      rarity: t.String(),
    }),
  ),
  available_dice: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      price: t.Number(),
      rarity: t.String(),
      dice_notation: t.String(), // e.g., 'd6', 'd20'
    }),
  ),
});

// PvP Battle specific
export const PvPDataDTO = t.Object({
  opponent_id: t.Optional(t.String()),
  opponent_name: t.String(),
  opponent_power_level: t.Number(),
  potential_reward: t.Number(),
});

// Event Resolution DTOs

// Wild Encounter Resolution
export const ResolveWildEncounterDTO = t.Object({
  player_id: t.String(),
  dice_roll_id: t.String(), // ID of the dice roll performed
  item_id: t.Optional(t.String()), // Optional consumable item for capture bonus
});

export const WildEncounterResultDTO = t.Object({
  success: t.Boolean(),
  message: t.String(),
  elemental_caught: t.Optional(
    t.Object({
      id: t.String(),
      name: t.String(),
      level: t.Number(),
    }),
  ),
  can_continue: t.Boolean(), // Whether player can roll for next event
});

// PvP Battle Resolution
export const ResolvePvPBattleDTO = t.Object({
  player_id: t.String(),
  dice_roll_id: t.String(), // ID of the dice roll performed
});

export const PvPBattleResultDTO = t.Object({
  victory: t.Boolean(),
  message: t.String(),
  player_power: t.Number(),
  opponent_power: t.Number(),
  reward: t.Optional(t.Number()),
  penalty: t.Optional(
    t.Object({
      downgraded_elemental: t.Optional(t.String()),
    }),
  ),
  can_continue: t.Boolean(),
});

// Wild Encounter Skip
export const SkipWildEncounterDTO = t.Object({
  player_id: t.String(),
});

export const SkipWildEncounterResultDTO = t.Object({
  message: t.String(),
  can_continue: t.Boolean(),
});

// Merchant Leave
export const LeaveMerchantDTO = t.Object({
  player_id: t.String(),
});

export const LeaveMerchantResultDTO = t.Object({
  message: t.String(),
  can_continue: t.Boolean(),
});

// Extract TypeScript types
export type EventResponse = typeof EventResponseDTO.static;
export type TriggerEventData = typeof TriggerEventDTO.static;
export type WildEncounterData = typeof WildEncounterDataDTO.static;
export type MerchantData = typeof MerchantDataDTO.static;
export type PvPData = typeof PvPDataDTO.static;
export type ResolveWildEncounterData = typeof ResolveWildEncounterDTO.static;
export type WildEncounterResult = typeof WildEncounterResultDTO.static;
export type ResolvePvPBattleData = typeof ResolvePvPBattleDTO.static;
export type PvPBattleResult = typeof PvPBattleResultDTO.static;
export type SkipWildEncounterData = typeof SkipWildEncounterDTO.static;
export type SkipWildEncounterResult = typeof SkipWildEncounterResultDTO.static;
export type LeaveMerchantData = typeof LeaveMerchantDTO.static;
export type LeaveMerchantResult = typeof LeaveMerchantResultDTO.static;
