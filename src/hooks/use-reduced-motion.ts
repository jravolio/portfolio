"use client";

import { useMediaQuery } from "./use-media-query";

export function usePrefersReducedMotion() {
  // Server snapshot assumes reduced. The static frame is the safe first paint:
  // hydrating from "animate" to "static" would flash, the reverse would not.
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}
