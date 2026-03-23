import { t } from "elysia";
import {
  EncounterType,
  type EncounterTypeValue,
  ElementType,
} from "@elementary-dices/shared";

// Event types (alias for EncounterType)
export type EventType = EncounterTypeValue;

// Event probabilities (as per game design)
export const EVENT_PROBABILITIES = {
  wild_encounter: 0.5, // 50%
  pvp_battle: 0.3, // 30%
  merchant: 0.2, // 20%
};

// Event Response DTO
export const EventResponseDTO = t.Object({
  event_type: t.String(),
  description: t.String(),
  data: t.Any(), // Event-specific data
});

export const TriggerEventDTO = t.Object({
  player_id: t.String(),
});

export const EventTypeDTO = t.Union([
  t.Literal("wild_encounter"),
  t.Literal("pvp_battle"),
  t.Literal("merchant"),
]);

export const CreateEventDTO = t.Object({
  player_id: t.String(),
  event_type: EventTypeDTO,
});

export const EventOptionsResponseDTO = t.Object({
  available: t.Array(EventTypeDTO),
  unavailable: t.Array(
    t.Object({
      event_type: EventTypeDTO,
      reason: t.String(),
    }),
  ),
});

// Wild Encounter specific
export const WildEncounterDataDTO = t.Object({
  event_id: t.Optional(t.String()),
  elemental_id: t.String(),
  elemental_name: t.String(),
  elemental_level: t.Number(),
  encounter_element: t.Optional(t.String()),
  capture_difficulty: t.String(), // 'easy', 'medium', 'hard'
  farkle_initialized: t.Optional(t.Boolean()),
  farkle_session_id: t.Optional(t.String()),
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
      dice_notation: t.String(),
      faces: t.Array(t.String()),
    }),
  ),
});

// Battle Party Member (shared between PvP data and battle state)
export const BattlePartyMemberDTO = t.Object({
  player_elemental_id: t.Optional(t.String()),
  elemental_id: t.String(),
  name: t.String(),
  element: t.String(),
  elements: t.Array(t.String()),
  level: t.Number(),
  base_attack: t.Number(),
  current_attack: t.Number(),
  max_health: t.Number(),
  current_health: t.Number(),
  is_destroyed: t.Boolean(),
  target_index: t.Number(),
});

// PvP Battle specific
export const PvPDataDTO = t.Object({
  event_id: t.Optional(t.String()),
  opponent_id: t.Optional(t.String()),
  opponent_name: t.String(),
  opponent_power_level: t.Number(),
  potential_reward: t.Number(),
  opponent_party: t.Array(BattlePartyMemberDTO),
  player_party: t.Array(BattlePartyMemberDTO),
  battle_state: t.Optional(t.Any()),
  farkle_initialized: t.Optional(t.Boolean()),
  farkle_session_id: t.Optional(t.String()),
});

// Battle Roll Record
export const BattleRollRecordDTO = t.Object({
  turn: t.Number(),
  side: t.String(), // "player" | "opponent"
  dice_type_id: t.Optional(t.String()),
  dice_element: t.String(),
  result_element: t.String(),
  bonus_applied: t.Number(),
  affected_element: t.String(), // element name
  roll_value: t.Optional(t.Number()),
});

