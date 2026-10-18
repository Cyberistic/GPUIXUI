# 382 — Submenu placement: open left when the right side has no room

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `112` (overlays), `114` (menus), `131` (submenus), `323` (floating placement), `376` (preview/nav placement) |
| Status | done — 7 rule + 2 native tests (Dropdown menu 36, Context menu 18, behaviour 557); both-direction proof: reverting `sub.tsx` fails both native cases (`expected 1272 to be less than or equal to 1097/1005`). |

## 1. The problem

`MenuSubContent` (`src/menu/sub.tsx`) always positions its surface at the trigger
row's **right** edge:

```ts
setPoint({
  x: bounds.x + bounds.width + SUBMENU_GAP,
  y: bounds.y,
});
```

The surface is then handed to `<anchored fit="snap" snapMargin={8}>`. The runtime
does not flip; it clamps the surface inside the window (plan 323 §1). Near the
right edge that means the submenu is pushed **left over its own trigger row and
the parent menu**, instead of opening on the left.

Measured on this host (2026-10-18, the probe in §4.1) with the 1280×800 test
window and a menu trigger at `paddingLeft: 1000`:

```
row      { x: 1005, y: 141, width: 170, height: 28 }
menu     { x: 1000, y: 136, width: 180, height: 38 }
submenu  { x: 1092, y: 141, width: 180, height: 38 }   ← snapped 83 px over its row
```

`row` ends at 1175 and the parent menu at 1180, so the submenu covers both — the
pointer that is on the row is already inside the submenu. The same defect applies
to **Context menu** submenus, because both menus compose this part.

`COMPONENTS.md` and `docs/dropdown-menu.mdx` already record it as a limitation:

> Submenus open to the right of their trigger and rely on `fit="snap"` to stay in
> the window; there is no left-side flip.

## 2. Scope

**In scope**

- `src/menu/sub-placement.ts` (new): a pure `resolveSubmenuPoint` rule.
- `src/menu/sub-placement.test.ts` (new): unit tests for the rule.
- `src/menu/sub.tsx`: measure the surface once per open and apply the rule.
- `src/behaviour/dropdown-menu.test.tsx`: one native test for the left-side flip
  (and update the suite header).
- `src/behaviour/context-menu.test.tsx`: one native test proving the shared rule
  applies under the pointer-positioned menu.
- `src/dropdown-menu.tsx` and `src/context-menu.tsx`: drop the stale limitation.
- `docs/dropdown-menu.mdx` / `docs/context-menu.mdx`: placement prose, limitation
  bullet and Verification counts.
- `COMPONENTS.md` rows and test counts.
- `TODO.md` and `.agents/slop/plans/README.md`.

**Out of scope — do not touch**

- No new public prop. The flip is measured and automatic, like the root surface's
  `resolveSide` (plan 323). A caller-requested `side` for RTL belongs with the RTL
  plan (`435c`).
- No change to the runtime dependency or `@gpuix/react` version.
- No change to the root menu placement, row keyboard rules, dismissal or
  focus behaviour.
- No file outside `packages/components/`, `COMPONENTS.md`, `TODO.md` and this
  plan set.

## 3. Files and exact changes

### 3.1 New `packages/components/src/menu/sub-placement.ts`

A pure rule, mirroring the style of `src/internal/placement.ts` (no React, no
runtime import beyond types). It answers one question: where does a submenu's
top-left corner go, given the row, the measured surface and the window?

```ts
/**
 * Placement for a menu submenu, measured once per open.
 *
 * The runtime snaps a surface inside the window but never flips it (plan 323), so
 * a right-edge submenu would be clamped back over its own row. This rule opens it
 * on the left when the right side cannot hold it, and bottom-aligns it to the row
 * when there is not enough room below. When neither horizontal side fits, the
 * roomier side wins and the runtime's snap does the rest.
 */

import type { FloatingBounds, WindowBounds } from "../internal/placement.js";

export interface SubmenuPlacementInput {
  /** The trigger row's measured box, in window coordinates. */
  readonly row: FloatingBounds;
  /** The submenu's measured box (only its size is used). */
  readonly surface: FloatingBounds;
  readonly window: WindowBounds;
  /** The gap between the row and the surface. Default 4. */
  readonly gap: number;
  /** The margin kept from the window edge. Default 8. */
  readonly margin: number;
}

export interface SubmenuPoint {
  readonly x: number;
  readonly y: number;
}

export const resolveSubmenuPoint = ({
  row,
  surface,
  window,
  gap,
  margin,
}: SubmenuPlacementInput): SubmenuPoint => { … };
```

