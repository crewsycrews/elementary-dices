<template>
  <div class="relative inline-flex">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      :aria-label="t('dice_combo.aria')"
      @mouseenter="handlePointerEnter"
      @mousemove="handlePointerMove"
      @mouseleave="hideTooltip"
      @focus="handleFocus"
      @blur="hideTooltip"
    >
      <HelpCircle :size="16" />
    </button>

    <div
      v-if="isVisible"
      ref="tooltipRef"
      class="pointer-events-none fixed z-[70] w-[min(92vw,34rem)] rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm"
      :style="tooltipStyle"
      role="tooltip"
    >
        <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t("dice_combo.single_title") }}
        </p>

        <p class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {{ t("dice_combo.single_overwrite_note") }}
        </p>

        <ul class="mt-1 space-y-1 text-xs">
          <li
            v-for="row in SINGLE_DIE_ROWS"
            :key="row.element"
            class="flex items-start justify-between gap-3 border-t border-border/40 py-1.5"
          >
            <span class="font-semibold text-foreground/95">{{ row.element }}</span>
            <span class="text-emerald-300">{{ row.bonus }}</span>
          </li>
        </ul>
      <p class="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {{ t("dice_combo.title") }}
      </p>

      <p class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {{ t("dice_combo.tiers_label") }}
      </p>

      <ul class="mt-1 space-y-1 text-xs">
        <li
          v-for="row in COMBINATION_ROWS"
          :key="row.element"
          class="border-t border-border/40 py-1.5"
        >
          <p class="font-semibold text-foreground/95">
            {{ row.element }}
          </p>
          <p class="mt-0.5 leading-relaxed text-muted-foreground">
            {{ row.summary }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { HelpCircle } from "lucide-vue-next";
import { useI18n } from "@/i18n";

type CombinationRow = {
  element: string;
  summary: string;
};

type SingleDieRow = {
  element: string;
  bonus: string;
};

const { t } = useI18n();

const COMBINATION_ROWS: CombinationRow[] = [
  {
    element: t("element.water"),
    summary: t("dice_combo.water.summary"),
  },
  {
    element: t("element.earth"),
    summary: t("dice_combo.earth.summary"),
  },
  {
    element: t("element.fire"),
    summary: t("dice_combo.fire.summary"),
  },
  {
    element: t("element.air"),
    summary: t("dice_combo.air.summary"),
  },
  {
    element: t("element.lightning"),
    summary: t("dice_combo.lightning.summary"),
  },
];

const SINGLE_DIE_ROWS: SingleDieRow[] = [
  { element: t("element.water"), bonus: t("dice_combo.single.water") },
  { element: t("element.earth"), bonus: t("dice_combo.single.earth") },
  { element: t("element.fire"), bonus: t("dice_combo.single.fire") },
  { element: t("element.air"), bonus: t("dice_combo.single.air") },
  { element: t("element.lightning"), bonus: t("dice_combo.single.lightning") },
];

const isVisible = ref(false);
const tooltipRef = ref<HTMLElement | null>(null);
const posX = ref(0);
const posY = ref(0);

const tooltipStyle = computed(() => ({
  left: `${posX.value}px`,
  top: `${posY.value}px`,
}));

function clampPosition(clientX: number, clientY: number): void {
  const offset = 12;
  let x = clientX + offset;
  let y = clientY + offset;

  const el = tooltipRef.value;
  if (el) {
    const maxX = Math.max(8, window.innerWidth - el.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - el.offsetHeight - 8);
    x = Math.min(Math.max(8, x), maxX);
    y = Math.min(Math.max(8, y), maxY);
  }

  posX.value = x;
  posY.value = y;
}

function handlePointerEnter(event: MouseEvent): void {
  isVisible.value = true;
  clampPosition(event.clientX, event.clientY);
  void nextTick(() => clampPosition(event.clientX, event.clientY));
}

function handlePointerMove(event: MouseEvent): void {
  if (!isVisible.value) return;
  clampPosition(event.clientX, event.clientY);
}

function handleFocus(event: FocusEvent): void {
  isVisible.value = true;

  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  clampPosition(rect.left + rect.width / 2, rect.bottom);
  void nextTick(() => clampPosition(rect.left + rect.width / 2, rect.bottom));
}

function hideTooltip(): void {
  isVisible.value = false;
}
</script>
