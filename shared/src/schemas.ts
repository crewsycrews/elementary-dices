import { t } from "elysia";

// Element types enum
export const ElementType = t.Union([
  t.Literal("fire"),
  t.Literal("water"),
  t.Literal("earth"),
  t.Literal("air"),
  t.Literal("lightning"),
]);

// Stats schema
export const StatsSchema = t.Object({
  health: t.Integer({ minimum: 0 }),
  attack: t.Integer({ minimum: 0 }),
  defense: t.Integer({ minimum: 0 }),
  speed: t.Integer({ minimum: 0 }),
});

// Dice rarity
export const DiceRarity = t.Union([
  t.Literal("green"),
  t.Literal("blue"),
  t.Literal("purple"),
  t.Literal("gold"),
]);

// Item rarity
export const ItemRarity = t.Union([
  t.Literal("common"),
  t.Literal("rare"),
  t.Literal("epic"),
  t.Literal("legendary"),
]);

// Encounter types
export const EncounterType = t.Union([
  t.Literal("wild_encounter"),
  t.Literal("pvp_battle"),
  t.Literal("merchant"),
]);

// Encounter status
export const EncounterStatus = t.Union([
  t.Literal("pending"),
  t.Literal("in_progress"),
  t.Literal("completed"),
  t.Literal("fled"),
]);

// Battle outcome
export const BattleOutcome = t.Union([
  t.Literal("victory"),
  t.Literal("defeat"),
  t.Literal("draw"),
]);

// Dice roll context
export const DiceRollContext = t.Union([
  t.Literal("capture_attempt"),
  t.Literal("combat"),
  t.Literal("penalty_roll"),
  t.Literal("event_trigger"),
  t.Literal("initial_roll"),
  t.Literal("farkle_battle"),
]);

// Item type
export const ItemType = t.Union([
  t.Literal("capture"),
  t.Literal("consumable"),
  t.Literal("buff"),
]);

// ========================================
// User Schemas
// ========================================

export const UserSchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String({ minLength: 3, maxLength: 20 }),
  email: t.String({ format: "email" }),
  currency: t.Integer({ minimum: 0 }),
  updated_at: t.String({ format: "date-time" }),
});

export const CreateUserSchema = t.Object({
  username: t.String({ minLength: 3, maxLength: 20 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
});

export const UpdateUserSchema = t.Partial(
  t.Object({
    username: t.String({ minLength: 3, maxLength: 20 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
  }),
);

// ========================================
// Elemental Schemas
// ========================================

export const ElementalSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  level: t.Integer({ minimum: 1, maximum: 4 }),
  element_types: t.Array(ElementType),
  base_stats: StatsSchema,
  description: t.String(),
  image_url: t.Optional(t.String()),
  is_base_elemental: t.Boolean(),
});

export const CreateElementalSchema = t.Object({
  name: t.String(),
  level: t.Integer({ minimum: 1, maximum: 4 }),
  element_types: t.Array(ElementType),
  base_stats: StatsSchema,
  description: t.String(),
  image_url: t.Optional(t.String()),
  is_base_elemental: t.Boolean(),
});

// ========================================
// Elemental Evolution Schemas
// ========================================

export const ElementalEvolutionSchema = t.Object({
  id: t.String({ format: "uuid" }),
  result_elemental_id: t.String({ format: "uuid" }),
  required_level: t.Integer({ minimum: 1, maximum: 3 }),
  required_count: t.Integer({ minimum: 2, maximum: 3 }),
  required_same_element: t.Optional(ElementType),
  required_element_1: t.Optional(ElementType),
  required_element_2: t.Optional(ElementType),
  required_elemental_ids: t.Optional(t.Array(t.String({ format: "uuid" }))),
  hint_text: t.Optional(t.String()),
  is_discovered_by_default: t.Boolean(),
});

export const CreateElementalEvolutionSchema = t.Object({
  result_elemental_id: t.String({ format: "uuid" }),
  required_level: t.Integer({ minimum: 1, maximum: 3 }),
  required_count: t.Integer({ minimum: 2, maximum: 3 }),
  required_same_element: t.Optional(ElementType),
  required_element_1: t.Optional(ElementType),
  required_element_2: t.Optional(ElementType),
  required_elemental_ids: t.Optional(t.Array(t.String({ format: "uuid" }))),
  hint_text: t.Optional(t.String()),
  is_discovered_by_default: t.Optional(t.Boolean()),
});

// ========================================
// Player Elemental Schemas
// ========================================

export const PlayerElementalSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  elemental_id: t.String({ format: "uuid" }),
  current_stats: StatsSchema,
  is_in_active_party: t.Boolean(),
  party_position: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
});

