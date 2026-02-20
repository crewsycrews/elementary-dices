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
  SkipWildEncounterResult,
  LeaveMerchantResult,
  BattleRollResult,
} from "./models";
import { EVENT_PROBABILITIES } from "./models";
import {
  EventRepository,
  WildEncounterEventRepository,
  BattleEventRepository,
  MerchantEventRepository,
} from "./repository";
import type { DiceRollOutcome } from "../dice-rolls/models";
import { DiceRollService } from "../dice-rolls/service";
import {
  buildPartyMember,
  computeTargetAssignments,
  applyAdvantageBonuses,
  applyDiceRollEffect,
  determineBattleWinner,
  pickOpponentDiceElement,
  simulateAiRollOutcome,
  type BattleState,
  type BattlePartyMember,
  type ElementType,
} from "./battle-logic";

type DiceRarity = "green" | "blue" | "purple" | "gold";
const RARITY_ORDER: DiceRarity[] = ["green", "blue", "purple", "gold"];

export class EventService {
  constructor(
    private repository = new EventRepository(),
    private wildEncounterRepo = new WildEncounterEventRepository(),
    private battleRepo = new BattleEventRepository(),
    private merchantRepo = new MerchantEventRepository(),
    private diceRollService = new DiceRollService(),
  ) {}

