<template>
  <div
    class="battle-elemental-card rounded-lg border-2 p-2 transition-all duration-300"
    :class="[
      borderColorClass,
      isBuffed ? 'ring-2 ring-green-400 animate-pulse' : '',
      isTargeted ? 'ring-2 ring-red-400' : '',
    ]"
  >
    <!-- Element + Level Badge -->
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-lg">{{ elementEmoji }}</span>
      <span
        class="text-[11px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded"
      >
        Lv.{{ member.level }}
      </span>
    </div>

    <div v-if="statusLabel" class="mb-1.5">
      <span
        class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <!-- Name -->
    <h4 class="font-bold text-xs truncate mb-1.5">{{ member.name }}</h4>

    <!-- Attack Display -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">ATK</span>
      <div class="flex items-center gap-0.5">
        <span
          class="font-bold text-base transition-all duration-500"
          :class="powerChangeClass"
        >
          {{ displayAttack }}
        </span>
        <span
          v-if="powerDiff !== 0"
          class="text-xs font-bold"
          :class="powerDiff > 0 ? 'text-green-400' : 'text-red-400'"
        >
          {{ powerDiff > 0 ? "+" : "" }}{{ powerDiff.toFixed(0) }}
        </span>
      </div>
    </div>

    <div class="flex items-center justify-between mt-1">
      <span class="text-xs text-muted-foreground">HP</span>
      <span class="text-xs font-semibold" :class="member.is_destroyed ? 'text-red-400' : ''">
        {{ member.current_health }}/{{ member.max_health }}
      </span>
    </div>
    <div class="mt-1 h-1.5 rounded bg-muted overflow-hidden">
      <div
        class="h-full transition-all duration-300"
        :class="member.is_destroyed ? 'bg-red-500' : 'bg-emerald-500'"
        :style="{ width: `${healthPct}%` }"
      ></div>
    </div>

    <!-- Target Arrow Indicator -->
    <div
      v-if="showTarget && targetName"
      class="mt-1.5 pt-1.5 border-t border-border"
    >
      <div class="flex items-center gap-1 text-xs text-muted-foreground">
        <span>→</span>
        <span>{{ targetName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { BattlePartyMember } from "@/stores/event";

const props = defineProps<{
  member: BattlePartyMember;
  isBuffed?: boolean;
  isTargeted?: boolean;
  showTarget?: boolean;
  targetName?: string;
  deploymentState?: "deployed" | "bench" | null;
}>();

const ELEMENT_CONFIG: Record<string, { emoji: string; borderColor: string }> = {
  fire: { emoji: "🔥", borderColor: "border-red-500/60" },
  water: { emoji: "💧", borderColor: "border-blue-500/60" },
  earth: { emoji: "🏔️", borderColor: "border-amber-600/60" },
  air: { emoji: "💨", borderColor: "border-cyan-400/60" },
  lightning: { emoji: "⚡", borderColor: "border-yellow-400/60" },
};

const elementEmoji = computed(
  () => ELEMENT_CONFIG[props.member.element]?.emoji ?? "❓",
);

const borderColorClass = computed(
  () =>
    ELEMENT_CONFIG[props.member.element]?.borderColor ?? "border-gray-500/60",
);

const displayAttack = computed(() => props.member.current_attack.toFixed(0));

const powerDiff = computed(
  () => props.member.current_attack - props.member.base_attack,
);

const healthPct = computed(() => {
  if (props.member.max_health <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, (props.member.current_health / props.member.max_health) * 100),
  );
});

const statusLabel = computed(() => {
  if (props.member.is_destroyed) return "Destroyed";
  if (props.deploymentState === "deployed") return "Deployed";
  if (props.deploymentState === "bench") return "Bench";
  return "";
});

const statusClass = computed(() => {
  if (props.member.is_destroyed) return "bg-red-500/20 text-red-300";
  if (props.deploymentState === "deployed") return "bg-blue-500/20 text-blue-300";
  if (props.deploymentState === "bench") return "bg-muted text-muted-foreground";
  return "";
});

const previousPower = ref(props.member.current_attack);
const powerChangeClass = ref("");

watch(
  () => props.member.current_attack,
  (newVal, oldVal) => {
    if (newVal > oldVal) {
      powerChangeClass.value = "text-green-400 scale-110";
    } else if (newVal < oldVal) {
      powerChangeClass.value = "text-red-400 scale-110";
    }
    setTimeout(() => {
      powerChangeClass.value = "";
    }, 600);
    previousPower.value = newVal;
  },
);
</script>
