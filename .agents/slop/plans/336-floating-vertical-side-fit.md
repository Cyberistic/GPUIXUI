# 336 — An explicit vertical side is a preference too

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `020`, `041`, `047`, `060`, `066`, `067`, `095`, `098`, `156`, `335` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 outcome (filled after the run), §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

Plan `335` made a requested **horizontal** side a preference and deliberately
left the vertical rule alone, recording the remaining half as its own `TODO.md`
row. The probe (a temporary runtime file, deleted after recording) mounted each
case in the standard `1280 × 800` window and read the painted boxes:

| Case | Measured | Exact placement | Verdict |
| ---- | -------- | --------------- | ------- |
| `Tooltip side="top"`, trigger `y 12..36`, tip `47 × 26` | tip `y 8..34` | cannot fit above (4 px of margin space); opens below at `y 36..62` | **tip covers its trigger** |
| `Tooltip side="bottom"`, trigger `y 748..772` | tip `y 772..798` | cannot fit below (20 px); opens above at `y 722..748` | **tip runs past the 8 px window margin** (`798 > 792`) |
| `Select side="bottom"`, trigger `y 740..772`, 2 options | list `y 772..792`, **20 px tall** | cannot fit below (20 px); opens above at `y 672..740`, full **84 px** | **list squashed to one partial row** — the wrapper's own `maxHeight` cap used the requested side |
| `Select side="top"`, trigger `y 12..44`, 2 options | list `y 2..12`, **10 px tall** | cannot fit above (4 px); opens below at `y 44..128` | **list inside the margin, touching the trigger** |

The runtime's `fit="snap"` clamps the layer into the window **without flipping**
(plan `156` §8), and both wrappers hand an explicit `top`/`bottom` straight
through (`Tooltip.tsx`, `Select.tsx`). The automatic path already has the right
rule (`decideVerticalSide`, plans `066`/`067`); the explicit path bypasses it.
For `Select` the defect is worse than a clamp: `maxHeight` is computed from the
resolved side with `availableOn`, so a pinned side also shrinks the list to the
space the wrapper believes it has.

The executor re-measures by running the new runtime tests against the unmodified
tree (§5.3) and pastes the numbers into §7.

## 1. The decision

**A requested vertical side is a preference.** `Tooltip.side="top"`,
`Tooltip.side="bottom"`, `Select.side="top"` and `Select.side="bottom"` mean
"above/below the trigger, on that side if it fits". When the layer cannot fit
there, the wrapper opens it on the other vertical side, or on the roomier one
when neither fits — exactly the rule the horizontal axis adopted in plan `335`.

After this plan `side` has **one meaning on both axes**: *where to open, when
that is possible*. The automatic paths do not change: `Tooltip` still prefers
`top`, `Select` still prefers `bottom`, and every existing behaviour is the
default value of the same rule.

