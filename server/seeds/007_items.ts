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

    // Consumable buffs
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Health Potion',
      item_type: 'consumable',
      effect: JSON.stringify({ stat_modifier: { health: 50 } }),
      price: 30,
      rarity: 'common',
      description: 'Restores 50 health to an elemental.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Power Crystal',
      item_type: 'buff',
      effect: JSON.stringify({ stat_modifier: { attack: 10 }, duration: 3 }),
      price: 80,
      rarity: 'rare',
      description: 'Temporarily increases attack by 10 for 3 battles.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Shield Essence',
      item_type: 'buff',
      effect: JSON.stringify({ stat_modifier: { defense: 10 }, duration: 3 }),
      price: 80,
      rarity: 'rare',
      description: 'Temporarily increases defense by 10 for 3 battles.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Speed Elixir',
      item_type: 'buff',
      effect: JSON.stringify({ stat_modifier: { speed: 10 }, duration: 3 }),
      price: 80,
      rarity: 'rare',
      description: 'Temporarily increases speed by 10 for 3 battles.',
      is_consumable: true,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Titan\'s Blessing',
      item_type: 'buff',
      effect: JSON.stringify({
        stat_modifier: { health: 50, attack: 15, defense: 15, speed: 10 },
        duration: 5,
      }),
      price: 400,
      rarity: 'epic',
      description: 'A powerful blessing that enhances all stats for 5 battles.',
      is_consumable: true,
    },
  ]);
}
