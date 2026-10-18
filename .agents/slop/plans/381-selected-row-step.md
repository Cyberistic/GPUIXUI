# Plan 381: the selected row is a perceivable step from the hover wash

> **Status (2026-10-18).** Done. One token gap, one pair, eight `selected`
> value moves, one platform-foreground move, one authored-example move, one
> cross-team consumer row. No new roles.

## Why

A selectable `List` row paints `accent` while the pointer is over it and
`selected` once it is chosen (`packages/components/src/list.tsx:772` and `:778`).
The two roles are the only signal of the transition from "under the pointer" to
"selected", and in the shipped palettes they are frequently the same fill:

| Set | `accent` | `selected` | Ratio | Step? |
| --- | -------- | ---------- | ----- | ----- |
| identity light | `#EEF0FF` | `#EEF0FF` | 1.000 | no |
| identity dark | `#2E2370` | `#2E2370` | 1.000 | no |
| identity high light | `#E0E3FF` | `#E0E3FF` | 1.000 | no |
| identity high dark | `#251B5C` | `#251B5C` | 1.000 | no |
| macOS light | `#D9EAFD` | `#D9EAFD` | 1.000 | no |
| Windows light | `#DCEBF8` | `#CCE8FF` | 1.044 | no |
| macOS dark | `#1C3A57` | `#123A5C` | 1.004 | no |
| XP light | `#C6DAFA` | `#C9DDFF` | 1.031 | no |
| Linux light | `#E1ECFA` | `#D7E6F9` | 1.061 | yes |
| Linux dark | `#1B3A5C` | `#2B4F76` | 1.374 | yes |
| Windows dark | `#0F3554` | `#094771` | 1.298 | yes |
| Aero light | `#D8EAFB` | `#CCE4FA` | 1.065 | yes |

In the identity, the library's own look, hovering one row and selecting another
paint the same fill: two rows look selected at once, and clicking a hovered row
changes nothing. That is the same defect class plans `097` (filled families) and
`327` (the toggle-on accent) fixed one state over — a state that is not a
perceivable step from the state before it. The `step` pair class already exists
for exactly this (`stateStepPairs`, `washStepPairs`), but no pair measures
`selected` against the hover wash that precedes it.

The design-system already says a state must be perceivable: "a hover or a press
that is not perceivable is not a state". Selection is a state too.

## Decision

1. Add one pair, `["selected", "accent", "step"]`, published from
   `src/contrast.ts` as `selectionStepPairs` and included in `contrastPairs`.
   The step floor is 1.05:1 at both contrast levels, the same class the filled
   families and the generic wash ladder use.
2. Move `selected` in the eight sets that fail it, and `selectedForeground` in
   macOS light where the old foreground cannot clear its floor on a step deeper
   than the accent:

   | File | Role | From | To |
   | ---- | ---- | ---- | -- |
   | `src/color.ts` `lightColors` | `selected` | `palette.iris[50]` `#EEF0FF` | `palette.iris[100]` `#E0E3FF` |
   | `src/color.ts` `darkColors` | `selected` | `palette.iris[900]` `#2E2370` | `#402F94` |
   | `src/color.ts` `highContrastLightColors` | `selected` | `#E0E3FF` | `#D8DBFF` |
   | `src/color.ts` `highContrastDarkColors` | `selected` | `#251B5C` | `#33257A` |
   | `src/platform-styles/macos.ts` light | `selected` | `#D9EAFD` | `#CFE3FA` |
   | `src/platform-styles/macos.ts` light | `selectedForeground` | `#0055B3` | `#004A9E` |
   | `src/platform-styles/macos.ts` dark | `selected` | `#123A5C` | `#1A4568` |
   | `src/platform-styles/windows.ts` light | `selected` | `#CCE8FF` | `#C2E2FF` |
   | `src/platform-styles/recipes/xp.ts` light | `selected` | `#C9DDFF` | `#BDD4FF` |
   | `src/platform-styles.example.ts` `contosoPlatformStyle` light | `selected` | `#DCEEFB` | `#D3E8F9` |

   Every value above was measured with the full `themeContrastFailures` list
   before this plan was written: each returns `[]` on its set, and each clears
   the new step (identity light 1.117, identity dark 1.290, AAA light 1.071, AAA
   dark 1.213, macOS light 1.070, macOS dark 1.169, Windows light 1.107, XP light
   1.056, Contoso light 1.104). Linux light/dark, Windows dark and Aero light
   already pass and do not move.
3. Do **not** add `selectedHover`/`selectedActive` or move `accent`. A selection
   family is a larger design with a dark-mode text constraint (a lighter dark
   selection fails the body floor on the `foreground` a `ListItemTitle` paints),
   so it is deliberately out of scope; a follow-up can add it when the consumer
   needs a pointer state *inside* a selected row.
