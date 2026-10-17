# 061 — `RadioGroup` cannot show a failed validation

**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 030, 041, 049 (the radio focus contract).
**Status:** planned → execute, then update the index.

---

## 0. The gap

Every other selectable control takes `invalid` and paints the destructive role:
`Checkbox`, `Switch`, `Slider`, `RangeSlider`, `Input`, `TextArea`,
`NumberField`, `OTPField`, `Select`. `RadioGroup` does not. A form that validates
"choose a plan" therefore has nowhere to put the failure: the visible error text
can be destructive, but the control itself stays in its resting border.

`core/selection.ts` already implements the paint — `SelectionSpec.invalid` sets
`emptyBorder = colors.destructive` for `selectionBoxStyle`. The radio simply
never passes it (`renderRadioGroup` builds a spec without `invalid`).

## 1. Decision

Add `invalid?: boolean` to `RadioGroupProps` and thread it into each option's
`SelectionSpec`. The group-level flag matches the group-level shape of
`disabled`; an option cannot be independently invalid because validation belongs
to the choice, not to one row.

No new core code: the paint already exists and is covered by the Checkbox and
Switch tests.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/RadioGroup.tsx` | `invalid?: boolean` on the props; `invalid: props.invalid === true` in the spec |
| `packages/primitives/src/components/selection.test.tsx` | an element-tree test that the unchecked circle's border is the destructive role when `invalid` |
| `packages/primitives/runtime/controls.runtime.test.tsx` | a measured test on the painted `borderColor` of the circle, with and without `invalid` |
| `packages/primitives/docs/radio-group.mdx` | API row + a sentence in states/limitations + verification |
| `COMPONENTS.md` | the RadioGroup row records `invalid` |
| `.agents/slop/plans/README.md` | index row |
| `TODO.md` | tick the task added under the primitives workstream |

## 3. Steps and exact commands

From `/Users/cyberistic/GPUIXUI/workspaces/primitives`:

1. **Edit `RadioGroup.tsx`.** Add the prop after `disabled`:

   ```ts
   /** A failed validation paints the circles' border with the destructive role. */
   readonly invalid?: boolean;
   ```

   In the `spec` built per option add `invalid: props.invalid === true`.

2. **Element-tree test** in `selection.test.tsx` → `describe("RadioGroup")`:
   render with `{ options, invalid: true }`, take the first option row
   (`elementChildren(group)[0]`), take its circle (`elementChildren(row)[0]`) and
   assert `hostStyleString(circle, "borderColor")` is
   `testTheme.colors.destructive`. A second render without `invalid` asserts it is
   `testTheme.colors.input`. (The existing suite already imports `hostStyleString`
   helpers via `testing/element.js`; add what is missing.)

   Run `nub run --filter @gpuixui/primitives test`. Expect 306+ passing.

3. **Runtime test** in `controls.runtime.test.tsx`, next to the radio tests,
   using the existing `circleOf(runtime, label)` helper:

   ```ts
   it("paints a RadioGroup's failed validation on every circle", async () => {
     // mount invalid -> both circles' borderColor === testTheme.colors.destructive
     // mount valid -> both === testTheme.colors.input
   });
   ```

   Run `nub run --filter @gpuixui/primitives test:runtime`.
   Expect 14 files, 138 tests, green.

4. **Two-direction proof.** Remove `invalid: props.invalid === true` from the
   spec, re-run the runtime suite, and record the failure (expected: the
   destructive assertion sees the input role). Restore. Then remove the element
   test's `invalid` flag and re-run the offline suite; it must fail too. Record
   both in §6.

5. **Docs.** `radio-group.mdx`: add `invalid` to the API table, mention it in the
   states/validation paragraph (the empty circle takes the destructive border;
   checked circles keep the accent), and list both tests in Verification.
   Refresh `COMPONENTS.md`'s RadioGroup row with the measured border result.

6. **Counts, index and TODO.** Update the measured test counts wherever they are
   stated (package README, `COMPONENTS.md`), add the plan to the index, tick the
   TODO task.

7. **Gates.**

   ```sh
   nub run check
   nub run lint
   nub run test
   nub run --filter @gpuixui/primitives test:runtime
   ```

## 4. Acceptance

- `RadioGroup({ invalid: true })` paints every unchecked circle's border with
  `colors.destructive`, and the checked one keeps the accent — measured in the
  real runtime.
- The element tree carries the same decision, so a regression is caught without
  a binding.
- Both tests were shown to fail with the flag removed.
- Docs, inventory and counts agree; the gates are green.

## 5. STOP conditions

- `selectionBoxStyle` does not reach the circle element in the runtime (the
  measured `style.borderColor` is not the colour the spec sets) — stop and record
  the actual property, do not invent a second paint path.
- The element tree cannot reach the circle without a new `testId` that changes
  the public API — stop; the runtime test alone is acceptable if §6 says why.

## 6. Outcome (executed on this host, 2026-10-17)

**Both directions proven, then restored green.**

| Guard removed | Failing test | Measured failure |
| ------------- | ------------ | ---------------- |
| `invalid: props.invalid === true` in the option spec | `runtime/controls…` → `paints a RadioGroup's failed validation on the empty circles` | `expected '#000015' to be '#00000F'` — the empty circle painted the input border, not the destructive one |
| same | `src/components/selection.test.tsx` → `paints a failed validation on the empty circles only` | the same assertion, without a binding |

Restored: `nub run --filter @gpuixui/primitives test:runtime` → **14 files, 138
tests, all passing** (137 before). `nub run --filter @gpuixui/primitives test`
→ **306 tests** (305 before).

One harness fix was needed: `elementChildren` decoded `Array(ReactElement)`
first, which fails when a conditional child is `null` (the radio row's optional
`description`), so a row's circle was unreachable from the element tree. It now
decodes an array of `Unknown` and keeps only React elements, which matches its
documented contract and changes no existing test.

Not fixed here, recorded in `TODO.md`: `Select`'s list never matches its
trigger — `minWidth: "100%"` resolves against the layer, so a 108 px and a 900 px
trigger both open a 57 px list. It needs its own plan (062).
