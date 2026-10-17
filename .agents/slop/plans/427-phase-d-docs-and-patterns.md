# 427 — Phase D docs: data-display and workspace pages, pattern pages, and the compound-component template

**Phase:** D (and the docs half of F) · **Owner:** docs-site · **Status:** planned
**Depends on:** data-grid and docking packages (phase D plans 204/205), 410, 411,
412, 414, 415, 426

## 1. Why this plan exists now

The component-page template (plan 411) documents **one component with one
source file**. The whole delivered inventory so far is built that way, and it
works. Tier 3–4 breaks both assumptions:

- a data grid is a composite — table, header, row, cell, selection model,
  column model — with no single public entry file;
- a workspace is a composition of panes, splits, panels and tabs whose public
  surface is several components plus a state/persistence contract;
- the interactions that matter (resize, drag a splitter, persist a layout) are
  **not provable by a still screenshot**, so the preview tier rules need a
  motion/labelled-run answer that plan 412 does not yet specify;
- `Patterns` is currently an empty promise page (`patterns/index.mdx`) even
  though `examples/basic-app` is a real composition that could be documented
  today.

This plan is written before those components land so the docs workstream does
not improvise a second page shape under deadline. **It does not authorise any
implementation in this plan's first pass** beyond the template and test changes
listed in §3; those may land when the packages exist.

## 2. Current state (measured 2026-10-17, `9fd3ad8`)

- `content/docs/components/*.mdx` — 42 pages; `component-meta/schema.ts` has one
  `sourcePath`, one `playgroundScreen`, a `screenshots` array and a
  `limitations` array.
- `src/component-pages.test.ts` enforces 11 sections, `<ComponentState>` and
  `<NativePreview>`; `content-references.test.ts` enforces one real source
  include per non-planned page.
- `content/docs/workspace.mdx` and `data-display.mdx` are honest landing pages
  that say the packages are not published.
- `packages/data-grid`, `packages/docking`, `packages/editor` do not exist.
- `examples/basic-app` exists and is type-checked; it has never run natively.
- `patterns/index.mdx` promises pattern pages; none exists.

## 3. Part A — extend the metadata contract (do this before the first grid page)

`apps/docs/src/component-meta/schema.ts`

Add, with defaults so existing records need no edits:

| Field | Type | Default | Meaning |
| ----- | ---- | ------- | ------- |
| `parts` | `ReadonlyArray<{ name: string; sourcePath: string }>` | `[]` | the compound sub-components a workspace/data-grid record exports (e.g. `Panel`, `Split`, `Pane`) |
| `pattern` | `"static" \| "stateful" \| "workspace"` | `"static"` | selects the interaction section and the preview rules |
| `persistence` | `string \| null` | `null` | the contract a consumer owns (layout JSON, `localStorage` key shape); prose, not a link |

Rules:

- `sourcePath` stays the **entry** file; `parts` must be real exported names
  from `packageName` (the existing `component-truth.test.ts` export check is
  the template — extend it to `parts[].name`).
- A `pattern: "workspace"` record must have a `playgroundScreen` and cannot
  claim `done` without a captured **interaction** artefact (§5).
- Keep the schema in Effect `Schema.Class` style; `registry.test.ts` is the
  contract test. Do not add a field without a test that fails when it is
  absent from a record whose source proves it exists.

## 4. Part B — the Tier 3–4 page template

The component template gains sections only for records that need them:

