# 054 — The remaining unclaimed Tier 1 controls: `NumberField`, `OTPField`, `Toggle`, `Rating`

- **Phase:** C (Tier 1 completion). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `047`, `049`, `053` (value maths).
- **Status:** in progress. `NumberField` and `Toggle` are implemented and
  measured (§9); `OTPField` and `Rating` are pending, and `053`'s stepping/focus
  maths is in place for them.
- **Why:** these four rows in `COMPONENTS.md` were marked *owner unassigned*.
  They are all single-purpose input/selection primitives (`div` + `<input>` +
  our keyboard contract) and belong to this package, not to the Tier 2
  composition package. This plan claims them and specifies each to the Tier 1
  bar: code, a test that can fail, an example, a docs page, an inventory row and
  a measured native interaction.

## 1. Runtime facts to verify before each component

| Fact | Why it matters | Where to check |
| ---- | -------------- | -------------- |
| `<input>` has `value`, `placeholder`, `readOnly`, `onChange`, `onSubmit`, `autoFocus`, `theme` — no `type`, no `maxLength`, no `inputMode`, no `onPaste` | NumberField cannot rely on `type="number"`; OTP cannot enforce one character natively and cannot intercept paste | `@gpuix/native` `InputProps` (0.10.0) |
| `onChange` carries the **accumulated text** after the edit (plan 041 §9) | OTP can distribute a multi-character insert if the platform pastes into one field | `runtime/fields.runtime.test.tsx` |
| `aria` supports `label`, `description`, `valuetext`, `expanded`, `selected`, `level` — no `pressed`, no `checked` | Toggle and Rating must report state through `aria-valuetext` (same as Checkbox/Switch) | `references/gpuix/packages/native/src/accessibility.rs` |
| `getElementBounds` + `EventPayload.x/y` | NumberField's drag-to-scrub is only honest if both are available; otherwise drop the feature and say so | runtime probe |
| Focus can be moved programmatically with `renderer.focusElement(id)`; it is a **method on the renderer** | OTP moves focus between cells, Rating moves focus with selection | plan 049 §7 |

**STOP:** if a component's core claim needs one of these and the probe
contradicts it, ship the honest subset and document the limitation; do not
simulate the missing capability.

## 2. `NumberField`

### 2.1 API (`components/NumberField.tsx`)

```ts
export interface NumberFieldProps {
  readonly value?: number;                 // controlled
  readonly defaultValue?: number;          // uncontrolled, default 0
  readonly onChange?: (value: number) => void;
  readonly min?: number;                   // default -Infinity? -> use undefined
  readonly max?: number;
  readonly step?: number;                  // default 1
  readonly size?: ControlSize;             // default md
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly label?: string;                 // accessible name
  readonly placeholder?: string;
  readonly precision?: number;             // decimals shown on commit, default 0
  readonly formatValue?: (value: number) => string;  // default String
  readonly style?: StyleDesc;
  readonly testId?: string;
}
```

Structure: a field row (`controlStyle` with `fieldVariant`) containing the
native `<input>` and a spin column of two `role="presentation"` `div`s
(chevron up/down). **Deviation from the first draft of this plan:** the steppers
are pointer affordances, not tab stops — the input's arrow keys are the keyboard
path, as in a native spinner, and a field adds exactly one tab stop. A stepper
press returns focus to the input. An untouched field with no `value` and no
`defaultValue` renders **empty**, like a native number field.

### 2.2 Behaviour (`core/number.ts`)

```ts
parseNumericText(text): Option.Option<number>
  // trims; "" or "-" or "." -> None (the user is mid-edit, not zero);
  // "1,5" -> None (no locale claim); "1e3" -> Some(1000)
commitNumber(text, range, precision): Option.Option<number>
  // parse -> clampValue (053) -> round to precision
formatNumber(value, precision): string
  // fixed decimals, no thousands separators (a locale claim needs a formatValue)
  // A trailing dot parses as the number it already is; the *draft* is what keeps
  // "1." visible, so no separate "partial text" predicate is needed.
```

