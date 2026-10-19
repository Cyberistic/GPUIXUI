# 502 — An option valued `""` is a value in the selection family too

- **Status:** done
- **Phase:** F (component truth)
- **Depends on:** `030`, `041`, `044`, `049`, `056`, `065`, `353`, `359`, `501`
- **Owner:** primitives workstream (`packages/primitives`)
- **Amends:** `src/core/selection.ts`, `src/components/RadioGroup.tsx`,
  `src/components/ToggleGroup.tsx`, their suites, `docs/radio-group.mdx`,
  `COMPONENTS.md`

## 1. The bug

Plan `501` removed the `""` sentinel from `Select`. The same sentinel survives in
two selection surfaces:

1. **A radio option valued `""` can never be checked.** `itemState` reads:

   ```ts
   option.value === value && value !== "" ? "checked" : "unchecked";
   ```

   So `options={[{ value: "", label: "None" }]}` with `value=""` paints an empty
   circle and announces `unchecked`, even though the group reports `""` to its
   parent and the value is the selected one. The `value !== ""` guard was there to
   stop the **state default** from selecting a `""` option by accident — the
   right fix is to stop using a string as the absence.

2. **`initialActiveIndex(options, "")` treats `""` as "the value `""`".** Both
   `RadioGroup` and `ToggleGroup` fall back to `""` when there is no selection,
   so a group whose options include `{ value: "" }` puts its roving tab stop on
   that option instead of the first enabled one. The rule in
   `core/selection.ts` is exported and should accept `undefined` as "no value".

Measured reachability: `RadioGroup`'s `value` prop is `string`, and nothing in
the page or types forbids `""`; a "None"/"No preference" choice is a normal
encoding.

## 2. Decision

- `initialActiveIndex(options, value: string | undefined)`: an `undefined` value
  matches no option and falls back to the first enabled one. A real value
  (including `""`) matches only the option with that value.
- `RadioGroup`'s selection state becomes `string | undefined` exactly as
  `Select`'s did: absence is the missing prop, `""` is a value. `itemState`
  compares strictly and drops the `value !== ""` guard.
- `ToggleGroup` passes `undefined` for "no selection" at its three call sites;
  its array-based selection already represents `""` correctly.
- The public props do not change shape; the docs state the rule.

## 3. Steps

### 3.1 Failing tests first

File: `packages/primitives/src/components/selection.test.tsx`

Add:

```ts
it("paints a radio option valued the empty string as checked", () => {
  const element = renderRadioGroup(
    { options: [{ value: "", label: "None" }] },
    testTheme,
    text(""),
    0,
    unfocused,
    radioHandlers(vi.fn()),
  );
  const item = expectSome(Option.fromNullishOr(elementChildren(element)[0]));
  expect(hostProp(item, "aria-valuetext")).toStrictEqual(Option.some("checked"));
});

it("keeps an option valued the empty string unchecked when nothing is selected", () => {
  const element = renderRadioGroup(
    { options: [{ value: "", label: "None" }] },
    testTheme,
    nothing(),
    0,
    unfocused,
    radioHandlers(vi.fn()),
  );
  const item = expectSome(Option.fromNullishOr(elementChildren(element)[0]));
  expect(hostProp(item, "aria-valuetext")).toStrictEqual(
    Option.some("unchecked"),
  );
});
```

with `const nothing = (): ValueState<string | undefined> => initValueState(Option.none(), undefined);`
and `text` widened to `ValueState<string | undefined>`.

Extend the roving-index case:

```ts
expect(initialActiveIndex([{ value: "" }, { value: "a" }], undefined)).toBe(0);
expect(initialActiveIndex([{ value: "" }, { value: "a" }], "")).toBe(0);
expect(initialActiveIndex([{ value: "a" }, { value: "" }], undefined)).toBe(0);
expect(initialActiveIndex([{ value: "a" }, { value: "" }], "")).toBe(1);
```

(`{ value: "" }` needs a `label` in the typed option; include one.)

Run:

```sh
nub run --filter @gpuixui/primitives test
```

**Expected before the fix:** the checked case and the `undefined` roving row
fail (`unchecked`; index 1 instead of 0). STOP if the suite is otherwise red.

### 3.2 Fix the core rule and the wrappers

`src/core/selection.ts`:

```ts
export const initialActiveIndex = <Item extends SelectableOption>(
  options: ReadonlyArray<Item>,
  value: string | undefined,
): number => {
  const indexOf = (matches: (option: Item) => boolean): number =>
    Option.getOrElse(Arr.findFirstIndex(options, matches), () => -1);
  const selected = indexOf(
    (option) => option.value === value && option.disabled !== true,
  );
  if (selected >= 0) return selected;
  return Math.max(indexOf((option) => option.disabled !== true), 0);
};
```

`src/components/RadioGroup.tsx`:

- `renderRadioGroup`'s `state` is `ValueState<string | undefined>`.
- `itemState(option, value: string | undefined)` is
  `option.value === value ? "checked" : "unchecked"`.
- the component's `useControlState<string | undefined>(props.value,
  props.defaultValue, (next) => { if (next !== undefined)
  props.onValueChange?.(next); })`.

`src/components/ToggleGroup.tsx`: pass `undefined` instead of `""` at the
`initialActiveIndex` call sites (the `multipleIndex` seed and both
`activeIndex` branches); when `Arr.get` has nothing, use `undefined`.

Run the same command. **Expected:** green.

### 3.3 Runtime proofs

File: `packages/primitives/runtime/controls.runtime.test.tsx` (or the closest
RadioGroup scene): mount a `RadioGroup` with `options={[{ value: "", label:
"None" }, { value: "a", label: "Alpha" }]}` and no `defaultValue`:

1. at rest every radio announces `unchecked` (the empty one is not
   pre-selected);
2. `focusNext` lands on the **first** radio (`None`), not a later empty-valued
   one (place the empty option second in a second group to prove the tab stop);
3. clicking `None` reports `""` once and that radio announces `checked`.

Use `a11y`/`aria-valuetext` and `runtime.focused()`; relative observations only.
Add the matching tab-stop case to `runtime/toggle-group.runtime.test.tsx` if the
existing file already proves the roving stop with `focusNext` (one case: a
`single` group with a `""` option second and no default lands on the first item).

Run the scoped files from the package directory:

```sh
nub node_modules/vitest/vitest.mjs run --config vitest.runtime.config.ts \
  runtime/controls.runtime.test.tsx runtime/toggle-group.runtime.test.tsx
```

### 3.4 Docs and inventory

- `docs/radio-group.mdx`: `value`/`defaultValue` rows — `""` is an ordinary
  value; omitting both leaves nothing selected, and the empty option is only
  checked when chosen. Any current sentence that treats `""` as "none" is
  corrected.
- `docs/toggle-group.mdx`: the tab stop is the selected item, else the first
  enabled one; an option valued `""` is not special.
- `COMPONENTS.md`: append the finding to the Radio groups row (and Toggle Group
  only if its row states the tab-stop rule).

### 3.5 Gates

```sh
nub run --filter @gpuixui/primitives test
nub run check && nub run lint && nub run test
```

## 4. STOP conditions

- Any suite is red before the change for an unrelated reason.
- The runtime binding is unavailable — report the output, do not replace the
  proof with a claim.
- A change is needed outside `packages/primitives`, `COMPONENTS.md` and this
  index — record a `TODO.md` row.
- Any temptation to keep `value !== ""` in `itemState`: that is the bug.

## 5. Test plan (what must be able to fail)

| Direction | Test | Fails on the old code because |
| --- | --- | --- |
| `""` paints checked | element case + runtime case 3 | `value !== ""` forced `unchecked` |
| no selection leaves it unchecked | element case + runtime case 1 | the old state default `""` made nothing checked, but the new type must preserve it |
| `undefined` is not a value | `initialActiveIndex` row | `""` matched a `""` option |
| a real `""` still matches | `initialActiveIndex` row | must not over-correct to "never check `""`" |
| tab stop is the first enabled when unselected | runtime case 2 | the `""` option won the roving index |

Two directions: revert `initialActiveIndex`'s parameter to `string` and the
`itemState` guard; the new cases fail by name. Restore; all pass.

## 6. Acceptance

- A radio option valued `""` is checked, announced and reported like any other,
  and is not the default when nothing is selected.
- `initialActiveIndex` distinguishes absence (`undefined`) from the value `""`.
- The tab stop of an unselected radio/toggle group is the first enabled option.
- Docs and inventory agree; the gates and the scoped runtime files pass.

## 7. Deliberately out of scope

- `CheckboxGroup`'s values are already an array of strings, so `""` is stored
  and compared correctly; no change.
- Adding a "clear the radio selection" interaction.
- Any public prop shape change: `value?: string` stays.

## 8. Outcome (measured 2026-10-19)

- `src/components/selection.test.tsx` — **48 passed**; with the old
  `option.value === value && value !== ""` painter, the checked case failed as
  `unchecked`; the `undefined` roving rows are part of the same suite.
- `runtime/controls.runtime.test.tsx` — the new case passes; with the old
  behaviour simulated (`initialActiveIndex(options, "")` and the `""` guard),
  the runtime entered on `rge-` (the empty-valued option) instead of `rge-a`.
  The file's other 6 failures are the host's known focus-ring/motion artifact
  delta (plans `379`/`529`), unchanged by this plan.
- `runtime/toggle-group.runtime.test.tsx` — **10/10**; with the old `""` fallback
  the new case entered on `tge-` instead of `tge-left`.
- `nub run --filter @gpuixui/primitives test` — **732 passed in 51 files**
  (730 before, +2); `check-types` green.

