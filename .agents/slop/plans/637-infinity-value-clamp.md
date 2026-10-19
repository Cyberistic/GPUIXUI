# 637 — an infinity must clamp to its own bound in every value control

**Phase:** F (consistency pass over Tier 1 value controls)
**Owner:** primitives workstream (`packages/primitives`)
**Depends on:** 053 (value controls), 331 (stops), 366 (rating limit), 371
(nonsense numbers), 392 (non-finite `NumberField` value), 580 (blank value text)

## 0. The defect

`core/value.ts` collapses **every** non-finite number into the "unreadable"
branch:

```ts
// clampValue
if (!Number.isFinite(value)) return normalized.min;

// fractionValue
const bounded = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
```

`NaN` and `±Infinity` are not the same thing. `NaN` is unreadable; an infinity is
a number that is simply out of range, and every document in this package says an
out-of-range value clamps:

- `docs/slider.mdx` §Values — "Out-of-range values are clamped … `NaN` reads as
  `min`".
- `docs/meter.mdx` — `value` is "the measurement; clamped into the range".
- `docs/rating.mdx` §Values — "clamped to `0..max`".
- `docs/number-field.mdx` already states the correct rule: "`+Infinity` reads as
  the bound on its own side (`max` …) and `-Infinity` as `min`".
- `core/style.ts`'s `progressPercent` already clamps `+Infinity` to `100`.

Measured on the current tree:

| control | input | paints / announces today | documented |
| ------- | ----- | ------------------------ | ---------- |
| `Progress` | `value={Infinity}` | `"100%"`, full bar | full (correct) |
| `NumberField` | `value={Infinity}` | `max`, else floor | `max` (correct) |
| `Slider` | `value={Infinity}` | `min`, empty track, `"0"` | `max`, full track |
| `RangeSlider` | `value={[0, Infinity]}` | `[0, 0]` | `[0, max]` |
| `Meter` | `value={Infinity}` | `"0"`, `width: "0%"` | `max`, `width: "100%"` |
| `Rating` | `value={Infinity}` | `0` (unrated) | clamped to `0..max` |

So the same value means "full" for the bar and the field and "empty" for the
slider, meter and rating. That is the class this plan fixes: **`NaN` is
unreadable and reads as the floor; `±Infinity` is out of range and clamps to the
bound on its own side.**

Keep `usableLength` unchanged: a *length* or *track count* that is infinite is
not paintable and still falls back (plans `371`, `366`).

## 1. Files to change

### 1.1 `packages/primitives/src/core/value.ts`

- `clampValue` (line ~151): replace
  `if (!Number.isFinite(value)) return normalized.min;` with
  `if (Number.isNaN(value)) return normalized.min;`.
  Update its doc comment: "`NaN` reads as `min` … an infinity is out of range and
  clamps to the bound on its side."
- `fractionValue` (line ~181): replace the `Number.isFinite` guard with
  `Number.isNaN`:
  ```ts
  const bounded = Number.isNaN(fraction)
    ? 0
    : Math.min(1, Math.max(0, fraction));
  ```
- `pointerValue` (line ~263): replace `!Number.isFinite(x)` with
  `Number.isNaN(x)`; a pointer sent to infinity is outside the box and must clamp
  to the nearest end, exactly like a pointer at `-120`.
- `valueFraction` needs no code change: it delegates to `clampValue`, so it
  starts returning `1` for `+Infinity` and `0` for `-Infinity`.
- `stepValue` / `moveSpanEnd` / `normalizeSpan` need no code change: they all
  delegate to `clampValue`.

### 1.2 `packages/primitives/src/core/rating.ts`

- `clampRating` (line ~17): replace
  `if (!Number.isFinite(value)) return 0;` with
  `if (Number.isNaN(value)) return 0;`, and update the comment to say the
  infinity clamps on its own side. `ratingLimit` (the **count**) keeps treating
  a non-finite `max` as one star — that is a length, not a value.

### 1.3 Tests

Add cases (names are the contract; keep them exactly):

`packages/primitives/src/core/value.test.ts`
- in `describe("clampValue")`:
  - `"clamps an infinity to the bound on its side"` —
    `clampValue(+Infinity, RANGE) === 100`,
    `clampValue(-Infinity, RANGE) === 0`,
    and with `{ min: 1, max: 10, step: 2 }` → `10` / `1`.
  - keep `"reads an unreadable value as the minimum"` for `NaN`.
