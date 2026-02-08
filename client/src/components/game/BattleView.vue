<template>
  <div class="battle-view bg-gradient-to-br from-background to-muted rounded-lg border-2 border-border overflow-hidden">
    <!-- Battle Header -->
    <div class="bg-black/30 p-4 border-b border-border">
      <div class="flex items-center justify-between">
        <div class="text-lg font-bold">
          {{ battleType === 'wild_encounter' ? '🌲 Wild Encounter' : '⚔️ PvP Battle' }}
        </div>
        <div v-if="battleStatus" class="flex items-center gap-2">
          <span
            class="text-xs px-3 py-1 rounded-full font-bold"
            :class="statusBadgeClass"
          >
            {{ battleStatus }}
          </span>
        </div>
      </div>

      <!-- Battle Odds -->
      <div v-if="showOdds && battleOdds" class="mt-2 flex items-center gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">Win Chance:</span>
          <span class="font-bold text-green-600">{{ battleOdds.playerWinChance }}%</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">Power:</span>
          <span class="font-mono">{{ battleOdds.playerPower }} vs {{ battleOdds.opponentPower }}</span>
        </div>
      </div>
    </div>

    <!-- Battle Arena -->
    <div class="p-6">
      <div class="grid grid-cols-3 gap-4 items-center">
        <!-- Player Side -->
        <div class="space-y-3">
          <div class="text-center font-bold text-primary">Your Team</div>
          <div v-if="playerElemental && playerElementalData" class="space-y-2">
            <ElementalCard
              :elemental="playerElementalData"
              :stats="playerElemental.current_stats"
              compact
            />
            <!-- Health Bar -->
            <div class="bg-muted rounded-full h-3 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500"
                :style="{ width: `${playerHealthPercent}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Battle Center -->
        <div class="flex flex-col items-center justify-center gap-4">
          <!-- VS Badge -->
          <div class="text-4xl font-bold text-muted-foreground">VS</div>

          <!-- Current Round -->
          <div v-if="currentRound > 0" class="text-center">
            <div class="text-xs text-muted-foreground">Round</div>
            <div class="text-2xl font-bold">{{ currentRound }}</div>
          </div>

          <!-- Battle Actions -->
          <div v-if="showActions" class="flex flex-col gap-2">
            <button
              @click="handleFight"
              :disabled="isBattling"
              class="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {{ isBattling ? 'Fighting...' : '⚔️ Fight' }}
            </button>

            <button
              v-if="canFlee"
              @click="handleFlee"
              :disabled="isBattling"
              class="px-6 py-2 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              🏃 Flee
            </button>

            <button
              v-if="canCapture"
              @click="handleCapture"
              :disabled="isBattling || !hasCaptureItem"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              🎯 Capture
            </button>
          </div>
        </div>

        <!-- Opponent Side -->
        <div class="space-y-3">
          <div class="text-center font-bold text-destructive">{{ opponentLabel }}</div>
          <div v-if="opponentElemental && opponentElementalData" class="space-y-2">
            <ElementalCard
              :elemental="opponentElementalData"
              :stats="opponentElemental.current_stats"
              compact
            />
            <!-- Health Bar -->
            <div class="bg-muted rounded-full h-3 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500"
                :style="{ width: `${opponentHealthPercent}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Battle Log -->
    <div v-if="battleLog && battleLog.length > 0" class="border-t border-border">
      <div class="p-4 max-h-48 overflow-y-auto bg-black/20">
        <div class="text-xs font-bold text-muted-foreground mb-2">Battle Log</div>
        <div class="space-y-1">
          <div
            v-for="(log, index) in battleLog"
            :key="index"
            class="text-sm font-mono"
            :class="{
              'text-green-600': log.includes('Victory') || log.includes('wins'),
              'text-red-600': log.includes('Defeat') || log.includes('defeat'),
              'text-blue-600': log.includes('attacks') || log.includes('damage'),
              'text-muted-foreground': log.includes('Round')
            }"
          >
            {{ log }}
          </div>
        </div>
      </div>
    </div>

    <!-- Battle Result -->
    <div
      v-if="battleResult"
      class="p-6 border-t border-border"
      :class="{
        'bg-green-600/20': battleResult.winner === 'player',
        'bg-red-600/20': battleResult.winner === 'opponent',
        'bg-gray-600/20': battleResult.winner === 'draw'
      }"
    >
      <div class="text-center space-y-3">
        <div class="text-3xl font-bold">
          {{ battleResult.winner === 'player' ? '🎉 Victory!' : battleResult.winner === 'opponent' ? '💀 Defeat!' : '🤝 Draw!' }}
        </div>
        <div class="text-lg">{{ battleResult.summary }}</div>

        <!-- Rewards (if any) -->
        <slot name="rewards" />

        <!-- Continue Button -->
        <button
          @click="handleContinue"
          class="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PlayerElementalSchema, ElementalSchema, EncounterType } from '@elementary-dices/shared/schemas';
