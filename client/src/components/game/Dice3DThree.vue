<template>
  <div
    class="dice-container"
    :style="containerStyle"
    @click="handleClick"
    @mouseenter="handlePointerEnter"
    @mousemove="handlePointerMove"
    @mouseleave="handlePointerLeave"
  >
    <canvas ref="canvasRef" class="dice-canvas" />

    <div
      v-if="showShadow"
      class="dice-shadow"
      :class="{ 'is-rolling': isAnimating }"
    />

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
                <span class="probability-element-emoji">
                  {{ getElementEmoji(row.element) ?? "." }}
                </span>
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import * as THREE from "three";
import { useI18n } from "@/i18n";
import {
  getGeometry,
  type DiceType,
  type Rotation,
} from "./dice-geometry";

type ElementName = "fire" | "water" | "earth" | "air" | "lightning";

interface Props {
  diceType: DiceType;
  affinity?: ElementName;
  elementFaces?: string[];
  value?: number;
  scale?: number;
  isRolling?: boolean;
  showShadow?: boolean;
  animationSpeed?: number;
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

const ELEMENT_COLORS: Record<string, { base: string; dark: string }> = {
  fire: { base: "#f97316", dark: "#7f1d1d" },
  water: { base: "#38bdf8", dark: "#1e3a8a" },
  earth: { base: "#84cc16", dark: "#3f3f46" },
  air: { base: "#67e8f9", dark: "#0e7490" },
  lightning: { base: "#fde047", dark: "#7c3aed" },
};

const ELEMENT_EMOJI: Record<string, string> = {
  air: "\uD83D\uDCA8",
  earth: "\u26F0\uFE0F",
  fire: "\uD83D\uDD25",
  lightning: "\u26A1",
  water: "\uD83C\uDF0A",
};

const DICE_COLORS: Record<DiceType, { base: string; dark: string }> = {
  d4: { base: "#ef4444", dark: "#991b1b" },
  d6: { base: "#10b981", dark: "#065f46" },
  d10: { base: "#3b82f6", dark: "#1e3a8a" },
  d12: { base: "#8b5cf6", dark: "#4c1d95" },
  d20: { base: "#f59e0b", dark: "#92400e" },
};

const BASE_CANVAS_SIZE = 168;
const TOOLTIP_Y_OFFSET = 16;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isAnimating = ref(false);
const isTooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const { t } = useI18n();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let diceGroup: THREE.Group | null = null;
let faceNormalsByValue = new Map<number, THREE.Vector3>();
let frameId = 0;
let lastFrameTime = 0;
let disposeCallbacks: Array<() => void> = [];

const geometry = computed(() => getGeometry(props.diceType));

const canvasSize = computed(() =>
  Math.max(48, Math.round(BASE_CANVAS_SIZE * props.scale)),
);

const containerStyle = computed(() => ({
  width: `${canvasSize.value}px`,
  height: `${canvasSize.value}px`,
}));

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

  const totalFaces = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );
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

function getElementEmoji(element: string | undefined): string | undefined {
  return element ? ELEMENT_EMOJI[element] : undefined;
}

function getFaceElement(faceValue: number): string | undefined {
  return props.elementFaces?.[faceValue - 1] ?? props.affinity;
}

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

function initScene(): void {
  if (!canvasRef.value) return;

  cleanupScene();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  resizeRenderer();

  const ambient = new THREE.AmbientLight(0xffffff, 1.8);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8ec5ff, 0.7);
  fill.position.set(-3, -1, 3);
  scene.add(fill);

  diceGroup = buildDiceGroup();
  scene.add(diceGroup);

  if (props.value !== undefined) {
    setValue(props.value);
  } else {
    setValue(geometry.value.faces[0]?.value ?? 1);
  }

  startRenderLoop();
}

function cleanupScene(): void {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  for (const dispose of disposeCallbacks) {
    dispose();
  }
  disposeCallbacks = [];

  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  diceGroup = null;
  faceNormalsByValue = new Map();
  lastFrameTime = 0;
}

function resizeRenderer(): void {
  if (!renderer) return;
  renderer.setSize(canvasSize.value, canvasSize.value, false);
}

