# 094 — `Rating` has no hover preview, and the reason given was false

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 selection control) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `054`, `070`, `079`, `081` |
| Status | **done** (2026-10-18; renumbered from the colliding `092`) |

Self-contained: §1 the gap and the measurement, §2 the rule, §3 the exact files,
§4 the commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 1. The gap

`Rating`'s docs list a limitation:

> **No hover preview.** A hover-filled preview needs per-star hover state and a
> re-render per movement; the runtime gives hover styles but not a cheap
> "which star is under the pointer" query for a group.

The second half is false. GPUix's host props carry `onMouseEnter` and
`onMouseLeave` per element (`@gpuix/native` `host.d.ts`, published 0.10.0), and
every star is already its own `<div>` with a `role` and handlers — so the star
under the pointer *is* the event target. No query exists or is needed.

The user-visible consequence today: a pointer over star 4 of an unrated control
shows five outline stars, so the reader cannot tell what a click would set. Every
platform rating (and the reference `GPUI Kit`) previews the prospective value.
The interaction is also absent from the keyboard story, which is fine — the
arrows already move the *value*, and a keyboard user needs no preview.

## 2. The rule

**While the pointer is over an interactive rating, the stars paint the
prospective value; the committed value and its announcement do not change.**

1. Hovering star `N` paints stars `1..N` filled (`star-filled`, brand role) and
   the rest outline. Leaving the group restores the committed value.
2. `aria-valuetext` stays the **committed** value (`"checked"`/`"unchecked"` per
   star). A preview is not a selection; announcing it would lie to assistive
   technology.
3. `disabled` and `readOnly` ratings take no hover handlers and never preview —
   `readOnly` "takes no input", and a preview is an input affordance.
4. An `invalid` rating previews with the brand role on the filled stars, not the
   destructive role: the destructive role marks what is *missing* at rest; a
   prospective star is not a missing one.
5. Per-item styling follows the **paint**: `RatingStarState.filled` is true for a
   star painted by the preview as well as one at or below the value. A consumer's
   `starStyle` must not disagree with the icon next to it.
6. The rule is one pure function, `previewRating(value, preview, max)`, so the
   clamping is provable offline.

**Measured before (the old direction).** In the real runtime, hovering
`ra-star-4` on `<Rating defaultValue={2} />` leaves the icon under star 4 at
`mutedForeground` (no preview), and the group has no `onMouseLeave`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/rating.ts` | add `previewRating(value, preview, max)` |
| `packages/primitives/src/core/rating.test.ts` | pure cases for the preview clamp and the fallback |
| `packages/primitives/src/components/Rating.tsx` | `RatingHover` (`preview`, `onEnter`, `onLeave`); paint from `previewRating`; `onMouseEnter` per star, `onMouseLeave` on the group, both only when interactive; `filled` reports the paint |
| `packages/primitives/src/components/Rating.test.tsx` | element-tree cases: the preview paints, the announcement does not change, disabled/read-only attach no handlers |
| `packages/primitives/runtime/rating.runtime.test.tsx` | the real pointer: hover paints, leaving restores, an invalid preview keeps the brand role, disabled/read-only do not preview |
| `packages/primitives/docs/rating.mdx` | a Hover preview section; delete the false limitation; `filled` row and Verification updated |
| `packages/primitives/README.md` | the Rating note gains the preview clause |
| `COMPONENTS.md` | the Rating row gains the plan-094 clause |
| `TODO.md` | add and tick the task under the primitives ledger |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/094-rating-hover-preview.md` | §7 results after the run |

Do **not** edit `packages/tokens`, `packages/components`, `packages/icons` or
`apps/*`. No new dependency.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/rating.test.ts` | the new pure cases fail before the helper exists and pass after |
| `nub run --filter @gpuixui/primitives test -- src/components/Rating.test.tsx` | the new element-tree cases fail before the handler wiring and pass after |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 38 files / 433 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/rating.runtime.test.tsx` | the new pointer cases fail before the wiring and pass after |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 21 files / 295 tests) |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test below must be able to fail. Write them first, run them against the
unwired code, and record the failing assertions in §7.

### 5.1 The pure rule (`src/core/rating.test.ts`)

1. **"paints the committed value when nothing is hovered"** — `previewRating(2,
   None, 5)` is `2`; a fractional/negative committed value still clamps.
2. **"paints the hovered star"** — `previewRating(2, Some(4), 5)` is `4`.
3. **"clamps a preview to the star count"** — `Some(99)` → `5`, `Some(-3)` → `0`,
   and a zero or fractional `max` behaves like `clampRating`.

### 5.2 The element tree (`src/components/Rating.test.tsx`)

