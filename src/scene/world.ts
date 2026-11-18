import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CLS } from "./classes.mjs";
import type { Kit, KitModel } from "./kit";
import {
  BALCONY,
  BRIDGE,
  BRIDGE_DECK_Y,
  CART,
  CHURCH,
  CRYPT,
  MILL,
  MOON,
  SCRIBE,
  VILLAGE_Z,
  WATCH,
  WELL,
  YARD,
} from "./landmarks";
import { CAMERA_SPOTS, SIGHTLINES } from "./path";
import { mulberry } from "./rng";
import { tileMeshes } from "./tiles";
import {
  CRAG,
  GATE_Z,
  STAIR_FOOT,
  WATER_Y,
  fbm,
  height,
  riverCarve,
  roadX,
  sstep,
  stairHeight,
  stairPoint,
} from "./terrain";

function inShot(x: number, z: number, radius: number) {
  return CAMERA_SPOTS.some((spot) => Math.hypot(spot.x - x, spot.z - z) < radius);
}

const FIXED_FOOTPRINTS: Array<[number, number, number]> = [
  [SCRIBE.x - 2, SCRIBE.z, 11],
  [MILL.x - 2, MILL.z + 2, 13],
  [CHURCH.x, CHURCH.z, 15],
  [YARD.x, YARD.z, 15],
  [CRYPT.x, CRYPT.z, 8],
  [BRIDGE.x, BRIDGE.z, 15],
  [WATCH.x, WATCH.z, 9],
  [CART.x, CART.z, 4],
  [WELL.x, WELL.z, 4],
  ...Array.from({ length: 9 }, (_, i): [number, number, number] => {
    const t = i / 8;
    return [CRAG.x + (STAIR_FOOT.x - CRAG.x) * t, CRAG.z + 13 + (STAIR_FOOT.z - CRAG.z - 13) * t, 6];
  }),
];

let footprints: Array<[number, number, number]> = [];

function occupied(x: number, z: number, margin: number) {
  return footprints.some(([fx, fz, r]) => Math.hypot(fx - x, fz - z) < r + margin);
}

const probe = new THREE.Vector3();
const nearest = new THREE.Vector3();

function blocksView(x: number, z: number, radius: number) {
  return SIGHTLINES.some((line) => {
    if (line.distance() > 70) return false;
    probe.set(x, 0, z);
    line.closestPointToPoint(probe, true, nearest);
    const along = nearest.distanceTo(line.start) / line.distance();
    return along < 0.8 && Math.hypot(nearest.x - x, nearest.z - z) < radius;
  });
}

let nextId = 1;
const GOLDEN = 0.61803398875;

function place(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
    new THREE.Vector3(s, s, s),
  );
}

class Bag {
  private parts: THREE.BufferGeometry[] = [];

  newId() {
    return nextId++;
  }

  add(source: THREE.BufferGeometry, cls: number, tone: number, id: number, m?: THREE.Matrix4) {
    const geo = source.index ? source.toNonIndexed() : source;
    if (m) geo.applyMatrix4(m);
    const count = geo.attributes.position.count;
    const tag = new Float32Array(count * 3);
    const idHash = ((id * GOLDEN) % 1) * 0.98 + 0.01;
    for (let i = 0; i < count; i++) {
      tag[i * 3] = cls;
      tag[i * 3 + 1] = tone;
      tag[i * 3 + 2] = idHash;
    }
    geo.setAttribute("aTag", new THREE.BufferAttribute(tag, 3));
    geo.deleteAttribute("uv");
    this.parts.push(geo);
    return this;
  }

  addKit(model: KitModel, m: THREE.Matrix4) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(model.position.slice(), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(model.normal.slice(), 3));
    const tag = model.tag.slice();
    const shift = (this.newId() * GOLDEN) % 1;
    for (let i = 2; i < tag.length; i += 3) tag[i] = (tag[i] + shift) % 1;
    geo.setAttribute("aTag", new THREE.BufferAttribute(tag, 3));
    geo.applyMatrix4(m);
    this.parts.push(geo);
    return this;
  }

  absorb(other: Bag, m: THREE.Matrix4) {
    for (const part of other.parts) {
      part.applyMatrix4(m);
      this.parts.push(part);
    }
    return this;
  }

  merged() {
    const out = mergeGeometries(this.parts, false);
    for (const part of this.parts) part.dispose();
    this.parts = [];
    return out;
  }
}

