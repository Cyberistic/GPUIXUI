# 091 — An invalid field must not repaint its surface

| Field | Value |
| ----- | ----- |
| Phase | F (hardening) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `047`, `079`, `083`, `090` |
| Status | **done** — core fix, offline + element-tree + runtime cases, both directions measured (§7) |

Self-contained: §1 the gap and the measured evidence, §2 the rule, §3 the exact
files, §4 the commands and expected results, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 1. The gap

Every field in the package paints through one function, `controlStyle`
(`packages/primitives/src/core/style.ts`). Its `ControlSpec.invalid` doc says:

> Validation failed: the **border and ring** switch to the destructive role.

The implementation does three things instead:

```ts
const rest =
  spec.invalid === true
    ? theme.colors.destructive           // ← fills the whole field red
    : paint(variant.background, theme);
const border =
  spec.invalid === true
    ? theme.colors.destructive
    : paint(variant.border, theme);
```

`rest` is assigned to `backgroundColor`. So an invalid field does not get a
destructive border on its own surface; it gets a **solid destructive fill**,
with the normal `inputForeground` text on top (light theme:
`neutral[900]` on `red[600]`). That contradicts the `invalid` docs on
`Input`/`TextArea`/`Select`/`NumberField` ("the border takes the destructive
role") and the `Label`/`FieldState` contract.

### Blast radius (all read `controlStyle`)

| Surface | Path |
| ------- | ---- |
| `Input`, `TextArea` | `src/components/Input.tsx` `fieldChrome` → `controlStyle` |
| `Select` trigger | `src/components/Select.tsx` `selectTriggerStyle` → `controlStyle` |
| `NumberField` chrome | `src/components/NumberField.tsx` render → `controlStyle` |
| `OTPField` cells | `src/core/style.ts` `otpCellStyle` → `controlStyle` |

### Why no test caught it

The only invalid-paint assertions check `borderColor` and never
`backgroundColor`:

- `src/core/style.test.ts` — "switches the border and the ring to the
  destructive role when invalid" asserts `borderColor` only.
- `runtime/otp.runtime.test.tsx` — "paints the destructive border on every
  cell when invalid" asserts `borderColor` only.
- `runtime/fields.runtime.test.tsx` has **no** invalid case at all.

`fields.test.tsx` and the runtime suites never mount an invalid `Input`,
`TextArea`, `Select` or `NumberField`, so the fill is unobserved.

### The second half of the same defect

`hover`/`active` come from the variant (`fieldVariant` changes `borderColor` to
`borderStrong`/`ring`). So even after the fill is fixed, an invalid field loses
its destructive border the moment the pointer is over it. The error colour must
survive hover and press.

## 2. The rule

**`invalid` recolours the boundary and the focus ring; it never paints a
surface.** Concretely, in `controlStyle`:

1. `backgroundColor` is always `paint(variant.background, theme)` — invalid is
   not a fill.
2. `borderColor` is `theme.colors.destructive` while invalid (unchanged from
   today's behaviour for fields).
3. A variant's `hover`/`active` styles are kept, with their `borderColor`
   replaced by the destructive role **only when the variant has a border** (so
   an outline/field keeps the error on hover, while a filled, borderless button
   is unaffected). Background feedback from the variant survives.
4. The disabled branch keeps its "no pointer feedback" rule; the destructive
   border is already at rest and is not reset.
5. `controlFocusStyle` is unchanged — it already recolours the ring only.

This is a core fix: every field shares it, and no component gains a prop.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `controlStyle`: remove the invalid fill; merge the destructive border over `hover`/`active` when the variant has a border |
| `packages/primitives/src/core/style.test.ts` | add the invalid-surface and invalid-hover/press cases (fail before the fix) |
| `packages/primitives/src/components/fields.test.tsx` | element-tree case: an invalid `Input` keeps `colors.input` and has a destructive border |
| `packages/primitives/runtime/fields.runtime.test.tsx` | mount a valid and an invalid `Input` (and `TextArea`); assert the painted fill and border of each |
| `packages/primitives/runtime/otp.runtime.test.tsx` | extend the existing invalid-cells case with the cell's `backgroundColor` |
| `COMPONENTS.md` | record the fix in the Text inputs / Text areas / Selects / Number Field / OTP Field notes (one clause each, or one shared note) |
| `TODO.md` | add and tick the task under the primitives ledger |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/091-invalid-field-fill.md` | §7 results after the run |

No docs page needs a wording change: they already say "border". Do **not** edit
`packages/tokens`, `packages/components` or `apps/*`.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/style.test.ts` | the new cases **fail** on the unfixed code (§5.1) and pass after the fix |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 38 files / 428 tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 20 files / 263 tests, ~336 s on this host); the new cases fail before the fix |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test below must be able to fail. Write them first, run them against the
unfixed code, and record the failure output in §7.

### 5.1 The core rule (`src/core/style.test.ts`)

1. **"keeps a field's surface when invalid and moves only its border"**
   - `controlStyle({ variant: fieldVariant, size: "md", invalid: true }, testTheme)`
   - expect `backgroundColor === testTheme.colors.input`
   - expect `borderColor === testTheme.colors.destructive`
   - **fails today** on `backgroundColor` (`destructive`).
2. **"keeps the invalid border through hover and press"**
   - same spec; expect `hover.borderColor` and `active.borderColor` to be
     `destructive`
   - **fails today** (`borderStrong` / `ring`).
3. **"leaves a filled, borderless variant with no border under invalid"**
   - `controlStyle({ variant: buttonVariants.primary, size: "md", invalid: true }, testTheme)`
   - expect `backgroundColor === primary` (not destructive) and
     `borderWidth === 0`; hover/active keep the primary fill feedback.
   - documents the rule rather than only the field case.
4. **Regression guard for the healthy path** — a valid field still paints
   `input` / `border`, and its hover still paints `borderStrong`. (Already
   implied by existing tests; add one assertion so a future "always
   destructive" mistake fails.)

### 5.2 The component tree (`src/components/fields.test.tsx`)

5. **"an invalid input keeps the field surface"** — `renderInput` with
   `invalid: true`, decode the host `style`, expect `backgroundColor === input`
   and `borderColor === destructive`. This catches a component that bypasses
   `controlStyle` or re-merges the wrong style.

### 5.3 The runtime (`runtime/fields.runtime.test.tsx`)

6. **"paints an invalid field's border, not its surface"** — mount two fields
   (`Input testId="valid"`, `Input testId="invalid" invalid`) inside a `Surface`;
   `runtime.element(...)` and read `style`:
   - valid: `backgroundColor === testTheme.colors.input`,
     `borderColor === testTheme.colors.border`
   - invalid: `backgroundColor === testTheme.colors.input`,
     `borderColor === testTheme.colors.destructive`
   - **fails today** on the invalid `backgroundColor`.
7. **`TextArea` shares the chrome** — the same two assertions for a `TextArea`
   (or fold both into one data-driven case). This is the honest proof that the
   fix reaches the second host element.

### 5.4 The OTP surface (`runtime/otp.runtime.test.tsx`)

8. Extend the existing invalid-cells test: every cell's
   `style["backgroundColor"]` is `testTheme.colors.input`. The border assertion
   stays.

### 5.5 Two-direction proof (required before "done")

- With the fix removed (revert only the `controlStyle` hunk), tests 1, 2, 3, 5,
  6, 7 and 8 fail; record the exact failing assertions in §7.
- With the fix in place, every suite is green.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. A test shows invalid fields are **intended** to be filled — e.g. a tokens
   test or a docs page asserts the destructive fill deliberately. Record the
   conflict and ask before changing the design.
3. Changing `controlStyle` breaks a component that passes `invalid` for a
   *filled* variant on purpose (none should; if one exists, record it and scope
   the fix to fields instead).
4. Any gate (`check`, `lint`, `test`) fails for a reason unrelated to this
   change. Report the failure with the command output instead of masking it.

## 7. Outcome

### Measured before (the old direction)

`controlStyle` assigned `theme.colors.destructive` to `backgroundColor` whenever
`invalid` was true. Reproduced offline:

```text
FAIL src/core/style.test.ts > controlStyle > keeps a field's surface when invalid and moves only its border
AssertionError: expected '#00000F' to be '#000015'   # destructive → input
FAIL src/core/style.test.ts > controlStyle > keeps the invalid border through hover and press
AssertionError: expected '#000014' to be '#00000F'   # borderStrong → destructive
FAIL src/core/style.test.ts > controlStyle > does not add a border to a filled variant when invalid
AssertionError: expected '#00000F' to be '#000007'   # destructive → primary
FAIL src/components/fields.test.tsx > Input > keeps an invalid field's surface and moves only its border
```

and in the real runtime, with only the `controlStyle` fix reverted:

```text
× paints an invalid field's border, not its surface
   AssertionError: expected '#00000F' to be '#000015'
× paints the destructive border on every cell when invalid
   AssertionError: expected '#00000F' to be '#000015'
Tests  2 failed | 51 passed (53)
```

The fourth new core case (a valid field keeps `input` / `border` /
`borderStrong`) passed before and after, as intended: it is the guard against
over-correcting.

### After

- `controlStyle` paints the variant's own fill; `invalid` changes only
  `borderColor` and the focus ring. Hover/press keep the destructive border on
  variants that have one; a filled, borderless variant is untouched.
- Offline: **38 files / 433 tests passed** (428 before; +5).
- Runtime: **20 files / 264 tests passed** (263 before; +1, and the OTP case now
  asserts the fill as well).
- `nub run check` passes (`check:tests`, lint, format, types) with the package
  and every workspace consumer type-checking.

## 8. Acceptance

- [x] `controlStyle` no longer turns an invalid field's fill destructive.
- [x] The invalid border survives hover and press.
- [x] Offline and runtime tests cover `Input`, `TextArea` and `OTPField`;
      the core rule covers a borderless variant.
- [x] The new tests fail with the fix removed and pass with it.
- [x] `COMPONENTS.md` records the fix; `TODO.md` ticks it; this plan is indexed.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
