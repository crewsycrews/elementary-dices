import { t } from 'elysia';

// Element types enum
export const ElementType = t.Union([
  t.Literal('fire'),
  t.Literal('water'),
  t.Literal('earth'),
  t.Literal('air'),
  t.Literal('lightning'),
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
  t.Literal('green'),
  t.Literal('blue'),
  t.Literal('purple'),
  t.Literal('gold'),
]);

// Item rarity
export const ItemRarity = t.Union([
  t.Literal('common'),
  t.Literal('rare'),
  t.Literal('epic'),
  t.Literal('legendary'),
]);

// Encounter types
export const EncounterType = t.Union([
  t.Literal('wild_encounter'),
  t.Literal('pvp_battle'),
  t.Literal('merchant'),
]);

// Encounter status
export const EncounterStatus = t.Union([
  t.Literal('pending'),
  t.Literal('in_progress'),
  t.Literal('completed'),
  t.Literal('fled'),
]);

// Battle outcome
export const BattleOutcome = t.Union([
  t.Literal('victory'),
  t.Literal('defeat'),
  t.Literal('draw'),
]);

// Dice roll outcome
export const DiceRollOutcome = t.Union([
  t.Literal('crit_success'),
  t.Literal('success'),
  t.Literal('fail'),
  t.Literal('crit_fail'),
]);

// Dice roll context
export const DiceRollContext = t.Union([
  t.Literal('capture_attempt'),
  t.Literal('combat'),
  t.Literal('penalty_roll'),
  t.Literal('event_trigger'),
  t.Literal('initial_roll'),
]);

// Item type
export const ItemType = t.Union([
  t.Literal('capture'),
  t.Literal('consumable'),
  t.Literal('buff'),
]);

// ========================================
// User Schemas
// ========================================

export const UserSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  username: t.String({ minLength: 3, maxLength: 20 }),
  email: t.String({ format: 'email' }),
  currency: t.Integer({ minimum: 0 }),
  updated_at: t.String({ format: 'date-time' }),
});

export const CreateUserSchema = t.Object({
  username: t.String({ minLength: 3, maxLength: 20 }),
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
});

export const UpdateUserSchema = t.Partial(
  t.Object({
    username: t.String({ minLength: 3, maxLength: 20 }),
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
  })
);

// ========================================
// Elemental Schemas
// ========================================

export const ElementalSchema = t.Object({
  id: t.String({ format: 'uuid' }),
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
  id: t.String({ format: 'uuid' }),
  result_elemental_id: t.String({ format: 'uuid' }),
  required_level: t.Integer({ minimum: 1, maximum: 3 }),
  required_count: t.Integer({ minimum: 2, maximum: 3 }),
  required_same_element: t.Optional(ElementType),
  required_element_1: t.Optional(ElementType),
  required_element_2: t.Optional(ElementType),
  required_elemental_ids: t.Optional(t.Array(t.String({ format: 'uuid' }))),
  hint_text: t.Optional(t.String()),
  is_discovered_by_default: t.Boolean(),
});

export const CreateElementalEvolutionSchema = t.Object({
  result_elemental_id: t.String({ format: 'uuid' }),
  required_level: t.Integer({ minimum: 1, maximum: 3 }),
  required_count: t.Integer({ minimum: 2, maximum: 3 }),
  required_same_element: t.Optional(ElementType),
  required_element_1: t.Optional(ElementType),
  required_element_2: t.Optional(ElementType),
  required_elemental_ids: t.Optional(t.Array(t.String({ format: 'uuid' }))),
  hint_text: t.Optional(t.String()),
  is_discovered_by_default: t.Optional(t.Boolean()),
});

// ========================================
// Player Elemental Schemas
// ========================================

export const PlayerElementalSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  elemental_id: t.String({ format: 'uuid' }),
  current_stats: StatsSchema,
  is_in_active_party: t.Boolean(),
  party_position: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
});

