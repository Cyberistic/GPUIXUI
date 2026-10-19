# 590 — Restore focus rings on the release runtime with a native-focus tracker

**Phase:** F (integration and truth)
**Owner:** primitives
**Depends on:** 030, 041, 083, 084, 089, 093, 332, 583
**Status:** done — the tracker landed; the 19-case focus matrix and the disabled
ring cases are green on the release-tag build

---

## 1. The bug

Plan `583` measured that the pinned `@gpuix/native@0.10.0` release build moves
native focus but dispatches **no `onFocus`/`onBlur`**:

```
focusNext() -> getFocusedElementId() === 1
             -> onFocus 0, onBlur 0
```

Every control in this package paints its ring from `useFocus`'s event state, so
on the runtime a consumer installs **no control paints a focus ring** — a WCAG
2.4.7 failure. The 19-case focus matrix fails 19/19 there and passes on the
main-derived build.

Plan `583` designed the fix and deferred it (§7). The runtime cannot be upgraded
(the release is the consumer-installable version), so the ring must be restored
client-side. The renderer **does** expose the truth synchronously through
`getFocusedElementId()`; the missing piece is a render trigger.

## 2. The design

One provider polls the renderer for the focused host id and publishes it through
React context. Controls compare that id with the id of the element that holds
native focus. Event-based focus state stays as the primary path (a runtime that
dispatches events keeps working, and the state is immediate there); the tracked
id is an **additional** source, never a replacement.

```
ThemeProvider
  └─ NativeFocusProvider        poll getFocusedElementId() every 50 ms
       └─ app tree
            Button  useFocus() -> focused = eventFocused || ownId === trackedId
```

Cost, recorded and accepted: at most 20 renderer queries per second per window,
and up to 50 ms of ring latency on a runtime with no focus events. Both are
documented in `COMPONENTS.md` and the five focus pages that currently say the
ring cannot paint.

## 3. Files to create or change

### 3.1 New: `packages/primitives/src/components/native-focus.tsx`

- `NATIVE_FOCUS_POLL_MS = 50`.
- `NativeFocusProvider({ children })`:
  - `const { renderer } = useGpuix()`.
  - `useState<number | null>(null)`.
  - `useEffect`: read `renderer?.getFocusedElementId?.() ?? null`; set state only
    when the value changed; `setInterval(read, NATIVE_FOCUS_POLL_MS)`; clear on
    unmount and when `renderer` changes.
  - Render `NativeFocusContext.Provider value={focusedId}`.
- `useNativeFocusId(): number | null | undefined` — `undefined` means "no
  provider", so an element-tree render without a provider behaves exactly as
  today.
- JSDoc must state the measured reason (plan 583) and the cost.

### 3.2 `internal.ts`

- `FocusState` gains `readonly ref?: (instance: PublicInstance | null) => void`.
- `useFocus(initiallyFocused = false, ownId?: () => number | undefined)`:
  - keeps the existing event state;
  - owns a `useRef<number | null>` and returns a stable callback `ref` that
    stores `instance?.id`;
  - `focused = eventFocused || (tracked !== null && hostId !== undefined && tracked === hostId)`,
    where `hostId = ownId?.() ?? ownRef.current`;
  - returns `ref` in the state object.
- Add `trackedFocusIndex(ids, tracked)` helper in `internal.ts` (the UI glue
  module; the groups already keep their index → host-id maps there): given a
  `ReadonlyMap<number, number>` of index → host id and a tracked id, return
  `Option<number>` of the matching index. Implement with `effect/Array` and test
  it in `src/components/native-focus.test.ts` beside `isTrackedFocus`.
- Re-export `useNativeFocusId`.

### 3.3 `ThemeProvider.tsx`

Wrap the theme provider's children in `<NativeFocusProvider>`. The theme
context stays outermost so a missing theme still throws with its own message.

### 3.4 Wire every focusable control

Attach the ref to the element that actually takes native focus, and pass the
id source where a ref already exists:

