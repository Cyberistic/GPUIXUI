# 045 — `labelledBy` must return the prop the controls read (primitives workstream)

**Phase:** C (Tier 1 API correctness).
**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** `030`, `040`.
**Status:** `done` — see §6.

## 1. The bug

`labelledBy(name)` (exported from `Label.tsx`, documented in `packages/primitives`
README and `COMPONENTS.md`) returned `{ "aria-label": name }`. The library's
controls do **not** read an `aria-label` prop: they read `label` and pass it to
the host themselves (`FieldProps.label`, `ButtonProps.label`,
`CheckboxProps.label`, `SwitchProps.label`, `RadioGroupProps.label`,
`SelectProps.label`).

So the documented helper — "the name is written once and passed to both" — did
nothing when used with the library's own components: the spread produced an
`aria-label` key that the component destructured away, and the control rendered
with no accessible name. The only existing test asserted the helper's output
shape, which is why it passed.

## 2. Design

`labelledBy(name)` returns `{ readonly label: string }`, the shape every
control's props already declare. Then:

```tsx
<Label>{name}</Label>
<Input {...labelledBy(name)} />
```

types-checks and reaches the host's `aria-label` through the component's own
`label` prop. No component changes.

Why not make components accept `aria-label` as well: two names for one thing
means two sources of truth, and `aria-label` on a GPUix host element is exactly
what the component already writes from `label`.

## 3. Files to change

```
packages/primitives/src/components/Label.tsx             EDIT return type + doc
packages/primitives/src/components/presentational.test.tsx EDIT the test: spread into a control
COMPONENTS.md                                            EDIT the Labels row wording
```

## 4. Commands and expected results

```sh
nubx vitest run src/components/presentational.test.tsx
# before the fix: the new test fails (the button has no aria-label)
# after: 13 passed
nub run check      # green
nub run test       # 152 passed
```

## 5. Two-direction proof

The new assertion is written against the **old** helper first: render a `Button`
with `{...labelledBy("Email")}` and require its host `aria-label` to be
`"Email"`. With the old `{ "aria-label": ... }` return the button has no name, so
the test fails; with `{ label: ... }` it passes.

## 6. Measured results

2026-10-17: before the change the new test failed with
`the element tree did not carry what this test asserts on`; after, 13 passed in
the file, 152 offline and 53 runtime across the package.

## 7. STOP conditions

- A control does not have a `label` prop → stop and report the component instead
  of widening the helper's return type into a union.
- `nub run check` cannot stay green.
