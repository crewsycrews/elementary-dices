<template>
  <div v-if="combinations.length > 0" class="space-y-2">
    <h3 class="text-sm font-bold text-muted-foreground uppercase tracking-wide">
      Combinations detected
    </h3>
    <div class="grid gap-2">
      <div
        v-for="(combo, i) in combinations"
        :key="i"
        @click="selectable && $emit('select-combination', combo)"
        class="flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
        :class="getComboClasses(combo, i)"
      >
        <!-- Left: type + elements -->
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm">{{ getLabel(combo) }}</span>
          <div class="flex gap-0.5">
            <span v-for="el in combo.elements" :key="el" class="text-base">{{
              getEmoji(el)
            }}</span>
          </div>
        </div>

        <!-- Right: bonuses -->
        <div class="text-sm font-mono">
          <span
            v-for="(pct, el) in combo.bonuses"
            :key="el"
            class="ml-2 text-green-400"
          >
            {{ getEmoji(el) }} +{{ Math.round(Number(pct) * 100) }}%
          </span>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="showEmpty"
    class="text-center text-sm text-muted-foreground py-2"
  >
    No combinations detected yet
  </div>
</template>

<script setup lang="ts">
import type { Combination } from "@/stores/event";

const props = defineProps<{
  combinations: Combination[];
  selectable?: boolean;
  showEmpty?: boolean;
}>();

defineEmits<{
  "select-combination": [combo: Combination];
}>();

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🏔️",
  air: "💨",
  lightning: "⚡",
};

const COMBO_LABELS: Record<string, string> = {
  doublet: "Doublet",
  triplet: "Triplet",
  quartet: "Quartet",
  quintet: "Quintet",
  all_for_one: "All-For-One",
  one_for_all: "One-For-All",
  full_house: "Full House",
};

// Higher total bonus = "better" combo
function getTotalBonus(combo: Combination): number {
  return Object.values(combo.bonuses).reduce((s, v) => s + v, 0);
}

function isBestCombo(combo: Combination): boolean {
  const best = [...props.combinations].sort(
    (a, b) => getTotalBonus(b) - getTotalBonus(a),
  )[0];
  return best === combo;
}

function getLabel(combo: Combination): string {
  return COMBO_LABELS[combo.type] ?? combo.type;
}

function getEmoji(element: string): string {
  return ELEMENT_EMOJIS[element] ?? "?";
}

function getComboClasses(combo: Combination, i: number): string {
  const base = props.selectable
    ? "cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
    : "";
  if (isBestCombo(combo) && props.combinations.length > 1) {
    return `${base} border-purple-500 bg-purple-500/10`;
  }
  return `${base} border-border bg-card/50`;
}
</script>
