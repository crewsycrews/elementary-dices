<template>
  <div class="dice-roll-visualization">
    <!-- 3D Dice -->
    <Dice3D
      ref="dice3DRef"
      :dice-type="diceType"
      :affinity="affinity"
      :element-faces="elementFaces"
      :scale="scale"
      :is-rolling="isRolling"
      @roll-completed="handleRollComplete"
      :value="result?.roll_value"
    />

    <!-- Result -->
    <div
      v-if="showResult && showOutcome && result"
      class="result-display"
      :class="`result-${result.result_element}`"
    >
      <div class="outcome-badge">
        {{ getElementLabel(result.result_element) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Dice3D from "./Dice3D.vue";

export interface DiceRollResult {
  roll_value: number;
  result_element: "fire" | "water" | "earth" | "air" | "lightning";
}

const ELEMENT_EMOJI: Record<string, string> = {
  fire: "\uD83D\uDD25",
  water: "\uD83C\uDF0A",
  air: "\uD83D\uDCA8",
  earth: "\u26F0\uFE0F",
  lightning: "\u26A1",
};

const props = defineProps<{
  diceType: "d4" | "d6" | "d10" | "d12" | "d20";
  affinity?: "fire" | "water" | "earth" | "air" | "lightning";
  elementFaces?: string[];
  autoRoll?: boolean;
  result?: DiceRollResult;
  scale?: number;
  showOutcome?: boolean;
}>();

const emit = defineEmits<{
  rollComplete: [];
}>();

const scale = props.scale ?? 1;
const showOutcome = props.showOutcome ?? true;

const dice3DRef = ref<InstanceType<typeof Dice3D> | null>(null);
const isRolling = ref(false);
const showResult = ref(false);

// Start roll animation with 3D dice
const roll = async () => {
  if (isRolling.value) return;

  isRolling.value = true;
  showResult.value = false;

  // Trigger 3D dice animation
  if (props.result && dice3DRef.value) {
    await dice3DRef.value.roll(props.result.roll_value);
  }

  // Show result after animation completes
  showResult.value = true;
  isRolling.value = false;
};

// Handle roll complete from Dice3D
const handleRollComplete = () => {
  emit("rollComplete");
};

// Get element label with emoji
const getElementLabel = (element: string): string => {
  const emoji = ELEMENT_EMOJI[element] ?? "";
  return `${emoji} ${element.charAt(0).toUpperCase() + element.slice(1)}`;
};

// onMounted(() => {
//   if (props.autoRoll) {
//     roll();
//   }
// });

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
  font-size: 0.5rem;
  white-space: nowrap;
}

.result-fire .outcome-badge {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.result-water .outcome-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.result-earth .outcome-badge {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
}

.result-air .outcome-badge {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
}

.result-lightning .outcome-badge {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}
</style>
