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
  ElementType,
  DiceRarity,
  ItemRarity,
  DiceRollOutcome,
  DiceRollContext,
  EncounterType,
  EncounterStatus,
  BattleOutcome,
  ItemType,
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
export type DiceRollOutcomeValue = Static<typeof DiceRollOutcome>;
export type DiceRollContextValue = Static<typeof DiceRollContext>;
export type EncounterTypeValue = Static<typeof EncounterType>;
export type EncounterStatusValue = Static<typeof EncounterStatus>;
export type BattleOutcomeValue = Static<typeof BattleOutcome>;
export type ItemTypeValue = Static<typeof ItemType>;

// Extended types with joined data (client-side only)

export type PlayerDiceWithDetails = PlayerDice & {
  dice_type: DiceType;
};

export type PlayerInventoryItem = PlayerInventory & {
  item: Item;
};
