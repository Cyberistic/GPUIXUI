# 649 — Breadcrumb: a non-finite `maxItems` hides the current page

**Phase:** F (input normalisation and interaction truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 113 (breadcrumb), plan 117 (verification gate),
plan 547 (separators and the announced current page), plan 611 and plan 619
(the same normalise-at-the-boundary rule for Pagination and Carousel).
**Status:** implemented — 1 pure + 1 native case (Breadcrumb 13, unit 455). The
pure case rendered `a, …` and the native trail painted `Projects, /, …` on the
old rule; both pass after the fix. The full behaviour suite is 812 passed / 31
failed of 843 — the same 31 recorded plan-540 binding failures. Docs,
`COMPONENTS.md`, `TODO.md` and the inventory are synced.

## 1. The bug

`Breadcrumb` collapses its middle when `maxItems` is set. `BreadcrumbList`
passes the raw prop to the pure rule:

```ts
export const collapse = <A>(items, maxItems) => {
  const budget = Math.max(minimum, Math.trunc(maxItems));
  if (Arr.length(items) <= budget) return Arr.map(items, crumb);
  return [
    ...Arr.map(Arr.take(items, 1), crumb),
    ELLIPSIS,
    ...Arr.map(Arr.takeRight(items, budget - 2), crumb),
  ];
};
```

`Math.trunc(NaN)` is `NaN` and `Math.max(3, NaN)` is `NaN`, so a non-finite
budget skips the "fits" branch. The tail is then built with
`Arr.takeRight(items, NaN)`; `effect/Array`'s own documentation says **`NaN` is
treated as `0`** and returns an empty array. The rendered trail is therefore

```
first entry  …  (nothing)
```

— the current page (always the last entry) and every other entry disappear, with
an ellipsis standing for a tail that was not drawn. `maxItems={Infinity}` already
renders the whole trail (`length <= Infinity`), so the same "no practical limit"
input can produce either the full trail or a two-entry stump depending only on
which non-finite value arrives.

A caller can produce `NaN` from a measurement — `Math.floor(width / itemWidth)`
is `NaN` when the width is `NaN`, and this binding is known to report unusable
box values in some paths (plan 540). The component's contract is that collapsing
**always keeps the current page** (plan 113 §4, plan 547); a malformed budget
must not be the one input that breaks it.

Measured before the fix (see §4 for the exact cases):

- `collapse(["a","b","c","d","e"], Number.NaN)` renders `a`, `…` — the last
  entry is gone;
- `<Trail maxItems={Number.NaN} />` in the real renderer paints `Projects`, `…`
  and no `components` (the current page), while `<Trail />` paints all four
  entries.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/breadcrumb/logic.ts` | Treat a non-finite budget as "no collapse", so the trail is returned whole. |
| `packages/components/src/breadcrumb/logic.test.ts` | One pure case: a non-finite budget keeps every entry, in order. |
| `packages/components/src/behaviour/breadcrumb.test.tsx` | One native case: `maxItems={Number.NaN}` paints the whole trail and no ellipsis. |
| `packages/components/docs/breadcrumb.mdx` | State the non-finite rule; refresh the verification count from 12 to 13. |
| `COMPONENTS.md` | Breadcrumbs row: record the rule and 12 → 13 native tests. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `PLAN.md` | Record `649` as the first free overflow number in D30. |
| `TODO.md` | One ticked entry under "Tier 2 hardening after the inventory closed"; one pending entry for the search clear control's unobservable ring (§7). |

No new module, export, dependency, example or inventory record is needed.

## 3. Exact implementation

### 3.1 `packages/components/src/breadcrumb/logic.ts`

Replace the budget line:

```ts
const budget = Number.isFinite(maxItems)
  ? Math.max(minimum, Math.trunc(maxItems))
  : Arr.length(items);
```

and extend the function's JSDoc with one sentence:

> A non-finite budget names no number of entries, so the trail is returned
> whole — hiding the tail would hide the current page.

Everything else stays: a finite budget below three still clamps to three; a
fractional one still truncates; a trail that fits is returned unchanged.

### 3.2 What must not change

- `maxItems === undefined` still means "never collapse" (the caller's branch in
  `BreadcrumbList`).
- The ellipsis still takes the separator authored before the first hidden entry
  (plan 547), and remains out of the tab order.
- The collapsed window (`first … last maxItems - 2`) and its "current page is
  always visible" guarantee for a finite budget.
- The separator parsing, the item roles and `currentLabel`.

## 4. Test plan

### 4.1 Pure (`src/breadcrumb/logic.test.ts`)

Add beside "always keeps the last entry":

```ts
it("ignores a non-finite budget instead of hiding the tail", () => {
  // `Arr.takeRight` treats `NaN` as 0, so the old `Math.max(3, NaN)` budget
  // painted only `a …` and dropped the current page (plan 649).
  expect(collapse(items("a", "b", "c", "d", "e"), Number.NaN)).toEqual([
    crumb("a"),
    crumb("b"),
    crumb("c"),
    crumb("d"),
    crumb("e"),
  ]);
  expect(
    collapse(items("a", "b", "c", "d", "e"), Number.POSITIVE_INFINITY),
  ).toHaveLength(5);
});
```

### 4.2 Native (`src/behaviour/breadcrumb.test.tsx`)

Add after "collapses the middle but always keeps the first and last entries":

```tsx
it("keeps the whole trail when maxItems is not a finite number", () => {
  // The bug this guards (plan 649): a `NaN` budget skipped the "fits" branch,
  // `Arr.takeRight` treated the NaN tail length as 0, and the trail painted
  // `Projects …` — the current page and every middle entry were gone.
  const trail = renderComponent(<Trail maxItems={Number.NaN} />);
  const texts = trail.renderer.getAllText();

  expect(texts).toContain("Projects");
  expect(texts).toContain("GPUIXUI");
  expect(texts).toContain("packages");
  expect(texts).toContain("components");
  expect(texts).not.toContain("…");

  trail.unmount();
});
```

Commands and expected results:

```sh
cd packages/components

# Before the source fix: the pure case fails (got `a, …`), the native case
# fails on the missing middle entries and current page.
nub exec vitest run src/breadcrumb/logic.test.ts
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/breadcrumb.test.tsx

# After the fix: both pass (logic 13, Breadcrumb 13).
nub exec vitest run src/breadcrumb/logic.test.ts
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/breadcrumb.test.tsx

# Inventory and types.
nub run test
nub run check-types
```

Both-direction proof after the fix:

- restore `Math.max(minimum, Math.trunc(maxItems))` → both new cases fail (the
  pure case renders `a, …`; the native case loses `GPUIXUI`, `packages` and
  `components`);
- replace the fallback with `minimum` → the new cases fail too, because a
  non-finite budget would then collapse a short trail; the existing
  "returns a trail that fits unchanged" case pins that a finite budget of 4 does
  not collapse five entries only while the rule is correct, so keep the fallback
  meaning "no collapse", not "three".

The behaviour suite needs a host with a GPUix native binding; on this Intel Mac
plan 140's locally built `darwin-x64` binding is installed. If the binding is
missing, **STOP** and report `unsupported-host` — never claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/breadcrumb.mdx`
  - Where `maxItems` is described: add "A finite budget always keeps the first
    entry, an ellipsis and the last `maxItems - 2` entries; a non-finite value
    (`NaN` or an infinity) is ignored and the whole trail renders, so a
    malformed budget cannot hide the current page."
  - Verification: change `(12 tests)` to `(13 tests)` and name the
    non-finite-budget case.
- `COMPONENTS.md`, Breadcrumbs row: add "a non-finite `maxItems` renders the
  whole trail instead of a stump that hides the current page (plan 649)" and
  change "12 native behaviour tests" to "13 native behaviour tests".
- `.agents/slop/plans/README.md`: add the plan row after 647.
- `PLAN.md` D30: append that the components workstream took `649` (the first
  free number; `648` is the playground's diff-interaction contract), checking
  every worktree.
- `TODO.md`: one ticked entry under "Tier 2 hardening after the inventory
  closed", naming the measured defect, the normalization, the two cases and the
  both-direction proof.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the pure case passes **before** the source fix — the measurement or the
  assertion is wrong, so the bug is not proven;
- the native case cannot distinguish the two states (e.g. the trail renders no
  ellipsis through a different path) — record what the tree contains and stop;
- another worktree has claimed `649` (re-check
  `find /Users/cyberistic/GPUIXUI/workspaces -path '*/.agents/slop/plans/649-*'`);
  take the next free number and record it in `PLAN.md` D30;
- the behaviour suite reports `unsupported-host`;
- `check-types` fails for a reason outside these files.

## 7. Acceptance

- [x] The pure case fails at `HEAD` and passes with the fix.
- [x] The native case fails at `HEAD` and passes with the fix; the whole trail is
      painted with no ellipsis for a non-finite budget.
- [x] A finite budget behaves exactly as before (the existing collapse, clamp,
      separator and announcement cases stay green).
- [x] Docs, `COMPONENTS.md`, the plan index, `PLAN.md` and `TODO.md` state the
      shipped count and the rule.
- [x] `nub run --filter @gpuixui/components test` (455 unit tests), `check-types`,
      and the two targeted suites pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.

## 8. Found but not fixed here: the search clear control's focus ring

While looking for this plan's defect, a separate real defect was measured and
deliberately **not** fixed in this change:

- `SearchInput`'s clear control is a tab stop (`tabIndex 0`) with no `focused`
  state and no `focusRing`; `TimePickerClear` (plan 522) has both. Focusing it
  reports `getFocusedElementId() = clear`, but paints no ring, and the field's
  surface ring has already gone with the input's blur.
- Unlike `autoFocus`-seeded parts, there is no input through which a native
  suite on this host can make the control paint the ring: `focusElement`,
  `focusNext`, a mouse-down and a click all move native focus and deliver **no**
  React `focus` event (plan 540's recorded binding gap; the color-picker swatch
  ring case is red for the same reason). A test for the fix would be red at
  `HEAD` and red after it, which is not a two-way proof.
- The fix is a `focused` state plus `focusRing(theme)` mirroring `TimePickerClear`;
  it is recorded as a pending task in `TODO.md` so it lands with a binding that
  delivers focus events (or a live-window scenario owned by `playground`).
