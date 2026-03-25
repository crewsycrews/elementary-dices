import type { BattlePartyMember, ElementType } from "./battle-logic";

export type V4CombinationType =
  | "doublet"
  | "triplet"
  | "quartet"
  | "quintet"
  | "one_for_all"
  | "full_house";

export interface V4Combination {
  type: V4CombinationType;
  elements: ElementType[];
  dice_indices: number[];
}

export interface FarkleV4Die {
  player_dice_id: string;
  dice_type_id: string;
  dice_notation: string;
  faces: ElementType[];
  current_result: ElementType;
  is_set_aside: boolean;
  is_assigned: boolean;
  assigned_to_party_index: number | null;
}

export type FarkleV4TurnPhase =
  | "initial_roll"
  | "can_reroll"
  | "set_aside"
  | "rolling_remaining"
  | "ready_to_commit"
  | "done";

export interface FarkleV4TurnState {
  phase: FarkleV4TurnPhase;
  dice: FarkleV4Die[];
  active_combinations: V4Combination[];
  is_dice_rush: boolean;
  busted: boolean;
  has_used_reroll: boolean;
  set_aside_element_bonus: ElementType | null;
  assignment_required_party_indices: number[];
  assigned_party_indices: number[];
  can_commit: boolean;
}

export interface V4MemberModifiers {
  damage_pct: number;
  armor_pct: number;
  dodge_pct: number;
  double_attack_pct: number;
}

const ALL_ELEMENTS: ElementType[] = ["water", "fire", "air", "earth", "lightning"];

function randomFace(faces: ElementType[]): ElementType {
  return faces[Math.floor(Math.random() * faces.length)];
}

export function rollRemainingDice(dice: FarkleV4Die[]): FarkleV4Die[] {
  return dice.map((die) => {
    if (die.is_set_aside || die.is_assigned) return die;
    return { ...die, current_result: randomFace(die.faces) };
  });
}

export function detectV4Combinations(dice: FarkleV4Die[]): V4Combination[] {
  const setAsideDice = dice
    .map((die, index) => ({ die, index }))
    .filter(({ die }) => die.is_assigned);

  const combos: V4Combination[] = [];
  if (setAsideDice.length < 2) return combos;

  const byElement = new Map<ElementType, number[]>();
  for (const { die, index } of setAsideDice) {
    const current = byElement.get(die.current_result) ?? [];
    current.push(index);
    byElement.set(die.current_result, current);
  }

  for (const [element, indices] of byElement.entries()) {
    if (indices.length < 2) continue;
    const type: V4CombinationType =
      indices.length >= 5
        ? "quintet"
        : indices.length === 4
          ? "quartet"
          : indices.length === 3
            ? "triplet"
            : "doublet";
    combos.push({ type, elements: [element], dice_indices: [...indices] });
  }

  if (setAsideDice.length === 5 && byElement.size === 5) {
    combos.push({
      type: "one_for_all",
      elements: [...byElement.keys()],
      dice_indices: setAsideDice.map(({ index }) => index),
    });
  }

  if (byElement.size === 2) {
    const groups = [...byElement.entries()].map(([el, indices]) => ({ el, n: indices.length }));
    const hasTriplet = groups.some((g) => g.n === 3);
    const hasPair = groups.some((g) => g.n === 2);
    if (hasTriplet && hasPair) {
      combos.push({
        type: "full_house",
        elements: groups.map((g) => g.el),
        dice_indices: setAsideDice.map(({ index }) => index),
      });
    }
  }

  return combos;
}

export function buildInitialV4TurnState(dice: FarkleV4Die[]): FarkleV4TurnState {
  return {
    phase: "initial_roll",
    dice,
    active_combinations: [],
    is_dice_rush: false,
    busted: false,
    has_used_reroll: false,
    set_aside_element_bonus: null,
    assignment_required_party_indices: [],
    assigned_party_indices: [],
    can_commit: false,
  };
}

export function getAlivePartyIndices(party: BattlePartyMember[]): number[] {
  return party
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => !member.is_destroyed && member.current_health > 0)
    .map(({ index }) => index);
}

export function collectAssignedPartyIndices(dice: FarkleV4Die[]): number[] {
  return [
    ...new Set(
      dice
        .filter((die) => die.is_assigned && die.assigned_to_party_index !== null)
        .map((die) => die.assigned_to_party_index as number),
    ),
  ];
}

function getOrInitModifiers(member: BattlePartyMember): V4MemberModifiers {
  const maybeModifiers = (member as BattlePartyMember & { battle_modifiers?: V4MemberModifiers })
    .battle_modifiers;
  if (maybeModifiers) {
    return maybeModifiers;
  }
  const created: V4MemberModifiers = {
    damage_pct: 0,
    armor_pct: 0,
    dodge_pct: 0,
    double_attack_pct: 0,
  };
  (member as BattlePartyMember & { battle_modifiers?: V4MemberModifiers }).battle_modifiers = created;
  return created;
}

function scaleForCombo(type: V4CombinationType): number {
  switch (type) {
    case "doublet":
      return 2;
    case "triplet":
      return 3;
    case "quartet":
      return 4;
    case "quintet":
      return 5;
    default:
      return 0;
  }
}

