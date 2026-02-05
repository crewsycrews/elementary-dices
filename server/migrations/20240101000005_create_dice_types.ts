import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create dice rarity enum
  await knex.raw(`
    CREATE TYPE dice_rarity AS ENUM ('green', 'blue', 'purple', 'gold');
  `);

  await knex.schema.createTable('dice_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.string('dice_notation', 10).notNullable(); // d4, d6, d10, d12, d20
    table.enu('rarity', ['green', 'blue', 'purple', 'gold'], {
      useNative: true,
      enumName: 'dice_rarity',
      existingType: true,
    }).notNullable();
    table.string('name', 100).notNullable();
    table.jsonb('stat_bonuses').notNullable(); // { bonus_multiplier, element_affinity? }
    table.jsonb('outcome_thresholds').notNullable(); // { crit_success_range, success_range, fail_range, crit_fail_range }
    table.integer('price').notNullable();
    table.text('description').notNullable();

    // Indexes
    table.index(['rarity']);
    table.index(['dice_notation']);

    // Unique constraint: dice_notation + rarity
    table.unique(['dice_notation', 'rarity']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dice_types');
  await knex.raw('DROP TYPE IF EXISTS dice_rarity');
}