| File | Element | Wiring |
| ---- | ------- | ------ |
| `Button.tsx` | root `div` | replace its private `useState` pair with `useFocus()`; pass `focus` to `renderButton`; `ref={focus.ref}` |
| `Toggle.tsx` | root `div` | `ref={focus.ref}` |
| `Checkbox.tsx` | root `div` | `ref={focus.ref}` |
| `Switch.tsx` | root `div` | `ref={focus.ref}` |
| `InfoTip.tsx` | trigger `div` | `ref={focus.ref}` |
| `Input.tsx` | `<input>` | `fieldHostProps` includes `ref: focus.ref` |
| `TextArea.tsx` | `<textarea>` | inherits via `fieldHostProps` |
| `NumberField.tsx` | `<input>` | `useFocus(auto, () => inputId.current ?? undefined)`; keep `registerInput` |
| `Select.tsx` | trigger | `useFocus(false, () => trigger.current ?? undefined)`; no extra ref |
| `Slider.tsx` | track `div` | `useFocus(false, () => trackId.current ?? undefined)` |
| `ScrollArea.tsx` | root `div` | `useFocus(false, () => root.current?.id)` |
| `OTPField.tsx` | per cell | merge `focusedIndex` with the tracked id from `cellIds` |
| `Rating.tsx` | per star | merge with `itemIds` |
| `RadioGroup.tsx` | per option | merge with `itemIds` |
| `ToggleGroup.tsx` | per item | merge with `itemIds` |
| `CheckboxGroup.tsx` | per row | add `rowIds = useRef<Map<number, number>>(new Map())`, a `registerRow` handler, `ref` on each row, and merge with the tracked id |

For the four data-driven groups, the merged value is what the ring, the
`focused` item state and `moveFrom` read — the keyboard cursor and the ring must
not diverge (plan 359). Event state still wins while it is set.

`render*` functions stay pure: the new ref is passed through `FocusState.ref`
(or the existing handler object), not read from context inside the renderer.

### 3.5 `runtime/fixture.tsx`

Add:

```ts
export const FOCUS_SETTLE_MS = 70; // 50 ms poll + margin
export const settleFocus = () => sleep(FOCUS_SETTLE_MS);
```

The header comment must say why a real timer is needed (a JS interval; GPUI's
clock does not drive it).

### 3.6 Runtime suites that assert a ring

Add `await settleFocus()` after the action that moves focus and before reading
the tree:

- `runtime/focus-ring.runtime.test.tsx` (both cases);
- `runtime/disabled.runtime.test.tsx` (the ring half);
- `runtime/state-style.runtime.test.tsx` (the focused-state case);
- `runtime/auto-focus.runtime.test.tsx` (the mount ring case).

Tests that read `runtime.focused()`/`getFocusedElementId()` need no wait: that
value is the renderer's, not React's.

### 3.7 Docs and ledgers

- `docs/gpuix-capabilities.md` §Focus events: keep the event verdict `partial`,
  add the tracker: rings paint, up to 50 ms late, through
  `getFocusedElementId()`; tooltip-on-focus still depends on the runtime's own
  events.
- The 19 `**Release-runtime focus:**` notices: replace "paints no focus ring on
  a consumer install" with the measured tracker sentence. Keep the link.
- `src/docs-focus-events.test.ts`: assert the new sentence and that the pages do
  not claim event-driven rings.
- `README.md`: replace "the ring cannot paint" with the tracker contract and its
  cost.
- `COMPONENTS.md`: the focus-matrix paragraph, the Tier 1 preamble and the
  capability caveat gain the tracker and its 20 queries/s / 50 ms cost.
- `TODO.md`: add the task under the primitives workstream and tick it.
- `.agents/slop/plans/README.md`: index this plan.

## 4. Commands and expected results

```sh
# Scoped live proof, from packages/primitives
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-ring.runtime.test.tsx \
  runtime/disabled.runtime.test.tsx \
  runtime/state-style.runtime.test.tsx \
  runtime/auto-focus.runtime.test.tsx
# expected: every case green on the store's release-tag build

nub run --filter @gpuixui/primitives test
# expected: all offline tests green

nub run check
# expected: exit 0
```

