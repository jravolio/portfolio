/**
 * Bakes the reduced-motion / no-JS / no-WebGL fallback frame.
 *
 * This is the Tier A renderer: the same Schwarzschild geodesic integrator the
 * WebGL2 shader runs, in plain JS on the CPU. At 100x36 cells it costs a few
 * hundred milliseconds, so it runs at build time and writes a single text file.
 *
 * The output ships inline in the server HTML as ONE <pre> with ONE text node.
 * It does four jobs: reduced-motion fallback, no-JS fallback, first paint
 * before the WebGL chunk downloads, and the low-end device tier.
 *
 *   node scripts/bake-blackhole.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- geometry, in units of the Schwarzschild radius r_s = 1 -----------------
const R_IN = 3.0; // ISCO: inner edge of the disk
const R_OUT = Number(process.env.BH_ROUT ?? 11.0); // outer edge. Physically the disk runs much further out,
// but past ~8 r_s it contributes nothing that survives quantisation to 13
// glyphs, and it eats the empty space that makes the silhouette read.
const B_CRIT = (3 * Math.sqrt(3)) / 2; // 2.598 - the APPARENT shadow radius.
// Theory says 3+alpha. 1.9 keeps the receding limb above the ramp floor: at
// 13 glyph levels the textbook exponent renders the dim side as empty space.
const BEAM = Number(process.env.BH_BEAM ?? 1.9);
const OPACITY = 0.9;
const N_STEPS = Number(process.env.BH_STEPS ?? 96); // CPU is cheap here; the GPU runs 40
// 1.25 rad off face-on. Below ~1.0 the far side of the disk does not bend far
// enough over the shadow to read; above ~1.4 the disk collapses into a line.
const INCL = Number(process.env.BH_INCL ?? 1.12);

// r_s per half-grid-height. Two-sided: the shadow must stay in the 20-40 cell
// band where a silhouette reads, and the disk's outer edge must land inside the
// frame with sky left over.
const SCALE = Number(process.env.BH_SCALE ?? 9.0);

const CELL_ASPECT = 0.5; // measured: Departure Mono advance 7px / line 14px

// Coverage-ordered. Index 0 MUST be a literal space: the shadow has to be a
// hole in the text, not a dim glyph. That single choice does more for
// recognisability than anything else in this file.
const RAMP = " .·:-=+*oO#%@";

const TAU = Math.PI * 2;

// Spiral structure. ARMS is how many angular periods wrap the disk: high values
// put the filaments below the dither resolution and the whole disk collapses
// into uniform grain. SHEAR is the radial twist that turns concentric bands
// into spirals. RFREQ is the radial detail frequency.
const ARMS = Number(process.env.BH_ARMS ?? 3);
const SHEAR = Number(process.env.BH_SHEAR ?? 0.4);
const RFREQ = Number(process.env.BH_RFREQ ?? 0.55);
// Arm contrast. A higher POW drives the gaps between arms toward empty, which
// is what stops the dither grain from competing with the spiral structure.
const FLOOR = Number(process.env.BH_FLOOR ?? 0.02);
const GAIN = Number(process.env.BH_GAIN ?? 3.0);
const POW = Number(process.env.BH_POW ?? 3);

// --- value noise, wrapped on an integer period in y -------------------------
// The swirl is sampled in (radius, angle) space. If the noise does not wrap on
// an integer period the atan branch cut shows up as a hard radial seam.
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoiseWrapY(x, y, period) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const y0 = ((yi % period) + period) % period;
  const y1 = (y0 + 1) % period;
  const a = hash2(xi, y0);
  const b = hash2(xi + 1, y0);
  const c = hash2(xi, y1);
  const d = hash2(xi + 1, y1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/**
 * Trace one photon backwards from the camera and return its luminance plus how
 * strongly it grazes the photon ring.
 */
let RING_W = 0.25; // set per-grid in render(): a shade over half a cell
const RING_GAIN = Number(process.env.BH_RINGG ?? 1.1);
const RING_T = Number(process.env.BH_RINGT ?? 0.55);

