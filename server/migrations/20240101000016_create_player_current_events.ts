import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('player_current_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.string('event_type').notNullable(); // 'wild_encounter', 'pvp_battle', 'merchant'
    table.jsonb('event_data').notNullable(); // Event-specific data
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // Optional expiry for events

    // Indexes
    table.index(['player_id']);
    table.index(['event_type']);
    table.index(['expires_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('player_current_events');
}
