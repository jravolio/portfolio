import { CLASS_SLOTS, CLS } from "./classes.mjs";
import { PALETTE } from "./ink";

const f = (n: number) => n.toFixed(1);

export const GEOMETRY_VERT = `
precision highp float;
in vec3 position;
in vec3 normal;
in vec3 aTag;
#ifdef INSTANCED
in mat4 instanceMatrix;
#endif
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vWorldNormal;
out vec3 vViewNormal;
out vec3 vTag;

void main() {
  mat4 m = modelMatrix;
  vTag = aTag;
  #ifdef INSTANCED
  m = m * instanceMatrix;
  vTag.z = fract(aTag.z + float(gl_InstanceID) * 0.137);
  #endif
  vWorldNormal = normalize(mat3(m) * normal);
  vViewNormal = normalize(mat3(viewMatrix) * vWorldNormal);
  gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.0);
}
`;

export const BAT_VERT = `
precision highp float;
in vec3 position;
in vec4 aSeed;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uSwarm;
uniform vec3 uRoost;
uniform vec3 uTargets[3];
out vec3 vWorldNormal;
out vec3 vViewNormal;
out vec3 vTag;

vec3 batAt(float t) {
  float a = t * (0.3 + aSeed.x * 0.45) + aSeed.y * 6.2832;
  float r = 5.0 + aSeed.z * 15.0;
  vec3 orbit = uRoost + vec3(
    cos(a) * r,
    sin(a * 1.7 + aSeed.w * 6.2832) * 4.0 + (aSeed.w - 0.6) * 18.0,
    sin(a) * r
  );

  vec3 target = uTargets[int(floor(aSeed.x * 2.999))];
  float u = fract(t * 0.035 * (0.6 + aSeed.z) + aSeed.y);
  vec3 lane = mix(uRoost, target, u);
  vec3 side = normalize(cross(target - uRoost, vec3(0.0, 1.0, 0.0)));
  lane.y += sin(u * 3.1416) * 14.0 * (0.3 + aSeed.w);
  lane += side * sin(u * 16.0 + aSeed.w * 6.2832) * (1.5 + aSeed.z * 5.0);
  lane.y += cos(u * 23.0 + aSeed.x * 9.0) * 1.4;

  return mix(orbit, lane, uSwarm);
}

void main() {
  vec3 here = batAt(uTime);
  vec3 ahead = batAt(uTime + 0.06);
  vec3 f = normalize(ahead - here + vec3(0.0001));
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
  vec3 u = cross(f, r);
  float flap = sin(uTime * (13.0 + aSeed.z * 7.0) + aSeed.y * 20.0);
  vec3 p = position * (1.1 + aSeed.w * 0.8);
  p.y += abs(p.x) * flap * 0.75;
  vec3 world = here + r * p.x + u * p.y + f * p.z;
  vWorldNormal = vec3(0.0, 1.0, 0.0);
  vViewNormal = vec3(0.0, 0.0, 1.0);
  vTag = vec3(${f(CLS.shade)}, 0.04, fract(aSeed.x * 7.0 + aSeed.y));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

// Channels: r = lit tone, g = material class, b = object id. The ink pass reads classes and ids back, so both targets must stay unfiltered.
export const GEOMETRY_FRAG = `
precision highp float;
layout(location = 0) out vec4 gData;
layout(location = 1) out vec4 gNormal;
in vec3 vWorldNormal;
in vec3 vViewNormal;
in vec3 vTag;
uniform vec3 uLight;

