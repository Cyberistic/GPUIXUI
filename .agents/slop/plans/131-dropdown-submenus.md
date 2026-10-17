# 131 — Dropdown menu submenus

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 114 (menus), 122 (context-menu focus return), 126 (keyboard open),
  129 (type-ahead), 130 (shared type-ahead), 112 (dismiss stack)
- **Status:** done, 2026-10-17. Three submenu parts over the existing row and
  dismiss cores; one-level `Escape`/`ArrowLeft`, hover and keyboard opening,
  one-at-a-time claim, outside press closes both. 11 native tests added
  (DropdownMenu 21 → 32, behaviour 239 → 250). Both-direction runs recorded in
  §8a.

`DropdownMenu` covers actions, checkbox rows and type-ahead, but the inventory
still records **"no submenus in v1"**. A desktop menu that cannot group actions
into a secondary level is visibly incomplete: File → Export → {PDF, PNG} is the
standard composition, and shadcn/ui's menu API has `DropdownMenuSub`,
`DropdownMenuSubTrigger` and `DropdownMenuSubContent` for exactly this.

This plan adds one level of submenus to `DropdownMenu` using the existing row,
dismiss-stack and type-ahead cores. It does **not** add submenus to
`ContextMenu` or `CommandMenu`; the parts stay exported from
`@gpuixui/components/dropdown-menu`.

Measured facts this plan relies on (already true in this tree):

- `<anchored position={{x, y}} fit="snap" snapMargin={8}>` places a surface at
  **window coordinates** and clamps it inside the window. `ContextMenu` already
  does this (`context-menu.tsx`, plan 112 §1c).
- `renderer.getElementBounds(id)` returns a host row's window bounds; the
  behaviour helpers read it the same way (`internal/interaction.ts`).
- Key events bubble from the focused row to every enclosing surface. 0.10.0 has
  no `stopPropagation`, so the child surface must claim the event before the
  parent handler reads it.
- `internal/key.ts` already exports `isLeft`, `isRight`, `isDismiss`, `isTab`.
- `renderComponent` renders a 1280×800 window; `hoverCentreOf` delivers a real
  mouse-enter/move (`internal/interaction.ts`).
- `menu/state.ts` keeps rows and the highlight; `menu/item.tsx` owns a row's
  action ref and registration; `menu/surface.tsx` owns the shared key rules.

---

## 1. Public API

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
  <DropdownMenuContent label="File actions">
    <DropdownMenuItem onSelect={rename}>Rename</DropdownMenuItem>
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
      <DropdownMenuSubContent label="Share">
        <DropdownMenuItem onSelect={copyLink}>Copy link</DropdownMenuItem>
        <DropdownMenuItem onSelect={email}>Email</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  </DropdownMenuContent>
</DropdownMenu>
```

Rules:

- `DropdownMenuSub` owns its open state; no controlled props in v1 (a submenu is
  disposable UI state, and the parent menu already owns the durable open state).
- `DropdownMenuSubTrigger` is a registered parent row: it takes part in arrow
  navigation, type-ahead and `Home`/`End` exactly like `DropdownMenuItem`.
- `DropdownMenuSubContent` is a `role="menu"` surface positioned at the trigger
  row's right edge, top-aligned, with a 4px gap. It is rendered only while open.
- Only **one submenu per menu** is open at a time. Hovering or opening another
  submenu trigger closes the previous one.
- Submenu rows are ordinary `DropdownMenuItem` / `DropdownMenuCheckboxItem`
  rows; grouping, separators and labels compose unchanged.

Keyboard and pointer:

| Input | Result |
| ----- | ------ |
| click / Enter / Space on a SubTrigger | opens the submenu and focuses its first row |
| `ArrowRight` on a focused SubTrigger | same as above |
| hover on a SubTrigger | opens the submenu (immediate; no hover timer) |
| `ArrowDown` / `ArrowUp` / `Home` / `End` / letters | act inside the submenu and never move the parent menu |
| `Enter` / `Space` on a submenu row | runs it once, closes the submenu **and** the parent menu, focus returns to the dropdown trigger |
| `Escape` | closes only the submenu; focus returns to the SubTrigger; the parent menu stays open |
| `ArrowLeft` | same as `Escape` |
| `Tab` | closes the submenu and the parent menu; focus moves on |
| outside press | closes both menus |
| hovering a parent row other than a SubTrigger | closes the open submenu |

`aria-expanded` is set on the SubTrigger. 0.10.0 has no `aria-haspopup`
(`HostProps`), so the relationship is documented as visual, just like the rest of
the menu family.

---

## 2. Files

```
packages/components/src/internal/event-claim.ts        # new: claim/isClaimed
packages/components/src/menu/state.ts                  # closeSubmenu + claimSubmenu
packages/components/src/menu/surface.tsx               # ignore a claimed event
packages/components/src/menu/item.tsx                  # hover closes submenu
packages/components/src/dropdown-menu.tsx              # Sub/SubTrigger/SubContent,
                                                       #   close("outside") mark,
                                                       #   claimed-event guard, exports
