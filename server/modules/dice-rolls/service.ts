import { DiceRollRepository } from './repository';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { db } from '../../db';
import type {
  PerformRollData,
  DiceRoll,
  RollResult,
  ElementTypeValue,
} from './models';
import type { DiceType } from '../dice/models';

export class DiceRollService {
  constructor(private repository = new DiceRollRepository()) {}

  /**
   * Perform a dice roll for a player.
   * Selects a random face from the die's faces array and returns the element.
   */
  async performRoll(data: PerformRollData): Promise<RollResult> {
    let diceType: DiceType;

    if (data.dice_type_id) {
      const [dice] = await db('dice_types').where({ id: data.dice_type_id }).limit(1);
      if (!dice) {
        throw new NotFoundError('Dice type');
      }
      diceType = dice;
    } else {
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

    const rollResult = this.rollElementalDice(diceType);

    const savedRoll = await this.repository.create({
      player_id: data.player_id,
      dice_type_id: diceType.id,
      roll_value: rollResult.face_index + 1, // 1-indexed for 3D animation
      result_element: rollResult.result_element,
      context: data.context,
    });

    return {
      roll: savedRoll,
      details: rollResult,
    };
  }

  /**
   * Core elemental dice rolling logic.
   * Selects a random face from the die's faces array.
   */
  private rollElementalDice(diceType: DiceType): {
    dice_notation: string;
    dice_name: string;
    face_count: number;
    face_index: number;
    result_element: ElementTypeValue;
  } {
    const faces = diceType.faces;
    const faceIndex = Math.floor(Math.random() * faces.length);
    const resultElement = faces[faceIndex];

    return {
      dice_notation: diceType.dice_notation,
      dice_name: diceType.name,
      face_count: faces.length,
      face_index: faceIndex,
      result_element: resultElement as ElementTypeValue,
    };
  }

  async findById(id: string): Promise<DiceRoll> {
    const roll = await this.repository.findById(id);
    if (!roll) {
      throw new NotFoundError('Dice roll');
    }
    return roll;
  }

  async getPlayerRolls(playerId: string, limit: number = 50): Promise<DiceRoll[]> {
    return this.repository.findByPlayer(playerId, limit);
  }

  async getPlayerStats(playerId: string) {
    return this.repository.getPlayerStats(playerId);
  }
}
