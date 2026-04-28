<template>
  <div class="rounded-xl border border-border bg-card/40 p-4 space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-bold text-red-400">{{ title }}</p>
      <button
        @click="$emit('toggleHistory')"
        class="text-xs px-2 py-1 rounded border border-border hover:bg-card transition-colors"
      >
        {{ isHistoryOpen ? hideHistoryLabel : showHistoryLabel }}
      </button>
    </div>

    <div class="flex justify-center gap-2 flex-wrap">
      <div
        v-for="(die, i) in dice"
        :key="i"
        class="w-10 h-10 rounded-lg border border-border bg-card flex items-center justify-center text-xl"
      >
        {{ getElementEmoji(die.current_result) }}
      </div>
    </div>

    <div class="text-center text-sm">
      <span v-if="isBusted" class="text-red-400 font-semibold">
        {{ bustedLabel }}
      </span>
      <span v-else-if="combinationLabel" class="font-semibold">
        {{ activatedLabel(combinationLabel) }}
      </span>
    </div>

    <div
      v-if="isHistoryOpen && hasHistory"
      class="space-y-3 max-h-80 overflow-y-auto rounded-lg border border-border/60 p-3"
    >
      <BattleCombatLogEntries
        :groups="historyGroups"
        :format-entry="formatEntry"
        :entry-class="entryClass"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattleLogEntry, OpponentTurnResult } from "@elementary-dices/shared";
import BattleCombatLogEntries from "@/components/game/BattleCombatLogEntries.vue";

type BattleLogRoundGroup = {
  round: number;
  entries: BattleLogEntry[];
};

defineProps<{
  title: string;
  showHistoryLabel: string;
  hideHistoryLabel: string;
  bustedLabel: string;
  historyGroups: BattleLogRoundGroup[];
  hasHistory: boolean;
  isHistoryOpen: boolean;
  dice: OpponentTurnResult["dice"];
  isBusted: boolean;
  combinationLabel: string | null;
  getElementEmoji: (element: string) => string;
  activatedLabel: (label: string) => string;
  formatEntry: (entry: BattleLogEntry) => string;
  entryClass: (entry: BattleLogEntry) => string;
}>();

defineEmits<{
  toggleHistory: [];
}>();
</script>
