"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import PixelSwap from "@/components/vendor/PixelSwap";

/**
 * Sun and moon, drawn in characters like everything else on the site.
 *
 * Three rows of three cells: 21x42px, exactly on the lattice. Departure Mono is
 * a pixel font, so at 11px these read as hard little icons rather than as
 * punctuation.
 *
 * PixelSwap dissolves between the two from the centre, which is the right
 * gesture for a raster device repainting itself. It is driven through the
 * controlled `active` prop rather than its internal state, so next-themes stays
 * the single source of truth and the two cannot drift apart.
 */
// Departure Mono has no dingbats (no sun, moon, or filled circle), but it does
// carry the half-block set, which has far more ink than punctuation and so
// actually reads at 11px. Measured from the face, not assumed.
const SUN = ["\\|/", "-\u2588-", "/|\\"];
const MOON = ["\u2584\u2580\u2580", "\u2588  ", "\u2580\u2584\u2584"];

export function DeviceToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Hydration guard: next-themes cannot know the resolved theme on the server.
  // useSyncExternalStore expresses "false on the server, true on the client"
  // directly, instead of an effect that immediately calls setState.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  const face = (rows: string[]) => (
    <span className="flex h-full w-full items-center justify-center">
      <pre className="ascii-field m-0 bg-transparent p-0 leading-[14px]">{rows.join("\n")}</pre>
    </span>
  );

  if (!mounted) {
    // Reserve the exact cell footprint so nothing shifts on hydration.
    return <div aria-hidden="true" style={{ width: 42, height: 42 }} />;
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="border border-rule text-dim transition-colors hover:border-amber hover:text-amber focus-visible:text-amber"
      style={{ width: 42, height: 42 }}
    >
      <PixelSwap
        firstContent={face(SUN)}
        secondContent={face(MOON)}
        active={isDark}
        trigger="manual"
        pattern="center"
        // PixelSwap's durations are MILLISECONDS (defaults 1400 / 450), not
        // seconds. Passing 0.42 ran the whole dissolve in under half a
        // millisecond, which looks exactly like no animation at all.
        duration={720}
        pixelDuration={320}
        pixelSize={8}
        gap={1}
        pixelSpin={0}
        pixelScale={0.6}
        easing="cubic-bezier(0.16, 1, 0.3, 1)"
        className="h-full w-full"
      />
    </button>
  );
}
