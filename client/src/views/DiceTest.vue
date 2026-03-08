<template>
  <div class="dice-test">
    <h1>Dice Test Playground</h1>

    <!-- Dice type picker -->
    <div class="dice-picker">
      <button
        v-for="type in diceTypes"
        :key="type"
        class="dice-pick-btn"
        :class="{ active: selectedDice === type }"
        @click="selectedDice = type"
      >
        {{ type.toUpperCase() }}
      </button>
    </div>

    <!-- Affinity picker -->
    <div class="affinity-picker">
      <button
        v-for="aff in affinities"
        :key="aff.value ?? 'none'"
        class="aff-btn"
        :class="{ active: selectedAffinity === aff.value }"
        @click="selectedAffinity = aff.value"
      >
        {{ aff.label }}
      </button>
    </div>

    <!-- Roll controls -->
    <div class="controls">
      <button class="roll-btn" :disabled="isRolling" @click="rollDice">
        {{ isRolling ? "Rolling..." : "Roll" }}
      </button>
      <label class="outcome-pick">
        <span>Force element:</span>
        <select v-model="forcedElement">
          <option value="">Random</option>
          <option value="fire">Fire</option>
          <option value="water">Water</option>
          <option value="earth">Earth</option>
          <option value="air">Air</option>
          <option value="lightning">Lightning</option>
        </select>
      </label>
    </div>

    <!-- Dice visualization -->
    <DiceRollVisualization
      ref="vizRef"
      :dice-type="selectedDice"
      :affinity="selectedAffinity"
      :result="currentResult"
      @roll-complete="onRollComplete"
    />

    <!-- Roll log -->
    <div v-if="rollLog.length" class="roll-log">
      <h3>Roll Log</h3>
      <div v-for="(entry, i) in rollLog" :key="i" class="log-entry">
        <span class="log-dice">{{ entry.dice }}</span>
        <span class="log-value">{{ entry.value }}</span>
        <span class="log-outcome" :class="`outcome-${entry.result_element}`">{{
          entry.result_element
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import DiceRollVisualization, {
  type DiceRollResult,
} from "@/components/game/DiceRollVisualization.vue";

type DiceType = "d4" | "d6" | "d10" | "d12" | "d20";
type Affinity = "fire" | "water" | "earth" | "air" | "lightning";

const diceTypes: DiceType[] = ["d4", "d6", "d10", "d12", "d20"];
const affinities: { label: string; value: Affinity | undefined }[] = [
  { label: "None", value: undefined },
  { label: "🔥 Fire", value: "fire" },
  { label: "💧 Water", value: "water" },
  { label: "🌍 Earth", value: "earth" },
  { label: "🌬️ Air", value: "air" },
  { label: "⚡ Lightning", value: "lightning" },
];
const ELEMENTS: DiceRollResult["result_element"][] = [
  "fire",
  "water",
  "earth",
  "air",
  "lightning",
];
const DICE_MAX: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d10: 10,
  d12: 12,
  d20: 20,
};

const selectedDice = ref<DiceType>("d6");
const selectedAffinity = ref<Affinity | undefined>(undefined);
const forcedElement = ref<string>("");
const isRolling = ref(false);
const currentResult = ref<DiceRollResult>();
const vizRef = ref<InstanceType<typeof DiceRollVisualization> | null>(null);

const rollLog = ref<
  Array<{ dice: string; value: number; result_element: string }>
>([]);

async function rollDice() {
  if (isRolling.value) return;
  isRolling.value = true;

  const dice = selectedDice.value;
  const max = DICE_MAX[dice];
  const rollValue = Math.floor(Math.random() * max) + 1;

  const result_element: DiceRollResult["result_element"] = forcedElement.value
    ? (forcedElement.value as DiceRollResult["result_element"])
    : ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

  currentResult.value = {
    roll_value: rollValue,
    result_element,
  };

  await nextTick();
  await vizRef.value?.roll();

  rollLog.value.unshift({
    dice: selectedDice.value.toUpperCase(),
    value: rollValue,
    result_element,
  });

  isRolling.value = false;
}

function onRollComplete() {
  // console.log("Roll animation complete");
}
</script>

<style scoped>
.dice-test {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1.5rem;
  min-height: 100vh;
  color: white;
  background-color: #2563eb;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.dice-picker {
  display: flex;
  gap: 0.5rem;
  background-color: grey;
}

.dice-pick-btn {
  padding: 0.5rem 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.dice-pick-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dice-pick-btn.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.2);
}

.affinity-picker {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.aff-btn {
  padding: 0.375rem 0.875rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.aff-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.aff-btn.active {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.2);
}

.controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.roll-btn {
  padding: 0.75rem 2.5rem;
  border: none;
  border-radius: 0.5rem;
  background: #3b82f6;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.roll-btn:hover:not(:disabled) {
  background: #2563eb;
}

.roll-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.outcome-pick {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(0, 0, 255, 0.7);
}

.outcome-pick select {
  padding: 0.375rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
}

.roll-log {
  width: 100%;
  max-width: 400px;
}

.roll-log h3 {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.log-dice {
  font-weight: 600;
  width: 2.5rem;
}

.log-value {
  font-weight: 700;
  width: 1.5rem;
  text-align: center;
}

.log-outcome {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
}

.outcome-fire {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.outcome-water {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}
.outcome-earth {
  background: rgba(217, 119, 6, 0.2);
  color: #d97706;
}
.outcome-air {
  background: rgba(6, 182, 212, 0.2);
  color: #06b6d4;
}
.outcome-lightning {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}
</style>
