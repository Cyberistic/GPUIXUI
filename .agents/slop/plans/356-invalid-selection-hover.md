# 356 — An invalid selection surface loses its error border when hovered

**Phase:** F (interaction states) · **Workstream:** primitives · **Depends on:** 030, 041, 047, 049, 061, 065, 070, 079, 084, 091, 332, 351, 355 · **Status:** planned

## 1. The defect (measured)

Plan `091` fixed one class on the **field** chrome: an invalid surface must keep
the destructive boundary through its interaction states, because the hover and
press rules are a border change and applying them verbatim paints the healthy
border over a failed validation.

Two selection painters were never migrated:

- `core/selection.ts` `selectionBoxStyle` — the box of `Checkbox`, the circle of
  `RadioGroup`, and the box inside every `CheckboxGroup` row;
- `core/selection.ts` `switchTrackStyle` — the `Switch` track.

Both compute `emptyBorder` correctly (`colors.destructive` when `invalid`) and
then declare:

```ts
hover: filled ? { …accent… } : { borderColor: colors.borderStrong },
active: { borderColor: colors.ring },
```

so the destructive boundary survives only at rest.

Measured on this host in the real `TestRenderer` (2026-10-18) by reading the
authored style the renderer reports for the element that owns the pointer
(`paintedStyle` reports the authored `StyleDesc`, including its nested rules —
the same basis plan `355` used):

| Control | Resting `borderColor` | `hover.borderColor` | `active.borderColor` |
| ------- | --------------------- | ------------------- | -------------------- |
| `<Checkbox invalid />` | `#00000F` (destructive) | **`#000014`** (borderStrong) | **`#000018`** (ring) |
| `<Switch invalid />` | `#00000F` (destructive) | **`#000014`** (borderStrong) | **`#000018`** (ring) |

The same two painters serve the group boxes, so an invalid `RadioGroup` circle
and an invalid `CheckboxGroup` box have the same authored pair.

