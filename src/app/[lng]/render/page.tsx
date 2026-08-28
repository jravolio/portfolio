import type { Metadata } from "next";
import { getContent } from "@/data/resume";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>;
}): Promise<Metadata> {
  const { lng } = await params;
  return {
    title: "render",
    description:
      "How the ASCII black hole on this site is rendered: backwards Schwarzschild geodesics in a WebGL2 fragment shader, quantised to a 7x14px character lattice.",
    alternates: { canonical: `/${lng}/render` },
  };
}

function Fig({ n, caption, children }: { n: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="my-8 border border-rule">
      <div className="overflow-x-auto bg-bg-inset p-4">{children}</div>
      <figcaption className="border-t border-rule px-4 py-2 text-chrome text-dim">
        <span className="text-amber">Fig. {n}</span> — {caption}
      </figcaption>
    </figure>
  );
}

export default async function RenderPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const t = getContent(lng);

  return (
    <article className="pt-10">
      <h1 className="text-display-2 text-ink-hi">render</h1>
      <p className="mt-3 max-w-[70ch] text-body text-dim">
        {t.nav.render === "render"
          ? "How the field on the index page is computed. It is a backwards null-geodesic integrator in a WebGL2 fragment shader, quantised to a character lattice. Nothing here is a loop or a sprite."
          : "Como o campo da página inicial é calculado. É um integrador de geodésicas nulas em um fragment shader WebGL2, quantizado para uma malha de caracteres. Nada aqui é um loop ou um sprite."}
      </p>

      <div className="prose-terminal prose mt-12 dark:prose-invert">
        <h2>The shadow is 2.598 r_s, not 1.0</h2>
        <p>
          The single most common error in a hand-rolled black hole is drawing the black disk at the
          event horizon, <code>r_s = 1</code>. What a distant observer actually sees is the{" "}
          <em>apparent</em> shadow, whose radius is the critical impact parameter
        </p>
        <p>
          <code>b_crit = 3√3/2 ≈ 2.598 r_s</code>
        </p>
        <p>
          Photons with <code>b &lt; b_crit</code> spiral in; photons with <code>b &gt; b_crit</code>{" "}
          escape after winding some number of turns. Draw the disk at 1.0 and you get a dot with a
          halo. Draw it at 2.598 and you get a black hole. The photon sphere itself sits at{" "}
          <code>r = 1.5</code>, and the disk&rsquo;s inner edge (the ISCO) at <code>r = 3</code>.
        </p>

        <h2>Integrating the geodesic</h2>
        <p>
          Each cell fires one photon backwards from the camera. The acceleration is the Cartesian
          Binet form,
        </p>
        <p>
          <code>a = −(3/2) h² x / r⁵</code>
        </p>
        <p>
          where <code>h²</code> is the conserved angular momentum. Two details matter more than the
          rest:
        </p>
        <ul>
          <li>
            <strong>
              <code>h²</code> is computed once, not per step.
            </strong>{" "}
            Because <code>a</code> is parallel to <code>x</code>, angular momentum is exactly
            conserved. Recomputing it each step from a numerically drifting cross product makes the
            photon ring visibly wobble.
          </li>
          <li>
            <strong>Leapfrog, not Euler.</strong> At this step size Euler integration spirals
            escaping rays into the hole and thickens the shadow by several cells. Kick-drift-kick
            costs one extra acceleration evaluation and fixes it.
          </li>
        </ul>
        <p>
          A warning about a form you will find widely copied: <code>u″ = −u(1 − 1.5u²)</code>{" "}
          expands to a photon sphere at <code>r = 1.2247</code>, not 1.5. The Cartesian form above
          puts it where it belongs. Checking where your integrator places the photon sphere is a
          decisive test of whether the physics is right.
        </p>

        <h2>Real physics is cheaper than faking it here</h2>
        <p>
          At 205×57 cells there are about 11,700 samples. At 2× supersampling that is ~47,000
          fragments times 40 integration steps, roughly 1.9M iterations per frame. The same shader
          at 5K costs on the order of 15M pixels times the step count. Quantising to a character
          grid buys three orders of magnitude, so the usual argument for a procedural fake
          evaporates: the budget goes to the glyph stage instead, which is where ASCII renders
          actually live or die.
        </p>

        <h2>What survives quantisation</h2>
        <p>Four features read at this resolution. Everything else is wasted work:</p>
        <ul>
          <li>the shadow silhouette</li>
          <li>a one-cell photon ring</li>
          <li>the left/right Doppler asymmetry</li>
          <li>the lensed far-side arc over and under the shadow</li>
        </ul>
        <p>
          So there is no Kerr spin here (≤4% shadow flattening, invisible), no higher-order photon
          subrings (sub-cell forever), and no per-pixel blackbody. The disk emission uses{" "}
          <code>tprof²</code> rather than the bolometric <code>T⁴</code>, because <code>T⁴</code>{" "}
          collapses to a single bright cell once you only have a dozen glyph levels. The beaming
          exponent is 1.9 rather than the textbook 3+α for the same reason: at full strength the
          receding limb falls below the ramp floor and disappears.
        </p>
        <p>
          Interstellar&apos;s team suppressed the Doppler asymmetry because test audiences found it
          confusing. This does the opposite. At a dozen brightness levels the asymmetry is one of
          the few cues that survives, and it is what makes the thing look computed rather than
          looped.
        </p>

        <h2>The ramp is measured, not chosen</h2>
        <p>
          <code>@</code> covers about 0.42 of its cell in one monospace face and 0.58 in another.
          Hand-ordering a ramp is why naive ASCII looks muddy in the midtones. At boot every
          candidate glyph is rasterised into a 7×14 cell, its alpha integrated, and the pool sorted
          by actual ink coverage; near-duplicates within 1.5% are dropped because they waste a ramp
          step and cause banding.
        </p>
        <p>
          Index 0 is a literal space. The shadow has to be a hole in the text, not a dim glyph. That
          one choice does more for recognisability than anything else in the pipeline.
        </p>

        <h2>The cell is 7×14px, exactly</h2>
        <p>
          Departure Mono has <code>unitsPerEm = 550</code> and an advance width of 350. At 11px that
          is an advance of exactly 7.000px and a line box of exactly 14.000px: a cell aspect of
          exactly 0.5, on an integer pixel grid. The face is drawn on a 50-unit grid for precisely
          this. Every dimension on this site is a multiple of those two numbers, and the atlas is
          only ever rasterised at integer multiples of 11px, because a pixel font at a fractional
          size is just mush.
        </p>
        <p>
          The aspect ratio is also why the field has to be aspect-corrected before tracing. Skip it
          and the photon ring renders as an ellipse. It is why the Sobel gradient is rescaled into
          cell space before <code>atan</code>, too: cells are 2:1 tall, so a <code>/</code>{" "}
          depicts a ~60° line on screen, not 45°.
        </p>

        <h2>Three passes, no readback</h2>
        <ol>
          <li>
            <strong>Field.</strong> Geodesic integration at 2× the cell grid. Outputs disk
            luminance, analytic ring coverage, and the lensed headline in three channels.
          </li>
          <li>
            <strong>Quantise.</strong> Box-downsample to the cell grid, Sobel in cell space for
            directional glyphs, 4×4 Bayer dither on the ramp <em>index</em>, and temporal
            hysteresis against the previous frame.
          </li>
          <li>
            <strong>Composite.</strong> One quad sampling a NEAREST glyph atlas.
          </li>
        </ol>
        <p>
          There is no <code>gl.readPixels</code> anywhere. Reading back the frame you just drew
          forces a GPU→CPU sync stall that is very easy to spend a day blaming on the shader.
          Similarly, <code>texture(tex, floor(uv*grid)/grid)</code> samples one texel — the cell&apos;s
          top-left corner — not the cell average, which aliases and crawls on animated content. The
          downsample is an explicit box filter.
        </p>
        <p>
          Temporal hysteresis is the least glamorous part and the most important: a cell sitting on
          a quantisation boundary flips glyph every single frame otherwise, which is the worst
          artifact animated ASCII has. Cells only leave their previous bin when the field moves more
          than 0.575 of a ramp step.
        </p>

        <h2>The headline is a sky plane</h2>
        <p>
          The name is rendered to a texture and placed on a plane behind the hole. Rays that escape
          are projected onto it, so the headline bends around the shadow and a mirrored copy appears
          inside the Einstein ring. It is the same integrator doing both jobs; the name is simply
          what the background happens to be.
        </p>

        <h3>Prior art</h3>
        <p>
          This move is not original.{" "}
          <a href="https://github.com/s0xDk/ghostty-blackhole" target="_blank" rel="noreferrer">
            <code>s0xDk/ghostty-blackhole</code>
          </a>{" "}
          (May 2026) does Schwarzschild geodesics over terminal text including the lensed-text
          trick, and{" "}
          <a href="https://andrewd.ing/projects/O" target="_blank" rel="noreferrer">
            Andrew Ding&apos;s ASCII Black Hole
          </a>{" "}
          (2025) is a particle-based take that predates it. Both are worth reading. What is
          different here is the pipeline rather than the idea: a measured coverage ramp, cell-space
          edge-aware glyph substitution, analytic ring coverage carried in its own channel, and
          temporal hysteresis.
        </p>

        <h2>Degrading</h2>
        <p>
          The frame you see first is not WebGL at all. It is a pre-baked 100×36 frame produced at
          build time by the same integrator running on the CPU, shipped inline in the server HTML as
          a single <code>&lt;pre&gt;</code> with one text node. It is the reduced-motion state, the
          no-JS state, the no-WebGL state, and the first paint before the renderer chunk downloads.
        </p>
        <p>
          It is one DOM node, not 3,600. Rendering the art as one <code>&lt;span&gt;</code> per cell
          fails Lighthouse&apos;s DOM-size audit on its own and makes every interaction pay a style
          recalculation.
        </p>

        <Fig
          n="1"
          caption="Quality ladder. Demotion is triggered by a rolling frame-time average over the first 30 frames."
        >
          <table className="w-full text-left text-chrome">
            <thead>
              <tr className="border-b border-rule text-dim">
                <th scope="col" className="py-1 pr-6 font-normal">tier</th>
                <th scope="col" className="py-1 pr-6 font-normal">grid</th>
                <th scope="col" className="py-1 pr-6 font-normal">steps</th>
                <th scope="col" className="py-1 pr-6 font-normal">ss</th>
                <th scope="col" className="py-1 font-normal">trigger</th>
              </tr>
            </thead>
            <tbody className="text-dim">
              <tr><td className="py-1 pr-6">0</td><td className="py-1 pr-6">232×64</td><td className="py-1 pr-6">64</td><td className="py-1 pr-6">2×</td><td className="py-1">desktop dGPU</td></tr>
              <tr><td className="py-1 pr-6">1</td><td className="py-1 pr-6">205×57</td><td className="py-1 pr-6">40</td><td className="py-1 pr-6">2×</td><td className="py-1">default</td></tr>
              <tr><td className="py-1 pr-6">2</td><td className="py-1 pr-6">205×57</td><td className="py-1 pr-6">24</td><td className="py-1 pr-6">1×</td><td className="py-1">frame time &gt; 12ms</td></tr>
              <tr><td className="py-1 pr-6">3</td><td className="py-1 pr-6">96×42</td><td className="py-1 pr-6">20</td><td className="py-1 pr-6">1×</td><td className="py-1">coarse pointer</td></tr>
              <tr><td className="py-1 pr-6">—</td><td className="py-1 pr-6">100×36</td><td className="py-1 pr-6">static</td><td className="py-1 pr-6">—</td><td className="py-1">reduced motion, no JS, no WebGL</td></tr>
            </tbody>
          </table>
        </Fig>

        <p>
          The loop stops whenever it cannot be seen: an <code>IntersectionObserver</code> on exit
          and <code>visibilitychange</code> when the tab is backgrounded, both calling{" "}
          <code>cancelAnimationFrame</code>. The context is requested with{" "}
          <code>powerPreference: &apos;low-power&apos;</code>, DPR is capped at 2, and{" "}
          <code>webglcontextlost</code> is handled because iOS Safari drops contexts on
          backgrounding.
        </p>
        <p>
          There is a visible, keyboard-reachable pause control. WCAG SC 2.2.2 is a Level A
          requirement and it applies here: the animation starts automatically, runs for more than
          five seconds, and sits alongside content.
        </p>

        <h2>Why any of this is on a portfolio</h2>
        <p>
          Because a portfolio that claims systems ability should be a system, not a picture of one.
          Everything above is checkable: open devtools and read the shader, check the cell count and
          frame time in the readout against the grid you are actually looking at, turn on reduced
          motion and get a single pre-baked frame, turn off JavaScript and still read every word on
          the site.
        </p>
        <p>
          The field does not respond to the cursor, deliberately. An earlier version mapped pointer
          position to the viewing angle, and it was the wrong instinct: a background that swings
          around when you move the mouse asks to be played with, and this one sits directly beside
          the only two sentences on the page that need reading. It holds still at{" "}
          <code>incl = 1.15 rad</code>, looking down onto the disk from a little above its plane.
        </p>
      </div>
    </article>
  );
}
