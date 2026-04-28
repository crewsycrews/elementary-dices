<template>
  <div
    class="battle-elemental-card group relative mx-auto flex w-full max-w-[8.5rem] flex-col items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all duration-300"
    tabindex="0"
    :class="[
      isBuffed ? 'bg-emerald-500/5' : '',
      isTargeted ? 'ring-2 ring-red-400' : '',
      dropHighlight ? 'bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.25)] ring-2 ring-cyan-300/80' : '',
      infusionContainerClass,
      member.is_destroyed ? 'opacity-60 grayscale' : '',
    ]"
  >
    <div
      class="relative grid h-20 w-20 place-items-center rounded-full p-[4px] shadow-sm transition-transform duration-200 group-hover:scale-105 group-focus:scale-105"
      :style="healthRingStyle"
    >
      <div
        class="grid h-full w-full place-items-center overflow-hidden rounded-full border bg-background"
        :class="avatarInnerClass"
      >
        <img
          v-if="member.image_url"
          :src="member.image_url"
          :alt="member.name"
          class="h-full w-full object-cover"
        />
        <div
          v-else
          class="grid h-full w-full place-items-center text-2xl font-black uppercase"
          :class="fallbackAvatarClass"
          aria-hidden="true"
        >
          {{ fallbackInitial }}
        </div>
      </div>

      <span
        class="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-background bg-foreground text-[10px] font-bold text-background shadow"
      >
        {{ member.level }}
      </span>
      <span
        v-if="infusionElement"
        class="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-background text-xs shadow"
        :class="infusionPipClass"
      >
        {{ infusionEmoji }}
      </span>
    </div>

    <div class="min-w-0 max-w-full text-center">
      <p class="truncate text-xs font-bold leading-tight">{{ member.name }}</p>
      <p class="text-[10px] font-semibold uppercase leading-tight text-muted-foreground">
        HP {{ formatNumber(member.current_health) }}/{{ formatNumber(member.max_health) }}
      </p>
    </div>

    <div v-if="statusLabel" class="min-h-5">
      <span
        class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div
      class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-left opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
    >
      <div class="mb-2 flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-xs font-bold text-slate-50">{{ member.name }}</p>
          <p class="text-[10px] uppercase tracking-wide text-slate-400">
            {{ member.element }} elemental
          </p>
        </div>
        <span
          v-if="statusLabel"
          class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
      </div>

      <div class="space-y-1 text-[11px] leading-snug text-slate-100">
        <p v-for="row in statRows" :key="row.label">
          <span class="font-semibold text-slate-300">{{ row.label }}:</span>
          {{ row.value }}
        </p>
      </div>

      <div v-if="bonusDescriptions.length > 0" class="mt-2 border-t border-slate-700 pt-2">
        <p class="mb-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
          Buffs applied
        </p>
        <p
          v-for="tip in bonusDescriptions"
          :key="tip"
          class="text-[10px] leading-snug text-slate-200"
        >
          {{ tip }}
        </p>
      </div>

      <p v-if="infusionLabel" class="mt-2 border-t border-slate-700 pt-2 text-[10px] text-slate-300">
        {{ infusionLabel }}
      </p>
      <p v-if="showTarget && targetName" class="mt-2 text-[10px] text-slate-400">
        Target: {{ targetName }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";
import type { BattlePartyMember } from "@elementary-dices/shared";
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
  infusionLabel?: string;
}>();
const { t } = useI18n();

const ELEMENT_CONFIG: Record<
  string,
  { emoji: string; hp: string; empty: string; inner: string; fallback: string; pip: string }
> = {
  fire: {
    emoji: "🔥",
    hp: "#ef4444",
    empty: "rgba(239,68,68,0.18)",
    inner: "border-red-500/50",
    fallback: "bg-red-500/15 text-red-300",
    pip: "bg-red-500 text-white",
  },
  water: {
    emoji: "💧",
    hp: "#3b82f6",
    empty: "rgba(59,130,246,0.18)",
    inner: "border-blue-500/50",
    fallback: "bg-blue-500/15 text-blue-300",
    pip: "bg-blue-500 text-white",
  },
  earth: {
    emoji: "⛰️",
    hp: "#d97706",
    empty: "rgba(217,119,6,0.18)",
    inner: "border-amber-600/50",
    fallback: "bg-amber-600/15 text-amber-200",
    pip: "bg-amber-600 text-white",
  },
  air: {
    emoji: "💨",
    hp: "#22d3ee",
    empty: "rgba(34,211,238,0.18)",
    inner: "border-cyan-400/50",
    fallback: "bg-cyan-400/15 text-cyan-200",
    pip: "bg-cyan-500 text-white",
  },
  lightning: {
    emoji: "⚡",
    hp: "#facc15",
    empty: "rgba(250,204,21,0.18)",
    inner: "border-yellow-400/50",
    fallback: "bg-yellow-400/15 text-yellow-200",
    pip: "bg-yellow-400 text-slate-950",
  },
};

const elementConfig = computed(() => ELEMENT_CONFIG[props.member.element]);
const fallbackInitial = computed(() => props.member.name.trim().charAt(0) || "?");

