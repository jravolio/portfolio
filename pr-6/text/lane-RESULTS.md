# RESULTS: three performance items in the WebGL scene

Lane A, branch `t3/webgl-scene-performance`, from `master` at c86eedb. The picture is unchanged (see
"The picture"); frames, sweeps and raw numbers are in this folder.

## What shipped and what did not

| Item | Verdict | Why |
|---|---|---|
| 3. Cull the pines | **Shipped** | 1,500 pines become an 8x8 grid of tiles, culled by three. Vertices submitted per frame fall from 2.01M to 0.99M on average (about 0.5M at the seat). Paired GPU time at 1.75 DPR: median stop 0.947 of before, best 0.882, one stop (swarm) 1.12. |
| 2. Bake the paper grain | **Shipped** | One RG8 texture, re-baked only on resize, one fetch per pixel instead of five noise evaluations. Paired GPU time at 1.75 DPR: median stop 0.885 of before, best 0.77, no gain at `gate`. Costs 7.9 MB at 1440x900 and 1.75 DPR. |
| 1. Skip unlit glow taps | **Dropped** | The mask works (exact) but costs more than it saves: with it on, frames were 7 to 11% **slower** (median 1.10 of before). Skipping the whole 16-tap loop, which gives a wrong picture, is only 3 to 13% faster (median 0.92), so no mask can win much here. |
| Terrain tiling (optional) | **Not done** | After the pine cull the terrain is 345,600 of 0.5M to 1.6M vertices. At the slope the pines show (roughly 0.7 ms per million vertices, in these noisy units) culling it saves at most about 0.15 ms, below the noise. |
| **All shipped together** | | Paired GPU time against `master`: 1.75 DPR median stop **0.824** (0.81 to 0.97); 1 DPR median 0.888 (0.74 to 1.08, with `swarm` and `gate` showing no gain). |

## How the timings were taken, and how far to trust them

* Machine: Apple M3 Pro, 18 GB, Chrome for Testing 159 (headless, ANGLE on Metal), 1440x900, WebGL2 timer queries
  (`EXT_disjoint_timer_query_webgl2` exists and works). The `chrome-devtools` tools named in the brief were not available
  in the session, so the browser was driven with Python Playwright; the scripts are in `tools/`.
* The machine was busy the whole time (load average 8 to 10, other sessions on the GPU). The GPU speed swings: in one
  run of the unmodified build the frame went from about 5 ms at the first six stops to about 12 ms at the last three.
  **Absolute milliseconds are not meaningful. Only the paired ratios are.**
* An early run that timed each pass, the baseline first and then the modified build, was thrown away. It showed the new build
  2x slower, but the order never alternated, the last stops of every run jumped 2 to 3x in both builds, and per-pass queries
  add a fixed-looking cost to tiny passes on Metal, so it could not be trusted (kept in `raw/superseded/unpaired`).
* The pairing that replaced it (`tools/pair.py`): the baseline (`master` at c86eedb) and the modified build are open at
  once. The app's own `visibilitychange` handler pauses the one not being timed, so each burst of 80 to 90 frames runs
  alone, a few seconds from its partner, with the order alternating every round. One timer query spans each whole frame
  (every pass). Each cell is the median of 5 to 6 rounds; the range is the lowest and highest round ratio. The scene animates
  (no reduced motion), as it does for a visitor.
* Per-item rows toggle one item at a time in the same build, so the ratios isolate the item (the throwaway build with
  the toggles is not in the diff).
* Not measured: any other GPU, browser or phone. A weaker, ALU-bound GPU could favour the grain bake and the glow mask
  more than an M3 Pro does.

## Item 3: cull the pines

Design: `groupByTile` (`src/scene/tiles.ts`) puts the 1,500 spots on an 8x8 grid over their own bounding box; each non-empty
tile is its own `InstancedMesh` (empty tiles are dropped) with `frustumCulled` on and a bounding sphere from
`computeBoundingSphere`. Tiles share one set of vertex buffers. The vertex shader used
`gl_InstanceID * 0.137` to perturb each pine's object id; a tile now carries each pine's index from before the split
in an instanced attribute, `aPine`, so the ids, and therefore the outlines, are the same.

Tile size, mean over the nine stops (submitted geometry-pass vertices and draw calls; before: 2,011,609 and 47):

