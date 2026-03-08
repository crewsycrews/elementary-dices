/**
 * Pure Farkle battle mechanics for the v2 battle system.
 *
 * Players roll 5 equipped dice per turn, form elemental combinations,
 * and accumulate percentage-based power bonuses over 3 turns.
 *
 * Combinations:
 *   Triplet (3 same):       +30% to that element
 *   Quartet (4 same):       +40% to that element
 *   All-For-One (5 same):   +50% to that element
 *   One-For-All (all diff): +30% to a chosen element
 *   Full House (3+2):       +35% to triplet element, +25% to pair element
 *
 * Set-aside element: +10% to matching party members when that die is set aside solo.
 * Bonuses accumulate additively. base_power is fixed; current_power = base_power * (1 + total_pct).
 */

import {
  calculateTotalPower,
  determineBattleWinner,
  buildPartyMember,
  type BattlePartyMember,
  type BattleState,
  type ElementType,
} from "./battle-logic";

export type { BattlePartyMember, BattleState, ElementType };
export { calculateTotalPower, determineBattleWinner, buildPartyMember };

export type CombinationType =
  | "triplet"
  | "quartet"
  | "all_for_one"
  | "one_for_all"
  | "full_house";

export interface Combination {
  type: CombinationType;
  elements: ElementType[]; // which elements are in this combo
  dice_indices: number[]; // which dice (0-4) form this combo
  bonuses: Partial<Record<ElementType, number>>; // element -> bonus percentage (0-1)
}

export interface FarkleDie {
  player_dice_id: string;
  dice_type_id: string;
  dice_notation: string; // d4, d6, d10, d12, d20
  faces: ElementType[];
  current_result: ElementType;
  is_set_aside: boolean;
}

export type FarkleTurnPhase =
  | "initial_roll"
  | "can_reroll"
  | "set_aside"
  | "rolling_remaining"
  | "done";

export interface FarkleTurnState {
  phase: FarkleTurnPhase;
  dice: FarkleDie[];
  has_used_reroll: boolean;
  active_combinations: Combination[]; // combos currently set aside
  set_aside_element_bonus: ElementType | null; // die set aside solo (chosen element)
  // Sum of bonuses banked from completed Dice Rush cycles in the same turn.
  accumulated_dice_rush_bonuses: Partial<Record<ElementType, number>>;
  is_dice_rush: boolean;
  busted: boolean;
}

export type FarkleBattlePhase =
  | "targeting"
  | "choose_element"
  | "player_turn"
  | "opponent_turn"
  | "resolved";

export interface FarkleBattleState {
  phase: FarkleBattlePhase;
  player_party: BattlePartyMember[];
  opponent_party: BattlePartyMember[];
  set_aside_element: ElementType | null;
  opponent_set_aside_element: ElementType | null;
  current_turn: number; // 1-3
  player_turns_done: number;
  opponent_turns_done: number;
  player_turn: FarkleTurnState | null;
  opponent_turn_result: OpponentTurnResult | null;
  player_bonuses_total: Partial<Record<ElementType, number>>;
  opponent_bonuses_total: Partial<Record<ElementType, number>>;
  winner?: "player" | "opponent" | "draw";
  player_total_power?: number;
  opponent_total_power?: number;
}

export interface OpponentTurnResult {
  dice: FarkleDie[];
  combination: Combination | null;
  set_aside_element_used: boolean;
  bonuses_applied: Partial<Record<ElementType, number>>;
  busted: boolean;
}

const ALL_ELEMENTS: ElementType[] = [
  "fire",
  "water",
  "earth",
  "air",
  "lightning",
];

/**
 * Randomly roll each die by picking a random face from its faces array.
 * Only rolls dice that are NOT set aside.
 */
export function rollFarkleDice(dice: FarkleDie[]): FarkleDie[] {
  return dice.map((die) => {
    if (die.is_set_aside) return die;
    const randomFace = die.faces[Math.floor(Math.random() * die.faces.length)];
    return { ...die, current_result: randomFace };
  });
}

