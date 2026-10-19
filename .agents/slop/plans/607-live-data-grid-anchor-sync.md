# 607 — `live-data-grid`: reset the anchor in the row-set change, not one commit later

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `338` (`data-grid-virtual`), `377` (the toolbar's synchronous
reset), `382` (the gate-race precedent), `606` (`live-data-grid`).
**Phase:** F — the promotion gate's only failure.

## 1. Why

The full live merge gate on the plan-`606` head failed exactly one check:

```
live-data-grid  FAIL  the live sort resets the anchor
  the live sort resets the anchor: expected 0, got 45
```

Three focused `--only live-data-grid` runs pass, so this is load-dependent, like
plan `382`'s reveal race. The cause is in the probe view, not the harness:

`data-grid.tsx` resets the reader's row with a `useEffect` on
`[direction, query]`. React paints the commit that carries `sort=desc`
**before** the effect runs, so that paint still reads `anchor=45`. The scenario
waits for `sort=desc` and immediately reads the same readout, which under load
lands in that gap. The next paint carries `anchor=0`.

This is also a real consumer-facing transient: sorting from row 45 briefly
windows rows 45–53 of the new order before jumping to the top. `data-toolbar`
(plan `377`) has the stronger contract — `changeView` resets in the same click
handler — and never shows it. Adopt that shape here.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/data-grid.tsx` | replace the `[direction, query]` effect with a `restart()` helper; call it from the sort click, the filter `onChange` and `clear` so the row-set change and the anchor reset are one commit. Delete the now-unused `useEffect` import if nothing else needs it. |
| `.agents/slop/plans/README.md` | index `607`; extend the `606` row with the gate finding. |
| `PLAN.md` | one decision row (D87): a row-set change resets its virtual list in the same handler. |
| `TODO.md` | add and tick the task with the gate numbers and the exact ids run. |

No `packages/testing`, live-runner or scenario-assertion change: the check stays
exactly as plan `606` wrote it.

## 3. The change

```tsx
/** A sort or filter invalidates the reader's row: reset in the same update. */
const restart = (): void => {
  Option.match(Option.fromNullishOr(list.current?.id), {
    onNone: () => {},
    onSome: (id) => renderer?.scrollToItem?.(id, 0),
  });
  setAnchor({ index: 0, offset: 0 });
};
```

- sort: `onClick={() => { setDirection(next); restart(); }}`
- filter: `onChange={(event) => { setQuery(event.value ?? ""); restart(); }}`
- clear: `onClick={() => { setQuery(""); restart(); }}`

`jump()` is unchanged. The derived `rows` and `topId` stay where they are.

## 4. STOP conditions

- **STOP** if the headless `data-grid-virtual` control changes its check count
  or fails: the view's behaviour is the same, only the commit shape moved.
- **STOP** if a focused `--only live-data-grid` still reads `anchor=45` after
  `sort=desc`: the reset is not in the same commit and the design needs
  revisiting, not a longer wait.
- **STOP** if the full live suite shows a different failure: record it and do
  not widen a tolerance in this plan.

## 5. Test plan and two directions

```
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only data-grid-virtual
nub apps/playground/dist/live/run.js --only live-data-grid   # three times
nub apps/playground/dist/live/run.js --all                   # merge gate
```

Direction one (the fix): all of the above green. Direction two (the failure):
put the reset back in a `useEffect` and run the full live suite; the sort or
filter check must fail with `expected 0, got 45`. That reproduction is
load-dependent, so the honest evidence is the gate failure at the plan-`606`
head recorded above, not a guaranteed second occurrence. A focused run of the
old shape is expected to pass — do not claim otherwise.

## 6. Acceptance

- `data-grid-virtual` and `live-data-grid` green with unchanged check counts.
- The full live registry green on this head, and the gate numbers written into
  `TODO.md` and `COMPONENTS.md`.
- The plan index, `PLAN.md` and the TODO row record the measured cause.
