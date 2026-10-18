# 373 — A range slider reports a gesture that changed nothing

| | |
| --- | --- |
| Phase | F (integration and polish) |
| Workstream | primitives |
| Depends on | 030, 041, 053, 063, 324, 331, 361, 362 |
| Status | ready to implement |

## 0. The defect, measured

`RangeSlider` calls `onValueChange` for gestures that leave both ends exactly
where they were. Measured on this host, GPUix 0.10.0, `1280 × 800`, with a
throwaway probe (deleted after the measurements below were recorded):

```sh
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/noop-probe.runtime.test.tsx
```

`<RangeSlider testId="r" label="Price" defaultValue={[20, 60]} onValueChange={spy} />`:

| Gesture | Reported calls | Last value |
| ------- | -------------- | ---------- |
| click at 90 % once | 1 | `[20, 91]` |
| click at the same point again | **2** | `[20, 91]` |
| press at the same point + 1 px move | **4** (two more: down + move) | `[20, 91]` |
| max thumb focused, `End` | 1 | `[20, 100]` |
| `End` again (already at max) | **2** | `[20, 100]` |

The contrast case, same window, `<Slider defaultValue={100} onValueChange={spy} />`
with `End` pressed at the maximum: **0** calls — the single slider is already
correct.

### Why the single slider is correct and the range is not

The one controlled rule (`src/core/state.ts`, `setValue`) reports only when
`Object.is(state.current, next)` is false. A single slider passes a number, so a
repeated stop is the same value and the parent is not woken. A range slider
passes a **fresh tuple** on every gesture (`spanTuple(...)`), so two identical
numbers in a new array are never `Object.is`-equal and every pointer move or
redundant key reports again.

The two multi-value groups already solve this deliberately, and their module
headers say so:

- `src/core/toggle-group.ts` — "A press that changes nothing returns `current`
  **by identity**, so the shared `useControlState` does not call
  `onValueChange` and wake the parent."
- `src/core/checkbox-group.ts` — the same rule for the set.

`RangeSlider` is therefore the one value control that escapes the convention.
The cost is real: a consumer that stores the pair in state re-renders on every
pointer move inside one stop, and a consumer that derives work from the pair
(e.g. a fetch keyed on the band) repeats it.

## 1. The rule

One pure function in `src/core/value.ts`, beside `moveSpanEnd`/`normalizeSpan`,
so both the pointer path and the keyboard path use it and a pure test can prove
it:

```ts
export const spanAfterMove = (
  current: readonly [number, number],
  end: "start" | "end",
  value: number,
  range: ValueRange,
): readonly [number, number]
```

- normalises `current` into a `ValueSpan` (`normalizeSpan`, as today);
- moves one end (`moveSpanEnd`, as today);
- returns **`current` itself, by identity**, when the move produced the same two
  numbers;
- otherwise returns a fresh ordered pair `[next.start, next.end]`.

`useControlState` then sees identity and reports nothing, which is the same
mechanism the toggle and checkbox groups use.

`moveSpanEnd` stays public and unchanged: it is the lower-level rule and its
tests still hold.

## 2. Exact changes

All paths are under `packages/primitives/`.

### 2.1 `src/core/value.ts`

1. Add `spanAfterMove` after `moveSpanEnd`, with a TSDoc summary that names the
   reason for the identity return (the shared `Object.is` rule in
   `src/core/state.ts`; the convention in `core/toggle-group.ts`) and the
   behaviour it prevents (a parent woken on every pointer move inside one stop).
2. Delete nothing else. `moveSpanEnd`, `normalizeSpan`, `spanTuple`'s call sites
   in `Slider.tsx` are handled below.

### 2.2 `src/core/index.ts`

Add `spanAfterMove` to the existing `./value.js` value-export block (alphabetical
order: after `pointerValue`, before `stepValue`). The root `src/index.ts`
re-exports `core/`, so this makes it public — that is intended, it is the same
kind of rule as `moveSpanEnd`. Its TSDoc summary satisfies `src/tsdoc.test.ts`.

### 2.3 `src/components/Slider.tsx`

- Import `spanAfterMove`; drop `moveSpanEnd` from the import list if no longer
  used (it will not be).
- In `renderRangeSlider`'s thumb `onKeyDown`, replace
  `handlers.onSpanChange(spanTuple(moveSpanEnd(span, end, next, range)))`
  with `handlers.onSpanChange(spanAfterMove(state.current, end, next, range))`.
  The `span`/`value` locals stay for `aria-valuetext` and the clamp.
- In `RangeSlider`, replace the `change` helper's body with
  `state.set(spanAfterMove(state.value.current, end, value, range))` — i.e.
  `change(span, end, value)` no longer needs `span`, so simplify it to
  `change(end, value)` and update its two call sites (`onPointerDown`,
  `onPointerMove`). The pointer path's local `spanOf(...)` stays where it is
  needed (`nearestEnd`).
- Delete `spanTuple` if both call sites are gone (expected: yes). Keep `spanOf`.

Do **not** add a second comparison inside the component; the identity return is
the guard.

### 2.4 `src/core/value.test.ts`

New `describe("spanAfterMove")` with cases that can fail:

1. a move that lands on the same stop returns the **same array**:
   `spanAfterMove([20, 60], "end", 60, RANGE)` is `toBe(current)`;
2. a move that clamps against the other end and changes nothing
   (`[20, 60]`, `"start"`, `0` → `[0, 60]` is a change; use `[0, 60]`, `"start"`,
   `-10` → returns `current` by identity);
3. a real move returns the ordered pair: `spanAfterMove([20, 60], "end", 90, RANGE)`
   → `[20, 90]`;
