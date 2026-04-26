import { db } from '../../db';
import type { EventType } from './models';
import type {
  FarkleDie,
  FarkleTurnPhaseValue,
  ElementTypeValue,
  EncounterTypeValue,
  FarkleBattleState,
} from '@elementary-dices/shared';

// ========================================
// Player Current Events (Pointer to Active Event)
// ========================================

export interface PlayerCurrentEvent {
  id: string;
  player_id: string;
  event_type: EventType;
  wild_encounter_id?: string;
  battle_id?: string;
  merchant_id?: string;
  created_at: string;
  expires_at?: string;
}

export interface CreateCurrentEventData {
  player_id: string;
  event_type: EventType;
  wild_encounter_id?: string;
  battle_id?: string;
  merchant_id?: string;
  expires_at?: Date;
}

export class EventRepository {
  private table = 'player_current_events';

  /**
   * Get the current event for a player
   */
  async getCurrentEvent(playerId: string): Promise<PlayerCurrentEvent | null> {
    const [event] = await db(this.table)
      .where({ player_id: playerId })
      .limit(1);
    return event || null;
  }

  /**
   * Set the current event for a player
   * Replaces any existing current event
   */
  async setCurrentEvent(data: CreateCurrentEventData): Promise<PlayerCurrentEvent> {
    // Delete existing current event
    await this.clearCurrentEvent(data.player_id);

    // Insert new event
    const [event] = await db(this.table)
      .insert({
        player_id: data.player_id,
        event_type: data.event_type,
        wild_encounter_id: data.wild_encounter_id,
        battle_id: data.battle_id,
        merchant_id: data.merchant_id,
        expires_at: data.expires_at,
      })
      .returning('*');

    return event;
  }

  /**
   * Clear the current event for a player
   */
  async clearCurrentEvent(playerId: string): Promise<void> {
    await db(this.table).where({ player_id: playerId }).delete();
  }

  /**
   * Check if player has a current event
   */
  async hasCurrentEvent(playerId: string): Promise<boolean> {
    const event = await this.getCurrentEvent(playerId);
    return event !== null;
  }

  /**
   * Check if player has a specific type of event
   */
  async hasEventType(playerId: string, eventType: EventType): Promise<boolean> {
    const event = await this.getCurrentEvent(playerId);
    return event !== null && event.event_type === eventType;
  }

  /**
   * Get expired events (for cleanup)
   */
  async getExpiredEvents(): Promise<PlayerCurrentEvent[]> {
    return db(this.table)
      .where('expires_at', '<', db.fn.now())
      .whereNotNull('expires_at');
  }

  /**
   * Clean up expired events
   */
  async cleanupExpiredEvents(): Promise<number> {
    return db(this.table)
      .where('expires_at', '<', db.fn.now())
      .whereNotNull('expires_at')
      .delete();
  }
}

// ========================================
// Wild Encounter Events Repository
// ========================================

export interface WildEncounterEvent {
  id: string;
  player_id: string;
  elemental_id: string;
  stats_modifier: number;
  status: 'pending' | 'in_progress' | 'completed' | 'fled';
  outcome?: 'victory' | 'defeat' | 'draw';
  dice_roll_id?: string;
  item_used_id?: string;
  captured_player_elemental_id?: string;
  created_at: string;
  resolved_at?: string;
}

export interface WildEncounterFarkleState {
  phase: FarkleTurnPhaseValue | 'resolved';
  dice: FarkleDie[];
  has_used_reroll: boolean;
  active_combinations: Array<{
    type: string;
    elements: ElementTypeValue[];
    dice_indices: number[];
    bonuses: Partial<Record<ElementTypeValue, number>>;
  }>;
  set_aside_element_bonus: ElementTypeValue | null;
  accumulated_combination_elements?: ElementTypeValue[];
  accumulated_set_aside_elements?: ElementTypeValue[];
  is_dice_rush: boolean;
  busted: boolean;
  detected_combinations: Array<{
    type: string;
    elements: ElementTypeValue[];
    dice_indices: number[];
    bonuses: Partial<Record<ElementTypeValue, number>>;
  }>;
}

export interface CreateWildEncounterEventData {
  player_id: string;
  elemental_id: string;
  stats_modifier?: number;
}

export interface UpdateWildEncounterResolutionData {
  status: 'completed' | 'fled';
  outcome: 'victory' | 'defeat' | 'draw';
  dice_roll_id?: string;
  item_used_id?: string;
  captured_player_elemental_id?: string;
  resolved_at?: Date;
}

export class WildEncounterEventRepository {
  private table = 'events_wild_encounter';

