import { ref, computed } from "vue";
import type {
  FarkleBattleState,
  FarkleDie,
  Combination,
  BattleResult,
} from "@/stores/event";

// Element display config
const ELEMENT_CONFIG: Record<
  string,
  { emoji: string; color: string; bgColor: string }
> = {
  fire: { emoji: "🔥", color: "text-red-500", bgColor: "bg-red-500/20" },
  water: { emoji: "💧", color: "text-blue-500", bgColor: "bg-blue-500/20" },
  earth: { emoji: "🏔️", color: "text-amber-600", bgColor: "bg-amber-600/20" },
  air: { emoji: "💨", color: "text-cyan-400", bgColor: "bg-cyan-400/20" },
  lightning: {
    emoji: "⚡",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
  },
};

const ALL_ELEMENTS = ["fire", "water", "earth", "air", "lightning"] as const;

const COMBINATION_LABELS: Record<string, string> = {
  doublet: "Doublet",
  triplet: "Triplet",
  quartet: "Quartet",
  quintet: "Quintet",
  all_for_one: "All-For-One",
  one_for_all: "One-For-All",
  full_house: "Full House",
};

export function useBattle() {
  // State
  const battleState = ref<FarkleBattleState | null>(null);
  const battleResult = ref<BattleResult | null>(null);
  const detectedCombinations = ref<Combination[]>([]);
  const isRolling = ref(false);
  const showingOpponentTurn = ref(false);

  // Computed from battle state
  const battlePhase = computed(() => battleState.value?.phase ?? null);
  const playerParty = computed(() => battleState.value?.player_party ?? []);
  const opponentParty = computed(() => battleState.value?.opponent_party ?? []);
  const currentTurn = computed(() => battleState.value?.current_turn ?? 1);
  const playerTurnsDone = computed(
    () => battleState.value?.player_turns_done ?? 0,
  );
  const opponentTurnsDone = computed(
    () => battleState.value?.opponent_turns_done ?? 0,
  );
  const playerBonusesTotal = computed(
    () => battleState.value?.player_bonuses_total ?? {},
  );
  const opponentBonusesTotal = computed(
    () => battleState.value?.opponent_bonuses_total ?? {},
  );
  const opponentTurnResult = computed(
    () => battleState.value?.opponent_turn_result ?? null,
  );

  // Farkle turn state
  const farkleTurnState = computed(
    () => battleState.value?.player_turn ?? null,
  );
  const farkleDice = computed(() => farkleTurnState.value?.dice ?? []);
  const activeCombinations = computed(
    () => farkleTurnState.value?.active_combinations ?? [],
  );
  const isDiceRush = computed(
    () => farkleTurnState.value?.is_dice_rush ?? false,
  );
  const isBusted = computed(() => farkleTurnState.value?.busted ?? false);

  const turnPhase = computed(() => farkleTurnState.value?.phase ?? null);

  const canRoll = computed(
    () =>
      battlePhase.value === "player_turn" &&
      (turnPhase.value === "initial_roll" || farkleTurnState.value === null),
  );

  const canEndTurn = computed(
    () => {
      if (battlePhase.value !== "player_turn" || !farkleTurnState.value) {
        return false;
      }
      return Boolean(farkleTurnState.value.can_commit) || isBusted.value;
    },
  );

  const totalPlayerPower = computed(() =>
    playerParty.value.reduce((sum, m) => sum + m.current_attack, 0),
  );

  const totalOpponentPower = computed(() =>
    opponentParty.value.reduce((sum, m) => sum + m.current_attack, 0),
  );

  // Target lines (from targeting phase)
  const targetLines = computed(() => {
    return playerParty.value.map((member, index) => {
      const target = opponentParty.value[member.target_index];
      return {
        fromIndex: index,
        toIndex: member.target_index,
        attackerElement: member.element,
        defenderElement: target?.element ?? "",
      };
    });
  });

  // Helpers
  function getElementConfig(element: string) {
    return ELEMENT_CONFIG[element] ?? ELEMENT_CONFIG.fire;
  }

  function getDieEmoji(die: FarkleDie): string {
    return getElementConfig(die.current_result).emoji;
  }

  function getCombinationLabel(combo: Combination): string {
    return COMBINATION_LABELS[combo.type] ?? combo.type;
  }

  function getCombinationBonusDescription(combo: Combination): string {
    const parts = Object.entries(combo.bonuses)
      .filter(([, pct]) => pct > 0)
      .map(
        ([el, pct]) =>
          `${getElementConfig(el).emoji} +${Math.round(pct * 100)}%`,
      );
    return parts.join(" | ");
  }

  function getTotalBonusForElement(element: string): number {
    return playerBonusesTotal.value[element] ?? 0;
  }

  function getPartyElementsPresent(): string[] {
    const elements = new Set(playerParty.value.map((m) => m.element));
    return ALL_ELEMENTS.filter((e) => elements.has(e));
  }

  // Actions
  function initFromState(state: FarkleBattleState) {
    battleState.value = state;
  }

  function updateFromTurnResult(data: {
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved?: boolean;
    result?: BattleResult | null;
  }) {
    battleState.value = data.battle_state;
    detectedCombinations.value = data.detected_combinations ?? [];

    if (data.is_resolved && data.result) {
      battleResult.value = data.result;
    }
  }

  function reset() {
    battleState.value = null;
    battleResult.value = null;
    detectedCombinations.value = [];
    isRolling.value = false;
    showingOpponentTurn.value = false;
  }

  return {
    // State
    battleState,
    battleResult,
    detectedCombinations,
    isRolling,
    showingOpponentTurn,
    // Computed
    battlePhase,
    playerParty,
    opponentParty,
    currentTurn,
    playerTurnsDone,
    opponentTurnsDone,
    playerBonusesTotal,
    opponentBonusesTotal,
    opponentTurnResult,
    farkleTurnState,
    farkleDice,
    activeCombinations,
    isDiceRush,
    isBusted,
    turnPhase,
    canRoll,
    canEndTurn,
    totalPlayerPower,
    totalOpponentPower,
    targetLines,
    // Helpers
    getElementConfig,
    getDieEmoji,
    getCombinationLabel,
    getCombinationBonusDescription,
    getTotalBonusForElement,
    getPartyElementsPresent,
    // Actions
    initFromState,
    updateFromTurnResult,
    reset,
    // Constants
    ELEMENT_CONFIG,
    ALL_ELEMENTS,
  };
}
