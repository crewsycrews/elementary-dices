/**
 * Pure battle mechanics functions for the v3 battle system.
 *
 * Combat is attack/health based.
 * Weakness bonus:
 *   Water -> Fire
 *   Fire -> Air
 *   Air -> Earth
 *   Earth -> Water
 * Lightning is neutral.
 */

export type ElementType = "fire" | "water" | "earth" | "air" | "lightning";

export interface BattlePartyMember {
  player_elemental_id?: string; // only for player's party
  elemental_id: string;
  name: string;
  element: ElementType;
  elements: ElementType[];
  level: number;
  base_attack: number;
  current_attack: number;
  max_health: number;
  current_health: number;
  is_destroyed: boolean;
  target_index: number;
}

export interface CombatLogEntry {
  [key: string]: unknown;
  round: number;
  step: number;
  side: "player" | "opponent";
  attacker_index: number;
  attacker_name: string;
  attacker_element: ElementType;
  target: "unit" | "player";
  defender_index?: number;
  defender_name?: string;
  defender_element?: ElementType;
  damage: number;
  weakness_bonus_applied: boolean;
  defender_remaining_health?: number;
  player_health_after: number;
  opponent_health_after: number;
}

export interface BattleState {
  phase: "targeting" | "choose_element" | "player_turn" | "resolved";
  player_party: BattlePartyMember[];
  opponent_party: BattlePartyMember[];
  current_turn: number; // battle round
  player_health: number;
  opponent_health: number;
  combat_log: CombatLogEntry[];
  winner?: "player" | "opponent" | "draw";
  player_total_attack?: number;
  opponent_total_attack?: number;
}

