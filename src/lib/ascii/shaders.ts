export const VERT = /* glsl */ `#version 300 es
precision highp float;
const vec2 P[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`;

/* ==========================================================================
   PASS 1 - the field.

   A spiral galaxy. Logarithmic arms over an exponential disk and a Sersic
   bulge, inclined and projected.

   The arms rotate as a DENSITY WAVE (Lin & Shu 1964), not as material. The
   pattern turns rigidly at a constant pattern speed while the gas and stars
   orbit at their own, radius-dependent rate. That is the real resolution of
   the winding problem: material arms in a differentially rotating disk would
   coil themselves out of existence within a couple of galactic years.
   Rotating the pattern rigidly is both the physics and the only thing that
   looks stable over a long-running loop.
   ========================================================================== */
export const FIELD_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2  uField;        // supersampled field resolution
uniform float uCellAspect;   // MEASURED advance/lineHeight. 0.5 for Departure Mono.
uniform float uGridAspect;   // cols/rows
uniform float uScale;        // disk scale lengths per half-grid-height
uniform float uIncl;         // inclination; 0 = face on
uniform float uTime;
uniform vec2  uCenter;

out vec4 fragColor;

const float TAU = 6.28318530718;

// Sa-Sc galaxies average a pitch angle at or under 15.5 degrees, opening up
// toward later Hubble types. 19 degrees sits in Sc territory: tighter than this
// and the arms fall below the glyph resolution and read as concentric rings.
const float PITCH = 0.331;          // radians, ~19 degrees
const float ARMS  = 2.0;            // m=2, a grand-design spiral
const float R_DISK = 1.0;           // exponential disk scale length
const float R_BULGE = 0.14;         // Sersic effective radius
const float DE_VAUC = 7.669;        // Sersic n=4 normalisation

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  return vnoise(p) * 0.6 + vnoise(p * 2.1 + 7.3) * 0.3 + vnoise(p * 4.7 + 19.1) * 0.1;
}

