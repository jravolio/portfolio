# AGENTS.md

Working notes for anyone (human or agent) editing this repo.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before touching the renderer and
[DESIGN.md](DESIGN.md) before touching anything visual. [PRODUCT.md](PRODUCT.md) holds the
content of record.

## Rules that are not negotiable

1. **Facts live in `src/data/resume.ts`.** One file, typed, both locales. Do not reintroduce
   a second source of truth, and do not invent a metric — every number traces to the
   LinkedIn export.
2. **Never break the lattice.** Spacing is multiples of 7px, line boxes multiples of 14px,
   Departure Mono only at multiples of 11px. Tailwind's 4px scale is not used here.
3. **Every ASCII surface is `aria-hidden`, with real semantic HTML alongside.** The site
   must read completely with JavaScript off, reduced motion on, and through a screen
   reader. That is the acceptance test, not a nice-to-have.
4. **One spectacle.** The field is it. Do not add a second animated hero, a second WebGL
   context, or entrance motion on body content.
5. **Do not hand-edit `src/components/vendor/`.** Those are registry copies; see the
   README there.

## Version pins that look wrong and are not

- `typescript@^6` — v7 is the Go port with no compiler API, and it silently disables
  type-aware linting through `typescript-eslint`.
- `eslint@9` — `eslint-plugin-react@7.37.5` calls `context.getFilename()`, removed in
  ESLint 10, and linting crashes on load.

Both are documented in ARCHITECTURE.md. Bumping either needs a green `pnpm lint`.

## Verifying

```bash
pnpm lint && pnpm typecheck && pnpm build
```

All three must pass. For visual work, check both themes and both locales, at 390px and
1440px, and with reduced motion on.
