# 345 — The rest of the Tier 1 slot triggers, and the text-host hover limit

| Field | Value |
| ----- | ----- |
| Phase | F (integration) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `057`, `058`, `071`, `079`, `083`, `085`, `090`, `093`, `332`, `341` |
| Source | measured on this host, 2026-10-18; the follow-up plan `341` named |
| Status | done (2026-10-18) |

## 0. The bug

`Tooltip` renders `<TooltipTrigger asChild>`. GPUix's `renderSlot` **clones** the
slot props onto the child. A React component boundary drops every prop it does
not declare, so only the components that accept the slot contract can be a
tooltip trigger. Plan `341` added that contract to `Button`, `IconButton` and
`Toggle`; the rest of Tier 1 still drops it.

Measured on this host with the real `TestRenderer` (0.10.0, locally built
binding, ADR `0003`):

| Probe | Result |
| ----- | ------ |
| `<Tooltip content="…"><Input testId="in" label="Email" /></Tooltip>`, hover `in` | **no tip** (`allText()` is `[]`) |
| … then `focusNext()` so the input holds native focus | **no tip**, and no `aria-description` on the `TextInput` node |
| the same probe around a raw `<input>` + focus | **tip opens**; the `TextInput` node carries the description |
| the same probe around a raw `<input>` + hover | **no tip** — `onMouseEnter` never fires on an `<input>` host (a plain `div` beside it does fire) |
| `<Tooltip><Switch/></Tooltip>`, `<Tooltip><Checkbox/></Tooltip>`, `<Tooltip><Slider/></Tooltip>`, hover | **no tip** (the roots are `div`s, so the handlers would work — they are simply dropped) |
| `<Tooltip><Select/></Tooltip>`, hover the trigger | **no tip** (the slot props stop at the `Select` boundary) |
| `<Tooltip><Slider/></Tooltip>` after the handler fix, hover | the tip opens, but the slider's painted box is **16 × 32 px** — `tooltipRootStyle` hugs its trigger, and a Slider's track is always `width: "100%"`, so 100 % of a shrink-to-fit root collapses |

So there are **two** facts:

1. **Fixable:** every single-root focusable control can forward the slot contract
   to its one focusable host. That restores hover (on `div` roots) and keyboard
   focus (on every root, including the native text hosts), plus the tip's
   `aria-description`.
2. **Not fixable in 0.10.0:** a native `<input>`/`<textarea>` host receives no
   `onMouseEnter`/`onMouseLeave` (measured above). A tooltip around a text field
   can therefore open on **keyboard focus only**, never on hover. That is a
   runtime limit and must be documented in the page, not hidden.

Plan `341`'s doc says "`Button`, `IconButton` and `Toggle` accept that
contract". The Tooltip page's first paragraph says the child must be "a single
focusable element with a role and a name" — an `Input`, `Select`, `Checkbox`,
`Switch` or `Slider` satisfies that and silently does nothing. That is the
honesty defect this plan fixes.

## 1. Scope — which components become triggers

The slot contract is **one child, one focusable host**. A component whose focus
owner is a single element is a trigger. A component that spreads focus over a
roving set of items is not: there is no single element to carry the handlers and
the description, and the tooltip's own anchor is the component root.

| Component | Focusable host | Trigger? | Why |
| --------- | -------------- | -------- | --- |
| `Input` | the `<input>` | **yes** | focus path only (text-host hover limit) |
| `TextArea` | the `<textarea>` | **yes** | focus path only (same limit) |
| `NumberField` | the inner `<input>` | **yes** | focus path only (same limit) |
| `Checkbox` | the root `div` | **yes** | hover + focus |
| `Switch` | the root `div` | **yes** | hover + focus |
| `Slider` | the track `div` | **yes** | hover + focus |
| `Select` | GPUix's trigger | **yes** | hover + focus, forwarded to `SelectTrigger` |
| `Button`, `IconButton`, `Toggle` | root/`Button` | already | plan `341` |
| `InfoTip` | its own `img` trigger | already | plan `073` |
| `RangeSlider` | two thumbs, no single root | **no** | roving focus; document |
| `OTPField` | six cells, group root inert | **no** | roving focus; document |
| `Rating` | five stars, group root inert | **no** | roving focus; document |
| `CheckboxGroup`, `ToggleGroup` | one row/item per stop | **no** | roving focus; document |
| `ButtonGroup`, `Box`, `Text`, layout | not focusable | **no** | no focus owner |
| `Label` | painted text | **no** | not focusable, no role |

