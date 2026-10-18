# 361 — The pointer-feedback matrix, and the two sliders that paint none

**Phase:** F (interaction states / consistency) · **Workstream:** primitives · **Depends on:** 030, 041, 047, 053, 063, 079, 084, 089, 093, 332, 355 · **Status:** planned → executed

## 1. The defect (measured)

Every pointer-interactive surface in the package declares its feedback in the
authored `StyleDesc` (`hover` / `active`), and plan `355` made that a rule for
group rows. Nothing checks the rule across controls, and two controls break it.

Measured on this host in the real `TestRenderer` (2026-10-18) by mounting the
whole Tier 1 set in one window and reading each retained element's authored
style (`Y` = the key is present):

| Element | `cursor` | `hover` | `active` |
| ------- | -------- | ------- | -------- |
| `Button` | pointer | Y | Y |
| `Toggle` | pointer | Y | Y |
| `Checkbox` | pointer | Y | Y |
| `Switch` | pointer | Y | Y |
| `CheckboxGroup` row / box | pointer | Y | Y |
| `RadioGroup` row / box | pointer | Y | Y |
| `ToggleGroup` item | pointer | Y | Y |
| `Input` / `TextArea` | text / text | Y | Y |
| `NumberField` + steppers | pointer | Y | Y |
| `OTPField` cell | text | Y | Y |
| `Select` trigger | pointer | Y | Y |
| `Slider` track | pointer | **absent** | **absent** |
| `RangeSlider` track | pointer | **absent** | **absent** |
| `Rating` star | pointer | absent (by design: it previews its value) | absent |

`Slider` and `RangeSlider` make the **whole track** the hit target: it carries
`onMouseDown`/`onMouseMove`/`onMouseUp`, the runtime captures the press there
(plan `063`), and `sliderTrackStyle` even declares `cursor: "pointer"` — then
declares no feedback at all. The thumb cannot supply it: it is
`pointerEvents: "none"`, deliberately, so a press on the thumb reaches the
track and a drag is not swallowed. So hovering or dragging a slider moves the
value with zero visual acknowledgement, the only control in the library that
does, while a group row (a much less obvious hit area) got its wash in `355`.

The rating is not a defect: hovering a star repaints the stars up to it
(`previewRating`, plan `094`), which is stronger feedback than a wash. It is the
documented exception this plan records instead of changing.

## 2. The rule, once

**An element that owns a pointer gesture paints pointer feedback on itself.**

| State | Paint |
| ----- | ----- |
| rest | no surface (the track/row is layout, not a card) |
| hover | `backgroundColor: colors.hover` |
| press | `backgroundColor: colors.active` |
| disabled | neither key (plan `332`: an inert control must not respond) |

The slider's track is the gesture owner, so the wash goes there, through its one
resolver (`sliderTrackStyle`) — the same shape and the same two roles as
`selectionRowStyle` (`355`). No new prop, token, state type or component.

The invariant is then guarded across controls, because this is the second time
the same class shipped: **enabled → feedback declared; disabled → no feedback
declared**, with `Rating` as the single recorded exception.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `sliderTrackStyle`: declare `hover: { backgroundColor: theme.colors.hover }` and `active: { backgroundColor: theme.colors.active }` when not disabled; keep `opacity: 0.5` for the disabled track. |
| `packages/primitives/src/core/style.test.ts` | two cases: the track declares both roles when enabled, neither when disabled (the disabled case also pins `opacity` and `cursor`). |
| `packages/primitives/runtime/pointer-feedback.runtime.test.tsx` | **new.** The cross-control matrix (see §5). |
| `packages/primitives/docs/slider.mdx` | a short **Interaction states** paragraph: the track is the hit area, so it carries the wash, and the thumb is not a hit target by design; the verification list gains the new suite. |
| `packages/primitives/docs/range-slider.mdx` | the same paragraph for the group track, plus the verification list. |
| `packages/primitives/docs/rating.mdx` | one sentence in the interaction section: a star declares no `hover` style because the preview *is* its pointer feedback (the recorded exception). |
| `COMPONENTS.md` | the Slider and Range slider rows gain the interaction-state note; the runtime-count paragraph gains plan `361`'s count. |
| `packages/primitives/README.md` | the measured runtime count. |
| `TODO.md` | one ticked primitives row. |
| `.agents/slop/plans/README.md` | index row for `361`. |

## 4. Implementation notes (exact)

1. `sliderTrackStyle` keeps its current shape and only branches the interaction
   keys, plus the corner radius the wash needs:
   ```ts
   borderRadius: theme.radius.sm,
   if (spec.disabled === true) style.opacity = 0.5;
   else {
     style.hover = { backgroundColor: theme.colors.hover };
     style.active = { backgroundColor: theme.colors.active };
   }
   ```
   The radius is the one addition beyond the two keys: the wash is the only
   surface the track paints, and `selectionRowStyle` gives its wash the same
   `radius.sm` corners. Do **not** put the wash on the rail or the fill: both are
   `pointerEvents: "none"` and are not the gesture owner.
