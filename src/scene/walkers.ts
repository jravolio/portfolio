import * as THREE from "three";
import { LIMBS } from "./classes.mjs";
import type { Kit, KitModel } from "./kit";
import { BRIDGE, CRYPT, groundAt, YARD } from "./landmarks";
import { mulberry } from "./rng";
import { GATE_Z, roadX } from "./terrain";

const ARM_RIGHT = LIMBS.indexOf("arm-right");
const ARM_LEFT = LIMBS.indexOf("arm-left");
const LEG_RIGHT = LIMBS.indexOf("leg-right");
const LEG_LEFT = LIMBS.indexOf("leg-left");

type Rig = { parts: Array<THREE.BufferGeometry | null>; pivots: Array<number[] | null> };

function splitRig(model: KitModel): Rig {
  const parts = model.pivots.map((pivot, limb) => {
    if (!pivot) return null;
    const position: number[] = [];
    const normal: number[] = [];
    const tag: number[] = [];
    for (let i = 0; i < model.limb.length; i++) {
      if (model.limb[i] !== limb) continue;
      for (let a = 0; a < 3; a++) {
        position.push(model.position[i * 3 + a] - pivot[a]);
        normal.push(model.normal[i * 3 + a]);
        tag.push(model.tag[i * 3 + a]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
    geo.setAttribute("aTag", new THREE.Float32BufferAttribute(tag, 3));
    return geo;
  });
  return { parts, pivots: model.pivots };
}

class Figure {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legs: THREE.Object3D[] = [];
  private readonly shoulders: THREE.Object3D[] = [];

  constructor(rig: Rig, material: THREE.Material, scale: number) {
    this.root.scale.setScalar(scale);
    this.root.add(this.body);
    rig.parts.forEach((geo, limb) => {
      const pivot = rig.pivots[limb];
      if (!geo || !pivot) return;
      const mesh = new THREE.Mesh(geo, material);
      if (limb === ARM_RIGHT || limb === ARM_LEFT) {
        const shoulder = new THREE.Group();
        shoulder.position.fromArray(pivot);
        mesh.rotation.z = limb === ARM_RIGHT ? 1.3 : -1.3;
        shoulder.add(mesh);
        this.shoulders.push(shoulder);
        this.body.add(shoulder);
        return;
      }
      mesh.position.fromArray(pivot);
      if (limb === LEG_RIGHT || limb === LEG_LEFT) this.legs.push(mesh);
      this.body.add(mesh);
    });
  }

  /** `stride` is the walk-cycle angle; `effort` is 0 standing still, 1 at a full walk. */
  pose(stride: number, effort: number) {
    const swing = Math.sin(stride) * effort;
    this.legs.forEach((leg, i) => {
      leg.rotation.x = (i === 0 ? swing : -swing) * 0.7;
    });
    this.shoulders.forEach((shoulder, i) => {
      shoulder.rotation.x = (i === 0 ? -swing : swing) * 0.6;
    });
    this.body.position.y = Math.abs(Math.cos(stride)) * 0.012 * effort;
    this.body.rotation.z = Math.sin(stride) * 0.04 * effort;
  }
}

type Route = { length: number; at(s: number, out: THREE.Vector2): void; lift?: number };

function roadRoute(from: number, to: number, lateral: number): Route {
  return {
    length: to - from,
    at(s, out) {
      const z = from + s;
      out.set(roadX(z) + lateral, z);
    },
  };
}

function lineRoute(x0: number, z0: number, x1: number, z1: number): Route {
  return {
    length: Math.hypot(x1 - x0, z1 - z0),
    at(s, out) {
      const t = s / this.length;
      out.set(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
    },
  };
}

type Walker = {
  figure: Figure;
  route: Route;
  s: number;
  dir: 1 | -1;
  speed: number;
  stride: number;
  loop: boolean;
};

export function buildWalkers(kit: Kit, material: THREE.Material) {
  const rng = mulberry(77);
  const group = new THREE.Group();
  const rigs = { keeper: splitRig(kit.keeper), skeleton: splitRig(kit.skeleton), ghost: splitRig(kit.ghost) };
  const walkers: Walker[] = [];

  const add = (rig: Rig, route: Route, speed: number, scale: number, loop = false) => {
    const figure = new Figure(rig, material, scale);
    group.add(figure.root);
    walkers.push({
      figure,
      route,
      s: rng() * route.length,
      dir: rng() > 0.5 ? 1 : -1,
      speed,
      stride: rng() * 6,
      loop,
    });
  };

  for (let i = 0; i < 13; i++) {
    const from = -34 + rng() * 110;
    const to = Math.min(150, from + 45 + rng() * 70);
    const lateral = (i % 2 === 0 ? 1 : -1) * (0.7 + rng() * 0.8);
    add(rigs.keeper, roadRoute(from, to, lateral), 1.3 + rng() * 0.9, 2.1 + rng() * 0.35);
  }
  const gate = roadX(GATE_Z - 8);
  add(rigs.keeper, lineRoute(gate - 7, GATE_Z - 8, gate + 7, GATE_Z - 8), 1.1, 2.45);
  add(rigs.keeper, lineRoute(BRIDGE.x - 1.6, BRIDGE.z - 11, BRIDGE.x - 1.6, BRIDGE.z + 11), 0.9, 2.3);
  add(rigs.skeleton, lineRoute(YARD.x - 8, YARD.z + 9.6, YARD.x + 7, YARD.z + 9.6), 0.8, 2.3);
  add(rigs.skeleton, lineRoute(YARD.x - 9.6, YARD.z - 8, YARD.x - 9.6, YARD.z + 7), 0.7, 2.3);

  const haunt: Route = {
    length: Math.PI * 2 * 6,
    lift: 1.6,
    at(s, out) {
      const a = s / 6;
      out.set(CRYPT.x + Math.cos(a) * 6, CRYPT.z + Math.sin(a) * 6);
    },
  };
  add(rigs.ghost, haunt, 1.1, 2.6, true);

  const here = new THREE.Vector2();
  const ahead = new THREE.Vector2();

  function update(clock: number, dt: number, snapHeading = false) {
    for (const w of walkers) {
      w.s += w.dir * w.speed * dt;
      if (w.loop) {
        w.s = (w.s + w.route.length) % w.route.length;
      } else if (w.s > w.route.length || w.s < 0) {
        w.s = THREE.MathUtils.clamp(w.s, 0, w.route.length);
        w.dir = w.dir === 1 ? -1 : 1;
      }
      w.stride += w.speed * dt * 3.4;
      w.route.at(w.s, here);
      w.route.at(w.s + w.dir * 0.4, ahead);
      const root = w.figure.root;
      const lift = w.route.lift ?? 0;
      root.position.set(here.x, groundAt(here.x, here.y) + lift + (lift ? Math.sin(clock * 1.3) * 0.3 : 0), here.y);
      const heading = Math.atan2(ahead.x - here.x, ahead.y - here.y);
      let turn = heading - root.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      root.rotation.y += turn * (snapHeading ? 1 : Math.min(1, dt * 6));
      w.figure.pose(w.stride, lift ? 0 : 1);
    }
  }

  return { group, update };
}
