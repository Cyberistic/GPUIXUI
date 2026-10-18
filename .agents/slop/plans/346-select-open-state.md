# 346 — `Select`'s open state: a disabled field must close, and the wrapper must own open

**Phase:** C/F (Tier 1 truth pass) · **Owner:** primitives · **Depends on:**
`030`, `040`, `041`, `047`, `057`, `062`, `066`, `083`, `332`, `343`, `345` ·
**Status:** planned

## 1. The measured defect

`packages/primitives/src/components/Select.tsx` tracks the open list in one
private `useState` and never passes it back to GPUix:

```tsx
const [open, setOpen] = useState(false);
…
<GpuixSelect items={items} value={selected} onValueChange={…} onOpenChange={handlers.onOpenChange} …>
```

Two consequences, both measured on this host (real `TestRenderer`, locally built
`@gpuix/native@0.10.0`, ADR `0003`):

1. **A `Select` disabled while its list is open leaves the list painted.** A
   probe mounted a select, clicked the trigger (list painted `Apple`/`Pear`),
   then re-rendered the same select with `disabled` — the list stayed painted.
   GPUix's own `selectValue`/`moveActive` refuse while `disabled`, so the user
   is left with a menu whose rows cannot be chosen and cannot be dismissed by
   the pointer path that opened it. This is the class plan `332` fixed for the
   controls: native state outlives a `disabled` prop change.
   Measured: `runtime.paintedText()` was `[ 'Apple', 'Pear' ]` after the disable.

2. **The runtime's controlled open contract is unreachable.** GPUix's published
   `SelectProps` declares `open`, `defaultOpen` and `onOpenChange`; this wrapper
   declares none of them, so:
   - `<Select open />` is silently ignored — the probe rendered `open={true}`
     and the list was not painted (`paintedText()` was `[]`);
   - a consumer cannot open a select from code (a command palette, an "edit"
     button, a tour), which is the ordinary reason a headless overlay exposes
     controlled open;
   - the wrapper's `open` (chevron direction, trigger ring, placement) can
     disagree with the list the runtime paints, because only the runtime's
     internal state decides.

`docs/select.mdx` documents neither behaviour. It lists no controlled open and
does not say what a disabled select does to an open list.

## 2. The fix

Make the wrapper the owner of open, using the package's one controlled rule
(`core/state.ts` / `useControlState`), and derive a disabled select as closed.

### 2.1 Public props

```tsx
readonly open?: boolean;
/** Initial open state when uncontrolled. Defaults to closed. */
readonly defaultOpen?: boolean;
/** Called when the select asks to open or close. */
readonly onOpenChange?: (open: boolean) => void;
```

### 2.2 State

```tsx
const openState = useControlState(
  props.open,
  props.defaultOpen ?? false,
  props.onOpenChange,
);
// A disabled select is closed; the request also reaches a controlled parent so
// its state can agree with what the field paints (plan 346).
useEffect(() => {
  if (props.disabled === true && openState.value.current) openState.set(false);
}, [props.disabled, openState.value.current]);
const open = props.disabled !== true && openState.value.current;
```

- `open` is passed to `GpuixSelect` together with `onOpenChange={openState.set}`,
  so the runtime is controlled and its requests flow through our state. One
  state, one callback, no second `useState`.
- Uncontrolled: the trigger/Escape/outside press/commit change `openState`, the
  list follows, `onOpenChange` still fires (the caller asked for it).
- Controlled: a request calls `onOpenChange`, and the list changes **only when
  the parent supplies a new `open`** — the contract in
  `docs/component-api.md` §2.
- Disabled: the effect asks to close once. Uncontrolled closes; a controlled
  parent gets `onOpenChange(false)`, and the derived `open` keeps the list
  closed even if the parent ignores it. GPUix's close path then focuses the
  trigger; this path does not, because the trigger is disabled and has no tab
  stop.
- `SelectState.open` (the root style callback) and the chevron both read this
  derived value, so paint and behaviour cannot disagree.

### 2.3 What must not change

- The trigger's measured box and the list's `minWidth`/`maxHeight`/`side`
  (plans `062`, `066`, `068`, `335`, `336`) — the placement effect already
  depends on `open`; it now depends on the derived value.
