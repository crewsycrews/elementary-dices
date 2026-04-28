<template>
  <div class="rounded-xl border border-border bg-card/55 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {{ title }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ firstAttackerLabel }}
        <span class="font-semibold text-foreground">{{ firstAttackerValue }}</span>
      </p>
    </div>
    <div class="mt-3 grid gap-2 text-sm md:grid-cols-4">
      <div class="rounded-md bg-background/45 p-2">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ yourDeploymentLabel }}</p>
        <p class="truncate font-semibold">{{ playerDeployment }}</p>
      </div>
      <div class="rounded-md bg-background/45 p-2">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ opponentDeploymentLabel }}</p>
        <p class="truncate font-semibold">{{ opponentDeployment }}</p>
      </div>
      <div class="rounded-md bg-background/45 p-2">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ impactLabel }}</p>
        <p><span class="text-red-300">{{ playerDamageTaken }}</span> / <span class="text-blue-300">{{ opponentDamageTaken }}</span></p>
      </div>
      <div class="rounded-md bg-background/45 p-2">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ destroyedLabel }}</p>
        <p>{{ playerUnitsDestroyed }} / {{ opponentUnitsDestroyed }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  firstAttackerLabel: string;
  firstAttackerValue: string;
  yourDeploymentLabel: string;
  opponentDeploymentLabel: string;
  impactLabel: string;
  destroyedLabel: string;
  playerDeployment: string;
  opponentDeployment: string;
  playerDamageTaken: number;
  opponentDamageTaken: number;
  playerUnitsDestroyed: number;
  opponentUnitsDestroyed: number;
}>();
</script>
