# 666 — A combobox trigger without a label is unnamed

**Workstream:** components (Tier 2). **Phase:** F, hardening.
**Depends on:** 110, 116, 200, 201, 369, 391, 516, 565, 608.
**Status:** done — `controlName` names the trigger from its display when no
`label` is authored; 3 native cases (Combobox 52), the placeholder and selected-
label cases failing on the old source; docs and `COMPONENTS.md` synced.

## 1. The bug, measured

`ComboboxTrigger` owns the closed control. It computes `display` — the joined
selected labels, or the `placeholder` — and paints that text itself. It passes
`aria-label` to GPUix's headless trigger **only** when the caller supplied the
optional `label` prop:

```tsx
{...(label === undefined ? {} : { "aria-label": label })}
```

GPUix 0.10.0 does **not** lift a control's text child into its accessible name
(measured for menu rows in plan 387 and for every example in plan 391). So a
trigger rendered without `label` is a `button` with an empty name. The public API
documents `label` as optional (`docs/combobox.mdx` §API), so this is a real hole,
not a caller error.

Measured on this host, 2026-10-19, with a probe test that rendered:

```tsx
<Combobox options={[{ value: "a", label: "A" }]}>
  <ComboboxTrigger />
</Combobox>
```

and read `nodesWithRole(renderer, "button")`:

```
expected [ 'Select…' ] to deeply equal [ '' ]
```

The same hole exists for `label=""` and `label="   "`, because the part writes
the authored string verbatim instead of going through the shared name rule.

The project rule already exists: `internal/name.ts`'s `controlName` returns the
caller's `aria-label` when it is non-empty after trimming, otherwise the control's
plain-text content. Every other text-bearing control uses it (`Button`,
`TabsTrigger`, `AccordionTrigger`, `CollapsibleTrigger`, `BreadcrumbLink`).

## 2. The fix

Name the trigger from its own visible text when the caller authored no usable
label. This is exactly what a browser's name-from-contents computes for
`<button>Select…</button>`; it does not invent a better name than the content,
and it keeps the documented advice to pass `label` for a field-shaped name.

### 2.1 `packages/components/src/combobox.tsx`

- Import `controlName` from `./internal/name.js` (it already imports from that
  directory for other helpers; match the existing import grouping).
- In `ComboboxTrigger`, after `display` is computed, add:

```tsx
const name = controlName(rest["aria-label"] ?? label, display);
```

- Spread `{...rest}` first, then `{...(name === undefined ? {} : { "aria-label": name })}`.
  This is the convention `internal/button.tsx` uses: `controlName` has already
  read the caller's `aria-label` from `rest`, so the computed (trimmed) name must
  be the value React sees last. Do not leave the raw `rest` spread after the
  computed name, or `aria-label="  Reviewer  "` would bypass trimming.

Do **not** add a default `label` string such as `"Select"`; that would overload
the placeholder and hide the fact that the field has no descriptive name. Do
**not** change `label` to a required prop in this plan: that is a breaking API
change, and naming from the visible text is the correct fallback.

### 2.2 Documentation

- `packages/components/docs/combobox.mdx`: in the `ComboboxTrigger` API row,
  change the `label?: string` description to say it is the trigger's accessible
  name and that the visible selected labels or the placeholder name the trigger
  when it is omitted. Add one sentence under the accessibility/limitations
  section (search for `aria-expanded` or the name paragraph) stating the same
  rule, and repeat the recommendation to pass `label`.
- `COMPONENTS.md` → `Comboboxes` row: add a short clause that an unauthored
  trigger is named from its visible text (the selected labels or placeholder),
  because 0.10.0 does not name a role-bearing div from its text child.

No inventory metadata change is required: this is not a new limitation, and
`comboboxMeta` still points at the same docs page and behaviour file.

## 3. Test plan

File: `packages/components/src/behaviour/combobox.test.tsx`.

Extend the file header's bug list with this one (the header already names the
plans that motivated each group of cases).

Add one `it` block with three assertions, or three small blocks:

1. **No `label`, no selection** — render a minimal tree:

   ```tsx
   <Combobox options={options}>
     <ComboboxTrigger placeholder="Pick a reviewer" />
   </Combobox>
   ```

   Assert the accessibility tree has a `button` named `"Pick a reviewer"`.

2. **No `label`, a selected value** — call `renderComponent` again with
   `defaultValue="calendar"` and assert the trigger is named `"Calendar"` (the
   visible selected label), not the placeholder.

3. **An authored `aria-label` wins** — render with no `label` but
   `aria-label="Reviewer"` on `ComboboxTrigger` and assert the button is named
   `"Reviewer"`. This is a pin: it passes before and after, so it proves the fix
   did not overwrite a caller's name.

Use `nodesWithRole` and `Arr.map` as the existing trigger test does. Unmount the
root at the end of each block.

### Both-direction proof

Run the new cases against the source **before** the fix. Cases 1 and 2 must read
`[""]` and fail; case 3 passes. After the fix all three pass. Record the exact
before/after output in the plan index status (or the commit message).

No position or focus assertion is involved, so the plan-540 binding defects are
out of scope.

## 4. Commands and expected results

From `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/combobox.test.tsx
```

Expected after the fix: `Test Files 1 passed`, `Tests 52 passed` (the suite had
49 before this plan; the three new cases bring it to 52). The suite deliberately
does **not** run the rest of the behaviour files.

Then:

```sh
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components check-types
cd ../..
nub run check
nub run lint
```

Expected: all exit `0`; the unit suite stays `472 passed` (the new cases are
native behaviour, not unit).

## 5. STOP conditions

- Stop if `controlName` cannot take a `string` (it takes `ReactNode`; a string is
  valid) or if the trigger's visible text is no longer `display`.
- Stop if the new tests fail for a reason other than the empty name — for
  example if the trigger cannot render without a label at all. Record the actual
  error instead of forcing the test.
- Stop if the full `nub run check` fails outside `packages/components`; report
  the failing package instead of editing another workstream's paths.
- Do **not** fix the plan-540 binding failures or any other pre-existing
  behaviour failure in this plan.

## 6. Acceptance

- A `ComboboxTrigger` with no `label`, no caller `aria-label`, and either the
  placeholder or a selected value exposes a non-empty accessible name equal to
  its visible text.
- An authored `label` or `aria-label` still wins, and remains trimmed of
  surrounding whitespace.
- `docs/combobox.mdx` and `COMPONENTS.md` state the fallback.
- The three new behaviour cases fail before the fix (cases 1 and 2) and pass
  after.
- `nub run check`, `nub run lint` and the package unit suite pass.
- The plan is indexed in `.agents/slop/plans/README.md`, the task is ticked in
  `TODO.md`, and `PLAN.md` D30 records the number claim (`663`–`665` were taken
  by other worktrees when this plan was written).
