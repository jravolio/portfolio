"use client";

import { useRef, useState } from "react";
import { RELICS } from "@/data/resume";
import { RelicArt } from "./relic-art";

export function Study() {
  const [chosen, setChosen] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const relic = RELICS[chosen];

  const move = (to: number) => {
    const next = (to + RELICS.length) % RELICS.length;
    setChosen(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="shelf">
      <div
        className="shelf-row"
        role="tablist"
        aria-label="Things on the shelf"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(chosen + 1);
          else if (e.key === "ArrowLeft") move(chosen - 1);
          else if (e.key === "Home") move(0);
          else if (e.key === "End") move(RELICS.length - 1);
          else return;
          e.preventDefault();
        }}
      >
        {RELICS.map((r, i) => (
          <button
            key={r.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`relic-${r.id}`}
            aria-label={r.name}
            aria-selected={i === chosen}
            aria-controls="relic-note"
            tabIndex={i === chosen ? 0 : -1}
            title={r.name}
            className="relic"
            onClick={() => setChosen(i)}
          >
            <RelicArt id={r.id} />
          </button>
        ))}
      </div>
      <div id="relic-note" role="tabpanel" aria-labelledby={`relic-${relic.id}`} className="relic-note">
        <h3>{relic.name}</h3>
        <p>{relic.note}</p>
      </div>
    </div>
  );
}
