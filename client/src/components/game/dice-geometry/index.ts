/**
 * Dice Geometry Module - Barrel Exports
 *
 * This module provides a centralized export for all dice geometries
 * and utility functions for working with dice geometry data.
 */

// Export all type definitions
export * from './types';

// Export individual geometry definitions
export { d4Geometry } from './d4-geometry';
export { d6Geometry } from './d6-geometry';
export { d10Geometry } from './d10-geometry';
export { d12Geometry } from './d12-geometry';
export { d20Geometry } from './d20-geometry';

// Import for utility function
import type { DiceGeometry, DiceType } from './types';
import { d4Geometry } from './d4-geometry';
import { d6Geometry } from './d6-geometry';
import { d10Geometry } from './d10-geometry';
import { d12Geometry } from './d12-geometry';
import { d20Geometry } from './d20-geometry';

/**
 * Geometry lookup map for quick access
 */
const geometryMap: Record<DiceType, DiceGeometry> = {
  d4: d4Geometry,
  d6: d6Geometry,
  d10: d10Geometry,
  d12: d12Geometry,
  d20: d20Geometry,
};

/**
 * Get the geometry definition for a specific dice type
 *
 * @param diceType - The type of dice (d4, d6, d10, d12, d20)
 * @returns The complete geometry definition for that dice type
 *
 * @example
 * ```typescript
 * const geometry = getGeometry('d20');
 * console.log(geometry.faces.length); // 20
 * ```
 */
export function getGeometry(diceType: DiceType): DiceGeometry {
  return geometryMap[diceType];
}

/**
 * Check if a dice type is valid
 *
 * @param diceType - String to check
 * @returns True if the string is a valid dice type
 */
export function isValidDiceType(diceType: string): diceType is DiceType {
  return diceType in geometryMap;
}
