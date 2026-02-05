import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create merchant_events table
  await knex.schema.createTable('merchant_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('player_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('available_until').notNullable();
    table.boolean('is_expired').notNullable().defaultTo(false);

    // Indexes
    table.index(['player_id', 'is_expired', 'available_until']);
  });

  // Create merchant_inventory table
  await knex.schema.createTable('merchant_inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('merchant_event_id').notNullable().references('id').inTable('merchant_events').onDelete('CASCADE');
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
  await knex.schema.dropTableIfExists('merchant_events');
}
