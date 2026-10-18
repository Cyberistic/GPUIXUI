# 476 — Two more live scenes: Drawer and Navigation menu

**Phase:** F (showcase completeness) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the live surface and the scene contract), 461 (the two
records), 475 (a scene's canvas must be sized)

## 1. Why

`src/components/preview/gaps.ts` lists nine delivered pages with no live scene,
and two of its reasons are no longer true:

- **Drawer** — "the panel exists only while open and is anchored by its trigger".
  `Drawer` takes `defaultOpen` (`packages/components/src/drawer.tsx:97`), so a
  scene can mount the real edge panel open.
- **Navigation menu** — "the panel exists only while open". `NavigationMenu`
  takes a controlled `value` and `defaultValue`
  (`packages/components/src/navigation-menu.tsx:98–99`), so a scene can open one
  item's real anchored panel.

Both are interactions a still cannot prove: an open surface, its focus entry
(Drawer) and its anchored placement (Navigation menu). The gap file itself says
a reason that stops being true is a failure, not a reword. This plan moves both
pages to tier L and removes the two reasons.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | Add `drawer` and `navigation-menu` to `LIVE_SCENES`; add both to `SCENE_TEXT` with text the component paints. |
| `apps/docs/preview/scene-views.tsx` | Import the real parts; add `DrawerScene` (open `side="right"`, title/description/footer) and `NavigationMenuScene` (open `value="platform"`); register both in `LIVE_SCENE_VIEWS`. |
| `apps/docs/src/component-meta/entries.ts` | `liveScene: "drawer"` on the Drawer record; `liveScene: "navigation-menu"` on the Navigation Menu record. |
| `apps/docs/src/components/preview/gaps.ts` | Remove the `drawer` and `navigation-menu` entries. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | Add both to `interactionScenes`, so the record ↔ scene pairing is pinned. |
| `docs/preview-strategy.md` | Tier L list and counts: eleven scenes → thirteen, nine gaps → seven; remove the two rows. |
| `apps/docs/README.md` | The live-scene list names both. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row under the docs-site workstream; keep the count current. |

No component change: both open props already exist and are public.

## 3. The scenes

```tsx
const DrawerScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Workspace settings</Text>
    <Drawer defaultOpen>
      <DrawerTrigger>Filters</DrawerTrigger>
      <DrawerContent side="right" size="md" label="Filters">
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Narrow the result set, then apply.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose>Cancel</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </Stack>
);

const NavigationMenuScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Product navigation</Text>
    <NavigationMenu label="Product" value="platform">
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink onSelect={() => undefined}>Overview</NavigationMenuLink>
            <NavigationMenuLink onSelect={() => undefined}>Runtime</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        …
      </NavigationMenuList>
    </NavigationMenu>
  </Stack>
);
```

Expectations in `SCENE_TEXT`:

| Scene | Text | Why it is component text |
| ----- | ---- | ------------------------ |
| `drawer` | `Narrow the result set, then apply.` | `DrawerDescription` inside the open panel. |
| `navigation-menu` | `Runtime` | a `NavigationMenuLink` inside the open panel. |

Neither equals a `<Text role="h3">` heading, so the plan-472 rule stays
satisfied without an exemption.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs build:preview` | the two new scene bundles build |
| `nub run --filter docs smoke:preview` | exit `0`; `scene drawer ready — 640x160 canvas`, `scene navigation-menu ready — 640x160 canvas`; both pages load their iframe; the light/dark proof still passes |
| `nub run --filter docs test` | `scene-contract.test.ts` and `preview-gaps.test.ts` pass; the gap set is seven |
| `nub run check`, `nub run lint`, `nub run test` | exit `0` |

Two-direction proof (delete `defaultOpen` / `value` from the scene views, rebuild,
run): `smoke:preview` fails with
`FAIL live scene drawer: expected "Narrow the result set, then apply." in the GPUI tree`
(and the same for navigation-menu). Restore.

## 5. STOP conditions

- A scene never reaches `data-gpuix="ready"` after the size wait: record the
  scene key, the console and the frame; do not ship a scene that does not paint.
- The Drawer's full-window veil covers the whole 640×360 canvas and the smoke's
  expected text is absent: record the painted tree. A real edge panel is the
  point; if the veil hides it, the scene is wrong, not the expectation.
- `NavigationMenuContent` paints off-canvas or not at all: record the measured
  box. Do not substitute a static list and call it a menu.
- Any test that guards the gap set needs its reason removed because a prop
  exists — fix the code, never the guard.

## 6. Test plan

- `scene-contract.test.ts` proves: every scene key is unique, every expectation
  occurs in the view, every expectation is component text, the record declares
  the scene, the slug equals the scene, and the gap set equals the real gaps.
- `preview-gaps.test.ts` proves `docs/preview-strategy.md` names the same seven
  gaps.
- `smoke:preview` proves both scenes reach a sized canvas with their text in
  GPUI's tree and that both pages load them.
- Two directions: removing the open prop fails the smoke by name; restored, it
  passes.

## 7. Progress (2026-10-18)

- `smoke:preview` reports `scene drawer ready — 640x160 canvas`,
  `scene navigation-menu ready — 640x160 canvas`, and both pages load their
  iframe; the mode and platform proofs still pass.
- Two-direction proof: with `defaultOpen` removed from the Drawer scene, the run
  failed with
  `FAIL live scene drawer: expected "Narrow the result set, then apply." in the GPUI tree`;
  with `value="platform"` removed from the navigation scene, it failed with
  `FAIL live scene navigation-menu: expected "Runtime" in the GPUI tree`.
  Restored.
- `nub run --filter docs test` (44 files / 273 tests), `nub run check`,
  `nub run lint`, `nub run test` and the built-site smoke pass.

## 8. Acceptance

- Drawer and Navigation menu pages render a real GPUix surface, and their
  native evidence stays beneath it.
- The gap set is seven, and the document and the code agree.
- The plan index and `TODO.md` are current; the commit is pushed on
  `agent/docs-site`.
