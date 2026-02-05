import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create item type enum
  await knex.raw(`
    CREATE TYPE item_type AS ENUM ('capture', 'consumable', 'buff');
  `);

  // Create item rarity enum
  await knex.raw(`
    CREATE TYPE item_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
  `);

  await knex.schema.createTable('items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.string('name', 100).notNullable();
    table.enu('item_type', ['capture', 'consumable', 'buff'], {
      useNative: true,
      enumName: 'item_type',
      existingType: true,
    }).notNullable();
    table.jsonb('effect').notNullable(); // { capture_bonus?, stat_modifier?, duration? }
    table.integer('price').notNullable();
    table.enu('rarity', ['common', 'rare', 'epic', 'legendary'], {
      useNative: true,
      enumName: 'item_rarity',
      existingType: true,
    }).notNullable();
    table.text('description').notNullable();
    table.boolean('is_consumable').notNullable().defaultTo(true);

    // Indexes
    table.index(['item_type']);
    table.index(['rarity']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('items');
  await knex.raw('DROP TYPE IF EXISTS item_type');
  await knex.raw('DROP TYPE IF EXISTS item_rarity');
}