| Grid | Vertices | Draw calls |
|---|---|---|
| 4x4 | 1,283,983 | 47 |
| 6x6 | 1,120,127 | 51 |
| 8x8 | 989,423 | 52 |
| 12x12 | 954,255 | 60 |
| 16x16 | 915,615 | 65 |
| 24x24 | 900,383 | 82 |

8x8 keeps most of the benefit; 12x12 would save another 3.6% of what is left (about 0.02 ms at the slope below) for 8 more draws.

Paired GPU time, 1.75 DPR, the 8x8 tiles against one uncullable tile (everything else as shipped):

| stop | one uncullable tile GPU ms | 8x8 culled tiles GPU ms | 8x8 culled tiles / one uncullable tile (median, range over 5 rounds) | vertices one uncullable tile | vertices 8x8 culled tiles | draws one uncullable tile | draws 8x8 culled tiles |
|---|---|---|---|---|---|---|---|
| hero | 7.43 | 5.91 | 0.898 (0.479 to 1.286) | 1989813 | 1298325 | 8 | 25 |
| seat | 13.05 | 11.50 | 0.882 (0.872 to 0.917) | 1989813 | 516117 | 8 | 9 |
| swarm | 10.02 | 11.27 | 1.123 (1.049 to 1.252) | 2048961 | 1648784 | 114 | 134 |
| chronicler | 12.52 | 13.22 | 1.018 (0.989 to 1.142) | 2003857 | 855754 | 38 | 48 |
| courier | 13.53 | 12.91 | 0.951 (0.887 to 0.984) | 2014583 | 555915 | 50 | 52 |
| artificer | 13.38 | 12.57 | 0.940 (0.934 to 0.948) | 2024987 | 895096 | 68 | 80 |
| watchman | 12.81 | 11.97 | 0.947 (0.925 to 0.973) | 1992645 | 820307 | 14 | 19 |
| study | 12.51 | 11.45 | 0.912 (0.907 to 0.975) | 1989813 | 661269 | 8 | 11 |
| gate | 13.54 | 13.52 | 0.993 (0.990 to 1.013) | 2048961 | 1600401 | 114 | 137 |

Median of the nine stops' median ratios: 0.947; best 0.882, worst 1.123.

The swarm row (1.12, range 1.05 to 1.25) is a real outlier in this run: the same stop was 0.965 in the full before and after
pair below, so treat it as unexplained. From inside the valley the cull helps; looking over it (`swarm`, `gate`) most tiles
are visible and it cannot.

Exactness: the geometry pass was read back (class, tone, object id and normal of every texel) from `master` and
the modified build.

| Comparison | Positions | Texels | Differing texels | Not pine against pine | Positions with none |
|---|---|---|---|---|---|
| master vs modified, 36 scroll positions, 1 DPR | 36 | 46,656,000 | 17 | 1 | 27 |
| master vs modified, the nine stops, 1.75 DPR | 9 | 35,721,000 | 15 | 0 | 4 |
| master vs modified, 36 positions, 1.75 DPR (an intermediate build, same pine code) | 36 | 142,884,000 | 71 | 0 | 17 |
| **control**: master vs master, 36 positions, 1 DPR | 36 | 46,656,000 | 1 | 1 | 35 |

Every difference is two pines that land on the same 24-bit depth value, where the later draw wins and the split changes the
draw order (both texels are foliage, with different ids and normals). The one "not pine against pine" texel is a lit window
at the first position that also differs between two runs of `master` against itself (control row), so it predates the change.
A single tile (`PINE_GRID = 1`, the original instance order) removed the `artificer` differences, which is what
a draw-order tie predicts, and left only that same jitter texel.

## Item 2: bake the paper grain

Design: `GRAIN_FRAG` computes `grain * 1.6 + fibre * 0.5` (the two noises that depend only on `px`) once into an RG8
target the size of the drawing buffer, redone in `measure()` when the size or pixel ratio changes. The value is mapped to
0..1 over +-1.05 and split into a whole part and a remainder over two 8-bit channels, so it has 16 bits. The ink pass does
one `texelFetch`. It uses the same full-screen vertex shader and the same `px` expression as before, so every pixel gets the
same coordinates.

