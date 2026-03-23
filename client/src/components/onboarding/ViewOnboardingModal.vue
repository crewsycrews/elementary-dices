<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="header-row">
        <div>
          <h2 class="title">{{ title }}</h2>
          <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
        </div>
        <button class="skip-button" type="button" @click="handleClose">
          Skip
        </button>
      </div>

      <div class="progress-row" role="tablist" aria-label="Onboarding steps">
        <button
          v-for="(step, index) in steps"
          :key="`${step.title}-${index}`"
          type="button"
          class="progress-pill"
          :class="{ active: index === currentIndex }"
          @click="goTo(index)"
        >
          {{ index + 1 }}
        </button>
      </div>

      <div class="step-card">
        <p class="step-label">Step {{ currentIndex + 1 }} of {{ steps.length }}</p>
        <h3 class="step-title">{{ currentStep.title }}</h3>
        <p class="step-description">{{ currentStep.description }}</p>

        <ul class="bullets">
          <li v-for="(bullet, bulletIndex) in currentStep.bullets" :key="bulletIndex">
            {{ bullet }}
          </li>
        </ul>
      </div>

      <div class="actions">
        <button
          type="button"
          class="secondary-button"
          :disabled="currentIndex === 0"
          @click="prev"
        >
          Back
        </button>
        <button
          v-if="!isLastStep"
          type="button"
          class="primary-button"
          @click="next"
        >
          Next
        </button>
        <button
          v-else
          type="button"
          class="primary-button"
          @click="handleComplete"
        >
          Finish
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

type Step = {
  title: string;
  description: string;
  bullets: string[];
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    steps: Step[];
  }>(),
  {
    subtitle: "",
  },
);

const emit = defineEmits<{
  close: [];
  complete: [];
}>();

const currentIndex = ref(0);

const safeSteps = computed<Step[]>(() =>
  props.steps.length > 0
    ? props.steps
    : [{ title: "No steps", description: "", bullets: [] }],
);

const currentStep = computed(() => safeSteps.value[currentIndex.value]);
const isLastStep = computed(
  () => currentIndex.value >= safeSteps.value.length - 1,
);

function goTo(index: number) {
  if (index < 0 || index >= safeSteps.value.length) return;
  currentIndex.value = index;
}

function prev() {
  goTo(currentIndex.value - 1);
}

function next() {
  goTo(currentIndex.value + 1);
}

function handleClose() {
  emit("close");
}

function handleComplete() {
  emit("complete");
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(3px);
}

.modal-content {
  width: min(100%, 44rem);
  max-height: 90vh;
  overflow: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 0.9rem;
  background: hsl(var(--background));
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.title {
  font-size: 1.35rem;
  font-weight: 800;
}

.subtitle {
  margin-top: 0.35rem;
  color: hsl(var(--muted-foreground));
}

.skip-button {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: transparent;
  color: hsl(var(--muted-foreground));
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}

.skip-button:hover {
  background: hsl(var(--muted) / 0.25);
  color: hsl(var(--foreground));
}

.progress-row {
  margin-top: 1rem;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.progress-pill {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  color: hsl(var(--muted-foreground));
  font-weight: 700;
  cursor: pointer;
}

.progress-pill.active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}

.step-card {
  margin-top: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  background: hsl(var(--card) / 0.45);
  padding: 1rem;
}

.step-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.step-title {
  margin-top: 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.step-description {
  margin-top: 0.55rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}

.bullets {
  margin-top: 0.75rem;
  padding-left: 1.05rem;
  display: grid;
  gap: 0.4rem;
  color: hsl(var(--foreground));
}

.actions {
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.secondary-button,
.primary-button {
  border-radius: 0.55rem;
  padding: 0.55rem 0.95rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
}

.secondary-button {
  background: transparent;
}

.secondary-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.primary-button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}
</style>
