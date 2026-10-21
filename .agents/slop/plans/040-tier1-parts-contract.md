# 040 — Tier 1 adopts the compound-part contract

**Phase:** C. **Owner:** primitives workstream (`packages/primitives`, `packages/icons`).
**Depends on:** plan `200` (contract accepted, `docs/component-api.md`), plan `030`
(the package), plan `201` (state model), ADR `0004`, ADR `0005`.
**Blocks:** the `TODO.md` row "`packages/primitives` adopts the same contract for
Tier 1"; components' `internal/button.tsx` stand-in can only be retired once
`Button` is exported from this package.
**Status:** in progress. Step 1 landed (commit `26f96a5c`); Step 2 landed for all
four fields (`Input` + `TextArea` in `dd6d1d51`, `NumberField` + `OTPField`
after the binding landed); Step 3 landed (Checkbox/Switch parts). The `darwin-x64` binding for 0.11.0 landed
on this host on 2026-10-21, so the unit suites (355) and the runtime suites (121)
both run here again — runtime verification is no longer pending.

---

## 0. Where we are (verified 2026-10-21)

`packages/primitives` exports 27 Tier 1 rows as **single components**: one export
per row, one props interface, no compound parts. Every one is built, documented
(`docs/*.mdx`), exemplified (`examples/*.example.tsx`) and was runtime-verified in
the 0.10.0 `TestRenderer` (plan `041` §9). `src/inventory.ts` +
`src/inventory.test.ts` now hold `COMPONENTS.md`'s Tier 1 table to the code.

Two deviations from `docs/component-api.md` remain, and only these two:

1. **§1 compound parts** — `docs/component-api.md` §8 names parts per row
   (`ProgressRoot`/`Track`/`Indicator`/…), but the package exports one component
   per row.
2. **§3 state-aware styling** — every part takes `style?: StyleDesc`. None takes
   `StateStyle<PartState>`, so a consumer cannot style by state (plan `305` did
   this for `packages/components`; primitives never did).
3. **§2 callback names** — change callbacks are `onChange` (`Checkbox`,
   `Switch`, `RadioGroup`, `Slider`, `RangeSlider`, `Select`, `Toggle`, `Input`,
   `TextArea`, `NumberField`, `OTPField`), not `onValueChange` /
   `onCheckedChange`.

`nub run --filter @gpuixui/primitives test` currently has two independent
problems that a new executor must know about before starting:

- **B1, live:** `@gpuix/native@0.11.0` has no `darwin-x64` binding, so five unit
  files that import `useGpuix` from `@gpuix/react` fail to *load*
  (`NumberField`, `OTPField`, `Rating`, `Slider`, `selection` suites). 288 tests
  in the other 23 files pass. `nub run --filter @gpuixui/primitives test:runtime`
  cannot run at all. The playground workstream owns the fix
  (`apps/playground/scripts/build-native-binding.sh`).
- **Tokens interlock:** `packages/tokens` is landing an `avatarSize` group on
  `Theme`; `src/core/testing/theme.fixture.ts` must gain it (recorded in
  `TODO.md`). If `check-types` fails on that field, the tokens change landed
  first — add the fixture group, do not touch `packages/tokens`.

## 1. What changes, ruled per row

The rule from §1 of the contract: *a component with one styled region exports one
part; it does not grow a `Root` only to satisfy the table.* So the §8 column is a
target, not a mandate. Rulings:

