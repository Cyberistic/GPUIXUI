# 500 — A row's visible description must reach assistive technology

- **Status:** done
- **Phase:** F (accessibility truth)
- **Depends on:** `026`, `065`, `093`, `345`, `355`
- **Owner:** primitives workstream (`packages/primitives`)
- **Amends:** `packages/primitives/src/components/CheckboxGroup.tsx`,
  `packages/primitives/src/components/RadioGroup.tsx`,
  `packages/primitives/src/components/selection.test.tsx`,
  `packages/primitives/runtime/option-description.runtime.test.tsx`,
  `packages/primitives/docs/checkbox-group.mdx`,
  `packages/primitives/docs/radio-group.mdx`, `COMPONENTS.md`, `TODO.md`

## 1. The bug

`CheckboxGroupOption` and `RadioOption` both accept a `description`, and both
renderers paint it as a caption under the label:

```tsx
<Text role="caption" tone="muted" style={shrinkLayoutStyle}>
  {description}
</Text>
```

The row itself carries only a name:

```tsx
role="checkbox"            // or role="radio"
aria-label={ariaName(label)}
aria-valuetext={selectionValueText(state)}
```

So a sighted user reads the hint while a screen-reader user hears the label
alone. The docs currently record this as a limitation of the runtime:

- `docs/checkbox-group.mdx`: “`option.description` is painted as visible
  supporting text, not wired as `aria-describedby` (unsupported).”
- `docs/radio-group.mdx`: “`description` is a caption beside the name, not an
  accessible description.” and “A `description` is not associated with the
  option for assistive technology.”

That reasoning conflates two different ARIA mechanisms. `aria-describedby`
needs an id reference and is indeed unsupported, but 0.10.0 **does** expose
`aria-description` — a plain string — and this package already relies on it for
`Tooltip` (`plan 071`), every field's tip (`plan 345`) and `InfoTip`
(`plan 073`). A description that is already a single string needs no
association at all, so the limitation is ours, not the runtime's.

This is the class plans `342` (`Box` denied a real gradient) and `376` (`Grid`
denied track sizing) fixed: a documented limitation that the runtime does not
actually impose.

## 2. Decision

- A **non-blank** `option.description` becomes the row's
  `aria-description`, trimmed (the `ariaName` rule from plan `026`).
- An **absent**, empty or whitespace-only description publishes no
  `aria-description`; a computed blank string must not create an empty
  description.
- The visible caption is unchanged.
- The change is applied to **both** data-driven selection groups, because the
  row contract is shared: `CheckboxGroup` (`role="checkbox"`) and `RadioGroup`
  (`role="radio"`).
- `Label.description`, `SelectOption` and the single `Checkbox`/`Switch` share
  no option row and are out of scope (§7).

## 3. Steps

### 3.1 Write the failing element-tree tests

File: `packages/primitives/src/components/selection.test.tsx`

In `describe("RadioGroup")`, add beside the existing blank-label case:

```ts
it("publishes an option description as its accessible description", () => {
  // The bug this guards (plan 500): the caption was painted but the row
  // published no aria-description, because the docs mistook the unsupported
  // `aria-describedby` for the supported `aria-description`.
  const element = renderRadioGroup(
    {
      options: [
        { value: "alpha", label: "Alpha", description: "Every Monday." },
      ],
    },
    testTheme,
    text("alpha"),
    0,
    unfocused,
    radioHandlers(vi.fn()),
  );
  const option = expectSome(Arr.head(elementChildren(element)));
  expect(expectSome(hostProp(option, "aria-description"))).toBe(
    "Every Monday.",
  );
});
```

and a blank case:

```ts
it("publishes a blank option description as absent", () => {
  const element = renderRadioGroup(
    {
      options: [{ value: "alpha", label: "Alpha", description: "   " }],
    },
    testTheme,
    text("alpha"),
    0,
    unfocused,
    radioHandlers(vi.fn()),
  );
  const option = expectSome(Arr.head(elementChildren(element)));
  expect(hostProp(option, "aria-description")).toStrictEqual(Option.none());
});
```