## 5. Test plan (two directions)

1. **Provider removed** (or polling disabled): the four suites fail by case name
   on the release build (`the control painted no ring`). Restore: green.
2. **One control not wired** (drop `ref={focus.ref}` from `Switch`): the
   `Switch` case fails; every other case stays green.
3. **Item wiring** (drop the `cellIds` merge in `OTPField`): the `OTPField` case
   fails by name; the group still reports focus.
4. **Event path preserved**: on a runtime that dispatches `onFocus`, the ring is
   immediate (the existing event state is unchanged). The element-tree suites
   continue to pass a `FocusState` object with no `ref`.
5. **Offline guard for the helper**: `src/components/native-focus.test.ts` covers
   `isTrackedFocus` and `trackedFocusIndex` (match, no match, no provider), and
   fails when the id comparison is removed.

## 6. STOP conditions

- Stop and report if `renderer.getFocusedElementId` is absent from the pinned
  `TestRenderer` (it is present; measured in the probe).
- Stop if the poll cannot trigger a React re-render on this runtime — the
  measured probe (`getFocusedElementId` read in a 20 ms interval changed the
  painted readout) says it can.
- Stop if wiring a control needs a public prop change (a `ref` prop on the
  package API). It does not: the ref is internal and exposed through
  `FocusState`.
- Do **not** claim the release runtime now dispatches focus events. It does not;
  the tracker reads the renderer's state instead.

## 7. Acceptance

- All 19 focus-matrix cases and the disabled ring cases pass on the release-tag
  build with `settleFocus`, and fail when the provider is removed.
- The four suites' mutation directions are recorded in the completion note.
- Offline tests, `check`, `lint` and `fmt` are green.
- The docs state what the tracker does, its cost, and what it does **not** fix
  (a runtime-internal focus behaviour such as the headless tooltip's open on
  focus).

## 8. Result

Landed. `NativeFocusProvider` is mounted by `ThemeProvider` and every focusable
surface is wired:

- `Button`, `Toggle`, `Checkbox`, `Switch`, `InfoTip` and `ScrollArea` attach
  `focus.ref` to their focus root;
- `Input`/`TextArea` forward it through `fieldHostProps`; `NumberField` uses its
  input id, `Select` its trigger id and `Slider` its track id;
- `OTPField`, `Rating`, `RadioGroup`, `ToggleGroup` and `CheckboxGroup` merge
  their event focus index with `trackedFocusIndex`; `RangeSlider` maps the two
  thumb ids back to `0 | 1`.

Measured on the release-tag build, 2026-10-19:

```
runtime/focus-ring.runtime.test.tsx   19/19 pass
runtime/disabled.runtime.test.tsx     46/46 pass (scoped run)
runtime/state-style.runtime.test.tsx  pass
runtime/auto-focus.runtime.test.tsx   pass
full runtime suite                    50 files / 721 tests, 647 passed / 74 failed
```

The failing set is now the measured geometry class and the runtime-internal
tooltip open-on-focus; `focus-ring` and `disabled` leave it. Offline is 57
files / 801 tests.

Both directions:

1. removing `NativeFocusProvider` from `ThemeProvider` fails **19/19**
   focus-matrix cases;
2. removing `ref={focus.ref}` from `Switch` fails **only** the `Switch` case.

The matrix's shadow comparison now ignores the renderer's `inset`
normalisation: the release build reports the five authored fields while the
main-derived build adds `inset: false`; a `Schema.Record` decodes both sides.
No focus assertion was re-baselined — the ring is present in both.

The one cost is recorded in `COMPONENTS.md` and the README: at most 20
`getFocusedElementId()` queries per second per window and up to 50 ms of ring
latency. The `InfoTip`/`Tooltip` keyboard-open case still fails on this build,
because that open path lives inside GPUix's own tooltip and depends on the
events the runtime does not dispatch; the docs state it.