function glass(lit: boolean): [cls: number, tone: number] {
  return lit ? [CLS.light, 1] : [CLS.shade, 0.12];
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

function faceted(geo: THREE.BufferGeometry) {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  flat.computeVertexNormals();
  return flat;
}

function spire(radius: number, h: number, sides = 8) {
  return faceted(new THREE.ConeGeometry(radius, h, sides, 1));
}

function fromTriangles(positions: number[]) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function slopeVertices(w: number, h: number, d: number) {
  const x = w / 2;
  const z = d / 2;
  return [
    -x, 0, z, 0, h, z, 0, h, -z,
    -x, 0, z, 0, h, -z, -x, 0, -z,
    x, 0, z, x, 0, -z, 0, h, -z,
    x, 0, z, 0, h, -z, 0, h, z,
  ];
}

function gable(w: number, h: number, d: number) {
  const x = w / 2;
  const z = d / 2;
  return fromTriangles([
    -x, 0, z, x, 0, z, 0, h, z,
    x, 0, -z, -x, 0, -z, 0, h, -z,
    ...slopeVertices(w, h, d),
  ]);
}

function gableWall(w: number, h: number) {
  return fromTriangles([-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0]);
}

function roofSlopes(w: number, h: number, d: number) {
  return fromTriangles(slopeVertices(w, h, d));
}

function lancet(w: number, h: number, depth = 0.18) {
  const shape = new THREE.Shape();
  const shoulder = h - w * 0.9;
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, shoulder);
  shape.quadraticCurveTo(w / 2, h - w * 0.25, 0, h);
  shape.quadraticCurveTo(-w / 2, h - w * 0.25, -w / 2, shoulder);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function paneWindow(bag: Bag, m: THREE.Matrix4, w: number, h: number, lit: boolean, shutters = true) {
  const frame = bag.newId();
  bag.add(box(w + 0.24, h + 0.24, 0.1), CLS.wood, 0.3, frame, m);
  bag.add(box(w, h, 0.14), ...glass(lit), bag.newId(), m);
  const bars = bag.newId();
  bag.add(box(0.07, h, 0.2), CLS.wood, 0.25, bars, m);
  bag.add(box(w, 0.07, 0.2), CLS.wood, 0.25, bars, m);
  if (shutters) {
    for (const side of [-1, 1]) {
      bag.add(
        box(w * 0.45, h + 0.1, 0.08),
        CLS.wood,
        0.42,
        bag.newId(),
        m.clone().multiply(place(side * (w * 0.74 + 0.14), 0, 0.02)),
      );
    }
  }
}

function archProfile(span: number, rise: number, pier: number, arches: number, depthBelow: number) {
  const total = arches * span + (arches + 1) * pier;
  const shape = new THREE.Shape();
  const left = -total / 2;
  shape.moveTo(left, -depthBelow);
  let x = left;
  for (let i = 0; i < arches; i++) {
    x += pier;
    shape.lineTo(x, -depthBelow);
    shape.lineTo(x, 0);
    shape.absarc(x + span / 2, 0, span / 2, Math.PI, 0, true);
    shape.lineTo(x + span, -depthBelow);
    x += span;
  }
  shape.lineTo(total / 2, -depthBelow);
  shape.lineTo(total / 2, span / 2 + rise);
  shape.lineTo(left, span / 2 + rise);
  shape.closePath();
  return { shape, total, top: span / 2 + rise };
}

function buildTerrain() {
  const size = 720;
  const seg = 240;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const tones = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) - 40;
    const h = height(x, z);
    pos.setXYZ(i, x, h, z);
    const road = sstep(3.2, 1.2, Math.abs(x - roadX(z))) * sstep(-70, -50, z) * sstep(190, 170, z);
    const snow = sstep(62, 92, h + fbm(x * 0.04, z * 0.04) * 22);
    const bank = riverCarve(x, z);
    tones[i] = 0.5 + road * 0.28 + snow * 0.42 - bank * 0.18 + (fbm(x * 0.07, z * 0.07) - 0.5) * 0.16;
  }
  const flat = faceted(geo);
  const source = geo.index!;
  const tag = new Float32Array(flat.attributes.position.count * 3);
  for (let i = 0; i < source.count; i++) {
    tag[i * 3] = CLS.ground;
    tag[i * 3 + 1] = tones[source.getX(i)];
    tag[i * 3 + 2] = 0.5;
  }
  flat.setAttribute("aTag", new THREE.BufferAttribute(tag, 3));
  flat.deleteAttribute("uv");
  geo.dispose();
  return flat;
}

