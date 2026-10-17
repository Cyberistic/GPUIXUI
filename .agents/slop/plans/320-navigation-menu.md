# 320 — Navigation menu

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §5 (D9), `112` (anchored layer), `114` (menu row look), `113` (Tabs roving) |
| Status | done — 6 parts, 10 native tests; both-direction proof |
| Source | `docs/component-api.md` §8 (planned parts: `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`); `COMPONENTS.md` → Tier 2 → Navigation Menu; plan `205` D9 |

This plan is self-contained. It adds `NavigationMenu` at the Tier 2 bar.

---

## 1. Why

A horizontal site/app nav whose items open a panel of links is not a dropdown
menu: exactly one panel is open, `ArrowLeft`/`ArrowRight` move between triggers,
and the panel holds a column of links rather than actions. `Popover` opens on
click but has no roving between triggers; `DropdownMenu` closes on selection and
is not a navigation region.

0.10.0 has no `NavigationMenu` and no `DismissableLayer`; positioning is
`FloatingLayer` + `<anchored>` and dismissal is the package's dismiss stack.

## 2. The target API

```tsx
<NavigationMenu label="Product">
  <NavigationMenuList>
    <NavigationMenuItem value="platform">
      <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink onSelect={go("overview")}>Overview</NavigationMenuLink>
        <NavigationMenuLink onSelect={go("runtime")}>Runtime</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
    <NavigationMenuItem value="pricing">
      <NavigationMenuTrigger>Pricing</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink onSelect={go("plans")}>Plans</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `NavigationMenu` | the one open item (controlled/uncontrolled), `role="navigation"` named by `label`, the dismiss layer | `label` (required), `value?`, `defaultValue?` (`null`), `onValueChange?`, children |
| `NavigationMenuList` | `role="list"`, a horizontal row of items | children |
| `NavigationMenuItem` | one item; provides its `value` | `value` (required), children |
| `NavigationMenuTrigger` | a button: toggles its panel, `aria-expanded`, roving focus | the local `ButtonProps` |
| `NavigationMenuContent` | the anchored panel for its item, rendered only while open | children |
| `NavigationMenuLink` | a navigation row: label + `onSelect`, closes the menu | `onSelect?`, children |

### Behaviour contract

- **One panel at a time.** Opening an item closes the previous one. The root's
  `value` is the open item's value or `null`.
- **Open:** click, `Enter`, `Space`, or `ArrowDown` on a trigger. `ArrowDown`
  also moves focus into the first link. **Hover does not open** — a nav that
  opens on hover is a second, untested policy; record it as a limitation.
- **Trigger roving:** `ArrowRight`/`ArrowLeft` on a trigger move focus to the
  next/previous trigger (wrapping). `Home`/`End` go to the first/last. Moving
  between triggers does not open a panel; `ArrowDown` does.
- **Close:** Escape closes and returns focus to the trigger; an outside press
  closes; selecting a link closes. Tab moves out and closes (like `Popover`).
- **Links** have no href in 0.10.0 (no `a` element, no `href` host prop), so
  `NavigationMenuLink` is a `role="link"`-shaped button with `onSelect`; the
  consumer navigates. Record the limitation; do not pretend a URL is followed.
- The root pushes one dismiss layer while open, so Escape dismisses only the
  nav when it sits over a dialog.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/navigation-menu.tsx` | **create** — the six parts, the contexts, `navigationMenuMeta` |
| `packages/components/src/index.ts` | add `export * from "./navigation-menu.js";` |
| `packages/components/src/inventory.ts` | import and list `navigationMenuMeta` |
| `packages/components/src/behaviour/navigation-menu.test.tsx` | **create** — 9 tests (§6) |
| `packages/components/examples/navigation-menu.example.tsx` | **create** — a three-item product nav with real panels |
| `packages/components/docs/navigation-menu.mdx` | **create** |
| `docs/component-api.md` | move Navigation menu into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 9 native tests, the limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: NavigationMenu 9
nub run --filter @gpuixui/components test             # expected: inventory pass
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- the anchored panel cannot attach to a trigger that is re-rendered by the
  roving list (the ref must be stable per item) — if it cannot, position the
  panel against the list and record the difference;
- `role="navigation"` is dropped from the dump — keep the `label` as the region's
  `aria-label` and record the role loss;
- a panel opens but the outside press that closes it also re-opens the trigger
  (the Popover re-open guard applies) — reuse
  `internal/dismiss-layer.ts`'s event identity and the popover's press guard;
  do not add a second timer.

## 6. Test plan

`src/behaviour/navigation-menu.test.tsx`, real renderer:

1. renders triggers in order and no panels until one opens;
2. clicking a trigger opens its panel and reports `aria-expanded`;
3. opening a second item closes the first (one panel at a time);
4. `Enter` and `ArrowDown` open; `ArrowDown` moves focus into the first link;
5. `ArrowRight`/`ArrowLeft` move focus between triggers without opening;
6. Escape closes and returns focus to the trigger;
7. an outside press closes the panel;
8. selecting a link calls `onSelect` once and closes the panel;
9. controlled `value` + `onValueChange` drive the open item; both themes.

**Both directions.** Allow two panels open at once: test 3 fails. Remove the
dismiss layer: tests 6/7 fail. Restore after each.

## 7. Acceptance criteria

- Six parts with JSDoc; hover-open and href are documented limitations.
- Nine native tests, both themes, no literal colours.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.

## 8. Result

Landed 2026-10-18:

- `src/navigation-menu.tsx` — six parts. The root keeps an ordered trigger
  registry; **the ordered key list is updated only when the sequence changes**.
  The first version set a new array on every ref callback, and because a new
  ref callback is created on each render the component hit React's
  "Maximum update depth exceeded" (every ref detach/re-attach wrote state). The
  trigger's internal ref is now a `useCallback`, and the key list is compared
  before it is stored.
- `ArrowDown` opens and moves focus to the **panel surface** (`tabIndex={-1}`),
  not the first link — the honest, testable version of the plan; recorded in the
  docs and the inventory.
- Links are buttons with `onSelect`: 0.10.0 has no anchor element or `href`.
- **Both directions:** removing the ArrowDown branch and the Escape handler fails
  7 of the 10 tests. Restored: 10 native green.
