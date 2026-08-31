/**
 * Bakes the reduced-motion / no-JS / no-WebGL fallback frame.
 *
 * The CPU twin of the WebGL field: the same spiral-galaxy maths, run once at
 * build time and written to a text file.
 *
 * The output ships inline in the server HTML as ONE <pre> with ONE text node.
 * It does four jobs: reduced-motion fallback, no-JS fallback, first paint
 * before the renderer chunk downloads, and the low-end device tier.
 *
 * Every structural constant comes from src/lib/ascii/field-constants.mjs, which
 * the shader interpolates into its GLSL. The maths below is still a hand
 * translation, so see `hash` for the one place the two cannot be made identical.
 *
 *   node scripts/bake-galaxy.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARMS,
  BAKE_COLS,
  BAKE_ROWS,
  CELL_ASPECT,
  DE_VAUC,
  INCL,
  PITCH,
  R_BULGE,
  R_DISK,
  SCALE,
  TONE,
} from "../src/lib/ascii/field-constants.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * APPROXIMATE, and unavoidably so. GLSL evaluates this in highp float32 while
 * JS is float64, and `fract(sin(x) * 43758.5453)` amplifies a 1e-7 relative
 * error to O(1) - so the clump and HII fields differ in detail between the two.
 * Math.fround narrows the gap to roughly float32 semantics; it cannot close it,
 * because GPU `sin` is itself driver-dependent and not IEEE-exact. The galaxy's
 * structure is deterministic, only its noise texture is not, and the frame this
 * bakes cross-fades out within a second of the canvas going live.
 */
function hash(x, y) {
  const s = Math.fround(Math.fround(Math.sin(Math.fround(x * 127.1 + y * 311.7))) * 43758.5453);
  return s - Math.floor(s);
}

function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x, y) {
  return (
    vnoise(x, y) * 0.6 +
    vnoise(x * 2.1 + 7.3, y * 2.1 + 7.3) * 0.3 +
    vnoise(x * 4.7 + 19.1, y * 4.7 + 19.1) * 0.1
  );
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Surface brightness at one point of the projected disk. `star` is the field-star
 *  contribution, which is fixed to the sky and so is a function of the raster
 *  coordinate rather than the disk coordinate. */
function sample(px, py, time, star) {
  // De-project: the disk is a circle in its own plane, squashed on screen by
  // the inclination.
  const ci = Math.max(Math.cos(INCL), 0.12);
  const dx = px;
  const dy = py / ci;
  const r = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);

  const disk = Math.exp(-r / R_DISK);
  const bulge = Math.exp(-DE_VAUC * (Math.pow(Math.max(r, 0.02) / R_BULGE, 0.25) - 1));

  // Logarithmic spiral: theta = ln(r/a)/tan(pitch). The time term rotates the
  // PATTERN rigidly, which is the density-wave picture and the reason the arms
  // never wind up.
  const armPhase = Math.log(Math.max(r, 0.04)) / Math.tan(PITCH);
  const wave = Math.cos(ARMS * (th - armPhase) - time * 0.22);
  const arm = Math.pow(Math.max(wave, 0), 2.2);

  const dustWave = Math.cos(ARMS * (th - armPhase) - time * 0.22 + 0.55);
  const dust = Math.pow(Math.max(dustWave, 0), 3.5) * smoothstep(0.15, 0.6, r);

  // Material orbits differentially even though the pattern does not.
  const orbit = th - (time * 0.5) / Math.max(r, 0.22);
  const tx = Math.cos(orbit) * r;
  const ty = Math.sin(orbit) * r;
  const clumps = fbm(tx * 3.4 + 11, ty * 3.4 + 11);
  const hii = arm > 0 ? smoothstep(0.62, 0.95, fbm(tx * 7 + 3, ty * 7 + 3)) * arm : 0;

  let L = bulge * 0.7 + disk * (0.25 + 1.9 * arm) * (0.5 + 1.0 * clumps) + hii * 0.7;
  L *= 1 - 0.6 * dust * disk;
  L += star * 0.5;
  return 1 - Math.exp(-L * 1.9);
}

/**
 * Interleaved gradient noise, the per-dot threshold. Bayer's 8x8 grid aligns
 * with the 2x4 Braille cell structure and shows up as a hard 4-column repeat;
 * IGN has no periodic structure but is still a pure function of position, so it
 * never shimmers.
 *
 * The INNER fract is not optional. Dropping it (as this did) leaves a different
 * function entirely, because 52.98 * a large unwrapped value has nothing to do
 * with 52.98 * its fractional part.
 */
function fract(v) {
  return v - Math.floor(v);
}

function ign(x, y) {
  return fract(52.9829189 * fract(0.06711056 * x + 0.00583715 * y));
}

/**
 * Braille render. Each cell is a 2x4 dot matrix (U+2800-28FF), so this carries
 * eight times the effective resolution of the ramp on the same grid.
 *
 *   dot1 (0,0)=0x01  dot4 (1,0)=0x08
 *   dot2 (0,1)=0x02  dot5 (1,1)=0x10
 *   dot3 (0,2)=0x04  dot6 (1,2)=0x20
 *   dot7 (0,3)=0x40  dot8 (1,3)=0x80
 */
function renderBraille(cols, rows, time = 0) {
  const { black, gamma } = TONE.braille;
  const dotRows = rows * 4;
  const out = [];

  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      let bits = 0;
      for (let sx = 0; sx < 2; sx++) {
        for (let sy = 0; sy < 4; sy++) {
          const dx = col * 2 + sx;
          const dy = row * 4 + sy;
          let cx = ((dx + 0.5) / (cols * 2)) * 2 - 1;
          const cy = 1 - ((dy + 0.5) / dotRows) * 2;
          cx *= (cols / rows) * CELL_ASPECT;

          // gl_FragCoord is bottom-up and sampled at texel centres; the field
          // stars are keyed off it, so the same coordinate has to be rebuilt.
          const glY = dotRows - 1 - dy;
          const star =
            hash(Math.floor((dx + 0.5) * 0.5), Math.floor((glY + 0.5) * 0.5)) >= 0.9975 ? 1 : 0;

          const L = sample(cx * SCALE, cy * SCALE, time, star);
          const norm = Math.min(Math.max((L - black) / (1 - black), 0), 1);
          if (Math.pow(norm, gamma) > ign(dx, dy)) {
            bits |= sy < 3 ? 1 << (sy + 3 * sx) : 0x40 << sx;
          }
        }
      }
      line += String.fromCharCode(0x2800 + bits);
    }
    // U+2800 is a blank Braille cell, not a space: trailing ones still occupy
    // a column, so trimming them would shorten the row and shear the grid.
    out.push(line.replace(/⠀+$/, ""));
  }
  return out.join("\n");
}

const art = renderBraille(BAKE_COLS, BAKE_ROWS, 0);
mkdirSync(join(ROOT, "public", "static"), { recursive: true });
writeFileSync(join(ROOT, "public", "static", "galaxy.txt"), art, "utf8");

const cells = BAKE_COLS * BAKE_ROWS;
process.stdout.write(art + "\n");
console.error(
  `\nbaked public/static/galaxy.txt  ${BAKE_COLS}x${BAKE_ROWS} = ${cells} cells` +
    ` (${cells * 8} braille dots), ${Buffer.byteLength(art, "utf8")} bytes`,
);
