import type { StopId } from "@/data/resume";

const BAT = "M0 0 Q6 -8 12 -2 Q15 -6 18 -2 Q24 -8 30 0 Q24 -3 21 2 Q18 -1 15 4 Q12 -1 9 2 Q6 -3 0 0 Z";

const EMBLEMS: Record<StopId, React.ReactNode> = {
  seat: (
    <>
      <path d="M30 62 L38 28 L55 50 L70 18 L85 50 L102 28 L110 62 Z" />
      <path d="M30 62 H110 V74 H30 Z" />
      <circle cx="70" cy="68" r="2.4" className="fill-accent" />
      <circle cx="46" cy="68" r="1.8" />
      <circle cx="94" cy="68" r="1.8" />
      <circle cx="70" cy="104" r="11" />
      <circle cx="70" cy="104" r="4.5" />
      <path d="M70 115 V160 M70 142 H84 M70 152 H80" />
    </>
  ),
  swarm: (
    <>
      <circle cx="70" cy="62" r="40" />
      <path d="M58 165 V104 L70 64 L82 104 V165" className="fill-paper" />
      <path d="M64 118 H76 M66 134 H74" />
      <path d={BAT} className="fill-ink" transform="translate(18 40) rotate(-14) scale(1.15)" />
      <path d={BAT} className="fill-ink" transform="translate(88 28) rotate(12) scale(0.95)" />
      <path d={BAT} className="fill-ink" transform="translate(96 78) rotate(22) scale(1.25)" />
      <path d={BAT} className="fill-ink" transform="translate(10 92) rotate(-24) scale(0.85)" />
      <path d={BAT} className="fill-ink" transform="translate(50 18) rotate(-4) scale(0.7)" />
    </>
  ),
  chronicler: (
    <>
      <path d="M18 122 Q44 106 70 122 Q96 106 122 122 V158 Q96 142 70 158 Q44 142 18 158 Z" />
      <path d="M70 122 V158 M28 130 Q44 120 62 130 M28 140 Q44 130 62 140 M78 130 Q96 120 112 130 M78 140 Q96 130 112 140" />
      <path d="M104 26 Q122 50 94 84 Q84 96 68 102 Q70 68 104 26 Z" />
      <path d="M104 26 Q76 66 64 116 M92 50 L100 54 M86 62 L95 67 M80 76 L88 80" />
      <circle cx="62" cy="120" r="2.2" className="fill-accent" />
    </>
  ),
  courier: (
    <>
      <path d="M48 26 H92 V58 H48 Z M48 26 L70 44 L92 26" />
      <circle cx="70" cy="46" r="4.5" className="fill-accent" />
      <path d="M8 96 H132 M8 86 H132" />
      <path d="M20 134 V112 A22 22 0 0 1 64 112 V134 M76 134 V112 A22 22 0 0 1 120 112 V134" />
      <path d="M8 96 V134 M132 96 V134 M64 134 H76" />
      <path d="M12 150 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 M22 162 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" />
    </>
  ),
  artificer: (
    <>
      <circle cx="70" cy="88" r="46" />
      <circle cx="70" cy="88" r="27" />
      <circle cx="70" cy="88" r="6" className="fill-accent" />
      <path d="M70 42 V134 M24 88 H116 M37.5 55.5 L102.5 120.5 M102.5 55.5 L37.5 120.5" />
      <path d="M64 36 H76 M64 140 H76 M18 82 V94 M122 82 V94 M30 50 L39 41 M101 135 L110 126 M101 41 L110 50 M30 126 L39 135" />
      <path d="M10 154 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" />
    </>
  ),
  watchman: (
    <>
      <circle cx="70" cy="30" r="9" className="fill-accent" />
      <path d="M70 10 V15 M70 45 V50 M50 30 H55 M85 30 H90 M56 16 L60 20 M80 40 L84 44 M84 16 L80 20 M60 40 L56 44" />
      <path d="M46 78 V64 H56 V70 H65 V64 H75 V70 H84 V64 H94 V78 Z" />
      <path d="M52 78 V164 M88 78 V164 M40 164 H100" />
      <path d="M64 124 V110 A6 6 0 0 1 76 110 V124 Z" />
      <path d="M58 94 H66 M74 94 H82 M58 140 H64 M76 148 H82" />
    </>
  ),
};

export function Emblem({ id }: { id: StopId }) {
  return <g className="emblem">{EMBLEMS[id]}</g>;
}
