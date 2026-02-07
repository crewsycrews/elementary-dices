<template>
  <div class="central-dice-container flex flex-col items-center gap-2">
    <!-- Dice Display -->
    <div
      class="dice-display relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center"
      :class="[diceColor, { 'animate-roll': isRolling }]"
    >
      <!-- 3D Dice Cube -->
      <div class="dice-cube relative w-full h-full transition-transform duration-300">
        <div
          class="dice-face absolute w-full h-full rounded-xl border-4 flex items-center justify-center"
          :class="borderColor"
        >
          <!-- Dice Type -->
          <div class="text-center">
            <div class="text-2xl md:text-4xl font-bold text-foreground">
              {{ diceNotation }}
            </div>
            <div v-if="lastRoll" class="text-4xl md:text-6xl font-black mt-2" :class="resultColor">
              {{ lastRoll.result }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Label -->
    <p class="text-xs md:text-sm text-muted-foreground text-center">
      {{ label }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DiceRollResult, DiceType } from '@elementary-dices/shared'

interface Props {
  lastRoll?: DiceRollResult | null
  label?: string
  isRolling?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lastRoll: null,
  label: 'Always showing your last roll',
  isRolling: false,
})

const diceNotation = computed(() => {
  if (props.lastRoll) {
    return `d${props.lastRoll.diceType.replace('d', '')}`
  }
  return 'd6'
})

const diceColor = computed(() => {
  const colors: Record<string, string> = {
    d4: 'dice-d4',
    d6: 'dice-d6',
    d10: 'dice-d10',
    d12: 'dice-d12',
    d20: 'dice-d20',
  }
  return colors[diceNotation.value] || 'dice-d6'
})

const borderColor = computed(() => {
  const colors: Record<string, string> = {
    d4: 'border-red-500',
    d6: 'border-green-500',
    d10: 'border-blue-500',
    d12: 'border-purple-500',
    d20: 'border-orange-500',
  }
  return colors[diceNotation.value] || 'border-green-500'
})

const resultColor = computed(() => {
  if (!props.lastRoll) return 'text-muted-foreground'

  const outcome = props.lastRoll.outcome
  const colors: Record<string, string> = {
    'Critical Success': 'text-yellow-500',
    'Success': 'text-green-500',
    'Fail': 'text-red-500',
    'Critical Fail': 'text-purple-500',
  }
  return colors[outcome] || 'text-foreground'
})
</script>

<style scoped>
.dice-display {
  perspective: 1000px;
}

.dice-cube {
  transform-style: preserve-3d;
}

.dice-face {
  background: linear-gradient(145deg, hsl(var(--card)), hsl(var(--muted)));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.dice-d4 .dice-face {
  background: linear-gradient(145deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3));
}

.dice-d6 .dice-face {
  background: linear-gradient(145deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3));
}

.dice-d10 .dice-face {
  background: linear-gradient(145deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.3));
}

.dice-d12 .dice-face {
  background: linear-gradient(145deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.3));
}

.dice-d20 .dice-face {
  background: linear-gradient(145deg, rgba(251, 146, 60, 0.2), rgba(249, 115, 22, 0.3));
}

@keyframes roll {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  25% {
    transform: rotateX(180deg) rotateY(90deg);
  }
  50% {
    transform: rotateX(360deg) rotateY(180deg);
  }
  75% {
    transform: rotateX(180deg) rotateY(270deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
}

.animate-roll .dice-cube {
  animation: roll 1s ease-in-out;
}

.dice-display:hover .dice-cube {
  transform: scale(1.05);
}
</style>
