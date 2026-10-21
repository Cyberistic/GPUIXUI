# Plan 837 — A toast raised from a closing surface returns focus where the user was

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 115, 117, 322, 370, 548, 592, 770, 816, 820, 823, 824, 826, 827, 830, 832 |
| Status | planned — measured defect, fix and tests specified below |
| Claimed number | `837` — `832` is this workstream's last plan; `833`–`836` are taken by `tokens-theme` and the `playground` (checked in every worktree on 2026-10-21) |

## 0. Why this plan exists — the measured defect

Plan 830 taught a toast action to name the control that raised the toast as its
own focus successor, so a dialog opened from the action returns to the raising
control. It read that origin **once**, when the card arrived, and only wrote the
mark when the origin still existed at action time:

```ts
if (leaving && origin !== null && origin !== actionHost &&
    renderer?.getElementBounds?.(origin) !== null) {
  markFocusSuccessor(actionHost, origin);
}
```

A very common toast is raised by a control that its own surface removes in the
same gesture: a menu row ("Delete" → "Undo"), a popover control ("Save" → "Undo"),
a command-palette action ("Archive" → "Undo"). The origin is gone by the time the
user presses the action, so **no mark is written** and the action's modal restores
to nothing.

Measured in this worktree on 2026-10-21 against `HEAD` `a168e91b` with the
in-flight probe (`src/behaviour/zz-probe.test.tsx`, deleted after the measurement),
through real presses and Escape:

```text
menu row      "Delete" raises a toast, menu closes; action → dialog; Escape
              → focused host None          (expected menu-trigger)
popover       "Save" raises a toast, panel closes; action → dialog; Escape
              → focused host None          (expected filter-trigger)
palette       "Archive" raises a toast, palette closes; action → dialog; Escape
              → focused host None          (expected open-palette)
```

The same probe measured two composite shapes that already work and become pins:

```text
drawer opened from a dialog control; Escape → drawer closes, focus open-drawer
dropdown menu inside a popover panel; a row closes the menu, the panel stays
```

## 1. The rule

**A toast resolves its origin when its action runs: the raising control while it
still exists, otherwise the focus successor its closing surface already named for
it.**

- The successor channel is the one plans 826/827/830/832 use. A menu that closes
  on a row names the row's trigger, a popover or navigation surface closed by its
  own control names its trigger (plan 832), and a closing modal names the opener it
  restores to (plan 827). The toast is simply the last reader of a mark that the
  surface wrote when it closed.
- One link is enough: every measured surface writes `vanishing control → its
  trigger/opener` in one hop, so the rule reads that mark once (the same single
  read `useModalFocus` makes). A chain walk was drafted and cut — no measured case
  needs a second link, and it would be unexercised generality.
- A mark is keyed by the id of a vanished element and the store is bounded, so a
  toast can only resolve to something that surface named; it can never invent a
  target. A dead end stays dead: the action's modal then restores as it does today
  (the enclosing surface, else nowhere) and the limitation is documented.
- The toast's own pin is unchanged: a neighbour card that took focus still wins,
  and a toast raised from nothing focused still leaves focus alone when the last
  card leaves (plans 770/830).
- No component other than `ToastCard` changes: every surface already writes the
  mark. The fix is one resolution rule in the successor store plus the toast's
  use of it.

## 2. Exact files to change

1. `packages/components/src/internal/focus-successor.ts` — `resolveFocusTarget`.
2. `packages/components/src/toast/viewport.tsx` — resolve the origin at action time.
3. `packages/components/src/internal/focus-successor.test.ts` — 5 pure cases.
4. `packages/components/src/behaviour/composition.test.tsx` — three composite
   cases and two pins.
5. `packages/components/docs/toast.mdx` — the origin paragraph, and its native
   test count.
6. `docs/component-api.md` §5 — the toast origin as the last reader of a
   successor mark.
7. `COMPONENTS.md` — the Toast row (behaviour text and count).
8. `TODO.md` — add and tick the task under Tier 2 hardening.
9. `.agents/slop/plans/README.md` — the index row for `837`.
10. `PLAN.md` D30 — record `837`.

## 3. Implementation

### 3.1 `src/internal/focus-successor.ts`

