// The terrain mesh, everything standing on it and the camera path all read this one height function, so they cannot disagree.

export const CRAG = { x: 26, z: -92, top: 52 } as const;
export const GATE_Z = 118;
export const WATER_Y = -5;

export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Unlike GLSL smoothstep, the edges may come in either order.
export function sstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += vnoise(x, y) * amp;
    norm += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return sum / norm;
}

function roadCurve(z: number) {
  return -6 + 10 * Math.sin(z * 0.03);
}

const CROSSING_Z = 57;

// The road runs dead straight over the river so it lines up with the bridge deck.
export function roadX(z: number) {
  const straight = sstep(24, 13, Math.abs(z - CROSSING_Z));
  return roadCurve(z) + (roadCurve(54) - roadCurve(z)) * straight;
}

export function riverZ(x: number) {
  return 55 + 0.22 * x + 6 * Math.sin(x * 0.06);
}

function valleyHalfWidth(z: number) {
  return 58 - 30 * sstep(70, 122, z) - 14 * sstep(-40, -120, z);
}

export function riverCarve(x: number, z: number) {
  return sstep(10, 3.5, Math.abs(z - riverZ(x)));
}

const STAIR_TOP = { x: CRAG.x, z: CRAG.z + 15.5 };
export const STAIR_FOOT = { x: roadX(-36), z: -36 };
const STAIR_RUN = Math.hypot(STAIR_FOOT.x - STAIR_TOP.x, STAIR_FOOT.z - STAIR_TOP.z);

export function stairPoint(t: number) {
  return {
    x: STAIR_TOP.x + (STAIR_FOOT.x - STAIR_TOP.x) * t,
    z: STAIR_TOP.z + (STAIR_FOOT.z - STAIR_TOP.z) * t,
  };
}

const STAIR_FOOT_Y = natural(STAIR_FOOT.x, STAIR_FOOT.z);

export function stairHeight(t: number) {
  return CRAG.top + (STAIR_FOOT_Y - CRAG.top) * t;
}

// The castle stair is graded into the ground itself: a cutting where the rock is higher, a ramp where it is lower. Steps laid on it can then never float or sink.
export function height(x: number, z: number) {
  const h = natural(x, z);
  const along =
    ((x - STAIR_TOP.x) * (STAIR_FOOT.x - STAIR_TOP.x) + (z - STAIR_TOP.z) * (STAIR_FOOT.z - STAIR_TOP.z)) /
    (STAIR_RUN * STAIR_RUN);
  const t = clamp01(along);
  const on = stairPoint(t);
  const dist = Math.hypot(x - on.x, z - on.z);
  if (dist > 9) return h;
  return h + (stairHeight(t) - h) * sstep(8.5, 4.2, dist);
}

function natural(x: number, z: number) {
  const w = valleyHalfWidth(z);
  const side = sstep(w, w + 75, Math.abs(x) + (fbm(x * 0.02, z * 0.02) - 0.5) * 36);
  const north = sstep(-128, -210, z + (fbm(x * 0.015, 3.3) - 0.5) * 40);
  const south = sstep(150, 260, z) * 0.25;
  const rise = Math.max(side, north, south);
  let h = Math.pow(rise, 1.25) * 105 * (0.65 + 0.7 * fbm(x * 0.011 + 5, z * 0.011));

  h += (fbm(x * 0.05, z * 0.05) - 0.5) * 5 * (0.35 + rise * 2.2);
  h += (fbm(x * 0.2, z * 0.2, 2) - 0.5) * 0.8;

  const r = Math.hypot(x - CRAG.x, z - CRAG.z);
  const ragged = r + (fbm(x * 0.09, z * 0.09) - 0.5) * 14;
  const column = sstep(47, 23, ragged);
  h = Math.max(h, Math.pow(column, 0.75) * CRAG.top);
  const ledge = 8;
  const stepped = (Math.floor(h / ledge) + sstep(0.5, 0.92, h / ledge - Math.floor(h / ledge))) * ledge;
  h += (stepped - h) * 0.75 * sstep(0.05, 0.3, column);
  h += (CRAG.top - h) * sstep(25, 20, r);

  h -= riverCarve(x, z) * 9 * (1 - rise);
  return h;
}
