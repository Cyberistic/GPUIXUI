# 603 — The Toast countdown's groove

**Phase:** F (docs truth and the value-indicator contract)
**Workstream:** `tokens-theme` (the cross-team consumer fix is recorded, not
edited here)
**Depends on:** 347 (the `track` role), 348 (the Toast tone on its card), 503
(the groove on every surface it is painted on), 602 (the diagnostic-order
contraction)
**Status:** ready

## 1. The bug

The library has two value indicators. `Progress`, `Meter` and `Slider` paint
their unfilled groove with `track`, the role plan 347 shipped for exactly this
purpose. The **Toast countdown** does not: it paints a 2px full-width groove
with `muted`, a *surface* role, and a tone-coloured bar over it:

- `packages/components/src/toast/viewport.tsx:230` —
  `backgroundColor: theme.colors.muted` on the track wrapper whose card is
  `popover`;
- `packages/components/src/toast/viewport.tsx:241` — the bar fill,
  `palette.fg`, which is `statusTone(...).foreground` (`xSoftForeground`) until
  the plan-348 migration to `xText`.

`muted` is not a fill role. In the identity dark theme `muted` and `popover` are
the same value (`#222730`), and every platform and recipe dark set shares its
`muted` with its `popover`, so the groove measures **1.000:1** there. Four light
sets are also under the 1.05:1 surface floor (identity light 1.027:1, Linux light
1.035:1, Windows light 1.071:1 — the last passes; macOS light 1.069:1 passes).
A countdown bar shrinks; the unfilled remainder *is* the elapsed-time signal, so
in every dark set the toast shows a bar that appears to float with no groove.

The designed groove already exists and is measured on `popover`:
`trackSurfacePairs` includes `popover`; the tightest shipped pair across the 24
sets is **1.069:1** (Dark · Windows), so switching the role needs no palette
change and no new contrast pair. The same is true of the bar once it moves to
`xText`: the status-text pairs hold each tone on the eight surfaces, and the
track's own surface pairs imply the mark ratio on the groove.

`docs/tokens.md` already teaches the rule and names the wrong instance:

> `primitives` still paints `muted`; the migration is recorded in `TODO.md`.

That sentence is false by omission — the Toast is a second shipped indicator
painting `muted`, and no `TODO.md` row names it. This plan records the consumer
fix and ships the copyable correct composition so the row can be closed in one
call.

## 2. What changes, and what deliberately does not

**Does not change:** no colour role, palette value, contrast pair, floor, metric,
platform style, recipe or shipped theme. `track` on `popover` is already in
`trackSurfacePairs`; `xText` is already held on its eight surfaces. Adding a
`xText`-on-`track` pair would be a guard no consistent palette can fail (the
track is one 1.05:1 step from the surface the text already clears at 4.5:1, so
the ratio on the track is at least 4.5/1.05 > 3), and the audit after plan 602
forbids adding a pair that only blesses a composition no palette fails.

**Changes:**

1. A copyable, executed example `src/toast-countdown.example.ts` returning the
   two roles a countdown indicator paints: the groove (`track`) and the bar
   (`statusTone(theme, tone).text`). It is the same shape as
   `disabled-state.example.ts`: the designed composition a consumer copies
   while the shipped component migrates.
2. A co-located test that imports the example (the plan-350 rule that every
   `*.example.ts` runs), holds the returned roles to the shipped themes, and
   proves the example's choice differs from the old `muted` groove.
3. `docs/tokens.md`: the value-indicator paragraph names the Toast countdown as
   the second shipped indicator still on `muted`, gives the measured 1.000:1 and
   the designed 1.069:1 tightest, and links the example.
4. `docs/design-system.md`: the value-indicator paragraph names the Toast
   countdown and the two roles.
5. `docs.test.ts`: a case derives both figures from `shippedThemes` and requires
   the catalogue sentence; a second case requires the design-system sentence.
6. `COMPONENTS.md`: the Design tokens row names the Toast countdown exception
   and the migration.
