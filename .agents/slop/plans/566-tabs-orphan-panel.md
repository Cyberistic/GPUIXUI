# 566 — A tab panel needs a live trigger

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `113`, `117`, `200`, `201`, `391`, `510`, `511`, `564` |
| Status | done — 3 native cases (Tabs 31), both-direction proof plus a disabled-gate mutation |
| Blocker | none — the assertion reads the rendered tree (`findByTestId`), so the plan-540 binding defects (box conventions, focus events) are out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`TabsContent` renders whenever the tab set's `selected` value equals its own
`value`. It never asks whether a trigger with that value is still registered.
The consequence, recorded as a limitation in `docs/tabs.mdx`,
`COMPONENTS.md` and `tabsMeta`:

> a controlled `value` that names a removed tab still renders its panel

The uncontrolled path has the same defect and is the common one: a settings
screen drops a section when the plan changes, so `TabsTrigger value="billing"`
unmounts while `selected` is still `"billing"`. Every trigger then reports
`aria-selected={false}`, the tab stop moves to a live tab (plan `511`), and yet
the removed section's panel stays painted — a region with no control that
reveals it. That is a state that cannot be reached by the user, which is exactly
what the last two Tabs fixes (plans `511`, `564`) removed elsewhere.

The fix is one rule: **a panel renders only while a live trigger with its value
is registered**. The selected value itself is not rewritten — a controlled
`value` stays the app's, and the uncontrolled selection may legitimately point
at a removed tab (plan `511` already keeps it). This plan only stops the view
from inventing a tab that no longer exists.

Scope:

- gate `TabsContent` on a registered trigger with the same value (a disabled
  trigger still counts — a disabled selected tab keeps its panel, which the docs
  promise);
- prove the gate with native cases that fail today;
- sync the docs, the inventory limitation, `COMPONENTS.md`, `TODO.md` and the
  plan index.

**Out of scope** (do not change): selection, the roving tab stop, focus
handover, `activation`, panel naming, ARIA (0.10.0 has no `aria-controls`), and
the controlled/uncontrolled contract.

## 2. What exists today (read these first)

- `packages/components/src/tabs.tsx` → `TabsContent`:

  ```tsx
  const { rows, selected } = useTabsContext();
  ...
  if (selected !== value) return null;
  ```

  `rows` is already read for the panel name, so the live check needs no new
  context.

- `TabsTrigger` registers its row in a `useLayoutEffect`
  (`register({ value, id, ... })`) and updates it in place afterwards. A
  trigger that unmounts removes its row; a disabled trigger stays registered.
- `packages/components/src/behaviour/tabs.test.tsx` — 28 native cases. Its
  `dynamicTabs(values, options)` fixture renders one trigger and one panel for
  every value in `values`, so removing a value from the array removes both.
  `renderComponent`/`rerender` and `clickCentreOf` are already imported.
- `packages/components/docs/tabs.mdx` — "A tab that changes" ends with the
  limitation; the API table says a panel is "mounted only while selected"; the
  Verification section says "(28 tests)".
- `packages/components/src/tabs.tsx` → `tabsMeta.limitations` has the
  `"a controlled value that names a removed tab still renders its panel: the
  value is the app's"` entry.
- `COMPONENTS.md` → Tier 2 → Tabs: 28 native tests and the same limitation in
  its Notes column.
- `packages/components/src/inventory.test.ts` holds the docs/`COMPONENTS.md`
  test count to the suite, so both counts change in the same commit.

## 3. Design

### 3.1 The gate (`tabs.tsx`, `TabsContent`)

```tsx
const isLive = Arr.some(rows, (row) => row.value === value);
if (selected !== value || !isLive) return null;
```

- `rows` is the registration list, so "live" means "a `TabsTrigger` with this
  value is mounted". It deliberately does **not** test `!row.disabled`: a
  disabled selected tab is still a real tab and keeps its panel (docs and the
  existing plan-511 rule). An `if` on registration effects could not express
  that distinction without duplicating the registry.
- Registration happens in a layout effect, so the panel is absent for the
  synchronous render pass that precedes it and present by the first painted
  frame. Do not add a "rows are still empty" special case: an empty registry
  means there is no tab to own a panel, which is the rule.
- The selected value is untouched. A controlled consumer that wants another
  panel changes `value`; an uncontrolled set shows nothing until a trigger for
  the value returns. Removing the trigger and re-adding it restores the panel.

Update the comment above the check to say the panel follows the live tabs, not
just the value.

### 3.2 The name fallback

