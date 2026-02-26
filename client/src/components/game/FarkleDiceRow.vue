<template>
  <div class="flex justify-center gap-3">
    <div
      v-for="(die, index) in dice"
      :key="index"
      @click="!die.is_set_aside && $emit('toggle-select', index)"
      class="relative flex flex-col items-center gap-1 cursor-pointer select-none"
      :class="getDieClasses(die, index)"
    >
      <!-- Die face -->
      <div
        class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl border-2 transition-all duration-200"
        :class="getDieFaceClasses(die, index)"
      >
        {{ getElementEmoji(die.current_result) }}
      </div>

      <!-- Dice notation label -->
      <span class="text-xs font-mono text-muted-foreground">{{ die.dice_notation }}</span>

      <!-- Set-aside lock badge -->
      <div
        v-if="die.is_set_aside"
        class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
      >
        ✓
      </div>

      <!-- Selected-for-reroll badge -->
      <div
        v-else-if="props.selectedIndices?.includes(index)"
        class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
      >
        ↺
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FarkleDie } from '@/stores/event'

const props = defineProps<{
  dice: FarkleDie[]
  selectedIndices?: number[]  // which dice are selected for reroll
  highlightIndices?: number[] // which dice are part of a highlighted combo
}>()

defineEmits<{
  'toggle-select': [index: number]
}>()

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🪨',
  air: '💨',
  lightning: '⚡',
}

function getElementEmoji(element: string): string {
  return ELEMENT_EMOJIS[element] ?? '🎲'
}

function getDieClasses(die: FarkleDie, index: number): string {
  if (die.is_set_aside) return 'opacity-60 cursor-default'
  return 'hover:scale-105 active:scale-95'
}

function getDieFaceClasses(die: FarkleDie, index: number): string {
  if (die.is_set_aside) {
    return 'border-green-500 bg-green-500/10'
  }
  if (props.selectedIndices?.includes(index)) {
    return 'border-yellow-400 bg-yellow-400/20 scale-105'
  }
  if (props.highlightIndices?.includes(index)) {
    return 'border-purple-400 bg-purple-400/20'
  }
  return 'border-border bg-card hover:border-primary/50'
}
</script>
