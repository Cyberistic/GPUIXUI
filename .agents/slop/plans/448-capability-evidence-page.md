# 448 — The GPUix capability page: measured support and its limits, generated from one source

**Phase:** E/F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 436, 440; playground 140/150–156; `COMPONENTS.md`

## 1. Why this plan exists

`MISSION.md` requires the docs to **"document every capability GPUix does not
provide, with evidence"** and to keep inventories structured so status is
generated consistently. The site has no such page. A reader meets the truth in
fragments: a per-page limitation bullet, one sentence on `Architecture`, and
`COMPONENTS.md`, which is a maintainer document in the repository.

Worse, the two pages that most need the evidence are the thinnest on the site:

- `content/docs/workspace.mdx` — one paragraph saying `@gpuixui/docking` is not
  published;
- `content/docs/data-display.mdx` — one paragraph saying `@gpuixui/data-grid` is
  not published.

Yet the playground already proves the primitives those packages will compose:
`panel-resize`, `workspace-tab-drag`, `table-select-sort`,
`table-column-resize`, `virtualized-table`, `tree-view` and `log-viewer` are
green on this host (plans 140, 150–156). The honest strongest statement today is
"the package is not published, and here is the measured native evidence for the
primitives it will use" — not an empty promise page.

This plan adds one generated page, `/docs/capabilities`, and puts its measured
subset on the two thin pages. It creates no component and no placeholder.

## 2. What is generated, and from where

One docs-owned data module is the page's source. Two guards keep it honest:

| Source of truth | What the docs module mirrors | Guard |
| --------------- | ---------------------------- | ----- |
| `COMPONENTS.md` → "Measured native evidence" table | capability, scenarios, verdict | exact row comparison (`capabilities.test.ts`) |
| `apps/playground/src/scenarios/*.tsx` | every scenario id the page names | every id must exist in the registry |
| `.agents/slop/plans/` | every `plan NNN` citation on the page | each cited plan file must exist |

The direction is deliberate: `COMPONENTS.md` owns the verdict; the docs render
it. The docs never re-measure, never upgrade a verdict, and never name a scenario
the playground does not run. If the inventory gains a capability, the docs test
fails until the page renders it.

## 3. Files

### 3.1 `apps/docs/src/lib/capabilities.ts` (new)

Plain data, **no `effect` import** — the browser bundle reads it, following
`src/component-meta/registry.ts`'s boundary rule. Shape:

```ts
export type CapabilityVerdict = "verified" | "partial" | "unsupported";

export interface CapabilityEvidence {
  /** The capability name `COMPONENTS.md` uses. */
  readonly capability: string;
  /** The heading the reader sees. */
  readonly label: string;
  /** The playground scenario ids that prove it. */
  readonly scenarios: ReadonlyArray<string>;
  /** Mirrors the inventory verdict; never stronger. */
  readonly verdict: CapabilityVerdict;
  /** One sentence: what the native run establishes. */
  readonly proves: string;
  /** The plans that recorded the measurement. */
  readonly plans: ReadonlyArray<number>;
}

export const capabilities: ReadonlyArray<CapabilityEvidence> = [ /* 15 rows */ ];

export const selectCapabilities = (
  names: ReadonlyArray<string>,
): ReadonlyArray<CapabilityEvidence>;
```

The 15 rows, in the inventory's order:

| capability | label | scenarios | verdict | plans |
| ---------- | ----- | --------- | ------- | ----- |
| `layout` | Layout | `layout-flex`, `shell-navigation` | verified | 120, 140, 151 |
| `text` | Text | `text-native` | verified | 140 |
| `input` | Input | `input-edit` | verified | 140 |
| `focus` | Focus | `focus-traversal` | verified | 140 |
| `overlay` | Overlay | `overlay-dialog` | verified | 120, 140 |
| `modal` | Modal | `modal-focus-trap` | verified | 155 |
| `floating` | Floating layer | `floating-placement` | verified | 156 |
| `scroll` | Scroll | `scroll-container` | verified | 120, 140 |
| `panel` | Panel | `panel-resize` | verified | 120, 140 |
| `virtual-list` | Virtual list | `virtual-list-window` | verified | 120, 140 |
| `table` | Table | `table-select-sort`, `table-column-resize`, `virtualized-table` | verified | 130, 152 |
| `tree` | Tree | `tree-view` | verified | 153 |
| `log` | Log | `log-viewer` | verified | 154 |
| `workspace` | Workspace | `workspace-tab-drag` | verified | 130, 140 |
| `theme` | Theme | `theme-color-roles`, `theme-type-and-shadow` | verified | 150 |

