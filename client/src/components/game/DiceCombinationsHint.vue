<template>
  <div class="relative inline-flex">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      aria-label="Show possible dice combinations"
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
      class="pointer-events-none fixed z-[70] w-[min(92vw,30rem)] rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm"
      :style="tooltipStyle"
      role="tooltip"
    >
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Possible combinations
      </p>

      <table class="mt-2 w-full text-left text-xs">
        <thead class="text-muted-foreground">
          <tr>
            <th class="pb-1 pr-2 font-semibold">Combination</th>
            <th class="pb-1 pr-2 font-semibold">Pattern</th>
            <th class="pb-1 font-semibold">Bonus</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in COMBINATION_ROWS"
            :key="row.name"
            class="border-t border-border/40 align-top"
          >
            <td class="py-1.5 pr-2 font-semibold text-foreground/95">
              {{ row.name }}
            </td>
            <td class="py-1.5 pr-2 text-muted-foreground">
              {{ row.pattern }}
            </td>
            <td class="py-1.5 text-emerald-300">
              {{ row.bonus }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { HelpCircle } from "lucide-vue-next";

type CombinationRow = {
  name: string;
  pattern: string;
  bonus: string;
};

const COMBINATION_ROWS: CombinationRow[] = [
  { name: "Triplet", pattern: "3 dice, same element", bonus: "+30% to that element" },
  { name: "Quartet", pattern: "4 dice, same element", bonus: "+40% to that element" },
  { name: "All-For-One", pattern: "5 dice, same element", bonus: "+50% to that element" },
  { name: "Full House", pattern: "3 dice + 2 dice", bonus: "+35% triplet, +25% pair" },
  { name: "One-For-All", pattern: "all 5 dice different", bonus: "choose 1 element for +30%" },
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
