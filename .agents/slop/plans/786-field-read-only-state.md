# 786 — The field family's read-only state: two fields lack it, and no state can paint it

**Phase** F (Tier 1 completeness) · **Workstream** primitives · **Depends on**
`025` (the disabled field), `054` (NumberField/OTPField), `079`–`081`
(state-aware style), `094` (Rating's read-only), `332` (the disabled guard),
`603` (the focus lifetime), `740` (the labelled selection rows),
`749` (Label → control), `785`.

## 0. The defect, stated precisely

`Input` and `TextArea` accept `readOnly` and both pages promise that it
"accepts focus and selection, refuses edits". Three things are missing around
that promise:

1. **`NumberField` and `OTPField` have no `readOnly` at all.** They accept
   `disabled`, which is *not* the same state: it removes the field from the tab
   order, so a computed total or a verified code cannot be focused, read by
   assistive technology on demand, or copied. `Input`, `TextArea` and `Rating`
   all offer the state; two of the five field parts do not.
2. **The public state payloads omit it.** `FieldState` (`Input`, `TextArea`,
   `NumberField`), `OTPFieldState`, `OTPCellState` and `RatingState` describe
   only `disabled`/`focused`/`invalid`, so a state-aware `style` callback cannot
   paint the read-only surface even though the component knows it. `RatingStarState`
   already carries `readOnly` — the container does not.
3. **`readOnly`'s native contract was never measured.** No runtime suite drives
   a read-only field: the only proof is an element-tree assertion that the host
   receives `readOnly` (`src/components/fields.test.tsx:167`). The pinned
   runtime does enforce it (measured while writing this plan: a focused
   `readOnly` `Input`/`TextArea` reports **no** `onValueChange` for `x y z`,
   while the same field without the prop reports `keepx`, `keepxy`, `keepxyz`),
   but nothing keeps that true — including if the component's handler guard is
   later deleted.

The fix is one state, defined once per part: **`readOnly` is the
"visible, focusable, not editable" state; `disabled` is the "inert and out of
the tab order" state.** A read-only field keeps its tab stop, its focus ring,
its selection and its announcement; it refuses every edit path (typing, paste,
stepping, OTP keys) at the component, not only at the host.

## 1. The rule

| Fact | Read-only field | Disabled field |
| ---- | --------------- | -------------- |
| in the tab order | **yes** (`tabIndex` unchanged) | no (`-1`) |
| takes focus / paints the ring | yes | only if it already had focus (plan 332) |
| native host `readOnly` | yes | yes (emulated disabled, plan 025) |
| typing / paste / steppers / OTP keys | refused (host **and** component guard) | refused (guard, plan 025/332) |
| `onValueChange` / `onComplete` | never | never |
| `onSubmit` | forwarded (a read-only field may still submit its form) | not forwarded (plan 339) |
| chrome | the normal field recipe; `disabled` never applies | the disabled bucket |
| `FieldState`/`…State.readOnly` | `true` | the literal prop (a disabled field is `disabled: true`) |

The state payload reports the **prop**, the way `RatingStarState` already does;
a callback that wants "cannot edit" reads `disabled || readOnly`.

## 2. Files to change

### 2.1 `packages/primitives/src/components/Input.tsx`

1. Add `readOnly: boolean` to `FieldState` (after `disabled`), with a JSDoc
   sentence: "The field refuses edits but stays focusable; `disabled` is the
   stronger state (out of the tab order)."
2. Export one predicate under the existing field helpers:

   ```ts
   /** A field the user cannot edit: read-only or disabled. */
   export const fieldInert = (props: {
     readonly readOnly?: boolean;
     readonly disabled?: boolean;
   }): boolean => props.disabled === true || props.readOnly === true;
   ```

3. `fieldChrome` gains `readOnly` in its destructure and in the state object it
   passes to `resolvePartStyle`:
   `{ disabled: …, focused, invalid: …, readOnly: readOnly === true }`.
   Do **not** pass it to `fieldRecipeStyle` — the recipe has no read-only bucket,
   and a read-only field paints the normal surface (deliberate; record it in the
   page).
4. `fieldHostProps`:
   - `readOnly: fieldInert(props)` (was `props.readOnly === true || props.disabled === true`),
   - `onChange`: `if (!fieldInert(props)) onValueChange(event.value ?? "");`
   - `onSubmit: props.disabled === true ? undefined : props.onSubmit` (unchanged:
     read-only submits, disabled does not).

### 2.2 `packages/primitives/src/components/TextArea.tsx`

Its `fieldState` object (passed to `resolvePartStyle`) gains
`readOnly: props.readOnly === true`. Nothing else: it inherits the host props and
the guard from §2.1.

### 2.3 `packages/primitives/src/components/NumberField.tsx`

1. `NumberFieldProps` gains:

   ```ts
   /**
    * Visible and focusable, but refuses every edit. `disabled` is the stronger
    * state: it also leaves the tab order (plan `786`).
    */
   readonly readOnly?: boolean;
   ```

2. In `renderNumberField`:
   - `const inert = fieldInert(props);` (import it from `./Input.js` alongside
     `FieldState`),
   - the state objects for `props.style` and `fieldRecipeStyle` gain
     `readOnly: props.readOnly === true`,
   - `const inoperative = inert || blocked;` per stepper: the stepper paints
     the blocked look and its `onClick` refuses when `inert` (currently only
     `disabled`),
   - host: `readOnly={inert}` (was `readOnly={disabled}`),
   - `onChange`, `onKeyDown` (its own step branch) and `onBlurCommit` guard on
     `inert` instead of `disabled`; `props.onKeyDown` is still forwarded when
     inert,
   - `onSubmit`: `if (!inert) handlers.onCommit();` then `props.onSubmit?.(event)`
     and **not** `disabled`'s early return — a read-only field may submit,
     a disabled one still must not,
   - `autoFocus`/`tabIndex` stay gated on `disabled` only (`readOnly` keeps both).
3. In `NumberField` (the component): a read-only field must not commit a draft
   typed before the prop appeared.
   - `const inert = fieldInert(props);`
   - `const text = inert ? (showValue ? display(current) : "") : …existing…`
     (a read-only field paints its value, never a draft),
   - `commitDraft`: return early when `inert`,
   - a small `useEffect(() => { if (inert) setDraft(Option.none()); }, [inert]);`
     so a draft cannot reappear when read-only is switched off,
   - the tracked-loss commit helper (the one that calls `handlers.onBlurCommit`)
     must also see `inert`; find it with `rg -n "onBlurCommit" NumberField.tsx`
     and add the guard at the single call site it delegates to.

### 2.4 `packages/primitives/src/components/OTPField.tsx`

1. `OTPCellState` gains `readOnly: boolean`; `OTPFieldState` gains
   `readOnly: boolean` (place beside `disabled`, same JSDoc as §2.1).
2. `OTPFieldProps` gains the `readOnly?: boolean` prop from §2.3.
3. `renderOtpField`:
   - `const inert = props.disabled === true || props.readOnly === true;`
   - the resting tab stop for a read-only field is the **first cell**:
     `const rest = props.readOnly === true ? 0 : otpTabStop(state.current, limit);`
     (focused cell still wins). A read-only code has no editing cursor, so the
     natural entry is digit 1; a writable field keeps the plan-076 rule.
   - cells: `readOnly={inert}`, `autoFocus={!disabled && index === 0 ? props.autoFocus : undefined}`
     (unchanged — read-only may autofocus), `tabIndex` unchanged,
   - `onChange`, `onKeyUp` and `onClick` guard on `inert` (not `disabled`),
   - the group's and each cell's state objects gain
     `readOnly: props.readOnly === true`.
   - `onComplete`/`onValueChange` need no extra guard: no edit reaches `apply`.

### 2.5 `packages/primitives/src/components/Rating.tsx`

`RatingState` gains `readOnly: boolean`; the `resolvePartStyle` state object at
the group root passes `readOnly: props.readOnly === true`. (The star state
already carries it.)

### 2.6 Docs (`packages/primitives/docs/`)

- `input.mdx` and `textarea.mdx`: `FieldState` table gains
  `| \`readOnly\` | \`boolean\` | the field refuses edits but stays focusable |`
  and the sentence "a read-only field paints the normal surface (the recipe has
  no read-only bucket); a disabled field uses the disabled bucket".
