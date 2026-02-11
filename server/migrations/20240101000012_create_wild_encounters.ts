import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create wild_encounters config table (lookup table for spawn weights and capture difficulty)
  await knex.schema.createTable('wild_encounters', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('elemental_id').notNullable().references('id').inTable('elementals').onDelete('CASCADE');
    table.integer('spawn_weight').notNullable().defaultTo(100);
    table.integer('capture_difficulty').notNullable().defaultTo(10);
    table.float('min_stats_modifier').notNullable().defaultTo(0.8);
    table.float('max_stats_modifier').notNullable().defaultTo(1.2);
    table.boolean('is_active').notNullable().defaultTo(true);

    // Indexes
    table.index(['is_active', 'spawn_weight']);
    table.index(['elemental_id']);
  });

  // Create events_wild_encounter table (actual encounter instances)
  await knex.schema.createTable('events_wild_encounter', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Encounter Details
    table.uuid('elemental_id').notNullable().references('id').inTable('elementals').onDelete('CASCADE');
    table.decimal('stats_modifier', 3, 2).notNullable().defaultTo(1.0); // 0.8 to 1.2

    // Resolution Details (NULL until resolved)
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
    table.uuid('dice_roll_id').references('id').inTable('dice_rolls').onDelete('SET NULL');
    table.uuid('item_used_id').references('id').inTable('items').onDelete('SET NULL');
    table.uuid('captured_player_elemental_id').references('id').inTable('player_elementals').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at');

    // Indexes
    table.index(['player_id', 'created_at'], 'idx_wild_encounter_player');
    table.index(['status'], 'idx_wild_encounter_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('events_wild_encounter');
  await knex.schema.dropTableIfExists('wild_encounters');
}
