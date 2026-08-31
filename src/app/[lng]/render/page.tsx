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
      "How the ASCII galaxy on this site is rendered: logarithmic spiral arms turning as a density wave, in a WebGL2 fragment shader rasterised into Braille sub-cells.",
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
          ? "How the field on the index page is computed. A spiral galaxy in a WebGL2 fragment shader, rasterised into Braille sub-cells. The arms turn as a density wave. Nothing here is a loop or a pasted sprite."
          : "Como o campo da página inicial é calculado. Uma galáxia espiral em um fragment shader WebGL2, rasterizada em sub-células Braille. Os braços giram como onda de densidade. Nada aqui é um loop ou um sprite colado."}
      </p>

      <div className="prose-terminal prose mt-12 dark:prose-invert">
        <h2>The arms are a wave, not an object</h2>
        <p>
          A spiral galaxy&rsquo;s disk rotates differentially: the inner parts complete an orbit far
          faster than the outer ones. If the arms were material, actual lanes of stars, differential
          rotation would wind them into a tight coil within a couple of galactic rotations and every
          spiral we can see would have stopped being one long ago. That is the <em>winding problem</em>.
        </p>
        <p>
          Lin and Shu resolved it in 1964: the arms are <strong>density waves</strong>. They are
          regions of compression that disk material passes <em>through</em>, the way a traffic jam
          persists on a motorway while individual cars enter and leave it. The pattern rotates
          rigidly at a single constant <em>pattern speed</em>, independent of the orbital speed at
          any radius.
        </p>
        <p>
          That is both the physics and the only thing that survives a loop running for minutes.
          Rotating the material would visibly wind the arms up while you watched. Here the arm phase
          carries a rigid <code>&minus;t&middot;&Omega;</code> term so the arms stay permanently
          open, while a separate noise field is advected at <code>&Omega;(r) &prop; 1/r</code> so the
          clumping shears past the pattern. Both are true at once, which is the point.
        </p>

        <h2>Logarithmic spirals and pitch angle</h2>
        <p>
          Real arms are close to logarithmic, which means a <strong>constant pitch angle</strong>:
          the angle between the arm and a circle drawn through it is the same at every radius.
        </p>
        <p>
          <code>&theta; = ln(r/a) / tan(p)</code>
        </p>
        <p>
          Pitch angle is what separates the Hubble types. Sa through Sc average at or under 15.5
          degrees, opening up toward later types. This one runs at <strong>19 degrees</strong>, in Sc
          territory. That is a choice the medium forced rather than a physical one: tighter than
          about 15 degrees and the arms drop below the resolution of the glyph grid and read as
          concentric rings instead of a spiral.
        </p>

        <h2>Disk, bulge, and why the core is amber</h2>
        <p>
          Surface brightness is the sum of two components. The disk is exponential,{" "}
          <code>&Sigma;(R) = &Sigma;&#8320;&middot;exp(&minus;R/Rs)</code>, which is why the galaxy
          fades smoothly instead of ending at an edge. The bulge is a S&eacute;rsic profile at{" "}
          <code>n = 4</code>, the de Vaucouleurs case, far more centrally concentrated: it climbs
          steeply enough that the nucleus saturates the ramp, which is correct.
        </p>
        <p>
          The two colours are not decoration. Bulges really are red-yellow, being old stellar
          populations long since done forming stars, and arms are blue-white because that is where
          star formation is happening now and the brightest, shortest-lived stars sit. Tinting the
          nucleus and the HII regions amber while the arms stay in ink is the astronomically correct
          way to spend a two-colour palette.
        </p>
        <p>
          Dust lanes sit just <em>inside</em> the arms, on the leading edge of the wave where gas
          piles up before it forms stars. That is a phase offset, not a separate texture.
        </p>

        <h2>Braille buys 8x the resolution</h2>
        <p>
          U+2800&ndash;28FF is a 2&times;4 dot matrix per character, so rendering into Braille rather
          than a luminance ramp carries <strong>eight times</strong> the effective resolution on
          exactly the same character grid: 80,360 addressable dots at 205&times;49 instead of 10,045
          cells. The toggle in the hero readout flips between them.
        </p>
        <p>
          It comes with a hard constraint. Departure Mono contains <strong>0 of the 256</strong>{" "}
          Braille patterns, measured from its <code>cmap</code>; Commit Mono contains all 256. A
          missing glyph does not fail loudly, it gets substituted by the fallback face at the
          fallback&rsquo;s advance width, silently shearing the 7px lattice. So the Braille atlas is
          built from Commit Mono and the builder refuses to run against a face lacking the block.
        </p>
        <p>
          The threshold is <strong>interleaved gradient noise</strong>, not Bayer. An ordered 8&times;8
          Bayer matrix aligns with the 2&times;4 cell structure and shows up as a hard four-column
          repeat across the field. IGN has no periodic structure, and because it is still a pure
          function of position it never shimmers between frames the way white noise would.
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
          Index 0 is a literal space. Empty sky has to be a hole in the text, not a dim glyph. That
          one choice does more for legibility than anything else in the pipeline.
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
          and a face-on galaxy renders as an ellipse. It is why the Sobel gradient is rescaled into
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
