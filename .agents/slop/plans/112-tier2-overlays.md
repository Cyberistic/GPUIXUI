# 112 — Overlays: Dialog, Confirmation dialog, Popover

- **Phase:** C-2
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** plan 110, plan 111
- **GPUix surface used:** `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogBackdrop`,
  `DialogPopup`, `DialogClose`, `DismissableLayer`, `FloatingLayer`,
  `floatingRootStyle`, `useControllableState` is **not** exported — use
  `internal/controllable.ts`

This plan is the highest-risk Tier 2 work because it owns focus, dismissal and
z-order. Read §1 before writing code.

---

## 1. What GPUix 0.10.0 actually gives us (measured; supersedes the first draft)

The first draft of this section was written against the reference clone. Every row
below was re-measured against the installed `@gpuix/react@0.10.0` and
`@gpuix/native@0.10.0` on 2026-10-17, and **four of the draft's seven rows were
false**. Read this before writing a line of overlay code.

| Need | 0.10.0 answer | Evidence |
| ---- | ------------- | -------- |
| `Dialog` + parts, `DialogPortal/Backdrop/Popup/Close` | **absent** | `@gpuix/react`'s exports list: `Select`, `Combobox`, `Tooltip`, `motion`, host elements only |
| `DismissableLayer`, `pushDismissLayer` | **absent** | same export list; only the reference clone has them |
| `useControllableState` | **absent** from `@gpuix/react/floating` | `floating.d.ts` exports `FloatingLayer`, `floatingRootStyle`, `mergeStyles`, `renderSlot`, `resolveStyle`, `setRefs` only → use `internal/controllable.ts` |
| Full-window overlay via `anchored fill="window"` | **absent** — `anchored` has no `fill` | `AnchoredProps`: `position`, `side`, `align`, `gap`, `anchor`, `offset`, `fit`, `snapMargin`, `deferred`, `priority`, `occlude` |
| Anchored positioning with collision handling | present, but **not modal** | `FloatingLayer` renders one `anchored` wrapping one `div`; it cannot dim or block the window |
| Outside-press detection | present | `onMouseDownOutside` on any host element |
| Backdrop dim | build it: a `div` with `position:"absolute"`, insets `0`, `backgroundColor: colors.overlay` | `StyleDesc.position/top/right/bottom/left` |
| Escape dismiss | **our job**: handle `Escape` on the focused content node | keys fired on a focused node reach an ancestor's `onKeyDown` (measured for List, plan 111 §7) |
| Tab stays inside a modal | present | `renderer.focusNextWithin(id)` / `focusPreviousWithin(id)` |
| Focus in on open, out on close | **our job**: `renderer.focusElement(id)` + restore the previously focused id | `getFocusedElementId()` / `focusElement(id)` |
| Window size, for a full-window overlay | present | `useWindowSize()` from `@gpuix/react` |
| Window-level key handlers | present but **not needed** | `renderer.setWindowKeyEvents`, `WindowKeyEventHandlers`; the content node's own `onKeyDown` is simpler and per-layer |

**Documented limitation (record it, do not work around it):** GPUix has no
`aria-labelledby`, so a dialog is named through `aria-label`. `DialogTitle`
still renders a heading, and screen-reader users hear the name from the label.
Every docs page states this and the example passes a label.

## 1b. Amendment, 2026-10-17: the overlays are ours to build

§1's draft told the executor to lean on `Dialog`/`DismissableLayer` and to "not
re-implement focus, escape, tab-trapping or portal painting". In 0.10.0 there is
nothing to lean on: all four are absent. The build order becomes:

1. `src/internal/dismiss-layer.ts` — a module-level stack of the open overlay
   layers, last in wins: `pushDismissLayer(onDismiss): () => void` and
   `dismissTopLayer(): boolean`. Escape calls the top layer's handler and stops;
   a layer that is not topmost ignores Escape. A stack, not a context, because
   two dialogs opened from the same subtree must dismiss outside-in.