import { useBattle, type BattleParticipant, type BattleResult } from '@/composables/useBattle';
import ElementalCard from './ElementalCard.vue';

interface Props {
  // Battle participants
  playerElemental: typeof PlayerElementalSchema.static;
  playerElementalData: typeof ElementalSchema.static;
  opponentElemental: typeof PlayerElementalSchema.static;
  opponentElementalData: typeof ElementalSchema.static;

  // Battle config
  battleType: typeof EncounterType.static;
  battleStatus?: 'pending' | 'in_progress' | 'completed';
  opponentLabel?: string;

  // UI options
  showOdds?: boolean;
  showActions?: boolean;
  canFlee?: boolean;
  canCapture?: boolean;
  hasCaptureItem?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  battleStatus: 'pending',
  opponentLabel: 'Wild Elemental',
  showOdds: true,
  showActions: true,
  canFlee: true,
  canCapture: true,
  hasCaptureItem: false,
});

const emit = defineEmits<{
  fight: [];
  flee: [];
  capture: [];
  continue: [];
  battleComplete: [result: BattleResult];
}>();

const { simulateBattle, calculateBattleOdds, battleLog: composableBattleLog } = useBattle();

const isBattling = ref(false);
const currentRound = ref(0);
const battleResult = ref<BattleResult | null>(null);
const battleLog = ref<string[]>([]);

const playerHealthPercent = ref(100);
const opponentHealthPercent = ref(100);

// Calculate battle odds
const battleOdds = computed(() => {
  const playerParty: BattleParticipant[] = [{
    playerElemental: props.playerElemental,
    elemental: props.playerElementalData
  }];

  const opponentParty: BattleParticipant[] = [{
    playerElemental: props.opponentElemental,
    elemental: props.opponentElementalData
  }];

  return calculateBattleOdds(playerParty, opponentParty);
});

// Status badge styling
const statusBadgeClass = computed(() => {
  const classes: Record<string, string> = {
    pending: 'bg-yellow-600 text-white',
    in_progress: 'bg-blue-600 text-white',
    completed: 'bg-green-600 text-white',
  };
  return props.battleStatus ? classes[props.battleStatus] : '';
});

// Event handlers
const handleFight = async () => {
  isBattling.value = true;
  emit('fight');

  // Simulate battle
  await new Promise(resolve => setTimeout(resolve, 500));

  const playerParty: BattleParticipant[] = [{
    playerElemental: props.playerElemental,
    elemental: props.playerElementalData
  }];

  const opponentParty: BattleParticipant[] = [{
    playerElemental: props.opponentElemental,
    elemental: props.opponentElementalData
  }];

  const result = simulateBattle(playerParty, opponentParty);
  battleResult.value = result;
  battleLog.value = composableBattleLog.value;

  // Update health bars
  if (result.rounds.length > 0) {
    const lastRound = result.rounds[result.rounds.length - 1];
    currentRound.value = lastRound.round;

    const maxPlayerHealth = props.playerElementalData.base_stats.health;
    const maxOpponentHealth = props.opponentElementalData.base_stats.health;

    playerHealthPercent.value = (lastRound.playerHealthRemaining / maxPlayerHealth) * 100;
    opponentHealthPercent.value = (lastRound.opponentHealthRemaining / maxOpponentHealth) * 100;
  }

  isBattling.value = false;
};

const handleFlee = () => {
  emit('flee');
};

const handleCapture = () => {
  emit('capture');
};

const handleContinue = () => {
  emit('continue');
};
</script>

<style scoped>
.battle-view {
  min-height: 500px;
}
</style>
