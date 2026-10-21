# packages/

Library packages. **Only introduce a package with a real responsibility and an
implementation** — no empty scaffolding. A package exists when a second consumer
needs the code, or when the boundary it draws is load-bearing.

## Boundaries

Dependencies point down this list and never up:

```
tokens      → (nothing)
motion      → (nothing; pure math, `react` peer for the hooks)
runtime     → (nothing; `@gpuix/react` + `effect` — the runtime surface it describes)
keyboard    → (nothing; `@gpuix/react` + `effect` — the accelerator/keymap grammar and command registry)
primitives  → tokens
components  → tokens, primitives, keyboard
icons       → tokens
data-grid   → tokens, primitives, components
docking     → tokens, primitives, components
editor      → tokens, primitives, components
testing     → (dev-only; may depend on anything, depended on by nothing)
config      → (nothing; tooling configuration)
deploy      → (nothing; Cloudflare resource declarations)
```

The **native runtime must never depend on the docs site**. `apps/docs` may
consume API metadata and examples; nothing in `packages/` may import from it.

## Present

| Package | Purpose |
| ------- | ------- |
| `config` | Shared TypeScript configuration (`tsconfig.base.json`) |
| `deploy` | Alchemy stack declaring the docs site's Cloudflare resources |
| `keyboard` | The keyboard/command layer: accelerator grammar, keymaps with scopes, exact event matching and a command registry |
| `motion` | Renderer-neutral motion physics (springs, easing, timelines, inertia) plus React hooks that drive GPUix motion targets |
| `testing` | Platform-free half of the native smoke suite: check/scenario model, report, runtime preflight (consumed from `dist`, no `@gpuix/*` import) |

The rest are Phase B/C deliverables, created by their plans in dependency order.
