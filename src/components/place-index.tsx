"use client";

import { useEffect, useState } from "react";

export type IndexGroup = {
  label: string;
  items: Array<{ id: string; label: string; when?: string }>;
};

export function PlaceIndex({ groups }: { groups: IndexGroup[] }) {
  const [current, setCurrent] = useState(groups[0].items[0].id);

  useEffect(() => {
    const stops = groups
      .flatMap((group) => group.items.map((item) => document.getElementById(item.id)))
      .filter((el): el is HTMLElement => el !== null);
    const onScroll = () => {
      const line = window.scrollY + window.innerHeight * 0.4;
      let found = stops[0];
      for (const el of stops) {
        if (el.offsetTop <= line) found = el;
      }
      setCurrent(found.id);
    };
    const first = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("scroll", onScroll);
    };
  }, [groups]);

  return (
    <nav className="place-index" aria-label="Contents">
      {groups.map((group) => (
        <div key={group.label} className="index-group">
          <p>{group.label}</p>
          <ol>
            {group.items.map(({ id, label, when }) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={id === current ? "location" : undefined}>
                  <span>{label}</span>
                  {when ? <small>{when}</small> : null}
                </a>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </nav>
  );
}
