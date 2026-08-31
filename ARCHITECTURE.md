# ARCHITECTURE

A text-mode portfolio. Every surface resolves to a character lattice, and the hero is a
computed spiral galaxy rather than a picture of one.

## Stack

| | |
|---|---|
| Framework | Next.js 16.3.3, App Router, Turbopack |
| React | 19.2.8 |
| Styling | Tailwind CSS 4.3.3, CSS-first (`@theme`), no `tailwind.config.ts` |
| Components | shadcn/ui 4.19 (Radix track), Magic UI, React Bits |
| Motion | `motion` 13.1.1 (the renamed `framer-motion`) |
| Content | MDX on disk, `gray-matter` + `unified` + Shiki 4 |
| Package manager | pnpm 10.5.2 |

Two versions are deliberately **not** latest:

- **TypeScript is pinned to `^6`.** `typescript@7` is the Go port and exposes no compiler
  API. `typescript-eslint` declares `<6.1.0`, and `eslint-config-next/typescript` pulls it
  in, so TS 7 silently disables every type-aware lint rule.
- **ESLint is pinned to `9`.** `eslint-config-next@16.3.3` declares `eslint >=9`, but its
  transitive `eslint-plugin-react@7.37.5` (the latest release) calls `context.getFilename()`,
  removed in ESLint 10. Linting crashes on load. Revisit when eslint-plugin-react ships an
  ESLint 10 fix.

## Layout

```
src/
  app/
    fonts.ts              next/font/local. Values must be written literals.
    globals.css           tokens, lattice, utilities. The whole design system.
    robots.ts sitemap.ts
    [lng]/                en | pt. Prerendered per locale.
      layout.tsx page.tsx work/ writing/[slug]/ render/
  components/
    hero.tsx              full-bleed hero: name left, field right
    black-hole/           the renderer's React shell
    chrome/               top bar, section nav, device toggle, status bar
    ui/                   shadcn + Magic UI (generated; safe to re-add)
    vendor/               VERBATIM React Bits copies. See vendor/README.md.
  data/resume.ts          single source of truth for every fact on the site
  lib/
    ascii/                atlas.ts, shaders.ts, renderer.ts
    blog.ts shiki-theme.ts i18n.ts utils.ts
  hooks/
  proxy.ts                locale redirect (was middleware.ts before Next 16)
scripts/bake-galaxy.mjs  build-time CPU renderer -> the static fallback
```

## The lattice

Departure Mono has `unitsPerEm = 550` and an advance width of 350. At 11px that is an
advance of exactly **7.000px** and a line box of exactly **14.000px** — a cell aspect of
exactly **0.5** on an integer pixel grid. Measured from the OTF, not assumed.

Everything derives from that:

- `--spacing: 7px`, so `p-2` is 14px, one cell row. Nothing uses Tailwind's 4px scale.
- Display sizes are integer multiples of 11px; line heights are multiples of 14px.
  Departure Mono at a fractional size is mush.
- `--cell-aspect: 0.5` is fed to the shader. Skip the correction and the photon ring
  renders as an ellipse.

## The renderer

Three passes, no readback. `gl.readPixels` on the frame you just drew forces a GPU→CPU
sync stall.

1. **Field** (`FIELD_FRAG`) — the galaxy, evaluated per supersample. Exponential disk,
   de Vaucouleurs (Sersic n=4) bulge, logarithmic spiral arms. Outputs luminance in R and
   an accent mask in G.
2. **Quantise** (`QUANT_FRAG`) — box-downsample to the cell grid, Sobel in *cell* space
   for directional glyphs, dither, temporal hysteresis via ping-pong FBOs.
3. **Composite** (`GLYPH_FRAG`) — one quad sampling a NEAREST glyph atlas.

### The arms are a density wave, not material

A disk rotates differentially, so **material** arms would wind into a coil within a couple
of galactic rotations — the winding problem. Lin & Shu (1964) resolved it: arms are density
waves that material passes *through*, and the pattern rotates rigidly at a single pattern
speed. So the arm phase carries a rigid `−t·Ω` term while a separate noise field is
advected at `Ω(r) ∝ 1/r`. That is both the physics and the only thing that survives a
long-running loop: rotating the material would visibly wind the arms up on screen.

Arms are logarithmic, `θ = ln(r/a)/tan(p)`, at a **19° pitch angle**. Sa–Sc average at or
under 15.5°; 19° is Sc territory, chosen because tighter than ~15° the arms fall below the
glyph resolution and read as concentric rings.

The amber nucleus is not a palette choice: bulges genuinely are red-yellow (old stellar
populations) and arms blue-white (young hot stars).

Physics constants live in `shaders.ts`; the CPU twin in `scripts/bake-galaxy.mjs` uses the
same maths and is parameterised by `GX_*` env vars. Keep the two in parity.

### Braille sub-cell rasterisation

The default mode renders into U+2800-28FF, a 2x4 dot matrix per cell, for **8x** the effective
resolution on the same grid: 80,360 dots at 205x49 rather than 10,045 cells. The field target is
allocated at `cols*2 x rows*4` so every Braille dot maps to exactly one field texel: no averaging.

- **Departure Mono has 0/256 Braille patterns** (measured from its `cmap`). Commit Mono has all
  256, so the Braille atlas is built from Commit Mono and `buildBrailleAtlas` throws rather than
  let a fallback face render at the wrong advance width.
- The atlas is a 16x16 grid, not one row: 256 cells in a row would be 3584px at DPR 2.
- **The photon ring bypasses the dither entirely.** It is analytic and one dot wide, so
  thresholding it like everything else shatters it into speckle: it is the thinnest feature in
  the frame and the dither has nothing to trade against. Forced on where `ringCov > 0.45`, it
  stays unbroken at every grid size.
