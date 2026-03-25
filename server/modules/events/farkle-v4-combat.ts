import {
  hasElementAdvantage,
  type BattlePartyMember,
  type ElementType,
} from "./battle-logic";
import type { V4MemberModifiers } from "./farkle-v4-logic";

interface V4CombatLogEntry {
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
  dodged?: boolean;
  second_attack?: boolean;
  second_attack_lost?: boolean;
  defender_remaining_health?: number;
  player_health_after: number;
  opponent_health_after: number;
}

function getModifiers(member: BattlePartyMember): V4MemberModifiers {
  return (
    (member as BattlePartyMember & { battle_modifiers?: V4MemberModifiers }).battle_modifiers ?? {
      damage_pct: 0,
      armor_pct: 0,
      dodge_pct: 0,
      double_attack_pct: 0,
    }
  );
}

function chooseTargetIndex(
  attackerElement: ElementType,
  defenderIndices: number[],
  defenders: BattlePartyMember[],
): number {
  const weaknessTargets = defenderIndices.filter((idx) =>
    hasElementAdvantage(attackerElement, defenders[idx].element),
  );
  const pool = weaknessTargets.length > 0 ? weaknessTargets : defenderIndices;
  return pool.sort((a, b) => defenders[a].current_health - defenders[b].current_health)[0];
}

function computeDamage(
  attacker: BattlePartyMember,
  defender: BattlePartyMember | null,
): { damage: number; weakness: boolean; dodged: boolean } {
  const attackerModifiers = getModifiers(attacker);
  const weakness = Boolean(defender && hasElementAdvantage(attacker.element, defender.element));
  const raw = attacker.current_attack * (1 + attackerModifiers.damage_pct) * (weakness ? 1.1 : 1);

  if (defender) {
    const defenderModifiers = getModifiers(defender);
    if (Math.random() < defenderModifiers.dodge_pct) {
      return { damage: 0, weakness, dodged: true };
    }
    const reduced = raw * (1 - Math.min(0.5, defenderModifiers.armor_pct));
    return { damage: Math.max(1, Math.round(reduced)), weakness, dodged: false };
  }

  return { damage: Math.max(1, Math.round(raw)), weakness, dodged: false };
}

