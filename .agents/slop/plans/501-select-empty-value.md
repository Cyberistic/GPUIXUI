# 501 — A `Select` option whose value is the empty string can never be shown

- **Status:** done
- **Phase:** F (component truth)
- **Depends on:** `030`, `041`, `047`, `057`, `062`, `346`, `390`
- **Owner:** primitives workstream (`packages/primitives`)
- **Amends:** `packages/primitives/src/components/Select.tsx`, its element-tree
  suite, `runtime/select-pointer.runtime.test.tsx`, `docs/select.mdx`,
  `COMPONENTS.md`

## 1. The bug

The wrapper treats the string `""` as "no selection":

```ts
const selected = state.current === "" ? undefined : state.current;
```

and the state defaults to `""` when the caller supplies neither `value` nor
`defaultValue`. So an option whose value is the empty string — the natural
encoding of "Any", "All", or "None" — is **never displayed and never announced**:

- `defaultValue=""` with `options={[{ value: "", label: "Any" }]}` paints the
  **placeholder**; measured in the real 0.10.0 `TestRenderer`, the trigger's
  `ComboBox` value is `"Pick"` (the placeholder), not `"Any"`.
- A controlled `value=""` has the same paint, because the `"" → undefined`
  rewrite happens on every render.
- Choosing the option reports nothing on a select that already holds `""` (the
  `Object.is` no-op guard sees no change), which is correct, but leaves the field
  looking unselected — the interaction appears dead.

Measurements (2026-10-19, `Transport`/`TestRenderer` 0.10.0, fresh window):

| Mount | Trigger's announced value |
| --- | --- |
| `defaultValue=""` + `{ value: "", label: "Any" }` | `"Pick"` (placeholder) |
| `defaultValue=""` + `{ value: "a", label: "Alpha" }` | `"Pick"` (correct) |

The underlying `@gpuix/react/select` **does** support an empty-string value: a
raw headless `Select` with `value=""` and an item `value=""` paints that item's
label at rest (measured in the same probe). The loss is entirely in our wrapper's
sentinel.

This is a different class from the earlier `Select` plans: `057` fixed the ARIA
mapping, `062` the list width, `346` the open state. None of them can represent a
legitimate value because the value type conflates "no choice" with `""`.

## 2. Decision

**Absence is `undefined`; `""` is a value.** Change the wrapper's selection state
to `string | undefined`:

- absent `value` **and** absent `defaultValue` → no selection → placeholder;
- `value=""` / `defaultValue=""` → the empty-string option is selected;
- `value="a"` → the `"a"` option is selected;
- choosing an option reports its exact value (including `""`), and re-choosing
  the current value reports nothing (the existing no-op rule).

This is the package's own EF-2 rule applied to the one value control that still
uses `""` as a sentinel. The public props do not change shape
(`value?: string`, `defaultValue?: string`); only their meaning sharpens, and the
page will state it.

No change to `GpuixSelect`'s contract: it already accepts a `string | undefined`
`value`, and the headless runtime already handles `""`.

## 3. Steps

### 3.1 Write the failing element-tree cases

File: `packages/primitives/src/components/Select.test.tsx`

1. Change the `valueState` helper to own the new type and add a no-selection
   helper:

   ```ts
   const valueState = (value: string): ValueState<string | undefined> =>
     initValueState(Option.some(value), undefined);

   const noSelection = (): ValueState<string | undefined> =>
     initValueState(Option.none(), undefined);
   ```

   Replace the calls that mean "nothing selected" (the ones paired with an
   `options` list or asserting the placeholder) with `noSelection()`; calls that
   assert a value stay.

2. Add:

   ```ts
   it("passes an empty-string selection through instead of erasing it", () => {
     const element = renderSelect(
       { options: [{ value: "", label: "Any" }], label: "Filter" },
       testTheme,
       valueState(""),
       false,
       noFocus,
       handlers,
     );
     expect(expectSome(elementProp(element, "value"))).toBe("");
   });

   it("passes no selection as undefined", () => {
     const element = renderSelect(
       { options: [{ value: "", label: "Any" }], label: "Filter" },
       testTheme,
       noSelection(),
       false,
       noFocus,
       handlers,
     );
     expect(expectSome(elementProp(element, "value"))).toBeUndefined();
   });
   ```

