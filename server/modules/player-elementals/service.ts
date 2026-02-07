import { db } from '../../db';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { PlayerElementalsRepository } from './repository';
import type {
  AddPlayerElementalData,
  UpdatePlayerElementalData,
  PlayerElementalWithDetails,
  StartGameData,
  StartGameResult,
} from './models';

export class PlayerElementalsService {
  constructor(private repository = new PlayerElementalsRepository()) {}

  /**
   * Get all elementals for a player
   */
  async findByPlayerId(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return this.repository.findByPlayerId(playerId);
  }

  /**
   * Get active party for a player
   */
  async getActiveParty(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return this.repository.getActiveParty(playerId);
  }

  /**
   * Get backpack for a player
   */
  async getBackpack(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return this.repository.getBackpack(playerId);
  }

  /**
   * Get player elemental by ID
   */
  async findById(id: string): Promise<PlayerElementalWithDetails> {
    const elemental = await this.repository.findById(id);
    if (!elemental) {
      throw new NotFoundError('Player elemental');
    }
    return elemental;
  }

  /**
   * Add elemental to player's collection
   */
  async add(data: AddPlayerElementalData): Promise<PlayerElementalWithDetails> {
    // Check if player has reached max capacity (15 total: 5 active + 10 backpack)
    const count = await this.repository.countByPlayerId(data.player_id);
    if (count >= 15) {
      throw new BadRequestError('Maximum elemental capacity reached (15)');
    }

    // If adding to active party, check if there's space
    if (data.is_in_active_party) {
      const activeParty = await this.repository.getActiveParty(data.player_id);
      if (activeParty.length >= 5) {
        throw new BadRequestError('Active party is full (max 5)');
      }

      // If no position specified, get next available
      if (!data.party_position) {
        const nextPosition = await this.repository.getNextPartyPosition(data.player_id);
        if (!nextPosition) {
          throw new BadRequestError('No available party positions');
        }
        data.party_position = nextPosition;
      }
    }

    return this.repository.add(data);
  }

  /**
   * Update player elemental
   */
  async update(id: string, data: UpdatePlayerElementalData): Promise<PlayerElementalWithDetails> {
    // Validate party position changes
    if (data.is_in_active_party && data.party_position) {
      const elemental = await this.repository.findById(id);
      if (!elemental) {
        throw new NotFoundError('Player elemental');
      }

      // Check if position is already taken by another elemental
      const existing = await db('player_elementals')
        .where({
          player_id: elemental.player_id,
          party_position: data.party_position,
        })
        .whereNot({ id })
        .first();

      if (existing) {
        throw new BadRequestError(`Party position ${data.party_position} is already occupied`);
      }
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new NotFoundError('Player elemental');
    }

    return updated;
  }

  /**
   * Remove elemental from player's collection
   */
  async remove(id: string): Promise<void> {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundError('Player elemental');
    }
  }

  /**
   * Start game - Roll d4 to get first elemental
   * Randomly picks from 5 base elementals
   */
  async startGame(data: StartGameData): Promise<StartGameResult> {
    // Check if player already has elementals
    const count = await this.repository.countByPlayerId(data.player_id);
    if (count > 0) {
      throw new BadRequestError('Player already has elementals. Cannot start game again.');
    }

    // Get base elementals (level 1)
    const baseElementals = await db('elementals')
      .where({ is_base_elemental: true, level: 1 })
      .select('*')
      .orderBy('name', 'asc');

    if (baseElementals.length < 5) {
      throw new BadRequestError('Not enough base elementals in database (need at least 5)');
    }

    // Roll d4 (0-3) and pick from first 5 base elementals
    const rollValue = Math.floor(Math.random() * 4);
    const selectedElemental = baseElementals[rollValue];

    // Add elemental to player's active party at position 1
    const playerElemental = await this.repository.add({
      player_id: data.player_id,
      elemental_id: selectedElemental.id,
      is_in_active_party: true,
      party_position: 1,
    });

    // Give player starting currency (100)
    await db('users')
      .where({ id: data.player_id })
      .update({ currency: 100 });

    return {
      success: true,
      message: `Welcome to Elementary Dices! You rolled a ${rollValue + 1} and received ${selectedElemental.name}!`,
      first_elemental: playerElemental,
      dice_roll: {
        roll_value: rollValue + 1, // 1-4 for display
        selected_index: rollValue,
      },
    };
  }

  /**
   * Swap two elementals in party positions
   */
  async swapPartyPositions(
    playerId: string,
    position1: number,
    position2: number
  ): Promise<{ elemental1: PlayerElementalWithDetails | null; elemental2: PlayerElementalWithDetails | null }> {
    if (position1 < 1 || position1 > 5 || position2 < 1 || position2 > 5) {
      throw new BadRequestError('Party positions must be between 1 and 5');
    }

    // Get elementals at both positions
    const [elemental1] = await db('player_elementals')
      .where({ player_id: playerId, party_position: position1 })
      .limit(1);

    const [elemental2] = await db('player_elementals')
      .where({ player_id: playerId, party_position: position2 })
      .limit(1);

    // Swap positions
    if (elemental1) {
      await this.repository.update(elemental1.id, { party_position: position2 });
    }

    if (elemental2) {
      await this.repository.update(elemental2.id, { party_position: position1 });
    }

    return {
      elemental1: elemental1 ? await this.repository.findById(elemental1.id) : null,
      elemental2: elemental2 ? await this.repository.findById(elemental2.id) : null,
    };
  }
}
