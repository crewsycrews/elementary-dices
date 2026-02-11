import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create battle status enum
  await knex.raw(`
    CREATE TYPE battle_status AS ENUM ('pending', 'in_progress', 'completed', 'fled');
  `);

  // Create battle outcome enum
  await knex.raw(`
    CREATE TYPE battle_outcome AS ENUM ('victory', 'defeat', 'draw');
  `);

  await knex.schema.createTable('events_battle', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Opponent Details
    table.uuid('opponent_player_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('opponent_name', 255).notNullable();
    table.integer('opponent_power_level').notNullable();

    // Battle Resolution (NULL until resolved)
    table.enu('status', ['pending', 'in_progress', 'completed', 'fled'], {
      useNative: true,
      enumName: 'battle_status',
      existingType: true,
    }).notNullable().defaultTo('pending');
    table.enu('outcome', ['victory', 'defeat', 'draw'], {
      useNative: true,
      enumName: 'battle_outcome',
      existingType: true,
    });
    table.integer('player_power');
    table.integer('opponent_actual_power');
    table.uuid('dice_roll_id').references('id').inTable('dice_rolls').onDelete('SET NULL');

    // Rewards/Penalties
    table.integer('currency_reward');
    table.uuid('downgraded_elemental_id').references('id').inTable('player_elementals').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at');

    // Indexes
    table.index(['player_id', 'created_at'], 'idx_battle_player');
    table.index(['status'], 'idx_battle_status');
    table.index(['opponent_player_id'], 'idx_battle_opponent');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('events_battle');
  await knex.raw('DROP TYPE IF EXISTS battle_status');
  await knex.raw('DROP TYPE IF EXISTS battle_outcome');
}
