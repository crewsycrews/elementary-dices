<template>
  <div class="w-full min-w-[18rem] max-w-md space-y-3 rounded-xl border border-border/70 bg-card/65 p-3 shadow-sm">
    <div class="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <p>
          {{ currentRoundLabel }}
          <span class="text-foreground">{{ round }}</span>
        </p>
        <p>
          {{ resolvedRoundsLabel }}
          <span class="text-foreground">{{ roundsResolved }}</span>
        </p>
      </div>
      <p class="mt-1 text-sm font-semibold">
        {{ instruction }}
      </p>
    </div>

    <p
      v-if="roundStatusMessage"
      class="text-sm text-muted-foreground"
    >
      {{ roundStatusMessage }}
    </p>

    <div v-if="dice.length > 0" class="space-y-3">
      <div class="flex justify-end">
        <DiceCombinationsHint />
      </div>

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

    <div v-if="!isBusy" class="flex flex-wrap justify-center gap-3">
      <button
        v-if="canRoll"
        @click="$emit('roll')"
        :disabled="isBusy"
        class="px-7 py-3 bg-primary text-primary-foreground rounded-full font-extrabold tracking-wide hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl"
      >
        {{ isBusy ? rollingLabel : startRoundLabel }}
      </button>

      <button
        v-if="canRollRemaining"
        @click="$emit('roll')"
        :disabled="isBusy"
        class="rounded-lg border border-sky-500 bg-sky-500/20 px-4 py-2 font-bold text-foreground hover:bg-sky-500/30 disabled:opacity-50"
      >
        {{ rollRemainingLabel }}
      </button>
    </div>

    <div v-if="canEndTurn && !isBusy" class="flex justify-center">
      <button
        @click="$emit('endTurn')"
        :disabled="isBusy"
        class="w-full rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-card disabled:opacity-50"
      >
        {{ deployResolveLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Combination, FarkleDie } from "@/stores/event";
import CombinationDisplay from "@/components/game/CombinationDisplay.vue";
import DiceCombinationsHint from "@/components/game/DiceCombinationsHint.vue";
import FarkleDiceRow from "@/components/game/FarkleDiceRow.vue";

defineProps<{
  round: number;
  roundsResolved: number;
  instruction: string;
  roundStatusMessage: string | null;
  dice: FarkleDie[];
  combinations: Combination[];
  forceAnimateIndices: number[];
  forceAnimateNonce: number;
  isBusted: boolean;
  isBusy: boolean;
  canRoll: boolean;
  canRollRemaining: boolean;
  canEndTurn: boolean;
  currentRoundLabel: string;
  resolvedRoundsLabel: string;
  rollingLabel: string;
  startRoundLabel: string;
  rollRemainingLabel: string;
  deployResolveLabel: string;
}>();

defineEmits<{
  roll: [];
  endTurn: [];
  dieDragStart: [dieIndex: number];
  dieDragEnd: [];
  rollingStart: [];
  rollingComplete: [];
}>();
</script>
