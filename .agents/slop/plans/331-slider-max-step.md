# 331 — The slider's maximum is not a stop when the step does not divide the span

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the package), `041` (runtime verification), `053` (value controls), `063` (the drag contract), `077` (decimal step noise) |
| Status | done |
| Fixes | `Slider`/`RangeSlider` paint and announce the maximum at the last grid stop, so `End` moves to a value the track cannot show |

---

## 1. The defect

`clampValue` snaps every value to `min + round((value - min) / step) * step` and
then clamps to `max`. That arithmetic treats `max` as an upper bound, not as a
**stop**. When `max - min` is not a whole multiple of `step`, the last grid stop
is below `max` and nothing can reach the end of the track.

The docs promise otherwise: `docs/slider.mdx` and `docs/range-slider.mdx` both
list `Home`/`End` as `min`/`max`, `RangeSlider`'s `defaultValue` is documented
as `[min, max]`, and a caller who writes `value={max}` expects a full track.

Measured on this host, 2026-10-18, real GPUix 0.10.0 `TestRenderer`, test theme:

```
<Slider min={0} max={10} step={3} value={9} />   fill width 1116
<Slider min={0} max={10} step={3} value={10} />  fill width 1116   ← identical
<RangeSlider min={0} max={10} step={3} />        end thumb === an explicit [0, 9]
```

and from the pure core:

```
clampValue(10, { min: 0, max: 10, step: 3 })  // 9, not 10
fractionValue(1, { min: 0, max: 10, step: 3 }) // 9
stepValue(9, …, 1)                            // 9  — ArrowRight is stuck
stepValue(10, …, -1)                          // 6  — ArrowLeft skips 9
decideValueKey(9, …, "right")                 // Some(9)
```

So three contract bugs share one cause:

1. `End` (or `value={max}`) reports `10` in `aria-valuetext` but paints the fill
   at 90 %.
2. ArrowRight at `9` does nothing, because `9 + 3` snaps back to `9`.
3. `RangeSlider`'s documented default span never reaches its own maximum, and
   ArrowLeft from `10` jumps to `6` instead of the previous stop, `9`.

`step` is a *quantisation*, not a promise that `max` is unreachable: every
platform slider and every design-system slider (and the docs here) allows the
last stop to be the maximum itself, with a shorter final interval.

## 2. The rule

> **`max` is always a stop.** The track's stops are `min`, `min + step`, … up to
> the largest grid stop not above `max`, and then `max` when the grid did not
> land on it. Clamping picks the nearest stop (a tie goes to `max`), stepping
> moves by **stops**, `Home` is the first and `End` the last, and the painted
> fraction is the stop's position in `[min, max]`.

A continuous range (`step: 0`) is unchanged: no stops, arithmetic in hundredths
of the span.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/value.ts` | one stop model over the normalised range; `clampValue`, `stepValue` and `decideValueKey` use it |
| `packages/primitives/src/core/value.test.ts` | the non-dividing step: nearest stop, `max` as a stop, one step down from `max`, `End`/`Home`, fractions, decimals; the divisible and continuous ranges unchanged |
| `packages/primitives/runtime/value.runtime.test.tsx` | a real `value={max}` paints a full fill, and a default `RangeSlider` puts its end thumb at the end |
| `packages/primitives/docs/slider.mdx` | the `step` row and the value-snapping paragraph state the stop rule |
| `packages/primitives/docs/range-slider.mdx` | the same rule, next to the `defaultValue` row |
| `COMPONENTS.md` | the Slider and Range slider rows, plus the runtime test count |
| `TODO.md` | add and tick the task under the primitives workstream |
| `.agents/slop/plans/README.md` | index this plan |
| `PLAN.md` | no decision row: this is the documented contract, not an architectural choice |

## 4. Exact implementation

### 4.1 `core/value.ts`

Add the stop model under `normalizeRange`. Everything is O(1); a range with a
million steps must not build an array.

```ts
/** A normalised range with a non-zero step, seen as its ordered stops. */
interface Stops {
  readonly range: ValueRange;
  /** The number of whole grid intervals: `min + intervals * step <= max`. */
  readonly intervals: number;
  /** Whether `max` is an extra stop after the last grid stop. */
  readonly extra: boolean;
  /** `intervals + 1`, plus one when `max` is extra. */
  readonly count: number;
}

