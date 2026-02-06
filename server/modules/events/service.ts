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
import { EventRepository } from "./repository";
import type { DiceRollOutcome } from "../dice-rolls/models";

export class EventService {
  constructor(private repository = new EventRepository()) {}

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

    // Generate event-specific data
    let eventResponse: EventResponse;
    switch (eventType) {
      case "wild_encounter":
        eventResponse = await this.generateWildEncounter();
        break;
      case "pvp_battle":
        eventResponse = await this.generatePvPBattle(playerId);
        break;
      case "merchant":
        eventResponse = await this.generateMerchantEvent();
        break;
      default:
        throw new BadRequestError("Unknown event type");
    }

    // Save current event to database
    await this.repository.setCurrentEvent({
      player_id: playerId,
      event_type: eventType,
      event_data: eventResponse.data,
    });

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
  private async generateWildEncounter(): Promise<EventResponse> {
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
      event_type: "wild_encounter",
      description: `A wild ${randomElemental.name} appeared! You can attempt to capture it using a dice roll and a capture item.`,
      data,
    };
  }

  /**
   * Generate a PvP battle event
   * Creates a simulated opponent or matches with another player
   */
  private async generatePvPBattle(playerId: string): Promise<EventResponse> {
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

    const data: PvPData = {
      opponent_name: this.generateOpponentName(),
      opponent_power_level: opponentPowerLevel,
      potential_reward: potentialReward,
    };

    return {
      event_type: "pvp_battle",
      description: `You've been challenged by ${data.opponent_name} to a battle! Win to earn ${potentialReward} currency.`,
      data,
    };
  }

  /**
   * Generate a merchant event
   * Offers random items and dice for sale
   */
  private async generateMerchantEvent(): Promise<EventResponse> {
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
      event_type: "merchant",
      description:
        "A traveling merchant has appeared! Browse their wares and make a purchase.",
      data,
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

    const eventData = currentEvent.event_data as WildEncounterData;

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
    const difficulty = eventData.capture_difficulty;

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
      // Get the elemental
      const [elemental] = await db("elementals")
        .where({ id: eventData.elemental_id })
        .limit(1);

      if (!elemental) {
        throw new NotFoundError("Elemental");
      }

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
      message = `Failed to capture ${eventData.elemental_name}. The elemental escaped!`;
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

    const eventData = currentEvent.event_data as WildEncounterData;

    // Clear current event
    await this.repository.clearCurrentEvent(playerId);

    return {
      message: `You decided to skip the encounter with ${eventData.elemental_name}. The elemental wandered away.`,
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

    const eventData = currentEvent.event_data as PvPData;

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
    const opponentBasePower = eventData.opponent_power_level;
    const opponentRoll = Math.floor(Math.random() * 20) + 1;
    const opponentDiceBonus = opponentRoll * 10;
    const opponentPower = opponentBasePower + opponentDiceBonus;

    const victory = playerPower >= opponentPower;

    let message = "";
    let reward = undefined;
    let penalty = undefined;

    if (victory) {
      reward = eventData.potential_reward;
      message = `Victory! You defeated ${eventData.opponent_name} and earned ${reward} currency.`;

      // Award currency
      await db("users")
        .where({ id: data.player_id })
        .increment("currency", reward);

      // Update battle stats
      await db("player_progress")
        .where({ player_id: data.player_id })
        .increment("total_battles", 1)
        .increment("battles_won", 1);
    } else {
      message = `Defeat! ${eventData.opponent_name} was too strong.`;

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

    // Clear current event
    await this.repository.clearCurrentEvent(playerId);

    return {
      message: "You left the merchant and continue your journey.",
      can_continue: true,
    };
  }
}