function trace(px, py, time) {
  // Orthographic. A perspective camera was tried and removed: at a few thousand
  // glyphs the extra depth cue does not survive quantisation, and the diverging
  // rays smear the disk's outer halo into fog across the whole frame.
  const Z0 = R_OUT + 6.0;

  const x = [px, py, Z0];
  const v = [0, 0, -1];

  // Conserved angular momentum. Computed ONCE: because the acceleration is
  // parallel to x, h^2 is exactly conserved. Recomputing it per step from a
  // drifting cross product makes the photon ring visibly wobble.
  const h2 = px * px + py * py;
  const b = Math.sqrt(h2);

  const ci = Math.cos(INCL);
  const si = Math.sin(INCL);
  const n = [0, si, ci]; // disk normal
  const e2 = [0, ci, -si]; // in-plane basis vector

  let emit = 0;
  let trans = 1;
  let sPrev = x[0] * n[0] + x[1] * n[1] + x[2] * n[2];
  let xPrev = [...x];
  let captured = false;

  for (let i = 0; i < N_STEPS; i++) {
    let r2 = x[0] * x[0] + x[1] * x[1] + x[2] * x[2];
    if (r2 < 1.0) {
      captured = true;
      break;
    }
    if (x[2] < -Z0 && v[2] < 0) break;

    let r = Math.sqrt(r2);
    const dt = Math.min(Math.max(0.16 * r, 0.04), 1.5);

    // Binet-form photon acceleration in Cartesian coordinates:
    //     a = -(3/2) h^2 x / r^5
    // This is exact Schwarzschild bending and puts the photon sphere at
    // r = 1.5 where it belongs. The widely-copied u'' = -u(1 - 1.5 u^2) form
    // expands to a photon sphere at 1.2247, which is wrong.
    //
    // Leapfrog (kick-drift-kick), NOT Euler: at this step size Euler visibly
    // spirals escaping rays into the hole and thickens the shadow.
    let k = (-1.5 * h2) / (r2 * r2 * r);
    v[0] += x[0] * k * 0.5 * dt;
    v[1] += x[1] * k * 0.5 * dt;
    v[2] += x[2] * k * 0.5 * dt;

    x[0] += v[0] * dt;
    x[1] += v[1] * dt;
    x[2] += v[2] * dt;

    r2 = x[0] * x[0] + x[1] * x[1] + x[2] * x[2];
    r = Math.sqrt(r2);
    k = (-1.5 * h2) / (r2 * r2 * r);
    v[0] += x[0] * k * 0.5 * dt;
    v[1] += x[1] * k * 0.5 * dt;
    v[2] += x[2] * k * 0.5 * dt;

    // --- thin-disk plane crossing.
    // A bent ray crosses the disk plane two to four times. Those extra
    // crossings ARE the lensed arc over the top of the shadow.
    const s = x[0] * n[0] + x[1] * n[1] + x[2] * n[2];
    if (s * sPrev < 0 && trans > 0.02) {
      const tc = sPrev / (sPrev - s);
      const xc = [
        xPrev[0] + (x[0] - xPrev[0]) * tc,
        xPrev[1] + (x[1] - xPrev[1]) * tc,
        xPrev[2] + (x[2] - xPrev[2]) * tc,
      ];
      const rc = Math.hypot(xc[0], xc[1], xc[2]);

      if (rc > R_IN && rc < R_OUT) {
        const band =
          smoothstep(R_IN, R_IN * 1.25, rc) * (1 - smoothstep(R_OUT * 0.7, R_OUT, rc));
        const phi = Math.atan2(xc[0] * e2[0] + xc[1] * e2[1] + xc[2] * e2[2], xc[0]);

        const kep = Math.pow(R_IN / rc, 1.5); // Kepler: omega ~ r^-3/2
        const gloc = Math.sqrt(Math.max(1 - 1.5 / rc, 0.02)); // time dilation

        const M = ARMS;
        const yy = (phi * M) / TAU + rc * SHEAR - time * kep * gloc * 5.0;
        const sn =
          vnoiseWrapY(rc * RFREQ, yy, M) * 0.65 +
          vnoiseWrapY(rc * RFREQ * 0.36, yy * 0.5 + 7.0, M) * 0.35;

        // orbital velocity direction = n x xc
        const gd = [
          n[1] * xc[2] - n[2] * xc[1],
          n[2] * xc[0] - n[0] * xc[2],
          n[0] * xc[1] - n[1] * xc[0],
        ];
        const gdl = Math.hypot(gd[0], gd[1], gd[2]) || 1;
        const vl = Math.hypot(v[0], v[1], v[2]) || 1;
        const cosang =
          (gd[0] * v[0] + gd[1] * v[1] + gd[2] * v[2]) / (gdl * vl);

        const beta = Math.min(1 / Math.sqrt(Math.max(2 * (rc - 1), 0.2)), 0.99);
        const g = gloc / Math.max(1 + beta * cosang, 0.05); // Doppler + gravitational

        const xpr = Math.max(1 - Math.sqrt(R_IN / rc), 0);
        const tprof = (Math.pow(R_IN / rc, 0.75) * Math.pow(xpr, 0.25)) / 0.488;

        const density = band * (FLOOR + GAIN * Math.pow(sn, POW));
        // tprof^2, not tprof^4: bolometric I ~ T^4 collapses to one bright
        // cell once quantised to 13 glyphs.
        emit += trans * Number(process.env.BH_EMIT ?? 2.2) * density * tprof * tprof * Math.pow(g, BEAM);
        trans *= 1 - Math.min(Math.max(OPACITY * density, 0), 1);
      }
    }
    sPrev = s;
    xPrev = [x[0], x[1], x[2]];
  }

  // Rays still winding near the photon sphere when the step budget ran out are
  // as good as captured. This one line is what keeps the shadow edge clean.
  if (!captured && x[0] * x[0] + x[1] * x[1] + x[2] * x[2] < 4.0) captured = true;

  const L = 1 - Math.exp(-emit * Number(process.env.BH_TONE ?? 1.7));

  // Analytic photon-ring coverage, from the true impact parameter.
  const ringCov = Math.exp(-Math.pow((b - B_CRIT) / RING_W, 2));

  return { L, ringCov, captured };
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * Braille render. Each cell is a 2x4 dot matrix (U+2800-28FF), so this carries
 * eight times the effective resolution of the ramp on the same grid.
 *
 * Unicode's dot numbering is not raster order:
 *   dot1 (0,0)=0x01  dot4 (1,0)=0x08
 *   dot2 (0,1)=0x02  dot5 (1,1)=0x10
 *   dot3 (0,2)=0x04  dot6 (1,2)=0x20
 *   dot7 (0,3)=0x40  dot8 (1,3)=0x80
 */
function ign(x, y) {
  // Interleaved gradient noise. Bayer's 8x8 grid aligns with the 2x4 Braille
  // cell structure and shows up as a hard 4-column repeat; IGN has no periodic
  // structure but is still a pure function of position, so it never shimmers
  // between frames the way white noise would.
  return (52.9829189 * (0.06711056 * x + 0.00583715 * y)) % 1;
}

export function renderBraille(cols, rows, time = 0) {
  RING_W = Math.max(Number(process.env.BH_RINGW ?? 0.45) * ((2 * SCALE) / rows), 0.05);
  const black = Number(process.env.BH_BLACK ?? 0.18);
  const gam = Number(process.env.BH_GAMMA ?? 1.05);
  const out = [];

  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      let bits = 0;
      for (let sx = 0; sx < 2; sx++) {
        for (let sy = 0; sy < 4; sy++) {
          const dx = col * 2 + sx;
          const dy = row * 4 + sy;
          const fx = (dx + 0.5) / (cols * 2);
          const fy = (dy + 0.5) / (rows * 4);
          let cx = fx * 2 - 1;
          const cy = 1 - fy * 2;
          cx *= (cols / rows) * CELL_ASPECT;
          const t = trace(cx * SCALE, cy * SCALE, time);
          const lit = Math.min(t.L + t.ringCov * 1.1 * (0.35 + 0.65 * t.L), 1);
          const norm = Math.min(Math.max((lit - black) / (1 - black), 0), 1);
          if (Math.pow(norm, gam) > ign(dx, dy)) {
            bits |= sy < 3 ? 1 << (sy + 3 * sx) : 0x40 << sx;
          }
        }
      }
      line += String.fromCharCode(0x2800 + bits);
    }
    // U+2800 is a blank Braille cell, not a space: trailing ones still occupy a
    // column, so trimming them would shorten the row and shear the grid.
    out.push(line.replace(/\u2800+$/, ""));
  }
  return out.join("\n");
}

