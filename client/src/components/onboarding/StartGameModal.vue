<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <!-- Welcome State -->
      <div v-if="!isRolling && !isRollComplete && !result" class="welcome-state">
        <h1 class="title">{{ t("start_game.title") }}</h1>
        <p class="description">
          {{ t("start_game.description") }}
        </p>

        <!-- Base Elementals Preview -->
        <div class="elementals-preview">
          <h3 class="subtitle">{{ t("start_game.available") }}</h3>
          <div class="elementals-grid">
            <div
              v-for="elemental in baseElementals"
              :key="elemental.id"
              class="elemental-preview"
            >
              <div
                class="elemental-icon"
                :data-element="elemental.element_types[0]"
              >
                {{ getElementIcon(elemental.element_types) }}
              </div>
              <div class="elemental-name">{{ elemental.name }}</div>
            </div>
          </div>
        </div>

        <button
          @click="startRoll"
          class="start-button"
          :disabled="loading || baseElementals.length === 0"
        >
          <span v-if="loading">{{ t("start_game.loading") }}</span>
          <span v-else>🎲 {{ t("start_game.roll_to_start") }}</span>
        </button>
      </div>

      <!-- Rolling State -->
      <div v-else-if="isRolling || isRollComplete" class="rolling-state">
        <h2 class="title" v-if="isRolling">{{ t("start_game.rolling") }}</h2>
        <h2 class="title" v-else>{{ t("start_game.roll_ready") }}</h2>
        <DiceRollVisualization
          ref="diceVisualizationRef"
          dice-type="d10"
          :element-faces="starterDiceFaces"
          :result="rollResult"
          @roll-complete="handleRollComplete"
        />
        <button
          v-if="isRollComplete && pendingResult"
          @click="showRollOutcome"
          class="continue-button"
        >
          {{ t("start_game.reveal") }}
        </button>
      </div>

      <!-- Result State -->
      <div v-else-if="result" class="result-state">
        <h2 class="title">
          🎉 {{ t("start_game.you_got", { name: result.first_elemental.elemental_name }) }}
        </h2>
        <p class="message">{{ result.message }}</p>

        <!-- Selected Elemental Card -->
        <div class="selected-elemental">
          <div
            class="elemental-card"
            :data-element="result.first_elemental.element_types[0]"
          >
            <div class="elemental-header">
              <div class="elemental-icon large">
                {{ getElementIcon(result.first_elemental.element_types) }}
              </div>
              <div class="elemental-info">
                <h3>{{ result.first_elemental.elemental_name }}</h3>
                <div class="elemental-meta">
                  <span class="level"
                    >{{ t("start_game.level", { level: result.first_elemental.elemental_level }) }}</span
                  >
                  <span class="element">{{
                    formatElementTypes(result.first_elemental.element_types)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="elemental-stats">
              <div class="stat">
                <span class="stat-label">❤️ HP</span>
                <span class="stat-value">{{
                  result.first_elemental.current_stats.health
                }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">⚔️ ATK</span>
                <span class="stat-value">{{
                  result.first_elemental.current_stats.attack
                }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">🛡️ DEF</span>
                <span class="stat-value">{{
                  result.first_elemental.current_stats.defense
                }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">⚡ SPD</span>
                <span class="stat-value">{{
                  result.first_elemental.current_stats.speed
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <button @click="completeOnboarding" class="continue-button">
          {{ t("start_game.continue") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useApi } from "@/composables/useApi";
import { playerApi } from "@/composables/useApiHelpers";
import { useElementalsStore } from "@/stores/elementals";
import { useUserStore } from "@/stores/user";
import { useI18n } from "@/i18n";
import DiceRollVisualization, {
  DiceRollResult,
} from "@/components/game/DiceRollVisualization.vue";
import type { Elemental } from "@elementary-dices/shared/types";
import type {
  ApiStartGameResponse,
} from "@elementary-dices/shared";

const emit = defineEmits<{
  close: [];
  complete: [];
}>();

const { api, apiCall } = useApi();
const elementalsStore = useElementalsStore();
const userStore = useUserStore();
const { t } = useI18n();

const loading = ref(false);
const isRolling = ref(false);
const isRollComplete = ref(false);
const baseElementals = ref<Elemental[]>([]);
const rollResult = ref<DiceRollResult | undefined>(undefined);
const pendingResult = ref<ApiStartGameResponse | null>(null);
const result = ref<ApiStartGameResponse | null>(null);
const starterDiceFaces: DiceRollResult["result_element"][] = [
  "fire",
  "fire",
  "water",
  "water",
  "earth",
  "earth",
  "air",
  "air",
  "lightning",
  "lightning",
];
const diceVisualizationRef = ref<InstanceType<
  typeof DiceRollVisualization
> | null>(null);

// Load base elementals
onMounted(async () => {
  loading.value = true;
  try {
    const response = await apiCall(() => api.api.elementals.base.get(), {
      silent: true,
    });

    if (response.data?.elementals) {
      baseElementals.value = response.data.elementals.slice(0, 5); // First 5
    }
  } catch (error) {
    console.error("Failed to load base elementals:", error);
  } finally {
    loading.value = false;
  }
});

// Start the roll
const startRoll = async () => {
  const userId = userStore.userId;
  if (!userId) return;

  loading.value = true;
  isRolling.value = true;
  isRollComplete.value = false;
  result.value = null;
  pendingResult.value = null;
  rollResult.value = undefined;

  try {
    // Call the start-game endpoint
    const response = await apiCall(() => playerApi.startGame(userId), {
      silent: true,
    });

    if (response.data) {
      const data = response.data;
      const rolledElement =
        starterDiceFaces[data.dice_roll.selected_index] ?? "fire";

      // Prepare roll result for visualization
      rollResult.value = {
        roll_value: data.dice_roll.roll_value,
        result_element: rolledElement,
      };

      pendingResult.value = data;

      // Ensure visualization is mounted before triggering animation
      await nextTick();
      await diceVisualizationRef.value?.roll();
    }
  } catch (error) {
    console.error("Failed to start game:", error);
    isRolling.value = false;
  } finally {
    loading.value = false;
  }
};

// Handle roll completion
const handleRollComplete = () => {
  isRolling.value = false;
  isRollComplete.value = true;
};

const showRollOutcome = () => {
  if (!pendingResult.value) return;

  result.value = pendingResult.value;
  pendingResult.value = null;
  isRollComplete.value = false;
};

// Complete onboarding
const completeOnboarding = async () => {
  // Refresh stores
  if (userStore.userId) {
    await elementalsStore.fetchPlayerElementals(userStore.userId);
    await userStore.fetchUser(userStore.userId);
  }

  emit("complete");
};

// Close modal
const close = () => {
  if (!isRolling.value && !isRollComplete.value) {
    emit("close");
  }
};

// Get element icon - handles both single element and array of elements
const getElementIcon = (elements: string | string[]): string => {
  const icons: Record<string, string> = {
    fire: "🔥",
    water: "💧",
    earth: "🌍",
    air: "💨",
    lightning: "⚡",
  };

  // If it's an array, use the first element type
  const element = Array.isArray(elements) ? elements[0] : elements;
  return icons[element.toLowerCase()] || "❓";
};

// Format element types for display
const formatElementTypes = (elements: string[]): string => {
  return elements
    .map((e) => e.charAt(0).toUpperCase() + e.slice(1))
    .join(" / ");
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 1rem;
  padding: 2rem;
  max-width: 46rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.welcome-state,
.rolling-state,
.result-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
}

.subtitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  text-align: center;
  margin-bottom: 1rem;
}

.description,
.message {
  text-align: center;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

.elementals-preview {
  width: 100%;
}

.elementals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.elemental-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.elemental-preview:hover {
  border-color: hsl(var(--primary));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.elemental-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border-radius: 50%;
  background: hsl(var(--muted));
}

.elemental-icon.large {
  width: 80px;
  height: 80px;
  font-size: 3rem;
}

.elemental-icon[data-element="fire"] {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.elemental-icon[data-element="water"] {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.elemental-icon[data-element="earth"] {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.elemental-icon[data-element="air"] {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
}

.elemental-icon[data-element="lightning"] {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.elemental-name {
  font-weight: 600;
  color: hsl(var(--foreground));
  text-align: center;
}

.elemental-element {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-transform: capitalize;
}

.start-button,
.continue-button {
  padding: 1rem 2rem;
  background: linear-gradient(
    135deg,
    hsl(var(--primary)),
    hsl(var(--primary) / 0.8)
  );
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
}

.start-button:hover:not(:disabled),
.continue-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px hsl(var(--primary) / 0.4);
}

.start-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selected-elemental {
  width: 100%;
  max-width: 24rem;
}

.elemental-card {
  background: hsl(var(--card));
  border: 2px solid hsl(var(--border));
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s;
}

.elemental-card[data-element="fire"] {
  border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
}

.elemental-card[data-element="water"] {
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
}

.elemental-card[data-element="earth"] {
  border-color: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
}

.elemental-card[data-element="air"] {
  border-color: #06b6d4;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
}

.elemental-card[data-element="lightning"] {
  border-color: #fbbf24;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
}

.elemental-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.elemental-info h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.elemental-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.level,
.element {
  padding: 0.25rem 0.5rem;
  background: hsl(var(--muted));
  border-radius: 0.25rem;
  font-weight: 500;
}

.elemental-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: hsl(var(--muted) / 0.3);
  border-radius: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}
</style>