- The focus contract: Escape/commit still return native focus to the trigger
  through GPUix's own close path (plan `083`).
- The disabled trigger keeps no tab stop and paints no ring (plans `089`, `332`).

## 3. Files to change

1. **`packages/primitives/src/components/Select.tsx`**
   - add the three props and their docstrings;
   - replace `useState`/`setOpen` with `useControlState`;
   - add the disabled close effect and the derived `open`;
   - pass `open` to `GpuixSelect`;
   - extend the file docstring with the open-state contract.
2. **`packages/primitives/runtime/fields.runtime.test.tsx`**
   - four runtime cases (see §4); reuse `triggerOf`, `focusedId` and the existing
     option fixture. Add a small `ControlledSelect` test component with
     `useState` only for the controlled round trip.
3. **`packages/primitives/src/core/select.ts` + `select.test.ts`**
   - one pure rule, `selectOpen(requestedOpen, disabled)`, so "a disabled select
     is closed" is provable without a window;
   - one test with the three truth-table rows (see §4.2).
4. **`packages/primitives/docs/select.mdx`**
   - props table: `open`, `defaultOpen`, `onOpenChange`;
   - a short **Open state** section with a copyable controlled example
     (`useState` + open button) and the disabled rule;
   - Verification: name the four runtime cases;
   - Limitations: state that a controlled parent that ignores the close request
     keeps ownership (nothing else changes).
5. **`COMPONENTS.md`** — Select row: add **Open state (346)** with the measured
   before/after; update the runtime-count sentence and its plan list.
6. **`TODO.md`** — add a ticked primitives row for plan `346`; bump the section
   header.
7. **`.agents/slop/plans/README.md`** — add the `346` row.
8. **`PLAN.md`** — D37: a wrapper owns the overlay open state it exposes, and a
   disabled control is closed.

No new component, no new core module, no dependency.

## 4. Test plan

The tests must fail without the change, in independent directions.

### 4.1 Runtime (`runtime/fields.runtime.test.tsx`)

- **controlled round trip** — a local `ControlledSelect` holds `open` in
  `useState`, reports every request, and passes it back:
  - list absent, trigger click → list paints `Pear`, `seen` is `[true]`;
  - Escape from the focused option → list gone, `seen` is `[true, false]`.
- **a controlled `open` decides, not the runtime** — render `open={false}` with a
  recorder, click the trigger: `seen` is `[true]` and the list is **not**
  painted. Then re-render `open={true}`: it paints.
- **`defaultOpen`** — render `defaultOpen`, assert the list paints on mount,
  Escape closes it and reports `[false]`.
- **the regression: a select disabled while open** — open the list, re-render
  with `disabled`: `paintedText()` no longer contains `Pear`, the trigger is
  still painted, and the field reports no value change. Also render a
  **controlled** `open={true} disabled` select and assert the list is not
  painted and the recorder received `[false]`.

Failure directions (measure, then revert):

| Mutation | Must fail |
| --- | --- |
| remove the disabled effect and the `!== true` guard | the disable case: list still painted |
| do not pass `open={open}` to `GpuixSelect` | the controlled round trip (never opens) and the `open={false}` case (opens) |
| pass `open` but drop `onOpenChange` | the controlled round trip never opens (`seen` stays `[]`) |

### 4.2 Offline (`src/core/select.test.ts`)

- `selectOpen(true, true)` is `false`, `selectOpen(true, false)` is `true`,
  `selectOpen(false, false)` is `false`.
- Failure direction: return `requestedOpen` alone (ignore `disabled`) and the
  case fails on the first row.

### 4.3 Commands

```sh
nub run --filter @gpuixui/primitives test -- src/core/select.test.ts
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives check-types
nub run check
nub run lint
```

Expected before: offline 41 files / 567; runtime 23 files / 398.
Expected after: offline 41 files / 568; runtime 23 files / 403 (five new
runtime cases — the plan was written with four; the controlled/disabled pair
needed one case each, and one case covers the pure rule offline).

## 5. STOP conditions

Stop and report with the measurement rather than improvise if:

