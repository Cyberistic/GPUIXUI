# 347 — `Tooltip`'s open state: the wrapper owns what it measures, and the runtime's contract is reachable

**Phase:** C/F (Tier 1 truth pass) · **Owner:** primitives · **Depends on:**
`030`, `040`, `041`, `047`, `060`, `067`, `071`, `073`, `083`, `095`, `098`,
`324`, `335`, `336`, `341`, `345`, `346` · **Status:** planned

## 1. The defect

`packages/primitives/src/components/Tooltip.tsx` tracks whether the tip is open
in a private `useState(false)`; the only thing it tells GPUix is
`onOpenChange={setOpen}`. `TooltipProps` exposes `delay` and placement, and
nothing about open.

GPUix 0.10.0's published `Tooltip` declares the whole controlled contract
(`node_modules/@gpuix/react/dist/components/tooltip.d.ts:13-21`):

```ts
export interface TooltipProps extends Omit<Props, "children"> {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  disableHoverableContent?: boolean;
}
```

Consequences, all of the same class plan `346` fixed on `Select`:

1. **A consumer cannot open a tip from code.** A one-time hint, a product tour
   or a "the shortcut moved here" callout is the ordinary reason a headless
   overlay publishes controlled open. `<Tooltip open>` does not type-check, and
   if it were passed it would be dropped by the component boundary.
2. **Hover and focus are the only owners.** A consumer that wants the tip open
   while it walks a tour has to fake a pointer or focus event.
3. **The wrapper can disagree with what it paints.** `open` decides the
   measurement effect (`useLayoutEffect(..., [renderer, open])`) and therefore
   the tip's side and centre offset, but the runtime's internal state is what
   paints the tip. Two owners for one fact is the exact shape of plan `346`'s
   `Select` bug.
4. **`disableHoverableContent` is unpublished by the wrapper.** GPUix supports
   it (a tip that closes the moment the pointer leaves the trigger, so its
   content cannot be hovered), and a consumer with an interactive-looking tip
   has no way to ask for it.

`docs/tooltip.mdx` documents none of this; its Limitations row says "Open/close
timing is GPUix's; this wrapper only sets the delay", which is true today and
stops being true with this fix.

## 2. The fix

Make the wrapper the owner of open, through the package's one controlled rule
(`core/state.ts` / `useControlState`), and pass the resolved value back to
GPUix so it is controlled too. This is the `Select` shape from plan `346`.

### 2.1 Public props

```tsx
/** Whether the tip is painted. Supplying it makes the tip controlled. */
readonly open?: boolean;
/** Initial open state when uncontrolled. Defaults to closed. */
readonly defaultOpen?: boolean;
/** Called when the tooltip asks to open or close. */
readonly onOpenChange?: (open: boolean) => void;
/**
 * Close as soon as the pointer leaves the trigger, so the tip's own surface
 * cannot be hovered. Defaults to the provider's value (`false`).
 */
readonly disableHoverableContent?: boolean;
```

### 2.2 State

```tsx
const openState = useControlState(
  props.open,
  props.defaultOpen ?? false,
  props.onOpenChange,
);
const open = openState.value.current;
```

`open` is passed to `GpuixTooltip` together with
`onOpenChange={openState.set}`, so:

- uncontrolled: hover, focus, click and Escape reach `openState.set`, and the
  wrapper's measurement effect follows the same value that paints the tip;
- controlled: a request calls `onOpenChange`, and the tip changes only when the
  parent supplies a new `open` — the contract in `docs/component-api.md` §2;
- no second `useState`, one owner.

`disableHoverableContent` is forwarded unchanged to `GpuixTooltip`.

`renderTooltip` (the pure element tree) forwards the **resolved** `open`, the
request callback and `disableHoverableContent`. It does not forward
`defaultOpen`: the wrapper has already resolved it into `open`, so passing both
would give the runtime a second source of truth.

### 2.3 A measurement pass while closed

The side and the centre offset are decided from the trigger's measured box, and
a controlled tip can open with no pointer or focus event to trigger a
measurement. The existing layout effect already measures the root on **every**
`open` transition including mount (`open === false`), and the tip only while it
is painted; this plan keeps that shape and states it in the file docstring. No
new measurement mechanism, no resize observer.

The tip's own box is still measured only while open (there is nothing to measure
while closed), and the centre offset is still applied in a layout effect before
paint (plan `095`). A controlled tip therefore opens on the side its trigger's
real box allows on the first painted frame.

### 2.4 What must not change

- Every placement rule: the root hug, `align` mapping on the layer's own axis,
  the vertical/horizontal fit decisions, the `maxHeight`/width behaviour
  (plans `060`, `067`, `095`, `098`, `335`, `336`).
- The accessibility contract: a string tip is the trigger's `aria-description`,
  the open tip is a named `role="tooltip"` node (plan `071`), and `InfoTip`
  keeps owning the focusable named trigger (plan `073`).
