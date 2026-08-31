"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { createRenderer, type Renderer } from "@/lib/ascii/renderer";
import { toUnit } from "@/lib/color";

type Props = {
  /** The baked frame, inlined by the server. First paint, and the fallback. */
  staticFrame: string;
  labels: { halt: string; resume: string; reducedMotionNote: string };
  /** Where the galaxy sits, in normalised screen units. Right of centre by default. */
  centerX?: number;
  centerY?: number;
  scale?: number;
};

// Module constant: this is useThemeColors' effect dependency.
const TOKENS = {
  ink: ["--text", "#2B1F11"],
  accent: ["--amber", "#985704"],
} as const;

export function Galaxy({
  staticFrame,
  labels,
  centerX = 0.42,
  centerY = 0,
  scale = 2.5,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const reduced = usePrefersReducedMotion();
  const colors = useThemeColors(TOKENS);

  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);

  // Three independent inputs decide whether the loop runs. Holding them as one
  // value and deriving the answer means the loop's state is never just "whoever
  // called stop() last" - a tab hidden while offscreen has to stay stopped when
  // only one of the two clears.
  const gate = useRef({ onscreen: true, docVisible: true, paused: false });

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: Renderer | null = null;
    try {
      const cs = getComputedStyle(document.documentElement);
      renderer = createRenderer({
        canvas,
        fontFamily: cs.getPropertyValue("--font-departure").trim() || "monospace",
        // Departure Mono has 0 of the 256 Braille patterns; Commit Mono has all
        // of them. Measured from both cmaps, not assumed.
        brailleFontFamily: cs.getPropertyValue("--font-commit").trim() || "monospace",
      });
    } catch {
      renderer = null;
    }
    // No WebGL2: the baked <pre> stays visible and we are done.
    if (!renderer) return;

    const r = renderer;
    rendererRef.current = r;
    const g = gate.current;
    g.onscreen = true;
    g.docVisible = !document.hidden;
    g.paused = false;

    const sync = () => {
      if (g.onscreen && g.docVisible && !g.paused) r.start();
      else r.stop();
    };

    sync();
    setLive(true);

    // Kill the loop whenever it cannot be seen. An offscreen rAF loop is pure
    // battery drain, and this gate applies at every quality tier.
    const io = new IntersectionObserver(
      ([entry]) => {
        g.onscreen = !!entry?.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVis = () => {
      g.docVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    // iOS Safari drops GL contexts on backgrounding. Preventing the default
    // keeps the canvas eligible for restore; until then the baked frame is
    // what the reader sees.
    const onLost = (e: Event) => {
      e.preventDefault();
      r.stop();
      setLive(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      r.dispose();
      rendererRef.current = null;
      setLive(false);
    };
  }, [reduced]);

  // Framing is imperative on purpose. These come from a 768px media query in
  // Hero, and holding them in the effect above would tear down the GL context,
  // re-rasterise the atlas and reallocate every framebuffer on a resize across
  // that breakpoint - to change three floats.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.setCenter(centerX, centerY);
    r.setScale(scale);
  }, [centerX, centerY, scale, live]);

  useEffect(() => {
    rendererRef.current?.setColors(toUnit(colors.ink), toUnit(colors.accent), 1);
  }, [colors, live]);

  function togglePause() {
    const r = rendererRef.current;
    if (!r) return;
    const next = !gate.current.paused;
    gate.current.paused = next;
    if (next) r.stop();
    else if (gate.current.onscreen && gate.current.docVisible) r.start();
    setPaused(next);
  }

  return (
    <>
      {/* Decorative. Everything it depicts is stated in real text elsewhere on
          the page, so it is hidden from assistive tech entirely rather than
          announced as thousands of punctuation marks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{ contain: "strict" }}
      >
        {/* Baked frame: server-rendered first paint, no-JS, no-WebGL, and the
            reduced-motion state. One <pre>, one text node, not 3,600 spans. */}
        <pre
          className="ascii-field absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2 text-dim opacity-70 transition-opacity duration-700 md:left-[72%] md:top-1/2"
          style={{ opacity: live ? 0 : undefined }}
        >
          {staticFrame}
        </pre>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full transition-opacity duration-1000"
          style={{ opacity: live ? 1 : 0 }}
        />
      </div>

      {live ? (
        // SC 2.2.2 is Level A and applies here: the loop auto-starts, runs past
        // five seconds and sits alongside content, so a pause MECHANISM is
        // required. It is not required to be permanently visible, so this uses
        // the skip-link pattern - out of the layout until it takes focus, at
        // which point it is a real, reachable, labelled control.
        <button
          type="button"
          onClick={togglePause}
          className="sr-only z-20 focus:not-sr-only focus:absolute focus:bottom-3 focus:right-4 focus:border focus:border-amber focus:bg-bg focus:px-2 focus:py-0.5 focus:text-chrome focus:text-amber md:focus:right-8"
        >
          [ {paused ? labels.resume : labels.halt} ]
        </button>
      ) : null}

      {reduced ? <p className="sr-only">{labels.reducedMotionNote}</p> : null}
    </>
  );
}