- in `describe("valueFraction / fractionValue")`:
  - `"maps an infinite value to its own end of the track"` —
    `valueFraction(+Infinity, RANGE) === 1`,
    `valueFraction(-Infinity, RANGE) === 0`,
    `fractionValue(+Infinity, RANGE) === 100`,
    `fractionValue(-Infinity, RANGE) === 0`.
- in `describe("stepping")` (or a new `describe("pointerValue")` if that is
  cleaner):
  - `"clamps a pointer sent to infinity to the nearest end"` —
    `pointerValue(+Infinity, BOX, RANGE) === 100`,
    `pointerValue(-Infinity, BOX, RANGE) === 0`.
- in `describe("range spans")`:
  - `"clamps an infinite end to its own bound"` —
    `normalizeSpan({ start: 0, end: +Infinity }, RANGE)` →
    `{ start: 0, end: 100 }`; the negative case clamps `start` to `0`.

`packages/primitives/src/core/rating.test.ts`
- `"clamps an infinity to its own end of 0..max"` —
  `clampRating(+Infinity, 5) === 5`, `clampRating(-Infinity, 5) === 0`; keep the
  `NaN` "unrated" case.

`packages/primitives/src/components/Meter.test.tsx`
- `"clamps an infinite measurement to its own end of the range"` — render
  `Meter value={+Infinity}` and assert `aria-valuetext === "100"` and the fill's
  `width === "100%"`; render `value={-Infinity}` and assert `"0"` / `"0%"`.