  /**
   * Trigger a random event based on probabilities.
   * PvP battles require 5 active party elementals.
   */
  async triggerEvent(playerId: string): Promise<EventResponse> {
    // Check if player already has a current event
    const existingEvent = await this.repository.getCurrentEvent(playerId);
    if (existingEvent) {
      throw new BadRequestError(
        "Player already has an active event. Resolve it before triggering a new one.",
      );
    }

    // Check active party size for PvP eligibility
    const activePartyCount = await db("player_elementals")
      .where({ player_id: playerId, is_in_active_party: true })
      .count("* as count")
      .first();
    const partySize = Number(activePartyCount?.count ?? 0);

    // Determine event type based on probabilities
    const eventType = this.determineEventType(partySize < 5);

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

        // Create event record with battle state
        const battle = await this.battleRepo.create({
          player_id: playerId,
          opponent_name: battleData.opponent_name,
          opponent_power_level: battleData.opponent_power_level,
          battle_state: battleData.battleState,
          opponent_party_data: battleData.opponentPartyData,
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
        const merchantData = await this.generateMerchantEvent(playerId);
        eventResponse = merchantData.response;

        // Create event record (available for 30 minutes)
        const availableUntil = new Date(Date.now() + 30 * 60 * 1000);
        const merchant = await this.merchantRepo.create({
          player_id: playerId,
          available_until: availableUntil,
        });
        eventRecordId = merchant.id;

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
   * Determine event type based on weighted probabilities.
   * If excludePvP is true, redistribute PvP probability to other events.
   */
  private determineEventType(excludePvP: boolean): EventType {
    let wildWeight = EVENT_PROBABILITIES.wild_encounter;
    let pvpWeight = EVENT_PROBABILITIES.pvp_battle;
    let merchantWeight = EVENT_PROBABILITIES.merchant;

    if (excludePvP) {
      // Redistribute PvP weight proportionally
      const totalNonPvP = wildWeight + merchantWeight;
      wildWeight = wildWeight + pvpWeight * (wildWeight / totalNonPvP);
      merchantWeight = merchantWeight + pvpWeight * (merchantWeight / totalNonPvP);
      pvpWeight = 0;
    }

    const random = Math.random();
    let cumulative = 0;

    cumulative += wildWeight;
    if (random < cumulative) {
      return "wild_encounter";
    }

    cumulative += pvpWeight;
    if (random < cumulative) {
      return "pvp_battle";
    }

    return "merchant";
  }

  /**
   * Generate a wild encounter event
   */
  private async generateWildEncounter(): Promise<{
    response: EventResponse;
    elemental_id: string;
  }> {
    const elementals = await db("elementals")
      .where({ is_base_elemental: true })
      .select("*");

    if (elementals.length === 0) {
      throw new BadRequestError("No elementals available for wild encounter");
    }

    const randomElemental =
      elementals[Math.floor(Math.random() * elementals.length)];

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
   * Generate a PvP battle event with full 3-phase battle state.
   */
  private async generatePvPBattle(playerId: string): Promise<{
    response: EventResponse;
    opponent_name: string;
    opponent_power_level: number;
    battleState: BattleState;
    opponentPartyData: BattlePartyMember[];
  }> {
    // Get player's active party with elemental details
    const playerElementals = await db("player_elementals")
      .where({ player_id: playerId, is_in_active_party: true })
      .leftJoin("elementals", "player_elementals.elemental_id", "elementals.id")
      .select(
        "elementals.id as elemental_id",
        "elementals.name",
        "elementals.level",
        "elementals.element_types",
        "player_elementals.id as player_elemental_id",
      )
      .orderBy("player_elementals.party_position", "asc");

    // Build player party members
    const playerParty: BattlePartyMember[] = playerElementals.map((pe: any) =>
      buildPartyMember(
        {
          id: pe.elemental_id,
          name: pe.name,
          level: pe.level,
          element_types: pe.element_types,
        },
        pe.player_elemental_id,
      ),
    );

    // Generate opponent party matching player's total power roughly
    const playerTotalPower = playerParty.reduce((sum, m) => sum + m.base_power, 0);
    const opponentParty = await this.generateOpponentParty(playerTotalPower);
    const opponentName = this.generateOpponentName();
    const opponentPowerLevel = opponentParty.reduce((sum, m) => sum + m.base_power, 0);

    // Compute target assignments (Phase 1)
    const assigned = computeTargetAssignments(playerParty, opponentParty);

    // Apply advantage bonuses (+10% for advantage matchups)
    const withBonuses = applyAdvantageBonuses(assigned.playerParty, assigned.opponentParty);

    // Build initial battle state
    const battleState: BattleState = {
      phase: "targeting",
      player_party: withBonuses.playerParty,
      opponent_party: withBonuses.opponentParty,
      rolls: [],
      current_turn: 1,
      player_rolls_done: 0,
      opponent_rolls_done: 0,
    };

    const potentialReward = Math.floor(opponentPowerLevel * 10);

    const data: PvPData = {
      opponent_name: opponentName,
      opponent_power_level: opponentPowerLevel,
      potential_reward: potentialReward,
      opponent_party: withBonuses.opponentParty,
      player_party: withBonuses.playerParty,
      battle_state: battleState,
    };

    return {
      response: {
        event_type: "pvp_battle",
        description: `You've been challenged by ${opponentName} to a battle! Win to earn ${potentialReward} currency.`,
        data,
      },
      opponent_name: opponentName,
      opponent_power_level: opponentPowerLevel,
      battleState,
      opponentPartyData: withBonuses.opponentParty,
    };
  }

  /**
   * Generate an AI opponent party matching the player's total power roughly (+/- 20%).
   */
  private async generateOpponentParty(
    targetTotalPower: number,
  ): Promise<BattlePartyMember[]> {
    // Get all base elementals from DB
    const allElementals = await db("elementals")
      .select("id", "name", "level", "element_types")
      .orderByRaw("RANDOM()");

    if (allElementals.length === 0) {
      throw new BadRequestError("No elementals available for opponent party");
    }

    // Build 5 opponent members, trying to match target power
    const variance = 0.2;
    const minPower = Math.floor(targetTotalPower * (1 - variance));
    const maxPower = Math.ceil(targetTotalPower * (1 + variance));
    const targetPower =
      Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower;

    // Simple strategy: pick 5 random elementals, then adjust if needed
    const party: BattlePartyMember[] = [];
    let currentPower = 0;

    for (let i = 0; i < 5; i++) {
      // Pick from available elementals, cycling through the list
      const elemental = allElementals[i % allElementals.length];
      const member = buildPartyMember({
        id: elemental.id,
        name: elemental.name,
        level: elemental.level,
        element_types: elemental.element_types,
      });
      party.push(member);
      currentPower += member.base_power;
    }

    // If total power is too far from target, adjust levels
    // Each level step changes power by 10
    const powerDiff = targetPower - currentPower;
    if (Math.abs(powerDiff) > 10) {
      const stepsNeeded = Math.round(powerDiff / 10);
      const stepsPerMember = Math.floor(Math.abs(stepsNeeded) / 5);
      const remainder = Math.abs(stepsNeeded) % 5;
      const direction = stepsNeeded > 0 ? 1 : -1;

      for (let i = 0; i < 5; i++) {
        const extraStep = i < remainder ? 1 : 0;
        const totalSteps = (stepsPerMember + extraStep) * direction;
        const newLevel = Math.max(1, Math.min(4, party[i].level + totalSteps));
        const newPower = newLevel * 10;
        party[i].level = newLevel;
        party[i].base_power = newPower;
        party[i].current_power = newPower;
      }
    }

    return party;
  }

  /**
   * Start a battle - transition from targeting phase to rolling phase.
   */
  async startBattle(playerId: string): Promise<BattleState> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);
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

    const battleState: BattleState = battle.battle_state;
    if (!battleState) {
      throw new BadRequestError("Battle state not initialized");
    }

    if (battleState.phase !== "targeting") {
      throw new BadRequestError("Battle already started");
    }

    // Transition to rolling phase
    battleState.phase = "rolling";
    await this.battleRepo.updateBattleState(battle.id, battleState);

    return battleState;
  }

  /**
   * Player rolls a dice in battle. After player roll, AI auto-rolls.
   * Returns updated battle state and both roll results.
   */
  async rollBattleDice(
    playerId: string,
    diceTypeId: string,
  ): Promise<BattleRollResult> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);
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

    let battleState: BattleState = battle.battle_state;
    if (!battleState || battleState.phase !== "rolling") {
      throw new BadRequestError("Battle is not in rolling phase");
    }

    if (battleState.player_rolls_done >= 3) {
      throw new BadRequestError("All player rolls have been made");
    }

    // Verify it's player's turn (player goes first each turn)
    if (battleState.player_rolls_done > battleState.opponent_rolls_done) {
      throw new BadRequestError("Waiting for opponent's roll");
    }

    // Get the dice type
    const [diceType] = await db("dice_types")
      .where({ id: diceTypeId })
      .limit(1);
    if (!diceType) {
      throw new NotFoundError("Dice type");
    }

    // Perform the player's dice roll
    const rollResult = await this.diceRollService.performRoll({
      player_id: playerId,
      dice_type_id: diceTypeId,
      context: "combat",
    });

    const diceElement = (diceType.stat_bonuses?.element_affinity ?? "fire") as ElementType;
    const bonusMultiplier = diceType.stat_bonuses?.bonus_multiplier ?? 1;
    const outcome = rollResult.roll.outcome as "crit_success" | "success" | "fail" | "crit_fail";

    // Apply player roll effect
    const playerEffect = applyDiceRollEffect(
      battleState,
      diceElement,
      outcome,
      bonusMultiplier,
    );
    battleState = playerEffect.state;

    // Record player roll
    const playerRoll = {
      turn: battleState.player_rolls_done + 1,
      side: "player" as const,
      dice_type_id: diceTypeId,
      dice_element: diceElement,
      outcome,
      bonus_applied: playerEffect.bonusApplied,
      affected_element: playerEffect.affectedElement,
      roll_value: rollResult.roll.roll_value,
    };
    battleState.rolls.push(playerRoll);
    battleState.player_rolls_done += 1;

    // AI auto-roll
    const aiDiceElement = pickOpponentDiceElement(battleState);
    const aiOutcome = simulateAiRollOutcome();
    // AI uses a virtual bonus multiplier based on the average of dice in the game
    const aiBonusMultiplier = 1.5; // balanced default for AI

    const aiEffect = applyDiceRollEffect(
      battleState,
      aiDiceElement,
      aiOutcome,
      aiBonusMultiplier,
    );
    battleState = aiEffect.state;

    const opponentRoll = {
      turn: battleState.opponent_rolls_done + 1,
      side: "opponent" as const,
      dice_element: aiDiceElement,
      outcome: aiOutcome,
      bonus_applied: aiEffect.bonusApplied,
      affected_element: aiEffect.affectedElement,
    };
    battleState.rolls.push(opponentRoll);
    battleState.opponent_rolls_done += 1;

    // Update current turn
    battleState.current_turn = battleState.player_rolls_done + 1;

    // Check if battle is resolved (both sides made 3 rolls)
    let isResolved = false;
    let result: BattleRollResult["result"] = undefined;

    if (battleState.player_rolls_done >= 3 && battleState.opponent_rolls_done >= 3) {
      isResolved = true;
      battleState.phase = "resolved";

      const { winner, playerTotal, opponentTotal } = determineBattleWinner(battleState);
      battleState.winner = winner;
      battleState.player_total_power = playerTotal;
      battleState.opponent_total_power = opponentTotal;

      const victory = winner === "player" || winner === "draw"; // draw counts as player win
      result = await this.resolveBattleOutcome(
        playerId,
        battle.id,
        victory,
        playerTotal,
        opponentTotal,
        battle.opponent_name,
        battle.opponent_power_level,
      );
    }

    // Persist updated battle state
    await this.battleRepo.updateBattleState(battle.id, battleState);

    return {
      battle_state: battleState,
      player_roll: playerRoll,
      opponent_roll: opponentRoll,
      is_resolved: isResolved,
      result,
    };
  }

