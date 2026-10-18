# 392 — A `NumberField`'s non-finite value and precision must not reach the paint

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `054`, `077`, `324`–`326`, `338`, `339`, `362`, `371`, `378` |
| Status | done |

Self-contained: §0 the measured values, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. What was measured before the plan (2026-10-19)

Plan `371` made every public numeric **bound and length** total, but it never
mounted the field's own value. Probed in the real `TestRenderer` on this host
with `runtime.paintedText()`:

| Component input | Measured before |
| --------------- | --------------- |
| `<NumberField value={NaN} />` | paints **`"NaN"`** |
| `<NumberField value={NaN} min={10} />` | paints **`"NaN"`** — a bound does not help, `Math.max(10, NaN)` is `NaN` |
| `<NumberField value={Infinity} />` (unbounded) | paints **`"Infinity"`** |
| `<NumberField value={-Infinity} />` (unbounded) | paints **`"-Infinity"`** |
| `<NumberField defaultValue={NaN} />` | paints **`"NaN"`** |
| `<NumberField value={1.25} precision={Infinity} />` | paints **`"1.25000000000000000000"`** (the 20-decimal ceiling) |

A bound masks the infinity cases (`value={Infinity} max={100}` painted `"100"`
and `value={-Infinity} min={0}` painted `"0"`), so the hole is exactly the
values with no finite number to clamp to: `NaN` and an unbounded infinity.

The same values also freeze the keyboard: with the painted value `NaN`,
`stepNumber` returns `NaN` and `Object.is(NaN, NaN)` suppresses the report, so
the arrows do nothing — the measured "swallowed every step" symptom plan `371`
fixed for a `NaN` bound.

## 1. The decision

**A controlled value is a public numeric prop too. A non-finite `value`,
`defaultValue` or `precision` is made total before it reaches the paint, the
step rule or the announcement.**

- `NaN` reads as the field's **floor** — its `min`, else `0`. This is exactly
  `core/value.ts`'s `clampValue` rule ("a value that is not a number reads as
  `min`: an unknown position must never look like a deliberate one"), so a
  slider and a number field answer the same input the same way.
- `+Infinity` reads as the field's **highest finite neighbour** — `max`, else
  the floor. `-Infinity` reads as its **lowest finite neighbour** — `min`, else
  `max`, else `0`. A bound still wins, so `Infinity` under `max={100}` stays
  `100`.
- `precision` that is not a finite number is **`0`**. A finite precision is
  still truncated into `0…20`, which is `toFixed`'s own ceiling.
- `stepNumber` starts from the **painted (clamped) value**, so the exported
  rule matches the component's documented "a step starts at the value the field
  paints" (plan `362`) for an out-of-range or non-finite base. This changes no
  current component output: the component already passes the clamped value.

Alternatives rejected:

- **Treat a non-finite controlled value as uncontrolled/empty.** `value` is
  present, so the field is controlled; silently discarding the parent's value
  would make the mode depend on the number's magnitude.
- **Paint the fallback in the component only.** `clampNumeric`, `stepNumber`
  and `decideNumberKey` are exported from `@gpuixui/primitives/core`; fixing the
  wrapper would leave the published rule able to return `NaN`.
- **A new helper.** `clampNumeric` is already the one place every field path
  goes through (initial state, edit, step, commit, paint). It becomes total.

## 2. The rule

```ts
// core/number.ts — the field's one value rule
const finiteFieldValue = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  if (Number.isFinite(value)) return value;
  const floor = min ?? 0;
  if (Number.isNaN(value)) return floor;
  return value > 0 ? (max ?? floor) : (min ?? max ?? 0);
};

export const clampNumeric = (value: number, range: NumberRange): number => {
  const { min, max } = normalizeNumberRange(range);
  const usable = finiteFieldValue(value, min, max);
  const aboveMin = min === undefined ? usable : Math.max(min, usable);
  return max === undefined ? aboveMin : Math.min(max, aboveMin);
};

export const stepNumber = (value, range, steps) => {
  const { min, max, step } = normalizeNumberRange(range);
  const current = clampNumeric(value, { min, max, step });
  return exact(clampNumeric(current + steps * step, { min, max, step }));
};
```

```ts
// core/number.ts — the formatting rule
export const formatNumber = (value: number, precision = 0): string =>
  value.toFixed(
    Number.isFinite(precision)
      ? Math.min(20, Math.max(0, Math.trunc(precision)))
      : 0,
  );
```

