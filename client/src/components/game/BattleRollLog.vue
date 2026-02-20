<template>
  <div class="battle-roll-log rounded-lg border border-border bg-card/50 p-3">
    <h4 class="text-sm font-bold text-muted-foreground mb-2">Battle Log</h4>

    <div v-if="rolls.length === 0" class="text-xs text-muted-foreground italic">
      No rolls yet...
    </div>

    <div
      v-else
      class="space-y-1.5 max-h-48 overflow-y-auto"
      ref="logContainer"
    >
      <div
        v-for="(roll, index) in rolls"
        :key="index"
        class="flex items-start gap-2 text-xs p-1.5 rounded transition-all duration-300"
        :class="[
          roll.side === 'player' ? 'bg-blue-500/5' : 'bg-red-500/5',
          index === rolls.length - 1 ? 'ring-1 ring-primary/30' : '',
        ]"
      >
        <!-- Turn number -->
        <span class="text-muted-foreground font-mono w-4 shrink-0">
          {{ roll.turn }}
        </span>

        <!-- Side indicator -->
        <span
          class="font-bold w-12 shrink-0"
          :class="roll.side === 'player' ? 'text-blue-400' : 'text-red-400'"
        >
          {{ roll.side === 'player' ? 'YOU' : 'OPP' }}
        </span>

        <!-- Dice element -->
        <span class="shrink-0">{{ getElementEmoji(roll.dice_element) }}</span>

        <!-- Outcome -->
        <span
          class="font-bold shrink-0"
          :class="getOutcomeColor(roll.outcome)"
        >
          {{ getOutcomeShort(roll.outcome) }}
        </span>

        <!-- Effect -->
        <span class="text-muted-foreground">
          +{{ roll.bonus_applied.toFixed(1) }} to
          {{ roll.affected_element === 'all_others' ? 'all non-⚡' : getElementEmoji(roll.affected_element) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { BattleRollRecord } from '@/stores/event'

defineProps<{
  rolls: BattleRollRecord[]
}>()

const logContainer = ref<HTMLElement | null>(null)

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🪨',
  air: '💨',
  lightning: '⚡',
}

function getElementEmoji(element: string): string {
  return ELEMENT_EMOJIS[element] ?? '❓'
}

function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case 'crit_success': return 'text-green-400'
    case 'success': return 'text-blue-400'
    case 'fail': return 'text-yellow-500'
    case 'crit_fail': return 'text-red-500'
    default: return 'text-gray-400'
  }
}

function getOutcomeShort(outcome: string): string {
  switch (outcome) {
    case 'crit_success': return 'CRIT!'
    case 'success': return 'HIT'
    case 'fail': return 'MISS'
    case 'crit_fail': return 'FAIL!'
    default: return '???'
  }
}

// Auto-scroll to bottom when new rolls are added
watch(() => logContainer.value?.children.length, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
})
</script>
