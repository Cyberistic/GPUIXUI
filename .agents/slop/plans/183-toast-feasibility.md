# 183 — Tier 2 feasibility: a toast viewport in the real runtime

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | B (feasibility) → C/D (toasts) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `155`, `156`, `157`, `159`, `177`, `182` |
| Closes | `COMPONENTS.md` → Toasts / notifications: the runtime facts behind the shipped `ToastViewport` |

## 1. Question

`@gpuixui/components` has a `ToastProvider` + `ToastViewport` on
`agent/components` (not on the integration branch). Its viewport is built on
five runtime mechanisms this worktree has **never measured**:

1. a viewport positioned with `position: "absolute"` plus **`right` and
   `bottom`** — every existing probe uses `left`/`top` only (`layout-flex`,
   `floating-placement`, `workspace-panes`);
2. `pointerEvents: "none"` on the viewport with `pointerEvents: "auto"` on each
   card — a page click must pass through the viewport while a card stays
   clickable;
3. paint order as the only stacking model (no `zIndex`): the viewport rendered
   **last** covers an app control at the same coordinates;
4. a **per-toast auto-dismiss timer** (a JS/Effect timer, not the GPUI dispatcher
   clock) plus an `AnimatePresence` exit whose removal must not touch the other
   cards;
5. the accessibility contract: `role="status"` + `aria-label` on the viewport,
   and a dismiss control that is reachable by Tab while the viewport ignores the
   pointer.

Optional but valuable: whether `onMouseEnter`/`Leave` still reach a card inside
a `pointerEvents: "none"` viewport (the shipped card pauses on hover).

Without these facts the component cannot claim its runtime behaviour; with them
the component workstream can merge the toast viewport on evidence instead of
types.

**Do not import `@gpuixui/components`.** It is not on the integration branch, and
this workstream does not edit another workstream's paths. The probe reproduces
the viewport's **mechanism** (same style properties, same paint order, same
status role) with local data, exactly as plan `179` did for the terminal.

## 2. Design

### 2.1 Files

```
apps/playground/src/scenarios/toast-state.ts          NEW  pure queue: push/dismiss/clear, max 3
apps/playground/src/scenarios/toast-state.test.ts     NEW  4 tests (cap, ids, dismiss one, clear)
apps/playground/src/scenarios/toast.tsx               NEW  `toast-lifecycle` scenario + view
apps/playground/src/scenarios/index.ts                EDIT import, register, add `toast` to PROBE_CAPABILITIES
packages/testing/src/smoke.ts                         EDIT add `"toast"` to CAPABILITIES
apps/playground/README.md                             EDIT scenario list + current suite count
COMPONENTS.md                                         EDIT the Toasts / notifications row
TODO.md                                               EDIT tick this task, add the follow-up ask
.agents/slop/plans/README.md                          EDIT index this plan
.agents/slop/plans/183-toast-feasibility.md           EDIT fill §7 after the run
```

No other file. No component package is touched.

### 2.2 The pure half (`toast-state.ts`)

```ts
export interface ToastDraft {
  readonly title: string;
  readonly durationMs: number;
}
export interface Toast {
  readonly id: number;
  readonly title: string;
  readonly durationMs: number;
}
export interface ToastState {
  readonly seq: number;
  readonly toasts: ReadonlyArray<Toast>;
}
export const emptyToasts: ToastState;
export const pushToast: (state: ToastState, draft: ToastDraft, max?: number) => ToastState;
export const dismissToast: (state: ToastState, id: number) => ToastState;
export const clearToasts: (state: ToastState) => ToastState;
```

Rules: ids are monotonic (`seq + 1`), never reused; pushing past `max`
(default `3`) drops the **oldest**; `dismissToast` removes exactly one; every
function returns a new state and never mutates. Use `effect/Array`.

### 2.3 The view (`toast.tsx`)

A root that fills the window, to mirror the shipped app root:

```tsx
const window = useWindowSize();
<div testId="toast-root" style={{ width: window.width, height: window.height,
     backgroundColor: theme.colors.background }}> ... </div>
```

