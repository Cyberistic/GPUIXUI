# 325 — Navigation menu hover-open

**Phase:** F · **Owner:** components workstream · **Depends on:** 110, 112, 113,
114, 117, 200, 201, 304, 305, 317, 320.

## 1. Why

`NavigationMenu` is the one Tier 2 disclosure surface whose trigger does nothing
on hover. Every reference implementation opens it on hover:

- shadcn/ui's Navigation Menu opens a panel when the pointer enters a trigger and
  closes it when the pointer leaves the trigger **and** the panel;
- GPUI Kit's navigation bars and PanelUI's menus follow the same expectation;
- `PreviewCard` (plan 317) in this package already implements hover with a
  pointer-travel rule — the behaviour exists, it is just not shared.

The current module says so itself:

> hover does not open (a second, untested policy)

and both `COMPONENTS.md` and `docs/navigation-menu.mdx` repeat the limitation.
That is an honest record of missing work, not a runtime constraint.

This plan adds the policy, extracts the timer/travel rule into one shared hook
so `PreviewCard` and `NavigationMenu` cannot drift, and proves it in the real
renderer.

## 2. What changes

### 2.1 The shared hover policy — `src/internal/hover.ts` (create)

`PreviewCard` currently owns the only copy of: "the runtime delivers the incoming
surface's `mouseEnter` before the outgoing `mouseLeave`, so a leave must not
close while the pointer is already inside the other surface". Two consumers now
need it, so hoist it.

```ts
export type HoverSurface = "trigger" | "content";

export interface HoverTravelOptions {
  /** Whether the surface is open now, read when a close timer would fire. */
  readonly isOpen: () => boolean;
  /** Close the surface. Called only when `isOpen()` is true. */
  readonly close: () => void;
  /** Milliseconds between entering a trigger and opening. */
  readonly openDelay: number;
  /** Milliseconds after leaving both surfaces before closing. */
  readonly closeDelay: number;
}

export interface HoverTravel {
  /** Pointer entered a surface. `open` is omitted for the content; `key` names
   *  the concrete surface (a nav item's value) so a stale leave is ignored. */
  readonly enter: (surface: HoverSurface, open?: () => void, key?: string) => void;
  /** Pointer left a surface; closes after `closeDelay` once both are outside. */
  readonly leave: (surface: HoverSurface, key?: string) => void;
  /** Drop pending timers without changing which surfaces hold the pointer. */
  readonly cancel: () => void;
  /** Forget one surface (or both) whose panel unmounted without a leave. */
  readonly reset: (surface?: HoverSurface) => void;
}

export const useHoverTravel = (options: HoverTravelOptions): HoverTravel;
```

Rules the hook owns, both proven by a behaviour test:

- `enter(surface, open, key)` records the concrete surface, cancels both
  timers, and opens now (`openDelay <= 0`) or after `openDelay`.
- `enter("content")` with no callback only records and cancels; entering the
  panel must never re-open or re-schedule anything.
- `leave(surface, key)` only acts when `key` is still the surface that holds the
  pointer. This is the measured fix for the switch bug: the runtime delivers the
  next trigger's enter **before** the previous trigger's leave, so a boolean
  "a trigger is inside" was cleared by the stale leave and cancelled the new
  open. The stale leave must be ignored entirely.
- A non-stale leave unmarks the surface and cancels timers. It closes (now or
  after `closeDelay`) only when **both** surfaces are outside **and**
  `isOpen()` is true.
- `close` is captured when the close timer is scheduled, not read at fire time;
  a consumer can make it identity-aware (the nav closes only the item that was
  open when the pointer left).
- Options are read through a ref updated in a layout effect, so a timer never
  calls a stale `close`/`isOpen`.
- `cancel()` and `reset()` are idempotent; every timer is cleared on unmount.

Implementation constraints:

- one `useRef` for the two timer handles;
- one `useRef` for `{ trigger, content }`;
- `useCallback` for `enter`, `leave`, `cancel`, `reset`; `useMemo` for the
  returned object;
- no `Effect`/`Clock` requirement: this is component UI timing, like the toast
  pause and the existing preview-card timers (`docs/component-api.md` §7 and
  commit `3bd09a1` precedent). Do not add a runtime dependency.
- no `Date.now`, no magic durations outside the component defaults.

### 2.2 `PreviewCard` adopts the hook — `src/preview-card.tsx`

Replace `openTimer`, `closeTimer`, `inside`, `cancelTimers`, `scheduleOpen`,
`scheduleClose` and `setInside` with one `useHoverTravel` call:

```ts
const hover = useHoverTravel({
  isOpen: () => open,
  close: () => setOpen(false),
  openDelay,
  closeDelay,
});
```

- trigger `onMouseEnter` → `hover.enter("trigger", () => setOpen(true))`
- trigger `onMouseLeave` → `hover.leave("trigger")`
- trigger click → `if (open) setOpen(false); else hover.enter("trigger", () => setOpen(true))`
- trigger focus → `hover.cancel(); setOpen(true)`
- content `onMouseEnter` → `hover.enter("content")`
- content `onMouseLeave` → `hover.leave("content")`
- context exposes `hover` instead of `scheduleOpen`/`scheduleClose`/
  `cancelTimers`/`setInside`.

