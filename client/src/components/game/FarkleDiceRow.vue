<template>
  <div class="flex justify-center gap-3">
    <div
      v-for="(die, index) in dice"
      :key="index"
      @click="!die.is_set_aside && $emit('toggle-select', index)"
      class="relative flex flex-col items-center gap-1 cursor-pointer select-none"
      :class="getDieClasses(die)"
    >
      <div
        class="rounded-xl border-2 transition-all duration-200"
        :class="getDieFaceClasses(index, die)"
      >
        <DiceRollVisualization
          :ref="(el) => setDiceRef(el, index)"
          :dice-type="toDiceType(die.dice_notation)"
          :element-faces="die.faces"
          :result="getDiceResult(die)"
          :scale="0.5"
          :show-outcome="false"
        />
      </div>

      <span class="text-xs font-mono text-muted-foreground">
        {{ die.dice_notation }}
      </span>

      <div
        v-if="die.is_set_aside"
        class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
      >
        S
      </div>

      <div
        v-else-if="props.selectedIndices?.includes(index)"
        class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
      >
        R
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import DiceRollVisualization from "@/components/game/DiceRollVisualization.vue";
import type { FarkleDie } from "@/stores/event";

const props = defineProps<{
  dice: FarkleDie[];
  selectedIndices?: number[];
  highlightIndices?: number[];
}>();

defineEmits<{
  "toggle-select": [index: number];
}>();

type DiceNotation = "d4" | "d6" | "d10" | "d12" | "d20";
type ElementType = "fire" | "water" | "earth" | "air" | "lightning";

const diceRefs = ref<Array<InstanceType<typeof DiceRollVisualization> | null>>(
  [],
);
const previousResults = ref<string[]>([]);

function setDiceRef(el: Element | object | null, index: number) {
  diceRefs.value[index] = (el as InstanceType<typeof DiceRollVisualization>) || null;
}

function toDiceType(notation: string): DiceNotation {
  if (notation === "d4" || notation === "d6" || notation === "d10" || notation === "d12" || notation === "d20") {
    return notation;
  }
  return "d6";
}

function toElementType(element: string): ElementType {
  if (element === "fire" || element === "water" || element === "earth" || element === "air" || element === "lightning") {
    return element;
  }
  return "fire";
}

function getRollValue(die: FarkleDie): number {
  const index = die.faces.findIndex((face) => face === die.current_result);
  return index >= 0 ? index + 1 : 1;
}

function getDiceResult(die: FarkleDie) {
  return {
    roll_value: getRollValue(die),
    result_element: toElementType(die.current_result),
  };
}

function getDieClasses(die: FarkleDie): string {
  if (die.is_set_aside) return "opacity-60 cursor-default";
  return "hover:scale-105 active:scale-95";
}

function getDieFaceClasses(index: number, die: FarkleDie): string {
  if (die.is_set_aside) {
    return "border-green-500 bg-green-500/10";
  }
  if (props.selectedIndices?.includes(index)) {
    return "border-yellow-400 bg-yellow-400/20 scale-105";
  }
  if (props.highlightIndices?.includes(index)) {
    return "border-purple-400 bg-purple-400/20";
  }
  return "border-border bg-card hover:border-primary/50";
}

watch(
  () => props.dice.map((die) => `${die.player_dice_id}:${die.current_result}:${die.is_set_aside}`),
  async (current, previous) => {
    const previousSafe = previous ?? [];
    if (previousSafe.length === 0) {
      previousResults.value = [...current];
      return;
    }

    await nextTick();

    const rolls: Promise<void>[] = [];
    current.forEach((value, index) => {
      if (value !== previousResults.value[index] && !props.dice[index]?.is_set_aside) {
        const rollPromise = diceRefs.value[index]?.roll?.();
        if (rollPromise) rolls.push(rollPromise);
      }
    });

    if (rolls.length > 0) {
      await Promise.all(rolls);
    }

    previousResults.value = [...current];
  },
  { immediate: true },
);
</script>

<style scoped>
:deep(.dice-roll-visualization) {
  padding: 0.25rem;
  gap: 0.25rem;
}

:deep(.dice-type-label) {
  font-size: 0.625rem;
}
</style>
