# 657 — Multi-step form: a fractional step names no step

**Phase:** F (integration and polish)
**Owner:** components workstream (`packages/components`)
**Depends on:** 110, 390, 397, 502/508, 619 (the same rule on Carousel), 651
(the shared "normalise once" precedent)
**Status:** planned

---

## 1. The defect (measured)

`MultiStepForm` derives its index with `Number.clamp` only:

```ts
// src/multi-step-form.tsx
const index = Num.clamp({ minimum: 0, maximum: steps.length - 1 })(rawIndex);
const step = steps[index] ?? steps[0];
```

`Number.clamp` truncates nothing. `NaN` happens to clamp to the minimum, but a
**fractional** in-range value passes through. Measured on this host
(2026-10-19, the real `TestRenderer`, temporary probe deleted after the run) with
three steps and `step={1.5}`:

```
texts:  ["one", "1.5:false:false", "next"]   // paints step one, claims 1.5
report: onStepChange(2.5)                    // next skips step two entirely
```

So a caller that computes a controlled index from progress (`done / total *
last`) paints the **wrong step's fields** while the state says `1.5`, and
`next` validates the first step's schema and jumps to `2.5`. With two steps the
maximum clamp masks the fraction; the bug needs three or more steps, which is
why it survived plan 390's two-step fixture.

This is the same defect plan 619 fixed in `Carousel`: a fractional index names
no item, so the component paints a fallback and arithmetic never recovers. The
rule already exists as `slideIndex` in `src/carousel/logic.ts`; it is now needed
by a second consumer, so it is hoisted rather than copied (AGENTS §1).

## 2. The fix

One rule: **a 0-based list index is a whole, in-range number.** A finite value is
truncated then clamped; a non-finite value starts at index `0` (it cannot name a
later entry), and an empty list reports `0`. A controlled value is **never
rewritten** — the component only normalises the index it reads, exactly as
Pagination and Carousel do.

### Files to change

1. **`packages/components/src/internal/count.ts`** — add, below `wholeCap`:

   ```ts
   /**
    * A caller's 0-based position in a list of `count` entries: a whole,
    * in-range index. A fractional value names no entry, and a non-finite one
    * cannot name a later entry, so both start at `0`; a finite value is
    * truncated then clamped. An empty list reports `0`.
    */
   export const wholeIndex = (value: number, count: number): number => {
     if (count <= 0) return 0;
     const whole = Number.isFinite(value) ? Math.trunc(value) : 0;
     return Math.min(Math.max(whole, 0), count - 1);
   };
   ```

2. **`packages/components/src/carousel/logic.ts`** — keep the exported
   `slideIndex` (its callers and tests stay unchanged); its body becomes
   `wholeIndex(value, count)` and its doc points at the shared rule. The
   carousel's five existing rule tests are then the shared rule's regression
   suite.

3. **`packages/components/src/multi-step-form.tsx`** — replace the clamp:

   ```ts
   const index = wholeIndex(rawIndex, steps.length);
   ```

   Import `wholeIndex` from `./internal/count.js`. `Num` is then unused; remove
   its import (the file must not keep a dead import).

### Files to leave alone

- `useControllableState` — it reports accepted requests; it must keep the
  caller's raw value (`1.5`) rather than inventing an index.
- `Stepper` — `MultiStepForm` now always passes `index + 1`, a whole number.
  Stepper's own malformed-value behaviour is out of scope (display-only; no
  arithmetic follows it).

## 3. Test plan

### 3a. Pure: `packages/components/src/internal/count.test.ts`

Extend the header comment to name both rules (a malformed cap, and a malformed
index), then add:

```ts
describe("wholeIndex", () => {
  it("truncates a fractional index to the entry below it", () => {
    expect(wholeIndex(1.5, 3)).toBe(1);
    expect(wholeIndex(2.9, 3)).toBe(2);
  });

  it("clamps a finite index into the list", () => {
    expect(wholeIndex(-2, 3)).toBe(0);
    expect(wholeIndex(99, 3)).toBe(2);
  });

  it("starts a non-finite index at the first entry", () => {
    expect(wholeIndex(Number.NaN, 3)).toBe(0);
    expect(wholeIndex(Number.POSITIVE_INFINITY, 3)).toBe(0);
    expect(wholeIndex(Number.NEGATIVE_INFINITY, 3)).toBe(0);
  });

  it("reports zero for an empty list", () => {
    expect(wholeIndex(2, 0)).toBe(0);
  });
});
```

The Carousel suite (`src/carousel/logic.test.ts`, 5 cases) must stay green
unchanged: that proves the hoist preserved its contract.

