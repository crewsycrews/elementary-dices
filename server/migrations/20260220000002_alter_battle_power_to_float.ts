import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events_battle', (table) => {
    table.float('player_power').alter();
    table.float('opponent_actual_power').alter();
    table.float('opponent_power_level').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events_battle', (table) => {
    table.integer('player_power').alter();
    table.integer('opponent_actual_power').alter();
    table.integer('opponent_power_level').alter();
  });
}
