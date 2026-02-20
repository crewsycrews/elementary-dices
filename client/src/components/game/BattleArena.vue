<template>
  <div class="battle-arena w-full">
    <!-- Battle Grid: Player vs Opponent -->
    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
      <!-- Player Party (Left) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-blue-400">Your Party</h3>
          <span class="text-sm font-bold text-blue-400">
            {{ totalPlayerPower.toFixed(1) }} PWR
          </span>
        </div>
        <div class="space-y-2">
          <BattleElementalCard
            v-for="(member, index) in playerParty"
            :key="member.elemental_id + '-' + index"
            :member="member"
            :is-buffed="isElementBuffed(member.element)"
            :show-target="showTargets"
            :target-name="getTargetName(member, 'player')"
            :has-advantage="hasAdvantageOver(member, 'player')"
          />
        </div>
      </div>

      <!-- VS / Center -->
      <div class="flex flex-col items-center justify-center py-8 px-4">
        <div class="text-4xl md:text-6xl font-black text-primary opacity-80">
          VS
        </div>
        <div v-if="showTargets" class="mt-4 text-xs text-muted-foreground text-center">
          <div v-for="line in targetLines" :key="line.fromIndex" class="flex items-center gap-1 mb-1">
            <span>{{ playerParty[line.fromIndex]?.name }}</span>
            <span :class="line.hasAdvantage ? 'text-green-400' : 'text-muted-foreground'">
              {{ line.hasAdvantage ? '⚔️→' : '→' }}
            </span>
            <span>{{ opponentParty[line.toIndex]?.name }}</span>
          </div>
        </div>
      </div>

      <!-- Opponent Party (Right) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-red-400">{{ opponentName }}</h3>
          <span class="text-sm font-bold text-red-400">
            {{ totalOpponentPower.toFixed(1) }} PWR
          </span>
        </div>
        <div class="space-y-2">
          <BattleElementalCard
            v-for="(member, index) in opponentParty"
            :key="member.elemental_id + '-' + index"
            :member="member"
            :is-buffed="isElementBuffed(member.element)"
            :show-target="showTargets"
            :target-name="getTargetName(member, 'opponent')"
            :has-advantage="hasAdvantageOver(member, 'opponent')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BattleElementalCard from './BattleElementalCard.vue'
import type { BattlePartyMember } from '@/stores/event'

const ELEMENT_BEATS: Record<string, string> = {
  water: 'fire',
  fire: 'air',
  air: 'earth',
  earth: 'water',
}

const props = defineProps<{
  playerParty: BattlePartyMember[]
  opponentParty: BattlePartyMember[]
  opponentName: string
  showTargets?: boolean
  buffedElement?: string | null
  targetLines?: Array<{
    fromIndex: number
    toIndex: number
    hasAdvantage: boolean
    attackerElement: string
    defenderElement: string
  }>
}>()

const totalPlayerPower = computed(() =>
  props.playerParty.reduce((sum, m) => sum + m.current_power, 0)
)

const totalOpponentPower = computed(() =>
  props.opponentParty.reduce((sum, m) => sum + m.current_power, 0)
)

function isElementBuffed(element: string): boolean {
  if (!props.buffedElement) return false
  if (props.buffedElement === 'all_others') return element !== 'lightning'
  return element === props.buffedElement
}

function getTargetName(member: BattlePartyMember, side: 'player' | 'opponent'): string {
  if (member.target_index < 0) return ''
  const targets = side === 'player' ? props.opponentParty : props.playerParty
  return targets[member.target_index]?.name ?? ''
}

function hasAdvantageOver(member: BattlePartyMember, side: 'player' | 'opponent'): boolean {
  if (member.target_index < 0) return false
  const targets = side === 'player' ? props.opponentParty : props.playerParty
  const target = targets[member.target_index]
  if (!target) return false
  return ELEMENT_BEATS[member.element] === target.element
}
</script>
