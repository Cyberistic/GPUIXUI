# GPUIXUI

A production-quality, reusable **native UI component library powered by GPUix +
React**, with a Fumadocs documentation site and showcase.

`MISSION.md` is the requirement. `PLAN.md` is the architecture. `TODO.md` is the
source of truth for what is left to do. `COMPONENTS.md` is the inventory.

## Status

Phase A (audit and feasibility). **The first deliverable is the plan set** in
`.agents/slop/plans/` — indexed in `.agents/slop/plans/README.md`. No
implementation work starts before those plans exist.

## Layout

```
apps/docs          Fumadocs documentation + showcase
apps/playground    Native GPUix playground and smoke tests
packages/config    Shared TypeScript and tooling configuration
packages/deploy    Alchemy stack: the docs site's Cloudflare resources
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
- PanelUI — https://panelui.dev/docs/components

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
