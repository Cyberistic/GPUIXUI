# 376 — `Grid` hides the runtime's track sizing, and the page says it cannot exist

| | |
| --- | --- |
| Phase | F (integration and polish) |
| Workstream | primitives |
| Depends on | 020, 030, 041, 047, 097, 203, 371 |
| Status | done |

## 0. The defect, measured

`packages/primitives/docs/grid.mdx` states, twice, that a grid can only have
equal tracks:

> `Grid` is the runtime's fixed-size grid: a numeric column count and an optional
> numeric row count. It is **not** a CSS grid. There is no auto-flow, no named
> area, no `minmax()` and no track string, so anything raggedy belongs in a
> wrapping `Stack`.

> - Equal tracks only. A two-column inspector with a narrow label column is not
>   expressible; use a `Stack` row with a fixed-width `Box` label, or `Stack`
>   plus `Spacer`.

That is false for the pinned runtime, and the package's own capability reference
already says so. `@gpuix/native@0.10.0`'s `StyleDesc` (published
`dist/host.d.ts`) declares `gridColumnMin`/`gridRowMin` as
`"zero" | "min-content" | "max-content"`, and `docs/gpuix-capabilities.md` §
"Fixed grid" records them. The upstream changelog names the intended use:

> Use `gridColumnMin: "max-content"` for tables so each column is as wide as its
> widest cell.

Measured on this host, GPUix 0.10.0, `1280 × 800`, with a throwaway probe
(deleted after the measurements below were recorded). Two cells — a short label
and a long value — in a two-column grid with an explicit `width: 600`:

| Cell | Default (no min) | `gridColumnMin: "max-content"` | `gridColumnMin: "min-content"` |
| ---- | ---------------- | ------------------------------ | ------------------------------ |
| label | `x 12`, width **300** | `x 12`, width **33** | `x 12`, width **300** |
| value | `x 312`, width **300** | `x 45`, width **235** | `x 312`, width **300** |
| grid | fills 600 | hugs 268 | fills 600 |

Rows behave the same way. One column, two rows, `width: 200`, the second cell
wrapping onto two lines:

| Cell | Default (no min) | `gridRowMin: "max-content"` |
| ---- | ---------------- | --------------------------- |
| first | height 32 | height **16** |
| second | height 32 | height **32** |

So the "narrow label column" the page calls impossible **is** expressible today:
`max-content` sizes a track to its widest cell. `min-content` is the smallest
size the content can take, and `zero` is the runtime default (equal tracks).

The component has no prop for any of it, so the capability is unreachable from
the library's public API. That is the defect: a documented limitation that is
not real, and a supported runtime feature the component hides — the same class as
plans `059`, `075`, `342` and `358`.

## 1. The rule

`Grid` mirrors the runtime's two track-minimum properties, one per axis, with the
runtime's exact vocabulary. No second abstraction:

```ts
export const GRID_TRACK_MINS = ["zero", "min-content", "max-content"] as const;
export type GridTrackMin = (typeof GRID_TRACK_MINS)[number];
```

- `columnMin` → `gridColumnMin`, `rowMin` → `gridRowMin`.
- Both are omitted when not supplied, so every existing grid paints exactly what
  it painted before (the runtime then uses equal tracks).
- The props are typed unions; the runtime ignores an unknown value, and the
  compiler refuses one, so there is no second validation rule to drift.
- The grid keeps its numeric track counts. This is not `minmax()`: a track cannot
  be given an arbitrary width, and there is no auto-flow. `max-content` is the
  honest answer for a table-like grid, and the page says the grid then hugs its
  content unless a cell stretches.

## 2. Exact changes

All paths are under `packages/primitives/` unless stated otherwise.

### 2.1 `src/core/layout.ts`

1. Beside `STACK_*` consts, add `GRID_TRACK_MINS` and `GridTrackMin` with TSDoc
   summaries (`src/tsdoc.test.ts` requires one on every exported **value**).
2. In `GridSpec`, add:

   ```ts
   /** How a column's minimum is sized; `max-content` fits its widest cell. */
   readonly columnMin?: GridTrackMin;
   /** The same rule on the row axis. */
   readonly rowMin?: GridTrackMin;
   ```

3. In `gridStyle`, after the template counts (and before `gap`):

   ```ts
   if (spec.columnMin !== undefined) style.gridColumnMin = spec.columnMin;
   if (spec.rowMin !== undefined) style.gridRowMin = spec.rowMin;
   ```

