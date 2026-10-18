# 348 — Tier 4 feasibility: an inspector panel with editable rows in a virtual list

**Status:** landed 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `158`, `166`, `188`, `198`,
`343`.

## 1. Why this plan exists

`COMPONENTS.md` still marks four Tier 3/4 rows `GPUix support: ?` with no
runtime evidence at all:

| Row | Current note |
| --- | ------------ |
| Key-value displays | `div` + `<text>`. |
| Property panels | Fieldset + Inline validation + Key-value displays. |
| Inspector panels | Property panels + panels. |
| Property editors | Fieldset + inputs. |

Those notes are guesses. Every ingredient has been measured in isolation — the
native editor (`text-entry` `188`, `pointer-text-entry` `343`), virtual rows
(`variable-rows` `198`, `virtualized-tree` `165`), roving focus inside a window
(`roving-focus` `158`), key delivery through ancestors (`layers` `187`,
`live-key-routing` `345`) — but **no probe has composed them into the shape a
data grid or an inspector actually needs**: a list of labelled rows where one
row owns a native editor, the list windows its rows, the value commits into an
app-owned model, and the model drives a rendered surface outside the list.

That composition has one genuinely open runtime question, and it is the reason
this plan is a probe rather than a styling exercise:

> When a row holding a focused native editor is scrolled out of a
> `<virtual-list>`'s painted window and back, do the editor's value, the row's
> paint and native focus come back, or does the runtime rebuild the host node
> from the authored props?

The answer decides whether an editable data grid may keep a cell's editor
mounted while the row leaves the window (the `grid-wide-table`/`variable-rows`
model) or must scroll the edited row into view and remount. Both are implementable,
but only one can be documented honestly.

This plan changes **no package code**. It adds one consumer-path view, one pure
state module with unit tests, one headless scenario and one live twin.

## 2. What will be proven

Capability: `inspector` (new). Scenario: `property-panel`; live twin:
`live-inspector`. The view is an 860 × 440 frame: a rendered preview on the
left and a 300 px inspector on the right.

| Area | Check |
| ---- | ----- |
| composition | the inspector pane's right edge is within 1 px of the frame's; its width is exactly 300; the list's painted rows are 36 px tall |
| key/value alignment | the label column is 96 px and the editor starts exactly one 8 px gap after it (within 1 px) |
| paint | the first property's label and its committed value paint; the preview paints the model's `Name` |
| draft | clicking the editor and typing changes the **draft** only: the readout reports the draft count, the committed `Name` and the preview stay unchanged |
| commit | Enter on the focused editor commits the draft into the model: the readout's commits count is 1, the draft count is 0, and the preview's painted `Name` changes |
| model → render | editing `Opacity` to `40` resizes the preview bar to `48` px within 1 px (the value is a percentage of a 120 px bar) |
| revert | a second draft plus Escape restores the committed value (readout and editor value), with no new commit |
| windowing | `scrollToItem(list, 40)` unpaints row 0's editor; scrolling back to 0 repaints it with the **committed** value — the model, not the native editor, is the source of truth |
| draft survives windowing | a draft typed into row 0, then a scroll to row 40 and back, is still the editor's value and still counts as one draft (the parent owns it, so a windowed rebuild cannot lose it) |
| filter | typing `role` into the inspector's filter paints only the matching row (the `Name` row is absent), preserves order for a multi-match query, and the filter input keeps focus while typing |
| filter clear | Escape in the filter restores every row |
| reset | the reset control restores every baseline value, clears the draft and the filter, and the preview repaints |
| a11y | the property editor is exposed as a named `TextInput` with its authored `aria-id`; the reset control is a `Button` |
| live | the same path in a real 1100 × 720 window: click, type, Enter, committed readout, a real scroll away and back, the draft/committed values, reset |

The probe deliberately does **not** re-measure the editor's caret/selection
(`188`, `343`), floating placement, or the virtual list's anchor arithmetic
(`166`, `198`).

## 3. Files

Create:

- `apps/playground/src/scenarios/property-model.ts` — pure state: baseline
  rows, drafts, commit/revert/reset, filtering, the preview bar width.
