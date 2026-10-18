# 351 — The validation matrix: every control that accepts `invalid` paints it

**Phase:** F (cross-control invariant) · **Owner:** primitives · **Depends on:**
`025`, `030`, `041`, `047`, `053`, `054`, `061`, `065`, `070`, `079`, `089`,
`091`, `093` · **Status:** planned

## 1. The gap

The package has cross-control guards for focus rings (`084`), tab order (`089`),
accessible names (`093`), disabled-after-focus (`332`), style order (`097`) and
slot triggers (`345`) — every class that produced more than one defect. The
**invalid** state is the one class with two shipped defects and no matrix:

- plan `061`: `RadioGroup` accepted no `invalid` at all, while every other
  selectable control painted one;
- plan `070`: `Rating` accepted `invalid` and painted nothing — its colour
  resolver had no branch.

Both were found by hand, one component at a time. Nothing proves today that the
**whole** set paints the state, so the next control that grows a validation prop
(pointer: `ToggleGroup`) can repeat it.

Measured during planning (this host, runtime suite): all thirteen controls that
accept `invalid` already paint `theme.colors.destructive` when invalid and do
**not** when valid. This plan ships the guard, not a fix.

The set, from `src/components/*.tsx`:

| Control | Where the state lands |
| ------- | --------------------- |
| `Checkbox` | the box's boundary |
| `CheckboxGroup` | the group box and each row's box |
| `Input` | the field boundary |
| `Label` | the label's text colour |
| `NumberField` | the field boundary |
| `OTPField` | every cell's boundary |
| `RadioGroup` | each empty option's circle |
| `Rating` | empty stars' tint |
| `Select` | the trigger's boundary |
| `Slider` | the rail / thumb |
| `RangeSlider` | both thumbs |
| `Switch` | the track boundary |
| `TextArea` | the field boundary |

## 2. The guard

A new runtime suite, `runtime/invalid.runtime.test.tsx`, with one case per
control in the table:

1. mount the control with `invalid` in a fresh window, inside
   `ThemeProvider` with the shipped fixture theme;
2. assert `theme.colors.destructive` is among the colours the tree applied
   (`paintedColours`, the shared helper from `runtime/theme.ts`);
3. mount the same control **without** `invalid` in a second window and assert
   the destructive colour is absent.

The generic colour scan is deliberate: the table's "where it lands" differs per
control (a border, a tint, a text colour), and the defect class is "paints
nothing", which a whole-tree scan catches without encoding thirteen element
shapes that their own suites already assert. A control that paints the state
must also stop painting it when valid — that is the second half, and it fails if
someone hard-codes the error colour.

A failing case names the control and which half failed.

## 3. Files to change

1. **`packages/primitives/runtime/invalid.runtime.test.tsx`** — the new suite
   (§2), one `it.each` table of 13 controls.
2. **`.agents/slop/plans/README.md`**, **`TODO.md`** — the task record.

No component, core, docs-page or example change: the behaviour is already
correct; the measurement is §1.

## 4. Test plan

| Mutation (apply, run, revert) | Must fail |
| --- | --- |
| stop forwarding `invalid` in `Rating` (`ratingStarColor` given `false`) | `Rating`'s invalid half |
| stop forwarding `invalid` in the `Input` field chrome | `Input`'s invalid half |
| hard-code `destructive` in `Switch`'s track border | `Switch`'s valid half |
| add a control to the table that accepts no `invalid` prop | the table's own type check / the case's valid half |

The first three are the two historical defects and the reverse direction; the
last is not run as a mutation (it is a type error to pass `invalid` to a part
that does not declare it) and is recorded as covered by the compiler.

### Commands

```sh
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Measured baseline (2026-10-18, this host): runtime **23 files / 409 tests**.
Expected after: **24 files / 422 tests** (13 cases).

## 5. STOP conditions

Stop and report rather than improvise if:

- a control's invalid paint is a colour the fixture theme's `destructive` role
  does not produce (e.g. an alpha-lifted value) — the shared `rgbOf` already
  strips alpha, so a miss means the control genuinely paints something else;
  record it and decide with the owner whether that is a defect, do not weaken
  the assertion to "changed colour";
- opening two windows per case pushes the suite past ~2 minutes locally; then
  share one window per case and re-render between the two states (plan `041`'s
  one-window-per-test rule exists for stateful fields; an invalid/valid pair is
  stateless, but measure before deviating);
- a control that accepts `invalid` cannot be mounted without additional required
  props — add only the minimum data those props need, not a new fixture.

## 6. Acceptance

- Thirteen cases prove the invalid paint in both directions.
- The suite fails in the three mutation directions named in §4.
- `nub run check`, `nub run lint`, the offline suite and the runtime suite are
  green.
- `TODO.md` and the plan index record the guard and its counts.

## 7. Result

Landed on `agent/primitives`, 2026-10-18.

### 7.1 What changed

`runtime/invalid.runtime.test.tsx` adds the validation matrix: 13 cases, one per
control that declares an `invalid` prop, each mounting the control **with** and
**without** the prop in fresh windows and asserting the theme's destructive role
appears in exactly the first. No component changed — the planning measurement in
§1 showed all thirteen already paint the state.

### 7.2 Both-direction proofs (each mutation applied, run, reverted)

| Mutation | Failing cases |
| --- | --- |
| `Rating` paints its stars as valid | `Rating paints the destructive role only when invalid`, plus the two existing rating-invalid cases |
| the field chrome ignores `invalid` | `Input …`, `TextArea …`, plus the existing invalid-field border case |
| `Switch`'s `SelectionSpec` always sets `invalid` | `Switch paints the destructive role only when invalid` |

The first mutation also moved the component's own suite, which confirms the
matrix and the per-component assertions describe the same defect from two
directions.

### 7.3 Suites

| Run | Result |
| --- | --- |
| `nub run --filter @gpuixui/primitives test:runtime` | **24 files / 422 tests green** (was 23 / 409; +13) |
| `nub run check` / `nub run lint` / `nub run test` | green |

### 7.4 Deviations

- `RangeSlider` was added to the planned twelve: it declares the prop and shares
  `Slider`'s core, so leaving it out would have made the "every control" claim
  false. The count is 13, not 12.
- The planned fourth mutation ("add a control that accepts no `invalid`") is a
  type error rather than a failing runtime case; the compiler is the guard there,
  and it is recorded instead of faked.
- Two windows per case (26 in total) kept the suite at ~90 s locally, inside the
  plan's STOP threshold; no window sharing was needed.
