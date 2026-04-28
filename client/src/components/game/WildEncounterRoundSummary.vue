<template>
  <div class="rounded-xl border border-border bg-card/55 p-3 text-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {{ title }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ firstAttackerLabel }}
        <span class="font-semibold text-foreground">{{ firstAttackerValue }}</span>
      </p>
    </div>
    <div class="mt-3 grid gap-2 sm:grid-cols-2">
      <div class="rounded-md bg-background/45 p-2">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ playerDamageLabel }}</p>
        <p class="font-semibold text-red-300">{{ playerDamage }} {{ damageUnitLabel }}</p>
      </div>
      <div class="rounded-md bg-background/45 p-2">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ opponentDamageLabel }}</p>
        <p class="font-semibold text-blue-300">{{ opponentDamage }} {{ damageUnitLabel }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  firstAttackerLabel: string;
  firstAttackerValue: string;
  playerDamageLabel: string;
  opponentDamageLabel: string;
  damageUnitLabel: string;
  playerDamage: number;
  opponentDamage: number;
}>();
</script>
