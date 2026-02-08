<template>
  <div class="central-dice-container flex flex-col items-center gap-2">
    <!-- 3D Dice Display -->
    <div class="dice-display-wrapper">
      <Dice3D
        v-if="diceType"
        :dice-type="diceType"
        :value="lastRoll?.roll_value"
        :is-rolling="isRolling"
      />
    </div>

    <!-- Label -->
    <p class="text-xs md:text-sm text-muted-foreground text-center">
      {{ label }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DiceRoll } from "@elementary-dices/shared";
import Dice3D from "./Dice3D.vue";
import type { DiceType } from "./dice-geometry";

interface Props {
  lastRoll?: DiceRoll | null;
  label?: string;
  isRolling?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  lastRoll: null,
  label: "Always showing your last roll",
  isRolling: false,
});

/**
 * Extract dice type from dice notation (e.g., "1d6" → "d6")
 */
const diceType = computed<DiceType | null>(() => {
  if (props.lastRoll?.dice_notation) {
    // Extract dice type from notation like "1d6", "2d20", etc.
    const match = props.lastRoll.dice_notation.match(/d(\d+)/);
    if (match) {
      const type = `d${match[1]}` as DiceType;
      // Validate it's a supported dice type
      if (["d4", "d6", "d10", "d12", "d20"].includes(type)) {
        return type;
      }
    }
  }
  return "d6"; // Default to d6
});
</script>

<style scoped>
.dice-display-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
</style>