| Row | Now | Target | Why |
| --- | --- | --- | --- |
| Text / typography | `Text` | unchanged | one region |
| Icons | `Icon` | unchanged | one region |
| Separators | `Separator` | unchanged | one region |
| Spacers | `Spacer` | unchanged | one region |
| Stack / layout | `Stack`, `Grid` | unchanged | one region each |
| Boxes / containers | `Box` | unchanged | one region |
| Scrollable containers | `ScrollArea` | `ScrollArea` + `ScrollAreaViewport` | the padding must not scroll: root = frame, viewport = the clipped region. `Scrollbar`/`Thumb`/`Corner` **cannot exist** — GPUix paints the scrollbar and exposes no API for it; document that, do not fake them |
| Buttons | `Button` | `Button` + `StateStyle<ButtonState>` | one region, but it has state (`disabled`, `focused`) |
| Button groups | `ButtonGroup` | unchanged | one region |
| Labels | `Label` | unchanged | one region |
| Text inputs | `Input` | `Input` + `StateStyle<FieldState>` | one region; state is `disabled`/`focused`/`invalid` |
| Text areas | `TextArea` | same as `Input` | same |
| Checkboxes | `Checkbox` | `Checkbox` + `CheckboxIndicator` | the mark is a second styled region, and exposing it removes the "no custom mark" limitation |
| Radio groups | `RadioGroup` | `RadioGroup` + `RadioGroupItem` (rich option content) | the data `options` prop cannot host rich content; keep `options` as sugar over the same items |
| Selects | `Select` | unchanged | GPUix owns the parts; this package only themes them |
| Switches | `Switch` | `Switch` + `SwitchThumb` | the knob is a second styled region; exposing it unblocks a custom knob |
| Progress | `Progress` | `Progress` + `ProgressTrack` + `ProgressIndicator` + `ProgressLabel` + `ProgressValue` | removes the "no in-track label / no value display" limitation |
| Tooltips | `Tooltip` | unchanged | GPUix owns the parts |
| Skeletons | `Skeleton` | unchanged | one region |
| Loading indicators | `Spinner` | unchanged | one region |
| Slider | `Slider` | `Slider` + `SliderTrack` + `SliderIndicator` + `SliderThumb` | a consumer may want a custom thumb or markers |
| Range slider | `RangeSlider` | same parts, two thumbs | same |
| Meter | `Meter` | same shape as `Progress` | same reason |
| Number Field | `NumberField` | `NumberField` + `NumberFieldInput` + `NumberFieldIncrement` + `NumberFieldDecrement` | the steppers are separate hit targets; a consumer may want one |
| OTP Field | `OTPField` | `OTPField` + `OTPFieldInput` | the cell is a second region (one `<input>` per cell) |
| Toggle | `Toggle` | `Toggle` + `StateStyle<ToggleState>` | one region with state |
| Rating | `Rating` | `Rating` + `RatingStar` + `StateStyle<RatingState>` | the star is a repeated region; a custom glyph is the point |

A row kept single-part needs no note in its docs page: the absence of extra parts
is not a limitation. Only the impossible `Scrollbar`/`Thumb`/`Corner` parts are
documented as a gap, because the contract's §8 table names them.

## 2. Decisions settled here (do not re-litigate)

1. **Callback names.** Value controls take `value`/`defaultValue`/
   `onValueChange`. Boolean controls take `checked`/`defaultChecked`/
   `onCheckedChange` — this is base-gpui's `on_checked_change`, verified in
   `~/GPUIXUI/references/base-gpui/src/checkbox/layers/checkbox_root.rs`. Keep
   the old `onChange` as a deprecated alias for exactly one release of the
   package (private: until every in-repo caller migrates), then delete it.
   `docs/component-api.md` §2's sentence "`onValueChange` … is the only change
   callback name" is wrong for boolean parts; that file belongs to the components
   workstream — record it in `TODO.md`, do not edit it here.
2. **Sugar stays, behaviour does not double.** `RadioGroup`'s `options` prop and
   `Progress`/`Meter`'s `value`/`tone`/`size` props are implemented *by* the
   parts (the root renders the parts it owns), never as a parallel path. One
   render function, one keyboard path.
3. **`StateStyle` source.** `import type { StateStyle } from "@gpuix/react/floating"`
   and resolve with `resolveStyle` from the same subpath (verified present in
   `packages/primitives/node_modules/@gpuix/react/dist/components/floating.d.ts`).
   Primitives' `core/` must not import `@gpuix/react` at runtime; the type import
   is erased, and `resolveStyle` is only called from `components/`.