## 2. The contract

Every trigger accepts the existing `TriggerHandlers` type from
`src/components/internal.ts` and one extra prop:

```ts
export interface XProps extends TriggerHandlers {
  /** Extra description announced after the name. A slot (a Tooltip) writes the tip here. */
  readonly "aria-description"?: string;
}
```

Rules, identical to plan `341`'s button family:

- **Passive handlers** (`onMouseEnter`, `onMouseLeave`, `onMouseMove`,
  `onMouseDown`, `onMouseUp`, `onMouseDownOutside`, `onAuxClick`, `onScroll`)
  are spread onto the focusable host with `passiveTriggerHandlers(props)`.
- **Focus/blur/key handlers are composed**, never replaced: the component keeps
  its own focus-ring state, activation/step rules and field guards, and the
  slot's handler runs alongside.
- **`aria-description` is forwarded** to the same focusable host that carries the
  name, so the a11y node announces it.
- **`onClick` is not part of the contract** (`TriggerHandlers` deliberately
  excludes it): the control owns activation. A slot's click-to-close is not
  forwarded, so a focused control keeps its tip while it is being used.
  This matches plan `341`'s decision.
- **Disabled controls** still receive the handlers (the tooltip can explain why
  a control is disabled), but their own guards refuse activation. Focus is
  impossible while disabled, so only the pointer path applies on `div` roots.

### 2.1 One shared type?

Do **not** add a second `TriggerHandlers`-like type. Import the existing one and
`passiveTriggerHandlers` from `./internal.js`. No new core module.

### 2.2 The wrapper hugs, so a full-width trigger needs a width

`tooltipRootStyle` is `{ alignSelf: "flex-start" }` because `<anchored>` measures
the root (plan `060`). A root that hugs also makes a child's `width: "100%"`
resolve against a shrink-to-fit box: measured **16 × 32 px** for a `Slider`
inside a `Tooltip` in a column. `Slider`'s track is always 100 % wide, so every
Slider-in-Tooltip collapses without a hint. The same applies to
`fullWidth` `Input`/`Select`/`Button`.

Give `Tooltip` one escape hatch:

```ts
export interface TooltipProps {
  // …
  /** Merged over the hugging root style. A full-width trigger needs a width here. */
  readonly style?: StyleDesc;
}
```

`renderTooltip` merges it over `tooltipRootStyle` last (the package-wide rule).
It sizes the **anchor**, so a child that fills it stays aligned with the tip.
Document it in `tooltip.mdx` with the Slider example (`style={{ width: 320 }}`).
The Slider runtime case uses that width; without it the case fails on the
painted width, which is the proof that the caveat is real.

## 3. Slice A — the field family (`Input`, `TextArea`, `NumberField`)

### 3.1 `packages/primitives/src/components/Input.tsx` (EDIT)

1. Import the slot helpers:

```ts
import {
  composeHandler,
  mergeStyle,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
```

2. Extend `FieldProps` and document the limit:

```ts
export interface FieldProps extends TriggerHandlers {
  // … existing props unchanged …
  /**
   * Extra description announced after the name. A slot (a `Tooltip`) writes the
   * tip here. A text host receives no `onMouseEnter` in 0.10.0, so a field's
   * tooltip opens on keyboard focus only (plan `345`).
   */
  readonly "aria-description"?: string;
}
```

