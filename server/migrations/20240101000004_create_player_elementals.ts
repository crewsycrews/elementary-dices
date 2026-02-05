import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_elementals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('elemental_id').notNullable().references('id').inTable('elementals').onDelete('CASCADE');
    table.jsonb('current_stats').notNullable(); // { health, attack, defense, speed }
    table.boolean('is_in_active_party').notNullable().defaultTo(false);
    table.integer('party_position').checkBetween([1, 5]);

    // Indexes
    table.index(['player_id', 'is_in_active_party']);
    table.index(['player_id', 'elemental_id']);
    table.index(['party_position']);

    // Unique constraint: only one elemental per party position per player
    table.unique(['player_id', 'party_position']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_elementals');
}
