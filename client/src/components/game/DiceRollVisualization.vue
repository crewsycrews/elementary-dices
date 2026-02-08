<template>
  <div class="dice-roll-visualization">
    <!-- 3D Dice -->
    <Dice3D
      ref="dice3DRef"
      :dice-type="diceType"
      :value="result?.roll_value"
      :is-rolling="isRolling"
      @roll-complete="handleRollComplete"
    />

    <!-- Dice type label -->
    <div class="dice-type-label">
      <span class="text-muted">{{ diceType.toUpperCase() }}</span>
    </div>

    <!-- Result -->
    <div
      v-if="showResult && result"
      class="result-display"
      :class="`result-${result.outcome}`"
    >
      <div class="outcome-badge">
        {{ getOutcomeLabel(result.outcome) }}
      </div>
      <div v-if="result.modifiers" class="modifiers">
        <span
          v-for="(mod, index) in result.modifiers"
          :key="index"
          class="modifier"
        >
          {{ mod.source }}: {{ mod.value > 0 ? "+" : "" }}{{ mod.value }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import Dice3D from "./Dice3D.vue";

export interface DiceRollResult {
  roll_value: number;
  outcome: "crit_success" | "success" | "fail" | "crit_fail";
  modifiers?: Array<{
    source: string;
    value: number;
  }>;
}

const props = defineProps<{
  diceType: "d4" | "d6" | "d10" | "d12" | "d20";
  autoRoll?: boolean;
  result?: DiceRollResult;
}>();

const emit = defineEmits<{
  rollComplete: [];
}>();

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
  // Emit completion
  if (props.result) {
    emit("rollComplete");
  }
};

// Get outcome label with emoji
const getOutcomeLabel = (outcome: string): string => {
  switch (outcome) {
    case "crit_success":
      return "🌟 Critical Success!";
    case "success":
      return "✅ Success";
    case "fail":
      return "❌ Fail";
    case "crit_fail":
      return "💀 Critical Fail!";
    default:
      return outcome;
  }
};

onMounted(() => {
  if (props.autoRoll) {
    roll();
  }
});

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
</style>
