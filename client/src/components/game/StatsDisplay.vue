<template>
  <div class="stats-display" :class="{ 'compact': compact }">
    <!-- Full Display -->
    <div v-if="!compact" class="grid grid-cols-2 gap-2">
      <div
        v-for="stat in statsArray"
        :key="stat.name"
        class="flex items-center gap-2 bg-muted/50 rounded px-2 py-1"
      >
        <span class="text-lg">{{ stat.icon }}</span>
        <div class="flex-1 text-xs">
          <div class="font-semibold text-muted-foreground">{{ stat.label }}</div>
          <div class="font-bold">{{ stat.value }}</div>
        </div>
      </div>
    </div>

    <!-- Compact Display -->
    <div v-else class="flex gap-2 text-xs">
      <div
        v-for="stat in statsArray"
        :key="stat.name"
        class="flex items-center gap-1"
        :title="`${stat.label}: ${stat.value}`"
      >
        <span>{{ stat.icon }}</span>
        <span class="font-bold">{{ stat.value }}</span>
      </div>
    </div>

    <!-- Stat Comparison (if comparing to another stat set) -->
    <div v-if="compareTo" class="mt-2 pt-2 border-t border-muted">
      <div class="text-xs text-muted-foreground mb-1">Changes:</div>
      <div class="flex gap-2 text-xs">
        <div
          v-for="stat in statsArray"
          :key="`compare-${stat.name}`"
          class="flex items-center gap-1"
        >
          <span>{{ stat.icon }}</span>
          <span
            :class="{
              'text-green-600': stat.diff > 0,
              'text-red-600': stat.diff < 0,
              'text-muted-foreground': stat.diff === 0
            }"
          >
            {{ stat.diff > 0 ? '+' : '' }}{{ stat.diff }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BaseStats } from '@elementary-dices/shared';

interface Props {
  stats: BaseStats;
  compareTo?: BaseStats; // Optional comparison stats
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

interface StatDisplay {
  name: StatName;
  label: string;
  icon: string;
  value: number;
  diff: number;
}

type StatName = 'health' | 'attack' | 'defense' | 'speed';

const statsArray = computed<StatDisplay[]>(() => {
  const statConfigs: Array<{
    name: StatName;
    label: string;
    icon: string;
  }> = [
    { name: 'health', label: 'HP', icon: '❤️' },
    { name: 'attack', label: 'ATK', icon: '⚔️' },
    { name: 'defense', label: 'DEF', icon: '🛡️' },
    { name: 'speed', label: 'SPD', icon: '⚡' },
  ];

  return statConfigs.map(config => ({
    ...config,
    value: props.stats[config.name],
    diff: props.compareTo
      ? props.stats[config.name] - props.compareTo[config.name]
      : 0,
  }));
});

// Calculate total stats for power level display
const totalStats = computed(() => {
  const values: number[] = [
    props.stats.health,
    props.stats.attack,
    props.stats.defense,
    props.stats.speed,
  ];
  return values.reduce((sum, val) => sum + val, 0);
});

// Expose for parent components if needed
defineExpose({
  totalStats,
});
</script>

<style scoped>
.stats-display.compact {
  padding: 0;
}
</style>
