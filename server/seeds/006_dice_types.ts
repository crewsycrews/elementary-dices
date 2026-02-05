import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing dice types
  await knex('dice_types').del();

  // Dice notations
  const diceNotations = ['d4', 'd6', 'd10', 'd12', 'd20'];

  // Rarities with stat multipliers
  const rarities = [
    { rarity: 'green', multiplier: 1.0, priceBase: 50 },
    { rarity: 'blue', multiplier: 1.2, priceBase: 150 },
    { rarity: 'purple', multiplier: 1.5, priceBase: 400 },
    { rarity: 'gold', multiplier: 2.0, priceBase: 1000 },
  ];

  // Thresholds for each dice type (normalized to 4 outcomes)
  const thresholds: Record<string, any> = {
    d4: {
      crit_fail_range: [1, 1],
      fail_range: [2, 2],
      success_range: [3, 3],
      crit_success_range: [4, 4],
    },
    d6: {
      crit_fail_range: [1, 1],
      fail_range: [2, 3],
      success_range: [4, 5],
      crit_success_range: [6, 6],
    },
    d10: {
      crit_fail_range: [1, 2],
      fail_range: [3, 5],
      success_range: [6, 8],
      crit_success_range: [9, 10],
    },
    d12: {
      crit_fail_range: [1, 2],
      fail_range: [3, 6],
      success_range: [7, 10],
      crit_success_range: [11, 12],
    },
    d20: {
      crit_fail_range: [1, 3],
      fail_range: [4, 10],
      success_range: [11, 17],
      crit_success_range: [18, 20],
    },
  };

  const diceTypes = [];

  for (const dice of diceNotations) {
    for (const { rarity, multiplier, priceBase } of rarities) {
      diceTypes.push({
        id: knex.raw('uuid_generate_v7()'),
        dice_notation: dice,
        rarity,
        name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${dice.toUpperCase()}`,
        stat_bonuses: JSON.stringify({
          bonus_multiplier: multiplier,
        }),
        outcome_thresholds: JSON.stringify(thresholds[dice]),
        price: priceBase * (dice === 'd4' ? 1 : dice === 'd6' ? 1.2 : dice === 'd10' ? 1.5 : dice === 'd12' ? 1.8 : 2.5),
        description: `A ${rarity} quality ${dice} die. ${
          multiplier > 1 ? `Provides ${((multiplier - 1) * 100).toFixed(0)}% bonus to rolls.` : 'Standard quality.'
        }`,
      });
    }
  }

  await knex('dice_types').insert(diceTypes);
}
