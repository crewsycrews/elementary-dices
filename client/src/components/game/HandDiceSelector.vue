<template>
  <div class="hand-dice-selector relative flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
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
        <!-- Dice Card -->
        <div
          class="relative p-3 md:p-4 rounded-xl border-2 bg-card shadow-lg transition-all"
          :class="[
            selectedDiceType === diceType.type
              ? 'border-primary bg-primary/10 shadow-xl'
              : 'border-border hover:border-primary',
            getDiceBorderColor(diceType.type),
          ]"
        >
          <!-- Lock icon if not available -->
          <div
            v-if="!isDiceAvailable(diceType.type)"
            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
          >
            <span class="text-2xl">🔒</span>
          </div>

          <!-- Dice Type -->
          <div class="text-center">
            <div class="text-xl md:text-2xl font-bold text-foreground">
              {{ diceType.notation }}
            </div>

            <!-- Last Roll Result -->
            <div
              v-if="lastRolls[diceType.type]"
              class="text-2xl md:text-3xl font-black mt-1"
              :class="getResultColor(lastRolls[diceType.type])"
            >
              {{ lastRolls[diceType.type]?.roll_value }}
            </div>
            <div v-else class="text-xs text-muted-foreground mt-1">No roll</div>

            <!-- Owned Count -->
            <div
              v-if="isDiceAvailable(diceType.type)"
              class="text-xs text-muted-foreground mt-1"
            >
              {{ getOwnedCount(diceType.type) }} owned
            </div>
          </div>

          <!-- Selection Glow -->
          <div
            v-if="selectedDiceType === diceType.type"
            class="absolute inset-0 rounded-xl border-2 border-primary animate-pulse opacity-50"
          ></div>
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
import type { DiceRoll, PlayerDice } from '@elementary-dices/shared'

interface Props {
  availableDice?: Record<string, PlayerDice[]>
  lastRolls?: Record<string, DiceRoll | null>
  selectedDiceType?: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  availableDice: () => ({} as Record<string, PlayerDice[]>),
  lastRolls: () => ({} as Record<string, DiceRoll | null>),
  selectedDiceType: null,
  disabled: false,
})

const emit = defineEmits<{
  select: [diceType: string]
}>()

// Dice types with positions (left to right: thumb, index, middle, ring, pinky)
const diceTypes = [
  {
    type: 'd4',
    notation: 'd4',
    position: { top: '10%', left: '65%' }, // Pinky
  },
  {
    type: 'd6',
    notation: 'd6',
    position: { top: '1%', left: '55%' }, // Ring
  },
  {
    type: 'd10',
    notation: 'd10',
    position: { top: '-3%', left: '45%' }, // Middle (tallest)
  },
  {
    type: 'd12',
    notation: 'd12',
    position: { top: '5%', left: '35%' }, // Index
  },
  {
    type: 'd20',
    notation: 'd20',
    position: { top: '30%', left: '15%' }, // Thumb
  },
]

const isDiceAvailable = (diceType: string): boolean => {
  return (props.availableDice[diceType]?.length || 0) > 0
}

const getOwnedCount = (diceType: string): number => {
  return props.availableDice[diceType]?.length || 0
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

const getDiceBorderColor = (diceType: string): string => {
  const colors: Record<string, string> = {
    d4: 'border-red-500/50',
    d6: 'border-green-500/50',
    d10: 'border-blue-500/50',
    d12: 'border-purple-500/50',
    d20: 'border-orange-500/50',
  }
  return colors[diceType] || 'border-border'
}

const getResultColor = (roll: DiceRoll | null): string => {
  if (!roll) return 'text-muted-foreground'

  const outcome = roll.outcome
  const colors: Record<string, string> = {
    'Critical Success': 'text-yellow-500',
    Success: 'text-green-500',
    Fail: 'text-red-500',
    'Critical Fail': 'text-purple-500',
  }
  return colors[outcome] || 'text-foreground'
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
