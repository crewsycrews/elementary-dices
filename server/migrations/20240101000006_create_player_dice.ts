import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_dice', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('dice_type_id').notNullable().references('id').inTable('dice_types').onDelete('CASCADE');
    table.boolean('is_equipped').notNullable().defaultTo(false);

    // Indexes
    table.index(['player_id', 'is_equipped']);
    table.index(['dice_type_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_dice');
}
