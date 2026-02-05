import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Insert Level 3 (Hybrid) elementals
  // These are created by fusing 2 different L2 elementals
  await knex('elementals').insert([
    // Fire + Water = Steam Spirit
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Steam Spirit',
      level: 3,
      element_types: JSON.stringify(['fire', 'water']),
      base_stats: JSON.stringify({
        health: 280,
        attack: 58,
        defense: 35,
        speed: 45,
      }),
      description: 'A hybrid of fire and water, shrouded in scalding mist.',
      is_base_elemental: false,
    },
    // Fire + Earth = Magma Golem
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Magma Golem',
      level: 3,
      element_types: JSON.stringify(['fire', 'earth']),
      base_stats: JSON.stringify({
        health: 320,
        attack: 55,
        defense: 48,
        speed: 28,
      }),
      description: 'Molten rock given form, unstoppable and burning.',
      is_base_elemental: false,
    },
    // Fire + Air = Flame Vortex
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Flame Vortex',
      level: 3,
      element_types: JSON.stringify(['fire', 'air']),
      base_stats: JSON.stringify({
        health: 250,
        attack: 62,
        defense: 25,
        speed: 60,
      }),
      description: 'A whirlwind of fire, swift and all-consuming.',
      is_base_elemental: false,
    },
    // Fire + Lightning = Inferno Storm
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Inferno Storm',
      level: 3,
      element_types: JSON.stringify(['fire', 'lightning']),
      base_stats: JSON.stringify({
        health: 260,
        attack: 70,
        defense: 30,
        speed: 55,
      }),
      description: 'Lightning and flame merged into devastating chaos.',
      is_base_elemental: false,
    },
    // Water + Earth = Mud Titan
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Mud Titan',
      level: 3,
      element_types: JSON.stringify(['water', 'earth']),
      base_stats: JSON.stringify({
        health: 340,
        attack: 45,
        defense: 55,
        speed: 22,
      }),
      description: 'A massive being of mud and silt, slow but nearly immovable.',
      is_base_elemental: false,
    },
    // Water + Air = Storm Harpy
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Storm Harpy',
      level: 3,
      element_types: JSON.stringify(['water', 'air']),
      base_stats: JSON.stringify({
        health: 260,
        attack: 52,
        defense: 32,
        speed: 58,
      }),
      description: 'A creature of storm clouds, raining fury from above.',
      is_base_elemental: false,
    },
    // Water + Lightning = Storm Leviathan
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Storm Leviathan',
      level: 3,
      element_types: JSON.stringify(['water', 'lightning']),
      base_stats: JSON.stringify({
        health: 300,
        attack: 65,
        defense: 38,
        speed: 48,
      }),
      description: 'A serpent of water and lightning, ruler of the tempest seas.',
      is_base_elemental: false,
    },
    // Earth + Air = Sand Colossus
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Sand Colossus',
      level: 3,
      element_types: JSON.stringify(['earth', 'air']),
      base_stats: JSON.stringify({
        health: 290,
        attack: 50,
        defense: 45,
        speed: 40,
      }),
      description: 'A giant formed of swirling sand, crushing all in its path.',
      is_base_elemental: false,
    },
    // Earth + Lightning = Crystal Thunderlord
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Crystal Thunderlord',
      level: 3,
      element_types: JSON.stringify(['earth', 'lightning']),
      base_stats: JSON.stringify({
        health: 310,
        attack: 60,
        defense: 50,
        speed: 35,
      }),
      description: 'Crystalline earth charged with thunderous energy.',
      is_base_elemental: false,
    },
    // Air + Lightning = Storm Archon
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Storm Archon',
      level: 3,
      element_types: JSON.stringify(['air', 'lightning']),
      base_stats: JSON.stringify({
        health: 240,
        attack: 68,
        defense: 28,
        speed: 65,
      }),
      description: 'A being of pure storm energy, striking with unmatched speed.',
      is_base_elemental: false,
    },
  ]);
}
