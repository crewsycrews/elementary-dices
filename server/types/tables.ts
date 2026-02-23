import type { Knex } from 'knex';
import type {
  BaseStats,
  BattleOutcomeValue,
  BattleState,
  DiceRarityValue,
  DiceRollContextValue,
  DiceRollOutcomeValue,
  ElementTypeValue,
  EncounterStatusValue,
  ItemRarityValue,
  ItemTypeValue,
} from '@elementary-dices/shared';

// ============================================================
// JSONB shape interfaces
// ============================================================

interface DiceStatBonuses {
  bonus_multiplier: number;
  element_affinity?: ElementTypeValue;
}

interface DiceOutcomeThresholds {
  crit_success_range: [number, number];
  success_range: [number, number];
  fail_range: [number, number];
  crit_fail_range: [number, number];
}

interface ItemEffect {
  capture_bonus?: number;
  stat_modifier?: unknown;
  duration?: number;
}

interface RollModifiers {
  element_bonus?: number;
  item_bonus?: number;
  total_bonus?: number;
}

// ============================================================
// Row interfaces (full rows as returned from SELECT)
// ============================================================

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string | null;
  currency: number;
  updated_at: Date;
  email_verified: boolean;
  last_login_at: Date | null;
}

interface ElementalRow {
  id: string;
  name: string;
  level: number;
  element_types: ElementTypeValue[];
  base_stats: BaseStats;
  description: string;
  image_url: string | null;
  is_base_elemental: boolean;
}

interface ElementalEvolutionRow {
  id: string;
  result_elemental_id: string;
  required_level: number;
  required_count: number;
  required_same_element: string | null;
  required_element_1: string | null;
  required_element_2: string | null;
  required_elemental_ids: string[] | null;
  hint_text: string | null;
  is_discovered_by_default: boolean;
}

interface PlayerElementalRow {
  id: string;
  player_id: string;
  elemental_id: string;
  current_stats: BaseStats;
  is_in_active_party: boolean;
  party_position: number | null;
}

interface DiceTypeRow {
  id: string;
  dice_notation: string;
  rarity: DiceRarityValue;
  name: string;
  stat_bonuses: DiceStatBonuses;
  outcome_thresholds: DiceOutcomeThresholds;
  price: number;
  description: string;
}

interface PlayerDiceRow {
  id: string;
  player_id: string;
  dice_type_id: string;
  is_equipped: boolean;
  dice_notation: string;
}

interface ItemRow {
  id: string;
  name: string;
  item_type: ItemTypeValue;
  effect: ItemEffect;
  price: number;
  rarity: ItemRarityValue;
  description: string;
  is_consumable: boolean;
}

interface PlayerInventoryRow {
  id: string;
  player_id: string;
  item_id: string;
  quantity: number;
}

interface DiceRollRow {
  id: string;
  player_id: string;
  dice_type_id: string;
  roll_value: number;
  outcome: DiceRollOutcomeValue;
  context: DiceRollContextValue;
  modifiers: RollModifiers | null;
}

interface EventsBattleRow {
  id: string;
  player_id: string;
  opponent_player_id: string | null;
  opponent_name: string;
  opponent_power_level: number;
  status: EncounterStatusValue;
  outcome: BattleOutcomeValue | null;
  player_power: number | null;
  opponent_actual_power: number | null;
  dice_roll_id: string | null;
  currency_reward: number | null;
  downgraded_elemental_id: string | null;
  created_at: Date;
  resolved_at: Date | null;
  battle_state: BattleState | null;
  opponent_party_data: unknown;
}

interface BattleParticipantRow {
  id: string;
  battle_id: string;
  player_elemental_id: string | null;
  wild_elemental_id: string | null;
  position: number;
  calculated_stats: BaseStats;
  damage_dealt: number;
  damage_taken: number;
  survived: boolean;
}

interface WildEncounterRow {
  id: string;
  elemental_id: string;
  spawn_weight: number;
  capture_difficulty: number;
  min_stats_modifier: number;
  max_stats_modifier: number;
  is_active: boolean;
}

