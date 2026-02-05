import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Insert Level 4 (Archetype) elementals - The ultimate forms
  // These require specific combinations of L3 hybrids
  await knex('elementals').insert([
    // Dragon - Fire-based hybrids (Magma Golem, Flame Vortex, Inferno Storm)
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Cataclysm Dragon',
      level: 4,
      element_types: JSON.stringify(['fire', 'water', 'earth', 'air', 'lightning']),
      base_stats: JSON.stringify({
        health: 500,
        attack: 100,
        defense: 70,
        speed: 80,
      }),
      description: 'The ultimate fire archetype. A dragon of pure destruction, combining all elements in devastating harmony.',
      is_base_elemental: false,
    },
    // Titan - Earth-based hybrids (Mud Titan, Sand Colossus, Crystal Thunderlord)
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'World Titan',
      level: 4,
      element_types: JSON.stringify(['earth', 'water', 'air', 'lightning']),
      base_stats: JSON.stringify({
        health: 600,
        attack: 80,
        defense: 100,
        speed: 40,
      }),
      description: 'The ultimate earth archetype. A colossal being that shakes the very foundations of reality.',
      is_base_elemental: false,
    },
    // Specter - Air-based hybrids (Storm Harpy, Storm Archon, Steam Spirit)
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Ether Specter',
      level: 4,
      element_types: JSON.stringify(['air', 'water', 'fire', 'lightning']),
      base_stats: JSON.stringify({
        health: 400,
        attack: 90,
        defense: 60,
        speed: 100,
      }),
      description: 'The ultimate air archetype. A phantom of pure ether, untouchable and everywhere at once.',
      is_base_elemental: false,
    },
    // Demon - Fire-dominant hybrids (Inferno Storm, Flame Vortex, Magma Golem)
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Infernal Lord',
      level: 4,
      element_types: JSON.stringify(['fire', 'lightning', 'air', 'earth']),
      base_stats: JSON.stringify({
        health: 480,
        attack: 110,
        defense: 65,
        speed: 75,
      }),
      description: 'The ultimate inferno archetype. A demonic entity of pure hellfire and chaos.',
      is_base_elemental: false,
    },
    // Nature Deity - Water-based hybrids (Mud Titan, Steam Spirit, Storm Leviathan)
    {
      id: knex.raw('uuid_generate_v7()'),
      name: 'Nature Deity',
      level: 4,
      element_types: JSON.stringify(['water', 'earth', 'fire', 'lightning']),
      base_stats: JSON.stringify({
        health: 550,
        attack: 85,
        defense: 80,
        speed: 60,
      }),
      description: 'The ultimate water archetype. A divine being of nature itself, life and death intertwined.',
      is_base_elemental: false,
    },
  ]);
}
