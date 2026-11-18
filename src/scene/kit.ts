import { KIT_STRIDE } from "./classes.mjs";
import manifest from "./kit-manifest.json";

type KitName = keyof typeof manifest;
export type KitModel = {
  position: Float32Array;
  normal: Float32Array;
  tag: Float32Array;
  /** Limb index per vertex, and each limb's joint. Only the characters have more than one. */
  limb: Uint8Array;
  pivots: Array<number[] | null>;
};
export type Kit = Record<KitName, KitModel>;


export async function loadKit(): Promise<Kit> {
  const response = await fetch("/models/kit.bin");
  if (!response.ok) throw new Error(`Could not load the model kit: ${response.status}`);
  const view = new DataView(await response.arrayBuffer());
  const kit = {} as Kit;
  for (const name of Object.keys(manifest) as KitName[]) {
    const { offset, count, min, max, pivots } = manifest[name];
    const limb = new Uint8Array(count);
    const position = new Float32Array(count * 3);
    const normal = new Float32Array(count * 3);
    const tag = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const at = offset + i * KIT_STRIDE;
      for (let a = 0; a < 3; a++) {
        position[i * 3 + a] = min[a] + (view.getUint16(at + a * 2, true) / 65535) * (max[a] - min[a]);
        normal[i * 3 + a] = view.getInt8(at + 6 + a) / 127;
      }
      const packed = view.getUint8(at + 9);
      tag[i * 3] = packed & 15;
      limb[i] = packed >> 4;
      tag[i * 3 + 1] = view.getUint8(at + 10) / 255;
      tag[i * 3 + 2] = view.getUint8(at + 11) / 255;
    }
    kit[name] = { position, normal, tag, limb, pivots };
  }
  return kit;
}
