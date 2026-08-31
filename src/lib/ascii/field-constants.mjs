/**
 * Every number the GPU field and its CPU twin must agree on.
 *
 * `shaders.ts` interpolates these into the GLSL source; `scripts/bake-galaxy.mjs`
 * imports them directly. Before this file existed the two sides carried their
 * own copies and had already drifted, which is visible rather than theoretical:
 * the baked <pre> is the first paint and cross-fades to the canvas over a
 * second, so a mismatch is a shape that moves as the fade lands.
 *
 * Plain .mjs, not .ts, so `node scripts/bake-galaxy.mjs` needs no type stripping
 * and no build-image Node version gamble.
 */

// Sa-Sc galaxies average a pitch angle at or under 15.5 degrees, opening up
// toward later Hubble types. ~19 degrees sits in Sc territory: tighter than this
// and the arms fall below the glyph resolution and read as concentric rings.
export const PITCH = 0.331;
export const ARMS = 2.0;
export const R_DISK = 1.0;
export const R_BULGE = 0.14;
export const DE_VAUC = 7.669;

// ~57 degrees off face-on: open enough to show the arms, tilted enough to read
// as a disk in space rather than a flat pinwheel.
export const INCL = 1.0;

/** Disk scale lengths per half-grid-height. The exponential disk is effectively
 *  gone by ~4 Rs, so this frames roughly that. */
export const SCALE = 2.5;

/** Measured: Departure Mono advance 7px / line box 14px. */
export const CELL_ASPECT = 0.5;

/**
 * Black point and gamma, per glyph mode.
 *
 * Braille resolves 8x more samples, so it shows far more of the field's low end;
 * it needs a higher black point and a steeper curve than the ramp to keep the
 * outer falloff from reading as an even dither texture.
 *
 * The photographic 1/2.2 curve is the wrong shape here in either mode - it LIFTS
 * darks, which on a bright object against empty sky smears the faint outer halo
 * into fog across the whole frame. Subtracting a floor first is what gives back
 * real empty sky.
 */
export const TONE = {
  ramp: { black: 0.14, gamma: 0.75 },
  braille: { black: 0.18, gamma: 1.05 },
};

/** Baked fallback grid. 148x46 cells = 54,464 addressable Braille dots. */
export const BAKE_COLS = 148;
export const BAKE_ROWS = 46;