packages/components/src/behaviour/dropdown-menu.test.tsx  # +11 native tests
packages/components/docs/dropdown-menu.mdx             # anatomy, keyboard, limitations
packages/components/examples/dropdown-menu.example.tsx # a Share submenu
packages/components/README.md                          # the menu row
COMPONENTS.md                                          # Dropdown menus row
TODO.md                                                # tick the task
.agents/slop/plans/README.md                           # index this plan
```

Read `menu/state.ts`, `menu/item.tsx`, `menu/surface.tsx`, `dropdown-menu.tsx`
and `behaviour/dropdown-menu.test.tsx` in full before editing. Do not create a
second row implementation; the SubTrigger composes `MenuItem`.

---

## 3. `src/internal/event-claim.ts`

A key event that a nested surface has handled must not also be handled by its
enclosing menu. 0.10.0 has no `preventDefault`/`stopPropagation`, so the claim is
the same event-identity technique the dismiss stack already uses, kept separate
because claiming a key is not dismissing a layer.

```ts
import type { EventPayload } from "@gpuix/react";

const claimed = new WeakSet<EventPayload>();

/** Mark `event` as handled by the surface it happened in. */
export const claimEvent = (event: EventPayload): void => {
  claimed.add(event);
};

/** Whether an enclosing surface must leave `event` alone. */
export const isEventClaimed = (event: EventPayload): boolean =>
  claimed.has(event);
```

No test file: the module is two WeakSet calls, and its behaviour is covered by
the submenu keyboard tests (§7). Do not add a test that only asserts a WeakSet
works.

---

## 4. `src/menu/state.ts`

Add two members to `MenuContextValue` and implement them in `useMenuState` with
one ref:

```ts
/**
 * Close the submenu opened from this menu, if one is open. Silent: focus stays
 * where it is. Used when the pointer moves onto another row.
 */
readonly closeSubmenu: () => void;
/**
 * Register an open submenu. Opening another closes the previous one. Returns
 * the release function the submenu calls when it closes or unmounts.
 */
readonly claimSubmenu: (close: () => void) => () => void;
```

Implementation inside `useMenuState`:

```ts
const submenu = useRef<(() => void) | null>(null);

const closeSubmenu = useCallback(() => {
  const close = submenu.current;
  submenu.current = null;
  close?.();
}, []);

