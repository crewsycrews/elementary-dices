/**
 * D4 (Four-Sided Dice) Geometry - Tetrahedron
 *
 * A tetrahedron with 4 equilateral triangular faces.
 * This is one of the more complex geometries due to the non-square faces.
 *
 * The D4 typically shows the result on the bottom face (the one it lands on),
 * but for visibility, we rotate to show the value on the top-facing surface.
 */

import type { DiceGeometry, DiceFace } from "./types";

/** Base dimensions */
const BASE_WIDTH = 150;
const BASE_HEIGHT = 129.88; // Height of equilateral triangle with width 150

/** Triangular clip path for all faces */
const TRIANGLE_CLIP = "polygon(50% 0%, 0% 100%, 100% 100%)";

/**
 * Define all 4 triangular faces of the tetrahedron
 * Faces are positioned to form a pyramid shape
 */
const faces: DiceFace[] = [
  {
    value: 1,
    transform: "translateY(42.05px) translateZ(25px) rotateX(-70.529deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 2,
    transform:
      "translateY(10px) translateX(-18.75px) translateZ(25px) rotateZ(120deg) rotateX(-70.529deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 3,
    transform:
      "translateY(10px) translateX(18.75px) translateZ(25px) rotateZ(240deg) rotateX(-70.529deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 4,
    transform: "translateZ(-35px) translateY(-1px) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
];

/**
 * Rotation values to display each face value
 * D4 geometry requires specific angles to show each triangular face
 */
const resultRotations = {
  1: { rotateX: 90, rotateY: 0, rotateZ: 0 },
  2: { rotateX: 90, rotateY: 0, rotateZ: 240 },
  3: { rotateX: 90, rotateY: 0, rotateZ: 120 },
  4: { rotateX: 0, rotateY: 180, rotateZ: 0 },
};

/**
 * Wrapper rotation for optimal viewing angle
 * Tetrahedron needs to be tilted for better perspective
 */
const wrapperRotation = {
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
};

/**
 * Complete D4 geometry definition
 */
export const d4Geometry: DiceGeometry = {
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  faces,
  resultRotations,
  wrapperRotation,
};
