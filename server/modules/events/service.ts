import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { t, type Locale } from "../../shared/i18n";
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
  FarkleSessionRepository,
  type WildEncounterFarkleState,
  type FarkleStateRow,
  type BattleEvent,
} from "./repositories";
import { DiceRollService } from "../dice-rolls/service";
import {
  buildPartyMember,
  computeTargetAssignments,
  simulateCombatRound,
  calculateTotalPower,
  type BattlePartyMember,
  type BattleLogEntry,
  type ElementType,
} from "./battle-logic";
import {
  rollFarkleDice,
  detectCombinations,
  simulateOpponentTurn,
  applyBonusesToParty,
  mergeBonuses,
  countSoloSetAsideElementDice,
  collectSetAsideElements,
  collectCombinationElements,
  resolveDeploymentIndices,
  isDiceRush,
  isBust,
  type FarkleDie,
  type FarkleBattleState,
  type Combination,
} from "./farkle-battle-logic";
import {
  rollRemainingDice,
  detectV4Combinations,
  buildInitialV4TurnState,
  collectAssignedPartyIndices,
  applyV4CommitBonuses,
  validateDeployAllPossible,
  type FarkleV4Die,
  type FarkleV4TurnState,
  type V4DeploymentEffectEntry,
  type V4HealingLogEntry,
} from "./farkle-v4-logic";
import { simulateV4CombatRound } from "./farkle-v4-combat";

type DiceRarity = "common" | "rare" | "epic" | "legendary";
const RARITY_ORDER: DiceRarity[] = ["common", "rare", "epic", "legendary"];
const PVP_REWARD_MULTIPLIER = 0.25;
const PVP_REWARD_MIN = 25;
const PVP_REWARD_MAX = 500;

function calculateSetAsideBonuses(
  dice: FarkleDie[],
  activeCombinations: Combination[],
  setAsideElement: ElementType | null,
): Partial<Record<ElementType, number>> {
  let bonuses: Partial<Record<ElementType, number>> = {};

  for (const combo of activeCombinations) {
    for (const [el, pct] of Object.entries(combo.bonuses)) {
      bonuses[el as ElementType] = (bonuses[el as ElementType] ?? 0) + pct;
    }
  }

  const soloSetAsideCount = countSoloSetAsideElementDice(
    dice,
    activeCombinations,
    setAsideElement,
  );
  if (setAsideElement && soloSetAsideCount > 0) {
    bonuses[setAsideElement] =
      (bonuses[setAsideElement] ?? 0) + soloSetAsideCount * 0.1;
  }

  return bonuses;
}

function toElementSet(values: ElementType[]): ElementType[] {
  return [...new Set(values)];
}

function hasLivingElementals(party: BattlePartyMember[]): boolean {
  return party.some((member) => !member.is_destroyed && member.current_health > 0);
}

function deployedUnits(
  party: BattlePartyMember[],
  indices: number[],
  deploymentEffects: V4DeploymentEffectEntry[] = [],
): Array<{
  index: number;
  name: string;
  element: ElementType;
  applied_elements: ElementType[];
}> {
  const effectsByPartyIndex = new Map(
    deploymentEffects.map((effect) => [effect.party_index, effect.applied_elements]),
  );
  return indices
    .map((index) => {
      const member = party[index];
      if (!member) return null;
      return {
        index,
        name: member.name,
        element: member.element,
        applied_elements: effectsByPartyIndex.get(index) ?? [],
      };
    })
    .filter(
      (unit): unit is {
        index: number;
        name: string;
        element: ElementType;
        applied_elements: ElementType[];
      } => unit !== null,
    );
}

function appendBattleEndedLog(
  log: Array<Record<string, unknown>>,
  round: number,
  winner: "player" | "opponent" | "draw",
  playerTotal: number,
  opponentTotal: number,
): Array<Record<string, unknown>> {
  const nextSequence =
    log
      .filter((entry) => entry.round === round && typeof entry.sequence === "number")
      .reduce((max, entry) => Math.max(max, entry.sequence as number), 0) + 1;

  const entry: BattleLogEntry = {
    round,
    sequence: nextSequence,
    type: "battle_ended",
    payload: {
      winner,
      player_total_attack: playerTotal,
      opponent_total_attack: opponentTotal,
    },
  };

  return [
    ...log,
    entry,
  ];
}

function buildBattleRoundLog(input: {
  round: number;
  playerPartyBeforeCombat: BattlePartyMember[];
  opponentPartyBeforeCombat: BattlePartyMember[];
  playerDeployedIndices: number[];
  opponentDeployedIndices: number[];
  playerBonuses: Partial<Record<ElementType, number>>;
  opponentBonuses: Partial<Record<ElementType, number>>;
  playerDeploymentEffects?: V4DeploymentEffectEntry[];
  opponentDeploymentEffects?: V4DeploymentEffectEntry[];
  playerHealingEvents?: V4HealingLogEntry[];
  opponentHealingEvents?: V4HealingLogEntry[];
  firstAttacker?: "player" | "opponent";
  attackLog: Array<Record<string, unknown>>;
}): BattleLogEntry[] {
  type BattleLogEntryDraft = {
    type: BattleLogEntry["type"];
    side?: "player" | "opponent";
    payload: Record<string, unknown>;
    step?: number;
    attacker_index?: number;
    attacker_name?: string;
    attacker_element?: ElementType;
    target?: "unit";
    defender_index?: number;
    defender_name?: string;
    defender_element?: ElementType;
    damage?: number;
    weakness_bonus_applied?: boolean;
    dodged?: boolean;
    second_attack?: boolean;
    second_attack_lost?: boolean;
    defender_remaining_health?: number;
  };

  const entries: BattleLogEntry[] = [];
  let sequence = 1;

  const push = (entry: BattleLogEntryDraft) => {
    entries.push({ ...entry, round: input.round, sequence });
    sequence += 1;
  };

  push({
    type: "round_started",
    payload: { round: input.round },
  });

  push({
    type: "deployment_revealed",
    side: "player",
    payload: {
      deployed_indices: input.playerDeployedIndices,
      units: deployedUnits(
        input.playerPartyBeforeCombat,
        input.playerDeployedIndices,
        input.playerDeploymentEffects,
      ),
    },
  });

  push({
    type: "deployment_revealed",
    side: "opponent",
    payload: {
      deployed_indices: input.opponentDeployedIndices,
      units: deployedUnits(
        input.opponentPartyBeforeCombat,
        input.opponentDeployedIndices,
        input.opponentDeploymentEffects,
      ),
    },
  });

  for (const [element, amount] of Object.entries(input.playerBonuses)) {
    if (!amount) continue;
    push({
      type: "bonus_applied",
      side: "player",
      payload: { element, amount },
    });
  }

  for (const [element, amount] of Object.entries(input.opponentBonuses)) {
    if (!amount) continue;
    push({
      type: "bonus_applied",
      side: "opponent",
      payload: { element, amount },
    });
  }

  for (const healing of input.playerHealingEvents ?? []) {
    push({
      type: "unit_healed",
      side: "player",
      payload: { ...healing },
    });
  }

  for (const healing of input.opponentHealingEvents ?? []) {
    push({
      type: "unit_healed",
      side: "opponent",
      payload: { ...healing },
    });
  }

  const firstAttacker =
    input.firstAttacker ??
    (input.attackLog.find((entry) => entry.side === "player" || entry.side === "opponent")
      ?.side as "player" | "opponent" | undefined);

  if (firstAttacker) {
    push({
      type: "initiative_decided",
      side: firstAttacker,
      payload: { first_attacker: firstAttacker },
    });
  }

  for (const rawAttack of input.attackLog) {
    const attackEntry = {
      ...rawAttack,
      type: "attack_resolved",
      payload: {
        attacker_index: rawAttack.attacker_index,
        attacker_name: rawAttack.attacker_name,
        attacker_element: rawAttack.attacker_element,
        defender_index: rawAttack.defender_index,
        defender_name: rawAttack.defender_name,
        defender_element: rawAttack.defender_element,
        damage: rawAttack.damage,
        weakness_bonus_applied: rawAttack.weakness_bonus_applied,
        dodged: rawAttack.dodged,
        second_attack: rawAttack.second_attack,
        second_attack_lost: rawAttack.second_attack_lost,
        defender_remaining_health: rawAttack.defender_remaining_health,
      },
    } as BattleLogEntryDraft;

    push(attackEntry);

    if (
      rawAttack.target === "unit" &&
      rawAttack.defender_name &&
      rawAttack.defender_remaining_health === 0
    ) {
      push({
        type: "unit_destroyed",
        side: rawAttack.side === "player" ? "opponent" : "player",
        step: rawAttack.step as number | undefined,
        payload: {
          defender_index: rawAttack.defender_index,
          defender_name: rawAttack.defender_name,
          defender_element: rawAttack.defender_element,
          destroyed_by: rawAttack.attacker_name,
          attacker_side: rawAttack.side,
        },
      });
    }
  }

  const playerDamageTaken = input.attackLog
    .filter((entry) => entry.side === "opponent")
    .reduce((sum, entry) => sum + (typeof entry.damage === "number" ? entry.damage : 0), 0);
  const opponentDamageTaken = input.attackLog
    .filter((entry) => entry.side === "player")
    .reduce((sum, entry) => sum + (typeof entry.damage === "number" ? entry.damage : 0), 0);
  const playerUnitsDestroyed = input.attackLog.filter(
    (entry) => entry.side === "opponent" && entry.defender_remaining_health === 0,
  ).length;
  const opponentUnitsDestroyed = input.attackLog.filter(
    (entry) => entry.side === "player" && entry.defender_remaining_health === 0,
  ).length;

  push({
    type: "round_ended",
    payload: {
      player_damage_taken: playerDamageTaken,
      opponent_damage_taken: opponentDamageTaken,
      player_units_destroyed: playerUnitsDestroyed,
      opponent_units_destroyed: opponentUnitsDestroyed,
    },
  });

  return entries;
}

export interface WildBattleState {
  player_party: BattlePartyMember[];
  enemy_party: BattlePartyMember[];
  combat_log: Array<Record<string, unknown>>;
  round: number;
}

function calculatePvPReward(opponentPowerLevel: number): number {
  const scaled = Math.floor(opponentPowerLevel * PVP_REWARD_MULTIPLIER);
  return Math.max(PVP_REWARD_MIN, Math.min(PVP_REWARD_MAX, scaled));
}

export class EventService {
  constructor(
    private repository = new EventRepository(),
    private wildEncounterRepo = new WildEncounterEventRepository(),
    private battleRepo = new BattleEventRepository(),
    private merchantRepo = new MerchantEventRepository(),
    private farkleSessionRepo = new FarkleSessionRepository(),
    private diceRollService = new DiceRollService(),
  ) {}

  /**
   * Returns event types currently available for a player.
   * PvP battles require 5 active party elementals.
   */
  async getEventOptions(playerId: string, locale: Locale = "en"): Promise<{
    available: EventType[];
    unavailable: Array<{ event_type: EventType; reason: string }>;
  }> {
    const activePartyCount = (await db("player_elementals")
      .where({ player_id: playerId, is_in_active_party: true })
      .count("* as count")
      .first()) as { count: string | number } | undefined;
    const partySize = Number(activePartyCount?.count ?? 0);

    const available: EventType[] = ["wild_encounter", "merchant"];
    const unavailable: Array<{ event_type: EventType; reason: string }> = [];

    if (partySize >= 5) {
      available.push("pvp_battle");
    } else {
      unavailable.push({
        event_type: "pvp_battle",
        reason: t(locale, "event.option.pvp_requires_party"),
      });
    }

    return { available, unavailable };
  }