Rules, in order:

1. `right = row.x + row.width + gap`, `left = row.x - gap - surface.width`.
2. `fitsRight = right + surface.width <= window.width - margin`.
3. `fitsLeft = left >= margin`.
4. x: `fitsRight` → `right`; else `fitsLeft` → `left`; else the side with more
   room (`window.width - margin - right` vs `left - margin`) — ties choose right.
   This is one measurement, never a toggle.
5. y: when `row.y + surface.height <= window.height - margin`, use `row.y`.
   Otherwise bottom-align to the row (`row.y + row.height - surface.height`) and
   clamp into `[margin, max(margin, window.height - margin - surface.height)]`.
   A surface taller than the window therefore starts at `margin`.

No `Math.min`/`Math.max` in domain code? `Math` is not a collection helper; the
repo already uses arithmetic directly. Keep it simple and pure.

### 3.2 New `packages/components/src/menu/sub-placement.test.ts`

Cover the rule, not a render:

- `fits on the right` — row at x 100, width 100, surface 180, window 1280 → x 204.
- `flips left at the right edge` — row x 1005, width 170, surface 180, window
  1280, gap 4, margin 8 → x `1005 - 4 - 180 = 821`; assert
  `x + 180 <= row.x` (the surface ends before the row starts) **and** that it is
  inside the window.
- `picks the roomier side when neither fits` — surface wider than either side:
  assert the rule names the side with the larger room (choose numbers where the
  right is roomier by 1 px).
- `prefers the right side on a tie` — equal room on both sides chooses right.
- `keeps the row's top when it fits below` — row y 100, height 28, surface height
  200, window 800 → y 100.
- `bottom-aligns a tall submenu to its row` — row y 700, height 28, surface
  height 200, window 800, margin 8 → y `700 + 28 - 200 = 528`.
- `starts at the margin when the surface is taller than the window` — surface
  height 900 → y 8.

Each case is intentional and can fail: change any branch and one of the numbers
moves.

### 3.3 `packages/components/src/menu/sub.tsx`

1. Import the rule:

   ```ts
   import { resolveSubmenuPoint } from "./sub-placement.js";
   ```

2. Replace the `SUBMENU_GAP` comment with two named constants:

   ```ts
   /** The gap between the trigger row and its submenu surface, in pixels. */
   const SUBMENU_GAP = 4;
   /** The margin the submenu keeps from the window edge, matching snapMargin. */
   const SUBMENU_MARGIN = 8;
   ```

3. Keep the existing first effect that sets the tentative right-hand point when
   the submenu opens, and add a second one-shot effect after it:

   ```ts
   /** Resolve the side after the first paint; one decision per open. */
   const settled = useRef(false);
   useLayoutEffect(() => {
     if (!open) {
       settled.current = false;
       return;
     }
     if (point === undefined || settled.current) return;
     const row = Option.fromNullishOr(
       renderer?.getElementBounds?.(trigger.current?.id ?? -1),
     );
     const measured = Option.all({
       row,
       surface: Option.flatMap(
         Option.fromNullishOr(surface.current),
         (element) =>
           Option.fromNullishOr(renderer?.getElementBounds?.(element.id)),
       ),
       window: Option.fromNullishOr(renderer?.getWindowSize?.()),
     });
     if (Option.isNone(measured)) return;
     settled.current = true;
     setPoint(
       resolveSubmenuPoint({
         gap: SUBMENU_GAP,
         margin: SUBMENU_MARGIN,
         ...measured.value,
       }),
     );
   }, [open, point, renderer, trigger]);
   ```

   - The effect re-runs after `setPoint` but `settled.current` short-circuits it,
     so the surface cannot oscillate.
   - The tentative right-hand point is still rendered for one frame; the
     corrected point lands on the next render, exactly like the root surface's
     `usePlacement` (plan 323 §4).
   - Keep `fit="snap"` and `snapMargin={SUBMENU_MARGIN}`; the runtime still does
     the final clamp when neither side fits.
   - Update the `MenuSubContent` JSDoc: "Its position is the row's right edge when
     that fits, otherwise its left edge; a surface taller than the room below is
     bottom-aligned to the row (plan 382)."

4. Do not change `insideSurface`: it reads the final painted bounds, so it keeps
   working on either side.

### 3.4 `packages/components/src/behaviour/dropdown-menu.test.tsx`