function buildCastle(bag: Bag) {
  const y = CRAG.top;
  const cx = CRAG.x;
  const cz = CRAG.z;
  const wallId = bag.newId();
  const half = 11;

  const footing = faceted(new THREE.CylinderGeometry(17.6, 22, 16, 4));
  bag.add(footing, CLS.stone, 0.56, bag.newId(), place(cx, y - 8.05, cz, Math.PI / 4));

  for (const [dx, dz, ry] of [
    [0, half, 0],
    [0, -half, 0],
    [half, 0, Math.PI / 2],
    [-half, 0, Math.PI / 2],
  ] as const) {
    bag.add(box(half * 2, 9, 1.6), CLS.stone, 0.62, wallId, place(cx + dx, y + 4.5, cz + dz, ry));
    for (let i = -5; i <= 5; i++) {
      bag.add(
        box(1.1, 1.2, 1.8),
        CLS.stone,
        0.62,
        wallId,
        place(cx + dx, y + 9.6, cz + dz, ry).multiply(place(i * 2, 0, 0)),
      );
    }
  }

  const corners = [
    [half, half, 13, 2.4],
    [-half, half, 16, 2.6],
    [half, -half, 19, 2.4],
    [-half, -half, 15, 2.2],
  ] as const;
  for (const [dx, dz, h, r] of corners) {
    const id = bag.newId();
    bag.add(new THREE.CylinderGeometry(r, r * 1.12, h, 12), CLS.stone, 0.66, id, place(cx + dx, y + h / 2, cz + dz));
    bag.add(new THREE.CylinderGeometry(r * 1.2, r, 1, 12), CLS.stone, 0.66, id, place(cx + dx, y + h + 0.5, cz + dz));
    bag.add(spire(r * 1.25, h * 0.75, 12), CLS.roof, 0.42, bag.newId(), place(cx + dx, y + h + 1 + h * 0.375, cz + dz));
  }

  const gateId = bag.newId();
  bag.add(box(6, 13, 4), CLS.stone, 0.6, gateId, place(cx, y + 6.5, cz + half));
  bag.add(gable(6.6, 5, 4.6), CLS.roof, 0.4, bag.newId(), place(cx, y + 13, cz + half));
  bag.add(box(2.6, 4.6, 0.3), CLS.shade, 0.1, bag.newId(), place(cx, y + 2.3, cz + half + 2.05));

  const keepId = bag.newId();
  bag.add(box(11, 26, 9), CLS.stone, 0.64, keepId, place(cx + 3.5, y + 13, cz - 3));
  bag.add(gable(9.8, 12, 11.8), CLS.roof, 0.4, bag.newId(), place(cx + 3.5, y + 26, cz - 3, Math.PI / 2));
  bag.add(box(5, 18, 6), CLS.stone, 0.6, bag.newId(), place(cx + 9, y + 9, cz + 3));
  bag.add(gable(5.6, 6, 6.6), CLS.roof, 0.4, bag.newId(), place(cx + 9, y + 18, cz + 3));

  const towers = [
    [-4, -3, 44, 3.4, 20],
    [5, -6.5, 36, 2.2, 15],
    [-9, -8.5, 31, 1.7, 13],
    [10.5, -1, 29, 1.5, 11],
  ] as const;
  for (const [dx, dz, h, r, cap] of towers) {
    const id = bag.newId();
    bag.add(new THREE.CylinderGeometry(r, r * 1.15, h, 14), CLS.stone, 0.68, id, place(cx + dx, y + h / 2, cz + dz));
    bag.add(new THREE.CylinderGeometry(r * 1.28, r, 1.4, 14), CLS.stone, 0.68, id, place(cx + dx, y + h + 0.7, cz + dz));
    bag.add(spire(r * 1.36, cap, 14), CLS.roof, 0.42, bag.newId(), place(cx + dx, y + h + 1.4 + cap / 2, cz + dz));
    bag.add(box(0.08, 3, 0.08), CLS.shade, 0.1, bag.newId(), place(cx + dx, y + h + 1.4 + cap + 1.5, cz + dz));
    pennant(bag, cx + dx, y + h + 1.4 + cap + 3, cz + dz, 1.6 + r * 0.5);
  }

  const balconyId = bag.newId();
  bag.add(box(4.4, 0.5, 2.6), CLS.stone, 0.72, balconyId, place(BALCONY.x, BALCONY.y - 0.25, BALCONY.z + 0.6));
  for (const sx of [-2.05, 2.05]) {
    bag.add(box(0.3, 1.1, 2.6), CLS.stone, 0.72, balconyId, place(BALCONY.x + sx, BALCONY.y + 0.55, BALCONY.z + 0.6));
  }
  bag.add(box(4.4, 1.1, 0.3), CLS.stone, 0.72, balconyId, place(BALCONY.x, BALCONY.y + 0.55, BALCONY.z + 1.75));
  bag.add(box(1.5, 3, 0.4), CLS.light, 1, bag.newId(), place(BALCONY.x, BALCONY.y + 1.5, BALCONY.z - 0.75));

  const windows: Array<[number, number, number, number, boolean]> = [
    [3.5, 20, 1.55, 0, true],
    [1.2, 15, 1.55, 0, false],
    [6.2, 15, 1.55, 0, true],
    [3.5, 10, 1.55, 0, false],
    [9, 13, 6.05, 0, true],
    [9, 8, 6.05, 0, false],
    [-2, 20.5, -2.6, Math.PI / 2, true],
    [-2, 9, -3.4, Math.PI / 2, false],
  ];
  for (const [dx, dy, dz, ry, lit] of windows) {
    const m = place(cx + dx, y + dy - 1.2, cz + dz, ry);
    bag.add(lancet(1.3, 2.9, 0.12), CLS.stone, 0.8, bag.newId(), m.clone().multiply(place(0, -0.15, 0)));
    bag.add(lancet(0.95, 2.5), ...glass(lit), bag.newId(), m);
    bag.add(box(0.07, 2.2, 0.24), CLS.shade, 0.1, bag.newId(), m.clone().multiply(place(0, 1.1, 0)));
  }
  for (const [dx, dz, h, r] of towers) {
    for (let k = 0; k < 3; k++) {
      const wy = y + h * (0.42 + k * 0.2);
      const lit = (k + Math.round(dx)) % 2 === 0;
      bag.add(
        lancet(0.6, 1.7, 0.2),
        ...glass(lit),
        bag.newId(),
        place(cx + dx, wy - 0.85, cz + dz + r * 1.04 - (wy - y) * 0.004),
      );
    }
  }

  for (const side of [-1.9, 1.9]) {
    bag.add(box(1.6, 9, 0.12), CLS.cloth, 0.8, bag.newId(), place(cx + side, y + 7.2, cz + half + 2.1));
  }
}

function buildStairs(bag: Bag) {
  const top = stairPoint(0);
  const foot = stairPoint(1);
  const run = Math.hypot(foot.x - top.x, foot.z - top.z);
  const yaw = Math.atan2(foot.x - top.x, foot.z - top.z);
  const flights = Math.round(run / 1.15);
  const tread = run / flights;
  const stone = bag.newId();
  const rail = bag.newId();
  bag.add(box(7, 1.4, 6), CLS.stone, 0.72, stone, place(top.x, CRAG.top - 0.45, top.z - 2.4));
  for (let i = 0; i < flights; i++) {
    const t = (i + 0.5) / flights;
    const { x, z } = stairPoint(t);
    const surface = stairHeight(t) + 0.3;
    const step = place(x, surface, z, yaw);
    bag.add(box(4.2, 2.6, tread + 0.04), CLS.stone, 0.74, stone, step.clone().multiply(place(0, -1.3, 0)));
    for (const side of [-2.3, 2.3]) {
      bag.add(box(0.5, 3.4, tread + 0.04), CLS.stone, 0.6, rail, step.clone().multiply(place(side, -0.8, 0)));
    }
  }
}

