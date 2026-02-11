import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create events_merchant table
  await knex.schema.createTable('events_merchant', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Merchant Details
    table.enu('status', ['pending', 'in_progress', 'completed', 'fled'], {
      useNative: true,
      enumName: 'battle_status',
      existingType: true,
    }).notNullable().defaultTo('pending');
    table.timestamp('available_until').notNullable();

    // Resolution Tracking
    table.integer('total_purchases').notNullable().defaultTo(0);
    table.integer('total_spent').notNullable().defaultTo(0);

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at');

    // Indexes
    table.index(['player_id', 'created_at'], 'idx_merchant_player');
    table.index(['status'], 'idx_merchant_status');
    table.index(['available_until'], 'idx_merchant_availability');
  });

  // Create merchant_inventory table
  await knex.schema.createTable('merchant_inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('merchant_event_id').notNullable().references('id').inTable('events_merchant').onDelete('CASCADE');
    table.uuid('item_id').references('id').inTable('items').onDelete('CASCADE');
    table.uuid('dice_type_id').references('id').inTable('dice_types').onDelete('CASCADE');
    table.integer('price').notNullable();
    table.integer('quantity').notNullable().defaultTo(1);
    table.boolean('purchased').notNullable().defaultTo(false);

    // Indexes
    table.index(['merchant_event_id', 'purchased']);
    table.index(['item_id']);
    table.index(['dice_type_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('merchant_inventory');
  await knex.schema.dropTableIfExists('events_merchant');
}
