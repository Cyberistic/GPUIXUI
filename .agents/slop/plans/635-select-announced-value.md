# 635 — A `Select`'s announced value is not the text its option was named with

**Phase:** F (verification truth) — **implementation**
**Depends on:** `026`, `057`, `501`, `573`, `577`, `579`, `580`, `589`
**Owns:** `packages/primitives` (`Select`, `core/select.ts`, its element-tree and
runtime suites, the Select page), `COMPONENTS.md`, `README.md`,
`.agents/slop/plans/README.md`, `TODO.md`. No other workstream's paths.

## 1. The bug

`Select` announces its chosen value through `aria-valuetext` — GPUix 0.10.0 has
no `aria-valuenow` (plan `020` §1.4), and the trigger is the combobox whose
AccessKit value comes from that attribute. `renderSelect` writes it raw:

```tsx
// packages/primitives/src/components/Select.tsx
aria-valuetext={selectedLabel ?? placeholder}
```

`selectedLabel` is `optionText(option.label, option.value)` (verbatim, plan
`589`) and `placeholder` is the caller's string. Every other announced text in
the package goes through the blank-string rule — `ariaName` for names,
`valueText` for value controls (plan `580`), `optionText` for option names
(plan `589`) — but this one does not. Measured from the element tree, before the
fix:

| Input | Announced value |
| --- | --- |
| `placeholder="  Pick one  "` | `"  Pick one  "` |
| `placeholder="   "` | `"   "` |
| `defaultValue="apple"`, option label `"  Apple  "` | `"  Apple  "` |

The same option row, in the **same component**, announces `"Apple"` (its
`aria-label` is `ariaName(text)`), so the trigger and the list disagree about
the option's name. And a computed placeholder — `placeholder={t("choose")}`
with no translation — becomes a whitespace value on a focusable combobox
instead of no value at all. That is the class plans `026`, `573`, `577`, `579`,
`580`, `586` and `589` fixed on the other surfaces: a string that trims to
nothing is absence, and a real string is trimmed when it is announced.

The paint must stay the caller's: `SelectValue` keeps the padded placeholder
and the padded option label, exactly as `Text` keeps padded prose. Only the
announcement changes.

## 2. The rule

**One pure resolver decides the combobox's announced value.** It trims the
selected option's text; when that says nothing (no selection, or a selection
whose label is blank) it falls back to the trimmed placeholder; when neither
says anything, there is no value text at all.

```ts
// packages/primitives/src/core/select.ts
export const selectValueText = (
  selectedLabel: string | undefined,
  placeholder: string | undefined,
): string | undefined =>
  Option.getOrUndefined(
    Option.orElse(usableText(selectedLabel), () => usableText(placeholder)),
  );
```

- `usableText` is `core/text.ts`'s rule (plan `579`), not a second trim.
- A real label or placeholder is returned **trimmed**, matching the option row's
  `aria-label` and every other announced string.
- `undefined` means "omit `aria-valuetext`": the combobox is still named by
  `label`, it simply has no value yet.
- The fallback is kept for a selected value that is not in `options` (a stale
  controlled value): GPUix paints the placeholder for it, so the announcement
  keeps agreeing with the paint.