- `apps/playground/src/scenarios/property-model.test.ts` — the unit tests in §6.
- `apps/playground/src/scenarios/property-panel.tsx` — the view and the
  `property-panel` scenario.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and add
  `"inspector"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"inspector"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add the
  `live-inspector` twin and register it **after** `live-flow`.
- `apps/playground/README.md` — a `## Inspector panels (plan 348)` section with
  the measured facts, the new capability, the new suite counts, and the file
  listed under `Structure`.
- `COMPONENTS.md` — add the `inspector` capability row and put the measured
  evidence on the four Tier 3/4 rows (§2). Status stays `todo`: the probe is the
  runtime contract, not a shipped package.
- `TODO.md` — tick this task with the measured counts; record any measured
  editor-in-a-virtual-row limitation as a `data-grid`/`docking` task.
- `.agents/slop/plans/README.md` — add the `348` row; move the next free number
  to `349`.

Do **not** change `packages/*` beyond the one capability literal in
`packages/testing/src/smoke.ts`, and do not touch `apps/docs`.

## 4. The model (`property-model.ts`)

All state is app-owned and immutable; the view only renders it. This is the
shape a real inspector package would expose.

```ts
export interface Property {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface InspectorState {
  readonly baseline: ReadonlyArray<Property>;
  readonly properties: ReadonlyArray<Property>;
  readonly drafts: Readonly<Record<string, string>>;
}

/** 96 rows: the first eight are editable, the rest are read-only values. */
export const initial = (count: number): InspectorState;

/** The editor's value: the draft when one exists, else the committed value. */
export const draftValue = (state: InspectorState, id: string): string;

export const setDraft = (
  state: InspectorState,
  id: string,
  value: string,
): InspectorState;

/**
 * The row's draft into the committed value. `committed` is false — and the
 * state is unchanged — when the row is unknown or has no draft.
 */
export const commit = (
  state: InspectorState,
  id: string,
): { readonly state: InspectorState; readonly committed: boolean };

/** Drops a row's draft, leaving the committed value. */
export const revert = (state: InspectorState, id: string): InspectorState;

/** Every value back to the baseline and every draft dropped. */
export const reset = (state: InspectorState): InspectorState;

/** Case-insensitive substring match on the label; whitespace-only means all. */
export const filterProperties = (
  properties: ReadonlyArray<Property>,
  query: string,
): ReadonlyArray<Property>;

/** A percentage clamped to 0…100; an unparseable value is 0. */
export const percentOf = (value: string): number;

/** The preview bar's width: a percentage of 120 px. */
export const barWidth = (value: string): number;

/** The rows the view prints in its readout. */
export const describeInspector = (state: InspectorState, query: string): string;
```

Rules:

- `initial` uses `Arr.makeBy`; labels are `Name`, `Opacity`, `Role`, `Visible`,
  `Created`, `Owner`, `Path`, `Notes`, then `Property <n>`.
- Defaults: `Name = "Untitled"`, `Opacity = "80"`, every other value
  `value <n>`; ids are `p-<n>`.
- `filterProperties` trims the query and matches case-insensitively on the
  **label only**, preserving declaration order. It never mutates the input.
- `describeInspector` prints `name=<value> drafts=<count> filter=<query|->`,
  where `-` is an empty query. The commit count is **view** state (the model has
  no notion of a session), so the view appends `commits=<n>`.
- `percentOf` parses an integer prefix (`Number.parseInt`), rejects `NaN`, and
  clamps to `0…100`. `barWidth` is `percentOf * 1.2`.

## 5. The view (`property-panel.tsx`)

Root `testId="inspector-frame"`: `width: 860`, `height: 440`, `display: "flex"`,
`flexDirection: "row"`, `gap: 16`, background `theme.colors.background`.

**Preview (left, `width: 544`, `testId="inspector-preview"`)**: a card surface
(`theme.colors.card`, hairline border, radius, 16 px padding) containing the
caption `Preview`, the committed `Name` as `testId="inspector-preview-name"`, a
120 px track with the bar `testId="inspector-preview-bar"`
(`width: barWidth(opacity)`, 24 px tall, `theme.colors.primary`), and the
readout `testId="inspector-readout"`.

