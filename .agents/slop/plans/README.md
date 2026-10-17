# Implementation Plans

**This directory is the swarm's first deliverable.** No implementation work
starts until the plan set below exists and is indexed here.

Each plan is **self-contained for a weaker executor**. That means, at minimum:

- the exact files to create or change, and their exact paths;
- the exact commands to run, and the expected result of each;
- **STOP conditions** — the point at which the executor must stop and report
  rather than improvise;
- a **test plan** — which tests to write, what they must be able to catch, and
  how to prove the test fails without the fix;
- the acceptance criteria that let the executor say "done".

Naming: `NNN-kebab-title.md`, numbered in dependency order. One plan per phase,
one per package, plus a plan for each cross-cutting concern (native smoke test,
licensing, docs site).

**Number blocks.** Plans are counted across every worktree (see `PLAN.md` D7).
Blocks are reserved so concurrent workstreams do not collide:

| Block | Reserved for |
| ----- | ------------ |
| `010–019` | tokens and theming |
| `020–049` | primitives, icons, Phase C |
| `050–099` | free |
| `100–199` | packages, apps, smoke test |
| `200–299` | reference adoption and gap sequencing |
| `300–399` | free |
| `400–499` | docs site |

## The plan set

Numbering is per workstream. The `200` block is the reference-adoption and gap
sequencing set; the docs-site workstream owns the `4xx` range.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `200` | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | `020`, `030`, `110–117` | planned |
| `201` | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | planned |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | planned |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `410-docs-site.md` | `apps/docs`: the Fumadocs site (IA, themes, search, build, deploy) | B–F | 001; `0xx` tokens docs | Phase B implemented — build, dev, search and IA verified; token values provisional |
| `411-component-page-template.md` | Component metadata contract, page template, API tables | B–F | 410; `1xx` components | Phase B implemented — schema, registry, index and tests pass; prop tables wait on `1xx` |
| `412-preview-strategy.md` | Honest native-preview mechanism (`docs/preview-strategy.md`) | A–F | 001; playground | Phase B implemented — tiers N/S/A/X and label tests pass; screenshots wait on the playground |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–014`, `020–040`, `100–130`, `410–412`) live on their own branches and are
> merged into `main` as each workstream completes; this index is the union.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