Run:

```sh
nub run --filter @gpuixui/primitives test
```

**Expected before the fix:** the first case fails (the wrapper hands
`undefined` to `GpuixSelect`); the second passes. STOP if the suite is not
otherwise green — do not edit an unrelated test.

### 3.2 Change the state type and the sentinel

File: `packages/primitives/src/components/Select.tsx`

1. `renderSelect`'s `state` parameter becomes
   `ValueState<string | undefined>`; delete the `"" → undefined` rewrite:

   ```ts
   const selected = state.current;
   ```

   `selectedLabel` keeps resolving from the flat option list; an `undefined`
   selection finds no label and the trigger keeps the placeholder.

2. In `Select`, the `useControlState` call becomes:

   ```ts
   const state = useControlState<string | undefined>(
     props.value,
     props.defaultValue,
     (next) => {
       if (next !== undefined) props.onValueChange?.(next);
     },
   );
   ```

   The `undefined` guard is exhaustive, not defensive: the only writer is
   `GpuixSelect`, which reports an option value (a `string`). A "no selection"
   transition does not exist in the runtime's contract, so no `""` is invented.

3. Update `SelectProps.defaultValue`'s JSDoc to "Initial selection when
   uncontrolled. Omit for no selection (the placeholder)." and `value`'s to
   "Controlled selection. Omit to let the select hold its own." — they are
   already close; make the absence rule explicit.

Run the same command. **Expected:** the two new cases pass and the suite is
green.

### 3.3 Prove it in the runtime

File: `packages/primitives/runtime/select-pointer.runtime.test.tsx`

Extend the scene helper or add a second scene and two cases:

```ts
it("shows and selects an option whose value is the empty string", async () => {
  // mount: placeholder "Pick", options [{ value: "", label: "Any" }, ...],
  // defaultValue: "" and an onValueChange collector
  // 1. at rest: ComboBox value is "Any", not "Pick"
  // 2. open, click the "Any" option
  // 3. the collector stays empty (the value did not change)
  // 4. the list shows no option after closing; the trigger still reads "Any"
});

it("keeps the placeholder when no empty-string value is supplied", async () => {
  // same options, no defaultValue: ComboBox value is "Pick";
  // open and click "Any": onValueChange receives "" and the trigger reads "Any"
});
```

Use `a11yValueOf(runtime.a11y(), { role: "ComboBox", label: "Filter" })` (the
pattern from `name.runtime.test.tsx`) and the `s-option-` locator from plan `390`
— the empty value is addressable because the locator is
`${testId}-option-${value}`.

Run only the affected file (from the package directory — the package script does
not forward a filter reliably on this host):

```sh
cd packages/primitives
nub node_modules/vitest/vitest.mjs run --config vitest.runtime.config.ts \
  runtime/select-pointer.runtime.test.tsx
```

**Expected before the fix:** the first case fails at `"Pick"` vs `"Any"`.
**Expected after:** both cases pass.

### 3.4 Correct the page and the inventory

- `packages/primitives/docs/select.mdx`:
  - `value` / `defaultValue` API rows: a string selects the option with that
    value; omitting both means no selection and the placeholder; `""` is a real
    value (for "Any"/"All"/"None" choices), not a sentinel.
  - Accessibility/implications: the announced value is the selected option's
    label, including when its value is `""`.
  - Limitations: none about empty values — the old behaviour is gone.
- `COMPONENTS.md` Select row: append **"Empty value (501):** `""` is a value,
  not the absence sentinel; `defaultValue=""` selects an option valued `""`
  (measured: the trigger announced the placeholder before, the label after),
  while omitting both props still shows the placeholder."

### 3.5 Gates