/**
 * Phase 1: Compute target assignments for both parties
 * prioritizing weakness exploitation.
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
  const result = attackers.map((attacker) => ({ ...attacker, target_index: -1 }));
  const aliveDefenders = defenders.map((_, idx) => idx);

  for (let i = 0; i < result.length; i += 1) {
    const attacker = result[i];
    const target = chooseTargetIndex(attacker.element, aliveDefenders, defenders);
    result[i].target_index = target;
  }

  return result;
}

const WEAKNESS_TARGET: Partial<Record<ElementType, ElementType>> = {
  water: "fire",
  fire: "air",
  air: "earth",
  earth: "water",
};

export function hasElementAdvantage(
  attacker: ElementType,
  defender: ElementType,
): boolean {
  return WEAKNESS_TARGET[attacker] === defender;
}

function chooseTargetIndex(
  attackerElement: ElementType,
  defenderIndices: number[],
  defenders: BattlePartyMember[],
): number {
  if (defenderIndices.length === 0) {
    return -1;
  }

  const weaknessTargets = defenderIndices.filter((idx) =>
    hasElementAdvantage(attackerElement, defenders[idx].element),
  );

  const pool = weaknessTargets.length > 0 ? weaknessTargets : defenderIndices;
  return pool.sort((a, b) => defenders[a].current_health - defenders[b].current_health)[0];
}

export interface CombatSideState {
  health: number;
  deployed_indices: number[];
}

export interface CombatRoundResult {
  player_party: BattlePartyMember[];
  opponent_party: BattlePartyMember[];
  player_health: number;
  opponent_health: number;
  log: CombatLogEntry[];
}

interface SideCursor {
  side: "player" | "opponent";
  unitOrder: number[];
  pointer: number;
}

function nextAliveAttacker(cursor: SideCursor, party: BattlePartyMember[]): number | null {
  const start = cursor.pointer;
  const n = cursor.unitOrder.length;
  if (n === 0) return null;

  for (let scanned = 0; scanned < n; scanned += 1) {
    const idx = cursor.unitOrder[cursor.pointer % n];
    cursor.pointer = (cursor.pointer + 1) % n;
    const unit = party[idx];
    if (!unit || unit.is_destroyed || unit.current_health <= 0) continue;
    return idx;
  }

  cursor.pointer = start;
  return null;
}

export function simulateCombatRound(
  state: {
    round: number;
    player_party: BattlePartyMember[];
    opponent_party: BattlePartyMember[];
    player_health: number;
    opponent_health: number;
  },
  deployment: {
    player: CombatSideState;
    opponent: CombatSideState;
  },
  maxSteps = 10,
): CombatRoundResult {
  const playerParty = state.player_party.map((m) => ({ ...m }));
  const opponentParty = state.opponent_party.map((m) => ({ ...m }));
  let playerHealth = state.player_health;
  let opponentHealth = state.opponent_health;
  const log: CombatLogEntry[] = [];

  const firstSide: "player" | "opponent" =
    deployment.player.deployed_indices.length === deployment.opponent.deployed_indices.length
      ? (Math.random() < 0.5 ? "player" : "opponent")
      : deployment.player.deployed_indices.length < deployment.opponent.deployed_indices.length
        ? "player"
        : "opponent";

  const playerCursor: SideCursor = {
    side: "player",
    unitOrder: [...deployment.player.deployed_indices],
    pointer: 0,
  };
  const opponentCursor: SideCursor = {
    side: "opponent",
    unitOrder: [...deployment.opponent.deployed_indices],
    pointer: 0,
  };

  let sideToAct: "player" | "opponent" = firstSide;

  for (let step = 1; step <= maxSteps; step += 1) {
    const actingCursor = sideToAct === "player" ? playerCursor : opponentCursor;
    const defendingCursor = sideToAct === "player" ? opponentCursor : playerCursor;
    const actingParty = sideToAct === "player" ? playerParty : opponentParty;
    const defendingParty = sideToAct === "player" ? opponentParty : playerParty;

    const attackerIndex = nextAliveAttacker(actingCursor, actingParty);
    if (attackerIndex === null) {
      sideToAct = sideToAct === "player" ? "opponent" : "player";
      const hasOpponent =
        nextAliveAttacker(sideToAct === "player" ? playerCursor : opponentCursor, sideToAct === "player" ? playerParty : opponentParty) !== null;
      if (!hasOpponent) break;
      continue;
    }

    const attacker = actingParty[attackerIndex];
    const defenderCandidates = defendingCursor.unitOrder.filter((idx) => {
      const d = defendingParty[idx];
      return d && !d.is_destroyed && d.current_health > 0;
    });

    if (defenderCandidates.length === 0) {
      const damage = Math.max(1, Math.round(attacker.current_attack));
      if (sideToAct === "player") {
        opponentHealth = Math.max(0, opponentHealth - damage);
      } else {
        playerHealth = Math.max(0, playerHealth - damage);
      }
      log.push({
        round: state.round,
        step,
        side: sideToAct,
        attacker_index: attackerIndex,
        attacker_name: attacker.name,
        attacker_element: attacker.element,
        target: "player",
        damage,
        weakness_bonus_applied: false,
        player_health_after: playerHealth,
        opponent_health_after: opponentHealth,
      });
    } else {
      const defenderIndex = chooseTargetIndex(
        attacker.element,
        defenderCandidates,
        defendingParty,
      );
      const defender = defendingParty[defenderIndex];
      const weakness = hasElementAdvantage(attacker.element, defender.element);
      const damage = Math.max(
        1,
        Math.round(attacker.current_attack * (weakness ? 1.1 : 1)),
      );
      defender.current_health = Math.max(0, defender.current_health - damage);
      if (defender.current_health <= 0) {
        defender.is_destroyed = true;
      }

      log.push({
        round: state.round,
        step,
        side: sideToAct,
        attacker_index: attackerIndex,
        attacker_name: attacker.name,
        attacker_element: attacker.element,
        target: "unit",
        defender_index: defenderIndex,
        defender_name: defender.name,
        defender_element: defender.element,
        damage,
        weakness_bonus_applied: weakness,
        defender_remaining_health: defender.current_health,
        player_health_after: playerHealth,
        opponent_health_after: opponentHealth,
      });
    }

    if (playerHealth <= 0 || opponentHealth <= 0) {
      break;
    }
    sideToAct = sideToAct === "player" ? "opponent" : "player";
  }

  return {
    player_party: playerParty,
    opponent_party: opponentParty,
    player_health: playerHealth,
    opponent_health: opponentHealth,
    log,
  };
}

/**
 * Calculate total attack for non-destroyed units in party.
 */
export function calculateTotalPower(party: BattlePartyMember[]): number {
  return party.reduce(
    (sum, member) => sum + (member.is_destroyed ? 0 : member.current_attack),
    0,
  );
}

/**
 * Determine winner from player/opponent health.
 */
export function determineBattleWinner(
  state: BattleState,
): { winner: "player" | "opponent" | "draw"; playerTotal: number; opponentTotal: number } {
  let winner: "player" | "opponent" | "draw";
  if (state.player_health > state.opponent_health) {
    winner = "player";
  } else if (state.opponent_health > state.player_health) {
    winner = "opponent";
  } else {
    winner = "draw";
  }

  return {
    winner,
    playerTotal: state.player_health,
    opponentTotal: state.opponent_health,
  };
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
    base_stats?: {
      attack?: number;
      health?: number;
    };
  },
  playerElementalId?: string,
): BattlePartyMember {
  const attack = Math.max(1, Number(elemental.base_stats?.attack ?? elemental.level * 10));
  const health = Math.max(1, Number(elemental.base_stats?.health ?? elemental.level * 10));
  const primaryElement = (elemental.element_types[0] ?? "fire") as ElementType;
  const elements = (elemental.element_types ?? ["fire"]) as ElementType[];
  return {
    player_elemental_id: playerElementalId,
    elemental_id: elemental.id,
    name: elemental.name,
    element: primaryElement,
    elements,
    level: elemental.level,
    base_attack: attack,
    current_attack: attack,
    max_health: health,
    current_health: health,
    is_destroyed: false,
    target_index: -1,
  };
}
