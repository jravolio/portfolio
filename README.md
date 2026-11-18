# devjravolio.com

Personal site for Julio Cesar Avolio. The page is a gothic valley drawn in ink: a
Three.js scene behind the content, with a camera that travels from the castle to the gate
as you scroll. Each stop is one job or project.

```bash
pnpm install
pnpm dev
```

| | |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | production build |
| `pnpm lint` / `pnpm typecheck` | verification |

- [ARCHITECTURE.md](ARCHITECTURE.md): stack, scene pipeline, scroll model, gotchas
- [DESIGN.md](DESIGN.md): palette, type, layout, motion
- [PRODUCT.md](PRODUCT.md): audience, voice, the fiction and its limits

Type is [Grenze and Grenze Gotisch](https://github.com/Omnibus-Type/Grenze) by Omnibus-Type,
SIL OFL, loaded through `next/font`.

Some scene models are baked from CC0 packs by [Kay Lousberg](https://kaylousberg.com)
(KayKit Medieval Hexagon Pack, KayKit Halloween Bits) and [Kenney](https://kenney.nl)
(Graveyard Kit, Fantasy Town Kit). See ARCHITECTURE.md for the bake step.
