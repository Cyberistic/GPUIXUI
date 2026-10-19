# 605 — A focus-opened `Tooltip` does not dismiss on click for most single-root controls

**Phase:** F (verification truth) — **implementation**
**Depends on:** `060`, `067`, `071`, `341`, `345`, `347`, `596`, `604`
**Owns:** `packages/primitives` (`Tooltip`, its runtime suite and page),
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`. No other
workstream's paths.

## 1. The evidence

`Tooltip` documents that **a click dismisses the tip** (`docs/tooltip.mdx`:
"Hover, focus, click and Escape drive the tip by default"; "Owned by GPUix: … A
click dismisses it"). It also documents that the tip opens from the native-focus
tracker on the release build, when the trigger lands on `Tab` (plans `590`,
`596`), and that every single-root Tier 1 control is a slot trigger (plans `341`,
`345`, `399b`).

The runtime's `TooltipTrigger` composes two dismissal paths into the child it
clones (`@gpuix/react@0.10.0`, `dist/components/tooltip.js`):

- `onMouseDown` → `context.close()`
- `onClick` → the wrapper's own `onClick` (our `onDismiss`) then `context.close()`

Our wrapper passes `onDismiss` only as the slot's **`onClick`**
(`renderTooltip`). A component forwards a cloned prop only when it declares it:

| Trigger | `onMouseDown` (in `TriggerHandlers`) | `onClick` (our dismissal) |
| --- | --- | --- |
| `Button` / `IconButton` | forwarded | declared — it is the activation callback, so a click dismisses |
| `Toggle`, `Checkbox`, `Switch`, `Input`, `TextArea`, `NumberField`, `Select`, `Slider`, `ScrollArea` | forwarded (passive/inserted) | **dropped** — no `onClick` in the public props |

So on the pinned runtime, a tip opened by **focus** (not hover) stays painted
after a click on all of those controls: `context.close()` reaches
`onOpenChange(false)`, our `openState` becomes `false`, but the derived `open`
is `openState.current || focusedOpen` and `focusedOpen` remains true because the
trigger still holds focus and `dismissed.current` was never set. The pointer is
still over the trigger, so hover is not the explanation; the focused tip is.

The harness measures this through `allText()` — the same signal the existing
`overlay-trigger.runtime.test.tsx` uses ("closes a hovered Tooltip when its
Button trigger is clicked"). Only the **Button** case exists today, which is why
the class is invisible.

## 2. The rule

**A dismissal is wrapper state, and the press edge differs by host.** The
runtime's own close cannot carry it: the wrapper's derived focus-open is not in
the runtime's open state, and the runtime's press close in the same dispatch is
computed from the previous frame (measured). Two measured host facts decide the
wiring:

| Host | Edges it receives from `runtime.click` |
| --- | --- |
| `div` (Button, Toggle, Checkbox, Switch, Slider, Select trigger, ScrollArea, InfoTip) | enter, leave, down, up, click |
| native `<input>` / `<textarea>` (Input, TextArea, NumberField) | **click only** |

So the wrapper keeps two dismissal states — `focusDismissed` (cleared when
focus leaves) and `hoverDismissed` (cleared only after a real leave and the
runtime's delayed close) — and derives:

```tsx
const open =
  openState.value.mode === "controlled"
    ? openState.value.current
    : (openState.value.current && !hoverDismissed) ||
      (focusOpen && !focusDismissed);
```

`onDismiss` sets both. `onMouseDown` is the press edge on a `div` host;
`onClick` is the only edge a text host has, so `Input`, `TextArea`
(`FieldProps`) and `NumberField` gain a host `onClick` forwarded to the input.
`Select` needs neither: its trigger is a `div` (the passive `onMouseDown` already
reaches it).

- The runtime still closes and still reports through `onOpenChange`; the gates
  only stop the wrapper from repainting a tip the runtime no longer owns.
- A **controlled** `open` is unchanged: the parent owns the value, and the
  runtime's own close reports `false` from a fresh frame.
- A hovered tip reopens after the pointer leaves (`onLeave` marks outside; the
  runtime's 80 ms close then clears `hoverDismissed`) and enters again.
- `ScrollArea` is excluded from the focus matrix: its imperative `ref` is the
  documented slot exception (plan `596`), so it has no focus-open tip to dismiss.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/components/Tooltip.tsx` | two dismissal states, press/enter/leave wiring, the gated `open` value |
| `packages/primitives/src/components/Input.tsx` | `FieldProps.onClick` forwarded as the host click (covers `TextArea` through the shared props) |
| `packages/primitives/src/components/NumberField.tsx` | the same host `onClick` on the inner input |
| `packages/primitives/src/components/*.test.tsx` | the slot-handler cases gain the click assertion |
| `packages/primitives/runtime/tooltip-dismiss.runtime.test.tsx` | **new** matrix: focus-open then click on every single-root trigger, plus the hover reopen |
| `packages/primitives/docs/tooltip.mdx` | § Keyboard explains the two edges; the Verification list names the matrix |
| `packages/primitives/docs/{input,textarea,number-field}.mdx` | the new `onClick` row/prose |
| `packages/primitives/README.md` | the runtime test-file count |
| `COMPONENTS.md` | Tooltip row records plan `605` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/605-tooltip-click-dismiss.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

No change to `core/`, no new runtime dependency, no second dismissal state
machine beyond the two booleans.

## 4. Test plan

**Runtime — new `runtime/tooltip-dismiss.runtime.test.tsx`.** One fresh window
per case (the fixture unmounts every window), the tip `side="bottom"`,
`testId="tip"`, and a `Surface` frame. Each case:

1. mount `<Tooltip content="A hint"><Trigger testId="target" … /></Tooltip>`;
2. `focusNext()`, `flush()`, `await settleFocus()`;
3. assert the trigger holds focus **and** the tip is painted (`allText()`
   contains the hint);
4. `click("target")`, `flush()`;
5. assert the tip is **no longer** painted, while focus still names `target`.

Controls: `Button`, `IconButton`, `Toggle`, `Checkbox`, `Switch`, `Input`,
`TextArea`, `NumberField`, `Select`, `Slider`, and `InfoTip`. A `Slider` needs
the documented root width (`style={{ width: 320 }}`, plan `345`). The matrix
reads the host that takes focus (`target`, `target-input` for `NumberField`,
`target-trigger` for `Select`) and clicks that element. A final case covers the
hover path: dismiss, leave, wait out the runtime's 80 ms close, re-enter.

The **failure directions** are the reverting proofs:

- make `onDismiss` a no-op → all eleven focus cases fail by name, including
  `Button` and `InfoTip`: the runtime's own close is not the fix.
- keep the wrapper and drop the three host `onClick` forwardings → exactly
  `Input`, `TextArea` and `NumberField` fail by name.

**Offline.** The existing slot-handler cases in `fields.test.tsx` and
`NumberField.test.tsx` gain the click assertion, so the element-tree suite also
protects the forwarding. The `docs`/contract suites must stay green; the new
`onClick` is a host prop like `onKeyDown`.

**Commands.**

```sh
nub run --filter @gpuixui/primitives test:runtime -- runtime/tooltip-dismiss.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime -- runtime/overlay-trigger.runtime.test.tsx runtime/info-tip.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
```

## 5. STOP conditions

- Stop if the pre-fix matrix passes for `Checkbox`: the dismissal path is not
  the one described here; report the measured events and do not add a prop.
- Stop if `onMouseDown` on `TooltipTrigger` **replaces** the child's own
  mousedown (a Slider must still start a drag, a Select must still open): that
  is a slot-composition defect, and the fix belongs in how the handlers are
  composed, not in a component.
- Do not add `onClick` to `TriggerHandlers`: `Button` already owns that name as
  the public activation callback, and two meanings on one prop is the bug. Add
  the host prop only to the controls whose native host delivers no press edge.
- Do not clear the dismissal on pointer entry: a one-gesture click can deliver
  the entry **after** the press (measured), which re-opened the tip.
- Do not weaken the cases to hover: the defect is the focus path, and the
  existing Button hover case already covers the pointer-only path.
- Do not edit a runtime file to make it pass; measure and report.

## 6. Acceptance

- The new matrix is green on the release-tag build; the two failing directions
  above are observed and recorded.
- Clicking a trigger that holds focus closes its tip; keyboard focus, Escape,
  pointer-leave and the controlled `open` contract are unchanged.
- Offline, scoped runtime, `nub run check`, `nub run lint` are green; the page,
  inventory and plan index agree.

## 7. Result (2026-10-19)

- **Measured pre-fix** in the real `TestRenderer` on the release-tag build: a
  `Checkbox` focused with `Tab` painted the tip, and `click("target")` left it
  painted (`allText()` still contained the hint). The same shape reproduced on
  `Toggle`, `Switch`, `Input`, `TextArea`, `NumberField`, `Select`, `Slider` and
  even `Button`/`IconButton`/`InfoTip` **when the dismissal memory was removed**
  — the runtime's own close fires, but the wrapper's focus-open keeps the tip
  painted.
- **Host measurement:** a native `<input>` receives **only `click`** from
  `runtime.click` (no `onMouseEnter`, `onMouseDown`, `onMouseUp` or
  `onMouseLeave`). A `div` receives the full set. So the press edge differs by
  host, and the field family had to gain a host `onClick` to be dismissable at
  all.
- **Fix:** the wrapper keeps two dismissal states (`focusDismissed`,
  `hoverDismissed`), passes `onMouseDown` to the slot, and exposes `onEnter`/
  `onLeave` so a hovered tip reopens after the pointer leaves and the runtime's
  delayed close lands. `Input`/`TextArea` (`FieldProps`) and `NumberField` gain
  a host `onClick`, forwarded to the input (`fieldHostProps`, the number input).
  `Select` needs no change: its trigger is a `div`, so the existing passive
  `onMouseDown` reaches it.
- **Case count:** `runtime/tooltip-dismiss.runtime.test.tsx` — **12/12**
  (eleven single-root triggers plus the hover-dismiss/leave/re-enter pair).
  `overlay-trigger`, `info-tip`, `tooltip-side-cap`, `floating-resize` and
  `fields` re-ran green (5 files / 114 tests). Offline **59 files / 820 tests**;
  the full runtime suite **55 files / 778 tests** passed.
- **Failing direction 1** (make `onDismiss` a no-op): **11 focus cases fail**,
  including `Button`/`InfoTip` — the runtime's close alone is not the fix.
- **Failing direction 2** (keep the wrapper, drop the three host `onClick`
  forwardings): exactly `Input`, `TextArea` and `NumberField` fail by name.
- `ScrollArea` is excluded from the focus matrix: its imperative `ref` is the
  documented slot exception, so its tip has no focus-open path to dismiss. Its
  pointer path uses the same passive `onMouseDown` as the other `div` hosts.
- The Effect-enforcer warned about local `useState`/`useEffect`; this is
  component-private tooltip UI state with no other reader, which the advisory
  itself allows. No Atom/service is warranted.