7. `TODO.md`: one ticked tokens row for this unit and one **cross-team**
   `components` row with the exact evidence and the two roles to paint.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/toast-countdown.example.ts` | create |
| `packages/tokens/src/toast-countdown.test.ts` | create |
| `docs/tokens.md` | edit the value-indicator paragraph |
| `docs/design-system.md` | edit the value-indicator paragraph |
| `packages/tokens/src/docs.test.ts` | add two guard cases |
| `COMPONENTS.md` | edit the `Design tokens` row |
| `TODO.md` | tick the tokens row; add the cross-team row |
| `.agents/slop/plans/README.md` | index this plan |

No other file. In particular, **do not edit**
`packages/components/src/toast/viewport.tsx` in this worktree: that is the
`components` workstream. The `TODO.md` row is the handoff.

## 4. The example — `src/toast-countdown.example.ts`

Header comment states the bug (the shipped groove is `muted` on `popover`, which
is 1.000:1 in every dark set; the groove is `track`, the bar is the tone's
`xText`), then:

```ts
import type { Theme } from "./theme.js";
import { statusTone, type StatusTone } from "./styles.js";

/** The two roles a countdown indicator paints. */
export interface CountdownStyle {
  /** The unfilled groove (`track`). */
  readonly groove: string;
  /** The elapsed-time bar, in the tone's readable ink. */
  readonly bar: string;
}