The user-visible consequence: moving the pointer onto a control that is
announcing a validation failure repaints its only error cue as the healthy
border, and pressing it repaints the ring colour. During the gesture the control
looks valid. The docs promise the opposite — `checkbox.mdx` ("the empty box takes
the destructive border"), `switch.mdx` ("`invalid` gives an off-switch the
destructive border"), `radio-group.mdx` and `checkbox-group.mdx` ("the empty
circles/boxes take the destructive border").

The existing validation matrix (`runtime/invalid.runtime.test.tsx`, plan `351`)
reads only **top-level** colour values (`runtime/theme.ts` `paintedColours`), so
a nested `hover`/`active` override is invisible to it. This is the unguarded
direction.

## 2. The rule, once

On a selection surface, an **invalid, unfilled** control keeps the destructive
border in every interaction state:

| State | Unchecked + valid | Unchecked + invalid | Filled (any validity) |
| ----- | ----------------- | ------------------- | --------------------- |
| rest | `colors.input` | `colors.destructive` | accent role |
| hover | `colors.borderStrong` | **`colors.destructive`** | accent, lifted alpha |
| press | `colors.ring` | **`colors.destructive`** | accent, lifted alpha |
| disabled | `emptyBorder`, no feedback | `colors.destructive`, no feedback | accent, no feedback |

A **filled** box keeps its accent feedback — plan `061`/`070` already decided a
chosen option is not what failed validation. The rule is one helper in
`core/selection.ts` used by both painters, so a third selection surface cannot
re-derive it.

This mirrors `controlStyle`'s `interactive()` helper exactly (plan `091`): only
the boundary changes; no fill is invented, and no new colour role appears.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/selection.ts` | **add** a module-local `interactionBorder(spec, theme, fallback)` (or the equivalent named helper): `colors.destructive` when `spec.invalid === true && spec.state === "unchecked"`, else `fallback`. Use it for `selectionBoxStyle`'s `hover`/`active` border and `switchTrackStyle`'s `hover`/`active` border. |
| `packages/primitives/src/core/selection.test.ts` | cases for both resolvers: invalid unchecked keeps destructive on hover **and** press; valid unchecked still changes; filled invalid keeps the accent; disabled invalid paints no feedback. |
| `packages/primitives/src/components/selection.test.tsx` | element-tree cases for `Checkbox invalid`, `Switch invalid`, an invalid `RadioGroup` option box and an invalid `CheckboxGroup` row box: `hover.borderColor` and `active.borderColor` are `theme.colors.destructive`. |
| `packages/primitives/runtime/invalid.runtime.test.tsx` | **new cases** in the existing validation matrix: an invalid `Checkbox` and `Switch` report the destructive role in `active.borderColor` (the nested declaration reaches the renderer); a valid one reports the healthy values. The header comment gains the reason (plan `356`). |
| `packages/primitives/docs/checkbox.mdx` | Theming: hover/press keep the destructive border while invalid. |
| `packages/primitives/docs/switch.mdx` | the same sentence in Theming. |
| `packages/primitives/docs/radio-group.mdx` | the same sentence beside the existing row-wash paragraph. |
| `packages/primitives/docs/checkbox-group.mdx` | the same sentence for the row's box. |
| `COMPONENTS.md` | the Checkboxes, Radio groups and Switches rows: the invalid sentence now names the hover/press behaviour. |
| `TODO.md` | one ticked primitives row describing the measured defect and its fix. |
| `.agents/slop/plans/README.md` | index row for `356`. |

No new component, prop, state type, example or token: four existing components
become internally consistent with a rule the package already states.

## 4. Implementation notes (exact)

1. `filled(spec)` is already `spec.state !== "unchecked"` (module-local). The
   helper must reuse it, not re-test the state string at each call site.
2. `selectionBoxStyle`'s `hover` for a **filled** box is unchanged
   (`alpha(role.background, 0.9)`); only the unfilled branch reads the helper.
   `active` currently paints `colors.ring` for both branches; keep the filled
   branch as it is and route only the unfilled one through the helper.
3. `switchTrackStyle`'s hover has the same shape: filled keeps the alpha
   background/border; unfilled routes `borderColor` through the helper. Its
   `active` is `{ borderColor: colors.ring }`; unfilled invalid keeps
   `destructive`.
4. Disabled branches are **not** changed: they already restore `emptyBorder`
   (which is destructive when invalid) and declare empty `active`.
5. Do not touch `controlStyle`, `controlFocusStyle`, `ratingStarStyle` or
   `otpCellStyle`: the field chrome is fixed (plan `091`), the rating's error cue
   is an icon tint (no border interaction), and the OTP cell reuses
   `controlStyle`.
6. Do not add a test that drives a real hover and reads a *post-hover* colour:
   `TestElement.style` reports the authored declaration (plan `355` §6). Assert
   the declaration and its exact value.

### Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- selection` | the core and element suites green, with the new case names |
| `nub run --filter @gpuixui/primitives test:runtime -- invalid` | the validation-matrix file green, including the new nested-border cases |
| `nub run --filter @gpuixui/primitives test` | baseline `583 passed` in 43 files plus the new cases; no failures |
| `nub run --filter @gpuixui/primitives test:runtime` | baseline `534 passed` in 27 files plus the new cases; no failures |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check`, `nub run lint`, `nub run test` (repo root) | exit `0` |

Record the exact counts after the run in §6; never copy the estimates.

## 5. Test plan and two-direction proof

**Offline — `src/core/selection.test.ts`** (the rule, one place):

1. `selectionBoxStyle` with `invalid: true`, `state: "unchecked"`:
   `hover.borderColor` and `active.borderColor` are `colors.destructive`.
2. Same spec without `invalid`: `colors.borderStrong` / `colors.ring`.
3. `invalid: true`, `state: "checked"`: the hover still carries the accent
   background (the error marks what is missing, not what is chosen).
4. `invalid: true`, `disabled: true`: no pointer feedback is declared and the
   resting border is destructive.
5. The four equivalent cases for `switchTrackStyle`.

**Offline — `src/components/selection.test.tsx`** (each component's tree):

6. `renderCheckbox({ invalid: true }, …)` → the host's `style.hover.borderColor`
   and `style.active.borderColor` are destructive.
7. `renderSwitch({ invalid: true }, …)` → the same.
8. `renderRadioGroup({ invalid: true, … }, …)` → the option **box** child (the
   first child of the row) carries the same two values.
9. `renderCheckboxGroup({ invalid: true, … }, …)` → the row's box carries them.

**Runtime — `runtime/invalid.runtime.test.tsx`** (the declaration reaches the
real renderer):

10. `<Checkbox invalid />`: `style.active.borderColor` is the destructive role;
    `<Checkbox />` reports `colors.ring` instead (so the case is not vacuous).
11. `<Switch invalid />`: the same pair.

**Both directions** (mutate, observe the named failures, restore, re-run green):

1. Revert `selectionBoxStyle`'s two branches to the old literals — the core
   checkbox case, the element Checkbox case and both group-box cases fail by
   name; the switch cases stay green.
2. Revert `switchTrackStyle`'s two branches — the switch core, element and
   runtime cases fail; the checkbox cases stay green.
3. Make the helper ignore `invalid` — every invalid case fails while the valid
   cases stay green.
4. Make the helper treat a **filled** invalid box as unfilled — the filled case
   fails, proving the accent branch is guarded too.

**STOP conditions**

- An existing case fails for a reason other than the new expectations: stop and
  record which; do not edit the old assertion to fit.
- The runtime reports no nested `hover`/`active` block for these elements: stop
  and dump the style; the whole assertion style depends on it (plan `355`
  measured that it does report nested blocks).
- A mutation makes nothing fail: the case is vacuous — fix the case, do not tick
  the plan.
- A fix requires touching `controlStyle` or a rating/OTP painter: stop — the
  defect is not where this plan measured it.

## 6. Result (executed 2026-10-18)

_(fill after the run: exact counts, the files touched, and the four mutation
outcomes by test name.)_