`TabsContent` currently falls back to the value when no registered row matches
(removed trigger). With the gate, that branch is only reachable for a composed
trigger whose plain text yields no name. Rename the comment accordingly; the
fallback behaviour itself stays.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/tabs.tsx` | the live gate and its comment; `tabsMeta.limitations` replaces the removed-tab entry with the new contract |
| `packages/components/src/behaviour/tabs.test.tsx` | three native cases (§5.1) and the guarded-bug header line |
| `packages/components/docs/tabs.mdx` | the "A tab that changes" rule, the API table row, the accessibility fallback sentence and the count `28 → 31` |
| `COMPONENTS.md` | the Tabs row: `28 → 31` native tests and the live-panel contract |
| `TODO.md` | add and tick the Phase C hardening row (§7) |
| `.agents/slop/plans/README.md` | index this plan after `565` with the measured counts |
| `.agents/slop/plans/566-tabs-orphan-panel.md` | this plan |

Touch nothing outside `packages/components/**`, `COMPONENTS.md`, `TODO.md` and
`.agents/slop/plans/**`.

## 5. Test plan

Extend the suite header comment with the guarded bug: **a selected value that
names a removed tab kept painting its panel, so the tab set revealed a region no
trigger could select.**

### 5.1 Native (`src/behaviour/tabs.test.tsx`, real `TestRenderer`)

The `dynamicTabs` fixture unmounts a removed value's **content** along with its
trigger, so it cannot express the orphan case. Use a local fixture whose
`TabsContent` stays mounted while only the trigger is conditional.

1. **A removed trigger takes its panel with it (uncontrolled).**
   Render a set with `defaultValue="billing"`, a permanent `profile` trigger,
   and a `billing` trigger gated by a `showBilling` argument; both panels are
   always rendered. Assert `panel-billing` is shown, rerender with
   `showBilling=false` and assert both panels are absent, then rerender with
   `showBilling=true` and assert `panel-billing` returns — the selection was
   never rewritten, so restoring the trigger restores the panel.
   *Fails today*: `panel-billing` stays painted after the first rerender.
   (Measured: a `dynamicTabs`-based draft passed on the old code because the
   fixture removed the content too, so it proved nothing.)
2. **A controlled value with no trigger paints nothing.**
   Render `<Tabs value="other">` with a `profile` trigger and a `TabsContent`
   value `"other"`; assert `findByTestId("panel-other")` is `undefined`, and
   that `tab-profile` reports `aria-selected: false`.
   *Fails today*: the panel is painted.
3. **A disabled selected trigger keeps its panel (pin).**
   Render a two-tab set whose selected tab is `disabled`; assert its panel is
   still shown and the other panel is not. This passes before and after the
   gate and fails if the gate is written as `!row.disabled` instead of "row
   exists".

Expected: the suite grows from 28 to 31 passing cases; existing cases unchanged.

### 5.2 Both directions (AGENTS §3)

1. Apply §3.1 and run the suite: 31 pass.
2. Revert only the `!isLive` half of the condition: cases 1 and 2 fail, case 3
   passes.
3. Reapply, then change the gate to `Arr.some(rows, (row) => row.value === value && !row.disabled)`:
   case 3 fails. Restore.
4. Record each observed failure in the commit message; never claim a direction
   that was not run.

### 5.3 Regression

- the 28 existing tabs cases pass unchanged;
- `src/behaviour/theme-matrix.test.tsx` still covers Tabs;
- `nub run --filter @gpuixui/components test` passes with the synced inventory
  and docs counts;
- `nub run check` and `nub run lint` pass.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/tabs.test.tsx                          # 26 passed, 5 failed
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/tabs.test.tsx \
  -t "takes a panel|controlled value has no trigger|disabled selected"
                                                       # 3 passed
cd ../..
nub run --filter @gpuixui/components test              # unit suite passes
nub run --filter @gpuixui/components check-types       # exit 0
nub run check                                          # exit 0
nub run lint                                           # exit 0
```

Measured 2026-10-19: the file has 31 cases; 26 pass and the 5 failures are the
pre-existing plan-540 binding focus/blur cases ("runs a caller onBlur…",
"takes focus and the ring off a tab that becomes disabled", "hands focus to the
selected tab…", "does not change the selection when it hands focus over",
"does not select the tab it lands on…"). They fail at `HEAD` without this
change. The full `test:behaviour` run carries the same class of failures
(`TODO.md` → Interlocks); never report the full native suite green unless it is.

## 7. Docs, inventory and TODO

- `docs/tabs.mdx`:
  - "A tab that changes": replace the removed-tab paragraph with the new rule —
    a panel renders only while a live trigger with its value is registered; a
    removed trigger takes its panel with it; the selection is not rewritten, so
    re-adding the trigger brings the panel back; a disabled selected tab keeps
    its panel.
  - API table: `TabsContent` — "renders only while a live trigger with this
    value is registered".
  - Accessibility: drop "and a controlled `value` whose trigger was removed"
    from the value-fallback sentence (the gate makes it unreachable); keep the
    composed-trigger fallback.
  - Verification: `(28 tests)` → `(31 tests)` and name the three cases.
- `src/tabs.tsx` → `tabsMeta.limitations`: remove the removed-tab entry and add
  "a panel renders only while a live trigger with its value is registered".
- `COMPONENTS.md` Tabs row: `28 → 31 native behaviour tests`; replace the
  trailing removed-tab sentence with the live-panel contract.
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick `A tab panel needs a live trigger — plan 566; 3 native cases (Tabs 31),
  both-direction proof; docs, COMPONENTS.md and the inventory synced`.
- Plan index: add `566` after `565`.

## 8. STOP conditions

Stop and report instead of improvising when:

- the first rendered frame shows no panel even after the trigger's layout effect
  has run (the gate is reading a stale registry — report, do not add a timing
  hack);
- an existing tabs case changes for a reason other than the removed-tab cases;
- a caller `aria-label` panel-name case fails (the name path must not depend on
  the gate);
- the count check fails because a count was not synced (fix the count, not the
  check);
- the new cases pass on the old implementation (the fixture unmounted the
  content too — keep the content mounted and remove only the trigger);
- any failure beyond the five measured plan-540 focus cases appears in the
  scoped file run (name it and stop).

## 9. Acceptance

- no `tabpanel` is painted without a live trigger of the same value;
- a disabled selected trigger still keeps its panel;
- restoring a removed trigger restores its panel without any selection change;
- 31 native tabs cases pass; unit, inventory, type, lint and format gates pass;
- `docs/tabs.mdx`, `COMPONENTS.md`, `tabsMeta`, `TODO.md` and the plan index
  agree with the measured counts.
