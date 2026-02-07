<template>
  <div class="hand-dice-selector relative flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
    <!-- Label -->
    <p class="text-sm md:text-base text-muted-foreground text-center font-semibold">
      Select your dice
    </p>

    <!-- Hand with Dice Container -->
    <div class="relative w-full" style="aspect-ratio: 16/9;">
      <!-- Hand SVG Illustration -->
      <svg
        viewBox="0 0 800 500"
        class="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Palm -->
        <ellipse
          cx="400"
          cy="350"
          rx="150"
          ry="120"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          stroke-width="3"
          opacity="0.3"
        />

        <!-- Thumb (left) -->
        <path
          d="M 280 320 Q 220 300 200 250 Q 190 220 200 200 Q 210 180 230 185 Q 250 190 260 220 Q 270 250 280 280 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          stroke-width="3"
          opacity="0.3"
        />

        <!-- Index finger -->
        <path
          d="M 320 280 Q 310 200 315 150 Q 318 110 325 90 Q 332 70 345 75 Q 358 80 360 100 Q 362 130 358 170 Q 354 220 345 270 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          stroke-width="3"
          opacity="0.3"
        />

        <!-- Middle finger (tallest) -->
        <path
          d="M 380 270 Q 375 190 378 130 Q 380 80 385 50 Q 390 20 405 25 Q 420 30 422 60 Q 424 100 420 150 Q 416 210 410 265 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          stroke-width="3"
          opacity="0.3"
        />

        <!-- Ring finger -->
        <path
          d="M 440 270 Q 445 200 450 140 Q 453 100 458 80 Q 463 60 478 65 Q 493 70 495 90 Q 497 120 493 160 Q 489 210 480 265 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          stroke-width="3"
          opacity="0.3"
        />

        <!-- Pinky (right) -->
        <path
          d="M 500 290 Q 515 230 530 180 Q 540 150 550 130 Q 560 110 575 115 Q 590 120 590 140 Q 590 165 580 195 Q 570 235 555 275 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          stroke-width="3"
          opacity="0.3"
        />
      </svg>

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
              {{ lastRolls[diceType.type]?.result }}
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
import { computed } from 'vue'
import type { DiceType, DiceRollResult, PlayerDice } from '@elementary-dices/shared'

interface Props {
  availableDice?: Record<DiceType, PlayerDice[]>
  lastRolls?: Record<DiceType, DiceRollResult | null>
  selectedDiceType?: DiceType | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  availableDice: () => ({} as Record<DiceType, PlayerDice[]>),
  lastRolls: () => ({} as Record<DiceType, DiceRollResult | null>),
  selectedDiceType: null,
  disabled: false,
})

const emit = defineEmits<{
  select: [diceType: DiceType]
}>()

// Dice types with positions (left to right: thumb, index, middle, ring, pinky)
const diceTypes = [
  {
    type: 'd4' as DiceType,
    notation: 'd4',
    position: { top: '45%', left: '8%' }, // Thumb
  },
  {
    type: 'd6' as DiceType,
    notation: 'd6',
    position: { top: '12%', left: '25%' }, // Index
  },
  {
    type: 'd10' as DiceType,
    notation: 'd10',
    position: { top: '3%', left: '43%' }, // Middle (tallest)
  },
  {
    type: 'd12' as DiceType,
    notation: 'd12',
    position: { top: '10%', left: '60%' }, // Ring
  },
  {
    type: 'd20' as DiceType,
    notation: 'd20',
    position: { top: '25%', left: '78%' }, // Pinky
  },
]

const isDiceAvailable = (diceType: DiceType): boolean => {
  return (props.availableDice[diceType]?.length || 0) > 0
}

const getOwnedCount = (diceType: DiceType): number => {
  return props.availableDice[diceType]?.length || 0
}

const handleDiceSelect = (diceType: DiceType) => {
  if (!props.disabled && isDiceAvailable(diceType)) {
    emit('select', diceType)
  }
}

const getDicePositionClass = (diceType: DiceType): string => {
  // Add specific classes for positioning adjustments if needed
  return ''
}

const getDiceBorderColor = (diceType: DiceType): string => {
  const colors: Record<DiceType, string> = {
    d4: 'border-red-500/50',
    d6: 'border-green-500/50',
    d10: 'border-blue-500/50',
    d12: 'border-purple-500/50',
    d20: 'border-orange-500/50',
  }
  return colors[diceType] || 'border-border'
}

const getResultColor = (roll: DiceRollResult | null): string => {
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