```ts
/**
 * The element a late reader should focus: `from` while it still exists,
 * otherwise the successor the surface that removed it named — provided that
 * target is live too.
 */
export const resolveFocusTarget = (
  from: number,
  exists: (id: number) => boolean,
): Option.Option<number> =>
  exists(from)
    ? Option.some(from)
    : Option.filter(takeFocusSuccessor(from), exists);
```

A mark is keyed by the id of a vanished element, which cannot recur in one
renderer, so reading it here cannot retarget a different control.

### 3.2 `src/toast/viewport.tsx`

Replace the bounds check in the action handler with the resolution:

```ts
const liveOrigin = Option.filterMap(Option.fromNullishOr(origin), (id) =>
  resolveFocusTarget(id, (target) =>
    renderer?.getElementBounds?.(target) !== null,
  ),
);
```

and mark against `liveOrigin`:

```ts
if (leaving && Option.isSome(liveOrigin) && liveOrigin.value !== actionHost) {
  markFocusSuccessor(actionHost, liveOrigin.value);
}
```

Nothing else in the card changes: `focusNeighbour` still runs first, `origin` is
still captured when the card arrives, and the caller's handler still runs last.

### 3.3 Tests

`src/internal/focus-successor.test.ts` (pure, `beforeEach(clearFocusSuccessors)`):

- an existing origin resolves to itself and leaves its mark unread (mark 4 → 9,
  `exists(4)` → `Some(4)`, then `takeFocusSuccessor(4)` → `Some(9)`);
- a vanished origin follows its mark (`exists: (id) => id === 9` → `Some(9)`);
- a mark that points at a vanished element reports `None`;
- a vanished origin with no mark reports `None`.

`src/behaviour/composition.test.tsx` — three fixtures probing the measurement:

- `DialogFromMenuToast`: the menu row raises a toast and the menu closes; press
  the action; Escape → `Some("menu-trigger")`.
- `DialogFromPopoverToast`: the popover control raises a toast and the app closes
  the panel; press the action; Escape → `Some("filter-trigger")`.
- `DialogFromCommandToast`: a palette action raises a toast; press the action;
  Escape → `Some("open-palette")`.
- Pin: the existing plan-830 case (a toast raised from a button that stays open)
  still returns to `raise`.
- Pin: a toast raised with nothing focused (rendered and pushed from an effect
  while no host holds focus) still leaves focus `None` after its action's dialog
  closes.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Add the three composite cases first, restore the old source and measure the
   red: `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx`
   → **expected:** the three new cases fail with `None`; the two pins pass
   (composition 21 → 24 with 3 failed). Record the exact output in §7.
2. Apply §3.1–§3.2 → composition 26/26.
3. Unit: `nub x vitest run src/internal/focus-successor.test.ts` → 12 cases
   (7 existing + 5 new) green.
4. **Both directions**, restoring after each:
   - revert only the toast wiring → the three composite cases fail again;
   - resolve without the origin's liveness (`takeFocusSuccessor` only) → three
     pure cases fail and the plan-830 case loses its live origin;
   - resolve to the mark without the target's liveness check → the
     "marked target is gone too" case fails (nothing may be invented).
5. The touched suites:
   `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/{composition,toast,dropdown-menu,popover,command-menu}.test.tsx`
   → no new failure beyond the recorded plan-540 classes.
6. `nub x vitest run` → the unit suite gains 5 cases (target: 49 files).
7. From the repo root: `nub run check`, `nub run lint`, `nub run test` → **all
   exit 0**.
8. Scoped smoke: `nub apps/playground/dist/smoke/run.js --only overlay-dialog`
   and `--only modal-focus-trap` → green. End of task (shared helper): the full
   headless suite → **17/20** with the three recorded binding failures.

**STOP conditions.** Stop and report instead of improvising if:

- a new case passes at `HEAD` — the measurement is wrong; re-run the probe before
  changing anything;
- the palette case has no mark to follow (the origin is the palette input, not a
  row) and the one-hop resolution does not reach `open-palette` — record what the
  store holds and stop; do not add a second origin channel;
- the resolution ever lands on the toast's own action host or on a card control —
  that is a retarget, not a resolution;
- the plan-830 case, the neighbour-focus case (plan 770) or the last-card case
  changes, because those are the toast's own documented rules.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| pure: a live origin wins | the resolution preferring existence over a stale mark |
