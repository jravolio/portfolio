/**
 * Glyph atlas + measured luminance ramp.
 *
 * The ramp is MEASURED, never hand-ordered. `@` covers 0.42 of its cell in one
 * monospace face and 0.58 in another; assuming an order is why naive ASCII
 * renders look muddy in the midtones. We rasterise every candidate once at
 * boot, integrate its alpha, and sort by actual ink coverage.
 */

/**
 * Candidate pool. Ordering here is irrelevant - it gets sorted by measured
 * coverage - but membership is not.
 *
 * The block elements matter more than the punctuation: measured in Departure
 * Mono the punctuation ramp tops out at 0.284 coverage (`#`), which renders
 * every bright region as the same washed-out grey. The blocks carry it to
 * 0.929 and give the disk an actual dense end.
 */
export const RAMP_POOL = [
  " ",
  ".",
  "·",
  ":",
  "-",
  "=",
  "+",
  "*",
  "o",
  "O",
  "%",
  "@",
  "#",
  "░", // light shade   0.418
  "▀", // upper half    0.438
  "▄", // lower half    0.506
  "▒", // medium shade  0.746
] as const;

/**
 * Appended after the ramp, addressed by index rather than by coverage. The
 * glyph pass swaps these in where the field has a strong directional edge.
 * Order matters: it maps to the quantised edge angle 0..3.
 */
export const EDGE_GLYPHS = ["_", "/", "|", "\\"] as const;

/** Exactly what the renderer reads. Anything else was invented to satisfy the
 *  type and had to be faked by whichever builder did not have it. */
export type Atlas = {
  texture: HTMLCanvasElement;
  /** glyphs per atlas row, and rows. 256 Braille cells in one row would be
   *  3584px at DPR 2; a 16x16 grid keeps it inside every texture-size limit. */
  atlasCols: number;
  atlasRows: number;
  /** how many glyphs the ramp addresses before the directional ones */
  rampCount: number;
};

/**
 * True if the face actually contains the glyph. A substituted fallback renders
 * at the fallback's advance width, which silently breaks the 7px lattice, so a
 * missing glyph has to be dropped rather than measured.
 *
 * Compared on the 2D context rather than a DOM probe: appending a span and
 * reading getBoundingClientRect forces a full synchronous layout, and this runs
 * once per ramp candidate at hero mount.
 */
function isSupported(
  ctx: CanvasRenderingContext2D,
  fontFamily: string,
  ch: string,
): boolean {
  if (ch === " ") return true;
  // Large size so a sub-pixel advance difference cannot round the two together.
  ctx.font = `200px ${fontFamily}`;
  const withFace = ctx.measureText(ch).width;
  ctx.font = "200px monospace";
  const withFallback = ctx.measureText(ch).width;
  return Math.abs(withFace - withFallback) > 0.5;
}

function measureCoverage(
  ctx: CanvasRenderingContext2D,
  ch: string,
  w: number,
  h: number,
): number {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillText(ch, w / 2, h / 2);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 3; i < d.length; i += 4) sum += d[i];
  return sum / (255 * w * h);
}

/**
 * Build the atlas at device resolution.
 *
 * Departure Mono is an 11px pixel font on a 50-unit grid. Rasterising it at
 * anything other than an integer multiple of 11 renders it blurry and every
 * reason to use the face evaporates, so the atlas scale is always an integer.
 */
export function buildAtlas(fontFamily: string, dpr: number): Atlas {
  const scale = Math.max(1, Math.round(dpr));
  const cellW = 7 * scale;
  const cellH = 14 * scale;
  const fontPx = 11 * scale;
  const font = `${fontPx}px ${fontFamily}`;

  const probe = document.createElement("canvas");
  probe.width = cellW;
  probe.height = cellH;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";

  const supported = RAMP_POOL.filter((ch) => isSupported(pctx, fontFamily, ch));
  pctx.font = font;
  const measured = supported.map((ch) => ({
    ch,
    cov: ch === " " ? 0 : measureCoverage(pctx, ch, cellW, cellH),
  }));

  // Sort by real coverage, then drop any glyph whose coverage is within 2.8% of
  // its predecessor: near-duplicates waste a ramp step and cause the midtones
  // to band.
  measured.sort((a, b) => a.cov - b.cov);
  const ramp: string[] = [];
  let prevCov = -1;
  for (const m of measured) {
    if (prevCov < 0 || m.cov - prevCov > 0.028) {
      ramp.push(m.ch);
      prevCov = m.cov;
    }
  }

  const chars = [...ramp, ...EDGE_GLYPHS];
  const atlasCols = chars.length;

  const canvas = document.createElement("canvas");
  canvas.width = cellW * atlasCols;
  canvas.height = cellH;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  // The pixel font must not be antialiased into the atlas; hard edges are the
  // entire point of the face.
  ctx.imageSmoothingEnabled = false;
  chars.forEach((ch, i) => {
    if (ch === " ") return;
    ctx.fillText(ch, i * cellW + cellW / 2, cellH / 2);
  });

  return { texture: canvas, atlasCols, atlasRows: 1, rampCount: ramp.length };
}

/**
 * Braille atlas: the full U+2800-28FF block, 256 patterns.
 *
 * Each cell is a 2x4 dot matrix, so a Braille render carries EIGHT times the
 * effective resolution of a ramp render on the same character grid. That is
 * the entire reason to do it: the field stops looking like text standing in for
 * a picture and starts looking like a picture.
 *
 * Departure Mono has 0 of the 256 patterns (measured from its cmap), so this
 * MUST come from Commit Mono. A missing glyph would be substituted by the
 * fallback face at the fallback's advance width, silently breaking the 7px
 * lattice - which is exactly what `isSupported` exists to prevent.
 */
export function buildBrailleAtlas(fontFamily: string, dpr: number): Atlas {
  const scale = Math.max(1, Math.round(dpr));
  const cellW = 7 * scale;
  const cellH = 14 * scale;

  const atlasCols = 16;
  const atlasRows = 16;

  const canvas = document.createElement("canvas");
  canvas.width = cellW * atlasCols;
  canvas.height = cellH * atlasRows;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  if (!isSupported(ctx, fontFamily, "⣿")) {
    throw new Error(`font "${fontFamily}" has no Braille patterns`);
  }

  // Commit Mono is not a pixel font, so a fractional size is fine here. Size the
  // full-block pattern's ink box to the cell in one measurement, rather than
  // sweeping sizes and integrating alpha at each: getImageData is a canvas flush
  // plus a pass over every byte, and this used to do 21 of them at mount.
  const REF = 100 * scale;
  ctx.font = `${REF}px ${fontFamily}`;
  const m = ctx.measureText("⣿");
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const fit = Math.min(cellW / inkW, cellH / inkH) * REF * 0.98;
  ctx.font = `${fit}px ${fontFamily}`;

  for (let i = 0; i < 256; i++) {
    const col = i % atlasCols;
    const row = Math.floor(i / atlasCols);
    ctx.fillText(String.fromCharCode(0x2800 + i), col * cellW + cellW / 2, row * cellH + cellH / 2);
  }

  return { texture: canvas, atlasCols, atlasRows, rampCount: 256 };
}