- An app control under the stack: `toast-behind`, `position: "absolute"`,
  `right: 24`, `bottom: 24`, `width: 380`, `height: 56`, `onClick` increments
  `behind`. It sits exactly under the bottom card.
- A control away from the stack: `toast-action` (top-left) increments `action`.
- `toast-field`: a real `<input>` (the focus sentinel).
- `toast-show`: pushes `{ title: "Saved", durationMs: 5000 }`.
- `toast-show-short`: pushes `{ title: "Short", durationMs: 250 }`.
- `toast-clear`: clears the queue.
- A readout `toast-readout` with `count=<n> action=<n> behind=<n>
  dismissed=<title|none> hover=<id|none>`.
- The viewport is the **last child** of the root: `testId="toast-viewport"`,
  `role="status"`, `aria-label="Notifications"`, `position: "absolute"`,
  `right: 24`, `bottom: 24`, `display: "flex"`, `flexDirection: "column"`,
  `alignItems: "flex-end"`, `gap: 8`, `pointerEvents: "none"`.
- Each card: `testId={`toast-${id}`}`, `width: 380`, `height: 56` (fixed so the
  geometry arithmetic is exact), `pointerEvents: "auto"`, `onMouseEnter`/
  `onMouseLeave` update the hover readout, an `AnimatePresence` keyed by id with
  exit opacity over `EXIT_MS = 120`.
- The dismiss button: `testId={`toast-dismiss-${id}`}`, `tabIndex={0}`,
  `role="button"`, `aria-label="Dismiss"`, `onClick` dismisses that id.
- Each card schedules `setTimeout(onDismiss, durationMs)` in a `useEffect` and
  clears it on unmount. The timer is **real** time; GPUix's dispatcher clock does
  not move `setTimeout` (measured by `tooltip-open`, plan `159`).

The app's other tab stops (`toast-show`, `toast-clear`, `toast-action`,
`toast-behind`) get `tabIndex={-1}` so `focusNext()` from `toast-field` has
exactly one next stop: the dismiss button of the newest card.

### 2.4 Scenario `toast-lifecycle`, capability `toast`

The steps call `ctx.host.pauseMotion()` first, so an exit tween stays frozen
until `fastForwardMotion`.

| # | Check | Why |
| - | ----- | --- |
| 1 | `toast-root` is painted | the probe has a window-sized frame |
| 2 | one card is painted after `toast-show` | the queue renders |
| 3 | card right edge is 24px from the root's right edge | **`right` resolves** |
| 4 | card bottom edge is 24px from the root's bottom edge | **`bottom` resolves** |
| 5 | a second card paints above the first, `y` difference `56 + 8` | column stack with gap |
| 6 | the newest card's bottom edge is still the 24px inset | the stack grows upward |
| 7 | two distinct titles are painted | cards carry their own content |
| 8 | a fourth push leaves exactly 3 and the oldest title is gone | the queue bound |
| 9 | clicking a card's dismiss removes only it; `count` drops by one | per-card dismissal |
| 10 | the remaining top card moved down by `56 + 8` | reflow |
| 11 | `behind` is still `0` after the dismiss click | the card is hit above the app |
| 12 | clicking `toast-action` while cards are up increments `action` | the viewport is non-modal |
| 13 | after focusing `toast-field` and pushing, `focused()` is still `toast-field` | a toast never steals focus |
| 14 | `focusNext()` lands on the newest card's dismiss button | keyboard dismissal works |
| 15 | `escape` with focus in the app leaves `dismissed=none` | Escape is not a toast shortcut |
| 16 | `hover(card)` sets `hover=<id>` and moving to the app clears it | hover crosses `pointerEvents: none` |
| 17 | the short toast is still painted after its timer but reports `dismissed=Short` | the timer fired, the exit is frozen |
| 18 | the long toast is still painted at that moment | timers are per toast |
| 19 | after `fastForwardMotion(EXIT_MS)` the short card is gone and the long one remains | exit + identity |
| 20 | the a11y tree has a `Status` labelled `Notifications` while cards are up | viewport role |
| 21 | the a11y tree has a `Button` labelled `Dismiss` | the dismiss control is announced |
| 22 | `toast-clear` leaves `count=0` and no cards painted | clear-all |