`packages/primitives/runtime/value.runtime.test.tsx`
- one new case, `"clamps an infinity to its own bound in every value control"`:
  mount in one window a `Slider` (`value={+Infinity}`, `label="High"`), a
  `Meter` (`value={+Infinity}`, `label="Disk"`), a `RangeSlider`
  (`value={[0, +Infinity]}`, `label="Band"`) and a `Rating`
  (`value={+Infinity}`, `label="Stars"`). Assert:
  - `announced(runtime, "High") === "100"`;
  - `announced(runtime, "Disk") === "100"`, and the meter's fill width equals its
    track width (within 2 px, the file's slop);
  - `announced(runtime, "Band maximum") === "100"`;
  - the accessibility tree's last star (`"5 of 5"`) is `checked`.
  Then rerender with `-Infinity` and assert `"0"`, `"0"` and the range's start
  `"0"`. A second small case may assert the reference controls stay correct
  (`Progress value={+Infinity}` → `"100%"`) if the first case reads long.

### 1.4 Docs (in-package, owned here)

- `docs/slider.mdx` §Values: after the `NaN` sentence add: "An infinity is just
  out of range, so it clamps to its own end: `+Infinity` reads as `max` and
  `-Infinity` as `min` (the same rule the field and meter follow)."
- `docs/range-slider.mdx`: add the same one sentence to its Values/API copy (it
  shares `core/value.ts`).
- `docs/meter.mdx` API row: "clamped into the range; `NaN` reads as `min`,
  `+Infinity` as `max`, `-Infinity` as `min`."
- `docs/rating.mdx` §Values: replace "a value that is not a number reads as
  unrated" with "`NaN` reads as unrated; `±Infinity` clamps to its own end."
- `COMPONENTS.md` rows for `Slider`, `Range slider`, `Meter` and `Rating`: append
  one sentence: "**Infinite value (637):** `+Infinity` clamps to `max` and
  `-Infinity` to `min`; `NaN` still reads as the floor (slider/meter) or unrated
  (rating)." Keep the rows `wip` (the provenance reason is unchanged).

### 1.5 Records

- `.agents/slop/plans/README.md`: append this plan to the primitives table with
  status `done` and the measured counts once green.
- `TODO.md` primitives section: add a ticked row with the defect and the counts.
- `PLAN.md` §4: add `D48` — "A numeric value that is an infinity clamps to the
  bound on its own side; only `NaN` is unreadable. Lengths and counts keep
  falling back for any non-finite input." Rationale: the same `value` must mean
  the same thing to every value control (the table above).

## 2. Commands and expected results

Run from the repo root. Iterate with scoped commands; the full suites are the
end-of-task gate.

```sh
# 1. Red: the new assertions must fail against the current code.
nub run --filter @gpuixui/primitives test src/core/value.test.ts src/core/rating.test.ts src/components/Meter.test.tsx
# expected before the fix: the infinity cases fail (slider/meter report 0, rating 0).
# expected after the fix: all files green.

# 2. Red in the real runtime, then green.
nub run --filter @gpuixui/primitives test:runtime runtime/value.runtime.test.tsx
# expected before: "High"/"Disk" announce "0"; Meter fill is 0 px.
# expected after: 100 / 100 / full fill / 5-of-5 checked.

# 3. Gates.
nub run check
nub run lint
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

`nub run test` at the root also runs the offline suite; the runtime suite is the
opt-in host gate. Record the exact before/after test counts in the plan's
result section and in `TODO.md`.

## 3. STOP conditions

Stop and report instead of improvising if:

- `Math.min`/`Math.max` do not produce the expected end for `±Infinity` on this
  Node version (they do by spec; this would mean the fix is elsewhere);
- any existing test fails for a reason other than an assertion that encoded the
  old infinity behaviour. If an existing test says `Infinity → min`, it is
  evidence of the defect: update it **and** name it in the plan result, never
  delete it;
- the runtime case cannot mount all four controls in one window (window size):
  split it into one window per control rather than weakening the assertions;
- the fix would require changing `usableLength`/`ratingLimit`/`progressPercent`;
  those are lengths/counts and are already correct — do not touch them.

## 4. Test plan — why each test can fail

| Test | Guards | Fails without the fix because |
| ---- | ------ | ----------------------------- |
| `clampValue` infinity case | the shared clamp | `Number.isFinite(+Infinity)` is false and the old branch returns `min` |
| `valueFraction/fractionValue` infinity case | the paint fraction | the old `Number.isFinite(fraction)` returns `0`, and `valueFraction` inherits `clampValue`'s `min` |
| `pointerValue` infinity case | the pointer clamp | the old guard returns `min` |
| `normalizeSpan` infinity case | range end clamping | it delegates to the old `clampValue` |
| `clampRating` infinity case | the rating value | the old `Number.isFinite` returns `0` |
| `Meter` element case | the announcement and the fill | both are computed from the old `clampValue` (`"0"`, `"0%"`) |
| runtime value case | the real paint + a11y tree | the same math runs in the mounted component; the fill is 0 px and the value text is `"0"` |

Both directions are proven by running the new tests before and after the change;
do not baseline any assertion to the old result.

## 5. Acceptance

- [x] The new core, element and runtime tests fail on the old code and pass on
      the new code (recorded in §6).
- [x] `nub run check`, `nub run lint`, `nub run test`, the primitives offline
      suite and the primitives runtime suite are green.
- [x] `docs/slider.mdx`, `docs/range-slider.mdx`, `docs/meter.mdx` and
      `docs/rating.mdx` state the rule; `COMPONENTS.md` rows record it.
- [x] Plan indexed, `TODO.md` row ticked, `PLAN.md` D48 added.
- [x] Commit on `agent/primitives` and push.

## 6. Result

- **Red run (old code), 2026-10-19:** 3 files run, **6 failed / 837 passed** —
  - `Meter > clamps an infinite measurement to its own end of the range`
  - `clampRating > clamps an infinity to its own end of 0..max`
  - `clampValue > clamps an infinity to the bound on its side`
  - `valueFraction / fractionValue > maps an infinite value to its own end of the track`
  - `pointerValue > clamps a pointer sent to infinity to the nearest end`
  - `range spans > clamps an infinite end to its own bound`
  The measured message for `valueFraction(+Infinity)` was `expected +0 to be 1`;
  `normalizeSpan({ start: 0, end: +Infinity })` returned `{ start: 0, end: 0 }`.
- **Green run (new code), 2026-10-19:** the three scoped files are **63/63**;
  the package offline suite is **60 files / 843 tests, all passing**.
- **Runtime, new case:** red with `clampValue`/`clampRating` reverted to
  `Number.isFinite` — `runtime/value.runtime.test.tsx > clamps an infinity to
  its own bound in every value control` failed with `expected '0' to be '100'`
  (1 failed / 21 passed); restored, the file is **22/22** and the full runtime
  suite is **57 files / 798 tests**, all passing on the release-tag build.
- `nub run check` and `nub run lint` green (recorded in the commit / TODO row).
