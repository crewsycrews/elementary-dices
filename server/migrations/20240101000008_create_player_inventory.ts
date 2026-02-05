import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('item_id').notNullable().references('id').inTable('items').onDelete('CASCADE');
    table.integer('quantity').notNullable().defaultTo(1);

    // Indexes
    table.index(['player_id']);
    table.index(['item_id']);

    // Unique constraint: one row per player+item combination
    table.unique(['player_id', 'item_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_inventory');
}
