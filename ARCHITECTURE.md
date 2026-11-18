# ARCHITECTURE

A single-page portfolio: server-rendered HTML over one fixed WebGL canvas.

## Stack

| | |
|---|---|
| Framework | Next.js 16, App Router, Turbopack |
| React | 19 |
| 3D | three.js 0.187, vanilla (no React Three Fiber), WebGL2 |
| Styling | Tailwind CSS 4 for the reset; the design is plain CSS in `globals.css` |
| Fonts | Grenze and Grenze Gotisch through `next/font/google` |
| Package manager | pnpm |

Two versions are deliberately not latest; see AGENTS.md.

## Layout

```
src/
  app/
    layout.tsx page.tsx     one route; page.tsx is a server component
    globals.css fonts.ts
    robots.ts sitemap.ts
  components/
    valley-stage.tsx        client: mounts the canvas, lazy-loads the scene
    place-panel.tsx         server: one sheet per entry, plus its full-record dialog
    reading.tsx             client: the dialog element and the buttons that open it
    place-index.tsx         client: contents list with the current stop
    study.tsx               client: the relic tabs
    emblems.tsx relic-art.tsx  card art and the shelf objects (SVG); only relic-art ships to the client
    ink-defs.tsx            the hand-drawn SVG filter
    sheet-head.tsx          the kind / position header every sheet shares
  data/resume.ts            every fact on the site
  scene/
    terrain.ts              the height function
    landmarks.ts            where the named places are
    world.ts                builds all geometry
    classes.mjs rng.ts      material class ids; the seeded random generator
    walkers.ts              the people: limb rigs, routes, walk cycle
    kit.ts kit-manifest.json  decoder and index for the baked kit models
    path.ts                 camera stops and the spline through them
    shaders.ts ink.ts       the geometry, ink and grain shaders, and the palette
    tiles.ts                groups the pines into tiles, one mesh each, so they can be culled
    valley.ts               renderer, scroll mapping, frame loop
```

## The scene

Most of the valley is built in code at load: terrain from one height function, and the
castle, houses, bridge, mill and gate from boxes, cylinders, cones and a few extruded
shapes. `terrain.ts` is the single source for the ground, so the mesh, the things standing
on it and the camera all agree.

### Kit models

Pines, dead trees, the church, the graveyard, lantern posts, the well, the cart and the
people come from CC0 model packs (KayKit Medieval Hexagon Pack, KayKit Halloween Bits, Kenney Graveyard Kit,
Kenney Fantasy Town Kit). They are not loaded as glTF. `scripts/bake-models.mjs` reads the
picked models, samples each vertex's colour from the pack's palette texture, turns the
colour into a material class and tone, and writes every model into one quantised file,
`public/models/kit.bin` (12 bytes per vertex), with offsets in `src/scene/kit-manifest.json`.
`kit.ts` decodes it at load. The site ships no glTF loader and no textures.

The packs themselves are not in the repo, so a fresh clone cannot re-bake until they are
downloaded into `.model-candidates/` (git-ignored). The script expects these folders:

| Folder | Source (CC0) |
|---|---|
| `kaykit-medieval-hexagon-pack/` | github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 |
| `kaykit-halloween-bits/` | github.com/KayKit-Game-Assets/KayKit-Halloween-Bits-1.0 |
| `kenney-graveyard-kit/` | kenney.nl/assets/graveyard-kit |
| `kenney-fantasy-town-kit/` | kenney.nl/assets/fantasy-town-kit |

Unzip each so the paths at the top of `MODELS` resolve. To add or change a model, edit
`MODELS` in the script and run `node scripts/bake-models.mjs`. `--inspect` prints each model's dominant colours without
writing, which is how the colour rules in `classify` were tuned.

### People

The villagers, the two graveyard skeletons and the ghost are Kenney Graveyard Kit
characters. Each is six rigid parts (torso, head, arms, legs) with no skeleton, so the bake
keeps a limb index per vertex (the high nibble of the class byte) and each limb's joint.
`walkers.ts` splits a character into its parts and swings the limbs itself: no animation
clips are shipped. Walkers follow the road (`roadX`) or a straight line, turn round at the
ends, and stand on `groundAt`, which is the terrain except on the bridge deck.

Kit buildings other than the church were tried and dropped: under the night palette they
read as dark blobs, and the hand-built timber houses read better.

### Two passes

1. **Geometry pass** into a render target with two colour attachments and a depth texture.
   Every vertex carries `aTag = (class, tone, id)`. The fragment shader writes lit tone,
   material class and object id to attachment 0 and the view normal to attachment 1. Both
   are sampled with nearest filtering because classes and ids are read back as exact values.
2. **Ink pass**, one full-screen triangle pair. It finds edges from depth, normal and id
   discontinuities, colours each pixel from its class and tone, lays ink hatching in shadow
   and chalk hatching in light, adds height mist from the reconstructed world position,
   window glow, paper grain and a vignette.

Line boil comes from quantising time: the UV wobble and the hatch offsets use
`floor(time * 6)` as a seed, so lines hold for a moment and then redraw.

Object ids are what make details draw: two parts with different ids get an outline between
them even when coplanar, so a timber beam or a window bar is a thin box with its own id.

### Paper grain