3. `fieldHostProps` gains the forwarded props:

```ts
export const fieldHostProps = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
) => ({
  ...passiveTriggerHandlers(props),
  value: state.current,
  placeholder: props.placeholder,
  readOnly: props.readOnly === true || props.disabled === true,
  autoFocus: props.disabled === true ? undefined : props.autoFocus,
  tabIndex: props.disabled === true ? -1 : undefined,
  theme: nativeTextTheme(theme),
  testId: props.testId,
  "aria-label": props.label,
  "aria-description": props["aria-description"],
  onChange: (event: EventPayload) => {
    if (props.disabled !== true) onValueChange(event.value ?? "");
  },
  onSubmit: props.disabled === true ? undefined : props.onSubmit,
  onFocus: composeHandler(focus.onFocus, props.onFocus),
  onBlur: composeHandler(focus.onBlur, props.onBlur),
  onKeyDown: props.onKeyDown,
  onKeyUp: props.onKeyUp,
});
```

Order matters: `passiveTriggerHandlers` is spread first; nothing below reassigns
those keys. `onFocus`/`onBlur` are the only composed own handlers; the field has
no key rule of its own, so the slot's `onKeyDown` (Escape) is forwarded as-is.

4. `TextArea` needs **no file change** beyond this: `TextAreaProps` is
`Omit<FieldProps, "onSubmit">`, and it spreads `fieldHostProps`.

### 3.2 `packages/primitives/src/components/NumberField.tsx` (EDIT)

`NumberField` does not use `FieldProps`; give it the same two additions.

1. Import `composeHandler`, `passiveTriggerHandlers`, `TriggerHandlers`.
2. `NumberFieldProps extends TriggerHandlers`, add `"aria-description"?: string`.
3. In `renderNumberField`, the **inner `<input>`** is the focusable host and
   carries the slot props, because the wrapper `div` is chrome:

```tsx
<input
  {...passiveTriggerHandlers(props)}
  ref={handlers.registerInput}
  value={text}
  placeholder={props.placeholder}
  readOnly={disabled}
  autoFocus={disabled ? undefined : props.autoFocus}
  tabIndex={disabled ? -1 : undefined}
  theme={nativeTextTheme(theme)}
  aria-label={props.label}
  aria-description={props["aria-description"]}
  style={numberInputStyle()}
  onChange={/* unchanged */}
  onKeyDown={(event) => {
    if (disabled) return;
    Option.match(decideNumberKey(state.current, range, event.key ?? ""), {
      onNone: () => {},
      onSome: handlers.onValue,
    });
    props.onKeyDown?.(event);
  }}
  onSubmit={/* unchanged */}
  onFocus={composeHandler(focus.onFocus, props.onFocus)}
  onBlur={(event) => {
    focus.onBlur();
    handlers.onCommit();
    props.onBlur?.(event);
  }}
/>
```

The focused input is a native text host, so hover remains impossible; the plan's
docs say so. The *ring* still tracks focus from the component's own handler.

### 3.3 Docs (`input.mdx`, `textarea.mdx`, `number-field.mdx`)

- `input.mdx` Keyboard: remove "There is no `onKeyDown` prop". Replace with a
  row: `onKeyDown`/`onKeyUp` — forwarded to the host (a slot uses them to close
  a tooltip); app shortcuts still belong to the window handler.
- All three pages, Accessibility: one bullet —
  "Slot trigger: forwards a `Tooltip`'s handlers and `aria-description`. GPUix's
  `<input>`/`<textarea>` host receives no `onMouseEnter`, so the tip opens on
  keyboard focus only (measured, plan `345`)."
- `input.mdx` API table: add `onMouseEnter`…`aria-description`? Keep the table
  short: add one row `slot handlers` and one `aria-description`, pointing at
  Tooltip. Do not list all eight passthrough handlers.
