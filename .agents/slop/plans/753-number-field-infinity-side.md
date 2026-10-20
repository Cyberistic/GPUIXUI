# 753 — An infinite field value takes the wrong side when its own bound is absent

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (Tier 1 truth + one rule) |
| Owner | primitives workstream |
| Depends on | `054` (NumberField), `362` (field contract), `371` (nonsense numbers), `378` (stepper range), `392` (non-finite value), `637` (infinity clamps to its own side) |
| Feeds | `core/number.ts`, the Number Field row in `COMPONENTS.md`, `docs/number-field.mdx`, the nonsense-number runtime suite |

## 1. Goal and the defect being guarded

`NumberField` resolves a non-finite `value`/`defaultValue` to a finite neighbour
before it paints, announces or steps (`core/number.ts` `finiteFieldValue`, plan
`392`). The rule is documented as "an infinity reads as the bound on its own
side". It does that only when **both** bounds exist:

| Input | Today | Why |
| --- | --- | --- |
| `value={-Infinity} max={100}` | **`100`** | `min` is absent, so the negative branch falls through to `max` |
| `value={Infinity} min={-100}` | **`-100`** | `max` is absent, so the positive branch falls through to `min` |

Both paint and announce a value on the **opposite** side of the range. A record
with an unbounded lower end and a declared maximum is ordinary (a score capped at
100, a credit field capped at 0): a wire sentinel `-Infinity` renders as the
maximum, the steppers then say "at maximum", and the caller's `onValueChange`
never fires because the painted value is not the value supplied.

The existing tests pin the documented fallbacks (`-Infinity` with only `max=-10`
→ `-10`, and `±Infinity` with no bounds → `0`), so those cases are correct and
must stay correct. The defect is exactly the case where the present bound is on
the value's **other** side.

## 2. Measured evidence (this worktree, offline rule, 2026-10-20)

A throwaway probe (created, run, deleted) called `clampNumeric` directly:

```text
negMax100:    -Infinity  max 100   ->  100   (expected 0)
negMaxNeg10:  -Infinity  max -10   ->  -10   (correct: the only finite bound)
posMin10:      Infinity  min 10    ->   10   (correct: the only finite bound)
posMinNeg100:  Infinity  min -100  -> -100   (expected 0)
```

The probe failed by design; its output is the evidence above.

## 3. The rule

A non-finite value resolves to a **finite neighbour inside the bounds**:

- `NaN` keeps its documented rule — the floor, `min ?? 0` (the clamp itself then
  applies a negative `max`).
- `+Infinity` is `max` when one exists, otherwise `0` clamped **up** to a
  positive `min` (`Math.max(max ?? 0, min ?? 0)`).
- `-Infinity` is `min` when one exists, otherwise `0` clamped **down** to a
  negative `max` (`Math.min(min ?? 0, max ?? 0)`).

The neutral `0` is only a fallback for an absent bound; a present bound on the
value's own side still wins. With both bounds present the expressions reduce to
`max` / `min`, so every existing case is unchanged.

## 4. Files (exact)

| File | Change |
| --- | --- |
| `packages/primitives/src/core/number.ts` | `finiteFieldValue`: replace the two fall-through branches with the rule in §3; the JSDoc states the absent-bound case |
| `packages/primitives/src/core/number.test.ts` | add the cases from §6 to the "reads a value that is not a number as a finite one" case |
| `packages/primitives/runtime/nonsense-numbers.runtime.test.tsx` | add the two wrong-side fields to the "never paints NaNs for a bound or a step it cannot read" matrix and assert `"0"` for both; update the header with this plan's bug |
| `packages/primitives/docs/number-field.mdx` | §Value handling: replace "`-Infinity` as `min` (else `max`, else `0`)" with the measured rule; §Verification names the new matrix values |
| `COMPONENTS.md` | the Number Field row: add the one-line wrong-side rule and its case |
| `TODO.md` | add a ticked row for this plan under the primitives section |
| `.agents/slop/plans/README.md` | add the plan `753` row |

## 5. Commands and expected results

Run from the repository root unless a package filter is given:

| Command | Expected |
| --- | --- |
| `nub run --filter @gpuixui/primitives test src/core/number.test.ts` | the file passes; the four new cases fail **before** the fix on `negMax100` and `posMinNeg100` and pass after |
| `nub run --filter @gpuixui/primitives test:runtime runtime/nonsense-numbers.runtime.test.tsx` | 1 file / 5 tests, exit `0`; the two new fields paint `"0"` |
| `nub run --filter @gpuixui/primitives test` | 71 files / 982 tests (the existing count) plus the assertions added inside existing cases, all green |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run lint` | exit `0` |

Do not run the full live suite: this change touches one pure rule and one runtime
file, so the scoped runtime file is the proof (see the workstream instruction).

## 6. Test plan and failing directions

| Where | Case | Asserts |
| --- | --- | --- |
| core | a negative infinity with only a positive maximum | `clampNumeric(-Infinity, { step: 1, max: 100 }) === 0` |
| core | a positive infinity with only a negative minimum | `clampNumeric(Infinity, { step: 1, min: -100 }) === 0` |
| core | the documented single-bound cases stay | `-Infinity` + `max=-10` → `-10`; `Infinity` + `min=10` → `10`; both unbounded → `0` |
| runtime | two fields in the non-finite matrix | `value={-Infinity} max={100}` and `value={Infinity} min={-100}` paint `"0"`, not `"100"` / `"-100"` |
| runtime | the whole matrix | no painted `"NaN"`/`"Infinity"` and the existing painted-text array is unchanged apart from the two new `"0"` entries |

**Failing directions measured (recorded in §8):**

1. Revert `finiteFieldValue` to the shipped expression → the two new core cases
   fail with `100` / `-100`, and the runtime matrix paints `"100"` / `"-100"`.
2. Ignore a present bound and always answer the neutral `0` for an infinity →
   the both-bounds cases fail (`+Infinity` with `0…100` paints `0`; a step from
   it paints `0` instead of `99`).
3. The `NaN` branch is deliberately left as the floor. Measuring a neutral
   branch for `NaN` produced the same final clamp for every case (the clamp
   applies the one present bound), so it has no observable effect; the rule is
   kept explicit for intent, not announced as a distinct failure direction.

## 7. STOP conditions

- Stop if the runtime paints something other than `"0"` for either new field
  after the fix: record the measured text and do not re-baseline the matrix
  without explaining which rule produced it.
- Stop if an existing case in `number.test.ts`, `nonsense-numbers.runtime` or
  `number-field.runtime` changes its expected value. The rule must be a strict
  extension: the only new outcomes are the two absent-bound cases.
- Do not change `core/value.ts`, `core/rating.ts` or `Progress` — plans `637`
  already measured those and they clamp on the right side.

## 8. Outcome

_Landed 2026-10-20._

- The rule is `Math.max(max ?? 0, min ?? 0)` for `+Infinity` and
  `Math.min(min ?? 0, max ?? 0)` for `-Infinity`; `NaN` keeps `min ?? 0`.
- The two new wrong-side core assertions fail against the shipped expression
  (`100` and `-100`) and pass after it, with a third single-bound guard
  (`+Infinity` under `min={10}` → `10`); the documented single-bound cases were
  unchanged.
  Changing the rule back to the old expression failed the same case by name
  (`expected 100 to be +0`); replacing the branch with an unconditional `0`
  failed the both-bounds and step cases (`expected +0 to be 100` / `99`).
- The scoped runtime file paints `"0"` for `-Infinity` under `max=100` and for
  `Infinity` under `min=-100`; the rest of the matrix is byte-identical
  (`runtime/nonsense-numbers.runtime.test.tsx`, 5/5).
- Offline suite: 71 files / 982 tests green; `check-types` clean. The root
  `nub run test` is green (primitives 982, components 308, icons and playground
  included). `nub run lint` and `nub run check:tests` pass; `nub run check`
  reaches only the pre-existing `apps/docs/src/components/docs/demos.tsx`
  formatting failure recorded in `TODO.md`, outside this workstream.
- The docs now state the absent-bound rule and the inventory row records the
  case.