- `number-field.mdx`: API row for `readOnly` (same wording as `Input`), a short
  "Read-only" subsection under the existing state text (focus, no edits, no
  steppers, `onSubmit` still forwarded), the `FieldState` field list updated, and
  the `disabled` limitation reworded so it no longer implies `disabled` is the
  only non-editing state.
- `otp-field.mdx`: API row for `readOnly`, a paragraph that a read-only code
  keeps **one** tab stop on cell 1, refuses typing/paste/Backspace, and does not
  fire `onValueChange`/`onComplete`; the state field lists updated.
- `rating.mdx`: the state field list gains `readOnly` on the group (the star
  already had it).
- Do not add a new page; the docs-coverage guard (`src/exports.test.ts`,
  `src/contract.test.ts`) must stay green.

### 2.7 Examples (`packages/primitives/examples/`)

- `number-field.example.tsx`: a third row after Resolution — a read-only
  "Sheet count" derived from `copies` (`testId="number-field-example-sheets"`),
  description "Computed from copies", no `onValueChange`.
- `otp.example.tsx`: after a successful verify, render the same six-cell code as
  a read-only `OTPField` (`testId="otp-example-verified"`, `label="Verified
  code"`) with a caption naming it; the editable field is replaced while
  `status === "verified"`. Keep the Reset button (it returns to the editable
  field).
