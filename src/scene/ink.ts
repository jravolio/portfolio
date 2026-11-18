import { CLS } from "./classes.mjs";

const COLORS: Record<keyof typeof CLS, string> = {
  sky: "#1a2030",
  stone: "#4a5266",
  roof: "#2a2c3c",
  ground: "#39414f",
  foliage: "#232c33",
  water: "#1b2233",
  light: "#f3b755",
  cloth: "#8a1c1c",
  moon: "#ece6d2",
  shade: "#0b0c12",
  wood: "#3a3230",
  pale: "#ddd5c0",
  plaster: "#6f7386",
};

export const PALETTE = (Object.keys(CLS) as Array<keyof typeof CLS>)
  .sort((a, b) => CLS[a] - CLS[b])
  .map((name) => COLORS[name]);

export const INK = {
  ink: "#07080d",
  skyTop: "#0d1220",
  skyBot: "#3b4660",
  fog: "#414b63",
  mist: "#9aa3b6",
  chalk: "#e6e1d0",
  glow: "#f0a742",
  wobble: 1.5,
  line: 0.95,
  inkAlpha: 0.92,
  grain: 0.16,
  fogDensity: 0.0052,
  mistAmt: 0.85,
  shadeLo: 0.42,
  shadeHi: 1.25,
  boil: 6,
  vignette: 0.45,
} as const;
