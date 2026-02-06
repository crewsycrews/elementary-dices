import { db } from '../../db';
import type { DiceRoll, DiceRollContext, DiceRollOutcome, RollModifiers } from './models';

export class DiceRollRepository {
  private table = 'dice_rolls';

  async create(data: {
    player_id: string;
    dice_type_id: string;
    roll_value: number;
    outcome: DiceRollOutcome;
    context: DiceRollContext;
    battle_id?: string;
    modifiers?: RollModifiers;
  }): Promise<DiceRoll> {
    const insertData: any = {
      player_id: data.player_id,
      dice_type_id: data.dice_type_id,
      roll_value: data.roll_value,
      outcome: data.outcome,
      context: data.context,
    };

    if (data.battle_id) {
      insertData.battle_id = data.battle_id;
    }

    if (data.modifiers) {
      insertData.modifiers = JSON.stringify(data.modifiers);
    }

    const [roll] = await db(this.table)
      .insert(insertData)
      .returning('*');

    return roll;
  }

  async findById(id: string): Promise<DiceRoll | null> {
    const [roll] = await db(this.table).where({ id }).limit(1);
    return roll || null;
  }

  async findByPlayer(playerId: string, limit: number = 50): Promise<DiceRoll[]> {
    return db(this.table)
      .where({ player_id: playerId })
      .orderBy('id', 'desc')
      .limit(limit);
  }

  async findByBattle(battleId: string): Promise<DiceRoll[]> {
    return db(this.table)
      .where({ battle_id: battleId })
      .orderBy('id', 'asc');
  }

  async findByContext(playerId: string, context: DiceRollContext, limit: number = 50): Promise<DiceRoll[]> {
    return db(this.table)
      .where({ player_id: playerId, context })
      .orderBy('id', 'desc')
      .limit(limit);
  }

  async getPlayerStats(playerId: string): Promise<{
    total_rolls: number;
    by_outcome: Record<DiceRollOutcome, number>;
    by_context: Record<DiceRollContext, number>;
  }> {
    const rolls = await this.findByPlayer(playerId, 1000);

    const byOutcome: Record<string, number> = {
      crit_success: 0,
      success: 0,
      fail: 0,
      crit_fail: 0,
    };

    const byContext: Record<string, number> = {
      capture_attempt: 0,
      combat: 0,
      penalty_roll: 0,
      event_trigger: 0,
      initial_roll: 0,
    };

    rolls.forEach((roll) => {
      byOutcome[roll.outcome] = (byOutcome[roll.outcome] || 0) + 1;
      byContext[roll.context] = (byContext[roll.context] || 0) + 1;
    });

    return {
      total_rolls: rolls.length,
      by_outcome: byOutcome as Record<DiceRollOutcome, number>,
      by_context: byContext as Record<DiceRollContext, number>,
    };
  }
}