- The examples registry already mounts both; `runtime/examples.runtime.test.tsx`
  must stay green (it asserts the registry, not the internals).

### 2.8 Inventories

- `COMPONENTS.md`: the **Text inputs**, **Text areas**, **Number Field**,
  **OTP Field** and **Rating** rows gain one sentence each for plan `786`
  (the state, the tab stop/focus rule, and — for OTP — the cell-1 stop).
- `packages/primitives/README.md`: the state-type paragraph's `FieldState`
  mention gains "`readOnly` beside `disabled`"; no counts change.
- `.agents/slop/plans/README.md`: add the `786` row to the primitives table.
- `TODO.md`: add the task under the primitives workstream before implementing,
  tick it after the gates.

## 3. Tests

### 3.1 Offline — `packages/primitives/src/components/read-only.test.tsx` (new)

Header comment states the bug: *the field family's read-only state existed on two
of five parts and reached no state payload*.

One case per assertion group, using the element-tree harness
(`./testing/element.js`) and `renderNumberField`/`renderOtpField`/`renderRating`
directly:

1. **`Input`**: `readOnly` reaches the host and a `style` callback sees
   `readOnly: true`; the same props without it see `false`; `tabIndex` stays
   defined (`not -1`).
2. **`TextArea`**: the same two assertions on the `<textarea>` host.
3. **`NumberField`**: host `${testId}-input` has `readOnly: true`; both steppers
   paint the blocked look; `tabIndex` is not `-1`; the callback sees
   `readOnly: true`.
4. **`OTPField`**: every cell has `readOnly: true`; exactly one cell has
   `tabIndex={0}` and it is **cell 1** (`otp-cell-1`) for a full read-only code;
   the group's and a cell's callbacks see `readOnly: true`.
5. **`Rating`**: the group callback sees `readOnly: true` while the stars still
   carry it (existing `RatingStarState`).
6. A read-only `NumberField` with a pending draft-shaped `defaultValue` paints
   its value (the draft suppression is a pure render fact): `text` comes from
   `formatValue`/`formatNumber`, not from a draft.

### 3.2 Runtime — `packages/primitives/runtime/readonly.runtime.test.tsx` (new)

Header: *the field family's read-only state is focusable and refuses every edit;
it was unmeasured and absent on two parts*. One window per case, one `Surface`.

1. **`Input` read-only**: `autoFocus` → `runtime.focused() === "field"`; type
   `x y z` → `onValueChange` never called. A second window without `readOnly`
   reports `keepx/keepxy/keepxyz` (the fail direction lives in the suite).
2. **`TextArea` read-only**: same two assertions.
3. **`NumberField` read-only**: focused `${testId}-input`; type `7`, `ArrowUp`
   (`keyDown`/`keyUp` on `${testId}-input`) and a hit-tested press on the up
   stepper (`clickAt` over its painted box, or `clickElement` on the painted
   node) report nothing.
4. **`OTPField` read-only**: focused cell 1; typing `9` and Backspace report
   nothing and the announced code is unchanged; exactly one cell is a tab stop
   (`focusNext` leaves the field on the next Tab — reuse the rule from
   `tab-order.runtime.test.tsx`).
5. **`Rating` read-only** (already covered by `rating.runtime.test.tsx`): assert
   the group's `readOnly` state reaches the paint only if the existing suite has
   no such case; otherwise skip — do not duplicate.

Use `awaitFrame` where the assertion is a paint (the focus ring or blocked
stepper), never a fixed sleep (plan 691/693). Read values from `onValueChange`
recorders and from `runtime.a11y()`, not from internal state.

### 3.3 Update existing exact-state assertions

`src/components/state-style.test.tsx` asserts exact state objects for
`OTPFieldState`, `OTPCellState` and `RatingState`; add `readOnly: false` to the
expected objects (and one `readOnly: true` case for the group). Run the whole
offline suite — no other exact payload should move.

### 3.4 The two-direction proof (must actually run)

1. New runtime file green.
2. **Old direction A** — remove `readOnly` from the `Input` host in
   `fieldHostProps`: the read-only `Input` case must fail with a reported value;
   restore.