4. **State vocabulary** is only `active`, `checked`, `closed`, `disabled`,
   `focused`, `highlighted`, `invalid`, `open`, `orientation`, `selected`
   (contract §3). `loading` is not in it: a busy `Button` reports `disabled` (it
   already refuses activation) and the docs say so.
5. **One file per component until it exceeds ~250 LOC**, then a folder
   (`src/components/progress/index.tsx` + parts). Do not pre-split.
6. **Accessibility is unchanged.** A new part inherits its parent's role and
   name; it never invents `aria-checked`, `aria-valuenow`, `aria-labelledby`,
   `aria-describedby`, `aria-controls` or `aria-modal`.

## 3. Ordered steps

Each step is a complete unit: code, a test that can fail, the docs page, the
example, the `COMPONENTS.md` row and the `inventory.ts` record all move together,
then one commit, then push.

### Step 0 — probe `StateStyle` and the suite baseline

```sh
cd packages/primitives
node -e 'import("@gpuix/react/floating").then(m => console.log(Object.keys(m)))'
```
Expected: `resolveStyle` and `mergeStyles` in the list, **no** native-binding
error (the subpath loads without the binding; plan `030` §2 verified `/floating`).
If it throws, STOP — the whole `StateStyle` half is blocked.

```sh
nub run --filter @gpuixui/primitives test
```
Expected today: `5 failed | 23 passed`, 288 tests passing. Record the number in
the commit body of every later step; it must never go down.

### Step 1 — `Button` and `Toggle` take `StateStyle` — **landed**

> Landed as `26f96a5c`. `ButtonState { disabled, focused }`,
> `ToggleState { disabled, focused, selected }`; both resolve with
> `resolveStyle` after every role decision. Three new tests; proven to fail by
> dropping the merge. Suite 291 passing.

- Files: `src/components/Button.tsx`, `src/components/Toggle.tsx`,
  `src/components/Button.test.tsx`, `src/components/Toggle.test.tsx`,
  `docs/button.mdx`, `docs/toggle.mdx`.
- Export `ButtonState { disabled: boolean; focused: boolean }` and
  `ToggleState { disabled: boolean; focused: boolean; selected: boolean }`.
- `style?: StateStyle<ButtonState>`; resolve with
  `resolveStyle(props.style, state)` **after** the component's own rules, so a
  callback wins exactly where an object style did (`mergeStyle` order unchanged).
- Test that can fail: a function style receives the live state (`focused` true
  while the focus flag is set, `disabled` true while disabled) and its result is
  the *last* word on a property the recipe also sets.

### Step 2 — field parts take `StateStyle<FieldState>` — **landed**

> `Input` + `TextArea` landed as `dd6d1d51`: `FieldState { disabled, focused,
> invalid }` is exported from `Input.tsx` beside `FieldProps` (not a separate
> `field-state.ts` — one place, no extra module), the shared `fieldChrome`
> resolves it, and `TextArea` now reuses `fieldHostProps`' style instead of
> compiling the recipe twice. `NumberField` (chrome) and `OTPField` (the group;
> `focused` means any cell holds the caret) followed once the binding landed,
> importing `FieldState` from `Input.js`; each has a test that a style callback
> receives the live state and its result is merged last.

- Files: `Input.tsx`, `TextArea.tsx`, `NumberField.tsx`, `OTPField.tsx`,
  `fields.test.tsx`, `NumberField.test.tsx`, `OTPField.test.tsx`, their docs.
- `FieldState { disabled; focused; invalid }` exported once from
  `src/components/field-state.ts`; all four use it.
- Test: the same three-state matrix on each of the four, plus a style function
  that returns `{}` leaving the recipe untouched.

### Step 3 — `CheckboxIndicator` and `SwitchThumb` — **landed**

> Landed 2026-10-21. `Checkbox`/`Switch` take `onCheckedChange` (with `onChange`
> as the deprecated alias, resolved through `internal.checkedChange` so the new
> name wins when both are passed) and `children` as the mark/knob content. The
> mark and the knob are parts behind a small context, each with one pure
> `renderX` entry point so the tree is testable without the native binding.
> Native proof: a custom mark/glyph still toggles through a real hit test
> (`controls.runtime.test.tsx`, proven to fail by dropping the pointer guard).
> The old `selection.test.tsx` split into `Checkbox.test.tsx`,
> `Switch.test.tsx` and `RadioGroup.test.tsx`. Unit suite 292 → 355 (the B1
> binding also landed, so the five blocked files run again); runtime 119 → 121.