- Ring width is sized to the **dot** grid (`rows * 4`), not the cell grid. A cell-sized ring is
  four times thicker than the feature it is meant to draw.
- The ring's brightness has its own floor, `ring * (0.85 + 0.5 * diskL)`. The earlier
  `(0.35 + 0.65 * diskL)` throttled it to a third exactly where the disk behind it is dark,
  which is precisely where it is drawing the silhouette.
- The per-dot threshold is **interleaved gradient noise**, not Bayer. An 8x8 Bayer matrix aligns
  with the 2x4 cell structure and produces a visible four-column repeat. IGN has no periodic
  structure and is still position-only, so it does not shimmer.
- Braille needs its own tone curve (`TONE.braille`): it resolves 8x more samples, so the ramp's
  black point leaves the outer falloff reading as an even dither.

`[ blocks | braille ]` in the hero readout swaps mode live. It rebuilds the atlas and the field
target but never the GL context.

### Spiral structure

`ARMS` is how many angular periods wrap the disk and `SHEAR` is the radial twist that turns
concentric bands into a spiral. At `ARMS = 19` the filaments fall below the dither resolution and
the whole disk collapses into uniform grain; **3 broad arms** at `SHEAR = 0.4` wind roughly half a
turn across the disk and actually read as spiral structure.

Density is `band * (0.02 + 3.0 * sn^3)`. The cube matters: it drives the gaps between arms toward
empty, which is what stops the dither grain from competing with the arms for the eye.

### The ramp is measured

`atlas.ts` rasterises every candidate glyph at boot and sorts by integrated alpha.
Measured in Departure Mono, `#` (0.284) is **denser than `@`** (0.254) — a hand-ordered
ramp gets this backwards. Block elements (`░▀▄▒`) carry the ramp to 0.75; without them it
tops out at 0.284 and every bright region renders as the same washed-out grey.

Index 0 is a literal space, so the shadow is a hole in the text rather than a dim glyph.

A substitution guard drops any glyph the face lacks: a fallback renders at the fallback's
advance width and silently breaks the 7px lattice.

### Degradation

| Tier | Grid | Steps | SS | Trigger |
|---|---|---|---|---|
| 0 | 300 cols | 64 | 2× | desktop dGPU |
| 1 | 260 cols | 40 | 2× | default |
| 2 | 260 cols | 24 | 1× | rolling frame time > 12ms |
| 3 | 110 cols | 20 | 1× | coarse pointer |
| — | 148×46 | static | — | reduced motion, no JS, no WebGL |

The static tier is `public/static/galaxy.txt`, produced at build time by
`pnpm run bake` and inlined as **one `<pre>` with one text node**. It is the first paint,
the no-JS fallback and the reduced-motion state. The homepage ships 212 DOM elements
against Lighthouse's 800-element warning threshold; one span per cell would be ~6,800.

Gates that apply at every tier: `IntersectionObserver`, `visibilitychange`,
`powerPreference: 'low-power'`, DPR capped at 2, and `webglcontextlost` handling because
iOS Safari drops contexts on backgrounding.

## Content

`src/data/resume.ts` is the single source of truth, typed as `Record<Locale, Dictionary>`.
It replaced three overlapping sources (`resume_en.tsx`, `resume_pt.tsx`, and i18next
`translation.json`) and the `t('work.experiences') as Array<...>` casts that went with
them, which were unchecked at compile time.

i18next was removed. The routes (`/en`, `/pt`) and the `proxy.ts` Accept-Language redirect
are unchanged; only the lookup mechanism is now a typed record.

All content is sourced from the LinkedIn export. No metric is invented — the 80% and 30%
figures are quoted from it.

## Accessibility

- Every ASCII surface is `aria-hidden`. WCAG Failure F72 names ASCII art without a text
  alternative as a Level A failure.
- A visible, keyboard-reachable pause control. SC 2.2.2 applies: the loop auto-starts,
  runs past five seconds and sits alongside content.
- Every text token is ≥ 4.5:1 against its own background, verified in OKLCH and in gamut.
- Skip link, real landmarks, one `<h1>`, ordered `<h2>`s. No headings built from
  box-drawing glyphs.

## Gotchas

- `ascii-field` uses `contain: content`, not `strict`. `strict` implies size containment,
  which sizes the element as if empty and collapses a shrink-to-fit `<pre>` to 0×0.
- Gradients fading to `transparent` interpolate toward transparent *black* and shift hue.
  Use relative colour syntax: `oklch(from var(--bg) l c h / 0)`.
- React Bits components do not ship `"use client"`. See `src/components/vendor/README.md`.
- `next/font` options must be written literals; a shared `const` fails the build.
- **PixelSwap durations are milliseconds** (defaults 1400 / 450). Passing `0.42` runs the
  whole dissolve in under half a millisecond, which is indistinguishable from no animation.
- **Canvas 2D cannot resolve `var(--custom-property)`** in `ctx.font` or `fillStyle`. Read
  the token to a concrete value with `getComputedStyle` first. ParticleText silently falls
  back to its default face otherwise.
- `ParticleText` hardcodes `min-h-[240px]` on its root; override with `min-h-0!` or it
  overflows its container.
- `html { overflow-x: hidden }` — the full-bleed hero uses `100vw`, which exceeds the
  viewport when a vertical scrollbar is present.

## Commands

```bash
pnpm dev
pnpm build        # runs bake, then next build
pnpm bake         # regenerate the static fallback frame
pnpm lint
pnpm typecheck
```

Tuning the galaxy: `GX_PITCH=0.331 GX_SCALE=2.5 GX_INCL=1.0 node scripts/bake-galaxy.mjs`
prints to stdout. In the browser, `window.__bh` exposes the live tunables.
