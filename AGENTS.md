# AGENTS.md

Working notes for anyone (human or agent) editing this repo.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before touching `src/scene/` and
[DESIGN.md](DESIGN.md) before touching anything visual. [PRODUCT.md](PRODUCT.md) holds the
audience, the voice and the fiction.

## Rules

1. **Facts live in `src/data/resume.ts`.** One file, typed. Every role, date and figure is
   quoted from the owner's LinkedIn profile; do not invent a metric, and do not hard-code a
   fact in a component. The hero summary, the contents list and the JSON-LD are all derived
   from that file.
2. **Real names in roman type, fiction in blackletter.** Company names, roles, dates and
   navigation are set in Grenze. Grenze Gotisch is for the owner's name, card names,
   numerals, figures and the names of the objects on the study shelf only. Blackletter company names misread ("Agent" as "Rgent").
3. **Original names only.** The valley is inspired by the owner's Curse of Strahd campaign,
   which is Wizards of the Coast property. No names, places, maps or art from it appear on
   the site. The one mention is the dice note in the study, as a fact about the owner.
4. **One scene, one canvas.** The valley is a single WebGL context behind the page. Do not
   add a second canvas or a second animated hero.
5. **The scene never carries a fact.** Everything a reader needs is HTML in `src/app/page.tsx`.
   The canvas is `aria-hidden`.

## Version pins that look wrong and are not

- `typescript@^6`: v7 is the Go port with no compiler API, and it silently disables
  type-aware linting through `typescript-eslint`.
- `eslint@9`: `eslint-plugin-react@7.37.5` calls `context.getFilename()`, removed in
  ESLint 10, and linting crashes on load.

Bumping either needs a green `pnpm lint`.

## Verifying

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

All four must pass. `pnpm test` runs Node's built-in test runner over `tests/`: it covers the
data in `resume.ts`, the terrain height function and the baked model file's format. There are
no component or WebGL tests; the stops are checked by eye. For visual work, look at every stop (`hero`, `seat`, `swarm`,
`chronicler`, `courier`, `artificer`, `watchman`, `study`, `gate`) at 1440px and 390px:
scroll to the section's `offsetTop` and wait three seconds for the camera to settle. Check
once with reduced motion on.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
