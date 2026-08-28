import { buildAtlas, type Atlas } from "./atlas";
import { FIELD_FRAG, GLYPH_FRAG, QUANT_FRAG, VERT } from "./shaders";

export type Tier = 0 | 1 | 2 | 3;

const TIERS: Record<Tier, { steps: number; ss: number; maxCols: number }> = {
  0: { steps: 64, ss: 2, maxCols: 300 },
  1: { steps: 40, ss: 2, maxCols: 260 },
  2: { steps: 24, ss: 1, maxCols: 260 },
  3: { steps: 20, ss: 1, maxCols: 110 },
};

export type RendererOptions = {
  canvas: HTMLCanvasElement;
  headline: string;
  fontFamily: string;
  onStats?: (s: Stats) => void;
};

export type Stats = {
  cols: number;
  rows: number;
  steps: number;
  frameMs: number;
  incl: number;
  tier: Tier;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, frag: string) {
  const p = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`link failed: ${gl.getProgramInfoLog(p)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

function makeTarget(gl: WebGL2RenderingContext, w: number, h: number, filter: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

/**
 * Renders the headline into a texture. This becomes the sky plane behind the
 * hole, so escaped geodesics project it: the name bends around the shadow and
 * a mirrored copy appears inside the Einstein ring.
 */
function makeSkyTexture(gl: WebGL2RenderingContext, text: string, fontFamily: string) {
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // Two lines, set left of frame at roughly the size of the real <h1> beside
  // it. The plane is mapped 1:1 onto the visible world extent, so an
  // undeflected ray reproduces the name at true size and only rays passing
  // near the hole bend it - which is the whole point.
  const words = text.split(" ");
  const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [text];
  const size = 96;
  ctx.font = `${size}px ${fontFamily}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, W * 0.045, H * 0.5 + (i - (lines.length - 1) / 2) * size * 1.15);
  });

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export function createRenderer(opts: RendererOptions) {
  const { canvas, headline, fontFamily, onStats } = opts;

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const atlas: Atlas = buildAtlas(fontFamily, window.devicePixelRatio || 1);

  const atlasTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas.texture);
  // NEAREST: the pixel font must not be smeared by the sampler.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const skyTex = makeSkyTexture(gl, headline, fontFamily);

  const pField = program(gl, FIELD_FRAG);
  const pQuant = program(gl, QUANT_FRAG);
  const pGlyph = program(gl, GLYPH_FRAG);
  const vao = gl.createVertexArray();

  let tier: Tier = 1;
  let cols = 0;
  let rows = 0;
  let field: ReturnType<typeof makeTarget> | null = null;
  let cellsA: ReturnType<typeof makeTarget> | null = null;
  let cellsB: ReturnType<typeof makeTarget> | null = null;
  let firstFrame = true;

  let ink: [number, number, number] = [0.9, 0.84, 0.71];
  let accent: [number, number, number] = [1, 0.75, 0.07];
  let opacity = 1;

  let time = 0;
  // Near edge-on. This is what produces the Gargantua silhouette: the disk
  // crosses in front as a bright bar while its lensed far side arcs over the
  // top and its underside arcs beneath, closing a halo around the shadow.
  // Below ~1.35 the halo opens up and it reads as a tilted ring instead.
  let incl = 1.5;
  let inclTarget = 1.5;
  const parallax: [number, number] = [0, 0];
  let parallaxTarget: [number, number] = [0, 0];
  let spin = 1;
  let spinTarget = 1;
  let center: [number, number] = [0, 0];
  let scale = 12.6;

  const tune = { nameGain: 0.62, edge: 2.4, skyZ: -26.0 };
if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).__bh = tune;

