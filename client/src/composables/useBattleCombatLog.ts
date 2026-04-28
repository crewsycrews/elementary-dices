import { computed, type ComputedRef } from "vue";
import type { BattlePartyMember } from "@/stores/event";
import type { BattleLogEntry } from "@elementary-dices/shared";

type CombatLogEntry = {
  round: number;
  sequence?: number;
  type?: string;
  payload?: Record<string, unknown>;
  step: number;
  side: "player" | "opponent";
  attacker_index: number;
  attacker_name: string;
  attacker_element: string;
  target: "unit";
  defender_index?: number;
  defender_name?: string;
  defender_element?: string;
  damage: number;
  defender_remaining_health?: number;
  second_attack_lost?: boolean;
  dodged?: boolean;
  weakness_bonus_applied?: boolean;
  second_attack?: boolean;
};

export type BattleLogRoundGroup = {
  round: number;
  entries: BattleLogEntry[];
};

type Translate = (key: string, params?: Record<string, unknown>) => string;

type UseBattleCombatLogParams = {
  combatLog: ComputedRef<Array<Record<string, unknown>>>;
  battlePhase: ComputedRef<string | null>;
  currentTurn: ComputedRef<number>;
  playerParty: ComputedRef<BattlePartyMember[]>;
  opponentParty: ComputedRef<BattlePartyMember[]>;
  playerDeployment: ComputedRef<number[] | null>;
  opponentDeployment: ComputedRef<number[] | null>;
  opponentName: ComputedRef<string>;
  t: Translate;
  getElementEmoji: (element: string) => string;
};

