"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import PixelSwap from "@/components/vendor/PixelSwap";

/**
 * The site is one document rendered on two output devices: paper (light) and
 * a CRT (dark). PixelSwap dissolves between the two labels from the centre,
 * which is the right gesture for a raster device repainting itself.
 *
 * Driven through PixelSwap's controlled `active`/`onActiveChange` pair rather
 * than its internal state, so next-themes stays the single source of truth and
 * the two cannot drift apart.
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
    return <div aria-hidden="true" style={{ width: 126, height: 28 }} />;
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="border border-rule text-dim hover:border-amber hover:text-amber focus-visible:text-amber"
      style={{ width: 126, height: 28 }}
    >
      <PixelSwap
        firstContent={face("[ paper ]")}
        secondContent={face("[ crt ]")}
        active={isDark}
        trigger="manual"
        pattern="center"
        // PixelSwap's durations are MILLISECONDS (defaults 1400 / 450), not
        // seconds. Passing 0.42 ran the whole dissolve in under half a
        // millisecond, which looks exactly like no animation at all.
        duration={820}
        pixelDuration={360}
        pixelSize={9}
        gap={1}
        pixelSpin={0}
        pixelScale={0.6}
        easing="cubic-bezier(0.16, 1, 0.3, 1)"
        className="h-full w-full"
      />
    </button>
  );
}