- Same one-row addition for `textarea.mdx` and `number-field.mdx`.

## 4. Slice B — the div-root controls (`Checkbox`, `Switch`, `Slider`)

### 4.1 `Checkbox.tsx` (EDIT)

1. `CheckboxProps extends TriggerHandlers`; add `"aria-description"?: string`.
2. On the root `div`:

```tsx
<div
  {...passiveTriggerHandlers(props)}
  role="checkbox"
  aria-label={props.label}
  aria-description={props["aria-description"]}
  aria-valuetext={selectionValueText(current)}
  tabIndex={props.disabled === true ? undefined : 0}
  testId={props.testId}
  onClick={toggle}
  onKeyDown={onKey("down", props.onKeyDown)}
  onKeyUp={onKey("up", props.onKeyUp)}
  onFocus={composeHandler(focus.onFocus, props.onFocus)}
  onBlur={composeHandler(focus.onBlur, props.onBlur)}
  style={resolvePartStyle(box, props.style, partState)}
/>
```

`onKey` becomes:

```ts
const onKey =
  (phase: "down" | "up", handler?: (event: EventPayload) => void) =>
  (event: EventPayload): void => {
    if (decideActivation(event.key ?? "", phase, event.isHeld === true))
      toggle();
    handler?.(event);
  };
```

The slot's `onKeyDown` runs **after** activation, the same order as `Button`
(plan `085`/`341`). A disabled checkbox still calls the slot's handler (Escape
may close its tooltip) but `toggle` refuses.

### 4.2 `Switch.tsx` (EDIT)

Same shape as `Checkbox`:

- `SwitchProps extends TriggerHandlers`, add `"aria-description"?: string`.
- Root `div` spreads `passiveTriggerHandlers(props)` and `aria-description`;
  composes `onFocus`/`onBlur`; `onKeyDown`/`onKeyUp` use the Button-style
  `onKey(phase, handler)`; keeps `motion.div` unchanged.

### 4.3 `Slider.tsx` (EDIT)

`Slider` owns `onMouseDown`/`onMouseMove`/`onMouseUp` for its drag. Do **not**
spread the passive set blindly — compose every passive handler with the drag
handler so a slot cannot remove dragging:

```ts
export interface SliderProps extends TriggerHandlers {
  // … unchanged …
  readonly "aria-description"?: string;
}
```

In `renderSlider`:

```tsx
<div
  ...
  aria-description={props["aria-description"]}
  onMouseEnter={props.onMouseEnter}
  onMouseLeave={props.onMouseLeave}
  onMouseDown={(event) => {
    props.onMouseDown?.(event);
    handlers.onPointerDown(event);
  }}
  onMouseMove={(event) => {
    props.onMouseMove?.(event);
    handlers.onPointerMove(event);
  }}
  onMouseUp={(event) => {
    props.onMouseUp?.(event);
    handlers.onPointerUp();
  }}
  onMouseDownOutside={props.onMouseDownOutside}
  onAuxClick={props.onAuxClick}
  onScroll={props.onScroll}
  onFocus={composeHandler(focus.onFocus, props.onFocus)}
  onBlur={composeHandler(focus.onBlur, props.onBlur)}
  onKeyDown={(event) => {
    if (props.disabled === true) {
      props.onKeyDown?.(event);
      return;
    }
    Option.match(decideValueKey(value, range, event.key ?? ""), {
      onNone: () => {},
      onSome: handlers.onValueChange,
    });
    props.onKeyDown?.(event);
  }}
  ...
/>
```

`RangeSlider` is **not** changed; its two thumbs are a roving pair and the group
root is not focusable. The Tooltip page records it as a non-trigger.

Because the track is always `width: "100%"`, a `Tooltip` around a `Slider` must
also set the root width (`style={{ width: … }}`), per §2.2. The runtime case
uses `style={{ width: 320 }}` and asserts the painted track is that wide; without
the hint it collapses and the case fails.

