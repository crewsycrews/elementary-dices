import { db } from '../../db';
import type { DiceRoll, DiceRollContext, ElementTypeValue } from './models';

export class DiceRollRepository {
  private table = 'dice_rolls';

  async create(data: {
    player_id: string;
    dice_type_id: string;
    roll_value: number;
    result_element: ElementTypeValue;
    context: DiceRollContext;
  }): Promise<DiceRoll> {
    const [roll] = await db(this.table)
      .insert({
        player_id: data.player_id,
        dice_type_id: data.dice_type_id,
        roll_value: data.roll_value,
        result_element: data.result_element,
        context: data.context,
      })
      .returning('*');

    // Fetch with dice_notation
    return this.findById(roll.id) as Promise<DiceRoll>;
  }

  async findById(id: string): Promise<DiceRoll | null> {
    const [roll] = await db(this.table)
      .leftJoin('dice_types', `${this.table}.dice_type_id`, 'dice_types.id')
      .where({ [`${this.table}.id`]: id })
      .select(`${this.table}.*`, 'dice_types.dice_notation')
      .limit(1);
    return roll || null;
  }

  async findByPlayer(playerId: string, limit: number = 50): Promise<DiceRoll[]> {
    return db(this.table)
      .leftJoin('dice_types', `${this.table}.dice_type_id`, 'dice_types.id')
      .where({ [`${this.table}.player_id`]: playerId })
      .select(`${this.table}.*`, 'dice_types.dice_notation')
      .orderBy(`${this.table}.id`, 'desc')
      .limit(limit);
  }

  async findByContext(playerId: string, context: DiceRollContext, limit: number = 50): Promise<DiceRoll[]> {
    return db(this.table)
      .leftJoin('dice_types', `${this.table}.dice_type_id`, 'dice_types.id')
      .where({ [`${this.table}.player_id`]: playerId, [`${this.table}.context`]: context })
      .select(`${this.table}.*`, 'dice_types.dice_notation')
      .orderBy(`${this.table}.id`, 'desc')
      .limit(limit);
  }

  async getPlayerStats(playerId: string): Promise<{
    total_rolls: number;
    by_element: Record<string, number>;
    by_context: Record<DiceRollContext, number>;
  }> {
    const rolls = await this.findByPlayer(playerId, 1000);

    const byElement: Record<string, number> = {
      fire: 0,
      water: 0,
      earth: 0,
      air: 0,
      lightning: 0,
    };

    const byContext: Record<string, number> = {
      capture_attempt: 0,
      combat: 0,
      penalty_roll: 0,
      event_trigger: 0,
      initial_roll: 0,
    };

    rolls.forEach((roll) => {
      byElement[roll.result_element] = (byElement[roll.result_element] || 0) + 1;
      byContext[roll.context] = (byContext[roll.context] || 0) + 1;
    });

    return {
      total_rolls: rolls.length,
      by_element: byElement,
      by_context: byContext as Record<DiceRollContext, number>,
    };
  }
}