const claimSubmenu = useCallback((close: () => void) => {
  const previous = submenu.current;
  submenu.current = close;
  if (previous !== null && previous !== close) previous();
  return () => {
    if (submenu.current === close) submenu.current = null;
  };
}, []);
```

Include both in the returned memo and its dependency array. A ref is correct
here: it is an imperative "which submenu is open" handle, not rendered data, and
putting it in state would re-render every menu row when a submenu opens.

---

## 5. `src/menu/surface.tsx`

At the top of the handler returned by `menuKeyHandler`, ignore an event a nested
surface already claimed:

```ts
return (event: EventPayload): void => {
  if (isEventClaimed(event)) return;
  // ...existing typedChar / Match body unchanged
};
```

Import `isEventClaimed` from `../internal/event-claim.js`. Nothing else changes.

---

## 6. `src/menu/item.tsx`

Destructure `onMouseEnter` from props and close any open submenu when the
pointer enters a row, **before** the caller's handler:

```ts
onMouseEnter={(event) => {
  closeSubmenu();
  onMouseEnter?.(event);
}}
```

`closeSubmenu` comes from `useMenuContext()` alongside `activeId`, `register`,
`noteFocus`, `close`. A silent close is intentional: the pointer is already where
the user put it, so focus must not jump.

A `DropdownMenuSubTrigger` is a `MenuItem` whose own `onMouseEnter` re-opens the
submenu in the same event, so entering the trigger of the open submenu does not
leave it closed (React batches the false→true writes).

---

## 7. `src/dropdown-menu.tsx`

### 7a. Move the outside mark into `close`

`close("outside")` is now reachable from a nested submenu, not only from the
root's dismiss layer. Make the guard part of `close` so every path marks it:

```ts
const close = useCallback((reason: MenuCloseReason) => {
  restoreFocus.current = reason === "activate" || reason === "dismiss";
  if (reason === "outside") {
    dismissedByOutsidePress.current = true;
    queueMicrotask(() => {
      dismissedByOutsidePress.current = false;
    });
  }
  setOpenRef.current(false);
}, []);
```

Remove the same three lines from the dismiss-layer handler; it now only calls
`close("outside")`. This is behaviour-preserving for the root and enables the
submenu's outside press.

### 7b. Ignore claimed events in the content handler

In `DropdownMenuContent`'s `onKeyDown`:

```ts
onKeyDown={(event) => {
  if (isEventClaimed(event)) return;
  keys(event);
  onKeyDown?.(event);
}}
```

Without this, `ArrowDown` inside a submenu would also move the parent highlight
and steal focus back out of the submenu.

### 7c. Sub context

Add next to `DropdownContext`:

```ts
interface SubContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** The SubTrigger row; its bounds position the surface and restore focus. */
  readonly trigger: RefObject<PublicInstance | null>;
}
```

`DropdownMenuSub` composes the parent `MenuContext`:

```tsx
export interface DropdownMenuSubProps {
  readonly children?: ReactNode;
}

export const DropdownMenuSub = ({ children }: DropdownMenuSubProps) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<PublicInstance | null>(null);
  const value = useMemo<SubContextValue>(
    () => ({ open, setOpen, trigger }),
    [open],
  );
  return (
    <SubContext.Provider value={value}>{children}</SubContext.Provider>
  );
};
```

### 7d. `DropdownMenuSubTrigger`

Props extend `MenuItemProps` minus `onSelect`/`closeOnSelect`/`tone`:

```tsx
export interface DropdownMenuSubTriggerProps
  extends Omit<MenuItemProps, "onSelect" | "closeOnSelect" | "tone"> {}
```

Render:

```tsx
const { open, setOpen, trigger: triggerRef } = useSubContext();
const { open: menuOpen } = ... // not needed
const setTrigger = useMergedRef<PublicInstance | null>(triggerRef, ref);

<MenuItem
  role="menuitem"
  aria-expanded={open}
  {...rest}
  ref={setTrigger}
  closeOnSelect={false}
  onSelect={() => setOpen(true)}
  onMouseEnter={() => setOpen(true)}
  onKeyDown={(event) => {
    if (isRight(event)) setOpen(true);
    onKeyDown?.(event);
  }}
  textValue={textValue}
  trailing={
    trailing ?? (
      <text
        aria-hidden
        style={{ ...textStyle(theme, "caption"), color: theme.colors.mutedForeground }}
      >
        ▸
      </text>
    )
  }
>
  {children}