const STEP_EPSILON = 1e-9;

const stopsOf = (range: ValueRange): Stops => {
  const ratio = (range.max - range.min) / range.step;
  const rounded = Math.round(ratio);
  const intervals =
    Math.abs(ratio - rounded) <= STEP_EPSILON ? rounded : Math.floor(ratio);
  const extra =
    range.max - (range.min + intervals * range.step) >
    STEP_EPSILON * Math.max(1, Math.abs(range.max));
  return { range, intervals, extra, count: intervals + 1 + (extra ? 1 : 0) };
};

/** The stop at an index, clamped into the stop list. */
const stopAt = ({ range, intervals, extra, count }: Stops, index: number): number => {
  const bounded = Math.min(count - 1, Math.max(0, index));
  return extra && bounded > intervals
    ? range.max
    : cleanStep(range.min + Math.min(bounded, intervals) * range.step);
};

/** The stop nearest a value, with a tie going to `max`. */
const nearestStop = (stops: Stops, value: number): number => {
  const { range, intervals, extra } = stops;
  const candidate = stopAt(
    stops,
    Math.round((value - range.min) / range.step),
  );
  if (!extra) return candidate;
  return Math.abs(range.max - value) <= Math.abs(candidate - value)
    ? range.max
    : candidate;
};

/** The index of a value that is already a stop. */
const stopIndex = (stops: Stops, value: number): number =>
  stops.extra && value >= stops.range.max
    ? stops.count - 1
    : Math.min(
        stops.intervals,
        Math.max(0, Math.round((value - stops.range.min) / stops.range.step)),
      );
```

`clampValue` becomes:

```ts
export const clampValue = (value: number, range: ValueRange): number => {
  const normalized = normalizeRange(range);
  if (!Number.isFinite(value)) return normalized.min;
  const clamped = Math.min(normalized.max, Math.max(normalized.min, value));
  if (normalized.step === 0) return clamped;
  return nearestStop(stopsOf(normalized), clamped);
};
```

`stepValue` moves by stop index when stepped, and keeps the hundredth-of-span
arithmetic when continuous:

```ts
export const stepValue = (
  value: number,
  range: ValueRange,
  steps: number,
): number => {
  const normalized = normalizeRange(range);
  if (normalized.step === 0)
    return clampValue(clampValue(value, normalized) + steps * valueStep(normalized), normalized);
  const stops = stopsOf(normalized);
  return stopAt(stops, stopIndex(stops, clampValue(value, normalized)) + steps);
};
```

`decideValueKey` uses the same stops, so `Home` and `End` cannot disagree with
the paint:

```ts
export const decideValueKey = (
  value: number,
  range: ValueRange,
  key: string,
  pageSteps = 10,
): Option.Option<number> => {
  const normalized = normalizeRange(range);
  if (key === "home") return Option.some(normalized.min);
  if (key === "end") return Option.some(normalized.max);
  const steps =
    key === "pageup"
      ? pageSteps
      : key === "pagedown"
        ? -pageSteps
        : ARROW_STEPS[key];
  return steps === undefined
    ? Option.none()
    : Option.some(stepValue(value, normalized, steps));
};
```

`fractionValue`, `pointerValue`, `valueFraction` and `normalizeSpan` are
unchanged: they already go through `clampValue`, which now returns the
maximum's stop.

### 4.2 Core tests

In `src/core/value.test.ts`, add a `describe("a step that does not divide the span")`
block:

```ts
const COARSE = { min: 0, max: 10, step: 3 } as const;