- The slot-trigger contract: hover/focus/click/Escape from GPUix's trigger
  plumbing still arrive through the components' `TriggerHandlers` (plans `341`,
  `345`).
- `InfoTip`'s public API. It composes `Tooltip` and keeps working; it does not
  gain open props in this plan.

## 3. Files to change

1. **`packages/primitives/src/components/Tooltip.tsx`**
   - add the four props and their docstrings;
   - replace `useState(false)` with `useControlState`, derive `open`;
   - pass `open`, `onOpenChange={openState.set}` and
     `disableHoverableContent` through `renderTooltip` to `GpuixTooltip`;
   - extend `TooltipHandlers`/`renderTooltip` with the resolved `open` and the
     pass-through flag;
   - extend the file docstring with the open-state and measurement contract.
2. **`packages/primitives/src/components/Select.test.tsx`** (the `Tooltip`
   describe) — two element-tree cases: the resolved `open` and
   `disableHoverableContent` reach the host root, and `onOpenChange` is the
   handler the wrapper supplies.
3. **`packages/primitives/runtime/fields.runtime.test.tsx`** — five runtime
   cases (see §4.1). Add a local `ControlledTooltip` test component with
   `useState` only for the controlled round trip.
4. **`packages/primitives/docs/tooltip.mdx`**
   - props table: `open`, `defaultOpen`, `onOpenChange`,
     `disableHoverableContent`;
   - an **Open state** section with a copyable controlled example (a one-time
     hint opened by a button) and the controlled rule;
   - Verification: name the new runtime cases;
   - Limitations: replace "Open/close timing is GPUix's" with the split — the
     interactions are GPUix's, the open state is the wrapper's, and a
     controlled parent decides.
5. **`COMPONENTS.md`** — Tooltip row: add **Open state (347)** with the measured
   before/after.
6. **`TODO.md`** — tick the Tooltip open-contract row; keep the section header
   count current.
7. **`.agents/slop/plans/README.md`** — add the `347` row.
8. **`PLAN.md`** — D38: an overlay wrapper owns the open state it exposes (the
   `Select` rule applied to `Tooltip`), and the wrapper measures its trigger
   while the tip is closed.

No new component, no new core module, no dependency.

## 4. Test plan

The tests must fail without the change, in independent directions.

### 4.1 Runtime (`runtime/fields.runtime.test.tsx`)

1. **controlled round trip** — a local `ControlledTooltip` holds `open` in
   `useState`, reports every request and passes it back:
   - tip absent; hover the trigger → the tip paints and `requests` is `[true]`;
   - click the trigger → the tip is gone and `requests` is `[true, false]`.
2. **a controlled `open` decides, not the hover** — render `open={false}` with a
   recorder, hover the trigger: `requests` is `[true]` and the tip is **not**
   painted; then re-render `open={true}` and it paints.
3. **`defaultOpen`** — render `defaultOpen`, assert the tip paints on mount,
   focus the trigger and press Escape: the tip closes and reports `[false]`.
4. **`disableHoverableContent`** — hover the trigger, then hover the tip:
   - default: the tip is still painted (the runtime cancels its close);
   - `disableHoverableContent`: the tip is gone as soon as the pointer leaves
     the trigger.
5. **a controlled tip is placed from its trigger's box** — a trigger at the
   window's top edge with `<Tooltip open content>` paints its tip **below** the
   trigger (the failing direction is the unmeasured default `top`, which the
   runtime clamps over the trigger at `y 8..34`, plan `067` §1). This proves the
   measurement pass runs for a tip opened with no hover or focus event.

Failure directions (measure, then revert):

| Mutation | Must fail |
| --- | --- |
| drop `open={open}` from the `GpuixTooltip` call | the controlled round trip never opens; the `open={false}` case opens on hover; `defaultOpen` never paints |
| drop `onOpenChange={openState.set}` | every open path (hover, focus, Escape) leaves the tip in its previous state; the round trip reports nothing |
| drop `disableHoverableContent` | the flag case stays open while hovering the tip |
| stop measuring the root when closed (guard the effect on `open`) | the top-edge controlled case paints the tip over its trigger |
| keep the private `useState` beside `useControlState` | the controlled case: the tip paints against `open={false}` |

### 4.2 Offline (`src/components/Select.test.tsx`)

- `renderTooltip({ content, children, open, onOpenChange, disableHoverableContent }, theme)`
  produces a root with `open` and `disableHoverableContent` set and the
  callback attached;
- the existing description/name, hug and placement cases stay green.

Failure direction: stop forwarding either prop and the matching element case
fails by property name.

### 4.3 Commands

```sh
nub run --filter @gpuixui/primitives test -- src/components/Select.test.tsx
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives check-types
nub run check
nub run lint
```

Measured baseline (2026-10-18, this host): offline **41 files / 568 tests**,
runtime **23 files / 403 tests**. Expected after: offline **568 + 1 or 2**,
runtime **403 + 5**.

