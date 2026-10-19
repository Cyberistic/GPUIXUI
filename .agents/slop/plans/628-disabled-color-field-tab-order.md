# 628 — A disabled colour picker leaves the tab order

**Phase:** F (disabled means inert) ·
**Workstream:** `components` (Tier 2 composition and feedback) ·
**Depends on:** 110, 117, 318, 394, 516, 522, 527, 554, 608 ·
**Number block:** 500–699 overflow; `628` is free in every worktree (checked
2026-10-19) ·
**Status:** planned

## 1. The gap

`ColorPicker` sets `tabIndex={-1}` on every swatch when `disabled`, but the HEX
`<input>` only takes `readOnly`:

```tsx
<input
  aria-label={`${label} hex value`}
  {...stateDescription(disabled, valid ? undefined : "Invalid hex colour")}
  testId={testId === undefined ? undefined : `${testId}-hex`}
  value={draft}
  readOnly={disabled}
  ...
```

`readOnly` blocks editing; it does **not** remove an `<input>` from the tab
order. So a keyboard user can still Tab into a disabled colour picker's field,
which is exactly what plan 394 removed everywhere else:

- `FieldInput`: `{...(isDisabled ? { readOnly: true, tabIndex: -1 } : {})}`;
- `TimePicker` segments: `tabIndex: disabled ? -1 : 0`;
- `TagInput` field and `MentionInput` field: `tabIndex: -1` when disabled;
- `SearchInput`: `tabIndex={disabled ? -1 : 0}`.

The `docs/color-picker.mdx` accessibility section already claims *“Disabled is
`tabIndex={-1}` plus `readOnly` and dimming”* and the API table says the field is
read-only without saying it stays reachable. The swatch test checks only the
swatches, so the field's tab stop was never measured.

## 2. Decision

When `disabled`, the HEX input leaves the tab order exactly as the swatches do:

```tsx
{...(disabled ? { tabIndex: -1 } : {})}
```

No new prop; no guard change to `onFocus` (every other disabled field in the
package keeps its handler and relies on the tab order, and 0.10.0 does not deliver
React `focus` for a focus move anyway — plan 536). The field remains `readOnly`
and dims with its group.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/components/src/color-picker.tsx` | add the conditional `tabIndex` on the HEX input |
| `packages/components/src/behaviour/color-picker.test.tsx` | strengthen the disabled case with the field's tab stop and a live-field pin |
| `packages/components/docs/color-picker.mdx` | API row and accessibility bullet say the field leaves the tab order; verification count 10 → 11 |
| `COMPONENTS.md` | Color picker row: 10 → 11 native tests, add the disabled clause |
| `TODO.md` | tick the new Tier 2 hardening row |
| `.agents/slop/plans/README.md` | index this plan as done after the gates |
| `PLAN.md` | append `628` to D30's overflow trail |

## 4. Test plan

Extend the existing **“is inert when disabled”** case (or add one named
**“leaves the tab order when disabled”** if the existing case becomes too wide)
in `src/behaviour/color-picker.test.tsx`:

```ts
expect(
  picker.renderer.findByTestId("picker-hex")?.customProps?.tabIndex,
).toBe(-1);
```

and a pin in the same case or an enabled-case assertion:

```ts
expect(
  enabled.renderer.findByTestId("picker-hex")?.customProps?.tabIndex,
).not.toBe(-1);
```

The disabled assertion fails at `HEAD` (`undefined`), which is the regression
guard. The enabled pin stops the conditional from becoming an unconditional `-1`.

Mutation proof: remove the conditional from the input, run the suite, record the
one failure, restore.

### Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour src/behaviour/color-picker.test.tsx
# expect: Color picker 11 tests pass (plus the recorded plan-540 ring case is
# unaffected either way — this case reads tabIndex, not focus events)

nub run --filter @gpuixui/components test
# expect: 45 files, 454 tests pass (inventory/docs checks included)

nub run check
nub run lint
nub run test
```

## 5. STOP conditions

- If `customProps.tabIndex` is not reported for the host input, STOP and record
  the element shape instead of asserting on `style` or a coordinate.
- If adding `tabIndex` changes the enabled field's measured focus or ring in a
  way an existing test reports, STOP and report — a disabled fix must not alter
  the enabled control.
- If the docs count check reports a mismatch, update the stated count to the
  measured suite count; do not change the suite to match a guessed number.

## 6. Acceptance

- A disabled colour picker's swatches **and** HEX field are out of the tab order;
  an enabled field is not.
- The suite fails at `HEAD` and passes with the fix; the mutation is recorded.
- Docs, `COMPONENTS.md` and the inventory agree on the new count.
- `nub run check`, `nub run lint` and `nub run test` pass.