2. Do not change the thumb, its `pointerEvents`, or the focus ring. The ring is
   on the thumb (`084`), the wash on the track — two coherent signals from one
   control, exactly like a group row plus its box.
3. Both sliders share `sliderTrackStyle`, so the range slider needs no code
   change; its two thumbs stay individually focusable.
4. `Rating` is unchanged. The matrix records it as the one exception rather than
   inventing a second feedback channel for it.
5. Delete the scratch probe (`runtime/zz-probe.runtime.test.tsx`) used to
   measure §1; it must not be committed.

### Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- style` | the core suite green, with the two new slider-track cases named |
| `nub run --filter @gpuixui/primitives test:runtime -- pointer-feedback` | one file, every row case green |
| `nub run --filter @gpuixui/primitives test` | `601 + n` passed; no failures |
| `nub run --filter @gpuixui/primitives test:runtime` | `553 + n` passed in `28 + 1` files |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` (repo root) | exit `0` |

Record the exact counts after the run in §6; do not copy the estimates.

## 5. Test plan and two-direction proof

**Runtime matrix** (`runtime/pointer-feedback.runtime.test.tsx`), one fresh
window per case, following the harness rule in `runtime/fixture.tsx`:

1. For each enabled control in the table below, mount its smallest honest shape
   and require **at least one** element in its subtree to declare both `hover`
   and `active`:

   `Button`, `IconButton`, `Toggle`, `Checkbox`, `Switch`, `CheckboxGroup`,
   `RadioGroup`, `ToggleGroup`, `Input`, `TextArea`, `NumberField`, `OTPField`,
   `Select`, `Slider`, `RangeSlider`.

   The two sliders are the cases that fail before the fix (measured: the track's
   authored style had neither key).
2. The same controls with `disabled` declare **neither** key anywhere in their
   subtree — the plan `332` rule, extended from rows to the whole component. A
   disabled slider still paints `opacity: 0.5`, so the case cannot pass by
   accidentally unmounting the control.
3. `Rating` is asserted as the documented exception: its enabled tree declares
   no `hover`, and hovering a star still repaints the preview (the existing
   `rating.runtime` case owns the paint; this matrix only records that the
   absence is intentional).
4. `ScrollArea` is excluded and the reason stated in the file header: it has no
   pointer gesture (its scrolling is wheel/keyboard), so it promises no pointer
   feedback.

**Two-direction proof.** Revert the `sliderTrackStyle` branch and run the new
file: the `Slider` and `RangeSlider` enabled cases fail by name, the other
fifteen pass. Restore the branch: all pass. For the disabled half, temporarily
move the wash outside the `else` and the two sliders' disabled cases fail. Record
both observations in §6.

**No new example**: `examples/value.example.tsx` already mounts both sliders with
a real drag; the change is a paint rule, not a new surface.

## 6. Result

Executed 2026-10-18.

**Core** (`src/core/style.test.ts`, +2 cases):

- "gives the track — the element that owns the press — a hover and press wash":
  `hover.backgroundColor` = `colors.hover`, `active.backgroundColor` =
  `colors.active`, and the wash's `radius.sm` corner.
- "declares no wash on a disabled track, which cannot act": both keys absent,
  `opacity` `0.5`, `cursor` `not-allowed`.

**Runtime** (`runtime/pointer-feedback.runtime.test.tsx`, new, 31 cases): 15
enabled controls each declare a visible change on hover and on press; the same
15 disabled declare no change in either state; 1 case records `Rating`'s preview
as the exception. Runs:

| Run | Result |
| ---- | ------ |
| `nub run --filter @gpuixui/primitives test` | **603 passed in 43 files** |
| `nub run --filter @gpuixui/primitives test:runtime` | **584 passed in 29 files** (553 in 28 before) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` (root) | exit `0` — 603 primitives, 308 components, 196 tokens, 23 icons, 19 testing, 11 playground |

**Two-direction proof.**

- Removing the wash from `sliderTrackStyle` (the pre-fix shape) fails exactly
  `Slider responds to hover and to a press` and `RangeSlider responds to hover
  and to a press` — 2 failed, 582 passed — and no other case moves.
- Hoisting the wash out of the `else` (a disabled track that still lights up)
  fails exactly `Slider paints no pointer response while disabled` and
  `RangeSlider paints no pointer response while disabled` — 2 failed, 582
  passed.

**One docs defect found while writing the pages**: `docs/slider.mdx` said "The
track is `colors.muted`"; the track paints no surface at rest (its own test
asserts it) and the **rail** is `colors.muted`. Both slider pages now say so,
next to the new wash rule.

**No new example**: `examples/value.example.tsx` already mounts both sliders with
a real drag; this is a paint rule, not a new surface.