let raf = 0;
  let running = false;
  let lastT = 0;
  let frameMs = 0;
  const probe: number[] = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const t = TIERS[tier];
    // Fixed cell, variable grid: the terminal model. Not fixed-cols with a
    // variable font size, because an 11px pixel font forbids fractional sizes.
    const nc = Math.max(56, Math.min(t.maxCols, Math.floor(rect.width / 7)));
    const nr = Math.max(20, Math.min(72, Math.floor(rect.height / 14)));
    if (nc === cols && nr === rows && field) return;
    cols = nc;
    rows = nr;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cols * 7 * dpr);
    canvas.height = Math.round(rows * 14 * dpr);

    for (const target of [field, cellsA, cellsB]) {
      if (target) {
        gl!.deleteTexture(target.tex);
        gl!.deleteFramebuffer(target.fbo);
      }
    }
    field = makeTarget(gl!, cols * t.ss, rows * t.ss, gl!.LINEAR);
    cellsA = makeTarget(gl!, cols, rows, gl!.NEAREST);
    cellsB = makeTarget(gl!, cols, rows, gl!.NEAREST);
    firstFrame = true;
  }

  function draw(dt: number) {
    if (!gl || !field || !cellsA || !cellsB) return;
    const t = TIERS[tier];

    // Exponential smoothing, frame-rate independent. A constant lerp factor
    // would move at different speeds on 60Hz and 120Hz displays.
    const k = 1 - Math.exp(-dt / 0.18);
    incl += (inclTarget - incl) * k;
    parallax[0] += (parallaxTarget[0] - parallax[0]) * k;
    parallax[1] += (parallaxTarget[1] - parallax[1]) * k;
    spin += (spinTarget - spin) * (1 - Math.exp(-dt / 0.45));
    time += dt * spin;

    const ringW = Math.max(0.45 * ((2 * scale) / rows), 0.05);

    // --- pass 1: the field
    gl.bindFramebuffer(gl.FRAMEBUFFER, field.fbo);
    gl.viewport(0, 0, field.w, field.h);
    gl.useProgram(pField);
    gl.uniform2f(gl.getUniformLocation(pField, "uField"), field.w, field.h);
    gl.uniform1f(gl.getUniformLocation(pField, "uCellAspect"), 0.5);
    gl.uniform1f(gl.getUniformLocation(pField, "uGridAspect"), cols / rows);
    gl.uniform1f(gl.getUniformLocation(pField, "uScale"), scale);
    gl.uniform1f(gl.getUniformLocation(pField, "uIncl"), incl);
    gl.uniform1f(gl.getUniformLocation(pField, "uTime"), time);
    gl.uniform2f(gl.getUniformLocation(pField, "uParallax"), parallax[0], parallax[1]);
    gl.uniform2f(gl.getUniformLocation(pField, "uCenter"), center[0], center[1]);
    gl.uniform1i(gl.getUniformLocation(pField, "uSteps"), t.steps);
    gl.uniform1f(gl.getUniformLocation(pField, "uRingW"), ringW);
    gl.uniform1f(gl.getUniformLocation(pField, "uNameGain"), tune.nameGain);
    gl.uniform2f(
      gl.getUniformLocation(pField, "uSkyRect"),
      (cols / rows) * 0.5 * scale,
      scale,
    );
    gl.uniform1f(gl.getUniformLocation(pField, "uSkyZ"), tune.skyZ);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTex);
    gl.uniform1i(gl.getUniformLocation(pField, "uSky"), 0);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- pass 2: quantise (ping-pong for temporal hysteresis)
    const src = cellsA;
    const dst = cellsB;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(pQuant);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field.tex);
    gl.uniform1i(gl.getUniformLocation(pQuant, "uField"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(gl.getUniformLocation(pQuant, "uPrev"), 1);
    gl.uniform2f(gl.getUniformLocation(pQuant, "uGrid"), cols, rows);
    gl.uniform1f(gl.getUniformLocation(pQuant, "uSS"), t.ss);
    gl.uniform1f(gl.getUniformLocation(pQuant, "uRampCount"), atlas.rampCount);
    gl.uniform1f(gl.getUniformLocation(pQuant, "uCellAspect"), 0.5);
    gl.uniform1f(gl.getUniformLocation(pQuant, "uEdgeThresh"), tune.edge);
    gl.uniform1f(gl.getUniformLocation(pQuant, "uHysteresis"), 0.575);
    gl.uniform1f(gl.getUniformLocation(pQuant, "uFirstFrame"), firstFrame ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    cellsA = dst;
    cellsB = src;
    firstFrame = false;

    // --- pass 3: composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(pGlyph);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cellsA.tex);
    gl.uniform1i(gl.getUniformLocation(pGlyph, "uCells"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(gl.getUniformLocation(pGlyph, "uAtlas"), 1);
    gl.uniform2f(gl.getUniformLocation(pGlyph, "uGrid"), cols, rows);
    gl.uniform2f(gl.getUniformLocation(pGlyph, "uResolution"), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(pGlyph, "uAtlasCount"), atlas.count);
    gl.uniform3fv(gl.getUniformLocation(pGlyph, "uInk"), ink);
    gl.uniform3fv(gl.getUniformLocation(pGlyph, "uAccent"), accent);
    gl.uniform1f(gl.getUniformLocation(pGlyph, "uOpacity"), opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now: number) {
    if (!running) return;
    // dt-driven, clamped. A constant increment would double the orbital speed
    // on a 120Hz display, and returning from a backgrounded tab would teleport
    // the disk half a revolution.
    const dt = Math.min((now - lastT) / 1000, 1 / 30);
    lastT = now;

    const t0 = performance.now();
    resize();
    draw(dt);
    frameMs = performance.now() - t0;

    // Demote on a rolling average over the first 30 frames.
    if (probe.length < 30) {
      probe.push(frameMs);
      if (probe.length === 30) {
        const avg = probe.reduce((a, b) => a + b, 0) / probe.length;
        if (avg > 12 && tier < 3) {
          tier = (tier + 1) as Tier;
          cols = 0;
          resize();
        }
      }
    }

    onStats?.({ cols, rows, steps: TIERS[tier].steps, frameMs, incl, tier });
    raf = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get isRunning() {
      return running;
    },
    /** Draw exactly one frame. Used for the paused and reduced-motion states. */
    tick() {
      resize();
      draw(0);
    },
    /** Move the hole off-centre in normalised screen units. */
    setCenter(x: number, y: number) {
      center = [x, y];
    },
    /** r_s per half-grid-height. Lower = the hole fills more of the frame. */
    setScale(v: number) {
      scale = v;
    },
    setTier(t: Tier) {
      if (t === tier) return;
      tier = t;
      cols = 0;
      resize();
    },
    setPointer(nx: number, ny: number) {
      // Pointer Y drives inclination: face-on spiral at the top of the
      // viewport, edge-on halo at the bottom. Two different silhouettes from
      // one control.
      // Kept inside the band where the halo stays closed.
      inclTarget = 1.42 + ny * 0.17;
      parallaxTarget = [nx * 1.6, -ny * 0.9];
    },
    setSpin(fast: boolean) {
      spinTarget = fast ? 3.2 : 1;
    },
    setColors(inkHex: [number, number, number], accentHex: [number, number, number], op: number) {
      ink = inkHex;
      accent = accentHex;
      opacity = op;
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      for (const target of [field, cellsA, cellsB]) {
        if (target) {
          gl.deleteTexture(target.tex);
          gl.deleteFramebuffer(target.fbo);
        }
      }
      gl.deleteTexture(atlasTex);
      gl.deleteTexture(skyTex);
      gl.deleteProgram(pField);
      gl.deleteProgram(pQuant);
      gl.deleteProgram(pGlyph);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export type Renderer = NonNullable<ReturnType<typeof createRenderer>>;