- Files: `Checkbox.tsx`, `Switch.tsx`, the three suites, `internal.ts`, docs
  pages, `examples/selection.example.tsx`, `src/inventory.ts`, `COMPONENTS.md`.
- `Checkbox` renders `<CheckboxIndicator>`; the caller may pass their own
  children to it (a custom mark) — when they do, the default icon is not drawn.
- `Switch` renders `<SwitchThumb>`; the caller may pass children (a glyph).
- Rename the callback to `onCheckedChange` with `onChange` as a deprecated alias.
- Tests: a custom indicator/thumb is painted and the default is not; a disabled
  switch's thumb cannot swallow a click (the `pointerEvents: "none"` rule measured
  in plan `041` §9 must survive when the caller passes children).

### Step 4 — `RadioGroupItem`

- Files: `RadioGroup.tsx`, `selection.test.tsx`, docs, `examples/selection.example.tsx`.
- `RadioGroup` keeps `options` (sugar) and gains children
  `<RadioGroupItem value="…">` with rich content; the roving tab stop, arrow
  wrap, Home/End and disabled skipping are the **same** code path.
- `onChange` → `onValueChange` (+ alias).
- Tests: a rich item renders its children; arrows traverse data options and
  element items identically; a disabled item is skipped; the announced value is
  the item's `value`.

### Step 5 — Slider and RangeSlider parts

- Files: `Slider.tsx`, `Slider.test.tsx`, `core/value.ts` (unchanged logic),
  docs, `examples/value.example.tsx`.
- `SliderTrack` / `SliderIndicator` / `SliderThumb`; the existing measured
  geometry (half-thumb negative margins, `sliderInset`) must not change — the
  runtime tests in `runtime/value.runtime.test.tsx` are the proof, once B1 clears.
- Rename to `onValueChange` (+ alias).
- Test: the thumb's centre lands on the filled fraction at 0 %, 50 %, 100 %
  (assert the computed margins/width, the same numbers the runtime measures).

### Step 6 — `Progress` and `Meter` parts

- Files: `Progress.tsx`, `Meter.tsx`, their unit tests, docs, `examples/form.example.tsx`,
  `examples/value.example.tsx`.
- Root renders track + indicator; `ProgressLabel`/`ProgressValue` render the
  label and the percentage (`42%`, `loading` when indeterminate). `Meter` mirrors
  it with its range text.
- Test: the fill width equals the clamped percentage (incl. `NaN` → 0, `-5` → 0,
  `250` → 100); a value part reads the same clamp; an indeterminate progress has
  no value part.

### Step 7 — `ScrollArea` root and viewport

- Files: `ScrollArea.tsx`, `presentational.test.tsx`, docs, `examples/layout.example.tsx`.
- Root = frame (border/padding/radius from the recipe); `ScrollAreaViewport` =
  the overflow axes + `onScroll`. A bare `<ScrollArea>children</ScrollArea>`
  keeps working by rendering one implicit viewport.
- Docs must state: no `Scrollbar`/`Thumb`/`Corner` parts, because the platform
  paints the scrollbar and 0.11.0 exposes no `scrollbarColor`/`scrollbarWidth`.
- Test: padding on the root does not appear on the viewport; the implicit
  viewport keeps the old element's overflow axes and `onScroll`.

### Step 8 — `NumberField` and `OTPField` parts

- Files: `NumberField.tsx`, `OTPField.tsx`, unit tests, docs, examples.
- `NumberFieldInput`, `NumberFieldIncrement`, `NumberFieldDecrement`;
  `OTPFieldInput` (one cell).
