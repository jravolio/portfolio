"use client";

import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { BlackHole } from "@/components/black-hole/black-hole";
import { CopyEmail } from "@/components/chrome/copy-email";
import type { Mode, Stats } from "@/lib/ascii/renderer";

type Props = {
  staticFrame: string;
  name: string;
  identity: string;
  tagline: string;
  email: string;
  linkedin: string;
  github: string;
  labels: {
    halt: string;
    resume: string;
    alt: string;
    reducedMotionNote: string;
    copyEmail: string;
    copied: string;
  };
};

/**
 * Full-bleed hero. The field is a background, not a picture in a box: it spans
 * the viewport with the hole offset right, and the name sits in the left
 * column reading over the empty sky beside it.
 */
export function Hero(props: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [mode, setMode] = useState<Mode>("braille");
  // On a narrow viewport there is no left column to sit beside, so the hole
  // drops below the copy and the scrim runs top-to-bottom instead.
  const narrow = useMediaQuery("(max-width: 768px)", false);

  return (
    <section
      id="top"
      // Breaks out of the 896px content column to the full viewport width
      // without introducing a horizontal scrollbar.
      className="relative left-1/2 w-screen -translate-x-1/2"
      style={{ minHeight: "clamp(520px, 82vh, 860px)" }}
    >
      <BlackHole
        staticFrame={props.staticFrame}
        headline={props.name.toUpperCase()}
        centerX={narrow ? 0 : 0.44}
        centerY={narrow ? -0.78 : 0}
        scale={narrow ? 13 : 9}
        mode={mode}
        onStats={setStats}
        labels={{
          halt: props.labels.halt,
          resume: props.labels.resume,
          alt: props.labels.alt,
          reducedMotionNote: props.labels.reducedMotionNote,
        }}
      />

      {/* A scrim only under the text column, so the left stays legible without
          dimming the whole field. Contrast is recomputed after this overlay,
          not on the raw tokens. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: narrow
            ? "linear-gradient(to bottom, oklch(from var(--bg) l c h / 1) 0%, oklch(from var(--bg) l c h / 1) 62%, oklch(from var(--bg) l c h / 0.82) 72%, oklch(from var(--bg) l c h / 0.2) 86%, oklch(from var(--bg) l c h / 0) 95%)"
            : "linear-gradient(to right, oklch(from var(--bg) l c h / 1) 0%, oklch(from var(--bg) l c h / 1) 24%, oklch(from var(--bg) l c h / 0.92) 38%, oklch(from var(--bg) l c h / 0.55) 50%, oklch(from var(--bg) l c h / 0.15) 60%, oklch(from var(--bg) l c h / 0) 70%)",
        }}
      />

      <div className="relative mx-auto flex h-full max-w-[min(100%-2rem,1280px)] flex-col px-2 pt-20 pb-16 md:justify-center md:pt-28">
        <div className="max-w-[54ch]">
          <p className="text-chrome text-amber">{props.tagline}</p>

          {/* The single h1. The field behind draws this same name by projecting
              escaped geodesics onto a sky plane, but pixels are not indexable
              and a screen reader cannot read a shader. */}
          <h1 className="mt-3 text-display-3 leading-[1.05] text-ink-hi lg:text-display-4">
            {props.name}
          </h1>

          <p className="mt-6 max-w-[52ch] text-body text-dim">{props.identity}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CopyEmail
              email={props.email}
              labels={{ copy: props.labels.copyEmail, copied: props.labels.copied }}
            />
            <a
              href={props.linkedin}
              target="_blank"
              rel="noreferrer"
              className="border border-rule bg-bg px-3 py-1 text-chrome text-dim transition-colors hover:border-amber hover:text-amber"
            >
              linkedin
            </a>
            <a
              href={props.github}
              target="_blank"
              rel="noreferrer"
              className="border border-rule bg-bg px-3 py-1 text-chrome text-dim transition-colors hover:border-amber hover:text-amber"
            >
              github
            </a>
          </div>
        </div>
      </div>

      {/* The readout, pinned to the bottom of the hero. Live-bound to the
          uniforms: drag the field and watch `incl` move. That is the proof it
          is computed rather than looped. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-[min(100%-2rem,1280px)] flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule bg-bg/95 px-2 py-2 pr-28 text-chrome text-dim backdrop-blur-[1px]">
          <span aria-hidden="true">schwarzschild a=0</span>
          <span aria-hidden="true" data-numeric>
            b_crit 2.598 r_s
          </span>
          {stats ? (
            <>
              <span aria-hidden="true" data-numeric>
                incl {stats.incl.toFixed(2)} rad
              </span>
              <span aria-hidden="true" data-numeric>
                {stats.cols}x{stats.rows} cells
                {stats.mode === "braille" ? ` · ${stats.samples.toLocaleString("en-US")} dots` : ""}
              </span>
              <span aria-hidden="true" data-numeric>
                {stats.steps} steps
              </span>
              <span aria-hidden="true" data-numeric>
                {stats.frameMs.toFixed(1)} ms
              </span>
            </>
          ) : (
            <span aria-hidden="true">pre-rendered frame</span>
          )}

          {/* Flipping between the two is the clearest way to show what the
              Braille sub-cell raster buys: same grid, eight times the samples. */}
          {stats ? (
            <div className="pointer-events-auto ml-auto flex items-center gap-1">
              {(["ramp", "braille"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={
                    mode === m
                      ? "border border-amber px-2 text-chrome text-amber"
                      : "border border-rule px-2 text-chrome text-dim hover:border-amber hover:text-amber"
                  }
                >
                  {m === "ramp" ? "[ \u2591 blocks ]" : "[ \u28ff braille ]"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
