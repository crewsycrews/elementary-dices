import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events_battle', (table) => {
    table.jsonb('battle_state').nullable();
    table.jsonb('opponent_party_data').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events_battle', (table) => {
    table.dropColumn('battle_state');
    table.dropColumn('opponent_party_data');
  });
}
