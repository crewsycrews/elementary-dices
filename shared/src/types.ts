import type { Static } from "elysia";
import {
  UserSchema,
  ElementalSchema,
  PlayerElementalSchema,
  DiceTypeSchema,
  ItemSchema,
  PlayerDiceSchema,
  PlayerInventorySchema,
  BattleSchema,
  DiceRollSchema,
  ElementalEvolutionSchema,
  StatsSchema,
  BattlePartyMemberSchema,
  BattleLogEntrySchema,
  BattleRollRecordSchema,
  BattleStateSchema,
  BattlePhase,
  ElementType,
  DiceRarity,
  ItemRarity,
  DiceRollContext,
  EncounterType,
  EncounterStatus,
  BattleOutcome,
  ItemType,
  CombinationType,
  CombinationSchema,
  FarkleDieSchema,
  FarkleTurnPhase,
  FarkleTurnStateSchema,
  OpponentTurnResultSchema,
  FarkleBattlePhase,
  FarkleBattleStateSchema,
} from "./schemas";

// Extract static types from Elysia schemas
export type User = Static<typeof UserSchema>;
export type Elemental = Static<typeof ElementalSchema>;
export type PlayerElemental = Static<typeof PlayerElementalSchema>;
export type DiceType = Static<typeof DiceTypeSchema>;
export type Item = Static<typeof ItemSchema>;
export type PlayerDice = Static<typeof PlayerDiceSchema>;
export type PlayerInventory = Static<typeof PlayerInventorySchema>;
export type Battle = Static<typeof BattleSchema>;
export type DiceRoll = Static<typeof DiceRollSchema>;
export type ElementalEvolution = Static<typeof ElementalEvolutionSchema>;
export type BaseStats = Static<typeof StatsSchema>;

// Extract literal union types
export type ElementTypeValue = Static<typeof ElementType>;
export type DiceRarityValue = Static<typeof DiceRarity>;
export type ItemRarityValue = Static<typeof ItemRarity>;
export type DiceRollContextValue = Static<typeof DiceRollContext>;
export type EncounterTypeValue = Static<typeof EncounterType>;
export type EncounterStatusValue = Static<typeof EncounterStatus>;
export type BattleOutcomeValue = Static<typeof BattleOutcome>;
export type ItemTypeValue = Static<typeof ItemType>;
export type BattlePartyMember = Static<typeof BattlePartyMemberSchema>;
export type BattleLogEntry = Static<typeof BattleLogEntrySchema>;
export type BattleRollRecord = Static<typeof BattleRollRecordSchema>;
export type BattleState = Static<typeof BattleStateSchema>;
export type BattlePhaseValue = Static<typeof BattlePhase>;

// Farkle Battle System types (v2)
export type CombinationTypeValue = Static<typeof CombinationType>;
export type Combination = Static<typeof CombinationSchema>;
export type FarkleDie = Static<typeof FarkleDieSchema>;
export type FarkleTurnPhaseValue = Static<typeof FarkleTurnPhase>;
export type FarkleTurnState = Static<typeof FarkleTurnStateSchema>;
export type OpponentTurnResult = Static<typeof OpponentTurnResultSchema>;
export type FarkleBattlePhaseValue = Static<typeof FarkleBattlePhase>;
export type FarkleBattleState = Static<typeof FarkleBattleStateSchema>;

// Extended types with joined data (client-side only)

export type PlayerElementalWithDetails = PlayerElemental & {
  elemental_name: string;
  elemental_level: number;
  element_types: ElementTypeValue[];
  image_url: string | null;
};

export type PlayerDiceWithDetails = PlayerDice & {
  dice_type: DiceType;
};

export type PlayerInventoryItem = PlayerInventory & {
  item: Item;
};
