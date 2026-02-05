import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_discoveries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('elemental_evolution_id').notNullable().references('id').inTable('elemental_evolutions').onDelete('CASCADE');

    // Indexes
    table.index(['player_id']);
    table.index(['elemental_evolution_id']);

    // Unique constraint: player can only discover each evolution once
    table.unique(['player_id', 'elemental_evolution_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_discoveries');
}
