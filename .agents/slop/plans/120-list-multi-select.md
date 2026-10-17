# 120 — List multiple selection (and the duplicate inventory row)

- **Phase:** C (Tier 2 hardening — the first item after the inventory closed)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 111 (List), 117 (inventory gate)
- **Status:** done, 2026-10-17. 13 selection-logic tests + 8 native behaviour
  tests (List: 20), the duplicate-row regression, example, docs and inventory
  row. Deviations in §10.

`COMPONENTS.md` records List's one remaining API limitation: "Single selection
only — no multi-select". Multi-select is table stakes for the file lists, settings
rows and property lists the Tier 3/4 components will compose, and 0.10.0 already
gives us the two things it needs: pointer/keyboard **modifiers** on `EventPayload`
(`shift`/`ctrl`/`cmd`) and `nativeSimulateClick(x, y, button, modifiers)` in the
test renderer, so the interaction is provable natively.

The same commit fixes a documentation defect found by reading the table: the
Tier 2 section carries a stray second `Dropdown menus | todo` row beneath the
real `done` row. The inventory check did not catch it, so the check gets the
regression test too.

---

## 1. Files

```
src/list/selection.ts               # pure multi-select rules (new)
src/list/selection.test.ts          # toggle / range / same-selection (new)
src/list.tsx                        # mode, normalised state, pointer + key rules
src/internal/interaction.ts         # clickCentreOf gains modifiers
src/behaviour/list.test.tsx         # 8 new native tests
src/inventory.test.ts               # duplicate Tier 2 row regression
examples/list.example.tsx           # add a multiple-selection example
docs/list.mdx                       # modes, modifiers, keyboard, limitations
src/inventory.ts                    # limitations text
COMPONENTS.md                       # row notes; delete the stray duplicate row
TODO.md                             # tick the task
.agents/slop/plans/README.md        # index this plan
```

## 2. Public API — `src/list.tsx`

`selectionMode` grows a third member. The props stay a discriminated union so a
multiple list cannot be given a `string` value and a single list cannot be given
an array:

```ts
export type ListSelectionMode = "none" | "single" | "multiple";

interface ListBaseProps extends Props {
  /** Row height `rowHeight` instead of `rowHeight + spacing.md`. */
  readonly dense?: boolean;
}

export type ListProps =
  | (ListBaseProps & { readonly selectionMode?: "none" })
  | (ListBaseProps & {
      readonly selectionMode: "single";
      readonly value?: string;
      readonly defaultValue?: string;
      readonly onValueChange?: (value: string) => void;
    })
  | (ListBaseProps & {
      readonly selectionMode: "multiple";
      readonly value?: ReadonlyArray<string>;
      readonly defaultValue?: ReadonlyArray<string>;
      readonly onValueChange?: (values: ReadonlyArray<string>) => void;
    });
```

Single-mode call sites are source-compatible: `value`/`defaultValue`/
`onValueChange` keep their types. A call with no `selectionMode` may no longer
pass those props; none in the repo does.

## 3. `src/list/selection.ts` — the pure rules

```ts
/** A row the selection rules can see. */
export interface SelectableRow {
  readonly value: string;
  readonly disabled: boolean;
}

/** Add `value` when absent, remove it when present; first-added order kept. */
export const toggle: (
  values: ReadonlyArray<string>,
  value: string,
) => ReadonlyArray<string>;

/**
 * Every enabled value between `anchor` and `target` inclusive, in row order.
 * Falls back to `[target]` when the anchor is absent or disabled; returns `[]`
 * when the target is not a selectable row, so a misused helper can never put a
 * disabled value into a selection.
 */
export const range: (
  rows: ReadonlyArray<SelectableRow>,
  anchor: string,
  target: string,
) => ReadonlyArray<string>;

/** Same members, ignoring order — so a reselect reports nothing new. */
export const sameValues: (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
) => boolean;
```

All three are `effect/Array` only; no React, no native import.

## 4. `src/list.tsx` — implementation

