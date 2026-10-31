# 728 — The pipeline block, rebuilt (and the block contract every block follows)

| Field | Value |
| ----- | ----- |
| Owner | `docs-site` + new private workspace `examples/blocks` |
| Depends on | `722` (`Window`, `SourceList`), `725` (`SegmentedControl`, `PopUpButton`, `Disclosure`) |
| Replaces | the Hunter pipeline block (`hunter-pipeline-01`) |
| Status | landed 2026-10-31 |

## Why

`apps/docs/src/components/docs/hunter-pipeline.tsx` is 985 LOC plus ~680 lines
of `blocks.css` (7706–8385): an in-joke (guild, renown, dossiers, ranks) over a
painted notes window, with a chart and window chrome drawn by hand. Worse, its
"recipe" (`hunterPipelineSource`, line 856) is a **template string** — the code
a reader copies is never compiled, so it can drift from the library silently.
The owner dropped the Hunter identity (2026-10-31).

## Part A — the block contract (applies to 728 and every 729 block)

A block is **one compiled TS module** that is the recipe, the native window
and the source the docs print. Nothing is a string.

Plan `060` already started this: `apps/playground/src/blocks/{settings,kanban,inbox}.tsx`
are compiled blocks with `blocks.test.tsx`, imported by the film
(`film/takes.tsx`, `film/terminal-app.tsx`, `film/omarchy.tsx`). The docs are
their **second consumer**, so they are hoisted (AGENTS.md §1), not duplicated:

- `git mv apps/playground/src/blocks examples/blocks/src` and split each file
  into the layout below; update the film's three imports to
  `@gpuixui/blocks/<slug>`. Coordinate through `TODO.md` → Launch film (the
  open "Docs blocks read their source from the compiled blocks" task is this
  step): **STOP** if the launch-film worktree has uncommitted changes under
  `apps/playground/src/blocks` (`git -C workspaces/launch-film status --short`).
- `examples/blocks/` (new private workspace, `@gpuixui/blocks`, copy
  `examples/basic-app/package.json` + `tsconfig.json`). Layout:
  ```
  examples/blocks/src/<slug>/<slug>.tsx   the recipe: export function <Name>Block()
  examples/blocks/src/<slug>/data.ts      the block's sample data (typed, Schema-free plain data)
  examples/blocks/src/<slug>/logic.ts     pure rules the block's state uses (+ logic.test.ts)
  examples/blocks/src/main.tsx            nub src/main.tsx <slug> → opens the block in Window
  ```
