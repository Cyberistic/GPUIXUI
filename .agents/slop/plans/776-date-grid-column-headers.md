# 776 — The date grid's weekday heading is a column header

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 119, 368, 375, 396, 546, 608, 773 |
| Status | done — measured 2026-10-20: the weekday headings were seven `label` nodes in a row with no cells; they are now `columnheader`s named in week-start order. 2 native cases (41 → 43), both red at `HEAD` |
| Claimed number | `776` — `774` and `775` are the tokens-theme plans (`774-index-paragraph-counts`, `775-readme-index-counts`, `775-text-decoration-pixels`); `776` is the first number free across every worktree (checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

The day grid is a `role="grid"` of `role="row"` / `role="gridcell"`, but its
weekday headings are plain `text` nodes inside a `role="row"`. Measured
2026-10-20 in the real `TestRenderer` (`defaultOpen`,
`defaultValue="2026-10-17"`, `weekStartsOn` default `1`):

```
[["row", ""],
 ["label", "Mon"], ["label", "Tue"], ["label", "Wed"], ["label", "Thu"],
 ["label", "Fri"], ["label", "Sat"], ["label", "Sun"],
 ["gridcell", "28 September 2026"], … ]
```

So the grid's first row is an empty-named row whose children are labels, not
cells. A screen-reader user cannot tell which column a day belongs to: the
header row is a row of loose text, and `columnheader` — the role that names a
grid column — is never exposed. Every day cell is named by its full date, so the
harm is bounded to the structure a reader navigates by, not to the value it
reads.

The `text` host already carries `aria-label`, so the fix is a role, not new
markup.

## 2. The rule

**Each weekday heading is a `columnheader` named by the caller's weekday string,
in the same rotated order as the columns.** The grid's first row holds seven
column headers; every following row holds seven `gridcell`s. Nothing else about
the grid changes.

- `role="columnheader"` on the heading node; `aria-label` stays the formatted
  weekday (`Mon`, `Mo`, `So`, …).
- The order is `weekdayLabels(weekStartsOn, labels)` — the same array that
  decides the cell order, so a `weekStartsOn={0}` grid starts with `Sun`.
- A caller's rotated weekday list still flows through (`weekdayLabels`).
- The grid keeps its name, `aria-description` (including `No available dates`)
  and `aria-selected` cells.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/date-picker.tsx` | The weekday heading `text` gets `role="columnheader"` |
| `packages/components/src/behaviour/date-picker.test.tsx` | The `Picker` helper takes `weekStartsOn`; 2 native cases (41 → 43), the header bug list |
| `packages/components/docs/date-picker.mdx` | The weekday row under Accessibility, the verification count and the new cases |
| `COMPONENTS.md` | Date pickers row: count and the column-header sentence |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `776` to the D30 overflow list |
| `TODO.md` | Tick a hardening line |

No dependency, no other package. The public API does not change.

## 4. Test plan

### Native (`src/behaviour/date-picker.test.tsx`)

Each case states the bug it guards:

1. **"exposes the weekday headings as column headers"** — default open: exactly
   seven `columnheader` nodes, named `Mon … Sun` in that order; no weekday
   heading is a `label`; the grid's `role="row"` children still hold 42
   `gridcell`s. **Fails at `HEAD`** (zero column headers, seven `label` nodes).
2. **"rotates the column headers with the week start"** — `weekStartsOn={0}`:
   the seven headers read `Sun … Sat`, and the first day cell is a Sunday.
   **Fails at `HEAD`** (no column headers at all).

### Commands and expected results

```sh
# 1. Prove the new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/date-picker.test.tsx
# EXPECT: 41 pass, the 2 new cases fail.

# 2. After the fix
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/date-picker.test.tsx
# EXPECT: 43 passed.

# 3. Unit suite (inventory counts, docs test-count check)
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0, 504 in 47 files (no pure test added).

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 980 passed / 20 failed of 1000 — the same 20 recorded plan-540
# classes. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

## 5. STOP conditions

- `role="columnheader"` does not reach the accessibility tree on this binding
  (the nodes still report `label`). Stop and record the runtime limitation with
  the dump instead of inventing markup.
- Any existing date-picker case changes, or a full-suite failure appears outside
  the recorded plan-540 classes. Stop and record it.
- `776` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- The weekday heading row exposes seven named `columnheader`s in week-start
  order, and every day row keeps seven `gridcell`s.
- Both new native cases fail on the old source and pass after; the existing 41
  cases stay green.
- `docs/date-picker.mdx`, `COMPONENTS.md` and the inventory agree with the
  suite's count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