  async create(data: CreateWildEncounterEventData): Promise<WildEncounterEvent> {
    const [event] = await db(this.table)
      .insert({
        player_id: data.player_id,
        elemental_id: data.elemental_id,
        stats_modifier: data.stats_modifier ?? 1.0,
        status: 'pending',
      })
      .returning('*');
    return event;
  }

  async findById(id: string): Promise<WildEncounterEvent | null> {
    const [event] = await db(this.table).where({ id }).limit(1);
    return event || null;
  }

  async updateResolution(
    id: string,
    data: UpdateWildEncounterResolutionData
  ): Promise<WildEncounterEvent> {
    const [event] = await db(this.table)
      .where({ id })
      .update({
        status: data.status,
        outcome: data.outcome,
        dice_roll_id: data.dice_roll_id,
        item_used_id: data.item_used_id,
        captured_player_elemental_id: data.captured_player_elemental_id,
        resolved_at: data.resolved_at ?? db.fn.now(),
      })
      .returning('*');
    return event;
  }

  async getPlayerHistory(playerId: string, limit = 10): Promise<WildEncounterEvent[]> {
    return db(this.table)
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}

// ========================================
// Battle Events Repository (PvP)
// ========================================

export interface BattleEvent {
  id: string;
  player_id: string;
  opponent_player_id?: string;
  opponent_name: string;
  opponent_power_level: number;
  status: 'pending' | 'in_progress' | 'completed' | 'fled';
  outcome?: 'victory' | 'defeat' | 'draw';
  player_power?: number;
  opponent_actual_power?: number;
  dice_roll_id?: string;
  currency_reward?: number;
  downgraded_elemental_id?: string;
  opponent_party_data?: any;
  created_at: string;
  resolved_at?: string;
}

export interface CreateBattleEventData {
  player_id: string;
  opponent_player_id?: string;
  opponent_name: string;
  opponent_power_level: number;
  opponent_party_data?: any;
}

export interface UpdateBattleResolutionData {
  status: 'completed' | 'fled';
  outcome: 'victory' | 'defeat' | 'draw';
  player_power?: number;
  opponent_actual_power?: number;
  dice_roll_id?: string;
  currency_reward?: number;
  downgraded_elemental_id?: string;
  resolved_at?: Date;
}

export class BattleEventRepository {
  private table = 'events_battle';

  async create(data: CreateBattleEventData): Promise<BattleEvent> {
    const [event] = await db(this.table)
      .insert({
        player_id: data.player_id,
        opponent_player_id: data.opponent_player_id,
        opponent_name: data.opponent_name,
        opponent_power_level: data.opponent_power_level,
        opponent_party_data: data.opponent_party_data ?? null,
        status: 'pending',
      })
      .returning('*');
    return event;
  }

  async findById(id: string): Promise<BattleEvent | null> {
    const [event] = await db(this.table).where({ id }).limit(1);
    return event || null;
  }

  async updateResolution(id: string, data: UpdateBattleResolutionData): Promise<BattleEvent> {
    const [event] = await db(this.table)
      .where({ id })
      .update({
        status: data.status,
        outcome: data.outcome,
        player_power: data.player_power,
        opponent_actual_power: data.opponent_actual_power,
        dice_roll_id: data.dice_roll_id,
        currency_reward: data.currency_reward,
        downgraded_elemental_id: data.downgraded_elemental_id,
        resolved_at: data.resolved_at ?? db.fn.now(),
      })
      .returning('*');
    return event;
  }

  async getPlayerHistory(playerId: string, limit = 10): Promise<BattleEvent[]> {
    return db(this.table)
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}

export interface FarkleSession {
  id: string;
  player_id: string;
  event_type: EncounterTypeValue;
  event_id: string;
  set_aside_element: ElementTypeValue | null;
  opponent_set_aside_element?: ElementTypeValue | null;
  status: 'active' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface FarkleStateRow {
  session_id: string;
  phase: FarkleTurnPhaseValue | 'targeting' | 'choose_element' | 'player_turn' | 'resolved';
  has_used_reroll: boolean;
  set_aside_element_bonus?: ElementTypeValue | null;
  is_dice_rush: boolean;
  busted: boolean;
  dice_state: FarkleDie[];
  active_combinations: any[];
  detected_combinations: any[];
  meta: {
    battle_state?: FarkleBattleState;
    [key: string]: any;
  };
  updated_at: string;
}

export interface CreateFarkleSessionData {
  player_id: string;
  event_type: EncounterTypeValue;
  event_id: string;
  set_aside_element?: ElementTypeValue | null;
  opponent_set_aside_element?: ElementTypeValue | null;
}

export class FarkleSessionRepository {
  private sessionTable = 'events_farkle_session';
  private stateTable = 'events_farkle_state';

