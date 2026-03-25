<template>
  <div
    class="flex items-center justify-between px-4 py-2 bg-card/50 rounded-xl border"
  >
    <!-- Turn counter -->
    <div class="flex flex-col items-center">
      <span class="text-xs text-muted-foreground uppercase tracking-wide"
        >{{ t("common.round") }}</span
      >
      <span class="text-2xl font-bold">{{ currentTurn }}</span>
    </div>

    <!-- Divider -->
    <div class="h-8 w-px bg-border" />

    <!-- Accumulated bonuses per element -->
    <div class="flex gap-3">
      <div
        v-for="el in allElements"
        :key="el"
        class="flex flex-col items-center gap-0.5"
        :class="getBonusClasses(el)"
      >
        <span class="text-xl">{{ getEmoji(el) }}</span>
        <span
          class="text-xs font-mono font-bold"
          :class="getBonusColorClass(el)"
        >
          {{ getBonusDisplay(el) }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@/i18n";

const props = defineProps<{
  currentTurn: number;
  bonusesTotal: Record<string, number>;
}>();
const { t } = useI18n();

const allElements = ["fire", "water", "earth", "air", "lightning"];

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🏔️",
  air: "💨",
  lightning: "⚡",
};

function getEmoji(el: string): string {
  return ELEMENT_EMOJIS[el] ?? "?";
}

function getBonus(el: string): number {
  return props.bonusesTotal[el] ?? 0;
}

function getBonusDisplay(el: string): string {
  const pct = getBonus(el);
  if (pct === 0) return "—";
  return `+${Math.round(pct * 100)}%`;
}

function getBonusClasses(el: string): string {
  const pct = getBonus(el);
  return pct > 0 ? "" : "opacity-40";
}

function getBonusColorClass(el: string): string {
  const pct = getBonus(el);
  if (pct >= 0.5) return "text-purple-400";
  if (pct >= 0.3) return "text-yellow-400";
  if (pct > 0) return "text-green-400";
  return "text-muted-foreground";
}
</script>
