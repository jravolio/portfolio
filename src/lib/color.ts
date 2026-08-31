export type RGB = [number, number, number];

/**
 * Resolve any CSS colour - including `oklch()`, which nothing else here can
 * parse - to 8-bit RGB, by laundering it through the browser's own colour
 * parser via a 1x1 canvas.
 *
 * `fillStyle` is assigned twice on purpose: an invalid value leaves the
 * property untouched, so seeding a known colour first means a bad token
 * produces black rather than silently inheriting the previous glyph's colour.
 */
export function resolveCssColor(value: string, fallback: string): RGB {
  const ctx = scratch();
  ctx.fillStyle = "#000";
  ctx.fillStyle = value || fallback;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
}

let ctx2d: CanvasRenderingContext2D | null = null;

/** One canvas for the life of the page. Theme flips resolve three tokens each,
 *  and allocating a canvas per token is three throwaway canvases per flip. */
function scratch(): CanvasRenderingContext2D {
  if (!ctx2d) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    ctx2d = c.getContext("2d", { willReadFrequently: true })!;
  }
  return ctx2d;
}

export const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

export const toUnit = ([r, g, b]: RGB): RGB => [r / 255, g / 255, b / 255];
