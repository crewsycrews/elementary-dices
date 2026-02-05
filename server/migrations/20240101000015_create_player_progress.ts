import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('total_elementals_owned').notNullable().defaultTo(0);
    table.integer('unique_elementals_collected').notNullable().defaultTo(0);
    table.integer('total_battles').notNullable().defaultTo(0);
    table.integer('battles_won').notNullable().defaultTo(0);
    table.integer('battles_lost').notNullable().defaultTo(0);
    table.integer('total_dice_rolls').notNullable().defaultTo(0);
    table.integer('successful_captures').notNullable().defaultTo(0);
    table.integer('highest_level_elemental').notNullable().defaultTo(1);
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['player_id']);
  });

  // Add trigger to auto-update updated_at
  await knex.raw(`
    CREATE TRIGGER update_player_progress_updated_at BEFORE UPDATE ON player_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_progress');
}
