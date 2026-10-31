# `@gpuixui/fx`

Decorative motion for GPUIxUI — particles, fireworks, stars, gravity stars,
hexagons, bubbles, a motion grid; shine, ripple and liquid buttons; magnetic
pull; and kinetic text (typing, rolling, rotating, sliding, splitting). Each is
rendered by GPUix through React, like every other part of the library.

They live here, not in `@gpuixui/components`, so the core library carries no
confetti (plan 726). Each effect is built on
`@gpuixui/components/authoring` — the same theme seam, recipe cache, presence
contract, measure and local store the core components use — so it behaves and
is tested the same way.

```tsx
import { Fireworks } from "@gpuixui/fx/fireworks";
```

| Command | What it runs |
| --- | --- |
| `nub run --filter @gpuixui/fx test` | the effects' pure rules |
| `nub run --filter @gpuixui/fx test:behaviour` | the effects on the real renderer |

Pages: `/effects/<name>` on the docs site (the old `/components/<name>`
addresses redirect there).
