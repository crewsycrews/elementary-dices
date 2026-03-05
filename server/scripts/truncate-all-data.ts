import { db } from '../db';

type PgTableRow = {
  schemaname: string;
  tablename: string;
};

const EXCLUDED_TABLES = new Set(['knex_migrations', 'knex_migrations_lock']);

async function truncateAllData() {
  const result = (await db.raw(`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `)) as { rows: PgTableRow[] };

  const rows: PgTableRow[] = result.rows ?? [];
  const tables = rows
    .filter(({ tablename }) => !EXCLUDED_TABLES.has(tablename))
    .map(({ schemaname, tablename }) => `"${schemaname.replace(/"/g, '""')}"."${tablename.replace(/"/g, '""')}"`);

  if (tables.length === 0) {
    console.log('No application tables found to truncate.');
    return;
  }

  await db.raw(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
  console.log(`Truncated ${tables.length} tables.`);
}

async function main() {
  try {
    await truncateAllData();
  } catch (error) {
    console.error('Failed to truncate tables:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

void main();
