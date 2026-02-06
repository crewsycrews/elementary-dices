import { t } from 'elysia';

// Event types
export type EventType = 'wild_encounter' | 'pvp_battle' | 'merchant';

// Event probabilities (as per game design)
export const EVENT_PROBABILITIES = {
  wild_encounter: 0.5, // 50%
  pvp_battle: 0.3,     // 30%
  merchant: 0.2,       // 20%
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
  available_items: t.Array(t.Object({
    id: t.String(),
    name: t.String(),
    price: t.Number(),
    rarity: t.String(),
  })),
  available_dice: t.Array(t.Object({
    id: t.String(),
    name: t.String(),
    price: t.Number(),
    rarity: t.String(),
  })),
});

// PvP Battle specific
export const PvPDataDTO = t.Object({
  opponent_id: t.Optional(t.String()),
  opponent_name: t.String(),
  opponent_power_level: t.Number(),
  potential_reward: t.Number(),
});

// Extract TypeScript types
export type EventResponse = typeof EventResponseDTO.static;
export type TriggerEventData = typeof TriggerEventDTO.static;
export type WildEncounterData = typeof WildEncounterDataDTO.static;
export type MerchantData = typeof MerchantDataDTO.static;
export type PvPData = typeof PvPDataDTO.static;