Quantisation: the first version was a single R8 channel (1 byte per pixel, 4.0 MB). Its error is at most 0.17 of a level,
which is inside the brief, but it flipped the rounding of about 5% of pixels by one level (69,831 of 1,296,000 in the
hero frame). The 16-bit pack brings that to 0.04 to 0.06% of the canvas (about 600 pixels), all by exactly 1 level, for
2 bytes per pixel.

Memory at 1440x900 and 1.75 DPR (2520x1575 = 3,969,000 pixels): **2 bytes per pixel = 7.94 MB** (7.57 MiB). At 1 DPR:
1,296,000 pixels = 2.59 MB. For scale, the existing geometry targets are two RGBA8 attachments plus a 24-bit depth
texture (stored as 4 bytes), about 47.6 MB at 1.75 DPR, so this adds 17%. The single-channel version would add 8%.

Texture fetches and noise per pixel in the ink pass, from the shader source:

| Pixel | Fetches before | Fetches after | Noise before | Noise after |
|---|---|---|---|---|
| sky, no solid next to it | 21 (5 class + 16 glow) | 22 | 5 `vnoise` (20 hashes) for the grain | 0 |
| sky, next to something solid | 30 (adds 4 depth + 5 normal) | 31 | same | 0 |
| solid or light (also reads depth for fog) | 31 | 32 | same | 0 |

The bake itself costs 4.5 ms of GPU once per resize at 1.75 DPR (2.4 ms at 1 DPR; noisy), measured by resizing the viewport back and forth.

Paired GPU time, 1.75 DPR, grain per pixel against baked (everything else as shipped):

| stop | grain per pixel GPU ms | grain baked GPU ms | grain baked / grain per pixel (median, range over 5 rounds) | vertices grain per pixel | vertices grain baked | draws grain per pixel | draws grain baked |
|---|---|---|---|---|---|---|---|
| hero | 8.62 | 6.73 | 0.770 (0.576 to 1.142) | 1298325 | 1298325 | 25 | 25 |
| seat | 7.07 | 7.29 | 0.960 (0.902 to 1.138) | 516117 | 516117 | 9 | 9 |
| swarm | 14.07 | 13.89 | 0.980 (0.918 to 1.035) | 1648785 | 1648784 | 134 | 134 |
| chronicler | 14.06 | 12.48 | 0.888 (0.879 to 0.906) | 855742 | 855760 | 48 | 48 |
| courier | 13.81 | 12.05 | 0.870 (0.864 to 0.882) | 556223 | 556001 | 52 | 52 |
| artificer | 13.90 | 12.38 | 0.876 (0.869 to 0.899) | 895010 | 895088 | 79 | 80 |
| watchman | 13.38 | 12.01 | 0.885 (0.870 to 0.899) | 820345 | 820324 | 19 | 19 |
| study | 13.48 | 11.49 | 0.852 (0.848 to 0.856) | 661269 | 661269 | 11 | 11 |
| gate | 13.42 | 13.37 | 0.996 (0.890 to 1.033) | 1600401 | 1600401 | 137 | 137 |

Median of the nine stops' median ratios: 0.885; best 0.770, worst 0.996.

## Item 1: skip unlit glow taps (dropped)

Where the loop matters: the class buffer was read back at each stop and every pixel within the glow's reach of a `light`
texel (`17 * scale` plus the wobble, plus half a texel) was counted. The loop is needed on about 1 to 3% of pixels; a 12 px
tile mask would keep 1 to 4%.

| Stop | Light texels | Pixels within reach (the minimum any mask can keep) | Kept by a 12 px tile mask |
|---|---|---|---|
| hero | 0.02% | 0.9% | 1.2% |
| seat | 1.38% | 2.8% | 3.3% |
| swarm | 0.01% | 1.0% | 1.5% |
| chronicler | 0.46% | 3.0% | 3.9% |
| courier | 0.05% | 0.8% | 1.1% |
| artificer | 0.15% | 2.1% | 2.9% |
| watchman | 0.14% | 0.9% | 1.2% |
| study | 0.19% | 1.7% | 2.4% |
| gate | 0.18% | 2.0% | 2.6% |

