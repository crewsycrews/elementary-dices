import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries (cascade will handle related tables)
  await knex("elementals").del();

  // Insert base Level 1 elementals
  await knex("elementals").insert([
    {
      id: knex.raw("uuid_generate_v7()"),
      name: "Fire Elemental",
      level: 1,
      element_types: JSON.stringify(["fire"]),
      base_stats: JSON.stringify({
        health: 100,
        attack: 25,
        defense: 10,
        speed: 20,
      }),
      description:
        "A burning spirit of pure flame. Quick to anger and fierce in battle.",
      is_base_elemental: true,
      image_url: "https://ink-empire.s3.cloud.ru/elems/1/fire.jpg",
    },
    {
      id: knex.raw("uuid_generate_v7()"),
      name: "Water Elemental",
      level: 1,
      element_types: JSON.stringify(["water"]),
      base_stats: JSON.stringify({
        health: 120,
        attack: 20,
        defense: 15,
        speed: 15,
      }),
      description: "A flowing entity of water. Adaptable and persistent.",
      is_base_elemental: true,
      image_url: "https://ink-empire.s3.cloud.ru/elems/1/water.jpg",
    },
    {
      id: knex.raw("uuid_generate_v7()"),
      name: "Earth Elemental",
      level: 1,
      element_types: JSON.stringify(["earth"]),
      base_stats: JSON.stringify({
        health: 150,
        attack: 15,
        defense: 25,
        speed: 10,
      }),
      description:
        "A solid mass of rock and soil. Slow but incredibly durable.",
      is_base_elemental: true,
      image_url: "https://ink-empire.s3.cloud.ru/elems/1/earth.jpg",
    },
    {
      id: knex.raw("uuid_generate_v7()"),
      name: "Air Elemental",
      level: 1,
      element_types: JSON.stringify(["air"]),
      base_stats: JSON.stringify({
        health: 80,
        attack: 22,
        defense: 8,
        speed: 30,
      }),
      description: "A whirling vortex of wind. Swift and unpredictable.",
      is_base_elemental: true,
      image_url: "https://ink-empire.s3.cloud.ru/elems/1/air.jpg",
    },
    {
      id: knex.raw("uuid_generate_v7()"),
      name: "Lightning Elemental",
      level: 1,
      element_types: JSON.stringify(["lightning"]),
      base_stats: JSON.stringify({
        health: 90,
        attack: 30,
        defense: 12,
        speed: 25,
      }),
      description: "A crackling bolt of pure energy. Devastating and fast.",
      is_base_elemental: true,
      image_url: "https://ink-empire.s3.cloud.ru/elems/1/lightning.jpg",
    },
  ]);
}
