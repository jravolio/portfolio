import { buildAtlas, buildBrailleAtlas, type Atlas } from "./atlas";
import { INCL, SCALE, TONE } from "./field-constants.mjs";
import { FIELD_FRAG, GLYPH_FRAG, QUANT_FRAG, VERT } from "./shaders";

/** Quality ladder. Only ever walked downward, by the frame-time probe. */
type Tier = 1 | 2 | 3;

const TIERS: Record<Tier, { ss: number; maxCols: number }> = {
  1: { ss: 2, maxCols: 260 },
  2: { ss: 1, maxCols: 260 },
  3: { ss: 1, maxCols: 110 },
};

type Mode = "ramp" | "braille";

/** Sobel magnitude above which a cell takes a directional glyph instead of a
 *  ramp step. Gated hard: lower and the whole disk turns into slashes. */
const EDGE_THRESHOLD = 2.4;

export type RendererOptions = {
  canvas: HTMLCanvasElement;
  fontFamily: string;
  /** Must contain U+2800-28FF. Departure Mono does not; Commit Mono does. */
  brailleFontFamily: string;
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

type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

/**
 * Link a program and resolve every uniform location once.
 *
 * getUniformLocation is a string-keyed lookup across the JS/native boundary and
 * through the command-buffer validator. Calling it per frame per uniform - 27 of
 * them across three passes - is ~1,600 lookups a second that all return the same
 * constants. Enumerating ACTIVE_UNIFORMS means there is no name list to keep in
 * sync with the GLSL either.
 */
function program(gl: WebGL2RenderingContext, frag: string): Program {
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

  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i)!.name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
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

export function createRenderer(opts: RendererOptions) {
  const { canvas, fontFamily, brailleFontFamily } = opts;

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const dprNow = window.devicePixelRatio || 1;
  let mode: Mode = "braille";
  let atlas: Atlas;
  try {
    atlas = buildBrailleAtlas(brailleFontFamily, dprNow);
  } catch {
    // Face has no Braille block. Fall back to the ramp rather than let the
    // browser substitute a face at the wrong advance width and break the
    // lattice. Write-once: nothing can switch modes after this point.
    atlas = buildAtlas(fontFamily, dprNow);
    mode = "ramp";
  }

  const atlasTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas.texture);
  // NEAREST: the pixel font must not be smeared by the sampler.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const pField = program(gl, FIELD_FRAG);
  const pQuant = program(gl, QUANT_FRAG);
  const pGlyph = program(gl, GLYPH_FRAG);
  const vao = gl.createVertexArray();

  const tone = TONE[mode];
  const braille = mode === "braille";

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
  let center: [number, number] = [0, 0];
  let scale: number = SCALE;

  let raf = 0;
  let running = false;
  let lastT = 0;
  const probe: number[] = [];

  // getBoundingClientRect inside rAF is a layout read, and the page around this
  // canvas mutates text on a timer, so every frame's read risks a forced
  // synchronous reflow of the whole document. Observe instead, and measure only
  // when the box has actually changed.
  let dirty = true;
  const ro = new ResizeObserver(() => {
    dirty = true;
  });
  ro.observe(canvas);

  function resize() {
    if (!dirty && field) return;
    dirty = false;

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
    const fx = braille ? 2 : t.ss;
    const fy = braille ? 4 : t.ss;
    field = makeTarget(gl!, cols * fx, rows * fy, gl!.LINEAR);
    cellsA = makeTarget(gl!, cols, rows, gl!.NEAREST);
    cellsB = makeTarget(gl!, cols, rows, gl!.NEAREST);
    firstFrame = true;
  }

  function draw(dt: number) {
    if (!gl || !field || !cellsA || !cellsB) return;
    const t = TIERS[tier];
    time += dt;

    // --- pass 1: the field
    gl.bindFramebuffer(gl.FRAMEBUFFER, field.fbo);
    gl.viewport(0, 0, field.w, field.h);
    gl.useProgram(pField.p);
    gl.uniform2f(pField.u.uField!, field.w, field.h);
    gl.uniform1f(pField.u.uGridAspect!, cols / rows);
    gl.uniform1f(pField.u.uScale!, scale);
    gl.uniform1f(pField.u.uIncl!, INCL);
    gl.uniform1f(pField.u.uTime!, time);
    gl.uniform2f(pField.u.uCenter!, center[0], center[1]);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- pass 2: quantise (ping-pong for temporal hysteresis)
    const src = cellsA;
    const dst = cellsB;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(pQuant.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field.tex);
    gl.uniform1i(pQuant.u.uField!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(pQuant.u.uPrev!, 1);
    gl.uniform2f(pQuant.u.uGrid!, cols, rows);
    gl.uniform1f(pQuant.u.uSS!, t.ss);
    gl.uniform1f(pQuant.u.uBraille!, braille ? 1 : 0);
    gl.uniform1f(pQuant.u.uRampCount!, atlas.rampCount);
    gl.uniform1f(pQuant.u.uEdgeThresh!, EDGE_THRESHOLD);
    gl.uniform1f(pQuant.u.uHysteresis!, 0.575);
    gl.uniform1f(pQuant.u.uFirstFrame!, firstFrame ? 1 : 0);
    gl.uniform1f(pQuant.u.uBlack!, tone.black);
    gl.uniform1f(pQuant.u.uGamma!, tone.gamma);
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
    gl.useProgram(pGlyph.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cellsA.tex);
    gl.uniform1i(pGlyph.u.uCells!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(pGlyph.u.uAtlas!, 1);
    gl.uniform2f(pGlyph.u.uGrid!, cols, rows);
    gl.uniform2f(pGlyph.u.uResolution!, canvas.width, canvas.height);
    gl.uniform2f(pGlyph.u.uAtlasGrid!, atlas.atlasCols, atlas.atlasRows);
    gl.uniform3fv(pGlyph.u.uInk!, ink);
    gl.uniform3fv(pGlyph.u.uAccent!, accent);
    gl.uniform1f(pGlyph.u.uOpacity!, opacity);
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

    // Demote on a rolling average over 30 frames, then re-arm and measure again
    // at the new tier. Without the reset the probe fires exactly once, so a
    // device too slow for tier 2 could never reach tier 3 and the bottom of the
    // ladder was unreachable config.
    if (probe.length < 30) {
      probe.push(performance.now() - t0);
      if (probe.length === 30) {
        const avg = probe.reduce((a, b) => a + b, 0) / probe.length;
        if (avg > 12 && tier < 3) {
          tier = (tier + 1) as Tier;
          dirty = true;
          cols = 0;
          resize();
          probe.length = 0;
        }
      }
    }

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
    /** Move the galaxy off-centre in normalised screen units. */
    setCenter(x: number, y: number) {
      center = [x, y];
    },
    /** Disk scale lengths per half-grid-height. Lower = it fills more of the frame. */
    setScale(v: number) {
      scale = v;
    },
    setColors(inkRgb: [number, number, number], accentRgb: [number, number, number], op: number) {
      ink = inkRgb;
      accent = accentRgb;
      opacity = op;
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const target of [field, cellsA, cellsB]) {
        if (target) {
          gl.deleteTexture(target.tex);
          gl.deleteFramebuffer(target.fbo);
        }
      }
      gl.deleteTexture(atlasTex);
      gl.deleteProgram(pField.p);
      gl.deleteProgram(pQuant.p);
      gl.deleteProgram(pGlyph.p);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export type Renderer = NonNullable<ReturnType<typeof createRenderer>>;
