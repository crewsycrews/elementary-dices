import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table
      .uuid("favorite_dice_id")
      .nullable()
      .references("id")
      .inTable("player_dice")
      .onDelete("SET NULL");
    table.index(["favorite_dice_id"], "users_favorite_dice_id_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropIndex(["favorite_dice_id"], "users_favorite_dice_id_idx");
    table.dropColumn("favorite_dice_id");
  });
}