**Nothing new is needed in `core/floating.ts`.** `decideVerticalSide` already
implements fits → other side → roomier with a `preferred` parameter, and
`floating.test.ts` already pins both preferred directions ("keeps a preferred
top when it has room", "falls back from a preferred top when only below has
room"). The defect is at the call sites, which skip the rule for an explicit
side.

## 2. The rule

1. `Tooltip`'s side resolution becomes:

   ```ts
   const side = Option.match(Option.fromNullishOr(box), {
     onNone: () => props.side ?? "top",
     onSome: (measured) => {
       const vertical = (preferred: VerticalSide): VerticalSide =>
         decideVerticalSide({
           triggerTop: measured.top,
           triggerBottom: measured.bottom,
           layerHeight: tooltipHeight(theme),
           viewportHeight: viewport.height,
           margin: FLOATING_MARGIN,
           preferred,
         });
       const requested = props.side;
       return requested === undefined
         ? vertical("top")
         : isHorizontalSide(requested)
           ? decideHorizontalSide({ /* unchanged */ })
           : vertical(requested);
     },
   });
   ```

   The measured-tip width/height path (plan `098`) and the `center` correction
   (plan `095`) are unchanged.

2. `Select`'s side resolution becomes the same shape: the automatic branch keeps
   `decideVerticalSide` with the default `bottom`, the horizontal branch is
   unchanged, and an explicit `top`/`bottom` goes through
   `decideVerticalSide({ ...measurement, preferred: requested })`. With no
   measurement yet (the first frame, or an element tree outside a renderer) the
   caller's side is passed through, as today.

3. The `maxHeight` cap in `Select` already reads the **resolved** side, so a
   flipped list is capped to the free space on the side it actually opens on.
   This is what turns the 20 px squash into a full 84 px list.

4. Both wrappers already measure in `useLayoutEffect` before paint (plans `067`,
   `098`, `335`), so a flipped layer is the first painted frame.

5. Docs say what the code does: on both pages, `side` is a preference on **both**
   axes; a layer larger than the room on both sides is still clamped by the
   runtime. The README and `COMPONENTS.md` rows and both prop docstrings lose the
   "an explicit `top`/`bottom` wins" claim.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Tooltip.tsx` | route an explicit vertical side through `decideVerticalSide`; update the header + `side` docstring |
| `packages/primitives/src/components/Select.tsx` | route an explicit vertical side through `decideVerticalSide`; update the header + `side` docstring |
| `packages/primitives/runtime/fields.runtime.test.tsx` | five cases: Tooltip top→below at the top edge, Tooltip bottom→above at the bottom edge, Select bottom→above at the bottom edge (full height), Select top→below at the top edge, and a Select `side="bottom"` with room that stays below |
| `packages/primitives/docs/tooltip.mdx` | Placement + Limitations: a vertical side is a preference |
| `packages/primitives/docs/select.mdx` | Placement + Limitations: a vertical side is a preference |
| `packages/primitives/README.md` | the "a layer that clamps instead of flipping" row |
| `COMPONENTS.md` | the Selects and Tooltips rows |
| `TODO.md` | tick the deferred vertical-side task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/336-floating-vertical-side-fit.md` | §7 after the run |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons`,
`docs/gpuix-capabilities.md` or `apps/*`. No element-tree test is added: the
side is resolved from renderer bounds, so the runtime suite is the only honest
proof.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/floating.test.ts` | every existing vertical/horizontal case stays green (no core change) |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 41 files / 543 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the five new cases pass; every existing tooltip/select case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 22 files / 353 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertion in §7.

### 5.1 The runtime contract (`runtime/fields.runtime.test.tsx`)

All are measured on the standard `1280 × 800` window. `Surface` pads by `lg`
(12 px), so the content box runs `y 12..788`.

1. **"opens a top-side Tooltip below at the window's top edge"** — a
   `60 × 24` trigger at `y 12`; `side="top"`; hover. Assert
   `tip.y >= target.y + target.height`. Measured before: tip `y 8..34`, over the
   trigger.
2. **"opens a bottom-side Tooltip above at the window's bottom edge"** — a
   `760`-high column with a `Spacer`, so the trigger sits at `y 748..772`;
   `side="bottom"`. Assert `tip.y + tip.height <= target.y`. Measured before: tip
   `y 772..798`.
3. **"opens a bottom-side Select list above at the window's bottom edge"** — the
   same column with a 2-option `Select side="bottom"`; open it. Assert
   `list.y + list.height <= trigger.y` and
   `Math.abs(list.height - selectListHeight(2, testTheme)) <= 1`. Measured
   before: list `y 772..792`, 20 px tall.
4. **"opens a top-side Select list below at the window's top edge"** — a 2-option
   `Select side="top"` at the top of the surface; open it. Assert
   `list.y >= trigger.y + trigger.height`. Measured before: list `y 2..12`.
5. **"keeps a bottom-side Select list below a trigger with room"** — the same
   select without the spacer, so there is room below. Assert
   `list.y >= trigger.y + trigger.height` (the fix must not hard-code a flip)
   and the list is not capped.
6. Keep every existing tooltip/select case green — in particular
   `opens a Tooltip on hover and dismisses it on click` (a `side="bottom"` tip
   that fits), `opens a Tooltip below a trigger at the window's top edge`,
   `keeps a Tooltip above a trigger with room`, the four horizontal-side flips,
   the vertical automatic flips, the width match and the long-list cap.

### 5.2 The pure rule (`src/core/floating.test.ts`)

No new case is written: `decideVerticalSide`'s preferred-top behaviour is already
proven in both directions. If the executor finds it is not, STOP (§6.4) rather
than weakening an existing case.

### 5.3 Two-direction proof (required before "done")

- Run cases 1–4 against the **unmodified** tree first; record the measured
  numbers in §7 (they must fail).
- Restore `Tooltip`'s pass-through for `top`/`bottom` only: cases 1 and 2 fail.
- Restore `Select`'s pass-through: cases 3 and 4 fail.
- Invert the preference (always pass the *other* side regardless of fit): case 5
  fails, proving the rule still respects room.
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. A case in §0 already opens on the side with room — then the premise is wrong
   and the plan re-derives the rule from a fresh probe instead of shipping
   arithmetic for a non-existent defect.
3. Flipping a vertical side makes the layer unreachable (e.g. the runtime still
   clamps it off the window, or a flipped list is no longer scrollable). Report
   the measurement and propose the strongest honest alternative (keep the clamp
   and document it) rather than forcing the rule.
4. `decideVerticalSide`'s preferred behaviour is not actually covered — report
   the gap instead of adding a case that only restates the implementation.
5. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

An explicit vertical side is now a preference on both wrappers, and both
directions are measured. The rule needed **no change** in
`core/floating.ts`: `decideVerticalSide` already had the fits → other side →
roomier order with a `preferred`; both wrappers simply stopped bypassing it.
`Select`'s `maxHeight` already follows the resolved side, so a flipped list is
capped to — and paints at — the space it actually has.

**Measured before (unmodified tree):**

| Case | Failing assertion |
| ---- | ----------------- |
| `Tooltip side="top"`, trigger `y 12..36` | `tip.y` `8`, expected `≥ 36` |
| `Tooltip side="bottom"`, trigger `y 748..772` | `tip.y + tip.height` `798`, expected `≤ 748` |
| `Select side="bottom"`, trigger `y 740..772` | list `y 772`, height `20`; expected above the trigger at its full `84` |
| `Select side="top"`, trigger `y 12..44` | `list.y` `2`, expected `≥ 44` |

**After:** the four edge cases open on the side with room (top→below,
bottom→above), and a `side="bottom"` select with room stays below. The measured
residual is a layer taller than the free space on **both** sides, which the
runtime still clamps and `Select` caps/scrolls — stated on both pages and in the
README.

**Two-direction proof.** Re-measured while restoring the pass-throughs:

- `Tooltip` pass-through: cases 1 and 2 failed with the numbers above.
- `Select` pass-through: cases 3 and 4 failed with the numbers above.
- Preference inverted (always the far side): case 5 failed, so the rule still
  leaves a layer on its requested side when it fits.
- Restored: offline **41 files / 543 tests**, runtime **22 files / 358 tests**
  (353 + 5); `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] A requested vertical `side` that cannot fit opens on the other vertical
      side, or the roomier one when neither fits.
- [x] A requested vertical side that fits is unchanged, on both components.
- [x] The trigger is never underneath the layer in the four measured cases.
- [x] A flipped `Select` list is capped to — and paints at — its own full height.
- [x] The automatic vertical choices are unchanged (`Tooltip` prefers `top`,
      `Select` prefers `bottom`).
- [x] Every new test fails in both directions before/after the fix.
- [x] Docs, `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index record it.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
