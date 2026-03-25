import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasSessionTable = await knex.schema.hasTable("events_farkle_session");
  if (hasSessionTable) {
    await knex.schema.alterTable("events_farkle_session", (table) => {
      table.string("set_aside_element", 32).nullable().alter();
    });
  }

  const hasStateTable = await knex.schema.hasTable("events_farkle_state");
  if (hasStateTable) {
    const hasAssignmentState = await knex.schema.hasColumn(
      "events_farkle_state",
      "assignment_state",
    );
    if (!hasAssignmentState) {
      await knex.schema.alterTable("events_farkle_state", (table) => {
        table.jsonb("assignment_state").nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasStateTable = await knex.schema.hasTable("events_farkle_state");
  if (hasStateTable) {
    const hasAssignmentState = await knex.schema.hasColumn(
      "events_farkle_state",
      "assignment_state",
    );
    if (hasAssignmentState) {
      await knex.schema.alterTable("events_farkle_state", (table) => {
        table.dropColumn("assignment_state");
      });
    }
  }

  const hasSessionTable = await knex.schema.hasTable("events_farkle_session");
  if (hasSessionTable) {
    await knex.schema.alterTable("events_farkle_session", (table) => {
      table.string("set_aside_element", 32).notNullable().alter();
    });
  }
}
