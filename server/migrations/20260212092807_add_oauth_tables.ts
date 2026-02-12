import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Create oauth_accounts table
  await knex.schema.createTable('oauth_accounts', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v7()'))
      .notNullable();

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('provider', 50).notNullable(); // 'google', 'github', etc.
    table.string('provider_user_id', 255).notNullable(); // Google's user ID

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: one provider account per user
    table.unique(['provider', 'provider_user_id']);

    // Indexes
    table.index('user_id');
    table.index(['provider', 'provider_user_id']);
  });

  // Create refresh_tokens table
  await knex.schema.createTable('refresh_tokens', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v7()'))
      .notNullable();

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('token_hash', 255).notNullable().unique(); // SHA256 hash
    table.uuid('token_family').notNullable(); // For reuse detection
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('revoked_at').nullable();

    // Indexes
    table.index('user_id');
    table.index('token_hash');
    table.index('expires_at');
    table.index('token_family');
  });

  // Add trigger for updated_at on oauth_accounts
  await knex.raw(`
    CREATE TRIGGER update_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}


export async function down(knex: Knex): Promise<void> {
  // Drop trigger first
  await knex.raw('DROP TRIGGER IF EXISTS update_oauth_accounts_updated_at ON oauth_accounts');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('oauth_accounts');
}

