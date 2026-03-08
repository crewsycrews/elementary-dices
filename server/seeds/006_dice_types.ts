import type { Knex } from "knex";
import type { DiceRarityValue, ElementTypeValue } from "@elementary-dices/shared";

const ELEMENTS = ["fire", "water", "earth", "air", "lightning"] as const;
type Element = (typeof ELEMENTS)[number];

interface DiceSeedEntry {
  dice_notation: string;
  rarity: DiceRarityValue;
  name: string;
  faces: ElementTypeValue[];
  price: number;
  description: string;
}

/**
 * Elemental faces dice seed data.
 *
 * d4  (common only, 5 variants) — 4 of 5 elements, each variant missing one
 * d6  (common only, 5 variants) — all 5 elements + 1 duplicate
 * d10 (common: 1 flat, rare: 5)  — common = 2 each, rare = one element at 3
 * d12 (common only, 5 variants)  — 2 each + 2 extras on one element
 * d20 (common: 1, rare: 5, epic: 5) — common = 4 each, rare = one at 5, epic = one at 6
 */

function repeat(el: Element, n: number): Element[] {
  return Array(n).fill(el);
}

/**
 * Shuffles faces so no two identical elements are adjacent.
 * Uses a greedy approach: at each position pick the most-frequent
 * remaining element that differs from the previous face.
 */
function shuffleNoAdjacent(faces: Element[]): Element[] {
  // Count frequencies
  const freq = new Map<Element, number>();
  for (const el of faces) freq.set(el, (freq.get(el) ?? 0) + 1);

  const result: Element[] = [];
  let prev: Element | null = null;

  for (let i = 0; i < faces.length; i++) {
    // Candidates: any element that isn't the previous face and still has count > 0
    const candidates = ([...freq.entries()] as [Element, number][])
      .filter(([el, count]) => el !== prev && count > 0)
      .sort((a, b) => b[1] - a[1]); // highest frequency first

    if (candidates.length === 0) {
      // Fallback: same as prev (unavoidable with this distribution — just append remaining)
      const remaining = ([...freq.entries()] as [Element, number][]).find(([, c]) => c > 0)!;
      result.push(remaining[0]);
      freq.set(remaining[0], remaining[1] - 1);
      prev = remaining[0];
    } else {
      const [el, count] = candidates[0];
      result.push(el);
      freq.set(el, count - 1);
      prev = el;
    }
  }

  return result;
}