4. **"paints the hovered star and the ones before it"** — render with a preview
   of `4` and a value of `2`: the icon names are `star-filled ×4` + `star`; the
   `aria-valuetext` list is still the committed `checked, checked, unchecked ×3`.
   This catches both a preview that changes the announcement and one that paints
   nothing.
5. **"reports the painted fill to `starStyle`"** — collect `star.filled` from the
   callback and expect `[true, true, true, true, false]` for value `2` + preview
   `4`. Fails while `filled` reads the committed value.
6. **"takes no hover input when disabled or read-only"** — `onMouseEnter` on a
   star is absent for both; an interactive rating has one. (The group's
   `onMouseLeave` is absent likewise.)

### 5.3 The real pointer (`runtime/rating.runtime.test.tsx`)

7. **"previews the rating under the pointer, and leaving restores it"** —
   render `defaultValue={2}`; `runtime.hover("ra-star-4")`: stars 1–4 paint
   `colors.primary`, star 5 `colors.mutedForeground`, and `checkedStars` is
   unchanged; then `runtime.hover("outside")`: star 4 is muted again. Fails
   today at the first assertion.
8. **"previews downward from a higher value"** — `defaultValue={4}`, hover star
   `1`: stars 1 primary, 2–4 muted, 5 muted; leaving restores 1–4 primary.
9. **"keeps the brand role on an invalid preview"** — `defaultValue={2} invalid`,
   hover star 4: star 4 is `primary` (not `destructive`); star 5 is
   `destructive`.
10. **"does not preview when disabled or read-only"** — hover star 5 on each:
    star 5 stays `mutedForeground`; `onValueChange` is never called.

`runtime.hover("outside")` needs a sibling with a `testId` in the same `Surface`
(a `Box`), so the pointer moves off the group and the runtime dispatches the
group's `onMouseLeave`.

### 5.4 Two-direction proof (required before "done")

- With the hover handlers removed (keep the `previewRating` call but pass
  `Option.none()`), tests 4, 5, 7, 8, 9 and 10 fail; record the exact failing
  assertions in §7.
- With the wiring in place, every suite is green.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. `nativeSimulateMouseMove` does not dispatch `onMouseEnter`/`onMouseLeave` to
   these elements, or a move between two stars fires the group's `onMouseLeave`
   (which would flicker the preview). Record the measured event order and stop
   before inventing a per-star leave workaround.
3. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the failure with the command output instead of masking it.
4. The preview cannot be kept out of the accessibility announcement without
   changing the committed-value contract. Do not ship a preview that announces.

## 7. Outcome

### Measured before (the old direction)

The runtime had no hover path at all: hovering `ra-star-4` on
`<Rating defaultValue={2} />` left star 4 at `colors.mutedForeground`, and the
group had no `onMouseLeave`. The first new runtime test fails at its first
assertion (`expected '#0000xx' to be '#0000yy'`, muted vs primary).

### Failing directions

Two mutations, each restored with `cp` from a saved copy:

1. **The paint ignores the preview** (`const painted = value`, the pure helper
   and the handlers still wired): 2 offline cases fail — "paints the star under
   the pointer and keeps the announcement committed" and "reports the preview
   paint to `starStyle`" — and 3 runtime cases fail: the preview, the downward
   preview and the invalid preview. The disabled/read-only case correctly still
   passes: it asserts *no* preview.
2. **The stars take no `onMouseEnter`** (the helper and paint kept): 1 offline
   case fails ("attaches hover input only to an interactive rating") and the same
   3 runtime cases fail.

So the paint, the wiring and the inert-control rule each have a test that fails
without them.

### STOP condition 2, answered

`nativeSimulateMouseMove` does dispatch per-element enter and the group's leave:
moving the pointer from inside the group to a sibling `Box` restored the
committed value (the leaving assertion), and moving between two stars previewed
the new one without the group clearing it permanently (the downward case).
No per-star leave workaround was needed.

### After

- One pure rule, `previewRating(value, preview, max)`, decides the painted star;
  the committed value, `onValueChange` and `aria-valuetext` are untouched.
- `disabled`/`readOnly` attach neither `onMouseEnter` nor `onMouseLeave`, and a
  pending preview is ignored if the control becomes inert.
- `starStyle.filled` follows the paint; an invalid preview keeps the brand role
  while the still-missing star stays destructive.
- The false "no hover preview" limitation is gone from the page.
- Offline: **38 files / 439 tests passed** (433 before; +3 core, +3 element tree).
- Runtime: **21 files / 300 tests passed** (295 before; +5).
- `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] A pointer over an interactive rating previews the prospective value.
- [x] Leaving the group restores the committed value; the announcement never
      changes.
- [x] `disabled`/`readOnly` never preview; an invalid preview uses the brand role.
- [x] `starStyle`'s `filled` follows the paint.
- [x] The new tests fail with the wiring removed and pass with it.
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are updated.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
