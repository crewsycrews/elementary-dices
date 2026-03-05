import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasWildFarkleState = await knex.schema.hasColumn("events_wild_encounter", "farkle_state");
  if (hasWildFarkleState) {
    await knex.schema.alterTable("events_wild_encounter", (table) => {
      table.dropColumn("farkle_state");
    });
  }

  const hasBattleState = await knex.schema.hasColumn("events_battle", "battle_state");
  if (hasBattleState) {
    await knex.schema.alterTable("events_battle", (table) => {
      table.dropColumn("battle_state");
    });
  }

  await knex.schema.createTable("events_farkle_session", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v7()"));
    table.uuid("player_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("event_type", 50).notNullable();
    table.uuid("event_id").notNullable();
    table.string("set_aside_element", 32).notNullable();
    table.string("opponent_set_aside_element", 32).nullable();
    table.string("status", 32).notNullable().defaultTo("active");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.unique(["event_type", "event_id"], { indexName: "uq_farkle_session_event" });
    table.index(["player_id"], "idx_farkle_session_player");
    table.index(["status"], "idx_farkle_session_status");
  });

  await knex.schema.createTable("events_farkle_state", (table) => {
    table.uuid("session_id").primary().references("id").inTable("events_farkle_session").onDelete("CASCADE");
    table.string("phase", 32).notNullable();
    table.boolean("has_used_reroll").notNullable().defaultTo(false);
    table.string("set_aside_element_bonus", 32).nullable();
    table.boolean("is_dice_rush").notNullable().defaultTo(false);
    table.boolean("busted").notNullable().defaultTo(false);
    table.jsonb("dice_state").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("active_combinations").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("detected_combinations").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("meta").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("events_farkle_state");
  await knex.schema.dropTableIfExists("events_farkle_session");

  const hasBattleState = await knex.schema.hasColumn("events_battle", "battle_state");
  if (!hasBattleState) {
    await knex.schema.alterTable("events_battle", (table) => {
      table.jsonb("battle_state").nullable();
    });
  }

  const hasWildFarkleState = await knex.schema.hasColumn("events_wild_encounter", "farkle_state");
  if (!hasWildFarkleState) {
    await knex.schema.alterTable("events_wild_encounter", (table) => {
      table.jsonb("farkle_state").nullable();
    });
  }
}
