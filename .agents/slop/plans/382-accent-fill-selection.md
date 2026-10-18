# Plan 382: the accent family's text selection on its filled action

> **Status (2026-10-18).** Done. Two published pair lists derived from the
> family index, two platform foregrounds moved one designed step. No new role,
> no change to the 66-role palette.

## Why

`filledControlFamilies` ships four filled families — `primary`, `secondary`,
`destructive` and `accent` (plan 097, completed by plan 327). The inverse
selection veil that content painted on a filled action uses — `selectionOnFill`
and `selectionStyle(theme, "fill")` (plan 344) — is published as one wash pair
and one text pair **per family**, but both lists were hand-typed with three
names:

```ts
export const selectionFillWashPairs = [
  ["selectionOnFill", "primary", "surface"],
  ["selectionOnFill", "secondary", "surface"],
  ["selectionOnFill", "destructive", "surface"],
];
```

`accent` is the fourth filled action: it is the toggle-on paint and a brand
surface a consumer can put content on with `selectionStyle(theme, "fill")`. The
package therefore promises the veil for "content painted on a filled action"
while measuring three of its four families. Erasing the accent label through
the veil returns `[]` from `themeContrastFailures`.

The gap hides a real shipped defect. Measured with the veil composited over the
accent fill:

| Set | `accentForeground` | `accent` | Through the veil | Floor |
| --- | ------------------ | -------- | ---------------- | ----- |
| macOS light | `#0055B3` | `#D9EAFD` | **4.140:1** | 4.5:1 |
| Linux dark | `#A8CBF0` | `#1B3A5C` | **4.430:1** | 4.5:1 |

The other twenty-two shipped sets clear the floor — the identity, both AAA sets,
Windows, XP and Aero are between 5.18:1 and 7.64:1. The two failures are
platform styles whose accent foreground is designed against the resting fill
(5.81:1 on macOS light, 6.90:1 on Linux dark) but loses its headroom when the
neutral veil composites over it. The veil itself is perceivable on `accent`
(1.407:1 light, 1.560:1 dark), so only the text half fails.

## Decision

1. **Derive both lists from the family index.** `selectionFillWashPairs` becomes
   `filledControlFamilies.map((fill) => ["selectionOnFill", fill, "surface"])`
   and `selectionFillPairs` becomes
   `filledControlFamilies.map((fill) => [`${fill}Foreground`, fill, "secondary"])`.
   A fifth filled family can no longer ship with no selection pairs and a
   hand-typed list can no longer drop one.
2. **Move two foregrounds one designed step**, keeping each platform's hue:

   | File | Role | From | To | Rest | Veil |
   | ---- | ---- | ---- | -- | ---- | ---- |
   | `src/platform-styles/macos.ts` light | `accentForeground` | `#0055B3` | `#004A9E` | 6.93:1 | 4.94:1 |
   | `src/platform-styles/linux.ts` dark | `accentForeground` | `#A8CBF0` | `#B4D5F7` | 7.64:1 | 4.91:1 |

   `#004A9E` is the readable step plan 381 already chose for the selected row in
   the same Apple blue family, so the light style keeps one readable accent
   text. The Linux value stays in Adwaita's light-blue family. Both keep the
   foreground readable on `accentHover` and `accentActive` (6.40/5.86 macOS
   light, 6.56/5.79 Linux dark) and improve the resting label.
3. **Do not change `selectionOnFill`.** A weaker veil would weaken every filled
   family to buy two tenths for one; the foreground is the role designed for
   reading text on that fill.