function buildLord() {
  const body = new Bag();
  const cloak = body.newId();
  const profile = [
    [0.78, 0],
    [0.62, 0.5],
    [0.44, 1.25],
    [0.37, 1.7],
    [0.4, 1.92],
    [0.13, 2.04],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  body.add(new THREE.LatheGeometry(profile, 14), CLS.shade, 0.12, cloak);
  body.add(
    new THREE.CylinderGeometry(0.42, 0.3, 0.6, 12, 1, true, Math.PI * 0.42, Math.PI * 1.16),
    CLS.cloth,
    0.85,
    body.newId(),
    place(0, 2.28, -0.02),
  );
  body.add(box(0.16, 1.5, 0.06), CLS.cloth, 0.8, body.newId(), place(0, 1.05, 0.5, 0, -0.2));
  const arm = body.newId();
  body.add(box(0.13, 0.13, 0.5), CLS.shade, 0.12, arm, place(0.36, 1.5, 0.3, -0.25));
  body.add(new THREE.SphereGeometry(0.075, 8, 6), CLS.pale, 0.95, body.newId(), place(0.43, 1.52, 0.56));
  const goblet = body.newId();
  body.add(new THREE.ConeGeometry(0.1, 0.18, 8), CLS.light, 1, goblet, place(0.43, 1.74, 0.56, 0, Math.PI));
  body.add(box(0.03, 0.14, 0.03), CLS.light, 1, goblet, place(0.43, 1.6, 0.56));

  const head = new Bag();
  const face = new THREE.SphereGeometry(0.21, 14, 10);
  face.scale(0.92, 1.18, 0.95);
  head.add(face, CLS.pale, 0.95, head.newId());
  const hair = new THREE.SphereGeometry(0.225, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
  hair.scale(0.95, 1.18, 1);
  head.add(hair, CLS.shade, 0.1, head.newId(), place(0, 0.01, -0.03, 0, -0.35));
  const eyes = head.newId();
  for (const side of [-0.075, 0.075]) {
    head.add(box(0.05, 0.022, 0.02), CLS.shade, 0.05, eyes, place(side, 0.02, 0.185));
  }
  const crown = head.newId();
  head.add(new THREE.CylinderGeometry(0.2, 0.19, 0.08, 12, 1, true), CLS.light, 1, crown, place(0, 0.2, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    head.add(spire(0.05, 0.2, 4), CLS.light, 1, crown, place(Math.cos(a) * 0.19, 0.33, Math.sin(a) * 0.19));
  }

  const group = new THREE.Group();
  group.position.set(BALCONY.x, BALCONY.y, BALCONY.z + 1.05);
  const bodyMesh = new THREE.Mesh(body.merged());
  const headMesh = new THREE.Mesh(head.merged());
  headMesh.position.set(0, 2.3, 0.02);
  group.add(bodyMesh, headMesh);
  return { group, body: bodyMesh, head: headMesh };
}

function house(rng: () => number, bag: Bag, fixed: { w?: number; d?: number; storeys?: 1 | 2 } = {}) {
  const w = fixed.w ?? 4.6 + rng() * 2.2;
  const d = fixed.d ?? 5.5 + rng() * 3;
  const storeys = fixed.storeys ?? (rng() > 0.45 ? 2 : 1);
  const ground = 3;
  const upper = storeys === 2 ? 2.7 : 0;
  const eave = ground + upper;
  const roofH = w * (0.62 + rng() * 0.2);
  const jetty = storeys === 2 ? 0.5 : 0;
  const stoneGround = storeys === 2 || rng() > 0.5;
  const topW = w + jetty;
  const topD = d + jetty;

  bag.add(box(w, ground + 3, d), stoneGround ? CLS.stone : CLS.plaster, stoneGround ? 0.62 : 0.72, bag.newId(), place(0, ground / 2 - 1.5, 0));
  if (storeys === 2) {
    bag.add(box(topW, upper, topD), CLS.plaster, 0.74, bag.newId(), place(0, ground + upper / 2, 0));
  }
  const frontZ = topD / 2;
  const gableId = bag.newId();
  bag.add(gableWall(topW, roofH), CLS.plaster, 0.74, gableId, place(0, eave, frontZ));
  bag.add(gableWall(topW, roofH), CLS.plaster, 0.74, gableId, place(0, eave, -frontZ, Math.PI));
  bag.add(roofSlopes(topW + 1, roofH + 0.55, topD + 1.2), CLS.roof, 0.38 + rng() * 0.08, bag.newId(), place(0, eave - 0.3, 0));

  const timber = bag.newId();
  const beam = (bw: number, bh: number, x: number, y: number, rz = 0) =>
    bag.add(box(bw, bh, 0.12), CLS.wood, 0.26, timber, place(x, y, frontZ + 0.02, 0, 0, rz));
  const frameBase = storeys === 2 ? ground : 0;
  const frameH = storeys === 2 ? upper : ground;
  if (storeys === 2 || !stoneGround) {
    beam(topW, 0.22, 0, frameBase + 0.11);
    beam(topW, 0.22, 0, frameBase + frameH - 0.05);
    for (const side of [-1, 1]) {
      beam(0.22, frameH, side * (topW / 2 - 0.11), frameBase + frameH / 2);
      beam(0.16, frameH * 1.05, side * (topW / 2 - 0.85), frameBase + frameH / 2, side * 0.42);
    }
    beam(0.16, roofH * 0.82, 0, eave + roofH * 0.41);
    beam(topW * 0.52, 0.16, 0, eave + roofH * 0.42);
    for (const side of [-1, 1]) {
      bag.add(
        box(0.22, upper || ground, 0.12),
        CLS.wood,
        0.26,
        timber,
        place(side * (topW / 2 + 0.02), frameBase + frameH / 2, frontZ - 0.1, Math.PI / 2),
      );
    }
  }

  const doorX = -w * 0.2;
  const door = bag.newId();
  bag.add(box(1.25, 2.1, 0.1), CLS.wood, 0.3, door, place(doorX, 1.05, d / 2 + 0.02));
  bag.add(box(0.95, 1.9, 0.14), CLS.shade, 0.16, bag.newId(), place(doorX, 0.95, d / 2 + 0.03));
  bag.add(box(1.5, 0.2, 0.6), CLS.stone, 0.7, bag.newId(), place(doorX, 0.05, d / 2 + 0.3));

  paneWindow(bag, place(w * 0.22, ground * 0.55, d / 2 + 0.03), 0.85, 0.95, rng() > 0.4);
  if (storeys === 2) {
    paneWindow(bag, place(0, ground + upper * 0.52, frontZ + 0.05), 0.8, 0.9, rng() > 0.5);
  }
  paneWindow(bag, place(0, eave + roofH * 0.2, frontZ + 0.06), 0.55, 0.6, rng() > 0.6, false);
  paneWindow(bag, place(w / 2 + 0.03, ground * 0.55, d * 0.12, Math.PI / 2), 0.85, 0.95, rng() > 0.55);
  paneWindow(bag, place(-w / 2 - 0.03, ground * 0.55, -d * 0.15, -Math.PI / 2), 0.85, 0.95, rng() > 0.7);

  const chimney = bag.newId();
  const chimneyH = roofH + 1.4;
  bag.add(box(0.8, chimneyH, 0.8), CLS.stone, 0.52, chimney, place(topW * 0.26, eave + chimneyH / 2 - 0.2, -d * 0.2));
  bag.add(box(1, 0.22, 1), CLS.stone, 0.6, chimney, place(topW * 0.26, eave + chimneyH - 0.1, -d * 0.2));
}

function buildVillage(bag: Bag, rng: () => number, kit: Kit) {
  let placed = 0;
  let tries = 0;
  while (placed < 19 && tries++ < 500) {
    const z = VILLAGE_Z - 26 + rng() * 56;
    const sideways = (rng() > 0.5 ? 1 : -1) * (7 + rng() * 19);
    const x = roadX(z) + sideways;
    if (inShot(x, z, 30) || blocksView(x, z, 12) || occupied(x, z, 4)) continue;
    footprints.push([x, z, 5.5]);
    const facing = (sideways > 0 ? -Math.PI / 2 : Math.PI / 2) + (rng() - 0.5) * 0.5;
    const one = new Bag();
    house(rng, one);
    bag.absorb(one, place(x, height(x, z), z, facing));
    placed++;
  }

  bag.addKit(kit.well, place(WELL.x, height(WELL.x, WELL.z) - 0.1, WELL.z, 0.4, 0, 0, 5));
  bag.addKit(kit.cart, place(CART.x, height(CART.x, CART.z), CART.z, 0.3, 0, 0, 3.4));

  const cx = CHURCH.x;
  const cz = CHURCH.z;
  const cy = height(cx, cz);
  bag.addKit(kit.church, place(cx, cy + 0.3, cz, Math.PI / 2, 0, 0, 15));
  bag.add(box(19, 8, 17), CLS.stone, 0.6, bag.newId(), place(cx, cy - 3.7, cz));

  const yardX = YARD.x;
  const yardZ = YARD.z;
  const stones = [kit.graveA, kit.graveB, kit.gravestone, kit.gravemarker, kit.crossStone];
  for (let i = 0; i < 30; i++) {
    const x = yardX - 7 + (i % 6) * 2.9 + (rng() - 0.5) * 0.9;
    const z = yardZ - 9 + Math.floor(i / 6) * 4 + (rng() - 0.5) * 0.9;
    if (Math.abs(x - roadX(z)) < 4) continue;
    const model = stones[Math.floor(rng() * stones.length)];
    const scale = model === kit.crossStone ? 2.6 : 0.95;
    bag.addKit(model, place(x, height(x, z) - 0.05, z, Math.PI / 2 + (rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.14, scale));
  }
  const cryptY = height(CRYPT.x, CRYPT.z);
  bag.addKit(kit.crypt, place(CRYPT.x, cryptY + 0.2, CRYPT.z, 0, 0, 0, 0.75));
  bag.add(box(5.6, 6, 7), CLS.stone, 0.6, bag.newId(), place(CRYPT.x, cryptY - 2.8, CRYPT.z));
  for (let i = 0; i < 6; i++) {
    const z = yardZ - 11 + i * 4.6;
    const x = yardX + 9.5;
    bag.addKit(i === 3 ? kit.archGate : kit.fence, place(x, height(x, z), z, Math.PI / 2, 0, 0, 1.15));
  }
}

function buildScribeHouse(bag: Bag, rng: () => number) {
  const { x, z } = SCRIBE;
  const y = height(x, z);
  const yaw = Math.atan2(-34, 32);
  const at = (lx: number, ly: number, lz: number, ry = 0, rx = 0, rz = 0) =>
    place(x, y, z, yaw).multiply(place(lx, ly, lz, ry, rx, rz));
  const radius = 3;
  const face = radius * Math.cos(Math.PI / 8);
  const onFace = (turn: number, ly: number, out = 0) =>
    place(x, y, z, yaw + turn).multiply(place(0, ly, face + out));

  const tower = bag.newId();
  bag.add(faceted(new THREE.CylinderGeometry(radius, radius * 1.08, 19, 8)), CLS.stone, 0.7, tower, at(0, 7.5, 0, Math.PI / 8));
  bag.add(faceted(new THREE.CylinderGeometry(radius * 1.12, radius * 1.02, 0.5, 8)), CLS.stone, 0.78, tower, at(0, 6.2, 0, Math.PI / 8));
  bag.add(faceted(new THREE.CylinderGeometry(radius * 1.25, radius, 1.4, 8)), CLS.wood, 0.5, bag.newId(), at(0, 17.7, 0, Math.PI / 8));
  bag.add(spire(radius * 1.42, 10, 8), CLS.roof, 0.4, bag.newId(), at(0, 23.4, 0, Math.PI / 8));
  bag.add(box(0.08, 2, 0.08), CLS.shade, 0.1, bag.newId(), at(0, 29.3, 0));
  pennant(bag, x, y + 30.2, z, 1.5);

  for (const turn of [0, Math.PI / 4, -Math.PI / 4]) {
    const lit = turn !== Math.PI / 4;
    const m = onFace(turn, 11.2, 0.02);
    bag.add(lancet(1.5, 3.3, 0.14), CLS.plaster, 0.8, bag.newId(), m.clone().multiply(place(0, -0.2, 0)));
    bag.add(lancet(1.1, 2.8, 0.2), ...glass(lit), bag.newId(), m);
    const bars = bag.newId();
    bag.add(box(0.07, 2.6, 0.28), CLS.shade, 0.1, bars, m.clone().multiply(place(0, 1.3, 0)));
    bag.add(box(1.1, 0.07, 0.28), CLS.shade, 0.1, bars, m.clone().multiply(place(0, 1.2, 0)));
  }
  const slit = onFace(0, 3.6, 0.02);
  bag.add(box(0.36, 1.5, 0.16), CLS.shade, 0.1, bag.newId(), slit);

  const doorway = onFace(-Math.PI / 4, 0, 0.02);
  bag.add(lancet(1.9, 3.2, 0.16), CLS.plaster, 0.8, bag.newId(), doorway);
  bag.add(lancet(1.45, 2.8, 0.22), CLS.wood, 0.34, bag.newId(), doorway);
  bag.add(box(0.1, 0.1, 0.3), CLS.light, 1, bag.newId(), doorway.clone().multiply(place(0.4, 1.3, 0)));
  bag.add(box(2.4, 0.25, 1), CLS.stone, 0.76, bag.newId(), doorway.clone().multiply(place(0, 0.05, 0.4)));

  const sign = bag.newId();
  const bracket = onFace(-Math.PI / 4, 4.6, 0);
  bag.add(box(0.12, 0.12, 1.9), CLS.shade, 0.12, sign, bracket.clone().multiply(place(1.5, 0, 0.9)));
  bag.add(box(0.06, 0.4, 0.06), CLS.shade, 0.12, sign, bracket.clone().multiply(place(1.5, -0.25, 1.6)));
  bag.add(box(0.1, 1.2, 1.2), CLS.plaster, 0.86, bag.newId(), bracket.clone().multiply(place(1.5, -1.05, 1.3)));
  bag.add(box(0.14, 0.9, 0.12), CLS.shade, 0.1, bag.newId(), bracket.clone().multiply(place(1.5, -1.05, 1.3, 0, 0.6)));

  const wingWidth = 5;
  const wing = new Bag();
  house(rng, wing, { w: wingWidth, d: 6, storeys: 2 });
  bag.absorb(wing, at(radius * 1.12 + (wingWidth + 1.5) / 2 - 0.1, 0, -1.4));
}

function postLantern(bag: Bag, kit: Kit, post: THREE.Matrix4) {
  bag.addKit(kit.postLantern, post);
  bag.add(box(0.3, 0.42, 0.3), CLS.light, 1, bag.newId(), post.clone().multiply(place(0, 2.05, 1)));
}

function buildBridge(bag: Bag, kit: Kit) {
  const { x, z } = BRIDGE;
  const { shape, top } = archProfile(8.5, 1.4, 2.6, 2, 13);
  const span = new THREE.ExtrudeGeometry(shape, { depth: 5.2, bevelEnabled: false, curveSegments: 14 });
  span.translate(0, 0, -2.6);
  const deckY = BRIDGE_DECK_Y;
  const m = place(x, deckY - top, z, Math.PI / 2);
  const id = bag.newId();
  bag.add(span, CLS.stone, 0.66, id, m);
  for (const side of [-2.45, 2.45]) {
    bag.add(box(27, 0.8, 0.5), CLS.stone, 0.7, id, m.clone().multiply(place(0, top + 0.4, side)));
  }
  for (const along of [-13.4, 13.4]) {
    postLantern(bag, kit, place(x + 3.1, deckY - 0.1, z + along, -Math.PI / 2, 0, 0, 1.25));
  }
}

const MILL_WIDTH = 7.4;

function buildMill(bag: Bag, rng: () => number) {
  const { x, z } = MILL;
  const y = height(x, z);
  const depth = 9.5;
  bag.add(box(depth + 0.8, 12, MILL_WIDTH + 0.8), CLS.stone, 0.58, bag.newId(), place(x, y - 5.7, z));
  const body = new Bag();
  house(rng, body, { w: MILL_WIDTH, d: depth, storeys: 2 });
  bag.absorb(body, place(x, y + 0.3, z, -Math.PI / 2));
  const bearing = bag.newId();
  const wallZ = z + (MILL_WIDTH + 0.5) / 2;
  bag.add(box(1.6, 1.6, 0.5), CLS.wood, 0.3, bearing, place(x, WATER_Y + 3.6, wallZ + 0.2));
}

function buildWheel() {
  const bag = new Bag();
  const id = bag.newId();
  const radius = 4.6;
  bag.add(new THREE.TorusGeometry(radius, 0.22, 6, 28), CLS.wood, 0.5, id);
  bag.add(new THREE.TorusGeometry(radius * 0.55, 0.16, 6, 22), CLS.wood, 0.5, id);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    bag.add(box(radius * 2, 0.18, 0.18), CLS.wood, 0.44, id, place(0, 0, 0, 0, 0, a / 2));
    bag.add(
      box(1.3, 0.12, 1.5),
      CLS.wood,
      0.56,
      id,
      place(Math.cos(a) * radius, Math.sin(a) * radius, 0, 0, 0, a + Math.PI / 2),
    );
  }
  bag.add(new THREE.CylinderGeometry(0.35, 0.35, 3.4, 8), CLS.wood, 0.4, id, place(0, 0, -0.9, 0, Math.PI / 2));
  const mesh = new THREE.Mesh(bag.merged());
  mesh.position.set(MILL.x, WATER_Y + 3.6, MILL.z + (MILL_WIDTH + 0.5) / 2 + 1.5);
  return mesh;
}

function buildGate(bag: Bag) {
  const z = GATE_Z;
  const road = roadX(z);
  const wallId = bag.newId();
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = road + dir * (7 + i * 6);
      const gy = height(x, z);
      bag.add(box(6.2, 15, 3), CLS.stone, 0.62, wallId, place(x, gy + 3.5, z));
      for (const k of [-2, 0, 2]) {
        bag.add(box(1.1, 1.2, 3.2), CLS.stone, 0.62, wallId, place(x + k, gy + 11.6, z));
      }
    }
  }
  const { shape, top } = archProfile(5.2, 3.4, 1.6, 1, 14);
  const arch = new THREE.ExtrudeGeometry(shape, { depth: 4.2, bevelEnabled: false, curveSegments: 14 });
  arch.translate(0, 0, -2.1);
  const gy = height(road, z);
  bag.add(arch, CLS.stone, 0.68, bag.newId(), place(road, gy + 5.2, z));
  bag.add(gable(5.6, 3.4, 9.4), CLS.roof, 0.4, bag.newId(), place(road, gy + 5.2 + top, z, Math.PI / 2));

  const { x } = WATCH;
  const wy = height(x, z);
  const tower = bag.newId();
  bag.add(box(5.4, 30, 5.4), CLS.stone, 0.68, tower, place(x, wy + 13, z));
  bag.add(box(7, 3.4, 7), CLS.stone, 0.72, tower, place(x, wy + 29.7, z));
  for (const [dx, dz] of [
    [-2.9, -2.9],
    [2.9, -2.9],
    [-2.9, 2.9],
    [2.9, 2.9],
  ]) {
    bag.add(box(1.2, 1.4, 1.2), CLS.stone, 0.72, tower, place(x + dx, wy + 32.1, z + dz));
  }
  bag.add(spire(3.4, 7, 4), CLS.roof, 0.4, bag.newId(), place(x, wy + 36.4, z, Math.PI / 4));
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    bag.add(box(1.5, 1.7, 0.16), CLS.light, 1, bag.newId(), place(x, wy + 29.6, z, ry).multiply(place(0, 0, 3.53)));
  }
  bag.add(box(0.7, 1.6, 0.16), CLS.shade, 0.12, bag.newId(), place(x, wy + 16, z + 2.73));
  bag.add(box(0.7, 1.6, 0.16), CLS.shade, 0.12, bag.newId(), place(x, wy + 9, z + 2.73));
}

