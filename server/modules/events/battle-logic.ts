/**
 * Pure battle mechanics functions for the 3-phase battle system.
 *
 * Element weakness cycle: W -> F -> A -> E -> W
 *   Water beats Fire, Fire beats Air, Air beats Earth, Earth beats Water
 *   Lightning has no passive bonuses or weaknesses.
 *
 * Power system: level * 10 (level 1 = 10, level 2 = 20, etc.)
 */

export type ElementType = "fire" | "water" | "earth" | "air" | "lightning";

export interface BattlePartyMember {
  player_elemental_id?: string; // only for player's party
  elemental_id: string;
  name: string;
  element: ElementType;
  level: number;
  base_power: number;
  current_power: number;
  target_index: number;
}

export interface BattleRoll {
  turn: number;
  side: "player" | "opponent";
  dice_type_id?: string;
  dice_element: ElementType;
  outcome: "crit_success" | "success" | "fail" | "crit_fail";
  bonus_applied: number;
  affected_element: ElementType | "all_others";
  roll_value?: number;
}

export interface BattleState {
  phase: "targeting" | "rolling" | "resolved";
  player_party: BattlePartyMember[];
  opponent_party: BattlePartyMember[];
  rolls: BattleRoll[];
  current_turn: number;
  player_rolls_done: number;
  opponent_rolls_done: number;
  winner?: "player" | "opponent" | "draw";
  player_total_power?: number;
  opponent_total_power?: number;
}

// Element weakness cycle: each key beats its value
const ELEMENT_BEATS: Record<string, ElementType> = {
  water: "fire",
  fire: "air",
  air: "earth",
  earth: "water",
};

// Reverse: what beats the given element
const ELEMENT_BEATEN_BY: Record<string, ElementType> = {
  fire: "water",
  air: "fire",
  earth: "air",
  water: "earth",
};

/**
 * Check if attackerElement beats defenderElement in the cycle.
 */
export function hasAdvantage(
  attackerElement: string,
  defenderElement: string,
): boolean {
  return ELEMENT_BEATS[attackerElement] === defenderElement;
}

/**
 * Get the element that counters (beats) the given element.
 * Used for dice fail mechanics: fire dice fail → water gets buffed.
 */
export function getCounterElement(element: string): ElementType | null {
  return ELEMENT_BEATEN_BY[element] ?? null;
}

/**
 * Phase 1: Compute target assignments for both parties.
 * Each elemental picks the best opponent target, prioritizing element advantage.
 * Assignments are greedy (first-come-first-served for advantage targets).
 */
export function computeTargetAssignments(
  playerParty: BattlePartyMember[],
  opponentParty: BattlePartyMember[],
): { playerParty: BattlePartyMember[]; opponentParty: BattlePartyMember[] } {
  const assignedPlayer = assignTargets(playerParty, opponentParty);
  const assignedOpponent = assignTargets(opponentParty, playerParty);
  return { playerParty: assignedPlayer, opponentParty: assignedOpponent };
}

function assignTargets(
  attackers: BattlePartyMember[],
  defenders: BattlePartyMember[],
): BattlePartyMember[] {
  // Track which defender indices have been claimed by advantage
  const claimedByAdvantage = new Set<number>();

  // First pass: assign attackers that have advantage over a defender
  const result = attackers.map((attacker) => ({ ...attacker, target_index: -1 }));

  // Sort attackers: those with advantage matchups first
  const attackerIndices = result
    .map((_, i) => i)
    .sort((a, b) => {
      const aHasAdv = defenders.some((d) => hasAdvantage(result[a].element, d.element));
      const bHasAdv = defenders.some((d) => hasAdvantage(result[b].element, d.element));
      if (aHasAdv && !bHasAdv) return -1;
      if (!aHasAdv && bHasAdv) return 1;
      return 0;
    });

  for (const ai of attackerIndices) {
    const attacker = result[ai];

    // Try to find an unclaimed defender with advantage
    let bestTarget = -1;
    for (let di = 0; di < defenders.length; di++) {
      if (!claimedByAdvantage.has(di) && hasAdvantage(attacker.element, defenders[di].element)) {
        bestTarget = di;
        claimedByAdvantage.add(di);
        break;
      }
    }

    if (bestTarget === -1) {
      // No advantage target available, pick a random unclaimed one, or any
      const unclaimed = defenders
        .map((_, i) => i)
        .filter((i) => !claimedByAdvantage.has(i));
      if (unclaimed.length > 0) {
        bestTarget = unclaimed[Math.floor(Math.random() * unclaimed.length)];
      } else {
        // All claimed, just pick random
        bestTarget = Math.floor(Math.random() * defenders.length);
      }
    }

    result[ai].target_index = bestTarget;
  }

  return result;
}

/**
 * Apply the +10% power bonus for elementals that have advantage over their target.
 */
export function applyAdvantageBonuses(
  playerParty: BattlePartyMember[],
  opponentParty: BattlePartyMember[],
): { playerParty: BattlePartyMember[]; opponentParty: BattlePartyMember[] } {
  const updatedPlayer = playerParty.map((attacker) => {
    const target = opponentParty[attacker.target_index];
    if (target && hasAdvantage(attacker.element, target.element)) {
      return {
        ...attacker,
        current_power: Math.round(attacker.base_power * 1.1),
      };
    }
    return { ...attacker };
  });

  const updatedOpponent = opponentParty.map((attacker) => {
    const target = playerParty[attacker.target_index];
    if (target && hasAdvantage(attacker.element, target.element)) {
      return {
        ...attacker,
        current_power: Math.round(attacker.base_power * 1.1),
      };
    }
    return { ...attacker };
  });

  return { playerParty: updatedPlayer, opponentParty: updatedOpponent };
}

