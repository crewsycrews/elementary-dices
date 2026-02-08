/**
 * D12 (Twelve-Sided Dice) Geometry - Dodecahedron
 *
 * A regular dodecahedron with 12 pentagonal faces.
 * The dihedral angle between faces is 116.57°.
 *
 * This is one of the more complex geometries due to the pentagonal faces
 * and the specific angle requirements for proper 3D rendering.
 */

import type { DiceGeometry, DiceFace } from './types';

/** Base dimensions */
const BASE_WIDTH = 105.14;
const BASE_HEIGHT = 100;

/** Pentagon clip path for all d12 faces */
const PENTAGON_CLIP = 'polygon(50% 0%, 100% 38.2%, 81.8% 100%, 18.2% 100%, 0% 38.2%)';

/**
 * Define all 12 pentagonal faces
 * Arranged in three rings: top (1), middle (6 + 5), bottom (1)
 */
const faces: DiceFace[] = [
  // Top face
  {
    value: 1,
    transform: 'translateZ(40px) rotateX(90deg) rotateY(180deg)',
    clipPath: PENTAGON_CLIP,
  },
  // Upper ring (faces 2-6)
  {
    value: 2,
    transform: 'translateZ(40px) rotateX(-26.57deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 3,
    transform: 'translateZ(9.1px) translateX(42.53px) rotateY(72deg) rotateX(-26.57deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 4,
    transform: 'translateZ(-40.9px) translateX(26.29px) rotateY(144deg) rotateX(-26.57deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 5,
    transform: 'translateZ(-40.9px) translateX(-26.29px) rotateY(216deg) rotateX(-26.57deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 6,
    transform: 'translateZ(9.1px) translateX(-42.53px) rotateY(288deg) rotateX(-26.57deg)',
    clipPath: PENTAGON_CLIP,
  },
  // Lower ring (faces 7-11) - note face 12 is separate
  {
    value: 12,
    transform: 'translateZ(-49.33px) translateY(-144.78px) rotateX(-90deg) rotateY(180deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 8,
    transform: 'translateZ(-49.33px) translateY(-144.78px) rotateX(-206.57deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 9,
    transform: 'translateZ(-18.43px) translateY(-144.78px) translateX(42.53px) rotateY(288deg) rotateX(153.43deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 10,
    transform: 'translateZ(31.57px) translateY(-144.78px) translateX(26.29px) rotateY(216deg) rotateX(153.43deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 11,
    transform: 'translateZ(-18.43px) translateY(-144.78px) translateX(-42.53px) rotateY(72deg) rotateX(153.43deg)',
    clipPath: PENTAGON_CLIP,
  },
  {
    value: 7,
    transform: 'translateZ(31.57px) translateY(-144.78px) translateX(-26.29px) rotateY(144deg) rotateX(153.43deg)',
    clipPath: PENTAGON_CLIP,
  },
];

/**
 * Rotation values to display each face value
 * D12 has complex rotation angles due to pentagonal symmetry
 */
const resultRotations = {
  1: { rotateX: 0, rotateY: 0, rotateZ: 180 },
  2: { rotateX: 121.72, rotateY: 0, rotateZ: 0 },
  3: { rotateX: 121.72, rotateY: 288, rotateZ: 0 },
  4: { rotateX: 121.72, rotateY: 216, rotateZ: 0 },
  5: { rotateX: 121.72, rotateY: 144, rotateZ: 0 },
  6: { rotateX: 121.72, rotateY: 72, rotateZ: 0 },
  7: { rotateX: -58.28, rotateY: 216, rotateZ: 0 },
  8: { rotateX: -58.28, rotateY: 0, rotateZ: 0 },
  9: { rotateX: -58.28, rotateY: 72, rotateZ: 0 },
  10: { rotateX: -58.28, rotateY: 144, rotateZ: 0 },
  11: { rotateX: -58.28, rotateY: 288, rotateZ: 0 },
  12: { rotateX: 0, rotateY: 180, rotateZ: 0 },
};

/**
 * Wrapper rotation for optimal viewing angle
 * D12 needs significant tilting for best perspective
 */
const wrapperRotation = {
  rotateX: -85,
  rotateY: 25,
  rotateZ: 0,
};

/**
 * Complete D12 geometry definition
 */
export const d12Geometry: DiceGeometry = {
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  faces,
  resultRotations,
  wrapperRotation,
};
