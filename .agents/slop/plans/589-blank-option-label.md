# 589 — A data option with a blank label is an unnamed control

**Phase:** F (integration and truth)
**Owner:** primitives
**Depends on:** 026, 057, 065, 075, 368, 394, 396, 500, 573, 577, 578, 579, 586
**Status:** done — 5 offline + 4 scoped runtime cases; both directions proven

---

## 1. The bug

Option labels are caller data and are often computed from a record
(`label={row.translation}`). The package already treats a blank string as
**absence** everywhere it is a name or a caption (plans 026, 396, 573, 577,
578, 579, 586): `ariaName` drops it, `hasText` gates a caption, and a blank
`selectAll` renders no row. The data-driven option rows were not covered.

`CheckboxGroup`, `RadioGroup` and `ToggleGroup` pass `option.label` through
`ariaName`, so a blank label removes the name while the row keeps its role, its
hit area and its tab stop. That is an **unnamed focus stop** — exactly the
class plan 578 fixed for the `CheckboxGroup` select-all parent. `Select` passes
the raw label to each option, to the list's `textValue`, and to the trigger's
`aria-valuetext`, so a selected option with a blank label paints and announces
whitespace.

Measured on this host, 2026-10-19, against the store binding (release-tag
build of plan 529; a11y dump from the `TestRenderer`). The probe mounted four
controls, each with one blank-labelled option and one named option:

```
CheckBox    [ '', 'Pear' ]        // CheckboxGroup  { value: "apple", label: "   " }
RadioButton [ '', 'Blue' ]        // RadioGroup     { value: "red",   label: ""    }
Button      [ '', 'Right' ]       // ToggleGroup    { value: "left",  label: "  "  }
ComboBox    [ 'Select' ] value: '   '   // Select defaultValue="one"
```

So the blank row is a `CheckBox`/`RadioButton`/`Button` with **no name** (a tab
stop in `CheckboxGroup`, the roving stop in the other two), and the select's
trigger announces three spaces as its value. The row's paint is empty as well,
because the same blank label is what is painted.

## 2. The rule

**A data option's text is its `label`, or its `value` when the label says
nothing.** The value is the option's required identity and the only other string
the caller supplied, so the fallback invents nothing. Paint and accessible name
use the same text, so a sighted user and a screen reader read the same words —
the rule plan 578 established for the select-all parent.

