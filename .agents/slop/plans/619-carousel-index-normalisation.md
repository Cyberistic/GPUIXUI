# 619 — Carousel: an index that names no slide hides every slide

**Phase:** F (Tier 2 hardening)
**Workstream:** components (`packages/components`)
**Depends on:** 315 (Carousel), 365 (visibility hiding), 374 (indicators), 614
**Number:** `619` — first free number across every worktree on 2026-10-19
(`618` is tokens-theme's). Record it in `PLAN.md` D30.

## 1. The defect, measured

`Carousel` derives the painted slide with

```ts
const active = count === 0 ? 0 : Math.min(Math.max(value, 0), count - 1);
```

`value` is a `number`, so it can be fractional or non-finite. `Math.max` /
`Math.min` do not make it whole. `CarouselSlide` then compares
`index === active` (strict) and `CarouselIndicators` compares the same way, so
when `active` is `1.5` or `NaN`:

- no slide is `active` → every slide takes `hiddenSlide`
  (`visibility: hidden`, width/height `0`) and the track paints **nothing**;
- no indicator is `aria-selected`;
- `step` computes `active ± 1` (still fractional / `NaN`) and keeps the
  carousel broken; only an indicator press can recover it.

Probe (scratch behaviour file, real `TestRenderer`, this host, 0.10.0),
`value={1.5}` and `value={NaN}`:

```
painted slides: []        // expected ["Two"] / ["One"]
indicator 0 aria-selected: false
```

Both probes passed while asserting the broken state, then the file was deleted.

`Pagination` already normalises the same class of caller input (plan 611:
"fractional `page`/`pageCount` desynced the window"). A carousel index is a
slide number and must obey the same rule.

## 2. The rule

One pure function, derived once at the root; every part already reads `active`
from the context, so no second place can disagree.

`packages/components/src/carousel/logic.ts`

```ts
/**
 * The active slide index a caller's value names. A slide index is whole:
 * truncation matches Pagination's page rule, and a value that is not a finite
 * number (NaN, ±Infinity) names no slide and falls back to the first one.
 * Clamped into `[0, count - 1]`; an empty track reports `0`.
 */
export const slideIndex = (value: number, count: number): number => {
  if (count <= 0) return 0;
  const whole = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(Math.max(whole, 0), count - 1);
};
```

`packages/components/src/carousel.tsx` replaces the inline derivation with

```ts
const active = slideIndex(value, count);
```

No other file changes: `step`/`goTo` build on `active`, and the slides,
indicators and controls all read it. The caller's controlled prop is **not**
rewritten; on the next real step the component reports a whole index.

## 3. Test plan

### Pure rules — `packages/components/src/carousel/logic.test.ts` (new)

Header comment states the bug being guarded (a value that names no slide hides
the whole carousel). Cases:

1. a fractional index is truncated to the slide below it (`1.5`, `2.9`);
2. a negative index clamps to the first slide;
3. an index past the end clamps to the last slide;
4. a non-finite index falls back to the first slide (`NaN`, `±Infinity`);
5. an empty track reports `0`.

These are new-function tests; the regression proof is the native pair below.

### Native behaviour — `packages/components/src/behaviour/carousel.test.tsx`

Add to the existing `Carousel` describe (count goes 18 → 20):

1. **"paints the slide a fractional controlled index names"** —
   `<Gallery value={1.5} />` paints exactly `["Two"]`, and
   `carousel-indicator-1` is `aria-selected` while 0 and 2 are not.
   *(Fails on `HEAD`: no slide is painted and no dot is selected.)*
2. **"recovers from a non-finite index on the next step"** —
   `StatefulGallery` starting at `Number.NaN` (pass `initial={NaN}`), assert
   the first slide paints; click `next`; assert `onValueChange` was called with
   `1` and `["Two"]` paints.
   *(Fails on `HEAD`: nothing paints and the report is `NaN`.)*

Both-direction proof: run the two new cases **before** applying the step-2
change (they must fail), then after (they must pass).

Measured on 2026-10-19, real `TestRenderer`, this host:

- before the fix — `fractional controlled index`: `expected [] to deeply equal
  [ "Two" ]`; `non-finite index`: `expected [] to deeply equal [ "One" ]`;
- after the fix — Carousel `20 tests | 1 failed`, the one failure being the
  pre-existing plan-540 focus-ring case (`expected undefined to be defined` at
  the root's `boxShadow`), which is red on `HEAD` too; the two new cases pass;
- `src/carousel/logic.test.ts` — 5/5;
- the full native suite — 785 passed / 35 failed of 820, the same 35 plan-540
  binding cases as the 783/35-of-818 baseline, so no component regressed.

### Commands and expected results

```sh
# 1. tests first, against the old derivation — expected: 2 failed
nub run --filter @gpuixui/components test:behaviour -- -t "fractional controlled index"
nub run --filter @gpuixui/components test:behaviour -- -t "non-finite index"

# 2. after the fix — expected: all 20 Carousel cases pass (0 failed)
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/carousel.test.tsx

# 3. pure rules — expected: logic suite green
nub run --filter @gpuixui/components test -- src/carousel/logic.test.ts

# 4. scoped checks
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
```

The full behaviour suite keeps its known plan-540 binding failures (35 of 818 on
2026-10-19); the Carousel file's one measured focus-ring case may be among them
under the rebuilt binding. Do **not** attribute a pre-existing failure to this
change; compare against the baseline recorded in `TODO.md`.

## 4. Documentation and inventory

- `packages/components/docs/carousel.mdx`: `value`/`defaultValue` is a whole
  slide index; a fractional value is truncated and a non-finite one starts at
  the first slide; the caller's value is never rewritten.
- `packages/components/COMPONENTS.md` Carousel row: add the one-clause
  normalisation fact and bump the native-test count (18 → 20).
- `packages/components/src/carousel.tsx` `carouselMeta` needs no new
  limitation; this is a rule, not a gap.
- `TODO.md`: add and tick a Tier 2 hardening item (plan 619) with the measured
  evidence; keep the Phase C progress bar unchanged.
- `.agents/slop/plans/README.md`: add the 619 row.
- `PLAN.md` D30: extend the overflow-number note with `619`.

## 5. STOP conditions

- Stop if the two new native cases do **not** fail on the unmodified source
  (the defect is not the one described here).
- Stop if any other Carousel case changes from pass to fail after the fix.
- Stop if the fix needs a second normalisation site (slides, indicators or
  controls comparing differently) — that means the context rule is wrong;
  report instead of patching each part.
- Do not touch `step`/`goTo`'s clamping, the `loop` rule, or the visibility
  mechanism; this plan only feeds them a whole index.

## 6. Acceptance

- `slideIndex` exists with the five unit cases above and is the only place the
  active index is derived.
- Both native cases fail on `HEAD` and pass with the fix; the Carousel file is
  green apart from pre-existing plan-540 failures.
- Docs and `COMPONENTS.md` state the rule; `TODO.md` and the plan index record
  the plan as done; gates `nub run check`, `nub run lint` pass.
