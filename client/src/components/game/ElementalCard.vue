<template>
  <div
    class="elemental-card relative rounded-lg border-2 overflow-auto transition-all duration-200 hover:shadow-lg flex flex-col"
    :class="[
      elementBorderColor,
      isSelectable ? 'cursor-pointer hover:scale-105' : '',
      isSelected ? 'ring-4 ring-primary' : '',
      isDraggable ? 'cursor-move' : '',
    ]"
    :draggable="isDraggable"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- Level Badge -->
    <div class="absolute top-2 right-2 z-10">
      <div class="bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
        Lvl {{ elemental.level }}
      </div>
    </div>

    <!-- Image -->
    <div
      class="aspect-square bg-gradient-to-br from-muted to-background p-4 flex items-center justify-center h-56"
    >
      <img
        v-if="elemental.image_url"
        :src="elemental.image_url"
        :alt="elemental.name"
        class="w-full h-full object-contain"
      />
      <div v-else class="text-6xl">❓</div>
    </div>

    <!-- Content -->
    <div class="p-3 space-y-2">
      <!-- Name and Elements -->
      <div>
        <h3 class="font-bold text-lg truncate">{{ elemental.name }}</h3>
        <div class="flex gap-1 mt-1">
          <span
            v-for="element in elemental.element_types"
            :key="element"
            class="text-xs px-2 py-0.5 rounded"
            :class="getElementBadgeColor(element)"
          >
            {{ element }}
          </span>
        </div>
      </div>

      <!-- Stats Display -->
      <StatsDisplay v-if="showStats" :stats="displayStats" :compact="compact" />

      <!-- Description -->
      <p
        v-if="!compact && elemental.description"
        class="text-xs text-muted-foreground line-clamp-2"
      >
        {{ elemental.description }}
      </p>

      <!-- Slot for additional content -->
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  ElementalSchema,
  StatsSchema,
} from "@elementary-dices/shared/schemas";
import StatsDisplay from "./StatsDisplay.vue";

interface Props {
  elemental: typeof ElementalSchema.static;
  stats?: typeof StatsSchema.static; // Optional custom stats (for player elementals)
  compact?: boolean;
  showStats?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  isDraggable?: boolean;
  playerElementalId?: string; // Required when isDraggable is true
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showStats: false,
  isSelectable: false,
  isSelected: false,
  isDraggable: false,
});

const emit = defineEmits<{
  click: [elemental: typeof ElementalSchema.static];
  dragStart: [playerElementalId: string];
  dragEnd: [];
}>();

// Use custom stats if provided, otherwise use base stats
const displayStats = computed(() => props.stats || props.elemental.base_stats);

// Get border color based on primary element
const elementBorderColor = computed(() => {
  const primaryElement = props.elemental.element_types[0];
  const colors: Record<string, string> = {
    fire: "border-red-500",
    water: "border-blue-500",
    earth: "border-green-600",
    air: "border-cyan-400",
    lightning: "border-yellow-400",
  };
  return colors[primaryElement] || "border-gray-400";
});

// Get badge colors for element types
const getElementBadgeColor = (element: string) => {
  const colors: Record<string, string> = {
    fire: "bg-red-500/20 text-red-700 dark:text-red-300",
    water: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    earth: "bg-green-600/20 text-green-700 dark:text-green-300",
    air: "bg-cyan-400/20 text-cyan-700 dark:text-cyan-300",
    lightning: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300",
  };
  return colors[element] || "bg-gray-400/20 text-gray-700";
};

const handleClick = () => {
  if (props.isSelectable) {
    emit("click", props.elemental);
  }
};

const handleDragStart = (event: DragEvent) => {
  if (!props.isDraggable || !props.playerElementalId) return;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("playerElementalId", props.playerElementalId);
    event.dataTransfer.setData("source", "backpack");
  }

  emit("dragStart", props.playerElementalId);
};

const handleDragEnd = () => {
  emit("dragEnd");
};
</script>

<style scoped>
.elemental-card {
  /*min-width: 180px;*/
}
</style>
