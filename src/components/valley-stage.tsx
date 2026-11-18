"use client";

import { useEffect, useRef } from "react";

export function ValleyStage() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    Promise.all([import("@/scene/valley"), import("@/scene/kit").then((m) => m.loadKit())])
      .then(([{ createValley }, kit]) => {
        if (cancelled || !canvas.current) return;
        dispose = createValley(canvas.current, kit);
        canvas.current.dataset.ready = "";
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return <canvas ref={canvas} className="valley" aria-hidden="true" />;
}