- Nothing about paint, open state, placement or option text changes.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/core/select.ts` | add `selectValueText` beside `selectOptions`; import `usableText` |
| `packages/primitives/src/components/Select.tsx` | `aria-valuetext={selectValueText(selectedLabel, placeholder)}` |
| `packages/primitives/src/core/select.test.ts` | the pure rule: trim, blank fallback, both blank, absent |
| `packages/primitives/src/components/Select.test.tsx` | element-tree cases for the three measured inputs, including the unchanged paint |
| `packages/primitives/runtime/select-value.runtime.test.tsx` | **new** scoped AccessKit matrix (3 cases) |
| `packages/primitives/docs/select.mdx` | the `placeholder` API row and the Accessibility section state the announcement rule |
| `packages/primitives/README.md` | runtime suite **55 → 56 test files** |
| `COMPONENTS.md` | Select row records plan `635` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/635-select-announced-value.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

No new dependency, no `core/` geometry change, no second trim helper.

## 4. Test plan

**Offline — `src/core/select.test.ts`.**

```ts
selectValueText("  Apple  ", "Pick one") === "Apple"
selectValueText(undefined, "  Pick one  ") === "Pick one"
selectValueText("", "   ") === undefined
selectValueText(undefined, undefined) === undefined
selectValueText("   ", "Pick one") === "Pick one"
```

**Offline — `src/components/Select.test.tsx`** (the element tree is the exact
props GPUix receives):

1. `<Select placeholder="  Pick one  " … />` → trigger `aria-valuetext` is
   `"Pick one"`, and the `SelectValue` child still receives the **raw**
   placeholder (paint unchanged).
2. `<Select placeholder="   " … />` → the trigger has **no** `aria-valuetext`
   prop (`undefined`).
3. `<Select defaultValue="apple" options={[{ value: "apple", label: "  Apple  " }]} … />`
   → trigger `aria-valuetext` is `"Apple"`; the option row's `aria-label` is
   already `"Apple"`, so this asserts they now agree, and the painted row text
   stays `"  Apple  "`.

**Runtime — new `runtime/select-value.runtime.test.tsx`.** One fresh window per
case via the fixture, `a11yValueOf(runtime.a11y(), { role: "ComboBox", label:
"Fruit" })`:

1. *A blank placeholder announces no value*: `placeholder="   "`, no selection →
   `None` (the old code reports `Some("   ")`).
2. *A padded placeholder is announced trimmed*: `placeholder="  Pick one  "` →
   `Some("Pick one")` (old: `Some("  Pick one  ")`).
3. *A chosen option announces the same trimmed name as its row*:
   `defaultValue="apple"` with label `"  Apple  "` → `Some("Apple")`; open the
   list and assert the option's node label is also `"Apple"` (old trigger value:
   `Some("  Apple  ")`).

**Both directions.** Revert only the `aria-valuetext` line to
`selectedLabel ?? placeholder` and run the scoped runtime file: all three cases
fail with the measured raw strings. Restore it: 3/3 pass. Revert the trim inside
`selectValueText` (return `selectedLabel ?? placeholder` there) and the core
cases fail by name.

**Existing suites.** `src/components/Select.test.tsx`,
`runtime/select-pointer.runtime.test.tsx`, `runtime/overlay-trigger.runtime.test.tsx`,
`runtime/name.runtime.test.tsx`, `runtime/blank-name.runtime.test.tsx`, and the
offline `docs`/contract suites stay green.

**Commands.**

```sh
cd packages/primitives
nub exec vitest run src/core/select.test.ts src/components/Select.test.tsx
nub exec vitest run --config vitest.runtime.config.ts runtime/select-value.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime -- runtime/select-pointer.runtime.test.tsx runtime/name.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
```

Expected after the fix: the two offline files green; the new runtime file 3/3;
the scoped regressions green; the offline suite **59 files / 820+ tests**; the
full runtime suite **56 files** and green on the release-tag build.

## 5. STOP conditions

- Stop if `a11yValueOf` does **not** report the trigger's `aria-valuetext` for a
  closed select: the AccessKit shape would then be a different bug, and the
  runtime case must be redesigned rather than weakened.
- Stop if the element tree shows GPUix's `SelectValue` receives a
  package-resolved label rather than the raw `placeholder`: the paint claim in
  §1 is wrong; report and re-plan.
- Do not trim the **painted** placeholder or option labels: padding is the
  caller's, and `Text`/`optionText` deliberately keep it.
- Do not give a blank value a fallback like `"No selection"`: the library does
  not invent text (plans `026`, `396`, `589`).
- Do not add a second trim helper; `usableText` is the one rule.
- A change needed outside `packages/primitives` is recorded in `TODO.md`, not
  edited.

## 6. Acceptance

- A padded placeholder and a padded option label are announced trimmed, and the
  trigger's value matches the option row's name.
- A blank placeholder publishes no `aria-valuetext`; paint is unchanged.
- The new cases fail against the old raw expression and pass after it.
- Offline, scoped runtime, `nub run check` and `nub run lint` are green.
- The page, `COMPONENTS.md`, `README.md`, the plan index and `TODO.md` agree.

## 7. Result (2026-10-19)

- **Measured pre-fix** in the real `TestRenderer` on the release-tag build: the
  `ComboBox` node for `<Select placeholder="   " />` reported
  `Some("   ")`; `placeholder="  Pick one  "` reported
  `Some("  Pick one  ")`; and a chosen option labelled `"  Apple  "` reported
  `Some("  Apple  ")` while the open option node reported `"Apple"`. The
  element tree showed the same raw strings.
- **Fix:** `core/select.ts` gains `selectValueText` over `usableText`
  (trim; blank is absent; placeholder fallback), and `renderSelect` writes
  `aria-valuetext={selectValueText(selectedLabel, placeholder)}`. Paint is
  untouched: `SelectValue` keeps the raw placeholder and the flat `items` prop
  keeps the raw label.
- **Cases:** 4 core (`selectValueText`), 3 element-tree (padded placeholder +
  raw paint, blank placeholder absent, chosen padded label trimmed while the
  item stays raw), and 3 new runtime AccessKit cases.
- **Failing direction:** restoring `aria-valuetext={selectedLabel ?? placeholder}`
  fails exactly the 3 element cases (received `"  Pick one  "`, `"  Apple  "`,
  and a whitespace value) and all 3 runtime cases by name; restoring the fix is
  green.
- **Gates:** primitives offline **59 files / 827 tests**; full runtime **56
  files / 781 tests** on the release-tag build; `nub run check` green (tests,
  lint, format, every workspace's `check-types`).