export function useBattleCombatLog({
  combatLog,
  battlePhase,
  currentTurn,
  playerParty,
  opponentParty,
  playerDeployment,
  opponentDeployment,
  opponentName,
  t,
  getElementEmoji,
}: UseBattleCombatLogParams) {
  const battleLogEntries = computed<BattleLogEntry[]>(() => {
    const raw = combatLog.value as Array<Partial<BattleLogEntry & CombatLogEntry>>;
    return raw
      .map((entry): BattleLogEntry | null => {
        if (
          typeof entry.round === "number" &&
          typeof entry.sequence === "number" &&
          typeof entry.type === "string" &&
          typeof entry.payload === "object" &&
          entry.payload !== null
        ) {
          return entry as BattleLogEntry;
        }

        if (
          typeof entry.round === "number" &&
          typeof entry.step === "number" &&
          (entry.side === "player" || entry.side === "opponent") &&
          typeof entry.attacker_name === "string" &&
          typeof entry.attacker_element === "string" &&
          entry.target === "unit" &&
          typeof entry.damage === "number"
        ) {
          return {
            ...(entry as CombatLogEntry),
            sequence: entry.step,
            type: "attack_resolved",
            payload: {
              attacker_name: entry.attacker_name,
              defender_name: entry.defender_name,
              damage: entry.damage,
              defender_remaining_health: entry.defender_remaining_health,
            },
          } as BattleLogEntry;
        }

        return null;
      })
      .filter((entry): entry is BattleLogEntry => entry !== null)
      .sort((a, b) => a.round - b.round || a.sequence - b.sequence);
  });

  const combatLogEntries = computed<CombatLogEntry[]>(() => {
    const raw = combatLog.value as Array<Partial<CombatLogEntry>>;
    return raw
      .filter(
        (entry): entry is CombatLogEntry =>
          typeof entry.round === "number" &&
          typeof entry.step === "number" &&
          (entry.side === "player" || entry.side === "opponent") &&
          typeof entry.attacker_name === "string" &&
          typeof entry.attacker_element === "string" &&
          entry.target === "unit" &&
          typeof entry.damage === "number" &&
          (!entry.type || entry.type === "attack_resolved"),
      )
      .sort(
        (a, b) =>
          a.round - b.round ||
          (a.sequence ?? a.step) - (b.sequence ?? b.step) ||
          a.step - b.step,
      );
  });

  const groupedBattleLogEntries = computed<BattleLogRoundGroup[]>(() => {
    const groups = new Map<number, BattleLogEntry[]>();
    for (const entry of battleLogEntries.value) {
      groups.set(entry.round, [...(groups.get(entry.round) ?? []), entry]);
    }
    return [...groups.entries()].map(([round, entries]) => ({ round, entries }));
  });

  const lastResolvedRoundNumber = computed<number | null>(() => {
    if (combatLogEntries.value.length === 0) return null;
    const maxRound = Math.max(...combatLogEntries.value.map((entry) => entry.round));
    if (battlePhase.value === "resolved") return maxRound;
    const cappedRound = currentTurn.value - 1;
    if (cappedRound < 1) return null;
    const resolvedRounds = combatLogEntries.value
      .map((entry) => entry.round)
      .filter((round) => round <= cappedRound);
    return resolvedRounds.length > 0 ? Math.max(...resolvedRounds) : null;
  });

  const lastRoundLogs = computed(() => {
    if (!lastResolvedRoundNumber.value) return [] as CombatLogEntry[];
    return combatLogEntries.value.filter(
      (entry) => entry.round === lastResolvedRoundNumber.value,
    );
  });

  const lastRoundSummary = computed(() => {
    if (lastRoundLogs.value.length === 0 || !lastResolvedRoundNumber.value) {
      return null;
    }

    return {
      round: lastResolvedRoundNumber.value,
      firstAttacker: lastRoundLogs.value[0].side,
      playerDamageTaken: lastRoundLogs.value
        .filter((entry) => entry.side === "opponent" && entry.target === "unit")
        .reduce((sum, entry) => sum + entry.damage, 0),
      opponentDamageTaken: lastRoundLogs.value
        .filter((entry) => entry.side === "player" && entry.target === "unit")
        .reduce((sum, entry) => sum + entry.damage, 0),
      playerUnitsDestroyed: lastRoundLogs.value.filter(
        (entry) =>
          entry.side === "opponent" &&
          entry.target === "unit" &&
          entry.defender_remaining_health === 0,
      ).length,
      opponentUnitsDestroyed: lastRoundLogs.value.filter(
        (entry) =>
          entry.side === "player" &&
          entry.target === "unit" &&
          entry.defender_remaining_health === 0,
      ).length,
    };
  });

  const deployedPlayerNames = computed(() => {
    const indices = playerDeployment.value ?? [];
    if (indices.length === 0) return t("battle.none");
    return indices
      .map((idx) => playerParty.value[idx]?.name)
      .filter(Boolean)
      .join(", ");
  });

  const deployedOpponentNames = computed(() => {
    const indices = opponentDeployment.value ?? [];
    if (indices.length === 0) return t("battle.none");
    return indices
      .map((idx) => opponentParty.value[idx]?.name)
      .filter(Boolean)
      .join(", ");
  });

  const totalPlayerDamage = computed(() =>
    combatLogEntries.value
      .filter((entry) => entry.side === "opponent" && entry.target === "unit")
      .reduce((sum, entry) => sum + entry.damage, 0),
  );

  const totalOpponentDamage = computed(() =>
    combatLogEntries.value
      .filter((entry) => entry.side === "player" && entry.target === "unit")
      .reduce((sum, entry) => sum + entry.damage, 0),
  );

  const totalPlayerUnitsDestroyed = computed(
    () =>
      combatLogEntries.value.filter(
        (entry) =>
          entry.side === "opponent" &&
          entry.target === "unit" &&
          entry.defender_remaining_health === 0,
      ).length,
  );

  const totalOpponentUnitsDestroyed = computed(
    () =>
      combatLogEntries.value.filter(
        (entry) =>
          entry.side === "player" &&
          entry.target === "unit" &&
          entry.defender_remaining_health === 0,
      ).length,
  );

  const roundsResolved = computed(() => {
    const rounds = new Set(combatLogEntries.value.map((entry) => entry.round));
    return rounds.size;
  });

  function sideLabel(side?: "player" | "opponent"): string {
    if (side === "player") return t("battle.you");
    if (side === "opponent") return opponentName.value;
    return "";
  }

  function formatPercent(value: unknown): string {
    return typeof value === "number" ? `${Math.round(value * 100)}%` : "0%";
  }

  function bonusEffectLabel(element: string): string {
    const labels: Record<string, string> = {
      fire: t("battle.bonus_effect_damage"),
      earth: t("battle.bonus_effect_armor"),
      air: t("battle.bonus_effect_dodge"),
      lightning: t("battle.bonus_effect_double_attack"),
      water: t("battle.bonus_effect_heal"),
    };
    return labels[element] ?? t("battle.bonus_effect_attack");
  }

  function payloadString(
    payload: Record<string, unknown>,
    key: string,
    fallback: string,
  ): string {
    const value = payload[key];
    return typeof value === "string" ? value : fallback;
  }

  function payloadNumber(
    payload: Record<string, unknown>,
    key: string,
    fallback = 0,
  ): number {
    const value = payload[key];
    return typeof value === "number" ? value : fallback;
  }

  function formatElementList(value: unknown): string {
    if (!Array.isArray(value) || value.length === 0) return t("battle.none");
    return value
      .map((unit) => {
        if (!unit || typeof unit !== "object") return null;
        const candidate = unit as Record<string, unknown>;
        const name = typeof candidate.name === "string" ? candidate.name : null;
        const element = typeof candidate.element === "string" ? candidate.element : "";
        if (!name) return null;
        const appliedElements = Array.isArray(candidate.applied_elements)
          ? candidate.applied_elements
              .filter((applied): applied is string => typeof applied === "string")
              .map((applied) => getElementEmoji(applied))
          : [];
        const appliedLabel =
          appliedElements.length > 0 ? ` ← ${appliedElements.join(" ")}` : "";
        return `${name} (${getElementEmoji(element)})${appliedLabel}`;
      })
      .filter(Boolean)
      .join(", ");
  }

  function formatBattleLogEntry(entry: BattleLogEntry): string {
    switch (entry.type) {
      case "round_started":
        return t("battle.log_round_started", { round: entry.round });
      case "deployment_revealed":
        return t("battle.log_deployment", {
          side: sideLabel(entry.side),
          units: formatElementList(entry.payload.units),
        });
      case "bonus_applied":
        return t("battle.log_bonus_detail", {
          side: sideLabel(entry.side),
          element: getElementEmoji(String(entry.payload.element ?? "")),
          amount: formatPercent(entry.payload.amount),
          effect: bonusEffectLabel(String(entry.payload.element ?? "")),
        });
      case "unit_healed":
        return t("battle.log_healed", {
          side: sideLabel(entry.side),
          unit: payloadString(entry.payload, "unit_name", t("battle.unknown_unit")),
          element: getElementEmoji(payloadString(entry.payload, "unit_element", "")),
          amount: payloadNumber(entry.payload, "amount"),
          before: payloadNumber(entry.payload, "health_before"),
          after: payloadNumber(entry.payload, "health_after"),
          max: payloadNumber(entry.payload, "max_health"),
        });
      case "initiative_decided":
        return t("battle.log_initiative", {
          side: sideLabel(entry.side),
        });
      case "attack_resolved": {
        if (entry.second_attack_lost) {
          return t("battle.log_second_attack_lost", {
            attacker: entry.attacker_name ?? t("battle.unknown_unit"),
          });
        }
        if (entry.dodged) {
          return t("battle.log_dodged", {
            attacker: entry.attacker_name ?? t("battle.unknown_unit"),
            defender: entry.defender_name ?? t("battle.unknown_unit"),
          });
        }
        return t("battle.log_attack", {
          attacker: entry.attacker_name ?? t("battle.unknown_unit"),
          attackerElement: getElementEmoji(entry.attacker_element ?? ""),
          defender: entry.defender_name ?? t("battle.unknown_unit"),
          defenderElement: getElementEmoji(entry.defender_element ?? ""),
          damage: entry.damage ?? 0,
          hp: entry.defender_remaining_health ?? 0,
          weakness: entry.weakness_bonus_applied ? t("battle.log_weakness") : "",
          second: entry.second_attack ? t("battle.log_second_attack") : "",
        });
      }
      case "unit_destroyed":
        return t("battle.log_destroyed", {
          unit: String(entry.payload.defender_name ?? t("battle.unknown_unit")),
        });
      case "round_ended":
        return t("battle.log_round_ended", {
          playerDamage: Number(entry.payload.player_damage_taken ?? 0),
          opponentDamage: Number(entry.payload.opponent_damage_taken ?? 0),
        });
      case "battle_ended":
        return t("battle.log_battle_ended", {
          winner:
            entry.payload.winner === "player"
              ? t("battle.you")
              : entry.payload.winner === "opponent"
                ? opponentName.value
                : t("battle.draw"),
        });
      default:
        return t("battle.log_unknown");
    }
  }

  function battleLogEntryClass(entry: BattleLogEntry): string {
    if (entry.type === "attack_resolved") {
      return entry.side === "player"
        ? "border-blue-500/30 bg-blue-500/5"
        : "border-red-500/30 bg-red-500/5";
    }
    if (entry.type === "unit_destroyed") return "border-orange-500/40 bg-orange-500/10";
    if (entry.type === "unit_healed") return "border-cyan-500/40 bg-cyan-500/10";
    if (entry.type === "battle_ended") return "border-primary/40 bg-primary/10";
    return "border-border/60 bg-card/70";
  }

  return {
    groupedBattleLogEntries,
    lastRoundSummary,
    deployedPlayerNames,
    deployedOpponentNames,
    totalPlayerDamage,
    totalOpponentDamage,
    totalPlayerUnitsDestroyed,
    totalOpponentUnitsDestroyed,
    roundsResolved,
    formatBattleLogEntry,
    battleLogEntryClass,
  };
}