  /**
   * Handle battle outcome: rewards, penalties, event cleanup.
   */
  private async resolveBattleOutcome(
    playerId: string,
    battleId: string,
    victory: boolean,
    playerPower: number,
    opponentPower: number,
    opponentName: string,
    opponentPowerLevel: number,
  ): Promise<NonNullable<BattleRollResult["result"]>> {
    let message = "";
    let reward: number | undefined = undefined;
    let penalty: { downgraded_elemental?: string } | undefined = undefined;
    let downgradedElementalId: string | undefined = undefined;

    if (victory) {
      reward = Math.floor(opponentPowerLevel * 10);
      message = `Victory! You defeated ${opponentName} and earned ${reward} currency.`;

      await db("users")
        .where({ id: playerId })
        .increment("currency", reward);

      await db("player_progress")
        .where({ player_id: playerId })
        .increment("total_battles", 1)
        .increment("battles_won", 1);

      await this.battleRepo.updateResolution(battleId, {
        status: "completed",
        outcome: "victory",
        player_power: playerPower,
        opponent_actual_power: opponentPower,
        currency_reward: reward,
        resolved_at: new Date(),
      });
    } else {
      message = `Defeat! ${opponentName} was too strong.`;

      // Apply penalty: downgrade a random evolved elemental
      const playerElementals = await db("player_elementals")
        .where({ player_id: playerId, is_in_active_party: true })
        .leftJoin("elementals", "player_elementals.elemental_id", "elementals.id")
        .select(
          "elementals.*",
          "player_elementals.id as player_elemental_id",
        );

      const downgradableElementals = playerElementals.filter(
        (e: any) => e.level > 1,
      );

      if (downgradableElementals.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * downgradableElementals.length,
        );
        const targetElemental = downgradableElementals[randomIndex];

        const [evolution] = await db("elemental_evolutions")
          .where({ result_elemental_id: targetElemental.id })
          .limit(1);

        if (evolution) {
          let downgradeToId: string | null = null;

          if (evolution.required_same_element) {
            const [base] = await db("elementals")
              .where({ level: 1 })
              .whereRaw("element_types @> ?::jsonb", [
                JSON.stringify([evolution.required_same_element]),
              ])
              .limit(1);
            downgradeToId = base?.id ?? null;
          } else if (evolution.required_element_1) {
            const [base] = await db("elementals")
              .where({ level: 2 })
              .whereRaw("element_types @> ?::jsonb", [
                JSON.stringify([evolution.required_element_1]),
              ])
              .limit(1);
            downgradeToId = base?.id ?? null;
          } else if (evolution.required_elemental_ids) {
            const ids = Array.isArray(evolution.required_elemental_ids)
              ? evolution.required_elemental_ids
              : JSON.parse(evolution.required_elemental_ids);
            downgradeToId = ids[0] ?? null;
          }

          if (downgradeToId) {
            const [baseElemental] = await db("elementals")
              .where({ id: downgradeToId })
              .limit(1);

            if (baseElemental) {
              await db("player_elementals")
                .where({ id: targetElemental.player_elemental_id })
                .update({
                  elemental_id: baseElemental.id,
                  current_stats: baseElemental.base_stats,
                });

              downgradedElementalId = targetElemental.player_elemental_id;
              penalty = { downgraded_elemental: targetElemental.name };
              message += ` Your ${targetElemental.name} was downgraded to ${baseElemental.name}.`;
            }
          }
        }
      }

      await db("player_progress")
        .where({ player_id: playerId })
        .increment("total_battles", 1)
        .increment("battles_lost", 1);

      await this.battleRepo.updateResolution(battleId, {
        status: "completed",
        outcome: "defeat",
        player_power: playerPower,
        opponent_actual_power: opponentPower,
        downgraded_elemental_id: downgradedElementalId,
        resolved_at: new Date(),
      });
    }

