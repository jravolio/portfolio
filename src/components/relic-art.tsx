import type { Relic } from "@/data/resume";

const RELIC_ART: Record<Relic["id"], React.ReactNode> = {
  dice: (
    <>
      <path d="M32 5 L56 19 V45 L32 59 L8 45 V19 Z" />
      <path d="M32 17 L47 43 H17 Z" />
      <path d="M32 5 V17 M47 43 L56 45 M17 43 L8 45 M32 17 L56 19 M32 17 L8 19 M47 43 L32 59 M17 43 L32 59" />
    </>
  ),
  shard: (
    <>
      <path d="M22 8 H38 L44 14 V48 H22 Z" />
      <path d="M26 48 V57 M32 48 V57 M38 48 V57" />
      <path d="M27 18 H37 M27 24 H33 M27 36 H39 M33 24 V36" />
      <circle cx="39" cy="24" r="1.8" className="fill-accent" />
    </>
  ),
  camera: (
    <>
      <path d="M8 22 H56 V52 H8 Z M16 22 V13 H42 V22" />
      <circle cx="32" cy="36" r="10" />
      <circle cx="32" cy="36" r="4.5" className="fill-accent" />
      <path d="M45 27 H51 V31 H45 Z M14 48 H22" />
    </>
  ),
  cup: (
    <>
      <path d="M14 20 H44 V40 Q44 53 29 53 Q14 53 14 40 Z" />
      <path d="M44 25 Q57 25 57 33 Q57 41 44 41" />
      <path d="M34 20 L42 4 L51 7 M38 12 L42 14 M40.5 7.5 L44.5 9.5" className="stroke-accent" />
      <path d="M10 58 H48" />
    </>
  ),
  blade: (
    <>
      <path d="M22 38 L52 8 L56 8 L56 12 L26 42 Z" />
      <path d="M14 34 L30 50 M19 45 L10 54" />
      <circle cx="8.5" cy="55.5" r="2.6" className="fill-accent" />
      <path d="M36 28 L33 25 M44 20 L41 17" />
    </>
  ),
  lantern: (
    <>
      <circle cx="32" cy="7" r="3.2" />
      <path d="M26 12 H38 L43 18 H21 Z M22 18 V48 H42 V18 M19 48 H45 V53 H19 Z" />
      <path d="M32 24 Q39 33 32 43 Q25 33 32 24 Z" className="fill-accent" />
    </>
  ),
};

export function RelicArt({ id }: { id: Relic["id"] }) {
  return (
    <svg viewBox="0 0 64 64" className="relic-art" aria-hidden="true">
      <g className="emblem">{RELIC_ART[id]}</g>
    </svg>
  );
}
