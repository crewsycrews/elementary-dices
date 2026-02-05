import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create battle type enum
  await knex.raw(`
    CREATE TYPE battle_type AS ENUM ('wild_encounter', 'pvp', 'merchant_event');
  `);

  // Create battle status enum
  await knex.raw(`
    CREATE TYPE battle_status AS ENUM ('pending', 'in_progress', 'completed', 'fled');
  `);

  // Create battle outcome enum
  await knex.raw(`
    CREATE TYPE battle_outcome AS ENUM ('victory', 'defeat', 'draw');
  `);

  await knex.schema.createTable('battles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.enu('battle_type', ['wild_encounter', 'pvp', 'merchant_event'], {
      useNative: true,
      enumName: 'battle_type',
      existingType: true,
    }).notNullable();
    table.uuid('initiator_player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('opponent_player_id').references('id').inTable('users').onDelete('CASCADE');
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
    table.jsonb('rewards'); // { currency?, items?, captured_elemental_id? }
    table.jsonb('penalties'); // { downgraded_elemental_ids }
    table.timestamp('completed_at');

    // Indexes
    table.index(['initiator_player_id', 'status']);
    table.index(['battle_type', 'id']); // id is sortable by time due to UUIDv7
    table.index(['opponent_player_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('battles');
  await knex.raw('DROP TYPE IF EXISTS battle_type');
  await knex.raw('DROP TYPE IF EXISTS battle_status');
  await knex.raw('DROP TYPE IF EXISTS battle_outcome');
}