## 5. STOP conditions

Stop and report with the measurement rather than improvise if:

- GPUix's `Tooltip` does not paint when the wrapper passes `open={true}` (its
  controlled path disagrees with its published `TooltipProps` type);
- `onOpenChange` is called more than once per transition (do not add a debounce
  or a guard to hide a double call);
- the controlled tip's first painted frame is placed on the wrong side and no
  layout-effect measurement can correct it before paint — record the frame and
  the bounds;
- any existing tooltip placement, description/name or slot-trigger case
  (plans `060`, `067`, `071`, `095`, `098`, `335`, `336`, `341`, `345`) fails;
- hovering the tip cannot be simulated (the runtime does not dispatch the
  trigger's `onMouseLeave`), so `disableHoverableContent` has no observable
  difference — record the probe and leave the prop exposed with a measured
  limitation instead of inventing a test;
- more than two offline and five runtime tests change;
- `src/contract.test.ts`, `src/exports.test.ts` or `src/callback-names.test.ts`
  fails. `onOpenChange` is already allowlisted (plan `346`, `Select`); if it is
  not, fix the guard only after confirming `docs/component-api.md` names overlay
  open callbacks `onOpenChange`.

## 6. Acceptance

- `Tooltip` accepts `open`/`defaultOpen`/`onOpenChange`/`disableHoverableContent`
  and follows the package's controlled rule; the same derived `open` drives the
  paint and the measurement.
- A `Tooltip` opened from code is placed from its trigger's measured box.
- Two element-tree cases and five runtime cases cover the contract and fail in
  the directions named in §4.
- `docs/tooltip.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index
  record the change and the measured counts.
- `nub run check`, `nub run lint`, the offline suite and the runtime suite are
  green.

## 7. Result

Landed on `agent/primitives`, 2026-10-18.

### 7.1 Measured before/after

| Observation | Before | After |
| --- | --- | --- |
| `<Tooltip open>` | not a prop — the value had no path through the wrapper | the tip paints; the parent decides every transition |
| `<Tooltip defaultOpen>` | not a prop | the tip paints on mount; Escape reports `onOpenChange(false)` |
| hover with a controlled `open={false}` | hover always opened the tip | the request arrives (`[true]`) and nothing is painted |
| `disableHoverableContent` | not a prop | the tip closes when the pointer leaves the trigger; default stays open while the tip is hovered |
| a tip opened from code near the top edge | unreachable | paints below its trigger, from the trigger box measured while closed |

The measured click sequence on a controlled tip is `true, false, true,
false`: hover opens, the mouse-down closes, the click's focus re-requests open,
and the click's own close is the last word. The paint follows the last request;
no duplicate transition was added to squash the intermediate one.

### 7.2 Both-direction proofs (each mutation measured, then reverted)

| Mutation | Failing tests (exact names) |
| --- | --- |
| drop `open={open}` from the runtime call | `lets a controlled open prop decide, not the hover`; `opens on defaultOpen and closes on Escape`; `places a controlled Tooltip from its trigger's measured box` (3) |
| drop `onOpenChange={handlers.onOpenChange}` | `follows a controlled open state through hover and click`; `lets a controlled open prop decide…`; `opens on defaultOpen and closes on Escape`; `closes a hover-disabled Tooltip…`; `places a controlled Tooltip…`, plus the three existing centre cases (8) |
| drop `disableHoverableContent` | `closes a hover-disabled Tooltip when the pointer leaves the trigger` (1) |
| make the measurement effect a no-op | `places a controlled Tooltip from its trigger's measured box` plus the eight existing placement cases (`opens a Tooltip below a trigger at the window's top edge`, both centre cases, both horizontal-fit cases, both vertical-fit cases, `centres a Tooltip on its trigger…`) (9) |
| force the derived `open` to `false` | every tooltip case that opens (the run listed 20 before its output was truncated) |

### 7.3 Suites

| Run | Result |
| --- | --- |
| `nub run --filter @gpuixui/primitives test` | **41 files / 570 tests green** (was 568; +2 element cases) |
| `nub run --filter @gpuixui/primitives test:runtime` | **23 files / 409 tests green** (was 403; +6) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run check` / `nub run lint` / `nub run test` | see §7.5 |

### 7.4 Deviations

- Six runtime cases, not five: "the tip stays open while hovered" and "the
  flag closes it" are independent observations (the default is what the flag
  changes), so they are two cases rather than one.
- The planned mutation "keep the private `useState` beside `useControlState`"
  is not expressible after the refactor; it was replaced with "force the
  derived `open` to `false`", which proves the resolved value drives the paint.
- The controlled-placement case does not distinguish "measured while closed"
  from "measured in the open frame" — a layout effect corrects before paint
  either way. The no-op-measurement mutation is the honest guard, and it is
  recorded above.

### 7.5 Gate

`nub run check`, `nub run lint` and `nub run test` are run after the docs and
inventory updates; the result is recorded in the commit message.
