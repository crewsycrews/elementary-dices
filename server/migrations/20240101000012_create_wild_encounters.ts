import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('wild_encounters', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('elemental_id').notNullable().references('id').inTable('elementals').onDelete('CASCADE');
    table.integer('spawn_weight').notNullable().defaultTo(100);
    table.integer('capture_difficulty').notNullable().defaultTo(10);
    table.float('min_stats_modifier').notNullable().defaultTo(0.8);
    table.float('max_stats_modifier').notNullable().defaultTo(1.2);
    table.boolean('is_active').notNullable().defaultTo(true);

    // Indexes
    table.index(['is_active', 'spawn_weight']);
    table.index(['elemental_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wild_encounters');
}
