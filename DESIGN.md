# DESIGN.md

Design system of record. Consumed by the `impeccable` skill.

## Concept

**One document, two output devices.**

Light is the default and is a *printout*: continuous-feed dot-matrix paper, ink on stock,
subtractive, does not glow. Dark is an *instrument*: amber phosphor emission over cool CRT
glass. They are not inversions of each other; they are the same document printed and
displayed.

Making light the default is deliberate. Permanent dark mode is the loudest reflex in this
category, and shipping a light mode that is a real position rather than an obligation is
what gives the theme toggle a reason to be prominent.

## Colour

Strategy: **Committed** in dark (amber carries the identity), **Restrained** in light (two
ribbons and the paper).

Every value below was verified: contrast computed against its own background, and gamut
checked in OKLCH. All text tokens pass WCAG AA.

### Light — paper (plan 9 `acme` × dot-matrix)

| Token | OKLCH | sRGB | Contrast |
|---|---|---|---|
| `--bg` | `oklch(97.5% 0.018 95)` | `#FAF7EA` | — |
| `--bg-inset` | `oklch(94.5% 0.022 95)` | `#F1EDDD` | 1.09 |
| `--rule` | `oklch(84.5% 0.024 95)` | `#D1CCBB` | 1.49 |
| `--dim` | `oklch(50% 0.03 70)` | `#6F6151` | **5.62** |
| `--text` | `oklch(25% 0.03 70)` | `#2B1F11` | **14.96** |
| `--ink-hi` | `oklch(17% 0.028 70)` | `#170D03` | **17.85** |
| `--amber` | `oklch(52% 0.118 62)` | `#985704` | **5.31** |
| `--cyan` | `oklch(48% 0.086 220)` | `#05687F` | **5.91** |
| `--hot` | `oklch(50% 0.17 27)` | `#B02B27` | **6.10** |

`--glow: 0 0 0 transparent`. Paper does not glow, and refusing the bloom is the discipline
that sells it.

### Dark — instrument (P3 amber phosphor on cool glass)

| Token | OKLCH | sRGB | Contrast |
|---|---|---|---|
| `--bg` | `oklch(18% 0.012 200)` | `#0B1314` | — |
| `--bg-inset` | `oklch(23.5% 0.014 200)` | `#162021` | 1.13 |
| `--rule` | `oklch(30% 0.014 200)` | `#263031` | 1.38 |
| `--dim` | `oklch(62% 0.03 85)` | `#8E8572` | **5.15** |
| `--text` | `oklch(88% 0.045 85)` | `#E5D6B6` | **13.06** |
| `--amber` | `oklch(84% 0.17 84)` | `#FEBF12` | **11.34** |
| `--cyan` | `oklch(84% 0.11 200)` | `#65E0E7` | **11.96** |
| `--hot` | `oklch(64% 0.17 25)` | `#E15955` | **5.15** |

Amber hue 84 sits inside the P3 phosphor chromaticity box. Cyan hue 200 is 5° from IBM
5153's measured colour 11 and near-complementary to the amber, so "interactive" separates
without becoming a second brand colour. The ground shares hue 200 with the cyan on
purpose: the whole cool substrate and the interactive colour are one hue, and amber is the
only warm thing on screen.

**Not `#00FF00` on `#000`.** That is P39 phosphor — the longest-persistence, most
eye-searing option ever made, which is exactly why it reads as costume now.

## Typography

- **Departure Mono 1.500** (SIL OFL, 22KB woff2, self-hosted) — chrome, headings, the
  ASCII field. Only ever at integer multiples of 11px. `-webkit-font-smoothing: none`:
  it is a pixel font and antialiasing destroys the point of it.
- **Commit Mono** (SIL OFL, Fontsource) — prose, 16/28.

Inter is banned, along with IBM Plex Mono, Space Mono and JetBrains Mono. There is no
`sans` key in the theme, so nothing can silently fall back to a system UI face.

Scale: 11 / 22 / 33 / 44 / 66px on 14 / 28 / 42 / 56 / 70px line boxes.

## Lattice

`--cell-w: 7px`, `--cell-h: 14px`, `--cell-aspect: 0.5`, measured from the OTF.
`--spacing: 7px`, so every spacing utility is a whole number of cell columns.
`--radius: 0` everywhere.

## Motion

Ease-out only (`--ease-out-quart`, `--ease-out-expo`). No bounce, no elastic. One
spectacle: the field. Everything below the hero is flat and instant.

Two exceptions earn their place. The device toggle dissolves pixel-by-pixel from the
centre over ~820ms, which is the right gesture for a raster device repainting itself. The
contact heading resolves out of the field's own ramp glyphs, once, on first scroll
into view.

That heading was first built with a particle effect and rebuilt. Departure Mono is a pixel
font whose identity is hard 1px edges on a 50-unit grid; dissolving it into sub-pixel dots
read as a failed render, and it was the only element on a site made entirely of characters
that was not itself made of characters. **Effects have to be expressible in the medium.**

## Effects

The aperture grille is vertical stripes on a 3px period at 0.055 opacity, dark theme only.
Anything heavier eats a 13:1 contrast down to 8:1.

Deliberately absent: barrel distortion, chromatic aberration, rolling scanlines, analog
noise. All four are the 2010 WebGL demo tell, and chromatic aberration directly reduces
text contrast.

## Bans

Zero radius. No gradient text. No glassmorphism. No side-stripe borders. No identical card
grids. No skill bars or percentage rings. No `figlet` name banner. No fake `user@host:~$`
prompt. No blinking underscore hero. No content gated behind a typed command — a terminal
that makes you guess a command to read a bio is a worse interface than a nav bar, not a
better one. No em dashes in copy.