Timing: after `toast-show-short`, `yield* Effect.sleep("350 millis")` (the timer
is 250ms, so a stalled host only makes it later, never earlier). Do **not** use
`host.advance` for the JS timer.

## 3. Commands and expected results

```sh
nub run --filter @gpuixui/testing test
# -> 4 files / 40 tests, all green (the new capability changes no existing contract)

nub run --filter playground test
# -> toast-state tests included, green

nub run --filter playground build
# -> tsc exits 0

nub apps/playground/dist/smoke/run.js --only toast-lifecycle
# -> "1/1 scenarios passed", toast=verified, exit 0

nub apps/playground/dist/smoke/run.js
# -> 51/51 scenarios passed, exit 0 (50 before this plan)

nub run check && nub run lint && nub run test
```

`nub run --filter playground smoke` collapses a non-zero child exit; observe the
built CLI's own code (`apps/playground/README.md` documents why).

## 4. Two-direction proofs

Run each mutation, keep the failing output, restore the file:

| Mutation | Must fail |
| -------- | --------- |
| change the dismiss `onClick` to a no-op | check 9 (`dismiss removes only its card`) |
| change the short card's `durationMs` to `5000` | check 17 (`the auto-dismiss timer fired`) |
| remove `role="status"` from the viewport | check 20 (`Status` node) |
| remove `pointerEvents: "auto"` from the card | checks 9 and 11 (the dismiss click never reaches the card) |
| change `right: 24` to `left: 24` | check 3 (right inset) |

If a mutation fails a *different* check than the one named, record the actual
check in §7 rather than editing the table to fit.

## 5. STOP conditions

- **`right`/`bottom` does not position the viewport** (checks 3/4 fail): record
  the measured bounds, do not fake the assertion. Then re-anchor the probe with
  an explicit `left`/`top` computed from `useWindowSize()` and document that the
  shipped viewport's `right`/`bottom` is **unsupported** — this is a real defect
  the components workstream must fix before merging. Keep the probe.
- **A child of `pointerEvents: "none"` never receives a click** even with
  `"auto"`: record it; replace the dismiss check with the strongest honest
  alternative (a keyboard dismissal via the reachable tab stop) and mark the
  pointer path unsupported.
- **`role="status"` is not exposed** with the expected role name: read the dump,
  record the actual role (or absence), and assert the measured value. A toast
  that is invisible to AT is a documented limitation, not a pass.
- **The JS timer cannot be observed** because the renderer does not flush React
  after `setTimeout`: first try `ctx.host.advance(0)` plus a second
  `Effect.sleep("50 millis")`; if it still does not flush, record it as a
  harness limitation and prove auto-dismiss through a pure rule only, removing
  checks 17–19 from the claim (never claim a timer that did not run).
- **`focusNext()` lands somewhere else**: record the actual focused `testId`;
  if the card is not reachable, document the tab-order gap and keep check 13.

## 6. Acceptance criteria

- `toast-lifecycle` is in the registry and the suite is **51/51** with exit `0`.
- The capability union contains `toast` and the report prints `toast=verified`.
- `toast-state`'s four rules are unit-tested and can fail.
- At least two two-direction proofs are recorded in §7 with the exact failing
  check and exit code.
- `COMPONENTS.md`'s Toasts row records the measured facts (positioning,
  pointer chain, role, timer, focus) and keeps an honest status.
- `TODO.md` ticks this task and records the follow-up: mount the real
  `ToastProvider`/`ToastViewport` once `@gpuixui/components` is on the
  integration branch.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 7. Measured result

Run 2026-10-17 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | pass |
| `--only toast-lifecycle` | 1/1, **55 checks**, `toast=verified`, exit `0` |
| full suite | **51/51**, exit `0` (`50 → 51`) |
| `nub run --filter playground test` | 5 files / **25 tests**, pass |
| `nub run --filter @gpuixui/testing test` | 4 files / **40 tests**, pass |
| `nub run check`, `nub run lint`, `nub run test` | pass (§8) |

