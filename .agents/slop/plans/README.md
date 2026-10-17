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

Numbering is reserved per workstream so concurrent agents never collide:
`100–199` components, `200–299` tokens/theme, `300–399` primitives,
`400–499` playground, `500–599` docs site.

### Components workstream (Tier 2 composition and feedback)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [110](./110-package-components.md) | `packages/components`: package, boundaries, token/primitives contract, test harness | C | tokens, primitives | written |
| [111](./111-tier2-foundation-parts.md) | Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List | C-1 | 110 | written |
| [112](./112-tier2-overlays.md) | Overlays: Dialog, Confirmation dialog, Popover | C-2 | 110, 111 | written |
| [113](./113-tier2-disclosure-navigation.md) | Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination | C-3 | 110, 111 | written |
| [114](./114-tier2-menus.md) | Menus: Dropdown, Context, Command | C-4 | 110, 111, 112 | written |
| [115](./115-tier2-feedback.md) | Feedback: Toast system (Effect) and inline validation | C-5 | 110, 111, 112 | written |
| [116](./116-tier2-choice-inputs.md) | Choice inputs: Search input, Combobox (+ deferred date picker design) | C-6 | 110, 111, 114 | written |
| [117](./117-tier2-verification.md) | Tier 2 verification, inventory sync check and completion gate | C/F | 110–116 | written |

Interlocks this workstream depends on and does not own:

- `@gpuixui/tokens` roles listed in plan 110 §6, or a documented mapping;
- `@gpuixui/primitives` exports listed in plan 110 §7;
- `apps/playground` mounting the Tier 2 examples (recorded as a TODO task).

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
