# 759 — A mention row activates on release, like every other button-shaped part

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 319, 332, 334, 399, 522, 640, 754 |
| Status | done — measured 2026-10-20: both new native cases red at `HEAD` (`mentions: [ [ "ana" ] ]` on the dragged press, `[ [ "anna" ] ]` on the Space press) and green after; Mention input 20/21 (its one recorded plan-540 caller-focus case), unit 493 in 46 files, full native suite 957/20 of 977 with the **same 20** failures as the baseline (diffed) |
| Claimed number | `759` — the first free number across every worktree at claim time (`756`–`758` are claimed by this workstream and the tokens workstream; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

`MentionInputItem` draws `role="button"` and is documented as "a selected button
row", so the package's activation contract applies to it: **Enter activates on
key down, Space on key up, and a pointer activates on the release (a click)** —
`docs/component-api.md` §4, plans 332, 334 and 640. Two other parts were
migrated to it after a measured defect: the colour swatch (plan 640) and the
chip's removal control (plan 334).

The mention row was missed on both halves. Measured 2026-10-20 in the real
`TestRenderer` (`src/behaviour/zz-probe2.test.tsx` during this turn):

```
# press on the row, release 100+ px away over `elsewhere`
expected { mentions: [] }
received { mentions: [ [ "ana" ] ] }

# Space key down on the focused row
expected { afterPress: [] }
received { afterPress: [ [ "anna" ] ] }
```

The source is explicit:

```tsx
onMouseDown={(event) => {
  onMouseDown?.(event);
  select(value);            // selects on the press
}}
onKeyDown={(event: EventPayload) => {
  onKeyDown?.(event);
  if (isDismiss(event)) { claimEvent(event); close(); return; }
  if (isActivation(event)) select(value);   // Enter *and Space* on key down
}}
```

Two user-visible consequences:

- **A cancelled press still inserts.** The user presses a suggestion, decides
  against it and drags the pointer off before releasing — the mention is still
  inserted and the list closes. Every other pressable row in the package
  (`ListItem`, `PaginationItem`, menu rows, notification rows) selects on
  `click`.
- **Space cannot be cancelled.** A keyboard user who reaches a row with `Tab`
  and presses Space inserts on the press; focus cannot be moved away before the
  release. That is exactly the bug plan 640 fixed for the colour swatch.

The `isActivation` doc comment is explicit that it belongs to composite rows and
cells, *not* button-shaped controls: "Space keeps its listbox/grid meaning here;
a button-shaped control uses `isSpaceRelease` instead." The mention row is a
button, not a grid cell.

## 2. The rule

`MentionInputItem` uses the shared button-shaped helper, `activationHandlers`
(`src/internal/activate.ts`), and a `click`:

```tsx
const keyHandlers = activationHandlers(() => select(value), {
  onKeyDown: (event) => {
    onKeyDown?.(event);
    // A focused row can be the surface the user dismisses from; the claim
    // keeps an enclosing dialog open for the next Escape (plan 399).
    if (isDismiss(event)) {
      claimEvent(event);
      close();
    }
  },
  onKeyUp,
});
…
onMouseDown={(event) => onMouseDown?.(event)}   // forwarded, never an action
onClick={(event) => {
  onClick?.(event);
  select(value);
}}
{...keyHandlers}
```

Ordering follows the shared helper's documented rule ("the action runs before
the caller's key handler"): Enter selects, then the caller's `onKeyDown`; Space
selects on release, then the caller's `onKeyUp`. The Escape branch keeps its
current order (caller's handler, then claim and close) and the claim that keeps
an enclosing dialog open (plan 399). The caller's `onMouseDown`, `onClick`,
`onKeyDown` and `onKeyUp` are all still composed — a caller handler is never
replaced (plans 331/696).

Nothing else changes: the highlight, the query, the disabled field, the ring
sampling and the row's role stay as they are. `isActivation` stops being
imported by this file.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/mention-input.tsx` | `MentionInputItem`: drop `isActivation`, add `activationHandlers`, move the action from `onMouseDown` to `onClick`, destructure and compose `onClick`/`onKeyUp`; update the part's JSDoc sentence |
| `packages/components/src/behaviour/mention-input.test.tsx` | 2 new native cases (§4) and the header comment's bug list |
| `packages/components/docs/mention-input.mdx` | key table gains Space and states the click/release rule; verification count 19 → 21 |
| `COMPONENTS.md` | Mention input row: the activation sentence and the counts |
| `.agents/slop/plans/README.md` | index this plan in the components table |
| `PLAN.md` | append `759` to the D30 overflow list |
| `TODO.md` | tick the new hardening line with the plan number |

No other package is touched, no dependency is added, and no public API changes.

## 4. Test plan

### Native (`src/behaviour/mention-input.test.tsx`)

The bug each case guards is stated in its comment:

1. **"does not insert a mention when a press is dragged off the row"** — type
   `@an`, `nativeSimulateMouseDown` at `row-ana`'s centre,
   `nativeSimulateMouseUp` at `elsewhere`'s centre; `onMention` has not been
   called and the list is still open. **Fails at `HEAD`** with `[ "ana" ]`.
2. **"inserts a mention on Space release, not on press"** — type `@an`, focus
   `row-anna` with `renderer.focusElement`, `nativeSimulateKeyDown(row, "space")`
   → `onMention` not called; `nativeSimulateKeyUp(row, "space")` → called once
   with `"anna"` and the value is `@anna `. **Fails at `HEAD`** at the first
   assertion.
3. **Pins** (existing cases, unchanged): "inserts a pressed row" proves the
   click path still inserts exactly once, "composes the caller's row handlers"
   proves `onMouseDown`/`onKeyDown` still reach the caller, and "closes from a
   focused row without closing the dialog" proves the Escape claim survives.

### Commands and expected results

```sh
# 1. Prove the two new cases fail on the old source (before the fix)
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/mention-input.test.tsx
# EXPECT: 2 failed | 19 passed (21)

# 2. After the fix, the same file
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/mention-input.test.tsx
# EXPECT: 21 passed (21)

# 3. The pure suite is unchanged (no pure logic moves)
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0

# 4. End-of-task native run (the file is the only one changed, but every
#    suite is counted)
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 957 passed / 20 failed of 977 — the baseline measured this turn is
# 955 passed / 20 failed of 975 (the probe files are deleted before the run)
# and the two new cases pass. Record the exact numbers.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0
```

Record the exact totals in the status row of this plan, `TODO.md` and the
README index. Delete `src/behaviour/zz-probe.test.tsx` and
`src/behaviour/zz-probe2.test.tsx` before the commit.

## 5. STOP conditions

- Case 1 or 2 passes at `HEAD`. The fix is then not proven: stop and re-measure
  rather than keeping a test that cannot fail.
- The click path does not insert in the `TestRenderer` after the change
  (`nativeSimulateMouseDown` → `nativeSimulateMouseUp` on the same row). The
  runtime may not deliver a click to a role-bearing `div`; if so, stop and
  report the measurement — do **not** keep `onMouseDown` and claim the contract.
- The Escape claim stops working (an Escape from a focused row closes the
  enclosing dialog too). Stop; the composition order is wrong.
- Any other mention case changes its report, or a full-suite failure appears
  outside the recorded plan-540 classes. Stop and record it instead of
  adjusting a test.
- `759` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  plan's header.

## 6. Acceptance criteria

- A mention row inserts on `click`, not on the press; a press dragged off the
  row inserts nothing and leaves the list open.
- `Space` inserts on release only; `Enter` still inserts on press.
- The row's caller `onClick`/`onMouseDown`/`onKeyDown`/`onKeyUp` are composed,
  each once per event.
- Escape from a focused row still closes the list and claims the event.
- `docs/mention-input.mdx`, `COMPONENTS.md` and the inventory agree with the
  suite's count; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