export const CreatePlayerElementalSchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  elemental_id: t.String({ format: "uuid" }),
  current_stats: t.Optional(StatsSchema),
  is_in_active_party: t.Optional(t.Boolean()),
  party_position: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
});

export const UpdatePlayerElementalSchema = t.Partial(
  t.Object({
    current_stats: StatsSchema,
    is_in_active_party: t.Boolean(),
    party_position: t.Optional(
      t.Nullable(t.Integer({ minimum: 1, maximum: 5 })),
    ),
  }),
);

// ========================================
// Dice Type Schemas
// ========================================

export const DiceTypeSchema = t.Object({
  id: t.String({ format: "uuid" }),
  dice_notation: t.String(),
  rarity: DiceRarity,
  name: t.String(),
  faces: t.Array(ElementType),
  price: t.Integer({ minimum: 0 }),
  description: t.String(),
});

export const CreateDiceTypeSchema = t.Object({
  dice_notation: t.String(),
  rarity: DiceRarity,
  name: t.String(),
  faces: t.Array(ElementType),
  price: t.Integer({ minimum: 0 }),
  description: t.String(),
});

// ========================================
// Player Dice Schemas
// ========================================

export const PlayerDiceSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  dice_type_id: t.String({ format: "uuid" }),
  is_equipped: t.Boolean(),
});

export const CreatePlayerDiceSchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  dice_type_id: t.String({ format: "uuid" }),
  is_equipped: t.Optional(t.Boolean()),
});

// ========================================
// Item Schemas
// ========================================

export const ItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  item_type: ItemType,
  effect: t.Object({
    capture_bonus: t.Optional(t.Integer()),
    stat_modifier: t.Optional(t.Any()),
    duration: t.Optional(t.Integer()),
  }),
  price: t.Integer({ minimum: 0 }),
  rarity: ItemRarity,
  description: t.String(),
  is_consumable: t.Boolean(),
});

export const CreateItemSchema = t.Object({
  name: t.String(),
  item_type: ItemType,
  effect: t.Object({
    capture_bonus: t.Optional(t.Integer()),
    stat_modifier: t.Optional(t.Any()),
    duration: t.Optional(t.Integer()),
  }),
  price: t.Integer({ minimum: 0 }),
  rarity: ItemRarity,
  description: t.String(),
  is_consumable: t.Optional(t.Boolean()),
});

// ========================================
// Player Inventory Schemas
// ========================================

export const PlayerInventorySchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  item_id: t.String({ format: "uuid" }),
  quantity: t.Integer({ minimum: 0 }),
});

export const CreatePlayerInventorySchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  item_id: t.String({ format: "uuid" }),
  quantity: t.Optional(t.Integer({ minimum: 1 })),
});

// ========================================
// Event Schemas
// ========================================

// Wild Encounter Event Schema
export const WildEncounterEventSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  elemental_id: t.String({ format: "uuid" }),
  stats_modifier: t.Number(),
  status: EncounterStatus,
  outcome: t.Optional(BattleOutcome),
  dice_roll_id: t.Optional(t.String({ format: "uuid" })),
  item_used_id: t.Optional(t.String({ format: "uuid" })),
  captured_player_elemental_id: t.Optional(t.String({ format: "uuid" })),
  created_at: t.String({ format: "date-time" }),
  resolved_at: t.Optional(t.String({ format: "date-time" })),
});

export const CreateWildEncounterEventSchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  elemental_id: t.String({ format: "uuid" }),
  stats_modifier: t.Optional(t.Number()),
});

// Battle Event Schema (PvP battles)
export const BattleEventSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  opponent_player_id: t.Optional(t.String({ format: "uuid" })),
  opponent_name: t.String(),
  opponent_power_level: t.Integer(),
  status: EncounterStatus,
  outcome: t.Optional(BattleOutcome),
  player_power: t.Optional(t.Integer()),
  opponent_actual_power: t.Optional(t.Integer()),
  dice_roll_id: t.Optional(t.String({ format: "uuid" })),
  currency_reward: t.Optional(t.Integer()),
  downgraded_elemental_id: t.Optional(t.String({ format: "uuid" })),
  created_at: t.String({ format: "date-time" }),
  resolved_at: t.Optional(t.String({ format: "date-time" })),
});

export const CreateBattleEventSchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  opponent_player_id: t.Optional(t.String({ format: "uuid" })),
  opponent_name: t.String(),
  opponent_power_level: t.Integer(),
});

// Merchant Event Schema
export const MerchantEventSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  status: EncounterStatus,
  available_until: t.String({ format: "date-time" }),
  total_purchases: t.Integer({ minimum: 0 }),
  total_spent: t.Integer({ minimum: 0 }),
  created_at: t.String({ format: "date-time" }),
  resolved_at: t.Optional(t.String({ format: "date-time" })),
});

