# Plan 683 — The chip surface count plan 651 left at eight

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/styles.ts`, `packages/tokens/src/contrast.ts`,
> `packages/tokens/README.md`, `packages/tokens/src/soft-edge-surfaces.test.ts`,
> `TODO.md`, `.agents/slop/plans/README.md`. No colour, pair, floor, metric,
> shipped theme or runtime behaviour moves.
>
> ## Execution record (2026-10-19)
>
> - The new case failed before the prose edits with
>   `AssertionError: expected 'import type { BoxShadow } …' to contain
>   'The fill is measured on the nine surf…'`.
> - After the four edits it is the sixth case in the file (6/6). The derivation
>   proves the pair list and the local nine-surface list agree, so the prose
>   count now has one owner.
> - Package suite: **191 files / 6723 tests**. `nub run check`, `nub run lint`
>   and `nub run test` are green.
> - A follow-up grep confirms no current-state “eight surfaces a chip” remains in
>   `packages/tokens/src` or the package README; the two in `COMPONENTS.md` are
>   historical statements about plans 308 and 399.

## Why

`chipSurfaces` in `src/contrast.ts` holds **nine** surfaces:

```ts
const chipSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
  "selectedActive", // added by plan 651
] as const;
```

`softBorderSurfacePairs` and `statusFillPairs` both derive from it, and the two
reference documents say **nine** (including “the pressed `selectedActive`
included”). Three source JSDoc sentences and the package README still say
**eight** and enumerate the four washes without `selectedActive`:

| File | Sentence |
| ---- | -------- |
| `src/styles.ts` (`StatusToneStyle.solid`) | “measured on the eight surfaces a status chip sits on (`statusFillPairs`)” |
| `src/styles.ts` (`statusTone`) | “A solid chip is a fill on the eight surfaces a chip sits on” |
| `src/contrast.ts` (`contrastPairs` doc) | “on the eight surfaces a chip sits on, the solid status fill on those same surfaces” |
| `README.md` | “on the eight surfaces a chip sits on — the canvas, card and popover, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes” |

The README's enumeration is the failure mode: a reader counts four names in the
last group and believes the list is complete. Plan 651 added the pressed row to
the contract and updated the reference; the hover text and the front door did
not move.

Nothing held it: `soft-edge-surfaces.test.ts` proves the pairs cover its local
nine-surface list, but no case reads the prose, and `readme.test.ts` checks only
that the soft-edge paragraph exists.

## Scope

Documentation truth only. Every pair, floor and shipped value is already right;
the list is already nine.

## Exact steps

### 1. `packages/tokens/src/styles.ts`

- In the `StatusToneStyle.solid` comment:
  “The fill is measured on the **nine** surfaces a status chip sits on”.
- In `statusTone`'s JSDoc:
  “A solid chip is a fill on the **nine** surfaces a chip sits on”.

### 2. `packages/tokens/src/contrast.ts`

- In the `contrastPairs` doc, change “on the eight surfaces a chip sits on” to
  “on the nine surfaces a chip sits on”.

### 3. `packages/tokens/README.md`

Replace the soft-edge sentence's count and list:

> floor on that surface and on the nine surfaces a chip sits on — the canvas,
> card and popover, the `muted` panel and the
> `hover`/`active`/`accent`/`selected`/`selectedActive` washes — because the fill
> is deliberately close to a row wash and the edge is the shape a reader sees.

### 4. `packages/tokens/src/soft-edge-surfaces.test.ts`

Add one case, `"states the nine surfaces the pair list holds"`:

- derive the surfaces from `softBorderSurfacePairs` and assert there are nine,
  equal to the test's local `chipSurfaces` as a set (the derivation already
  exists in the first case; this one holds the prose to it);
- read the four prose sources with `node:fs` (the package's documentation-test
  pattern) and assert each states “nine” and, for the README, names
  `selectedActive` among the washes.

The case fails on the pre-fix text (four sentences) and on a future pair list
that grows or loses a surface.

### 5. Truth files

- `TODO.md`: add a ticked row; advance **304/380 → 305/381**.
- `.agents/slop/plans/README.md`: add the plan row, status `done`.
- This plan: status `done` plus an execution record.

## Commands and expected results

```sh
nub run --filter @gpuixui/tokens test src/soft-edge-surfaces.test.ts
# expected before step 1–3: FAIL — the README and source still say eight.

# after the prose edits
nub run --filter @gpuixui/tokens test src/soft-edge-surfaces.test.ts
# expected: PASS, 6 cases.

nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## STOP conditions

- `softBorderSurfacePairs` yields anything other than nine unique surfaces —
  report the list rather than editing the prose to fit.
- The change would need a token value, pair, floor, metric or COMPONENTS row to
  move. The two “eight” mentions in `COMPONENTS.md` are historical statements
  about plans 308 and 399 and stay.

## Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| nine surfaces derived from the pair list | a list that grows or loses a surface | Yes — remove one from `chipSurfaces` |
| four prose sources say nine | the original defect | Yes — pre-fix text fails |
| README names `selectedActive` | the incomplete enumeration | Yes — drop the name from the sentence |

## Acceptance criteria

- Every current-state mention of the chip surface count says nine, and the
  README enumerates `selectedActive`.
- The new case fails before the fix and passes after it.
- All gates are green; no token value moves.
