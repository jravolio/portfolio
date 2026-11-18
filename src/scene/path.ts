import * as THREE from "three";
import { CARDS, type StopId } from "@/data/resume";
import { BALCONY, BRIDGE, MILL, SCRIBE, TOWER_TOP, WATCH } from "./landmarks";
import { CRAG, GATE_Z, WATER_Y, clamp01, height, riverZ, roadX } from "./terrain";

export const STOP_IDS: readonly (StopId | "hero" | "study" | "gate")[] = [
  "hero",
  ...CARDS.map((card) => card.id),
  "study",
  "gate",
];

type Vec = [number, number, number];
// A stop with `via` is a waypoint the camera passes through between two real stops, to steer it around the castle.
type Stop = { pos: Vec; subject: Vec; fov: number; aside: number; via?: true };

const UP = new THREE.Vector3(0, 1, 0);
// Horizontal half-angle of the 36 degree lens on a 16:10 screen.
const HALF_WIDTH = Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) * 1.6);

const bridgeCamX = BRIDGE.x - 40;

const STOPS: Stop[] = [
  { pos: [-46, 30, 78], subject: [CRAG.x, CRAG.top + 24, CRAG.z], fov: 36, aside: 0.25 },
  {
    pos: [BALCONY.x - 5.5, BALCONY.y + 3, BALCONY.z + 15],
    subject: [BALCONY.x, BALCONY.y + 1.7, BALCONY.z + 0.9],
    fov: 36,
    aside: 0.42,
  },
  { pos: [CRAG.x + 44, CRAG.top + 52, CRAG.z - 4], subject: [TOWER_TOP.x, TOWER_TOP.y - 14, TOWER_TOP.z], fov: 38, aside: 0.3, via: true },
  {
    pos: [TOWER_TOP.x + 34, TOWER_TOP.y + 12, TOWER_TOP.z - 40],
    subject: [TOWER_TOP.x, TOWER_TOP.y - 12, TOWER_TOP.z],
    fov: 40,
    aside: 0.5,
  },
  { pos: [CRAG.x - 78, CRAG.top + 50, CRAG.z + 6], subject: [SCRIBE.x - 8, 6, SCRIBE.z - 10], fov: 38, aside: 0.3, via: true },
  { pos: [SCRIBE.x - 34, 12, SCRIBE.z + 32], subject: [SCRIBE.x - 2, 10, SCRIBE.z], fov: 36, aside: 0.44 },
  {
    pos: [bridgeCamX, WATER_Y + 10, riverZ(bridgeCamX) + 3],
    subject: [BRIDGE.x, 0, BRIDGE.z],
    fov: 36,
    aside: 0.42,
  },
  { pos: [MILL.x - 30, 8, MILL.z + 36], subject: [MILL.x - 1, 5, MILL.z + 3], fov: 36, aside: 0.44 },
  { pos: [WATCH.x - 44, 12, GATE_Z - 50], subject: [WATCH.x, 19, GATE_Z], fov: 36, aside: 0.44 },
  { pos: [-14, 48, 96], subject: [CRAG.x, CRAG.top + 22, CRAG.z], fov: 15, aside: 0.4 },
  { pos: [roadX(168) - 6, 6, 168], subject: [roadX(GATE_Z) + 2, 16, GATE_Z], fov: 38, aside: 0.2 },
];

export const CAMERA_SPOTS = STOPS.map(({ pos: [x, y, z] }) => {
  return new THREE.Vector3(x, Math.max(y, height(x, z) + 2.5), z);
});

export const SIGHTLINES = STOPS.map(({ subject }, i) => {
  return new THREE.Line3(CAMERA_SPOTS[i], new THREE.Vector3(...subject));
});

function lookPoints(wide: boolean) {
  return STOPS.map(({ subject, aside, fov }, i) => {
    const pos = CAMERA_SPOTS[i];
    const dir = new THREE.Vector3(...subject).sub(pos);
    if (wide) {
      const half = HALF_WIDTH * (fov / 36);
      dir.applyAxisAngle(UP, Math.atan(aside * Math.tan(half)));
    } else {
      dir.y -= dir.length() * 0.16;
    }
    return dir.add(pos);
  });
}

const positions = new THREE.CatmullRomCurve3(CAMERA_SPOTS, false, "centripetal");
const wideTargets = new THREE.CatmullRomCurve3(lookPoints(true), false, "centripetal");
const tallTargets = new THREE.CatmullRomCurve3(lookPoints(false), false, "centripetal");
const scratch = new THREE.Vector3();

const KNOTS = STOPS.flatMap((stop, i) => (stop.via ? [] : [i]));
const LAST = KNOTS.length - 1;

if (KNOTS.length !== STOP_IDS.length) {
  throw new Error(`${KNOTS.length} camera stops for ${STOP_IDS.length} sections`);
}

export function poseAt(progress: number, aspect: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const p = THREE.MathUtils.clamp(progress, 0, LAST);
  const from = Math.min(Math.floor(p), LAST - 1);
  const knot = KNOTS[from] + (KNOTS[from + 1] - KNOTS[from]) * (p - from);
  const t = knot / (STOPS.length - 1);
  positions.getPoint(t, pos);
  wideTargets.getPoint(t, look);
  const wide = clamp01((aspect - 0.8) / 0.6);
  if (wide < 1) look.lerp(tallTargets.getPoint(t, scratch), 1 - wide);
  const floor = height(pos.x, pos.z) + 2;
  if (pos.y < floor) pos.y = floor;
  const i = Math.min(Math.floor(knot), STOPS.length - 2);
  const fov = STOPS[i].fov + (STOPS[i + 1].fov - STOPS[i].fov) * (knot - i);
  return fov * (1 + (1 - wide) * 0.5);
}