export const CreateMerchantEventSchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  available_until: t.String({ format: "date-time" }),
});

// ========================================
// Battle State Schemas (3-phase battle system)
// ========================================

export const BattlePartyMemberSchema = t.Object({
  player_elemental_id: t.Optional(t.String({ format: "uuid" })),
  elemental_id: t.String({ format: "uuid" }),
  name: t.String(),
  element: ElementType,
  level: t.Integer({ minimum: 1, maximum: 4 }),
  base_power: t.Number(),
  current_power: t.Number(),
  target_index: t.Integer(),
});

export const BattleRollRecordSchema = t.Object({
  turn: t.Integer({ minimum: 1, maximum: 3 }),
  side: t.Union([t.Literal("player"), t.Literal("opponent")]),
  dice_type_id: t.Optional(t.String({ format: "uuid" })),
  dice_element: ElementType,
  result_element: ElementType,
  bonus_applied: t.Number(),
  affected_element: t.String(), // element name or "all_others"
  roll_value: t.Optional(t.Integer()),
});

export const BattlePhase = t.Union([
  t.Literal("targeting"),
  t.Literal("rolling"),
  t.Literal("resolved"),
]);

export const BattleStateSchema = t.Object({
  phase: BattlePhase,
  player_party: t.Array(BattlePartyMemberSchema),
  opponent_party: t.Array(BattlePartyMemberSchema),
  rolls: t.Array(BattleRollRecordSchema),
  current_turn: t.Integer({ minimum: 0, maximum: 3 }),
  player_rolls_done: t.Integer({ minimum: 0, maximum: 3 }),
  opponent_rolls_done: t.Integer({ minimum: 0, maximum: 3 }),
  winner: t.Optional(t.Union([t.Literal("player"), t.Literal("opponent"), t.Literal("draw")])),
  player_total_power: t.Optional(t.Number()),
  opponent_total_power: t.Optional(t.Number()),
});

// Legacy Battle Schema (kept for backwards compatibility if needed)
export const BattleSchema = t.Object({
  id: t.String({ format: "uuid" }),
  battle_type: EncounterType,
  initiator_player_id: t.String({ format: "uuid" }),
  opponent_player_id: t.Optional(t.String({ format: "uuid" })),
  status: EncounterStatus,
  outcome: t.Optional(BattleOutcome),
  rewards: t.Optional(
    t.Object({
      currency: t.Optional(t.Integer()),
      items: t.Optional(
        t.Array(
          t.Object({
            item_id: t.String({ format: "uuid" }),
            quantity: t.Integer(),
          }),
        ),
      ),
      captured_elemental_id: t.Optional(t.String({ format: "uuid" })),
    }),
  ),
  penalties: t.Optional(
    t.Object({
      downgraded_elemental_ids: t.Array(t.String({ format: "uuid" })),
    }),
  ),
  completed_at: t.Optional(t.String({ format: "date-time" })),
});

export const CreateBattleSchema = t.Object({
  battle_type: EncounterType,
  initiator_player_id: t.String({ format: "uuid" }),
  opponent_player_id: t.Optional(t.String({ format: "uuid" })),
});

// ========================================
// Dice Roll Schemas
// ========================================

export const DiceRollSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  dice_type_id: t.String({ format: "uuid" }),
  dice_notation: t.Optional(t.String()), // Added from dice_types join
  roll_value: t.Integer(),
  result_element: ElementType,
  context: DiceRollContext,
});

export const CreateDiceRollSchema = t.Object({
  player_id: t.String({ format: "uuid" }),
  dice_type_id: t.String({ format: "uuid" }),
  result_element: ElementType,
  context: DiceRollContext,
});

// ========================================
// Player Progress Schema
// ========================================

export const PlayerProgressSchema = t.Object({
  id: t.String({ format: "uuid" }),
  player_id: t.String({ format: "uuid" }),
  total_elementals_owned: t.Integer({ minimum: 0 }),
  unique_elementals_collected: t.Integer({ minimum: 0 }),
  total_battles: t.Integer({ minimum: 0 }),
  battles_won: t.Integer({ minimum: 0 }),
  battles_lost: t.Integer({ minimum: 0 }),
  total_dice_rolls: t.Integer({ minimum: 0 }),
  successful_captures: t.Integer({ minimum: 0 }),
  highest_level_elemental: t.Integer({ minimum: 1, maximum: 4 }),
  updated_at: t.String({ format: "date-time" }),
});

// ========================================
// Farkle Battle System Schemas (v2)
// ========================================

export const CombinationType = t.Union([
  t.Literal("triplet"),
  t.Literal("quartet"),
  t.Literal("all_for_one"),
  t.Literal("one_for_all"),
  t.Literal("full_house"),
]);

