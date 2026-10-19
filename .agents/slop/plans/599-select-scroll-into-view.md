# 599 — `Select`'s keyboard highlight is never scrolled into view

**Phase:** F (verification truth) — **implementation**
**Depends on:** `041`, `057`, `062`, `066`, `068`, `069`, `097`, `598`
**Owns:** `packages/primitives` (`Select`, `core/bounds.ts`, its suites and
pages), `COMPONENTS.md`, `docs/gpuix-capabilities.md`, `packages/primitives/README.md`,
`.agents/slop/plans/README.md`, `TODO.md`. No other workstream's paths.

## 1. The evidence

Plan `069` made a capped `Select` list follow the keyboard highlight with the
renderer's `scrollIntoView`. It asserted that the **scroll offset** changed and
that the highlighted row's painted **text** existed — never that the row was
inside the list. Plan `597`/`598` then corrected how a painted box is read, but
the three `Select` scroll cases kept their old "a row reports its unscrolled
position" rationale and still assert only an offset.

Measured 2026-10-19 in the real `TestRenderer` (1280 × 800, the store's
release-tag build, 60 options, row height 28 + 2 gap; list visible box
`y 48 … 792`):

| Step | Renderer call | Offset | Highlighted row's painted box |
| --- | --- | --- | --- |
| open, no selection | — | `0` | first row `53 … 81` (inside) |
| 26 Downs (row 26) | `scrollIntoView(row 26)` | `-39` | row 26 `794 … 822` (**2 px below the list**) |
| 27 Downs (row 27) | `scrollIntoView(row 27)` | `-69` | row 27 `794 … 822`; row 26 `764 … 792` |
| 40 Downs (row 39) | `scrollIntoView(row 39)` | `-429` | row 39 `794 … 822` |
| open with `defaultValue="option-49"` | `scrollIntoView(row 49)` | `-729` | row 49 `794 … 822` |
| a `side="left"` list, `Up` wraps to row 30 | `scrollIntoView(row 30)` | `-93` | row 30 `795.5 … 812.5`, list `8 … 788` |

The pattern is exact: **`scrollIntoView(row N)` scrolls to the child *before*
the target.** Row `N`'s top lands at the viewport's bottom (`794` for a bottom
edge of `792`) and row `N-1`'s bottom is flush with it (`764 … 792`). Direct
calls on rows 26 and 27 reproduce it without React (offsets `-39` and `-69`), so
this is the renderer's own behaviour, not our effect timing. The row itself is a
direct child of the `listbox` at the expected index (`row 26 → child 26`), so it
is not a tree-index mismatch we can fix by passing a different element.

Two shipped claims are therefore false:

- plan `069` / `docs/select.mdx`: "the arrows keep the active option visible";
- `docs/gpuix-capabilities.md` §4: "a reachability check can compare two painted
  boxes … a child can still be reported outside a scrolled layer … assert the
  scroll offset instead". The wheel test already proves containment works
  (`fields.runtime.test.tsx`, "caps a long Select list to the window and scrolls
  it"), and the app suite proves it for a `ScrollArea` (plan `598`).

The three scroll cases cannot fail for the defect they name: `getScrollOffset`
returns `[0, 0]`, not `null`, so `expect(offset).not.toBeNull()` passes even
when the list never scrolls. `runtime/fields.runtime.test.tsx` also still
carries three comments explaining the retired limitation.

## 2. The rule

**A list scrolls by the measured overflow of the row against the list's painted
box; it never asks the renderer which child to reveal.**

One pure rule in `core/bounds.ts`:

```ts
/** Pixels to scroll so `item` is inside `viewport`; 0 when it already is. */
export const scrollIntoViewDelta = (item: BoxBounds, viewport: BoxBounds): number
```

- below the viewport → `item.y + item.height - (viewport.y + viewport.height)`
  (positive: the list scrolls down);
- above it → `item.y - viewport.y` (negative: up);
- inside → `0`, so a list that fits or an already-visible row is left alone.
- A row taller than the viewport aligns its bottom (the `below` branch wins);
  nothing can contain it.

`Select`'s `onHighlight` then:

1. reads the list's offset (`getScrollOffset`; `null` means it does not scroll →
   no-op), the list's reported box and the row's reported box;
2. resolves the list through `paintedBox` with the same `selectContentStyle`
   the list paints with (only its insets matter; the caps do not), and takes the
   row's report as painted on the y axis because `selectItemStyle` has no
   vertical padding or border — recorded at the call site so a future inset is
   not silently ignored;
3. resolves the list's **visible** box with `viewportBox(box, offset)` (plan
   `598`);
4. calls `renderer.scrollTo(listId, offset.x, offset.y - delta)` only when the
   delta is non-zero. The renderer clamps (plan `337`), so the ends are safe.