The field keeps its **own draft text** while focused (so `1.` does not become
`1` under the caret); on blur or Enter it commits through `commitNumber` and
reformats. A controlled `value` change re-seeds the draft when the field is not
focused. Steppers and keys commit immediately.

Keyboard (on the input): Up/Down ±step, PageUp/PageDown ±10 steps, Home/End to
`min`/`max` when present, Enter commits. **No drag-to-scrub** unless §1's probe
confirms both bounds and coordinates; if it does, it is a `onMouseDown` +
`onMouseMove` gesture on the stepper column, implemented in this plan only after
the probe, otherwise documented as unsupported.

### 2.3 Tests

- `core/number.test.ts`: decimal-only parsing ("1,5", "0x10", "Infinity"
  rejected), clamping, precision, stepping, Home/End only with a bound.
- `NumberField.test.tsx`: the draft value is shown verbatim; the key contract;
  the raw edit text is reported; the steppers are `presentation` and step;
  one tab stop; disabled/invalid.
- Runtime: typing `12` reports `12`; `1.5` with `precision={2}`; `999` against
  `max=100` reports `100`; arrow/PageDown step; a hit-tested spin press steps
  and refocuses; the ring paints on the chrome; disabled refuses text, keys and
  presses. Measured in §9.

## 3. `OTPField`

### 3.1 API (`components/OTPField.tsx`)

```ts
export interface OTPFieldProps {
  readonly length?: number;                // default 6
  readonly value?: string;                 // controlled, up to `length` chars
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly onComplete?: (value: string) => void;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly label?: string;                 // accessible name of the group
  readonly style?: StyleDesc;
  readonly testId?: string;
}
```

### 3.2 Behaviour (`core/otp.ts`)

```ts
normalizeOtp(value, length): string       // digits/letters kept, truncate
applyOtpInput(current, index, text, length): { readonly value: string; readonly focus: number }
  // a one-character edit replaces the cell and moves right;
  // a multi-character insert (paste) fills forward from that cell;
  // Backspace on an empty cell clears the previous one and moves left
otpCells(value, length): ReadonlyArray<string>
```

Each cell is a native `<input>` with `value={cell}`, `readOnly` when disabled,
`aria-label={`${label ?? "Code"} digit ${index + 1}`}`, `tabIndex` 0 (or -1 when
disabled), its own focus ring and `onChange`/`onKeyDown`. Focus movement uses
`renderer.focusElement(id)` with ref-registered ids, the `RadioGroup` pattern.
The value is a single string, so a caller never juggles an array.

Keyboard: Left/Right move between cells; Backspace clears and moves left; Delete
clears; Home/End jump to the ends; typing fills and advances. Arrows are handled
in the cell so they do not collide with the text caret.

**Paste:** verify that pasting into a focused `<input>` delivers the whole
string through `onChange`. If it does, `applyOtpInput` distributes it. If the
runtime only delivers the first character, record it as a limitation and
document "paste a code into the first cell" as unsupported — do not intercept a
key sequence and call it paste.

### 3.3 Tests

- `core/otp.test.ts`: one-char edit advances; a multi-char insert distributes;
  backspace on empty clears the previous cell; truncation to `length`.
- `OTPField.test.tsx`: `length` inputs, each labelled; the group's accessible
  name; disabled removes the tab stops.
- Runtime: typing six keys fills six cells and `onComplete` fires once; arrows
  move focus; backspace empties backwards; a paste-equivalent multi-character
  `onChange` fills forward; invalid paints the destructive border on every cell.

## 4. `Toggle`

### 4.1 API (`components/Toggle.tsx`)

