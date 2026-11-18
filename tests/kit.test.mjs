import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CLASS_SLOTS, CLS, KIT_STRIDE, LIMBS } from "../src/scene/classes.mjs";
import { PALETTE } from "../src/scene/ink.ts";

const bin = readFileSync(new URL("../public/models/kit.bin", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("../src/scene/kit-manifest.json", import.meta.url), "utf8"));
const models = Object.entries(manifest);

test("the manifest describes kit.bin exactly: contiguous offsets, no spare bytes", () => {
  let offset = 0;
  for (const [name, m] of models) {
    assert.equal(m.offset, offset, `${name} starts where the previous model ends`);
    assert.equal(m.count % 3, 0, `${name} is whole triangles`);
    offset += m.count * KIT_STRIDE;
  }
  assert.equal(offset, bin.length);
});

test("every vertex carries a real material class and a real limb", () => {
  const classes = new Set(Object.values(CLS));
  for (const [name, m] of models) {
    for (let i = 0; i < m.count; i++) {
      const packed = bin[m.offset + i * KIT_STRIDE + 9];
      assert.ok(classes.has(packed & 15), `${name} vertex ${i} has class ${packed & 15}`);
      assert.ok(packed >> 4 < LIMBS.length, `${name} vertex ${i} has limb ${packed >> 4}`);
    }
  }
});

test("only the characters have limb joints, and they have all of them or the parts they use", () => {
  for (const [name, m] of models) {
    if (m.pivots.length === 0) {
      for (let i = 0; i < m.count; i++) assert.equal(bin[m.offset + i * KIT_STRIDE + 9] >> 4, 0, `${name} is not a character`);
    } else {
      assert.ok(m.pivots.length <= LIMBS.length, name);
      assert.ok(m.pivots.some((p) => p !== null), `${name} has no joints at all`);
    }
  }
});

test("a model's quantised bounds are sane", () => {
  for (const [name, m] of models) {
    for (let a = 0; a < 3; a++) assert.ok(m.max[a] > m.min[a], `${name} is flat on axis ${a}`);
  }
});

test("the palette has a colour for every material class and no gaps in the ids", () => {
  const ids = Object.values(CLS).sort((a, b) => a - b);
  assert.deepEqual(ids, ids.map((_, i) => i));
  assert.ok(ids.length <= CLASS_SLOTS);
  assert.equal(PALETTE.length, ids.length);
  for (const color of PALETTE) assert.match(color, /^#[0-9a-f]{6}$/);
});
