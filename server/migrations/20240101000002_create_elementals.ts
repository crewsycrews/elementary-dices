import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create element type enum
  await knex.raw(`
    CREATE TYPE element_type AS ENUM ('fire', 'water', 'earth', 'air', 'lightning');
  `);

  // Create elementals table
  await knex.schema.createTable('elementals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.string('name', 100).notNullable();
    table.integer('level').notNullable().checkBetween([1, 4]);
    table.jsonb('element_types').notNullable(); // Array of element_type
    table.jsonb('base_stats').notNullable(); // { health, attack, defense, speed }
    table.text('description').notNullable();
    table.string('image_url', 500);
    table.boolean('is_base_elemental').notNullable().defaultTo(false);

    // Indexes
    table.index(['level']);
    table.index(['is_base_elemental']);
    table.index(['element_types'], undefined, 'gin'); // GIN index for JSONB array queries
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('elementals');
  await knex.raw('DROP TYPE IF EXISTS element_type');
}
