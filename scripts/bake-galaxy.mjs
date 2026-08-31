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
 *   node scripts/bake-galaxy.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Sa-Sc galaxies average a pitch angle at or under 15.5 degrees, opening up
// toward later Hubble types. ~19 degrees sits in Sc territory: tighter than
// this and the arms fall below the glyph resolution and read as rings.
const PITCH = Number(process.env.GX_PITCH ?? 0.331);
const ARMS = Number(process.env.GX_ARMS ?? 2);
const R_DISK = 1.0; // exponential disk scale length
const R_BULGE = 0.14; // Sersic effective radius
const DE_VAUC = 7.669; // Sersic n=4 normalisation

const INCL = Number(process.env.GX_INCL ?? 1.0);
const SCALE = Number(process.env.GX_SCALE ?? 2.5);
const CELL_ASPECT = 0.5; // measured: Departure Mono advance 7px / line 14px

// Coverage-ordered. Index 0 MUST be a literal space: empty sky has to be a
// hole in the text, not a dim glyph.
const RAMP = " .·:-=+*oO#%@";

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
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
  return vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 7.3, y * 2.1 + 7.3) * 0.3 +
    vnoise(x * 4.7 + 19.1, y * 4.7 + 19.1) * 0.1;
}

/** Surface brightness and accent mask at one point of the projected disk. */
function sample(px, py, time) {
  // De-project: the disk is a circle in its own plane, squashed on screen by
  // the inclination.
  const ci = Math.max(Math.cos(INCL), 0.12);
  const dx = px;
  const dy = py / ci;
  const r = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);

  const disk = Math.exp(-r / R_DISK);
  const bulge = Math.exp(-DE_VAUC * (Math.pow(Math.max(r, 0.02) / R_BULGE, 0.25) - 1));

  // Logarithmic spiral: theta = ln(r/a)/tan(pitch). The uTime term rotates the
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
  const hii = smoothstep(0.62, 0.95, fbm(tx * 7 + 3, ty * 7 + 3)) * arm;

  let L = bulge * 0.7 + disk * (0.25 + 1.9 * arm) * (0.5 + 1.0 * clumps) + hii * 0.7;
  L *= 1 - 0.6 * dust * disk;
  L = 1 - Math.exp(-L * 1.9);

  return L;
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function ign(x, y) {
  // Interleaved gradient noise. Bayer's 8x8 grid aligns with the 2x4 Braille
  // cell structure and shows up as a hard 4-column repeat; IGN has no periodic
  // structure but is still a pure function of position, so it never shimmers.
  return (52.9829189 * (0.06711056 * x + 0.00583715 * y)) % 1;
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
export function renderBraille(cols, rows, time = 0) {
  const black = Number(process.env.GX_BLACK ?? 0.18);
  const gam = Number(process.env.GX_GAMMA ?? 1.05);
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
          const cy = 1 - ((dy + 0.5) / (rows * 4)) * 2;
          cx *= (cols / rows) * CELL_ASPECT;
          const L = sample(cx * SCALE, cy * SCALE, time);
          const norm = Math.min(Math.max((L - black) / (1 - black), 0), 1);
          if (Math.pow(norm, gam) > ign(dx, dy)) {
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

export function render(cols, rows, time = 0, supersample = 2) {
  const out = [];
  const N = RAMP.length;
  const black = Number(process.env.GX_BLACK ?? 0.18);
  const gam = Number(process.env.GX_GAMMA ?? 1.05);

  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      let L = 0;
      for (let sy = 0; sy < supersample; sy++) {
        for (let sx = 0; sx < supersample; sx++) {
          let cx = ((col + (sx + 0.5) / supersample) / cols) * 2 - 1;
          const cy = 1 - ((row + (sy + 0.5) / supersample) / rows) * 2;
          cx *= (cols / rows) * CELL_ASPECT;
          L += sample(cx * SCALE, cy * SCALE, time);
        }
      }
      L /= supersample * supersample;
      const norm = Math.min(Math.max((L - black) / (1 - black), 0), 1);
      line += RAMP[Math.round(Math.pow(norm, gam) * (N - 1))];
    }
    out.push(line.replace(/\s+$/, ""));
  }
  return out.join("\n");
}

const COLS = Number(process.env.GX_COLS ?? 148);
const ROWS = Number(process.env.GX_ROWS ?? 46);

const BRAILLE = process.env.GX_RAMP !== "1";
const art = BRAILLE ? renderBraille(COLS, ROWS, 0) : render(COLS, ROWS, 0);
mkdirSync(join(ROOT, "public", "static"), { recursive: true });
writeFileSync(join(ROOT, "public", "static", "galaxy.txt"), art, "utf8");

const cells = COLS * ROWS;
process.stdout.write(art + "\n");
console.error(
  `\nbaked public/static/galaxy.txt  ${COLS}x${ROWS} = ${cells} cells` +
    (BRAILLE ? ` (${cells * 8} braille dots)` : "") +
    `, ${Buffer.byteLength(art, "utf8")} bytes`,
);