export function simulateV4CombatRound(
  state: {
    round: number;
    player_party: BattlePartyMember[];
    opponent_party: BattlePartyMember[];
    player_health: number;
    opponent_health: number;
  },
  deployment: {
    player_deployed_indices: number[];
    opponent_deployed_indices: number[];
  },
): {
  player_party: BattlePartyMember[];
  opponent_party: BattlePartyMember[];
  player_health: number;
  opponent_health: number;
  log: V4CombatLogEntry[];
  first_attacker: "player" | "opponent";
} {
  const playerParty = state.player_party.map((member) => ({ ...member }));
  const opponentParty = state.opponent_party.map((member) => ({ ...member }));
  let playerHealth = state.player_health;
  let opponentHealth = state.opponent_health;
  const log: V4CombatLogEntry[] = [];

  const playerOrder = [...deployment.player_deployed_indices];
  const opponentOrder = [...deployment.opponent_deployed_indices];

  const firstAttacker: "player" | "opponent" =
    playerOrder.length === opponentOrder.length
      ? Math.random() < 0.5
        ? "player"
        : "opponent"
      : playerOrder.length < opponentOrder.length
        ? "player"
        : "opponent";

  let playerPointer = 0;
  let opponentPointer = 0;
  let sideToAct: "player" | "opponent" = firstAttacker;
  let step = 1;

  const nextAttackerIndex = (side: "player" | "opponent"): number | null => {
    const order = side === "player" ? playerOrder : opponentOrder;
    let pointer = side === "player" ? playerPointer : opponentPointer;
    const party = side === "player" ? playerParty : opponentParty;

    for (; pointer < order.length; pointer += 1) {
      const idx = order[pointer];
      const unit = party[idx];
      if (!unit || unit.is_destroyed || unit.current_health <= 0) {
        continue;
      }
      if (side === "player") {
        playerPointer = pointer + 1;
      } else {
        opponentPointer = pointer + 1;
      }
      return idx;
    }

    if (side === "player") {
      playerPointer = order.length;
    } else {
      opponentPointer = order.length;
    }
    return null;
  };

  const hasPendingAttacker = (side: "player" | "opponent"): boolean => {
    const order = side === "player" ? playerOrder : opponentOrder;
    const pointer = side === "player" ? playerPointer : opponentPointer;
    const party = side === "player" ? playerParty : opponentParty;

    for (let i = pointer; i < order.length; i += 1) {
      const unit = party[order[i]];
      if (unit && !unit.is_destroyed && unit.current_health > 0) {
        return true;
      }
    }
    return false;
  };

  while (hasPendingAttacker("player") || hasPendingAttacker("opponent")) {
    const attackerIndex = nextAttackerIndex(sideToAct);
    if (attackerIndex === null) {
      sideToAct = sideToAct === "player" ? "opponent" : "player";
      if (!hasPendingAttacker(sideToAct)) {
        break;
      }
      continue;
    }

    const actingParty = sideToAct === "player" ? playerParty : opponentParty;
    const defendingParty = sideToAct === "player" ? opponentParty : playerParty;
    const defendingOrder = sideToAct === "player" ? opponentOrder : playerOrder;
    const attacker = actingParty[attackerIndex];

    const executeAttack = (isSecondAttack: boolean): void => {
      const aliveDefenders = defendingOrder.filter((idx) => {
        const target = defendingParty[idx];
        return target && !target.is_destroyed && target.current_health > 0;
      });

      if (aliveDefenders.length === 0) {
        const { damage } = computeDamage(attacker, null);
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
          second_attack: isSecondAttack,
          player_health_after: playerHealth,
          opponent_health_after: opponentHealth,
        });
        return;
      }

      const targetIndex = chooseTargetIndex(attacker.element, aliveDefenders, defendingParty);
      const defender = defendingParty[targetIndex];
      const attackResult = computeDamage(attacker, defender);

      if (!attackResult.dodged) {
        defender.current_health = Math.max(0, defender.current_health - attackResult.damage);
        if (defender.current_health <= 0) {
          defender.is_destroyed = true;
        }
      }

      log.push({
        round: state.round,
        step,
        side: sideToAct,
        attacker_index: attackerIndex,
        attacker_name: attacker.name,
        attacker_element: attacker.element,
        target: "unit",
        defender_index: targetIndex,
        defender_name: defender.name,
        defender_element: defender.element,
        damage: attackResult.damage,
        weakness_bonus_applied: attackResult.weakness,
        dodged: attackResult.dodged,
        second_attack: isSecondAttack,
        defender_remaining_health: defender.current_health,
        player_health_after: playerHealth,
        opponent_health_after: opponentHealth,
      });

      if (isSecondAttack && defender.is_destroyed) {
        // locked behavior: same target only; if first hit killed it, second attack is lost.
        log.push({
          round: state.round,
          step,
          side: sideToAct,
          attacker_index: attackerIndex,
          attacker_name: attacker.name,
          attacker_element: attacker.element,
          target: "unit",
          defender_index: targetIndex,
          defender_name: defender.name,
          defender_element: defender.element,
          damage: 0,
          weakness_bonus_applied: false,
          second_attack: true,
          second_attack_lost: true,
          defender_remaining_health: defender.current_health,
          player_health_after: playerHealth,
          opponent_health_after: opponentHealth,
        });
      }
    };

    executeAttack(false);

    const attackerModifiers = getModifiers(attacker);
    const shouldDoubleAttack = Math.random() < attackerModifiers.double_attack_pct;
    if (shouldDoubleAttack && !attacker.is_destroyed && attacker.current_health > 0) {
      executeAttack(true);
    }

    if (playerHealth <= 0 || opponentHealth <= 0) {
      break;
    }

    step += 1;
    sideToAct = sideToAct === "player" ? "opponent" : "player";
  }

  return {
    player_party: playerParty,
    opponent_party: opponentParty,
    player_health: playerHealth,
    opponent_health: opponentHealth,
    log,
    first_attacker: firstAttacker,
  };
}
