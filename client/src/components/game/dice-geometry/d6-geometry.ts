/**
 * D6 (Six-Sided Dice) Geometry - Cube
 *
 * A standard cube with 6 square faces. This is the simplest dice geometry
 * and serves as the reference implementation for the 3D dice system.
 *
 * Face arrangement follows standard dice convention:
 * - Opposite faces sum to 7 (1-6, 2-5, 3-4)
 * - When 1 is facing you and 2 is on top, 3 is to your right
 */

import type { DiceGeometry, DiceFace } from "./types";

/** Size of the cube (100x100x100 pixels) */
const CUBE_SIZE = 100;

/** Half size for positioning faces */
const HALF_SIZE = CUBE_SIZE / 2;

/**
 * Define all 6 faces of the cube with their 3D transforms
 * Each face is positioned 50px from the center on its respective axis
 */
const faces: DiceFace[] = [
  {
    value: 4,
    transform: `translateZ(${HALF_SIZE}px)`, // Front face
  },
  {
    value: 3,
    transform: `translateZ(-${HALF_SIZE}px) rotateY(180deg)`, // Back face
  },
  {
    value: 5,
    transform: `translateY(-${HALF_SIZE}px) rotateX(90deg)`, // Top face
  },
  {
    value: 2,
    transform: `translateY(${HALF_SIZE}px) rotateX(-90deg)`, // Bottom face
  },
  {
    value: 1,
    transform: `translateX(-${HALF_SIZE}px) rotateY(-90deg)`, // Left face
  },
  {
    value: 6,
    transform: `translateX(${HALF_SIZE}px) rotateY(90deg)`, // Right face
  },
];

/**
 * Rotation values to display each face value
 * These are the rotations applied to the entire dice to show a specific face
 *
 * Values are based on the reference implementation and tested for correct display
 */
const resultRotations = {
  1: { rotateX: 0, rotateY: 90, rotateZ: 0 },
  2: { rotateX: 90, rotateY: 0, rotateZ: 0 },
  3: { rotateX: 180, rotateY: 0, rotateZ: 180 },
  4: { rotateX: 0, rotateY: 0, rotateZ: 0 },
  5: { rotateX: 270, rotateY: 0, rotateZ: 0 },
  6: { rotateX: 0, rotateY: 270, rotateZ: 0 },
};

const wrapperRotation = {
  rotateX: 30,
  rotateY: 0,
  rotateZ: -45,
};

/**
 * Complete D6 geometry definition
 */
export const d6Geometry: DiceGeometry = {
  width: CUBE_SIZE,
  height: CUBE_SIZE,
  faces,
  resultRotations,
  wrapperRotation,
  // No wrapper rotation needed for cube - it's symmetrical
};
