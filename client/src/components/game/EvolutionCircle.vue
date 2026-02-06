<template>
  <div
    class="evolution-circle relative"
    :class="[
      circleSize,
      {
        'cursor-pointer hover:scale-105': isEmpty && isInteractive,
        'animate-pulse': isActive && !isEmpty
      }
    ]"
    @click="handleClick"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Circle Border with Glow Effect -->
    <div
      class="absolute inset-0 rounded-full transition-all duration-300"
      :class="[
        borderClass,
        {
          'shadow-lg shadow-primary/50': isActive,
          'animate-spin-slow': isProcessing
        }
      ]"
    />

    <!-- Inner Circle -->
    <div
      class="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
      :class="backgroundClass"
    >
      <!-- Position Number -->
      <div class="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold">
        {{ position + 1 }}
      </div>

      <!-- Empty State -->
      <div
        v-if="isEmpty"
        class="flex flex-col items-center justify-center gap-2 p-4"
      >
        <div class="text-6xl text-muted-foreground opacity-50">
          {{ emptyIcon }}
        </div>
        <div class="text-xs text-muted-foreground text-center">
          Drop Here
        </div>
      </div>

      <!-- Elemental Display -->
      <div v-else-if="elemental" class="relative w-full h-full flex items-center justify-center p-6">
        <!-- Remove Button -->
        <button
          v-if="isInteractive && !isProcessing"
          @click.stop="handleRemove"
          class="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
        >
          ✕
        </button>

        <!-- Elemental Image/Icon -->
        <div class="relative w-full h-full flex items-center justify-center">
          <img
            v-if="elemental.image_url"
            :src="elemental.image_url"
            :alt="elemental.name"
            class="w-full h-full object-contain"
            :class="{ 'animate-bounce-subtle': isActive }"
          />
          <div v-else class="text-6xl" :class="{ 'animate-bounce-subtle': isActive }">
            ❓
          </div>

          <!-- Element Type Badges -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1">
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
      </div>

      <!-- Processing Overlay -->
      <div
        v-if="isProcessing"
        class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full"
      >
        <div class="text-4xl animate-spin">✨</div>
      </div>

      <!-- Drag Over Indicator -->
      <div
        v-if="isDragOver"
        class="absolute inset-0 bg-primary/30 border-4 border-primary border-dashed rounded-full flex items-center justify-center"
      >
        <div class="text-4xl">⬇️</div>
      </div>
    </div>

    <!-- Connection Lines (rendered via slot for positioning) -->
    <slot name="connections" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PlayerElementalSchema, ElementalSchema } from '@elementary-dices/shared/schemas';

interface Props {
  position: number; // 0, 1, 2
  playerElemental?: typeof PlayerElementalSchema.static | null;
  elemental?: typeof ElementalSchema.static | null;
  isInteractive?: boolean;
  isActive?: boolean; // Highlighted/glowing state
  isProcessing?: boolean;
  size?: 'small' | 'medium' | 'large';
  emptyIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isInteractive: true,
  isActive: false,
  isProcessing: false,
  size: 'medium',
  emptyIcon: '🔮',
});

const emit = defineEmits<{
  click: [position: number];
  remove: [position: number];
  drop: [position: number, playerElementalId: string];
}>();

const isDragOver = ref(false);

// Computed properties
const isEmpty = computed(() => !props.playerElemental || !props.elemental);

const circleSize = computed(() => {
  const sizes = {
    small: 'w-24 h-24',
    medium: 'w-32 h-32',
    large: 'w-40 h-40',
  };
  return sizes[props.size];
});

const borderClass = computed(() => {
  if (isEmpty.value) {
    return 'border-4 border-dashed border-muted';
  }

  if (props.isActive) {
    return 'border-4 border-primary';
  }

  const element = props.elemental?.element_types[0];
  const colors: Record<string, string> = {
    fire: 'border-4 border-red-500',
    water: 'border-4 border-blue-500',
    earth: 'border-4 border-green-600',
    air: 'border-4 border-cyan-400',
    lightning: 'border-4 border-yellow-400',
  };

  return colors[element || ''] || 'border-4 border-gray-400';
});

const backgroundClass = computed(() => {
  if (isEmpty.value) {
    return 'bg-muted/20';
  }

  if (props.isActive) {
    return 'bg-primary/20';
  }

  const element = props.elemental?.element_types[0];
  const colors: Record<string, string> = {
    fire: 'bg-gradient-to-br from-red-500/20 to-orange-500/20',
    water: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
    earth: 'bg-gradient-to-br from-green-600/20 to-green-800/20',
    air: 'bg-gradient-to-br from-cyan-400/20 to-blue-400/20',
    lightning: 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20',
  };

  return colors[element || ''] || 'bg-muted/20';
});

const getElementBadgeColor = (element: string) => {
  const colors: Record<string, string> = {
    fire: 'bg-red-500/80 text-white',
    water: 'bg-blue-500/80 text-white',
    earth: 'bg-green-600/80 text-white',
    air: 'bg-cyan-400/80 text-white',
    lightning: 'bg-yellow-400/80 text-black',
  };
  return colors[element] || 'bg-gray-400/80 text-white';
};

// Event handlers
const handleClick = () => {
  if (!props.isInteractive || !isEmpty.value || props.isProcessing) return;
  emit('click', props.position);
};

const handleRemove = () => {
  if (!props.isInteractive || props.isProcessing) return;
  emit('remove', props.position);
};

const handleDragOver = (event: DragEvent) => {
  if (!props.isInteractive || props.isProcessing) return;
  isDragOver.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false;

  if (!props.isInteractive || props.isProcessing) return;

  const playerElementalId = event.dataTransfer?.getData('playerElementalId');
  if (playerElementalId) {
    emit('drop', props.position, playerElementalId);
  }
};
</script>

<style scoped>
.evolution-circle {
  transition: transform 0.2s ease;
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}

@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.animate-bounce-subtle {
  animation: bounce-subtle 2s ease-in-out infinite;
}
</style>