</MenuItem>
```

`textValue` and `trailing` pass through when given. `aria-expanded` on a row is
supported by `HostProps`. Do not add `aria-haspopup`: 0.10.0 has no such prop.

### 7e. `DropdownMenuSubContent`

```tsx
export interface DropdownMenuSubContentProps extends Props {
  /** The submenu's accessible name. */
  readonly label?: string;
  readonly children?: ReactNode;
}
```

The component:

1. Reads `{ open, setOpen, trigger }` from the sub context and the **parent**
   menu with `useMenuContext()` (this runs above the submenu's own provider).
2. Creates its own state: `const menu = useMenuState(close)` where `close` is:

```ts
const close = useCallback(
  (reason: MenuCloseReason) => {
    restoreFocus.current = reason === "dismiss";
    setOpen(false);
    Match.value(reason).pipe(
      Match.when("activate", () => parentClose("activate")),
      Match.when("leave", () => parentClose("leave")),
      Match.when("outside", () => parentClose("outside")),
      Match.when("dismiss", () => undefined),
      Match.exhaustive,
    );
  },
  [parentClose, setOpen],
);
```

   (`parentClose` is the parent `MenuContextValue.close`, stable.)

3. Measures the trigger when opening:

```ts
const GAP = 4;
const [point, setPoint] = useState<{ x: number; y: number } | undefined>();

useLayoutEffect(() => {
  if (!open) {
    setPoint(undefined);
    return;
  }
  const instance = trigger.current;
  if (instance === null) return;
  Option.match(
    Option.fromNullishOr(renderer?.getElementBounds?.(instance.id)),
    {
      onNone: () => undefined,
      onSome: (bounds) =>
        setPoint({ x: bounds.x + bounds.width + GAP, y: bounds.y }),
    },
  );
}, [open, renderer, trigger]);
```

4. Pushes the dismiss layer while open, claims the one-submenu slot, and
   restores focus to the SubTrigger on a keyboard dismissal:

```ts
const closeRef = useRef(close);
useLayoutEffect(() => {
  closeRef.current = close;
});

useLayoutEffect(() => {
  if (!open) return;
  const release = parentClaim(() => setOpen(false));
  const pop = pushDismissLayer((event) => {
    if (event.eventType === "keyDown") closeRef.current("dismiss");
    else closeRef.current("outside");
  });
  return () => {
    pop();
    release();
  };
}, [open, parentClaim, setOpen]);

useLayoutEffect(() => {
  if (open || !restoreFocus.current) return;
  restoreFocus.current = false;
  const instance = trigger.current;
  if (instance !== null) renderer?.focusElement?.(instance.id);
}, [open, renderer, trigger]);
```

   `parentClaim` is `useMenuContext().claimSubmenu`; the silent `setOpen(false)` is
   deliberate — `claimSubmenu` must never move focus.

5. Focuses the first row once the submenu's rows register:

```ts
useLayoutEffect(() => {
  if (!open || menu.rows.length === 0) return;
  menu.step({ _tag: "First" });
}, [menu, open]);
```

6. Renders only while open and measured:

```tsx
if (!open || point === undefined) return null;

