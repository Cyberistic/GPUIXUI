# 094 — `Rating` has no hover preview, and the reason given was false

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 selection control) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `054`, `070`, `079`, `081` |
| Status | **done** (on `agent/primitives-hover`, a private worktree — see §7) |

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
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 20 files / 264 tests) |
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

### Concurrent writers (why this landed on a second branch)

When this plan was claimed, the `primitives` worktree had **three live
`swarm:primitives` sessions** writing it at once (blocker B3): `sqlite3
~/.local/share/opencode/opencode.db` reported three rows with `time_idle is
null` for this directory, and two peers committed `3fe2496`, `a1426fe`,
`129f381` and then plan `093` while this turn ran. Rather than clobber them, this
work took the documented workaround (`blockers/2026-10-17-concurrent-tokens-writers.md`):
a private worktree from the committed tip —

```sh
git -C ~/GPUIXUI worktree add workspaces/primitives-hover \
  -b agent/primitives-hover agent/primitives
nub install
```

so the deliverable is on `agent/primitives-hover` and the shared tree keeps its
one writer. The plan was first written as `092-…`; a peer's `git add -A` swept
that untracked file into `a1426fe` while the number was also claimed by
`092-examples-suite-parity.md`. This branch deletes the stray copy and keeps the
plan at `094`.

### Measured before (the old direction)

With the paint reverted to the committed value **and** the pointer handlers
removed:

```text
FAIL src/components/Rating.test.tsx > Rating > paints the hovered star and the ones before it, without changing the rating
FAIL src/components/Rating.test.tsx > Rating > reports the painted fill to starStyle, not the committed value
FAIL src/components/Rating.test.tsx > Rating > previews only while the rating can take input
```

and in the real runtime:

```text
× previews the rating under the pointer, and leaving restores it
   AssertionError: expected '#00000C' to be '#000007'   # mutedForeground → primary
× previews downward from a higher committed value
× previews with the brand role while an invalid rating marks only what is missing
   AssertionError: expected '#00000F' to be '#000007'   # destructive → primary
Tests  3 failed | 266 passed (269)
```

The fourth runtime case ("takes no preview when the rating cannot take input")
passes in both directions by design: it guards against over-correcting, exactly
like plan 091's valid-field case.

### After

- `Rating` previews the prospective value while the pointer is over an
  interactive group; the committed value, its `aria-valuetext` and
  `onValueChange` are unchanged, and leaving the group restores the paint.
- `disabled` and `readOnly` attach no pointer handlers; an invalid preview keeps
  the brand role on the previewed stars; `starStyle`'s `filled` follows the paint.
- Offline: **38 files / 439 tests passed** (433 before; +3 core, +3 element-tree).
- Runtime: **20 files / 269 tests passed** (265 before; +4).
- `nub run check`, `nub run lint` and `nub run test` all exit `0`.

## 8. Acceptance

- [x] A pointer over an interactive rating previews the prospective value.
- [x] Leaving the group restores the committed value; the announcement never
      changes.
- [x] `disabled`/`readOnly` never preview; an invalid preview uses the brand role.
- [x] `starStyle`'s `filled` follows the paint.
- [x] The new tests fail with the wiring removed and pass with it.
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are updated.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