2. `src/dialog.tsx` — the parts of §2 with local implementations:
   - the root owns `open`/`defaultOpen`/`onOpenChange` through
     `internal/controllable.ts`;
   - the overlay is a `div` with `position:"absolute"` and insets `0`, painting
     `colors.overlay` with `pointerEvents:"auto"`, sized from `useWindowSize()`
     when the app's tree is not itself the window root;
   - the surface is centred by the overlay's `alignItems`/`justifyContent`;
   - focus: on open, focus the content node (`tabIndex={-1}`, `autoFocus`) and
     remember `getFocusedElementId()`; on close, `focusElement` the remembered id
     when it is still mounted;
   - Tab: `focusNextWithin(contentId)` / `focusPreviousWithin(contentId)` on the
     content node's `onKeyDown`;
   - Escape: the content node's `onKeyDown` offers the event to
     `dismissTopLayer()`;
   - outside press: `onMouseDownOutside` on the content node (does **not** restore
     focus — the press gives focus to whatever was pressed);
   - role and name: `role="dialog"`, `aria-label={label}`, `aria-modal` is not
     available in 0.10.0 — the docs state it.
3. `src/popover.tsx` and `src/menus` then reuse the same dismiss stack on top of
   `FloatingLayer` (plan 114) instead of a modal overlay.

**Probe before building (STOP if any answer surprises you).** Each of these is one
behaviour test in `src/behaviour/zz-probe.test.tsx`, deleted after the answers are
recorded in this plan:

- does `position:"absolute"` with insets `0` cover the window when the dialog is
  rendered inside a nested, non-positioned container, or does it resolve against
  that container (and therefore need explicit `useWindowSize()` dimensions)?
- does a later sibling paint above an earlier one, so the overlay needs no z-index
  equivalent?
