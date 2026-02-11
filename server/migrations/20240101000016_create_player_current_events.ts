import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_current_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.string('event_type', 50).notNullable(); // 'wild_encounter', 'pvp_battle', 'merchant'

    // Foreign Keys to Event Tables (exactly ONE must be set)
    table.uuid('wild_encounter_id').references('id').inTable('events_wild_encounter').onDelete('CASCADE');
    table.uuid('battle_id').references('id').inTable('events_battle').onDelete('CASCADE');
    table.uuid('merchant_id').references('id').inTable('events_merchant').onDelete('CASCADE');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at'); // Optional expiry for events

    // Indexes
    table.index(['player_id'], 'idx_current_events_player');
    table.index(['event_type'], 'idx_current_events_type');
    table.index(['expires_at'], 'idx_current_events_expires');
  });

  // Add CHECK constraint: Exactly one event FK must be set
  await knex.raw(`
    ALTER TABLE player_current_events
    ADD CONSTRAINT check_exactly_one_event_fk
    CHECK (
      (wild_encounter_id IS NOT NULL)::int +
      (battle_id IS NOT NULL)::int +
      (merchant_id IS NOT NULL)::int = 1
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_current_events');
}
