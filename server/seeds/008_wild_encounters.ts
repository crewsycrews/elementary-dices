import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing wild encounters
  await knex('wild_encounters').del();

  // Get all base elementals (Level 1)
  const baseElementals = await knex('elementals')
    .where({ level: 1, is_base_elemental: true })
    .select('id', 'name');

  // Add base elementals to wild encounter pool with high spawn rates
  const wildEncounters = baseElementals.map((elemental) => ({
    id: knex.raw('uuid_generate_v7()'),
    elemental_id: elemental.id,
    spawn_weight: 100, // Equal chance for all base elementals
    capture_difficulty: 10, // Base difficulty
    min_stats_modifier: 0.8,
    max_stats_modifier: 1.2,
    is_active: true,
  }));

  // Get some Level 2 elementals for rarer spawns
  const level2Elementals = await knex('elementals')
    .where({ level: 2 })
    .select('id', 'name');

  // Add Level 2 elementals with lower spawn rates and higher difficulty
  level2Elementals.forEach((elemental) => {
    wildEncounters.push({
      id: knex.raw('uuid_generate_v7()'),
      elemental_id: elemental.id,
      spawn_weight: 20, // Much rarer
      capture_difficulty: 20, // Harder to capture
      min_stats_modifier: 0.9,
      max_stats_modifier: 1.3,
      is_active: true,
    });
  });

  await knex('wild_encounters').insert(wildEncounters);
}