1. **One internal representation.** The component stores
   `ReadonlyArray<string>` in every mode. `controlled` normalises the public
   value (`[value]` for single, the array for multiple, `undefined` for
   uncontrolled); `initial` normalises `defaultValue`. `report` converts back:
   single sends `next[0] ?? ""`, multiple sends `next`.
2. **Commit only real changes.** `sameValues` replaces the reference compare, so
   reselecting the same row still reports nothing (the existing single-mode
   contract) and a multiple reselect does not churn state.
3. **Click rules (multiple mode).**
   - plain click: select only that row; it becomes the anchor;
   - `cmd`/`ctrl`+click: toggle it, keeping the rest; it becomes the anchor;
   - `shift`+click: select the contiguous enabled range from the anchor to that
     row. With no anchor, select only the row and anchor it.
4. **Keyboard rules (multiple mode).**
   - `Space`/`Enter` toggles the focused row and anchors it (the keyboard
     equivalent of a modified click, so a keyboard user can build a selection);
   - `shift`+`↓`/`↑` moves focus and selects the range from the anchor to the
     new row; without `shift` the arrow only moves focus and re-anchors;
   - `Home`/`End` keep their current behaviour (focus only).
5. **Tab stop** is the active row, else the first selected row in declaration
   order, else the first enabled row — still exactly one.
6. **Announcement.** Every row keeps `aria-selected` in both selectable modes.
   `aria-multiselectable` does **not** exist on `HostProps` in 0.10.0, so the
   mode itself cannot be announced; record that in docs, inventory and
   `COMPONENTS.md`.
7. **No separate `selected` string**: `ListContextValue.selected` becomes
   `ReadonlyArray<string>`; `ListItem` tests membership with `Arr.contains(value)`.

## 5. Tests

### 5a. `src/list/selection.test.ts` (logic, default `test` run)

Header states the bug guarded: "a range selection that included a disabled row,
or a toggle that duplicated a value, reached the consumer".

- `toggle` adds an absent value at the end; removes a present one; keeps the
  first-added order; toggling twice returns the original array; no duplicates.
- `range` forward and reversed (anchor after target) produce the same row-order
  values; the middle disabled row is absent; a one-row range is that row; an
  unknown or disabled anchor falls back to `[target]`; an unknown or disabled
  target yields `[]`.
- `sameValues` ignores order, rejects a missing or extra member, and compares
  `[]` with `[]` as equal.

### 5b. `src/behaviour/list.test.tsx` (real renderer, `test:behaviour`)

`internal/interaction.ts` gains an optional `modifiers?: string` on
`clickCentreOf`, forwarded to `nativeSimulateClick` (button `0` unchanged).

New catalog with four enabled/disabled rows: `a`, `b` (disabled), `c`, `d`.

1. Multiple mode is a `listbox` of `option`s with exactly one tab stop, and
   every row carries `aria-selected`.
2. A plain click selects exactly that row and reports `["c"]` once.
3. `cmd`+click on another row reports both values in selection order.
4. `shift`+click from the anchor selects the enabled range and **omits the
   disabled row** (the bug this guards).
5. `Space` on a focused row toggles it into the selection without losing the
   existing one.
6. `shift`+`↓` extends the selection and moves real focus.
7. `cmd`+click on a disabled row reports nothing and leaves the selection.
8. Controlled multiple: the consumer ignores the change; `aria-selected` stays
   where the prop put it while the change is still reported.

If `nativeSimulateClick` modifiers prove not to reach `EventPayload.modifiers`,
STOP (see §8) — do not fake the interaction with a direct handler call.

### 5c. `src/inventory.test.ts` — the documentation regression

New test "has no duplicate Tier 2 row names". It must **fail first** against the
stray `| Dropdown menus | todo | ? | |` row, then pass after that row is deleted.
Run it in both directions and record the two outputs in the commit message.

## 6. Example, docs, inventory

