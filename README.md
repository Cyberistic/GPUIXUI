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

The docs site follows shadcn/ui's anatomy: a sectioned sidebar (Getting Started,
Components, Contributing), a reusable component page with Preview/Code tabs, a
`nub` install block, Usage, Composition and API reference, plus the "On this
page" table of contents and the previous/next pager. Button, Dialog, Popover and
Tabs are the pattern pages; their previews are labelled browser renderings of
the native components, and the Code tab plus **Component source** show the real
implementation. The remaining shadcn surfaces — **Blocks** (`/docs/blocks`) and
the **Theme Editor** (`/docs/themes`) — landed too: recipe pages composed from
the library and a live token editor backed by `@gpuixui/tokens`.

## Layout

```
apps/docs          Fumadocs docs: landing at `/`, documentation under `/docs`
apps/playground    Native GPUix playground and smoke tests
packages/config    Shared TypeScript and tooling configuration
packages/deploy    Alchemy stack: the docs site's Cloudflare resources
packages/tokens     Design tokens, themes and the React theme provider
packages/primitives Tier 1 render primitives
packages/icons      Icon set and sizing rules
packages/components Tier 2 composition and feedback components
packages/tw         shadcn class recipes → GPUix StyleDesc (with `cn`)
packages/testing   Platform-free smoke suite: checks, runner, report, preflight
docs/              Design-system and architecture documents (source of truth)
examples/          Runnable example apps
references/        Read-only clones of the reference repos (gitignored)
scripts/           Repo tooling, including the swarm supervisor
.agents/           ADRs, plans, agent state
```

## Built on

What the library stands on, and what we take from each. Where we adapt code,
the licence is noted and attributed in `LICENSES/`.

| Source | What we take | Licence |
| ------ | ------------ | ------- |
| [shadcn/ui](https://ui.shadcn.com) | component API and composition, plus the docs experience (Preview/Code, install, theming) | — |
| [Base UI](https://base-ui.com) | behaviour and parts model — compound parts, controlled state, focus | — |
| [Tailwind](https://tailwindcss.com) | utility syntax and recipe model, mapped to `StyleDesc` (not the CSS engine) | — |
| [React](https://react.dev) | the runtime surface (JSX, hooks) on GPUix | — |
| [GPUix](https://gpuix.dev) | the native renderer — GPU, no DOM | — |
| [open-gpui](https://github.com/Latias94/open-gpui) (`crates/motion`) | spring/sequence physics, ported to TS | Apache-2.0 |
| [gpui-motion](https://github.com/1bye/gpui-motion) | broader motion API surface — easing variants and inertia — borrowed as spec | MIT |

## References

Cloned read-only into `references/` (gitignored) and used as references, never
edited:

- GPUix — https://github.com/remorses/gpuix
- GPUI transform branch — https://github.com/0xErwin1/zed, `feature/53306-07-text-raster-subpixel-regressions` (audited in plan 525; treeless clone at `references/transform-zed`)
- GPUI Community Edition — https://github.com/gpui-ce/gpui-ce, `main` @ `a8d3969` (audited in plan 537; Apache-2.0; full clone at `references/gpui-ce`)
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
```

## Working with agents

Each workstream runs in its own `git worktree` under `workspaces/` on branch
`agent/<workstream>`. A supervisor keeps at least five agents alive; see
`scripts/swarm-supervisor.sh` and `.agents/slop/swarm-status.log`.