Design built and measured: a pass writing one texel per 12x12 pixels (set when any `light` texel is inside), a second tiny pass
spreading each set texel by `ceil(((17 + 0.675 * wobble) * scale + 1) / 12)` tiles (2 at 1 DPR, 3 at 1.75), and a one-fetch
test in the ink pass. A unit test of the spread formula passed (removed with the code). It was exact: with the gate forced open
the frames at 36 scroll positions matched the gated ones byte for byte at 1 DPR (36 of 36),
and at 1.75 DPR in 35 of 36; the other had 2 pixels off by one level, which is not
what a missed glow looks like (a missing glow moves a pixel by several levels) and is most likely a rounding flip from recompiling the shader.

It did not pay (paired GPU time, 1.75 DPR):

| stop | mask off (loop everywhere) GPU ms | mask on GPU ms | mask on / mask off (loop everywhere) (median, range over 5 rounds) | vertices mask off (loop everywhere) | vertices mask on | draws mask off (loop everywhere) | draws mask on |
|---|---|---|---|---|---|---|---|
| hero | 7.09 | 6.71 | 0.921 (0.883 to 1.456) | 1298325 | 1298337 | 25 | 27 |
| seat | 10.83 | 12.17 | 1.115 (0.818 to 1.713) | 516117 | 516129 | 9 | 11 |
| swarm | 13.43 | 13.32 | 1.026 (0.961 to 1.058) | 1648785 | 1648796 | 134 | 136 |
| chronicler | 12.12 | 13.20 | 1.083 (1.078 to 1.131) | 855732 | 855769 | 48 | 50 |
| courier | 11.44 | 12.53 | 1.102 (1.095 to 1.110) | 556269 | 555903 | 52 | 55 |
| artificer | 11.99 | 13.23 | 1.101 (1.082 to 1.112) | 895027 | 895127 | 79 | 82 |
| watchman | 11.37 | 12.52 | 1.100 (1.078 to 1.106) | 820348 | 820308 | 19 | 21 |
| study | 10.81 | 11.99 | 1.107 (1.091 to 1.112) | 661269 | 661281 | 11 | 13 |
| gate | 12.85 | 13.98 | 1.074 (1.065 to 1.089) | 1600401 | 1600413 | 137 | 139 |

Median of the nine stops' median ratios: 1.100; best 0.921, worst 1.115.

For the ceiling, the whole glow loop skipped (a wrong picture, only to see what it costs):

| stop | loop everywhere GPU ms | no loop at all GPU ms | no loop at all / loop everywhere (median, range over 5 rounds) | vertices loop everywhere | vertices no loop at all | draws loop everywhere | draws no loop at all |
|---|---|---|---|---|---|---|---|
| hero | 6.93 | 6.32 | 0.865 (0.755 to 1.211) | 1989813 | 1989813 | 8 | 8 |
| seat | 14.35 | 13.03 | 0.905 (0.863 to 0.925) | 1989813 | 1989813 | 8 | 8 |
| swarm | 14.65 | 13.97 | 0.942 (0.919 to 0.997) | 2048961 | 2048961 | 114 | 114 |
| chronicler | 13.79 | 13.44 | 0.974 (0.928 to 0.987) | 2003844 | 2003843 | 38 | 38 |
| courier | 13.66 | 13.03 | 0.948 (0.833 to 0.960) | 2014439 | 2014452 | 50 | 50 |
| artificer | 14.22 | 13.18 | 0.916 (0.720 to 0.987) | 2024897 | 2024917 | 68 | 68 |
| watchman | 14.28 | 12.66 | 0.886 (0.873 to 0.920) | 1992676 | 1992679 | 14 | 14 |
| study | 13.91 | 12.79 | 0.912 (0.885 to 0.967) | 1989813 | 1989813 | 8 | 8 |
| gate | 13.77 | 13.26 | 0.963 (0.934 to 1.021) | 2048961 | 2048961 | 114 | 114 |

Median of the nine stops' median ratios: 0.916; best 0.865, worst 0.974.

and the mask against no loop at all:

| stop | mask on GPU ms | no loop at all GPU ms | no loop at all / mask on (median, range over 5 rounds) | vertices mask on | vertices no loop at all | draws mask on | draws no loop at all |
|---|---|---|---|---|---|---|---|
| hero | 7.91 | 6.39 | 0.814 (0.739 to 1.074) | 1298337 | 1298325 | 27 | 25 |
| seat | 6.69 | 5.16 | 0.799 (0.650 to 0.827) | 516129 | 516117 | 11 | 9 |
| swarm | 13.14 | 11.26 | 0.868 (0.810 to 1.139) | 1648796 | 1648783 | 136 | 134 |
| chronicler | 10.90 | 10.60 | 0.970 (0.750 to 1.032) | 855736 | 855767 | 50 | 48 |
| courier | 9.22 | 8.03 | 0.870 (0.832 to 0.991) | 555757 | 555873 | 55 | 53 |
| artificer | 10.91 | 9.20 | 0.843 (0.760 to 1.016) | 895195 | 895111 | 82 | 80 |
| watchman | 12.52 | 10.26 | 0.834 (0.768 to 0.999) | 820293 | 820301 | 21 | 19 |
| study | 12.72 | 11.27 | 0.898 (0.859 to 0.921) | 661281 | 661269 | 13 | 11 |
| gate | 10.55 | 9.94 | 0.942 (0.924 to 0.983) | 1600413 | 1600401 | 139 | 137 |

Median of the nine stops' median ratios: 0.868; best 0.799, worst 0.970.

The loop's 16 fetches are close together and hit the cache, so on this GPU they are cheap (about 8% of a frame in total); two
extra dependent passes cost more than that. A GPU where that loop costs far more than 8% might see a different result;
none was available.

## The picture

Frames: `before/` and `after/` hold the nine stops and the open record at 1440x900, DPR 1, reduced motion, each as the whole
page (`<id>.png`) and the canvas alone (`<id>.canvas.png`). Two captures of the same position were byte-identical
(20 of 20 files), so every difference below is the change.

| frame | image | pixels | differing | by 1 level | by 2+ levels | max delta | % differing |
|---|---|---|---|---|---|---|---|
| hero | page | 1296000 | 503 | 503 | 0 | 1 | 0.039% |
| seat | page | 1296000 | 383 | 383 | 0 | 1 | 0.030% |
| swarm | page | 1296000 | 374 | 374 | 0 | 1 | 0.029% |
| chronicler | page | 1296000 | 425 | 425 | 0 | 1 | 0.033% |
| courier | page | 1296000 | 382 | 382 | 0 | 1 | 0.029% |
| artificer | page | 1296000 | 368 | 366 | 2 | 15 | 0.028% |
| watchman | page | 1296000 | 442 | 442 | 0 | 1 | 0.034% |
| study | page | 1296000 | 527 | 527 | 0 | 1 | 0.041% |
| gate | page | 1296000 | 622 | 622 | 0 | 1 | 0.048% |
| record | page | 1296000 | 26 | 26 | 0 | 1 | 0.002% |
| hero | canvas | 1296000 | 644 | 644 | 0 | 1 | 0.050% |
| seat | canvas | 1296000 | 579 | 579 | 0 | 1 | 0.045% |
| swarm | canvas | 1296000 | 597 | 597 | 0 | 1 | 0.046% |
| chronicler | canvas | 1296000 | 617 | 617 | 0 | 1 | 0.048% |
| courier | canvas | 1296000 | 576 | 576 | 0 | 1 | 0.044% |
| artificer | canvas | 1296000 | 577 | 575 | 2 | 15 | 0.045% |
| watchman | canvas | 1296000 | 618 | 618 | 0 | 1 | 0.048% |
| study | canvas | 1296000 | 724 | 724 | 0 | 1 | 0.056% |
| gate | canvas | 1296000 | 737 | 737 | 0 | 1 | 0.057% |
| record | canvas | 1296000 | 579 | 579 | 0 | 1 | 0.045% |

Every difference is one level except two pixels in `artificer` (delta 15), at (1238, 57) and (1237, 58). They are an ink
line moving by one pixel at a spot where two pines tie in depth (the geometry readback shows foliage against foliage at the
second texel). The 0.03 to 0.06% of pixels at one level are the 16-bit grain.

Between the stops, 36 evenly spaced scroll positions (the camera passing through every stretch of the path), canvas
alone:

| Pixel ratio | Pixels | Differing | By 2+ levels | Max delta |
|---|---|---|---|---|
| 1 | 46,656,000 | 22,727 (0.049%) | 14 | 22 |
| 1.75 | 142,884,000 | 66,201 (0.046%) | 57 | 28 |