function startRenderLoop(): void {
  if (frameId) return;

  const renderFrame = (time: number) => {
    frameId = requestAnimationFrame(renderFrame);

    const delta = lastFrameTime ? (time - lastFrameTime) / 1000 : 0;
    lastFrameTime = time;

    if (diceGroup && props.spinning && !isAnimating.value) {
      diceGroup.rotation.x += delta * 5.2;
      diceGroup.rotation.y += delta * 0.75;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  };

  frameId = requestAnimationFrame(renderFrame);
}

function buildDiceGroup(): THREE.Group {
  const group = new THREE.Group();
  const faceValues = createFaceValueOrder(props.diceType);
  const model = createDiceGeometry(props.diceType, faceValues.length);
  const materials = faceValues.map((value, index) =>
    createFaceMaterial(value, index),
  );

  const mesh = new THREE.Mesh(model.geometry, materials);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);

  const edgeGeometry = new THREE.EdgesGeometry(model.geometry, 18);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.38,
  });
  group.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  disposeCallbacks.push(() => {
    model.geometry.dispose();
    edgeGeometry.dispose();
    edgeMaterial.dispose();
    for (const material of materials) {
      material.dispose();
    }
  });

  model.faces.forEach((face, index) => {
    const value = faceValues[index] ?? index + 1;
    const element = getFaceElement(value);
    faceNormalsByValue.set(value, face.normal.clone());
    const sprite = createFaceSprite(value, element);
    sprite.position.copy(face.center);
    sprite.position.addScaledVector(face.normal, model.labelOffset);
    sprite.scale.setScalar(model.labelScale);
    group.add(sprite);
  });

  return group;
}

function createFaceValueOrder(diceType: DiceType): number[] {
  if (diceType === "d6") {
    return [6, 1, 5, 2, 4, 3];
  }

  return geometry.value.faces.map((face) => face.value);
}

function createDiceGeometry(
  diceType: DiceType,
  faceCount: number,
): {
  geometry: THREE.BufferGeometry;
  faces: Array<{ center: THREE.Vector3; normal: THREE.Vector3 }>;
  labelOffset: number;
  labelScale: number;
} {
  if (diceType === "d10") {
    return createD10Geometry();
  }

  const baseGeometry =
    diceType === "d4"
      ? new THREE.TetrahedronGeometry(1.25, 0)
      : diceType === "d6"
        ? new THREE.BoxGeometry(1.45, 1.45, 1.45)
        : diceType === "d12"
          ? new THREE.DodecahedronGeometry(1.25, 0)
          : new THREE.IcosahedronGeometry(1.25, 0);

  const bufferGeometry = baseGeometry.toNonIndexed();
  baseGeometry.dispose();
  bufferGeometry.computeVertexNormals();

  const verticesPerFace = Math.max(
    3,
    Math.floor(bufferGeometry.getAttribute("position").count / faceCount),
  );
  assignMaterialGroups(bufferGeometry, faceCount, verticesPerFace);

  return {
    geometry: bufferGeometry,
    faces: collectFaceAnchors(bufferGeometry, faceCount, verticesPerFace),
    labelOffset: diceType === "d6" ? 0.035 : 0.055,
    labelScale: diceType === "d12" || diceType === "d20" ? 0.42 : 0.5,
  };
}

function createD10Geometry(): {
  geometry: THREE.BufferGeometry;
  faces: Array<{ center: THREE.Vector3; normal: THREE.Vector3 }>;
  labelOffset: number;
  labelScale: number;
} {
  const radius = 1;
  const height = 1.45;
  const top = new THREE.Vector3(0, height, 0);
  const bottom = new THREE.Vector3(0, -height, 0);
  const ring = Array.from({ length: 5 }, (_, index) => {
    const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    );
  });

  const vertices: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const next = (index + 1) % 5;
    pushTriangle(vertices, top, ring[index], ring[next]);
  }
  for (let index = 0; index < 5; index += 1) {
    const next = (index + 1) % 5;
    pushTriangle(vertices, bottom, ring[next], ring[index]);
  }

  const bufferGeometry = new THREE.BufferGeometry();
  bufferGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  bufferGeometry.computeVertexNormals();
  assignMaterialGroups(bufferGeometry, 10, 3);

  return {
    geometry: bufferGeometry,
    faces: collectFaceAnchors(bufferGeometry, 10, 3),
    labelOffset: 0.06,
    labelScale: 0.42,
  };
}

