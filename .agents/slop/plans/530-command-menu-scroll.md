# 530 — A highlighted command row is scrolled into view

**Phase:** F · **Owner:** components workstream · **Depends on:** 110, 114, 133,
301, 329, 525, 529.

## 1. Why

`CommandMenu` keeps focus in the search field and moves only a **highlight**
(`aria-selected`) down the rows. The list is a `maxHeight: 320` scroll container
with no scroll-into-view step, so after roughly 15 rows the highlight leaves the
viewport while `Enter` still runs it. A keyboard user cannot see what they are
about to run.

Measured on this host, 2026-10-18, with a 30-action palette and 24 `ArrowDown`
presses:

```
list viewport: { y: 248, height: 320 }   // bottom edge 568
highlighted row: { y: 728, height: 18 }  // 160 px below the viewport
scroll offset: [0, 0]
```

Calling the renderer's own method on that row —

```ts
renderer.scrollIntoView(rowElementId)
```

— scrolls the container to `[0, -178]` and puts the row at `y: 550`, fully
inside the viewport. The capability exists (`NativeRenderer.scrollIntoView`,
0.10.0); the component never calls it. The renderer's implementation scrolls to
the **direct child** of the nearest scroll parent, which is exactly this list's
shape (each row is a direct child of `command-list`).

**Out of scope, recorded for a follow-up:** the same measurement on a
`Combobox` with 30 options left option 21 at `y: 605` against a popup of
`y: 36…316`; `scrollIntoView` there moves the offset by only 9 px because the
option is nested inside listbox/group wrappers, and the renderer scrolls to the
wrapping child instead of the row. Fixing that needs a measured `scrollTo`
rather than `scrollIntoView`, and is not this plan. Submenus move **real**
focus with `focusElement`, so they are not the same class of bug.

## 2. What changes

### 2.1 `src/command-menu.tsx`

- Give the scroll container a stable name: `testId="command-list"` (already
  added while measuring; it stays).
- `CommandMenuItem` keeps its own host instance and calls the renderer when it
  becomes the highlighted row:

```tsx
const renderer = useGpuix().renderer;
const [instance, setInstance] = useState<Option.Option<PublicInstance>>(
  Option.none(),
);
const setRow = useCallback(
  (next: PublicInstance | null) => setInstance(Option.fromNullishOr(next)),
  [],
);

// The list scrolls; without this the highlight walks out of the viewport and
// Enter runs a row the user cannot see. scrollIntoView targets the nearest
// scroll parent's direct child, which is this row.
useLayoutEffect(() => {
  if (!highlighted) return;
  Option.match(instance, {
    onNone: () => undefined,
    onSome: (element) => renderer?.scrollIntoView?.(element.id),
  });
}, [highlighted, instance, renderer]);
```

Add `ref={setRow}` to the row element. Imports: `useGpuix` (value, alongside
the `EventPayload, Props, PublicInstance` type import), `useCallback`,
`useLayoutEffect`.

The effect runs only on the flip to highlighted, so pointer use and a stable
highlight do not scroll anything.

### 2.2 `src/behaviour/command-menu.test.tsx` — two native cases

Add a 30-action fixture (ids `action-1…action-30`, labels `Action 1…`) and use
the existing `LocalPalette`:

1. **"keeps the highlighted row inside the list viewport"** — render, press
   `ArrowDown` 24 times, then assert:
   - `command-action-25` exists and its bounds are inside `command-list`'s
     bounds (`row.y >= list.y` and `row.y + row.height <= list.y + list.height`);
   - the list's `getScrollOffset` y is negative (it actually scrolled).
2. **"returns the list to the top when the highlight moves back up"** — from
   the scrolled state, press `ArrowUp` 24 times, assert `command-action-1` is
   inside the list and the y offset is `0`. This proves the effect follows every
   highlight change, not only downward movement.

**Measured while writing this plan:** `Home` and `End` never reach the
component while the GPUix `<input>` holds focus (the scroll offset stayed
`-178` for both). The branches stay for a runtime that forwards them, and the
docs now say so. Arrow keys are the working path.

Both cases must fail with the effect removed: in case 1, `row.y` is 728 against
a bottom edge of 568.