it("makes the maximum a stop of its own", () => {
  // The bug guarded (plan 331): `max` was only an upper bound, so a value of
  // 10 snapped back to the last grid stop, 9, and the track never filled.
  expect(clampValue(10, COARSE)).toBe(10);
  expect(fractionValue(1, COARSE)).toBe(10);
  expect(valueFraction(10, COARSE)).toBe(1);
});

it("snaps to the nearest stop, with a tie going to the maximum", () => {
  expect(clampValue(8, COARSE)).toBe(9);
  expect(clampValue(9.5, COARSE)).toBe(10);
  expect(clampValue(9.4, COARSE)).toBe(9);
});

it("steps to the neighbour stop, not by raw arithmetic", () => {
  // The bug guarded (plan 331): 9 + 3 snapped back to 9 (ArrowRight stuck)
  // and 10 - 3 snapped to 6 (ArrowLeft skipped the previous stop).
  expect(stepValue(9, COARSE, 1)).toBe(10);
  expect(stepValue(10, COARSE, -1)).toBe(9);
  expect(decideValueKey(9, COARSE, "right")).toStrictEqual(Option.some(10));
  expect(decideValueKey(10, COARSE, "left")).toStrictEqual(Option.some(9));
});

it("keeps Home and End on the ends the track paints", () => {
  expect(decideValueKey(4, COARSE, "home")).toStrictEqual(Option.some(0));
  expect(decideValueKey(4, COARSE, "end")).toStrictEqual(Option.some(10));
});

it("includes the maximum for a decimal step that does not divide", () => {
  const thirds = { min: 0, max: 1, step: 0.3 } as const;
  expect(clampValue(1, thirds)).toBe(1);
  expect(stepValue(0.9, thirds, 1)).toBe(1);
  expect(stepValue(1, thirds, -1)).toBe(0.9);
  expect(clampValue(0.94, thirds)).toBe(0.9);
});
```

Keep and re-run the existing divisible-range cases (`clampValue(37, {0, 100, 10})`
→ `40`, `stepValue(100, RANGE, 1)` → `100`, the `1..10 step 2` cases) and the
continuous cases; they must be unchanged.

### 4.3 Runtime tests

In `runtime/value.runtime.test.tsx`, reuse `partsOf` and `boundsOf`:

```tsx
it("paints a maximum whose step does not divide the span", async () => {
  // Plan 331 §1: value 10 with step 3 painted the same 1116 px fill as 9.
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Slider testId="nine" label="Nine" min={0} max={10} step={3} value={9} />
      <Slider testId="ten" label="Ten" min={0} max={10} step={3} value={10} />
    </Stack>,
  );
  const widthOfFill = (testId: string): number =>
    Option.getOrElse(runtime.boundsOfId(partsOf(runtime, testId)[0]!.id), () =>
      expect.fail(`no fill for ${testId}`),
    ).width;
  expect(widthOfFill("ten")).toBeGreaterThan(widthOfFill("nine"));
  expect(announced(runtime, "Ten")).toBe("10");
});

