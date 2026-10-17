# 309 — Drawer: an edge-anchored modal panel

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §5 (D8), `112` (dialog shell) |
| Status | done — 10 native tests; Dialog's 18 re-pass after the extraction |
| Source | `docs/component-api.md` §8 (planned parts: `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter`); `COMPONENTS.md` → Tier 2 → Drawer; plan `205` D8 |

This plan is self-contained. It adds `Drawer` at the Tier 2 bar: code, native
behaviour tests that can fail, an example, a docs page, an inventory record and a
`COMPONENTS.md` row.

---

## 1. Why

Otherwise a consumer that needs an edge panel (filters, details, a settings
sheet) must re-implement the dialog's veil, dismiss stack, focus trap and focus
return. Those rules must exist once. `Drawer` is the modal shell with an edge
alignment instead of a centre.

There is **no `Dialog` in published `@gpuix/react@0.10.0`** and no portal
(measured, plan 112 §1b/§1c). A drawer is therefore the same local shell as
`Dialog`: an `<anchored position={{x:0,y:0}}>` veil at window coordinates, plus
the topmost-layer dismiss stack and the renderer's focus handles.

## 2. The target API

```tsx
<Drawer>
  <DrawerTrigger>Filters</DrawerTrigger>
  <DrawerContent side="right" size="md" label="Filters">
    <DrawerHeader>
      <DrawerTitle>Filters</DrawerTitle>
      <DrawerDescription>Narrow the result set.</DrawerDescription>
    </DrawerHeader>
    {/* fields */}
    <DrawerFooter>
      <DrawerClose>Cancel</DrawerClose>
      <Button variant="primary">Apply</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Drawer` | open state (controlled/uncontrolled), the dismiss layer, the mode context | `open?`, `defaultOpen?`, `onOpenChange?`, `dismissible?` (default `true`), children |
| `DrawerTrigger` | opens/closes, `aria-expanded` | the local `ButtonProps` |
| `DrawerClose` | closes | the local `ButtonProps` |
| `DrawerContent` | veil + surface, focus in/return, Tab trap, Escape/outside dismissal | `side?` (`"right"` default), `size?` (`"sm"\|"md"\|"lg"`, default `"md"`), `label` (required), `showClose?` (default `true`), `initialFocus?`, children |
| `DrawerHeader` | title block | children |
| `DrawerTitle` | `role="heading"`, `aria-level={2}` | text props |
| `DrawerDescription` | muted supporting copy | text props |
| `DrawerFooter` | right-aligned actions | children |

**Modes.** `side` is split into two honest shapes:

- `"left"` / `"right"`: a full-height column of width 320/400/560
  (`sm`/`md`/`lg`), aligned to that edge;
- `"bottom"`: a full-width sheet of height 240/320/420, aligned to the bottom.

The numbers are layout constants, exactly as `Dialog`'s `MAX_WIDTH` is; tokens
carry no drawer-size role. Record that in the docs and the inventory row.

**Not in v1.** Swipe-to-dismiss (no drag host feature — `COMPONENTS.md` Tier 5
records this), slide animation (`motion` has no transform; animating width/left
would reflow the content), and nesting a drawer inside a drawer (it shares the
dismiss stack, so it works, but no test promises it until measured).

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/internal/modal.ts` | **create** — extract `useModalState`, `useModalFocus`, `modalKeyDown` from `dialog.tsx` unchanged; Dialog keeps its 13 tests as the guard |
| `packages/components/src/dialog.tsx` | **change** — consume the three hooks; no behaviour change |
| `packages/components/src/drawer.tsx` | **create** — the parts above, the context, `drawerMeta` |
| `packages/components/src/index.ts` | add `export * from "./drawer.js";` |
| `packages/components/src/inventory.ts` | import and list `drawerMeta` |
| `packages/components/src/behaviour/drawer.test.tsx` | **create** — 9 tests (§6) |
| `packages/components/examples/drawer.example.tsx` | **create** — a filter drawer with a real Apply/Cancel flow, right and bottom |
| `packages/components/docs/drawer.mdx` | **create** — anatomy, usage, sides/sizes, dismissal, focus, theming, accessibility, limitations, verification |
| `docs/component-api.md` | move Drawer into the built Tier 2 table; add `DrawerClose` to its parts; source `plan 309` |
| `COMPONENTS.md` | Drawer row → `done` / `partial`, 9 native tests, the limitations |
| `TODO.md` | tick Drawer under the Tier 2 gap list |
| `.agents/slop/plans/README.md` | add this plan to the components table |

No new dependency.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: 30+1 suites pass; Drawer 9
nub run --filter @gpuixui/components test             # expected: unit suites + inventory pass
nub run check                                         # expected: exit 0
nub run lint                                          # expected: exit 0
nub run test                                          # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- the modal-hook extraction changes any Dialog test result — revert the
  extraction and implement the drawer's focus logic locally with a plan update;
- `aria-expanded` is not in the accessibility dump on the trigger (it is
  supported in 0.10.0; if it regresses, drop it and record);
- the veil's bounds are not the window's (the `position:"absolute"` trap from
  plan 112 §1c) — use the anchored veil, never `position:"absolute"` on the box;
- a side needs a token role the theme does not ship; record an interlock, never a
  literal colour.

## 6. Test plan

`src/behaviour/drawer.test.tsx`, real GPUix renderer, both themes:

1. renders nothing until the trigger is clicked;
2. the content is a `role="dialog"` named by `label` and the trigger reports
   `aria-expanded`;
3. the veil covers the window;
4. focus moves into the surface on open and returns to the trigger on close;
5. Escape closes it; `dismissible={false}` ignores Escape;
6. an outside press closes it;
7. Tab stays inside the surface (`focusNextWithin` wraps);
8. `side="right"` aligns the surface to the right edge, `side="bottom"` to the
   bottom (bounds from `boundsOf`), `size` changes the width/height;
9. controlled `open` + `onOpenChange` drive the drawer without internal state.

**Both directions.** Remove the `pushDismissLayer` call from the drawer root:
tests 5 and 6 fail. Reverse the side alignment for `right`: test 8 fails.
Restore after each.

## 7. Acceptance criteria

- Eight exported parts with JSDoc; `Drawer` reuses the extracted modal hooks and
  `Dialog` still passes its 13 tests unchanged.
- Nine native tests, both themes, no literal colours.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's
  §8 row agree.
- All gates and the behaviour suite green.

## 8. Result

Landed 2026-10-18:

- `src/internal/modal.ts` — `useModalState`, `useModalFocus` and
  `handleModalKeyDown`, extracted from Dialog with no behaviour change; Dialog
  and Confirmation dialog still pass their 18 tests. `handleModalKeyDown` takes
  the renderer as an argument (it is called from an event handler, so it must not
  call a hook).
- `src/drawer.tsx` — eight parts. The veil is the window-sized `<anchored>` from
  plan 112 §1c, laid out as a row or column so the surface sits on the requested
  edge; `size` maps to width (left/right) or height (bottom), capped by the
  window.
- `src/behaviour/drawer.test.tsx` — 10 tests (one more than planned: the theme
  check is its own test). Focus, the Tab trap, all three sides and sizes, and
  the uninterruptible path are measured, not assumed.
- **Both directions:** dropping the dismiss layer fails 7 tests (Escape, the
  backdrop, focus return, the trap, the theme and the controlled case cascade);
  flipping the edge alignment fails the sides test. Restored: 10 native green.
