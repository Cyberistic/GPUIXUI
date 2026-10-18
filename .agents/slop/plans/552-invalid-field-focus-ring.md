# 552 — An invalid field keeps its focus ring

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `115`, `117`, `388`, `516`, `522` |
| Status | done — 2 native cases (Field 9), both-direction proof (1 fails on the old condition, the pin fails with `autoFocus` added) |
| Blocker | none — the assertion reads the authored `style` the renderer reports (plan `150`), and focus is seeded from `autoFocus` (plan `388`), so the plan-540 binding defects (focus events, box conventions) are out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`FieldInput` paints the token focus ring only when the field is **valid**:

```ts
...(focused && !isInvalid && !isDisabled ? focusRing(theme) : {}),
```

Measured on this host (0.10.0, plan 140's binding), an `autoFocus` invalid field
reports this authored style:

```
backgroundColor #191D25 · borderColor #FF6B6B · borderWidth 1 · no boxShadow
```

A focused invalid field and an **unfocused** invalid field are therefore
visually identical for a keyboard user: the destructive border is the error cue,
not a focus cue. That breaks the one rule the component layer states in its own
docs and plans — every focusable part shows where focus is (plan `522`; WCAG
2.4.7 "Focus Visible") — and `docs/field.mdx` currently turns the defect into a
claimed design choice ("an invalid one keeps the destructive border instead").

`packages/primitives` already paints `focusRing` beside an invalid border (the
Slider's thumb: `spec.invalid` changes the border, `spec.focused` still sets the
ring), so the components package is also inconsistent with the Tier 1 layer.

Scope of this plan:

- an invalid focused `FieldInput` paints the token focus ring **and** keeps the
  destructive border;
- prove it in both themes, and pin that an invalid control with no focus paints
  no ring;
- sync `docs/field.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index.

**Out of scope** (do not add): a destructive-coloured ring or a new
`destructiveRing` token role (that is a `tokens` change and an interlock, not
this fix); a `focusVisible` heuristic (0.10.0 has none); focus rings on other
invalid controls (there are none in this package yet); animations; the
`@gpuixui/primitives` `Input` adoption (blocked by two theme providers).

## 2. What exists today (read these first)

- `packages/components/src/field.tsx`:
  - `FieldInput` computes `isInvalid = invalid ?? field?.error !== undefined`;
  - `isDisabled = disabled || fieldsetDisabled`;
  - the border swaps to `theme.colors.destructive` when invalid;
  - the ring line is the one quoted in §1: `focused && !isInvalid && !isDisabled`.
- `packages/components/src/behaviour/field.test.tsx` — 7 native cases. The
  `autoFocus` case (near the end) already proves the **valid** focused input
  paints a `boxShadow`; nothing covers invalid + focused. The suite header names
  the bugs it guards; add this one.
- `packages/components/docs/field.mdx` — the Theming section says "A neutral
  focused input takes the focus ring; an invalid one keeps the destructive
  border instead", and the Verification line says `(7 tests)`.
- `COMPONENTS.md` → Tier 2 → Inline validation says `7 native behaviour tests`
  and does not mention focus.
- `packages/components/src/inventory.ts` → `fieldMeta`: `testFile` is
  `src/behaviour/field.test.tsx`; `limitations` mentions `aria-describedby`, the
  local input stand-in and the form-library scope. No limitation claims the
  ring is absent, so no `limitations` edit is needed.
- `packages/components/src/inventory.test.ts` holds the count in
  `COMPONENTS.md` and in the docs verification line to the suite, so both must
  change in the same commit.

## 3. Design

### 3.1 The one rule (`field.tsx`)

```ts
...(focused && !isDisabled ? focusRing(theme) : {}),
```

- `disabled` is the only reason to suppress the ring: a disabled input never
  holds focus anyway (`readOnly`, `tabIndex -1`), so this is belt and braces and
  keeps the plan-394 contract explicit.
- The ring is the **neutral** token ring (`theme.colors.ring`). A destructive
  ring would need a token role; until tokens ship one, one neutral ring language
  across the library is the honest choice.
- The border rule does not change, so error and focus stay two independent
  signals: colour says invalid, the outer spread says focused.
- `mergeStyles(component, caller)` order does not change, so a caller `style`
  still wins.

Update the part's doc comment to say the ring is painted while focused even when
invalid, and keep the "no `aria-describedby`" note.

### 3.2 Why the test cannot depend on the binding

`autoFocus` seeds React's `focused` state (plan 388) **and** the runtime applies
native focus; the authored style is computed from state, so reading
`style.boxShadow` is deterministic even though this binding delivers no
`onFocus`/`onBlur` for a native focus move (plan `536`/`540`). Do **not** use
`renderer.focusElement` to prove the ring: it cannot be observed here.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/field.tsx` | the ring condition in §3.1 + the `FieldInput` doc comment |
| `packages/components/src/behaviour/field.test.tsx` | two native cases (§5.1) and the guarded-bug header line |
| `packages/components/docs/field.mdx` | Theming sentence, Accessibility note if it claims the ring is dropped, verification count `7 → 9` |
| `COMPONENTS.md` | the Inline validation row: `7 → 9` native tests, add the focused-invalid ring |
| `TODO.md` | add and tick the Phase C hardening row (§7) |
| `.agents/slop/plans/README.md` | index this plan after `548` with the measured counts |

Touch nothing outside `packages/components/**`, `COMPONENTS.md`, `TODO.md` and
`.agents/slop/plans/README.md`.

## 5. Test plan

Extend the suite header comment with the guarded bug: **an invalid focused field
painted no focus ring, so focused and unfocused invalid fields looked the same**.

### 5.1 Native (`src/behaviour/field.test.tsx`, real `TestRenderer`)

1. **An invalid focused field paints the ring in both themes.** For each of
   `light` and `dark`, render
   `<Field label="Email" error="Enter a valid email"><FieldInput testId="email" autoFocus /></Field>`,
   then assert:
   - `findByTestId("email")?.style.borderColor` is the theme's
     `colors.destructive` (the error signal survives);
   - `style.boxShadow` equals `focusRing(theme).boxShadow` — deep equality, not
     only `toBeDefined`, so a wrong shadow cannot pass. `focusRing` is imported
     from `../internal/theme.js`.
   `unmount()` between renders (one native root at a time).
2. **An invalid field with no focus paints no ring.** Same field without
   `autoFocus`: `borderColor` is destructive and `style.boxShadow` is
   `undefined`. This pins that the ring is a **focus** cue, not a permanent
   error decoration.

Expected: the suite grows from 7 to 9 passing cases. Existing cases (including
the neutral `autoFocus` ring case) are unchanged.

### 5.2 Both directions (AGENTS §3)

1. Revert only the ring line to `focused && !isInvalid && !isDisabled`; the new
   case 1 must fail in both themes with `boxShadow` `undefined` while the border
   assertion still passes, and case 2 must keep passing. Record that in the
   commit message.
2. Restore the fix; case 1 passes, case 2 passes.
3. For the pin, add `autoFocus` to case 2's field and confirm case 2 fails — that
   is what makes it a pin rather than a duplicate.

### 5.3 Regression

- the 7 existing field cases still pass unchanged;
- `src/behaviour/theme-matrix.test.tsx` covers Field in both themes and stays
  green;
- `nub run --filter @gpuixui/components test` passes with the updated inventory
  and docs counts;
- `nub run check`, `nub run lint` pass.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/field.test.tsx        # from packages/components: 9 passed
nub run --filter @gpuixui/components test                 # unit suite passes
nub run --filter @gpuixui/components check-types          # exit 0
nub run check                                             # exit 0
nub run lint                                              # exit 0
```

`test:behaviour` as a script runs the whole native suite, which currently has 59
**pre-existing** plan-540 binding failures; scope the run to the file with the
command above. Never report the full suite green unless it is.

## 7. Docs, inventory and TODO

- `docs/field.mdx`:
  - Theming: replace "an invalid one keeps the destructive border instead" with
    "a focused invalid input keeps the destructive border **and** paints the
    token focus ring — validity and focus are separate signals";
  - Accessibility: state that the ring is the only focus cue 0.10.0 can paint
    (no `focusVisible`), and that it is no longer dropped while invalid;
  - verification line: `(9 tests)` and name the new cases.
- `COMPONENTS.md` Inline validation row: `7 → 9 native behaviour tests`, and add
  "an invalid focused input keeps the destructive border and the focus ring".
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick `An invalid field keeps its focus ring — plan 552; 2 native cases (Field
  9), both-direction proof; docs, COMPONENTS.md and inventory synced`.
- Plan index: add plan 552 after 548 with the measured counts and the note that
  the plan-540 failures are untouched.
- `src/inventory.ts` needs no edit (the record's limitations are unchanged).

## 8. STOP conditions

Stop and report instead of improvising when:

- the new case reports a `boxShadow` that is **not** deep-equal to
  `focusRing(theme).boxShadow` (the renderer may transform the shadow; do not
  weaken the assertion to `toBeDefined` without recording why);
- painting the ring also changes the reported border colour, or the invalid
  border disappears (the two signals must stay independent);
- the `autoFocus` state is not seeded in the invalid path (then the harness or
  plan-388 seeding regressed — report, do not work around it with
  `focusElement`, which this binding cannot observe);
- an existing field or theme-matrix case fails for a reason other than the
  intended change (name the case and stop);
- the inventory count check fails because a count was not synced (fix the
  count, not the check).

## 9. Acceptance

- `<FieldInput autoFocus />` inside a field with an `error` reports the theme's
  destructive border **and** the token focus ring in light and dark.
- The same field without focus reports the destructive border and no ring.
- Two new native cases pass; the 7 existing ones still pass; unit, inventory,
  type, lint and format gates pass.
- `docs/field.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index agree with the
  measured counts, and no limitation claims the ring is suppressed.
