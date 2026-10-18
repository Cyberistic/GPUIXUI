# 389 — a nested submenu must not swallow clicks on its enclosing rows

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — a nested interaction the docs claimed untested |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `112`, `114`, `117`, `131`, `135`, `323`, `382` |
| Status | done — 4 Dropdown + 1 Context native tests (behaviour 583), both-direction proof: the two enclosing-row cases fail on `HEAD` (`onSelect` 0 calls) and pass with the fix; a `stack` without the enclosing surfaces fails exactly those two |
| Evidence | §1 — measured in the real `TestRenderer` on this host, 2026-10-18 |

This plan is self-contained. Run every command; do not claim a test passed unless
it ran.

---

## 1. Why — the bug, measured

The Dropdown and Context menus share the submenu parts in
`packages/components/src/menu/sub.tsx`. A submenu pushes its own dismiss layer
and ignores a `mouseDownOutside` whose point falls inside its own painted
surface, so a press on one of its rows still reaches the row. That rule only
checks **its own** surface.

When a submenu contains another submenu, a press on a row of the **enclosing**
submenu is outside the deeper surface. The deeper layer treats it as an outside
press, calls `parentClose("outside")`, and the enclosing surface unmounts before
the click lands. The row never runs.

Probe, in the real renderer (a menu whose `Share` submenu contains a `More`
submenu, with a `Copy link` row beside `More`):

```tsx
const menu = renderComponent(<NestedSubmenus onSelect={vi.fn()} />);
clickCentreOf(menu, "trigger");
hoverCentreOf(menu, "share");   // opens Share
hoverCentreOf(menu, "more");    // opens More

clickCentreOf(menu, "copy-link"); // a row of Share, not of More
// observed: onSelect has 0 calls
```

A press on a **root-menu** row while the nested level is open does run (the root
surface has no submenu layer of its own), which is why the one-level suites never
saw this. The bug is specific to an ancestor **submenu** surface.

Two consequences:

- a user cannot pick a row in the submenu they just came from without dismissing
  the deeper level first with `Escape`;
- the outer submenu closes as well (the inner `close("outside")` propagates), so
  the click appears to do nothing at all.

## 2. Fix — the dismiss check covers every enclosing surface

A submenu already renders inside its parent's React tree. Carry the stack of
enclosing menu surfaces through a context, and have each submenu layer treat a
press inside **any** surface in the stack as inside the menu tree:

- `menu/surface.tsx` exports `MenuSurfaceStack`
  (`ReadonlyArray<RefObject<PublicInstance | null>>`, outermost first, default
  `[]`);
- each root content publishes `[surface]`;
- each `MenuSubContent` reads the enclosing stack, publishes
  `[...enclosing, ownSurface]`, and its dismiss handler tests every ref in that
  list.

The root surface is part of the stack for the same reason: a press on root
padding while a submenu is open must not unmount the menu before a row click can
land. A press outside every surface still closes every level (the root layer is
the fallback when no submenu is open; the deepest submenu layer closes and
propagates when the point is outside all of them).

No timer, no geometry heuristic beyond the existing `getElementBounds` read, and
no change to the dismiss-layer stack semantics.

## 3. Files

| Action | Path | Change |
| ------ | ---- | ------ |
| change | `packages/components/src/menu/surface.tsx` | export `MenuSurfaceStack`; `MenuSurface` forwards `ref` to its `div` |
| change | `packages/components/src/menu/sub.tsx` | read the enclosing stack, publish `[...enclosing, own]`, test all surfaces in `insideSurface` |
| change | `packages/components/src/dropdown-menu.tsx` | `DropdownMenuContent` publishes `[surface]` |
| change | `packages/components/src/context-menu.tsx` | `ContextMenuContent` owns a surface ref, passes it to `MenuSurface`, publishes `[surface]` |
| change | `packages/components/src/behaviour/dropdown-menu.test.tsx` | a nested fixture and four cases (§5) |
| change | `packages/components/src/behaviour/context-menu.test.tsx` | a nested fixture and one case (§5) |
| change | `packages/components/examples/dropdown-menu.example.tsx` | the `Share` submenu gains a nested `More` submenu |
| change | `packages/components/examples/context-menu.example.tsx` | the `Share` submenu gains a nested `More` submenu |
| change | `packages/components/docs/dropdown-menu.mdx` | nested behaviour, limitation and the new native count |
| change | `packages/components/docs/context-menu.mdx` | the same |
| change | `packages/components/src/dropdown-menu.tsx` | `dropdownMenuMeta.limitations`: remove the "one level is tested" entry |
| change | `packages/components/src/context-menu.tsx` | `contextMenuMeta.limitations`: remove the same entry |
| change | `COMPONENTS.md` | Tier 2 Dropdown/Context rows: counts and the nesting limitation |
| change | `TODO.md` | add and tick the task under Tier 2 hardening |
| change | `.agents/slop/plans/README.md` | index this plan |