| Record | Sections |
| ------ | -------- |
| `pattern: "static"` (today's) | unchanged: Usage, Variants, Sizes, States, Composition, API reference, Keyboard and focus, Theming, Accessibility and limitations, Source, Related |
| `pattern: "stateful"` (tabs, grid, split) | the same **plus** `## State and ownership` after `## Composition` |
| `pattern: "workspace"` (panels, docking, workspace) | the same **plus** `## Anatomy` after `## Usage` and `## Persistence` after `## State and ownership` |

`## Anatomy` names the parts and the one-way relationship (`Workspace` owns
`PanelGroup`, which owns `Panel`; a `Panel` never reaches up for layout state).
`## Persistence` names the serialised shape and who writes it — the app, never
the renderer; the docs must not imply storage exists in GPUix.

New pages:

| File | Record |
| ---- | ------ |
| `content/docs/components/data-grid.mdx` | slug `data-grid`, tier `3`, pattern `stateful` |
| `content/docs/components/tree-view.mdx` | tier `3`, `stateful` |
| `content/docs/components/split-pane.mdx` | tier `4`, `stateful` |
| `content/docs/components/panel.mdx` | tier `4`, `workspace` |
| `content/docs/components/workspace.mdx` | slug `workspace`, tier `4`, `workspace` |

Sidebar: `content/docs/components/meta.json` stays tier order (Tier 1, 2, 3, 4)
and `registry.test.ts` proves it. `data-display.mdx` / `workspace.mdx` link to
the new records instead of describing the future.

## 5. Part C — previews for interactions

Plan 412's tiers N/S/A/X are still the law. Add one rule for stateful/workspace
records:

- a **still** capture can show the resting layout only; the caption must say
  `Captured from GPUix — <platform>, GPUix <version>, <commit>` and the page
  must name the interaction it does **not** prove;
- an **interaction capture** (a short recording or a capture script's
  before/after pair) is a new optional `Screenshot` field `kind:
  "interaction"`, rendered with the label `Recorded in GPUix — <platform>,
  GPUix <version>, <commit>`; it is still not a live surface;
- `<NativePreview>` never substitutes a browser approximation for either.

If the playground cannot record motion (B1-era limitation), the page says
"resize/drag is not shown here; run the playground screen" and shows the
resting capture. That is tier N, not tier X.

## 6. Part D — pattern pages

`content/docs/patterns/` gets one page per real composition, not per component:

| Page | Composition | Status |
| ---- | ----------- | ------ |
| `settings-form.mdx` | `examples/basic-app` — labelled fields, validation, select, checkbox/radio/switch, save progress, skeleton, theme switch | implementable **now** (the app is type-checked; never launched) |
| `confirmation-flow.mdx` | `ConfirmDialog` + a form + toast | after Tier 2 docs (already shipped) — write from the real component pages |
| `command-palette.mdx` | `CommandMenu` + `Dialog` | after Tier 2 |
| `inspector-workspace.mdx` | split pane + panel + inspector | after docking |

Each pattern page follows a smaller contract: `## The task`, `## Composition`,
`## State`, `## What is verified`, `## Source` (a real include, never a pasted
copy), `## Related`. A pattern with no runnable source does not get a page.

`patterns/index.mdx` lists only the pages that exist and drops the "patterns
appear once…" promise when the first one lands.

## 7. Tests

1. **Schema contract** (`registry.test.ts`): `parts[]` names are exported by the
   package; a `workspace` record without `playgroundScreen` fails; defaults keep
   every existing record valid.
2. **Template contract** (`component-pages.test.ts`): the section list is a
   function of `pattern`; a `stateful` page missing `## State and ownership`
   fails; a `workspace` page missing `## Anatomy` or `## Persistence` fails; the
   README template documents every section the test requires (both directions).
3. **Source contract** (`content-references.test.ts`): every `parts[].sourcePath`
   exists and the page includes it; a compound page with one include but three
   parts fails.
4. **Preview contract** (`preview.test.tsx`): `kind: "interaction"` renders the
   recorded label and its sidecar fields; a still capture never renders the
   interaction label.
5. **Pattern contract** (`pattern-pages.test.ts`, new): every page in
   `patterns/*.mdx` has the six sections, a real `## Source` include, and names
   at least one limitation or verified command.
6. **Truth guard** (`prose-truth.test.ts`): the new pages may not say a package
   is future work once it has a `package.json` (already true) and their includes
   resolve (already true).

Two-direction proof for each: write the failing assertion first against a
fixture record/page, then the real one.

## 8. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; new contracts included |
| `nub run --filter docs check-types` | 0 |
| `nub run --filter docs build` | 0; new routes in the output |
| `nub run check` / `nub run lint` / `nub run test` | the repository gate (§7 of `AGENTS.md`) |
| `nub run --filter docs dev` then `curl -s localhost:<port>/docs/components/data-grid` | 200; the page names the real package and its status |

## 9. STOP conditions

- `packages/data-grid` or `packages/docking` does not exist: stop Part A–C after
  the schema/template/test changes; do **not** create placeholder pages or
  registry records for components that are not implemented. Landing pages keep
  saying "not published yet".
- A grid/panel record cannot produce a `playgroundScreen` because the playground
  is not runnable: pages may ship at tier X with source + limitation, but their
  inventory status stays `wip`, never `done`.
- A capture lacks its `provenance.json`: do not render it (plan 412 §"Screenshot
  provenance").
- The component package exports no stable parts list: stop and record the missing
  public API as a cross-team `TODO.md` row rather than documenting internal
  files.

## 10. Acceptance

- The metadata schema and page template support compound and workspace
  components **before** the first such page is written.
- The four pattern pages exist only where a real composition exists; the first
  one (`settings-form`) documents `examples/basic-app` honestly, including that
  it never ran natively.
- A still capture is never labelled as proof of an interaction.
- All docs suites and the repository gate pass; `TODO.md`, the plan index and
  `apps/docs/README.md` are updated; the change is pushed on `agent/docs-site`.

## 11. Progress (2026-10-17)

- **Part D, first page: implemented.** `content/docs/patterns/settings-form.mdx`
  documents `examples/basic-app` with the six-section contract, the real
  `App.tsx` include and the verification table (type-check green, never
  launched). `src/pattern-pages.test.ts` guards the sections, the include, the
  sidebar/index listing and the verification command (it must be a script the
  example package defines). `content/docs/patterns/index.mdx` now lists it.
- `nub run --filter docs test`: 22 files, 118 tests pass. Build and the dev
  route (`/docs/patterns/settings-form`, 200) verified.
- **Two directions proven:** renaming `## State` to `## Ownership` made the
  contract fail with `settings-form: missing "## State"`; restoring it passed.
- **Parts A–C are not started**: `packages/data-grid` and `packages/docking`
  do not exist, so the compound template and Tier 3–4 pages wait (STOP
  condition §9).