- Test: decrement on the minimum is a no-op; the increment/decrement parts remain
  out of the tab order (the input's arrows are the keyboard path).

### Step 9 — records and ledger

- `src/inventory.ts`: add the new part names to each record's `source` when a
  component grows a file; no new rows (the table is per component, not per part).
- `COMPONENTS.md` Tier 1 notes: name the parts each row exports.
- `docs/README.md`: no new page per part — a part is documented on its parent's
  page, under "API".

## 4. Commands and expected results

```sh
# from the repo root
nub run --filter @gpuixui/primitives test         # exit 0 on a host with a binding;
                                                 # on this host: 5 load failures, B1
nub run --filter @gpuixui/primitives check-types  # exit 0 (after the avatarSize fixture fix)
nub run --filter @gpuixui/primitives test:runtime # exit 0 — only once B1 is fixed
nub run check:tests                               # no failure attributed to packages/primitives
nub run lint && nub run fmt                       # exit 0
nub run check                                     # exit 0
```

Paste the exact output of the suite you ran into the commit body. A command that
was not run did not pass.

## 5. STOP conditions

Stop and report rather than improvise when:

- **B1 is still open.** You may land steps whose proof is the unit suite, but you
  must not write "runtime-verified" in a docs page or a `COMPONENTS.md` row, and
  you must not close the `TODO.md` row. Mark the step's commit body
  "runtime verification pending B1".
- `@gpuix/react/floating` stops exporting `StateStyle`/`resolveStyle` in the
  installed version (re-probe with step 0).
- A part split would duplicate behaviour (two render paths, two keyboard
  handlers). Stop; prefer sugar over a second path.
- A part needs an ARIA attribute outside the §5 subset, or a scrollbar/rotation/
  transform capability the runtime lacks. Document the gap instead.
- `check-types` fails on a `packages/tokens` field: that is the tokens
  interlock, not this plan — add the fixture value or wait, do not edit tokens.

## 6. Test plan

Every step lands at least one test that fails without it. Minimum per step:

| Suite | Must catch |
| ----- | ---------- |
| `Button.test.tsx` / `Toggle.test.tsx` | a `StateStyle` function called with a stale state, or its result merged before the recipe (so the recipe wins) |
| `fields.test.tsx` + `NumberField.test.tsx` + `OTPField.test.tsx` | one of the four fields not receiving `FieldState`, or `invalid`/`disabled` omitted from it |
| `selection.test.tsx` | a custom indicator/thumb not painted, the default still painted, or the `pointerEvents` guard lost |
| `selection.test.tsx` (radio) | a rich `RadioGroupItem` not reachable by arrows, or the data path and item path diverging |
| `Slider.test.tsx` | a thumb off its fraction, or the range slider's thumbs crossing |
| `Progress.test.tsx` / `Meter.test.tsx` | a label/value part disagreeing with the clamped fill |
| `presentational.test.tsx` (scroll) | root padding on the viewport, or the implicit viewport losing `onScroll` |
| `inventory.test.ts` | a docs page/example/source path that no longer exists after a file moves |

Prove each the hard way: revert the source hunk, watch the new test fail, restore,
watch it pass. `scripts/verify-two-directions.sh` uses `jj`, which is not
installed (TODO interlock D1) — do the revert/restore by hand and say so in the
commit body.

## 7. Acceptance criteria

- Every row in §1's table matches its ruling: parts exist with the names given,
  or the row is explicitly unchanged for the stated reason.
- `onValueChange` / `onCheckedChange` are the documented callbacks; every in-repo
  caller inside this package and `packages/primitives/examples` is migrated. Callers
  outside this package (`examples/basic-app`, `apps/playground`) are recorded in
  `TODO.md` for their owners.
- `StateStyle` is accepted by every part that has state, and `<Part>State` is
  exported for each.
- No behaviour is duplicated: the sugar props and the parts share one render
  function.
- `packages/primitives/docs/*.mdx` names the parts and their props, and the
  impossible scrollbar parts are a documented gap.
- `src/inventory.ts` still passes, with the new source files recorded.
- `COMPONENTS.md` Tier 1 rows name the exported parts.
- `nub run check` green; `test:runtime` green once B1 is fixed.
