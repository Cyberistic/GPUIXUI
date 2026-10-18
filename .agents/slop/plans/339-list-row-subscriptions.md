# 339 — List row subscriptions: repaint the rows that changed

**Phase:** F (performance) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 111, 120, 125, 130, 134, 326,
327, 338.

**Status when written (plan 338, measured):** a 1,000-row `List` mounts in
≈1.1 s, but **one `ArrowDown` takes ≈1.0–2.1 s**. `List` passes `active`,
`selected` and `tabbable` through one React context, so every key press
re-renders all 1,000 `ListItem`s and the native reconciler re-applies 1,000
styles. Only two rows actually changed. `docs/performance.md` and the
`COMPONENTS.md` Lists row record it as a limitation.

Measured probe for this plan (this host, real renderer, 2,000 rows):
`ArrowDown` ≈ 2.7 s; a full re-render with unchanged state ≈ 0.44 s. The delta
is the per-row work, not layout or focus.

## 1. The rule

> A roving-focus move repaints the rows whose visual state changed — the row
> that lost the ring and the row that gained it — not every row. Public
> behaviour is unchanged: focus, selection, type-ahead, activation, `style`
> functions and the both-theme matrix still hold.

## 2. The mechanism (measured, not assumed)

Two React facts, both checked on this host before writing the plan:

1. When a component re-renders with the **same children element objects** and a
   context whose value is stable, React bails out of those children
   (`oldProps === newProps`). Probe: a two-child tree re-rendered by its
   parent's state stayed at two child renders.
2. `useSyncExternalStore` re-renders a subscriber only when its snapshot
   changes. Probe: notifying all subscribers re-rendered one of two rows.