interface EventsWildEncounterRow {
  id: string;
  player_id: string;
  elemental_id: string;
  stats_modifier: number;
  status: EncounterStatusValue;
  outcome: BattleOutcomeValue | null;
  dice_roll_id: string | null;
  item_used_id: string | null;
  captured_player_elemental_id: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

interface EventsMerchantRow {
  id: string;
  player_id: string;
  status: EncounterStatusValue;
  available_until: Date;
  total_purchases: number;
  total_spent: number;
  created_at: Date;
  resolved_at: Date | null;
}

interface MerchantInventoryRow {
  id: string;
  merchant_event_id: string;
  item_id: string | null;
  dice_type_id: string | null;
  price: number;
  quantity: number;
  purchased: boolean;
}

interface PlayerDiscoveryRow {
  id: string;
  player_id: string;
  elemental_evolution_id: string;
}

interface PlayerProgressRow {
  id: string;
  player_id: string;
  total_elementals_owned: number;
  unique_elementals_collected: number;
  total_battles: number;
  battles_won: number;
  battles_lost: number;
  total_dice_rolls: number;
  successful_captures: number;
  highest_level_elemental: number;
  updated_at: Date;
}

interface PlayerCurrentEventRow {
  id: string;
  player_id: string;
  event_type: string;
  wild_encounter_id: string | null;
  battle_id: string | null;
  merchant_id: string | null;
  created_at: Date;
  expires_at: Date | null;
}

interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  token_family: string;
  expires_at: Date;
  created_at: Date;
  revoked_at?: Date | null;
}

// ============================================================
// Knex Tables augmentation
//
// Each entry uses CompositeTableType<Base, Insert, Update>:
//   Base   — full row shape returned by SELECT
//   Insert — fields required/allowed on INSERT
//            (id and server-managed timestamps are optional)
//   Update — Partial of everything except the primary key
// ============================================================

declare module 'knex/types/tables' {
  interface Tables {
    // ----------------------------------------------------------
    users: Knex.CompositeTableType<
      UserRow,
      Omit<UserRow, 'id' | 'updated_at'> & {
        id?: string;
        email_verified?: boolean;
        last_login_at?: Date | null;
      },
      Partial<Omit<UserRow, 'id' | 'updated_at'>>
    >;

    // ----------------------------------------------------------
    elementals: Knex.CompositeTableType<
      ElementalRow,
      Omit<ElementalRow, 'id'> & { id?: string; image_url?: string | null },
      Partial<Omit<ElementalRow, 'id'>>
    >;

    // ----------------------------------------------------------
    elemental_evolutions: Knex.CompositeTableType<
      ElementalEvolutionRow,
      Omit<ElementalEvolutionRow, 'id'> & {
        id?: string;
        required_same_element?: string | null;
        required_element_1?: string | null;
        required_element_2?: string | null;
        required_elemental_ids?: string[] | null;
        hint_text?: string | null;
        is_discovered_by_default?: boolean;
      },
      Partial<Omit<ElementalEvolutionRow, 'id'>>
    >;

    // ----------------------------------------------------------
    player_elementals: Knex.CompositeTableType<
      PlayerElementalRow,
      Omit<PlayerElementalRow, 'id'> & {
        id?: string;
        is_in_active_party?: boolean;
        party_position?: number | null;
      },
      Partial<Omit<PlayerElementalRow, 'id'>>
    >;

    // ----------------------------------------------------------
    dice_types: Knex.CompositeTableType<
      DiceTypeRow,
      Omit<DiceTypeRow, 'id'> & { id?: string },
      Partial<Omit<DiceTypeRow, 'id'>>
    >;

    // ----------------------------------------------------------
    player_dice: Knex.CompositeTableType<
      PlayerDiceRow,
      Omit<PlayerDiceRow, 'id'> & { id?: string; is_equipped?: boolean },
      Partial<Omit<PlayerDiceRow, 'id'>>
    >;

    // ----------------------------------------------------------
    items: Knex.CompositeTableType<
      ItemRow,
      Omit<ItemRow, 'id'> & { id?: string; is_consumable?: boolean },
      Partial<Omit<ItemRow, 'id'>>
    >;

    // ----------------------------------------------------------
    player_inventory: Knex.CompositeTableType<
      PlayerInventoryRow,
      Omit<PlayerInventoryRow, 'id'> & { id?: string; quantity?: number },
      Partial<Omit<PlayerInventoryRow, 'id'>>
    >;

    // ----------------------------------------------------------
    dice_rolls: Knex.CompositeTableType<
      DiceRollRow,
      Omit<DiceRollRow, 'id'> & { id?: string; modifiers?: RollModifiers | null },
      Partial<Omit<DiceRollRow, 'id'>>
    >;

    // ----------------------------------------------------------
    events_battle: Knex.CompositeTableType<
      EventsBattleRow,
      Omit<EventsBattleRow, 'id' | 'created_at'> & {
        id?: string;
        created_at?: Date;
        opponent_player_id?: string | null;
        status?: EncounterStatusValue;
        outcome?: BattleOutcomeValue | null;
        player_power?: number | null;
        opponent_actual_power?: number | null;
        dice_roll_id?: string | null;
        currency_reward?: number | null;
        downgraded_elemental_id?: string | null;
        resolved_at?: Date | null;
        battle_state?: BattleState | null;
        opponent_party_data?: unknown;
      },
      Partial<Omit<EventsBattleRow, 'id' | 'created_at'>>
    >;

