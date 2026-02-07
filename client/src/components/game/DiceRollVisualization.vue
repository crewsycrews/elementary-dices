<template>
  <div class="dice-roll-visualization">
    <!-- Dice container -->
    <div
      class="dice-container"
      :class="{ 'rolling': isRolling, 'result': showResult }"
    >
      <div class="dice" :data-dice-type="diceType">
        <div class="dice-face">
          <span class="dice-value">{{ displayValue }}</span>
        </div>
      </div>
    </div>

    <!-- Dice type label -->
    <div class="dice-type-label">
      <span class="text-muted">{{ diceType.toUpperCase() }}</span>
    </div>

    <!-- Result -->
    <div v-if="showResult && result" class="result-display" :class="`result-${result.outcome}`">
      <div class="outcome-badge">
        {{ getOutcomeLabel(result.outcome) }}
      </div>
      <div v-if="result.modifiers" class="modifiers">
        <span v-for="(mod, index) in result.modifiers" :key="index" class="modifier">
          {{ mod.source }}: {{ mod.value > 0 ? '+' : '' }}{{ mod.value }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

export interface DiceRollResult {
  roll_value: number;
  outcome: 'crit_success' | 'success' | 'fail' | 'crit_fail';
  modifiers?: Array<{
    source: string;
    value: number;
  }>;
}

const props = defineProps<{
  diceType: 'd4' | 'd5' | 'd6' | 'd10' | 'd12' | 'd20';
  autoRoll?: boolean;
  result?: DiceRollResult;
}>();

const emit = defineEmits<{
  rollComplete: [result: DiceRollResult];
}>();

const isRolling = ref(false);
const displayValue = ref('?');
const showResult = ref(false);

// Get max value for dice type
const maxValue = computed(() => {
  return parseInt(props.diceType.substring(1));
});

// Start roll animation
const roll = async () => {
  if (isRolling.value) return;

  isRolling.value = true;
  showResult.value = false;
  displayValue.value = '?';

  // Animate rolling (random numbers)
  const rollDuration = 1500;
  const interval = 100;
  const iterations = rollDuration / interval;

  for (let i = 0; i < iterations; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    displayValue.value = String(Math.floor(Math.random() * maxValue.value) + 1);
  }

  // Show final result
  if (props.result) {
    displayValue.value = String(props.result.roll_value);
    showResult.value = true;
  }

  isRolling.value = false;

  // Emit completion
  if (props.result) {
    emit('rollComplete', props.result);
  }
};

// Get outcome label with emoji
const getOutcomeLabel = (outcome: string): string => {
  switch (outcome) {
    case 'crit_success':
      return '🌟 Critical Success!';
    case 'success':
      return '✅ Success';
    case 'fail':
      return '❌ Fail';
    case 'crit_fail':
      return '💀 Critical Fail!';
    default:
      return outcome;
  }
};

// Auto-roll on mount if enabled
watch(
  () => props.autoRoll,
  (newVal) => {
    if (newVal && props.result) {
      roll();
    }
  },
  { immediate: true }
);

// Expose roll function
defineExpose({
  roll,
});
</script>

<style scoped>
.dice-roll-visualization {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.dice-container {
  perspective: 1000px;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dice {
  width: 100px;
  height: 100px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s ease;
}

.dice-container.rolling .dice {
  animation: roll 0.1s linear infinite;
}

.dice-container.result .dice {
  animation: result-bounce 0.6s ease-out;
}

@keyframes roll {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  25% {
    transform: rotateX(90deg) rotateY(90deg) rotateZ(0deg);
  }
  50% {
    transform: rotateX(180deg) rotateY(180deg) rotateZ(90deg);
  }
  75% {
    transform: rotateX(270deg) rotateY(270deg) rotateZ(180deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg) rotateZ(270deg);
  }
}

@keyframes result-bounce {
  0% {
    transform: scale(0.8) rotateZ(0deg);
  }
  50% {
    transform: scale(1.2) rotateZ(360deg);
  }
  100% {
    transform: scale(1) rotateZ(360deg);
  }
}

.dice-face {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%);
  border-radius: 12px;
  border: 3px solid hsl(var(--primary) / 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2),
              inset 0 0 20px rgba(255, 255, 255, 0.1);
}

.dice-value {
  font-size: 3rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dice-type-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.outcome-badge {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
}

.result-crit_success .outcome-badge {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.result-success .outcome-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.result-fail .outcome-badge {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.result-crit_fail .outcome-badge {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.modifiers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.modifier {
  padding: 0.25rem 0.75rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Dice type specific colors */
.dice[data-dice-type="d4"] .dice-face {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.dice[data-dice-type="d6"] .dice-face {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.dice[data-dice-type="d10"] .dice-face {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.dice[data-dice-type="d12"] .dice-face {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.dice[data-dice-type="d20"] .dice-face {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}
</style>
