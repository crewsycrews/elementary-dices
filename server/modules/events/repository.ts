import { db } from '../../db';
import type { EventType, EventResponse } from './models';

export interface PlayerCurrentEvent {
  id: string;
  player_id: string;
  event_type: EventType;
  event_data: any;
  created_at: string;
  expires_at?: string;
}

export interface CreateCurrentEventData {
  player_id: string;
  event_type: EventType;
  event_data: any;
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
        event_data: data.event_data,
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
