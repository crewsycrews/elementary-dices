import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create dice roll outcome enum
  await knex.raw(`
    CREATE TYPE dice_roll_outcome AS ENUM ('crit_success', 'success', 'fail', 'crit_fail');
  `);

  // Create dice roll context enum
  await knex.raw(`
    CREATE TYPE dice_roll_context AS ENUM ('capture_attempt', 'combat', 'penalty_roll', 'event_trigger', 'initial_roll');
  `);

  await knex.schema.createTable("dice_rolls", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v7()"));
    table
      .uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("dice_type_id")
      .notNullable()
      .references("id")
      .inTable("dice_types")
      .onDelete("CASCADE");
    table.integer("roll_value").notNullable();
    table
      .enu("outcome", ["crit_success", "success", "fail", "crit_fail"], {
        useNative: true,
        enumName: "dice_roll_outcome",
        existingType: true,
      })
      .notNullable();
    table
      .enu(
        "context",
        [
          "capture_attempt",
          "combat",
          "penalty_roll",
          "event_trigger",
          "initial_roll",
        ],
        {
          useNative: true,
          enumName: "dice_roll_context",
          existingType: true,
        },
      )
      .notNullable();
    table.jsonb("modifiers"); // { element_bonus?, item_bonus?, total_bonus? }

    // Indexes
    table.index(["player_id", "id"]); // id is sortable by time
    table.index(["context"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("dice_rolls");
  await knex.raw("DROP TYPE IF EXISTS dice_roll_outcome");
  await knex.raw("DROP TYPE IF EXISTS dice_roll_context");
}
