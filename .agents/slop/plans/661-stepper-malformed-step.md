# 661 — Stepper: a malformed current step names no step

**Phase:** F (interaction and data truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 110 (package and harness), plan 117 (verification gate),
plan 307 (Stepper), plan 626 (status descriptions), plan 657 (the `wholeIndex`
precedent for a fractional index), plan 651 (the malformed-cap rule).
**Status:** done 2026-10-19 — the root `value` is normalised once through
`wholeStep`: a fractional value truncates to the step below it and a non-finite
one starts at the first step, so exactly one row is current. 2 native cases
(Stepper 12), both red on the old source, plus 2 pure cases; docs,
`COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the inventory synced.

## 1. The bug

`Stepper` compares each step's `value` with the root's raw `value`:

```ts
const statusOf = (current: number, step: number): StepperStatus =>
  step < current ? "complete" : step === current ? "current" : "upcoming";
```

A fractional current is never equal to an integer step, and `NaN` is never
equal to anything. The component then paints **no current step** while the
caller asked for one, and the styles plus `aria-selected` and the status
descriptions all disagree with the workflow's intent.

Measured on this host, 2026-10-19, in the real `TestRenderer` with a throwaway
probe (deleted; the fixtures below are the regression tests):

| Root `value` | Steps | `aria-selected` | Descriptions |
| ------------ | ----- | --------------- | ------------ |
| `1.5` | 1, 2, 3 | `false, false, false` | `Complete, Upcoming, Upcoming` |
| `NaN` | 1, 2 | `false, false` | `Upcoming, Upcoming` |

This is the same class plan 657 fixed for `MultiStepForm`'s step: a fractional
index named no step while the state claimed the fraction. That plan hoisted
`wholeIndex` for 0-based indices; Stepper's 1-based step is the remaining caller.

## 2. Scope

**In scope**

- `packages/components/src/internal/count.ts`: a `wholeStep(value)` rule — a
  finite value is truncated and floored at `1`; a non-finite one starts at the
  first step. It is the 1-based sibling of `wholeIndex`.
- `packages/components/src/internal/count.test.ts`: two pure cases for the rule.
- `packages/components/src/stepper.tsx`: normalise the root `value` once before
  putting it in context; every step then compares against the whole value.
- `packages/components/src/behaviour/stepper.test.tsx`: two native cases — a
  fractional value and a non-finite one both name exactly one current step.
- Docs, `COMPONENTS.md`, the plan index, `PLAN.md` D30, `TODO.md` and the
  inventory test count (10 → 12).

**Out of scope — do not touch**

- No public API change: `value: number` stays required on both parts, and no new
  prop is added. `Stepper` remains display-only (no step click, no callback).
- No change to `StepperStep`'s own `value`; it is the authored 1-based position
  and stays as written.
- No change to the `MultiStepForm` index rule (`wholeIndex` already covers it).
- No playground edit (owned by the playground workstream).

## 3. Exact implementation

### 3.1 `packages/components/src/internal/count.ts`

Add after `wholeIndex`:

```ts
/**
 * A caller's 1-based step number: a whole value at least 1. A fractional value
 * names no step, so it is truncated to the step below it; a non-finite one
 * starts at the first step, matching `wholeIndex`'s first-entry rule.
 */
export const wholeStep = (value: number): number =>
  Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
```

### 3.2 `packages/components/src/stepper.tsx`

1. Import the rule beside the other internal imports.

2. Normalise once in the root (inside `Stepper`, before the provider):

   ```ts
   const current = wholeStep(value);
   ```

3. Put `current` in the context instead of `value`:

   ```tsx
   <StepperContext.Provider value={{ value: current, orientation }}>
   ```

   `StepperStep` and `statusOf` are unchanged; every step now compares against a
   whole 1-based number.

### 3.3 What must not change

- The three statuses and their palettes; `aria-selected` on exactly the current
  step; `statusDescription` appending `Complete`/`Current`/`Upcoming`.
- `StepperStep`'s number text, label/description layout, `style` callback state
  and caller `style` merge.
- The parts contract (`StepperStep` directly inside `Stepper`) and the inventory
  record.

## 4. Test plan

### 4.1 Pure cases — `src/internal/count.test.ts`

Add a `describe("wholeStep", ...)` with two tests:

```ts
describe("wholeStep", () => {
  it("truncates a fractional step and keeps the first step as the floor", () => {
    expect(wholeStep(1.5)).toBe(1);
    expect(wholeStep(2.9)).toBe(2);
    expect(wholeStep(0)).toBe(1);
    expect(wholeStep(-3)).toBe(1);
  });

  it("starts a non-finite step at the first step", () => {
    expect(wholeStep(Number.NaN)).toBe(1);
    expect(wholeStep(Number.POSITIVE_INFINITY)).toBe(1);
    expect(wholeStep(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});
```

Both fail to compile/import before the helper exists; each assertion is a real
value check, not a self-comparison.

### 4.2 Native cases — `src/behaviour/stepper.test.tsx`

Use the existing `Checkout` fixture and `nodesWithRole` helper.

```tsx
/**
 * The bug this guards (plan 661): a fractional root value was never equal to an
 * integer step, so every row was complete or upcoming and none was current.
 */
it("names the step below a fractional value as current", () => {
  const stepper = renderComponent(<Checkout value={1.5} />);

  const rows = nodesWithRole(stepper.renderer, "listitem");
  expect(rows.map((row) => Option.contains(row.selected, true))).toEqual([
    true,
    false,
    false,
  ]);
  expect(rows.map((row) => Option.getOrUndefined(row.description))).toEqual([
    "Current",
    "Upcoming",
    "Upcoming",
  ]);

  stepper.unmount();
});

/**
 * The bug this guards (plan 661): a non-finite root value compared false with
 * every step, so the stepper painted no current row at all.
 */
it("starts a non-finite value at the first step", () => {
  const stepper = renderComponent(
    <Stepper value={Number.NaN} label="Checkout">
      <StepperStep value={1} label="Account" />
      <StepperStep value={2} label="Billing" />
    </Stepper>,
  );

  const rows = nodesWithRole(stepper.renderer, "listitem");
  expect(rows.map((row) => Option.contains(row.selected, true))).toEqual([
    true,
    false,
  ]);
  expect(rows.map((row) => Option.getOrUndefined(row.description))).toEqual([
    "Current",
    "Upcoming",
  ]);

  stepper.unmount();
});
```

At `HEAD`: the first case reports no selected row and `Complete` on step one;
the second reports no selected row and `Upcoming` on both.

### 4.3 Commands and expected results

```sh
cd packages/components

# Before the source fix: both native cases are red for the reasons above.
nub run test:behaviour src/behaviour/stepper.test.tsx

# After the fix: 12 passed, and the new pure cases pass.
nub run test:behaviour src/behaviour/stepper.test.tsx
nub run test src/internal/count.test.ts

# The package gates stay green.
nub run test
nub run check-types
```

Both-direction proof after the fix:

- remove the `wholeStep` normalisation from the context → both native cases
  fail again;
- replace the non-finite branch with `Math.max(1, Math.trunc(value))` (which is
  `NaN`) → the non-finite case fails;
- drop the `Math.max(1, ...)` floor → the pure floor assertions fail.

If the behaviour suite reports `unsupported-host`, **STOP** and report; never
claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/stepper.mdx`
  - The status table or the paragraph above it: state that the root value is
    normalised once — a fractional value is truncated to the step below it, and
    a non-finite one starts at the first step, so exactly one row is current.
  - Verification: `(10 tests)` → `(12 tests)` and name the two new cases.
- `COMPONENTS.md`, Stepper row: `10 native behaviour tests` → `12`, and add the
  normalisation sentence with plan 661.
- `packages/components/src/stepper.tsx`: no inventory-record change is required
  (no new limitation); the module header gains one sentence naming the
  normalisation.
- `.agents/slop/plans/README.md`: index this plan after 660.
- `PLAN.md` D30: append that the components workstream took `661` (checked
  across every worktree: no `661` plan exists).
- `TODO.md`: add and tick the hardening task under the Tier 2 rows.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- either native case passes **before** the source fix — the measurement or the
  assertion is wrong, so the bug is not proven;
- `nodesWithRole` reports more or fewer than the fixture's steps (record the
  tree and stop);
- another worktree has claimed `661` (re-check
  `find /Users/cyberistic/GPUIXUI/workspaces -path '*/.agents/slop/plans/661-*'`);
  take the next free number and record it in `PLAN.md` D30;
- `check-types`, `check-tests`, `check` or `lint` fails for a reason outside
  these files.

## 7. Acceptance

- [x] The two pure cases and the two native cases fail before the fix and pass
      after it; the existing 10 Stepper cases stay green.
- [x] `value={1.5}` names step 1 **current** and steps 2–3 upcoming;
      `value={NaN}` names step 1 current.
- [x] No public API, parts contract or display-only behaviour changes.
- [x] Docs, `COMPONENTS.md`, the plan index, `PLAN.md`, `TODO.md` and the
      inventory state the shipped behaviour and the 12-test count.
- [x] `nub run --filter @gpuixui/components test`,
      `nub run --filter @gpuixui/components check-types` and the targeted
      behaviour file pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
