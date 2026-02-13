<template>
  <div
    class="party-slot relative rounded-lg border-2 overflow-hidden transition-all duration-200"
    :class="[
      slotClasses,
      {
        'cursor-move': !isEmpty && isDraggable,
        'cursor-pointer': isEmpty && isInteractive,
        'ring-4 ring-primary': isSelected,
        'opacity-50': isDragOver
      }
    ]"
    :draggable="!isEmpty && isDraggable"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Position Badge -->
    <div class="absolute top-2 left-2 z-10 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
      #{{ position }}
    </div>

    <!-- Empty State -->
    <div
      v-if="isEmpty"
      class="aspect-square bg-muted/30 flex flex-col items-center justify-center p-4"
    >
      <div class="text-4xl text-muted-foreground mb-2">👤</div>
      <div class="text-xs text-muted-foreground text-center">
        {{ emptyText }}
      </div>
    </div>

    <!-- Elemental Display -->
    <div v-else-if="playerElemental && elemental" class="relative">
      <!-- Health Bar -->
      <div v-if="showHealth" class="absolute top-2 right-2 left-12 z-10">
        <div class="bg-black/70 rounded-full h-2 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300"
            :style="{ width: `${healthPercentage}%` }"
          />
        </div>
      </div>

      <!-- Elemental Image -->
      <div
        class="aspect-square flex items-center justify-center p-4"
        :class="backgroundClass"
      >
        <img
          v-if="elemental.image_url"
          :src="elemental.image_url"
          :alt="elemental.name"
          class="w-full h-full object-contain"
        />
        <div v-else class="text-6xl">❓</div>
      </div>

      <!-- Elemental Info -->
      <div class="p-3 space-y-2">
        <div>
          <h4 class="font-bold text-sm truncate">{{ elemental.name }}</h4>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-muted-foreground">Lvl {{ elemental.level }}</span>
            <div class="flex gap-1">
              <span
                v-for="element in elemental.element_types"
                :key="element"
                class="text-xs px-1.5 py-0.5 rounded"
                :class="getElementBadgeColor(element)"
              >
                {{ element }}
              </span>
            </div>
          </div>
        </div>

        <!-- Compact Stats -->
        <StatsDisplay
          v-if="showStats"
          :stats="playerElemental.current_stats"
          compact
        />

        <!-- Action Buttons -->
        <div v-if="$slots.actions" class="pt-2 border-t border-muted">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!-- Drag Indicator -->
    <div
      v-if="isDragOver"
      class="absolute inset-0 bg-primary/20 border-4 border-primary border-dashed flex items-center justify-center pointer-events-none"
    >
      <div class="text-2xl">⬇️</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PlayerElementalSchema, ElementalSchema } from '@elementary-dices/shared/schemas';
import StatsDisplay from './StatsDisplay.vue';

interface Props {
  position: number; // 1-5
  playerElemental?: typeof PlayerElementalSchema.static;
  elemental?: typeof ElementalSchema.static; // Full elemental data
  isDraggable?: boolean;
  isInteractive?: boolean;
  isSelected?: boolean;
  showHealth?: boolean;
  showStats?: boolean;
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isDraggable: true,
  isInteractive: true,
  isSelected: false,
  showHealth: true,
  showStats: true,
  emptyText: 'Empty Slot',
});

const emit = defineEmits<{
  click: [position: number];
  dragStart: [position: number, playerElemental: typeof PlayerElementalSchema.static];
  dragEnd: [];
  drop: [position: number];
  remove: [position: number];
}>();

const isDragOver = ref(false);

// Computed properties
const isEmpty = computed(() => !props.playerElemental || !props.elemental);

const healthPercentage = computed(() => {
  if (!props.playerElemental || !props.elemental) return 100;

  const current = props.playerElemental.current_stats.health;
  const max = props.elemental.base_stats.health;

  return Math.max(0, Math.min(100, (current / max) * 100));
});

// Styling
const slotClasses = computed(() => {
  if (isEmpty.value) {
    return 'border-dashed border-muted hover:border-primary';
  }

  const element = props.elemental?.element_types[0];
  const colors: Record<string, string> = {
    fire: 'border-red-500',
    water: 'border-blue-500',
    earth: 'border-green-600',
    air: 'border-cyan-400',
    lightning: 'border-yellow-400',
  };

  return colors[element || ''] || 'border-gray-400';
});

const backgroundClass = computed(() => {
  if (isEmpty.value) return 'bg-muted/30';

  const element = props.elemental?.element_types[0];
  const colors: Record<string, string> = {
    fire: 'bg-red-500/10',
    water: 'bg-blue-500/10',
    earth: 'bg-green-600/10',
    air: 'bg-cyan-400/10',
    lightning: 'bg-yellow-400/10',
  };

  return colors[element || ''] || 'bg-muted/30';
});

const getElementBadgeColor = (element: string) => {
  const colors: Record<string, string> = {
    fire: 'bg-red-500/20 text-red-700 dark:text-red-300',
    water: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    earth: 'bg-green-600/20 text-green-700 dark:text-green-300',
    air: 'bg-cyan-400/20 text-cyan-700 dark:text-cyan-300',
    lightning: 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300',
  };
  return colors[element] || 'bg-gray-400/20 text-gray-700';
};

// Event handlers
const handleClick = () => {
  if (!props.isInteractive) return;
  emit('click', props.position);
};

const handleDragStart = (event: DragEvent) => {
  if (!props.isDraggable || isEmpty.value || !props.playerElemental) return;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('position', props.position.toString());
    event.dataTransfer.setData('playerElementalId', props.playerElemental.id);
  }

  emit('dragStart', props.position, props.playerElemental);
};

const handleDragEnd = () => {
  isDragOver.value = false;
  emit('dragEnd');
};

const handleDragOver = (event: DragEvent) => {
  if (!props.isInteractive) return;
  isDragOver.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false;

  if (!props.isInteractive) return;

  // Check if something is being dragged (either from party or backpack)
  const sourcePosition = event.dataTransfer?.getData('position');
  const playerElementalId = event.dataTransfer?.getData('playerElementalId');

  if (sourcePosition || playerElementalId) {
    emit('drop', props.position);
  }
};
</script>

<style scoped>
.party-slot {
  min-width: 180px;
}
</style>
