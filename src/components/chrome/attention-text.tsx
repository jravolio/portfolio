"use client";

import { useEffect, useRef, useState } from "react";
import ParticleText from "@/components/vendor/ParticleText";

/** Resolve a CSS colour (including oklch) to a hex string via canvas 2D. */
function resolveToken(token: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw) return fallback;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[d[0], d[1], d[2]].map((n) => (n ?? 0).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * ParticleText draws to a canvas, so its text exists only as pixels. The real
 * string is rendered underneath as visually-hidden markup: without it Google
 * indexes an empty heading and a screen reader announces nothing.
 *
 * Only mounts once scrolled into view, and never under reduced motion.
 */
export function AttentionText({
  text,
  as: Tag = "h2",
  className = "",
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [fontFamily, setFontFamily] = useState("monospace");
  const [fontSize, setFontSize] = useState(64);
  const [colors, setColors] = useState({ color: "#2B1F11", highlight: "#985704" });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    const read = () => {
      setColors({
        color: resolveToken("--text", "#2B1F11"),
        highlight: resolveToken("--amber", "#985704"),
      });
      // Canvas 2D cannot resolve `var(--font-departure)` in ctx.font, so the
      // custom property has to be read to a real family stack first. Passing
      // the var() string silently leaves the canvas on its default font.
      const fam = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-departure")
        .trim();
      setFontFamily(fam || "monospace");
    };
    read();

    const fit = () => {
      // Departure Mono's advance is 0.636em, so a string of n characters needs
      // n * 0.636 * size px. Solve for the size that fills the column.
      const w = el.clientWidth || 640;
      setFontSize(Math.max(28, Math.min(88, Math.floor((w * 0.62) / (text.length * 0.636)))));
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
    };
  }, [text]);

  return (
    <div ref={ref} className={`w-full ${className}`}>
      <Tag className={show ? "sr-only" : "text-display-3 text-ink-hi"}>{text}</Tag>
      {/* ParticleText centres its string inside the canvas, so the canvas is
          sized to the string. A full-width canvas would centre the word on the
          page while every other block is left-aligned. */}
      {show ? (
        <div
          aria-hidden="true"
          className="relative overflow-hidden"
          style={{
            height: Math.round(fontSize * 1.4),
            width: Math.round(text.length * 0.636 * fontSize * 1.12),
            maxWidth: "100%",
          }}
        >
          <ParticleText
            key={`${fontFamily}-${fontSize}-${colors.color}`}
            text={text}
            trigger="mount"
            particleSize={2}
            density={3}
            scatter={160}
            gatherDuration={1.2}
            stagger={0.4}
            pointerRepel={42}
            repelRadius={100}
            idleDrift={0.4}
            fontSize={fontSize}
            fontFamily={fontFamily}
            color={colors.color}
            highlightColor={colors.highlight}
            glow={false}
            // ParticleText hardcodes min-h-[240px] on its root, which would
            // otherwise overflow this box and collide with the copy below it.
            className="h-full! w-full min-h-0!"
          />
        </div>
      ) : null}
    </div>
  );
}