Do **not** touch `packages/primitives`, `packages/tokens`, `apps/*` or the
playground.

## 4. Per-file detail

### 4.1 `src/menu/surface.tsx`

```ts
import type { PublicInstance } from "@gpuix/react";
import { createContext, type RefObject } from "react";

/**
 * The menu surfaces enclosing a part, outermost first. A submenu publishes
 * itself on top so a press on an enclosing row is not an outside press.
 */
export const MenuSurfaceStack =
  createContext<ReadonlyArray<RefObject<PublicInstance | null>>>([]);
```

`MenuSurface` destructures `ref` and passes it to the host `div` before
`{...rest}`. `MenuSurfaceProps` already extends `Props`, which carries `ref`.

### 4.2 `src/menu/sub.tsx`

- import `* as Arr from "effect/Array"` and `MenuSurfaceStack` from
  `./surface.js`;
- `const enclosing = useContext(MenuSurfaceStack);`
- `const stack = useMemo(() => Arr.append(enclosing, surface), [enclosing, surface]);`
- in `insideSurface`, replace the single `surface.current` read with
  `Arr.some(stack, ...)`: for each ref, take `ref.current`, read
  `getElementBounds`, and return true when the event point is inside those
  bounds. A null instance, missing bounds or undefined `x`/`y` contributes
  `false`; when every ref contributes `false`, the press is outside.
- dependencies: `[renderer, stack]` (`stack` is stable while the surface is
  open).
- wrap the `anchored` subtree in
  `<MenuSurfaceStack.Provider value={stack}>`, inside the existing
  `<MenuContext.Provider>`.

Update the header comment: it now says the layer checks its own painted bounds;
it must say it checks every enclosing menu surface, so an enclosing row stays
clickable while a deeper level is open.

### 4.3 `src/dropdown-menu.tsx`

In `DropdownMenuContent`:

```ts
const surfaceStack = useMemo(() => [surface], [surface]);
```

and wrap the returned `FloatingLayer` in
`<MenuSurfaceStack.Provider value={surfaceStack}>`. Import the context from
`./menu/surface.js` beside `menuKeyHandler`/`menuSurfaceStyle`. `surface` is a
stable `useRef` object, so the published array never changes while the content is
mounted.

### 4.4 `src/context-menu.tsx`

In `ContextMenuContent`:

```ts
const surface = useRef<PublicInstance | null>(null);
const surfaceStack = useMemo(() => [surface], [surface]);
```

pass `ref={surface}` to `MenuSurface`, and wrap the `anchored` in
`<MenuSurfaceStack.Provider value={surfaceStack}>`. Import the context from
`./menu/surface.js` beside `MenuSurface`.

`MenuSurface` is a function component; the `ref` is a normal prop in React 19's
`Props` and is spread onto the `div`. Do not add a second internal ref.

## 5. Tests

### 5.1 `src/behaviour/dropdown-menu.test.tsx`

Add a fixture `NestedSubmenus` beside `WithSubmenus`:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
  <DropdownMenuContent testId="menu" label="Actions">
    <DropdownMenuSub>
      <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
      <DropdownMenuSubContent testId="submenu" label="Share">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="more">More</DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="nested" label="More">
            <DropdownMenuItem testId="deep" onSelect={…}>Copy as Markdown</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem testId="copy-link" onSelect={…}>Copy link</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuItem testId="rename" onSelect={…}>Rename</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

plus an outside target `<div testId="elsewhere" />`. Open the chain with
`clickCentreOf(menu, "trigger")`, `hoverCentreOf(menu, "share")`,
`hoverCentreOf(menu, "more")`.

Four cases, all under the existing `DropdownMenu submenus` describe:

1. **`runs a row in the enclosing submenu while a nested submenu is open`** —
   click `copy-link`; `onSelect` is called once with `"copy-link"`, and
   `nested`, `submenu` and `menu` are all undefined. **This is the case that
   fails on today's code** (0 calls).
2. **`runs a root row while a nested submenu is open`** — click `rename`; one
   call, all three surfaces gone. Pins the ancestor rule for the root surface.
3. **`closes every level on an outside press while nested`** — click
   `elsewhere`; `onSelect` never runs and all three surfaces are gone. Guards
   the fix from treating a true outside press as an ancestor press.
