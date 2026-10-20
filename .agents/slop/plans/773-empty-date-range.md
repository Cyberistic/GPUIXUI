# 773 — An empty date range is inert, not a dead tab stop

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 112, 119, 127, 303, 368, 375, 396, 603, 612 |
| Status | pending |
| Claimed number | `773` — the first free number across every worktree at claim time (`770`/`772` are this workstream's, `771` is the playground's; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

`docs/date-picker.mdx` already promises that `min` after `max` leaves the grid
visible and inert. It is inert — but it is a **keyboard trap**: the grid's only
tab stop is a day that cannot be chosen, opening moves native focus onto it, no
arrow moves off it, Enter reports nothing, and the accessibility tree never says
why.

Measured 2026-10-20 in the real `TestRenderer` (scratch probe
`src/behaviour/zz-probe.test.tsx`, `value="2026-05-20"`, `min="2026-06-10"`,
`max="2026-06-01"`, `defaultOpen`):

```
stops: [["date-day-2026-06-01", "1 June 2026, unavailable"]]
focus: "date-day-2026-06-01"           # focus is moved onto the inert cell on open
grid:  [["Calendar", null]]            # nothing explains why no day can be picked
cells: 42                              # every cell unavailable
```

Why every key is stuck: `clampToBounds` cannot satisfy both bounds, so any day
clamps to `max` — which is before `min`, hence unavailable — and the next arrow
clamps to the same day again. The month chooser repeats the defect: the month
label still opens it, and its tab stop is an unavailable month
(`tabIndex` is not gated on `available`).

This is the plan-612 family (a surface the user cannot operate), except the
surface is *not* `disabled`: the component must say what it is instead of
silently stealing focus.

## 2. The rule

**When the bounds leave no available day, the calendar has no tab stop, takes no
focus on open, announces `No available dates`, and cannot be steered into the
month chooser.** A range with at least one available day behaves exactly as
today.

- The day grid's tab stop is a day only when it is available:
  `tabStopOf(candidate, bounds)` — clamp, then keep only when `isAvailable`.
- Opening does not focus a day that cannot be chosen; with no tab stop, focus
  stays where the user left it (the trigger), so Escape still closes the picker.
- The grid carries `labels.noAvailableDays` through `aria-description`
  (`No available dates` by default, joined with `Disabled` when the surface is
  also disabled by the plan-612 rule).
- The month label's control is `disabled` when no month has an available day, so
  the inert chooser cannot be entered; an unavailable month is never a chooser
  tab stop either.
- A day that is unavailable is still painted (muted, `not-allowed`, named
  `, unavailable`) — the grid's content does not disappear.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/date-picker/calendar.ts` | `tabStopOf(day, bounds): Option<DateTime>`; `CalendarLabels.noAvailableDays` + its English default |
| `packages/components/src/date-picker.tsx` | Day grid: the tab stop is the `Option`, `tabIndex` is gated on it, the open/focus effect never focuses an unavailable day, the grid describes `noAvailableDays` when the range is empty; month chooser: `tabIndex` gated on `available`, the pending-focus effect gated on it, the month label disabled when no month is available |
| `packages/components/src/date-picker/calendar.test.ts` | 1 label default + 3 `tabStopOf` cases |
| `packages/components/src/behaviour/date-picker.test.tsx` | 4 native cases (37 → 41), the header's bug list |
| `packages/components/docs/date-picker.mdx` | The empty-range rule under Bounds, the new label, the keyboard tab-stop sentence, the verification count |
| `COMPONENTS.md` | Date pickers row: the empty-range rule and the count |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `773` to the D30 overflow list |
| `TODO.md` | Tick the hardening line under the Tier 2 hardening list |

No dependency, no other package. The public API gains one optional label key
(`labels.noAvailableDays`); nothing else changes shape.

## 4. Test plan

### Pure (`src/date-picker/calendar.test.ts`)

1. **"defaults to the English strings"** — extended: `noAvailableDays` reads
   `"No available dates"` (guards the new default against being blank).
2. **`tabStopOf` keeps an available candidate** — `tabStopOf(day("2026-10-18"),
   boundsOf("2026-10-17", "2026-10-20"))` is `2026-10-18`; a candidate before the
   bound clamps to `2026-10-17` (still available).
3. **`tabStopOf` refuses an inverted range** — `tabStopOf(day("2026-06-01"),
   boundsOf("2026-06-10", "2026-06-01"))` is `None`, the exact case that used to
   return the inert `max`.
4. **`tabStopOf` is unbounded when the bounds are** — `tabStopOf(anything,
   unbounded)` is the candidate.

### Native (`src/behaviour/date-picker.test.tsx`)

Each case states the bug it guards:

1. **"gives an empty range no tab stop and says why"** — reversed bounds, open:
   no `date-day-*` element has `tabIndex 0`; every cell is still painted and the
   `date-day-2026-06-01` cell is still named `1 June 2026, unavailable`; the grid
   node's `description` is `No available dates`. **Fails at `HEAD`** (one tab stop,
   no description).
2. **"does not move focus into an empty range"** — the same fixture with
   `defaultOpen`: `focusedTestId` is the trigger, not a `date-day-*` host, and
   `Enter` calls nothing. **Fails at `HEAD`** (focus sits on
   `date-day-2026-06-01`).
3. **"cannot open the month chooser when no month is available"** — press
   `date-month`: no `date-month-*` cell is rendered, and the month label is
   announced `Disabled`. **Fails at `HEAD`** (the chooser opens on an inert
   month tab stop).
4. **"keeps the tab stop and the chooser for an open range"** — valid bounds (the
   existing fixture): the selected day is the only grid tab stop with
   `tabIndex 0`, the month chooser opens, and its viewed month is its tab stop.
   Pin: this passes at `HEAD` and guards against over-disabling.

### Commands and expected results

```sh
# 1. Prove the new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/date-picker.test.tsx
# EXPECT: 37 pass, the 3 new empty-range cases fail, pin 4 passes.

# 2. After the fix
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/date-picker.test.tsx
# EXPECT: 41 passed.

# 3. Pure suite (inventory counts, docs test-count check)
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0, 500 + the new pure cases in 47 files.

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 978 passed / 20 failed of 998 — this turn's baseline is 974 passed /
# 20 failed of 994 plus the four new passes, the same 20 recorded plan-540
# classes. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Delete `src/behaviour/zz-probe.test.tsx` before the first commit.

## 5. STOP conditions

- Any of the three empty-range cases passes at `HEAD`. Stop and re-measure.
- The day grid loses its tab stop for an *open* range, or the normal picker opens
  without focusing its selected day. Stop: the gate is `isAvailable`, not "empty
  range" arithmetic.
- The empty grid is announced `Disabled` without also saying `No available
  dates`. Stop: the surface is enabled; only the range is empty.
- An arrow key still moves focus onto an unavailable day, or `Enter` reports one.
- Any existing date-picker case changes, or a full-suite failure appears outside
  the recorded plan-540 classes. Stop and record it.
- `773` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- An inverted `min`/`max` yields a visible, inert grid with no tab stop, no focus
  theft on open, `No available dates` in the accessibility tree, and no way into
  the month chooser; a valid range is unchanged.
- The three new native cases fail on the old source and pass after; the pin
  passes both ways; the existing 37 cases stay green.
- `docs/date-picker.mdx`, `COMPONENTS.md` and the inventory agree with the
  suite's count; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
