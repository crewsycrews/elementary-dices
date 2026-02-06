import { ref } from 'vue';
import type { DiceTypeSchema, DiceRollOutcome } from '@elementary-dices/shared/schemas';

export function useDiceRoll() {
  const isRolling = ref(false);

  /**
   * Parse dice notation (e.g., "1d6", "1d20") and generate a random roll
   */
  const parseDiceNotation = (notation: string): number => {
    const match = notation.match(/(\d+)d(\d+)/i);
    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }

    const numDice = parseInt(match[1], 10);
    const numSides = parseInt(match[2], 10);

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * numSides) + 1;
    }

    return total;
  };

  /**
   * Determine the outcome based on roll value and thresholds
   */
  const determineOutcome = (
    rollValue: number,
    thresholds: typeof DiceTypeSchema.static['outcome_thresholds']
  ): typeof DiceRollOutcome.static => {
    if (
      rollValue >= thresholds.crit_success_range[0] &&
      rollValue <= thresholds.crit_success_range[1]
    ) {
      return 'crit_success';
    }
    if (
      rollValue >= thresholds.success_range[0] &&
      rollValue <= thresholds.success_range[1]
    ) {
      return 'success';
    }
    if (
      rollValue >= thresholds.fail_range[0] &&
      rollValue <= thresholds.fail_range[1]
    ) {
      return 'fail';
    }
    if (
      rollValue >= thresholds.crit_fail_range[0] &&
      rollValue <= thresholds.crit_fail_range[1]
    ) {
      return 'crit_fail';
    }

    // Default to fail if no range matches
    return 'fail';
  };

  /**
   * Calculate modifiers based on element affinity and bonuses
   */
  const calculateModifiers = (
    diceType: typeof DiceTypeSchema.static,
    elementTypes?: string[]
  ) => {
    let elementBonus = 0;

    // Check if any of the elemental's types match the dice's element affinity
    if (elementTypes && diceType.stat_bonuses.element_affinity) {
      const hasAffinity = elementTypes.some(type =>
        diceType.stat_bonuses.element_affinity?.includes(type as any)
      );

      if (hasAffinity) {
        // Apply bonus multiplier (e.g., 1.2x means +20% bonus)
        const bonusPercent = (diceType.stat_bonuses.bonus_multiplier - 1) * 100;
        elementBonus = Math.floor(bonusPercent);
      }
    }

    return {
      element_bonus: elementBonus || undefined,
      item_bonus: undefined, // Can be added later for item effects
      total_bonus: elementBonus,
    };
  };

  /**
   * Roll the dice with animation delay
   */
  const rollDice = async (
    diceType: typeof DiceTypeSchema.static,
    elementTypes?: string[]
  ): Promise<{
    value: number;
    outcome: typeof DiceRollOutcome.static;
    modifiers?: any;
  }> => {
    isRolling.value = true;

    // Simulate rolling animation delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Roll the dice
    const rawValue = parseDiceNotation(diceType.dice_notation);

    // Calculate modifiers
    const modifiers = calculateModifiers(diceType, elementTypes);

    // Apply modifiers to final value (optional: for display purposes)
    const finalValue = rawValue + (modifiers.total_bonus || 0);

    // Determine outcome
    const outcome = determineOutcome(rawValue, diceType.outcome_thresholds);

    isRolling.value = false;

    return {
      value: finalValue,
      outcome,
      modifiers: modifiers.total_bonus ? modifiers : undefined,
    };
  };

  /**
   * Roll multiple dice (for battle scenarios)
   */
  const rollMultipleDice = async (
    diceTypes: typeof DiceTypeSchema.static[],
    elementTypes?: string[]
  ) => {
    const results = await Promise.all(
      diceTypes.map(diceType => rollDice(diceType, elementTypes))
    );

    return results;
  };

  /**
   * Calculate success probability based on thresholds
   */
  const calculateSuccessProbability = (
    diceType: typeof DiceTypeSchema.static
  ): {
    critSuccess: number;
    success: number;
    fail: number;
    critFail: number;
  } => {
    const notation = diceType.dice_notation;
    const match = notation.match(/(\d+)d(\d+)/i);

    if (!match) {
      return { critSuccess: 0, success: 0, fail: 0, critFail: 0 };
    }

    const numSides = parseInt(match[2], 10);
    const thresholds = diceType.outcome_thresholds;

    const calcRange = (range: [number, number]) => {
      const min = Math.max(range[0], 1);
      const max = Math.min(range[1], numSides);
      return ((max - min + 1) / numSides) * 100;
    };

    return {
      critSuccess: calcRange(thresholds.crit_success_range),
      success: calcRange(thresholds.success_range),
      fail: calcRange(thresholds.fail_range),
      critFail: calcRange(thresholds.crit_fail_range),
    };
  };

  return {
    isRolling,
    rollDice,
    rollMultipleDice,
    calculateSuccessProbability,
    parseDiceNotation,
    determineOutcome,
  };
}