/** The designed countdown indicator for a status-toned toast. */
export const countdownStyle = (
  theme: Theme,
  tone: StatusTone,
): CountdownStyle => ({
  groove: theme.colors.track,
  bar: statusTone(theme, tone).text,
});
```

JSDoc on the function names the source composition
(`components/src/toast/viewport.tsx`), the two old roles (`muted`,
`xSoftForeground`) and the target (plan 603). No `any`, no cast, no runtime
dependency.

## 5. The test — `src/toast-countdown.test.ts`

Header comment names the bug being guarded: *the shipped Toast countdown paints
its groove with `muted`, which is `popover` in every dark set, so the remaining
time is invisible; the designed groove is `track`.*

Cases:

1. **The example returns the designed roles.** For every shipped theme and every
   `statusTones` member: `countdownStyle(theme, tone).groove` is
   `theme.colors.track` and `.bar` is `theme.colors[`${tone}Text`]`.
2. **The groove is perceivable on the toast card.** For every shipped theme,
   `contrastRatio(style.groove, theme.colors.popover)` is at least
   `contrastFloors[theme.contrast].surface`. This uses the theme's own declared
   level, so both AAA sets are held to their floor. Quote the derived tightest
   value in the failure message.
3. **The bar is a mark on the groove.** For every shipped theme and tone,
   `contrastRatio(style.bar, style.groove)` is at least
   `contrastFloors[theme.contrast].mark`.
4. **The old role is why the example exists.** For identity dark and every
   platform/recipe dark set, `contrastRatio(theme.colors.muted,
   theme.colors.popover)` is below `contrastFloors.default.surface`; and for at
   least one shipped light set it is too. This is the failing plant the plan
   postdates: the palette fact is stable, and the case documents that the
   shipped role choice cannot meet the groove floor. It must not assert
   anything about the component source.
5. **The example is not the old role.** Assert that for every shipped theme the
   groove is not `theme.colors.muted` (the plan-350 style guard that a copyable
   example does not silently regress to the shipped defect).

The test must compile with `tsc -p tsconfig.json --noEmit` and run alone in
under a second.

### Two directions

- Write the example with `groove: theme.colors.muted` first; case 1 and case 4/5
  fail. Then change it to `track`; all pass.
- Remove the catalogue sentence (case 6 below); `docs.test.ts` fails. Restore;
  passes.

## 6. Documentation edits

### `docs/tokens.md`

In the value-indicator paragraph (currently around the `track` audit), replace
the single sentence naming only `primitives` with a sentence that names both
shipped indicators, e.g.:

> `primitives` still paints `muted` for `Progress` and a `Slider`'s rail, and
> the Toast's countdown paints its 2px groove the same way
> (`toast/viewport.tsx`); both migrations are recorded in `TODO.md`. The
> designed groove clears the floor on the toast's `popover` card at **1.069:1**
> in the tightest shipped set (Dark · Windows), where the shipped `muted` groove
> measures **1.000:1**. `src/toast-countdown.example.ts` is the two-role
> composition a consumer copies: `track` for the groove and the tone's `xText`
> for the bar.

The numbers are derived by the docs guard, not hand-held: the guard recomputes
`muted`/`popover` in the dark sets (1.000), the tightest `track`/`popover`
across the 24 sets (1.069) and requires the exact sentence.

### `docs/design-system.md`

In the value-indicator paragraph (§7, the `track` paragraph), add:

> The Toast's countdown is the second shipped indicator: its groove paints
> `muted` today, which is `popover` in every dark set and so has no shape; the
> designed composition is `track` for the groove and the tone's `xText` for the
> bar (plan `603`).

The §9 floor table does not gain a row: `track` is already the
`value indicator groove` row, and `xText` is already the status-text row. Do not
claim the `xText` bar is in `trackMarkPairs`; it is not, and the pair would be
redundant as shown in §2.

### `COMPONENTS.md`

In the `Design tokens` row, after the `track` sentence, add one clause:

> the shipped Toast countdown still paints its 2px groove with `muted`
> (1.000:1 on every dark `popover`) and is recorded cross-team (plan 603)

No count changes. `inventory.test.ts` reads no numeric role phrase from this
clause.

## 7. TODOs

Tick the tokens task and add the cross-team row (exact text, one line each):

```
`[x]` Name the Toast countdown's groove as the second shipped value indicator — its 2px track paints `muted` on `popover` (1.000:1 in every dark set) while `track` clears the floor at 1.069:1 in the tightest set; a copyable `countdownStyle` example, the catalogue and design-system sentences, the ledger clause and a derived docs guard ship, with no token or pair change (plan 603)
`[ ]` Cross-team: `components` paints the Toast countdown's 2px groove with `theme.colors.track` and its bar with `statusTone(theme, tone).text` — `toast/viewport.tsx:230` paints `muted` on a `popover` card, which is the same value in the identity dark theme and every platform/recipe dark set (**1.000:1**), so the unfilled remainder has no shape while the card stays recognisable; `track` is the designed groove (`trackSurfacePairs`, 1.069:1 at the tightest on `popover`) and `xText` is the readable tone the plan-348 row already asks for. Copy `countdownStyle` from `packages/tokens/src/toast-countdown.example.ts` (owner: `components`; plan 603)
```

## 8. Commands and expected results

Run from the worktree root (`workspaces/tokens-theme`):

1. `cd packages/tokens && ./node_modules/.bin/vitest run src/toast-countdown.test.ts`
   → 5 passing cases, no failure.
2. `cd packages/tokens && ./node_modules/.bin/vitest run src/toast-countdown.test.ts src/docs.test.ts`
   → new cases pass; all existing docs cases pass.
3. `nub run --filter @gpuixui/tokens check-types`
   → exit 0.
4. `nub run --filter @gpuixui/tokens test`
   → the whole tokens suite green (currently 155 files / 5,988 tests; the count
   grows by the new file and cases).
5. `nub run check`
   → exit 0.
6. `nub run lint`
   → exit 0.
7. `nub run test`
   → exit 0.

## 9. STOP conditions

Stop and report (do not improvise) if:

- any shipped theme measures `track`/`popover` below `contrastFloors[…].surface`
  — that is a palette/product decision outside this plan;
- any shipped theme's `countdownStyle(theme, tone).bar` on `.groove` is below
  the theme's `mark` floor — that contradicts §2 and needs a design decision;
- the `components` worktree's `toast/viewport.tsx` no longer matches the cited
  lines or already paints `track` — then the cross-team row is stale: update the
  evidence and stop;
- `docs.test.ts` fails on an unrelated existing case — that is a baseline
  problem, not this unit.

## 10. Acceptance

- The example and its test exist and run; every `*.example.ts` is imported by a
  suite (`examples.test.ts` stays green).
- The catalogue, design system and ledger name the shipped Toast countdown, its
  `muted` groove, the designed `track` groove and the `xText` bar; the two
  figures are derived by a test.
- No colour, pair, floor, metric, platform style, recipe or shipped theme
  changes.
- The cross-team `TODO.md` row is present and carries the measured evidence.
- `nub run check`, `nub run lint` and `nub run test` pass.
