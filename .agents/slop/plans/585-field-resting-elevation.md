# 585 — The field paints the recipe's shadow, and "any shadow" is not a focus ring

**Phase:** F (truth / interaction)
**Owner:** primitives workstream
**Depends on:** 030, 041, 047, 057, 084, 089, 332, 343, 345, 370, 372, 391
**Status:** done — measured, implemented, documented and guarded

---

## 0. What happened

The merge of `origin/master` (`028236c1`, `bbf3483a` — the `@gpuixui/tw`
extension registry and the Base UI recipe utility slice) taught
`classesToStyle` to resolve `shadow-*` utilities. `INPUT_BASE` (shadcn
new-york-v4 `input.tsx`, consumed verbatim since plan `370`) starts with
`shadow-xs`, so **every field now paints the recipe's elevation shadow at
rest**:

```
{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: … }
```

Measured after the merge, `nub run test`, `packages/primitives`:
**4 failed / 747 passed**, all four the same misreading:

| Test | Old assertion | Why it fails now |
| ---- | ------------- | ---------------- |
| `src/core/recipes.test.ts:90` | `invalid.boxShadow` equals the invalid bucket's shadow (undefined) | an invalid field keeps the recipe's resting elevation |
| `src/core/recipes.test.ts:161` | `disabled.boxShadow` is `undefined` | a disabled field also keeps the resting elevation |
| `src/components/OTPField.test.tsx:135` | an unfocused cell's `boxShadow` is `undefined` | every cell carries the resting elevation |
| `src/components/Select.test.tsx:162` | a resting trigger's `boxShadow` is `undefined` | the trigger is a field and carries the elevation |

The same misreading exists in the runtime suites: five helpers decide "this
element is focused" by `element.style.boxShadow !== undefined`
(`focus-ring.runtime.test.tsx`, `disabled.runtime.test.tsx`,
`fields.runtime.test.tsx`, `number-field.runtime.test.tsx`,
`otp.runtime.test.tsx`). With a resting field now painting elevation, those
helpers would report a ring on every field, every cell and every select
trigger.

This is a bug **in the tests' model**, not in the recipe: shadcn's field does
carry `shadow-xs`, the compiler now honours it, and the library's stated rule
is that recipes are consumed verbatim. Dropping the shadow from the primitive
would be a silent divergence from the recipe the package claims to follow.

## 1. Decision

1. **Keep the recipe's `shadow-xs`.** A field's chrome is the recipe: 36 px,
   12/4 padding, radius 6, 14/20 **and its resting elevation**. The tokens stay
   the paint, and `@gpuixui/tw`'s `xs → sm` elevation mapping is the recipe's
   business.
2. **A focus ring is identified by its shape, not by "some shadow".** GPUix
   paints one `boxShadow` per element. Every ring this library paints is a
   zero-offset, zero-blur shadow with a **positive spread** (2 px from
   `focusRing`, 3 px from the field/button recipe); every elevation level has
   spread `0` or negative (`elevation.ts`). One predicate, `isFocusRing`,
   states that rule once. It is test-only (the same subpath as the runtime
   adapter), because only a test needs to *read* a painted frame.
3. **The focus ring replaces the elevation while focused.** That is the honest
   consequence of a single `boxShadow` slot, and it is what the components
   already do (the focus bucket merges last). An invalid or disabled field
   keeps the elevation; neither bucket declares a ring width.
4. Tests assert the two different things separately: the resting elevation and
   the focused ring. No test may call a field focused because it painted a
   shadow.

## 2. Exact changes

### 2.1 `packages/primitives/src/testing/shadow.ts` — the one predicate (new)

```ts
/**
 * Whether a painted shadow is a focus ring rather than elevation.
 *
 * GPUix paints one `boxShadow` per element. Every ring this package paints is
 * a zero-offset, zero-blur shadow with a positive spread (`focusRing`, and the
 * recipe's 3 px focus ring); every elevation level spreads `0` or less. The
 * distinction matters because a field carries the recipe's `shadow-xs` at rest
 * (plan `585`), so "a shadow exists" does not mean "the control is focused".
 */
export const isFocusRing = (
  shadow: { readonly spreadRadius: number } | undefined,
): boolean => shadow !== undefined && shadow.spreadRadius > 0;
```