function buildLamps(bag: Bag, kit: Kit) {
  for (let z = -34; z < 150; z += 21) {
    if (Math.abs(z - BRIDGE.z) < 16 || Math.abs(z - GATE_Z) < 8) continue;
    const side = Math.round(z / 21) % 2 === 0 ? 1 : -1;
    const x = roadX(z) + side * 3.9;
    postLantern(bag, kit, place(x, height(x, z) - 0.1, z, (-side * Math.PI) / 2, 0, 0, 1.25));
    footprints.push([x, z, 1.5]);
  }
}

function pennant(bag: Bag, x: number, y: number, z: number, length: number) {
  const geo = fromTriangles([0, 0, 0, 0, -length * 0.42, 0, -length, -length * 0.3, length * 0.25]);
  bag.add(geo, CLS.cloth, 0.85, bag.newId(), place(x, y, z));
}

function buildDeadTrees(bag: Bag, rng: () => number, kit: Kit) {
  const models = [kit.deadLarge, kit.deadMedium, kit.deadSmall];
  let planted = 0;
  let tries = 0;
  while (planted < 40 && tries++ < 900) {
    const z = -60 + rng() * 230;
    const x = roadX(z) + (rng() > 0.5 ? 1 : -1) * (6 + rng() * 34);
    if (riverCarve(x, z) > 0.05) continue;
    if (Math.hypot(x - CRAG.x, z - CRAG.z) < 40) continue;
    if (Math.abs(z - GATE_Z) < 5) continue;
    if (inShot(x, z, 20) || blocksView(x, z, 6) || occupied(x, z, 3)) continue;
    if (Math.abs(x - roadX(z)) < 5) continue;
    const model = models[Math.floor(rng() * models.length)];
    bag.addKit(model, place(x, height(x, z) - 0.3, z, rng() * 6, 0, 0, 1.5 + rng() * 1.1));
    planted++;
  }
}

