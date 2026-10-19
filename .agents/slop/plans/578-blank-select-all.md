# 578 — A blank `selectAll` must not create an unnamed focus stop

**Phase:** F (integration and polish) · **Owner:** primitives · **Depends on:** 026, 065, 093, 396, 500, 573, 577

## 0. The bug

`CheckboxGroup` renders its optional parent row whenever the `selectAll` prop is
**present**:

```ts
const parent = selectAll === undefined ? null : renderRow({ label: selectAll, … });
```

The parent row is a `role="checkbox"` with `tabIndex={0}` (D27): the row is the
hit area, the tab stop and the name. Its name comes from
`ariaName(label)` — which trims and drops a blank string (plan 026). A computed
blank translation (`selectAll={t("channels.selectAll")}`) therefore paints:

- a visible empty row with a checkbox box, and
- a **focusable `checkbox` with no accessible name** — exactly the defect plan
  573 fixed for `InfoTip`.

The package's rule is that a blank string is absence (plans 396, 399, 500, 573,
577). For `selectAll` the prop's *name* is what asks for the row, so a blank name
must render no row at all; inventing an English fallback would put UI copy in the
library.

## 1. Evidence

Element tree, before the change (`renderCheckboxGroup({ selectAll: "   " })`
with two options):

```
children: 3            (the blank parent + two options)
child 0: role "checkbox", aria-label absent, tabIndex 0
```

After the change:

```
children: 2            (the two options)
child 0: role "checkbox", aria-label "Email"
```

The case lives in `src/components/selection.test.tsx`, beside the existing
select-all tests. With the old branch restored it fails with
`expected [3 elements] to have a length of 2`.

## 2. Changes

### 2.1 `packages/primitives/src/components/CheckboxGroup.tsx`

- Import `usableLabel` from `./internal.js` (already the trimmed-string rule).
- In `renderCheckboxGroup`, resolve the name once **before** the row indices:

  ```ts
  const selectAllLabel = Option.getOrUndefined(usableLabel(selectAll));
  ```

- Build the parent row only when `selectAllLabel !== undefined`, and pass
  `label: selectAllLabel` (trimmed, so the painted name and the announced name
  are the same string).
- Use `selectAllLabel === undefined` — not the raw prop — for the option index
  offset, so a blank name leaves the first option at index 0 and the roving /
  focus indices match the rows that exist.

No other behaviour changes: a real `selectAll` keeps its row, its derived
tri-state and its test id.

### 2.2 Documentation

- `packages/primitives/docs/checkbox-group.mdx` — API `selectAll` row: a blank
  name renders no row. Accessibility: the parent is a focus stop, so a blank
  name is absence, and a real name is trimmed (plan `578`). Verification names
  the case.
- `COMPONENTS.md` — append the rule to the Checkboxes row.
- `TODO.md` — tick the task.

## 3. Test plan

One element-tree case, `selection.test.tsx` → `CheckboxGroup`:

`renders no unnamed select-all row when its name says nothing`

- `selectAll: "   "` → the group has exactly `options.length` children, and the
  first row is named `"Email"` (it is the first option, not a blank parent).
- `selectAll: "  All channels  "` → one extra row, named `"All channels"`
  (trimmed) with `role="checkbox"`.

### Both directions

1. Restore `selectAll === undefined` as the gate and run:

   ```sh
   cd packages/primitives
   nub exec vitest run src/components/selection.test.tsx
   ```

   Expected: **1 failed / 50 passed** — the new case fails on the child count
   (3 instead of 2).
2. Apply the change and run the same command. Expected: **51 passed**.
3. Gates:

   ```sh
   nub run --filter @gpuixui/primitives test
   nub run check
   nub run lint
   nub run test
   ```

   Expected: primitives **51 files / 739 tests**; everything green.

No runtime assertion changes: the defect is a condition in the element tree, and
the current binding is the `references/gpuix` `main` artifact, not the published
tag (plan 529), so it is not evidence for a new paint claim.

## 4. STOP conditions

- A consumer needs a select-all row with **no visible text** (for example an
  icon-only row): the current API has no `aria-label`-only form. Stop and report
  rather than adding an invented name or a second prop.
- A change is needed outside `packages/primitives`: record it in `TODO.md`.
- The new case passes against the old gate: it is not measuring the row; rewrite
  it before claiming the fix.

## 5. Acceptance

- A blank `selectAll` produces no parent row and no unnamed focus stop; a real
  one is trimmed and still works.
- The case fails against the old gate and passes after it.
- `nub run check`, `nub run lint`, `nub run test` pass.
- The page, `COMPONENTS.md` and `TODO.md` record the rule and plan 578.