**Inspector (right, `width: 300`, `testId="inspector-pane"`)**: a card surface
with no padding of its own, holding:

1. a header row (`padding: 12`) with the heading `testId="inspector-heading"` and
   the shared `Pressable` `testId="inspector-reset"` labelled `Reset`;
2. a filter `<input testId="inspector-filter" aria-id="inspector-filter"
   placeholder="Filter properties" value={query}>` inset by 12 px, styled like
   the other probe fields; its key down clears the query on `Escape`;
3. `<virtual-list testId="inspector-list" style={{ height: 288 }}>` over the
   **filtered** rows. Each row is a flex row, 36 px tall, 12 px horizontal
   padding, 8 px gap, `key={property.id}`:
   - `<text testId={`inspector-label-${index}`} style={{ width: 96 }}>` with the
     muted caption style;
   - for the first **eight** properties an
     `<input testId={`inspector-input-${index}`}
     aria-id={`inspector-input-${index}`} value={draftValue}>`, 150 × 26,
     `onChange` → `setDraft`;
   - otherwise a `<text testId={`inspector-value-${index}`}>` with the value.
   - The **input** carries `onSubmit` → `commit` and `onKeyDown` (Escape) →
     `revert`. This is the measured correction to the first draft of this plan:
     Enter in a focused field does **not** bubble to the row as a key the row can
     act on; the runtime's field key-down sees Escape, while Enter is delivered
     as the field's `onSubmit` (the `input-edit` path, plan `041`).
     Every state mutation is a **functional** `setState` update: the live
     automation has no frame boundary, so typing and Enter can arrive in one
     React batch and a closure over `state` would commit a draft-less snapshot.

The view keeps the session's commit count **in the model** (`InspectorState.commits`,
incremented only when `commit` reports `committed: true`) and prints
`name=<committed Name> drafts=<draft count> filter=<query|-> commits=<n>` in
the readout. The preview reads the **committed** value, so a draft is visibly
not applied until Enter.

## 6. Steps for the executor

1. Read this plan, then `virtual-list.tsx`, `table.tsx`,
   `workspace-restore.tsx`, `text-entry.tsx`, `live/scenarios.tsx` (the
   `live-restore` twin), `ui.tsx`, `scenarios/probes.ts` and
   `scenarios/workspace-state.test.ts`.
2. Write `property-model.ts` and its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the six new tests pass with the rest of the package.

3. Write `property-panel.tsx` and register it. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; `scenarioProblems` reports no unknown/uncovered
   capability after `"inspector"` is added in both places.

