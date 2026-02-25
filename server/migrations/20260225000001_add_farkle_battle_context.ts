import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TYPE dice_roll_context ADD VALUE IF NOT EXISTS 'farkle_battle'`,
  );
}

export async function down(_knex: Knex): Promise<void> {
  // PostgreSQL does not support removing enum values.
  // The 'farkle_battle' value will remain but won't be used.
}
