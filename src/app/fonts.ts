import localFont from "next/font/local";

// next/font requires every option to be an explicitly written literal, so the
// fallback stack is duplicated rather than shared through a const.

// `block` rather than `swap`: Departure Mono's 7x14px cell at 11px IS the
// layout grid. A fallback face with different metrics does not degrade the
// design, it dismantles it. The file is 22KB, same-origin and preloaded, so the
// block period is imperceptible in practice.
export const departure = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure",
  display: "block",
  weight: "400",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

// Prose can tolerate a brief fallback flash; invisible body text cannot.
export const commit = localFont({
  src: [
    { path: "./fonts/CommitMono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/CommitMono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-commit",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});
