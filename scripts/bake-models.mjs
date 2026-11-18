// Converts picked kit models into the scene's own vertex format, so the site ships no glTF loader and no textures.
// Usage: node scripts/bake-models.mjs [--inspect]
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { PNG } from "pngjs";
import { CLS, KIT_STRIDE, LIMBS } from "../src/scene/classes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packs = join(root, ".model-candidates");
if (!existsSync(packs)) {
  throw new Error(`${packs} is missing. Download the CC0 packs listed under "Kit models" in ARCHITECTURE.md into it first.`);
}
const hexagon = "kaykit-medieval-hexagon-pack/KayKit-Medieval-Hexagon-Pack-1.0-main/addons/kaykit_medieval_hexagon_pack/Assets/gltf";
const halloween = "kaykit-halloween-bits/KayKit-Halloween-Bits-1.0-main/addons/kaykit_halloween_bits/Assets/gltf";
const graveyard = "kenney-graveyard-kit/Models/GLB format";
const town = "kenney-fantasy-town-kit/Models/GLB format";

const MODELS = {
  church: `${hexagon}/buildings/red/building_church_red.gltf`,
  well: `${hexagon}/buildings/red/building_well_red.gltf`,
  deadLarge: `${halloween}/tree_dead_large.gltf`,
  deadMedium: `${halloween}/tree_dead_medium.gltf`,
  deadSmall: `${halloween}/tree_dead_small.gltf`,
  crypt: `${halloween}/crypt.gltf`,
  archGate: `${halloween}/arch_gate.gltf`,
  graveA: `${halloween}/grave_A.gltf`,
  graveB: `${halloween}/grave_B.gltf`,
  gravestone: `${halloween}/gravestone.gltf`,
  gravemarker: `${halloween}/gravemarker_A.gltf`,
  fence: `${halloween}/fence.gltf`,
  postLantern: `${halloween}/post_lantern.gltf`,
  crossStone: `${graveyard}/gravestone-cross-large.glb`,
  pine: `${graveyard}/pine.glb`,
  cart: `${town}/cart.glb`,
  keeper: `${graveyard}/character-keeper.glb`,
  skeleton: `${graveyard}/character-skeleton.glb`,
  ghost: `${graveyard}/character-ghost.glb`,
};

function classify(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  let hue = 0;
  if (max !== min) {
    if (max === r) hue = ((g - b) / (max - min)) * 60;
    else if (max === g) hue = (2 + (b - r) / (max - min)) * 60;
    else hue = (4 + (r - g) / (max - min)) * 60;
    if (hue < 0) hue += 360;
  }
  const luma = 0.3 * r + 0.59 * g + 0.11 * b;
  const tone = 0.3 + luma * 0.55;
  if (max < 0.16) return [CLS.shade, 0.12];
  if (sat < 0.16) return [luma > 0.72 ? CLS.plaster : CLS.stone, tone];
  if (hue >= 60 && hue < 175) return [CLS.foliage, tone];
  if (hue >= 175 && hue < 290) return [sat > 0.35 ? CLS.roof : CLS.stone, tone * 0.85];
  if (hue >= 38 && hue < 60 && luma > 0.6 && sat > 0.45) return [CLS.light, 1];
  if ((hue < 25 || hue >= 330) && sat > 0.68) return [CLS.roof, tone * 0.8];
  if (luma > 0.44 && sat < 0.56) return [CLS.plaster, tone + 0.1];
  return [CLS.wood, Math.min(1, tone * 1.5)];
}

function textureSampler(material) {
  const factor = material?.getBaseColorFactor() ?? [1, 1, 1, 1];
  const image = material?.getBaseColorTexture()?.getImage();
  if (!image) return () => factor;
  const png = PNG.sync.read(Buffer.from(image));
  return (u, v) => {
    const x = Math.min(png.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * png.width)));
    const y = Math.min(png.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * png.height)));
    const i = (y * png.width + x) * 4;
    return [
      (factor[0] * png.data[i]) / 255,
      (factor[1] * png.data[i + 1]) / 255,
      (factor[2] * png.data[i + 2]) / 255,
    ];
  };
}

function srgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function transformNormal(m, [x, y, z]) {
  const n = [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
  const len = Math.hypot(...n) || 1;
  return n.map((v) => v / len);
}

async function bake(io, file, inspect) {
  const doc = await io.read(join(packs, file));
  const vertices = [];
  const pivots = [];
  const histogram = new Map();
  let part = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const world = node.getWorldMatrix();
    const limb = Math.max(0, LIMBS.indexOf(node.getName()));
    if (LIMBS.includes(node.getName())) pivots[limb] = [world[12], world[13], world[14]];
    for (const prim of mesh.listPrimitives()) {
      part++;
      const position = prim.getAttribute("POSITION");
      const normal = prim.getAttribute("NORMAL");
      const uv = prim.getAttribute("TEXCOORD_0");
      const vertexColor = prim.getAttribute("COLOR_0");
      const sample = textureSampler(prim.getMaterial());
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : position.getCount();
      for (let i = 0; i < count; i++) {
        const v = indices ? indices.getScalar(i) : i;
        let [r, g, b] = uv ? sample(...uv.getElement(v, [])) : sample(0, 0);
        if (!uv) [r, g, b] = [srgb(r), srgb(g), srgb(b)];
        if (vertexColor) {
          const c = vertexColor.getElement(v, []);
          [r, g, b] = [r * srgb(c[0]), g * srgb(c[1]), b * srgb(c[2])];
        }
        const [cls, tone] = classify(r, g, b);
        const key = `${Math.round(r * 15)},${Math.round(g * 15)},${Math.round(b * 15)}`;
        histogram.set(key, (histogram.get(key) ?? 0) + 1);
        const id = (Math.sin(part * 12.9898 + cls * 78.233 + Math.round(tone * 40) * 3.7) * 43758.5453) % 1;
        vertices.push({
          p: transformPoint(world, position.getElement(v, [])),
          n: normal ? transformNormal(world, normal.getElement(v, [])) : [0, 1, 0],
          cls,
          tone,
          id: Math.abs(id),
          limb,
        });
      }
    }
  }
  if (inspect) {
    const top = [...histogram].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(file.split("/").pop(), vertices.length / 3, "tris", top.map(([k, n]) => `${k}:${n}`).join("  "));
  }
  return { vertices, pivots };
}

const inspect = process.argv.includes("--inspect");
const io = new NodeIO();
io.setLogger({ debug() {}, info() {}, warn() {}, error: console.error });
const manifest = {};
const chunks = [];
let offset = 0;

for (const [name, file] of Object.entries(MODELS)) {
  const { vertices, pivots } = await bake(io, file, inspect);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const { p } of vertices) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], p[a]);
      max[a] = Math.max(max[a], p[a]);
    }
  }
  const buffer = Buffer.alloc(vertices.length * KIT_STRIDE);
  vertices.forEach(({ p, n, cls, tone, id, limb }, i) => {
    const at = i * KIT_STRIDE;
    for (let a = 0; a < 3; a++) {
      const span = max[a] - min[a] || 1;
      buffer.writeUInt16LE(Math.round(((p[a] - min[a]) / span) * 65535), at + a * 2);
      buffer.writeInt8(Math.round(n[a] * 127), at + 6 + a);
    }
    buffer.writeUInt8(cls | (limb << 4), at + 9);
    buffer.writeUInt8(Math.round(Math.min(1, tone) * 255), at + 10);
    buffer.writeUInt8(Math.round(id * 255), at + 11);
  });
  manifest[name] = {
    offset,
    count: vertices.length,
    min: min.map((v) => Number(v.toFixed(4))),
    max: max.map((v) => Number(v.toFixed(4))),
    pivots: pivots.map((pivot) => pivot.map((v) => Number(v.toFixed(4)))),
  };
  offset += buffer.length;
  chunks.push(buffer);
}

if (!inspect) {
  writeFileSync(join(root, "public/models/kit.bin"), Buffer.concat(chunks));
  writeFileSync(join(root, "src/scene/kit-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`${Object.keys(manifest).length} models, ${(offset / 1024).toFixed(0)} KB`);
for (const [name, m] of Object.entries(manifest)) {
  console.log(name.padEnd(12), String(m.count / 3).padStart(6), "tris  size", m.max.map((v, a) => (v - m.min[a]).toFixed(2)).join(" x "));
}
