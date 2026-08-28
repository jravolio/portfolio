"use client";

import { useEffect, useState } from "react";
import LineSidebar from "@/components/vendor/LineSidebar";

type Section = { id: string; label: string };

/**
 * Fixed section index down the left margin. LineSidebar's cursor-proximity
 * effect suits a character grid: items shift by whole cells as the pointer
 * nears, which reads as a physical detent rather than a hover state.
 *
 * Strictly an accelerator. Every section it lists is also reachable by
 * scrolling and by a visible in-page link, because navigation you have to
 * discover is worse than a nav bar, not better.
 */
export function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [colors, setColors] = useState({ accent: "#985704", text: "#6F6151", marker: "#D1CCBB" });

  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const resolve = (v: string, fallback: string) => {
        const raw = cs.getPropertyValue(v).trim();
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
      setColors({
        accent: resolve("--amber", "#985704"),
        text: resolve("--dim", "#6F6151"),
        marker: resolve("--rule", "#D1CCBB"),
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setVisible(!e?.isIntersecting), {
      rootMargin: "-30% 0px 0px 0px",
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = sections.findIndex((s) => s.id === entry.target.id);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-hidden="true"
      className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-500 xl:block"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
    >
      <LineSidebar
        items={sections.map((s) => s.label)}
        defaultActive={active}
        proximityRadius={55}
        maxShift={14}
        falloff="smooth"
        markerLength={28}
        itemGap={14}
        fontSize={0.7}
        accentColor={colors.accent}
        textColor={colors.text}
        markerColor={colors.marker}
        onItemClick={(i) => {
          const s = sections[i];
          if (s) document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </nav>
  );
}
