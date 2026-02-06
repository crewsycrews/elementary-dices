import { DiceRollRepository } from './repository';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { db } from '../../db';
import type {
  PerformRollData,
  DiceRoll,
  RollResult,
  DiceRollOutcome,
  RollModifiers,
} from './models';
import type { DiceType } from '../dice/models';

export class DiceRollService {
  constructor(private repository = new DiceRollRepository()) {}

  /**
   * Perform a dice roll for a player
   */
  async performRoll(data: PerformRollData): Promise<RollResult> {
    // Get the dice type to use
    let diceType: DiceType;

    if (data.dice_type_id) {
      // Use specified dice type
      const [dice] = await db('dice_types').where({ id: data.dice_type_id }).limit(1);
      if (!dice) {
        throw new NotFoundError('Dice type');
      }
      diceType = dice;
    } else {
      // Use equipped dice
      const [equippedDice] = await db('player_dice')
        .where({ player_id: data.player_id, is_equipped: true })
        .leftJoin('dice_types', 'player_dice.dice_type_id', 'dice_types.id')
        .select('dice_types.*')
        .limit(1);

      if (!equippedDice) {
        throw new BadRequestError('No dice equipped. Please equip a dice or specify a dice type.');
      }
      diceType = equippedDice;
    }

    // Roll the dice
    const rollResult = this.rollDice(diceType, data.element_affinity, data.item_bonus);

    // Save the roll to database
    const modifiers: RollModifiers = {
      element_bonus: rollResult.modifiers.element_bonus,
      item_bonus: rollResult.modifiers.item_bonus,
      total_bonus: rollResult.modifiers.total_bonus,
    };

    const savedRoll = await this.repository.create({
      player_id: data.player_id,
      dice_type_id: diceType.id,
      roll_value: rollResult.final_value,
      outcome: rollResult.outcome,
      context: data.context,
      battle_id: data.battle_id,
      modifiers,
    });

    return {
      roll: savedRoll,
      details: rollResult,
    };
  }

  /**
   * Core dice rolling logic
   * Rolls dice and determines outcome based on thresholds
   */
  private rollDice(
    diceType: DiceType,
    elementAffinity?: string,
    itemBonus: number = 0
  ): {
    dice_notation: string;
    dice_name: string;
    max_value: number;
    raw_roll: number;
    modifiers: {
      element_bonus: number;
      item_bonus: number;
      total_bonus: number;
    };
    final_value: number;
    outcome: DiceRollOutcome;
    threshold_used: {
      crit_success_range: [number, number];
      success_range: [number, number];
      fail_range: [number, number];
      crit_fail_range: [number, number];
    };
  } {
    // Determine max dice value from notation (d4 = 4, d6 = 6, etc.)
    const maxValue = parseInt(diceType.dice_notation.substring(1));

    // Roll the dice (1 to max_value)
    const rawRoll = Math.floor(Math.random() * maxValue) + 1;

    // Calculate modifiers
    let elementBonus = 0;
    if (elementAffinity && diceType.stat_bonuses?.element_affinity === elementAffinity) {
      // Apply element affinity bonus
      elementBonus = Math.floor(maxValue * (diceType.stat_bonuses.bonus_multiplier - 1));
    }

    const totalBonus = elementBonus + itemBonus;
    const finalValue = rawRoll + totalBonus;

    // Determine outcome based on thresholds
    const outcome = this.determineOutcome(finalValue, diceType.outcome_thresholds);

    return {
      dice_notation: diceType.dice_notation,
      dice_name: diceType.name,
      max_value: maxValue,
      raw_roll: rawRoll,
      modifiers: {
        element_bonus: elementBonus,
        item_bonus: itemBonus,
        total_bonus: totalBonus,
      },
      final_value: finalValue,
      outcome,
      threshold_used: diceType.outcome_thresholds,
    };
  }

  /**
   * Determine outcome based on roll value and thresholds
   */
  private determineOutcome(
    value: number,
    thresholds: {
      crit_success_range: [number, number];
      success_range: [number, number];
      fail_range: [number, number];
      crit_fail_range: [number, number];
    }
  ): DiceRollOutcome {
    if (value >= thresholds.crit_success_range[0] && value <= thresholds.crit_success_range[1]) {
      return 'crit_success';
    }

    if (value >= thresholds.success_range[0] && value <= thresholds.success_range[1]) {
      return 'success';
    }

    if (value >= thresholds.fail_range[0] && value <= thresholds.fail_range[1]) {
      return 'fail';
    }

    return 'crit_fail';
  }

  /**
   * Get roll by ID
   */
  async findById(id: string): Promise<DiceRoll> {
    const roll = await this.repository.findById(id);
    if (!roll) {
      throw new NotFoundError('Dice roll');
    }
    return roll;
  }

  /**
   * Get player's roll history
   */
  async getPlayerRolls(playerId: string, limit: number = 50): Promise<DiceRoll[]> {
    return this.repository.findByPlayer(playerId, limit);
  }

  /**
   * Get rolls by battle
   */
  async getBattleRolls(battleId: string): Promise<DiceRoll[]> {
    return this.repository.findByBattle(battleId);
  }

  /**
   * Get player roll statistics
   */
  async getPlayerStats(playerId: string) {
    return this.repository.getPlayerStats(playerId);
  }
}
