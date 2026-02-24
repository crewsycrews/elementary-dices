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
  result_element: ElementType;
  bonus_applied: number;
  affected_element: ElementType | "all_others" | string;
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

/**
 * Phase 1: Compute target assignments for both parties.
 * Targets are assigned randomly (no element advantage system).
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
  // Randomly assign each attacker to a defender
  const result = attackers.map((attacker) => ({ ...attacker, target_index: -1 }));
  const assigned = new Set<number>();

  for (let i = 0; i < result.length; i++) {
    const unassigned = defenders
      .map((_, idx) => idx)
      .filter((idx) => !assigned.has(idx));

    if (unassigned.length > 0) {
      const target = unassigned[Math.floor(Math.random() * unassigned.length)];
      result[i].target_index = target;
      assigned.add(target);
    } else {
      // More attackers than defenders — pick random
      result[i].target_index = Math.floor(Math.random() * defenders.length);
    }
  }

  return result;
}

// Element advantage system removed — no more Water beats Fire cycle.
// Phase 2 (Farkle) will add new dice combination-based buff mechanics.

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
