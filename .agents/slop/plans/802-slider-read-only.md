# 802 — The slider family's read-only state

**Phase:** C/F (Tier 1 completeness, API symmetry)
**Depends on:** `030`, `040`, `041`, `047`, `053`, `063`, `079`–`081`, `097`,
`324`, `332`, `361`, `583`, `590`, `601`–`603`, `646`, `786`, `796`, `797`,
`799`, `800`
**Status:** done — implemented in this workstream. Offline **74 files / 1041
tests**; the new native file **6/6**; ten scoped runtime files **206/206**.
Five mutation directions were reverted one at a time and each failed its named
case: the read-only track branch, the slider key guard, the slider pointer
branch, the range's nearest-thumb focus, and the track payload. Measured: a
press on a `Slider` focuses it natively; a `RangeSlider` needs the explicit
nearest-thumb focus (the group is not a tab stop).

## 1. Why

Plans `786`, `796`, `797`, `799` and `800` established one review contract:
**`readOnly` keeps the tab stop, the focus ring, the name and the announced
value, refuses every change path, and paints the normal (non-disabled) surface
with a `default` cursor.** It ships on twelve value-bearing parts — `Input`,
`TextArea`, `NumberField`, `OTPField`, `Select`, `Rating`, `Checkbox`, `Switch`,
`CheckboxGroup` and `RadioGroup` (and their per-item states).

`Slider` and `RangeSlider` are the only value-bearing controls without it. Their
only non-editing state is `disabled`, which

- fades the whole track to half opacity (`sliderTrackStyle`), and
- removes it from the tab order (`tabIndex` is `undefined` while disabled),

so a review form cannot show a configured volume, threshold or budget band as a
value a keyboard or screen-reader user can reach. A bare `Text` + `Meter` is not
a substitute: `Meter` is `role="meter"` and has no tab stop, no slider keyboard
contract and no `role="group"` of two named sliders.

That is the same asymmetry plans `786`–`800` closed for every other control. It
is a real API gap, not a stylistic preference, and it is the last row of the
review-state contract.

0.10.0 publishes no `aria-readonly` (`@gpuix/native/host`'s host props carry
`aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level` only), so the state is **behavioural and visual**;
both pages must say that, exactly as `Select`'s and `Rating`'s pages do.

## 2. Decision

Add `readOnly?: boolean` to **`Slider` and `RangeSlider`**. `Toggle` and
`ToggleGroup` stay excluded for the reason plan `799` §2 records: they are
`aria-pressed` actions, not values.

Semantics, identical for both parts:

| Path | Disabled | Read-only |
| ---- | -------- | --------- |
| Tab stop | removed (Slider: track; Range: both thumbs) | **kept** |
| Focus ring while focused | none | **painted on the thumb** |
| Pointer press | refused; no focus | **focus only** (Slider: the track; Range: the nearest thumb); the value, the drag and the commit are refused |
| Drag / key step / Home / End | refused | refused |
| `onValueChange` / `onValueCommit` | neither | neither |
| Paint | `opacity: 0.5`, `cursor: not-allowed` | full opacity, `cursor: default` |
| Hover / press wash | none | none |
| `StateStyle` payload | `disabled: true` | `readOnly: true` on the track **and** each thumb |
| Announced value / name | unchanged | unchanged |

`readOnly` is one state, not a second `disabled`; a caller passing both gets the
disabled paint and no tab stop (`disabled` wins), the same precedence `Select`
documents.

## 3. Exact files

Change:

1. `packages/primitives/src/core/style.ts`
   - `SliderSpec` gains `readonly readOnly?: boolean`.
   - `sliderTrackStyle`: one `inert = disabled || readOnly` value; cursor is
     `not-allowed` (disabled) / `default` (read-only) / `pointer`; the half
     opacity applies **only** when disabled; the hover/active wash is declared
     only when not inert.
   - `sliderThumbStyle`: the ring predicate (`focused && !disabled`) already
     keeps a read-only thumb's ring — state that in the docstring; no visual
     branch is added.
2. `packages/primitives/src/components/Slider.tsx`
   - `SliderProps.readOnly` and `RangeSliderProps.readOnly`, with JSDoc naming
     the tab stop, ring, refusal and the missing `aria-readonly`.
   - `SliderState.readOnly`, `RangeSliderState.readOnly`,
     `SliderThumbState.readOnly` (`RangeSliderThumbState` inherits it).
   - `renderSlider`: one `inert` value guards the key path; the track and thumb
     `SliderSpec`s carry `readOnly`; both `resolvePartStyle` payloads carry it.
   - `renderRangeSlider`: the same for the track spec, both thumbs and both
     payloads; each thumb's key path is guarded by `inert`.
   - `Slider`: on a primary press while read-only, call
     `renderer?.focusElement?.(trackId.current)` and return before any gesture
     state is written (no `dragging`, no `gesture`, no `state.set`); pointer-move
     and pointer-up stay no-ops because no gesture exists.
   - `RangeSlider`: on a primary press while read-only, resolve the nearest end
     from the pointer (the existing `pointerOf`/`nearestEnd` rules), call
     `focusThumb(index)` and return; no value, no gesture, no commit.