3. **Old direction B** — remove the `inert` guard from `NumberField`'s host
   `onChange`: its case must fail; restore.
4. **Old direction C** — restore `readOnly={disabled}` in `renderOtpField` and
   the component guard: the read-only OTP case must fail; restore.
5. **Offline failure direction** — delete `readOnly` from `FieldState` and from
   the `resolvePartStyle` state: the new offline cases must fail by name;
   restore.
6. Record the observed failure text in §6 of this plan (file + assertion, not a
   paraphrase).

## 4. Commands (exact, in order)

```sh
# offline, whole package (the end-of-task gate for this change)
nub run --filter @gpuixui/primitives test

# the new offline file only while iterating
nub run --filter @gpuixui/primitives test src/components/read-only.test.tsx

# the changed element/state suites
nub run --filter @gpuixui/primitives test src/components/state-style.test.tsx
nub run --filter @gpuixui/primitives test src/components/fields.test.tsx

# the new runtime file only
nub run --filter @gpuixui/primitives test:runtime runtime/readonly.runtime.test.tsx

# the suites whose examples/states changed
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/state-style.runtime.test.tsx

# type gate
nub run --filter @gpuixui/primitives check-types
```

Expected: offline **≥ 73 files / ≥ 1010 tests**, all green; the scoped runtime
files green (the new file **5/5** or more); `check-types` clean. The full live
suite is the merge gate, not this plan (AGENTS §3).

## 5. STOP conditions

- `renderer.type`/`keyDown` cannot reach a read-only host at all (the probe in
  §0 already showed it can on this host) — stop and report with the dump.
- A read-only `OTPField` cannot keep one tab stop without changing the plan-076
  rule for writable fields — stop; do not weaken the writable rule.
- Any existing suite fails for a reason other than the new state fields — stop;
  it is a regression, not this plan. Report the file and case instead of
  updating the expectation.
- The examples suite fails because the read-only OTP replaces the editable field
  in the verified state — stop and choose a non-destructive composition; do not
  weaken `examples.runtime.test.tsx`.
- `FieldState`'s added field breaks a consumer outside `packages/primitives`
  (`nub run check-types` at the root) — record it in `TODO.md` as a cross-team
  task; do not edit the other package.

## 6. Verification record (fill in when the work lands)

| Direction | Command | Observed |
| --------- | ------- | -------- |
| new file green | `test:runtime runtime/readonly.runtime.test.tsx` | **7/7 passed** |
| old A (host `readOnly` + `Input` guard removed) | same | **2 failed**: `expected [ 'keepx', 'keepxy', 'keepxyz' ] to strictly equal []` for `Input` and `TextArea` |
| old B (`NumberField` host `readOnly` + guard removed) | same | **1 failed**: `expected [ 57 ] to strictly equal []` |
| old C (OTP `readOnly={disabled}` + `disabled` guard) | same | **1 failed**: `expected [ '923' ] to strictly equal []` |
| offline state removed (`fieldChrome`) | `test src/components/read-only.test.tsx` | **2 failed**: the payloads were missing `"readOnly": true` / `"readOnly": false` |
| final offline | `test` | **73 files / 1011 tests passed** |
| final scoped runtime | `runtime/{readonly,examples,state-style,rating}.runtime.test.tsx` | **4 files / 52 tests passed** |
| gates | `check-types` (root), `lint`, `check:tests` | clean; `nub run check` stops only on `apps/docs/src/components/docs/demos.tsx`, the docs-site formatting task already in `TODO.md` (path outside this workstream) |

The measured read-only contract: a focused `Input`/`TextArea` reports no edit for
`x y z`; a read-only `NumberField` reports nothing for typed text, `ArrowUp`,
`PageUp` or a hit-tested press on its up stepper, while the writable twin reports
`[57, 58, 59]` for the same three gestures; a read-only three-cell `OTPField`
reports nothing for `9` and Backspace and leaves on the next Tab from cell 1,
while the writable twin reports `["9"]`.

## 7. Acceptance

- `Input`, `TextArea`, `NumberField`, `OTPField` and `Rating` all expose the
  read-only state; the two new props are documented in their API tables.
- A read-only field is focusable, announced, ring-painted and refuses every edit
  path at the component as well as the host.
- `FieldState`, `OTPFieldState`, `OTPCellState` and `RatingState` report
  `readOnly`; one offline + one runtime case fails by name without each change.
- Both examples mount the new state; `examples.runtime.test.tsx` is green.
- `COMPONENTS.md`, the package README, the plan index and `TODO.md` are current.
- `nub run --filter @gpuixui/primitives test`, `check-types` and the scoped
  runtime files are green, and the exact commands are recorded in §6.