| pure: one hop | the mark being read, not just the origin |
| pure: dead end / no mark | no invented target |
| composition: menu "Delete" → toast action → dialog | the measured defect's first surface |
| composition: popover "Save" → toast action → dialog | the plan-832 mark being readable by a later gesture |
| composition: palette "Archive" → toast action → dialog | a mark written by a closing modal (plan 827) |
| pins: the raising button that stays, and no origin at all | plans 830/770 unchanged |
| toast, dropdown, popover, command-menu suites | no other focus rule moved |
| unit suite | the store's read/limit tests still hold |

## 6. Acceptance criteria

- The three composite cases fail at `HEAD` with `None` and pass after; both pins
  pass in both directions; each mutation in §4.4 fails its named case.
- `check`, `lint`, `test` exit 0; the touched behaviour suites are green apart
  from the recorded plan-540 classes, with no new failure.
- `docs/toast.mdx`, `docs/component-api.md` §5, `COMPONENTS.md`, `TODO.md`, the
  plan index and `PLAN.md` D30 state the rule and its limit: a target that is gone
  (no mark, or a mark to a vanished element) leaves focus where it is today.
- Scoped smoke ids are green and recorded; the full headless suite is 17/20 with
  only the three recorded binding failures.

## 7. Outcome (2026-10-21)

- **Measured at `HEAD` `a168e91b`** with a scratch probe (deleted): a toast raised
  from a **menu row**, a **popover control** and a **palette action** each left
  the focused host on `None` after the action's dialog closed, because the raising
  control was gone when the action ran and the card only marked an origin that
  still existed. Two shapes measured green and became pins: a drawer opened from a
  dialog control (Escape closes the drawer, returns `open-drawer`) and a dropdown
  menu inside an open popover panel (a row closes the menu, the panel stays).
- **The chain was cut to one hop.** The first draft followed a successor chain;
  no measured case needs two hops (a single link is what every closing surface
  writes: row → trigger, field → opener, control → trigger), so the shipped rule is
  `origin while live, else its mark while that target is live, else nothing` — one
  function, no walk, no bound to reason about.
- **Red before the fix.** With `src/toast/viewport.tsx` reverted and the tests
  kept, composition is **22 failed / 3 passed** of 25 in that file for the new
  cases — the three new composite cases and the plan-830 case (which shares the
  wiring) fail with `None`; the no-successor pin stays green in both directions.
- **After the fix.** Composition **25/25**. Unit `focus-successor.test.ts` 11/11
  (7 store cases + 4 resolution cases).
- **Both directions proven.** Reverting the toast wiring fails the four cases
  above. Resolving without the origin's liveness (`takeFocusSuccessor` only)
  fails three pure cases. Resolving without the target's liveness fails the
  "marked target is gone too" case, so the rule cannot invent a target.
- **Full native suite.** **1068 passed / 20 failed of 1088** — the 20 recorded
  plan-540 classes (position, native focus signals and the command-menu scroll),
  diffed against a run with this plan's sources reverted (1065/23 of the same
  1088: the same 20 plus the three new cases). One earlier run reported 21 with
  the same file set; a rerun matched the 20 exactly, the sampler flake plans
  779/782 already record.
- **Gates.** `nub run check`, `nub run lint`, `nub run test` exit 0; unit **532
  tests in 49 files** (528 + 4).
- **Scoped smoke.** `overlay-dialog` 1/1 and `modal-focus-trap` 1/1 green; the
  full headless suite is **17/20** with the same three recorded playground
  failures (`focus-traversal`, `floating-placement`, `shell-navigation`).
- Docs (`toast.mdx`), `docs/component-api.md` §5, `COMPONENTS.md` (the Toast
  row), `TODO.md`, the plan index and `PLAN.md` D30 synced; the probe was deleted.

### Deviations from §3

- §3.1/§3.3 specified a chain walk with the store's bound; the outcome above cuts
  it to one hop because no measured surface produces a second link. The deviation
  is a simplification, not a gap.
- The "no origin" pin is a control that removes itself and names no successor
  rather than a toast pushed with nothing focused: pushing from a child's mount
  effect races the provider's action-registry prune, so the card arrived without
  its action (a separate provider-timing observation, recorded here and not
  fixed by this plan).

