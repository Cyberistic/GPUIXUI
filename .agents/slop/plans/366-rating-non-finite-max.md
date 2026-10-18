# 366 — `Rating max` crashes on infinity and paints "1 of NaN"

| Field | Value |
| ----- | ----- |
| Phase | F (robustness / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `054`, `070`, `094` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, element tree)

`ratingMax` documents itself as *"A usable star count: at least one, whole"*:

```ts
export const ratingMax = (max: number | undefined): number =>
  Math.max(1, Math.trunc(max ?? 5));
```

`Number.trunc(NaN)` is `NaN` and `Math.max(1, NaN)` is `NaN`; `Infinity` stays
`Infinity`. The value then reaches `Arr.range(1, max)` and the star's name.

A probe called `renderRating` with a non-finite count:

| `max` | Result |
| ----- | ------ |
| `Number.POSITIVE_INFINITY` | **throws** `RangeError: Invalid array length` — the component cannot render at all |
| `Number.NaN` | renders one star named `"1 of NaN"` |

`core/rating.ts` already normalises the same input for values and keys, in
`limitOf`: `Math.max(1, Math.trunc(Number.isFinite(max) ? max : 1))`. So the
module is internally inconsistent: `clampRating(2, NaN)` is `1`, while the star
count built beside it is `NaN`.

## 1. The decision

**One rule for a usable star count, in `core/rating.ts`.** `ratingMax` becomes a
thin default over it (`max ?? 5`), and the component stops carrying a second
copy of the arithmetic.

The fallback for a non-finite count is **one star** — the lower bound the
existing clamp already uses, and the value `Math.max(1, …)` promises. It is a
caller error, not a mode: 0, `NaN`, `±Infinity` all mean "no usable count", and
one star is the smallest control that still is one.

## 2. The rule

`core/rating.ts`:

```ts
/** A usable star count: a whole number, at least one. */
export const ratingLimit = (max: number): number =>
  Math.max(1, Math.trunc(Number.isFinite(max) ? max : 1));
```

`limitOf` is renamed to the exported `ratingLimit` and used by `clampRating`,
`decideRating`, `previewRating` and `ratingTabStop` as before.

`Rating.tsx`:

```ts
import { clampRating, …, ratingLimit } from "../core/rating.js";

/** A usable star count: at least one, whole. */
export const ratingMax = (max: number | undefined): number =>
  ratingLimit(max ?? 5);
```

No public type change.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/rating.ts` | export `ratingLimit`; replace the four `limitOf` uses |
| `packages/primitives/src/components/Rating.tsx` | `ratingMax` delegates to `ratingLimit` |
| `packages/primitives/src/core/rating.test.ts` | one case per non-finite value and the fractional/zero lower bound |
| `packages/primitives/src/components/Rating.test.tsx` | `renderRating` with `Infinity` and `NaN` renders one star named `"1 of 1"` |
| `packages/primitives/runtime/rating.runtime.test.tsx` | the real renderer mounts both counts and exposes one `radio` named `"1 of 1"` |
| `packages/primitives/docs/rating.mdx` | the `max` row states the non-finite fallback |
| `COMPONENTS.md` | the Rating row records it |
| `TODO.md` | tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test -- src/core/rating.test.ts src/components/Rating.test.tsx` | the new cases pass; the existing contract cases stay green |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 609 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/rating.runtime.test.tsx` | the new case passes; the existing rating cases stay green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 30 files / 590 tests) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

1. **`core/rating.test.ts` — "a usable count is whole, finite and at least one"** —
   `ratingLimit` over `[NaN, Infinity, -Infinity, 0, -3, 2.9, 5]` is
   `[1, 1, 1, 1, 1, 2, 5]`.
2. **`Rating.test.tsx` — "renders one named star for a non-finite count"** — the
   existing pure render helper with `max: Infinity` and `max: NaN`; assert one
   star child and `aria-label` `"1 of 1"`. Before: the first throws, the second
   says `"1 of NaN"`.
3. **`runtime/rating.runtime.test.tsx` — "mounts a non-finite count as one star"** —
   mount `<Rating max={Infinity} label="Score" />` and assert the a11y tree has
   exactly one `radio` node named `"1 of 1"`. Before: the mount throws.

### 5.3 Two-direction proof

Run cases 2 and 3 against the old `ratingMax`: both fail — the element case with
`RangeError: Invalid array length` and the runtime case with the same throw
(before any assertion). Case 1 is new API (`ratingLimit` did not exist), so it
guards the rule rather than a regression; the two render cases are the
directions that must fail without the fix.

## 6. STOP conditions

1. `test:runtime` cannot load the binding.
2. A non-finite count turns out to be reachable from a supported path with a
   different expected fallback (e.g. the app's record loader) — then stop and
   record the requirement instead of choosing 5 vs 1 by guesswork.
3. A gate fails for an unrelated reason — report it.

## 7. Outcome

`ratingMax` now delegates to one exported `ratingLimit`, and the four star-count
uses in `core/rating.ts` share it. Measured after the fix:

| Input | Before | After |
| ----- | ------ | ----- |
| `max={Infinity}` | `RangeError: Invalid array length` on render | one star named `"1 of 1"` |
| `max={NaN}` | one star named `"1 of NaN"` | one star named `"1 of 1"` |
| `max={2.9}` / `max={5}` | `2` / `5` | unchanged |
| `max={0}` | `1` | unchanged |

The runtime case mounts the infinite count in the real `TestRenderer` and finds
exactly one `radio` named `"1 of 1"`. Offline **43 files / 611 tests** (609 + 2),
runtime **30 files / 591 tests** (590 + 1). `nub run check`, `nub run lint` and
`nub run test` pass.

## 8. Acceptance

- [x] A non-finite `max` renders instead of throwing.
- [x] The star count, its names and the clamp all use one rule.
- [x] The docs state the fallback.
- [x] Every new case fails in the old direction.
- [x] The three gates and the full runtime suite pass.