1. Header: add a guarded-bug paragraph:

   ```
   * Submenu placement regression: a submenu was always placed to the right of its
   * row and relied on `fit="snap"`, so near the right window edge it was clamped
   * back over the row and the parent menu instead of opening to the left.
   ```

2. New fixture near the right edge:

   ```tsx
   /** A menu at the right edge, where a right-hand submenu cannot fit. */
   const RightEdgeSubmenu = () => (
     <div style={{ paddingLeft: 1000, paddingTop: 100 }}>
       <DropdownMenu defaultOpen>
         <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
         <DropdownMenuContent testId="menu" label="Actions">
           <DropdownMenuSub>
             <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
             <DropdownMenuSubContent testId="submenu" label="Share">
               <DropdownMenuItem testId="copy">Copy link</DropdownMenuItem>
             </DropdownMenuSubContent>
           </DropdownMenuSub>
         </DropdownMenuContent>
       </DropdownMenu>
     </div>
   );
   ```

3. New test in `describe("DropdownMenu submenus")`:

   ```ts
   it("opens to the left when the right side cannot hold it", () => {
     const menu = renderComponent(<RightEdgeSubmenu />);
     clickCentreOf(menu, "share");

     const row = requireBounds(menu, "share");
     const surface = requireBounds(menu, "submenu");

     expect(surface.x + surface.width).toBeLessThanOrEqual(row.x);
     expect(surface.x).toBeGreaterThanOrEqual(8);
     expect(Math.abs(surface.y - row.y)).toBeLessThanOrEqual(8);

     menu.unmount();
   });
   ```

   `defaultOpen` avoids depending on trigger click timing; the existing
   right-side test (`opens to the right of its trigger row`) stays and proves the
   other direction. Both together are the two-direction proof.

4. Suite count 35 → 36.

### 3.5 `packages/components/src/behaviour/context-menu.test.tsx`

1. Header: add one line to the submenu-regression paragraph: the shared placement
   rule also applies to the pointer-positioned menu.
2. New fixture:

   ```tsx
   /** A row at the right edge, whose submenu cannot open further right. */
   const RightEdgeSubmenu = ({ onSelect }: { readonly onSelect: (a: string) => void }) => (
     <div style={{ paddingLeft: 1000 }}>
       <ContextMenu defaultOpen>
         <ContextMenuTrigger testId="row" style={{ width: 180, height: 40 }}>
           <text>Project</text>
         </ContextMenuTrigger>
         <ContextMenuContent testId="menu" label="Project actions">
           <ContextMenuSub>
             <ContextMenuSubTrigger testId="share">Share</ContextMenuSubTrigger>
             <ContextMenuSubContent testId="submenu" label="Share">
               <ContextMenuItem testId="copy-link" onSelect={() => onSelect("copy-link")}>
                 Copy link
               </ContextMenuItem>
             </ContextMenuSubContent>
           </ContextMenuSub>
         </ContextMenuContent>
       </ContextMenu>
     </div>
   );
   ```

3. New test in the submenu describe:

   ```ts
   it("opens its submenu to the left at the right window edge", () => {
     const menu = renderComponent(<RightEdgeSubmenu onSelect={vi.fn()} />);
     clickCentreOf(menu, "share");

     const row = requireBounds(menu, "share");
     const surface = requireBounds(menu, "submenu");

     expect(surface.x + surface.width).toBeLessThanOrEqual(row.x);
     expect(surface.x).toBeGreaterThanOrEqual(8);

     menu.unmount();
   });
   ```

   Import `requireBounds` from `../internal/interaction.js` (the file currently
   uses `boundsOf` + a local unwrap; adding the shared helper is fine).

4. Suite count 17 → 18.

### 3.6 `packages/components/src/dropdown-menu.tsx` and `src/context-menu.tsx`

- `dropdownMenuMeta.limitations`: replace
  `'submenus open to the right and are clamped by fit="snap"; there is no left-side flip'`
  with
  `'submenus open right when they fit and otherwise left of their row; a surface wider than both sides is still clamped by fit="snap"'`.
- `contextMenuMeta.limitations`: add the same sentence about submenu sides (the
  row did not state it before).

### 3.7 `packages/components/docs/dropdown-menu.mdx`

1. Replace the placement paragraph:

   > The surface is positioned at the trigger row's right edge in window
   > coordinates and clamped by GPUix's `fit="snap"`.

   with a description of the measured rule: first paint at the row's right edge,
   then one measurement; if the surface fits on the right it stays, otherwise it
   opens at the row's left edge; a surface taller than the room below is
   bottom-aligned to the row; a surface wider than the window is clamped by
   `fit="snap"` and the roomier side wins. State that the decision is one-shot per
   open.
