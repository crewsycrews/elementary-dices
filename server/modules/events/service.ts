import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import type {
  EventType,
  EventResponse,
  WildEncounterData,
  MerchantData,
  PvPData,
  ResolveWildEncounterData,
  WildEncounterResult,
  ResolvePvPBattleData,
  PvPBattleResult,
  SkipWildEncounterResult,
  LeaveMerchantResult,
} from "./models";
import { EVENT_PROBABILITIES } from "./models";
import {
  EventRepository,
  WildEncounterEventRepository,
  BattleEventRepository,
  MerchantEventRepository,
} from "./repository";
import type { DiceRollOutcome } from "../dice-rolls/models";

export class EventService {
  constructor(
    private repository = new EventRepository(),
    private wildEncounterRepo = new WildEncounterEventRepository(),
    private battleRepo = new BattleEventRepository(),
    private merchantRepo = new MerchantEventRepository(),
  ) {}

  /**
   * Trigger a random event based on probabilities
   * 50% wild encounter, 30% PvP, 20% merchant
   */
  async triggerEvent(playerId: string): Promise<EventResponse> {
    // Check if player already has a current event
    const existingEvent = await this.repository.getCurrentEvent(playerId);
    if (existingEvent) {
      throw new BadRequestError(
        "Player already has an active event. Resolve it before triggering a new one.",
      );
    }

    // Determine event type based on probabilities
    const eventType = this.determineEventType();

    // Generate event-specific data and create event records
    let eventResponse: EventResponse;
    let eventRecordId: string;

    switch (eventType) {
      case "wild_encounter": {
        const encounterData = await this.generateWildEncounter();
        eventResponse = encounterData.response;

        // Create event record
        const wildEncounter = await this.wildEncounterRepo.create({
          player_id: playerId,
          elemental_id: encounterData.elemental_id,
          stats_modifier: Math.random() * 0.4 + 0.8, // 0.8 to 1.2
        });
        eventRecordId = wildEncounter.id;

        // Save current event pointer
        await this.repository.setCurrentEvent({
          player_id: playerId,
          event_type: eventType,
          wild_encounter_id: eventRecordId,
        });
        break;
      }
      case "pvp_battle": {
        const battleData = await this.generatePvPBattle(playerId);
        eventResponse = battleData.response;

        // Create event record
        const battle = await this.battleRepo.create({
          player_id: playerId,
          opponent_name: battleData.opponent_name,
          opponent_power_level: battleData.opponent_power_level,
        });
        eventRecordId = battle.id;

        // Save current event pointer
        await this.repository.setCurrentEvent({
          player_id: playerId,
          event_type: eventType,
          battle_id: eventRecordId,
        });
        break;
      }
      case "merchant": {
        const merchantData = await this.generateMerchantEvent();
        eventResponse = merchantData.response;

        // Create event record (available for 30 minutes)
        const availableUntil = new Date(Date.now() + 30 * 60 * 1000);
        const merchant = await this.merchantRepo.create({
          player_id: playerId,
          available_until: availableUntil,
        });
        eventRecordId = merchant.id;

        // TODO: Create merchant_inventory records for available items/dice
        // This will be handled in a separate merchant service

        // Save current event pointer
        await this.repository.setCurrentEvent({
          player_id: playerId,
          event_type: eventType,
          merchant_id: eventRecordId,
        });
        break;
      }
      default:
        throw new BadRequestError("Unknown event type");
    }

    return eventResponse;
  }

  /**
   * Determine event type based on weighted probabilities
   */
  private determineEventType(): EventType {
    const random = Math.random();
    let cumulative = 0;

    // Check wild encounter (50%)
    cumulative += EVENT_PROBABILITIES.wild_encounter;
    if (random < cumulative) {
      return "wild_encounter";
    }

    // Check PvP (30%)
    cumulative += EVENT_PROBABILITIES.pvp_battle;
    if (random < cumulative) {
      return "pvp_battle";
    }

    // Otherwise merchant (20%)
    return "merchant";
  }

