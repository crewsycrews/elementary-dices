import { db } from '../../db';
import type {
  AddPlayerElementalData,
  UpdatePlayerElementalData,
  PlayerElementalWithDetails
} from './models';

export class PlayerElementalsRepository {
  private table = 'player_elementals';

  /**
   * Get all elementals owned by a player
   */
  async findByPlayerId(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return db(this.table)
      .where({ 'player_elementals.player_id': playerId })
      .leftJoin('elementals', 'player_elementals.elemental_id', 'elementals.id')
      .select(
        'player_elementals.id',
        'player_elementals.player_id',
        'player_elementals.elemental_id',
        'player_elementals.current_stats',
        'player_elementals.is_in_active_party',
        'player_elementals.party_position',
        'elementals.name as elemental_name',
        'elementals.level as elemental_level',
        'elementals.element_types',
        'elementals.image_url'
      )
      .orderBy('player_elementals.party_position', 'asc');
  }

  /**
   * Get a specific player elemental by ID
   */
  async findById(id: string): Promise<PlayerElementalWithDetails | null> {
    const [elemental] = await db(this.table)
      .where({ 'player_elementals.id': id })
      .leftJoin('elementals', 'player_elementals.elemental_id', 'elementals.id')
      .select(
        'player_elementals.id',
        'player_elementals.player_id',
        'player_elementals.elemental_id',
        'player_elementals.current_stats',
        'player_elementals.is_in_active_party',
        'player_elementals.party_position',
        'elementals.name as elemental_name',
        'elementals.level as elemental_level',
        'elementals.element_types',
        'elementals.image_url'
      )
      .limit(1);

    return elemental || null;
  }

  /**
   * Get active party members for a player
   */
  async getActiveParty(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return db(this.table)
      .where({
        'player_elementals.player_id': playerId,
        'player_elementals.is_in_active_party': true
      })
      .leftJoin('elementals', 'player_elementals.elemental_id', 'elementals.id')
      .select(
        'player_elementals.id',
        'player_elementals.player_id',
        'player_elementals.elemental_id',
        'player_elementals.current_stats',
        'player_elementals.is_in_active_party',
        'player_elementals.party_position',
        'elementals.name as elemental_name',
        'elementals.level as elemental_level',
        'elementals.element_types',
        'elementals.image_url'
      )
      .orderBy('player_elementals.party_position', 'asc');
  }

  /**
   * Get backpack elementals for a player
   */
  async getBackpack(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return db(this.table)
      .where({
        'player_elementals.player_id': playerId,
        'player_elementals.is_in_active_party': false
      })
      .leftJoin('elementals', 'player_elementals.elemental_id', 'elementals.id')
      .select(
        'player_elementals.id',
        'player_elementals.player_id',
        'player_elementals.elemental_id',
        'player_elementals.current_stats',
        'player_elementals.is_in_active_party',
        'player_elementals.party_position',
        'elementals.name as elemental_name',
        'elementals.level as elemental_level',
        'elementals.element_types',
        'elementals.image_url'
      );
  }

  /**
   * Add a new elemental to player's collection
   */
  async add(data: AddPlayerElementalData): Promise<PlayerElementalWithDetails> {
    // Get the elemental base stats
    const [elemental] = await db('elementals')
      .where({ id: data.elemental_id })
      .select('base_stats')
      .limit(1);

    if (!elemental) {
      throw new Error('Elemental not found');
    }

    const insertData = {
      player_id: data.player_id,
      elemental_id: data.elemental_id,
      current_stats: elemental.base_stats,
      is_in_active_party: data.is_in_active_party ?? false,
      party_position: data.party_position ?? null,
    };

    const [playerElemental] = await db(this.table)
      .insert(insertData)
      .returning('*');

    // Fetch with elemental details
    const result = await this.findById(playerElemental.id);
    if (!result) {
      throw new Error('Failed to retrieve created elemental');
    }
    return result;
  }

  /**
   * Update a player elemental
   */
  async update(id: string, data: UpdatePlayerElementalData): Promise<PlayerElementalWithDetails | null> {
    const [updated] = await db(this.table)
      .where({ id })
      .update(data)
      .returning('*');

    if (!updated) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Remove elemental from player's collection
   */
  async remove(id: string): Promise<boolean> {
    const deleted = await db(this.table).where({ id }).delete();
    return deleted > 0;
  }

  /**
   * Count total elementals for a player
   */
  async countByPlayerId(playerId: string): Promise<number> {
    const [{ count }] = await db(this.table)
      .where({ player_id: playerId })
      .count('* as count');
    return Number(count);
  }

  /**
   * Get next available party position
   */
  async getNextPartyPosition(playerId: string): Promise<number | null> {
    const activeParty = await db(this.table)
      .where({ player_id: playerId, is_in_active_party: true })
      .select('party_position')
      .orderBy('party_position', 'asc');

    // Find first available position (1-5)
    for (let i = 1; i <= 5; i++) {
      if (!activeParty.find(p => p.party_position === i)) {
        return i;
      }
    }

    return null; // Party is full
  }
}
