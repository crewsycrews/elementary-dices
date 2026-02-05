import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('battle_participants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('battle_id').notNullable().references('id').inTable('battles').onDelete('CASCADE');
    table.uuid('player_elemental_id').references('id').inTable('player_elementals').onDelete('SET NULL');
    table.uuid('wild_elemental_id').references('id').inTable('elementals').onDelete('SET NULL');
    table.integer('position').notNullable().checkBetween([1, 5]);
    table.jsonb('calculated_stats').notNullable(); // Stats snapshot at battle time
    table.integer('damage_dealt').notNullable().defaultTo(0);
    table.integer('damage_taken').notNullable().defaultTo(0);
    table.boolean('survived').notNullable().defaultTo(true);

    // Indexes
    table.index(['battle_id']);
    table.index(['player_elemental_id']);
    table.index(['wild_elemental_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('battle_participants');
}