### 3b. Native: `packages/components/src/behaviour/multi-step-form.test.tsx`

Add a three-step fixture beside the existing two-step one (e.g. `threeSteps`
with ids `account`, `billing`, `review`, each a projection schema). Add **two**
native cases, after "clamps a controlled index outside the range":

1. **"normalises a fractional controlled step to a whole step"**

   - render `<Harness value={validLike} steps={threeSteps} step={1.5}
     onStepChange={spy} />` (extend `Harness` with an optional `steps`
     override, or add a second harness; do not duplicate the body).
   - expect the state text `1:false:false` and the step id `billing`.
   - press `next`; expect `onStepChange` called with **`2`**, never `2.5`.
   - expect the painted state to remain `1:false:false` (controlled: the
     parent owns the value).

2. **"starts a non-finite controlled step at the first step"** (pin)

   - render with `step={Number.NaN}`; expect `0:true:false` and step `account`.
   - press `next`; expect `onStepChange(1)`.

Case 1 **fails at HEAD** (measured: `1.5:false:false`, step `one`, report
`2.5`). Case 2 passes at HEAD — it pins the behaviour `Number.clamp` already
gave `NaN`, so the shared rule does not regress it. State that in the test
header.

### 3c. Mutation proof (both directions)

1. Run the new cases at `HEAD` before the source change: case 1 must fail, case
   2 must pass.
2. Apply §2, run again: both pass.
3. Revert only the one line in `multi-step-form.tsx` to
   `Num.clamp(...)(rawIndex)`: case 1 must fail again.

## 4. Docs and inventory sync

- **`packages/components/docs/multi-step-form.mdx`**
  - Add to the step-machine prose: a controlled `step` is normalised once to a
    whole in-range index (truncated and clamped; a non-finite value starts at
    the first step), so a fractional value cannot paint a different step or
    skip one; the controlled value is never rewritten.
  - Update the Verification line: `(15 tests)` → `(17 tests)` and add the two
    named cases to the list.
- **`COMPONENTS.md`** — the Multi-step forms row: `15 native behaviour tests` →
  `17 native behaviour tests`, and add one clause after the `step`
  controlled/uncontrolled sentence: a fractional index is truncated and a
  non-finite one starts at the first step, so a caller-computed value cannot
  paint one step while claiming another.
- **`src/multi-step-form.tsx`** header JSDoc: one sentence on index
  normalisation (the same register as Carousel's).
- No change to `docs/component-api.md` (the parts table does not change).
- Refresh the suite counts in `TODO.md` when ticking this task (record the real
  numbers printed by the runs; do not compute them).

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

```sh
nub run --filter @gpuixui/components test
```

Expected: the unit suite passes; it grows by 4 `wholeIndex` cases and the 5
Carousel cases stay green.

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/multi-step-form.test.tsx
```

Run this **before** the source change to record case 1 failing (the probe in
§1 is the recorded measurement; the case itself must also be shown to fail),
then after: Multi-step form `17 passed`, 0 failed in that file. This host is an
Intel Mac with plan 140's locally built `darwin-x64` binding; a host without a
binding fails to load the file by design (plan 117 §5a–§5c), which is not a
pass.

```sh
nub run check
nub run lint
nub run test
```

Expected: all exit `0`. `check` includes the docs test-count check
(`inventory.test.ts`), which is why §4's `15 → 17` must land with the tests.

## 6. STOP conditions

Stop and report rather than improvise if:

- The native behaviour file cannot load (no binding on the host): record the
  exact error and do not claim the native cases passed.
- Case 1 does **not** fail at `HEAD`: the measurement in §1 has drifted (another
  change normalised the index); re-measure before changing anything.
- Hoisting `wholeIndex` requires touching any Carousel test to keep it green —
  that means the rule is not the same and the hoist is wrong.
- The docs count check reports another number than the suite prints: trust the
  suite, fix the docs, and note the real count.

## 7. Acceptance

- [ ] `wholeIndex` lives in `internal/count.ts` and Carousel's `slideIndex`
      delegates to it with all five existing cases unchanged and green.
- [ ] `MultiStepForm` uses `wholeIndex`; the `Num` import is gone.
- [ ] The fractional native case fails on the pre-fix source and passes after;
      the `NaN` pin passes in both directions.
- [ ] Docs and `COMPONENTS.md` state the normalisation and the real native test
      count (17).
- [ ] `nub run check`, `nub run lint`, `nub run test` exit `0`.
- [ ] Committed on `agent/components`, pushed, and ticked in `TODO.md` with the
      plan indexed in `.agents/slop/plans/README.md`.
