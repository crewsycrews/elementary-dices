<template>
  <div class="battle-arena w-full">
    <div
      class="mb-3 grid gap-2 rounded-lg border border-border/70 bg-card/55 px-3 py-2 md:grid-cols-[1fr_auto_1fr] md:items-center"
    >
      <div class="min-w-0">
        <p v-if="phaseLabel" class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ phaseLabel }}
        </p>
        <p class="truncate text-sm font-semibold text-blue-500">
          {{ t("battle_arena.your_party") }}
          <span class="font-normal text-muted-foreground">
            {{ playerAliveCount }}/{{ playerParty.length }} {{ t("battle_arena.alive") }}
          </span>
        </p>
      </div>

      <div class="text-left md:text-center">
        <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {{ centerTitle || "VS" }}
        </p>
        <p v-if="statusLabel" class="text-sm font-semibold">
          {{ statusLabel }}
        </p>
      </div>

      <div class="min-w-0 md:text-right">
        <p class="truncate text-sm font-semibold text-red-500">
          {{ opponentName }}
          <span class="font-normal text-muted-foreground">
            {{ opponentAliveCount }}/{{ opponentParty.length }} {{ t("battle_arena.alive") }}
          </span>
        </p>
      </div>
    </div>

    <!-- Battle Grid: Player vs Opponent -->
    <div
      class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,18rem)_minmax(20rem,27rem)_minmax(0,18rem)] md:gap-4 md:items-start md:justify-center"
    >
      <!-- Player Party (Left on desktop, after actions on mobile) -->
      <div class="order-3 w-full space-y-1.5 md:order-1 md:max-w-[18rem] md:justify-self-end">
        <div class="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1.5">
          <h3 class="text-sm font-bold text-blue-500">{{ t("battle_arena.your_party") }}</h3>
          <p class="text-[11px] text-muted-foreground">
            {{ playerAliveCount }}/{{ playerParty.length }} {{ t("battle_arena.alive") }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
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
              :infusion-label="getInfusionLabel(index)"
            />
          </div>
        </div>
      </div>

      <!-- Center Actions -->
      <div class="order-2 flex min-w-0 flex-col items-center justify-start">
        <div v-if="showTargets && targetLines?.length" class="mb-3 w-full rounded-lg border border-border/70 bg-card/45 p-3 text-xs text-muted-foreground">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground">
            {{ t("battle_arena.target_plan") }}
          </p>
          <div v-for="line in targetLines" :key="line.fromIndex" class="flex items-center justify-between gap-2 border-t border-border/50 py-1.5 first:border-t-0">
            <span>{{ playerParty[line.fromIndex]?.name }}</span>
            <span class="text-muted-foreground">&#8594;</span>
            <span>{{ opponentParty[line.toIndex]?.name }}</span>
          </div>
        </div>
        <div v-if="slots.centerActions" class="flex w-full justify-center">
          <slot name="centerActions" />
        </div>
      </div>

      <!-- Opponent Party (Right on desktop, first on mobile) -->
      <div class="order-1 w-full space-y-1.5 md:order-3 md:max-w-[18rem] md:justify-self-start">
        <div class="flex items-center justify-between rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1.5">
          <h3 class="truncate text-sm font-bold text-red-500">{{ opponentName }}</h3>
          <p class="shrink-0 text-[11px] text-muted-foreground">
            {{ opponentAliveCount }}/{{ opponentParty.length }} {{ t("battle_arena.alive") }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
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
  phaseLabel?: string
  statusLabel?: string
  centerTitle?: string
  showTargets?: boolean
  buffedElement?: string | null
  playerDeployedIndices?: number[] | null
  opponentDeployedIndices?: number[] | null
  isPlayerPartyDroppable?: boolean
  highlightedPlayerIndices?: number[]
  playerInfusionElements?: Record<number, string[]>
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
  const assigned = props.playerInfusionElements?.[index] ?? []
  return assigned[assigned.length - 1] ?? null
}

function getInfusionLabel(index: number): string {
  const assigned = props.playerInfusionElements?.[index] ?? []
  if (assigned.length === 0) return ""
  return `${t("battle_arena.assigned_die")}: ${assigned.join(", ")}`
}
</script>