  private toStateWritePayload(
    state: Partial<Omit<FarkleStateRow, 'session_id' | 'updated_at'>>,
  ) {
    const payload: Record<string, unknown> = { ...state };

    // Ensure JSONB columns are always written as valid JSON text.
    if ('dice_state' in state) {
      payload.dice_state = JSON.stringify(state.dice_state ?? []);
    }
    if ('active_combinations' in state) {
      payload.active_combinations = JSON.stringify(state.active_combinations ?? []);
    }
    if ('detected_combinations' in state) {
      payload.detected_combinations = JSON.stringify(state.detected_combinations ?? []);
    }
    if ('meta' in state) {
      payload.meta = JSON.stringify(state.meta ?? {});
    }

    return payload;
  }

  async findSessionByEvent(
    eventType: EncounterTypeValue,
    eventId: string,
  ): Promise<FarkleSession | null> {
    const [session] = await db(this.sessionTable)
      .where({ event_type: eventType, event_id: eventId })
      .limit(1);
    return session || null;
  }

  async findSessionById(sessionId: string): Promise<FarkleSession | null> {
    const [session] = await db(this.sessionTable).where({ id: sessionId }).limit(1);
    return session || null;
  }

  async createSession(data: CreateFarkleSessionData): Promise<FarkleSession> {
    const [session] = await db(this.sessionTable)
      .insert({
        player_id: data.player_id,
        event_type: data.event_type,
        event_id: data.event_id,
        set_aside_element: data.set_aside_element ?? null,
        opponent_set_aside_element: data.opponent_set_aside_element ?? null,
        status: 'active',
      })
      .returning('*');
    return session;
  }

  async createState(
    sessionId: string,
    state: Omit<FarkleStateRow, 'session_id' | 'updated_at'>,
  ): Promise<FarkleStateRow> {
    const [row] = await db(this.stateTable)
      .insert({
        session_id: sessionId,
        ...this.toStateWritePayload(state),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row;
  }

  async getState(sessionId: string): Promise<FarkleStateRow | null> {
    const [row] = await db(this.stateTable).where({ session_id: sessionId }).limit(1);
    return row || null;
  }

  async updateState(
    sessionId: string,
    state: Partial<Omit<FarkleStateRow, 'session_id' | 'updated_at'>>,
  ): Promise<FarkleStateRow> {
    const [row] = await db(this.stateTable)
      .where({ session_id: sessionId })
      .update({
        ...this.toStateWritePayload(state),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row;
  }

  async resolveSession(sessionId: string): Promise<void> {
    await db(this.sessionTable)
      .where({ id: sessionId })
      .update({
        status: 'resolved',
        updated_at: db.fn.now(),
      });
  }
}

// ========================================
// Merchant Events Repository
// ========================================

export interface MerchantEvent {
  id: string;
  player_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'fled';
  available_until: string;
  total_purchases: number;
  total_spent: number;
  created_at: string;
  resolved_at?: string;
}

export interface CreateMerchantEventData {
  player_id: string;
  available_until: Date;
}

export interface UpdateMerchantResolutionData {
  status: 'completed' | 'fled';
  total_purchases?: number;
  total_spent?: number;
  resolved_at?: Date;
}

export class MerchantEventRepository {
  private table = 'events_merchant';

  async create(data: CreateMerchantEventData): Promise<MerchantEvent> {
    const [event] = await db(this.table)
      .insert({
        player_id: data.player_id,
        available_until: data.available_until,
        status: 'pending',
        total_purchases: 0,
        total_spent: 0,
      })
      .returning('*');
    return event;
  }

  async findById(id: string): Promise<MerchantEvent | null> {
    const [event] = await db(this.table).where({ id }).limit(1);
    return event || null;
  }

  async updateResolution(id: string, data: UpdateMerchantResolutionData): Promise<MerchantEvent> {
    const [event] = await db(this.table)
      .where({ id })
      .update({
        status: data.status,
        total_purchases: data.total_purchases,
        total_spent: data.total_spent,
        resolved_at: data.resolved_at ?? db.fn.now(),
      })
      .returning('*');
    return event;
  }

  async incrementPurchase(id: string, purchaseAmount: number): Promise<void> {
    await db(this.table)
      .where({ id })
      .increment('total_purchases', 1)
      .increment('total_spent', purchaseAmount);
  }

  async getPlayerHistory(playerId: string, limit = 10): Promise<MerchantEvent[]> {
    return db(this.table)
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}
