import * as THREE from "three";
import { CRAG, GATE_Z, height, riverZ, roadX } from "./terrain";

export const MOON = new THREE.Vector3(150, 252, -430);
export const TOWER_TOP = new THREE.Vector3(CRAG.x - 4, CRAG.top + 60, CRAG.z - 3);
export const BALCONY = new THREE.Vector3(CRAG.x - 4, CRAG.top + 27, CRAG.z + 1.2);
export const SCRIBE = new THREE.Vector3(roadX(14) + 9, 0, 14);
export const BRIDGE = new THREE.Vector3(roadX(54), 0, riverZ(roadX(54)));
export const MILL = new THREE.Vector3(27, 0, riverZ(27) - 8.5);
export const WATCH = new THREE.Vector3(roadX(GATE_Z) + 9, 0, GATE_Z);

const CHURCH_Z = -22;
export const CHURCH = new THREE.Vector3(roadX(CHURCH_Z) - 19, 0, CHURCH_Z);
export const YARD = new THREE.Vector3(CHURCH.x + 16, 0, CHURCH_Z);
export const CRYPT = new THREE.Vector3(YARD.x - 12, 0, CHURCH_Z - 13);

export const VILLAGE_Z = 6;
export const WELL = new THREE.Vector3(roadX(VILLAGE_Z - 4) - 4.5, 0, VILLAGE_Z - 4);
export const CART = new THREE.Vector3(roadX(VILLAGE_Z + 30) + 5.5, 0, VILLAGE_Z + 30);

export const BRIDGE_DECK_Y =
  Math.max(height(BRIDGE.x, BRIDGE.z - 14), height(BRIDGE.x, BRIDGE.z + 14)) + 0.2;

export function groundAt(x: number, z: number) {
  const h = height(x, z);
  const onDeck = Math.abs(z - BRIDGE.z) < 13 && Math.abs(x - BRIDGE.x) < 2.7;
  return onDeck ? Math.max(h, BRIDGE_DECK_Y) : h;
}
