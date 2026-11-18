import * as THREE from "three";

export function groupByTile(points: ReadonlyArray<{ x: number; z: number }>, grid: number): number[][] {
  if (points.length === 0) return [];
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const { x, z } of points) {
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  }
  const cellX = (x1 - x0) / grid || 1;
  const cellZ = (z1 - z0) / grid || 1;
  const tiles: number[][] = Array.from({ length: grid * grid }, () => []);
  points.forEach(({ x, z }, i) => {
    const tx = Math.min(grid - 1, Math.floor((x - x0) / cellX));
    const tz = Math.min(grid - 1, Math.floor((z - z0) / cellZ));
    tiles[tz * grid + tx].push(i);
  });
  return tiles.filter((tile) => tile.length > 0);
}

export function tileMeshes(
  geometry: THREE.BufferGeometry,
  spots: ReadonlyArray<{ x: number; z: number; m: THREE.Matrix4 }>,
  grid: number,
): THREE.InstancedMesh[] {
  return groupByTile(spots, grid).map((group) => {
    const tile = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) tile.setAttribute(name, attribute);
    if (geometry.index) tile.setIndex(geometry.index);
    // The vertex shader offsets each pine's object id by its index, so a tile carries the indices from before the split.
    tile.setAttribute("aPine", new THREE.InstancedBufferAttribute(Float32Array.from(group), 1));
    const mesh = new THREE.InstancedMesh(tile, undefined, group.length);
    group.forEach((spot, i) => mesh.setMatrixAt(i, spots[spot].m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  });
}
