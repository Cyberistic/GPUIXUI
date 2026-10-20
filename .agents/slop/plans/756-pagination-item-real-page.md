# 756 — Pagination: a bare item never reports a page the control does not have

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 113, 117, 300, 611 |
| Status | done — 2 native cases red at `HEAD` (`[9]` and `Page 2.9`) and green after; 5 pure + 2 native cases, Pagination 20/20, unit 493 in 46 files, full native suite 955/20 of 975 (the same plan-540 classes, diffed against the baseline) |
| Claimed number | `756` — the first free number across every worktree at claim time (`755` was the highest; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

`Pagination` documents one invariant for its controls: they report **only real
pages**. Plan 611 enforced it for `PaginationPrevious`/`PaginationNext` (a
caller's `disabled={false}` cannot re-enable an edge, and neither control
reports `0` or `pageCount + 1`), and the root normalises `page` and `pageCount`
once (`pageCountOf`, `currentPageOf`).

`PaginationItem` never got the rule. A bare item is a supported public part —
the root contract accepts it and `docs/pagination.mdx` documents it as a "jump
to page" shortcut outside the numbered window — and it forwards its own `page`
prop straight to `onPageChange`:

```tsx
<Pagination page={1} pageCount={5} onPageChange={setPage}>
  <PaginationList />
  <PaginationItem page={9}>9</PaginationItem>   {/* reports 9 */}
</Pagination>
```

Measured 2026-10-20 in the real `TestRenderer` (`src/behaviour/zz-probe.test.tsx`
during this turn):

```
expected "vi.fn()" to not be called at all, but actually been called 1 times
1st vi.fn() call: Array [ 9 ]
```

A fractional item is the same defect in a smaller shape: `page={2.9}` reports
`2.9` and names the button `Page 2.9`, although the root truncates every other
page number (`page={1.9}` is page 1).

This is fail-safe behaviour, not a cosmetic edge: an app that keeps the result
set in sync with `page` receives a page it cannot render, and the control
contradicts its own documented rule. The same class of bug plan 611 fixed for
the edges.

## 2. The rule

One pure function in `packages/components/src/pagination/logic.ts`:

```ts
/**
 * A page item's target: one of the control's own pages, or none when the item
 * names something that is not a page. A finite value is truncated like the
 * root's `page`; a value outside `1..pageCount` is not a page.
 */
export const itemPageOf = (
  raw: number,
  pageCount: number,
): Option.Option<number> =>
  Number.isFinite(raw) && pageCount >= 1
    ? pipe(
        Math.trunc(raw),
        Option.some,
        Option.filter((page) => page >= 1 && page <= pageCount),
      )
    : Option.none();
```

`PaginationItem` then:

- computes `target = itemPageOf(page, pageCount)`;
- `isCurrent = Option.contains(target, current)` — so `2.9` is the current page
  when the root's page is 2, and paints the primary role;
- names the control from the target (`Page 2`), or from the raw `page` when the
  target is `None` (the caller's own label stays visible, so the name matches
  what a person sees);
- passes `disabled={Option.isNone(target)}` to the internal `Button` (no caller
  `disabled` exists on this part), so an impossible item is inert, leaves the
  tab order, paints the disabled roles and announces `Disabled` through the
  shared description helper — exactly the treatment a control that cannot act
  already gets (plan 394/516);
- calls the caller's `onClick` and then `onPageChange(target)` only while a
  target exists and it differs from the current page. The existing contract is
  unchanged: the caller's `onClick` still runs on the **current** page, and the
  current page still reports nothing.

Previous/Next need no change; they already yield `current - 1`/`current + 1`
from the normalised current, so their reports are always in range.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/pagination/logic.ts` | add `itemPageOf` with JSDoc (import `Option`, `pipe` — `pipe` is already imported? check; add if missing) |
| `packages/components/src/pagination/logic.test.ts` | new `describe("itemPageOf")` — 5 cases (§4) |
| `packages/components/src/pagination.tsx` | `PaginationItem` uses `itemPageOf`; import it; update the module JSDoc comment on the part; add one limitation to `paginationMeta.limitations` |
| `packages/components/src/behaviour/pagination.test.tsx` | 2 new native cases (§4); extend the header comment's bug list |
| `packages/components/docs/pagination.mdx` | behaviour paragraph, API note for `PaginationItem`, the rule in "Layout and states", verification count |
| `COMPONENTS.md` | Pagination row: the behaviour sentence and the test counts |
| `.agents/slop/plans/README.md` | index this plan in the components table |
| `PLAN.md` | append `756` to the D30 overflow list |
| `TODO.md` | tick the new hardening line with the plan number |

No other package is touched. No dependency is added.

## 4. Test plan

### Pure (`src/pagination/logic.test.ts`)

A new `describe("itemPageOf")`:

1. `itemPageOf(3, 5)` → `Option.some(3)` — a real page.
2. `itemPageOf(2.9, 5)` → `Option.some(2)` — truncated like the root's `page`.
3. `itemPageOf(0, 5)`, `itemPageOf(6, 5)` → `Option.none()` — outside the control.
4. `itemPageOf(Number.NaN, 5)`, `itemPageOf(Number.POSITIVE_INFINITY, 5)` → `Option.none()` — malformed numbers name no page.
5. `itemPageOf(1, 0)` → `Option.none()` — a control with no pages has no page 1.

Every assertion is a literal against a literal; the suite can fail.

### Native (`src/behaviour/pagination.test.tsx`)

1. **"keeps a bare item naming a page the control does not have inert"** — mount
   `page={1} pageCount={5}` with
   `<PaginationItem page={9} testId="page-nine" onClick={onClick}>9</PaginationItem>`
   outside the list; click its centre. Expect `onPageChange` not called,
   `onClick` not called (an inert control runs nothing, plan 394),
   `customProps.tabIndex === -1`, and the accessibility node for `page-nine`
   described `Disabled`.

   **Fails at `HEAD`** with `onPageChange` called once with `[9]` (measured).

2. **"truncates a fractional bare item to its whole page"** — mount
   `page={1} pageCount={10}` with `<PaginationItem page={2.9} testId="odd" />`;
   click it. Expect `onPageChange` called with `2` (not `2.9`), and the button's
   `aria-label` is `Page 2`.

   **Fails at `HEAD`** with `[2.9]`.

The existing cases stay green: "lets an item outside the list read the root's
page" (page 7 of 10) is the pin that a valid out-of-window item still reports;
"still reports a click on the current page" pins the caller's `onClick` on a
valid current item; "a caller onClick composing with each page change" pins the
composed handler on a valid item.

Use the suite's existing `clickCentreOf`, `renderComponent` and `a11yNodes`
helpers; assert `customProps` for `tabIndex` and `describe`/`aria-description`
from the accessibility dump (the same shape `disabled-description.test.tsx`
uses).

### Two-direction proof

Captured in the plan's status line and the TODO entry:

- before the fix: case 1 red with `[9]`, case 2 red with `[2.9]` (run with the
  scoped command in §5);
- after the fix: both green, and the three existing pins above still green;
- mutate the guard (pass `page` instead of `target` to `onPageChange`) and case
  2 goes red again — recorded, not committed.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

1. Scoped unit suite (fast):
   ```sh
   cd packages/components && nub exec vitest run src/pagination/logic.test.ts
   ```
   Expected: `1 passed` file, `25 passed` tests after the five new cases (20
   before).

2. Scoped native suite — this is the only suite the change touches:
   ```sh
   cd packages/components && nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/pagination.test.tsx
   ```
   Expected at `HEAD`: 2 failed / 18 passed of 20 (the two new cases). Expected
   after the fix: 20 passed of 20.

3. The gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all exit `0`; the unit suite is 493 tests in 46 files (488 before,
   +5).

4. Full native suite once (end-of-task; ~3 minutes):
   ```sh
   nub run --filter @gpuixui/components test:behaviour
   ```
   Expected after the fix: **955 passed / 20 failed of 975** — the same 20
   recorded plan-540 binding failures (before this plan the suite read
   `956 passed / 21 failed of 977` with the probe file present; the probe is
   deleted and its 4 cases with it, then the 2 new cases are added). If any
   failure outside the recorded plan-540 classes appears, STOP. Record the exact
   totals in the plan status, `TODO.md` and the README row.

   The full live smoke suite is not required: this change touches one component
   and one pure rule, and the native `TestRenderer` suite is the package's
   runtime evidence. No playground scenario covers Pagination in this worktree.

## 6. STOP conditions

- The scoped native suite does not fail at `HEAD` for the two new cases. The
  fix is then not proven; investigate whether the probe measured a different
  shape and stop rather than editing the test to pass.
- Any existing pagination case changes its report for a **valid** page (for
  example "lets an item outside the list read the root's page" starts
  failing). The guard is too broad; stop and report.
- A gate (`check`, `lint`, `test`) fails for a reason outside this change. Stop
  and report the failure; do not disable a check.
- A full-suite failure appears outside the recorded plan-540 classes. Stop and
  record it as evidence instead of adjusting a test.
- The plan number `756` is taken by another worktree before the plan is
  committed. Renumber to the next free number, update the README index, D30 and
  this filename, then continue.

## 7. Acceptance criteria

- `itemPageOf` exists with a JSDoc, is used by `PaginationItem`, and is covered
  by five pure assertions.
- A bare item outside `1..pageCount` is inert: it reports nothing, runs no
  caller handler, leaves the tab order and announces `Disabled`.
- A fractional bare item reports its truncated page and is named by it.
- Valid out-of-window items and the current-page no-op are unchanged.
- `docs/pagination.mdx` states the item rule and its verification counts;
  `COMPONENTS.md` and the inventory metadata agree; `inventory.test.ts` passes.
- `check`, `lint`, `test` exit `0`; the scoped native file is 20/20 and the full
  native suite has no new failure class.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