export const CombinationSchema = t.Object({
  type: CombinationType,
  elements: t.Array(ElementType),
  dice_indices: t.Array(t.Integer()),
  bonuses: t.Record(t.String(), t.Number()),
});

export const FarkleDieSchema = t.Object({
  player_dice_id: t.String(),
  dice_type_id: t.String({ format: "uuid" }),
  dice_notation: t.String(),
  faces: t.Array(ElementType),
  current_result: ElementType,
  is_set_aside: t.Boolean(),
});

export const FarkleTurnPhase = t.Union([
  t.Literal("initial_roll"),
  t.Literal("can_reroll"),
  t.Literal("set_aside"),
  t.Literal("rolling_remaining"),
  t.Literal("done"),
]);

export const FarkleTurnStateSchema = t.Object({
  phase: FarkleTurnPhase,
  dice: t.Array(FarkleDieSchema),
  has_used_reroll: t.Boolean(),
  active_combinations: t.Array(CombinationSchema),
  set_aside_element_bonus: t.Nullable(ElementType),
  accumulated_dice_rush_bonuses: t.Optional(t.Record(t.String(), t.Number())),
  is_dice_rush: t.Boolean(),
  busted: t.Boolean(),
});

export const OpponentTurnResultSchema = t.Object({
  dice: t.Array(FarkleDieSchema),
  combination: t.Nullable(CombinationSchema),
  set_aside_element_used: t.Boolean(),
  bonuses_applied: t.Record(t.String(), t.Number()),
  busted: t.Boolean(),
});

export const FarkleBattlePhase = t.Union([
  t.Literal("targeting"),
  t.Literal("choose_element"),
  t.Literal("player_turn"),
  t.Literal("opponent_turn"),
  t.Literal("resolved"),
]);

export const FarkleBattleStateSchema = t.Object({
  phase: FarkleBattlePhase,
  player_party: t.Array(BattlePartyMemberSchema),
  opponent_party: t.Array(BattlePartyMemberSchema),
  set_aside_element: t.Nullable(ElementType),
  opponent_set_aside_element: t.Nullable(ElementType),
  current_turn: t.Integer({ minimum: 1, maximum: 3 }),
  player_turns_done: t.Integer({ minimum: 0, maximum: 3 }),
  opponent_turns_done: t.Integer({ minimum: 0, maximum: 3 }),
  player_turn: t.Nullable(FarkleTurnStateSchema),
  opponent_turn_result: t.Nullable(OpponentTurnResultSchema),
  player_bonuses_total: t.Record(t.String(), t.Number()),
  opponent_bonuses_total: t.Record(t.String(), t.Number()),
  winner: t.Optional(
    t.Union([t.Literal("player"), t.Literal("opponent"), t.Literal("draw")]),
  ),
  player_total_power: t.Optional(t.Number()),
  opponent_total_power: t.Optional(t.Number()),
});

// Export all schemas for convenience
export const schemas = {
  // Enums
  ElementType,
  DiceRarity,
  ItemRarity,
  BattleType: EncounterType,
  BattleStatus: EncounterStatus,
  BattleOutcome,
  DiceRollContext,
  ItemType,

  // Users
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,

  // Elementals
  ElementalSchema,
  CreateElementalSchema,
  ElementalEvolutionSchema,
  CreateElementalEvolutionSchema,

  // Player Elementals
  PlayerElementalSchema,
  CreatePlayerElementalSchema,
  UpdatePlayerElementalSchema,

  // Dice
  DiceTypeSchema,
  CreateDiceTypeSchema,
  PlayerDiceSchema,
  CreatePlayerDiceSchema,

  // Items
  ItemSchema,
  CreateItemSchema,
  PlayerInventorySchema,
  CreatePlayerInventorySchema,

  // Events
  WildEncounterEventSchema,
  CreateWildEncounterEventSchema,
  BattleEventSchema,
  CreateBattleEventSchema,
  MerchantEventSchema,
  CreateMerchantEventSchema,

  // Battles (Legacy)
  BattleSchema,
  CreateBattleSchema,
  DiceRollSchema,
  CreateDiceRollSchema,

  // Progress
  PlayerProgressSchema,

  // Stats
  StatsSchema,

  // Battle State
  BattlePartyMemberSchema,
  BattleRollRecordSchema,
  BattlePhase,
  BattleStateSchema,

  // Farkle Battle System (v2)
  CombinationType,
  CombinationSchema,
  FarkleDieSchema,
  FarkleTurnPhase,
  FarkleTurnStateSchema,
  OpponentTurnResultSchema,
  FarkleBattlePhase,
  FarkleBattleStateSchema,
};
