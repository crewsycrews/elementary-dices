import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Insert Level 2 (Pure Upgraded) elementals
  // These are created by fusing 3 of the same L1 element
  await knex('elementals').insert([
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Inferno Sprite',
      level: 2,
      element_types: JSON.stringify(['fire']),
      base_stats: JSON.stringify({
        health: 180,
        attack: 45,
        defense: 18,
        speed: 35,
      }),
      description: 'An evolved fire elemental burning with intensified power.',
      is_base_elemental: false,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Tidal Guardian',
      level: 2,
      element_types: JSON.stringify(['water']),
      base_stats: JSON.stringify({
        health: 200,
        attack: 35,
        defense: 28,
        speed: 25,
      }),
      description: 'An evolved water elemental with commanding presence over the seas.',
      is_base_elemental: false,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Stone Behemoth',
      level: 2,
      element_types: JSON.stringify(['earth']),
      base_stats: JSON.stringify({
        health: 250,
        attack: 28,
        defense: 45,
        speed: 18,
      }),
      description: 'An evolved earth elemental with mountainous strength.',
      is_base_elemental: false,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Tempest Wisp',
      level: 2,
      element_types: JSON.stringify(['air']),
      base_stats: JSON.stringify({
        health: 140,
        attack: 38,
        defense: 15,
        speed: 50,
      }),
      description: 'An evolved air elemental moving at hurricane speeds.',
      is_base_elemental: false,
    },
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Thunder Lord',
      level: 2,
      element_types: JSON.stringify(['lightning']),
      base_stats: JSON.stringify({
        health: 160,
        attack: 52,
        defense: 22,
        speed: 42,
      }),
      description: 'An evolved lightning elemental crackling with devastating power.',
      is_base_elemental: false,
    },
  ]);
}
