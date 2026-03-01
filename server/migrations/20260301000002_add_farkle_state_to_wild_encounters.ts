import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("events_wild_encounter", (table) => {
    table.jsonb("farkle_state").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("events_wild_encounter", (table) => {
    table.dropColumn("farkle_state");
  });
}