4. a crossing attempt reports the clamped pair, not the raw one:
   `spanAfterMove([20, 60], "start", 95, RANGE)` → `[60, 60]`;
5. an input pair stored out of order is normalised before the decision:
   `spanAfterMove([60, 20], "end", 90, RANGE)` → `[20, 90]`.

### 2.5 `src/components/Slider.test.tsx`

Inside `describe("RangeSlider")`, one case named for the bug:

> "does not report a key that cannot move its end"

Render with state `[20, 100]` and the **end** thumb focused, press `End` on the
end thumb, and assert `onSpanChange` was called **once** with the exact state
array (`toHaveBeenCalledWith(state.current)` is not enough — assert
`onSpanChange.mock.calls[0]?.[0]` is `state.current` by `toBe`). Then press
`Left` and assert a fresh `[20, 99]`. This proves the view routes through the
identity rule.

### 2.6 `runtime/value.runtime.test.tsx`

Two runtime cases, each in a fresh window (`mount`):

1. **"does not report a press that lands on the value already there"** —
   `defaultValue={[20, 60]}`; click at 90 % → 1 call, `[20, 91]`; click the same
   point again → still **1** call (the old behaviour was 2); then
   `mouseDownAt` the same point, `mouseMoveAt(x + 1, y, 0)`, `mouseUpAt` → still
   **1** (the old behaviour was 4).
2. **"does not report a key that cannot move its end"** —
   `defaultValue={[20, 60]}`; click at 90 % (1 call, max thumb focused);
   `End` → 2 calls, `[20, 100]`; `End` again → still **2**.

Both cases must read the values through `onValueChange`'s recorded arguments,
not only the count, so a fix that drops real reports fails too.

### 2.7 `docs/range-slider.mdx`

In the paragraph after the usage example (which already explains the crossing and
stop rules) add one sentence:

> A gesture that leaves both ends where they were — a second press on the same
> spot, an `End` already at the maximum — reports nothing, the same no-op rule
> `Slider` follows.

Change the `onValueChange` row's consequence to
"called with the ordered pair, only when it changed".

### 2.8 `COMPONENTS.md`

Append to the **Range slider** row's Notes, in the row's existing style:

> **No-op reports (373):** measured, a second press on the same spot reported
> `[20, 91]` again and `End` at the maximum reported again (3 calls for one
> real change), because a range gesture built a fresh tuple and `useControlState`
> compares with `Object.is`; `spanAfterMove` now returns the current pair by
> identity, like `ToggleGroup`/`CheckboxGroup`. 2 runtime + 1 element-tree +
> 5 core cases, both directions proven.

### 2.9 `TODO.md`

Add, under the primitives ledger (after the plan `372` entry, before the
"toggle and selection families" row), a ticked task:

```
`[x]` `packages/primitives`: **a range slider reported a gesture that changed
      nothing** — measured (2026-10-18): a second press on the same spot
      reported `[20, 91]` again and `End` at the maximum reported again, because
      each gesture built a fresh tuple and `useControlState` compares with
      `Object.is`. `spanAfterMove` now returns the current pair by identity (the
      `ToggleGroup`/`CheckboxGroup` rule); 5 core + 1 element-tree + 2 runtime
      cases, both directions proven (plan `373`).
```

### 2.10 `.agents/slop/plans/README.md`

Add a row to the primitives table after `372`:

```
| [373](./373-range-slider-noop-report.md) | A range slider reports a gesture that changed nothing | F | 030, 041, 053, 063, 324, 331, 361, 362 | **done** — … |
```

Fill the status with the measured counts once the suite has run.

## 3. Commands and expected results

Run from the workspace root (`workspaces/primitives`):

1. `nub run --filter @gpuixui/primitives test`
   Expected: every offline suite green, including the new `spanAfterMove` cases
   and the element-tree case. Baseline before this plan: 45 files / 654 tests.
2. `nub run --filter @gpuixui/primitives test:runtime`
   Expected: every runtime suite green, including the two new cases. Baseline:
   32 files / 608 tests.
3. `nub run check`
   Expected: `check-tests`, lint, format and `check-types` for every workspace
   pass. (`src/tsdoc.test.ts` must accept the new export's summary; the docs
   coverage guard must accept the edited page.)
4. `nub run lint`
5. `nub run test`

## 4. Both-direction proof

The probe in §0 **is** the failing direction: the two runtime cases fail against
the current code with 2 and 3 reports. After the fix, temporarily revert the
identity return in `spanAfterMove` (always return `[next.start, next.end]`) and
re-run `test:runtime` on `runtime/value.runtime.test.tsx`: both new cases must
fail by name. Restore the fix and re-run: green. Record the output in this plan
and in the TODO row.

## 5. STOP conditions

Stop and report instead of improvising if:

- the runtime suite cannot open a window on this host (no `gpuix-native` binding)
  — the offline half still lands, and the runtime half is recorded as unrun, not
  as passing;
- `getElementBounds` reports no box for the track (the click coordinates cannot
  be computed) — record the measurement and do not guess pixels;
- the identity return makes a **real** move stop reporting (e.g. an end moving
  by one step). That means `normalizeSpan` is being fed the already-moved pair;
  re-read call sites rather than adding a comparison;
- a change would have to touch a path outside this workstream
  (`packages/primitives`, `packages/icons`) — record it in `TODO.md` instead.

## 6. Acceptance

- `RangeSlider` reports once per real change and not at all for a repeated press
  or a key that cannot move the end, proven in the real renderer.
- `spanAfterMove` is a pure, documented, exported rule with its own cases.
- The range-slider page states the no-op rule; the inventory row records the
  measurement.
- `nub run check`, `nub run lint`, `nub run test` and the runtime suite pass.
- The plan is indexed, the TODO row is ticked, and both directions are proven.
