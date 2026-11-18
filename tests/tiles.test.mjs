import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { mulberry } from "../src/scene/rng.ts";
import { groupByTile, tileMeshes } from "../src/scene/tiles.ts";

function scatter(count, seed = 1897) {
  const rng = mulberry(seed);
  return Array.from({ length: count }, () => ({ x: (rng() - 0.5) * 420, z: -170 + rng() * 400 }));
}

test("every point lands in exactly one tile, in ascending order", () => {
  const points = scatter(1500);
  const tiles = groupByTile(points, 8);
  const seen = tiles.flat();
  assert.equal(seen.length, points.length);
  assert.equal(new Set(seen).size, points.length);
  for (const tile of tiles) {
    assert.ok(tile.length > 0, "empty tiles are dropped");
    assert.deepEqual(tile, [...tile].sort((a, b) => a - b));
  }
});

test("a tile is one grid cell wide and deep, and there are no more tiles than cells", () => {
  const points = scatter(1500);
  assert.ok(groupByTile(points, 8).length <= 64);
  for (const tile of groupByTile(points, 8)) {
    const xs = tile.map((i) => points[i].x);
    const zs = tile.map((i) => points[i].z);
    assert.ok(Math.max(...xs) - Math.min(...xs) <= 420 / 8 + 1e-6, "a tile is one cell wide");
    assert.ok(Math.max(...zs) - Math.min(...zs) <= 400 / 8 + 1e-6, "a tile is one cell deep");
  }
});

test("a grid of one keeps everything together and degenerate input does not divide by zero", () => {
  const points = scatter(50);
  assert.deepEqual(groupByTile(points, 1), [points.map((_, i) => i)]);
  assert.deepEqual(groupByTile([], 8), []);
  assert.deepEqual(groupByTile([{ x: 3, z: 3 }, { x: 3, z: 3 }], 8), [[0, 1]]);
});

test("tile meshes keep each pine's index and matrix, can be culled, and bound their pines", () => {
  const points = scatter(400);
  const geometry = new THREE.ConeGeometry(1.2, 6, 5);
  geometry.translate(0, 3, 0);
  geometry.computeBoundingSphere();
  const rng = mulberry(7);
  const spots = points.map((p) => ({
    ...p,
    m: new THREE.Matrix4().compose(
      new THREE.Vector3(p.x, rng() * 20, p.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng() * 6, 0)),
      new THREE.Vector3().setScalar(0.9 + rng() * 1.3),
    ),
  }));
  const meshes = tileMeshes(geometry, spots, 8);
  const indices = meshes.flatMap((mesh) => Array.from(mesh.geometry.getAttribute("aPine").array));
  assert.deepEqual([...indices].sort((a, b) => a - b), points.map((_, i) => i), "every pine is in exactly one tile");
  const drawn = new THREE.Matrix4();
  for (const mesh of meshes) {
    assert.ok(mesh.frustumCulled, "a tile can be culled");
    assert.equal(mesh.geometry.getAttribute("position"), geometry.getAttribute("position"), "tiles share the vertex buffers");
    assert.equal(mesh.geometry.index, geometry.index, "a tile draws with the pine geometry's own index");
    const pines = mesh.geometry.getAttribute("aPine").array;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, drawn);
      const kept = spots[pines[i]].m.toArray();
      drawn.toArray().forEach((value, k) => {
        assert.ok(Math.abs(value - kept[k]) <= 1e-4 * Math.max(1, Math.abs(kept[k])), `instance ${i} of a tile keeps pine ${pines[i]}'s matrix (element ${k})`);
      });
      const own = geometry.boundingSphere.clone().applyMatrix4(drawn);
      const gap = mesh.boundingSphere.center.distanceTo(own.center) + own.radius - mesh.boundingSphere.radius;
      assert.ok(gap <= 1e-4, `pine ${pines[i]} sticks out of its tile's sphere by ${gap}`);
    }
  }
});

test("a tile that is culled has no pine on screen, from any camera", () => {
  const points = scatter(600);
  const geometry = new THREE.ConeGeometry(1.2, 6, 5);
  geometry.translate(0, 3, 0);
  geometry.computeBoundingSphere();
  const rng = mulberry(11);
  const spots = points.map((p) => ({
    ...p,
    m: new THREE.Matrix4().compose(
      new THREE.Vector3(p.x, rng() * 30, p.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng() * 6, 0)),
      new THREE.Vector3().setScalar(0.9 + rng() * 1.3),
    ),
  }));
  const meshes = tileMeshes(geometry, spots, 8);
  const camera = new THREE.PerspectiveCamera(36, 1.6, 1, 1400);
  const frustum = new THREE.Frustum();
  const drawn = new THREE.Matrix4();
  let culled = 0;
  for (let c = 0; c < 60; c++) {
    camera.position.set((rng() - 0.5) * 300, 5 + rng() * 120, -150 + rng() * 360);
    camera.lookAt((rng() - 0.5) * 200, rng() * 40, -150 + rng() * 320);
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const mesh of meshes) {
      if (frustum.intersectsObject(mesh)) continue;
      culled++;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, drawn);
        const own = geometry.boundingSphere.clone().applyMatrix4(drawn);
        assert.ok(!frustum.intersectsSphere(own), `camera ${c}: a culled tile has pine ${mesh.geometry.getAttribute("aPine").array[i]} on screen`);
      }
    }
  }
  assert.ok(culled > 100, "the cameras cull a fair share of the tiles, so the check has teeth");
});
