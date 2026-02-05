import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create custom UUIDv7 function for PostgreSQL < 17
  // This generates time-ordered UUIDs compatible with UUIDv7 spec
  await knex.raw(`
    CREATE OR REPLACE FUNCTION uuid_generate_v7()
    RETURNS uuid
    AS $$
    DECLARE
      unix_ts_ms bigint;
      uuid_bytes bytea;
    BEGIN
      unix_ts_ms = (extract(epoch from clock_timestamp()) * 1000)::bigint;
      uuid_bytes = decode(
        lpad(to_hex(unix_ts_ms), 12, '0') ||
        encode(gen_random_bytes(10), 'hex'),
        'hex'
      );

      -- Set version (7) and variant bits
      uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
      uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

      RETURN encode(uuid_bytes, 'hex')::uuid;
    END
    $$ LANGUAGE plpgsql VOLATILE;
  `);

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.string('username', 20).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.integer('currency').notNullable().defaultTo(0);
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['username']);
    table.index(['email']);
  });

  // Add trigger to auto-update updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS uuid_generate_v7()');
}