function pushTriangle(
  target: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): void {
  target.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function assignMaterialGroups(
  bufferGeometry: THREE.BufferGeometry,
  faceCount: number,
  verticesPerFace: number,
): void {
  bufferGeometry.clearGroups();
  for (let index = 0; index < faceCount; index += 1) {
    bufferGeometry.addGroup(index * verticesPerFace, verticesPerFace, index);
  }
}

function collectFaceAnchors(
  bufferGeometry: THREE.BufferGeometry,
  faceCount: number,
  verticesPerFace: number,
): Array<{ center: THREE.Vector3; normal: THREE.Vector3 }> {
  const position = bufferGeometry.getAttribute("position");
  const anchors: Array<{ center: THREE.Vector3; normal: THREE.Vector3 }> = [];

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    const center = new THREE.Vector3();
    const first = new THREE.Vector3();
    const second = new THREE.Vector3();
    const third = new THREE.Vector3();
    const start = faceIndex * verticesPerFace;

    for (let offset = 0; offset < verticesPerFace; offset += 1) {
      const vertex = new THREE.Vector3().fromBufferAttribute(
        position,
        start + offset,
      );
      center.add(vertex);
      if (offset === 0) first.copy(vertex);
      if (offset === 1) second.copy(vertex);
      if (offset === 2) third.copy(vertex);
    }

    center.divideScalar(verticesPerFace);

    const normal = new THREE.Vector3()
      .subVectors(second, first)
      .cross(new THREE.Vector3().subVectors(third, first))
      .normalize();

    if (normal.dot(center) < 0) {
      normal.multiplyScalar(-1);
    }

    anchors.push({
      center,
      normal,
    });
  }

  return anchors;
}

function createFaceMaterial(
  faceValue: number,
  faceIndex: number,
): THREE.MeshStandardMaterial {
  const element = getFaceElement(faceValue);
  const palette = element
    ? ELEMENT_COLORS[element]
    : DICE_COLORS[props.diceType];
  const dark = new THREE.Color(palette.dark);
  const color = new THREE.Color(palette.base);
  color.lerp(dark, faceIndex % 2 === 0 ? 0.08 : 0.22);

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.08,
    emissive: dark,
    emissiveIntensity: 0.07,
    flatShading: true,
  });
}

function createFaceSprite(
  faceValue: number,
  element: string | undefined,
): THREE.Sprite {
  const texture = createFaceTexture(faceValue, element);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);

  disposeCallbacks.push(() => {
    texture.dispose();
    material.dispose();
  });

  return sprite;
}

function createFaceTexture(
  faceValue: number,
  element: string | undefined,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.shadowColor = "rgba(15, 23, 42, 0.55)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 6;

  if (element) {
    drawElementEmoji(context, element, size);
  } else {
    context.font = "bold 112px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(faceValue), size / 2, size / 2 + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawElementEmoji(
  context: CanvasRenderingContext2D,
  element: string,
  size: number,
): void {
  const emoji = getElementEmoji(element) ?? element.charAt(0).toUpperCase();
  context.font =
    "112px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, size / 2, size / 2 + 4);
}

function toEuler(rotation: Rotation | undefined): THREE.Euler {
  return new THREE.Euler(
    THREE.MathUtils.degToRad(rotation?.rotateX ?? 0),
    THREE.MathUtils.degToRad(rotation?.rotateY ?? 0),
    THREE.MathUtils.degToRad(rotation?.rotateZ ?? 0),
    "XYZ",
  );
}

function targetQuaternionForValue(value: number): THREE.Quaternion | null {
  const normal = faceNormalsByValue.get(value);
  if (!normal) {
    const fallback = geometry.value.resultRotations[value];
    return fallback
      ? new THREE.Quaternion().setFromEuler(toEuler(fallback))
      : null;
  }

  const target = new THREE.Quaternion().setFromUnitVectors(
    normal.clone().normalize(),
    new THREE.Vector3(0, 0, 1),
  );
  const twist = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    THREE.MathUtils.degToRad(geometry.value.wrapperRotation?.rotateZ ?? -18),
  );

  return target.premultiply(twist);
}