```ts
export interface ToggleProps {
  readonly pressed?: boolean;              // controlled
  readonly defaultPressed?: boolean;
  readonly onPressedChange?: (pressed: boolean) => void;
  readonly variant?: "default" | "outline"; // default "default"
  readonly size?: ControlSize;             // default md
  readonly square?: boolean;
  readonly disabled?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly label?: string;                 // accessible name; required for icon-only
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}
```

A toggle button, not a switch: it is a button whose action has a persistent
state (bold, grid view, mute). Paint: `controlStyle` with `toggleVariants` in
`core/variants.ts`; the pressed state paints `colors.accent`/`accentForeground`
(or `primary` for the default variant), so pressed and hover are distinct.
Activation reuses `decideActivation`; focus reuses `useFocus`.

**The ARIA limitation:** no `aria-pressed` exists. The state is announced
through `aria-valuetext` (`"pressed"` / `"not pressed"`), like Checkbox. The
docs page states plainly that a screen reader hears a button with a value, not
a pressed button — the runtime cannot do better.

### 4.2 Tests

- Element tree: `role="button"`, the value text flips, the pressed variant's
  background role, activation wired on Enter down / Space up, disabled refuses.
- Runtime: click toggles and announces; a second click returns; Enter/Space
  activate exactly once; a disabled toggle refuses both and is out of the tab
  order; the ring paints on focus.

## 5. `Rating`

### 5.1 API (`components/Rating.tsx`)

```ts
export interface RatingProps {
  readonly value?: number;                 // 0..max
  readonly defaultValue?: number;
  readonly onChange?: (value: number) => void;
  readonly max?: number;                   // default 5
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;             // shows the value, no tab stop
  readonly label?: string;                 // group name; each star is "N of max"
  readonly style?: StyleDesc;
  readonly testId?: string;
}
```

A radio-group-shaped input (one tab stop, arrows move the selection and focus)
over `max` stars. Reuses `decideMove`/`decideAbsolute`, `initialActiveIndex`'s
idea, and `renderer.focusElement`. Roles: `radiogroup` on the wrapper, `radio`
per star, `aria-valuetext` = `"1 of 5"`? No — the group announces the value;
each star announces `checked`/`unchecked` exactly like `RadioGroup`, and the
group's `aria-label` names the control. Star paint: `Icon name="star"`; a star
at or below the value is `colors.primary` (or `colors.warning` for a "rating"
tone) and above it `colors.mutedForeground`. Add a filled `star` to the icons
package only if the outline reads as unfilled at runtime; otherwise use the
stroke icon in the two colours and document it.

Clicking star *n* sets the value to *n*; clicking the current value again keeps
it (a rating is not a toggle — clearing is an app decision, exposed as
`onChange(0)` only by keyboard Home).

### 5.2 Tests

- Element tree: `max` radios, roving tab stop, value text per star, group name.
- Runtime: click star 3 sets 3 and rings the group; ArrowRight/Left move by one
  and move focus; Home sets 0; disabled/readOnly remove the tab stop; the a11y
  dump has `RadioGroup` + `RadioButton` nodes.

## 6. Files (per component, when its turn comes)

