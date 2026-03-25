import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { t, type Locale } from "../../shared/i18n";
import { PlayerElementalsRepository } from "./repository";
import type {
  AddPlayerElementalData,
  UpdatePlayerElementalData,
  PlayerElementalWithDetails,
  StartGameData,
  StartGameResult,
} from "./models";

export class PlayerElementalsService {
  constructor(private repository = new PlayerElementalsRepository()) {}

  /**
   * Get all elementals for a player
   */
  async findByPlayerId(
    playerId: string,
  ): Promise<PlayerElementalWithDetails[]> {
    return this.repository.findByPlayerId(playerId);
  }

  /**
   * Get active party for a player
   */
  async getActiveParty(
    playerId: string,
  ): Promise<PlayerElementalWithDetails[]> {
    return this.repository.getActiveParty(playerId);
  }

  /**
   * Get backpack for a player
   */
  async getBackpack(playerId: string): Promise<PlayerElementalWithDetails[]> {
    return this.repository.getBackpack(playerId);
  }

  /**
   * Get player elemental by ID
   */
  async findById(id: string): Promise<PlayerElementalWithDetails> {
    const elemental = await this.repository.findById(id);
    if (!elemental) {
      throw new NotFoundError("Player elemental");
    }
    return elemental;
  }

  /**
   * Add elemental to player's collection
   */
  async add(data: AddPlayerElementalData): Promise<PlayerElementalWithDetails> {
    // Check if player has reached max capacity (15 total: 5 active + 10 backpack)
    const count = await this.repository.countByPlayerId(data.player_id);
    if (count >= 15) {
      throw new BadRequestError("Maximum elemental capacity reached (15)");
    }

    // If adding to active party, check if there's space
    if (data.is_in_active_party) {
      const activeParty = await this.repository.getActiveParty(data.player_id);
      if (activeParty.length >= 5) {
        throw new BadRequestError("Active party is full (max 5)");
      }

      // If no position specified, get next available
      if (!data.party_position) {
        const nextPosition = await this.repository.getNextPartyPosition(
          data.player_id,
        );
        if (!nextPosition) {
          throw new BadRequestError("No available party positions");
        }
        data.party_position = nextPosition;
      }
    }

    return this.repository.add(data);
  }

  /**
   * Update player elemental
   */
  async update(
    id: string,
    data: UpdatePlayerElementalData,
  ): Promise<PlayerElementalWithDetails> {
    // Validate party position changes
    if (data.is_in_active_party && data.party_position) {
      const elemental = await this.repository.findById(id);
      if (!elemental) {
        throw new NotFoundError("Player elemental");
      }

      // Check if position is already taken by another elemental
      const existing = await db("player_elementals")
        .where({
          player_id: elemental.player_id,
          party_position: data.party_position,
        })
        .whereNot({ id })
        .first();

      if (existing) {
        throw new BadRequestError(
          `Party position ${data.party_position} is already occupied`,
        );
      }
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new NotFoundError("Player elemental");
    }

    return updated;
  }

  /**
   * Remove elemental from player's collection
   */
  async remove(id: string): Promise<void> {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundError("Player elemental");
    }
  }

  /**
   * Start game - Roll d10 to get first elemental
   * Result element determines the starter's element type
   */
  async startGame(data: StartGameData, locale: Locale = "en"): Promise<StartGameResult> {
    // Check if player already has elementals
    const count = await this.repository.countByPlayerId(data.player_id);
    if (count > 0) {
      throw new BadRequestError(
        "Player already has elementals. Cannot start game again.",
      );
    }

    // Get base elementals (level 1)
    const baseElementals = await db("elementals")
      .where({ is_base_elemental: true, level: 1 })
      .select("*")
      .orderBy("name", "asc");

    if (baseElementals.length < 5) {
      throw new BadRequestError(
        "Not enough base elementals in database (need at least 5)",
      );
    }

    // Roll d10: pick a random element from the 10 faces (flat distribution = 2 of each)
    const elements = ["fire", "water", "earth", "air", "lightning"];
    const rollValue = Math.floor(Math.random() * 10); // 0-9
    const resultElement = elements[Math.floor(rollValue / 2)]; // 0-1=fire, 2-3=water, etc.

    // Find a base elemental matching the rolled element
    const matchingElementals = baseElementals.filter(
      (e: any) => e.element_types?.[0] === resultElement,
    );
    const selectedElemental =
      matchingElementals.length > 0
        ? matchingElementals[Math.floor(Math.random() * matchingElementals.length)]
        : baseElementals[Math.floor(Math.random() * baseElementals.length)];

    // Add elemental to player's active party at position 1
    const playerElemental = await this.repository.add({
      player_id: data.player_id,
      elemental_id: selectedElemental.id,
      is_in_active_party: true,
      party_position: 1,
    });

    // Give player starting currency (100)
    await db("users").where({ id: data.player_id }).update({ currency: 100 });

    return {
      success: true,
      message: t(locale, "start_game.welcome", {
        element: resultElement,
        name: selectedElemental.name,
      }),
      first_elemental: playerElemental,
      dice_roll: {
        roll_value: rollValue + 1, // 1-10 for display
        selected_index: rollValue,
      },
    };
  }

  /**
   * Swap two elementals in party positions
   */
  async swapPartyPositions(
    playerId: string,
    position1: number,
    position2: number,
  ): Promise<{
    elemental1: PlayerElementalWithDetails | null;
    elemental2: PlayerElementalWithDetails | null;
  }> {
    if (position1 < 1 || position1 > 5 || position2 < 1 || position2 > 5) {
      throw new BadRequestError("Party positions must be between 1 and 5");
    }

    // Get elementals at both positions
    const [elemental1] = await db("player_elementals")
      .where({ player_id: playerId, party_position: position1 })
      .limit(1);

    const [elemental2] = await db("player_elementals")
      .where({ player_id: playerId, party_position: position2 })
      .limit(1);

    // Use transaction with three-step swap to avoid unique constraint violation
    await db.transaction(async (trx) => {
      // Step 1: Move elemental1 to NULL (temporary state)
      if (elemental1) {
        await trx("player_elementals")
          .where({ id: elemental1.id })
          .update({ party_position: null });
      }

      // Step 2: Move elemental2 to position1
      if (elemental2) {
        await trx("player_elementals")
          .where({ id: elemental2.id })
          .update({ party_position: position1 });
      }

      // Step 3: Move elemental1 from NULL to position2
      if (elemental1) {
        await trx("player_elementals")
          .where({ id: elemental1.id })
          .update({ party_position: position2 });
      }
    });

    return {
      elemental1: elemental1
        ? await this.repository.findById(elemental1.id)
        : null,
      elemental2: elemental2
        ? await this.repository.findById(elemental2.id)
        : null,
    };
  }
}