export const CreatePlayerElementalSchema = t.Object({
  player_id: t.String({ format: 'uuid' }),
  elemental_id: t.String({ format: 'uuid' }),
  current_stats: t.Optional(StatsSchema),
  is_in_active_party: t.Optional(t.Boolean()),
  party_position: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
});

export const UpdatePlayerElementalSchema = t.Partial(
  t.Object({
    current_stats: StatsSchema,
    is_in_active_party: t.Boolean(),
    party_position: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
  })
);

// ========================================
// Dice Type Schemas
// ========================================

export const DiceTypeSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  dice_notation: t.String(),
  rarity: DiceRarity,
  name: t.String(),
  stat_bonuses: t.Object({
    bonus_multiplier: t.Number({ minimum: 1 }),
    element_affinity: t.Optional(ElementType),
  }),
  outcome_thresholds: t.Object({
    crit_success_range: t.Tuple([t.Integer(), t.Integer()]),
    success_range: t.Tuple([t.Integer(), t.Integer()]),
    fail_range: t.Tuple([t.Integer(), t.Integer()]),
    crit_fail_range: t.Tuple([t.Integer(), t.Integer()]),
  }),
  price: t.Integer({ minimum: 0 }),
  description: t.String(),
});

export const CreateDiceTypeSchema = t.Object({
  dice_notation: t.String(),
  rarity: DiceRarity,
  name: t.String(),
  stat_bonuses: t.Object({
    bonus_multiplier: t.Number({ minimum: 1 }),
    element_affinity: t.Optional(ElementType),
  }),
  outcome_thresholds: t.Object({
    crit_success_range: t.Tuple([t.Integer(), t.Integer()]),
    success_range: t.Tuple([t.Integer(), t.Integer()]),
    fail_range: t.Tuple([t.Integer(), t.Integer()]),
    crit_fail_range: t.Tuple([t.Integer(), t.Integer()]),
  }),
  price: t.Integer({ minimum: 0 }),
  description: t.String(),
});

// ========================================
// Player Dice Schemas
// ========================================

export const PlayerDiceSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.String({ format: 'uuid' }),
  is_equipped: t.Boolean(),
});

export const CreatePlayerDiceSchema = t.Object({
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.String({ format: 'uuid' }),
  is_equipped: t.Optional(t.Boolean()),
});

// ========================================
// Item Schemas
// ========================================

export const ItemSchema = t.Object({
  id: t.String({ format: 'uuid' }),
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
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  item_id: t.String({ format: 'uuid' }),
  quantity: t.Integer({ minimum: 0 }),
});

export const CreatePlayerInventorySchema = t.Object({
  player_id: t.String({ format: 'uuid' }),
  item_id: t.String({ format: 'uuid' }),
  quantity: t.Optional(t.Integer({ minimum: 1 })),
});

// ========================================
// Event Schemas
// ========================================

// Wild Encounter Event Schema
export const WildEncounterEventSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  elemental_id: t.String({ format: 'uuid' }),
  stats_modifier: t.Number(),
  status: EncounterStatus,
  outcome: t.Optional(BattleOutcome),
  dice_roll_id: t.Optional(t.String({ format: 'uuid' })),
  item_used_id: t.Optional(t.String({ format: 'uuid' })),
  captured_player_elemental_id: t.Optional(t.String({ format: 'uuid' })),
  created_at: t.String({ format: 'date-time' }),
  resolved_at: t.Optional(t.String({ format: 'date-time' })),
});

export const CreateWildEncounterEventSchema = t.Object({
  player_id: t.String({ format: 'uuid' }),
  elemental_id: t.String({ format: 'uuid' }),
  stats_modifier: t.Optional(t.Number()),
});

