"use client";

import { useEffect, useRef } from "react";

export function InkDefs() {
  const rough = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seed = 1;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      seed = (seed % 4) + 1;
      rough.current?.setAttribute("seed", String(seed));
    }, 170);
    return () => window.clearInterval(id);
  }, []);

  return (
    <svg className="ink-defs" aria-hidden="true">
      <defs>
        <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence ref={rough} type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