Paper grain depends only on the pixel position, so it is not computed in the ink pass. A
one-off pass (the ink quad drawn with `GRAIN_FRAG` through `overrideMaterial`) bakes it into
an RG8 texture the size of the drawing buffer, with the value split over two 8-bit channels
so the error is under a thousandth of a level. It is redone when the size or pixel ratio
changes and after a WebGL context restore, which leaves the texture empty; the ink pass reads
one texel. The weights and the pack and unpack formulas live once, in `GRAIN_CODEC` in
`shaders.ts`.

A mask that lets the ink pass skip the window-glow loop (16 fetches) was tried and
dropped: the loop runs on only 1 to 4% of pixels, but the two extra passes the mask needs
cost more than the whole loop (paired frame times on an M3 Pro: slower with the mask at 7 of
9 stops, median 10%; 3 to 13% faster with no glow loop at all).

### Memory

At 1440x900 and a pixel ratio of 1.75 (2520x1575, 3.97 million pixels):

| Target | Bytes per pixel | Size |
|---|---|---|
| Geometry colour attachments (two RGBA8) | 8 | 31.8 MB |
| Geometry depth texture (24-bit, stored as 4 bytes) | 4 | 15.9 MB |
| Baked paper grain (RG8) | 2 | 7.9 MB |

### Pines

The 1,500 pines are grouped into an 8x8 grid of tiles (`groupByTile`, `tileMeshes`), one
`InstancedMesh` each, so three culls whole tiles against the camera. Counted over the whole
geometry pass (terrain, buildings and people included), the mean of the nine stops falls from
2.01 million vertices a frame to 0.99 million (49%). It is 27% at the seat and 33% at the
study, and the worst stops barely gain: about 80% at `swarm` and 78% at `gate`, which look
over the valley. The pines alone are 1.51 million of the 2.01 million. Draw calls rise by about
10 a frame on average (23 at `gate`). A tile's instances keep their index from before the
split in the `aPine` attribute, because the vertex shader offsets each pine's object id by it:
change that index and the outlines between neighbouring pines change with it. Tiles share
one set of vertex buffers.

The picture is not bit-identical to the version before the split. Two pines that overlap at the
same 24-bit depth are decided by draw order, which the split changes, so an ink line between
them can move by a pixel: isolated pairs of adjacent pixels, up to 28 levels apart in the
worst measured case. The 16-bit grain differs from the per-pixel noise by one level on about
0.05% of pixels. Expect a few hundred differing pixels in a before and after diff of a stop,
and look at where they are before dismissing them.

### Material classes

`classes.mjs` is the one place class ids are defined. `world.ts`, `shaders.ts` and
`scripts/bake-models.mjs` all import it, and the baked `kit.bin` stores the ids, so a
renumbering happens there and nowhere else. `PALETTE` in `ink.ts` is keyed by class name, so
TypeScript rejects a class without a colour, and the shader's `uPal` length follows it. The
class is encoded as `(class + 0.5) / CLASS_SLOTS` (16) in an 8-bit channel.

## Scroll model

Each stop is a tall `<section>` whose content is `position: sticky`. `valley.ts` measures
the sections' tops and maps `scrollY` to a progress value: stop `i` at the top of section
`i`. The camera holds for the first 36% of a section, then eases to the next stop along a
Catmull-Rom spline. The same loop writes `--presence` on each section, which the CSS uses
for the panel's opacity.

`path.ts` also holds two waypoints that are not stops; they steer the camera around the
castle on the way to and from the high tower.

`path.ts` aims each stop to the left of its subject so the subject sits right of the panel.
On a portrait screen it aims below the subject instead, so the subject sits above the panel.

## Gotchas

- `RawShaderMaterial` does not get three's `USE_INSTANCING` define. The pines use a second
  material built with `defines: { INSTANCED: 1 }`, and that path needs two things on the mesh:
  `instanceMatrix` and the `aPine` attribute (`tileMeshes` adds it). An instanced mesh on that
  material without `aPine` reads 0 for every instance and loses its per-instance outlines.
- Colours are passed to the ink pass as raw sRGB vectors, not `THREE.Color`, because the
  pass writes straight to the canvas with no colour-space conversion.
- Everything scattered (houses, trees) checks `occupied`, a list of footprints for the
  landmark buildings, the castle stairs, lantern posts and each house already placed. A new
  landmark needs an entry in `FIXED_FOOTPRINTS` or a tree will grow through it.
- The castle stair is part of the terrain: `height` grades a ramp along the stair line (a
  cutting where the rock is higher), and `buildStairs` lays the steps on `stairHeight`. An
  earlier version sampled the ground per step and came out as floating fragments, because
  the terrain mesh is coarser than the height function.
- Anything built on a slope needs a plinth or a wall that continues below ground. The
  mill, the church, the crypt and the gate piers all have one.
- `roadX` runs dead straight for 13 units either side of the river so the painted road,
  the bridge deck and the walkers line up.
- Trees and houses are kept out of a radius around every camera stop and out of each
  stop's line of sight (`inShot` and `blocksView` in `world.ts`). Move a stop and something
  may grow in front of the lens.
- The dialog and its opener are the only client code in a sheet; the sheet's text is
  rendered on the server once.
