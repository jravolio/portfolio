"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import PixelSwap from "@/components/vendor/PixelSwap";

/**
 * Light and dark, named plainly.
 *
 * An ASCII sun and moon were built here first and removed: Departure Mono has
 * no dingbats at all, so they had to be drawn from half-blocks, and at 11px in
 * a 3x3 cell they read as noise rather than as icons. The word is clearer than
 * the picture at this size, which is the whole argument for a text-mode site.
 *
 * PixelSwap dissolves between the two labels from the centre, driven through
 * its controlled `active` prop rather than its internal state, so next-themes
 * stays the single source of truth and the two cannot drift apart.
 */
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

  const face = (text: string) => (
    <span className="flex h-full w-full items-center justify-center text-chrome tracking-normal">
      {text}
    </span>
  );

  if (!mounted) {
    // Reserve the exact cell footprint so nothing shifts on hydration.
    return <div aria-hidden="true" style={{ width: 84, height: 28 }} />;
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="border border-rule text-dim transition-colors hover:border-amber hover:text-amber focus-visible:text-amber"
      style={{ width: 84, height: 28 }}
    >
      <PixelSwap
        firstContent={face("[ light ]")}
        secondContent={face("[ dark ]")}
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