### 4.4 Docs (`checkbox.mdx`, `switch.mdx`, `slider.mdx`)

Add the same slot-trigger bullet under Accessibility, without the hover caveat
(the roots are `div`s): "Slot trigger: forwards a `Tooltip`'s handlers and
`aria-description`, so a tip opens on hover and on keyboard focus."
Add one `aria-description` row to each API table.

## 5. Slice C — `Select`

GPUix's `SelectTrigger` already composes `onMouseDown`, `onClick` and
`onKeyDown` with the caller's handlers (`dist/components/select.js`, read
2026-10-18), and its `...props` forwards `onMouseEnter`/`onMouseLeave`/
`onFocus`/`onBlur`/`aria-description` to the trigger host. So the wrapper only
has to accept and pass them.

1. `SelectProps extends TriggerHandlers`; add `"aria-description"?: string`.
2. `renderSelect` passes to `SelectTrigger`:

```tsx
<SelectTrigger
  {...passiveTriggerHandlers(props)}
  ref={handlers.registerTrigger}
  role="combobox"
  aria-label={label}
  aria-description={props["aria-description"]}
  aria-expanded={open}
  aria-valuetext={selectedLabel ?? placeholder}
  disabled={disabled}
  testId={...}
  onFocus={composeHandler(focus.onFocus, props.onFocus)}
  onBlur={composeHandler(focus.onBlur, props.onBlur)}
  onKeyDown={props.onKeyDown}
  style={...}
>
```

`onKeyDown` is composed inside GPUix's trigger: it calls ours first, then its own
open/move rule. Do **not** wrap it again.

3. Docs (`select.mdx`): add the slot-trigger bullet and the `aria-description`
   row.

## 6. The Tooltip page — the source of truth

`packages/primitives/docs/tooltip.mdx`:

- Replace "`Button`, `IconButton` and `Toggle` accept that contract (plan `341`),
  and a raw host element accepts it directly" with a table:

| Trigger | Hover | Keyboard focus |
| ------- | ----- | -------------- |
| `Button`, `IconButton`, `Toggle` | yes | yes |
| `Checkbox`, `Switch`, `Slider`, `Select` | yes | yes |
| `Input`, `TextArea`, `NumberField` | **no** (text host) | yes |
| `InfoTip` | yes | yes |
| `RangeSlider`, `OTPField`, `Rating`, `CheckboxGroup`, `ToggleGroup` | no | no |
| `Box`, layout, `Label` | no | no |

- Add the limitation with the measurement:
  "GPUix's `<input>`/`<textarea>` host receives no `onMouseEnter`, so a field's
  tip opens on keyboard focus only (measured, plan `345` §0)."
- Document `style`: the root hugs its trigger, so a full-width child (`Slider`,
  `fullWidth` `Input`/`Select`/`Button`) needs `style={{ width: … }}`. Measured,
  a Slider without it paints a 16 px track.
- Keep "A component that drops those props will not open the tip" and name the
  composite list.
- Update the Verification list with the new runtime suite cases.

## 7. Inventory, TODO and index

- `COMPONENTS.md`:
  - Tooltip row: add "**Slot (345):** every single-root focusable Tier 1
    control forwards the contract; text hosts open on focus only (measured)."
  - The `Checkbox`, `Switch`, `Slider`, `Select`, `Input`, `TextArea`,
    `NumberField` rows: append a short "**Slot trigger (345):** …" sentence.
- `TODO.md` → primitives workstream: add and tick
  "**the rest of the slot triggers** — Input/TextArea/NumberField/Checkbox/
  Switch/Slider/Select dropped a `Tooltip`'s props; measured, the tip never
  opened. All seven now accept `TriggerHandlers` + `aria-description`; a native
  text host still cannot hover (documented). Plan `345`."
  Refresh the runtime count from the actual run.
