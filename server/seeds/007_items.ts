import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing items
  await knex('items').del();

  await knex('items').insert([
    // Capture items
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Basic Capture Orb',
      item_type: 'capture',
      effect: JSON.stringify({ capture_bonus: 5 }),
      price: 50,
      rarity: 'common',
      description: 'A simple orb used to capture wild elementals. Provides a +5 bonus to capture rolls.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Enhanced Capture Orb',
      item_type: 'capture',
      effect: JSON.stringify({ capture_bonus: 10 }),
      price: 150,
      rarity: 'rare',
      description: 'An improved capture orb. Provides a +10 bonus to capture rolls.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Master Capture Orb',
      item_type: 'capture',
      effect: JSON.stringify({ capture_bonus: 20 }),
      price: 500,
      rarity: 'epic',
      description: 'A powerful capture orb. Provides a +20 bonus to capture rolls.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Legendary Binding Sphere',
      item_type: 'capture',
      effect: JSON.stringify({ capture_bonus: 35 }),
      price: 1500,
      rarity: 'legendary',
      description: 'The ultimate capture device. Provides a +35 bonus to capture rolls.',
      is_consumable: true,
    },
  ]);
}
