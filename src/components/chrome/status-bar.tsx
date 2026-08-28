import { Marquee } from "@/components/ui/marquee";

/**
 * A single status line, the way a terminal emulator carries one. Real facts
 * only: locale, palette, grid, licence. Not a decorative logo ticker.
 */
export function StatusBar({ items }: { items: string[] }) {
  return (
    <div
      aria-hidden="true"
      className="border-y border-rule bg-bg-inset py-1 text-chrome text-dim select-none"
    >
      <Marquee className="[--duration:52s] [--gap:3rem]" pauseOnHover>
        {items.map((item) => (
          <span key={item} className="whitespace-nowrap">
            {item}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
