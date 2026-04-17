<template>
  <div class="battle-arena w-full">
    <!-- Battle Grid: Player vs Opponent -->
    <div class="grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_auto_minmax(0,18rem)] gap-3 md:gap-4 items-start justify-center">
      <!-- Player Party (Left) -->
      <div class="w-full md:max-w-[18rem] md:justify-self-end space-y-1.5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-bold text-blue-400">{{ t("battle_arena.your_party") }}</h3>
          <div class="text-right">
            <p class="text-[11px] text-muted-foreground">
              {{ playerAliveCount }}/{{ playerParty.length }} {{ t("battle_arena.alive") }}
            </p>
          </div>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="(member, index) in playerParty"
            :key="member.elemental_id + '-' + index"
            @dragover.prevent="isPlayerPartyDroppable && !member.is_destroyed"
            @drop.prevent="handlePlayerPartyDrop(index)"
            :class="isPlayerPartyDroppable && !member.is_destroyed ? 'rounded-lg ring-1 ring-transparent transition-colors' : ''"
          >
            <BattleElementalCard
              :member="member"
              :is-buffed="isElementBuffed(member.element)"
              :show-target="showTargets"
              :target-name="getTargetName(member, 'player')"
              :deployment-state="getDeploymentState(index, 'player')"
              :drop-highlight="isPlayerDropHighlighted(index)"
              :infusion-element="getInfusionElement(index)"
            />
          </div>
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
            <span class="text-muted-foreground">&#8594;</span>
            <span>{{ opponentParty[line.toIndex]?.name }}</span>
          </div>
        </div>
        <div v-if="slots.centerActions" class="mt-4 flex justify-center">
          <slot name="centerActions" />
        </div>
      </div>

      <!-- Opponent Party (Right) -->
      <div class="w-full md:max-w-[18rem] md:justify-self-start space-y-1.5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-bold text-red-400">{{ opponentName }}</h3>
          <div class="text-right">
            <p class="text-[11px] text-muted-foreground">
              {{ opponentAliveCount }}/{{ opponentParty.length }} {{ t("battle_arena.alive") }}
            </p>
          </div>
        </div>
        <div class="space-y-1.5">
          <BattleElementalCard
            v-for="(member, index) in opponentParty"
            :key="member.elemental_id + '-' + index"
            :member="member"
            :is-buffed="isElementBuffed(member.element)"
            :show-target="showTargets"
            :target-name="getTargetName(member, 'opponent')"
            :deployment-state="getDeploymentState(index, 'opponent')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import BattleElementalCard from './BattleElementalCard.vue'
import type { BattlePartyMember } from '@/stores/event'
import { useI18n } from '@/i18n'

const props = defineProps<{
  playerParty: BattlePartyMember[]
  opponentParty: BattlePartyMember[]
  opponentName: string
  showTargets?: boolean
  buffedElement?: string | null
  playerDeployedIndices?: number[] | null
  opponentDeployedIndices?: number[] | null
  isPlayerPartyDroppable?: boolean
  highlightedPlayerIndices?: number[]
  playerInfusionElements?: Record<number, string>
  targetLines?: Array<{
    fromIndex: number
    toIndex: number
    attackerElement: string
    defenderElement: string
  }>
}>()
const emit = defineEmits<{
  playerPartyDrop: [partyIndex: number]
}>()
const { t } = useI18n()

const slots = useSlots()

const playerAliveCount = computed(
  () => props.playerParty.filter((m) => !m.is_destroyed).length
)
const opponentAliveCount = computed(
  () => props.opponentParty.filter((m) => !m.is_destroyed).length
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

function getDeploymentState(
  index: number,
  side: 'player' | 'opponent'
): 'deployed' | 'bench' | null {
  const deployed =
    side === 'player'
      ? (props.playerDeployedIndices ?? [])
      : (props.opponentDeployedIndices ?? [])

  if (deployed.length === 0) {
    return null
  }
  return deployed.includes(index) ? 'deployed' : 'bench'
}

function handlePlayerPartyDrop(index: number): void {
  if (!props.isPlayerPartyDroppable) return
  emit('playerPartyDrop', index)
}

function isPlayerDropHighlighted(index: number): boolean {
  return (props.highlightedPlayerIndices ?? []).includes(index)
}

function getInfusionElement(index: number): string | null {
  return props.playerInfusionElements?.[index] ?? null
}
</script>
