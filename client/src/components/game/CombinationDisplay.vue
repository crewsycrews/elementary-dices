<template>
  <div v-if="combinations.length > 0" class="rounded-lg border border-border/70 bg-card/55 p-3">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {{ t("battle.active_bonuses") }}
      </h3>
      <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
        {{ combinations.length }}
      </span>
    </div>
    <div class="grid gap-2">
      <div
        v-for="(combo, i) in combinations"
        :key="i"
        @click="selectable && $emit('select-combination', combo)"
        class="flex items-start justify-between gap-3 rounded-md border px-3 py-2 transition-all"
        :class="getComboClasses(combo)"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-bold">{{ getLabel(combo) }}</span>
            <span
              v-if="isBestCombo(combo) && combinations.length > 1"
              class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300"
            >
              {{ t("battle.best_combo") }}
            </span>
            <div class="flex gap-0.5">
              <span v-for="el in combo.elements" :key="el" class="text-base">{{
                getEmoji(el)
              }}</span>
            </div>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ getEffectDescription(combo) }}
          </p>
        </div>

        <div class="shrink-0 text-right text-xs font-mono text-emerald-400">
          <span
            v-for="(pct, el) in combo.bonuses"
            :key="el"
            class="ml-2 block first:ml-0 sm:inline"
          >
            {{ getEmoji(el) }} +{{ Math.round(Number(pct) * 100) }}%
          </span>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="showEmpty"
    class="rounded-lg border border-dashed border-border/80 bg-card/35 px-3 py-2 text-center text-sm text-muted-foreground"
  >
    {{ t("battle.no_combinations_detected") }}
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@/i18n";
import type { Combination } from "@elementary-dices/shared";

const props = defineProps<{
  combinations: Combination[];
  selectable?: boolean;
  showEmpty?: boolean;
}>();

defineEmits<{
  "select-combination": [combo: Combination];
}>();

const { t } = useI18n();

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: "\u{1F525}",
  water: "\u{1F4A7}",
  earth: "\u{1F3D4}\uFE0F",
  air: "\u{1F4A8}",
  lightning: "\u26A1",
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

const ELEMENTAL_COMBO_TYPES = new Set([
  "doublet",
  "triplet",
  "quartet",
  "quintet",
]);

function getTotalBonus(combo: Combination): number {
  return (Object.values(combo.bonuses) as number[]).reduce(
    (sum, value) => sum + value,
    0,
  );
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

function getEmoji(element: string | number): string {
  return ELEMENT_EMOJIS[String(element)] ?? "?";
}

function getEffectDescription(combo: Combination): string {
  if (ELEMENTAL_COMBO_TYPES.has(combo.type)) {
    const element = combo.elements[0];
    if (element) {
      return t(`dice_combo.${element}.${combo.type}`);
    }
  }

  if (combo.type === "all_for_one") {
    const element = combo.elements[0];
    if (element) {
      return t(`dice_combo.${element}.quintet`);
    }
  }

  if (combo.type === "one_for_all") {
    return t("dice_combo.one_for_all.effect");
  }

  if (combo.type === "full_house") {
    return t("dice_combo.full_house.effect");
  }

  return Object.entries(combo.bonuses)
    .filter(([, pct]) => Number(pct) > 0)
    .map(([element, pct]) => {
      return `${getEmoji(element)} +${Math.round(Number(pct) * 100)}%`;
    })
    .join(" | ");
}

function getComboClasses(combo: Combination): string {
  const base = props.selectable
    ? "cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
    : "";
  if (isBestCombo(combo) && props.combinations.length > 1) {
    return `${base} border-emerald-500/60 bg-emerald-500/10`;
  }
  return `${base} border-border/70 bg-background/45`;
}
</script>