Re-export it from `src/testing/index.ts` (`export * from "./shadow.js";`). It
lives on the testing subpath because only a test reads a painted frame, and the
package root must not grow a native-test concern. Do **not** put it in
`core/style.ts`: `src/core/token-helpers.test.ts` scans every source line for
the shadow geometry keys and would (correctly) report the type annotation as a
hand-built shadow.

### 2.2 `packages/primitives/src/testing/shadow.test.ts` — the predicate's contract (new)

Build the values with the real helpers and `testTheme`:

- `isFocusRing(focusRing(testTheme).boxShadow)` is `true`;
- `isFocusRing(elevationShadow(testTheme, "sm"))` is `false` (spread `0`);
- `isFocusRing(elevationShadow(testTheme, "md"))` is `false` (spread `-2`);
- `isFocusRing(undefined)` is `false`.

### 2.3 `packages/primitives/src/core/recipes.test.ts` — the resting elevation

Add one case to `describe("the Input recipe")`:

```ts
it("paints the recipe's shadow-xs at rest, and the ring instead when focused", () => {
  // The bug guarded (plan 585): `INPUT_BASE` carries `shadow-xs`, which the tw
  // Base UI slice started resolving. A resting field paints elevation; only a
  // positive-spread shadow is a ring.
  const elevation = Option.getOrElse(
    Option.fromNullishOr(compilerInput.style.boxShadow),
    () => expect.fail("the recipe declared no resting shadow"),
  );
  expect(elevation.spreadRadius).toBe(0);
  expect(fieldRecipeStyle(resting, testTheme).boxShadow).toStrictEqual(elevation);

  const focused = fieldRecipeStyle({ ...resting, focused: true }, testTheme);
  expect(focused.boxShadow).toStrictEqual(compilerInput.focus.boxShadow);
  expect(focused.boxShadow?.spreadRadius).toBe(3);
  expect(focused.boxShadow).not.toStrictEqual(elevation);
});
```

Correct the two old assertions:

- `:90` → the invalid field keeps the base elevation, and the invalid bucket
  adds no shadow of its own:

  ```ts
  expect(invalid.boxShadow).toStrictEqual(compilerInput.style.boxShadow);
  expect(compilerInput.invalid.boxShadow).toBeUndefined();
  ```

- `:161` → a disabled field keeps the base elevation (no ring):

  ```ts
  expect(disabled.boxShadow).toStrictEqual(compilerInput.style.boxShadow);
  ```

Add `import * as Option from "effect/Option";` to the imports.

### 2.4 `packages/primitives/src/components/OTPField.test.tsx`

In "rings only the cell the caret is in", replace the two defined/undefined
checks with the ring shape:

```ts
const shadowOf = (cell: …) =>
  Option.getOrUndefined(hostStyleRecord(cell))?.["boxShadow"] as
    | { readonly spreadRadius: number }
    | undefined;

expect(shadowOf(cell(element, 0))?.spreadRadius).toBe(0);   // elevation only
expect(shadowOf(cell(element, 1))?.spreadRadius).toBe(3);   // the ring
expect(shadowOf(cell(element, 1))).not.toStrictEqual(
  shadowOf(cell(element, 0)),
);
```

Keep the assertions typed; if `hostStyleRecord` already yields a decoded
`StyleDesc` in this file, use its `boxShadow` directly rather than casting.

### 2.5 `packages/primitives/src/components/Select.test.tsx`

In "rings the trigger with the field recipe while it holds focus or its list is
open":

- compute `const fieldResting = fieldRecipeStyle({ focused: false, invalid: false, disabled: false }, testTheme);`
- `paint(resting).boxShadow` equals `fieldResting.boxShadow` and has
  `spreadRadius` `0`;
- a focused trigger and an open trigger still equal `ring.boxShadow` (spread
  `3`);
- `paint({ ...resting, disabled: true, focused: true }).boxShadow` equals
  `fieldResting.boxShadow` (no ring), **not** `undefined`.

The test name and its header comment stay the same; the assertion is now about
the ring, not about the presence of any shadow.

### 2.6 Runtime suites — ask the predicate, not "any shadow"