- `.agents/slop/plans/README.md`: add the `345` row with the measured counts.
- `PLAN.md` §4: add D36 recording the rule — "a slot trigger is a single
  focusable root; roving composites are non-triggers; text hosts have no hover".

## 8. Test plan

### 8.1 Element-tree tests (offline, no binding)

Add one case per new trigger to that component's existing suite
(`Input`/fields → `src/components/fields.test.tsx`; `NumberField` →
`NumberField.test.tsx`; `Checkbox` → `selection.test.tsx` or its own;
`Switch` → `selection.test.tsx`; `Slider` → `value.test.tsx`; `Select` →
`Select.test.tsx`). Each case:

1. render the pure `render*` with `{ onMouseEnter, onKeyDown, "aria-description":
   "A hint" }`;
2. assert `hostHandler(element, "onMouseEnter")` is the injected function and
   `hostProp(element, "aria-description")` is `"A hint"`;
3. assert the component's own key rule still runs alongside the injected
   `onKeyDown` (e.g. Checkbox toggles **and** the injected spy fires once;
   Slider steps **and** the spy fires).

Use the existing helpers `hostProp`, `hostHandler`, `expectSome` from
`src/components/testing/element.ts`. No new helper is needed.

**Why each can fail:** delete the `...passiveTriggerHandlers(props)` spread (or
the `aria-description` line) and its case fails by `None`; replace the composed
key handler with the injected one and the component's activation assertion
fails.

### 8.2 Runtime tests (`runtime/overlay-trigger.runtime.test.tsx`)

Add to the existing suite (it already owns the slot contract):

```ts
const openOnHover = async (node: ReactNode) => { … hover "target" … };
const openOnFocus = async (node: ReactNode) => { … focusNext … };
```

Cases, all anchored on `testId="target"`:

| Case | Observation |
| ---- | ----------- |
| `Checkbox` | hover paints the tip; Tab focus paints it |
| `Switch` | hover paints it; focus paints it |
| `Slider` | hover paints it; focus paints it; a press still moves the value (drag contract not lost); the painted track is the explicit root width |
| `Select` | hover paints it; focus paints it; pressing the trigger still opens the list |
| `Input` | **focus** paints it (hover is the measured limit, not asserted as success) |
| `TextArea` | focus paints it |
| `NumberField` | focus paints it |
| `aria-description` | the field's `TextInput` / `MultilineTextInput` / `ComboBox` / `CheckBox` / `Switch` / `Slider` node carries the tip text |
| full-width root | a `Tooltip` around an `Input fullWidth` with no root width paints a narrower field; with `style={{ width: 320 }}` the field is 320 px — the documented caveat |

Do **not** assert hover for a field. That would either fail forever or encode a
limitation as behaviour; the page records the measurement instead.

### 8.3 Both-direction proof

Run each new runtime case **before** the implementation and capture the failure
(no tip painted). Then implement and run again. `scripts/verify-two-directions.sh`
does not exist in a usable form (TODO), so record both runs in the plan's
execution log. At minimum, run one mutated build per slice:

- Slice A: delete the `onFocus` composition in `fieldHostProps` → the `Input`
  focus case fails.
- Slice B: delete the `aria-description` line in `Switch` → the description
  assertion fails.
- Slice C: delete `{...passiveTriggerHandlers(props)}` from `SelectTrigger` →
  the Select hover case fails.

## 9. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expected: all offline tests pass; count grows by one (or more) per new case

nub run --filter @gpuixui/primitives test:runtime
# expected: all runtime tests pass; the suite reports the new total on this host