What the probe established:

- **`right`/`bottom` are real.** A viewport with `position: "absolute"`,
  `right: 24`, `bottom: 24` puts each card's right and bottom edge exactly 24 px
  from the app root's right and bottom edges (within 1 px). The stack grows
  **upward**: adding a card lifts the older ones, because the viewport's height
  grows while its bottom edge stays anchored.
- **`pointerEvents: "none"` is load-bearing, but not for the card.** A page
  control under the viewport's transparent strip receives a click
  (`under=1`). Flipping the viewport to `auto` blocks that click — the
  two-direction proof below. A **card does not need `pointerEvents: "auto"`**:
  removing it still passed, because GPUix hit-tests an element that paints a
  fill (the documented rule). The shipped card's `auto` is therefore defensive,
  not required; the viewport's `none` is the property that matters.
- **Paint order is the only stack.** The viewport painted last covers the app
  surface at the same coordinates: clicking the bottom card's dismiss leaves
  the button underneath at `behind=0`, while a click outside the viewport box
  still increments the page (`action=1`).
- **Accessibility.** `role="status"` + `aria-label="Notifications"` appears in
  the AccessKit dump as a `Status` node with that label; the dismiss control
  appears as a `Button` labelled `Dismiss`. The dump has no live-region field,
  so a changing toast cannot be shown to re-announce — the viewport's label is
  static. The component should label each card, not rely on the region label
  for the message.
- **Focus.** A toast pushed from the focused field's submit does **not** move
  focus, and the card's dismiss control is reachable with one `focusNext` from
  the field. Escape with focus on the dismiss control does not dismiss anything.
  A measured trap: a click focuses a plain `div` even with `tabIndex={-1}`, so
  the first version (click the show button) reported `toast-show` as focused.
  The probe now pushes through `onSubmit`, which is also the realistic path.
- **Timers.** A card's `setTimeout` is real JS time (the GPUI dispatcher clock
  does not move it); a 250 ms toast is dismissed while a 5 s sibling survives.
  With `pauseMotion`, the exit stays frozen and the card is still laid out
  (bounds present). Advancing the motion clock needs a **dispatched frame
  first** (`fastForwardMotion(0)`) or the exit is registered after the advance;
  then `fastForwardMotion(exit + 1)` removes it.
- **Assert removal with `bounds`, not painted text.** After the exit completed,
  `getPaintedText()` still returned the removed card's title in that frame
  (`bounds` was already `null`). The probe asserts removal by bounds; painted
  text is only used for presence.
- **Hover** reaches a card through the `pointerEvents: "none"` viewport
  (`onMouseEnter`/`Leave` set the readout), so the shipped pause-on-hover can be
  wired.

Two-direction proofs (mutation → the named check failed at exit `1` → file
restored):

| Mutation | Failing check |
| -------- | ------------- |
| dismiss `onClick` → no-op | `dismissing removes exactly the clicked card: expected "count=2", got "count=3…"` |
| `SHORT_MS` 250 → 5000 | `the short toast's timer fired: expected "dismissed=Short", got "dismissed=Toast 4"` |
| viewport `pointerEvents: "none"` → `"auto"` | `the viewport's empty strip does not block the page: expected "under=1", got "under=0"` |
| viewport `role="status"` removed | `the viewport is an accessible Status region: expected a value, got none` |
| viewport `right: 24` → `left: 24` | `the card is inset from the right: expected 24 ± 1, got 756` |
| card `pointerEvents: "auto"` removed | **passed** — the card paints a fill, so it is hit-testable anyway (recorded above, not a defect) |

Limitations this probe does **not** remove:

- `@gpuixui/components` is still not on the integration branch, so this is
  evidence for the mechanism, not the shipped `ToastViewport`. Mount the real
  provider/viewport here when that package lands (TODO).
- The AccessKit dump has no live-region/announcement concept; a screen reader
  contract beyond a static `Status` region is unproven.
- Pause/resume on hover (remaining time) is the component's Effect store logic;
  this probe only proves hover reaches the card and that the runtime timer is
  real. The store's `TestClock` suite covers the maths.