export function render(cols, rows, time = 0, supersample = 2) {
  const out = [];
  const N = RAMP.length;

  // Force the photon ring to at least one cell wide, or it strobes and crawls
  // between grid sizes. One cell in world units is 2*SCALE/rows.
  RING_W = Math.max(Number(process.env.BH_RINGW ?? 0.45) * ((2 * SCALE) / rows), 0.05);

  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      let L = 0;
      let ring = 0;

      for (let sy = 0; sy < supersample; sy++) {
        for (let sx = 0; sx < supersample; sx++) {
          const fx = (col + (sx + 0.5) / supersample) / cols;
          const fy = (row + (sy + 0.5) / supersample) / rows;

          // cell space -> aspect-corrected world plane. Skip the aspect
          // correction and the photon ring renders as an ellipse.
          let cx = fx * 2 - 1;
          let cy = 1 - fy * 2;
          cx *= (cols / rows) * CELL_ASPECT;

          const s = trace(cx * SCALE, cy * SCALE, time);
          L += s.L;
          ring += s.ringCov;
        }
      }
      const n = supersample * supersample;
      L /= n;
      ring /= n;

      // The photon ring is light from the disk wrapped a full turn, so it is
      // brightest where the disk behind it is brightest. Adding it to the field
      // keeps that modulation; stamping it as a constant would draw a circle.
      const lit = Math.min(L + ring * RING_GAIN * (0.35 + 0.65 * L), 1);

      // Black point, then a mild gamma. The photographic 1/2.2 curve LIFTS
      // darks, which on a bright-object-against-empty-sky image smears the
      // disk's faint outer halo into fog across the whole frame. Subtracting a
      // floor first gives back real empty sky.
      const black = Number(process.env.BH_BLACK ?? 0.12);
      const gam = Number(process.env.BH_GAMMA ?? 0.75);
      const norm = Math.min(Math.max((lit - black) / (1 - black), 0), 1);
      let idx = Math.round(Math.pow(norm, gam) * (N - 1));

      // Only the core of the ring is forced, so it stays unbroken and exactly
      // one cell wide without becoming a drawn outline.
      if (ring > RING_T) idx = Math.max(idx, N - 1);

      line += RAMP[idx];
    }
    out.push(line.replace(/\s+$/, ""));
  }
  return out.join("\n");
}

const COLS = Number(process.env.BH_COLS ?? 148);
const ROWS = Number(process.env.BH_ROWS ?? 46);

const BRAILLE = process.env.BH_RAMP !== "1";
const art = BRAILLE ? renderBraille(COLS, ROWS, 0) : render(COLS, ROWS, 0);
mkdirSync(join(ROOT, "public", "static"), { recursive: true });
writeFileSync(join(ROOT, "public", "static", "blackhole.txt"), art, "utf8");

const cells = COLS * ROWS;
process.stdout.write(art + "\n");
console.error(
  `\nbaked public/static/blackhole.txt  ${COLS}x${ROWS} = ${cells} cells` +
    (BRAILLE ? ` (${cells * 8} braille dots)` : "") +
    `, ${Buffer.byteLength(art, "utf8")} bytes`,
);