void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 vn = normalize(vViewNormal);
  if (!gl_FrontFacing) {
    n = -n;
    vn = -vn;
  }
  float cls = floor(vTag.x + 0.5);
  float lit = vTag.y * (0.26 + 0.74 * max(dot(n, uLight), 0.0));
  if (cls == ${f(CLS.light)} || cls == ${f(CLS.moon)}) lit = vTag.y;
  gData = vec4(lit, (cls + 0.5) / ${f(CLASS_SLOTS)}, vTag.z, 1.0);
  gNormal = vec4(vn * 0.5 + 0.5, 1.0);
}
`;

export const INK_VERT = `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const INK_FRAG = `
precision highp float;
uniform sampler2D tData;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform mat4 uInvViewProj;
uniform vec3 uCam;
uniform vec3 uMoon;
uniform vec3 uPal[${PALETTE.length}];
uniform vec3 uInk;
uniform vec3 uSkyTop;
uniform vec3 uSkyBot;
uniform vec3 uFog;
uniform vec3 uMist;
uniform vec3 uChalk;
uniform vec3 uGlow;
uniform float uWobble;
uniform float uLine;
uniform float uInkAlpha;
uniform float uGrain;
uniform float uFogDensity;
uniform float uMistAmt;
uniform float uShadeLo;
uniform float uShadeHi;
uniform float uBoil;
uniform float uVignette;
in vec2 vUv;
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += vnoise(p) * a;
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return s / 0.9375;
}

float linearDepth(float z) {
  float n = z * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - n * (uFar - uNear));
}

float classOf(vec4 d) {
  return floor(d.g * ${f(CLASS_SLOTS)});
}

float solid(vec4 d) {
  float c = classOf(d);
  return (c < 0.5 || c == ${f(CLS.moon)}) ? 0.0 : 1.0;
}

float hatch(vec2 p, float angle, float spacing, float thick, float frame) {
  vec2 across = vec2(cos(angle), sin(angle));
  vec2 along = vec2(-across.y, across.x);
  float a = dot(p, along);
  float v = dot(p, across) / spacing;
  float row = floor(v);
  v += (vnoise(vec2(a / 70.0, row * 7.1 + frame)) - 0.5) * 0.55;
  float f = abs(fract(v) - 0.5) * 2.0;
  float stroke = 1.0 - smoothstep(thick, thick + 0.32, f);
  float lift = smoothstep(0.22, 0.42, vnoise(vec2(a / 34.0, row * 3.7 + frame * 0.5)));
  return stroke * lift;
}

vec3 skyColor(vec2 uv, vec2 px, float frame) {
  vec3 c = mix(uSkyBot, uSkyTop, smoothstep(0.2, 0.95, uv.y));
  float cloud = fbm(vec2(px.x / 620.0 + uTime * 0.004, px.y / 150.0));
  float wisp = smoothstep(0.5, 0.78, cloud);

  float halo = exp(-distance(px, uMoon.xy) / 240.0) * uMoon.z;
  c = mix(c, uChalk, halo * 0.34);
  c = mix(c, uSkyBot * 1.25, wisp * 0.5);
  float chalk = hatch(px, 1.66, 9.0, 0.14, frame) * wisp;
  c = mix(c, uChalk, chalk * 0.16);
  vec2 cell = floor(px / 2.0);
  float star = step(0.9991, hash21(cell)) * step(0.35, uv.y) * (1.0 - wisp);
  c = mix(c, uChalk, star * (0.5 + 0.5 * sin(uTime * 1.3 + hash21(cell + 3.0) * 40.0)));
  return c;
}

void main() {
  vec2 px = vUv * uRes / uScale;
  float frame = floor(uTime * uBoil);
  vec2 wobble = vec2(
    vnoise(px / 42.0 + frame * 7.3),
    vnoise(px / 42.0 + 91.7 + frame * 3.1)
  ) - 0.5;
  wobble += (vec2(vnoise(px / 9.0 + frame * 1.7), vnoise(px / 9.0 + 33.0 + frame * 5.9)) - 0.5) * 0.35;
  vec2 uv = vUv + wobble * uWobble * uScale / uRes;

  vec4 data = texture(tData, uv);
  float cls = classOf(data);
  float tone = data.r;
  bool sky = cls < 0.5;
  bool distant = sky || cls == ${f(CLS.moon)};

  vec2 o = uLine * uScale / uRes;
  vec2 ua = uv + o;
  vec2 ub = uv - o;
  vec2 uc = uv + o * vec2(1.0, -1.0);
  vec2 ud = uv + o * vec2(-1.0, 1.0);
  vec4 ta = texture(tData, ua);
  vec4 tb = texture(tData, ub);
  vec4 tc = texture(tData, uc);
  vec4 td = texture(tData, ud);

  // Edges only count next to something solid, so most sky pixels skip the depth and normal reads.
  float edge = 0.0;
  if (max(max(solid(ta), solid(tb)), max(solid(tc), solid(td))) > 0.5) {
    float da = linearDepth(textureLod(tDepth, ua, 0.0).x);
    float db = linearDepth(textureLod(tDepth, ub, 0.0).x);
    float dc = linearDepth(textureLod(tDepth, uc, 0.0).x);
    float dd = linearDepth(textureLod(tDepth, ud, 0.0).x);
    vec3 n0 = textureLod(tNormal, uv, 0.0).xyz * 2.0 - 1.0;
    vec3 na = textureLod(tNormal, ua, 0.0).xyz * 2.0 - 1.0;
    vec3 nb = textureLod(tNormal, ub, 0.0).xyz * 2.0 - 1.0;
    vec3 nc = textureLod(tNormal, uc, 0.0).xyz * 2.0 - 1.0;
    vec3 nd = textureLod(tNormal, ud, 0.0).xyz * 2.0 - 1.0;

    float graze = 1.0 - clamp(abs(n0.z), 0.0, 1.0);
    float depthLimit = mix(0.012, 0.3, graze * graze);
    float depthStep = (abs(da - db) + abs(dc - dd)) / min(min(da, db), min(dc, dd));
    float edgeDepth = smoothstep(depthLimit, depthLimit * 1.8, depthStep);
    float edgeNormal = smoothstep(0.5, 0.9, length(na - nb) + length(nc - nd));
    float tagStep = abs(ta.b - tb.b) + abs(tc.b - td.b) + abs(ta.g - tb.g) + abs(tc.g - td.g);
    float edgeTag = smoothstep(0.002, 0.012, tagStep);
    edge = max(edgeDepth, max(edgeNormal, edgeTag));
  }

  float fog = 0.0;
  float mist = 0.0;
  if (!distant) {
    float rawZ = textureLod(tDepth, uv, 0.0).x;
    vec4 world4 = uInvViewProj * vec4(uv * 2.0 - 1.0, rawZ * 2.0 - 1.0, 1.0);
    vec3 world = world4.xyz / world4.w;
    float dist = length(world - uCam);
    fog = 1.0 - exp(-dist * uFogDensity);
    float low = exp(-max(world.y + 3.0, 0.0) / 10.0);
    float drift = fbm(world.xz * 0.03 + vec2(uTime * 0.014, uTime * 0.006));
    mist = low * smoothstep(0.3, 0.72, drift) * smoothstep(12.0, 80.0, dist) * uMistAmt;
  }

  vec3 base = uPal[int(cls)];
  float shade = mix(uShadeLo, uShadeHi, tone);
  float dark = 1.0 - tone;
  bool flatClass = cls == ${f(CLS.light)} || cls == ${f(CLS.moon)};
  vec3 col;

  if (sky) {
    col = skyColor(vUv, px, frame);
  } else {
    col = flatClass ? base : base * shade;
    if (cls == ${f(CLS.light)}) col *= 0.84 + 0.16 * vnoise(vec2(data.b * 91.0, uTime * 2.6));
    if (!flatClass) {
      float inkHatch = hatch(px, 0.72, 5.0, 0.3, frame) * smoothstep(0.5, 0.68, dark);
      inkHatch = max(inkHatch, hatch(px, -0.62, 5.0, 0.3, frame) * smoothstep(0.72, 0.86, dark));
      col = mix(col, uInk, inkHatch * 0.7);
      float chalk = hatch(px, 0.95, 6.0, 0.2, frame) * smoothstep(0.52, 0.8, tone);
      float takes = cls == ${f(CLS.shade)} || cls == ${f(CLS.cloth)} ? 0.0 : 1.0;
      col = mix(col, uChalk, chalk * 0.42 * takes);
    }
    if (cls == ${f(CLS.water)}) {
      float glint = hatch(px, 1.5708, 9.0, 0.12, frame) * smoothstep(0.55, 0.8, vnoise(px / vec2(60.0, 7.0) + uTime * 0.15));
      col = mix(col, uChalk, glint * 0.5);
    }
  }

  float glow = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    vec2 dir = vec2(cos(a), sin(a)) * uScale / uRes;
    float c7 = classOf(texture(tData, uv + dir * 7.0));
    float c17 = classOf(texture(tData, uv + dir * 17.0));
    glow += step(${f(CLS.light - 0.5)}, c7) * step(c7, ${f(CLS.light + 0.5)});
    glow += 0.6 * step(${f(CLS.light - 0.5)}, c17) * step(c17, ${f(CLS.light + 0.5)});
  }
  glow = glow / 12.8;

  col = mix(col, uFog, fog);
  col = mix(col, uMist, mist);
  if (cls != ${f(CLS.light)}) col = mix(col, uGlow, glow * 0.55);

  float veil = (1.0 - fog * 0.8) * (1.0 - mist * 0.85);
  col = mix(col, uInk, edge * uInkAlpha * veil);

  float grain = fbm(px * 0.85) - 0.5;
  float fibre = vnoise(px * vec2(0.035, 0.9)) - 0.5;
  col *= 1.0 - uGrain * (grain * 1.6 + fibre * 0.5);
  float corner = smoothstep(0.45, 1.05, length((vUv - 0.5) * vec2(1.15, 1.0)) * 1.5);
  col *= 1.0 - uVignette * corner;

  outColor = vec4(col, 1.0);
}
`;
