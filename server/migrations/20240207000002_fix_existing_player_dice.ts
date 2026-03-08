import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Fix players with duplicate equipped dice of same notation
  // Keep only the highest rarity dice equipped per notation
  await knex.raw(`
    WITH ranked_equipped AS (
      SELECT
        pd.id,
        pd.player_id,
        pd.dice_notation,
        ROW_NUMBER() OVER (
          PARTITION BY pd.player_id, pd.dice_notation
          ORDER BY
            CASE dt.rarity
              WHEN 'legendary' THEN 1
              WHEN 'epic' THEN 2
              WHEN 'rare' THEN 3
              WHEN 'common' THEN 4
            END,
            pd.id DESC
        ) as rn
      FROM player_dice pd
      JOIN dice_types dt ON pd.dice_type_id = dt.id
      WHERE pd.is_equipped = true
    )
    UPDATE player_dice
    SET is_equipped = false
    WHERE id IN (
      SELECT id FROM ranked_equipped WHERE rn > 1
    )
  `);

  // Step 2: Fix players with no equipped dice
  // Auto-equip one dice per notation (prefer common/starter rarity)
  const playersWithoutEquipped = await knex.raw(`
    SELECT DISTINCT player_id
    FROM player_dice pd1
    WHERE NOT EXISTS (
      SELECT 1 FROM player_dice pd2
      WHERE pd2.player_id = pd1.player_id AND pd2.is_equipped = true
    )
  `);

  for (const row of playersWithoutEquipped.rows) {
    const playerId = row.player_id;

    // For each notation, equip one dice (prefer common rarity)
    await knex.raw(`
      WITH ranked_dice AS (
        SELECT
          pd.id,
          pd.dice_notation,
          ROW_NUMBER() OVER (
            PARTITION BY pd.dice_notation
            ORDER BY
              CASE dt.rarity
                WHEN 'common' THEN 1
                WHEN 'rare' THEN 2
                WHEN 'epic' THEN 3
                WHEN 'legendary' THEN 4
              END,
              pd.id
          ) as rn
        FROM player_dice pd
        JOIN dice_types dt ON pd.dice_type_id = dt.id
        WHERE pd.player_id = ?
      )
      UPDATE player_dice
      SET is_equipped = true
      WHERE id IN (
        SELECT id FROM ranked_dice WHERE rn = 1
      )
    `, [playerId]);
  }

  // Step 3: Delete excess duplicate dice (keep max 5 per notation per player)
  // This cleans up the bug where players got 5 copies of each dice type
  await knex.raw(`
    WITH ranked_all_dice AS (
      SELECT
        pd.id,
        pd.player_id,
        pd.dice_notation,
        pd.is_equipped,
        ROW_NUMBER() OVER (
          PARTITION BY pd.player_id, pd.dice_notation
          ORDER BY
            pd.is_equipped DESC,
            CASE dt.rarity
              WHEN 'legendary' THEN 1
              WHEN 'epic' THEN 2
              WHEN 'rare' THEN 3
              WHEN 'common' THEN 4
            END,
            pd.id
        ) as rn
      FROM player_dice pd
      JOIN dice_types dt ON pd.dice_type_id = dt.id
    )
    DELETE FROM player_dice
    WHERE id IN (
      SELECT id FROM ranked_all_dice WHERE rn > 3
    )
  `);

  // Step 4: Ensure all players have at least 5 equipped dice (one per notation)
  // If a player is missing any notation, we can't fix it here (would need starter dice),
  // but we can log it
  const playersNeedingDice = await knex.raw(`
    SELECT
      player_id,
      COUNT(DISTINCT dice_notation) as equipped_notations
    FROM player_dice
    WHERE is_equipped = true
    GROUP BY player_id
    HAVING COUNT(DISTINCT dice_notation) < 5
  `);

  if (playersNeedingDice.rows.length > 0) {
    console.log(`Warning: ${playersNeedingDice.rows.length} players have fewer than 5 equipped dice notations`);
    console.log('These players should be given starter dice for missing notations');
  }
}

export async function down(knex: Knex): Promise<void> {
  // This migration fixes data consistency, so there's no clean way to rollback
  // We can't restore the bad data that was cleaned up
  console.log('Cannot rollback data migration - manual intervention required if needed');
}