// Battle Event Schema (PvP battles)
export const BattleEventSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  opponent_player_id: t.Optional(t.String({ format: 'uuid' })),
  opponent_name: t.String(),
  opponent_power_level: t.Integer(),
  status: EncounterStatus,
  outcome: t.Optional(BattleOutcome),
  player_power: t.Optional(t.Integer()),
  opponent_actual_power: t.Optional(t.Integer()),
  dice_roll_id: t.Optional(t.String({ format: 'uuid' })),
  currency_reward: t.Optional(t.Integer()),
  downgraded_elemental_id: t.Optional(t.String({ format: 'uuid' })),
  created_at: t.String({ format: 'date-time' }),
  resolved_at: t.Optional(t.String({ format: 'date-time' })),
});

export const CreateBattleEventSchema = t.Object({
  player_id: t.String({ format: 'uuid' }),
  opponent_player_id: t.Optional(t.String({ format: 'uuid' })),
  opponent_name: t.String(),
  opponent_power_level: t.Integer(),
});

// Merchant Event Schema
export const MerchantEventSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  status: EncounterStatus,
  available_until: t.String({ format: 'date-time' }),
  total_purchases: t.Integer({ minimum: 0 }),
  total_spent: t.Integer({ minimum: 0 }),
  created_at: t.String({ format: 'date-time' }),
  resolved_at: t.Optional(t.String({ format: 'date-time' })),
});

export const CreateMerchantEventSchema = t.Object({
  player_id: t.String({ format: 'uuid' }),
  available_until: t.String({ format: 'date-time' }),
});

// Legacy Battle Schema (kept for backwards compatibility if needed)
export const BattleSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  battle_type: EncounterType,
  initiator_player_id: t.String({ format: 'uuid' }),
  opponent_player_id: t.Optional(t.String({ format: 'uuid' })),
  status: EncounterStatus,
  outcome: t.Optional(BattleOutcome),
  rewards: t.Optional(
    t.Object({
      currency: t.Optional(t.Integer()),
      items: t.Optional(
        t.Array(
          t.Object({
            item_id: t.String({ format: 'uuid' }),
            quantity: t.Integer(),
          })
        )
      ),
      captured_elemental_id: t.Optional(t.String({ format: 'uuid' })),
    })
  ),
  penalties: t.Optional(
    t.Object({
      downgraded_elemental_ids: t.Array(t.String({ format: 'uuid' })),
    })
  ),
  completed_at: t.Optional(t.String({ format: 'date-time' })),
});

export const CreateBattleSchema = t.Object({
  battle_type: EncounterType,
  initiator_player_id: t.String({ format: 'uuid' }),
  opponent_player_id: t.Optional(t.String({ format: 'uuid' })),
});

// ========================================
// Dice Roll Schemas
// ========================================

export const DiceRollSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  battle_id: t.Optional(t.String({ format: 'uuid' })),
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.String({ format: 'uuid' }),
  dice_notation: t.Optional(t.String()), // Added from dice_types join
  roll_value: t.Integer(),
  outcome: DiceRollOutcome,
  context: DiceRollContext,
  modifiers: t.Optional(
    t.Object({
      element_bonus: t.Optional(t.Integer()),
      item_bonus: t.Optional(t.Integer()),
      total_bonus: t.Optional(t.Integer()),
    })
  ),
});

export const CreateDiceRollSchema = t.Object({
  battle_id: t.Optional(t.String({ format: 'uuid' })),
  player_id: t.String({ format: 'uuid' }),
  dice_type_id: t.String({ format: 'uuid' }),
  context: DiceRollContext,
});

// ========================================
// Player Progress Schema
// ========================================

export const PlayerProgressSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  total_elementals_owned: t.Integer({ minimum: 0 }),
  unique_elementals_collected: t.Integer({ minimum: 0 }),
  total_battles: t.Integer({ minimum: 0 }),
  battles_won: t.Integer({ minimum: 0 }),
  battles_lost: t.Integer({ minimum: 0 }),
  total_dice_rolls: t.Integer({ minimum: 0 }),
  successful_captures: t.Integer({ minimum: 0 }),
  highest_level_elemental: t.Integer({ minimum: 1, maximum: 4 }),
  updated_at: t.String({ format: 'date-time' }),
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
  DiceRollOutcome,
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
};