return (
  <MenuContext.Provider value={menu}>
    <anchored
      position={point}
      fit="snap"
      snapMargin={8}
      deferred
      priority={1}
      occlude
    >
      <MenuSurface
        testId={testId}
        label={label}
        {...rest}
        onKeyDown={(event) => {
          claimEvent(event);
          if (isLeft(event)) close("dismiss");
          onKeyDown?.(event);
        }}
        style={mergeStyles(
          { maxHeight: 320, overflowY: "scroll" },
          style,
        )}
      >
        {children}
      </MenuSurface>
    </anchored>
  </MenuContext.Provider>
);
```

   `MenuSurface` already paints the shared surface, installs the arrow/type-ahead
   rules, and uses the nearest `MenuContext` (the submenu's). `claimEvent` runs on
   every key so the parent never also reacts; `isLeft` closes this level only.
   `anchored` is the intrinsic host element, not a DOM tag.

7. Exports:

```ts
export {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./dropdown-menu.js"; // natural, they are declared here
```

   Add the three components and their prop types to the existing `export`
   blocks; no other module changes.

---

## 8. Behaviour tests

Add a fixture with two submenus to `src/behaviour/dropdown-menu.test.tsx`:

```tsx
const WithSubmenus = ({ onSelect }: { readonly onSelect: (action: string) => void }) => (
  <div style={{ display: "flex", padding: 40 }}>
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="File actions">
        <DropdownMenuItem testId="rename" onSelect={() => onSelect("rename")}>Rename</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="submenu" label="Share">
            <DropdownMenuItem testId="copy-link" onSelect={() => onSelect("copy-link")}>Copy link</DropdownMenuItem>
            <DropdownMenuItem testId="email" onSelect={() => onSelect("email")}>Email</DropdownMenuItem>
            <DropdownMenuItem testId="blocked" disabled onSelect={() => onSelect("blocked")}>Blocked</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="export">Export</DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="export-menu" label="Export">
            <DropdownMenuItem testId="pdf" onSelect={() => onSelect("pdf")}>PDF</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem testId="delete" onSelect={() => onSelect("delete")}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
```

Eleven tests, each able to fail without the corresponding rule:

1. **keyboard opens and focuses** — click the trigger, `down` to `share`,
   `right`; the submenu exists, focus is `copy-link`, `aria-expanded` on `share`
   is `true`.
2. **click opens at the row's right edge** — click `share`; compare `boundsOf`
   for `share` and `submenu`: `submenu.x >= share.x + share.width` and
   `|submenu.y - share.y| <= 8`.
3. **arrows stay inside** — open `share`; press `down` twice; focus cycles
   `copy-link → email → copy-link` (disabled `blocked` skipped) and never leaves
   the submenu.
4. **Enter runs once and closes both** — open `share`, `down` to `email`,
   `enter`; `onSelect` called once with `"email"`, both `menu` and `submenu`
   gone, focus back on `trigger`.
5. **Escape closes one level** — open `share`, `escape`; submenu gone, parent
   menu still there, focus on `share`; a second `escape` closes the parent and
   focuses `trigger`.
6. **Left closes one level** — same with `left`.
7. **hover opens** — click `trigger`, `hoverCentreOf("share")`; submenu exists
   and focus is `copy-link`.
8. **one submenu at a time** — open `share`, click `export`; `submenu` gone,
   `export-menu` present.
9. **outside press closes both** — open `share`, click an `elsewhere` button;
   both menus gone.
10. **type-ahead is local** — open `share`, type `"e"`; focus is `email`, not the
    parent's `Export` row (this is the claimed-event regression).
11. **pointer onto another row closes it** — hover `share` to open, then hover
    `rename`; the submenu is gone and the parent menu is still open.

Add an `elsewhere` button to the fixture for test 9. Each test unmounts its root.

Expected counts: DropdownMenu behaviour **21 → 32**; behaviour total
**239 → 250**. No logic suite changes.

### Both-direction proof (required by AGENTS §3)

Run each removal; the failure observed on 2026-10-17 is recorded:

- remove `claimEvent` from the submenu surface handler → test 3 fails on the
  first `ArrowDown`: focus jumps to the parent's `Export` row instead of the
  submenu's `Email`, and the un-unmounted root cascades through the rest.
- remove `closeSubmenu()` from `MenuItem`'s mouse-enter → test 11 fails: the
  submenu is still painted after hovering `rename`; two later tests cascade.
- replace `parentClose("outside")` with a no-op → test 9 fails: the submenu
  closes but `menu` is still painted.
- remove the focus-restore effect → test 5 fails with `focusedTestId` = `None`
  after `Escape`; the rest cascade.

All four were reverted and the suite re-ran 32/32 before the gates.

---

## 9. Docs, example, inventory

**`docs/dropdown-menu.mdx`**

- Anatomy table: add the three submenu parts.
- New "Submenus" section with the composition snippet from §1.
- Keyboard table: add `ArrowRight`, `ArrowLeft`, hover, and the note that a
  submenu row closes both levels.
- Limitations: replace "No submenus in v1" with the honest narrower set:
  one level of submenus is tested (deeper nesting follows the same rule but is
  untested), submenus always open to the right and `fit="snap"` clamps them,
  no `aria-haspopup`.
- Verification count: 21 → 32 and list the submenu cases.

**`examples/dropdown-menu.example.tsx`**

Add a `Share` submenu with `Copy link` / `Email`, reporting through
`setLastAction`. Keep the example's existing actions.

**`COMPONENTS.md` and `dropdownMenuMeta`**

Keep `status: "done"`, `gpuixSupport: "partial"`. Update the row and the record's
`limitations` array together (the inventory test checks status/support only, but
they must not drift in prose). New limitations:

```
"one level of submenus is tested; deeper nesting follows the same rule but is untested",
"submenus open to the right and are clamped by fit=\"snap\"; no side flipping beyond that",
"no aria-haspopup in 0.10.0; the submenu relationship is visual",
"type-ahead is a case-insensitive 500 ms prefix search with no fuzzy scoring",
"the checkbox row uses aria-selected instead of aria-checked"
```

**`packages/components/README.md`** — the `dropdown-menu.tsx` row gains
"submenus".

**`TODO.md`** — under "Tier 2 hardening after the inventory closed (plans 120+)"
add and tick: `[x] Dropdown menu submenus — plan 131`.

**`.agents/slop/plans/README.md`** — add plan 131 to the table.

---

## 10. Commands and expected results

From the worktree root:

```sh
nub run --filter @gpuixui/components check-types
# expected: packages/components check-types: Done (no TS errors)

nub run --filter @gpuixui/components test
# expected: 20 files, 199 tests passed (logic unchanged)

nub run --filter @gpuixui/components test:behaviour
# expected: 24 files, 250 tests passed (DropdownMenu 32)

nub run check
# expected: check:tests / lint / fmt / check-types all pass

nub run test
# expected: all workspace suites pass
```

If the behaviour suite cannot load the native binding on this host, record that
exact error and STOP — do not report the tests as passing (plan 117 §5a).

---

## 11. STOP conditions

Stop and report with evidence rather than improvising if:

1. Clicking a submenu row dismisses the parent menu before the row action runs.
   That means `onMouseDownOutside` is bounds-based, not tree-based; the design in
   §7e needs a different outside rule. Do not paper over it with a timed guard.
2. Arrow keys still move the parent highlight after `claimEvent`, i.e. the
   submenu handler does not run before the parent handler. Report the event order
   and stop; do not add a global focus guard.
3. `getElementBounds` on the SubTrigger returns nothing in the real renderer.
   Report the measurement; do not fall back to a fixed offset.
4. `fit="snap"` moves the surface somewhere unrelated to the row. Report the
   measured bounds; do not remove collision handling silently.
5. The dismiss stack closes the parent when the submenu should close alone, or
   vice versa, after §7e's wiring. Report which layer ran.
6. Any existing dropdown/context/command menu test regresses. The change must not
   alter their behaviour.

---

## 12. Acceptance criteria

- Three new exports (`DropdownMenuSub`, `DropdownMenuSubTrigger`,
  `DropdownMenuSubContent`) with JSDoc, typed props and no `any`.
- Submenus open by click, Enter/Space, `ArrowRight` and hover; there is never
  more than one open per menu.
- Keyboard, type-ahead and focus return behave exactly as §1 states, proven by
  the eleven native tests above (and the both-direction runs recorded).
- Both themes: the surface uses the shared `menuSurfaceStyle`; no new literal
  colour.
- Docs page, example, inventory record and `COMPONENTS.md` row updated.
- `check-types`, `test`, `test:behaviour`, `check`, `lint` and `test` pass.
- The plan status line and index are updated when done.