const healthPct = computed(() => {
  if (props.member.max_health <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, (props.member.current_health / props.member.max_health) * 100),
  );
});

const healthColor = computed(() => {
  if (props.member.is_destroyed || healthPct.value <= 30) return "#ef4444";
  if (healthPct.value <= 60) return "#eab308";
  return elementConfig.value?.hp ?? "#10b981";
});

const healthRingStyle = computed<CSSProperties>(() => {
  const empty = elementConfig.value?.empty ?? "rgba(148,163,184,0.22)";
  return {
    background: `conic-gradient(${healthColor.value} ${healthPct.value}%, ${empty} 0)`,
  };
});

const avatarInnerClass = computed(
  () => elementConfig.value?.inner ?? "border-slate-500/50",
);
const fallbackAvatarClass = computed(
  () => elementConfig.value?.fallback ?? "bg-slate-600/20 text-slate-200",
);

const modifiers = computed(
  () =>
    props.member.battle_modifiers ?? {
      damage_pct: 0,
      armor_pct: 0,
      dodge_pct: 0,
      double_attack_pct: 0,
    },
);

const formatNumber = (value: number) => Math.round(value).toString();
const formatPct = (value: number) => `${Math.round(value * 100)}%`;

const baseAttackBonus = computed(() =>
  Math.max(0, props.member.current_attack - props.member.base_attack),
);
const fireAttackBonus = computed(() =>
  Math.max(0, props.member.current_attack * modifiers.value.damage_pct),
);
const effectiveAttack = computed(() =>
  Math.round(props.member.current_attack + fireAttackBonus.value),
);

const attackValue = computed(() => {
  const parts: string[] = [];
  if (baseAttackBonus.value > 0) {
    parts.push(
      `${formatNumber(baseAttackBonus.value)} from ${props.member.element} attack bonus`,
    );
  }
  if (fireAttackBonus.value > 0) {
    parts.push(`${formatNumber(fireAttackBonus.value)} from fire bonus`);
  }
  if (parts.length === 0) return formatNumber(effectiveAttack.value);
  return `${formatNumber(effectiveAttack.value)} (${formatNumber(props.member.base_attack)} + ${parts.join(" + ")})`;
});

const upcomingHeal = computed(() => {
  if (props.infusionElement !== "water") return 0;
  return Math.round(props.member.current_attack * 0.5);
});

const statRows = computed(() => [
  {
    label: "Health",
    value: `${formatNumber(props.member.current_health)}/${formatNumber(props.member.max_health)}`,
  },
  { label: "Attack", value: attackValue.value },
  { label: "Defence", value: formatPct(modifiers.value.armor_pct) },
  { label: "Double Attack", value: formatPct(modifiers.value.double_attack_pct) },
  { label: "Upcoming Heal", value: formatNumber(upcomingHeal.value) },
  { label: "Evasion", value: formatPct(modifiers.value.dodge_pct) },
]);

const bonusDescriptions = computed(() => {
  const tips: string[] = [];
  if (baseAttackBonus.value > 0) {
    tips.push(
      `${props.member.element} attack bonus: ${formatNumber(props.member.base_attack)} -> ${formatNumber(props.member.current_attack)} attack.`,
    );
  }
  if (modifiers.value.damage_pct > 0) {
    tips.push(
      `Fire bonus: +${formatPct(modifiers.value.damage_pct)} damage before weakness and defence.`,
    );
  }
  if (modifiers.value.armor_pct > 0) {
    tips.push(`Earth bonus: ${formatPct(modifiers.value.armor_pct)} incoming damage reduction.`);
  }
  if (modifiers.value.dodge_pct > 0) {
    tips.push(`Air bonus: ${formatPct(modifiers.value.dodge_pct)} chance to avoid attacks.`);
  }
  if (modifiers.value.double_attack_pct > 0) {
    tips.push(
      `Lightning bonus: ${formatPct(modifiers.value.double_attack_pct)} chance to attack twice.`,
    );
  }
  if (upcomingHeal.value > 0) {
    tips.push(`Water assignment: heals ${formatNumber(upcomingHeal.value)} HP on commit.`);
  }
  return tips;
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
  fire: "shadow-[0_0_18px_rgba(239,68,68,0.45)]",
  water: "shadow-[0_0_18px_rgba(59,130,246,0.45)]",
  earth: "shadow-[0_0_18px_rgba(150,75,0,0.4)]",
  air: "shadow-[0_0_18px_rgba(34,197,94,0.45)]",
  lightning: "shadow-[0_0_18px_rgba(250,204,21,0.5)]",
};

const infusionTheme = computed(() => {
  if (!props.infusionElement) return null;
  return INFUSION_THEME[props.infusionElement] ?? null;
});

const infusionContainerClass = computed(() => infusionTheme.value ?? "");
const infusionEmoji = computed(() => {
  if (!props.infusionElement) return "";
  return ELEMENT_CONFIG[props.infusionElement]?.emoji ?? "";
});
const infusionPipClass = computed(
  () => ELEMENT_CONFIG[props.infusionElement ?? ""]?.pip ?? "bg-muted text-foreground",
);

</script>
