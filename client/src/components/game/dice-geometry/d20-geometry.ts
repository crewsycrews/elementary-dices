/**
 * D20 (Twenty-Sided Dice) Geometry - Icosahedron
 *
 * A regular icosahedron with 20 equilateral triangular faces.
 * The dihedral angle between faces is 138.19°.
 *
 * This is the most complex dice geometry with 20 small faces.
 * The d20 is iconic in tabletop gaming and requires careful positioning
 * of each triangular face for proper rendering.
 */

import type { DiceGeometry, DiceFace } from "./types";

/** Base dimensions */
const BASE_WIDTH = 90;
const BASE_HEIGHT = 77.92;

/** Triangular clip path for all d20 faces */
const TRIANGLE_CLIP = "polygon(50% 0%, 0% 100%, 100% 100%)";

/**
 * Define all 20 triangular faces
 * Arranged in five rings around the icosahedron
 */
const faces: DiceFace[] = [
  // Top cap (faces 1-5)
  {
    value: 1,
    transform:
      "translateZ(61.2px) translateY(15.912px) translateX(0px) rotateZ(0deg) rotateX(-37.3deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 2,
    transform:
      "translateZ(61.2px) translateY(-5.4px) translateX(-29.43px) rotateZ(72deg) rotateX(-37.3deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 3,
    transform:
      "translateZ(61.2px) translateY(-39.87px) translateX(-18.09px) rotateZ(144deg) rotateX(-37.3deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 4,
    transform:
      "translateZ(61.2px) translateY(-39.87px) translateX(18.09px) rotateZ(216deg) rotateX(-37.3deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 5,
    transform:
      "translateZ(61.2px) translateY(-5.4px) translateX(29.43px) rotateZ(288deg) rotateX(-37.3deg)",
    clipPath: TRIANGLE_CLIP,
  },
  // Upper middle ring (faces 6-10)
  {
    value: 6,
    transform:
      "translateZ(0px) translateY(54px) translateX(0px) rotateZ(0deg) rotateX(100.89deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 7,
    transform:
      "translateZ(0px) translateY(40.95px) translateX(40.5px) rotateZ(-36deg) rotateX(-100.89deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 8,
    transform:
      "translateZ(0px) translateY(6.3px) translateX(65.7px) rotateZ(-72deg) rotateX(100.89deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 9,
    transform:
      "translateZ(0px) translateY(-36px) translateX(65.7px) rotateZ(-108deg) rotateX(-100.89deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 10,
    transform:
      "translateZ(0px) translateY(-70.65px) translateX(40.5px) rotateZ(-144deg) rotateX(100.89deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  // Central ring (faces 11-15)
  {
    value: 11,
    transform:
      "translateZ(0px) translateY(-83.7px) translateX(0px) rotateZ(180deg) rotateX(-100.89deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 12,
    transform:
      "translateZ(0px) translateY(-70.65px) translateX(-40.5px) rotateZ(144deg) rotateX(100.89deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 13,
    transform:
      "translateZ(0px) translateY(-36px) translateX(-65.7px) rotateZ(108deg) rotateX(-100.89deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 14,
    transform:
      "translateZ(0px) translateY(6.3px) translateX(-65.7px) rotateZ(72deg) rotateX(100.89deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 15,
    transform:
      "translateZ(0px) translateY(40.95px) translateX(-40.5px) rotateZ(36deg) rotateX(-100.89deg)",
    clipPath: TRIANGLE_CLIP,
  },
  // Bottom cap (faces 16-20)
  {
    value: 16,
    transform:
      "translateZ(-61.2px) translateY(9.9px) translateX(18.09px) rotateZ(-36deg) rotateX(37.3deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 17,
    transform:
      "translateZ(-61.2px) translateY(-24.57px) translateX(29.52px) rotateZ(-108deg) rotateX(37.3deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 18,
    transform:
      "translateZ(-61.2px) translateY(-45.45px) translateX(0px) rotateZ(180deg) rotateX(37.3deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 19,
    transform:
      "translateZ(-61.2px) translateY(-24.57px) translateX(-29.52px) rotateZ(108deg) rotateX(37.3deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
  {
    value: 20,
    transform:
      "translateZ(-61.2px) translateY(9.9px) translateX(-18.09px) rotateZ(36deg) rotateX(37.3deg) rotateY(180deg)",
    clipPath: TRIANGLE_CLIP,
  },
];

/**
 * Rotation values to display each face value
 * D20 has the most complex rotation matrix due to 20 faces
 */
const resultRotations = {
  1: { rotateX: 100, rotateY: 0, rotateZ: 30 },
  2: { rotateX: 100, rotateY: 0, rotateZ: -42 },
  3: { rotateX: 100, rotateY: 0, rotateZ: 244 },
  4: { rotateX: 100, rotateY: 0, rotateZ: 172 },
  5: { rotateX: 100, rotateY: 0, rotateZ: 102 },
  6: { rotateX: -15, rotateY: -25, rotateZ: 168 },
  7: { rotateX: -15, rotateY: 160, rotateZ: -130 },
  8: { rotateX: -15, rotateY: -25, rotateZ: -120 },
  9: { rotateX: -15, rotateY: 160, rotateZ: -60 },
  10: { rotateX: -15, rotateY: -25, rotateZ: -50 },
  11: { rotateX: -15, rotateY: 160, rotateZ: 10 },
  12: { rotateX: -15, rotateY: -25, rotateZ: 25 },
  13: { rotateX: -15, rotateY: 160, rotateZ: 85 },
  14: { rotateX: -15, rotateY: -25, rotateZ: 95 },
  15: { rotateX: -15, rotateY: 160, rotateZ: 155 },
  16: { rotateX: -85, rotateY: 0, rotateZ: 180 },
  17: { rotateX: -85, rotateY: 0, rotateZ: 252 },
  18: { rotateX: -85, rotateY: 0, rotateZ: -33 },
  19: { rotateX: -85, rotateY: 0, rotateZ: 39 },
  20: { rotateX: -85, rotateY: 0, rotateZ: 111 },
};

/**
 * Wrapper rotation for optimal viewing angle
 * D20 benefits from tilting for better face visibility
 */
const wrapperRotation = {
  rotateX: -65,
  rotateY: 40,
  rotateZ: 0,
};

/**
 * Complete D20 geometry definition
 */
export const d20Geometry: DiceGeometry = {
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  faces,
  resultRotations,
  wrapperRotation,
};