nub run check
nub run lint
nub run test
# expected: exit 0
```

If `test:runtime` cannot load the binding, STOP: report the host, do not skip.

## 10. STOP conditions

- **STOP** if a component's own event contract cannot be composed without
  changing behaviour (e.g. `Select`'s key handling stops opening the list).
  Record the exact failing case in `TODO.md`, keep the component as a documented
  non-trigger, and land the slices that do work.
- **STOP** if forwarding a passive handler to a native `<input>` throws or
  changes typing/keyboard editing. The field slice depends on those hosts
  tolerating the props; if they do not, document fields as focus-only (expected)
  or non-triggers (unexpected) with evidence.
- **STOP** if `nub run check` fails for a reason outside `packages/primitives`;
  record it in `TODO.md` instead of editing another workstream's path.
- Do **not** add `onClick` to `TriggerHandlers`, and do not forward a slot's
  `onClick`: it would let a tooltip override activation.

## 11. Acceptance

- [ ] Every single-root focusable Tier 1 control accepts `TriggerHandlers` +
      `aria-description` and forwards them to its focusable host.
- [ ] A `Tooltip` around `Checkbox`, `Switch`, `Slider` and `Select` opens on
      hover and on focus in the real runtime, with the description on the
      control's a11y node. `Tooltip.style` sizes the hugging root so a Slider (or
      any full-width child) keeps its width; the page states the caveat.
- [ ] A `Tooltip` around `Input`, `TextArea` and `NumberField` opens on focus
      and carries the description; the page states the measured no-hover limit.
- [ ] Roving composites are documented non-triggers with the reason.
- [ ] `tooltip.mdx`, the seven component pages, `COMPONENTS.md`, `TODO.md`,
      `PLAN.md` and the plan index agree.
- [ ] Offline and runtime suites, `nub run check`, `nub run lint`,
      `nub run test` are green.

## 12. Execution log (2026-10-18, this host)

All commands ran against the locally built `@gpuix/native@0.10.0` binding (ADR
`0003`) on the primitives worktree.

### 12.1 Results

| Run | Result |
| --- | ------ |
| `nub run --filter @gpuixui/primitives test` | **41 files / 567 tests green** (was 560; +7 element cases) |
| `nub run --filter @gpuixui/primitives test:runtime` | **23 files / 398 tests green** (was 386; +12 runtime cases) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run check` / `nub run lint` / `nub run test` | green (see the commit) |

What the runtime suite measured:

- `Checkbox`, `Switch`, `Slider` and `Select`: a tip opens on **hover and focus**.
- `Input`, `TextArea`, `NumberField`: a tip opens on **focus**; hover does not
  (the `<input>`/`<textarea>` host receives no `onMouseEnter` — measured again
  with a bare host beside a `div`: only the `div` fired).
- Every one of those controls carries the tip text as `aria-description`.
- The Slider's drag still reports a value inside the wrapper, and the Select's
  own click still opens its list.
- `Tooltip.style={{ width: 320 }}` paints the Slider's track at 320 px; without
  it the track was **16 × 32 px** in a column (the hugging-root collapse).

### 12.2 Both-direction proofs (each mutation measured, then reverted)

| Slice | Mutation | Failing observation |
| --- | -------- | ------------------- |
| A | `fieldHostProps` returns `onFocus: focus.onFocus` instead of composing the slot's | `opens a Tooltip on keyboard focus when its trigger is an Input` — `tipPainted` false |
| B | `Switch` drops `aria-description` | `carries the tip as the description...` — `Switch` description `undefined` |
| B | `Slider`'s composed `onMouseDown` stops calling `handlers.onPointerDown` | element case: `onPointerDown` called 0 times (the drag would not start) |
| C | `SelectTrigger` loses `{...passiveTriggerHandlers(slot)}` | `opens a Tooltip on hover when its trigger is a Select` — `tipPainted` false |

### 12.3 Deviations

- **`Slider` needs an explicit root width.** Discovered during the runtime
  proof: the handler fix made the tip open, but the slider collapsed. Fixed
  with the new `Tooltip.style` prop and documented; the Slider runtime case
  asserts the 320 px track so the caveat cannot silently regress.
- **Fields cannot hover.** This is a runtime limitation, not ours. The page
  states it with the measurement; no test pretends a hover opens a field tip.