The 2+ level pixels are isolated and come in adjacent pairs (a line shifted a pixel), 14 in 46.7M and 57 in 142.9M. The
geometry readback above covers the same positions: the only differing texels are pine against pine ties. Per-position rows
are in `diff-summary-sweep-dpr1.md` and `diff-summary-sweep-dpr1.75.md`.

## Paired GPU time, all items together (against master)

1.75 DPR:

| stop | baseline GPU ms | final GPU ms | final / baseline (median, range over 6 rounds) | vertices baseline | vertices final | draws baseline | draws final |
|---|---|---|---|---|---|---|---|
| hero | 8.47 | 8.50 | 0.816 (0.728 to 1.172) | 1989813 | 1298325 | 8 | 25 |
| seat | 14.09 | 11.24 | 0.809 (0.792 to 0.859) | 1989813 | 533757 | 8 | 9 |
| swarm | 14.10 | 13.38 | 0.965 (0.915 to 1.009) | 2048144 | 1648191 | 112 | 132 |
| chronicler | 14.51 | 12.04 | 0.824 (0.810 to 0.840) | 2002251 | 854189 | 35 | 45 |
| courier | 14.27 | 11.57 | 0.816 (0.799 to 0.834) | 2017359 | 557888 | 55 | 57 |
| artificer | 13.65 | 12.53 | 0.920 (0.884 to 0.936) | 2026541 | 896577 | 71 | 82 |
| watchman | 13.91 | 12.14 | 0.873 (0.863 to 0.881) | 1990954 | 818629 | 11 | 16 |
| study | 13.93 | 11.39 | 0.818 (0.794 to 0.843) | 1989813 | 661269 | 8 | 11 |
| gate | 14.11 | 13.32 | 0.944 (0.940 to 0.958) | 2048961 | 1600401 | 114 | 137 |

Median of the nine stops' median ratios: 0.824; best 0.809, worst 0.965.

1 DPR:

| stop | baseline GPU ms | final GPU ms | final / baseline (median, range over 6 rounds) | vertices baseline | vertices final | draws baseline | draws final |
|---|---|---|---|---|---|---|---|
| hero | 5.75 | 4.91 | 0.828 (0.763 to 0.884) | 1989813 | 1298325 | 8 | 25 |
| seat | 4.76 | 4.18 | 0.900 (0.688 to 1.269) | 1989813 | 534579 | 8 | 9 |
| swarm | 5.30 | 5.90 | 1.076 (0.907 to 1.372) | 2048141 | 1648200 | 112 | 132 |
| chronicler | 5.35 | 4.77 | 0.898 (0.786 to 1.153) | 2002246 | 854155 | 35 | 45 |
| courier | 3.49 | 2.86 | 0.817 (0.704 to 1.262) | 2017333 | 557797 | 55 | 57 |
| artificer | 3.56 | 3.20 | 0.888 (0.710 to 1.005) | 2026546 | 896570 | 71 | 82 |
| watchman | 3.50 | 2.68 | 0.767 (0.716 to 0.819) | 1990976 | 818647 | 12 | 16 |
| study | 5.00 | 4.04 | 0.743 (0.708 to 1.046) | 1989813 | 661269 | 8 | 11 |
| gate | 5.16 | 5.27 | 1.062 (0.666 to 1.171) | 2048961 | 1600401 | 114 | 137 |

Median of the nine stops' median ratios: 0.888; best 0.743, worst 1.076.

At 1 DPR the swarm and gate rows are within the noise of no change (ranges 0.9 to 1.4 and 0.67 to 1.17); gains at the other
stops are real but smaller in absolute terms.

## Files

* `before/`, `after/`: frames. `diff-summary-*.md`: pixel counts per frame.
* `gate-output.txt`: lint, typecheck, test and build output from the final tree.
* `tables/`: the paired tables above. `raw/`: every measurement as JSON, `raw/dropped-glow-mask/` for the dropped item,
  `raw/superseded/` for runs on intermediate builds or with the discarded method.
* `tools/`: the Playwright scripts (`frames.py`, `diff.py`, `sweep.py`, `diffdir.py`, `gbuffer.py`, `pair.py`, `verts.py`,
  `bake.py`, `coverage.py`). They need the dev server on a port and the cached Chrome for Testing path at the top of each
  script.