4. Update the `gridStyle` TSDoc: the track **counts** are numeric, the track
   **minimum** is one of three runtime values.

### 2.2 `src/core/index.ts`

Add `GRID_TRACK_MINS` to the `./layout.js` value-export block (alphabetical).
The root `src/index.ts` re-exports `core/`, so it becomes public; that is
intended, it is the vocabulary a consumer needs to type a wrapper. Types need no
entry (`GridTrackMin` is exported by the `export type` line's module; check the
file's existing style and add it to the matching type block if one exists).

### 2.3 `src/components/Stack.tsx`

- Update the `renderGrid` and `Grid` docstrings: the grid is numeric tracks whose
  minimum can be content-sized (`columnMin`/`rowMin`); it is still not a CSS
  grid (no auto-flow, no named areas, no arbitrary track widths).
- No render change: `GridProps extends GridSpec`, so the props flow through the
  existing `{ style, children, testId, ...spec }` spread.

### 2.4 `docs/grid.mdx`

1. Intro: replace "there is no `minmax()` and no track string" reasoning so it
   keeps the real limits (no auto-flow, no named areas, no arbitrary track
   widths, no template strings) and names the real capability: `columnMin` /
   `rowMin` take `zero`, `min-content` or `max-content`.
2. Usage: add the inspector shape the page said was impossible:

   ```tsx
   <Grid columns={2} gap="sm" columnMin="max-content">
     <Text role="caption" tone="muted">Owner</Text>
     <Text role="body">Ada Lovelace</Text>
   </Grid>
   ```

   State the trade: with `max-content` the grid hugs its content instead of
   filling the parent (measured `268` of an explicit `600`), so put `grow` on it
   or let a cell stretch when the grid must fill a row.
3. API table: add `columnMin` and `rowMin` rows (type, default `zero`, what the
   runtime does, measured note).
4. Limitations: replace "Equal tracks only…" with the honest limits — no
   `minmax()`/arbitrary width/percentage tracks, no auto-flow/named areas; the
   three minimum modes are the whole control. Keep the Stack fallback advice for
   a *fixed* width column, which `max-content` cannot express.
5. Verification: add the core, element and runtime cases from §3.

### 2.5 `COMPONENTS.md`

In the "Stack / layout primitives" Tier 1 row, append a sentence: `Grid` exposes
the runtime's `columnMin`/`rowMin` (`zero` / `min-content` / `max-content`),
measured `max-content` gives a content-sized label column (`300/300` →
`33/235`), and the old "equal tracks only" claim is corrected (plan `376`).

### 2.6 `PLAN.md`

Add D43: `Grid` mirrors the runtime's `gridColumnMin`/`gridRowMin` as
`columnMin`/`rowMin`; the runtime's vocabulary is the API, because a second
abstraction (`fit="content"` etc.) would have to map three values to two and
would hide `min-content`.

### 2.7 `TODO.md`

Tick a new row under the primitives workstream:

> `[x]` `packages/primitives`: **`Grid` hid the runtime's track sizing** — …

and update the workstream counter.

## 3. Test plan

Three layers, because each can fail independently.

### 3.1 Core — `src/core/layout.test.ts`

In `describe("gridStyle")`:

- `gridStyle({ columns: 2 }, testTheme)` leaves **both** min properties
  `undefined` — the default must not change a painted grid.
- `gridStyle({ columns: 2, columnMin: "max-content" }, testTheme).gridColumnMin`
  is `"max-content"`, and `gridRowMin` stays `undefined`.
- `gridStyle({ columns: 2, rows: 2, rowMin: "min-content" }, testTheme).gridRowMin`
  is `"min-content"`, and the column min stays `undefined`.
- Each of the three values is accepted on its axis (`Arr`-driven or three
  assertions; `effect/Array` if a table is used).

### 3.2 Element tree — `src/components/presentational.test.tsx`

Extend the existing grid case:

- `renderGrid({ columns: 2, columnMin: "max-content" }, testTheme)` carries
  `gridColumnMin` on the resolved `style` (use `stringIn`);
- a plain `renderGrid({ columns: 2 }, …)` has no `gridColumnMin`/`gridRowMin`.

### 3.3 Runtime — `runtime/layout.runtime.test.tsx`

The existing case only proves "a grid lays cells in rows". Add:

1. **Default stays equal.** Two cells with a short label and a long value in a
   `width: 600` grid: both widths are equal (this is the pre-fix direction of
   case 2).
2. **`columnMin="max-content"` sizes each column to its content.** Same tree:
   the label column is narrower than the value column by more than 100 px, both
   cells are inside the grid, and the grid hugs its content (width < the 600
   input). Assert on `runtime.bounds(...)`, not on a style object.
3. **`rowMin="max-content"` sizes each row to its content.** Two rows, the
   second wrapping: the first row is shorter than the second; the default
   (case 3a) has equal heights.

Use `Text` for the content so the measurement is a real text layout, and a
`Box`/`div` `testId` per cell for `runtime.bounds`.

**Both directions.** Case 2 must fail if `gridStyle` stops setting
`gridColumnMin` (the columns go back to 300/300), and case 3 must fail if
`gridRowMin` is dropped. Record both mutation outcomes in the plan's §6 when
implementing.

### 3.4 Docs guard

No new page, so `src/exports.test.ts` and `src/contract.test.ts` stay green. Run
them: the new `GRID_TRACK_MINS` export is SCREAMING_CASE and needs a TSDoc
summary, which `src/tsdoc.test.ts` checks.

## 4. Commands and expected results

```sh
cd packages/primitives
nub run test                 # 46 files, 660 → 664+ tests, green
nub run check-types          # tsc --noEmit, no output
nub run test:runtime         # 32 files, 613 → 616+ tests, green
```

From the repo root:

```sh
nub run check                # check:tests + lint + fmt + check-types, green
nub run lint
nub run test
```

Expected: every command exits `0`; the runtime run prints the new layout cases
and the suite total rises by the number added.

## 5. STOP conditions

- **`gridColumnMin: "max-content"` does not change the painted widths on the
  pinned 0.10.0 binding.** The type is published but the behaviour is not; in
  that case do **not** ship a prop that does nothing. Stop, and instead correct
  only the page's claim to "the type exists but is untested/ignored", with the
  measurement as evidence. (The probe above already measured the behaviour on
  this host, so this should not fire on the pinned build.)
- **The runtime ignores an unknown value silently.** Do not add runtime
  validation; the union is the contract. If a non-union value is needed, stop and
  re-plan the API.
- **A painted grid without the new props changes at all.** Stop: the default
  must stay byte-identical; the core case in §3.1 exists to catch it.
- **`gridColumnMin` needs a value the runtime's union does not contain** (e.g. a
  pixel track). Stop: that is `minmax()`/gap work, a separate plan.

