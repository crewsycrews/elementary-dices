import { ref } from 'vue';
import type { DiceType, ElementTypeValue } from '@elementary-dices/shared';

export function useDiceRoll() {
  const isRolling = ref(false);

  /**
   * Roll an elemental dice — selects a random face and returns the element.
   */
  const rollDice = async (
    diceType: DiceType
  ): Promise<{
    faceIndex: number;
    resultElement: ElementTypeValue;
    faceCount: number;
  }> => {
    isRolling.value = true;

    // Simulate rolling animation delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const faces = diceType.faces;
    const faceIndex = Math.floor(Math.random() * faces.length);
    const resultElement = faces[faceIndex];

    isRolling.value = false;

    return {
      faceIndex,
      resultElement,
      faceCount: faces.length,
    };
  };

  /**
   * Roll multiple dice (for Farkle battle scenarios)
   */
  const rollMultipleDice = async (
    diceTypes: DiceType[]
  ): Promise<Array<{
    faceIndex: number;
    resultElement: ElementTypeValue;
    faceCount: number;
    diceType: DiceType;
  }>> => {
    isRolling.value = true;

    await new Promise(resolve => setTimeout(resolve, 600));

    const results = diceTypes.map(diceType => {
      const faces = diceType.faces;
      const faceIndex = Math.floor(Math.random() * faces.length);
      return {
        faceIndex,
        resultElement: faces[faceIndex],
        faceCount: faces.length,
        diceType,
      };
    });

    isRolling.value = false;

    return results;
  };

  /**
   * Calculate element distribution for a dice type
   */
  const getElementDistribution = (
    diceType: DiceType
  ): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const face of diceType.faces) {
      counts[face] = (counts[face] || 0) + 1;
    }
    return counts;
  };

  /**
   * Get the dominant element (most frequent) on a dice
   */
  const getDominantElement = (diceType: DiceType): ElementTypeValue => {
    const dist = getElementDistribution(diceType);
    let maxCount = 0;
    let dominant: ElementTypeValue = diceType.faces[0];
    for (const [element, count] of Object.entries(dist)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = element as ElementTypeValue;
      }
    }
    return dominant;
  };

  return {
    isRolling,
    rollDice,
    rollMultipleDice,
    getElementDistribution,
    getDominantElement,
  };
}