In `describe("CheckboxGroup")`, add the same two assertions. The existing
`options` constant already carries `description: "A digest."` on `email`:

```ts
it("names each row with its label and describes it with the option text", () => {
  const element = render();
  expect(expectSome(hostProp(row(element, 0), "aria-description"))).toBe(
    "A digest.",
  );
  expect(hostProp(row(element, 1), "aria-description")).toStrictEqual(
    Option.none(),
  );
});

it("publishes a blank option description as absent", () => {
  const element = render({
    options: [{ value: "email", label: "Email", description: "   " }],
  });
  expect(hostProp(row(element, 0), "aria-description")).toStrictEqual(
    Option.none(),
  );
});
```

Run:

```sh
nub run --filter @gpuixui/primitives test -- selection
```

**Expected before the fix:** the four description cases fail (three with
`Option.none()` where a string is expected, one because the blank case happens
to pass — keep it as the regression half). The rest of the file is green. STOP
if the file is red for an unrelated reason.

### 3.2 Publish the description on both rows

File: `packages/primitives/src/components/RadioGroup.tsx`

On the option row, beside `aria-label`:

```tsx
aria-description={ariaName(option.description)}
```

File: `packages/primitives/src/components/CheckboxGroup.tsx`

On the `renderRow` host div, beside `aria-label`:

```tsx
aria-description={ariaName(description)}
```

Update both components' module JSDoc and the `description` field JSDoc:
`description` is visible supporting text **and** the row's
`aria-description`; blank reads as absent. Do not add an `aria-describedby`
prop — it is not supported.

Run the same command. **Expected:** the file green (all four new cases pass).

### 3.3 Prove it in the real accessibility tree

File: `packages/primitives/runtime/option-description.runtime.test.tsx` (new)

Header comment must state the bug being guarded:
“A row's visible `description` reached no assistive technology; the runtime
supports `aria-description` even though it has no `aria-describedby`.”

Cases (two scoped cases, four assertions):

1. `CheckboxGroup` with `{ value: "email", label: "Email", description: "A digest." }`
   → `a11yNode(runtime.a11y(), { role: "CheckBox", label: "Email" })` has
   `aria.description === "A digest."`.
2. The same group also has a description-less row (`Push`) → its node has no
   description (`None`/`undefined`).
3. A blank description (`"   "`) → the row's node has no description.
4. `RadioGroup` with the same description →
   `a11yNode(..., { role: "RadioButton", label: "Weekly" })` has
   `aria.description === "Every Monday."`.

Use `openWindow`, `Surface` and `testTheme` from `./fixture.js`, and
`a11yNode` from `../src/testing/index.js`; follow the Option-safety style of
`runtime/row-feedback.runtime.test.tsx` (no non-null assertions).

Run only the affected file:

```sh
nub run --filter @gpuixui/primitives test:runtime runtime/option-description.runtime.test.tsx
```

**Expected:** 2/2 green (the four assertions above). With `aria-description`
removed from either component the matching case fails. STOP if the binding is
missing (`unsupported-host`) — report the exact output; do not replace the
runtime proof with a claim.

### 3.4 Correct the docs and the inventory

- `packages/primitives/docs/checkbox-group.mdx` — Accessibility bullet:
  “`option.description` is the row's `aria-description`; GPUix has no
  `aria-describedby`, but it exposes the string form, so the visible hint is
  announced with the row. A blank description is absent.”
- `packages/primitives/docs/radio-group.mdx`:
  - the `RadioOption` paragraph: “`description` is a visible caption **and**
    the option's `aria-description`”;
  - remove the “not associated with the option” limitation and state the
    supported mechanism;
  - add the new runtime file to the Verification list.
- `packages/primitives/README.md` — only if it repeats the false claim (it does
  not today; the capability row is about `aria-describedby`, which stays
  absent).