`NumberField` needs no new code: its initial state, `current`, `display` and
every handler already call `clampNumeric`/`formatNumber`. That is the proof the
rule lives in one place.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/number.ts` | `clampNumeric` total; `stepNumber` clamps its base; `formatNumber` normalises precision |
| `packages/primitives/src/core/number.test.ts` | the three rules, including the two old directions |
| `packages/primitives/runtime/nonsense-numbers.runtime.test.tsx` | non-finite `value`/`defaultValue`/`precision` in the real renderer, and the step from a `NaN` field |
| `packages/primitives/docs/number-field.mdx` | the `value`/`defaultValue`/`precision` rows and a Bounds paragraph |
| `COMPONENTS.md` | the Number Field row's note |
| `TODO.md` | the task, ticked |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `cd packages/primitives && nubx vitest run src/core/number.test.ts` | all cases pass; the new ones fail before the fix |
| `cd packages/primitives && nubx vitest run --config vitest.runtime.config.ts runtime/nonsense-numbers.runtime.test.tsx` | 4 existing + 1 new case pass; the new case fails before the fix |
| `nub run --filter @gpuixui/primitives test` | exit 0 |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

## 5. Test plan

Every case names the rule it guards, and each must fail with the guard removed.

### 5.1 Offline (`src/core/number.test.ts`)

1. **`clampNumeric` is total** — `NaN` → `0` unbounded and → `min` when bounded;
   `+Infinity` → `max` when bounded, else the floor; `-Infinity` → `min` when
   bounded, `max` when only `max` exists, else `0`. Every result is finite.
2. **`stepNumber` starts at the paint** — `stepNumber(150, {min:0,max:100}, -1)`
   is `99` (the old rule returned `100`, so the field could never step down from
   an out-of-range base); `stepNumber(NaN, {step:1}, 1)` is `1` (the old rule
   returned `NaN`); the existing end behaviour (`stepNumber(100, RANGE, 1)`) is
   still `100`.
3. **`formatNumber` normalises precision** — `Infinity`, `NaN` and `-Infinity`
   are `0` decimals; `40` still clamps to `20`; `-1` still floors to `0`.

### 5.2 Runtime (`runtime/nonsense-numbers.runtime.test.tsx`)

4. **No painted text is nonsense** — a scene with `value={NaN}`,
   `value={NaN} min={10}`, unbounded `value={±Infinity}`,
   `defaultValue={NaN}` and `precision={Infinity}` paints none of `"NaN"`,
   `"Infinity"` or `"-Infinity"`, and paints `"10"`, `"0"`, `"0"`, `"0"`, `"0"`
   and `"1"` in that order.
5. **A non-finite field still steps** — arrow-down on an unbounded
   `defaultValue={NaN}` field reports `-1` (the old rule reported nothing and
   painted `"NaN"`).

### 5.3 Two-direction proof

- Revert `clampNumeric` to the plan-371 body: case 4 paints
  `['NaN','NaN','Infinity','-Infinity','NaN','1.25000000000000000000']` and
  fails by name; case 5 reports nothing.
- Revert `stepNumber`'s base clamp only: the new `stepNumber` cases fail while
  case 4 still passes.
- Revert `formatNumber`'s precision guard only: the `precision={Infinity}` paint
  is the 20-decimal string.
- Restore everything, then run the three gates.

## 6. STOP conditions

1. A non-finite value cannot be made total without changing the controlled
   contract (for example, the runtime cannot paint the fallback) — record the
   measurement and stop; do not invent an `Option` prop.
2. An existing suite asserts the old nonsense paint — report the case by name
   rather than editing the assertion.
3. The runtime suite cannot run in full on this host (plan `529`'s unpublished
   artifact) — run the scoped file only, record that scoping, and leave the full
   live run to the merge gate.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

Implemented.

- `core/number.ts`: `clampNumeric` maps a non-finite value to a finite
  neighbour before clamping (`NaN` → floor, `±Infinity` → the bound on that
  side, else the floor); `stepNumber` clamps the base first; `formatNumber`
  treats a non-finite precision as 0. `NumberField` needed no change — every
  paint and handler already goes through these three functions.
- Tests: `number.test.ts` +3 cases (total clamp, step base, precision),
  `runtime/nonsense-numbers.runtime.test.tsx` +1 case (six non-finite fields
  plus a step from a `NaN` field). Offline 690 → 693; the scoped live file
  5/5.
- Both directions proven: without the clamp the scene paints
  `['NaN','NaN','Infinity','-Infinity','NaN','1.25000000000000000000']` and the
  step reports nothing; with only the `stepNumber` base clamp reverted its two
  new cases fail; with only the precision guard reverted the 20-decimal string
  returns.
- Docs: `docs/number-field.mdx` (Bounds + the three prop rows),
  `COMPONENTS.md` Number Field row; `TODO.md` and the plan index updated.
- Full live suite: this host still carries plan `529`'s unpublished artifact
  (the 19-file focus/geometry degradation recorded in `TODO.md`), so the live
  evidence is the scoped file above; the end-of-task merge gate is unchanged.

## 8. Acceptance

- [x] A non-finite `NumberField` `value`/`defaultValue` paints a finite number,
      never `"NaN"`, `"Infinity"` or `"-Infinity"`.
- [x] A non-finite `precision` paints the default `0` decimals.
- [x] A field holding a non-finite value still steps, and `stepNumber` starts
      from the painted value.
- [x] The new tests fail with the guards removed (both directions recorded).
- [x] The field's docs page states the rule.
- [x] `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