A real label is left **verbatim** for paint (padding is the caller's) and is
trimmed only for the name, like every other `ariaName` surface (plan 573).

This refines plan 026 rather than contradicting it: a blank label is still not a
name, and a blank **group** label stays absent. A data row is the one place with
a second honest identity — its required `value` — so three existing cases that
asserted a blank option name is absent (`selection.test.tsx` for `RadioGroup`
and `CheckboxGroup`, `ToggleGroup.test.tsx`, `Select.test.tsx`) move to the new
rule in this plan.

The pathological case where label **and** value are both blank stays unnamed
and paints nothing: there is no honest string to use, the option is caller
error, and the docs say so.

## 3. Exact changes

### 3.1 `packages/primitives/src/core/text.ts`

Add one rule beside `hasText`:

```ts
/**
 * The text a data option paints and announces.
 *
 * An option's `label` is often computed and can trim to nothing; its `value`
 * is the only other name the caller supplied, so a blank label falls back to
 * it instead of painting an empty row and publishing an unnamed focus stop
 * (plan 589). A real label is returned verbatim: padding is the caller's.
 */
export const optionText = (label: string, value: string): string =>
  hasText(label) ? label : Str.trim(value);
```

`hasText` and `Str` are already in this module.

### 3.2 `packages/primitives/src/components/internal.ts`

Re-export it beside the other text rules so a component keeps one import:

```ts
export { hasText, optionText } from "../core/text.js";
```

### 3.3 The four option renderers

1. **`CheckboxGroup.tsx`** — in `renderCheckboxGroup`'s `rows` map, pass
   `label: optionText(option.label, option.value)` to `renderRow`. The
   select-all parent is unchanged (a blank `selectAll` still renders no row,
   plan 578).
2. **`RadioGroup.tsx`** — resolve `const text = optionText(option.label, option.value)`
   once per option and use it for the row's `aria-label` and for the painted
   option label. `description` keeps its current `ariaName` rule.
3. **`ToggleGroup.tsx`** — the same resolution for the item's `aria-label` and
   the `controlLabelStyle` div's child.
4. **`Select.tsx`** —
   - `selectedLabel`: resolve the found option through `optionText`.
   - the flat `items` array's `label` and `textValue`: the same resolved text.
   - `row`: `aria-label={ariaName(text)}` and the painted label `{text}`.
   - a group heading keeps the existing blank-heading rule (plan 579).

Do **not** change `placeholder`, the group `label`, `selectAll` or
`description` handling: they are names in their own right and already follow
their documented rules.

### 3.4 Documentation

- `docs/checkbox-group.mdx`, `docs/radio-group.mdx`, `docs/toggle-group.mdx`:
  in the option API row and in `## Accessibility`, state that the row is named
  and painted by the option's label, falling back to its value when the label
  is blank or whitespace.
- `docs/select.mdx`: the same note in the `options` API row and in
  `## Accessibility`, adding that the trigger announces the resolved text, not
  whitespace.
- `packages/primitives/README.md`: the `aria-labelledby` row's "a control
  carries its own `aria-label`" sentence gains the data-option fallback.
- `COMPONENTS.md`: append one measured sentence to the Checkboxes row
  (`CheckboxGroup`), Radio groups, Toggle Group and Selects rows.

### 3.5 Plans index

Add the plan row to the `020–049` workstream table in
`.agents/slop/plans/README.md` as `done` with the measured counts.

### 3.6 `TODO.md`

Add and tick one row under the primitives section with the measured before /
after values.

## 4. Test plan

### 4.1 Offline (no binding) — `src/components/blank-option-labels.test.tsx`

Header comment: *a data option with a blank label must not be unnamed*, naming
plans 578/589.

| Case | Assertion |
| ---- | --------- |
| `renderCheckboxGroup` with `{ value: "apple", label: "   " }` | the `role="checkbox"` row's `aria-label` is `"apple"`; a real label stays verbatim |
| `renderRadioGroup` with a blank label | the `role="radio"` row's `aria-label` is the value |
| `renderToggleGroup` with a blank label | the item's `aria-label` and the label child are the value |
| `renderSelect` with a blank label, selected | `items[0].label`/`textValue` are the value; the trigger's `aria-valuetext` is the value; the option's `aria-label` is present |
| a padded real label | the painted text keeps its padding; the name is trimmed |
| label and value both blank | no `aria-label` and no text (documented caller error) |

Fixtures are the small ones the existing suites already use
(`initValueState`, `testTheme`, `valueState`, no-op handlers); the element
harness reads props, so no binding is needed.

### 4.2 Runtime — `runtime/option-label.runtime.test.tsx`

One window per case (the fixture rule). Mount each control with the two-option
fixtures from §1; assert on the **a11y tree** and on `runtime.text(testId)`:

- `CheckboxGroup`: one `CheckBox` node named `apple`; `text("cg-apple")` is
  `apple`.
- `RadioGroup`: one `RadioButton` named `red`; `text("rg-red")` is `red`.
- `ToggleGroup`: one `Button` named `left`; `text("tg-left")` is `left`, and
  `focusNext` lands on it (the roving stop is named).
- `Select` with `defaultValue="one"`: the trigger's `aria-valuetext` is `one`;
  opening the list yields a `ListBoxOption` named `one`, and `text` on the
  option is `one`.
- Every case also asserts the named sibling is unchanged (`Pear`, `Blue`,
  `Right`, `Two`), so the fallback does not rewrite real labels.

Scoped run (the host's full suite is degraded by plan 529; run by path):

```sh
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/option-label.runtime.test.tsx
```

### 4.3 Both directions

1. Before the fix, the probe measured `CheckBox [ '', 'Pear' ]`,
   `RadioButton [ '', 'Blue' ]`, `Button [ '', 'Right' ]` and
   `ComboBox value "   "`. Reverting `RadioGroup` alone reproduced
   `expected [ '', 'Blue' ] to strictly equal [ 'red', 'Blue' ]` in the new
   runtime file; reverting `ToggleGroup` alone failed the new offline file by
   case name.
2. After the fix: `runtime/option-label.runtime.test.tsx` 4/4 and
   `src/components/blank-option-labels.test.tsx` 5/5.
3. The four existing plan-026 cases that asserted a blank **option** name is
   absent now assert the value fallback (the blank **group** name is still
   absent); no other assertion moved.

## 5. Commands and expected results

```sh
# Measurement / regression direction (needs the store binding)
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/option-label.runtime.test.tsx
# before: 4 failing cases (unnamed nodes / whitespace value)
# after:  all pass

# Offline guard
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run --filter @gpuixui/primitives test src/components/blank-option-labels.test.tsx
# before: the blank-label cases fail
# after:  all pass

# The package's own suites
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
```

Expected: offline suite green (56 files / 796 tests), lint/format/type-check
green, and every existing test untouched apart from the four plan-026 option
cases named in §4.3.

## 6. STOP conditions

- **STOP** if the probe shows blank option labels are already named — then the
  bug is absent and this plan must be reverted rather than shipped.
- **STOP** if a fix changes a **real** label's paint (a padded label loses its
  padding) or renames a named option: the rule is a fallback, not a normaliser.
- **STOP** if `Select`'s item text cannot be changed without touching GPUix
  internals: the wrapper already builds `items` and the painted child, so a
  needed host change means the plan is wrong — report.
- **STOP** before editing `packages/components` or `apps/docs`; the components
  package has its own `Combobox`/`List` data rows and its workstream owns them.
  Record the ask in `TODO.md` if it applies there too.

## 7. Acceptance

- Four components paint and announce the option's value when its label is
  blank, with a real label unchanged.
- The new offline and runtime files fail in the old direction and pass after.
- The four pages, README, `COMPONENTS.md`, the plan index and `TODO.md` state
  the rule.
- `nub run check`, `nub run lint` and `nub run test` are green.
