/**
 * Dice Geometry Type Definitions
 *
 * This module defines the core types for the 3D CSS dice rendering system.
 * Each dice type (d4, d6, d10, d12, d20) has geometry data that describes
 * the position and rotation of each face in 3D space.
 */

/**
 * Represents a single face of a die
 */
export interface DiceFace {
  /** The numeric value displayed on this face (1-N where N is max for dice type) */
  value: number;

  /** CSS transform string for positioning this face in 3D space */
  transform: string;

  /** Optional CSS clip-path for non-rectangular faces (triangles, pentagons) */
  clipPath?: string;
}

/**
 * 3D rotation angles in degrees
 */
export interface Rotation {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

/**
 * Complete geometry definition for a dice type
 */
export interface DiceGeometry {
  /** Array of all faces with their transforms */
  faces: DiceFace[];

  /**
   * Rotation values to show each possible result
   * Key is the face value (1-N), value is the rotation needed to show that face
   */
  resultRotations: Record<number, Rotation>;

  /**
   * Optional base rotation for the dice wrapper
   * Used to angle the die for better viewing (e.g., d20 tilted for optimal perspective)
   */
  wrapperRotation?: Rotation;
  
  /** Base width of the die in pixels */
  width: number;
  /** Base height of the die in pixels */
  height: number;
}

/**
 * Supported dice types in the game
 */
export type DiceType = 'd4' | 'd6' | 'd10' | 'd12' | 'd20';

/**
 * Mapping of dice types to their maximum values
 */
export const DICE_MAX_VALUES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d10: 10,
  d12: 12,
  d20: 20,
};

/**
 * Helper function to get max value for a dice type
 */
export function getMaxValue(diceType: DiceType): number {
  return DICE_MAX_VALUES[diceType];
}

/**
 * Helper function to create a CSS transform string from rotation angles
 */
export function createTransform(rotation: Rotation): string {
  return `rotateX(${rotation.rotateX}deg) rotateY(${rotation.rotateY}deg) rotateZ(${rotation.rotateZ}deg)`;
}