it("starts a default RangeSlider at its maximum", async () => {
  // Plan 331 §1: `defaultValue` is documented as [min, max], but a step of 3
  // normalised the end to 9, so a "full" range had a strip of empty rail.
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <RangeSlider testId="full" label="Full" min={0} max={10} step={3} />
      <RangeSlider
        testId="nine"
        label="Nine"
        min={0}
        max={10}
        step={3}
        defaultValue={[0, 9]}
      />
    </Stack>,
  );
  const offset = (testId: string): number => {
    const track = boundsOf(runtime, testId);
    return boundsOf(runtime, `${testId}-thumb-end`).x - track.x;
  };
  expect(offset("full")).toBeGreaterThan(offset("nine"));
});
```

Also extend the existing keyboard test with a coarse range: `End` announces
`10`, the fill matches the `ten` slider, and `left` announces `9`.

### 4.4 Docs

- `slider.mdx`: the `step` row ends "…and the **maximum is always a stop**, so
  a step that does not divide the span still reaches `max` (the last interval is
  shorter)". The paragraph below the API table says a value snaps to the nearest
  stop, measured from `min`, with a tie going to `max`.
- `range-slider.mdx`: the `step` row and one sentence under the value paragraph:
  a full `[min, max]` band paints end to end even when the step does not divide
  the span.
- `COMPONENTS.md`: append to the Slider and Range slider notes — measured
  `value={10}` with `step={3}` painted 9's fill (`1116` both) and now fills the
  track; `End`/the default range reach the end.
- `TODO.md`: add the task with the plan number and tick it.
- `.agents/slop/plans/README.md`: add the row to the primitives table.

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | write the core and runtime tests **before** the fix | core: `clampValue(10)` → `9`; runtime: the two fills both `1116`, the range offsets equal |
| 2 | `nub run --filter @gpuixui/primitives test -- value` | only the old-direction assertions fail |
| 3 | apply §4.1 | — |
| 4 | `nub run --filter @gpuixui/primitives test` | all files green (523 + the new cases) |
| 5 | `nub run --filter @gpuixui/primitives test:runtime` | all files green (316 + the new cases) |
| 6 | `nub run --filter @gpuixui/primitives check-types` | Done |
| 7 | `nub run check` | tests, lint, fmt and types green |
| 8 | `nub run test` | every workspace green |

## 6. STOP conditions

- **STOP** if a **divisible** range changes any result: `0..100 step 1`,
  `0..100 step 10`, `1..10 step 2` and `0..1 step 0.25` must keep their stops.
- **STOP** if a continuous range (`step: 0`) starts snapping.
- **STOP** if `PageUp`/`PageDown` move by a value instead of a stop when stepped.
- **STOP** if `NumberField`'s or `Rating`'s ranges are touched — they own their
  own arithmetic.
- **STOP** outside §3's files.

## 7. Acceptance

- [x] `clampValue(max)` is `max` for any `step`, and the painted fraction is `1`.
- [x] ArrowRight at the last grid stop reaches `max`; ArrowLeft from `max`
      returns to that stop; `End`/`Home` match the paint.
- [x] A default `RangeSlider` paints end to end; its `defaultValue` is still
      `[min, max]`.
- [x] Divisible and continuous ranges are unchanged.
- [x] Both suites, `nub run check` and `nub run test` are green; docs,
      `COMPONENTS.md` and `TODO.md` agree.

## 8. Measured results

### 8.1 Both failing directions

The probes that found the defect, on the old code:

```
clampValue(10, { min: 0, max: 10, step: 3 })   → 9
fractionValue(1, { min: 0, max: 10, step: 3 })  → 9
stepValue(9, …, 1)                             → 9
stepValue(10, …, -1)                           → 6
decideValueKey(9, …, "right")                  → Some(9)
```

`value={10}` and `value={9}` both painted a `1116` px fill; a default
`RangeSlider` put its end thumb exactly where an explicit `[0, 9]` did.

Then the new tests were run against a mutated `value.ts` (the old snap and the
old arithmetic, restored immediately after):

| Suite | Old direction |
| ----- | ------------- |
| `src/core/value.test.ts` | 4 failed: `expected 9 to be 10` (the maximum stop), `expected 9 to be 10` (the tie), `expected 9 to be 10` (ArrowRight), `expected 0.9 to be 1` (decimal) |
| `runtime/value.runtime.test.tsx` | 3 failed: `expected 1116 to be greater than 1116` (paint), `expected '9' to be '10'` (ArrowLeft), `expected 1116 to be greater than 1116` (default range) |

The `Home`/`End` case and the "unchanged" case pass in both directions by
design: `End` already returned `max`, which was the inconsistency — it
announced a value the track could not paint. The paint tests are what catch it.

### 8.2 After the fix

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  529 passed (529)   (523 + 6)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  319 passed (319)   (316 + 3)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done

nub run test
  tokens 196, testing 19, icons 19, playground 11, components 308,
  primitives 529 — all green
```

