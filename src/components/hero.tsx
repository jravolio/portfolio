"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { Galaxy } from "@/components/galaxy/galaxy";
import { CopyEmail } from "@/components/chrome/copy-email";

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
  // On a narrow viewport there is no left column to sit beside, so the galaxy
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
      <Galaxy
        staticFrame={props.staticFrame}
        centerX={narrow ? 0 : 0.92}
        centerY={narrow ? -0.78 : 0}
        scale={narrow ? 3.4 : 2.5}
        labels={props.labels}
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

          {/* The single h1. The field behind it is decorative and aria-hidden,
              so the name has to exist as real text: pixels are not indexable
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
              className="key text-chrome"
            >
              linkedin
            </a>
            <a
              href={props.github}
              target="_blank"
              rel="noreferrer"
              className="key text-chrome"
            >
              github
            </a>
          </div>
        </div>
      </div>

    </section>
  );
}
