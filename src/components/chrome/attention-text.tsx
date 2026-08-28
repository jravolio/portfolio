"use client";

import { useEffect, useRef, useState } from "react";
import ParticleText from "@/components/vendor/ParticleText";

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
  fontSize = 44,
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
  fontSize?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [colors, setColors] = useState({ color: "#2B1F11", highlight: "#985704" });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    const resolve = (token: string, fallback: string) => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      if (!raw) return fallback;
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillStyle = raw;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return `#${[d[0], d[1], d[2]].map((n) => (n ?? 0).toString(16).padStart(2, "0")).join("")}`;
    };
    setColors({ color: resolve("--text", "#2B1F11"), highlight: resolve("--amber", "#985704") });

    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      <Tag className={show ? "sr-only" : "text-display-3"}>{text}</Tag>
      {show ? (
        <div aria-hidden="true" style={{ height: fontSize * 1.6 }}>
          <ParticleText
            text={text}
            trigger="mount"
            particleSize={2}
            density={3}
            scatter={140}
            gatherDuration={1.1}
            stagger={0.35}
            pointerRepel={38}
            repelRadius={90}
            idleDrift={0.35}
            fontSize={fontSize}
            fontFamily="var(--font-departure), monospace"
            color={colors.color}
            highlightColor={colors.highlight}
            glow={false}
          />
        </div>
      ) : null}
    </div>
  );
}