void main() {
  vec2 c = (gl_FragCoord.xy / uField) * 2.0 - 1.0;
  // Cell space -> aspect-corrected screen. Skip this and a face-on galaxy
  // renders as an ellipse purely from the 2:1 character cell.
  c.x *= uGridAspect * uCellAspect;
  vec2 p = (c - uCenter) * uScale;

  // De-project: the disk is a circle in its own plane, squashed on screen by
  // the inclination. Dividing y back out recovers disk coordinates.
  float ci = max(cos(uIncl), 0.12);
  vec2 d = vec2(p.x, p.y / ci);

  float r = length(d);
  float th = atan(d.y, d.x);

  // --- structure ---------------------------------------------------------
  // Exponential disk, Sigma(R) = Sigma_0 exp(-R/Rs).
  float disk = exp(-r / R_DISK);

  // de Vaucouleurs bulge, the n=4 Sersic case.
  float bulge = exp(-DE_VAUC * (pow(max(r, 0.02) / R_BULGE, 0.25) - 1.0));

  // --- the density wave --------------------------------------------------
  // A logarithmic spiral has a constant pitch angle: theta = ln(r/a)/tan(p).
  // Subtracting a rigid uTime term rotates the PATTERN, leaving the arms
  // permanently open instead of winding up.
  float armPhase = log(max(r, 0.04)) / tan(PITCH);
  float wave = cos(ARMS * (th - armPhase) - uTime * 0.22);

  // Sharpen the sinusoid into arms with real gaps between them.
  float arm = pow(max(wave, 0.0), 2.2);

  // Dust lanes sit just inside the arms, where the gas piles up on the
  // leading edge of the wave. Offsetting the phase is what puts them there.
  float dustWave = cos(ARMS * (th - armPhase) - uTime * 0.22 + 0.55);
  float dust = pow(max(dustWave, 0.0), 3.5) * smoothstep(0.15, 0.6, r);

  // --- texture -----------------------------------------------------------
  // Material orbits differentially even though the pattern does not, so the
  // clumping shears while the arms hold. A flat rotation curve means the
  // angular rate falls as 1/r.
  float orbit = th - uTime * 0.5 / max(r, 0.22);
  vec2 tex = vec2(cos(orbit), sin(orbit)) * r;
  float clumps = fbm(tex * 3.4 + 11.0);
  float hii = smoothstep(0.62, 0.95, fbm(tex * 7.0 + 3.0)) * arm;

  float L = bulge * 0.7
          + disk * (0.25 + 1.9 * arm) * (0.5 + 1.0 * clumps)
          + hii * 0.7;

  L *= 1.0 - 0.6 * dust * disk;

  // Faint field stars, fixed to the sky rather than the disk.
  float star = step(0.9975, hash(floor(gl_FragCoord.xy * 0.5)));
  L += star * 0.5;

  L = 1.0 - exp(-L * 1.9);

  // Accent mask. Bulges really are red-yellow (old stellar populations) and
  // arms blue-white (young hot stars), so tinting the nucleus and the HII
  // regions is the astronomically correct way to spend the second colour.
  float accent = clamp(bulge * 1.4 + hii * 0.8, 0.0, 1.0);

  fragColor = vec4(L, accent, 0.0, 1.0);
}
`;

/* ==========================================================================
   PASS 2 - quantise.

   Box-downsamples the supersampled field to the cell grid, runs a Sobel in
   CELL space to pick directional glyphs, applies ordered dither to the ramp
   index, and holds the previous frame's index for temporal hysteresis.
   ========================================================================== */
export const QUANT_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uField;
uniform sampler2D uPrev;
uniform vec2  uGrid;        // cols, rows
uniform float uSS;          // supersample factor
uniform float uRampCount;
uniform float uCellAspect;
uniform float uEdgeThresh;
uniform float uHysteresis;
uniform float uFirstFrame;
uniform float uBlack;
uniform float uGamma;
uniform float uBraille;   // 1 = 2x4 sub-cell mode

out vec4 fragColor;

// 4x4 Bayer. Deterministic in screen space so it does not shimmer under motion.
const float BAYER[16] = float[16](
   0.0,  8.0,  2.0, 10.0,
  12.0,  4.0, 14.0,  6.0,
   3.0, 11.0,  1.0,  9.0,
  15.0,  7.0, 13.0,  5.0
);

// Box-average one cell out of the supersampled field. Sampling a single texel
// (the naive floor(uv*grid)/grid) aliases and crawls on animated content.
vec4 cell(vec2 id) {
  vec4 acc = vec4(0.0);
  float n = 0.0;
  for (int j = 0; j < 4; j++) {
    if (float(j) >= uSS) break;
    for (int i = 0; i < 4; i++) {
      if (float(i) >= uSS) break;
      vec2 p = (id * uSS + vec2(float(i), float(j)) + 0.5) / (uGrid * uSS);
      acc += texture(uField, p);
      n += 1.0;
    }
  }
  return acc / max(n, 1.0);
}

float lum(vec2 id) { return cell(clamp(id, vec2(0.0), uGrid - 1.0)).r; }

// Interleaved gradient noise as the per-dot threshold. Bayer's 8x8 grid aligns
// with the 2x4 Braille cell structure and shows up as a hard 4-column repeat;
// IGN has no periodic structure but is still a pure function of position, so it
// never shimmers between frames the way white noise would.
float ign(vec2 p) {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

/**
 * One Braille cell. The field is rendered at 2x horizontally and 4x vertically
 * so every dot maps to exactly one field texel - no averaging, no guessing.
 *
 * Unicode's dot numbering is not raster order:
 *   dot1 (0,0)=0x01  dot4 (1,0)=0x08
 *   dot2 (0,1)=0x02  dot5 (1,1)=0x10
 *   dot3 (0,2)=0x04  dot6 (1,2)=0x20
 *   dot7 (0,3)=0x40  dot8 (1,3)=0x80
 */
float brailleCell(vec2 id, float black, float gamma) {
  float bits = 0.0;
  for (int sx = 0; sx < 2; sx++) {
    for (int sy = 0; sy < 4; sy++) {
      // gl_FragCoord is bottom-up; Braille rows read top-down.
      vec2 sub = vec2(id.x * 2.0 + float(sx), id.y * 4.0 + float(3 - sy));
      vec4 f = texture(uField, (sub + 0.5) / (uGrid * vec2(2.0, 4.0)));

      float L = pow(clamp((f.r - black) / (1.0 - black), 0.0, 1.0), gamma);
      if (L > ign(sub)) {
        bits += (sy < 3) ? exp2(float(sy + 3 * sx)) : exp2(float(6 + sx));
      }
    }
  }
  return bits;
}

void main() {
  vec2 id = floor(gl_FragCoord.xy);

  if (uBraille > 0.5) {
    vec4 c = cell(id);
    fragColor = vec4(brailleCell(id, uBlack, uGamma) / 255.0, c.g, 0.0, 1.0);
    return;
  }

  vec4 f = cell(id);

  float L = clamp(f.r, 0.0, 1.0);
  float accent = f.g;

  // --- Sobel in cell space ------------------------------------------------
  float tl = lum(id + vec2(-1.0,  1.0)), tc = lum(id + vec2(0.0,  1.0)), tr = lum(id + vec2(1.0,  1.0));
  float ml = lum(id + vec2(-1.0,  0.0)),                                 mr = lum(id + vec2(1.0,  0.0));
  float bl = lum(id + vec2(-1.0, -1.0)), bc = lum(id + vec2(0.0, -1.0)), br = lum(id + vec2(1.0, -1.0));

  float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
  float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
  float mag = length(vec2(gx, gy));

  // Cells are 2:1 tall, so a '/' depicts a ~60deg line in SCREEN space. The
  // gradient has to be rescaled into cell space before the atan or every
  // directional glyph points the wrong way.
  vec2 e = vec2(-gy, gx);
  e.y *= (1.0 / uCellAspect);
  float ang = mod(atan(e.y, e.x), 3.14159265);
  float bin = mod(floor(ang / 3.14159265 * 4.0 + 0.5), 4.0);

  // --- ramp index ---------------------------------------------------------
  float N = uRampCount;
  // Black point, then a mild gamma. The photographic 1/2.2 curve LIFTS darks,
  // which on a bright-object-against-empty-sky image smears the disk's faint
  // outer halo into fog across the entire frame. Subtracting a floor first is
  // what gives back real empty sky.
  float lp = pow(clamp((L - uBlack) / (1.0 - uBlack), 0.0, 1.0), uGamma);

  // Ordered dither on the INDEX. Buys ~2 perceived levels on smooth gradients
  // for free.
  int bi = int(mod(gl_FragCoord.x, 4.0)) + 4 * int(mod(gl_FragCoord.y, 4.0));
  float dither = BAYER[bi] / 16.0 - 0.5;

  float fidx = lp * (N - 1.0) + dither;
  float idx = clamp(floor(fidx + 0.5), 0.0, N - 1.0);

  // --- temporal hysteresis ------------------------------------------------
  // Cells sitting on a quantisation boundary otherwise flip glyph every frame,
  // which is the single worst artefact in animated ASCII.
  float prev = texture(uPrev, (id + 0.5) / uGrid).r * 255.0;
  if (uFirstFrame < 0.5 && prev < N && abs(fidx - prev) < uHysteresis) idx = prev;

  // Directional glyphs live past the ramp, addressed by index. Gated hard, or
  // the whole disk turns into slashes and it reads as a filter, not a render.
  float outIdx = idx;
  if (mag > uEdgeThresh && L > 0.06) outIdx = N + bin;

  // R: glyph index. G: accent mask, for the colour pass.
  fragColor = vec4(outIdx / 255.0, accent, 0.0, 1.0);
}
`;

