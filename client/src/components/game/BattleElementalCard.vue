<template>
  <div
    class="battle-elemental-card rounded-lg border-2 p-2 transition-all duration-300"
    :class="[
      borderColorClass,
      isBuffed ? 'ring-2 ring-green-400 animate-pulse' : '',
      isTargeted ? 'ring-2 ring-red-400' : '',
      dropHighlight ? 'ring-2 ring-cyan-300/70 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.25)]' : '',
      infusionContainerClass,
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
    <div v-if="hasPositiveBonus" class="mt-1 text-right">
      <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300">
        BONUS +{{ bonusPercent.toFixed(0) }}%
      </span>
    </div>

    <div class="flex items-center justify-between mt-1">
      <span class="text-xs text-muted-foreground">{{ t("battle_arena.hp") }}</span>
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
import { useI18n } from "@/i18n";

const props = defineProps<{
  member: BattlePartyMember;
  isBuffed?: boolean;
  isTargeted?: boolean;
  showTarget?: boolean;
  targetName?: string;
  deploymentState?: "deployed" | "bench" | null;
  dropHighlight?: boolean;
  infusionElement?: string | null;
}>();
const { t } = useI18n();

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
const bonusPercent = computed(() => {
  if (props.member.base_attack <= 0) return 0;
  return ((props.member.current_attack - props.member.base_attack) / props.member.base_attack) * 100;
});
const hasPositiveBonus = computed(() => bonusPercent.value > 0);

const healthPct = computed(() => {
  if (props.member.max_health <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, (props.member.current_health / props.member.max_health) * 100),
  );
});

const statusLabel = computed(() => {
  if (props.member.is_destroyed) return t("battle_card.status_destroyed");
  if (props.deploymentState === "deployed") return t("battle_card.status_deployed");
  if (props.deploymentState === "bench") return t("battle_card.status_bench");
  return "";
});

const statusClass = computed(() => {
  if (props.member.is_destroyed) return "bg-red-500/20 text-red-300";
  if (props.deploymentState === "deployed") return "bg-blue-500/20 text-blue-300";
  if (props.deploymentState === "bench") return "bg-muted text-muted-foreground";
  return "";
});

const INFUSION_THEME: Record<string, string> = {
  fire: "shadow-[0_0_24px_rgba(239,68,68,0.7)]",
  water: "shadow-[0_0_24px_rgba(59,130,246,0.7)]",
  earth: "shadow-[0_0_24px_rgba(150,75,0,0.65)]",
  air: "shadow-[0_0_24px_rgba(34,197,94,0.7)]",
  lightning: "shadow-[0_0_24px_rgba(250,204,21,0.8)]",
};

const infusionTheme = computed(() => {
  if (!props.infusionElement) return null;
  return INFUSION_THEME[props.infusionElement] ?? null;
});

const infusionContainerClass = computed(() => infusionTheme.value ?? "");

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