  /**
   * Generate a wild encounter event
   * Randomly selects an elemental from the database
   */
  private async generateWildEncounter(): Promise<{
    response: EventResponse;
    elemental_id: string;
  }> {
    // Get a random elemental from the database
    // Prefer base elementals (level 1) for wild encounters
    const elementals = await db("elementals")
      .where({ is_base_elemental: true })
      .select("*");

    if (elementals.length === 0) {
      throw new BadRequestError("No elementals available for wild encounter");
    }

    const randomElemental =
      elementals[Math.floor(Math.random() * elementals.length)];

    // Determine capture difficulty based on elemental level
    let captureDifficulty: "easy" | "medium" | "hard";
    if (randomElemental.level === 1) {
      captureDifficulty = "easy";
    } else if (randomElemental.level === 2) {
      captureDifficulty = "medium";
    } else {
      captureDifficulty = "hard";
    }

    const data: WildEncounterData = {
      elemental_id: randomElemental.id,
      elemental_name: randomElemental.name,
      elemental_level: randomElemental.level,
      capture_difficulty: captureDifficulty,
    };

    return {
      response: {
        event_type: "wild_encounter",
        description: `A wild ${randomElemental.name} appeared! You can attempt to capture it using a dice roll and a capture item.`,
        data,
      },
      elemental_id: randomElemental.id,
    };
  }

  /**
   * Generate a PvP battle event
   * Creates a simulated opponent or matches with another player
   */
  private async generatePvPBattle(playerId: string): Promise<{
    response: EventResponse;
    opponent_name: string;
    opponent_power_level: number;
  }> {
    // For now, generate a simulated opponent
    // In the future, this could match with real players

    // Get player's active elementals to determine power level
    const playerElementals = await db("player_elementals")
      .where({ player_id: playerId, is_in_active_party: true })
      .leftJoin("elementals", "player_elementals.elemental_id", "elementals.id")
      .select("elementals.*", "player_elementals.current_stats");

    const playerPowerLevel = this.calculatePowerLevel(playerElementals);

    // Generate opponent with similar power level (+/- 20%)
    const variance = 0.2;
    const minPower = Math.floor(playerPowerLevel * (1 - variance));
    const maxPower = Math.ceil(playerPowerLevel * (1 + variance));
    const opponentPowerLevel =
      Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower;

    // Calculate potential reward based on opponent power
    const potentialReward = Math.floor(opponentPowerLevel * 10);

    const opponentName = this.generateOpponentName();

    const data: PvPData = {
      opponent_name: opponentName,
      opponent_power_level: opponentPowerLevel,
      potential_reward: potentialReward,
    };

    return {
      response: {
        event_type: "pvp_battle",
        description: `You've been challenged by ${opponentName} to a battle! Win to earn ${potentialReward} currency.`,
        data,
      },
      opponent_name: opponentName,
      opponent_power_level: opponentPowerLevel,
    };
  }

  /**
   * Generate a merchant event
   * Offers random items and dice for sale
   */
  private async generateMerchantEvent(): Promise<{ response: EventResponse }> {
    // Get random items (2-4 items)
    const itemCount = Math.floor(Math.random() * 3) + 2;
    const allItems = await db("items").select("id", "name", "price", "rarity");
    const availableItems = this.getRandomItems(allItems, itemCount);

    // Get random dice (2-3 dice)
    const diceCount = Math.floor(Math.random() * 2) + 2;
    const allDice = await db("dice_types").select(
      "id",
      "name",
      "price",
      "rarity",
    );
    const availableDice = this.getRandomItems(allDice, diceCount);

    const data: MerchantData = {
      available_items: availableItems,
      available_dice: availableDice,
    };

    return {
      response: {
        event_type: "merchant",
        description:
          "A traveling merchant has appeared! Browse their wares and make a purchase.",
        data,
      },
    };
  }

  /**
   * Calculate total power level from elementals
   */
  private calculatePowerLevel(elementals: any[]): number {
    if (elementals.length === 0) return 100; // Default power level

    return elementals.reduce((total, elemental) => {
      const stats = elemental.current_stats;
      return total + stats.health + stats.attack + stats.defense + stats.speed;
    }, 0);
  }