3. `packages/primitives/examples/value.example.tsx` — one `Separator` and a
   read-only "Locked profile" row with `testId="value-example-locked"` so the
   native examples suite mounts the new state in both palettes.
4. `packages/primitives/docs/slider.mdx`
   - a `readOnly` row in `## API`;
   - a **Read-only** paragraph (after *Change and commit*): tab stop, ring,
     announced value kept; pointer/keys/commit refused; disabled wins;
   - one bullet in `## Accessibility` (no `aria-readonly` in 0.10.0, so the
     difference is behavioural and visual) and one sentence in `## Theming`
     (full contrast, `default` cursor, no wash);
   - `readOnly` in both `## Style by state` tables;
   - the new test files in `## Verification`.
5. `packages/primitives/docs/range-slider.mdx` — the same five edits, phrased
   for two thumbs (both tab stops kept; a press focuses the nearest thumb and
   changes nothing; keys and commit refused).
6. `packages/primitives/README.md` — the shared-state deviation now names
   `SliderState`/`RangeSliderState`/`SliderThumbState` (plan `802`).
7. `COMPONENTS.md` — a “Read-only (802)” sentence on the **Slider** and
   **Range slider** rows.
8. `TODO.md` — a ticked row under the primitives workstream.
9. `.agents/slop/plans/README.md` — index this plan.
10. `PLAN.md` — D52: read-only is the review state of every value-bearing Tier 1
    control; `Toggle`/`ToggleGroup` are actions and stay outside it.
11. `packages/primitives/README.md` and `COMPONENTS.md` — the runtime **file**
    count rises by one (75 → 76); the offline count is unchanged (74) because
    the offline cases extend existing suites. The offline **test** total is
    measured by the plan's run, not written into prose (plan `588`).

Tests (updated / new):

12. `packages/primitives/src/core/style.test.ts` — in `describe("value
    controls")`: a read-only track declares no hover/active, no opacity and
    `cursor: "default"`; a focused read-only thumb paints the token ring; the
    disabled track keeps `not-allowed` + `0.5`.
13. `packages/primitives/src/components/Slider.test.tsx` — a read-only `Slider`
    keeps `tabIndex: 0` and reports no `onValueChange`/`onCommit` for
    `ArrowRight`/`End`; a read-only `RangeSlider` keeps both thumbs' tab stops
    and reports nothing for an arrow. Header comment records the bug guarded.
14. `packages/primitives/src/components/state-style.test.tsx` — the existing
    track and thumb payload assertions gain `readOnly: false`, and one read-only
    mount asserts `readOnly: true` on the track and on both range thumbs.
15. `packages/primitives/runtime/pointer-feedback.runtime.test.tsx` — a
    read-only half over the **slider family** (the gesture surfaces): neither
    part may declare an interaction rule while `readOnly`, because the track is
    the press target and a wash would promise a drag it refuses. Fields are not
    in this half on purpose: a read-only text field still invites text
    selection, so its boundary keeps its hover — only `disabled` is inert
    (`core/recipes.ts`). `Rating` is also out of this half; it has no pointer
    style at all and its preview is already detached while inert.
16. `packages/primitives/runtime/tab-order.runtime.test.tsx` — `Slider` and
    `RangeSlider` join `READ_ONLY_CASES`; `isWithin` already accepts a range
    group whose first thumb holds focus.
17. `packages/primitives/runtime/slider-read-only.runtime.test.tsx` (new) — the
    native contract:
    - a read-only `Slider` reaches focus with `focusNext`, paints one focus ring
      on `s-thumb` (`awaitFrame`), keeps `aria-valuetext`, is not faded and
      takes `cursor: "default"`;
    - a real click at 25%, a key arrow and `End` report no `onValueChange`/
      `onValueCommit` and leave the announced value unchanged;
    - a primary press focuses the read-only track without changing the value;
    - a read-only `RangeSlider` keeps two tab stops (Tab start → Tab end → Tab
      out), and a click at 10% / 90% plus arrows on each thumb move nothing;
    - writable twins in fresh windows report the same click and key, so a
      gesture that missed the control cannot pass.

## 4. Commands and expected results

Run from the repo root (`nub` is the pinned package manager):

