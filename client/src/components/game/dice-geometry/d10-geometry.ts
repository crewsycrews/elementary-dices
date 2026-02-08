/**
 * D10 (Ten-Sided Dice) Geometry - Pentagonal Trapezohedron
 *
 * A pentagonal trapezohedron with 10 kite-shaped faces arranged in two rings of 5.
 * This die has an elongated shape and typically shows values 0-9 or 1-10.
 * In this game, we use 1-10.
 *
 * The faces are arranged symmetrically with 5 faces pointing up and 5 pointing down.
 */

import type { DiceGeometry, DiceFace } from './types';

/** Base dimensions for the elongated shape */
const BASE_WIDTH = 100;
const BASE_HEIGHT = 135.5;

/** Kite-shaped clip path for d10 faces */
const KITE_CLIP = 'polygon(50% 0%, 0% 18.9%, 50% 100%, 100% 18.9%)';

/**
 * Define all 10 kite-shaped faces
 * Arranged in two pentagonal rings (top and bottom)
 */
const faces: DiceFace[] = [
  // Top ring (faces 1-5)
  {
    value: 1,
    transform: 'translateZ(42.75px) translateY(-50px) rotateX(51.4deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 2,
    transform: 'translateZ(42.75px) translateY(-21px) translateX(40px) rotateZ(72deg) rotateX(51.4deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 3,
    transform: 'translateZ(42.75px) translateY(26px) translateX(24.7px) rotateZ(144deg) rotateX(51.4deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 4,
    transform: 'translateZ(42.75px) translateY(26px) translateX(-24.7px) rotateZ(216deg) rotateX(51.4deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 5,
    transform: 'translateZ(42.75px) translateY(-21px) translateX(-40px) rotateZ(288deg) rotateX(51.4deg)',
    clipPath: KITE_CLIP,
  },
  // Bottom ring (faces 6-10)
  {
    value: 6,
    transform: 'translateZ(-43px) translateY(-41px) translateX(24px) rotateZ(36deg) rotateX(-51.4deg) rotateY(180deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 7,
    transform: 'translateZ(-43px) translateY(6px) translateX(40px) rotateZ(108deg) rotateX(-51.4deg) rotateY(180deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 8,
    transform: 'translateZ(-43px) translateY(35px) translateX(0px) rotateZ(180deg) rotateX(-51.4deg) rotateY(180deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 9,
    transform: 'translateZ(-43px) translateY(6px) translateX(-40px) rotateZ(252deg) rotateX(-51.4deg) rotateY(180deg)',
    clipPath: KITE_CLIP,
  },
  {
    value: 10,
    transform: 'translateZ(-43px) translateY(-41px) translateX(-25.5px) rotateZ(324deg) rotateX(-51.4deg) rotateY(180deg)',
    clipPath: KITE_CLIP,
  },
];

/**
 * Rotation values to display each face value
 * Values arranged in pentagonal symmetry
 */
const resultRotations = {
  1: { rotateX: 5, rotateY: -36, rotateZ: 0 },
  2: { rotateX: 5, rotateY: -36, rotateZ: 288 },
  3: { rotateX: 5, rotateY: -36, rotateZ: 216 },
  4: { rotateX: 5, rotateY: -36, rotateZ: 144 },
  5: { rotateX: 5, rotateY: -36, rotateZ: 72 },
  6: { rotateX: 5, rotateY: 144, rotateZ: 324 },
  7: { rotateX: 5, rotateY: 144, rotateZ: 252 },
  8: { rotateX: 5, rotateY: 144, rotateZ: 180 },
  9: { rotateX: 5, rotateY: 144, rotateZ: 108 },
  10: { rotateX: 5, rotateY: 144, rotateZ: 36 },
};

/**
 * Wrapper rotation for optimal viewing angle
 * D10 needs angling for proper perspective due to elongated shape
 */
const wrapperRotation = {
  rotateX: -65,
  rotateY: 40,
  rotateZ: 0,
};

/**
 * Complete D10 geometry definition
 */
export const d10Geometry: DiceGeometry = {
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  faces,
  resultRotations,
  wrapperRotation,
};