  /**
   * Generate a random opponent name
   */
  private generateOpponentName(): string {
    const prefixes = [
      "Brave",
      "Fierce",
      "Cunning",
      "Swift",
      "Mighty",
      "Wise",
      "Dark",
      "Noble",
    ];
    const names = [
      "Warrior",
      "Mage",
      "Hunter",
      "Champion",
      "Knight",
      "Elementalist",
      "Duelist",
      "Summoner",
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const name = names[Math.floor(Math.random() * names.length)];

    return `${prefix} ${name}`;
  }

  /**
   * Get random items from array
   */
  private getRandomItems<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, items.length));
  }

  /**
   * Get event type probabilities
   */
  getEventProbabilities() {
    return EVENT_PROBABILITIES;
  }

  /**
   * Get the current active event for a player
   * Returns null if no active event exists
   */
  async getCurrentEvent(playerId: string): Promise<EventResponse | null> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);

    if (!currentEvent) {
      return null;
    }

    // Fetch event details from the appropriate table
    switch (currentEvent.event_type) {
      case "wild_encounter": {
        if (!currentEvent.wild_encounter_id) {
          throw new BadRequestError("Invalid wild encounter event");
        }
        const wildEncounter = await this.wildEncounterRepo.findById(
          currentEvent.wild_encounter_id
        );
        if (!wildEncounter) {
          throw new NotFoundError("Wild encounter event");
        }

        // Get elemental details
        const [elemental] = await db("elementals")
          .where({ id: wildEncounter.elemental_id })
          .limit(1);

        if (!elemental) {
          throw new NotFoundError("Elemental");
        }

        // Determine capture difficulty
        let captureDifficulty: "easy" | "medium" | "hard";
        if (elemental.level === 1) {
          captureDifficulty = "easy";
        } else if (elemental.level === 2) {
          captureDifficulty = "medium";
        } else {
          captureDifficulty = "hard";
        }

        const data: WildEncounterData = {
          elemental_id: elemental.id,
          elemental_name: elemental.name,
          elemental_level: elemental.level,
          capture_difficulty: captureDifficulty,
        };

        return {
          event_type: "wild_encounter",
          description: `A wild ${elemental.name} appeared! You can attempt to capture it using a dice roll and a capture item.`,
          data,
        };
      }
      case "pvp_battle": {
        if (!currentEvent.battle_id) {
          throw new BadRequestError("Invalid battle event");
        }
        const battle = await this.battleRepo.findById(currentEvent.battle_id);
        if (!battle) {
          throw new NotFoundError("Battle event");
        }

        const potentialReward = Math.floor(battle.opponent_power_level * 10);

        const data: PvPData = {
          opponent_name: battle.opponent_name,
          opponent_power_level: battle.opponent_power_level,
          potential_reward: potentialReward,
        };

        return {
          event_type: "pvp_battle",
          description: `You've been challenged by ${battle.opponent_name} to a battle! Win to earn ${potentialReward} currency.`,
          data,
        };
      }
      case "merchant": {
        if (!currentEvent.merchant_id) {
          throw new BadRequestError("Invalid merchant event");
        }
        const merchant = await this.merchantRepo.findById(
          currentEvent.merchant_id
        );
        if (!merchant) {
          throw new NotFoundError("Merchant event");
        }

        // Get merchant inventory
        const inventory = await db("merchant_inventory")
          .where({ merchant_event_id: merchant.id })
          .leftJoin("items", "merchant_inventory.item_id", "items.id")
          .leftJoin("dice_types", "merchant_inventory.dice_type_id", "dice_types.id")
          .select(
            "merchant_inventory.*",
            "items.name as item_name",
            "items.rarity as item_rarity",
            "dice_types.name as dice_name",
            "dice_types.rarity as dice_rarity"
          );

        const availableItems = inventory
          .filter((item) => item.item_id)
          .map((item) => ({
            id: item.item_id,
            name: item.item_name,
            price: item.price,
            rarity: item.item_rarity,
          }));

        const availableDice = inventory
          .filter((item) => item.dice_type_id)
          .map((item) => ({
            id: item.dice_type_id,
            name: item.dice_name,
            price: item.price,
            rarity: item.dice_rarity,
          }));

        const data: MerchantData = {
          available_items: availableItems,
          available_dice: availableDice,
        };

        return {
          event_type: "merchant",
          description:
            "A traveling merchant has appeared! Browse their wares and make a purchase.",
          data,
        };
      }
      default:
        throw new BadRequestError("Unknown event type");
    }
  }

  /**
   * Resolve a wild encounter event
   * Attempts to capture the wild elemental based on dice roll and optional item
   */
  async resolveWildEncounter(
    data: ResolveWildEncounterData,
  ): Promise<WildEncounterResult> {
    // Get current event
    const currentEvent = await this.repository.getCurrentEvent(data.player_id);
    if (!currentEvent || currentEvent.event_type !== "wild_encounter") {
      throw new BadRequestError("No active wild encounter event");
    }

    if (!currentEvent.wild_encounter_id) {
      throw new BadRequestError("Invalid wild encounter event");
    }

    const wildEncounter = await this.wildEncounterRepo.findById(
      currentEvent.wild_encounter_id
    );
    if (!wildEncounter) {
      throw new NotFoundError("Wild encounter event");
    }

    // Get the elemental
    const [elemental] = await db("elementals")
      .where({ id: wildEncounter.elemental_id })
      .limit(1);
    if (!elemental) {
      throw new NotFoundError("Elemental");
    }

    // Get the dice roll
    const [diceRoll] = await db("dice_rolls")
      .where({ id: data.dice_roll_id })
      .limit(1);
    if (!diceRoll) {
      throw new NotFoundError("Dice roll");
    }

    // Verify dice roll belongs to player
    if (diceRoll.player_id !== data.player_id) {
      throw new BadRequestError("Dice roll does not belong to player");
    }

    // Check if player has space (max 15 total: 5 active + 10 backpack)
    const elementalCount = await db("player_elementals")
      .where({ player_id: data.player_id })
      .count("* as count")
      .first();

    if (elementalCount && Number(elementalCount.count) >= 15) {
      throw new BadRequestError("Maximum elemental capacity reached (15)");
    }

    // Calculate capture success
    let captureBonus = 0;
    // Apply item bonus if provided
    if (data.item_id) {
      const [item] = await db("items").where({ id: data.item_id }).limit(1);
      if (!item) {
        throw new NotFoundError("Item");
      }

      // Check if player has the item
      const [inventoryItem] = await db("player_inventory")
        .where({ player_id: data.player_id, item_id: data.item_id })
        .limit(1);

      if (!inventoryItem || inventoryItem.quantity < 1) {
        throw new BadRequestError(
          "Item not in inventory or insufficient quantity",
        );
      }

      // Apply capture bonus from item
      if (item.effect?.capture_bonus) {
        captureBonus = item.effect.capture_bonus;
      }

      // Consume the item
      if (inventoryItem.quantity === 1) {
        await db("player_inventory").where({ id: inventoryItem.id }).delete();
      } else {
        await db("player_inventory")
          .where({ id: inventoryItem.id })
          .update({ quantity: inventoryItem.quantity - 1 });
      }
    }

    // Determine success based on dice outcome and difficulty
    const outcome: DiceRollOutcome = diceRoll.outcome;
    const difficulty = elemental.level === 1 ? "easy" : elemental.level === 2 ? "medium" : "hard";

    let success = false;
    if (outcome === "crit_success") {
      success = true; // Always succeed on crit
    } else if (outcome === "success") {
      success =
        difficulty === "easy" || (difficulty === "medium" && captureBonus > 0);
    } else if (outcome === "fail") {
      success = difficulty === "easy" && captureBonus >= 5; // Need good item for easy captures
    }
    // crit_fail always fails

    let elementalCaught:
      | { id: string; name: string; level: number }
      | undefined = undefined;
    let message = "";

    if (success) {
      // Add elemental to player's collection
      const [playerElemental] = await db("player_elementals")
        .insert({
          player_id: data.player_id,
          elemental_id: elemental.id,
          current_stats: elemental.base_stats,
          is_in_active_party: false,
        })
        .returning("*");

      elementalCaught = {
        id: playerElemental.id,
        name: elemental.name,
        level: elemental.level,
      };

      message = `Successfully captured ${elemental.name}! It has been added to your collection.`;

      // Update wild encounter record
      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "victory",
        dice_roll_id: data.dice_roll_id,
        item_used_id: data.item_id,
        captured_player_elemental_id: playerElemental.id,
        resolved_at: new Date(),
      });

      // Update player progress
      await db("player_progress")
        .where({ player_id: data.player_id })
        .increment("successful_captures", 1)
        .increment("total_elementals_owned", 1);

      // Update unique elementals if first time catching this one
      const previousCaptures = await db("player_elementals")
        .where({ player_id: data.player_id, elemental_id: elemental.id })
        .count("* as count")
        .first();

      if (previousCaptures && Number(previousCaptures.count) === 1) {
        await db("player_progress")
          .where({ player_id: data.player_id })
          .increment("unique_elementals_collected", 1);
      }
    } else {
      message = `Failed to capture ${elemental.name}. The elemental escaped!`;

      // Update wild encounter record
      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "defeat",
        dice_roll_id: data.dice_roll_id,
        item_used_id: data.item_id,
        resolved_at: new Date(),
      });
    }

    // Clear current event
    await this.repository.clearCurrentEvent(data.player_id);

    return {
      success,
      message,
      elemental_caught: elementalCaught,
      can_continue: true,
    };
  }

  /**
   * Skip wild encounter event
   * Allows player to decline the encounter and continue
   */
  async skipWildEncounter(playerId: string): Promise<SkipWildEncounterResult> {
    // Get current event
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent || currentEvent.event_type !== "wild_encounter") {
      throw new BadRequestError("No active wild encounter event");
    }

    if (!currentEvent.wild_encounter_id) {
      throw new BadRequestError("Invalid wild encounter event");
    }

    const wildEncounter = await this.wildEncounterRepo.findById(
      currentEvent.wild_encounter_id
    );
    if (!wildEncounter) {
      throw new NotFoundError("Wild encounter event");
    }

    // Get elemental name
    const [elemental] = await db("elementals")
      .where({ id: wildEncounter.elemental_id })
      .limit(1);

    // Update wild encounter record
    await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
      status: "fled",
      outcome: "fled",
      resolved_at: new Date(),
    });

    // Clear current event
    await this.repository.clearCurrentEvent(playerId);

    return {
      message: `You decided to skip the encounter with ${elemental?.name || "the elemental"}. The elemental wandered away.`,
      can_continue: true,
    };
  }

  /**
   * Resolve a PvP battle event
   * Simulates battle based on party stats and dice rolls
   */
  async resolvePvPBattle(data: ResolvePvPBattleData): Promise<PvPBattleResult> {
    // Get current event
    const currentEvent = await this.repository.getCurrentEvent(data.player_id);
    if (!currentEvent || currentEvent.event_type !== "pvp_battle") {
      throw new BadRequestError("No active PvP battle event");
    }

    if (!currentEvent.battle_id) {
      throw new BadRequestError("Invalid battle event");
    }

    const battle = await this.battleRepo.findById(currentEvent.battle_id);
    if (!battle) {
      throw new NotFoundError("Battle event");
    }

    // Get the dice roll
    const [diceRoll] = await db("dice_rolls")
      .where({ id: data.dice_roll_id })
      .limit(1);
    if (!diceRoll) {
      throw new NotFoundError("Dice roll");
    }

    // Verify dice roll belongs to player
    if (diceRoll.player_id !== data.player_id) {
      throw new BadRequestError("Dice roll does not belong to player");
    }

    // Get player's active elementals
    const playerElementals = await db("player_elementals")
      .where({ player_id: data.player_id, is_in_active_party: true })
      .leftJoin("elementals", "player_elementals.elemental_id", "elementals.id")
      .select(
        "elementals.*",
        "player_elementals.current_stats",
        "player_elementals.id as player_elemental_id",
      );

    const playerBasePower = this.calculatePowerLevel(playerElementals);

    // Apply dice roll modifier (roll value contributes to power)
    const playerDiceBonus = diceRoll.roll_value * 10;
    const playerPower = playerBasePower + playerDiceBonus;

    // Opponent rolls (simulated)
    const opponentBasePower = battle.opponent_power_level;
    const opponentRoll = Math.floor(Math.random() * 20) + 1;
    const opponentDiceBonus = opponentRoll * 10;
    const opponentPower = opponentBasePower + opponentDiceBonus;

    const victory = playerPower >= opponentPower;

    let message = "";
    let reward = undefined;
    let penalty = undefined;
    let downgradedElementalId = undefined;

    if (victory) {
      reward = Math.floor(battle.opponent_power_level * 10);
      message = `Victory! You defeated ${battle.opponent_name} and earned ${reward} currency.`;

      // Award currency
      await db("users")
        .where({ id: data.player_id })
        .increment("currency", reward);

      // Update battle stats
      await db("player_progress")
        .where({ player_id: data.player_id })
        .increment("total_battles", 1)
        .increment("battles_won", 1);

      // Update battle record
      await this.battleRepo.updateResolution(battle.id, {
        status: "completed",
        outcome: "victory",
        player_power: playerPower,
        opponent_actual_power: opponentPower,
        dice_roll_id: data.dice_roll_id,
        currency_reward: reward,
        resolved_at: new Date(),
      });
    } else {
      message = `Defeat! ${battle.opponent_name} was too strong.`;

      // Apply penalty: downgrade a random elemental
      if (playerElementals.length > 0) {
        // Get elementals that can be downgraded (level > 1)
        const downgradableElementals = playerElementals.filter(
          (e: any) => e.level > 1,
        );

        if (downgradableElementals.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * downgradableElementals.length,
          );
          const targetElemental = downgradableElementals[randomIndex];

          // Find the previous evolution
          const [previousEvolution] = await db("elemental_evolutions")
            .where({ evolves_to: targetElemental.elemental_id })
            .limit(1);

          if (previousEvolution) {
            // Downgrade the elemental
            const [baseElemental] = await db("elementals")
              .where({ id: previousEvolution.base_elemental_id })
              .limit(1);

            if (baseElemental) {
              await db("player_elementals")
                .where({ id: targetElemental.player_elemental_id })
                .update({
                  elemental_id: baseElemental.id,
                  current_stats: baseElemental.base_stats,
                });

              downgradedElementalId = targetElemental.player_elemental_id;

              penalty = {
                downgraded_elemental: targetElemental.name,
              };

              message += ` Your ${targetElemental.name} was downgraded to ${baseElemental.name}.`;
            }
          }
        }
      }

      // Update battle stats
      await db("player_progress")
        .where({ player_id: data.player_id })
        .increment("total_battles", 1)
        .increment("battles_lost", 1);

      // Update battle record
      await this.battleRepo.updateResolution(battle.id, {
        status: "completed",
        outcome: "defeat",
        player_power: playerPower,
        opponent_actual_power: opponentPower,
        dice_roll_id: data.dice_roll_id,
        downgraded_elemental_id: downgradedElementalId,
        resolved_at: new Date(),
      });
    }

    // Clear current event
    await this.repository.clearCurrentEvent(data.player_id);

    return {
      victory,
      message,
      player_power: playerPower,
      opponent_power: opponentPower,
      reward,
      penalty,
      can_continue: true,
    };
  }

  /**
   * Leave merchant event
   * Clears the current merchant event and allows player to continue
   */
  async leaveMerchant(playerId: string): Promise<LeaveMerchantResult> {
    // Get current event
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent || currentEvent.event_type !== "merchant") {
      throw new BadRequestError("No active merchant event");
    }

    if (!currentEvent.merchant_id) {
      throw new BadRequestError("Invalid merchant event");
    }

    const merchant = await this.merchantRepo.findById(currentEvent.merchant_id);
    if (!merchant) {
      throw new NotFoundError("Merchant event");
    }

    // Update merchant record
    await this.merchantRepo.updateResolution(merchant.id, {
      status: "completed",
      resolved_at: new Date(),
    });

    // Clear current event
    await this.repository.clearCurrentEvent(playerId);

    return {
      message: "You left the merchant and continue your journey.",
      can_continue: true,
    };
  }
}