- `examples/list.example.tsx`: add `ListMultiExample` — a four-row "Reviewers"
  list with `selectionMode="multiple"`, a `defaultValue`, a summary line showing
  the count, and one disabled row. Register it in `examples/index.ts` if that
  file lists exports.
- `docs/list.mdx`: third mode row in the modes table (role `listbox`, many
  selected rows, one tab stop); pointer table for plain/`cmd`/`shift`; keyboard
  table for multiple; controlled value is an array; limitations now "no
  `aria-multiselectable` in 0.10.0", "no select-all", "no checkbox column".
- `src/inventory.ts`: replace the single-selection limitation with the remaining
  ones (`no aria-multiselectable`, `no select-all`); status stays `done`.
- `COMPONENTS.md`: update the Lists row notes; delete the stray
  `| Dropdown menus | todo | ? | |` line.
- `TODO.md`: add and tick the task under Tier 2; `plans/README.md`: add row 120.

## 7. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # selection suite + inventory pass
nub run --filter @gpuixui/components test:behaviour   # list suite: 20 tests, all pass
nub run check                                         # repo gate, exit 0
```

Expected: 157 → ~168 default tests; 186 → ~194 behaviour tests. The inventory
test must be seen red before the duplicate row is deleted and green after.

## 8. STOP conditions

1. `EventPayload.modifiers` is absent from a simulated click in this binding
   (the type says it exists) → STOP, report the measured payload. Do not test
   multi-select by invoking the handler directly.
2. The discriminated union cannot be destructured without a cast, `any`, or a
   non-null assertion → STOP and report the compiler output; the API shape is
   negotiable (a separate `values` prop pair is the fallback), a cast is not.
3. `shift`+arrow cannot be produced by `simulateKeystrokes("shift-down")` →
   drop only test 6 and document keyboard range extension as untested; the
   pointer range test still proves `range`.
4. Any existing single-mode test changes meaning → STOP; single mode must stay
   behaviour-identical.

## 9. Acceptance criteria

- [x] `selectionMode="multiple"` with controlled and uncontrolled array values.
- [x] Plain, `cmd`/`ctrl` and `shift` clicks; Space/Enter toggle; shift+arrow
      extend; disabled rows never enter a selection.
- [x] Pure rules covered by a suite that fails on a duplicated toggle, an
      ordered comparison or a range that includes a disabled row.
- [x] Native behaviour suite covers all of §5b; both themes still pass.
- [x] Example, docs page, inventory record and `COMPONENTS.md` row updated; the
      stray duplicate row is gone and the inventory check guards it.
- [x] `nub run check` and `nub run --filter @gpuixui/components test*` green.

## 10. Deviations, recorded during implementation (2026-10-17)

1. **The `"none"` branch declares `value`/`defaultValue`/`onValueChange` as
   `never`.** Without them the union could not be destructured (the properties
   did not exist on every member) and the only alternative was a cast, which §8.2
   forbids. Declaring them `never` also rejects a stray value on a
   non-selectable list at compile time.
2. **The four selection props are still read through `props`**, not through the
   destructured bindings. Destructured discriminant narrowing is reliable at the
   top level but not across the `useCallback` closures; the `Match.value(props)`
   helpers narrow correctly in every one.
3. **`range` returns `[]` for a disabled or unknown target** (the plan's first
   wording said `[target]`). A pure helper must never hand a disabled value
   back to a caller that forgot to guard it.
4. **`select` was removed from the private context.** `ListItem` never read it
   and it was a second way to change the selection.
5. **`Enter` toggles as well as `Space` in multiple mode**, matching the existing
   single-mode activation rule (`isActivation` covers both).
6. **The verification numbers moved**: the default suite is 171 tests (157 + 13
   selection + 1 inventory) and the behaviour suite 194 (186 + 8), not the
   estimates in §7.
7. **Two-direction proof for the additive click branch**: with
   `const additive = false` the Cmd-click suite reported `["d"]` where it expects
   `["c", "d"]`; the rule was restored and the suite went green again.

