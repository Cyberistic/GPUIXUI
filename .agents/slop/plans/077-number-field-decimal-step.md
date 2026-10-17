# 077 — `NumberField`'s decimal step carries floating-point noise

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `054`, `064` |
| Status | **done** |

Self-contained: §1 the gap, §2 the rule, §3 exact files, §4 tests, §5 commands,
§6 STOP conditions, §7 acceptance and outcome.

---

## 1. The gap

`core/number.ts`'s `stepNumber` adds `steps * range.step` and clamps. A decimal
step therefore reports binary floating-point noise:

```ts
stepNumber(0.2, { step: 0.1 }, 1) // 0.30000000000000004
stepNumber(1.1, { step: 0.1 }, 1) // 1.2000000000000002
```

Measured with the runtime probe added to `runtime/number-field.runtime.test.tsx`
before the fix: a field with `defaultValue={0.2}`, `step={0.1}`,
`precision={1}` reports `0.30000000000000004` from `onChange` after one
`ArrowUp`, while painting `0.3` — the displayed number and the stored number
disagree.

`precision` is documented as a **display** rule and stays one: this plan does not
round typed values to `precision`, it only removes the arithmetic noise a decimal
step introduces.

## 2. The rule

`stepNumber` returns an **exact decimal** result: the clamped sum trimmed to 12
decimal places, a precision no UI step needs and every JS number can carry.

```ts
const MAX_STEP_DECIMALS = 12;

const exact = (value: number): number =>
  Number.isFinite(value) ? Number(value.toFixed(MAX_STEP_DECIMALS)) : value;

export const stepNumber = (value, range, steps) =>
  exact(clampNumeric(value + steps * (range.step > 0 ? range.step : 1), range));
```

- `0.2 + 0.1` becomes `0.3`; `1.1 + 0.1` becomes `1.2`; negatives behave the same
  way.
- Typed precision survives: `1.234 + 1` is `2.234`, not `2`.
- A bound still wins: the trim happens **after** `clampNumeric`.
- A non-finite value is returned unchanged (a consumer-supplied `Infinity` is
  their state, not a rounding problem).
- `parseNumericText`, `clampNumeric` and `formatNumber` are unchanged.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/number.ts` | `MAX_STEP_DECIMALS`, `exact`, trim inside `stepNumber`; documented |
| `packages/primitives/src/core/number.test.ts` | the pure cases in §4 |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | the runtime case in §4 |
| `packages/primitives/docs/number-field.mdx` | decimal steps are exact; `precision` stays display-only; Verification list |
| `COMPONENTS.md` | the Number Field row records the rule |
| `TODO.md` | tick the task added for this plan |
| `.agents/slop/plans/README.md` | index this plan and its status |

Implementation notes:

- No new props and no API change.
- Do not round the `value` a consumer passes in; only the result of a step.
- `Number.prototype.toFixed` is used for the decimal trim, not a locale
  formatter: the field's value is binary, and the trim must not depend on locale.
- Keep `Number.isFinite` so a non-finite value is not silently turned into a
  string.

## 4. Tests — each able to fail

**Pure (`src/core/number.test.ts`)**

1. `stepNumber(0.2, { step: 0.1 }, 1)` is `0.3` and
   `stepNumber(1.1, { step: 0.1 }, 1)` is `1.2`. `toBe` is `Object.is`, so the
   pre-fix noise fails it.
2. A negative decimal steps exactly: `stepNumber(-0.2, { step: 0.1 }, -1)` is
   `-0.3`.
3. Typed precision is preserved: `stepNumber(1.234, { step: 1 }, 1)` is `2.234`.
4. A bound still wins and the result is still exact:
   `stepNumber(0.2, { step: 0.1, max: 0.3 }, 1)` is `0.3`.

**Runtime (`runtime/number-field.runtime.test.tsx`)**

5. A field with `defaultValue={0.2}`, `step={0.1}`, `precision={1}`, `autoFocus`;
   one native `ArrowUp` on the input reports **exactly** `0.3` through
   `onChange`, and the painted text is `0.3`. Before the fix the reported value
   is `0.30000000000000004`.

**Two-direction proof**

- Remove the `exact(...)` call and re-run test 5: it fails on the noise value
  (recorded in §7). Keep the whole number-field runtime suite green.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
```

- the offline suite gains the §4 cases and passes;
- the runtime suite grows from 181 to 182 tests, 16 files, exit `0` (update the
  counts in `COMPONENTS.md` and `packages/primitives/README.md`);
- `check` is green (tests, lint, format, types).

## 6. STOP conditions

Stop and report instead of improvising if:

- the trim changes a value a consumer typed (it must only affect step results);
- `toFixed(12)` throws or loses a large value (then cap by magnitude and record
  the measurement instead of shipping it);
- the fix needs a new prop or a change outside `core/number.ts` and the two test
  files.

## 7. Acceptance and outcome

Accepted when: a decimal step reports an exact decimal, typed precision and
bounds are unchanged, the docs state the rule, and every gate in §5 is green.

**Outcome (2026-10-17).**

- `stepNumber` now trims the clamped result to 12 decimal places through
  `exact(...)`; nothing else changed.
- Offline: 4 new `stepNumber` cases; no existing expectation moved.
- Runtime: 1 new test — one `ArrowUp` on a `step={0.1}` field reports `0.3` and
  paints `0.3`. Suite **16 files / 182 tests**, exit `0`.
- Two directions: removing the `exact(...)` call makes the runtime test fail
  with `0.30000000000000004` (and `Object.is` fails the core cases); restored, all
  green.
- `docs/number-field.mdx`, `COMPONENTS.md`, `README.md` and the task in `TODO.md`
  state the rule and the new counts.
