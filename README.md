# devjravolio.com

Personal site for Julio Cesar Avolio. A text-mode portfolio: everything resolves to a
7×14px character lattice, and the hero is a Schwarzschild geodesic integrator running in a
WebGL2 fragment shader, quantised to ASCII.

The `/render` page explains how it works and credits the prior art.

```bash
pnpm install
pnpm dev
```

| | |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | bake the fallback frame, then build |
| `pnpm bake` | regenerate `public/static/blackhole.txt` |
| `pnpm lint` / `pnpm typecheck` | verification |

- [ARCHITECTURE.md](ARCHITECTURE.md) — stack, renderer, layout, gotchas
- [DESIGN.md](DESIGN.md) — tokens, type, lattice, bans
- [PRODUCT.md](PRODUCT.md) — audience, voice, anti-references

Fonts are self-hosted and SIL OFL: [Departure Mono](https://departuremono.com) by Helena
Zhang, and [Commit Mono](https://commitmono.com) by Eigil Nikolajsen. Licences ship in
`public/static/fonts/`.