// Battle State DTO
export const BattleStateDTO = t.Object({
  phase: t.String(), // "targeting" | "rolling" | "resolved"
  player_party: t.Array(BattlePartyMemberDTO),
  opponent_party: t.Array(BattlePartyMemberDTO),
  rolls: t.Array(BattleRollRecordDTO),
  current_turn: t.Number(),
  player_rolls_done: t.Number(),
  opponent_rolls_done: t.Number(),
  winner: t.Optional(t.String()),
  player_total_attack: t.Optional(t.Number()),
  opponent_total_attack: t.Optional(t.Number()),
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

export const WildEncounterFarkleEndTurnDTO = t.Object({
  player_id: t.String(),
  item_id: t.Optional(t.String()),
});

// Battle Start
export const BattleStartDTO = t.Object({
  player_id: t.String(),
});

// Battle Roll (player rolls a dice)
export const BattleRollDTO = t.Object({
  player_id: t.String(),
  dice_type_id: t.String(),
});

// Battle Roll Result (returned after each roll)
export const BattleRollResultDTO = t.Object({
  battle_state: BattleStateDTO,
  player_roll: t.Optional(BattleRollRecordDTO),
  opponent_roll: t.Optional(BattleRollRecordDTO),
  is_resolved: t.Boolean(),
  result: t.Optional(
    t.Object({
      victory: t.Boolean(),
      message: t.String(),
      player_total_attack: t.Number(),
      opponent_total_attack: t.Number(),
      reward: t.Optional(t.Number()),
      penalty: t.Optional(
        t.Object({
          downgraded_elemental: t.Optional(t.String()),
        }),
      ),
      can_continue: t.Boolean(),
    }),
  ),
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

// ======================================================================
// Farkle Battle DTOs (v2)
// ======================================================================

export const ChooseElementDTO = t.Object({
  player_id: t.String(),
  element: ElementType,
});

export const FarkleRollResultDieDTO = t.Object({
  player_dice_id: t.String(),
  dice_type_id: t.String(),
  dice_notation: t.String(),
  faces: t.Array(t.String()),
  current_result: t.String(),
  is_set_aside: t.Boolean(),
});

export const FarkleCombinationDTO = t.Object({
  type: t.String(),
  elements: t.Array(t.String()),
  dice_indices: t.Array(t.Number()),
  bonuses: t.Record(t.String(), t.Number()),
});

export const FarkleTurnStateDTO = t.Object({
  phase: t.String(),
  dice: t.Array(FarkleRollResultDieDTO),
  has_used_reroll: t.Boolean(),
  active_combinations: t.Array(FarkleCombinationDTO),
  set_aside_element_bonus: t.Nullable(t.String()),
  accumulated_dice_rush_bonuses: t.Optional(t.Record(t.String(), t.Number())),
  accumulated_combination_elements: t.Optional(t.Array(t.String())),
  accumulated_set_aside_elements: t.Optional(t.Array(t.String())),
  is_dice_rush: t.Boolean(),
  busted: t.Boolean(),
});

export const FarkleBattleStateDTO = t.Object({
  phase: t.String(),
  player_party: t.Array(BattlePartyMemberDTO),
  opponent_party: t.Array(BattlePartyMemberDTO),
  set_aside_element: t.Nullable(t.String()),
  opponent_set_aside_element: t.Nullable(t.String()),
  current_turn: t.Number(),
  player_turns_done: t.Number(),
  opponent_turns_done: t.Number(),
  player_turn: t.Nullable(FarkleTurnStateDTO),
  opponent_turn_result: t.Nullable(t.Any()),
  player_bonuses_total: t.Record(t.String(), t.Number()),
  opponent_bonuses_total: t.Record(t.String(), t.Number()),
  player_health: t.Number(),
  opponent_health: t.Number(),
  combat_log: t.Array(t.Any()),
  last_player_deployment: t.Optional(t.Array(t.Number())),
  last_opponent_deployment: t.Optional(t.Array(t.Number())),
  winner: t.Optional(t.String()),
  player_total_attack: t.Optional(t.Number()),
  opponent_total_attack: t.Optional(t.Number()),
});

export const FarkleTurnResultDTO = t.Object({
  battle_state: FarkleBattleStateDTO,
  detected_combinations: t.Array(FarkleCombinationDTO),
  is_busted: t.Boolean(),
  is_dice_rush: t.Boolean(),
  is_resolved: t.Optional(t.Boolean()),
  result: t.Optional(
    t.Object({
      victory: t.Boolean(),
      message: t.String(),
      player_total_attack: t.Number(),
      opponent_total_attack: t.Number(),
      reward: t.Optional(t.Number()),
      penalty: t.Optional(
        t.Object({
          downgraded_elemental: t.Optional(t.String()),
        }),
      ),
      can_continue: t.Boolean(),
    }),
  ),
});

export const FarkleRerollDTO = t.Object({
  player_id: t.String(),
  dice_indices_to_reroll: t.Array(t.Number()),
});

export const FarkleSetAsideDTO = t.Object({
  player_id: t.String(),
  dice_indices: t.Array(t.Number()),
  combination_type: t.Optional(t.String()),
  one_for_all_element: t.Optional(t.String()), // chosen element for One-For-All bonus
});

export const FarkleContinueDTO = t.Object({
  player_id: t.String(),
});

export const FarkleEndTurnDTO = t.Object({
  player_id: t.String(),
});

export const FarkleContextDTO = t.Union([
  t.Literal("pvp_battle"),
  t.Literal("wild_encounter"),
]);

export const FarkleInitDTO = t.Object({
  player_id: t.String(),
  event_type: FarkleContextDTO,
  event_id: t.String(),
  set_aside_element: ElementType,
});

export const FarkleSessionActionBaseDTO = t.Object({
  player_id: t.String(),
  farkle_session_id: t.String(),
});

export const GenericFarkleRollDTO = t.Intersect([
  FarkleSessionActionBaseDTO,
  t.Object({}),
]);

export const GenericFarkleRerollDTO = t.Intersect([
  FarkleSessionActionBaseDTO,
  t.Object({
    dice_indices_to_reroll: t.Array(t.Number()),
  }),
]);

export const GenericFarkleSetAsideDTO = t.Intersect([
  FarkleSessionActionBaseDTO,
  t.Object({
    dice_indices: t.Array(t.Number()),
    one_for_all_element: t.Optional(t.String()),
  }),
]);

export const GenericFarkleContinueDTO = t.Intersect([
  FarkleSessionActionBaseDTO,
  t.Object({}),
]);

export const GenericFarkleEndTurnDTO = t.Intersect([
  FarkleSessionActionBaseDTO,
  t.Object({
    item_id: t.Optional(t.String()),
  }),
]);

/* legacy context DTOs retained for compatibility in type exports only */
export const LegacyGenericFarkleRollDTO = t.Object({
  player_id: t.String(),
  context: FarkleContextDTO,
});

// Extract TypeScript types
export type EventResponse = typeof EventResponseDTO.static;
export type TriggerEventData = typeof TriggerEventDTO.static;
export type CreateEventData = typeof CreateEventDTO.static;
export type EventOptionsResponse = typeof EventOptionsResponseDTO.static;
export type WildEncounterData = typeof WildEncounterDataDTO.static;
export type MerchantData = typeof MerchantDataDTO.static;
export type PvPData = typeof PvPDataDTO.static;
export type BattlePartyMemberData = typeof BattlePartyMemberDTO.static;
export type BattleRollRecord = typeof BattleRollRecordDTO.static;
export type BattleStateData = typeof BattleStateDTO.static;
export type ResolveWildEncounterData = typeof ResolveWildEncounterDTO.static;
export type WildEncounterResult = typeof WildEncounterResultDTO.static;
export type WildEncounterFarkleEndTurnData = typeof WildEncounterFarkleEndTurnDTO.static;
export type BattleStartData = typeof BattleStartDTO.static;
export type BattleRollData = typeof BattleRollDTO.static;
export type BattleRollResult = typeof BattleRollResultDTO.static;
export type SkipWildEncounterData = typeof SkipWildEncounterDTO.static;
export type SkipWildEncounterResult = typeof SkipWildEncounterResultDTO.static;
export type LeaveMerchantData = typeof LeaveMerchantDTO.static;
export type LeaveMerchantResult = typeof LeaveMerchantResultDTO.static;
export type ChooseElementData = typeof ChooseElementDTO.static;
export type FarkleRerollData = typeof FarkleRerollDTO.static;
export type FarkleSetAsideData = typeof FarkleSetAsideDTO.static;
export type FarkleContinueData = typeof FarkleContinueDTO.static;
export type FarkleEndTurnData = typeof FarkleEndTurnDTO.static;
export type FarkleContextData = typeof FarkleContextDTO.static;
export type FarkleInitData = typeof FarkleInitDTO.static;
export type GenericFarkleRollData = typeof GenericFarkleRollDTO.static;
export type GenericFarkleRerollData = typeof GenericFarkleRerollDTO.static;
export type GenericFarkleSetAsideData = typeof GenericFarkleSetAsideDTO.static;
export type GenericFarkleContinueData = typeof GenericFarkleContinueDTO.static;
export type GenericFarkleEndTurnData = typeof GenericFarkleEndTurnDTO.static;