4. **No consumer row.** The contract is the only shipped surface; a consumer
   that paints selectable content on an accent fill already calls
   `selectionStyle(theme, "fill")`, and the pair now backs it.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/contrast.ts` | Derive `selectionFillWashPairs` and `selectionFillPairs` from `filledControlFamilies`; JSDoc names the four families and plan 382. |
| `packages/tokens/src/platform-styles/macos.ts` | light `accentForeground`; one sentence in the header. |
| `packages/tokens/src/platform-styles/linux.ts` | dark `accentForeground`; one sentence in the header. |
| `packages/tokens/src/selection-on-fill.test.ts` | Header names plan 382; lists derive from `filledControlFamilies`; the shipped-set loop walks all four families; one case proves the accent pair is reported. |
| `packages/tokens/src/contrast.test.ts` | Fill-list lengths 3 → 4 and the fill order. |
| `packages/tokens/src/docs.test.ts` | Floor-table rows name `accentForeground`/`accent`; the fill-selection section's four-family sentence and the pair history gain plan 382. |
| `docs/tokens.md` | The selection section names four families and the new tightest figures; the pair-count history gains the plan-382 sentence. |
| `docs/design-system.md` | The two fill-selection floor rows name `accentForeground`/`accent`. |
| `COMPONENTS.md` | Theme contrast check row: `4 fill-selection text pairs, 4 fill-veil pairs` and the plan-382 sentence. |
| `packages/tokens/README.md` | The selection paragraph names the four filled families. |
| `TODO.md` | Tick the new row. |
| `.agents/slop/plans/README.md` | Index 382 after the commands pass. |

No change to `theme.ts`, `styles.ts`, `metrics.ts`, `color.ts`, the identity
palettes, any role count, any other pair, or `selectionOnFill`.

## Command sequence

Run from the worktree root, in order. Each step must be green before the next.

```sh
# 1. The focused suite: fails before the foregrounds move, once the pair lands.
nub run --filter @gpuixui/tokens test -- selection-on-fill

# 2. The contract and docs suites.
nub run --filter @gpuixui/tokens test -- contrast docs inventory

# 3. The whole tokens suite.
nub run --filter @gpuixui/tokens test

# 4. Types, lint and format.
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt

# 5. The full repo gates.
nub run check
nub run test
```

Expected: step 1 fails before the palette moves with `darwin light default:
accent veil 1.407 text 4.14` and `linux dark default: accent veil 1.560 text
4.43`; passes after. Steps 2–5 pass.

## Test plan

`packages/tokens/src/selection-on-fill.test.ts`. The header states the bug being
guarded: the package ships four filled families, the inverse selection veil
named three, and the fourth family's label measured 4.140:1 (macOS light) and
4.430:1 (Linux dark) through the veil — under the 4.5:1 the on-colour role has —
while `themeContrastFailures` returned `[]`.

| Case | What it proves | How it fails without the fix |
| ---- | -------------- | ---------------------------- |
| publishes one wash and one text pair per filled family | both published lists equal the map of `filledControlFamilies`, and the text pair class is `secondary` | the pre-382 lists have three entries and no `accent` |
| keeps every shipped set's veil and family text at their floors | for all 24 shipped sets and all four families, text and veil clear their floors | macOS light 4.140 and Linux dark 4.430 fail before the moves |
| reports an edited theme whose veil matches its accent fill | `extendTheme(getTheme("dark"), { colors: { selectionOnFill: darkColors.accent } })` reports `selectionOnFill` on `accent` at the surface floor | the accent pair is absent, so the checker returns `[]` |
| reports an accent foreground that vanishes through the veil | `extendTheme(getTheme("light"), { colors: { accentForeground: lightColors.accent } })` reports `accentForeground` on `accent` at the secondary floor | the accent text pair is absent |

Prove both directions before committing: stash the palette edit, run the file,
see the two failures; restore, run, see green. The whole suite is claimed only
after it runs.

## STOP conditions

- Any shipped set fails a pair other than `accentForeground` through the veil on
  macOS light or Linux dark: stop and report. This plan moves one role per set
  and does not widen into a palette redesign.
- A moved foreground breaks `accentForeground` on `accent`, `accentHover` or
  `accentActive`, or the accent family's own hover/press/edge pairs: stop. Pick
  a closer designed step.
- A docs or inventory guard fails on a figure this plan does not change (the
  339 contrast pairs, the role count, the floor table): fix the document to the
  implementation, never the guard.
- The fourth family cannot be made to pass without changing `selectionOnFill`
  or the accent fill itself: stop and report; a veil family belongs in its own
  plan.

## Acceptance

- `selectionFillPairs` and `selectionFillWashPairs` are derived from
  `filledControlFamilies`, published, and reported by `themeContrastFailures`.
- Every shipped colour set, platform variant, recipe and executed example
  clears the four-family selection contract; only the two named foregrounds
  move.
- The focused suite fails without the moves and passes with them; the whole
  tokens suite, type check, lint, format and the repo gates pass.
- `docs/tokens.md` and `docs/design-system.md` name the four families and derive
  their figures; `COMPONENTS.md` carries the new counts; `TODO.md` carries the
  ticked row; the plan index lists 382; the work is committed on
  `agent/tokens-theme` and pushed.