```
A packages/primitives/src/core/<name>.ts + .test.ts
A packages/primitives/src/components/<Name>.tsx + .test.tsx
M packages/primitives/src/core/style.ts | variants.ts   (only if it paints)
M packages/primitives/src/core/index.ts
M packages/primitives/src/components/index.ts
A packages/primitives/docs/<name>.mdx
M packages/primitives/docs/README.md
A packages/primitives/examples/…  (one new composition, or extend an existing one)
M packages/primitives/examples/index.ts
A packages/primitives/runtime/<name>.runtime.test.tsx
M COMPONENTS.md, TODO.md
```

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test          # all unit + element-tree suites pass
nub run --filter @gpuixui/primitives test:runtime  # every runtime suite passes
nub run check                                      # check-tests, lint, fmt, types
```

Per component: unit suite + element-tree suite + at least four runtime
assertions (activation, state announcement, focus/ring, disabled). Counts are
recorded in the plan's evidence section at implementation time — do not write a
count before it is measured.

## 8. STOP conditions

- A control cannot announce its state at all (no supported `aria-*` channel and
  no role that carries it): document the limitation in the docs page and
  `COMPONENTS.md`, and keep the visual state — a control must not lie about what
  it is.
- OTP paste is unimplemented by the runtime: drop `applyOtpInput`'s paste branch
  and say so; do not fake paste with a keyboard sequence.
- NumberField drag-to-scrub needs bounds/coordinates that are absent: omit the
  gesture and document it.
- Rating needs a filled icon the icon package cannot paint: use the outline
  star with the two role colours and record the visual limitation.

## 9. Evidence — `NumberField` and `Toggle` (measured 2026-10-17)

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | 21 files, **243 tests passed** (214 before plan 054; +29) |
| `nub run --filter @gpuixui/primitives test:runtime` | 10 files, **97 tests passed** (82 before plan 054; +15: seven field, six toggle, two example interactions) |
| `nub run check` | tests-can-fail, lint, fmt and `check-types` pass |

Two-direction probes (each change reverted on its own):

| Guard | Revert | Result |
| ----- | ------ | ------ |
| draft text | replace `text` with `display(state.value.current)` | runtime `keeps a trailing dot…` → **expected 1.005 to be 1.5** (the field reformatted to `1.00` and the next digit appended to it) |
| disabled stepper | drop `if (disabled \|\| blocked) return` | runtime `refuses edits, keys and steps…` → **expected [ 51 ] to strictly equal []** |
| typed clamp | `state.set(parsed)` instead of `state.set(clampNumeric(parsed, range))` | runtime `clamps a typed value…` → **expected 999 to be 100** |

Facts measured beyond the plan:

- The first implementation formatted an untouched field as `0.00`; typing then
  appended to that (`0.001`). The field now renders **empty** when it has neither
  `value` nor `defaultValue`, like a native number field.
- **`autoFocus` focuses the input but dispatches no focus event**, so the chrome
  ring does not paint until the next focus change. Recorded as a limitation
  (it applies to `Input` too); the runtime ring test clicks the input instead.
- A stepper press moves native focus back to the input (`focusedElement().type`
  is `input`), so the next arrow works.
- The spin buttons are `presentation` and never enter the tab order.

### Toggle

| Guard | Revert | Result |
| ----- | ------ | ------ |
| pressed paint | use `paint.rest` for both states | runtime `paints the accent role…` → **expected undefined to be '#00000D'** |
| disabled handler | drop `if (props.disabled === true) return` | element tree `refuses activation…` → **expected 2 calls, got 0 expected**; runtime `refuses activation…` → **expected 'pressed' to be 'not pressed'** (with the click and the key asserted separately — one assertion after both activations cancelled the two toggles, which is how the first version of the test passed) |

Facts measured for Toggle:

- AccessKit reports `Button` and the state only through `aria-valuetext`; there
  is no `aria-pressed` (verified in the dump).
- A hit-tested click repaints `colors.accent`, and the outline variant keeps
  `colors.border` while pressed.
- A `default`-variant toggle paints no fill at rest; the runtime still creates
  its hitbox from the click handler (the same fact measured for the slider
  track), so the press reaches it.

Not proven:

- paste into the field: there is no `onPaste`, so the runtime's text pipeline
  delivers it as an edit and `parseNumericText` decides — no separate path to
  claim;
- the published `darwin-x64` binding (same provenance as every runtime claim).

## 10. Acceptance

- Each component exports a typed API, paints only from theme roles, and has a
  test that fails when its stated guard is removed (recorded both ways).
- A docs page per component, an example mounted by the runtime example suite,
  and a `COMPONENTS.md` row with the measured runtime note.
- No row is marked `done` before the published-binary confirmation and the
  docs-site page (the same bar as every Tier 1 row).
