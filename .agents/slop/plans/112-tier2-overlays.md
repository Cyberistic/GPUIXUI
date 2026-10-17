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

## 1. What GPUix gives us (verified in the reference source)

| Need | GPUix answer | Evidence |
| ---- | ------------ | -------- |
| Full-window overlay above everything | `<anchored fill="window" deferred priority={0} occlude={modal}>` wrapped by `DialogPortal` | `packages/react/src/components/dialog.tsx:116-147` |
| Escape closes only the top layer | `DismissableLayer` + `pushDismissLayer` | `components/floating.tsx:152-174` |
| Focus in on open, out on close, in stack order | `DialogPopup` `initialFocus` / `finalFocus`, defaults to trigger then previous focus | `dialog.tsx:177-219` |
| Tab stays inside a modal | `DialogPopup` `onKeyDown` calls `renderer.focusNextWithin/focusPreviousWithin` | `dialog.tsx:206-214` |
| Anchored positioning with collision handling | `FloatingLayer` (`side`, `align`, `sideOffset`, `collisionPadding`) | `components/floating.tsx:276-320`, exported from `@gpuix/react/floating` |
| Outside-click dismissal | `onMouseDownOutside` on the focused content node | `select.tsx:307-315` |
| Backdrop dim | a `div` with `position:"absolute", inset 0` painting the overlay colour | `dialog.tsx:152-167` |
| Accessible name | `aria-label` only. **No `aria-labelledby`.** | `packages/native/js/host.ts:493-515` |

**Documented limitation (record it, do not work around it):** GPUix has no
`aria-labelledby`, so a dialog is named through `aria-label`. `DialogTitle`
still renders a heading, and screen-reader users hear the name from the label.
Every docs page states this and the example passes a label.

---

## 2. `src/dialog.tsx`

```tsx
export {
  Dialog,            // re-exported GPUix root (open/defaultOpen/onOpenChange/modal/disablePointerDismissal)
  DialogTrigger,
  DialogClose,
} from "@gpuix/react";

export type DialogSize = "sm" | "md" | "lg";       // maxWidth 360 / 480 / 640

export interface DialogContentProps extends Props {
  size?: DialogSize;          // default "md"
  label: string;              // required: accessible name (aria-label)
  showClose?: boolean;        // default true
  initialFocus?: FocusTarget<PublicInstance>;
  finalFocus?: FocusTarget<PublicInstance>;
}
export const DialogContent: FC<DialogContentProps>;

export const DialogHeader: FC<Props>;   // column, gap space(1)
export const DialogTitle: FC<Props>;    // GPUix DialogTitle + heading style
export const DialogDescription: FC<Props>; // muted, sm
export const DialogFooter: FC<Props>;   // row, justify flex-end, gap space(2)
```

`DialogContent` composes, in this exact order:

```tsx
<DialogPortal>
  <DialogBackdrop style={{ backgroundColor: tokens.color.overlay }} />
  <DialogPopup
    aria-label={label}
    initialFocus={initialFocus}
    finalFocus={finalFocus}
    style={{ /* surface */ }}
  >
    {children}
    {showClose && <DialogClose aria-label="Close" testId="dialog-close" style={closeStyle}>…</DialogClose>}
  </DialogPopup>
</DialogPortal>
```

Surface style: `display:"flex",flexDirection:"column",gap:space(3)`,
`backgroundColor:color.popover`, `borderRadius:radius.lg`,
`borderWidth:1,borderColor:color.border`, `boxShadow:elevation.dialog`,
`padding:space(5)`, `width:"100%"`, `maxWidth:{sm:360,md:480,lg:640}`,
`pointerEvents:"auto"`, `keyboardFocusDim:false`.

Close button: 24×24, `position:"absolute",top:space(3),right:space(3)`,
`borderRadius:radius.sm`, hover `backgroundColor:color.accent`. Its glyph
is a `text` `"×"` for v1 (no icon set dependency yet; note it in the docs and
swap to `Icon` when `packages/icons` lands).

**Do not re-implement** focus, escape, tab-trapping or portal painting. If a
behaviour is missing, add it to the interlock list and report; do not fork GPUix.

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
  Implement with `initialFocus={() => cancelRef.current?.id ?? null}`.
