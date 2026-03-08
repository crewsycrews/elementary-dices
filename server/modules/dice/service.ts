import { DiceRepository } from './repository';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';
import { db } from '../../db';
import type {
  CreateDiceTypeData,
  UpdateDiceTypeData,
  DiceType,
  PlayerDice,
  AddPlayerDiceData,
  UpdatePlayerDiceData,
  DiceTypeQuery,
} from './models';

export class DiceService {
  constructor(private repository = new DiceRepository()) {}

  // Dice Types
  async findAllDiceTypes(query?: DiceTypeQuery): Promise<DiceType[]> {
    return this.repository.findAllDiceTypes(query);
  }

  async findDiceTypeById(id: string): Promise<DiceType> {
    const diceType = await this.repository.findDiceTypeById(id);
    if (!diceType) {
      throw new NotFoundError('Dice type');
    }
    return diceType;
  }

  async findDiceTypesByRarity(rarity: string): Promise<DiceType[]> {
    return this.repository.findDiceTypesByRarity(rarity);
  }

  async createDiceType(data: CreateDiceTypeData): Promise<DiceType> {
    return this.repository.createDiceType(data);
  }

  async updateDiceType(id: string, data: UpdateDiceTypeData): Promise<DiceType> {
    const diceType = await this.repository.updateDiceType(id, data);
    if (!diceType) {
      throw new NotFoundError('Dice type');
    }
    return diceType;
  }

  async deleteDiceType(id: string): Promise<void> {
    const deleted = await this.repository.deleteDiceType(id);
    if (!deleted) {
      throw new NotFoundError('Dice type');
    }
  }

  // Player Dice
  async findPlayerDice(playerId: string): Promise<PlayerDice[]> {
    return this.repository.findPlayerDice(playerId);
  }

  async findPlayerDiceById(id: string): Promise<PlayerDice> {
    const playerDice = await this.repository.findPlayerDiceById(id);
    if (!playerDice) {
      throw new NotFoundError('Player dice');
    }
    return playerDice;
  }

  async findEquippedDice(playerId: string): Promise<PlayerDice | null> {
    return this.repository.findEquippedDice(playerId);
  }

  async findAllEquippedDice(playerId: string): Promise<PlayerDice[]> {
    return this.repository.findAllEquippedDice(playerId);
  }

  async addPlayerDice(playerId: string, data: AddPlayerDiceData): Promise<PlayerDice> {
    // Verify dice type exists and get notation
    const diceType = await this.findDiceTypeById(data.dice_type_id);
    let insertedDiceId: string | null = null;

    await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id: playerId })
        .select('currency')
        .first();

      if (!user) {
        throw new NotFoundError('User');
      }

      if (user.currency < diceType.price) {
        throw new BadRequestError('Insufficient currency');
      }

      await trx('users')
        .where({ id: playerId })
        .decrement('currency', diceType.price);

      // If equipping this dice, unequip the old one of same notation
      if (data.is_equipped) {
        await trx('player_dice')
          .where({
            player_id: playerId,
            dice_notation: diceType.dice_notation,
            is_equipped: true,
          })
          .update({ is_equipped: false });
      }

      const [inserted] = await trx('player_dice').insert({
        player_id: playerId,
        dice_type_id: data.dice_type_id,
        is_equipped: data.is_equipped || false,
        dice_notation: diceType.dice_notation,
      }).returning('id');

      insertedDiceId = inserted?.id ?? null;
    });

    if (!insertedDiceId) {
      throw new NotFoundError('Player dice');
    }

    const insertedDice = await this.findPlayerDiceById(insertedDiceId);
    if (!insertedDice) {
      throw new NotFoundError('Player dice');
    }

    return insertedDice;
  }

  async equipDice(id: string, playerId: string): Promise<PlayerDice> {
    // Verify this dice belongs to the player
    const playerDice = await this.findPlayerDiceById(id);
    if (playerDice.player_id !== playerId) {
      throw new BadRequestError('This dice does not belong to the player');
    }

    // Get dice type to find notation
    const diceType = await this.findDiceTypeById(playerDice.dice_type_id);
    const notation = diceType.dice_notation;

    // Unequip only dice of the SAME notation
    await this.repository.unequipDiceByNotation(playerId, notation);

    // Equip the new dice with notation field
    const updated = await this.repository.updatePlayerDice(id, {
      is_equipped: true,
      dice_notation: notation,
    });
    if (!updated) {
      throw new NotFoundError('Player dice');
    }

    return updated;
  }

  async unequipDice(id: string, playerId: string): Promise<PlayerDice> {
    // Verify this dice belongs to the player
    const playerDice = await this.findPlayerDiceById(id);
    if (playerDice.player_id !== playerId) {
      throw new BadRequestError('This dice does not belong to the player');
    }

    const updated = await this.repository.updatePlayerDice(id, { is_equipped: false });
    if (!updated) {
      throw new NotFoundError('Player dice');
    }

    return updated;
  }

  async deletePlayerDice(id: string, playerId: string): Promise<void> {
    // Verify this dice belongs to the player
    const playerDice = await this.findPlayerDiceById(id);
    if (playerDice.player_id !== playerId) {
      throw new BadRequestError('This dice does not belong to the player');
    }

    const deleted = await this.repository.deletePlayerDice(id);
    if (!deleted) {
      throw new NotFoundError('Player dice');
    }
  }
}