## 6. Records updated

- This plan: status `done`, the measured suite counts, and both mutation
  directions in a §6 table.
- `.agents/slop/plans/README.md`: the plan's row in the `020–049` block table.
- `TODO.md`: the new row ticked, counter updated.
- `COMPONENTS.md`: the layout row sentence.
- `PLAN.md`: D43.
- `packages/primitives/README.md`: only if it lists the layout API (check; the
  README defers component detail to the pages).

## 7. Acceptance

1. `Grid` accepts `columnMin` and `rowMin` with the runtime's three values, and
   omits both by default.
2. A measured runtime case proves `max-content` produces a content-sized label
   column and `max-content` rows fit their content; the default case proves equal
   tracks.
3. `docs/grid.mdx` no longer claims the capability is impossible, shows the
   inspector shape, states the hug-vs-fill trade, and documents the real limits.
4. Core, element-tree, runtime, docs and export/contract guards are green; the
   two mutations in §3.3 fail by case name.
5. `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plan index record the change.

## 8. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 665 tests**, green (660 before) |
| `nub run --filter @gpuixui/primitives test:runtime` | **32 files, 616 tests**, green (613 before) |
| `nub run check` | green (check-tests, lint, fmt, check-types) |

The three new runtime cases pass:

```
✓ gives a grid's columns equal tracks when no minimum is asked for
✓ sizes a grid's columns to their content with columnMin
✓ sizes a grid's rows to their content with rowMin
```

Both mutation directions, measured by deleting one assignment from
`gridStyle` and re-running `runtime/layout.runtime.test.tsx`:

| Mutation | Failing case | Failure |
| -------- | ------------ | ------- |
| drop `style.gridColumnMin` | `sizes a grid's columns to their content with columnMin` | `expected 300 to be less than 300` |
| drop `style.gridRowMin` | `sizes a grid's rows to their content with rowMin` | `expected 32 to be less than 32` |

Both were restored before the full runs above; `git diff` after the restore
shows both assignments present.
