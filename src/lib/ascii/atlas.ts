/**
 * Glyph atlas + measured luminance ramp.
 *
 * The ramp is MEASURED, never hand-ordered. `@` covers 0.42 of its cell in one
 * monospace face and 0.58 in another; assuming an order is why naive ASCII
 * renders look muddy in the midtones. We rasterise every candidate once at
 * boot (~2ms), integrate its alpha, and sort by actual ink coverage.
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
  "\u00b7",
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
  "\u2591", // light shade   0.418
  "\u2580", // upper half    0.438
  "\u2584", // lower half    0.506
  "\u2592", // medium shade  0.746
] as const;

/**
 * Appended after the ramp, addressed by index rather than by coverage. The
 * glyph pass swaps these in where the field has a strong directional edge.
 * Order matters: it maps to the quantised edge angle 0..3.
 */
export const EDGE_GLYPHS = ["_", "/", "|", "\\"] as const;

export type Atlas = {
  texture: HTMLCanvasElement;
  /** total glyphs */
  count: number;
  /** glyphs per atlas row. 256 Braille cells in one row would be 3584px at
   *  DPR 2; a 16x16 grid keeps it well inside every texture-size limit. */
  atlasCols: number;
  atlasRows: number;
  /** how many of those are ramp glyphs (the rest are directional) */
  rampCount: number;
  cellW: number;
  cellH: number;
  coverage: number[];
  chars: string[];
};

/**
 * True if the face actually contains the glyph. A substituted fallback renders
 * at the fallback's advance width, which silently breaks the 7px lattice, so a
 * missing glyph has to be dropped rather than measured.
 */
function isSupported(fontFamily: string, ch: string): boolean {
  if (ch === " ") return true;
  const probe = document.createElement("span");
  probe.textContent = ch;
  probe.style.cssText = "position:absolute;visibility:hidden;font-size:100px;white-space:pre";
  probe.style.fontFamily = fontFamily;
  document.body.appendChild(probe);
  const withFace = probe.getBoundingClientRect().width;
  probe.style.fontFamily = "monospace";
  const withFallback = probe.getBoundingClientRect().width;
  probe.remove();
  return Math.abs(withFace - withFallback) > 0.5;
}

function measureCoverage(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
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
  pctx.font = font;
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";

  const measured = RAMP_POOL.filter((ch) => isSupported(fontFamily, ch)).map((ch) => ({
    ch,
    cov: ch === " " ? 0 : measureCoverage(pctx, ch, cellW, cellH),
  }));

  // Sort by real coverage, then drop any glyph whose coverage is within 1.5% of
  // its predecessor: near-duplicates waste a ramp step and cause the midtones
  // to band.
  measured.sort((a, b) => a.cov - b.cov);
  const ramp: { ch: string; cov: number }[] = [];
  for (const m of measured) {
    const prev = ramp[ramp.length - 1];
    if (!prev || m.cov - prev.cov > 0.028) ramp.push(m);
  }

  const chars = [...ramp.map((r) => r.ch), ...EDGE_GLYPHS];
  const count = chars.length;
  const atlasCols = count;
  const atlasRows = 1;

  const canvas = document.createElement("canvas");
  canvas.width = cellW * atlasCols;
  canvas.height = cellH * atlasRows;
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

  return {
    texture: canvas,
    count,
    atlasCols,
    atlasRows,
    rampCount: ramp.length,
    cellW,
    cellH,
    coverage: ramp.map((r) => r.cov),
    chars,
  };
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

  if (!isSupported(fontFamily, "\u28FF")) {
    throw new Error(`font "${fontFamily}" has no Braille patterns`);
  }

  const atlasCols = 16;
  const atlasRows = 16;

  const canvas = document.createElement("canvas");
  canvas.width = cellW * atlasCols;
  canvas.height = cellH * atlasRows;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  // Commit Mono is not a pixel font, so a fractional size is fine here. Pick
  // the size whose full-block glyph best fills the cell without clipping.
  const probe = document.createElement("canvas");
  probe.width = cellW;
  probe.height = cellH;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";
  let best = 12 * scale;
  let bestCov = 0;
  for (let px = 10 * scale; px <= 20 * scale; px += scale * 0.5) {
    pctx.font = `${px}px ${fontFamily}`;
    const cov = measureCoverage(pctx, "\u28FF", cellW, cellH);
    if (cov > bestCov) {
      bestCov = cov;
      best = px;
    }
  }
  ctx.font = `${best}px ${fontFamily}`;

  for (let i = 0; i < 256; i++) {
    const col = i % atlasCols;
    const row = Math.floor(i / atlasCols);
    ctx.fillText(
      String.fromCharCode(0x2800 + i),
      col * cellW + cellW / 2,
      row * cellH + cellH / 2,
    );
  }

  return {
    texture: canvas,
    count: 256,
    atlasCols,
    atlasRows,
    rampCount: 256,
    cellW,
    cellH,
    coverage: [],
    chars: [],
  };
}
