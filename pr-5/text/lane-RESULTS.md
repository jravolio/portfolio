# Evidence: `refactor: make illegal card states unrepresentable`

Claim: `src/data/resume.ts` now rejects, at compile time, the card states the old `Card` type allowed, and **nothing the
page renders has changed**. This folder is the proof. Everything below was run on commit `c86eedb` (before) and on the
working tree that became this commit (after), from the same dev server, in the same headless Chromium.

## What was proven

| Claim | How | Result |
|---|---|---|
| Rendered DOM text is unchanged | `main.innerHTML`, `nav.innerHTML`, the `application/ld+json` text, `document.title`, the meta description and the open record's text, captured in the browser before and after (`dom/dom-diff.txt`) | **All six byte-identical.** No normalisation was needed (raw text compared first). |
| The production page is unchanged | `next build` of `c86eedb` and of the final tree; the prerendered `/` HTML compared (`bundle/prerendered-html-compare.txt`) | Markup with every `<script>` removed: **identical** (43,899 chars). JSON-LD: **identical**. The scripts that differ carry the chunk file name, the build id and the RSC payload (it lost the `null` slots of the old fragment around the identity block: 42 bytes smaller). |
| Frames are unchanged | Nine stops and the open record, 1440x900, DPR 1, reduced motion, fake clock; sha256 and a numpy pixel diff (`frames-diff.txt`) | **10 of 10 byte-identical, 0 differing pixels.** Re-run on the final code (`final-check/`): hero, seat and the record again identical. |
| Frames are deterministic | Two fresh page loads, same path: hero and seat hashes equal (`before` vs `before-repeat`); the open record captured twice in one run: equal | **Byte-identical.** See "Method notes" for what it took. |
| Illegal states do not compile | `tests/resume.types.ts`, 19 `@ts-expect-error` lines, checked by `pnpm typecheck` | Green with all 19 (`types/green.txt`). Red with one removed (`types/red-one-directive-removed.txt`). Red with all removed: 19 real errors, one per directive (`types/red-all-directives-removed.txt`). |
| The real data rejects them too | Seven illegal edits made to `resume.ts` at once, typechecked, then restored byte-for-byte (`types/data-mutations-*`) | Every one is a compile error, in `resume.ts`, `emblems.tsx` or `relic-art.tsx`. |
| A reorder cannot desynchronise a numeral | Two cards swapped in a temp copy, nothing else touched (`types/reorder-experiment.txt`) | The numerals follow the positions. |
| Gate | `pnpm lint`, `typecheck`, `test`, `build` on the final tree (`gate.txt`) | All exit 0; 32 of 32 tests pass. |

The seven data mutations (`types/data-mutations-applied.txt`): a practice card gains `roles: []`; a role card has
`roles: []`; a practice card loses `usedAt`; a card id is renamed (`emblems.tsx` stops compiling); a group is deleted
(the three cards in it stop compiling); a group field is mistyped (`glanse`, the compiler suggests `glance`); a relic id
is renamed (`relic-art.tsx` stops compiling). The first and third hit the same card, so the compiler reported the first at
the `satisfies` and the second at the `CARDS` assignment.

## What changed, per item

1. **`Card` is a union on `type`.** `RoleCard` has `roles: readonly [Role, ...Role[]]`; `PracticeCard` has `usedAt` and
   `steps` and no roles. `place-panel.tsx` narrows on `card.type`; the `roles.length > 0`, `card.steps ?` and `usedAt ?`
   checks are gone.
2. **`glance` is on the group.** Optional on a `GROUPS` entry. The hero shows it, or the `years` of the group's role cards
   when there is none. Output text is identical.
3. **`numeral` is derived.** `CARDS = CARD_DATA.map((card, i) => ({ ...card, numeral: roman(i + 1) }))`.
4. **Derived types.** `StopId` is the ids in `CARD_DATA`, `Group` the ids in `GROUPS`, `Relic["id"]` the ids in
   `RELICS`. `emblems.tsx` and `relic-art.tsx` are unchanged and still `Record`s over them.
5. **`years(roles: readonly Role[])`** moved next to `yearOf`. **`CURRENT_ROLE`** is the open role in the `now` group and
   feeds `worksFor`; `CARDS[0].roles[0]` is gone.

Skipped, with the reason:

- *A type that forbids a one-card group without a glance.* A group's cards live on the cards, so the type would need
  per-group counts, and the rule no longer exists: a glance is optional and the fallback is the years. What is left is
  "a group without a glance has a role card to date it", which is a runtime test.
- *`years` taking a non-empty tuple.* The brief says `Role[]`, and the group-level call builds its roles with `flatMap`,
  which cannot prove non-emptiness. `years([])` is not defined; the test above keeps it unreachable.
- *`src/scene/path.ts`.* Untouched; it compiles because `CARDS.map((card) => card.id)` still works.

## Method notes, and where this differs from the brief

- **Browser.** The `chrome-devtools` tools are not installed in this session. The captures use Playwright's Chromium
  (`chromium_headless_shell-1255`, already installed; nothing downloaded) with `--use-angle=swiftshader`, through the
  `e2e` slot. `scripts/capture.py` and `scripts/domdiff.py` are the exact scripts.
- **Port.** 3113 was already held by another session's server (`/private/tmp/lane-perf-baseline`), so this lane used
  3114. That server was not touched.
- **Frames are not byte-stable on a real clock.** Two captures of the seat at one scroll position differed by 26 pixels
  (max channel delta 3, one 33x36 box around the lord's head). `valley.ts` eases the head toward the camera by frame
  `dt` and stops within 1e-4 rad, so the resting angle depends on frame timing. The run therefore uses Playwright's fake
  clock (fixed 16 ms frames), and "deterministic" means "the same path from a fresh page load". Under it, every frame
  matched the real-clock run's hash except the seat, which is the only frame with the head in view.
- **The first open-record frames were caught mid-fade** (`*/frame-record-seat.UNSETTLED-first-run.png`). The dialog has
  a 220 ms opacity transition that runs in real time, outside the fake clock, and the machine was loaded. The script now
  waits until `document.getAnimations()` is empty. The settled frames are `frame-record-seat.png` in `before/` and
  `after/`. Their DOM text was identical in both runs.
- **The "before" record frame was taken from `c86eedb` sources** put back in place for one capture and then restored
  (`before-record/`); the rest of `before/` came from the untouched checkout.
- **Bundle.** `study.tsx` is a client component that imports `RELICS` from `resume.ts`, so the module is in a client chunk
  with every card's text. That predates this change. Total client JS went from 1,217,750 to 1,218,057 bytes (+307); the
  chunk holding `resume.ts` from 17,234 to 17,541. After the change none of the three glance sentences or the group
  labels is in a client chunk; on the baseline build I checked one of them ("multi-agent pipelines") and it was.

## Not verified

- No viewport narrower than 1440px was captured. The DOM and the production markup are identical, and no CSS changed.
- Reduced motion was on for every frame. A frame with motion on is not repeatable by construction, so none was compared.
- The scene uses software GL here; a GPU could differ from these frames, but both sides of every comparison used the same renderer.

## Files

`before/`, `after/` full run (nine stops, open record, DOM json); `before-repeat/` determinism run; `before-record/`,
`after-record/`, `final-check/` the settled open-record runs; `dom/` normalised text and `dom-diff.txt`; `frames-diff.txt`;
`types/`; `bundle/`; `gate.txt`; `dev-server.log`; `scripts/`.