/**
 * Phase 2: Apply the effect of a dice roll to the battle state.
 * Buffs apply to ALL elementals of the affected element on BOTH sides.
 *
 * Non-lightning dice:
 *   crit_success → full bonus_multiplier to dice's element
 *   success → half bonus_multiplier to dice's element
 *   fail → half bonus_multiplier to counter element
 *   crit_fail → full bonus_multiplier to counter element
 *
 * Lightning dice:
 *   crit_success → full bonus to lightning
 *   success → half bonus to lightning
 *   fail → quarter bonus to ALL other elements
 *   crit_fail → half bonus to ALL other elements
 */
export function applyDiceRollEffect(
  state: BattleState,
  diceElement: ElementType,
  outcome: "crit_success" | "success" | "fail" | "crit_fail",
  bonusMultiplier: number,
): {
  state: BattleState;
  affectedElement: ElementType | "all_others";
  bonusApplied: number;
} {
  let affectedElement: ElementType | "all_others";
  let bonusApplied: number;

  if (diceElement === "lightning") {
    // Lightning special rules
    if (outcome === "crit_success") {
      affectedElement = "lightning";
      bonusApplied = bonusMultiplier;
    } else if (outcome === "success") {
      affectedElement = "lightning";
      bonusApplied = bonusMultiplier / 2;
    } else if (outcome === "fail") {
      affectedElement = "all_others";
      bonusApplied = bonusMultiplier / 4;
    } else {
      // crit_fail
      affectedElement = "all_others";
      bonusApplied = bonusMultiplier / 2;
    }
  } else {
    // Normal element dice
    const counterElement = getCounterElement(diceElement);

    if (outcome === "crit_success") {
      affectedElement = diceElement;
      bonusApplied = bonusMultiplier;
    } else if (outcome === "success") {
      affectedElement = diceElement;
      bonusApplied = bonusMultiplier / 2;
    } else if (outcome === "fail") {
      affectedElement = counterElement ?? diceElement;
      bonusApplied = bonusMultiplier / 2;
    } else {
      // crit_fail
      affectedElement = counterElement ?? diceElement;
      bonusApplied = bonusMultiplier;
    }
  }

  // Apply buff to ALL matching elementals on BOTH sides
  const buffParty = (party: BattlePartyMember[]) =>
    party.map((member) => {
      if (affectedElement === "all_others") {
        // Lightning fail: buff all non-lightning elements
        if (member.element !== "lightning") {
          return {
            ...member,
            current_power: member.current_power + bonusApplied,
          };
        }
      } else if (member.element === affectedElement) {
        return {
          ...member,
          current_power: member.current_power + bonusApplied,
        };
      }
      return { ...member };
    });

  const newState: BattleState = {
    ...state,
    player_party: buffParty(state.player_party),
    opponent_party: buffParty(state.opponent_party),
  };

  return { state: newState, affectedElement, bonusApplied };
}

/**
 * Calculate total power for a party (sum of all current_power values).
 */
export function calculateTotalPower(party: BattlePartyMember[]): number {
  return party.reduce((sum, member) => sum + member.current_power, 0);
}

/**
 * Determine the battle winner based on total party powers.
 */
export function determineBattleWinner(
  state: BattleState,
): { winner: "player" | "opponent" | "draw"; playerTotal: number; opponentTotal: number } {
  const playerTotal = calculateTotalPower(state.player_party);
  const opponentTotal = calculateTotalPower(state.opponent_party);

  let winner: "player" | "opponent" | "draw";
  if (playerTotal > opponentTotal) {
    winner = "player";
  } else if (opponentTotal > playerTotal) {
    winner = "opponent";
  } else {
    winner = "draw";
  }

  return { winner, playerTotal, opponentTotal };
}

/**
 * AI strategy: pick the best element affinity for the opponent's dice roll.
 * Strategy: pick the element that has the most opponent elementals on the field,
 * to maximize the number of buffed units.
 */
export function pickOpponentDiceElement(state: BattleState): ElementType {
  // Count opponent elementals per element
  const elementCounts: Record<string, number> = {};
  for (const member of state.opponent_party) {
    elementCounts[member.element] = (elementCounts[member.element] || 0) + 1;
  }

  // Pick element with highest count in opponent party
  let bestElement: ElementType = state.opponent_party[0]?.element ?? "fire";
  let bestCount = 0;

  for (const [element, count] of Object.entries(elementCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestElement = element as ElementType;
    }
  }

  return bestElement;
}

/**
 * Simulate an AI dice roll outcome using equal 25% probability for each outcome.
 */
export function simulateAiRollOutcome(): "crit_success" | "success" | "fail" | "crit_fail" {
  const roll = Math.random();
  if (roll < 0.25) return "crit_success";
  if (roll < 0.5) return "success";
  if (roll < 0.75) return "fail";
  return "crit_fail";
}

/**
 * Build a BattlePartyMember from an elemental DB record.
 */
export function buildPartyMember(
  elemental: {
    id: string;
    name: string;
    element_types: string[];
    level: number;
  },
  playerElementalId?: string,
): BattlePartyMember {
  const power = elemental.level * 10;
  return {
    player_elemental_id: playerElementalId,
    elemental_id: elemental.id,
    name: elemental.name,
    element: (elemental.element_types[0] ?? "fire") as ElementType,
    level: elemental.level,
    base_power: power,
    current_power: power,
    target_index: -1,
  };
}