`scrollIntoView` stays in the capability table as a measured defect; the wrapper
stops using it.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/core/bounds.ts` | add `scrollIntoViewDelta` with the measured rule; doc names plan `599` |
| `packages/primitives/src/core/bounds.test.ts` | **new** — 4 pure cases (below, above, inside, taller-than-viewport) |
| `packages/primitives/src/components/Select.tsx` | replace the `scrollIntoView` callback with the measured `scrollTo` rule; document the renderer's off-by-one; remove the `ScrollWhenHighlighted` comment claiming `scrollIntoView` walks to the container |
| `packages/primitives/runtime/fields.runtime.test.tsx` | the three weakened cases assert containment against `selectListBoundsOf`; add an Up-direction case (40 Downs, then 25 Ups; the newly highlighted row is inside); delete the three "unscrolled" comments |
| `packages/primitives/docs/select.mdx` | keyboard/verification text: the measured rule and the counts |
| `docs/gpuix-capabilities.md` §4 | replace the offset fallback with the `scrollIntoView` off-by-one row and the correction |
| `packages/primitives/README.md` | the `Select` row and the stale "unscrolled position" paragraph |
| `COMPONENTS.md` | the Select row records plan `599` (off-by-one + correction) |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/599-select-scroll-into-view.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

## 4. Test plan

**Offline — `src/core/bounds.test.ts`.**

1. a row below a 100-high viewport at `y 0` whose bottom is `120` → `20`;
2. a row above (`y -30`, height 20) → `-30`;
3. a row inside → `0`;
4. a 120-high row at `y 90` in a 100-high viewport → `110` (the bottom branch
   wins; the top cannot fit either).

**Runtime — `runtime/fields.runtime.test.tsx`.**

1. *40 Downs* — the highlighted row `sel-option-option-39` is inside
   `selectListBoundsOf(runtime)` (both edges), the offset is negative, and the
   existing highlight/text assertions stay.
2. *Open on a selected option* — `sel-option-option-49` is inside the list.
3. *Left-side `Up` wrap* — `sel-option-value-30` is inside the list.
4. *Up direction* — open, 40 Downs, then 25 Ups; the highlighted row (found by
   its hover wash) is inside the list and the offset moved back up. This guards
   the sign of the delta.
5. The wheel case and the "list that fits" case are unchanged (`getScrollOffset`
   stays `null` for a list that does not scroll).

**Both directions.**

- Revert `Select`'s callback to `scrollIntoView`: cases 1, 2 and 3 fail on the
  containment edge (measured: `822 > 792`, `822 > 792`, `818 > 788`) while case
  4 still passes, because the renderer's one-child-short scroll is harmless when
  moving up. Restore: all pass.
- Invert the delta's sign in `scrollIntoViewDelta`: 3 of the 4 offline cases
  fail, and the runtime Up case fails on containment/movement.


## 5. Commands and expected results

```sh
cd packages/primitives

# pure rule
nub exec vitest run src/core/bounds.test.ts
# expect: 4/4 pass; the inverted-sign mutation fails 3 of them

# the scoped runtime cases (native binding present on this host)
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/fields.runtime.test.tsx -t "Select list"
# expect: 11/11 match the filter and pass, including
#   "scrolls a capped Select list to follow the keyboard highlight"
#   "scrolls a capped Select list back up to a row above the fold"
#   "opens a capped Select list scrolled to its selected option"
#   "caps a long Select list beside its trigger"
# with the old callback "scrolls a capped Select list to follow the keyboard
# highlight", "opens a capped Select list scrolled to its selected option" and
# "caps a long Select list beside its trigger" fail on containment (measured
# 822 > 792, 822 > 792, 818 > 788).

# the whole file, then the package gates
nub exec vitest run --config vitest.runtime.config.ts runtime/fields.runtime.test.tsx
nub run --filter @gpuixui/primitives test        # 58 → 59 files, all passing
nub run check
```

## 6. STOP conditions

- Stop if a direct `scrollIntoView(row N)` on the ready list puts row `N` inside
  the list (the premise is then wrong — report the measurement instead).
- Stop if `renderer.scrollTo(listId, …)` does **not** move a capped list
  (plan `337` measured that it does; a failure is a different defect).
- Stop if the corrected offset makes a **fifth** row visible that was not
  before, or fights a wheel scroll on an unchanged highlight; the callback must
  run only on a highlight change.
- Do not widen the fix to `ScrollArea` or the tooltip: neither calls
  `scrollIntoView`, and plan `337` already owns their position rule.
- Do not re-baseline the wheel case: a wheel scroll is the user's, and the list
  must not snap back.

## 7. Acceptance

- `scrollIntoViewDelta` exists, is pure, documented and tested in both
  directions.
- The three `Select` scroll cases prove **containment** and fail by name under
  the old `scrollIntoView` callback; a fourth proves the Up direction and fails
  under an inverted delta.
- `docs/gpuix-capabilities.md` states the measured off-by-one and the
  correction; the Select page, README and inventory agree.
- `nub run check`, the primitives offline suite and the scoped runtime file are
  green; the full runtime suite stays green.

## 8. Result (2026-10-19)

- `core/bounds.test.ts` 4/4; inverting the delta failed 3 of 4.
- `runtime/fields.runtime.test.tsx -t "Select list"` 11/11 with the fix; the
  old `scrollIntoView` callback failed the three containment cases by name
  (`822 > 792`, `822 > 792`, `818 > 788`). The Up case passed under the old
  callback (as predicted) and fails under the inverted delta.
- After the fix: 40 Downs → offset `-459`, "Option 39" at `764…792`; open on
  "Option 49" → `-759`, selected row at `764…792`; the left-side wrap and the
  Up direction are inside too; a list that fits still does not scroll.
- Offline: 59 files / 820 tests green. Full runtime: 52 files / 735 tests
  green on two consecutive runs. `nub run check`, `nub run lint` and
  `nub run fmt` green.
