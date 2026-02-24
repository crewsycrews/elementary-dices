import type { Knex } from "knex";
import dotenv from "dotenv";
dotenv.config();

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "elementary_dices",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
  migrations: {
    directory: "./migrations",
    extension: "ts",
    tableName: "knex_migrations",
    loadExtensions: [".ts"],
  },
  seeds: {
    directory: "./seeds",
    extension: "ts",
    loadExtensions: [".ts"],
    specific: "006_dice_types.ts",
  },
  pool: {
    min: 2,
    max: 10,
  },
};

export default config;

// Note: Requires PostgreSQL 17+ for native UUID v7 support
// Enable in first migration: CREATE EXTENSION IF NOT EXISTS "uuid_ossp";
// Or use pg-uuidv7 library for older PostgreSQL versions
