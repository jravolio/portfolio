"use client";

import { useEffect, useState } from "react";
import LineSidebar from "@/components/vendor/LineSidebar";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { toHex } from "@/lib/color";

type Section = { id: string; label: string };

// Module constant: this is useThemeColors' effect dependency.
const TOKENS = {
  accent: ["--amber", "#985704"],
  text: ["--dim", "#6F6151"],
  marker: ["--rule", "#D1CCBB"],
} as const;

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
  const colors = useThemeColors(TOKENS);

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
        accentColor={toHex(colors.accent)}
        textColor={toHex(colors.text)}
        markerColor={toHex(colors.marker)}
        onItemClick={(i) => {
          const s = sections[i];
          if (s) document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </nav>
  );
}
