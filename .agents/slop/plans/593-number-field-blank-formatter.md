# 593 — a blank `NumberField.formatValue` hides the value

**Phase:** F (behaviour truth)
**Depends on:** `054`, `362`, `389`, `580`, `591`
**Owns:** `packages/primitives` only.

## 1. The bug

`NumberField` paints `props.formatValue?.(value) ?? formatNumber(value, precision)`.
`??` only covers `undefined`/`null`, so a formatter returning a blank string —
the usual shape when a computed unit/translation is missing — paints an empty
field even though the field holds a value:

```tsx
<NumberField label="Copies" value={12} precision={2} formatValue={() => "   "} />
```

The input paints `"   "` (and announces it), so the number disappears. Every
other formatted surface in the package already applies the blank-string rule:
`valueText` falls back for `Meter`/`Slider`/`RangeSlider` (plan `580`), and
`ariaName`/`hasText` apply it to names and captions (plans `026`, `577`). The
number field is the remaining surface where a computed blank string erases a
value.

## 2. The fix

`core/number.ts` — one exported helper, next to `formatNumber`:

```ts
/**
 * The text a number field paints for a value.
 *
 * A formatter is often computed (`${value}${unit}`, a translated suffix) and
 * can return only whitespace when a piece is missing. A blank result is not a
 * display text: the fixed-decimal default stands in, the same rule every other
 * formatted surface follows (plans `580`, `593`).
 */
export const numberDisplay = (
  value: number,
  formatted: string | undefined,
  precision = 0,
): string =>
  Option.getOrElse(usableText(formatted), () =>
    formatNumber(value, precision),
  );
```

Import `usableText` from `./text.js` (already owned by this core; no new
dependency).

`components/NumberField.tsx`:

```ts
const display = (value: number): string =>
  numberDisplay(value, props.formatValue?.(value), props.precision ?? 0);
```

No other behaviour changes: a real formatter wins verbatim, `precision` still
only affects the default text, and the draft/commit paths are untouched.

## 3. Tests

- `src/core/number.test.ts` — three cases for `numberDisplay`:
  - a real formatted string is returned verbatim (`"$1.50"`);
  - no formatter uses the fixed-decimal text (`1.5`, precision 2 → `"1.50"`);
  - a blank/whitespace result falls back to the same fixed-decimal text (the
    bug direction: `"   "` must not paint).
- `runtime/number-field.runtime.test.tsx` — one case: a field with
  `value={12}`, `precision={2}` and `formatValue={() => "   "}` reads `"12.00"`
  from the accessibility tree. Without the fix it reads `"   "`.

## 4. Verification

1. `nubx vitest run src/core/number.test.ts` — green.
2. `nubx vitest run --config vitest.runtime.config.ts runtime/number-field.runtime.test.tsx`
   — the new case passes; the two known hit-tested spin geometry cases still
   fail (unchanged).
3. `nub run test`, `nub run check-types`, `nub run check`, `nub run lint` —
   green.

### Two directions

- Old: remove the `usableText` fallback (restore `??`) → the core blank case and
  the runtime case fail (the runtime reads `"   "`).
- New: restore it → both pass.
- A real formatter case passes in both directions: the fix must not override a
  caller's text.

## 5. STOP conditions

- A real formatter's value is altered by the fallback: STOP; the helper must
  only act when the formatter says nothing.
- The runtime case cannot read the text: STOP and report the locator, do not
  weaken it to a paint-only assertion.

## 6. Acceptance

- The three core cases and the runtime case pass; a real formatter is unchanged.
- `nub run test` and `check-types` green; the docs/inventory state the fallback.
- Plan indexed and the TODO row ticked.

## 7. Result

Measured on this host, 2026-10-19.

- `nubx vitest run src/core/number.test.ts` → **34 passed** (three new
  `numberDisplay` cases).
- `runtime/number-field.runtime.test.tsx` → **22 passed / 2 failed**, the two
  unchanged hit-tested spin geometry cases; the new blank-formatter case passes.
- `nub run test` → **57 files / 808 tests, green**.
- `nub run check-types` → exit `0` (it caught one now-unused `formatNumber`
  import in `NumberField`, removed).

**Both directions:** restoring `formatted ?? formatNumber(...)` fails exactly
`numberDisplay > does not let a blank formatter hide the value` (core) and
`paints the value when a formatter returns only whitespace` (runtime, which
reads `"   "`); the real-formatter cases keep passing in both directions.