### 2.3 `docs/command-menu.mdx`

- Raise the stated native count from 21 to 23 in the canonical verification
  line (`inventory.test.ts` holds that number to the suite, plans 333/335).
- Under keyboard behaviour, state that the highlighted row is scrolled into
  view in the 320 px list.

### 2.4 `COMPONENTS.md`

Command menus row: add "the highlighted row is scrolled into the list's
viewport" and raise the native count 21 → 23.

No example change: the existing example already demonstrates the palette, and
the scrolling rule is a behaviour, not a new API. The example suite still mounts
it.

## 3. Commands and expected results

```sh
# from packages/components
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
  src/behaviour/command-menu.test.tsx
# 1 file, 23 tests

nub run --filter @gpuixui/components test   # 40 files, 405 tests
nub run --filter @gpuixui/components check-types
nub run check
nub run lint
nub run test
```

## 4. STOP conditions

- `scrollIntoView` moves the whole window instead of the list (the row is
  already visible and no ancestor scrolls): stop and measure which ancestor the
  renderer picked; do not add a manual `scrollTo` without the measurement.
- The effect fights the caller's scroll position while the palette is open and
  the highlight is stable: it must run only when `highlighted` flips; if it runs
  on every render, stop.
- The row's bounds are only visible after an extra flush: keep the flush in the
  test only, not in component code.
- A change is needed in `menu/*` or `combobox.tsx`: stop — that is the recorded
  follow-up, with its own plan.
- Any docs/inventory count check disagrees: stop and report the page and the
  suite count; do not edit the check.

## 5. Test plan and both-direction proof

1. Add the two cases; `command-menu.test.tsx` goes 21 → 23.
2. Add the effect; both cases pass, and `getScrollOffset` shows a negative y for
   the downward case and `0` after the upward case.
3. **Mutation**: replace the reveal with a no-op (`void element.id`) → case 1
   fails with the row's bottom at 746 against the viewport's 568, and case 2
   fails with the first row at y −30 against the list top at 248. Restore.
4. The other command-menu cases (filtering, recents, Escape, focus ring) stay
   green; the total behaviour suite goes 708 → 710.

## 6. Acceptance

- A 30-row palette keeps the highlighted row inside the list after 24 arrow
  presses and returns it to the top as the highlight moves back up.
- Both new cases have a recorded failure without the effect.
- `Home`/`End` are documented as consumed by the GPUix input (measured), and
  the docs no longer claim they move the highlight.
- Docs count, `COMPONENTS.md` row, `TODO.md` and the plan index agree;
  `nub run check`, `nub run lint` and `nub run test` exit 0.

## 7. Results (2026-10-18, this host, `0.10.0`)

- Measured before the fix: with 30 actions and 24 `ArrowDown` presses the
  highlighted row sat at `y: 728` (bottom 746) against a list viewport of
  `y: 248, height: 320` (bottom 568), scroll offset `[0, 0]`. Calling
  `renderer.scrollIntoView` on that row moved the offset to `[0, -178]` and the
  row to `y: 550`, inside the viewport.
- `CommandMenuItem` now registers its host instance and calls
  `renderer.scrollIntoView` on the flip to highlighted. The menu list carries
  `testId="command-list"` so a suite can measure the viewport.
- Two native cases: 24 presses keep the row inside the viewport and the offset
  negative; a manual `scrollTo(-400)` followed by 24 `ArrowUp` presses returns
  the list to offset `0` with the first row visible.
- Mutation proof: with the reveal as a no-op, case 1 fails with 746 > 568 and
  case 2 fails with the first row at −30 < 248. Restored, 23/23.
- Measured while writing: `Home` and `End` do not reach the component through
  the GPUix `<input>` (the offset stayed `-178` after both), so the docs no
  longer claim they move the highlight and the row now records the limitation.
- Counts: command-menu 21 → **23**; behaviour 708 → **710**; unit unchanged at
  **405**. `COMPONENTS.md`, `docs/command-menu.mdx`, `TODO.md` and the index are
  synced. The Combobox case is recorded as a follow-up: its options are nested,
  so `scrollIntoView` moves only 9 px and it needs a measured `scrollTo`.