4. **`runs the deepest row once and closes every level`** — click `deep`; one
   call with `"deep"`, all surfaces gone. Proves the deepest pointer path still
   works.

### 5.2 `src/behaviour/context-menu.test.tsx`

Add a `NestedSubmenu` fixture in the same shape (`ContextMenu defaultOpen`, a
first `Open` row then `Share` → nested `More` + `Copy link`). Extend the existing
`openSubmenu` helper's sequence by one `right` for the nested case, or write the
sequence inline: `down`, `down`, `right`, `right`.

One case in `ContextMenu submenus`:

5. **`runs an enclosing-submenu row while the nested level is open`** — open the
   chain, click `copy-link`; `onSelect` is called once and both submenus plus the
   root menu are gone. It fails on today's shared code for the same reason.

## 6. Both-direction proof

1. Write the two failing cases **before** the fix and run only those files:

   ```sh
   cd packages/components
   nub exec vitest run --config vitest.behaviour.config.ts \
     src/behaviour/dropdown-menu.test.tsx \
     src/behaviour/context-menu.test.tsx -t 'enclosing'
   ```

   Expected: both cases fail; the Dropdown case reports `0` calls for
   `onSelect`, the Context case the same.

2. Apply §4.1–§4.4, rerun the two files. Expected: all tests pass.

3. Mutation proof: remove `enclosing` from the `stack` in `sub.tsx` (leave only
   `[surface]`) and rerun the two files. Expected: exactly the two
   enclosing-row cases fail (and the outside-press case still passes). Restore
   the line.

## 7. Docs, examples, inventory

- `docs/dropdown-menu.mdx`: in **Submenus**, add one sentence that a submenu can
  contain another and that a press on an enclosing row is not an outside press;
  replace the "one level is tested" limitation with "nested submenus are
  exercised to two levels; placement and dismissal follow the same rule"; change
  the verification count from `42` to `46` and mention the nested pointer cases.
- `docs/context-menu.mdx`: same limitation replacement; count `20` → `21` and
  one nested sentence in the verification paragraph.
- Both examples gain a nested `More` submenu under `Share`, with two rows that
  set `lastAction` (e.g. "Copy as Markdown" / "Copy as HTML"). They must remain
  valid under the example registry test (no new exports required).
- `COMPONENTS.md`: Dropdown row count `42` → `46`, Context row `20` → `21`; in
  both rows replace "No deeper nesting is tested" with "Nested submenus are
  verified to two levels".
- Remove the matching "one level of submenus is tested" entry from
  `dropdownMenuMeta.limitations` and `contextMenuMeta.limitations`. A limitation
  array is never omitted; it simply no longer contains that line.
- `TODO.md`: add and tick under **Tier 2 hardening after the inventory closed**:
  `Nested submenu rows stay clickable while a deeper level is open — plan 389;
  4 dropdown + 1 context native tests, both-direction proof (behaviour 583)`.
- `.agents/slop/plans/README.md`: append row 389 with status
  `done — ...` after the implementation and gates pass.

## 8. Commands and expected results

```sh
cd packages/components
nub run check-types                 # exit 0
nub run test                        # logic suites + guard; green
nub run --filter @gpuixui/components test:behaviour
                                    # 583 passed, 48 files
cd ../..
nub run check                       # check:tests, lint, fmt, types; exit 0
nub run test                        # every workspace test; exit 0
nub run lint                        # exit 0
```

## 9. STOP conditions

- `MenuSurfaceStack.Provider` cannot wrap `FloatingLayer` without changing the
  anchored layout: **STOP** and report; do not move the surface or re-anchor it.
- `MenuSurface`'s `ref` is not forwarded to the host `div` by the installed
  `@gpuix/react@0.10.0` types: **STOP** and report the type error; do not add an
  `any` or a cast.
- The enclosing-row cases still fail after the fix, or an outside press no
  longer closes every level: **STOP**, record the failing bounds and event
  coordinates, and do not weaken the outside-press test.
- Any existing native case regresses: **STOP**; the shared submenu path is used
  by both menus and a regression there is a blocker, not a test to adjust.

## 10. Acceptance criteria

- Both new enclosing-row cases fail on `HEAD` and pass with the fix.
- One outside press still closes every open level; one `Escape` still closes one
  level.
- Nested submenus work to two levels by keyboard, hover and pointer, in both
  Dropdown and Context menus.
- The example registry mounts both updated examples in the native suite.
- Docs, `COMPONENTS.md`, the two inventory records and `TODO.md` agree with the
  real suite (583 native tests).
- `nub run check`, `nub run lint` and `nub run test` are green.
