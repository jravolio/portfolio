export const VERT = /* glsl */ `#version 300 es
precision highp float;
const vec2 P[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`;

/* ==========================================================================
   PASS 1 - the field.

   A backwards Schwarzschild null-geodesic integrator, one photon per
   supersample. Escaped rays land on a sky plane carrying the headline
   texture, which is what produces the lensed name and its mirrored copy
   inside the Einstein ring.
   ========================================================================== */
export const FIELD_FRAG = /* glsl */ `#version 300 es
precision highp float;

#define N_STEPS_MAX 64

uniform vec2  uField;        // supersampled field resolution
uniform float uCellAspect;   // MEASURED advance/lineHeight. 0.5 for Departure Mono.
uniform float uGridAspect;   // cols/rows
uniform float uScale;        // r_s per half-grid-height
uniform float uIncl;
uniform float uTime;
uniform vec2  uParallax;
uniform vec2  uCenter;      // where the hole sits, in normalised screen units
uniform int   uSteps;
uniform sampler2D uSky;      // the headline, rendered to a texture
uniform float uSkyZ;
uniform float uRingW;
uniform float uNameGain;

out vec4 fragColor;

const float R_IN    = 3.0;
const float R_OUT   = 11.0;
const float B_CRIT  = 2.598076211;   // 3*sqrt(3)/2 - the APPARENT shadow radius
const float BEAM    = 1.9;
const float OPACITY = 0.9;
const float TAU     = 6.28318530718;

float hash2(vec2 p) {
  return fract(sin(p.x * 127.1 + p.y * 311.7) * 43758.5453);
}

// Wrapped on an integer period in y. Without the wrap the atan branch cut
// shows up as a hard radial seam across the disk.
float vnoiseWrapY(vec2 p, float period) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, period);
  float y1 = mod(y0 + 1.0, period);
  float a = hash2(vec2(i.x, y0));
  float b = hash2(vec2(i.x + 1.0, y0));
  float c = hash2(vec2(i.x, y1));
  float d = hash2(vec2(i.x + 1.0, y1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 c = (gl_FragCoord.xy / uField) * 2.0 - 1.0;
  // Cell space -> aspect-corrected world plane. Skip this and the photon ring
  // renders as an ellipse.
  c.x *= uGridAspect * uCellAspect;
  vec2 pr = (c - uCenter) * uScale + uParallax;

  // Orthographic. A perspective camera was tried and removed: at a few thousand
  // glyphs the extra depth cue does not survive quantisation, and the diverging
  // rays smear the disk's outer halo into fog across the whole frame.
  float Z0 = R_OUT + 6.0;
  vec3 x = vec3(pr, Z0);
  vec3 v = vec3(0.0, 0.0, -1.0);

  // Conserved angular momentum, computed ONCE. The acceleration is parallel to
  // x, so h^2 is exactly conserved; recomputing it per step from a drifting
  // cross product makes the photon ring wobble.
  float h2 = dot(pr, pr);

  float ci = cos(uIncl), si = sin(uIncl);
  vec3 n  = vec3(0.0, si, ci);
  vec3 e2 = vec3(0.0, ci, -si);

  float emit = 0.0, trans = 1.0;
  float sPrev = dot(x, n);
  vec3  xPrev = x;
  bool  captured = false;

  for (int i = 0; i < N_STEPS_MAX; i++) {
    if (i >= uSteps) break;

    float r2 = dot(x, x);
    if (r2 < 1.0) { captured = true; break; }
    if (x.z < -Z0 && v.z < 0.0) break;

    float r = sqrt(r2);
    float dt = clamp(0.16 * r, 0.04, 1.5);

    // Binet-form photon acceleration:  a = -(3/2) h^2 x / r^5
    // Exact Schwarzschild bending, photon sphere at r = 1.5.
    // Leapfrog, NOT Euler: at this step size Euler spirals escaping rays into
    // the hole and visibly thickens the shadow.
    vec3 a = -1.5 * h2 * x / (r2 * r2 * r);
    v += a * (0.5 * dt);
    x += v * dt;
    r2 = dot(x, x); r = sqrt(r2);
    a  = -1.5 * h2 * x / (r2 * r2 * r);
    v += a * (0.5 * dt);

    // Thin-disk plane crossing. A bent ray crosses two to four times, and
    // those extra crossings ARE the lensed arc over the shadow.
    float s = dot(x, n);
    if (s * sPrev < 0.0 && trans > 0.02) {
      float tc = sPrev / (sPrev - s);
      vec3  xc = mix(xPrev, x, tc);
      float rc = length(xc);
      if (rc > R_IN && rc < R_OUT) {
        float band = smoothstep(R_IN, R_IN * 1.25, rc)
                   * (1.0 - smoothstep(R_OUT * 0.70, R_OUT, rc));
        float phi  = atan(dot(xc, e2), xc.x);
        float kep  = pow(R_IN / rc, 1.5);                  // Kepler
        float gloc = sqrt(max(1.0 - 1.5 / rc, 0.02));      // time dilation

        const float M = 19.0;
        float yy = phi * (M / TAU) + rc * 0.84 - uTime * kep * gloc * 5.0;
        float sn = vnoiseWrapY(vec2(rc * 2.8, yy), M) * 0.65
                 + vnoiseWrapY(vec2(rc, yy * 0.5 + 7.0), M) * 0.35;

        vec3  gasdir = normalize(cross(n, xc));
        float beta   = clamp(inversesqrt(max(2.0 * (rc - 1.0), 0.2)), 0.0, 0.99);
        float g      = gloc / max(1.0 + beta * dot(gasdir, normalize(v)), 0.05);
        float xpr    = max(1.0 - sqrt(R_IN / rc), 0.0);
        float tprof  = pow(R_IN / rc, 0.75) * pow(xpr, 0.25) / 0.488;

        float density = band * (0.10 + 2.1 * sn * sn);
        // tprof^2, not tprof^4: bolometric I ~ T^4 collapses to a single bright
        // cell once quantised to a dozen glyphs.
        emit  += trans * 2.5 * density * tprof * tprof * pow(g, BEAM);
        trans *= 1.0 - clamp(OPACITY * density, 0.0, 1.0);
      }
    }
    sPrev = s;
    xPrev = x;
  }

  // Rays still winding near the photon sphere when the budget ran out are as
  // good as captured. This single line keeps the shadow edge clean at low step
  // counts.
  if (!captured && dot(x, x) < 4.0) captured = true;

  // --- the sky plane: the headline, lensed -------------------------------
  float nameL = 0.0;
  if (!captured && v.z < -0.001) {
    float t = (x.z - uSkyZ) / (-v.z);
    if (t > 0.0) {
      vec2 hit = (x + v * t).xy;
      // uCenter is added back so the plate stays fixed to the viewport while
      // the hole is offset: only lensing should bend the headline.
      vec2 uv = (hit / (uScale * 2.0) + uCenter) * 0.5 + 0.5;
      if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) {
        nameL = texture(uSky, vec2(uv.x, 1.0 - uv.y)).r * trans * uNameGain;
      }
    }
  }

  float diskL = 1.0 - exp(-emit * 1.7);

  // Analytic photon-ring coverage, carried separately so the quantiser can keep
  // the ring exactly one cell wide instead of letting it dither.
  float rr = length(pr);
  float ringCov = exp(-pow((rr - B_CRIT) / uRingW, 2.0));

  fragColor = vec4(diskL, ringCov, nameL, 1.0);
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
      float L = clamp(max(f.r, f.b) + f.g * 1.1 * (0.35 + 0.65 * f.r), 0.0, 1.0);
      L = pow(clamp((L - black) / (1.0 - black), 0.0, 1.0), gamma);
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
    fragColor = vec4(
      brailleCell(id, uBlack, uGamma) / 255.0,
      clamp(c.b * 1.6, 0.0, 1.0),
      c.g,
      1.0
    );
    return;
  }

  vec4 f = cell(id);

  float diskL = f.r;
  float ring  = f.g;
  float nameL = f.b;

  // The photon ring is disk light wrapped a full turn, so it is brightest where
  // the disk behind it is brightest. Adding it preserves that modulation;
  // stamping a constant would draw a geometric circle.
  float L = clamp(diskL + nameL * (1.0 - diskL) + ring * 1.1 * (0.35 + 0.65 * diskL), 0.0, 1.0);

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

  // Ordered dither on the INDEX, suppressed on the ring so the ring never
  // dithers. Buys ~2 perceived levels on the smooth haze for free.
  int bi = int(mod(gl_FragCoord.x, 4.0)) + 4 * int(mod(gl_FragCoord.y, 4.0));
  float dither = (BAYER[bi] / 16.0 - 0.5) * (1.0 - clamp(ring * 2.0, 0.0, 1.0));

  float fidx = lp * (N - 1.0) + dither;
  float idx = clamp(floor(fidx + 0.5), 0.0, N - 1.0);

  // --- temporal hysteresis ------------------------------------------------
  // Cells sitting on a quantisation boundary otherwise flip glyph every frame,
  // which is the single worst artefact in animated ASCII.
  float prev = texture(uPrev, (id + 0.5) / uGrid).r * 255.0;
  if (uFirstFrame < 0.5 && prev < N && abs(fidx - prev) < uHysteresis) idx = prev;

  // Ring core forced to the densest ramp glyph: unbroken, exactly one cell.
  if (ring > 0.55) idx = N - 1.0;

  // Directional glyphs live past the ramp, addressed by index. Gated hard, or
  // the whole disk turns into slashes and it reads as a filter, not a render.
  float outIdx = idx;
  if (mag > uEdgeThresh && ring < 0.4 && L > 0.06) outIdx = N + bin;

  // R: glyph index. G: how much of this cell is the lensed headline.
  // B: ring coverage, for the colour pass.
  fragColor = vec4(outIdx / 255.0, clamp(nameL * 1.6, 0.0, 1.0), ring, 1.0);
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