Add `isFocusRing` to each file's existing `../src/testing/index.js` import and replace the `boxShadow !== undefined` decisions:

| File | Helper | Change |
| ---- | ------ | ------ |
| `runtime/focus-ring.runtime.test.tsx` | `ringsOf` | `Arr.filter(runtime.all(), (element) => isFocusRing(element.style.boxShadow))` |
| `runtime/disabled.runtime.test.tsx` | `ringCount` | filter with `isFocusRing` |
| `runtime/fields.runtime.test.tsx` | `ringed` | `Option.exists(runtime.element(testId), (element) => isFocusRing(element.style.boxShadow))` |
| `runtime/number-field.runtime.test.tsx` | `ringed` + the focus case at `:356` | the same predicate on `nf`'s shadow |
| `runtime/otp.runtime.test.tsx` | the local `ringed` closure | the same predicate on the cell |

Leave exact-shape comparisons (`controls`, `info-tip`, `checkbox-group`) as
they are; they already compare the ring's value.

### 2.7 `packages/primitives/runtime/fields.runtime.test.tsx` — native paint proof

Add one case that does **not** depend on focus events (the release build
delivers none, plan `583`):

```ts
it("paints the recipe's elevation on a resting field, not a ring", async () => {
  // Plan 585: `INPUT_BASE` carries `shadow-xs`; a resting field paints the
  // recipe's elevation, which is why a test may not read "a shadow" as focus.
  const runtime = await openWindow();
  runtime.render(<Surface><Input testId="field" label="Name" /></Surface>);
  const shadow = Option.getOrUndefined(shadowOf(runtime, "field"));
  expect(shadow?.spreadRadius).toBe(0);
  expect(shadow?.blurRadius).toBeGreaterThan(0);
});
```

`shadowOf` already exists in the file (defined for the Select cases).

### 2.8 Docs — one sentence on each field page

In `docs/input.mdx` `## Theming`, after the recipe paragraph:

> The recipe's `shadow-xs` also paints a resting elevation (`elevation.sm`).
> GPUix paints one shadow per element, so the focus ring replaces it while the
> field is focused; an invalid or disabled field keeps the elevation.

