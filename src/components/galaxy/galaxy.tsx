"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { createRenderer, type Renderer, type Stats } from "@/lib/ascii/renderer";

type Props = {
  /** The baked frame, inlined by the server. First paint, and the fallback. */
  staticFrame: string;
  labels: { halt: string; resume: string; alt: string; reducedMotionNote: string };
  /** Where the hole sits, in normalised screen units. Right of centre by default. */
  centerX?: number;
  centerY?: number;
  scale?: number;
  onStats?: (s: Stats | null) => void;
};

/** Resolve any CSS colour (including oklch) to 0..1 RGB via canvas 2D. */
function resolveColor(cssColor: string, fallback: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillStyle = cssColor || fallback;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0]! / 255, d[1]! / 255, d[2]! / 255];
}

export function Galaxy({
  staticFrame,
  labels,
  centerX = 0.42,
  centerY = 0,
  scale = 2.5,
  onStats,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const pausedRef = useRef(false);
  const reduced = usePrefersReducedMotion();

  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);

  const syncColors = useCallback(() => {
    const r = rendererRef.current;
    const host = hostRef.current;
    if (!r || !host) return;
    const cs = getComputedStyle(host);
    r.setColors(
      resolveColor(cs.getPropertyValue("--text").trim(), "#2B1F11"),
      resolveColor(cs.getPropertyValue("--amber").trim(), "#985704"),
      1,
    );
  }, []);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let r: Renderer | null = null;
    try {
      r = createRenderer({
        canvas,
        fontFamily:
          getComputedStyle(document.documentElement).getPropertyValue("--font-departure").trim() ||
          "monospace",
        // Departure Mono has 0 of the 256 Braille patterns; Commit Mono has all
        // of them. Measured from both cmaps, not assumed.
        brailleFontFamily:
          getComputedStyle(document.documentElement).getPropertyValue("--font-commit").trim() ||
          "monospace",
        mode: "braille",
        onStats: (s) => onStats?.(s),
      });
    } catch {
      r = null;
    }
    // No WebGL2: the baked <pre> stays visible and we are done.
    if (!r) return;

    const renderer = r;
    rendererRef.current = renderer;
    renderer.setCenter(centerX, centerY);
    renderer.setScale(scale);
    syncColors();
    renderer.start();
    setLive(true);

    // Kill the loop whenever it cannot be seen. An offscreen rAF loop is pure
    // battery drain, and this gate applies at every quality tier.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !pausedRef.current) renderer.start();
        else renderer.stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVis = () => {
      if (document.hidden) renderer.stop();
      else if (!pausedRef.current) renderer.start();
    };
    document.addEventListener("visibilitychange", onVis);

    // iOS Safari drops GL contexts on backgrounding.
    const onLost = (e: Event) => {
      e.preventDefault();
      renderer.stop();
      setLive(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);


    const mo = new MutationObserver(syncColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      renderer.dispose();
      rendererRef.current = null;
      setLive(false);
    };
  }, [reduced, syncColors, centerX, centerY, scale, onStats]);


  function togglePause() {
    const r = rendererRef.current;
    if (!r) return;
    if (r.isRunning) {
      r.stop();
      pausedRef.current = true;
      setPaused(true);
    } else {
      r.start();
      pausedRef.current = false;
      setPaused(false);
    }
  }

  return (
    <>
      {/* Decorative. Everything it depicts is stated in real text elsewhere on
          the page, so it is hidden from assistive tech entirely rather than
          announced as thousands of punctuation marks. */}
      <div
        ref={hostRef}
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
        // SC 2.2.2: the loop auto-starts, runs past five seconds and sits
        // alongside content, so a pause control is a Level A requirement.
        // Pinned to the hero's bottom-right, in the readout's row.
        <div className="absolute bottom-3 right-4 z-10 md:right-8">
          <button
            type="button"
            onClick={togglePause}
            className="border border-rule bg-bg px-2 py-0.5 text-chrome text-dim transition-colors hover:border-amber hover:text-amber"
          >
            [ {paused ? labels.resume : labels.halt} ]
          </button>
        </div>
      ) : null}

      {reduced ? <p className="sr-only">{labels.reducedMotionNote}</p> : null}
    </>
  );
}