```sh
nub run --filter @gpuixui/primitives test
cd packages/primitives && nub node_modules/vitest/vitest.mjs run \
  --config vitest.runtime.config.ts runtime/select-pointer.runtime.test.tsx
cd ../.. && nub run check && nub run lint && nub run test
```

Expected: the offline suite gains 2 cases; the scoped runtime file is green; all
gates exit `0`. The full live suite is **not** part of this plan: its 19 failing
files are the host's plan-379/529 binding delta.

## 4. STOP conditions

- The offline suite or `check-types` is red before the change for an unrelated
  reason.
- The raw GPUix `Select` turns out not to select an `""` item on the current
  host (re-measure the raw case first). Then the honest outcome is a documented
  limitation, not a wrapper workaround that fights the runtime — report it and
  stop.
- A change is needed outside `packages/primitives`, `COMPONENTS.md` and this
  plan index — record it as a `TODO.md` row instead.
- Any temptation to use a **second** sentinel (e.g. `null` or `"__none__"`):
  `undefined` is the absence value already, and a magic string would leak into
  the public API.

## 5. Test plan (what must be able to fail)

| Direction | Test | Fails on the old code because |
| --- | --- | --- |
| `defaultValue=""` selects the empty option | runtime case 1 | the wrapper passed `undefined`; the trigger announced `"Pick"` |
| a controlled `value=""` selects it | element-tree case 1 | the wrapper rewrote `""` to `undefined` |
| no `defaultValue` shows the placeholder | runtime case 2 | passes both before and after — proves the fix did not make `""` always selected |
| no selection stays `undefined` | element-tree case 2 | passes both before and after — proves absence is still absence |
| choosing the empty option from no selection reports `""` | runtime case 2 | required the state to accept `""` |
| re-choosing it reports nothing | runtime case 1, step 3 | the no-op rule must survive the type change |

Two-direction proof: revert only `selected = state.current` to the old
`state.current === "" ? undefined : …` and re-run; the two new element cases and
runtime case 1 fail by name. Restore; all pass. Also revert the state type to
`string` alone and confirm `check-types` rejects the `undefined` initial value
(the guard is structural).

## 6. Acceptance

- `Select` can display, announce and select an option whose value is `""`.
- Absence of both `value` and `defaultValue` still means "no selection" and the
  placeholder.
- `onValueChange` reports `""` exactly once when the empty option is chosen from
  no selection, and reports nothing when the value does not change.
- The page, JSDoc and inventory agree with the code.
- `nub run check`, `nub run lint`, `nub run test` and the scoped runtime file
  pass, and the commands were actually run.

## 7. Deliberately out of scope

- Changing any other control's state default. `Select` is the only value
  control whose domain is `string`; the boolean and numeric parts already use
  their own total defaults.
- A "clear the selection" gesture. The headless runtime exposes no clear, and
  adding one would be a new interaction (and a placeholder path), not a bug fix.
- Making `value=""` and an option valued `""` distinguishable when the caller
  *wants* a placeholder and an empty-valued option at the same time. Absent both
  props is the only "no selection" state; a caller that needs an empty-valued
  choice and an unselected start can use a non-empty sentinel (the page says so).

## 8. Outcome (measured 2026-10-19)

- `packages/primitives/src/components/Select.test.tsx` — **36/36 green** (2 new
  cases); with the old `state.current === "" ? undefined : …` rewrite, 1 failed
  (`"passes an empty-string selection through instead of erasing it"`).
- `runtime/select-pointer.runtime.test.tsx` — **4/4 green**; with the rewrite
  restored, 2 failed by name at the announced value (`"Pick"` instead of
  `"Any"`), the first at mount and the second after choosing the empty-valued
  option.
- `nub run --filter @gpuixui/primitives test` — **730 passed in 51 files**
  (728 before, +2).
- `nub run --filter @gpuixui/primitives check-types`, `nub run check`,
  `nub run lint`, `nub run test` — all exit `0`.
- Enforcer note: the `string | undefined` state type is the runtime's own
  controlled `value` boundary (`GpuixSelect.value`); the option lookup converts
  the absence with `Option.fromNullishOr`, and no domain model carries the
  nullable union.

