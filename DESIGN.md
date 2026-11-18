# DESIGN.md

Design system of record.

## Concept

**A night drawing on toned paper.** The scene is rendered as ink and chalk on blue-grey
stock: black ink for outlines and shadow hatching, pale chalk for moonlit faces, and two
spot colours, candle amber for lit windows and blood red for cloth. It is called Nocturne.
Three other treatments (ink on white, illuminated manuscript, watercolour) were prototyped
and dropped.

## Colour

| Token | Value | Use |
|---|---|---|
| `--ground` | `#0d1220` | page background behind the canvas |
| `--fg` | `#ece6d4` | text, primary button fill |
| `--muted` | `#b4b7c6` | meta text, labels |
| `--accent` | `#f3b755` | entry kind, lead figure, current contents item, hero row labels, step numbers, focus ring |
| `--sheet` | `11 14 23` | the night curtain behind the text (0.94 alpha), the hero wash (0.78), the wash behind the opened contents list (0.9), and the halo on contents labels |
| `--card-paper` / `--card-ink` / `--card-accent` | `#e9e1c9` / `#17130f` / `#8a1c1c` | tarot cards and the full-record dialog |

The scene's palette lives in `src/scene/ink.ts`, one colour per material class.

## Type

- **Grenze** (400, 500, 600, italic): everything factual. Body is 19px on a 1.5 line.
- **Grenze Gotisch** (500): the owner's name, card names, numerals, figures, relic names.

Never set a company name, role or navigation label in Grenze Gotisch.

A sheet uses four sizes: 16px meta, 19px body, 44px heading, and figures (44px lead, 24px
support).

## Layout

- The canvas is fixed and full-screen. Content is pinned over it, one stop per screen.
- Each job stop is a **sheet**: bare text at the left with no box, on a night curtain (a
  hatched, full-height wash that fades out to the right) and closed by a hand-inked margin
  rule from 1024px up. The scene's subject is framed to its right by the camera. Below
  768px the curtain sits under the sheet only, fading out above it. A sheet has three
  bands separated by a hand-inked rule and 24px:
  1. Identity: kind and years in accent, company, role with dates and terms.
  2. Evidence: one-paragraph summary, then one lead figure and up to two supporting ones
     (or numbered steps).
  3. Meta: tools, then the single filled button and an optional link.
- Spacing is multiples of 4px: 8 inside a group, 16 between items, 24 between bands.
- The contents list is fixed at the right from 1152px up, drawn as ink ticks grouped by
  section with the current stop's name beside its tick. Hover or focus opens every name,
  year and section label. Below 1152px each sheet shows its position ("Before, 2 of 3") in
  its header.
- Rules and ticks are drawn wobbly (`--ink-rule`, `--ink-margin`, `--ink-tick` in
  `globals.css`), never as straight borders. Their 6px boxes are stroke geometry, not
  spacing, so they sit outside the 4px grid.
- Radius is 2px on buttons. Cards have rounded corners because cards do.

## Motion

- The scene carries the motion: the camera, the bats, the mill wheel, mist, and line boil
  (outlines redrawn about six times a second).
- A stop's sheet fades in as it reaches the top of the screen and holds for most of a
  screen of scrolling before it fades out.
- Interface motion is ease-out and short. The full-record dialog opens in 260ms and closes
  in 140ms. The contents list opens its labels in 200ms.
- With reduced motion on, the scene freezes on a still frame and interface transforms are
  removed.

## Bans

No gradient text, no glass blur, no identical card grids, no skill bars, no all-caps
eyebrow labels, no middle-dot separators, no arrows appended to links, no em dashes in copy.