function applyQuaternion(quaternion: THREE.Quaternion): void {
  if (!diceGroup) return;
  diceGroup.quaternion.copy(quaternion);
}

function applyEuler(euler: THREE.Euler): void {
  if (!diceGroup) return;
  diceGroup.rotation.copy(euler);
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function animateRotation(target: THREE.Euler, duration: number): Promise<void> {
  return new Promise((resolve) => {
    if (!diceGroup) {
      resolve();
      return;
    }

    const start = diceGroup.rotation.clone();
    const startedAt = performance.now();

    const step = (now: number) => {
      if (!diceGroup) {
        resolve();
        return;
      }

      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeInOutCubic(progress);

      diceGroup.rotation.set(
        THREE.MathUtils.lerp(start.x, target.x, eased),
        THREE.MathUtils.lerp(start.y, target.y, eased),
        THREE.MathUtils.lerp(start.z, target.z, eased),
      );

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        applyEuler(target);
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

function animateQuaternion(
  target: THREE.Quaternion,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    if (!diceGroup) {
      resolve();
      return;
    }

    const start = diceGroup.quaternion.clone();
    const startedAt = performance.now();

    const step = (now: number) => {
      if (!diceGroup) {
        resolve();
        return;
      }

      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeInOutCubic(progress);
      diceGroup.quaternion.copy(start).slerp(target, eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        applyQuaternion(target);
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

async function roll(targetValue: number): Promise<void> {
  if (isAnimating.value || !diceGroup) {
    return;
  }

  isAnimating.value = true;
  emit("rollStart");

  const spinDuration = (500 + Math.random() * 250) / props.animationSpeed;
  const settleDuration = (1000 + Math.random() * 250) / props.animationSpeed;
  const spinTarget = new THREE.Euler(
    diceGroup.rotation.x + THREE.MathUtils.degToRad(720 + Math.random() * 720),
    diceGroup.rotation.y + THREE.MathUtils.degToRad(720 + Math.random() * 720),
    diceGroup.rotation.z + THREE.MathUtils.degToRad(360 + Math.random() * 540),
    "XYZ",
  );

  await animateRotation(spinTarget, spinDuration);

  const settleTarget = targetQuaternionForValue(targetValue);
  if (settleTarget) {
    await animateQuaternion(settleTarget, settleDuration);
  }

  isAnimating.value = false;
  emit("rollCompleted", targetValue);
}

function setValue(value: number): void {
  const target = targetQuaternionForValue(value);
  if (target) {
    applyQuaternion(target);
  }
}

onMounted(() => {
  nextTick(initScene);
});

onBeforeUnmount(() => {
  cleanupScene();
});

watch(canvasSize, () => {
  resizeRenderer();
});

watch(
  () => [
    props.diceType,
    props.affinity,
    props.elementFaces?.join("|") ?? "",
  ],
  () => {
    nextTick(initScene);
  },
);

watch(
  () => props.value,
  (newValue) => {
    if (newValue !== undefined && !isAnimating.value) {
      setValue(newValue);
    }
  },
);

defineExpose({
  roll,
  setValue,
});
</script>

<style scoped>
.dice-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.dice-canvas {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
}

.dice-shadow {
  position: absolute;
  left: 50%;
  bottom: 10%;
  width: 58%;
  height: 12%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.35), transparent 68%);
  filter: blur(8px);
  border-radius: 50%;
  transform: translateX(-50%);
  transition:
    transform 400ms,
    opacity 400ms;
  pointer-events: none;
}

.dice-shadow.is-rolling {
  transform: translateX(-50%) scale(1.35);
  opacity: 0.35;
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

.probability-element-emoji {
  width: 1rem;
  line-height: 1;
  text-align: center;
  flex: 0 0 auto;
}
</style>