`proves` is one sentence per row, copied in meaning from the inventory notes
(e.g. modal: "Focus enters the surface, Tab wraps inside it, focus returns to
the trigger, and a nested popover's Escape closes only the popover.").

### 3.2 `apps/docs/src/components/capability-matrix.tsx` (new)

```tsx
export function CapabilityMatrix(props: {
  readonly only?: ReadonlyArray<string>;
}): ReactElement;
```

- Renders a real `<table>`: **Capability**, **Verdict**, **Proves**, **Native
  scenario**. Scenario ids are `<code>` elements carrying
  `data-scenario="<id>"`; each row carries `data-capability="<name>"` and
  `data-verdict="<word>"` so a test asserts the rendered rows, not prose.
- `only` selects a subset through `selectCapabilities`; an empty selection
  renders an explicit "none" row rather than a bare table.
- A verdict label map (`verified` → "Verified", `partial` → "Partial",
  `unsupported` → "Unsupported"), so the page never prints the raw enum by
  accident.
- No colour literal: it uses the site's existing prose/table classes, exactly
  like `api-index.tsx`.

### 3.3 `apps/docs/content/docs/capabilities.mdx` (new page)

Frontmatter: `title: GPUix capabilities`,
`description: What the pinned GPUix 0.10.0 runtime can do — measured, with the
scenario that proves it.`

Sections:

1. **Intro** — targets `@gpuix/react` / `@gpuix/native` 0.10.0; a row is a
   native run on this host, not an API listing; the published-binary CI run is
   still pending (ADR 0003, plan 140).
2. **The matrix** — `<CapabilityMatrix />`.
3. **Reproduce it** — the exact commands:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js
   # one scenario:
   nub apps/playground/dist/smoke/run.js --only floating-placement
   ```

4. **What the measurements changed** — the surprises that change how a consumer
   writes code, each with a plan citation: focus/blur work on 0.10.0 (140);
   `autoFocus` takes focus without `onFocus` (140); wheel `deltaY` is negative
   to scroll down (140); `<virtual-list>` retains every row but paints a window
   (140, 152); `<anchored>` paints no surface, so handlers go on the content div
   (112); `align="center"` is off by half the panel and `fit="snap"` clamps
   without flipping (156); the Tab trap wraps inside a modal (155); there is no
   `focusVisible`/`outline*` (017); virtualised tables lag `onVisibleRange` by
   one gesture (152); a tree cannot be focus-programmed from component code
   (153); a log list does not snap back after scrolling (154).
5. **What is not verified yet** — per-component playground screens (tier S
   requires them, plan 432); the published `darwin-arm64`/CI confirmation of the
   suite.
6. **The inventory** — point at `COMPONENTS.md` for every component row and at
   `/docs/components` for statuses.

### 3.4 `apps/docs/content/docs/meta.json`

Add `"capabilities"` after `"architecture"`. `content.test.ts` already fails a
page on disk that is missing from the sidebar.

### 3.5 `apps/docs/content/docs/workspace.mdx`, `data-display.mdx`

Keep the honest "not published yet" paragraph, then add:

```mdx
## Proven today

The package is not published, but the runtime primitives it will compose are
measured. Run the scenario the docs cite:

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only panel-resize
```

<CapabilityMatrix only={["panel", "workspace"]} />

The [GPUix capabilities](/docs/capabilities) page carries the full matrix, the
measured limits and the provenance of the run.
```

`data-display.mdx` uses `only={["table", "virtual-list", "tree", "log"]}` and
`--only virtualized-table`.

### 3.6 `.agents/slop/plans/README.md`, `TODO.md`, `apps/docs/README.md`

- Index row for this plan.
- A done task under "Docs site workstream (plans 410–447)" (the heading gains
  448) and a cross-team note is **not** needed: this work is entirely docs-owned.
- One sentence in `apps/docs/README.md` under Layout/Search naming the page and
  its guard.

## 4. Tests (all new, all able to fail)

### 4.1 `apps/docs/src/lib/capabilities.test.ts`

1. **Schema** — decode every entry with an Effect `Schema` defined in the test
   (unique capability names, non-empty scenarios, verdict in the union, at least
   one plan). An unknown verdict or a missing scenario fails.
2. **Inventory agreement** — parse the "Measured native evidence" table out of
   `COMPONENTS.md`, compare capability → scenarios and verdict with the module.
   A row added to the inventory but not the page fails; a page row the inventory
   does not carry fails.
3. **Scenario agreement** — read every `apps/playground/src/scenarios/*.tsx`,
   extract `id: "<id>"`, and assert every scenario the module names exists.
4. **Citation agreement** — every plan number in `capabilities` (and every
   `plan NNN` on `capabilities.mdx`) resolves to a file under
   `.agents/slop/plans/`.
5. **Page contract** — `content/docs/capabilities.mdx` exists, contains
   `<CapabilityMatrix`, is listed in `content/docs/meta.json`, and the two
   embedded pages' `only={[...]}` lists name real capabilities.

### 4.2 `apps/docs/src/components/capability-matrix.test.tsx`

- `renderToStaticMarkup(<CapabilityMatrix />)` renders one
  `data-capability` row per module entry (15), and every entry's scenarios appear
  as `data-scenario` values.
- `only={["panel", "workspace"]}` renders exactly those two rows.
- `only={[]}` renders the explicit none row.
- A verdict word always renders its label, never the raw enum.

### 4.3 Two-direction proofs (recorded in this plan's §6)

- Delete the `floating` row from `capabilities.ts` → inventory-agreement test
  fails with `floating`.
- Rename `panel-resize` to `panel-resize-typo` in the module → scenario test
  fails.
- Remove `<CapabilityMatrix />` from the page → page contract fails.
- Restore each; the suite passes.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 39 files, ≥ 225 tests pass |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0; `/docs/capabilities` in the output |
| `nub run --filter docs smoke:build` | 68 pages, exit 0; the new route and its internal links resolve |
| `nub run check` / `nub run lint` | exit 0 |
| `nub run --filter docs smoke:browser` | exit 0 (unchanged previews) |

## 6. Results (2026-10-17)

- `/docs/capabilities` ships with the 15-row matrix, the reproduce commands, the
  measured surprises and the unverified list. `workspace.mdx` and
  `data-display.mdx` now render their measured subset (`panel`/`workspace`;
  `table`, `virtual-list`, `tree`, `log`) instead of a promise paragraph.
- `capabilities.test.ts` and `capability-matrix.test.tsx` added. The docs suite
  is **39 files / 228 tests** green; `check-types`, `build` and `lint` are green,
  and `smoke:build` crawls **68 pages / 87 links** with the new route.
- **Two directions proven** (each revert restored green):
  - renaming the `floating` row to `floating-layer` failed the inventory guard
    with `[ "floating" ]` missing from the docs;
  - renaming `panel-resize` to `panel-resize-typo` failed both the inventory
    guard (`panel: scenarios panel-resize-typo != panel-resize`) and the
    playground-registry guard (`panel: panel-resize-typo`);
  - removing `<CapabilityMatrix />` from the page failed the page contract.
- The capability matrix intentionally does not use `Option`: it is a plain
  browser-bundle data module, following `component-meta/registry.ts`; the Effect
  schema lives in the test so the client never imports the runtime.

## 7. STOP conditions

- `COMPONENTS.md` has no "Measured native evidence" table: stop and record the
  missing inventory structure instead of hard-coding verdicts.
- The capability a page needs has no scenario in `apps/playground`: do not write
  the row; record the missing probe in `TODO.md`.
- A claimed verdict is anything other than `verified` without a matching
  inventory cell: stop and fix the inventory first.
- A scenario exists only on another branch: omit the row; do not name a scenario
  a clean checkout cannot run.
