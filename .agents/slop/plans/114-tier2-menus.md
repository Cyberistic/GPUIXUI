# 114 — Menus: Dropdown, Context, Command

- **Phase:** C-4
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** plan 110, plan 111 (`collection.ts`, `Button`/`ListItem` idioms), plan 112 (dismissal patterns)

Three components share one keyboard/selection core. Write the core once
(`src/menu/logic.ts` + `src/menu/menu-item.tsx`), then three thin roots. A
copy-pasted second menu is the failure mode this plan exists to prevent.

---

## 1. What this layer owns

| Concern | Owner |
| ------- | ----- |
| Escape / layer stacking / focus restore | GPUix `DismissableLayer` |
| Anchoring, flipping, collision padding | GPUix `FloatingLayer` (`@gpuix/react/floating`) |
| Which item is active, wrap-around, skip disabled, activation | **our `menu/logic.ts`** |
| Item styling, destructive tone, checkbox state | **our `menu/item.tsx`** |
| Trigger semantics (`aria-expanded`, `aria-haspopup`) | **our roots** |

## 2. `src/menu/logic.ts`

Pure. No React. `Arr`/`Option`/`Match` only.

```ts
export interface MenuItemSpec {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
}

export interface MenuState {
  readonly activeId: Option.Option<string>;
}

export type MenuAction =
  | { readonly _tag: "Reset" }
  | { readonly _tag: "Focus"; readonly id: string }
  | { readonly _tag: "Move"; readonly delta: 1 | -1 }
  | { readonly _tag: "First" }
  | { readonly _tag: "Last" };

export const initial: MenuState;
export const move: (state: MenuState, items: ReadonlyArray<MenuItemSpec>, action: MenuAction) => MenuState;
export const activeIndex: (state: MenuState, items: ReadonlyArray<MenuItemSpec>) => Option.Option<number>;
```

Rules: `Move` wraps; skips `disabled`; from `None`, `+1` goes to the first
enabled and `-1` to the last enabled; `First`/`Last` skip disabled edges;
`Focus` on a disabled or unknown id is ignored; all-disabled returns the
unchanged state.