4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only property-panel
   ```

   Expected: `1/1 scenarios passed`, exit `0`, 42 checks. A click that misses
   reports bounds/readout — fix geometry, never widen a tolerance past 2 px.

5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `79/79 scenarios passed`, exit `0`, `inspector=verified`; the check
   total grows from 2270 to **2312**.

6. Add `live-inspector` in `live/scenarios.tsx` (`view: propertyPanelScenario.view`,
   `ready: "inspector-frame"`), using `settle` after each input and
   `waitForText` for the readout. A live step may **not** assert painted style,
   `elementType` or the a11y dump (plan `197`). Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `30/30 scenarios passed`, exit `0`, one new screenshot, 530 live
   checks. If a live
   path cannot reach a control the headless path reaches, record the measured
   limitation and narrow the live twin; never delete the headless check.

7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.

8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts, then commit: the plan and the probe in one
   coherent commit (or plan first, implementation second).

## 7. Test plan

### 7.1 Unit tests (`property-model.test.ts`)

The module is pure, so each rule is testable without a renderer. Each test must
be able to fail:

| Test | Guards |
| ---- | ------ |
| `initial` | 96 rows; `p-0` is `Name = Untitled`, `p-1` is `Opacity = 80`; every id is unique |
| `draftValue` | a draft wins over the committed value; an unknown id is `""` |
| `setDraft` | is immutable (the previous state still reads the committed value) and leaves the committed row untouched |
| `commit` | with a draft reports `committed: true`, writes the draft into the row and clears it; with no draft or an unknown id reports `false` and returns the same state |
| `revert` | drops the draft and keeps the committed value; reverting without a draft is the same state |
| `reset` | restores the baseline after an edit, clears every draft, and is idempotent |
| `filterProperties` | case-insensitive, trims, preserves order (a query matching `Role` and `Owner` returns them in declaration order), matches labels only, and an empty query returns all |
| `percentOf` / `barWidth` | `"40"` → `40` / `48`; `"140"` → `100` / `120`; `"-5"` → `0` / `0`; `"abc"` → `0` / `0` |

### 7.2 The scenario

The scenario **is** the runtime test: typed checks over host text, bounds and
the accessibility dump. Record four mutation proofs and one reverse proof in
§9 after implementation (temporary edit → `--only` run → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the editor's `onSubmit` removed | "Enter commits the draft" (`commits=0`) |
| M2 | `commit`'s draft removal deleted (`R.remove` → keep the draft) | "a commit clears the draft" |
| M3 | the preview bar's width wired to a constant `96` | "editing Opacity resizes the preview bar" |
| M4 | the scroll-back index changed from `0` to `39` (so the editor is not repainted) | "the committed value survives a windowing scroll" (`got "none"`) |
| M5 | the filter compare made case-sensitive (`Str.includes(query)` before lowering) | "the filter is case-insensitive" |

M1, M3–M5 are view/model mutations in this workstream's files; M2 is a
temporary model mutation. A mutation that fails for an unrelated reason is not a
proof; fix and repeat.

Reverse proof (the consumer wiring):

- `onChange` wired to a no-op → "typing changes the draft" fails.

### 7.3 Two-direction checks to run by hand

- Expected counts: headless `79/79`, live `30/30`, both exit `0`.
- A run of `--only property-panel` after each mutation exits `1` and names the
  table's label.
- `nub run check`, `nub run lint`, `nub run test` all exit `0`.

## 8. STOP conditions

- The runtime does not deliver Enter/Escape to a row `onKeyDown` from a focused
  `<input>`. Stop, record the measured delivery (which handler receives it) and
  amend §5 before asserting anything else; do not switch to `onSubmit` without
  measuring it.
- A committed value does not paint after scrolling the row out and back. Stop:
  that is the core finding. Record exactly what is lost (paint, value, focus) in
  `COMPONENTS.md` and `TODO.md`, and assert the measured behaviour with a label
  that says so — do not hide it.
- Any check needs a tolerance above 2 px or a screenshot. Stop; that is a
  mechanism question, not this view.
- The offscreen frame cannot hold the 860 × 440 view without clipping, or a live
  path cannot reach a control. Narrow the live twin and record why; keep the
  headless check.
- A file outside §3 must change. Stop and write the task in `TODO.md`.
- The full suites are not `79/79` headless and `30/30` live, exit `0`. Stop and
  report the failing scenario; do not mark this plan done.

## 9. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `property-panel` (headless) | 42 | pass — suite `78 → 79`, `2270 → 2312`, exit `0`, `inspector=verified` |
| `live-inspector` | 24 | pass — live `29 → 30`, `506 → 530`, exit `0`, one screenshot |

Unit tests: `property-model.test.ts` adds 9 tests (`initial`, two draft tests,
two commit tests, reset, filter, percentage, description); the playground suite
is 124 tests in 15 files.

### 9.1 Facts that changed the plan

- **Enter is `onSubmit`, not a bubbled key.** The first implementation put
  `onKeyDown` on the row and expected Enter to bubble from the focused editor.
  It did not commit. Moving the handler to the field and using `onSubmit` does.
  The runtime delivers Escape to the field's own key down, so revert stays
  there. This is the same split `input-edit` (plan `041`) measured for
  `onChange`/`onSubmit`.
- **A live type-then-Enter shares one React batch.** The first live run
  committed nothing for `Opacity` (`bar=96`): the Enter handler had closed over
  the render *before* the typed draft. Functional `setState` updates fixed it,
  and the current live run commits on the first Enter. This is the plan `195`
  drag-closure lesson in a different disguise.
- **The readout order is fixed**: `name=… drafts=… filter=… commits=…`. The
  first live expectation had `commits` before `filter`; corrected.
- **`cmd-a` is required before typing a replacement** on an already-populated
  field: a click places the caret, so typing appends (`Untitledrenamed` was the
  first measured value).

### 9.2 The measured contract

| Fact | Value |
| ---- | ----- |
| pane width / right edge | `300` px; `x + width` equals the frame's right edge within 1 px |
| row geometry | `36` px tall; label column `96` px; editor starts `8` px after it (all within 1 px) |
| draft isolation | after typing `renamed`, the readout is `name=Untitled drafts=1`; the preview still paints `Untitled` |
| commit | Enter → `commits=1`, `drafts=0`, preview paints `renamed` |
| revert | a `x` draft + Escape → `commits=1`, editor value `renamed` |
| model → paint | `Opacity=40` → bar width `48` px (±1) |
| windowing away | `scrollToItem(list, 40)` → `Name` is absent from `getPaintedText`, `Property 40` is present |
| windowing back | `scrollToItem(list, 0)` → the editor's exposed value is `renamed` again |
| draft survival | `renamedz` (draft) + scroll to 40 + back → `drafts=1`, editor `renamedz` |
| filter | `role` → `Role` paints, `Name` does not, `drafts=1`; Escape → `filter=-`, `Name` returns |
| reset | `name=Untitled`, `drafts=0`, `filter=-`, bar `96` px, preview `Untitled` |
| a11y | the editor is a `TextInput` with value `Untitled`; both the editor and the filter are addressable by authored `aria-id` |

### 9.3 Mutation proofs

Each mutation was applied, built, run with `--only property-panel`, and
reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | editor `onSubmit` removed | `Enter commits the draft: expected "1", got "0"` |
| M2 | `commit` keeps the draft (`R.remove` dropped) | `a commit clears the draft: expected "0", got "1"` |
| M3 | preview bar width hard-coded to `96` | `editing Opacity resizes the preview bar: expected 48 ± 1, got 96` |
| M4 | scroll-back target `0 → 39` | `the committed value survives a windowing scroll: expected "renamed", got "none"` |
| M5 | filter compares case-sensitively | `the filter keeps the matching row: expected true, got false` |

Reverse proof (consumer wiring): the editor's `onChange` wired to a no-op →
`typing changes the draft only: expected "1", got "0"`.

### 9.4 Limits recorded

- The probe does **not** prove an off-window editor keeps native focus. It
  proves the controlled value and the parent-owned draft survive windowing and
  are painted on return. A grid that edits while scrolling should still reveal
  the cell with `scrollToItem` (plan `166`) or assert focus itself.
- A `<virtual-list>` retains every row (plan `302`: 3 host nodes per row), so
  the 96-row inspector is not a memory measurement.
- `onSubmit` is the field's Enter path; a row-level keyboard contract has to
  come from the field, not from bubbling. This is recorded for any future
  editable grid/inspector implementation.

## 10. Acceptance

- `property-model.ts` + its test, `property-panel.tsx`, the registry entry, the
  capability literal, the live twin, and the docs/inventory/plan-index updates.
- Headless `79/79`, live `30/30`, exit `0`; `nub run check`, `nub run lint`,
  `nub run test` all exit `0`.
- `COMPONENTS.md` records the measured inspector contract on all four rows and
  the `inspector` capability row; `TODO.md` ticks this task with the counts.
- Every mutation in §7.2 was run and produced the named failure (record the
  exact output in §9).
- No component package changed. Any defect found is a measured `TODO.md` task
  with a plan number reserved, not an edit from this workstream.

## 11. What this plan does not prove

- That a real inspector *component* is shipped — this is the runtime contract.
- Drag-resizing the inspector's split (measured by `panel-nested` `175`).
- Numeric parsing rules beyond the preview percentage (the editor is a text
  field; a number field is `primitives`' `NumberField`, plan `054`).
- Multi-cell selection, clipboard or undo in an editable grid.
- A context menu on a row (measured by `context-menu-pointer` `164`).
