// Material class ids. The geometry pass writes one per fragment, the ink pass colours by it, and the model bake stores it in kit.bin, so a renumbering must happen here and nowhere else.
export const CLS = {
  sky: 0,
  stone: 1,
  roof: 2,
  ground: 3,
  foliage: 4,
  water: 5,
  light: 6,
  cloth: 7,
  moon: 8,
  shade: 9,
  wood: 10,
  pale: 11,
  plaster: 12,
};

// The geometry pass encodes a class as (class + 0.5) / CLASS_SLOTS in an 8-bit channel.
export const CLASS_SLOTS = 16;

// Baked kit models are laid out as KIT_STRIDE bytes per vertex. A character's six rigid parts carry their index in LIMBS in the high nibble of the class byte.
export const KIT_STRIDE = 12;
export const LIMBS = ["torso", "head", "arm-right", "arm-left", "leg-right", "leg-left"];