The public API, the delay defaults (300/150) and all 8 existing behaviour tests
stay unchanged. This is a refactor proof: the suite must pass before and after.

### 2.3 `NavigationMenu` gains the policy — `src/navigation-menu.tsx`

New root props (JSDoc on each, exported `NavigationMenuProps`):

| Prop | Type | Default | Meaning |
| ---- | ---- | ------- | ------- |
| `openOnHover` | `boolean` | `true` | Open a panel when the pointer enters its trigger |
| `openDelay` | `number` | `100` | Milliseconds of hover before opening |
| `closeDelay` | `number` | `150` | Milliseconds after leaving both surfaces before closing |

Root:

```ts
const hover = useHoverTravel({
  isOpen: () => open !== null,
  close: () => setOpen(null),
  openDelay,
  closeDelay,
});
```

- Add `hover`, `openOnHover`, `openDelay` and `closeDelay` to
  `NavigationMenuContextValue`.
- Reset the **content** key whenever the open item changes:
  `useLayoutEffect(() => hover.reset("content"), [hover, open])`. Switching from
  panel A to panel B unmounts A's content without a `mouseLeave`, which would
  otherwise leave A's key inside forever and block the next close. The trigger
  key is kept: the pointer is still on whichever trigger it entered. A second
  effect resets everything when `openOnHover` turns false.
- `NavigationMenuTrigger`:
  - `onMouseEnter`: call the caller's handler, then return early when
    `rest.disabled === true` or `openOnHover` is false; otherwise
    `hover.enter("trigger", () => setOpen(value))`.
  - `onMouseLeave`: call the caller's handler, then `hover.leave("trigger")`
    when `openOnHover`; a disabled trigger never entered, so it also never
    schedules a close.
  - Keep every existing keyboard/press behaviour exactly as it is.
- `NavigationMenuContent`:
  - `onMouseEnter`: caller's handler, then `hover.enter("content")`.
  - `onMouseLeave`: caller's handler, then `hover.leave("content")`.
  - Keep the existing `onMouseDownOutside`, `onKeyDown`, measured
    `FloatingLayer` props and part assertions.

Hover must never focus anything: only `setOpen` runs. ArrowDown/press keep their
focus policy.

### 2.4 Behaviour tests — `src/behaviour/navigation-menu.test.tsx`

Keep all 10 existing tests. Add 7 (the suite becomes 17):

1. **hover opens after the delay, without moving focus.** Render with
   `openDelay={20} closeDelay={20}`; `hoverCentreOf` the platform trigger;
   assert no panel immediately; `await after(40)`; assert the panel exists,
   `aria-expanded` is true, and `focusedTestId(nav)` is `None` (the pointer must
   not steal focus).
2. **hover-open uses the same one-open-at-a-time rule.** Hover platform, wait,
   hover pricing, wait: platform closed, pricing open.
3. **the pointer may travel into the panel.** Hover platform, wait, hover the
   panel's padding, wait past `closeDelay`: the panel is still open. Then hover
   `elsewhere`, wait, and it is closed.
4. **`openOnHover={false}` refuses the pointer but keeps press.** Hover, wait,
   no panel; click, panel open.
5. **a disabled trigger never opens on hover.** Extend `Workspace` with an
   optional `platformDisabled?: boolean`; hover the disabled trigger, wait; no
   panel. Clicking it must also not open it.
6. **a key-opened panel survives the previous item's close timer.** Hover
   platform, wait for it to open, move the pointer to `elsewhere` (schedules the
   close), then focus the pricing trigger and press Enter. After more than
   `closeDelay`, pricing is still open: the identity-aware close must not
   dismiss a panel it did not own.
7. **a controlled nav reports hover but stays closed.** Render with
   `value={null}` and `onValueChange`; hover, wait; `onValueChange` was called
   with `"platform"` exactly once and no panel exists. (The reset effect must
   not emit a second `null` change.)

Add a small `after(ms)` helper exactly as `preview-card.test.tsx` does. Use real
timers with short delays; do not fake timers.

`src/behaviour/preview-card.test.tsx` is not edited: its 8 tests are the proof
that the extraction did not change the card.

### 2.5 Docs and inventory

- `docs/navigation-menu.mdx`
  - API table: add `openOnHover?`, `openDelay?`, `closeDelay?` to the
    `NavigationMenu` row.
  - Add an **Opening policy** section: hover after `openDelay`, travel into the
    panel, close after `closeDelay` once outside both, press toggles, keys are
    unchanged, hover never takes focus, `openOnHover={false}` for click-only
    sails.
  - Limitations: **delete** “Hover does not open”; add “no pointer-type signal
    (0.10.0), so touch has no hover and uses press”, and “the panel is not
    auto-focused on hover”.
  - Verification: 17 tests; name the seven new cases.
