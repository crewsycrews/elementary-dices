import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Get elemental IDs for reference
  const getElementalId = async (name: string) => {
    const result = await knex('elementals').where({ name }).first('id');
    return result?.id;
  };

  // Clear existing evolutions
  await knex('elemental_evolutions').del();

  // Level 1 -> Level 2 evolutions (3 of same element)
  const l1ToL2Evolutions = [
    { result: 'Inferno Sprite', element: 'fire' },
    { result: 'Tidal Guardian', element: 'water' },
    { result: 'Stone Behemoth', element: 'earth' },
    { result: 'Tempest Wisp', element: 'air' },
    { result: 'Thunder Lord', element: 'lightning' },
  ];

  for (const evo of l1ToL2Evolutions) {
    const resultId = await getElementalId(evo.result);
    await knex('elemental_evolutions').insert({
      id: knex.raw('uuid_generate_v7()'),
      result_elemental_id: resultId,
      required_level: 1,
      required_count: 3,
      required_same_element: evo.element,
      hint_text: `Combine three ${evo.element} elementals`,
      is_discovered_by_default: false,
    });
  }

  // Level 2 -> Level 3 evolutions (2 different L2 elements)
  const l2ToL3Evolutions = [
    { result: 'Steam Spirit', elem1: 'fire', elem2: 'water', hint: 'Fire and water create steam' },
    { result: 'Magma Golem', elem1: 'fire', elem2: 'earth', hint: 'Fire melts earth into magma' },
    { result: 'Flame Vortex', elem1: 'fire', elem2: 'air', hint: 'Fire and wind create a blazing vortex' },
    { result: 'Inferno Storm', elem1: 'fire', elem2: 'lightning', hint: 'Fire and lightning combine into chaos' },
    { result: 'Mud Titan', elem1: 'water', elem2: 'earth', hint: 'Water and earth make mud' },
    { result: 'Storm Harpy', elem1: 'water', elem2: 'air', hint: 'Water and air create storm clouds' },
    { result: 'Storm Leviathan', elem1: 'water', elem2: 'lightning', hint: 'Water and lightning form a tempest' },
    { result: 'Sand Colossus', elem1: 'earth', elem2: 'air', hint: 'Earth and air create sandstorms' },
    { result: 'Crystal Thunderlord', elem1: 'earth', elem2: 'lightning', hint: 'Earth and lightning crystallize power' },
    { result: 'Storm Archon', elem1: 'air', elem2: 'lightning', hint: 'Air and lightning birth the storm' },
  ];

  for (const evo of l2ToL3Evolutions) {
    const resultId = await getElementalId(evo.result);
    await knex('elemental_evolutions').insert({
      id: knex.raw('uuid_generate_v7()'),
      result_elemental_id: resultId,
      required_level: 2,
      required_count: 2,
      required_element_1: evo.elem1,
      required_element_2: evo.elem2,
      hint_text: evo.hint,
      is_discovered_by_default: false,
    });
  }

  // Level 3 -> Level 4 evolutions (specific L3 hybrids)
  const l3ToL4Evolutions = [
    {
      result: 'Cataclysm Dragon',
      sources: ['Magma Golem', 'Flame Vortex', 'Inferno Storm'],
      hint: 'Three fire-forged hybrids awaken the dragon',
    },
    {
      result: 'World Titan',
      sources: ['Mud Titan', 'Sand Colossus', 'Crystal Thunderlord'],
      hint: 'Three earth-bound hybrids form the titan',
    },
    {
      result: 'Ether Specter',
      sources: ['Storm Harpy', 'Storm Archon', 'Steam Spirit'],
      hint: 'Three aerial hybrids summon the specter',
    },
    {
      result: 'Infernal Lord',
      sources: ['Inferno Storm', 'Flame Vortex', 'Magma Golem'],
      hint: 'Three infernal hybrids call forth the demon',
    },
    {
      result: 'Nature Deity',
      sources: ['Mud Titan', 'Steam Spirit', 'Storm Leviathan'],
      hint: 'Three water-touched hybrids birth the deity',
    },
  ];

  for (const evo of l3ToL4Evolutions) {
    const resultId = await getElementalId(evo.result);
    const sourceIds = await Promise.all(
      evo.sources.map(name => getElementalId(name))
    );

    await knex('elemental_evolutions').insert({
      id: knex.raw('uuid_generate_v7()'),
      result_elemental_id: resultId,
      required_level: 3,
      required_count: 3,
      required_elemental_ids: JSON.stringify(sourceIds),
      hint_text: evo.hint,
      is_discovered_by_default: false,
    });
  }
}