function flatDistribution(countPerElement: number): Element[] {
  return shuffleNoAdjacent(ELEMENTS.flatMap((el) => repeat(el, countPerElement)));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── d4 (common × 5) ────────────────────────────────────────────────
function generateD4Variants(): DiceSeedEntry[] {
  return ELEMENTS.map((missing) => {
    const faces = shuffleNoAdjacent(ELEMENTS.filter((el) => el !== missing));
    return {
      dice_notation: "d4",
      rarity: "common",
      name: `D4 No-${capitalize(missing)}`,
      faces,
      price: 50,
      description: `A four-sided die with ${faces.map(capitalize).join(", ")} faces.`,
    };
  });
}

// ─── d6 (common × 5) ────────────────────────────────────────────────
function generateD6Variants(): DiceSeedEntry[] {
  return ELEMENTS.map((doubled) => {
    const faces: Element[] = shuffleNoAdjacent([...ELEMENTS, doubled]);
    return {
      dice_notation: "d6",
      rarity: "common",
      name: `D6 ${capitalize(doubled)}+`,
      faces,
      price: 60,
      description: `A six-sided die with all elements and an extra ${doubled} face.`,
    };
  });
}

// ─── d10 (common × 1, rare × 5) ─────────────────────────────────────
function generateD10Variants(): DiceSeedEntry[] {
  const variants: DiceSeedEntry[] = [];

  // common: flat 2 of each
  variants.push({
    dice_notation: "d10",
    rarity: "common",
    name: "D10 Balanced",
    faces: flatDistribution(2),
    price: 75,
    description: "A ten-sided die with 2 of each element.",
  });

  // rare: one element at 3, another drops to 1
  for (const boosted of ELEMENTS) {
    const reducedIndex = (ELEMENTS.indexOf(boosted) + 1) % ELEMENTS.length;
    const reduced = ELEMENTS[reducedIndex];

    const faces: Element[] = [];
    for (const el of ELEMENTS) {
      if (el === boosted) faces.push(...repeat(el, 3));
      else if (el === reduced) faces.push(el);
      else faces.push(...repeat(el, 2));
    }
    variants.push({
      dice_notation: "d10",
      rarity: "rare",
      name: `D10 ${capitalize(boosted)} Focus`,
      faces: shuffleNoAdjacent(faces),
      price: 225,
      description: `A ten-sided die favoring ${boosted} (3 faces).`,
    });
  }

  return variants;
}

// ─── d12 (common × 5) ───────────────────────────────────────────────
function generateD12Variants(): DiceSeedEntry[] {
  // Base: 2 of each = 10 faces, + 2 extras on the boosted element
  return ELEMENTS.map((boosted) => {
    const faces: Element[] = [];
    for (const el of ELEMENTS) {
      faces.push(...repeat(el, el === boosted ? 4 : 2));
    }
    return {
      dice_notation: "d12",
      rarity: "common",
      name: `D12 ${capitalize(boosted)}+`,
      faces: shuffleNoAdjacent(faces),
      price: 90,
      description: `A twelve-sided die with extra ${boosted} faces.`,
    };
  });
}

// ─── d20 (common × 1, rare × 5, epic × 5) ────────────────────────
function generateD20Variants(): DiceSeedEntry[] {
  const variants: DiceSeedEntry[] = [];

  // common: flat 4 of each
  variants.push({
    dice_notation: "d20",
    rarity: "common",
    name: "D20 Balanced",
    faces: flatDistribution(4),
    price: 125,
    description: "A twenty-sided die with 4 of each element.",
  });

  // rare: one element at 5 faces (6+3+4+4+3 would be wrong, let's do 5+3+4+4+4=20)
  for (const boosted of ELEMENTS) {
    const reducedIndex = (ELEMENTS.indexOf(boosted) + 1) % ELEMENTS.length;
    const reduced = ELEMENTS[reducedIndex];

    const faces: Element[] = [];
    for (const el of ELEMENTS) {
      if (el === boosted) faces.push(...repeat(el, 5));
      else if (el === reduced) faces.push(...repeat(el, 3));
      else faces.push(...repeat(el, 4));
    }
    variants.push({
      dice_notation: "d20",
      rarity: "rare",
      name: `D20 ${capitalize(boosted)} Focus`,
      faces: shuffleNoAdjacent(faces),
      price: 375,
      description: `A twenty-sided die favoring ${boosted} (5 faces).`,
    });
  }

  // epic: one element at 6 faces (6+3+3+4+4=20)
  for (const boosted of ELEMENTS) {
    const reducedIndex1 = (ELEMENTS.indexOf(boosted) + 1) % ELEMENTS.length;
    const reducedIndex2 = (ELEMENTS.indexOf(boosted) + 2) % ELEMENTS.length;
    const reduced1 = ELEMENTS[reducedIndex1];
    const reduced2 = ELEMENTS[reducedIndex2];

    const faces: Element[] = [];
    for (const el of ELEMENTS) {
      if (el === boosted) faces.push(...repeat(el, 6));
      else if (el === reduced1 || el === reduced2) faces.push(...repeat(el, 3));
      else faces.push(...repeat(el, 4));
    }
    variants.push({
      dice_notation: "d20",
      rarity: "epic",
      name: `D20 ${capitalize(boosted)} Mastery`,
      faces: shuffleNoAdjacent(faces),
      price: 1000,
      description: `A twenty-sided die with ${boosted} mastery (6 faces).`,
    });
  }

  return variants;
}

export async function seed(knex: Knex): Promise<void> {
  await knex("dice_types").del();

  const allDice = [
    ...generateD4Variants(),
    ...generateD6Variants(),
    ...generateD10Variants(),
    ...generateD12Variants(),
    ...generateD20Variants(),
  ];

  const diceTypes = allDice.map((d) => ({
    id: knex.raw("uuid_generate_v7()") as unknown as string,
    dice_notation: d.dice_notation,
    rarity: d.rarity,
    name: d.name,
    faces: JSON.stringify(d.faces) as unknown as ElementTypeValue[],
    price: d.price,
    description: d.description,
  }));

  await knex("dice_types").insert(diceTypes);
}