- Cancel closes and calls `onOpenChange(false)`; it does **not** call `onConfirm`.
- Confirm calls `onConfirm` once, then closes only when the caller does (the
  caller owns async work through `open`). Document this: the dialog does not
  close itself on confirm, so a failed save can keep it open with the error.
- `loading`: confirm shows a `Spinner`, both buttons are `disabled`,
  `Escape` and backdrop dismissal are suppressed (`disablePointerDismissal`),
  and the confirm button stays focusable (`focusableWhenDisabled`) so focus is
  not lost.
- `tone="danger"`: confirm uses the `danger` button variant and a destructive
  icon-less emphasis; the title is unchanged.

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

`PopoverContent` renders `DismissableLayer` → `FloatingLayer` with:
- `autoFocus`, `tabIndex={-1}`, `keyboardFocusDim:false` so keys reach it;
- `onMouseDownOutside` → close **without** restoring focus (the press gives
  focus to what was pressed; restoring would steal it);
- `onKeyDown`: `Escape` is handled by `DismissableLayer`; `Tab` closes the
  popover and lets focus move (do not `preventDefault`).
- Surface style identical to the dialog minus the shadow: `color.popover`,
  `borderRadius:radius.md`, `borderWidth:1`, `borderColor:color.border`,
  `boxShadow:elevation.popover`, `padding:space(3)`, `minWidth:200`.

`PopoverTrigger` uses `buttonProps()` from `@gpuix/react` and sets
`aria-expanded`, `aria-haspopup:"dialog"`, `tabIndex:0`. Clicking while open
closes; pressing outside closes and must not immediately re-open (GPUix solves
this in Select with a one-tick flag — copy that technique, it is proven).

## 5. Tests

`src/dialog.test.tsx` — render with a trigger; use `renderComponent`.
1. Click the trigger → dialog text appears; `findByType("anchored")` includes a
   `fill:"window"` node.
2. Focus enters the popup: `getFocusedElementId()` is non-null and equals the
   popup's id (or a descendant).
3. `simulateKeyDown("escape")` closes it; text gone.
4. Clicking the backdrop closes it; clicking inside the content does **not**.
5. Tab from the last focusable inside wraps to the first (`getFocusedElementId`
   changes to the first control) — proves the modal trap, not just "a key did
   something".
6. After close, focus returns to the trigger.
7. `label` appears as `aria-label` in the tree JSON.
8. Both themes: content background equals the theme's `color.popover`.

`src/confirm-dialog.test.tsx`
1. Opens with focus on Cancel (`getFocusedElementId()` equals the cancel id).
2. Enter immediately → `onConfirm` not called, `onOpenChange(false)` called.
3. Click Confirm → `onConfirm` called exactly once.
4. `loading` → confirm is disabled (click does nothing) and Escape does not close.
5. `tone="danger"` → confirm's style colour equals `color.destructiveForeground` on a
   `color.destructive` fill.

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

1. `DialogPopup` `initialFocus` cannot target a ref'd element (it takes
   `FocusTarget`), so the Cancel-first guarantee is not implementable → STOP
   and report; do not silently change the safe default.
2. Focus does not return to the trigger after close in the native test renderer
   → this is a runtime bug; report both runs, do not add a manual
   `focusElement` workaround.
3. Outside-click dismissal cannot be distinguished from a click that opened the
   popover (re-open loop) → STOP; do not ship a toggle that flickers.
4. A modal dialog cannot trap Tab (`focusNextWithin` missing on the test
   renderer while present on the live renderer) → record the test-renderer gap
   in the docs as a limitation and report; keep the live behaviour.

## 9. Acceptance criteria

- [ ] Dialog, ConfirmDialog, Popover implemented with the APIs above.
- [ ] Every test bullet in §5 exists and can fail.
- [ ] Focus-in, focus-return, Escape, backdrop, outside-click and Tab behaviour
      proven in the native test renderer.
- [ ] Examples + docs pages + `COMPONENTS.md` rows for the three components.
- [ ] Limitation (no `aria-labelledby`) documented with evidence.