2. Limitations: drop the "no left-side flip" bullet and add
   "a surface wider than both sides is still clamped by the runtime".
3. Verification: `(35 tests)` → `(36 tests)` and name the right-edge flip case.

### 3.8 `packages/components/docs/context-menu.mdx`

1. In **Submenus**, add one sentence: the surface uses the same measured rule as
   the Dropdown menu's submenus (right when it fits, otherwise left of its row).
2. Verification: `(17 tests)` → `(18 tests)` and name the case.

### 3.9 `COMPONENTS.md`

- **Dropdown menus** row: `35 native behaviour tests` → `36`; remove
  "submenus only open right" from the limitations clause and say "a submenu opens
  left when the right side has no room".
- **Context menus** row: `17 native behaviour tests` → `18`; add the same
  placement clause.

### 3.10 `TODO.md`

Under **Tier 2 hardening after the inventory closed**, add and tick:

```
- [x] Submenu placement truth: a submenu opens left when the right side cannot
  hold it (measured once per open), so it never covers its own row at the window
  edge — plan 382; 6 rule + 2 native tests, both-direction proof (Dropdown menu
  36, Context menu 18, behaviour 559)
```

Also tick/close the plan 323-related cross-team note if it names this gap — it
does not, so no other row changes.

### 3.11 `.agents/slop/plans/README.md`

Add plan 382 to the components table with the final status and counts.

## 4. Commands and expected results

Run from `workspaces/components`.

### 4.1 Reproduce the defect before changing code

Temporary probe (do **not** commit): render a `DropdownMenu defaultOpen` at
`paddingLeft: 1000` with a `Share` submenu, click `share`, and print
`row`/`menu`/`submenu` bounds. Expected on the current code: `submenu.x` is
`1092` while `row` ends at `1175` — the overlap in §1. Delete the probe after
recording the numbers.

### 4.2 Unit suite

```sh
nub run --filter @gpuixui/components test
```

Expected: 38 files (a new `sub-placement.test.ts`), unit 362 + 7 = 369, all
passing. The new rule file is pure; no native binding needed.

### 4.3 Behaviour suite

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected: 47 files, Dropdown menu 36, Context menu 18, behaviour 555 + 2 = 557.

### 4.4 Gates

```sh
nub run check
nub run lint
nub run test
```

Expected: exit 0. `check` re-runs lint, fmt, the test-quality check and every
workspace's `check-types`; the inventory test picks up the corrected counts and
the docs Verification lines.

## 5. Both-direction proof

1. **Without the fix:** run only the two new behaviour tests. Both fail:
   `expected 1272 to be less than or equal to 1097` (Context) and
   `expected 1272 to be less than or equal to 1005` (Dropdown) — the right
   window edge clamps the surface back over the row. Recorded 2026-10-18.
2. **With the fix:** both pass; the existing `opens to the right of its trigger
   row` still passes, proving the right side was not broken.
3. **Rule mutation:** change the `fitsRight` comparison from `<=` to `<` or swap
   the left/right branches; the unit case `flips left at the right edge` fails
   while the `fits on the right` case stays green. Restore.
4. **No oscillation:** the new native test's bounds are stable across two
   consecutive renders of the same open submenu (the suite's normal re-renders
   exercise this); the `settled` guard is what makes it one-shot.

## 6. Acceptance criteria

- A submenu at the right window edge opens fully **left** of its row and stays
  inside the window, in both Dropdown and Context menus.
- A submenu with room on the right still opens right (existing test green).
- The decision is measured once per open; no toggle, no loop.
- Unit, behaviour, `check`, `lint` and `test` gates pass.
- `COMPONENTS.md`, both docs pages, both inventory records, `TODO.md` and the
  plan index agree with the suites' real counts.

## 7. STOP conditions

Stop and report, do not improvise, if:

- the measured surface cannot be read after mount (`getElementBounds` returns
  `null` for the submenu) — the one-shot measurement design is then invalid;
- correcting the point re-renders forever, or the submenu jumps between sides on
  consecutive frames;
- opening left breaks focus, the outside-press geometry (`insideSurface`) or the
  Escape stack — those are shared with the right-side path and must be unchanged;
- the runtime's snap overrides an explicit left point (measured `surface.x` is
  still right of the row) — then the runtime offers no way to place a surface
  left and the limitation must be recorded with the measurement instead.
