import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'green'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'common'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'green' TO 'common';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'blue'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'rare'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'blue' TO 'rare';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'purple'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'epic'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'purple' TO 'epic';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'gold'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'legendary'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'gold' TO 'legendary';
      END IF;
    END
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'legendary'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'gold'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'legendary' TO 'gold';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'epic'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'purple'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'epic' TO 'purple';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'rare'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'blue'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'rare' TO 'blue';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'common'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'dice_rarity' AND e.enumlabel = 'green'
      ) THEN
        ALTER TYPE dice_rarity RENAME VALUE 'common' TO 'green';
      END IF;
    END
    $$;
  `);
}
