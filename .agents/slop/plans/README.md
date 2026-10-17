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

## The plan set

Numbering is per workstream so two agents never collide on a filename. The
docs-site workstream owns the `4xx` range.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `410-docs-site.md` | `apps/docs`: the Fumadocs site (IA, themes, search, build, deploy) | B–F | 001; `0xx` tokens docs | Phase B implemented — build, dev, search and IA verified; token values provisional |
| `411-component-page-template.md` | Component metadata contract, page template, API tables | B–F | 410; `1xx` components | Phase B implemented — schema, registry, index and tests pass; prop tables wait on `1xx` |
| `412-preview-strategy.md` | Honest native-preview mechanism (`docs/preview-strategy.md`) | A–F | 001; playground | Phase B implemented — tiers N/S/A/X and label tests pass; screenshots wait on the playground |

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
