import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dice_types', (table) => {
    // Add faces column — array of element strings
    table.jsonb('faces').notNullable().defaultTo('[]');

    // Drop deprecated columns
    table.dropColumn('outcome_thresholds');
    table.dropColumn('stat_bonuses');
  });

  // Drop the unique constraint on (dice_notation, rarity)
  // Multiple dice of the same notation+rarity can now exist (e.g. 5 common d4 variants)
  await knex.raw(
    'ALTER TABLE dice_types DROP CONSTRAINT IF EXISTS dice_types_dice_notation_rarity_unique'
  );
}

export async function down(knex: Knex): Promise<void> {
  // Re-add the unique constraint
  await knex.raw(
    'ALTER TABLE dice_types ADD CONSTRAINT dice_types_dice_notation_rarity_unique UNIQUE (dice_notation, rarity)'
  );

  await knex.schema.alterTable('dice_types', (table) => {
    table.dropColumn('faces');
    table.jsonb('stat_bonuses').notNullable().defaultTo('{}');
    table.jsonb('outcome_thresholds').notNullable().defaultTo('{}');
  });
}
