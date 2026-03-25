<template>
  <div
    class="dice-container"
    :style="{
      perspective: `${perspective}px`,
      transform: `scale(${scale})`,
      transition: 'transform 0.3s ease',
    }"
  >
    <!-- Shadow beneath the dice -->

    <!-- Dice wrapper with optional base rotation -->
    <div class="dice-wrapper" :style="wrapperStyle">
      <!-- Spin wrapper: handles continuous X-axis spin independently of face rotation -->
      <div class="spin-wrapper" :class="{ 'is-spinning': spinning }">
        <!-- The 3D dice itself -->
        <div
          class="dice-3d"
          ref="diceRef"
          :class="[`dice-${diceType}`, { 'is-rolling': isAnimating }]"
          :style="diceStyle"
          @click="handleClick"
          @mouseenter="handlePointerEnter"
          @mousemove="handlePointerMove"
          @mouseleave="handlePointerLeave"
        >
          <!-- Render all faces -->
          <div
            v-for="face in geometry.faces"
            :key="`face-${face.value}`"
            class="dice-face"
            :class="`dice-face-${diceType}`"
            :style="faceStyles[face.value]"
          >
            <!-- Elemental faces: show element emoji -->
            <span class="face-value face-value-emoji">{{
              ELEMENT_EMOJI[getFaceElement(face.value) ?? ""] ?? face.value
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showProbabilityTooltip"
        class="dice-probability-tooltip"
        :style="{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
        }"
      >
        <table class="probability-table">
          <thead>
            <tr>
              <th>{{ t("dice3d.element") }}</th>
              <th>{{ t("dice3d.faces") }}</th>
              <th>{{ t("dice3d.chance") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in probabilityRows" :key="row.element">
              <td class="probability-element">
                {{ ELEMENT_EMOJI[row.element] ?? "•" }}
                <span>{{ row.element }}</span>
              </td>
              <td>{{ row.count }}</td>
              <td>{{ row.chancePercent }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "@/i18n";
import {
  getGeometry,
  type DiceType,
  createTransform,
  ELEMENT_EMOJI,
} from "./dice-geometry";
import airTexture from "../../../assets/dice-affinities/air.gif";
import fireTexture from "../../../assets/dice-affinities/fire.gif";
import waterTexture from "../../../assets/dice-affinities/water.gif";
import earthTexture from "../../../assets/dice-affinities/stone.avif";
import lightningTexture from "../../../assets/dice-affinities/lightning 2.gif";

const affinityTextures: Record<string, string> = {
  air: airTexture,
  fire: fireTexture,
  water: waterTexture,
  earth: earthTexture,
  lightning: lightningTexture,
};

interface Props {
  /** The type of dice to render (d4, d6, d10, d12, d20) */
  diceType: DiceType;

  /** Element affinity to use as face texture (legacy — uses single texture for all faces) */
  affinity?: "fire" | "water" | "earth" | "air" | "lightning";

  /** Elemental faces array from dice type data. When provided, each face renders its element emoji
   *  and gets a per-face texture based on its element. Takes priority over `affinity`. */
  elementFaces?: string[];

  /** The current face value to display (1-N) */
  value?: number;

  /** Size of the dice in pixels */
  scale?: number;

  /** Whether the dice is currently rolling */
  isRolling?: boolean;

  /** Whether to show the shadow beneath the dice */
  showShadow?: boolean;

  /** Animation speed multiplier (1 = normal, 2 = double speed, 0.5 = half speed) */
  animationSpeed?: number;

  /** Continuously spin on X-axis (e.g. while an API call is in progress) */
  spinning?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  scale: 1,
  isRolling: false,
  showShadow: true,
  animationSpeed: 0.6,
  affinity: undefined,
  elementFaces: undefined,
  spinning: false,
});

const emit = defineEmits<{
  rollStart: [];
  rollCompleted: [value: number];
  click: [];
}>();

// Refs
const diceRef = ref<HTMLElement | null>(null);
const shadowRef = ref<HTMLElement | null>(null);
const isAnimating = ref(false);
const isTooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const TOOLTIP_Y_OFFSET = 16;
const { t } = useI18n();

// Get geometry for this dice type
const geometry = computed(() => getGeometry(props.diceType));

// Perspective depth for 3D effect
const perspective = computed(() => 1000);

// Wrapper style (includes optional base rotation for proper viewing angle)
const wrapperStyle = computed(() => {
  const baseRotation = geometry.value.wrapperRotation;
  if (!baseRotation) {
    return {};
  }
  return {
    transform: createTransform(baseRotation),
  };
});

// Dice style (includes size scaling)
const diceStyle = computed(() => {
  return {
    width: `${geometry.value.width}px`,
    height: `${geometry.value.height}px`,
  };
});

const faceStyles = computed(() => {
  const styles: Record<number, Record<string, string>> = {};
  for (const face of geometry.value.faces) {
    const style: Record<string, string> = { transform: face.transform };
    if (face.clipPath) style.clipPath = face.clipPath;
    if (props.diceType === "d12") style.transformOrigin = "center bottom";

    // Per-face element texture when elementFaces is provided
    const faceElement = props.elementFaces?.[face.value - 1];
    if (faceElement && affinityTextures[faceElement]) {
      style.background = `url(${affinityTextures[faceElement]}) center / cover`;
    } else if (props.affinity && affinityTextures[props.affinity]) {
      style.background = `url(${affinityTextures[props.affinity]}) center / cover`;
    }

    styles[face.value] = style;
  }
  return styles;
});

const probabilityRows = computed(() => {
  const counts: Record<string, number> = {};
  const faces = props.elementFaces ?? [];

  if (faces.length > 0) {
    for (const element of faces) {
      counts[element] = (counts[element] ?? 0) + 1;
    }
  } else if (props.affinity) {
    counts[props.affinity] = geometry.value.faces.length;
  }

  const totalFaces = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (totalFaces === 0) {
    return [];
  }

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([element, count]) => ({
      element,
      count,
      chancePercent: ((count / totalFaces) * 100).toFixed(1),
    }));
});

const showProbabilityTooltip = computed(
  () => isTooltipVisible.value && probabilityRows.value.length > 0,
);

/** Get the element for a specific face (1-based index) */
function getFaceElement(faceValue: number): string | undefined {
  return props.elementFaces?.[faceValue - 1];
}

/**
 * Get the 3 values displayed on a d4 face
 * Each triangular face shows all values except the bottom face value
 */
function getD4Values(faceValue: number): [number, number, number] {
  switch (faceValue) {
    case 1:
      return [2, 1, 4];
    case 2:
      return [3, 1, 2];
    case 3:
      return [4, 1, 3];
    case 4:
      return [4, 3, 2];
    default:
      return [0, 0, 0]; // Should never happen
  }
}

/**
 * Handle dice click event
 */
function handleClick() {
  emit("click");
}

function updateTooltipPosition(event: MouseEvent): void {
  tooltipPosition.value = {
    x: event.clientX + 8,
    y: event.clientY + TOOLTIP_Y_OFFSET,
  };
}

function handlePointerEnter(event: MouseEvent): void {
  if (probabilityRows.value.length === 0) return;
  updateTooltipPosition(event);
  isTooltipVisible.value = true;
}

function handlePointerMove(event: MouseEvent): void {
  if (!isTooltipVisible.value) return;
  updateTooltipPosition(event);
}

function handlePointerLeave(): void {
  isTooltipVisible.value = false;
}

/**
 * Roll the dice with two-phase animation
 *
 * Phase 1 (1200ms): Dramatic spin with multiple rotations
 * Phase 2 (400ms): Settle on the target value with ease-out
 *
 * @param targetValue - The face value to land on (1-N)
 * @returns Promise that resolves when animation completes
 */
async function roll(targetValue: number): Promise<void> {
  if (isAnimating.value || !diceRef.value) {
    return;
  }

  isAnimating.value = true;
  emit("rollStart");

  const dice = diceRef.value;
  const spinDuration = (500 + Math.random() * 250) / props.animationSpeed;
  const settleDuration = (1000 + Math.random() * 250) / props.animationSpeed;

  // Phase 1: Dramatic spin
  // Add 2-4 complete rotations (720-1440 degrees) plus random offset
  const randomX = 180 + Math.random() * 180 * 8; // 2-4 full rotations
  const randomY = 180 + Math.random() * 180 * 8;
  const randomZ = 180 + Math.random() * 180 * 8;

  dice.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg) rotateZ(${randomZ}deg)`;
  dice.style.transition = `transform ${spinDuration}ms ease-in-out`;

  // Animate shadow during spin
  if (shadowRef.value) {
    shadowRef.value.style.transition = `transform ${spinDuration}ms, opacity ${spinDuration}ms`;
  }

  // Wait for spin phase to complete
  await new Promise((resolve) => setTimeout(resolve, spinDuration));

  // Phase 2: Settle on target value
  const rotation = geometry.value.resultRotations[targetValue];
  if (rotation) {
    const { rotateX, rotateY, rotateZ } = rotation;
    dice.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    dice.style.transition = `transform ${settleDuration}ms ease-in-out`;

    // Reset shadow during settle
    if (shadowRef.value) {
      shadowRef.value.style.transition = `transform ${settleDuration}ms, opacity ${settleDuration}ms`;
    }

    // Wait for settle phase to complete
    await new Promise((resolve) => setTimeout(resolve, settleDuration));
  }

  isAnimating.value = false;
  emit("rollCompleted", targetValue);
}

/**
 * Immediately set the dice to show a specific value without animation
 */
function setValue(value: number): void {
  if (!diceRef.value) return;

  const rotation = geometry.value.resultRotations[value];
  if (rotation) {
    const { rotateX, rotateY, rotateZ } = rotation;
    diceRef.value.style.transition = "none";
    diceRef.value.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;

    // Force reflow to apply transition: none
    void diceRef.value.offsetWidth;

    // Re-enable transitions for future animations
    diceRef.value.style.transition = "";
  }
}

// Watch for value changes
// watch(
//   () => props.value,
//   (newValue) => {
//     if (newValue !== undefined && !isAnimating.value) {
//       setValue(newValue);
//     }
//   },
// );

// Set initial value on mount
onMounted(() => {
  if (props.value !== undefined) {
    setValue(props.value);
  }
});

// Expose methods for parent components
defineExpose({
  roll,
  setValue,
});
</script>

<style scoped>
.dice-container {
  position: relative;
  width: fit-content;
  height: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dice-probability-tooltip {
  position: fixed;
  z-index: 60;
  pointer-events: none;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  padding: 0.4rem;
  color: #f8fafc;
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.45);
  min-width: 210px;
  backdrop-filter: blur(6px);
}

.probability-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}

.probability-table th,
.probability-table td {
  text-align: left;
  padding: 0.2rem 0.3rem;
}

.probability-table th {
  font-size: 0.68rem;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.probability-table td {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.probability-table tbody tr:last-child td {
  border-bottom: none;
}

.probability-element {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  text-transform: capitalize;
}

.dice-shadow {
  position: absolute;
  bottom: -50px;
  width: 80px;
  height: 20px;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4), transparent);
  filter: blur(10px);
  border-radius: 50%;
  transition:
    transform 400ms,
    opacity 400ms;
  pointer-events: none;
}

.dice-shadow.is-rolling {
  transform: scale(1.5);
  opacity: 0.2;
}

.dice-wrapper {
  transform-style: preserve-3d;
  transform-origin: center;
}

.spin-wrapper {
  transform-style: preserve-3d;
}

.spin-wrapper.is-spinning {
  animation: spin-x 0.7s linear infinite;
}

@keyframes spin-x {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(360deg);
  }
}

.dice-3d {
  position: relative;
  transform-style: preserve-3d;
  transform-origin: center;
  transition: transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
}

/* .dice-3d:hover {
  filter: brightness(1.1);
} */

.dice-face {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: visible;
  border: 2px solid rgba(0, 0, 0, 0.3);
  box-shadow:
    inset 0 0 20px rgba(255, 255, 255, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Dice type-specific colors (matching existing game gradients) */
.dice-face-d4 {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.dice-face-d6 {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  /* border-radius: 8px; */
}

.dice-face-d10 {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.dice-face-d12 {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.dice-face-d20 {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

/* Lighting effect - darken even-numbered faces slightly for depth */
.dice-face:nth-child(even) {
  filter: brightness(0.9);
}

.face-value {
  font-size: 2rem;
  font-weight: bold;
  color: white;
  text-shadow:
    1px 0 0 white,
    /*right */ 0 1px 0 white,
    /*top */ -1px 0 0 white,
    /*left */ 0 -1px 0 white; /*bottom */
  user-select: none;
  pointer-events: none;
}

/* D4 face value positioning - 3 values per triangular face */
.face-value-d4-left {
  position: relative;
  top: 42px;
  left: -17px;
  transform: rotateZ(-120deg);
}

.face-value-d4-center {
  position: relative;
  top: -15px;
}

.face-value-d4-right {
  position: relative;
  top: 42px;
  left: 17px;
  transform: rotateZ(120deg);
}

/* Adjust font size for dice with many faces */
.dice-d12 .face-value {
  font-size: 1.6rem;
}

.dice-d20 .face-value {
  font-size: 1.4rem;
}

/* Special styling for triangular faces (d4, d20) */
.dice-d4 .dice-face,
.dice-d20 .dice-face {
  border-radius: 0;
}

/* Border radius for pentagonal faces (d12) */
.dice-d12 .dice-face {
  border-radius: 6px;
}

/* Animation classes */
.dice-3d.is-rolling {
  animation: none; /* Transition handles the animation */
}

/* Responsive sizing for small dice */
@media (max-width: 640px) {
  .dice-shadow {
    bottom: -30px;
    width: 60px;
    height: 15px;
  }

  .face-value {
    font-size: 1.6rem;
  }

  .dice-d12 .face-value {
    font-size: 1.3rem;
  }

  .dice-d20 .face-value {
    font-size: 1.1rem;
  }
}
</style>