const PINE_GRID = 8;

function buildPines(rng: () => number, kit: Kit) {
  const bag = new Bag();
  bag.addKit(kit.pine, place(0, 0, 0, 0, 0, 0, 3.4));
  const geo = bag.merged();
  const tags = geo.attributes.aTag;
  for (let i = 0; i < tags.count; i++) {
    if (tags.getX(i) !== CLS.foliage) tags.setXY(i, CLS.wood, 0.22);
  }

  const spots: Array<{ x: number; z: number; m: THREE.Matrix4 }> = [];
  let tries = 0;
  while (spots.length < 1500 && tries++ < 30000) {
    const x = (rng() - 0.5) * 420;
    const z = -170 + rng() * 400;
    if (Math.hypot(x - CRAG.x, z - CRAG.z) < 52) continue;
    if (occupied(x, z, 2) || Math.abs(x - roadX(z)) < 4.5) continue;
    if (fbm(x * 0.03 + 40, z * 0.03) < 0.42) continue;
    if (inShot(x, z, 12)) continue;
    const h = height(x, z);
    if (h < 3 || h > 78) continue;
    const slope = Math.abs(height(x + 2, z) - h) + Math.abs(height(x, z + 2) - h);
    if (slope > 3.4) continue;
    spots.push({ x, z, m: place(x, h - 0.9, z, rng() * 6, 0, 0, 0.9 + rng() * 1.3) });
  }
  return tileMeshes(geo, spots, PINE_GRID);
}

