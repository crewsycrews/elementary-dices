import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('player_dice', (table) => {
    // Add dice_notation column (nullable initially for backfill)
    table.string('dice_notation', 10).nullable();
  });

  // Backfill dice_notation from dice_types table
  await knex.raw(`
    UPDATE player_dice
    SET dice_notation = dice_types.dice_notation
    FROM dice_types
    WHERE player_dice.dice_type_id = dice_types.id
  `);

  // Now set NOT NULL constraint after backfill
  await knex.schema.alterTable('player_dice', (table) => {
    table.string('dice_notation', 10).notNullable().alter();
  });

  // Create partial unique index to prevent duplicate equipped dice per notation
  // Only one dice of each notation can be equipped per player
  await knex.raw(`
    CREATE UNIQUE INDEX player_dice_unique_equipped_notation
    ON player_dice (player_id, dice_notation)
    WHERE is_equipped = true
  `);

  // Add regular index for fast lookups by player and notation
  await knex.schema.alterTable('player_dice', (table) => {
    table.index(['player_id', 'dice_notation'], 'player_dice_player_notation_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('player_dice', (table) => {
    // Drop indexes
    table.dropIndex(['player_id', 'dice_notation'], 'player_dice_player_notation_idx');
  });

  // Drop partial unique index
  await knex.raw('DROP INDEX IF EXISTS player_dice_unique_equipped_notation');

  // Drop dice_notation column
  await knex.schema.alterTable('player_dice', (table) => {
    table.dropColumn('dice_notation');
  });
}
