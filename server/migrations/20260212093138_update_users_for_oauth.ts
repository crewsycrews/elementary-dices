import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Make password_hash nullable (for OAuth-only users)
    table.string('password_hash', 255).nullable().alter();

    // Add new fields for OAuth and user tracking
    table.boolean('email_verified').defaultTo(false).notNullable();
    table.timestamp('last_login_at').nullable();
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Restore password_hash as required
    table.string('password_hash', 255).notNullable().alter();

    // Drop new columns
    table.dropColumn('email_verified');
    table.dropColumn('last_login_at');
  });
}