- `main.tsx` opens `render(<ThemeProvider><Block/></ThemeProvider>, {
  width: 1100, height: 700, ...nativeWindowOptions(theme) })`. One block per
  process (the runtime's one-window rule, `docs/gpuix-capabilities.md:82`).
- `check-types` covers every block, so a recipe that uses a wrong prop fails CI.
- Docs: `apps/docs/src/components/docs/blocks.tsx`'s `source` becomes
  `import source from "@gpuixui/blocks/src/<slug>/<slug>.tsx?raw"`. The `render`
  (HTML reproduction) stays for the browser preview and uses `window-frame.tsx`
  (`722`) plus `data.ts` from the same block — so the HTML and the native window
  show the **same** data.
- Native evidence: a live probe `block-<slug>` in
  `apps/playground/src/live/registry.ts` mounts the block and asserts its
  primary interaction (each block's table below names it).
- Captures: add a take per block to `apps/playground/src/film/takes.tsx` and
  capture it with the existing runner (`nub apps/playground/dist/film/takes.js
  <take> <outDir>`, `film/take.ts`), framed by `film/frame.tsx`. The docs index
  thumbnail and the landing (`727`) use these PNGs, not browser screenshots.
  Do not write a second capture loop.

## Part B — the pipeline block

A **release pipeline** for a small product team (neutral, legible, no in-joke):
work moves Idea → Spec → Build → Review → Shipped.

```
┌ sidebar (material) ─┬ toolbar: ‹ › Releases  [List|Board]  [Sort ⌃⌄]  [search]  [+] ┐
│ ●●●                 ├─────────────────────────────────────────────┬──────────────┤
│ Views               │ stage strip: Idea 4 · Spec 7 · Build 12 ·   │ Inspector    │
│  ▸ All work    41   │ Review 5 · Shipped 13  (the selected stage) │ ▾ Details    │
│  ▸ Mine         6   │─────────────────────────────────────────────│  Owner, Due, │
│ Projects            │ table / board of items in the stage         │  Estimate    │
│  ● Mobile 2.0  12   │  title · owner avatar · due · status badge  │ ▾ Activity   │
│  ● Billing      9   │                                             │  timeline    │
│ Labels …            │                                             │              │
└─────────────────────┴─────────────────────────────────────────────┴──────────────┘
```

| Part | Library piece |
| ---- | ------------- |
| window, sidebar, toolbar, inspector | `Window`, `Window.Sidebar`, `Window.Toolbar`, `Window.Inspector` (`722`) |
| views/projects/labels | `SourceList` (`722`) |
| List/Board switch | `SegmentedControl` (`725`) |
| Sort | `PopUpButton` (`725`) |
| search | `SearchInput` (`@gpuixui/components/search-input`) |
| stage strip | `ToggleGroup` with counts, or `SegmentedControl` if it reads well — pick one, say which |
| list view | `Table` (`@gpuixui/data`) with sort + selection |
| board view | the existing kanban block's columns — **import its parts**, do not copy |
| inspector sections | `Disclosure` + `InsetGroup` (`725`), `Timeline`, `Avatar`, `Badge` |
| new item | `Dialog` `presentation="sheet"` (`724`) |

No hand-drawn chart. No painted chrome.

Interactions (each a pure rule in `logic.ts`):

- `itemsIn(stage, filter, sort)` — the visible rows.
- selecting a row fills the inspector; ↑/↓ move selection; ⌫ asks to archive
  through `ConfirmDialog`.
- ⌘1/⌘2 switch List/Board through `@gpuixui/keyboard`; ⌘N opens the sheet.

Data: 41 items across 5 stages, 6 owners, 3 projects — in `data.ts`, realistic
titles ("Offline sync for drafts", "Retry failed card payments"…), no lorem.

Probe `block-pipeline`: mount, press "Review" in the stage strip, assert the
table shows 5 rows; press ↓, assert the inspector title changes; press ⌘2,
assert the board's 5 columns exist.

## Steps

1. Part A scaffold with the pipeline as its first block.
2. Delete `apps/docs/src/components/docs/hunter-pipeline.tsx`,
   `hunter-pipeline.test.ts`, the hunter CSS (`blocks.css` 7706–8385; re-check
   the line range with `rg -n "hunter" apps/docs/src/styles/blocks.css`),
   `content/docs/blocks/hunter-pipeline.mdx`; the `hunter-pipeline-01` registry
   row becomes `pipeline-01`, slug `pipeline`; `meta.json` renamed entry;
   a redirect `/blocks/hunter-pipeline` → `/blocks/pipeline`.
3. `content/docs/blocks/pipeline.mdx` — preview, composition list (as above),
   "Run it natively: `nub run --filter @gpuixui/blocks dev -- pipeline`".
4. Regenerate thumbnails: `nub run --filter @gpuixui/docs blocks:thumbnails`
   (it reads the index, so the new slug is picked up).
5. `rg -i "hunter|renown|dossier|guild" apps packages examples docs -g '!node_modules'`
   must return only `deck.test.tsx`'s negative guard.

## Test plan

| Test | Case | Inversion |
| ---- | ---- | --------- |
| `examples/blocks/src/pipeline/logic.test.ts` | Review holds 5 items; sort by due is ascending; filter "Mine" keeps only the viewer's | swap the sort comparator; drop the owner filter |
| `apps/docs/src/components/docs/blocks.test.ts` (extend) | every block's `source` is the compiled module's text | replace one with a string literal |
| docs | `/blocks/hunter-pipeline` redirects | drop the redirect |
| live | `block-pipeline` (above) | break `itemsIn`'s stage match |

```sh
nub run --filter @gpuixui/blocks test
nub run --filter @gpuixui/blocks check-types
nub run --filter playground build && nub apps/playground/dist/live/run.js --only block-pipeline
nub run --filter @gpuixui/blocks dev -- pipeline     # by eye, darwin: vibrant sidebar, lights over it
```

## Acceptance

- The pipeline runs as a native window and as the docs preview from one module.
- The Hunter block and its CSS are gone; net LOC of the change is negative.
- `nub run check`, `lint`, `test` green.

## STOP

- Stop if `?raw` imports of a workspace file do not work in the docs build
  (Vite): report; do not fall back to template strings.
- Stop if the board view would need a copy of the kanban block's code.
