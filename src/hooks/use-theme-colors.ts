"use client";

import { useEffect, useState } from "react";
import { resolveCssColor, type RGB } from "@/lib/color";

export type ColorSpec = Readonly<Record<string, readonly [cssVar: string, fallback: string]>>;

/**
 * Read a set of CSS custom properties as RGB, and re-read them when the theme
 * changes.
 *
 * next-themes swaps a class on <html>, which restyles everything downstream for
 * free - but a canvas painting its own pixels has to be told. One observer per
 * consumer, watching only the class attribute.
 *
 * `spec` must be a stable reference (hoist it to a module constant). It is the
 * effect's only dependency, and an object literal rebuilt each render would
 * reattach the observer on every render.
 */
export function useThemeColors<S extends ColorSpec>(spec: S): Record<keyof S, RGB> {
  const [colors, setColors] = useState<Record<keyof S, RGB>>(() => fallbacks(spec));

  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const next = {} as Record<keyof S, RGB>;
      for (const key of Object.keys(spec) as (keyof S)[]) {
        const [cssVar, fallback] = spec[key]!;
        next[key] = resolveCssColor(cs.getPropertyValue(cssVar).trim(), fallback);
      }
      setColors(next);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, [spec]);

  return colors;
}

/** Server and first-paint value: the declared fallbacks, parsed without a DOM. */
function fallbacks<S extends ColorSpec>(spec: S): Record<keyof S, RGB> {
  const out = {} as Record<keyof S, RGB>;
  for (const key of Object.keys(spec) as (keyof S)[]) {
    const hex = spec[key]![1].replace("#", "");
    out[key] = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return out;
}