- `COMPONENTS.md`:
  - Checkboxes row: append “**Option descriptions (500):** the visible
    `option.description` is now the row's `aria-description` (blank absent);
    the runtime has no `aria-describedby`, but the string form is supported.”
  - Radio groups row: the same sentence for its options.
- `TODO.md`: add a ticked row under the primitives workstream and
  bump the header count.
- `.agents/slop/plans/README.md`: add this plan to the primitives table with a
  `done` status once §3.5 passes.

### 3.5 Gates

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime runtime/option-description.runtime.test.tsx
nub run check
nub run lint
nub run test
```

Expected: all exit `0`; the offline suite rises from 724 by the new cases. The
full live suite is **not** part of this plan: its 19 failing files are the
host's plan-379/529 binding delta; the scoped runtime file is the correct proof
here.

## 4. STOP conditions

- The element-tree suite, `check-types` or `check` is red before the change for
  an unrelated reason.
- The runtime suite cannot load the binding — report the exact output; do not
  fake the run or downgrade the proof to an element-tree assertion.
- The runtime reports no `aria.description` for a `Checkbox`/`RadioButton`
  row even after the prop is present. In that case STOP and record the measured
  capability instead of shipping a claim: the page goes back to the limitation,
  with the evidence (this would mean the attribute is host-wide but not mapped
  on those roles).
- A change is needed outside `packages/primitives` and the inventory/ledger
  files listed in §3.4 — record it as a `TODO.md` row instead.

## 5. Test plan (what must be able to fail)

| Direction | Test | Fails on the old code because |
| --- | --- | --- |
| CheckboxGroup description announced | element + runtime | the row passed no `aria-description` |
| RadioGroup description announced | element + runtime | the option row passed no `aria-description` |
| Blank description absent | element + runtime | a raw blank would publish `""`/`"   "` |
| Description-less option stays description-less | element + runtime | guards against applying a default |
| Name and state unchanged | existing `selection.test.tsx`, `name.runtime` | guards no regression |

Two-direction proof: run the four element cases and the runtime file against
the old components (each description case fails); add the two lines; rerun and
record both counts.

## 6. Acceptance

- A non-blank `option.description` is the row's `aria-description` in the
  decoded element tree and in the real 0.10.0 accessibility tree, for both
  groups.
- An absent/blank description publishes no description.
- The visible caption, the row name, the state announcement and the row style
  are unchanged.
- Both component pages, the inventory and the plan index agree with the code.
- `nub run check`, `nub run lint`, `nub run test` and the scoped runtime file
  pass, and the commands were actually run.

## 7. Deliberately out of scope

- `Label.description`, `Field` help text and `Input`'s adjacent help text are
  not option rows and have no owning interactive element in this package to
  describe; `aria-describedby` remains unavailable, and inventing a description
  on an unrelated node would announce the wrong thing.
- `SelectOption` has no `description` field; adding one would be a new feature,
  not a truth fix.
- A standalone `Checkbox`/`Switch` has a `label` but no description prop; its
  `Tooltip` path already uses `aria-description` (plan `345`).

## 8. Outcome (measured 2026-10-19)

- `nub run --filter @gpuixui/primitives test -- selection` before the fix:
  **2 failed** — the CheckboxGroup and RadioGroup description cases report no
  `aria-description`; the two blank cases pass because the prop was absent
  anyway. After the fix: **728 passed** (724 before, +4).
- Scoped runtime file before the fix: **2 failed** — the accessibility nodes
  report `undefined` where `"A digest."`/`"Every Monday."` are expected
  (`RadioButton` case: `expected undefined to be 'Every Monday.'`). After:
  **2/2 passed**. Both groups' roles (`CheckBox`, `RadioButton`) map the
  string form, so the remaining limitation is `aria-describedby` only.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the runtime
  suites outside this file were not run (the host's plan-379/529 artifact delta
  is unchanged).