So: keep the children elements untouched (the caller's), make the context
**stable**, and let each row subscribe to its own bit mask.

## 3. Exact changes

### 3.1 `packages/components/src/list/row-state.ts` (new, pure)

```ts
/** Bits a row's paint depends on. */
export const ACTIVE = 1;
export const SELECTED = 2;
export const TABBABLE = 4;

export interface RowState {
  readonly get: (value: string) => number;
  readonly subscribe: (listener: () => void) => () => void;
  readonly replace: (next: ReadonlyArray<readonly [string, number]>) => void;
}

export const createRowState = (): RowState => ...
```

`replace` stores the next mask map, compares it with the previous one, and
notifies **only when at least one row's mask changed**. `get` returns `0` for an
unknown value. No React, no GPUix — the same shape as `core/runtime.ts`.

### 3.2 `packages/components/src/list.tsx`

- `const [rowState] = useState(createRowState)` (lazy initialiser, one per list).
- Context loses `selected`, `active`, `tabbable`; it gains `rowState`, and its
  actions become **stable**:
  - keep the existing `activate`/`noteFocus`/`register` implementations;
  - hold them in a `useRef` updated in a `useLayoutEffect`;
  - expose `useMemo(() => ({ activate: (v, e) => ref.current.activate(v, e), ... }), [])`.
  The context value is then `useMemo` over `[selectable, dense, rowState, actions]`
  — all stable for the life of the list.
- Compute the masks once per render:
  - `const selectedSet = HashSet.fromIterable(selected)` (replaces `Arr.contains`
    per row);
  - `const tabbable = tabbableValue(rows, active, selected, selectable)` (moved
    out of the context memo);
  - `const flags = Arr.map(rows, (row) => [row.value, maskFor(row)] as const)`;
  - `useLayoutEffect(() => { rowState.replace(flags) }, [flags, rowState])`.
  A layout effect runs before paint and its notifications are flushed
  synchronously, so the ring moves in the same frame the key was handled.
- Nothing else in the selection/keyboard logic changes.

### 3.3 `packages/components/src/list.tsx` — `ListItem`

- Read the mask: `const mask = useSyncExternalStore(rowState.subscribe, () => rowState.get(value))`.
- `isActive = (mask & ACTIVE) !== 0`; `isSelected = selectable && (mask & SELECTED) !== 0`;
  `isTabbable = (mask & TABBABLE) !== 0`.
- Everything else (the `StateStyle<ListItemState>`, `aria-selected`, the click
  and focus handlers) is unchanged, so no consumer sees a different API.

### 3.4 `packages/components/src/list/row-state.test.ts` (new)

Pure tests: default `0`; `replace` stores masks; identical masks notify nobody;
one changed mask notifies once; `replace` with a shorter list drops removed
values; a mask change back to `0` still notifies (a row that lost the ring).

### 3.5 `packages/components/src/perf/list.test.tsx`

Re-measure and record the numbers. Do **not** tighten the ceiling to the
measured value: wall clock on this host varies 3–4× with other agents' work
(measured 0.6 s to 2.5 s for the same code), so the ceiling stays at 5 s and the
behaviour suite's style-count case is the deterministic guard. Record the new
numbers in `docs/performance.md`, the `COMPONENTS.md` Lists row and `TODO.md`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/components test -- list` | all List logic + `row-state` tests pass; the new store test fails before §3.1 |
| `nub run --filter @gpuixui/components test:behaviour -- list` | all 38 List cases pass unchanged |
| `nub run --filter @gpuixui/components test:perf` | move ceiling met (target ≤ 700 ms) |
| `nub run --filter @gpuixui/components test:behaviour` | 517 unchanged |
| `nub run check && nub run lint && nub run test` | green |

Note: `nub run --filter … test:behaviour` collects every behaviour file; run a
single file with `cd packages/components && nub x vitest run --config
vitest.behaviour.config.ts src/behaviour/list.test.tsx` while iterating.

## 5. Test plan (and the both-direction proof)

1. Write `row-state.test.ts` first; run it: with a notify-everything stub the
   "identical masks notify nobody" case fails.
2. Apply the store and the wiring; run the List behaviour suite. It must pass
   **without edits** — if a case needs changing, STOP (§6).
3. Run the perf suite before and after the wiring on the same host and record
   both figures. The before figure is the plan-338 baseline (≥ 1,000 ms);
   temporarily revert §3.2–3.3 to reproduce it if needed.
4. Prove the perf test is live: temporarily lower the move ceiling below the
   measured-after value → it fails; restore.
5. Run the whole gate set and paste the counts.

## 6. STOP conditions

- Any List behaviour case needs a change to pass → **STOP**; the refactor broke
  an observable contract and must not "fix" the test.
- `useSyncExternalStore` updates are not flushed before the assertion point on
  this host (a focus move leaves the ring stale) → **STOP** and record the
  limitation; do not ship an async visual lag.
- The measured move does not fall below the old baseline → **STOP**; keep the
  simpler code and leave plan 338's limitation in place.
- A second `renderComponent` root or focus call is needed to make it work →
  **STOP**; that means the design is wrong.

## 7. Acceptance

- A focus move on 1,000 rows repaints **two rows**, pinned deterministically by
  counting the public `style` function in the List behaviour suite.
- The measured move is below the plan-338 baseline (≈1.0–2.1 s); on this host it
  is ≈0.6 s idle and up to ≈1.6–2.5 s under load, because native focus and the
  reconciler's walk still scale with the collection. The perf suite keeps its
  loose ceiling as an order-of-magnitude guard.
- All 38 pre-existing List behaviour cases and the rest of the suite pass
  unchanged.
- `docs/performance.md`, `docs/list.mdx` and `COMPONENTS.md` state the new
  numbers and no longer claim every row repaints.
- All gates pass.

## 8. Outcome

Landed on `agent/components` (2026-10-18).

- **Mechanism.** `src/list/row-state.ts` (pure, Effect `HashMap`/`MutableHashMap`)
  publishes `ACTIVE`/`SELECTED`/`TABBABLE` bits. `List` holds one store, computes
  the masks once per render, and publishes them in a layout effect; the context
  carries only `selectable`, `dense`, the store and three ref-delegated stable
  actions. `ListItem` reads its mask with `useSyncExternalStore`.
- **Deterministic proof.** The new List behaviour case counts `style` calls: two
  rows after a move. Reverting `src/list.tsx` to `HEAD` made the same case fail
  with all six fixture rows (`[a,b,c,d,e,f]` vs `[a,b]`); 38 other cases passed
  in both directions.
- **Numbers.** Post-fix move: 1,605 / 608 / 670 ms across three runs (idle median
  ≈0.65 s); one run under load 2,542 ms. Pre-fix: 1,037 / 2,075 ms, plus 2,718 ms
  at 2,000 rows. Wall clock is host-noise dominated; the render count is not.
  The 700 ms target from the draft was not used as an assertion — it is inside
  the noise band, so the ceiling stays at 5 s and the style-count test is the
  guard.
- **Tests.** List 39 (was 38), new `list/row-state.test.ts` 7; behaviour total
  518. All gates green.
- **Not claimed:** the remaining per-move cost (native focus plus reconciling
  1,000 children) is not removed; `docs/performance.md` and `COMPONENTS.md` say
  so, and large collections still belong in a virtualised list.
