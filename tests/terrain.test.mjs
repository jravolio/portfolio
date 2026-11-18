import assert from "node:assert/strict";
import { test } from "node:test";
import { mulberry } from "../src/scene/rng.ts";
import { CRAG, height, roadX, sstep, stairHeight, stairPoint } from "../src/scene/terrain.ts";

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`);
}

test("the ground is finite everywhere on the map", () => {
  for (let x = -360; x <= 360; x += 24) {
    for (let z = -330; z <= 390; z += 24) {
      assert.ok(Number.isFinite(height(x, z)), `height(${x}, ${z})`);
    }
  }
});

test("the castle stair is graded into the ground along its whole length", () => {
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const { x, z } = stairPoint(t);
    near(height(x, z), stairHeight(t), 1e-9, `ground under the stair at t=${t}`);
  }
});

test("the stair only ever goes down from the castle", () => {
  let previous = stairHeight(0);
  near(previous, CRAG.top, 1e-9, "the stair starts at the castle floor");
  for (let i = 1; i <= 40; i++) {
    const now = stairHeight(i / 40);
    assert.ok(now <= previous, `step ${i} rises`);
    previous = now;
  }
});

test("the castle floor is flat", () => {
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    for (const r of [0, 3, 6]) {
      near(height(CRAG.x + Math.cos(angle) * r, CRAG.z + Math.sin(angle) * r), CRAG.top, 1e-6, `r=${r} angle=${a}`);
    }
  }
});

test("the road runs straight across the river, so it meets the bridge deck", () => {
  const crossing = roadX(54);
  for (let z = 44; z <= 70; z += 2) near(roadX(z), crossing, 1e-9, `roadX(${z})`);
});

test("sstep accepts its edges in either order and stays in 0..1", () => {
  assert.equal(sstep(0, 1, -5), 0);
  assert.equal(sstep(0, 1, 5), 1);
  assert.equal(sstep(1, 0, -5), 1);
  assert.equal(sstep(1, 0, 5), 0);
  near(sstep(0, 1, 0.5), 0.5, 1e-12, "the midpoint");
});

test("the seeded generator repeats and stays in [0, 1)", () => {
  const a = mulberry(1897);
  const b = mulberry(1897);
  for (let i = 0; i < 1000; i++) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
  assert.notEqual(mulberry(1)(), mulberry(2)());
});