    // Clear current event
    await this.repository.clearCurrentEvent(playerId);

    return {
      victory,
      message,
      player_total_power: playerPower,
      opponent_total_power: opponentPower,
      reward,
      penalty,
      can_continue: true,
    };
  }

  /**
   * Generate a merchant event
   */
  private async generateMerchantEvent(
    playerId: string,
  ): Promise<{ response: EventResponse }> {
    const itemCount = Math.floor(Math.random() * 2) + 2;
    const allItems = await db("items").select("id", "name", "price", "rarity");
    const availableItems = this.getRandomItems(allItems, itemCount);

    const playerDice = await db("player_dice")
      .where({ player_id: playerId })
      .join("dice_types", "player_dice.dice_type_id", "dice_types.id")
      .select("dice_types.dice_notation", "dice_types.rarity");

    const bestRarityByNotation = new Map<string, DiceRarity>();
    for (const die of playerDice) {
      const rarity = die.rarity as DiceRarity;
      const current = bestRarityByNotation.get(die.dice_notation);
      if (
        !current ||
        RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(current)
      ) {
        bestRarityByNotation.set(die.dice_notation, rarity);
      }
    }

    const allDice = await db("dice_types").select(
      "id",
      "name",
      "price",
      "rarity",
      "dice_notation",
      "stat_bonuses",
    );

    const upgradeDice = allDice.filter((die) => {
      const playerBest = bestRarityByNotation.get(die.dice_notation);
      if (!playerBest) return true;
      const rarity = die.rarity as DiceRarity;
      return RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(playerBest);
    });

    const diceCount = Math.floor(Math.random() * 2) + 2;
    const availableDice = this.getRandomItems(upgradeDice, diceCount).map(
      (die) => ({
        id: die.id,
        name: die.name,
        price: die.price,
        rarity: die.rarity,
        dice_notation: die.dice_notation,
        bonus_multiplier: die.stat_bonuses?.bonus_multiplier ?? 1,
        element_affinity: die.stat_bonuses?.element_affinity,
      }),
    );

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
   * Get the current active event for a player.
   * For PvP battles, includes the full battle_state for mid-battle resume.
   */
  async getCurrentEvent(playerId: string): Promise<EventResponse | null> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);

    if (!currentEvent) {
      return null;
    }

    switch (currentEvent.event_type) {
      case "wild_encounter": {
        if (!currentEvent.wild_encounter_id) {
          throw new BadRequestError("Invalid wild encounter event");
        }
        const wildEncounter = await this.wildEncounterRepo.findById(
          currentEvent.wild_encounter_id,
        );
        if (!wildEncounter) {
          throw new NotFoundError("Wild encounter event");
        }

        const [elemental] = await db("elementals")
          .where({ id: wildEncounter.elemental_id })
          .limit(1);

        if (!elemental) {
          throw new NotFoundError("Elemental");
        }

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
          opponent_party: battle.opponent_party_data ?? [],
          player_party: battle.battle_state?.player_party ?? [],
          battle_state: battle.battle_state,
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
          currentEvent.merchant_id,
        );
        if (!merchant) {
          throw new NotFoundError("Merchant event");
        }

        const inventory = await db("merchant_inventory")
          .where({ merchant_event_id: merchant.id })
          .leftJoin("items", "merchant_inventory.item_id", "items.id")
          .leftJoin(
            "dice_types",
            "merchant_inventory.dice_type_id",
            "dice_types.id",
          )
          .select(
            "merchant_inventory.*",
            "items.name as item_name",
            "items.rarity as item_rarity",
            "dice_types.name as dice_name",
            "dice_types.rarity as dice_rarity",
            "dice_types.dice_notation as dice_notation",
            "dice_types.stat_bonuses as dice_stat_bonuses",
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
            dice_notation: item.dice_notation,
            bonus_multiplier: item.dice_stat_bonuses?.bonus_multiplier ?? 1,
            element_affinity: item.dice_stat_bonuses?.element_affinity,
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
   */
  async resolveWildEncounter(
    data: ResolveWildEncounterData,
  ): Promise<WildEncounterResult> {
    const currentEvent = await this.repository.getCurrentEvent(data.player_id);
    if (!currentEvent || currentEvent.event_type !== "wild_encounter") {
      throw new BadRequestError("No active wild encounter event");
    }

    if (!currentEvent.wild_encounter_id) {
      throw new BadRequestError("Invalid wild encounter event");
    }

    const wildEncounter = await this.wildEncounterRepo.findById(
      currentEvent.wild_encounter_id,
    );
    if (!wildEncounter) {
      throw new NotFoundError("Wild encounter event");
    }

    const [elemental] = await db("elementals")
      .where({ id: wildEncounter.elemental_id })
      .limit(1);
    if (!elemental) {
      throw new NotFoundError("Elemental");
    }

    const [diceRoll] = await db("dice_rolls")
      .where({ id: data.dice_roll_id })
      .limit(1);
    if (!diceRoll) {
      throw new NotFoundError("Dice roll");
    }

    if (diceRoll.player_id !== data.player_id) {
      throw new BadRequestError("Dice roll does not belong to player");
    }

    const elementalCount = await db("player_elementals")
      .where({ player_id: data.player_id })
      .count("* as count")
      .first();

    if (elementalCount && Number(elementalCount.count) >= 15) {
      throw new BadRequestError("Maximum elemental capacity reached (15)");
    }

    let captureBonus = 0;
    if (data.item_id) {
      const [item] = await db("items").where({ id: data.item_id }).limit(1);
      if (!item) {
        throw new NotFoundError("Item");
      }

      const [inventoryItem] = await db("player_inventory")
        .where({ player_id: data.player_id, item_id: data.item_id })
        .limit(1);

      if (!inventoryItem || inventoryItem.quantity < 1) {
        throw new BadRequestError(
          "Item not in inventory or insufficient quantity",
        );
      }

      if (item.effect?.capture_bonus) {
        captureBonus = item.effect.capture_bonus;
      }

      if (inventoryItem.quantity === 1) {
        await db("player_inventory").where({ id: inventoryItem.id }).delete();
      } else {
        await db("player_inventory")
          .where({ id: inventoryItem.id })
          .update({ quantity: inventoryItem.quantity - 1 });
      }
    }

    const outcome: DiceRollOutcome = diceRoll.outcome;
    const difficulty =
      elemental.level === 1
        ? "easy"
        : elemental.level === 2
          ? "medium"
          : "hard";

    let success = false;
    if (outcome === "crit_success") {
      success = true;
    } else if (outcome === "success") {
      success =
        difficulty === "easy" || (difficulty === "medium" && captureBonus > 0);
    } else if (outcome === "fail") {
      success = difficulty === "easy" && captureBonus >= 5;
    }

    let elementalCaught:
      | { id: string; name: string; level: number }
      | undefined = undefined;
    let message = "";

    if (success) {
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

      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "victory",
        dice_roll_id: data.dice_roll_id,
        item_used_id: data.item_id,
        captured_player_elemental_id: playerElemental.id,
        resolved_at: new Date(),
      });

      await db("player_progress")
        .where({ player_id: data.player_id })
        .increment("successful_captures", 1)
        .increment("total_elementals_owned", 1);

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

      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "defeat",
        dice_roll_id: data.dice_roll_id,
        item_used_id: data.item_id,
        resolved_at: new Date(),
      });
    }

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
   */
  async skipWildEncounter(playerId: string): Promise<SkipWildEncounterResult> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent || currentEvent.event_type !== "wild_encounter") {
      throw new BadRequestError("No active wild encounter event");
    }

    if (!currentEvent.wild_encounter_id) {
      throw new BadRequestError("Invalid wild encounter event");
    }

    const wildEncounter = await this.wildEncounterRepo.findById(
      currentEvent.wild_encounter_id,
    );
    if (!wildEncounter) {
      throw new NotFoundError("Wild encounter event");
    }

    const [elemental] = await db("elementals")
      .where({ id: wildEncounter.elemental_id })
      .limit(1);

    await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
      status: "fled",
      outcome: "fled",
      resolved_at: new Date(),
    });

    await this.repository.clearCurrentEvent(playerId);

    return {
      message: `You decided to skip the encounter with ${elemental?.name || "the elemental"}. The elemental wandered away.`,
      can_continue: true,
    };
  }

  /**
   * Leave merchant event
   */
  async leaveMerchant(playerId: string): Promise<LeaveMerchantResult> {
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

    await this.merchantRepo.updateResolution(merchant.id, {
      status: "completed",
      resolved_at: new Date(),
    });

    await this.repository.clearCurrentEvent(playerId);

    return {
      message: "You left the merchant and continue your journey.",
      can_continue: true,
    };
  }
}