  /**
   * Create a specific event type for a player.
   */
  async createEvent(
    playerId: string,
    eventType: EventType,
    locale: Locale = "en",
  ): Promise<EventResponse> {
    // Check if player already has a current event
    const existingEvent = await this.repository.getCurrentEvent(playerId);
    if (existingEvent) {
      throw new BadRequestError(
        t(locale, "event.error.active_event_exists"),
      );
    }

    const options = await this.getEventOptions(playerId, locale);
    if (!options.available.includes(eventType)) {
      const entry = options.unavailable.find((item) => item.event_type === eventType);
      throw new BadRequestError(
        entry?.reason ?? t(locale, "event.error.unavailable_event_type"),
      );
    }

    // Generate event-specific data and create event records
    let eventResponse: EventResponse;
    let eventRecordId: string;

    switch (eventType) {
      case "wild_encounter": {
        const encounterData = await this.generateWildEncounter(locale);
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
        (eventResponse.data as any).event_id = eventRecordId;
        break;
      }
      case "pvp_battle": {
        const battleData = await this.generatePvPBattle(playerId, locale);
        eventResponse = battleData.response;

        // Create event record with battle state
        const battle = await this.battleRepo.create({
          player_id: playerId,
          opponent_name: battleData.opponent_name,
          opponent_power_level: battleData.opponent_power_level,
          opponent_party_data: {
            opponent_party: battleData.opponentPartyData,
            seed_battle_state: battleData.battleState,
          },
        });
        eventRecordId = battle.id;

        // Save current event pointer
        await this.repository.setCurrentEvent({
          player_id: playerId,
          event_type: eventType,
          battle_id: eventRecordId,
        });
        (eventResponse.data as any).event_id = eventRecordId;
        break;
      }
      case "merchant": {
        const merchantData = await this.generateMerchantEvent(playerId, locale);
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
        (eventResponse.data as any).event_id = eventRecordId;
        break;
      }
      default:
        throw new BadRequestError(t(locale, "event.error.unknown_event_type"));
    }

    return eventResponse;
  }

  /**
   * Trigger a random event based on probabilities.
   * Kept for backward compatibility with existing callers.
   */
  async triggerEvent(playerId: string, locale: Locale = "en"): Promise<EventResponse> {
    const options = await this.getEventOptions(playerId, locale);
    const eventType = this.determineEventType(!options.available.includes("pvp_battle"));
    return this.createEvent(playerId, eventType, locale);
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
  private async generateWildEncounter(locale: Locale): Promise<{
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
      encounter_element: (randomElemental.element_types?.[0] ?? "fire") as any,
      capture_difficulty: captureDifficulty,
      farkle_initialized: false,
    };

    return {
      response: {
        event_type: "wild_encounter",
        description: t(locale, "event.description.wild.capture_flow", {
          name: randomElemental.name,
        }),
        data,
      },
      elemental_id: randomElemental.id,
    };
  }

  private createInitialWildEncounterFarkleState(): WildEncounterFarkleState {
    return {
      phase: "initial_roll",
      dice: [],
      has_used_reroll: false,
      active_combinations: [],
      set_aside_element_bonus: null,
      accumulated_combination_elements: [],
      accumulated_set_aside_elements: [],
      is_dice_rush: false,
      busted: false,
      detected_combinations: [],
      assignment_required_party_indices: [],
      assigned_party_indices: [],
      can_commit: false,
    };
  }

  private mapStateRowToWildFarkleState(state: FarkleStateRow): WildEncounterFarkleState {
    return {
      phase: state.phase as WildEncounterFarkleState["phase"],
      dice: (state.dice_state ?? []) as FarkleDie[],
      has_used_reroll: state.has_used_reroll,
      active_combinations: (state.active_combinations ?? []) as any,
      set_aside_element_bonus: state.set_aside_element_bonus ?? null,
      accumulated_combination_elements: [],
      accumulated_set_aside_elements: [],
      is_dice_rush: state.is_dice_rush,
      busted: state.busted,
      detected_combinations: (state.detected_combinations ?? []) as any,
      assignment_required_party_indices: (state.meta?.assignment_required_party_indices ?? []) as number[],
      assigned_party_indices: (state.meta?.assigned_party_indices ?? []) as number[],
      can_commit: Boolean(state.meta?.can_commit),
    };
  }

  private async saveWildFarkleState(
    sessionId: string,
    state: WildEncounterFarkleState,
    meta?: Record<string, unknown>,
  ) {
    await this.farkleSessionRepo.updateState(sessionId, {
      phase: state.phase,
      has_used_reroll: false,
      set_aside_element_bonus: null,
      is_dice_rush: state.is_dice_rush,
      busted: state.busted,
      dice_state: state.dice,
      active_combinations: state.active_combinations as any[],
      detected_combinations: state.detected_combinations as any[],
      ...(meta
        ? {
            meta: {
              ...meta,
              assignment_required_party_indices: state.assignment_required_party_indices ?? [],
              assigned_party_indices: state.assigned_party_indices ?? [],
              can_commit: state.can_commit ?? false,
            },
          }
        : {
            meta: {
              assignment_required_party_indices: state.assignment_required_party_indices ?? [],
              assigned_party_indices: state.assigned_party_indices ?? [],
              can_commit: state.can_commit ?? false,
            },
          }),
    });
  }

  private async buildInitialWildBattleState(
    playerId: string,
    encounteredElemental: {
      id: string;
      name: string;
      level: number;
      element_types: string[];
      base_stats?: { attack?: number; health?: number };
    },
  ): Promise<WildBattleState> {
    const playerElementals = await db("player_elementals")
      .where({ player_id: playerId, is_in_active_party: true })
      .leftJoin("elementals", "player_elementals.elemental_id", "elementals.id")
      .select(
        "elementals.id as elemental_id",
        "elementals.name",
        "elementals.level",
        "elementals.element_types",
        "elementals.base_stats",
        "player_elementals.id as player_elemental_id",
      )
      .orderBy("player_elementals.party_position", "asc");

    const playerParty = playerElementals.map((pe: any) =>
      buildPartyMember(
        {
          id: pe.elemental_id,
          name: pe.name,
          level: pe.level,
          element_types: pe.element_types,
          base_stats: pe.base_stats,
        },
        pe.player_elemental_id,
      ),
    );

    const enemyParty = [
      buildPartyMember({
        id: encounteredElemental.id,
        name: encounteredElemental.name,
        level: encounteredElemental.level,
        element_types: encounteredElemental.element_types,
        base_stats: encounteredElemental.base_stats,
      }),
    ];

    return {
      player_party: playerParty,
      enemy_party: enemyParty,
      combat_log: [],
      round: 1,
    };
  }

