<template>
  <div
    class="party-card relative p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105"
    :class="getElementColor(primaryElement)"
  >
    <!-- Elemental Image -->
    <div
      class="aspect-square rounded-lg bg-background/50 mb-2 flex items-center justify-center overflow-hidden"
    >
      <img
        v-if="elemental.image_url"
        :src="elemental.image_url"
        :alt="elemental.name"
        class="w-full h-full object-cover"
      />
      <span v-else class="text-3xl">🔮</span>
    </div>

    <!-- Elemental Name -->
    <div class="text-center">
      <p class="text-xs font-bold text-foreground truncate">
        {{ elemental.name }}
      </p>
      <p class="text-xs text-muted-foreground">⚡ {{ power }}</p>
    </div>

    <!-- Level Badge -->
    <div
      class="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
    >
      {{ elemental.level }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PlayerElemental } from "@elementary-dices/shared";

interface PartyCardProps {
  elemental: PlayerElemental;
  showActions?: boolean;
}

const props = withDefaults(defineProps<PartyCardProps>(), {
  showActions: false,
});

const getElementColor = (element: string) => {
  const colors: Record<string, string> = {
    fire: "bg-red-500/20 border-red-500",
    water: "bg-blue-500/20 border-blue-500",
    earth: "bg-green-500/20 border-green-500",
    air: "bg-cyan-500/20 border-cyan-500",
    lightning: "bg-yellow-500/20 border-yellow-500",
  };
  return colors[element] || "bg-muted border-border";
};

const power = computed(() => {
  const stats = props.elemental.current_stats;
  return stats.health + stats.attack + stats.defense + stats.speed;
});

const primaryElement = computed(
  () => props.elemental.element_types[0] || ""
);
</script>

<style scoped>
.party-card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.party-card:hover {
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}
</style>