    // ----------------------------------------------------------
    battle_participants: Knex.CompositeTableType<
      BattleParticipantRow,
      Omit<BattleParticipantRow, 'id'> & {
        id?: string;
        player_elemental_id?: string | null;
        wild_elemental_id?: string | null;
        damage_dealt?: number;
        damage_taken?: number;
        survived?: boolean;
      },
      Partial<Omit<BattleParticipantRow, 'id'>>
    >;

    // ----------------------------------------------------------
    wild_encounters: Knex.CompositeTableType<
      WildEncounterRow,
      Omit<WildEncounterRow, 'id'> & {
        id?: string;
        spawn_weight?: number;
        capture_difficulty?: number;
        min_stats_modifier?: number;
        max_stats_modifier?: number;
        is_active?: boolean;
      },
      Partial<Omit<WildEncounterRow, 'id'>>
    >;

    // ----------------------------------------------------------
    events_wild_encounter: Knex.CompositeTableType<
      EventsWildEncounterRow,
      Omit<EventsWildEncounterRow, 'id' | 'created_at'> & {
        id?: string;
        created_at?: Date;
        stats_modifier?: number;
        status?: EncounterStatusValue;
        outcome?: BattleOutcomeValue | null;
        dice_roll_id?: string | null;
        item_used_id?: string | null;
        captured_player_elemental_id?: string | null;
        resolved_at?: Date | null;
      },
      Partial<Omit<EventsWildEncounterRow, 'id' | 'created_at'>>
    >;

    // ----------------------------------------------------------
    events_merchant: Knex.CompositeTableType<
      EventsMerchantRow,
      Omit<EventsMerchantRow, 'id' | 'created_at'> & {
        id?: string;
        created_at?: Date;
        status?: EncounterStatusValue;
        total_purchases?: number;
        total_spent?: number;
        resolved_at?: Date | null;
      },
      Partial<Omit<EventsMerchantRow, 'id' | 'created_at'>>
    >;

    // ----------------------------------------------------------
    merchant_inventory: Knex.CompositeTableType<
      MerchantInventoryRow,
      Omit<MerchantInventoryRow, 'id'> & {
        id?: string;
        item_id?: string | null;
        dice_type_id?: string | null;
        quantity?: number;
        purchased?: boolean;
      },
      Partial<Omit<MerchantInventoryRow, 'id'>>
    >;

    // ----------------------------------------------------------
    player_discoveries: Knex.CompositeTableType<
      PlayerDiscoveryRow,
      Omit<PlayerDiscoveryRow, 'id'> & { id?: string },
      Partial<Omit<PlayerDiscoveryRow, 'id'>>
    >;

    // ----------------------------------------------------------
    player_progress: Knex.CompositeTableType<
      PlayerProgressRow,
      Omit<PlayerProgressRow, 'id' | 'updated_at'> & {
        id?: string;
        total_elementals_owned?: number;
        unique_elementals_collected?: number;
        total_battles?: number;
        battles_won?: number;
        battles_lost?: number;
        total_dice_rolls?: number;
        successful_captures?: number;
        highest_level_elemental?: number;
      },
      Partial<Omit<PlayerProgressRow, 'id' | 'updated_at'>>
    >;

    // ----------------------------------------------------------
    player_current_events: Knex.CompositeTableType<
      PlayerCurrentEventRow,
      Omit<PlayerCurrentEventRow, 'id' | 'created_at'> & {
        id?: string;
        created_at?: Date;
        wild_encounter_id?: string | null;
        battle_id?: string | null;
        merchant_id?: string | null;
        expires_at?: Date | null;
      },
      Partial<Omit<PlayerCurrentEventRow, 'id' | 'created_at'>>
    >;

    // ----------------------------------------------------------
    oauth_accounts: Knex.CompositeTableType<
      OAuthAccountRow,
      Omit<OAuthAccountRow, 'id' | 'created_at' | 'updated_at'> & {
        id?: string;
        created_at?: Date;
        updated_at?: Date;
      },
      Partial<Omit<OAuthAccountRow, 'id' | 'created_at' | 'updated_at'>>
    >;

    // ----------------------------------------------------------
    refresh_tokens: Knex.CompositeTableType<
      RefreshTokenRow,
      Omit<RefreshTokenRow, 'id' | 'created_at'> & {
        id?: string;
        created_at?: Date;
        revoked_at?: Date | null;
      },
      Partial<Omit<RefreshTokenRow, 'id' | 'created_at'>>
    >;
  }
}