- GPUix's `Select` does not open when the wrapper passes `open={false}` and the
  trigger is clicked and our state then sets `true` (its controlled path is
  different from its `SelectProps` type);
- closing on disable leaves native focus on the **disabled trigger** or on a
  removed option (record `runtime.focused()`; a disabled field must not take
  focus);
- the list's painted width, side or capped height changes in any existing
  placement case (plans `062`, `066`, `068`, `335`, `336`);
- the Escape/commit focus-return cases (plan `083`) fail;
- `onOpenChange` is called more than once per transition — do not add a
  debounce or a guard to hide a double call;
- more than the expected one offline and four runtime tests change;
- `src/contract.test.ts`, `src/exports.test.ts` or `src/callback-names.test.ts`
  fails (the new callback is `onOpenChange`, which is allowlisted as an overlay
  callback — if it is not, fix the guard only after confirming the contract
  document lists overlay open callbacks under that name).

## 6. Acceptance

- `Select` accepts `open`/`defaultOpen`/`onOpenChange` and follows the package's
  controlled rule; the list, chevron, trigger ring and `SelectState.open` all
  read one derived value.
- A select that becomes disabled while its list is open paints no list, in both
  uncontrolled and controlled modes, and a controlled parent is asked to close.
- Four runtime cases and one element case cover the contract and fail in the
  directions named in §4.
- `docs/select.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index
  record the change and the measured counts.
- `nub run check`, `nub run lint`, the offline suite and the runtime suite are
  green.

## 7. Result

Landed on `agent/primitives`, 2026-10-18.

### 7.1 Measured before/after

| Observation | Before | After |
| --- | --- | --- |
| disabling an open select | `paintedText()` = `['Apple','Pear']` | no list painted; trigger still painted; no value reported |
| `<Select open />` (controlled) | ignored — `paintedText()` = `[]` | list paints; the parent decides every transition |
| `<Select defaultOpen />` | not a prop (uncontrolled only via interaction) | paints on mount; Escape closes and reports `[false]` |
| disabled + controlled `open` | list painted | no list; parent receives one `onOpenChange(false)` |

The pure rule is `selectOpen(requestedOpen, disabled)` in `core/select.ts`;
`Select` wires `open`/`defaultOpen`/`onOpenChange` through
`useControlState` and passes the derived value to `GpuixSelect`.

### 7.2 Both-direction proofs (each mutation measured, then reverted)

| Mutation | Failing tests (exact names) |
| --- | --- |
| remove the disabled-close effect | `closes the list when the select becomes disabled while open`; `closes a disabled select whose controlled open still says open` |
| `selectOpen` ignores `disabled` | the same two runtime cases, plus `closes a disabled select whatever the requested open says` (core) |
| stop passing `open={open}` to `GpuixSelect` | `lets a controlled open prop decide, not the runtime's request`; `opens on defaultOpen and closes on Escape`; `closes the list when the select becomes disabled while open` |
| stop passing `onOpenChange` to `GpuixSelect` | every open-path case: `opens a Select's list and paints its options`, `keeps the Select trigger ringed while its list is open`, `follows a controlled open state through the trigger`, … (the controlled state never updates, so nothing opens) |

### 7.3 Suites

| Run | Result |
| --- | --- |
| `nub run --filter @gpuixui/primitives test` | **41 files / 568 tests green** (was 567; +1 core) |
| `nub run --filter @gpuixui/primitives test:runtime` | **23 files / 403 tests green** (was 398; +5) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run check` / `nub run lint` / `nub run test` | green |

### 7.4 Deviations

- The planned element-tree case was replaced by the pure `selectOpen` rule and
  its test: the element renderer already received `open` before this change, so
  an element assertion there could not fail for this fix. The rule is the part
  that was missing, and it is provable without a window.
- One runtime case was added beyond the plan (five, not four): the controlled
  and uncontrolled disabled cases assert different things — paint with a stale
  controlled `open`, and the single close request.
- Closing on disable does not call GPUix's own `setOpen`, so focus is not
  returned to the trigger. That is deliberate: the trigger is disabled and has
  no tab stop; the list is unmounted and native focus is dropped with it.