- `src/navigation-menu.tsx` `navigationMenuMeta.limitations`
  - replace the hover line with the touch/auto-focus limits;
  - update the module header comment (it currently says hover does not open) and
    the opening-policy sentence.
- `COMPONENTS.md` Navigation Menu row: “10 native behaviour tests” → 16, add the
  hover policy, replace “no hover-open” with the touch/auto-focus limits.
- `packages/components/README.md` NavigationMenu row: mention hover.
- `README.md` status line and `.agents/slop/plans/README.md`: behaviour count
  451 → 458.
- `TODO.md`: add and tick “Navigation menu hover-open — plan 325” under Tier 2
  hardening; keep the historical counts in older rows untouched.

## 3. Commands

From `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: type-check clean; unit suite 308 passed; behaviour suite 43 files,
**458** tests; the three repository gates exit 0. `test:behaviour` needs the
locally built `darwin-x64` binding (plan 140).

## 4. STOP conditions

Stop and report with evidence if:

- the real renderer does not deliver `onMouseEnter`/`onMouseLeave` on the
  trigger `div` or the `FloatingLayer` content (capture the element tree and the
  failing test);
- the hover-open panel arrives **after** a press in a way that makes the existing
  10 tests flaky (run the suite 3 times; any intermittent result is a stop);
- `PreviewCard`'s 8 tests change behaviour, or a test needs editing beyond the
  helper import — the extraction must be behaviour-preserving;
- pointer travel across the `sideOffset` gap cannot be bridged with `closeDelay`
  without a pointer-position API (0.10.0 has none) — record the measured gap and
  stop rather than inventing one;
- any gate fails for a reason outside this plan: fix only this work and record
  the unrelated failure in `TODO.md` under its owner.

## 5. Test plan and both-direction proof

1. Write the six tests **first** against the current implementation and run
   `test:behaviour`. Expected: tests 1–3 and 6 fail (no hover handlers); test 4
   may pass vacuously (`openOnHover` is not a prop yet, so TypeScript fails
   first — add the prop as a no-op is **not** allowed; the red run is the
   type-check failure plus the hover tests). Record the exact failure. In the
   measured run the first failing test leaves its root mounted, so the harness
   reports 6 failures from 1 real assertion failure plus 5 cascades — the first
   failure is the evidence.
2. Implement §2.1–§2.4.
3. Run the suite: 17/17. Run `preview-card.test.tsx`: 8/8, unchanged.
4. Revert one line — remove `onMouseEnter` from `NavigationMenuTrigger` — and
   show tests 1–3 and 6 fail; restore it. Record both commands and results in
   §6 and `TODO.md`.
5. `check-tests` must accept the suite: every new test asserts a rendered panel,
   focus, or a callback count — no self-comparisons.

## 6. Result

Landed 2026-10-18.

- `src/internal/hover.ts` is the one hover-travel policy; `PreviewCard` uses it
  with its public API and all 8 behaviour tests unchanged, and `NavigationMenu`
  uses it for hover open/close.
- `NavigationMenu` gained `openOnHover` (default `true`), `openDelay` (100 ms)
  and `closeDelay` (150 ms); hover never moves focus, a disabled trigger never
  opens, and a controlled nav reports one intent per hover.
- The suite grew from 10 to **17** native tests (**458** behaviour tests in the
  package); unit tests stay at **308**.
- Two measured corrections the plan did not foresee:
  1. A boolean "a trigger is inside" was wrong. The runtime delivers the next
     trigger's `mouseEnter` **before** the previous trigger's `mouseLeave`, so
     the stale leave cancelled the new open. Surfaces now carry a key (the nav
     item's value), and a leave that no longer matches is ignored.
  2. A single close timer could dismiss a panel opened by a key during the
     delay. The nav's `close` is identity-aware, and the hook captures it when
     the timer is scheduled; the seventh test guards exactly that.
- Both-direction proof: deleting the trigger's hover wiring failed
  `opens on hover after the delay without moving focus` (the harness reported
  6 failures: the first assertion plus 5 roots left mounted by the cascade);
  restoring it made all 17 pass.
- Gates run green on this host: `nub run check`, `nub run lint`, `nub run test`,
  `nub run --filter @gpuixui/components test` (308) and
  `nub run --filter @gpuixui/components test:behaviour` (43 files, 458 tests).

## 7. Acceptance

- Hover opens a panel after `openDelay` and closes it after `closeDelay` once
  outside both trigger and panel; the pointer can cross the gap into the panel.
- Hovering another trigger switches panels; only one is ever open.
- Hover never moves focus; press, Enter/Space and ArrowDown are unchanged.
- `openOnHover={false}` and a disabled trigger never open on hover.
- A controlled nav reports each hover intent once and never opens itself.
- `PreviewCard`'s public API and 8 tests are unchanged.
- Docs, the inventory record, `COMPONENTS.md`, both READMEs and the plan index
  agree with the code, and every gate in §3 is green (or the unrelated failure
  is recorded with evidence).
