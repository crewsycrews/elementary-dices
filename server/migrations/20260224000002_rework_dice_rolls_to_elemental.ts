import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dice_rolls', (table) => {
    // Add result_element column
    table.string('result_element', 20).notNullable().defaultTo('fire');

    // Drop deprecated columns
    table.dropColumn('outcome');
    table.dropColumn('modifiers');
  });

  // Drop the outcome enum type since it's no longer used
  await knex.raw('DROP TYPE IF EXISTS dice_roll_outcome');
}

export async function down(knex: Knex): Promise<void> {
  // Re-create the outcome enum
  await knex.raw(
    "CREATE TYPE dice_roll_outcome AS ENUM ('crit_success', 'success', 'fail', 'crit_fail')"
  );

  await knex.schema.alterTable('dice_rolls', (table) => {
    table.dropColumn('result_element');
    table
      .enu('outcome', ['crit_success', 'success', 'fail', 'crit_fail'], {
        useNative: true,
        enumName: 'dice_roll_outcome',
        existingType: true,
      })
      .notNullable()
      .defaultTo('fail');
    table.jsonb('modifiers');
  });
}