/**
 * Detect all valid combinations from the full dice set (set-aside + active).
 * Set-aside dice can be regrouped with newly rolled dice (rule 5).
 * Returns all valid combos that can be formed.
 */
export function detectCombinations(dice: FarkleDie[]): Combination[] {
  const combos: Combination[] = [];

  // Group dice indices by element (considering ALL dice for regrouping)
  const byElement: Partial<Record<ElementType, number[]>> = {};
  for (let i = 0; i < dice.length; i++) {
    const el = dice[i].current_result;
    if (!byElement[el]) byElement[el] = [];
    byElement[el]!.push(i);
  }

  const uniqueElements = Object.keys(byElement) as ElementType[];
  const totalDice = dice.length;

  // All-For-One: all 5 dice same element
  for (const el of uniqueElements) {
    const indices = byElement[el]!;
    if (indices.length === 5) {
      combos.push({
        type: "all_for_one",
        elements: [el],
        dice_indices: indices,
        bonuses: { [el]: 0.5 },
      });
    }
  }

  // One-For-All: all 5 dice different elements (requires exactly 5 unique)
  if (totalDice === 5 && uniqueElements.length === 5) {
    combos.push({
      type: "one_for_all",
      elements: uniqueElements,
      dice_indices: [0, 1, 2, 3, 4],
      bonuses: {}, // bonus element chosen by player at set-aside time
    });
  }

  // Full House: exactly 2 unique elements where one has 3 and other has 2
  if (uniqueElements.length === 2) {
    const [el1, el2] = uniqueElements;
    const count1 = byElement[el1]!.length;
    const count2 = byElement[el2]!.length;
    if ((count1 === 3 && count2 === 2) || (count1 === 2 && count2 === 3)) {
      const tripletEl = count1 === 3 ? el1 : el2;
      const pairEl = count1 === 2 ? el1 : el2;
      combos.push({
        type: "full_house",
        elements: [tripletEl, pairEl],
        dice_indices: [...byElement[tripletEl]!, ...byElement[pairEl]!],
        bonuses: { [tripletEl]: 0.35, [pairEl]: 0.25 },
      });
    }
  }

  // Quartet: exactly 4 of same element
  for (const el of uniqueElements) {
    const indices = byElement[el]!;
    if (indices.length === 4) {
      combos.push({
        type: "quartet",
        elements: [el],
        dice_indices: indices,
        bonuses: { [el]: 0.4 },
      });
    }
  }

  // Triplet: exactly 3 of same element (not already covered by full_house or better)
  for (const el of uniqueElements) {
    const indices = byElement[el]!;
    if (indices.length === 3) {
      // Only add triplet if not already part of a full house combo
      const alreadyCovered = combos.some(
        (c) => c.type === "full_house" && c.elements.includes(el),
      );
      if (!alreadyCovered) {
        combos.push({
          type: "triplet",
          elements: [el],
          dice_indices: indices,
          bonuses: { [el]: 0.3 },
        });
      }
    }
  }
  return combos;
}

/**
 * Select the best combination by total bonus value (greedy strategy for AI).
 */
export function selectBestCombination(
  combos: Combination[],
): Combination | null {
  if (combos.length === 0) return null;

  return combos.reduce((best, combo) => {
    const bestTotal = Object.values(best.bonuses).reduce(
      (s, v) => s + (v ?? 0),
      0,
    );
    const comboTotal = Object.values(combo.bonuses).reduce(
      (s, v) => s + (v ?? 0),
      0,
    );
    return comboTotal > bestTotal ? combo : best;
  });
}

/**
 * Apply accumulated percentage bonuses to a party.
 * current_power = base_power * (1 + total_bonus_pct_for_that_element)
 */
