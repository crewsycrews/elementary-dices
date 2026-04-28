<template>
  <div class="w-full max-w-md space-y-3 rounded-xl border border-border/70 bg-card/65 p-3 shadow-sm">
    <div class="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {{ t("common.round") }} {{ round }}
        </p>
        <DiceCombinationsHint />
      </div>
      <p class="mt-1 text-sm font-semibold">
        {{ instruction }}
      </p>
    </div>

    <div v-if="dice.length > 0" class="space-y-3">
      <FarkleDiceRow
        :dice="dice"
        :force-animate-indices="forceAnimateIndices"
        :force-animate-nonce="forceAnimateNonce"
        :interaction-disabled="isBusted || isBusy"
        @die-drag-start="$emit('dieDragStart', $event)"
        @die-drag-end="$emit('dieDragEnd')"
        @rolling-start="$emit('rollingStart')"
        @rolling-complete="$emit('rollingComplete')"
      />

      <CombinationDisplay
        v-if="!isBusy"
        :combinations="combinations"
        :selectable="false"
        :show-empty="true"
      />
    </div>

    <div v-if="canRollRemaining" class="flex justify-center">
      <button
        @click="$emit('roll')"
        :disabled="isBusy"
        class="w-full rounded-lg bg-primary px-6 py-2.5 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {{ isBusy ? t("battle.rolling") : rollButtonLabel }}
      </button>
    </div>

    <div
      v-if="dice.length > 0 && !isBusted && !isBusy"
      class="flex flex-wrap justify-center gap-2"
    >
      <button
        v-if="showDeployResolve"
        @click="$emit('endTurn')"
        :disabled="isBusy || !canEndTurn"
        class="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-card disabled:opacity-50"
      >{{ t("battle.deploy_resolve") }}</button>
    </div>

    <div
      v-if="isBusted && !isBusy"
      class="flex justify-center"
    >
      <button
        @click="$emit('endTurn')"
        :disabled="isBusy"
        class="w-full rounded-lg border border-red-500/70 bg-red-500/15 px-4 py-2 font-bold text-foreground hover:bg-red-500/20 disabled:opacity-50"
      >{{ t("battle.deploy_resolve_no_bonus") }}</button>
    </div>

    <p
      v-if="dice.length > 0 && !canEndTurn && !isBusted"
      class="text-center text-xs text-muted-foreground"
    >
      {{ t("battle.assign_all_to_commit") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Combination, FarkleDie } from "@/stores/event";
import CombinationDisplay from "@/components/game/CombinationDisplay.vue";
import DiceCombinationsHint from "@/components/game/DiceCombinationsHint.vue";
import FarkleDiceRow from "@/components/game/FarkleDiceRow.vue";
import { useI18n } from "@/i18n";

defineProps<{
  round: number;
  instruction: string;
  dice: FarkleDie[];
  combinations: Combination[];
  forceAnimateIndices: number[];
  forceAnimateNonce: number;
  isBusted: boolean;
  isBusy: boolean;
  canRollRemaining: boolean;
  canEndTurn: boolean;
  rollButtonLabel: string;
  showDeployResolve: boolean;
}>();

defineEmits<{
  roll: [];
  endTurn: [];
  dieDragStart: [dieIndex: number];
  dieDragEnd: [];
  rollingStart: [];
  rollingComplete: [];
}>();

const { t } = useI18n();
</script>
