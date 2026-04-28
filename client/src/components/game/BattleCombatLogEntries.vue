<template>
  <div class="space-y-3">
    <details
      v-for="group in groups"
      :key="group.round"
      open
      class="group rounded-lg border border-border/60 bg-card/50"
    >
      <summary
        class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>{{ t("common.round") }} {{ group.round }}</span>
        <span class="transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div class="space-y-2 border-t border-border/60 p-2">
        <div
          v-for="entry in group.entries"
          :key="`${entry.round}-${entry.sequence}-${entry.type}`"
          class="rounded-md border p-2 text-xs leading-relaxed"
          :class="entryClass(entry)"
        >
          <span class="mr-2 font-mono text-muted-foreground">#{{ entry.sequence }}</span>
          {{ formatEntry(entry) }}
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { BattleLogEntry } from "@elementary-dices/shared";
import { useI18n } from "@/i18n";

type BattleLogRoundGroup = {
  round: number;
  entries: BattleLogEntry[];
};

defineProps<{
  groups: BattleLogRoundGroup[];
  formatEntry: (entry: BattleLogEntry) => string;
  entryClass: (entry: BattleLogEntry) => string;
}>();

const { t } = useI18n();
</script>
