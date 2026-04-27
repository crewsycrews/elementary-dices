<template>
  <div class="flex flex-col items-center gap-3">
    <div
      v-for="(row, rowIndex) in diceRows"
      :key="rowIndex"
      class="flex flex-wrap justify-center gap-3"
    >
      <div
        v-for="entry in row"
        :key="entry.index"
        @click="!entry.die.is_set_aside && !entry.die.is_assigned && $emit('toggle-select', entry.index)"
        :draggable="isDieDraggable(entry.die)"
        @dragstart="handleDieDragStart($event, entry.index, entry.die)"
        @dragend="handleDieDragEnd"
        class="relative flex flex-col items-center gap-1 select-none"
        :class="getDieClasses(entry.die)"
        :title="getDieTitle(entry.die)"
      >
        <div
          class="rounded-xl border-2 transition-all duration-200"
          :class="getDieFaceClasses(entry.index, entry.die)"
        >
          <DiceRollVisualization
            :ref="(el) => setDiceRef(el, entry.index)"
            :dice-type="toDiceType(entry.die.dice_notation)"
            :element-faces="entry.die.faces"
            :result="getDiceResult(entry.die)"
            :scale="0.5"
            :show-outcome="false"
          />
        </div>

        <span class="text-xs font-mono text-muted-foreground">
          {{ entry.die.dice_notation }}
        </span>

        <span
          v-if="getDieBadge(entry.index, entry.die)"
          class="absolute -top-2 -right-2 max-w-[4.75rem] truncate rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase leading-none shadow"
          :class="getDieBadgeClasses(entry.index, entry.die)"
        >
          {{ getDieBadge(entry.index, entry.die) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import DiceRollVisualization from "@/components/game/DiceRollVisualization.vue";
import type { FarkleDie } from "@/stores/event";
import { useI18n } from "@/i18n";

const props = defineProps<{
  dice: FarkleDie[];
  selectedIndices?: number[];
  highlightIndices?: number[];
  forceAnimateIndices?: number[];
  forceAnimateNonce?: number;
}>();

const { t } = useI18n();

type DiceNotation = "d4" | "d6" | "d10" | "d12" | "d20";
type ElementType = "fire" | "water" | "earth" | "air" | "lightning";

const diceRefs = ref<Array<InstanceType<typeof DiceRollVisualization> | null>>(
  [],
);
const previousResults = ref<string[]>([]);
const diceRows = computed(() => {
  const entries = props.dice.map((die, index) => ({ die, index }));

  // Default battle layout: 2 dice on first row, 3 on second.
  if (entries.length === 5) {
    return [entries.slice(0, 2), entries.slice(2)];
  }

  // Fallback for other dice counts.
  if (entries.length <= 3) return [entries];
  return [
    entries.slice(0, Math.ceil(entries.length / 2)),
    entries.slice(Math.ceil(entries.length / 2)),
  ];
});

function setDiceRef(el: Element | object | null, index: number) {
  diceRefs.value[index] =
    (el as InstanceType<typeof DiceRollVisualization>) || null;
}

function toDiceType(notation: string): DiceNotation {
  if (
    notation === "d4" ||
    notation === "d6" ||
    notation === "d10" ||
    notation === "d12" ||
    notation === "d20"
  ) {
    return notation;
  }
  return "d6";
}

function toElementType(element: string): ElementType {
  if (
    element === "fire" ||
    element === "water" ||
    element === "earth" ||
    element === "air" ||
    element === "lightning"
  ) {
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
  if (die.is_assigned) return "cursor-default opacity-70";
  if (die.is_set_aside) return "cursor-default opacity-85";
  return "cursor-grab hover:scale-105 active:cursor-grabbing active:scale-95";
}

function getDieFaceClasses(index: number, die: FarkleDie): string {
  if (die.is_assigned) {
    return "border-blue-500/80 bg-blue-500/10";
  }
  if (die.is_set_aside) {
    return "border-green-500/80 bg-green-500/10";
  }
  if (props.selectedIndices?.includes(index)) {
    return "border-yellow-400 bg-yellow-400/10 scale-105 shadow-[0_0_16px_rgba(250,204,21,0.22)]";
  }
  if (props.highlightIndices?.includes(index)) {
    return "border-cyan-400 bg-cyan-400/15";
  }
  return "border-border bg-card hover:border-primary/50";
}

function getDieBadge(index: number, die: FarkleDie): string {
  if (die.is_assigned) return t("dice_state.assigned");
  if (die.is_set_aside) return t("dice_state.aside");
  if (props.selectedIndices?.includes(index)) return t("dice_state.selected");
  return "";
}

function getDieBadgeClasses(index: number, die: FarkleDie): string {
  if (die.is_assigned) return "border-blue-400/60 bg-blue-500 text-white";
  if (die.is_set_aside) return "border-green-400/60 bg-green-500 text-white";
  if (props.selectedIndices?.includes(index)) {
    return "border-yellow-300/70 bg-yellow-400 text-black";
  }
  return "border-border bg-card text-foreground";
}

function getDieTitle(die: FarkleDie): string {
  if (die.is_assigned) return t("dice_state.assigned_hint");
  if (die.is_set_aside) return t("dice_state.aside_hint");
  return t("dice_state.ready_hint");
}

const emit = defineEmits<{
  "toggle-select": [index: number];
  "rolling-start": [];
  "rolling-complete": [];
  "die-drag-start": [index: number];
  "die-drag-end": [];
}>();

function isDieDraggable(die: FarkleDie): boolean {
  return !die.is_assigned && !die.is_set_aside && die.assigned_to_party_index === null;
}

function handleDieDragStart(event: DragEvent, index: number, die: FarkleDie): void {
  if (!isDieDraggable(die)) {
    event.preventDefault();
    return;
  }
  emit("die-drag-start", index);
}

function handleDieDragEnd(): void {
  emit("die-drag-end");
}

watch(
  () => ({
    diceState: props.dice.map(
      (die) =>
        `${die.player_dice_id}:${die.current_result}:${die.is_set_aside}`,
    ),
    forceAnimateNonce: props.forceAnimateNonce,
  }),
  async (current, previous) => {
    if (previous === undefined) {
      const initialForceAnimateSet = new Set<number>(
        props.forceAnimateIndices ?? [],
      );
      if (initialForceAnimateSet.size > 0) {
        await nextTick();
        const initialRolls: Promise<void>[] = [];
        props.dice.forEach((die, index) => {
          if (!die.is_set_aside && initialForceAnimateSet.has(index)) {
            const rollPromise = diceRefs.value[index]?.roll?.();
            if (rollPromise) initialRolls.push(rollPromise);
          }
        });
        if (initialRolls.length > 0) {
          emit("rolling-start");
          await Promise.all(initialRolls);
          emit("rolling-complete");
        }
      }
      previousResults.value = [...current.diceState];
      return;
    }

    await nextTick();

    const forceAnimateSet = new Set<number>();
    if (current.forceAnimateNonce !== previous.forceAnimateNonce) {
      for (const index of props.forceAnimateIndices ?? []) {
        forceAnimateSet.add(index);
      }
    }

    const rolls: Promise<void>[] = [];
    current.diceState.forEach((value, index) => {
      const didValueChange = value !== previousResults.value[index];
      const shouldForceAnimate = forceAnimateSet.has(index);
      if (
        (didValueChange || shouldForceAnimate) &&
        !props.dice[index]?.is_set_aside
      ) {
        const rollPromise = diceRefs.value[index]?.roll?.();
        if (rollPromise) rolls.push(rollPromise);
      }
    });

    if (rolls.length > 0) {
      emit("rolling-start");
      await Promise.all(rolls);
      emit("rolling-complete");
    }

    previousResults.value = [...current.diceState];
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