- does `pointerEvents:"auto"` on the overlay actually stop a click reaching a
  button behind it (assert the button's handler did **not** run)?
- does `renderer.focusElement` on a `tabIndex={-1}` node give it focus and deliver
  keys to its `onKeyDown`?
- does `focusNextWithin(contentId)` wrap, or stop at the last focusable child?

The answers belong in this file, under this list, before §2 is implemented.

## 1c. Probe answers (measured 2026-10-17, `@gpuix/native@0.10.0`, 1280×800)

The probe rendered a nested `page > nested (200px tall) > overlay` tree inside the
real test renderer. Its one assertion was deliberately `toBe("PROBE")` so the
run printed the measurements. All five questions are answered, and **one answer
changes the design**: a modal veil must be an `anchored`, not an absolutely
positioned `div`.

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| absolute insets `0` inside a nested container | **resolves against the immediate parent**, not the window: bounds `x:20, y:20, width:1240, height:200` (the parent's box). The height is the parent's 200, not the window's 800, so an absolute veil cannot cover the window from a nested position | probe 1 |
| explicit absolute size larger than the parent | the element keeps the parent's origin and **does** paint beyond the parent's height (800×600 at `x:20, y:20` inside a 200px parent), so nothing clips it — but it still cannot be *positioned* at the window origin from a nested parent | probe 2 |
| later sibling paints above an earlier one | **yes**: a click at the shared point reached the overlay and not the earlier sibling behind it; with `pointerEvents:"none"` the same click reached the sibling. No z-index equivalent is needed | probe 1 |
| `pointerEvents:"auto"` blocks the hit | **yes**: the click logged `veil` and never `behind`; with `"none"` it logged `behind` | probe 2 |
| `focusElement` on a `tabIndex={-1}` node | **yes**: `getFocusedElementId()` returned the content node and `simulateKeystrokes("escape")` reached its `onKeyDown` | probe 1+2 |
| `focusNextWithin(contentId)` wrap | **yes**: focus went first → second → first (ids `2, 3, 2`) | probe 1+2 |
| **`<anchored position={{x:0,y:0}}>`** | **window coordinates, independent of the parent**: bounds `x:0, y:0, width:1280, height:800` while nested in a 200px container, and it **blocks hits behind** it (the click logged `veil`, never `behind`) | probe 2 |
| click bubbling | a click on the surface logged `surface` then `veil`: events bubble to ancestor handlers | probe 2 |
| `getWindowSize()` under test | `{ width: 1280, height: 800 }` | probe 2 |

**Design consequence.** The modal veil is
`<anchored position={{x:0,y:0}} occlude>` wrapping a full-window `div` sized from
`useWindowSize()`; `position:"absolute"` is not used for it. The anchored element
is the only measured way to paint and hit-test at window coordinates from an
arbitrary nested mount point, because `@gpuix/react@0.10.0` exports no portal.
Probe files were deleted after recording these answers.

---

## 2. `src/dialog.tsx`

```tsx
export interface DialogProps {
  open?: boolean;              // controlled
  defaultOpen?: boolean;       // uncontrolled, default false
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;       // default true: Escape and an outside press close
  children?: ReactNode;
}
export const Dialog: FC<DialogProps>;            // context + controllable open

export const DialogTrigger: FC<ButtonProps>;     // local Button; toggles open
export const DialogClose: FC<ButtonProps>;       // local Button; closes

export type DialogSize = "sm" | "md" | "lg";     // maxWidth 360 / 480 / 640

export interface DialogContentProps extends Omit<Props, "children"> {
  size?: DialogSize;          // default "md"
  label: string;              // required: accessible name (aria-label)
  showClose?: boolean;        // default true
  children?: ReactNode;
}
export const DialogContent: FC<DialogContentProps>;

export const DialogHeader: FC<Props>;   // column, gap space.xs
export const DialogTitle: FC<Props>;    // heading level 2
export const DialogDescription: FC<Props>; // muted, sm
export const DialogFooter: FC<Props>;   // row, justify flex-end, gap space.md
```

`DialogContent` composes, in this exact order (corrected 2026-10-17: §1c measured
that the veil must be an `anchored`; there is no `DialogPortal`):

```tsx
const { width, height } = useWindowSize();

<anchored
  position={{ x: 0, y: 0 }}
  occlude
  style={{ position: "absolute" }}
>
  <div
    testId="dialog-backdrop"
    style={{
      width, height,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: space["3xl"],
      backgroundColor: colors.overlay,
      pointerEvents: "auto",
    }}
  >
    <div
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      ref={contentRef}
      onMouseDownOutside={closeOnOutsidePress}
      onKeyDown={handleKeys}
      testId={testId ?? "dialog-content"}
      style={{ /* surface */ }}
    >
      {children}
      {showClose && <IconButton label="Close" testId="dialog-close" … />}
    </div>
  </div>
</anchored>
```

Surface style: `display:"flex",flexDirection:"column",gap:space.lg`,
`backgroundColor:colors.popover`, `borderRadius:radius.xl`,
`borderWidth:1,borderColor:colors.border`, `boxShadow:elevation(theme,"lg")`,
`padding:space["2xl"]`, `width:"100%"`, `maxWidth:{sm:360,md:480,lg:640}`,
`maxHeight: height - 2 * space["3xl"]`, `overflow:"scroll"`,
`position:"relative"`, `pointerEvents:"auto"`.

**Corrected 2026-10-17:** `keyboardFocusDim` **does not exist** in 0.10.0's
`StyleDesc` (plan 110 §6, verified in `dist/host.d.ts`), so it is not written
anywhere in this component set; the earlier draft's per-element opt-out is
unavailable and the note is dropped rather than guessed at.

Close button: an `IconButton` with `label="Close"`, `testId="dialog-close"`,
`position:"absolute", top:space.lg, right:space.lg`. Its glyph is a `text`
`"✕"` for v1 (no icon set dependency yet; note it in the docs and swap to `Icon`
when `packages/icons` lands).

Focus, escape, tab trapping and the veil are implemented here, on top of the
measured primitives — not re-implemented GPUix behaviours, because 0.10.0 ships
none of them:

- on open, remember `getFocusedElementId()` and `focusElement(contentId)`;
- on close (unmount), restore that id when `getElementBounds(id) !== null`;
- `Escape` → `dismissTopLayer(event)`; the root pushed its close handler on open;
- `Tab` / `Shift+Tab` → `focusNextWithin(contentId)` / `focusPreviousWithin(contentId)`;
- outside press → `dismissTopLayer(event)` (the press has already moved focus).


## 3. `src/confirm-dialog.tsx`

The component the rest of the library and the examples actually use. It is a real
safety workflow, not a styled box.

```tsx
export type ConfirmTone = "default" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;      // default "Confirm"
  cancelLabel?: string;       // default "Cancel"
  tone?: ConfirmTone;         // default "default"
  loading?: boolean;          // disables confirm and cancel, shows Spinner in confirm
  onConfirm: () => void;
}
```

Behaviour (each bullet is a test):
- Opens as a `Dialog` with `label={title}`.
- **Initial focus is Cancel.** Safe default: Enter on an untouched dialog cancels.
  Implemented by focusing the Cancel button's native id in a layout effect that
  runs after `DialogContent`'s own focus-in (child effects run first), because
  0.10.0 has no `initialFocus` contract to hand a ref to (STOP 1 below records
  this deviation from the first draft).
- Cancel closes and calls `onOpenChange(false)`; it does **not** call `onConfirm`.
- Confirm calls `onConfirm` once, then closes only when the caller does (the
  caller owns async work through `open`). Document this: the dialog does not
  close itself on confirm, so a failed save can keep it open with the error.
- `loading`: the confirm button shows a `…` text glyph before its label (no
  `Spinner` exists yet), both buttons are `disabled`, and the root gets
  `dismissible={!loading}` so `Escape` and the backdrop press do nothing.
- `tone="danger"`: confirm uses the `danger` button variant; the title is
  unchanged.


## 4. `src/popover.tsx`

```tsx
export interface PopoverProps { open?; defaultOpen?; onOpenChange?; children }
export const Popover: FC<PopoverProps>;                 // context + controllable open
export const PopoverTrigger: FC<Props & { asChild?: boolean }>;
export interface PopoverContentProps extends FloatingContentProps {
  side?: "top"|"right"|"bottom"|"left";   // default "bottom"
  align?: "start"|"center"|"end";         // default "start"
  sideOffset?: number;                    // default 6
  collisionPadding?: number;              // default 8
}
export const PopoverContent: FC<PopoverContentProps>;
```

`PopoverContent` renders `FloatingLayer` (corrected 2026-10-17: there is no
`DismissableLayer`; the dismiss stack is `internal/dismiss-layer.ts`) with:
- `autoFocus`, `tabIndex={-1}` so keys reach it (`keyboardFocusDim` does not
  exist in 0.10.0 — corrected 2026-10-17);
- `onMouseDownOutside` → close **without** restoring focus (the press gives
  focus to what was pressed; restoring would steal it);
- `onKeyDown`: `Escape` → `dismissTopLayer(event)`; `Tab` closes the popover and
  lets focus move (no trapping).
- Surface style identical to the dialog minus the shadow: `colors.popover`,
  `borderRadius:radius.lg`, `borderWidth:1`, `borderColor:colors.border`,
  `boxShadow:elevation(theme,"md")`, `padding:space.lg`, `minWidth:200`.

`PopoverTrigger` uses the local `Button` and sets `aria-expanded`,
`aria-haspopup:"dialog"`, `tabIndex:0`. Clicking while open closes. A press
outside closes and must not immediately re-open: copy Select's proven one-tick
flag (`dismissedByOutsidePress` + `triggerPressedWhileOpen`, reset through
`queueMicrotask`) — it is the only measured fix for the mousedown→click loop.


## 5. Tests

`src/dialog.test.tsx` — render with a trigger; use `renderComponent`.
1. Click the trigger → dialog text appears; `findByType("anchored")` includes a
   node at `{x:0,y:0}`, and the backdrop measures the full window.
2. Focus enters the popup: `getFocusedElementId()` is non-null and equals the
   popup's id (or a descendant).
3. `simulateKeyDown("escape")` closes it; text gone.
4. Clicking the backdrop closes it; clicking inside the content does **not**.
5. Tab from the last focusable inside wraps to the first (`getFocusedElementId`
   changes to the first control) — proves the modal trap, not just "a key did
   something".
6. After close, focus returns to the trigger.
7. `label` appears as `aria-label` in the tree JSON.
8. Both themes: content background equals the theme's `colors.popover`, the
   backdrop equals `colors.overlay`.
9. `dismissible={false}`: neither Escape nor a backdrop press closes it.


`src/confirm-dialog.test.tsx`
1. Opens with focus on Cancel (`getFocusedElementId()` equals the cancel id).
2. Enter immediately → `onConfirm` not called, `onOpenChange(false)` called.
3. Click Confirm → `onConfirm` called exactly once.
4. `loading` → confirm is disabled (click does nothing) and Escape does not close.
5. `tone="danger"` → confirm's style colour equals `colors.destructiveForeground` on a
   `colors.destructive` fill.

`src/popover.test.tsx`
1. Click trigger → content appears and is positioned below it
   (`contentBounds.y >= triggerBounds.y + triggerBounds.height`).
2. Escape closes; `Tab` closes; `mousedown` outside closes.
3. Clicking inside content keeps it open.
4. `side="right"` puts the content to the right (bounds assertion).
5. Controlled `open={false}`: clicking the trigger fires `onOpenChange(true)`
   and the content stays hidden.

Every assertion above fails if the wiring is wrong. Do not replace a bounds or
focus assertion with "the text exists".

## 6. Examples and docs

`examples/dialog.example.tsx` — a delete-workspace dialog with a real cancel
path and a confirm that shows a loading state for one tick.
`examples/confirm-dialog.example.tsx` — a destructive confirm with a body that
names the consequence.
`examples/popover.example.tsx` — a filter popover with two toggle rows and an
Apply button, opened from a secondary button.

`docs/dialog.mdx`, `docs/confirm-dialog.mdx`, `docs/popover.mdx`: description,
preview id, anatomy, keyboard table (Escape, Tab, Enter), the
`aria-labelledby` limitation with the evidence line, "when to use Dialog vs
Popover vs Menu", API tables, related components.

## 7. Commands

```
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests
nub run lint
nub run fmt
```

Expected: exits 0; the three new suites ran and are not skipped.

## 8. STOP conditions

1. ~~`DialogPopup` `initialFocus` cannot target a ref'd element~~ — resolved
   2026-10-17: 0.10.0 has no `DialogPopup`; `DialogContent` focuses itself and
   `ConfirmDialog` focuses Cancel afterwards. If that ordering ever stops
   holding (focus lands on the content, not Cancel), STOP and report — do not
   silently change the safe default.

2. Focus does not return to the trigger after close in the native test renderer
   → this is a runtime bug; report both runs, do not add a manual
   `focusElement` workaround.
3. Outside-click dismissal cannot be distinguished from a click that opened the
   popover (re-open loop) → STOP; do not ship a toggle that flickers.
4. A modal dialog cannot trap Tab (`focusNextWithin` missing on the test
   renderer while present on the live renderer) → record the test-renderer gap
   in the docs as a limitation and report; keep the live behaviour.

## 9. Acceptance criteria

- [x] Dialog, ConfirmDialog, Popover implemented with the APIs above.
- [x] Every test bullet in §5 exists and can fail.
- [x] Focus-in, focus-return, Escape, backdrop, outside-click and Tab behaviour
      proven in the native test renderer.
- [x] Examples + docs pages + `COMPONENTS.md` rows for the three components.
- [x] Limitation (no `aria-labelledby`) documented with evidence.
