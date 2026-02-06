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

export class DiceRepository {
  private diceTypesTable = 'dice_types';
  private playerDiceTable = 'player_dice';

  // Dice Types
  async findAllDiceTypes(query?: DiceTypeQuery): Promise<DiceType[]> {
    let queryBuilder = db(this.diceTypesTable).select('*');

    if (query?.rarity) {
      queryBuilder = queryBuilder.where('rarity', query.rarity);
    }

    if (query?.dice_notation) {
      queryBuilder = queryBuilder.where('dice_notation', query.dice_notation);
    }

    return queryBuilder.orderBy('rarity', 'asc').orderBy('dice_notation', 'asc');
  }

  async findDiceTypeById(id: string): Promise<DiceType | null> {
    const [diceType] = await db(this.diceTypesTable).where({ id }).limit(1);
    return diceType || null;
  }

  async findDiceTypesByRarity(rarity: string): Promise<DiceType[]> {
    return db(this.diceTypesTable)
      .where({ rarity })
      .orderBy('dice_notation', 'asc');
  }

  async createDiceType(data: CreateDiceTypeData): Promise<DiceType> {
    const [diceType] = await db(this.diceTypesTable)
      .insert({
        ...data,
        stat_bonuses: JSON.stringify(data.stat_bonuses),
        outcome_thresholds: JSON.stringify(data.outcome_thresholds),
      })
      .returning('*');
    return diceType;
  }

  async updateDiceType(id: string, data: UpdateDiceTypeData): Promise<DiceType | null> {
    const updateData: any = { ...data };

    if (data.stat_bonuses) {
      updateData.stat_bonuses = JSON.stringify(data.stat_bonuses);
    }

    if (data.outcome_thresholds) {
      updateData.outcome_thresholds = JSON.stringify(data.outcome_thresholds);
    }

    const [diceType] = await db(this.diceTypesTable)
      .where({ id })
      .update(updateData)
      .returning('*');

    return diceType || null;
  }

  async deleteDiceType(id: string): Promise<boolean> {
    const deleted = await db(this.diceTypesTable).where({ id }).delete();
    return deleted > 0;
  }

  // Player Dice
  async findPlayerDice(playerId: string): Promise<PlayerDice[]> {
    return db(this.playerDiceTable)
      .where({ player_id: playerId })
      .leftJoin(
        this.diceTypesTable,
        `${this.playerDiceTable}.dice_type_id`,
        `${this.diceTypesTable}.id`
      )
      .select(
        `${this.playerDiceTable}.*`,
        db.raw(`
          json_build_object(
            'id', ${this.diceTypesTable}.id,
            'dice_notation', ${this.diceTypesTable}.dice_notation,
            'rarity', ${this.diceTypesTable}.rarity,
            'name', ${this.diceTypesTable}.name,
            'stat_bonuses', ${this.diceTypesTable}.stat_bonuses,
            'outcome_thresholds', ${this.diceTypesTable}.outcome_thresholds,
            'price', ${this.diceTypesTable}.price,
            'description', ${this.diceTypesTable}.description
          ) as dice_type
        `)
      )
      .orderBy('is_equipped', 'desc');
  }

  async findPlayerDiceById(id: string): Promise<PlayerDice | null> {
    const [playerDice] = await db(this.playerDiceTable)
      .where({ [`${this.playerDiceTable}.id`]: id })
      .leftJoin(
        this.diceTypesTable,
        `${this.playerDiceTable}.dice_type_id`,
        `${this.diceTypesTable}.id`
      )
      .select(
        `${this.playerDiceTable}.*`,
        db.raw(`
          json_build_object(
            'id', ${this.diceTypesTable}.id,
            'dice_notation', ${this.diceTypesTable}.dice_notation,
            'rarity', ${this.diceTypesTable}.rarity,
            'name', ${this.diceTypesTable}.name,
            'stat_bonuses', ${this.diceTypesTable}.stat_bonuses,
            'outcome_thresholds', ${this.diceTypesTable}.outcome_thresholds,
            'price', ${this.diceTypesTable}.price,
            'description', ${this.diceTypesTable}.description
          ) as dice_type
        `)
      )
      .limit(1);

    return playerDice || null;
  }

  async findEquippedDice(playerId: string): Promise<PlayerDice | null> {
    const [playerDice] = await db(this.playerDiceTable)
      .where({ player_id: playerId, is_equipped: true })
      .leftJoin(
        this.diceTypesTable,
        `${this.playerDiceTable}.dice_type_id`,
        `${this.diceTypesTable}.id`
      )
      .select(
        `${this.playerDiceTable}.*`,
        db.raw(`
          json_build_object(
            'id', ${this.diceTypesTable}.id,
            'dice_notation', ${this.diceTypesTable}.dice_notation,
            'rarity', ${this.diceTypesTable}.rarity,
            'name', ${this.diceTypesTable}.name,
            'stat_bonuses', ${this.diceTypesTable}.stat_bonuses,
            'outcome_thresholds', ${this.diceTypesTable}.outcome_thresholds,
            'price', ${this.diceTypesTable}.price,
            'description', ${this.diceTypesTable}.description
          ) as dice_type
        `)
      )
      .limit(1);

    return playerDice || null;
  }

  async addPlayerDice(playerId: string, data: AddPlayerDiceData): Promise<PlayerDice> {
    const [playerDice] = await db(this.playerDiceTable)
      .insert({
        player_id: playerId,
        dice_type_id: data.dice_type_id,
        is_equipped: data.is_equipped || false,
      })
      .returning('*');

    return this.findPlayerDiceById(playerDice.id) as Promise<PlayerDice>;
  }

  async updatePlayerDice(id: string, data: UpdatePlayerDiceData): Promise<PlayerDice | null> {
    const [playerDice] = await db(this.playerDiceTable)
      .where({ id })
      .update(data)
      .returning('*');

    if (!playerDice) return null;

    return this.findPlayerDiceById(playerDice.id);
  }

  async unequipAllPlayerDice(playerId: string): Promise<void> {
    await db(this.playerDiceTable)
      .where({ player_id: playerId })
      .update({ is_equipped: false });
  }

  async deletePlayerDice(id: string): Promise<boolean> {
    const deleted = await db(this.playerDiceTable).where({ id }).delete();
    return deleted > 0;
  }

  async countPlayerDice(playerId: string): Promise<number> {
    const [{ count }] = await db(this.playerDiceTable)
      .where({ player_id: playerId })
      .count('* as count');
    return Number(count);
  }
}