  /**
   * Generate a PvP battle event with v3 battle state.
   */
  private async generatePvPBattle(playerId: string, locale: Locale): Promise<{
    response: EventResponse;
    opponent_name: string;
    opponent_power_level: number;
    battleState: FarkleBattleState;
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
        "elementals.base_stats",
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
          base_stats: pe.base_stats,
        },
        pe.player_elemental_id,
      ),
    );

    // Generate opponent party with the same level profile as the player's party
    const playerPartyLevels = playerParty.map((member) => member.level);
    const opponentParty = await this.generateOpponentParty(playerPartyLevels);
    const opponentName = this.generateOpponentName();
    const opponentPowerLevel = Math.round(
      opponentParty.reduce((sum, m) => sum + m.base_attack + m.max_health, 0),
    );

    // Compute target assignments (for targeting phase display)
    const assigned = computeTargetAssignments(playerParty, opponentParty);

    // Pick a random set-aside element for the opponent AI from its party elements
    const opponentElements = [
      ...new Set(assigned.opponentParty.map((m) => m.element)),
    ] as ElementType[];
    const opponentSetAsideElement =
      opponentElements[Math.floor(Math.random() * opponentElements.length)] ?? "fire";

    // Build initial Farkle battle state (starts in targeting phase)
    const battleState: FarkleBattleState = {
      phase: "targeting",
      player_party: assigned.playerParty,
      opponent_party: assigned.opponentParty,
      set_aside_element: null,
      opponent_set_aside_element: opponentSetAsideElement,
      current_turn: 1,
      player_turns_done: 0,
      opponent_turns_done: 0,
      player_turn: null,
      opponent_turn_result: null,
      player_bonuses_total: {},
      opponent_bonuses_total: {},
      combat_log: [],
    };

    const potentialReward = calculatePvPReward(opponentPowerLevel);

    const data: PvPData = {
      opponent_name: opponentName,
      opponent_power_level: opponentPowerLevel,
      potential_reward: potentialReward,
      opponent_party: assigned.opponentParty,
      player_party: assigned.playerParty,
      battle_state: battleState as any,
      farkle_initialized: false,
    };

    return {
      response: {
        event_type: "pvp_battle",
        description: t(locale, "event.description.pvp.challenge", {
          opponentName,
          reward: potentialReward,
        }),
        data,
      },
      opponent_name: opponentName,
      opponent_power_level: opponentPowerLevel,
      battleState,
      opponentPartyData: assigned.opponentParty,
    };
  }

  /**
   * Generate an AI opponent party that mirrors the player's party levels.
   */
  private async generateOpponentParty(playerPartyLevels: number[]): Promise<BattlePartyMember[]> {
    // Get all elementals from DB and group them by level so AI mirrors player tier.
    const allElementals = await db("elementals")
      .select("id", "name", "level", "element_types", "base_stats")
      .orderByRaw("RANDOM()");

    if (allElementals.length === 0) {
      throw new BadRequestError("No elementals available for opponent party");
    }

    const partySize = playerPartyLevels.length;
    if (partySize === 0) {
      throw new BadRequestError("Player party is empty");
    }

    const elementalsByLevel = allElementals.reduce<Record<number, any[]>>((acc, elemental) => {
      const level = Number(elemental.level);
      if (!acc[level]) acc[level] = [];
      acc[level].push(elemental);
      return acc;
    }, {});

    const availableLevels = Object.keys(elementalsByLevel)
      .map(Number)
      .filter((level) => Number.isFinite(level))
      .sort((a, b) => a - b);

    if (availableLevels.length === 0) {
      throw new BadRequestError("No elementals available for opponent party");
    }

    const findClosestAvailableLevel = (targetLevel: number): number => {
      return availableLevels.reduce((closest, candidate) => {
        const candidateDistance = Math.abs(candidate - targetLevel);
        const closestDistance = Math.abs(closest - targetLevel);
        return candidateDistance < closestDistance ? candidate : closest;
      }, availableLevels[0]);
    };

    // Pick random elementals from matching level pools (with nearest-level fallback).
    const party: BattlePartyMember[] = [];

    for (let i = 0; i < partySize; i++) {
      const requestedLevel = Math.max(1, Math.min(4, playerPartyLevels[i]));
      const levelPool =
        elementalsByLevel[requestedLevel] ??
        elementalsByLevel[findClosestAvailableLevel(requestedLevel)];
      const elemental = levelPool[Math.floor(Math.random() * levelPool.length)];
      const member = buildPartyMember({
        id: elemental.id,
        name: elemental.name,
        level: elemental.level,
        element_types: elemental.element_types,
        base_stats: elemental.base_stats,
      });
      party.push(member);
    }

    return party;
  }

  /**
   * Start a battle (legacy endpoint compatibility).
   */
  async startBattle(playerId: string): Promise<FarkleBattleState> {
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

    const session = await this.farkleSessionRepo.findSessionByEvent(
      "pvp_battle",
      currentEvent.battle_id,
    );
    if (session) {
      const battleState = await this.ensureBattleStateForSession(session.id, battle);
      if (battleState.player_turn) {
        battleState.player_turn.accumulated_dice_rush_bonuses ??= {};
        battleState.player_turn.accumulated_combination_elements ??= [];
        battleState.player_turn.accumulated_set_aside_elements ??= [];
      }
      return battleState;
    }
    const seed =
      (battle.opponent_party_data?.seed_battle_state as FarkleBattleState | undefined) ?? null;
    if (!seed) {
      throw new BadRequestError("Battle seed data is missing");
    }

    return {
      ...seed,
      phase: "player_turn",
      set_aside_element: null,
      player_turn: null,
    };
  }

  // ======================================================================
  // Farkle Battle Methods (v2)
  // ======================================================================

  async farkleInit(
    playerId: string,
    eventType: "pvp_battle" | "wild_encounter",
    eventId: string,
    setAsideElement: ElementType,
  ): Promise<{
    farkle_session_id: string;
    event_type: "pvp_battle" | "wild_encounter";
    battle_state?: FarkleBattleState;
    farkle_state?: WildEncounterFarkleState;
    wild_battle_state?: WildBattleState;
    set_aside_element?: ElementType;
  }> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent || currentEvent.event_type !== eventType) {
      throw new BadRequestError("No active event of this type");
    }

    const currentEventId =
      eventType === "wild_encounter" ? currentEvent.wild_encounter_id : currentEvent.battle_id;
    if (!currentEventId || currentEventId !== eventId) {
      throw new BadRequestError("Event id does not match active event");
    }

    let existingSession = await this.farkleSessionRepo.findSessionByEvent(eventType, eventId);
    if (existingSession) {
      const existingState = await this.farkleSessionRepo.getState(existingSession.id);
      if (!existingState) {
        throw new BadRequestError("Farkle state is missing for existing session");
      }
      if (eventType === "pvp_battle") {
        return {
          farkle_session_id: existingSession.id,
          event_type: eventType,
          battle_state: existingState.meta?.battle_state as FarkleBattleState,
        };
      }
      return {
        farkle_session_id: existingSession.id,
        event_type: eventType,
        farkle_state: this.mapStateRowToWildFarkleState(existingState),
        wild_battle_state: existingState.meta?.wild_battle_state as
          | WildBattleState
          | undefined,
        set_aside_element: existingSession.set_aside_element as ElementType,
      };
    }

    if (eventType === "wild_encounter") {
      const wildEncounter = await this.wildEncounterRepo.findById(eventId);
      if (!wildEncounter || wildEncounter.player_id !== playerId) {
        throw new NotFoundError("Wild encounter event");
      }
      const [elemental] = await db("elementals").where({ id: wildEncounter.elemental_id }).limit(1);
      if (!elemental) {
        throw new NotFoundError("Elemental");
      }
      const wildBattleState = await this.buildInitialWildBattleState(
        playerId,
        elemental as any,
      );
      const partyElements = wildBattleState.player_party.map((member) => member.element);
      if (!partyElements.includes(setAsideElement)) {
        throw new BadRequestError("Chosen element must be present in your party");
      }

      existingSession = await this.farkleSessionRepo.createSession({
        player_id: playerId,
        event_type: eventType,
        event_id: eventId,
        set_aside_element: setAsideElement,
      });
      const initial = this.createInitialWildEncounterFarkleState();
      await this.farkleSessionRepo.createState(existingSession.id, {
        phase: initial.phase,
        has_used_reroll: false,
        set_aside_element_bonus: null,
        is_dice_rush: initial.is_dice_rush,
        busted: initial.busted,
        dice_state: initial.dice,
        active_combinations: initial.active_combinations as any[],
        detected_combinations: initial.detected_combinations as any[],
        meta: { wild_battle_state: wildBattleState },
      });

      return {
        farkle_session_id: existingSession.id,
        event_type: eventType,
        farkle_state: initial,
        wild_battle_state: wildBattleState,
        set_aside_element: setAsideElement,
      };
    }

    const battle = await this.battleRepo.findById(eventId);
    if (!battle || battle.player_id !== playerId) {
      throw new NotFoundError("Battle event");
    }
    const battleSeed =
      (battle.opponent_party_data?.seed_battle_state as FarkleBattleState | undefined) ?? null;
    if (!battleSeed) {
      throw new BadRequestError("Battle seed data is missing");
    }

    const partyElements = battleSeed.player_party.map((m) => m.element);
    if (!partyElements.includes(setAsideElement)) {
      throw new BadRequestError("Chosen element must be present in your party");
    }

    const initializedBattleState: FarkleBattleState = {
      ...battleSeed,
      set_aside_element: setAsideElement,
      phase: "player_turn",
      player_turn: null,
    };

    existingSession = await this.farkleSessionRepo.createSession({
      player_id: playerId,
      event_type: eventType,
      event_id: eventId,
      set_aside_element: setAsideElement,
      opponent_set_aside_element: initializedBattleState.opponent_set_aside_element,
    });

    await this.farkleSessionRepo.createState(existingSession.id, {
      phase: "player_turn",
      has_used_reroll: false,
      set_aside_element_bonus: null,
      is_dice_rush: false,
      busted: false,
      dice_state: [],
      active_combinations: [],
      detected_combinations: [],
      meta: { battle_state: initializedBattleState },
    });

    return {
      farkle_session_id: existingSession.id,
      event_type: eventType,
      battle_state: initializedBattleState,
    };
  }

  private async validateSessionOwnership(
    playerId: string,
    sessionId: string,
  ): Promise<{ eventType: "pvp_battle" | "wild_encounter" }> {
    const session = await this.farkleSessionRepo.findSessionById(sessionId);
    if (!session || session.player_id !== playerId) {
      throw new BadRequestError("Invalid farkle session");
    }
    if (session.status !== "active") {
      throw new BadRequestError("Farkle session already resolved");
    }
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent) {
      throw new BadRequestError("No active event");
    }
    const activeEventId =
      session.event_type === "wild_encounter"
        ? currentEvent.wild_encounter_id
        : currentEvent.battle_id;
    if (
      currentEvent.event_type !== session.event_type ||
      !activeEventId ||
      activeEventId !== session.event_id
    ) {
      throw new BadRequestError("Session does not match active event");
    }
    return { eventType: session.event_type as "pvp_battle" | "wild_encounter" };
  }

  private async getFarkleBattle(playerId: string): Promise<{
    battle: NonNullable<Awaited<ReturnType<BattleEventRepository["findById"]>>>;
    battleState: FarkleBattleState;
    sessionId: string;
  }> {
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
    const session = await this.farkleSessionRepo.findSessionByEvent(
      "pvp_battle",
      currentEvent.battle_id,
    );
    if (!session) {
      throw new BadRequestError("Farkle session is not initialized");
    }
    const battleState = await this.ensureBattleStateForSession(session.id, battle);
    if (battleState.player_turn) {
      battleState.player_turn.accumulated_dice_rush_bonuses ??= {};
      battleState.player_turn.accumulated_combination_elements ??= [];
      battleState.player_turn.accumulated_set_aside_elements ??= [];
    }
    return { battle: battle!, battleState, sessionId: session.id };
  }

  private buildInitialBattleStateFromSeed(seed: FarkleBattleState): FarkleBattleState {
    return {
      ...seed,
      phase: "player_turn",
      set_aside_element: null,
      player_turn: null,
    };
  }

  private async ensureBattleStateForSession(
    sessionId: string,
    battle: BattleEvent,
  ): Promise<FarkleBattleState> {
    const state = await this.farkleSessionRepo.getState(sessionId);
    const battleState = state?.meta?.battle_state as FarkleBattleState | undefined;
    if (battleState) {
      return battleState;
    }

    const seed =
      (battle.opponent_party_data?.seed_battle_state as FarkleBattleState | undefined) ?? null;
    if (!seed) {
      throw new BadRequestError("Battle state not initialized");
    }

    const recoveredState = this.buildInitialBattleStateFromSeed(seed);
    if (state) {
      await this.farkleSessionRepo.updateState(sessionId, {
        meta: { ...(state.meta ?? {}), battle_state: recoveredState },
      });
    } else {
      await this.farkleSessionRepo.createState(sessionId, {
        phase: "player_turn",
        has_used_reroll: false,
        set_aside_element_bonus: null,
        is_dice_rush: false,
        busted: false,
        dice_state: [],
        active_combinations: [],
        detected_combinations: [],
        meta: { battle_state: recoveredState },
      });
    }

    return recoveredState;
  }

  private async getEquippedV4Dice(playerId: string): Promise<FarkleV4Die[]> {
    const equippedDice = await db("player_dice")
      .where({ player_id: playerId, is_equipped: true })
      .leftJoin("dice_types", "player_dice.dice_type_id", "dice_types.id")
      .select(
        "player_dice.id as player_dice_id",
        "player_dice.dice_type_id",
        "dice_types.dice_notation",
        "dice_types.faces",
      )
      .limit(5);

    if (equippedDice.length === 0) {
      throw new BadRequestError("No dice equipped. Please equip dice before battling.");
    }

    return equippedDice.map((d: any) => ({
      player_dice_id: d.player_dice_id,
      dice_type_id: d.dice_type_id,
      dice_notation: d.dice_notation ?? "d6",
      faces: Array.isArray(d.faces) ? d.faces : JSON.parse(d.faces ?? "[]"),
      current_result: "fire" as ElementType,
      is_set_aside: false,
      is_assigned: false,
      assigned_to_party_index: null,
    }));
  }

  private ensureV4TurnState(battleState: FarkleBattleState): FarkleV4TurnState {
    const turn = battleState.player_turn as unknown as FarkleV4TurnState | null;
    if (!turn) {
      throw new BadRequestError("Player turn is not initialized");
    }
    return turn;
  }

  private getV4CandidateCombinationsForUi(dice: FarkleV4Die[]): Combination[] {
    const byElement = new Map<ElementType, number[]>();
    for (const [index, die] of dice.entries()) {
      const current = byElement.get(die.current_result) ?? [];
      current.push(index);
      byElement.set(die.current_result, current);
    }

    const combos: Combination[] = [];

    for (const [element, indices] of byElement.entries()) {
      if (indices.length < 2) continue;

      const comboType =
        indices.length >= 5
          ? "quintet"
          : indices.length === 4
            ? "quartet"
            : indices.length === 3
              ? "triplet"
              : "doublet";

      const pct =
        comboType === "doublet"
          ? 0.2
          : comboType === "triplet"
            ? 0.3
            : comboType === "quartet"
              ? 0.4
              : 0.5;

      combos.push({
        type: comboType as Combination["type"],
        elements: [element],
        dice_indices: [...indices],
        bonuses: { [element]: pct },
      });
    }

    if (dice.length === 5 && byElement.size === 5) {
      combos.push({
        type: "one_for_all",
        elements: [...byElement.keys()],
        dice_indices: [0, 1, 2, 3, 4],
        bonuses: {},
      });
    }

    if (byElement.size === 2) {
      const groups = [...byElement.entries()].map(([el, indices]) => ({ el, n: indices.length }));
      const hasTriplet = groups.some((g) => g.n === 3);
      const hasPair = groups.some((g) => g.n === 2);
      if (hasTriplet && hasPair) {
        const tripletEl = groups.find((g) => g.n === 3)?.el;
        const pairEl = groups.find((g) => g.n === 2)?.el;
        if (tripletEl && pairEl) {
          combos.push({
            type: "full_house",
            elements: [tripletEl, pairEl],
            dice_indices: [...(byElement.get(tripletEl) ?? []), ...(byElement.get(pairEl) ?? [])],
            bonuses: {},
          });
        }
      }
    }

    return combos;
  }

  private toUiCombinations(combos: ReturnType<typeof detectV4Combinations>): Combination[] {
    return combos.map((combo) => {
      const bonuses: Record<string, number> = {};
      if (combo.type !== "one_for_all" && combo.type !== "full_house") {
        const element = combo.elements[0];
        bonuses[element] =
          combo.type === "doublet"
            ? 0.2
            : combo.type === "triplet"
              ? 0.3
              : combo.type === "quartet"
                ? 0.4
                : 0.5;
      }
      return {
        type: combo.type as Combination["type"],
        elements: combo.elements,
        dice_indices: combo.dice_indices,
        bonuses,
      };
    });
  }

  private getV4DetectedCombinationsForResponse(turn: FarkleV4TurnState): Combination[] {
    const reservedDiceCount = turn.dice.filter((die) => die.is_set_aside).length;
    if (reservedDiceCount === 0) {
      return this.getV4CandidateCombinationsForUi(turn.dice);
    }
    return this.toUiCombinations(detectV4Combinations(turn.dice));
  }

  async farkleV4InitBattle(
    playerId: string,
    eventId: string,
    setAsideElement: ElementType | null = null,
  ): Promise<{
    farkle_session_id: string;
    event_type: "pvp_battle";
    battle_state: FarkleBattleState;
  }> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent || currentEvent.event_type !== "pvp_battle") {
      throw new BadRequestError("No active battle event");
    }
    if (!currentEvent.battle_id || currentEvent.battle_id !== eventId) {
      throw new BadRequestError("Battle id does not match active event");
    }

    const battle = await this.battleRepo.findById(eventId);
    if (!battle || battle.player_id !== playerId) {
      throw new NotFoundError("Battle event");
    }

    const existingSession = await this.farkleSessionRepo.findSessionByEvent(
      "pvp_battle",
      eventId,
    );
    if (existingSession) {
      const existingBattleState = await this.ensureBattleStateForSession(existingSession.id, battle);
      return {
        farkle_session_id: existingSession.id,
        event_type: "pvp_battle",
        battle_state: existingBattleState,
      };
    }
    const battleSeed =
      (battle.opponent_party_data?.seed_battle_state as FarkleBattleState | undefined) ?? null;
    if (!battleSeed) {
      throw new BadRequestError("Battle seed data is missing");
    }

    const battleState = this.buildInitialBattleStateFromSeed(battleSeed);

    const createdSession = await this.farkleSessionRepo.createSession({
      player_id: playerId,
      event_type: "pvp_battle",
      event_id: eventId,
      set_aside_element: setAsideElement,
      opponent_set_aside_element: battleState.opponent_set_aside_element as
        | ElementType
        | null,
    });

    await this.farkleSessionRepo.createState(createdSession.id, {
      phase: "player_turn",
      has_used_reroll: false,
      set_aside_element_bonus: null,
      is_dice_rush: false,
      busted: false,
      dice_state: [],
      active_combinations: [],
      detected_combinations: [],
      meta: { battle_state: battleState },
    });

    return {
      farkle_session_id: createdSession.id,
      event_type: "pvp_battle",
      battle_state: battleState,
    };
  }

  async farkleV4Roll(playerId: string, farkleSessionId: string): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "pvp_battle") {
      throw new BadRequestError("V4 roll is only available for battles");
    }

    const { sessionId, battleState } = await this.getFarkleBattle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active battle");
    }

    if (battleState.phase !== "player_turn") {
      throw new BadRequestError("Not your turn");
    }

    let turn = battleState.player_turn as unknown as FarkleV4TurnState | null;
    if (!turn) {
      turn = buildInitialV4TurnState(await this.getEquippedV4Dice(playerId));
      battleState.player_turn = turn as any;
    }

    const remainingDice = turn.dice.filter((die) => !die.is_set_aside);
    if (turn.dice.length > 0 && remainingDice.length === 0) {
      throw new BadRequestError("No remaining dice to roll");
    }

    turn.dice = rollRemainingDice(turn.dice);
    for (const die of turn.dice) {
      if (!die.is_set_aside) {
        await this.diceRollService.performRoll({
          player_id: playerId,
          dice_type_id: die.dice_type_id,
          context: "farkle_battle",
        });
      }
    }

    turn.phase = "set_aside";
    turn.active_combinations = detectV4Combinations(turn.dice) as any;
    validateDeployAllPossible(battleState.player_party, turn);

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
    };
  }

  async farkleV4SetAside(
    playerId: string,
    farkleSessionId: string,
    diceIndices: number[],
  ): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "pvp_battle") {
      throw new BadRequestError("V4 set-aside is only available for battles");
    }

    const { sessionId, battleState } = await this.getFarkleBattle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active battle");
    }

    const turn = this.ensureV4TurnState(battleState);
    if (diceIndices.length === 0) {
      throw new BadRequestError("Must select at least one die");
    }

    for (const dieIndex of diceIndices) {
      const die = turn.dice[dieIndex];
      if (!die) {
        throw new BadRequestError("Invalid die index");
      }
      if (die.is_set_aside) {
        throw new BadRequestError("Die is already set aside");
      }
      turn.dice[dieIndex] = {
        ...die,
        is_set_aside: true,
      };
    }

    turn.active_combinations = detectV4Combinations(turn.dice) as any;
    validateDeployAllPossible(battleState.player_party, turn);
    turn.phase = turn.can_commit ? "ready_to_commit" : "rolling_remaining";

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
    };
  }

  async farkleV4Assign(
    playerId: string,
    farkleSessionId: string,
    dieIndex: number,
    partyIndex: number,
  ): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "pvp_battle") {
      throw new BadRequestError("V4 assign is only available for battles");
    }

    const { sessionId, battleState } = await this.getFarkleBattle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active battle");
    }

    const turn = this.ensureV4TurnState(battleState);
    const die = turn.dice[dieIndex];
    if (!die) {
      throw new BadRequestError("Invalid die index");
    }
    if (die.is_assigned) {
      throw new BadRequestError("Die is already assigned");
    }

    const member = battleState.player_party[partyIndex];
    if (!member) {
      throw new BadRequestError("Invalid party index");
    }
    if (member.is_destroyed || member.current_health <= 0) {
      throw new BadRequestError("Cannot assign to destroyed elemental");
    }

    const alreadyAssigned = turn.dice.some((d) => d.assigned_to_party_index === partyIndex);
    if (alreadyAssigned) {
      throw new BadRequestError("Elemental already has an assigned die this turn");
    }

    turn.dice[dieIndex] = {
      ...die,
      is_set_aside: true,
      is_assigned: true,
      assigned_to_party_index: partyIndex,
    };

    turn.active_combinations = detectV4Combinations(turn.dice) as any;
    validateDeployAllPossible(battleState.player_party, turn);
    turn.phase = turn.can_commit ? "ready_to_commit" : "rolling_remaining";

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
    };
  }

  async farkleV4Unassign(
    playerId: string,
    farkleSessionId: string,
    dieIndex: number,
  ): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    void playerId;
    void farkleSessionId;
    void dieIndex;
    throw new BadRequestError(
      "Unassignment is not allowed in V4. Assigned dice are locked for the turn.",
    );
  }

  async farkleV4Commit(
    playerId: string,
    farkleSessionId: string,
    locale: Locale = "en",
  ): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
    result?: NonNullable<BattleRollResult["result"]>;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "pvp_battle") {
      throw new BadRequestError("V4 commit is only available for battles");
    }

    const { battle, battleState, sessionId } = await this.getFarkleBattle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active battle");
    }

    if (battleState.phase !== "player_turn") {
      throw new BadRequestError("Not your turn");
    }

    const turn = this.ensureV4TurnState(battleState);
    const deployValidation = validateDeployAllPossible(battleState.player_party, turn);
    if (!deployValidation.can_commit) {
      throw new BadRequestError("You must deploy all possible alive elementals before commit");
    }

    const playerApplied = applyV4CommitBonuses(
      battleState.player_party,
      turn,
    );
    battleState.player_party = playerApplied.updated_party;
    battleState.player_bonuses_total = playerApplied.applied_bonuses;

    const opponentAliveIndices = battleState.opponent_party
      .map((member, index) => ({ member, index }))
      .filter(({ member }) => !member.is_destroyed && member.current_health > 0)
      .map(({ index }) => index);

    const opponentDice: FarkleV4Die[] = Array.from({ length: 5 }, (_, index) => ({
      player_dice_id: `opponent-${index}`,
      dice_type_id: `opponent-${index}`,
      dice_notation: "d6",
      faces: ["fire", "water", "earth", "air", "lightning"],
      current_result: "fire",
      // Opponent dice must be rolled first; set-aside/assignment happens after roll.
      is_set_aside: false,
      is_assigned: false,
      assigned_to_party_index: null,
    })) as FarkleV4Die[];
    const rolledOpponentDice = rollRemainingDice(opponentDice);
    const assignable = Math.min(opponentAliveIndices.length, rolledOpponentDice.length);
    for (let i = 0; i < assignable; i += 1) {
      rolledOpponentDice[i] = {
        ...rolledOpponentDice[i],
        is_set_aside: true,
        is_assigned: true,
        assigned_to_party_index: opponentAliveIndices[i],
      };
    }
    const opponentTurn: FarkleV4TurnState = {
      ...buildInitialV4TurnState(rolledOpponentDice),
      phase: "ready_to_commit",
      active_combinations: detectV4Combinations(rolledOpponentDice),
    };
    const opponentApplied = applyV4CommitBonuses(
      battleState.opponent_party,
      opponentTurn,
    );
    battleState.opponent_party = opponentApplied.updated_party;
    battleState.opponent_bonuses_total = opponentApplied.applied_bonuses;

    const playerPartyBeforeCombat = battleState.player_party.map((member) => ({ ...member }));
    const opponentPartyBeforeCombat = battleState.opponent_party.map((member) => ({ ...member }));

    const combatResult = simulateV4CombatRound(
      {
        round: battleState.current_turn,
        player_party: battleState.player_party,
        opponent_party: battleState.opponent_party,
      },
      {
        player_deployed_indices: playerApplied.deployed_indices,
        opponent_deployed_indices: opponentApplied.deployed_indices,
      },
    );

    battleState.player_party = combatResult.player_party;
    battleState.opponent_party = combatResult.opponent_party;
    battleState.combat_log = [
      ...(battleState.combat_log ?? []),
      ...buildBattleRoundLog({
        round: battleState.current_turn,
        playerPartyBeforeCombat,
        opponentPartyBeforeCombat,
        playerDeployedIndices: playerApplied.deployed_indices,
        opponentDeployedIndices: opponentApplied.deployed_indices,
        playerBonuses: playerApplied.applied_bonuses,
        opponentBonuses: opponentApplied.applied_bonuses,
        playerDeploymentEffects: playerApplied.deployment_effects,
        opponentDeploymentEffects: opponentApplied.deployment_effects,
        playerHealingEvents: playerApplied.healing_events,
        opponentHealingEvents: opponentApplied.healing_events,
        firstAttacker: combatResult.first_attacker,
        attackLog: combatResult.log,
      }),
    ];
    battleState.last_player_deployment = playerApplied.deployed_indices;
    battleState.last_opponent_deployment = opponentApplied.deployed_indices;
    battleState.opponent_turn_result = {
      dice: rolledOpponentDice as any,
      combination: opponentTurn.active_combinations[0] as any,
      set_aside_element_used: false,
      bonuses_applied: opponentApplied.applied_bonuses,
      deployable_elements: [],
      combination_elements: [],
      busted: false,
    } as any;

    battleState.player_turns_done += 1;
    battleState.opponent_turns_done += 1;
    battleState.player_turn = null;

    const playerAlive = hasLivingElementals(battleState.player_party);
    const opponentAlive = hasLivingElementals(battleState.opponent_party);
    const isResolved = !playerAlive || !opponentAlive;

    let result: NonNullable<BattleRollResult["result"]> | undefined;
    if (isResolved) {
      battleState.phase = "resolved";
      const playerTotal = calculateTotalPower(battleState.player_party);
      const opponentTotal = calculateTotalPower(battleState.opponent_party);
      let winner: "player" | "opponent" | "draw";
      if (playerAlive && !opponentAlive) winner = "player";
      else if (!playerAlive && opponentAlive) winner = "opponent";
      else winner = "draw";
      battleState.winner = winner;
      battleState.player_total_attack = playerTotal;
      battleState.opponent_total_attack = opponentTotal;
      battleState.combat_log = appendBattleEndedLog(
        battleState.combat_log,
        battleState.current_turn,
        winner,
        playerTotal,
        opponentTotal,
      );
      const victory = winner === "player" || winner === "draw";
      result = await this.resolveBattleOutcome(
        playerId,
        battle.id,
        victory,
        playerTotal,
        opponentTotal,
        battle.opponent_name,
        battle.opponent_power_level,
      );
      await this.farkleSessionRepo.resolveSession(sessionId);
    } else {
      battleState.current_turn += 1;
      battleState.phase = "player_turn";
    }

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
      is_resolved: isResolved,
      result,
    };
  }

  /**
   * Player chooses their set-aside element for the battle (once, before turn 1).
   */
  async chooseSetAsideElement(
    playerId: string,
    element: ElementType,
  ): Promise<FarkleBattleState> {
    const { sessionId, battleState } = await this.getFarkleBattle(playerId);

    // Validate the chosen element exists in player's party
    const partyElements = battleState.player_party.map((m) => m.element);
    if (!partyElements.includes(element)) {
      throw new BadRequestError(
        "Chosen element must be present in your party",
      );
    }

    battleState.set_aside_element = element;
    battleState.phase = "player_turn";

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });
    return battleState;
  }

  async farkleRoll(playerId: string, farkleSessionId: string): Promise<any> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType === "pvp_battle") {
      return this.farkleInitialRoll(playerId);
    }
    return this.wildEncounterFarkleInitialRoll(playerId);
  }

  async farkleRerollGeneric(
    playerId: string,
    farkleSessionId: string,
    diceIndicesToReroll: number[],
  ): Promise<any> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType === "pvp_battle") {
      return this.farkleReroll(playerId, diceIndicesToReroll);
    }
    return this.wildEncounterFarkleReroll(playerId, diceIndicesToReroll);
  }

  async farkleSetAsideGeneric(
    playerId: string,
    farkleSessionId: string,
    diceIndices: number[],
    oneForAllElement?: string,
  ): Promise<any> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType === "pvp_battle") {
      return this.farkleSetAside(playerId, diceIndices, oneForAllElement);
    }
    return this.wildEncounterFarkleSetAside(
      playerId,
      diceIndices,
      oneForAllElement,
    );
  }

  async farkleContinueGeneric(
    playerId: string,
    farkleSessionId: string,
  ): Promise<any> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType === "pvp_battle") {
      return this.farkleContinue(playerId);
    }
    return this.wildEncounterFarkleContinue(playerId);
  }

  async farkleEndTurnGeneric(
    playerId: string,
    farkleSessionId: string,
    itemId?: string,
    locale: Locale = "en",
  ): Promise<any> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType === "pvp_battle") {
      return this.farkleEndTurn(playerId);
    }
    return this.wildEncounterFarkleEndTurn(playerId, itemId, locale);
  }

  /**
   * Player rolls all 5 equipped dice (initial roll of a Farkle turn).
   */
  async farkleInitialRoll(playerId: string): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { sessionId, battleState } = await this.getFarkleBattle(playerId);

    if (battleState.phase !== "player_turn") {
      throw new BadRequestError("Not your turn");
    }

    // If player_turn state exists and isn't at initial_roll, they already rolled
    if (
      battleState.player_turn &&
      battleState.player_turn.phase !== "initial_roll"
    ) {
      throw new BadRequestError("Already rolled this turn. Use reroll or set-aside.");
    }

    // Get player's 5 equipped dice
    const equippedDice = await db("player_dice")
      .where({ player_id: playerId, is_equipped: true })
      .leftJoin("dice_types", "player_dice.dice_type_id", "dice_types.id")
      .select(
        "player_dice.id as player_dice_id",
        "player_dice.dice_type_id",
        "dice_types.dice_notation",
        "dice_types.faces",
      )
      .limit(5);

    if (equippedDice.length === 0) {
      throw new BadRequestError("No dice equipped. Please equip dice before battling.");
    }

    // Build FarkleDie objects and roll them
    const farkleDice: FarkleDie[] = equippedDice.map((d: any) => ({
      player_dice_id: d.player_dice_id,
      dice_type_id: d.dice_type_id,
      dice_notation: d.dice_notation ?? "d6",
      faces: Array.isArray(d.faces) ? d.faces : JSON.parse(d.faces ?? "[]"),
      current_result: "fire" as ElementType,
      is_set_aside: false,
    }));

    const rolledDice = rollFarkleDice(farkleDice);

    // Record each roll in dice_rolls table
    for (const die of rolledDice) {
      await this.diceRollService.performRoll({
        player_id: playerId,
        dice_type_id: die.dice_type_id,
        context: "farkle_battle",
      });
      // Override the random roll with our Farkle result (performRoll re-rolls,
      // but we only need it for persistence; the Farkle logic drives the actual result)
    }

    const detected = detectCombinations(rolledDice);
    const previousTurnState = battleState.player_turn;
    const isFirstRollOfTurn = !previousTurnState;
    const hasUsedReroll = !isFirstRollOfTurn;
    const busted = isBust(
      rolledDice,
      battleState.set_aside_element,
      hasUsedReroll,
    );

    battleState.player_turn = {
      phase: busted ? "done" : isFirstRollOfTurn ? "can_reroll" : "set_aside",
      dice: rolledDice,
      has_used_reroll: hasUsedReroll,
      active_combinations: [],
      set_aside_element_bonus: null,
      accumulated_dice_rush_bonuses:
        previousTurnState?.accumulated_dice_rush_bonuses ?? {},
      accumulated_combination_elements:
        previousTurnState?.accumulated_combination_elements ?? [],
      accumulated_set_aside_elements:
        previousTurnState?.accumulated_set_aside_elements ?? [],
      is_dice_rush: false,
      busted,
    };

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: detected,
      is_busted: busted,
      is_dice_rush: false,
    };
  }

  /**
   * Player uses the free reroll: re-rolls 1-5 dice (once per turn).
   */
  async farkleReroll(
    playerId: string,
    diceIndicesToReroll: number[],
  ): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { sessionId, battleState } = await this.getFarkleBattle(playerId);

    if (battleState.phase !== "player_turn" || !battleState.player_turn) {
      throw new BadRequestError("Not in player turn");
    }

    const turn = battleState.player_turn;

    if (turn.has_used_reroll) {
      throw new BadRequestError("Free reroll already used this turn");
    }

    if (turn.phase !== "can_reroll") {
      throw new BadRequestError("Cannot reroll at this stage");
    }

    if (diceIndicesToReroll.length === 0 || diceIndicesToReroll.length > 5) {
      throw new BadRequestError("Must reroll between 1 and 5 dice");
    }

    // Re-roll specified dice
    const updatedDice = turn.dice.map((die, i) => {
      if (diceIndicesToReroll.includes(i) && !die.is_set_aside) {
        const randomFace =
          die.faces[Math.floor(Math.random() * die.faces.length)];
        return { ...die, current_result: randomFace };
      }
      return die;
    });

    turn.dice = updatedDice;
    turn.has_used_reroll = true;
    const detected = detectCombinations(updatedDice);
    const busted = isBust(updatedDice, battleState.set_aside_element, true);

    if (busted) {
      turn.busted = true;
      turn.phase = "done";
    } else {
      turn.busted = false;
      turn.phase = "set_aside";
    }

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: detected,
      is_busted: busted,
      is_dice_rush: false,
    };
  }

  /**
   * Player sets aside a combination (or chosen-element solo die).
   * Checks for Dice Rush.
   */
  async farkleSetAside(
    playerId: string,
    diceIndices: number[],
    oneForAllElement?: string,
  ): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { sessionId, battleState } = await this.getFarkleBattle(playerId);

    if (battleState.phase !== "player_turn" || !battleState.player_turn) {
      throw new BadRequestError("Not in player turn");
    }

    const turn = battleState.player_turn;

    if (diceIndices.length === 0) {
      throw new BadRequestError("Must select at least one die to set aside");
    }

    const selectedDice = diceIndices.map((i) => turn.dice[i]).filter(Boolean);
    if (selectedDice.length !== diceIndices.length) {
      throw new BadRequestError("Invalid dice indices");
    }
    // Validate: either selected dice form a valid combination OR all selected are the chosen element
    const activeDice = turn.dice.map((d, i) => ({
      ...d,
      is_set_aside: turn.dice[i].is_set_aside || diceIndices.includes(i),
    }));
    const combos = detectCombinations(
      activeDice,
    );

    const isValidCombo = combos.some((c) =>
      diceIndices.every((i) => c.dice_indices.includes(i)) ||
      c.dice_indices.every((ci) => diceIndices.includes(ci))
    );
    const isChosenElementSolo =
      battleState.set_aside_element !== null &&
      selectedDice.every(
        (d) => d.current_result === battleState.set_aside_element,
      );

    if (!isValidCombo && !isChosenElementSolo) {
      throw new BadRequestError(
        "Selected dice do not form a valid combination",
      );
    }

    if (turn.phase === "can_reroll" && !turn.has_used_reroll) {
      // Advancing from the first roll without reroll consumes reroll opportunity.
      turn.has_used_reroll = true;
    }

    // Mark dice as set aside
    diceIndices.forEach((i) => {
      if (turn.dice[i]) {
        turn.dice[i] = { ...turn.dice[i], is_set_aside: true };
      }
    });

    if (!(isChosenElementSolo && !isValidCombo)) {
      // Recalculate combinations from all set-aside dice
      const setAsideDice = turn.dice.filter((d) => d.is_set_aside);
      const allCombos = detectCombinations(setAsideDice);
      // Apply One-For-All override if specified
      if (oneForAllElement) {
        const oneForAll = allCombos.find((c) => c.type === "one_for_all");
        if (oneForAll) {
          oneForAll.bonuses = { [oneForAllElement]: 0.3 };
        }
      }
      turn.active_combinations = allCombos;
    }
    const currentSetAsideElements = collectSetAsideElements(turn.dice);
    const currentCombinationElements = collectCombinationElements(
      turn.active_combinations,
    );
    turn.accumulated_set_aside_elements = toElementSet([
      ...(turn.accumulated_set_aside_elements ?? []),
      ...currentSetAsideElements,
    ]);
    turn.accumulated_combination_elements = toElementSet([
      ...(turn.accumulated_combination_elements ?? []),
      ...currentCombinationElements,
    ]);

    const soloSetAsideCount = countSoloSetAsideElementDice(
      turn.dice,
      turn.active_combinations,
      battleState.set_aside_element,
    );
    turn.set_aside_element_bonus =
      soloSetAsideCount > 0 && battleState.set_aside_element
        ? battleState.set_aside_element
        : null;

    const diceRush = isDiceRush(turn.dice);
    turn.is_dice_rush = diceRush;

    if (diceRush) {
      const cycleBonuses = calculateSetAsideBonuses(
        turn.dice,
        turn.active_combinations,
        battleState.set_aside_element,
      );
      turn.accumulated_dice_rush_bonuses = mergeBonuses(
        turn.accumulated_dice_rush_bonuses ?? {},
        cycleBonuses,
      );

      // Dice Rush: reset all dice to unset-aside for the next roll
      turn.dice = turn.dice.map((d) => ({ ...d, is_set_aside: false }));
      turn.active_combinations = [];
      turn.set_aside_element_bonus = null;
      turn.phase = "initial_roll";
    } else {
      turn.phase = "rolling_remaining";
    }

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    const detectedRemaining = detectCombinations(turn.dice);

    return {
      battle_state: battleState,
      detected_combinations: detectedRemaining,
      is_busted: false,
      is_dice_rush: diceRush,
    };
  }

  /**
   * Player continues: rolls remaining (non-set-aside) dice.
   * If no combo found AND free reroll was used → bust.
   */
  async farkleContinue(playerId: string): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
  }> {
    const { sessionId, battleState } = await this.getFarkleBattle(playerId);

    if (battleState.phase !== "player_turn" || !battleState.player_turn) {
      throw new BadRequestError("Not in player turn");
    }

    const turn = battleState.player_turn;

    if (turn.phase !== "rolling_remaining" && turn.phase !== "initial_roll") {
      throw new BadRequestError("Cannot roll at this stage — set aside a combo first");
    }

    // Roll non-set-aside dice
    const updatedDice = rollFarkleDice(turn.dice);
    turn.dice = updatedDice;
    turn.phase = "set_aside";

    const detected = detectCombinations(updatedDice);

    // After first roll, reroll is no longer available; bust applies immediately.
    const busted = isBust(updatedDice, battleState.set_aside_element, true);

    if (busted) {
      turn.busted = true;
      turn.phase = "done";
      // Will be finalized in farkleEndTurn with zeroed bonuses
    }

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: detected,
      is_busted: busted,
      is_dice_rush: false,
    };
  }

  /**
   * Player ends their Farkle turn.
   * Commits bonuses, resolves hidden deployments, runs combat round.
   * Battle ends only when one party has no living elementals.
   */
  async farkleEndTurn(playerId: string): Promise<{
    battle_state: FarkleBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
    result?: NonNullable<BattleRollResult["result"]>;
  }> {
    const { battle, battleState, sessionId } = await this.getFarkleBattle(playerId);

    if (battleState.phase !== "player_turn") {
      throw new BadRequestError("Not in player turn");
    }

    const turn = battleState.player_turn;

    let turnBonuses: Partial<Record<ElementType, number>> = {};
    let playerDeployableElements: ElementType[] = [];
    let playerCombinationElements: ElementType[] = [];

    if (turn && !turn.busted) {
      turnBonuses = mergeBonuses(
        turnBonuses,
        turn.accumulated_dice_rush_bonuses ?? {},
      );
      const currentSetAsideBonuses = calculateSetAsideBonuses(
        turn.dice,
        turn.active_combinations,
        battleState.set_aside_element,
      );
      turnBonuses = mergeBonuses(turnBonuses, currentSetAsideBonuses);

      playerDeployableElements = toElementSet([
        ...(turn.accumulated_set_aside_elements ?? []),
        ...collectSetAsideElements(turn.dice),
      ]);
      playerCombinationElements = toElementSet([
        ...(turn.accumulated_combination_elements ?? []),
        ...collectCombinationElements(turn.active_combinations),
      ]);
    }

    battleState.player_bonuses_total = turnBonuses;
    battleState.player_party = applyBonusesToParty(
      battleState.player_party,
      turnBonuses,
    );

    const opponentEquippedDice = await this.getOpponentFarkleDice();
    const opponentSetAsideEl =
      (battleState.opponent_set_aside_element as ElementType) ?? "fire";
    const opponentResult = simulateOpponentTurn(opponentEquippedDice, opponentSetAsideEl);
    battleState.opponent_turn_result = opponentResult;

    battleState.opponent_bonuses_total =
      opponentResult.bonuses_applied as Partial<Record<ElementType, number>>;
    battleState.opponent_party = applyBonusesToParty(
      battleState.opponent_party,
      battleState.opponent_bonuses_total,
    );

    const playerDeploymentIndices = resolveDeploymentIndices(
      battleState.player_party,
      playerDeployableElements,
      playerCombinationElements,
    );
    const opponentDeploymentIndices = resolveDeploymentIndices(
      battleState.opponent_party,
      opponentResult.deployable_elements,
      opponentResult.combination_elements,
    );

    const playerPartyBeforeCombat = battleState.player_party.map((member) => ({ ...member }));
    const opponentPartyBeforeCombat = battleState.opponent_party.map((member) => ({ ...member }));

    const combatResult = simulateCombatRound(
      {
        round: battleState.current_turn,
        player_party: battleState.player_party,
        opponent_party: battleState.opponent_party,
      },
      {
        player: {
          deployed_indices: playerDeploymentIndices,
        },
        opponent: {
          deployed_indices: opponentDeploymentIndices,
        },
      },
      10,
    );

    battleState.player_party = combatResult.player_party;
    battleState.opponent_party = combatResult.opponent_party;
    battleState.combat_log = [
      ...(battleState.combat_log ?? []),
      ...buildBattleRoundLog({
        round: battleState.current_turn,
        playerPartyBeforeCombat,
        opponentPartyBeforeCombat,
        playerDeployedIndices: playerDeploymentIndices,
        opponentDeployedIndices: opponentDeploymentIndices,
        playerBonuses: battleState.player_bonuses_total,
        opponentBonuses: battleState.opponent_bonuses_total,
        attackLog: combatResult.log,
      }),
    ];
    battleState.last_player_deployment = playerDeploymentIndices;
    battleState.last_opponent_deployment = opponentDeploymentIndices;

    battleState.player_turns_done += 1;
    battleState.opponent_turns_done += 1;
    battleState.player_turn = null;

    const playerAlive = hasLivingElementals(battleState.player_party);
    const opponentAlive = hasLivingElementals(battleState.opponent_party);
    const isResolved = !playerAlive || !opponentAlive;

    let result: NonNullable<BattleRollResult["result"]> | undefined;

    if (isResolved) {
      battleState.phase = "resolved";

      const playerTotal = calculateTotalPower(battleState.player_party);
      const opponentTotal = calculateTotalPower(battleState.opponent_party);

      let winner: "player" | "opponent" | "draw";
      if (playerAlive && !opponentAlive) winner = "player";
      else if (!playerAlive && opponentAlive) winner = "opponent";
      else winner = "draw";

      battleState.winner = winner;
      battleState.player_total_attack = playerTotal;
      battleState.opponent_total_attack = opponentTotal;
      battleState.combat_log = appendBattleEndedLog(
        battleState.combat_log,
        battleState.current_turn,
        winner,
        playerTotal,
        opponentTotal,
      );

      const victory = winner === "player" || winner === "draw";
      result = await this.resolveBattleOutcome(
        playerId,
        battle.id,
        victory,
        playerTotal,
        opponentTotal,
        battle.opponent_name,
        battle.opponent_power_level,
      );
      await this.farkleSessionRepo.resolveSession(sessionId);
    } else {
      battleState.current_turn += 1;
      battleState.phase = "player_turn";
    }

    await this.farkleSessionRepo.updateState(sessionId, {
      meta: { battle_state: battleState },
    });

    return {
      battle_state: battleState,
      detected_combinations: [],
      is_busted: turn?.busted ?? false,
      is_dice_rush: false,
      is_resolved: isResolved,
      result,
    };
  }

  /**
   * Generate 5 generic FarkleDie objects for the opponent AI
   * (uses all-element faces to represent a balanced opponent).
   */
  private async getOpponentFarkleDice(): Promise<FarkleDie[]> {
    const elements: ElementType[] = ["fire", "water", "earth", "air", "lightning"];
    return Array.from({ length: 5 }, (_, i) => ({
      player_dice_id: `opponent-${i}`,
      dice_type_id: `opponent-${i}`,
      dice_notation: "d6",
      faces: elements,
      current_result: elements[0],
      is_set_aside: false,
    }));
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
      reward = calculatePvPReward(opponentPowerLevel);
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
      player_total_attack: playerPower,
      opponent_total_attack: opponentPower,
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
    locale: Locale = "en",
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
      "faces",
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
        faces: die.faces,
      }),
    );

    const data: MerchantData = {
      available_items: availableItems,
      available_dice: availableDice,
    };

    return {
      response: {
        event_type: "merchant",
        description: t(locale, "event.description.merchant"),
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
  async getCurrentEvent(playerId: string, locale: Locale = "en"): Promise<EventResponse | null> {
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
          event_id: wildEncounter.id as any,
          elemental_id: elemental.id,
          elemental_name: elemental.name,
          elemental_level: elemental.level,
          encounter_element: (elemental.element_types?.[0] ?? "fire") as any,
          capture_difficulty: captureDifficulty,
          farkle_initialized: false,
        };
        const farkleSession = await this.farkleSessionRepo.findSessionByEvent(
          "wild_encounter",
          wildEncounter.id,
        );
        if (farkleSession) {
          (data as any).set_aside_element = farkleSession.set_aside_element;
          const sessionState = await this.farkleSessionRepo.getState(farkleSession.id);
          if (sessionState) {
            (data as any).farkle_state = this.mapStateRowToWildFarkleState(sessionState);
            (data as any).wild_battle_state = sessionState.meta?.wild_battle_state;
          }
          (data as any).farkle_initialized = true;
          (data as any).farkle_session_id = farkleSession.id;
        }

        return {
          event_type: "wild_encounter",
          description: t(locale, "event.description.wild.battle_flow", {
            name: elemental.name,
          }),
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

        const potentialReward = calculatePvPReward(battle.opponent_power_level);

        const data: PvPData = {
          event_id: battle.id as any,
          opponent_name: battle.opponent_name,
          opponent_power_level: battle.opponent_power_level,
          potential_reward: potentialReward,
          opponent_party: battle.opponent_party_data?.opponent_party ?? [],
          player_party:
            battle.opponent_party_data?.seed_battle_state?.player_party ?? [],
          battle_state: battle.opponent_party_data?.seed_battle_state,
          farkle_initialized: false,
        };
        const farkleSession = await this.farkleSessionRepo.findSessionByEvent(
          "pvp_battle",
          battle.id,
        );
        if (farkleSession) {
          const sessionState = await this.farkleSessionRepo.getState(farkleSession.id);
          if (sessionState?.meta?.battle_state) {
            (data as any).battle_state = sessionState.meta.battle_state;
          }
          (data as any).farkle_initialized = true;
          (data as any).farkle_session_id = farkleSession.id;
        }

        return {
          event_type: "pvp_battle",
          description: t(locale, "event.description.pvp.challenge", {
            opponentName: battle.opponent_name,
            reward: potentialReward,
          }),
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

        const inventory: any[] = await db("merchant_inventory")
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
            "dice_types.faces as dice_faces",
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
            faces: item.dice_faces ?? [],
          }));

        const data: MerchantData = {
          available_items: availableItems,
          available_dice: availableDice,
        };

        return {
          event_type: "merchant",
          description: t(locale, "event.description.merchant"),
          data,
        };
      }
      default:
        throw new BadRequestError("Unknown event type");
    }
  }

  private async getWildEncounterForFarkle(playerId: string): Promise<{
    wildEncounter: NonNullable<
      Awaited<ReturnType<WildEncounterEventRepository["findById"]>>
    >;
    elemental: any;
    targetElement: ElementType;
    farkleState: WildEncounterFarkleState;
    wildBattleState: WildBattleState;
    sessionId: string;
  }> {
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
    if (!elemental) {
      throw new NotFoundError("Elemental");
    }

    const encounteredElement = (elemental.element_types?.[0] ?? "fire") as ElementType;
    const session = await this.farkleSessionRepo.findSessionByEvent(
      "wild_encounter",
      wildEncounter.id,
    );
    if (!session) {
      throw new BadRequestError("Farkle session is not initialized");
    }
    const state = await this.farkleSessionRepo.getState(session.id);
    if (!state) {
      throw new BadRequestError("Farkle state is not initialized");
    }
    const wildBattleState = state.meta?.wild_battle_state as WildBattleState | undefined;
    if (!wildBattleState) {
      throw new BadRequestError("Wild battle state is not initialized");
    }

    const setAsideElement = (session.set_aside_element ??
      encounteredElement) as ElementType;

    return {
      wildEncounter,
      elemental,
      targetElement: setAsideElement,
      wildBattleState,
      sessionId: session.id,
      farkleState: this.mapStateRowToWildFarkleState(state),
    };
  }

  async farkleV4InitWildEncounter(
    playerId: string,
    eventId: string,
  ): Promise<{
    farkle_session_id: string;
    event_type: "wild_encounter";
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
  }> {
    const currentEvent = await this.repository.getCurrentEvent(playerId);
    if (!currentEvent || currentEvent.event_type !== "wild_encounter") {
      throw new BadRequestError("No active wild encounter event");
    }
    if (!currentEvent.wild_encounter_id || currentEvent.wild_encounter_id !== eventId) {
      throw new BadRequestError("Wild encounter id does not match active event");
    }

    const existingSession = await this.farkleSessionRepo.findSessionByEvent(
      "wild_encounter",
      eventId,
    );
    if (existingSession) {
      const existingState = await this.farkleSessionRepo.getState(existingSession.id);
      if (!existingState) {
        throw new BadRequestError("Wild encounter state is not initialized");
      }
      return {
        farkle_session_id: existingSession.id,
        event_type: "wild_encounter",
        farkle_state: this.mapStateRowToWildFarkleState(existingState),
        wild_battle_state: existingState.meta?.wild_battle_state as WildBattleState,
      };
    }

    const wildEncounter = await this.wildEncounterRepo.findById(eventId);
    if (!wildEncounter || wildEncounter.player_id !== playerId) {
      throw new NotFoundError("Wild encounter event");
    }
    const [elemental] = await db("elementals").where({ id: wildEncounter.elemental_id }).limit(1);
    if (!elemental) {
      throw new NotFoundError("Elemental");
    }
    const wildBattleState = await this.buildInitialWildBattleState(playerId, elemental as any);
    const initial = this.createInitialWildEncounterFarkleState();
    const createdSession = await this.farkleSessionRepo.createSession({
      player_id: playerId,
      event_type: "wild_encounter",
      event_id: eventId,
      set_aside_element: wildBattleState.player_party[0]?.element as ElementType | undefined,
    });
    await this.farkleSessionRepo.createState(createdSession.id, {
      phase: initial.phase,
      has_used_reroll: false,
      set_aside_element_bonus: null,
      is_dice_rush: initial.is_dice_rush,
      busted: initial.busted,
      dice_state: initial.dice,
      active_combinations: initial.active_combinations as any[],
      detected_combinations: initial.detected_combinations as any[],
      meta: { wild_battle_state: wildBattleState },
    });

    return {
      farkle_session_id: createdSession.id,
      event_type: "wild_encounter",
      farkle_state: initial,
      wild_battle_state: wildBattleState,
    };
  }

  async farkleV4RollWildEncounter(
    playerId: string,
    farkleSessionId: string,
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "wild_encounter") {
      throw new BadRequestError("V4 roll is only available for wild encounters");
    }

    const { sessionId, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active encounter");
    }

    const turn = farkleState as unknown as FarkleV4TurnState;
    if (turn.dice.length === 0) {
      Object.assign(turn, buildInitialV4TurnState(await this.getEquippedV4Dice(playerId)));
    } else {
      const remainingDice = turn.dice.filter((die) => !die.is_set_aside);
      if (remainingDice.length === 0) {
        throw new BadRequestError("No remaining dice to roll");
      }
    }

    turn.dice = rollRemainingDice(turn.dice);
    for (const die of turn.dice) {
      if (!die.is_set_aside) {
        await this.diceRollService.performRoll({
          player_id: playerId,
          dice_type_id: die.dice_type_id,
          context: "farkle_battle",
        });
      }
    }

    turn.phase = "set_aside";
    turn.active_combinations = detectV4Combinations(turn.dice) as any;
    validateDeployAllPossible(wildBattleState.player_party, turn);

    await this.saveWildFarkleState(sessionId, farkleState, {
      wild_battle_state: wildBattleState,
    });

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
      is_resolved: false,
    };
  }

  async farkleV4SetAsideWildEncounter(
    playerId: string,
    farkleSessionId: string,
    diceIndices: number[],
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "wild_encounter") {
      throw new BadRequestError("V4 set-aside is only available for wild encounters");
    }

    const { sessionId, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active encounter");
    }

    const turn = farkleState as unknown as FarkleV4TurnState;
    if (diceIndices.length === 0) {
      throw new BadRequestError("Must select at least one die");
    }

    for (const dieIndex of diceIndices) {
      const die = turn.dice[dieIndex];
      if (!die) {
        throw new BadRequestError("Invalid die index");
      }
      if (die.is_set_aside) {
        throw new BadRequestError("Die is already set aside");
      }
      turn.dice[dieIndex] = {
        ...die,
        is_set_aside: true,
      };
    }

    turn.active_combinations = detectV4Combinations(turn.dice) as any;
    validateDeployAllPossible(wildBattleState.player_party, turn);
    turn.phase = turn.can_commit ? "ready_to_commit" : "rolling_remaining";

    await this.saveWildFarkleState(sessionId, farkleState, {
      wild_battle_state: wildBattleState,
    });

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
      is_resolved: false,
    };
  }

  async farkleV4AssignWildEncounter(
    playerId: string,
    farkleSessionId: string,
    dieIndex: number,
    partyIndex: number,
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "wild_encounter") {
      throw new BadRequestError("V4 assign is only available for wild encounters");
    }

    const { sessionId, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active encounter");
    }

    const turn = farkleState as unknown as FarkleV4TurnState;
    const die = turn.dice[dieIndex];
    if (!die) {
      throw new BadRequestError("Invalid die index");
    }
    if (die.is_assigned) {
      throw new BadRequestError("Die is already assigned");
    }

    const member = wildBattleState.player_party[partyIndex];
    if (!member) {
      throw new BadRequestError("Invalid party index");
    }
    if (member.is_destroyed || member.current_health <= 0) {
      throw new BadRequestError("Cannot assign to destroyed elemental");
    }

    const alreadyAssigned = turn.dice.some((d) => d.assigned_to_party_index === partyIndex);
    if (alreadyAssigned) {
      throw new BadRequestError("Elemental already has an assigned die this turn");
    }

    turn.dice[dieIndex] = {
      ...die,
      is_set_aside: true,
      is_assigned: true,
      assigned_to_party_index: partyIndex,
    };

    turn.active_combinations = detectV4Combinations(turn.dice) as any;
    validateDeployAllPossible(wildBattleState.player_party, turn);
    turn.phase = turn.can_commit ? "ready_to_commit" : "rolling_remaining";

    await this.saveWildFarkleState(sessionId, farkleState, {
      wild_battle_state: wildBattleState,
    });

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
      is_resolved: false,
    };
  }

  async farkleV4CommitWildEncounter(
    playerId: string,
    farkleSessionId: string,
    _itemId?: string,
    locale: Locale = "en",
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
    result: WildEncounterResult;
  }> {
    const { eventType } = await this.validateSessionOwnership(playerId, farkleSessionId);
    if (eventType !== "wild_encounter") {
      throw new BadRequestError("V4 commit is only available for wild encounters");
    }

    const { sessionId, wildEncounter, elemental, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);
    if (sessionId !== farkleSessionId) {
      throw new BadRequestError("Invalid session id for active encounter");
    }

    const turn = farkleState as unknown as FarkleV4TurnState;
    const deployValidation = validateDeployAllPossible(wildBattleState.player_party, turn);
    if (!deployValidation.can_commit) {
      throw new BadRequestError("You must deploy all possible alive elementals before commit");
    }

    const playerApplied = applyV4CommitBonuses(wildBattleState.player_party, turn);
    wildBattleState.player_party = playerApplied.updated_party;

    const opponentAliveIndices = wildBattleState.enemy_party
      .map((member, index) => ({ member, index }))
      .filter(({ member }) => !member.is_destroyed && member.current_health > 0)
      .map(({ index }) => index);

    const opponentDice: FarkleV4Die[] = Array.from({ length: 5 }, (_, index) => ({
      player_dice_id: `wild-opponent-${index}`,
      dice_type_id: `wild-opponent-${index}`,
      dice_notation: "d6",
      faces: ["fire", "water", "earth", "air", "lightning"],
      current_result: "fire",
      is_set_aside: false,
      is_assigned: false,
      assigned_to_party_index: null,
    }));
    const rolledOpponentDice = rollRemainingDice(opponentDice);
    const assignable = Math.min(opponentAliveIndices.length, rolledOpponentDice.length);
    for (let i = 0; i < assignable; i += 1) {
      rolledOpponentDice[i] = {
        ...rolledOpponentDice[i],
        is_set_aside: true,
        is_assigned: true,
        assigned_to_party_index: opponentAliveIndices[i],
      };
    }
    const opponentTurn: FarkleV4TurnState = {
      ...buildInitialV4TurnState(rolledOpponentDice),
      phase: "ready_to_commit",
      active_combinations: detectV4Combinations(rolledOpponentDice),
    };
    const opponentApplied = applyV4CommitBonuses(
      wildBattleState.enemy_party,
      opponentTurn,
    );
    wildBattleState.enemy_party = opponentApplied.updated_party;

    const combatResult = simulateV4CombatRound(
      {
        round: wildBattleState.round,
        player_party: wildBattleState.player_party,
        opponent_party: wildBattleState.enemy_party,
      },
      {
        player_deployed_indices: playerApplied.deployed_indices,
        opponent_deployed_indices: opponentApplied.deployed_indices,
      },
    );

    wildBattleState.player_party = combatResult.player_party;
    wildBattleState.enemy_party = combatResult.opponent_party;
    wildBattleState.combat_log = [
      ...wildBattleState.combat_log,
      ...combatResult.log,
    ];
    wildBattleState.round += 1;

    let elementalCaught:
      | {
          id: string;
          name: string;
          level: number;
        }
      | undefined;

    const success = !hasLivingElementals(wildBattleState.enemy_party);
    const failed = !hasLivingElementals(wildBattleState.player_party);

    if (success) {
      const elementalCount = (await db("player_elementals")
        .where({ player_id: playerId })
        .count("* as count")
        .first()) as { count: string | number } | undefined;

      if (elementalCount && Number(elementalCount.count) >= 15) {
        throw new BadRequestError("Maximum elemental capacity reached (15)");
      }

      const [playerElemental] = await db("player_elementals")
        .insert({
          player_id: playerId,
          elemental_id: elemental.id,
          current_stats: elemental.base_stats,
          is_in_active_party: false,
          party_position: null,
        })
        .returning("*");

      elementalCaught = {
        id: playerElemental.id,
        name: elemental.name,
        level: elemental.level,
      };

      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "victory",
        captured_player_elemental_id: playerElemental.id,
        resolved_at: new Date(),
      });

      await db("player_progress")
        .where({ player_id: playerId })
        .increment("successful_captures", 1)
        .increment("total_elementals_owned", 1);

      const previousCaptures = (await db("player_elementals")
        .where({ player_id: playerId, elemental_id: elemental.id })
        .count("* as count")
        .first()) as { count: string | number } | undefined;

      if (previousCaptures && Number(previousCaptures.count) === 1) {
        await db("player_progress")
          .where({ player_id: playerId })
          .increment("unique_elementals_collected", 1);
      }
    } else if (failed) {
      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "defeat",
        resolved_at: new Date(),
      });
    }

    const isResolved = success || failed;
    if (isResolved) {
      await this.repository.clearCurrentEvent(playerId);
      await this.farkleSessionRepo.resolveSession(sessionId);
      farkleState.phase = "resolved";
      farkleState.detected_combinations = [];
    } else {
      const nextState = this.createInitialWildEncounterFarkleState();
      Object.assign(farkleState, nextState);
    }

    await this.saveWildFarkleState(sessionId, farkleState, {
      wild_battle_state: wildBattleState,
    });

    const result: WildEncounterResult = isResolved
      ? {
          success,
          message: success
            ? `You captured ${elemental.name}.`
            : `${elemental.name} escaped after the battle.`,
          elemental_caught: elementalCaught,
          can_continue: true,
        }
      : {
          success: false,
          message: "Battle continues. Roll again.",
          can_continue: false,
        };

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: isResolved
        ? []
        : this.getV4DetectedCombinationsForResponse(turn),
      is_busted: false,
      is_dice_rush: false,
      is_resolved: isResolved,
      result,
    };
  }

  async wildEncounterFarkleInitialRoll(playerId: string): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { sessionId, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);

    if (farkleState.phase !== "initial_roll") {
      throw new BadRequestError("Already rolled. Continue the current turn.");
    }

    const equippedDice = await db("player_dice")
      .where({ player_id: playerId, is_equipped: true })
      .leftJoin("dice_types", "player_dice.dice_type_id", "dice_types.id")
      .select(
        "player_dice.id as player_dice_id",
        "player_dice.dice_type_id",
        "dice_types.dice_notation",
        "dice_types.faces",
      )
      .limit(5);

    if (equippedDice.length === 0) {
      throw new BadRequestError(
        "No dice equipped. Please equip dice before attempting a capture.",
      );
    }

    const farkleDice: FarkleDie[] = equippedDice.map((d: any) => ({
      player_dice_id: d.player_dice_id,
      dice_type_id: d.dice_type_id,
      dice_notation: d.dice_notation ?? "d6",
      faces: Array.isArray(d.faces) ? d.faces : JSON.parse(d.faces ?? "[]"),
      current_result: "fire" as ElementType,
      is_set_aside: false,
    }));

    const rolledDice = rollFarkleDice(farkleDice);

    for (const die of rolledDice) {
      await this.diceRollService.performRoll({
        player_id: playerId,
        dice_type_id: die.dice_type_id,
        context: "farkle_battle",
      });
    }

    const detected = detectCombinations(rolledDice);

    farkleState.phase = "can_reroll";
    farkleState.dice = rolledDice;
    farkleState.has_used_reroll = false;
    farkleState.active_combinations = [];
    farkleState.set_aside_element_bonus = null;
    farkleState.is_dice_rush = false;
    farkleState.busted = false;
    farkleState.detected_combinations = detected;

    await this.saveWildFarkleState(sessionId, farkleState);

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: detected,
      is_busted: false,
      is_dice_rush: false,
      is_resolved: false,
    };
  }

  async wildEncounterFarkleReroll(
    playerId: string,
    diceIndicesToReroll: number[],
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { sessionId, targetElement, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);

    if (farkleState.phase !== "can_reroll") {
      throw new BadRequestError("Cannot reroll at this stage");
    }
    if (farkleState.has_used_reroll) {
      throw new BadRequestError("Free reroll already used");
    }
    if (diceIndicesToReroll.length === 0 || diceIndicesToReroll.length > 5) {
      throw new BadRequestError("Must reroll between 1 and 5 dice");
    }

    const indexSet = new Set(diceIndicesToReroll);
    const updatedDice = farkleState.dice.map((die, i) => {
      if (indexSet.has(i) && !die.is_set_aside) {
        const randomFace = die.faces[Math.floor(Math.random() * die.faces.length)];
        return { ...die, current_result: randomFace };
      }
      return die;
    });

    const detected = detectCombinations(updatedDice);
    const busted = isBust(updatedDice, targetElement, true);

    farkleState.dice = updatedDice;
    farkleState.has_used_reroll = true;
    farkleState.phase = busted ? "done" : "set_aside";
    farkleState.busted = busted;
    farkleState.detected_combinations = detected;

    await this.saveWildFarkleState(sessionId, farkleState);

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: detected,
      is_busted: busted,
      is_dice_rush: false,
      is_resolved: false,
    };
  }

  async wildEncounterFarkleSetAside(
    playerId: string,
    diceIndices: number[],
    oneForAllElement?: string,
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { sessionId, targetElement, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);

    if (
      farkleState.phase !== "can_reroll" &&
      farkleState.phase !== "set_aside" &&
      farkleState.phase !== "rolling_remaining"
    ) {
      throw new BadRequestError("Cannot set aside dice at this stage");
    }

    if (diceIndices.length === 0) {
      throw new BadRequestError("Must select at least one die to set aside");
    }

    const selectedDice = diceIndices.map((i) => farkleState.dice[i]).filter(Boolean);

    if (selectedDice.length !== diceIndices.length) {
      throw new BadRequestError("Invalid dice selection");
    }

    const selectedCombos = detectCombinations(
      selectedDice.map((d) => ({ ...d, is_set_aside: true })),
    );
    const isValidCombo = selectedCombos.length > 0;
    const isTargetElementSolo = selectedDice.every(
      (d) => d.current_result === targetElement,
    );

    if (!isValidCombo && !isTargetElementSolo) {
      throw new BadRequestError(
        "Selected dice must form a valid combination or match your chosen set-aside element",
      );
    }

    diceIndices.forEach((i) => {
      if (farkleState.dice[i]) {
        farkleState.dice[i] = { ...farkleState.dice[i], is_set_aside: true };
      }
    });

    if (farkleState.phase === "can_reroll" && !farkleState.has_used_reroll) {
      // Advancing from the first roll without reroll consumes reroll opportunity.
      farkleState.has_used_reroll = true;
    }

    if (!(isTargetElementSolo && !isValidCombo)) {
      const setAsideDice = farkleState.dice.filter((d) => d.is_set_aside);
      const allCombos = detectCombinations(setAsideDice);
      if (oneForAllElement) {
        const oneForAll = allCombos.find((c) => c.type === "one_for_all");
        if (oneForAll) {
          oneForAll.bonuses = { [oneForAllElement]: 0.3 };
        }
      }
      farkleState.active_combinations = allCombos;
    }
    const soloSetAsideCount = countSoloSetAsideElementDice(
      farkleState.dice,
      farkleState.active_combinations as Combination[],
      targetElement,
    );
    farkleState.set_aside_element_bonus =
      soloSetAsideCount > 0 ? targetElement : null;

    // Dice Rush is intentionally disabled for wild encounters.
    const diceRush = false;
    farkleState.is_dice_rush = false;
    farkleState.phase = "rolling_remaining";
    farkleState.detected_combinations = detectCombinations(farkleState.dice);

    await this.saveWildFarkleState(sessionId, farkleState);

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: farkleState.detected_combinations as Combination[],
      is_busted: false,
      is_dice_rush: diceRush,
      is_resolved: false,
    };
  }

  async wildEncounterFarkleContinue(playerId: string): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
  }> {
    const { sessionId, targetElement, farkleState, wildBattleState } =
      await this.getWildEncounterForFarkle(playerId);

    if (farkleState.phase !== "rolling_remaining") {
      throw new BadRequestError("Cannot roll at this stage");
    }

    const updatedDice = rollFarkleDice(farkleState.dice);
    const detected = detectCombinations(updatedDice);
    const busted = isBust(updatedDice, targetElement, true);

    farkleState.dice = updatedDice;
    farkleState.phase = busted ? "done" : "set_aside";
    farkleState.busted = busted;
    farkleState.detected_combinations = detected;

    await this.saveWildFarkleState(sessionId, farkleState);

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: detected,
      is_busted: busted,
      is_dice_rush: false,
      is_resolved: false,
    };
  }

  async wildEncounterFarkleEndTurn(
    playerId: string,
    _itemId?: string,
    locale: Locale = "en",
  ): Promise<{
    farkle_state: WildEncounterFarkleState;
    wild_battle_state: WildBattleState;
    detected_combinations: Combination[];
    is_busted: boolean;
    is_dice_rush: boolean;
    is_resolved: boolean;
    result: WildEncounterResult;
  }> {
    const {
      sessionId,
      wildEncounter,
      elemental,
      targetElement,
      farkleState,
      wildBattleState,
    } =
      await this.getWildEncounterForFarkle(playerId);

    if (farkleState.phase === "initial_roll") {
      throw new BadRequestError("Roll dice before ending the encounter");
    }

    let turnBonuses: Partial<Record<ElementType, number>> = {};
    let deployableElements: ElementType[] = [];
    let combinationElements: ElementType[] = [];

    if (!farkleState.busted) {
      const currentSetAsideBonuses = calculateSetAsideBonuses(
        farkleState.dice,
        farkleState.active_combinations as Combination[],
        targetElement,
      );
      turnBonuses = mergeBonuses(turnBonuses, currentSetAsideBonuses);
      deployableElements = collectSetAsideElements(farkleState.dice);
      combinationElements = collectCombinationElements(
        farkleState.active_combinations as Combination[],
      );
    }

    const buffedPlayerParty = applyBonusesToParty(
      wildBattleState.player_party,
      turnBonuses,
    );
    const playerDeployment = resolveDeploymentIndices(
      buffedPlayerParty,
      deployableElements,
      combinationElements,
    );
    const enemyDeployment = wildBattleState.enemy_party
      .map((member, index) =>
        !member.is_destroyed && member.current_health > 0 ? index : -1,
      )
      .filter((idx) => idx >= 0);

    const combatResult = simulateCombatRound(
      {
        round: wildBattleState.round,
        player_party: buffedPlayerParty,
        opponent_party: wildBattleState.enemy_party,
      },
      {
        player: {
          deployed_indices: playerDeployment,
        },
        opponent: {
          deployed_indices: enemyDeployment,
        },
      },
      10,
    );

    wildBattleState.player_party = combatResult.player_party;
    wildBattleState.enemy_party = combatResult.opponent_party;
    wildBattleState.combat_log = [
      ...wildBattleState.combat_log,
      ...combatResult.log,
    ];
    wildBattleState.round += 1;

    let elementalCaught:
      | {
          id: string;
          name: string;
          level: number;
        }
      | undefined;

    const success = !hasLivingElementals(wildBattleState.enemy_party);
    const failed = !hasLivingElementals(wildBattleState.player_party);

    if (success) {
      const elementalCount = (await db("player_elementals")
        .where({ player_id: playerId })
        .count("* as count")
        .first()) as { count: string | number } | undefined;

      if (elementalCount && Number(elementalCount.count) >= 15) {
        throw new BadRequestError("Maximum elemental capacity reached (15)");
      }

      const [playerElemental] = await db("player_elementals")
        .insert({
          player_id: playerId,
          elemental_id: elemental.id,
          current_stats: elemental.base_stats,
          is_in_active_party: false,
          party_position: null,
        })
        .returning("*");

      elementalCaught = {
        id: playerElemental.id,
        name: elemental.name,
        level: elemental.level,
      };

      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "victory",
        captured_player_elemental_id: playerElemental.id,
        resolved_at: new Date(),
      });

      await db("player_progress")
        .where({ player_id: playerId })
        .increment("successful_captures", 1)
        .increment("total_elementals_owned", 1);

      const previousCaptures = (await db("player_elementals")
        .where({ player_id: playerId, elemental_id: elemental.id })
        .count("* as count")
        .first()) as { count: string | number } | undefined;

      if (previousCaptures && Number(previousCaptures.count) === 1) {
        await db("player_progress")
          .where({ player_id: playerId })
          .increment("unique_elementals_collected", 1);
      }
    } else if (failed) {
      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "defeat",
        resolved_at: new Date(),
      });
    }

    const isResolved = success || failed;
    if (isResolved) {
      await this.repository.clearCurrentEvent(playerId);
      await this.farkleSessionRepo.resolveSession(sessionId);
      farkleState.phase = "resolved";
      farkleState.detected_combinations = [];
    } else {
      // Start next turn loop.
      farkleState.phase = "initial_roll";
      farkleState.dice = [];
      farkleState.has_used_reroll = false;
      farkleState.active_combinations = [];
      farkleState.set_aside_element_bonus = null;
      farkleState.is_dice_rush = false;
      farkleState.busted = false;
      farkleState.detected_combinations = [];
    }

    await this.saveWildFarkleState(sessionId, farkleState, {
      wild_battle_state: wildBattleState,
    });

    const result: WildEncounterResult = isResolved
      ? {
          success,
          message: success
            ? t(locale, "event.result.capture.success", { name: elemental.name })
            : t(locale, "event.result.capture.failed", { name: elemental.name }),
          elemental_caught: elementalCaught,
          can_continue: true,
        }
      : {
          success: false,
          message: t(locale, "event.result.capture.continues"),
          can_continue: false,
        };

    return {
      farkle_state: farkleState,
      wild_battle_state: wildBattleState,
      detected_combinations: [],
      is_busted: farkleState.busted,
      is_dice_rush: false,
      is_resolved: isResolved,
      result,
    };
  }

  /**
   * Resolve a wild encounter event
   */
  async resolveWildEncounter(
    data: ResolveWildEncounterData,
    locale: Locale = "en",
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

    const elementalCount = (await db("player_elementals")
      .where({ player_id: data.player_id })
      .count("* as count")
      .first()) as { count: string | number } | undefined;

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

    // Capture logic: if dice result_element matches the wild elemental's element → success
    // Capture bonus from items makes it easier (any element succeeds with high enough bonus)
    const resultElement = diceRoll.result_element;
    const wildElement = elemental.element_types?.[0] ?? "fire";

    let success = false;
    if (resultElement === wildElement) {
      success = true;
    } else if (captureBonus >= 5) {
      // High capture bonus allows capture regardless of element
      success = true;
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
          party_position: null,
        })
        .returning("*");

      elementalCaught = {
        id: playerElemental.id,
        name: elemental.name,
        level: elemental.level,
      };

      message = t(locale, "event.result.capture.success", { name: elemental.name });

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

      const previousCaptures = (await db("player_elementals")
        .where({ player_id: data.player_id, elemental_id: elemental.id })
        .count("* as count")
        .first()) as { count: string | number } | undefined;

      if (previousCaptures && Number(previousCaptures.count) === 1) {
        await db("player_progress")
          .where({ player_id: data.player_id })
          .increment("unique_elementals_collected", 1);
      }
    } else {
      message = t(locale, "event.result.capture.failed_escape", { name: elemental.name });

      await this.wildEncounterRepo.updateResolution(wildEncounter.id, {
        status: "completed",
        outcome: "defeat",
        dice_roll_id: data.dice_roll_id,
        item_used_id: data.item_id,
        resolved_at: new Date(),
      });
    }

    await this.repository.clearCurrentEvent(data.player_id);
    const session = await this.farkleSessionRepo.findSessionByEvent(
      "wild_encounter",
      wildEncounter.id,
    );
    if (session) {
      await this.farkleSessionRepo.resolveSession(session.id);
    }

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
  async skipWildEncounter(
    playerId: string,
    locale: Locale = "en",
  ): Promise<SkipWildEncounterResult> {
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
      outcome: "draw",
      resolved_at: new Date(),
    });

    await this.repository.clearCurrentEvent(playerId);
    const session = await this.farkleSessionRepo.findSessionByEvent(
      "wild_encounter",
      wildEncounter.id,
    );
    if (session) {
      await this.farkleSessionRepo.resolveSession(session.id);
    }

    return {
      message: t(locale, "event.result.skip_wild", {
        name: elemental?.name || "the elemental",
      }),
      can_continue: true,
    };
  }

  /**
   * Leave merchant event
   */
  async leaveMerchant(playerId: string, locale: Locale = "en"): Promise<LeaveMerchantResult> {
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
      message: t(locale, "event.result.leave_merchant"),
      can_continue: true,
    };
  }
}
