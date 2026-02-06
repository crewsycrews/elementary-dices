import { DiceRepository } from './repository';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';
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

  async addPlayerDice(playerId: string, data: AddPlayerDiceData): Promise<PlayerDice> {
    // Verify dice type exists
    await this.findDiceTypeById(data.dice_type_id);

    // If equipping this dice, unequip all others first
    if (data.is_equipped) {
      await this.repository.unequipAllPlayerDice(playerId);
    }

    return this.repository.addPlayerDice(playerId, data);
  }

  async equipDice(id: string, playerId: string): Promise<PlayerDice> {
    // Verify this dice belongs to the player
    const playerDice = await this.findPlayerDiceById(id);
    if (playerDice.player_id !== playerId) {
      throw new BadRequestError('This dice does not belong to the player');
    }

    // Unequip all other dice
    await this.repository.unequipAllPlayerDice(playerId);

    // Equip this dice
    const updated = await this.repository.updatePlayerDice(id, { is_equipped: true });
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