```sh
nub run --filter @gpuixui/primitives check-types      # exit 0
nub run --filter @gpuixui/primitives test             # offline suite green
nub run --filter @gpuixui/primitives test:runtime runtime/slider-read-only.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/tab-order.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/pointer-feedback.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/value.runtime.test.tsx
```

- The scoped runtime form is the **positional file**, never `-- --run <file>`
  (plan `700`: the double-dash form ran the whole live suite).
- Expected: the new file passes; the read-only tab matrix, the pointer-feedback
  matrix (enabled + disabled + read-only halves), and both value-control suites
  still pass. A full `test:runtime` is the merge gate, not part of this plan.
- `nub run check` and `nub run test` are the end-of-task gate.

## 5. Test plan (must be able to fail)

- **Core** (`style.test.ts`): drop the read-only branch from `sliderTrackStyle`
  → the track case reports `hover`/`active`/`pointer`; drop `readOnly` from the
  ring predicate → the focused read-only thumb case reports no ring.
- **Element tree** (`Slider.test.tsx`, `state-style.test.tsx`): remove the
  read-only key guard → `ArrowRight` calls `onValueChange`; keep only
  `disabled` in the payloads → the exact-object state case fails on `readOnly`.
- **Runtime** (`slider-read-only.runtime.test.tsx`): remove either pointer guard
  → the click case reports a value and a commit; remove the read-only focus call
  → the press case leaves focus outside the track; drop the tab guard → the
  read-only control is skipped and the matrix fails by part name.
- **Matrix** (`pointer-feedback.runtime.test.tsx`): restore the wash on a
  read-only track → the `Slider` row reports a changed interaction property
  (the range row does the same for the shared resolver).

Each mutation is reverted after it fails; the plan's commit message records the
exact failing case names.

## 6. STOP conditions

Stop and report instead of improvising if:

- the runtime cannot focus a plain `div` track through `focusElement` (then keep
  the Tab contract, do not claim press-to-focus, and record the measured limit);
- the native `<input>`-free slider receives no `onMouseDown` while read-only
  (style-only change, so this should not happen — but do not fake a focus path);
- the runtime behaves differently for `RangeSlider`'s nearest-end resolution
  when the value is read-only (record the measured sequence; do not move the
  value to make the test pass);
- a contract guard rejects the new prop because a page does not name it — fix
  the page, never relax the guard;
- the change would require editing another workstream's paths. Record it in
  `TODO.md` instead.

## 7. Acceptance

- `readOnly` exists on `Slider` and `RangeSlider`, keeps the documented tab
  stops and ring, refuses pointer, keys and commit, and reports itself on the
  track and each thumb.
- A read-only slider paints full contrast with a `default` cursor and no
  pointer feedback; `disabled` still wins.
- Both pages name the prop, state the missing `aria-readonly`, and list the new
  tests; the example mounts a read-only row; the inventory, README, `TODO.md`,
  `PLAN.md` and the plan index are current.
- `nub run check` and `nub run test` are green, the scoped runtime files are
  green, and the exact commands and totals are recorded.

## 8. Result

Measured 2026-10-20 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 74 files / **1041 tests** green (was 1035; +6 offline) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/slider-read-only.runtime.test.tsx` | 1 file / **6 tests** green |
| ten scoped runtime files (`slider-read-only`, `tab-order`, `pointer-feedback`, `value`, `examples`, `readonly`, `selection-read-only`, `focus-loss`, `focus-ring`, `state-style`) | 10 files / **206 tests** green |
| `nub run lint` | exit 0 |
| `nub run test` (repo root) | exit 0 — every workspace's suite green |
| `nub run check` | red **only** on `apps/docs/src/components/docs/demos.tsx` formatting, the docs-site row already recorded in `TODO.md`; the primitives formatter, lint, test guard and type check all pass |

Mutation proofs (each reverted after it failed):

- `sliderTrackStyle`'s read-only branch removed → `style.test.ts` read-only track
  case fails (`hover` = `#00001B40`), and the runtime `Slider` read-only row
  fails with a changed interaction property.
- `renderSlider`'s key guard reverted to `disabled`-only → the read-only Slider
  element case fails with `expected 4 calls`.
- The `Slider` pointer read-only branch removed → two runtime cases fail
  (`[25]` and `[50]` reported, commits included).
- The `RangeSlider` nearest-thumb focus removed → the low press leaves focus on
  `r-thumb-end` instead of `r-thumb-start`.
- `readOnly` removed from the slider track payload → two `state-style` cases
  fail on the exact object.

One finding changed the implementation: the explicit
`renderer.focusElement` call for a read-only `Slider` was unnecessary — a press
focuses the track natively because the track is the tab stop (the press case
passed without it). It was removed; the `RangeSlider` keeps its explicit
nearest-thumb focus, because the group is not a tab stop and the measured low
press did not move focus without it.