export function applyBonusesToParty(
  party: BattlePartyMember[],
  bonuses: Partial<Record<ElementType, number>>,
): BattlePartyMember[] {
  return party.map((member) => {
    const pct = bonuses[member.element] ?? 0;
    return {
      ...member,
      current_power: Math.round(member.base_power * (1 + pct) * 10) / 10,
    };
  });
}

/**
 * Merge new bonuses into existing accumulated bonuses (additive).
 */
export function mergeBonuses(
  existing: Partial<Record<ElementType, number>>,
  incoming: Partial<Record<ElementType, number>>,
): Partial<Record<ElementType, number>> {
  const result = { ...existing };
  for (const el of ALL_ELEMENTS) {
    const inc = incoming[el] ?? 0;
    if (inc > 0) {
      result[el] = (result[el] ?? 0) + inc;
    }
  }
  return result;
}

/**
 * Count set-aside dice that should receive chosen-element solo bonus.
 * Dice already consumed by any active combination do not grant solo +10%.
 */
export function countSoloSetAsideElementDice(
  dice: FarkleDie[],
  activeCombinations: Combination[],
  setAsideElement: ElementType | null,
): number {
  if (!setAsideElement) return 0;

  const setAsideDice = dice.filter((d) => d.is_set_aside);
  if (setAsideDice.length === 0) return 0;

  // Combination indices are relative to set-aside dice arrays.
  const comboDiceIndices = new Set<number>();
  for (const combo of activeCombinations) {
    for (const idx of combo.dice_indices) {
      comboDiceIndices.add(idx);
    }
  }

  return setAsideDice.reduce((count, die, idx) => {
    if (comboDiceIndices.has(idx)) return count;
    if (die.current_result !== setAsideElement) return count;
    return count + 1;
  }, 0);
}

/**
 * Simulate the opponent's Farkle turn (greedy AI):
 * 1. Roll all 5 dice.
 * 2. Detect best combination.
 * 3. If no combo but set_aside_element matches a die → use it for +10%.
 * 4. Apply bonuses.
 */
export function simulateOpponentTurn(
  dice: FarkleDie[],
  setAsideElement: ElementType,
): OpponentTurnResult {
  const rolled = rollFarkleDice(
    dice.map((d) => ({ ...d, is_set_aside: false })),
  );
  const combos = detectCombinations(rolled);
  const best = selectBestCombination(combos);

  let bonusesApplied: Partial<Record<ElementType, number>> = {};
  let setAsideElementUsed = false;

  if (best) {
    bonusesApplied = { ...best.bonuses };
  } else {
    // No combo: each chosen-element die grants +10% fallback.
    const setAsideDiceCount = rolled.filter(
      (d) => d.current_result === setAsideElement,
    ).length;
    if (setAsideDiceCount > 0) {
      bonusesApplied = { [setAsideElement]: setAsideDiceCount * 0.1 };
      setAsideElementUsed = true;
    }
  }

  return {
    dice: rolled,
    combination: best,
    set_aside_element_used: setAsideElementUsed,
    bonuses_applied: bonusesApplied,
    busted: !best && !setAsideElementUsed,
  };
}

/**
 * Check if all 5 dice are set aside (Dice Rush condition).
 */
export function isDiceRush(dice: FarkleDie[]): boolean {
  return dice.length === 5 && dice.every((d) => d.is_set_aside);
}

/**
 * Check if a roll has no valid combinations (bust check).
 * A bust occurs when there are no combos AND none of the dice show the set-aside element.
 */
export function isBust(
  dice: FarkleDie[],
  setAsideElement: ElementType | null,
  hasUsedReroll: boolean,
): boolean {
  if (!hasUsedReroll) return false; // still has free reroll, not busted yet
  const activeDice = dice.filter((d) => !d.is_set_aside);
  const combos = detectCombinations(activeDice);
  if (combos.length > 0) return false;
  if (
    setAsideElement &&
    activeDice.some((d) => d.current_result === setAsideElement)
  ) {
    return false; // can still set aside the chosen element die
  }
  return true;
}
