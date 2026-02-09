<template>
  <div class="hand-dice-selector relative flex flex-col items-center gap-4 w-[450px] mx-auto">
    <!-- Label -->
    <p class="text-sm md:text-base text-muted-foreground text-center font-semibold">
      Select your dice
    </p>

    <!-- Hand with Dice Container -->
    <div class="relative w-full" style="aspect-ratio: 16/9;">
      <!-- Hand SVG Illustration -->
      <img
        src="https://ink-empire.s3.cloud.ru/hand.png"
        alt="Hand Illustration"
        class="w-full h-full object-contain">

      <!-- Dice positioned on fingertips -->
      <div
        v-for="diceType in diceTypes"
        :key="diceType.type"
        class="absolute cursor-pointer transition-all duration-300"
        :class="[
          getDicePositionClass(diceType.type),
          {
            'scale-110 z-10': selectedDiceType === diceType.type,
            'opacity-50 cursor-not-allowed grayscale': !isDiceAvailable(diceType.type),
            'hover:scale-105': isDiceAvailable(diceType.type),
          },
        ]"
        :style="diceType.position"
        @click="handleDiceSelect(diceType.type)"
      >
        <!-- Dice 3D Component -->
        <div class="relative flex flex-col items-center gap-2">
          <!-- Lock icon if not available -->
          <div
            v-if="!isDiceAvailable(diceType.type)"
            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-20"
          >
            <span class="text-2xl">🔒</span>
          </div>

          <!-- 3D Dice -->
          <div class="relative">
            <Dice3D
              :dice-type="diceType.type"
              :value="lastRolls[diceType.type]?.roll_value"
              :size="30"
              :show-shadow="true"
            />

            <!-- Selection Glow -->
            <div
              v-if="selectedDiceType === diceType.type"
              class="absolute inset-0 rounded-full border-4 border-primary animate-pulse opacity-50 pointer-events-none"
              style="filter: blur(8px)"
            ></div>
          </div>

          <!-- Owned Count -->
          <div
            v-if="isDiceAvailable(diceType.type)"
            class="text-xs text-muted-foreground font-semibold bg-black/50 px-2 py-1 rounded"
          >
            {{ getOwnedCount(diceType.type) }} owned
          </div>
        </div>
      </div>
    </div>

    <!-- Hint Text -->
    <p class="text-xs text-muted-foreground text-center">
      Click on a dice to select it for your next roll
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import type { PlayerDice } from '@elementary-dices/shared'
import Dice3D from './Dice3D.vue'
import type { DiceType } from './dice-geometry/types'

interface Props {
  selectedDiceType?: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedDiceType: null,
  disabled: false,
})

const emit = defineEmits<{
  select: [diceType: string]
}>()

// Get data from inventory store
const inventoryStore = useInventoryStore()

// Group equipped dice by type
const groupedDice = computed(() => {
  const grouped: Record<string, PlayerDice[]> = {
    d4: [],
    d6: [],
    d10: [],
    d12: [],
    d20: [],
  }

  inventoryStore.equippedDice.forEach((dice) => {
    const diceType = dice.dice_type?.dice_notation
    if (diceType && grouped[diceType]) {
      grouped[diceType].push(dice)
    }
  })

  return grouped
})

// Get last rolls from store
const lastRolls = computed(() => inventoryStore.lastRollsByDiceType)

// Dice configuration interface
interface DiceConfig {
  type: DiceType
  notation: string
  position: { top: string; left: string }
}

// Dice types with positions (left to right: thumb, index, middle, ring, pinky)
const diceTypes: DiceConfig[] = [
  {
    type: 'd4',
    notation: 'd4',
    position: { top: '8%', left: '53%' }, // Pinky
  },
  {
    type: 'd6',
    notation: 'd6',
    position: { top: '1%', left: '49%' }, // Ring
  },
  {
    type: 'd10',
    notation: 'd10',
    position: { top: '-10%', left: '39%' }, // Middle (tallest)
  },
  {
    type: 'd12',
    notation: 'd12',
    position: { top: '1%', left: '29%' }, // Index
  },
  {
    type: 'd20',
    notation: 'd20',
    position: { top: '30%', left: '12%' }, // Thumb
  },
]

const isDiceAvailable = (diceType: string): boolean => {
  return (groupedDice.value[diceType]?.length || 0) > 0
}

const getOwnedCount = (diceType: string): number => {
  return groupedDice.value[diceType]?.length || 0
}

const handleDiceSelect = (diceType: string) => {
  if (!props.disabled && isDiceAvailable(diceType)) {
    emit('select', diceType)
  }
}

const getDicePositionClass = (diceType: string): string => {
  // Add specific classes for positioning adjustments if needed
  return ''
}
</script>

<style scoped>
/* Responsive sizing for dice cards */
@media (max-width: 640px) {
  .hand-dice-selector {
    transform: scale(0.8);
  }
}

/* Glow effect for selected dice */
.border-primary {
  box-shadow: 0 0 20px rgba(var(--primary), 0.3);
}

/* Smooth transitions */
.cursor-pointer {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
</style>