/* ==========================================================================
   PASS 3 - composite.

   One full-screen quad sampling a NEAREST glyph atlas. No readback, ever:
   gl.readPixels on the frame you just drew forces a GPU->CPU sync stall.
   ========================================================================== */
export const GLYPH_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2  uGrid;
uniform vec2  uResolution;
uniform vec2  uAtlasGrid;   // glyphs per row, rows
uniform vec3  uInk;      // disk / structure
uniform vec3  uAccent;   // photon ring + headline
uniform float uOpacity;

out vec4 fragColor;

void main() {
  vec2 p = gl_FragCoord.xy / uResolution;
  vec2 g = p * uGrid;
  vec2 id = floor(g);
  vec2 f = fract(g);
  f.y = 1.0 - f.y;

  vec4 c = texture(uCells, (id + 0.5) / uGrid);
  float idx = floor(c.r * 255.0 + 0.5);

  vec2 slot = vec2(mod(idx, uAtlasGrid.x), floor(idx / uAtlasGrid.x));
  vec2 auv = (slot + vec2(f.x, 1.0 - f.y)) / uAtlasGrid;
  float ink = texture(uAtlas, auv).a;

  vec3 col = mix(uInk, uAccent, clamp(c.g + c.b * 0.9, 0.0, 1.0));
  fragColor = vec4(col, ink * uOpacity);
}
`;