function applyElementEffect(
  member: BattlePartyMember,
  sourceElement: ElementType,
  scale: number,
  singleDie: boolean,
): void {
  const modifiers = getOrInitModifiers(member);

  if (sourceElement === "water") {
    const healMultiplier = singleDie
      ? 0.5
      : scale === 2
        ? 1
        : scale === 3
          ? 1.5
          : scale === 4
            ? 2
            : 3;
    const healed = Math.round(member.current_attack * healMultiplier);
    member.current_health = Math.min(member.max_health, member.current_health + healed);
    return;
  }

  if (sourceElement === "earth") {
    const add = singleDie
      ? 0.03
      : scale === 2
        ? 0.05
        : scale === 3
          ? 0.1
          : scale === 4
            ? 0.15
            : 0.2;
    modifiers.armor_pct = Math.min(0.5, modifiers.armor_pct + add);
    return;
  }

  if (sourceElement === "fire") {
    const add = singleDie
      ? 0.1
      : scale === 2
        ? 0.2
        : scale === 3
          ? 0.3
          : scale === 4
            ? 0.4
            : 0.5;
    modifiers.damage_pct += add;
    return;
  }

  if (sourceElement === "air") {
    const add = singleDie
      ? 0.03
      : scale === 2
        ? 0.05
        : scale === 3
          ? 0.08
          : scale === 4
            ? 0.12
            : 0.15;
    modifiers.dodge_pct = Math.min(0.4, modifiers.dodge_pct + add);
    return;
  }

  if (sourceElement === "lightning") {
    const add = singleDie
      ? 0.03
      : scale === 2
        ? 0.05
        : scale === 3
          ? 0.08
          : scale === 4
            ? 0.12
            : 0.15;
    modifiers.double_attack_pct = Math.min(0.4, modifiers.double_attack_pct + add);
  }
}

export function applyV4CommitBonuses(
  party: BattlePartyMember[],
  turn: FarkleV4TurnState,
): {
  updated_party: BattlePartyMember[];
  applied_bonuses: Partial<Record<ElementType, number>>;
  deployed_indices: number[];
} {
  const updatedParty = party.map((member) => ({ ...member }));
  const assignedDice = turn.dice.filter(
    (die) => die.is_assigned && die.assigned_to_party_index !== null,
  );
  const deployedIndices = collectAssignedPartyIndices(turn.dice);

  const combos = detectV4Combinations(turn.dice);
  const hasOneForAll = combos.some((combo) => combo.type === "one_for_all");
  const comboByElement = new Map<ElementType, V4CombinationType>();

  for (const combo of combos) {
    if (
      combo.type === "one_for_all" ||
      combo.type === "full_house"
    ) {
      continue;
    }
    const el = combo.elements[0];
    const existing = comboByElement.get(el);
    if (!existing || scaleForCombo(combo.type) > scaleForCombo(existing)) {
      comboByElement.set(el, combo.type);
    }
  }

  const assignedMembers = deployedIndices
    .map((index) => updatedParty[index])
    .filter((member): member is BattlePartyMember => Boolean(member));

  if (hasOneForAll) {
    for (const member of assignedMembers) {
      for (const element of ALL_ELEMENTS) {
        applyElementEffect(member, element, 2, false);
      }
    }
  } else {
    for (const member of assignedMembers) {
      for (const [element, comboType] of comboByElement.entries()) {
        applyElementEffect(member, element, scaleForCombo(comboType), false);
      }
    }

    for (const die of assignedDice) {
      const partyIndex = die.assigned_to_party_index as number;
      const member = updatedParty[partyIndex];
      if (!member) continue;
      if (comboByElement.has(die.current_result)) {
        continue;
      }
      applyElementEffect(member, die.current_result, 0, true);
    }
  }

  const appliedBonuses: Partial<Record<ElementType, number>> = {};
  for (const [element, comboType] of comboByElement.entries()) {
    const scale = scaleForCombo(comboType);
    if (element === "fire") {
      appliedBonuses.fire =
        (appliedBonuses.fire ?? 0) +
        (scale === 2 ? 0.2 : scale === 3 ? 0.3 : scale === 4 ? 0.4 : 0.5);
    }
    if (element === "earth") {
      appliedBonuses.earth =
        (appliedBonuses.earth ?? 0) +
        (scale === 2 ? 0.05 : scale === 3 ? 0.1 : scale === 4 ? 0.15 : 0.2);
    }
    if (element === "air") {
      appliedBonuses.air =
        (appliedBonuses.air ?? 0) +
        (scale === 2 ? 0.05 : scale === 3 ? 0.08 : scale === 4 ? 0.12 : 0.15);
    }
    if (element === "lightning") {
      appliedBonuses.lightning =
        (appliedBonuses.lightning ?? 0) +
        (scale === 2 ? 0.05 : scale === 3 ? 0.08 : scale === 4 ? 0.12 : 0.15);
    }
  }

  turn.active_combinations = combos;
  return {
    updated_party: updatedParty,
    applied_bonuses: appliedBonuses,
    deployed_indices: deployedIndices,
  };
}

export function validateDeployAllPossible(
  party: BattlePartyMember[],
  turn: FarkleV4TurnState,
): { can_commit: boolean; missing_party_indices: number[] } {
  const alive = getAlivePartyIndices(party);
  const assigned = new Set(collectAssignedPartyIndices(turn.dice));
  const missing = alive.filter((index) => !assigned.has(index));

  turn.assignment_required_party_indices = alive;
  turn.assigned_party_indices = [...assigned];
  turn.can_commit = missing.length === 0;

  return {
    can_commit: missing.length === 0,
    missing_party_indices: missing,
  };
}