function buildWaterAndSky() {
  const bag = new Bag();
  const water = new THREE.PlaneGeometry(420, 90, 1, 1);
  water.rotateX(-Math.PI / 2);
  bag.add(water, CLS.water, 0.6, bag.newId(), place(0, WATER_Y, 55));
  const moon = new THREE.CircleGeometry(58, 48);
  const facing = place(MOON.x, MOON.y, MOON.z);
  facing.lookAt(new THREE.Vector3(0, 40, 60), MOON, new THREE.Vector3(0, 1, 0));
  facing.setPosition(MOON);
  bag.add(moon, CLS.moon, 1, bag.newId(), facing);
  return bag.merged();
}

const BAT_COUNT = 380;

function buildBats(rng: () => number) {
  const wing: Array<[number, number]> = [
    [0.06, 0.16],
    [0.55, 0.3],
    [1, 0.08],
    [0.76, -0.04],
    [0.64, -0.26],
    [0.44, -0.07],
    [0.32, -0.29],
    [0.07, -0.15],
  ];
  const positions: number[] = [0, 0, 0.26, -0.07, 0, -0.2, 0.07, 0, -0.2];
  for (const side of [-1, 1]) {
    positions.push(side * 0.02, 0, 0.24, side * 0.09, 0, 0.36, side * 0.07, 0, 0.2);
    for (let i = 1; i < wing.length - 1; i++) {
      for (const [x, z] of [wing[0], wing[i], wing[i + 1]]) positions.push(side * x, 0, z);
    }
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const seeds = new Float32Array(BAT_COUNT * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rng();
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = BAT_COUNT;
  return geo;
}

type World = {
  terrain: THREE.BufferGeometry;
  buildings: THREE.BufferGeometry;
  backdrop: THREE.BufferGeometry;
  pines: THREE.InstancedMesh[];
  wheel: THREE.Mesh;
  lord: { group: THREE.Group; body: THREE.Mesh; head: THREE.Mesh };
  bats: THREE.InstancedBufferGeometry;
};

export function buildWorld(kit: Kit): World {
  nextId = 1;
  footprints = FIXED_FOOTPRINTS.map((f) => [...f]);
  const rng = mulberry(1897);
  const bag = new Bag();
  buildCastle(bag);
  buildStairs(bag);
  buildVillage(bag, rng, kit);
  buildScribeHouse(bag, rng);
  buildBridge(bag, kit);
  buildMill(bag, rng);
  buildGate(bag);
  buildLamps(bag, kit);
  buildDeadTrees(bag, rng, kit);
  return {
    terrain: buildTerrain(),
    buildings: bag.merged(),
    backdrop: buildWaterAndSky(),
    pines: buildPines(rng, kit),
    wheel: buildWheel(),
    lord: buildLord(),
    bats: buildBats(rng),
  };
}