**Test (`menu/logic.test.ts`)** — table-driven, header comment names the guarded
bug ("ArrowDown from the last item stopped instead of wrapping past disabled
entries"). Cases: first move from `None` in both directions; full wrap; a run of
disabled items at each end; `Focus` on disabled; `First`/`Last` with disabled
edges; empty list; single enabled item (move is a no-op that keeps it active).

**No type-ahead in v1.** Reason: GPUix exposes `keyChar`, but a correct
type-ahead needs a timed buffer reset, and a `setTimeout` in a component breaks
the repo's `Clock` rule. Recorded as a `TODO` in `menu/logic.ts` with the design:
a buffer `Ref` plus a generation-counted `Effect.sleep`, hosted by the menu root.
Do not invent a `setTimeout` version.

## 3. `src/menu/item.tsx`

```tsx
export type MenuItemTone = "default" | "destructive";

export interface MenuItemProps extends Props {
  onSelect?: () => void;
  disabled?: boolean;
  tone?: MenuItemTone;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export interface MenuCheckboxItemProps extends MenuItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const MenuItem, MenuCheckboxItem, MenuSeparator, MenuLabel, MenuGroup;
```

Row: height `controlHeight(theme, "sm")`, `paddingX:space.md`, radius `sm`,
`flexDirection:"row"`, `alignItems:"center"`, `gap:space.md`, fontSize `sm`.
States via `StateStyle`: hover `backgroundColor:colors.surfaceHover`; active
(highlighted by keyboard) same as hover **plus** a 2px left inset bar in
`colors.accent` (`boxShadow` inset is not needed — a 2px `div` is simpler);
disabled `opacity:0.5`; destructive `color:colors.destructive` and hover
`backgroundColor:`tone("danger").bg``.
`MenuSeparator`: 1px `colors.border`, `marginY:space.xs`.
`MenuLabel`: fontSize `xs`, `color:colors.mutedForeground`, `paddingX:space.md`,
`paddingY:space.xs`, `userSelect:"none"`.
`MenuCheckboxItem` shows a `text` `"✓"` when checked (no icon dependency yet),
`"aria-selected": checked`, and `onSelect` toggles.

## 4. `src/dropdown-menu.tsx`

```tsx
export const DropdownMenu;        // open?/defaultOpen?/onOpenChange?/modal? (default false)
export const DropdownMenuTrigger; // asChild?, uses buttonProps + aria-haspopup="menu"
export interface DropdownMenuContentProps extends FloatingContentProps {
  side?: "top"|"right"|"bottom"|"left";  // default "bottom"
  align?: "start"|"center"|"end";        // default "start"
  sideOffset?: number;                   // default 4
}
export const DropdownMenuContent;
export { MenuItem as DropdownMenuItem, MenuCheckboxItem as DropdownMenuCheckboxItem,
         MenuSeparator as DropdownMenuSeparator, MenuLabel as DropdownMenuLabel,
         MenuGroup as DropdownMenuGroup };
```

Content: `DismissableLayer` → `FloatingLayer` with `autoFocus`, `tabIndex={-1}`,
`role:"menu"`, `minWidth:180` (`keyboardFocusDim` does not exist in 0.10.0 —
corrected 2026-10-17), `onMouseDownOutside` closes without stealing focus,
surface = `colors.popover`,
`borderRadius:radius.md`, `borderWidth:1`, `borderColor:colors.border`,
`boxShadow:elevation.md`, `padding:space.xs`.
Keyboard on content: `ArrowDown/ArrowUp` → `move`; `Home/End`; `Enter/Space` →
activate active item; `Escape` handled by the layer; `Tab` closes the menu and
lets focus move. After `move`, call `renderer.focusElement(itemId)` so focus and
the highlight are the same thing (never a highlight that is not focused).
Items register their spec + id in a `useRef` collection in `useLayoutEffect`
(declaration order), same technique as GPUix Select.

Trigger click toggles. While open, a press on the trigger must close rather than
re-open — copy GPUix Select's `triggerPressedWhileOpen` flag (proven technique).

## 5. `src/context-menu.tsx`

```tsx
export interface ContextMenuProps { open?; defaultOpen?; onOpenChange?; children }
export const ContextMenu;
export interface ContextMenuTriggerProps extends Props { disabled?: boolean }
export const ContextMenuTrigger;   // the area that responds to right-click
export interface ContextMenuContentProps extends Props { children; testId? }
export const ContextMenuContent;   // positioned at the pointer
export { MenuItem as ContextMenuItem, … }
```

Right-click detection: GPUix surfaces it as `onAuxClick` with
`event.isRightClick` (there is no `onContextMenu` prop; evidence:
`packages/native/js/mutations.ts:99` maps `onAuxClick` → `"auxClick"`).
The trigger stores `{ x: event.x, y: event.y }` and opens.

Positioning: `ContextMenuContent` renders
`<anchored position={point} deferred priority={1} occlude>` + an inner surface
`div` (`FloatingLayer` is anchor-relative and cannot take a pointer point).
**Verify the coordinate space with a test, do not assume:** open at a known
point, then assert the content's `getElementBounds()` top-left is within 12px of
that point. If the runtime treats `position` as parent-relative, subtract the
trigger's bounds origin. Record which it was in the component's JSDoc.

Also close on `Escape`, on outside press, and on a second right-click elsewhere.

## 6. `src/command-menu.tsx`

A dialog-hosted, searchable action list. Compose, do not reinvent: `Dialog` from
plan 112, `Input` from primitives, `menu/logic.ts` for the active item.

```tsx
export interface CommandAction {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly shortcut?: string;   // display only, e.g. "⌘S"
  readonly disabled?: boolean;
  readonly perform: () => void;
}
export interface CommandMenuProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  actions: ReadonlyArray<CommandAction>;
  placeholder?: string;        // default "Type a command…"
  emptyLabel?: string;         // default "No matching commands"
  filter?: (action: CommandAction, query: string) => boolean;
}
export const CommandMenu;
```

- Renders a `DialogContent` (`size:"md"`, `label` = "Command menu") with an
  `Input` (`autoFocus`), the filtered list, and a footer hint.
- Default filter: case-insensitive substring on `label`, using `Str.includes`
  with normalised case. Document: **no fuzzy scoring in v1**; `filter` is the
  extension point.
- Grouping preserves the caller's order.
- Keyboard: `ArrowDown/Up` move; `Enter` runs the active action and closes;
  `Escape` closes (dialog layer); typing resets the active item to the first
  match (`Reset` then `Move +1`).
- Running a disabled action is impossible; a disabled action is still visible.

## 7. Tests

`src/dropdown-menu.test.tsx`
1. Trigger click opens; content has `role:"menu"` in the tree JSON.
2. `ArrowDown` focuses item 1, again item 2 (`getFocusedElementId`), skipping a
   disabled item in between.
3. `Enter` fires `onSelect` once and closes; focus returns to the trigger.
4. Clicking an item fires it; clicking a disabled item does nothing.
5. `Escape` closes; outside press closes; pressing the open trigger closes
   (does not flicker open again).
6. A destructive item's text colour equals `colors.destructive`; a checkbox item
   shows `✓` only when checked and calls `onCheckedChange(true/false)`.
7. Separator/label render and are not focusable (not in the tab order).
8. Both themes: content background equals the theme surface.

`src/context-menu.test.tsx`
1. Left click does not open; right click (`simulateClick(x, y, 2)`) opens.
2. Content appears within 12px of the pointer (the coordinate-space assertion).
3. Selecting an item runs it and closes.
4. Right-clicking elsewhere while open re-opens at the new point.

`src/command-menu.test.tsx`
1. Opening focuses the input (`getFocusedElementId` = input id).
2. Typing "op" leaves only matching labels in `getAllText()`.
3. `ArrowDown` + `Enter` runs the second match and closes.
4. No match → `emptyLabel` text appears.
5. A custom `filter` is used instead of the default (assert a label that the
   default would hide is present).
6. Escape closes.

## 8. Examples and docs

| Component | Example |
| --------- | ------- |
| DropdownMenu | a file-actions menu: Rename, Duplicate, a "Show hidden" checkbox item, separator, Delete (destructive) |
| ContextMenu | a project row whose right-click menu offers Open / Copy path / Delete |
| CommandMenu | ⌘K palette with three groups (Navigation, File, View) and shortcuts |

Docs pages: anatomy, keyboard table, focus rules ("the highlighted item is the
focused item"), destructive and checkbox items, the no-type-ahead and no-fuzzy
limitations with reasons, `anchored position` coordinate evidence, related
components (Popover, Select, Combobox).

## 9. Commands

```
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests && nub run lint && nub run fmt
```

Expected: exits 0; the logic suite plus three component suites ran.

## 10. STOP conditions

1. `anchored position` cannot place a layer at window coordinates → STOP,
   record the finding with the test output, and mark ContextMenu `blocked` in
   `COMPONENTS.md`. Do not fake it with a zero-size anchor at the pointer.
2. `renderer.focusElement` cannot focus a menu item by id in the native test
   renderer while the live renderer can → keep the live behaviour, mark the
   test skipped **with the reason in the test name**, and report.
3. `onAuxClick` does not report `isRightClick` for a simulated right click →
   report with the event payload; do not treat every aux click as a
   right-click silently.
4. A menu item cannot be both highlighted and focusable without stealing focus
   from a nested input (CommandMenu) → STOP and report; the composition is the
   requirement.

## 11. Acceptance criteria

- [ ] One shared menu core; three roots that add no duplicate index math.
- [ ] Logic tests that fail on wrap/skip regressions.
- [ ] Keyboard, dismissal and focus-restore proven in the native renderer.
- [ ] Examples, docs pages, `COMPONENTS.md` rows.
- [ ] Limitations (no type-ahead, no fuzzy match, pointer coordinate space)
      documented with evidence.