4. Record the consumer half as a cross-team `TODO.md` row: `list.tsx` paints
   `hover: { backgroundColor: accent }` on every focusable row and
   `backgroundColor: selected` when selected, so the pointer currently
   *replaces* a selected row's fill. A selected row must keep `selected` (do not
   paint the unselected hover wash over it). The token change makes the two
   roles distinguishable; the consumer change makes a selected row hold still
   under the pointer.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/contrast.ts` | `selectionStepPairs` with the pair, included in `contrastPairs`, exported, JSDoc naming the composition and plan 381. |
| `packages/tokens/src/color.ts` | Four `selected` values; extend the JSDoc notes in each palette comment (one sentence each) and the `accent`/`selected` role docs so `accent` is the highlight/toggle wash and `selected` the persistent row fill. |
| `packages/tokens/src/platform-styles/macos.ts` | `selected` + `selectedForeground` light, `selected` dark; one sentence in the file header. |
| `packages/tokens/src/platform-styles/windows.ts` | light `selected`; one sentence in the header. |
| `packages/tokens/src/platform-styles/recipes/xp.ts` | light `selected`; one sentence in the header. |
| `packages/tokens/src/platform-styles.example.ts` | Contoso light `selected`, with the JSDoc sentence that the wash follows the accent. |
| `packages/tokens/src/selection-states.test.ts` | **New.** Header states the regression; cases below. |
| `packages/tokens/src/docs.test.ts` | Only if a derived phrase needs the new count (the pair-count history's last step becomes `taking it from 338 to **339**`, and the audit series names plan `381`). |
| `packages/tokens/src/inventory.test.ts` | No code change: `CONTRASTS` phrase is derived. The ledger row text changes in `COMPONENTS.md` only. |
| `docs/tokens.md` | The two colour tables' `selected` rows; the selection section names the new step pair and the hover/selection distinction; the verification history gains 338 → 339 and the plan-381 sentence. |
| `docs/design-system.md` | §8 `selected` row names the step and the hover wash; the selection paragraph states that a persistent selection must be perceivable past the hover that precedes it. |
| `COMPONENTS.md` | Design tokens row: the selection sentence; Theme contrast check row: `339 contrast pairs` and the plan-381 sentence. |
| `TODO.md` | Tick the new `[x]` row; add the cross-team `components` row. |
| `.agents/slop/plans/README.md` | Index 381 with a summary and status `done` after the commands pass. |

No change to `theme.ts`, `styles.ts`, `metrics.ts`, the type surface, the role
count (66), any selection/wash/soft/scrim pair, or any non-`selected` value.

## Command sequence

Run from the worktree root, in order. Each step must be green before the next.

```sh
# 1. The suite that will fail before the palette moves (after the pair lands).
nub run --filter @gpuixui/tokens test -- selection-states

# 2. The whole tokens suite: 89 files, 4,394 cases, then one more file.
nub run --filter @gpuixui/tokens test

# 3. Types, lint and format.
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt

# 4. The full repo gates.
nub run check
nub run test
```

Expected: step 1 fails before the palette moves with a `selected/accent/step`
failure on the identity, macOS light, Windows light, macOS dark and XP light;
passes after. Steps 2–4 pass, and `nub run test` is green for every package,
not only tokens.

## Test plan

`packages/tokens/src/selection-states.test.ts`. The header comment names the bug
being guarded: a selectable list row paints `accent` on hover and `selected`
when selected, and the two were the same fill in the identity (and within the
1.05:1 step floor in five more shipped sets), so hovering one row looked like
selecting another and clicking a hovered row changed nothing.

| Case | What it proves | How it fails without the fix |
| ---- | -------------- | ---------------------------- |
| ships a step in every colour set | for every mode × contrast, every platform variant and both recipes, `contrastRatio(selected, accent) >= contrastFloors[theme.contrast].step` | the identity, AAA, macOS, Windows and XP sets sit below 1.05 |
| the public checker reports a collapsed selection | `extendTheme(getTheme("light"), { colors: { selected: lightColors.accent } })` returns a failure with `foreground: "selected"`, `background: "accent"`, `pairClass: "step"` | the pair is absent (the pre-plan checker returns `[]`) |
| the step is a pair class of its own | `selectionStepPairs` is exported, length 1, and `contrastPairs` contains the same tuple exactly once | a hidden local pair leaves the public contract unchanged |
| the selected fill keeps every other composition | all 24 shipped sets still return `[]` from `themeContrastFailures`, `themeMetricFailures` and `themeColorFailures`; `selectedForeground` clears its floor on `selected` in each | a move that fixes the step but breaks the label or the boundary |
| the platform styles still own a distinct selection | macOS light, Windows light and XP light each differ from their identity `selected`, and their step is above the floor | inheriting the identity value produces a platform with no own selection |
| the documented example still passes | both executed platform examples (`resolveAuthoredPlatformStyle` and `resolveEditedPlatformTheme`) return `[]` from all three checks in both modes | the copy-and-own path ships a collapsed selection |

Prove both directions for the first two cases before committing:
`git stash` the palette edit, run the file, see the step failures; restore, run,
see green. No test is claimed without a run.

## STOP conditions

- Any shipped theme, variant, recipe or example fails a pair other than
  `selected`/`accent`: stop and report the set and pair. This plan moves one
  role at a time and does not widen into a palette redesign.
- A `selected` value clears the step but breaks `selectedForeground` on
  `selected`, the `border`/`borderStrong`/`ring` edge, `track`/`skeleton` on the
  fill, or `foreground`/`mutedForeground`/`popoverForeground` on it: stop. Pick
  a closer designed step; do not change a second role except the macOS light
  `selectedForeground` this plan already names.
- The macOS light step cannot be made perceivable without a second role move
  beyond `selectedForeground`: stop and report. A platform style may keep the
  old selection rather than ship a broken label.
- A docs or inventory guard fails on a figure this plan does not change
  (`338`, the role count, the floor table): fix the document to the
  implementation, never the guard.
- The change cannot be expressed without a new role (e.g. a light that clears
  every floor): stop and report; a family belongs in its own plan.

## Acceptance

- `selectionStepPairs` is public, documented in `docs/tokens.md` and the design
  system, and included in `themeContrastFailures`.
- Every shipped colour set, platform variant, recipe and executed example clears
  the new step; the identity, AAA, macOS, Windows and XP `selected` values moved
  as listed, and no other role moved except macOS light `selectedForeground`.
- `selection-states.test.ts` fails without the palette moves and passes with
  them; the whole tokens suite, type check, lint, format and the repo gates pass.
- `TODO.md` carries the ticked row and the cross-team `components` row; the plan
  index lists 381; the work is committed on `agent/tokens-theme` and pushed.
