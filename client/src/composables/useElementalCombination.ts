import { ref, computed } from 'vue';
import type { PlayerElementalSchema, ElementalSchema } from '@elementary-dices/shared/schemas';
import { useEvolutionStore } from '@/stores/evolution';

export interface CombinationSlot {
  position: number; // 0, 1, 2 (for 3 circles)
  playerElemental: typeof PlayerElementalSchema.static | null;
  elemental: typeof ElementalSchema.static | null;
}

export function useElementalCombination() {
  const evolutionStore = useEvolutionStore();

  // Three slots for the ritual circles
  const slots = ref<CombinationSlot[]>([
    { position: 0, playerElemental: null, elemental: null },
    { position: 1, playerElemental: null, elemental: null },
    { position: 2, playerElemental: null, elemental: null },
  ]);

  const isProcessing = ref(false);
  const errorMessage = ref<string | null>(null);

  // Computed: Are all slots filled?
  const allSlotsFilled = computed(() => {
    return slots.value.every(slot => slot.playerElemental !== null);
  });

  // Computed: Get array of selected player elemental IDs
  const selectedElementalIds = computed(() => {
    return slots.value
      .filter(slot => slot.playerElemental !== null)
      .map(slot => slot.playerElemental!.id);
  });

  // Computed: Get array of selected elemental definitions
  const selectedElementals = computed(() => {
    return slots.value
      .filter(slot => slot.elemental !== null)
      .map(slot => slot.elemental!);
  });

  // Computed: Check if combination is valid
  const isValidCombination = computed(() => {
    if (!allSlotsFilled.value) return false;

    const validation = evolutionStore.validateCombination(selectedElementalIds.value);
    return validation.isValid;
  });

  // Computed: Get validation errors
  const validationErrors = computed(() => {
    if (!allSlotsFilled.value) return ['Please fill all 3 circles'];

    const validation = evolutionStore.validateCombination(selectedElementalIds.value);
    return validation.errors;
  });

  // Computed: Get matching recipe (if any)
  const matchingRecipe = computed(() => {
    if (!allSlotsFilled.value || !isValidCombination.value) return null;

    // Check discovered recipes
    return evolutionStore.discoveredRecipes.find(recipe => {
      // This is a simplified check - the actual backend will validate the recipe
      return selectedElementals.value.length === 3;
    });
  });

  /**
   * Add an elemental to the first available slot
   */
  const addToSlot = (
    playerElemental: typeof PlayerElementalSchema.static,
    elemental: typeof ElementalSchema.static
  ): boolean => {
    const emptySlot = slots.value.find(slot => slot.playerElemental === null);

    if (!emptySlot) {
      errorMessage.value = 'All slots are full';
      return false;
    }

    emptySlot.playerElemental = playerElemental;
    emptySlot.elemental = elemental;
    errorMessage.value = null;
    return true;
  };

  /**
   * Add an elemental to a specific slot position
   */
  const addToSpecificSlot = (
    position: number,
    playerElemental: typeof PlayerElementalSchema.static,
    elemental: typeof ElementalSchema.static
  ): boolean => {
    const slot = slots.value[position];

    if (!slot) {
      errorMessage.value = 'Invalid slot position';
      return false;
    }

    slot.playerElemental = playerElemental;
    slot.elemental = elemental;
    errorMessage.value = null;
    return true;
  };

  /**
   * Remove an elemental from a specific slot
   */
  const removeFromSlot = (position: number): void => {
    const slot = slots.value[position];

    if (slot) {
      slot.playerElemental = null;
      slot.elemental = null;
      errorMessage.value = null;
    }
  };

  /**
   * Clear all slots
   */
  const clearAllSlots = (): void => {
    slots.value.forEach(slot => {
      slot.playerElemental = null;
      slot.elemental = null;
    });
    errorMessage.value = null;
  };

  /**
   * Check if a specific elemental is already in a slot
   */
  const isElementalInSlots = (playerElementalId: string): boolean => {
    return slots.value.some(
      slot => slot.playerElemental?.id === playerElementalId
    );
  };

  /**
   * Swap elementals between two slots
   */
  const swapSlots = (position1: number, position2: number): void => {
    const slot1 = slots.value[position1];
    const slot2 = slots.value[position2];

    if (!slot1 || !slot2) return;

    const temp = {
      playerElemental: slot1.playerElemental,
      elemental: slot1.elemental,
    };

    slot1.playerElemental = slot2.playerElemental;
    slot1.elemental = slot2.elemental;

    slot2.playerElemental = temp.playerElemental;
    slot2.elemental = temp.elemental;
  };

  /**
   * Perform the combination ritual
   */
  const performCombination = async (
    playerId: string
  ): Promise<{
    success: boolean;
    resultElemental?: typeof ElementalSchema.static;
    error?: string;
  }> => {
    if (!isValidCombination.value) {
      return {
        success: false,
        error: validationErrors.value[0] || 'Invalid combination',
      };
    }

    isProcessing.value = true;
    errorMessage.value = null;

    try {
      // Call the evolution store to perform the combination
      const result = await evolutionStore.combineElementals(
        playerId,
        selectedElementalIds.value
      );

      if (result.success) {
        // Clear slots on success
        clearAllSlots();
      }

      return result;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Combination failed';
      errorMessage.value = errorMsg;

      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * Get hint for current combination
   */
  const getHintForCombination = computed(() => {
    if (!allSlotsFilled.value) return null;

    // Get element types from selected elementals
    const elementTypes = selectedElementals.value.flatMap(e => e.element_types);

    // Check if there's a recipe with a hint for these elements
    const hintRecipe = evolutionStore.recipesWithHints.find(recipe => {
      // Check if recipe matches the element types
      if (recipe.required_element_1 && !elementTypes.includes(recipe.required_element_1)) {
        return false;
      }
      if (recipe.required_element_2 && !elementTypes.includes(recipe.required_element_2)) {
        return false;
      }
      return true;
    });

    return hintRecipe?.hint_text || null;
  });

  return {
    slots,
    isProcessing,
    errorMessage,
    allSlotsFilled,
    selectedElementalIds,
    selectedElementals,
    isValidCombination,
    validationErrors,
    matchingRecipe,
    getHintForCombination,
    addToSlot,
    addToSpecificSlot,
    removeFromSlot,
    clearAllSlots,
    isElementalInSlots,
    swapSlots,
    performCombination,
  };
}
