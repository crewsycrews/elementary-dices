<template>
  <div class="dice-roller flex flex-col items-center gap-4">
    <!-- Dice Display -->
    <div class="relative">
      <div
        class="dice w-24 h-24 rounded-lg flex items-center justify-center text-4xl font-bold shadow-lg cursor-pointer"
        :class="[
          diceColorClass,
          { 'rolling': isRolling }
        ]"
        @click="roll"
      >
        {{ displayValue }}
      </div>

      <!-- Rolling Animation Overlay -->
      <div v-if="isRolling" class="absolute inset-0 flex items-center justify-center">
        <div class="animate-spin text-2xl">🎲</div>
      </div>
    </div>

    <!-- Dice Info -->
    <div class="text-center space-y-1">
      <div class="font-bold text-lg">{{ diceName }}</div>
      <div class="text-sm text-muted-foreground">{{ diceNotation }}</div>
      <div v-if="rarity" class="text-xs px-2 py-1 rounded inline-block" :class="rarityBadgeClass">
        {{ rarity }}
      </div>
    </div>

    <!-- Result Element Display -->
    <div v-if="lastResultElement" class="text-center">
      <div
        class="outcome-badge px-4 py-2 rounded-lg font-bold animate-pulse"
        :class="outcomeBadgeClass"
      >
        {{ outcomeText }}
      </div>
    </div>

    <!-- Roll Button -->
    <button
      v-if="!autoRoll"
      @click="roll"
      :disabled="isRolling || disabled"
      class="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {{ isRolling ? 'Rolling...' : 'Roll Dice' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DiceTypeSchema } from '@elementary-dices/shared/schemas';
import { useDiceRoll } from '@/composables/useDiceRoll';

interface Props {
  diceType: typeof DiceTypeSchema.static;
  autoRoll?: boolean; // Automatically roll on mount
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoRoll: false,
  disabled: false,
});

const emit = defineEmits<{
  roll: [result: { value: number; result_element: string }];
}>();

const { rollDice, isRolling } = useDiceRoll();

const displayValue = ref<string>('?');
const lastRollValue = ref<number | null>(null);
const lastResultElement = ref<string | null>(null);

const diceName = computed(() => props.diceType.name);
const diceNotation = computed(() => props.diceType.dice_notation);
const rarity = computed(() => props.diceType.rarity);

// Dice color based on rarity
const diceColorClass = computed(() => {
  const colors: Record<string, string> = {
    common: 'bg-green-500 text-white',
    rare: 'bg-blue-500 text-white',
    epic: 'bg-purple-500 text-white',
    legendary: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white',
  };
  return colors[props.diceType.rarity] || 'bg-gray-500 text-white';
});

// Rarity badge styling
const rarityBadgeClass = computed(() => {
  const colors: Record<string, string> = {
    common: 'bg-green-500/20 text-green-700',
    rare: 'bg-blue-500/20 text-blue-700',
    epic: 'bg-purple-500/20 text-purple-700',
    legendary: 'bg-yellow-500/20 text-yellow-700',
  };
  return colors[props.diceType.rarity] || 'bg-gray-500/20 text-gray-700';
});

// Element emoji map
const ELEMENT_EMOJI: Record<string, string> = {
  fire: '\uD83D\uDD25',
  water: '\uD83C\uDF0A',
  air: '\uD83D\uDCA8',
  earth: '\u26F0\uFE0F',
  lightning: '\u26A1',
};

// Result element badge styling
const outcomeBadgeClass = computed(() => {
  const colors: Record<string, string> = {
    fire: 'bg-red-600 text-white',
    water: 'bg-blue-600 text-white',
    earth: 'bg-amber-600 text-white',
    air: 'bg-cyan-600 text-white',
    lightning: 'bg-yellow-600 text-white',
  };
  return lastResultElement.value ? colors[lastResultElement.value] ?? '' : '';
});

// Result element text
const outcomeText = computed(() => {
  if (!lastResultElement.value) return '';
  const emoji = ELEMENT_EMOJI[lastResultElement.value] ?? '';
  return `${emoji} ${lastResultElement.value.charAt(0).toUpperCase() + lastResultElement.value.slice(1)}`;
});

// Roll the dice
const roll = async () => {
  if (isRolling.value || props.disabled) return;

  const rawResult = await rollDice(props.diceType);

  lastRollValue.value = rawResult.faceIndex + 1;
  lastResultElement.value = rawResult.resultElement;
  displayValue.value = (rawResult.faceIndex + 1).toString();

  emit('roll', { value: rawResult.faceIndex + 1, result_element: rawResult.resultElement });
};

// Auto-roll on mount if enabled
if (props.autoRoll) {
  roll();
}
</script>

<style scoped>
.dice {
  transition: transform 0.1s ease;
}

.dice:hover:not(.rolling) {
  transform: scale(1.05);
}

.dice.rolling {
  animation: roll 0.5s ease-in-out;
}

@keyframes roll {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(90deg) scale(1.1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  75% {
    transform: rotate(270deg) scale(1.1);
  }
}

.outcome-badge {
  animation: bounce-in 0.5s ease-out;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
