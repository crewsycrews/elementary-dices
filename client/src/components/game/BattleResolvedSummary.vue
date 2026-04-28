<template>
  <div class="w-full max-w-md space-y-4 rounded-xl border border-border/70 bg-card/70 p-4 text-center shadow-sm">
    <div
      class="rounded-xl border-2 p-6"
      :class="
        isVictory
          ? 'border-green-500 bg-green-500/10'
          : 'border-red-500 bg-red-500/10'
      "
    >
      <div class="mb-4 text-7xl">
        {{ isVictory ? "&#x1F3C6;" : "&#x1F480;" }}
      </div>
      <h2 class="mb-2 text-3xl font-bold">
        {{ isVictory ? t("battle.victory") : t("battle.defeat") }}
      </h2>
      <p class="text-lg text-muted-foreground">
        {{ resolvedMessage }}
      </p>

      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="space-y-1 rounded-lg bg-blue-500/10 p-4">
          <p class="text-sm text-muted-foreground">{{ t("battle.damage_to_opponent") }}</p>
          <p class="text-3xl font-bold text-blue-400">{{ totalOpponentDamage }}</p>
          <p class="text-xs text-muted-foreground">
            {{ t("battle.opponent_units_destroyed", { count: totalOpponentUnitsDestroyed }) }}
          </p>
        </div>
        <div class="space-y-1 rounded-lg bg-red-500/10 p-4">
          <p class="text-sm text-muted-foreground">{{ t("battle.damage_to_you") }}</p>
          <p class="text-3xl font-bold text-red-400">{{ totalPlayerDamage }}</p>
          <p class="text-xs text-muted-foreground">
            {{ t("battle.your_units_destroyed", { count: totalPlayerUnitsDestroyed }) }}
          </p>
        </div>
      </div>

      <div class="mt-4 rounded-lg border border-border bg-card/40 p-4">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ t("battle.battle_length") }}</p>
        <p class="text-2xl font-bold">{{ t("battle.rounds", { count: roundsResolved }) }}</p>
      </div>

      <div
        v-if="reward"
        class="mt-4 rounded-lg bg-yellow-500/10 p-3"
      >
        <p class="mb-1 text-sm text-muted-foreground">{{ t("battle.reward_earned") }}</p>
        <p class="text-xl font-bold text-yellow-500">
          {{ t("battle.coins", { amount: reward }) }}
        </p>
      </div>

      <div
        v-if="downgradedElemental"
        class="mt-4 rounded-lg bg-orange-500/10 p-3"
      >
        <p class="text-sm text-orange-500">
          {{ t("battle.was_downgraded", { name: downgradedElemental }) }}
        </p>
      </div>
    </div>

    <button
      @click="$emit('proceed')"
      class="w-full rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground transition-all hover:bg-primary/90"
    >
      {{ t("battle.proceed_next") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@/i18n";

defineProps<{
  isVictory: boolean;
  resolvedMessage: string;
  totalOpponentDamage: number;
  totalOpponentUnitsDestroyed: number;
  totalPlayerDamage: number;
  totalPlayerUnitsDestroyed: number;
  roundsResolved: number;
  reward?: number | null;
  downgradedElemental?: string | null;
}>();

defineEmits<{
  proceed: [];
}>();

const { t } = useI18n();
</script>
