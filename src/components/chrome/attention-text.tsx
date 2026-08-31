"use client";

import DecryptedText from "@/components/vendor/DecryptedText";
import { RAMP_POOL } from "@/lib/ascii/atlas";

/**
 * The one heading on the page allowed to draw attention to itself.
 *
 * It resolves through the SAME glyph set the field is quantised to, so the
 * word settles out of the alphabet the field is drawn from rather than arriving
 * from nowhere.
 *
 * A particle version was built first and removed. Departure Mono is a pixel
 * font whose whole identity is hard 1px edges on a 50-unit grid; dissolving it
 * into a cloud of sub-pixel dots read as a failed render rather than an effect,
 * and it was the only element on a site built entirely out of characters that
 * was not itself made of characters. Doubling the particle density did not fix
 * it, because the problem was the medium and not the tuning.
 *
 * Being real text the whole way through also removes the visually-hidden
 * duplicate the canvas version needed, so there is nothing for a crawler or a
 * screen reader to miss and nothing to keep in sync.
 */
export function AttentionText({
  text,
  as: Tag = "h2",
  className = "",
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
}) {
  return (
    <Tag className={`text-display-3 text-ink-hi ${className}`}>
      <DecryptedText
        text={text}
        animateOn="view"
        sequential
        revealDirection="start"
        speed={38}
        maxIterations={12}
        // The field's own ramp, minus the space at index 0.
        characters={RAMP_POOL.slice(1).join("")}
        parentClassName="inline-block"
        encryptedClassName="text-amber/70"
      />
    </Tag>
  );
}
