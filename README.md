# GPUIXUI

A production-quality, reusable **native UI component library powered by GPUix +
React**, with a Fumadocs documentation site and showcase.

`MISSION.md` is the requirement. `PLAN.md` is the architecture. `TODO.md` is the
source of truth for what is left to do. `COMPONENTS.md` is the inventory.

## Status

Phase C — Tier 1–2 components. **Tier 2 is complete in `packages/components`**:
38 components/areas, each with a native behaviour suite, at least one working
example, a docs page and an inventory record checked against `COMPONENTS.md`.
The last batch closed the twelve gap rows from plan 205 (Drawer, Navigation Menu,
Preview Card, Timeline, Countdown, Keyboard shortcuts, Carousel, Inline edit,
Tag input, Mention input, Hotkey recorder, Color picker) — `nub run --filter
@gpuixui/components test:behaviour` covers them in 451 tests.
The design tokens and theming layer (light, dark, high-contrast, density) is
landed. Tier 1, data presentation, workspace and specialised components are
tracked in `TODO.md`.

## Layout

```
apps/docs          Fumadocs documentation + showcase
apps/playground    Native GPUix playground and smoke tests
packages/config    Shared TypeScript and tooling configuration
packages/deploy    Alchemy stack: the docs site's Cloudflare resources
packages/tokens     Design tokens, themes and the React theme provider
packages/primitives Tier 1 render primitives
packages/icons      Icon set and sizing rules
packages/components Tier 2 composition and feedback components
packages/testing   Platform-free smoke suite: checks, runner, report, preflight
docs/              Design-system and architecture documents (source of truth)
examples/          Runnable example apps
references/        Read-only clones of the reference repos (gitignored)
scripts/           Repo tooling, including the swarm supervisor
.agents/           ADRs, plans, agent state
```

## References

Cloned read-only into `references/` (gitignored) and used as references, never
edited:

- GPUix — https://github.com/remorses/gpuix
- GPUI Kit — https://github.com/longbridge/gpui-kit
- shadcn/ui — https://github.com/shadcn-ui/ui
- Fumadocs — https://github.com/fuma-nama/fumadocs
- PanelUI — https://panelui.dev/docs/components (documentation only: no public
  source repository, so it is read as documentation and not cloned)

## Tooling ledger

| Tool | Purpose | Notes |
| ---- | ------- | ----- |
| **nub** | package manager and task runner | pinned in `devEngines.packageManager`; Node 24.18.0 via `.node-version` |
| **TypeScript** | language | strict; `packages/config/tsconfig.base.json` |
| **Effect** | effect system | required for domain logic; see `AGENTS.md` §5 |
| **oxlint** / **oxfmt** | lint and format | `nub run lint`, `nub run fmt` |
| **vitest** | tests | co-located `src/**/*.test.ts` |
| **GPUix** | native rendering target | the runtime the library is built on |
| **Fumadocs** | documentation platform | the docs site |
| **alchemy** | deploy | `packages/deploy/alchemy.run.docs.ts` |
| **git worktree** | agent isolation | one writer per tree, `workspaces/` |

## Development

```sh
nub install
nub run check        # tests-can-fail gate, lint, format, type-check
nub run test
nub run dev:docs
nub run dev:playground
nub run --filter playground smoke        # offscreen native suite (56 scenarios)
nub run --filter playground smoke:live   # the same core facts in a real window
```

## Working with agents

Each workstream runs in its own `git worktree` under `workspaces/` on branch
`agent/<workstream>`. A supervisor keeps at least five agents alive; see
`scripts/swarm-supervisor.sh` and `.agents/slop/swarm-status.log`.
