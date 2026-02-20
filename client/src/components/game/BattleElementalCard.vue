<template>
  <div
    class="battle-elemental-card rounded-lg border-2 p-3 transition-all duration-300"
    :class="[
      borderColorClass,
      isBuffed ? 'ring-2 ring-green-400 animate-pulse' : '',
      isTargeted ? 'ring-2 ring-red-400' : '',
    ]"
  >
    <!-- Element + Level Badge -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-xl">{{ elementEmoji }}</span>
      <span class="text-xs font-bold bg-black/60 text-white px-2 py-0.5 rounded">
        Lv.{{ member.level }}
      </span>
    </div>

    <!-- Name -->
    <h4 class="font-bold text-sm truncate mb-2">{{ member.name }}</h4>

    <!-- Power Display -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">Power</span>
      <div class="flex items-center gap-1">
        <span
          class="font-bold text-lg transition-all duration-500"
          :class="powerChangeClass"
        >
          {{ displayPower }}
        </span>
        <span
          v-if="powerDiff !== 0"
          class="text-xs font-bold"
          :class="powerDiff > 0 ? 'text-green-400' : 'text-red-400'"
        >
          {{ powerDiff > 0 ? '+' : '' }}{{ powerDiff.toFixed(1) }}
        </span>
      </div>
    </div>

    <!-- Target Arrow Indicator -->
    <div v-if="showTarget && targetName" class="mt-2 pt-2 border-t border-border">
      <div class="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{{ hasAdvantage ? '⚔️' : '→' }}</span>
        <span :class="hasAdvantage ? 'text-green-400 font-bold' : ''">
          {{ targetName }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BattlePartyMember } from '@/stores/event'

const props = defineProps<{
  member: BattlePartyMember
  isBuffed?: boolean
  isTargeted?: boolean
  showTarget?: boolean
  targetName?: string
  hasAdvantage?: boolean
}>()

const ELEMENT_CONFIG: Record<string, { emoji: string; borderColor: string }> = {
  fire: { emoji: '🔥', borderColor: 'border-red-500/60' },
  water: { emoji: '💧', borderColor: 'border-blue-500/60' },
  earth: { emoji: '🪨', borderColor: 'border-amber-600/60' },
  air: { emoji: '💨', borderColor: 'border-cyan-400/60' },
  lightning: { emoji: '⚡', borderColor: 'border-yellow-400/60' },
}

const elementEmoji = computed(() =>
  ELEMENT_CONFIG[props.member.element]?.emoji ?? '❓'
)

const borderColorClass = computed(() =>
  ELEMENT_CONFIG[props.member.element]?.borderColor ?? 'border-gray-500/60'
)

const displayPower = computed(() => props.member.current_power.toFixed(1))

const powerDiff = computed(() =>
  props.member.current_power - props.member.base_power
)

const previousPower = ref(props.member.current_power)
const powerChangeClass = ref('')

watch(() => props.member.current_power, (newVal, oldVal) => {
  if (newVal > oldVal) {
    powerChangeClass.value = 'text-green-400 scale-110'
  } else if (newVal < oldVal) {
    powerChangeClass.value = 'text-red-400 scale-110'
  }
  setTimeout(() => {
    powerChangeClass.value = ''
  }, 600)
  previousPower.value = newVal
})
</script>