Add the equivalent one-line sentence to the `## Theming` section of
`docs/textarea.mdx`, `docs/select.mdx`, `docs/number-field.mdx` and
`docs/otp-field.mdx` (each page is the field's own entry point).

### 2.9 `COMPONENTS.md` — the field family's row

Append one sentence to the **Text inputs** row (the family's canonical row):

> **Recipe elevation (585):** `INPUT_BASE`'s `shadow-xs` now resolves through
> `@gpuixui/tw`, so the field family (`Input`, `TextArea`, `Select`'s trigger,
> `NumberField`, `OTPField`) paints `elevation.sm` at rest; a focused field's
> ring replaces it (one shadow per element), and an invalid/disabled field
> keeps the elevation. `isFocusRing` is the one predicate that tells a ring
> from elevation.

### 2.10 `TODO.md` and the plan index

Add under the primitives workstream:

```
`[x]` `packages/primitives`: **a resting field paints elevation, and the tests
      called any shadow a focus ring** — the `@gpuixui/tw` Base UI slice began
      resolving `INPUT_BASE`'s `shadow-xs`, so the field family paints
      `elevation.sm` at rest; four offline assertions and five runtime helpers
      still read "a boxShadow exists" as "focused". One `isFocusRing` predicate
      (positive spread) separates the two, the field pages and the inventory
      record the paint, and a native case proves the resting elevation (plan
      `585`).
```

Index plan `585` in `.agents/slop/plans/README.md` in the primitives block.

## 3. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/primitives

# The four failures this plan starts from (before the change)
nub run --filter @gpuixui/primitives test
# expect the 4 named cases to fail; every other case passes

# After the change
nub run --filter @gpuixui/primitives test
# expect all offline tests green (52 files, 751 tests + the new ones)

# The pure predicate
cd packages/primitives
nub exec vitest run src/core/style.test.ts src/core/recipes.test.ts \
  src/components/OTPField.test.tsx src/components/Select.test.tsx
# expect 0 failed

# The native resting-elevation case (release-tag binding present on this host)
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/fields.runtime.test.tsx -t "resting field"
# expect 1 passed

# Completion gate
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run check && nub run lint && nub run test
# expect green
```

## 4. STOP conditions

- **STOP** if `compilerInput.style.boxShadow` is `undefined` after the merge.
  That would mean `@gpuixui/tw` no longer resolves `shadow-xs`; the plan's
  premise is wrong and the four failures need a different diagnosis. Record it
  and stop.
- **STOP** if the resting Input's painted `boxShadow` is not the elevation the
  recipe resolved (it should be `spreadRadius: 0`, positive blur). Do not
  loosen the runtime case to "defined": that is the bug.
- **STOP** before editing `packages/tw`, `packages/tokens`, `packages/components`,
  `apps/docs` or `examples/*`. The elevation's source is the recipe; a change
  there belongs to `tw`.
- **STOP** at `nub install` if the lock changes beyond the merge's copy, or if
  the native binding is missing in the store; do not rebuild the binding here.
- **STOP** if a focus-ring runtime case still fails for a reason *other* than
  plan `583`'s missing `onFocus`/`onBlur`. Record the new fact; do not
  re-baseline the 19 known failures.

## 5. Test plan (both directions)

The change is test-shaped, so the two directions are:

1. **Old model fails.** Leave the four assertions unchanged → the suite is red
   exactly as measured (invalid/disabled/cell/trigger shadows). This is the
   recorded starting state, not a hypothetical.
2. **Predicate direction.** Mutate `isFocusRing` to `shadow !== undefined` and
   run the focus-ring matrix on a runtime that delivers focus: a resting field
   is counted as a ring, so the matrix's "exactly one" fails for `Input`,
   `TextArea`, `NumberField`, `OTPField` and `Select`'s trigger. The pure
   `style.test.ts` case fails immediately for the elevation fixture even on the
   release build.
3. **Reverse predicate.** Mutate it to `false` → the runtime ring helpers and
   the new recipe assertion fail (the focused field is no longer a ring).
4. **Elevation direction.** Remove `shadow-xs` from `INPUT_BASE` in a scratch
   copy → the new recipes case's `elevation` lookup fails (`expect.fail`), and
   the native resting-elevation case fails on `spreadRadius`.
5. **The native case is honest:** it passes on the release tag build because it
   asserts a resting paint, not focus. Do not add a focus half to it.

## 6. Acceptance

- The four offline failures are resolved by stating the recipe's real paint,
  not by deleting the assertions or dropping the recipe property.
- One exported predicate, `isFocusRing`, is the only place that decides what a
  ring is; every runtime ring helper uses it, and its own unit case is the
  predicate's contract.
- A native case proves a resting field paints elevation with spread `0`.
- The five field pages state the resting elevation and the ring replacement;
  the inventory row records it.
- Offline tests, `check`, `lint` and `test` are green; the scoped runtime case
  passes on this host.

## 7. Outcome (measured 2026-10-19)

- **The recipe's elevation reaches the paint.** `compilerInput.style.boxShadow`
  is defined (spread `0`, blur `2`), a resting field, OTP cell and select
  trigger paint it, and a focused field paints the recipe's 3 px ring instead.
- **The offline suite is green:** 53 files / 753 tests (was 4 failed / 747
  passed). The four failures were the model, not the recipe.
- **The predicate works both ways:** `src/testing/shadow.test.ts` passes; with
  `isFocusRing` reduced to `shadow !== undefined` it fails
  (`expected true to be false` on the elevation fixture).
- **Native evidence:** the scoped case
  `runtime/fields.runtime.test.tsx -t "resting field"` passes on this host's
  release-tag binding (`1 passed | 74 skipped`). With `fieldRecipeStyle`
  temporarily stripped of the recipe's `boxShadow`, the same case fails
  (`expected undefined to be +0`) — the case really measures the paint.
- **Not re-baselined:** the 19 focus-event files remain red on the release-tag
  build for plan `583`'s reason; the ring helpers now ask `isFocusRing`, so a
  runtime that delivers focus would count rings correctly instead of counting
  every field's elevation.
- The five field pages, the `COMPONENTS.md` row, the plan index and `TODO.md`
  record the new paint.
