# Plan 682 — The caret sentence publishes one pair as nine

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/styles.ts`, `packages/tokens/src/native-field-caret.test.ts`,
> `TODO.md`, `.agents/slop/plans/README.md`. No colour, pair, floor, metric,
> shipped theme or runtime behaviour moves.
>
> ## Execution record (2026-10-19)
>
> - The new case failed before the sentence edit with
>   `AssertionError: expected 'import type { BoxShadow } …' to contain
>   '`primaryTextPairs` holds the eight …'`; after the edit it is the ninth case
>   in the file and the suite is 9/9.
> - The derivation also proves the lists, not just the words: eight non-mark
>   `primaryText` pairs on the nine surfaces plus the one `caretPairs` mark pair
>   cover `caretSurfaces` exactly.
> - Package suite: **191 files / 6722 tests**. `nub run check`, `nub run lint`
>   and `nub run test` are green.

## Why

`nativeFieldTheme`'s JSDoc says:

> `primaryText` clears the floor on every surface a field sits on —
> `{@link caretPairs}` publishes the nine — in all 24 shipped sets (5.587:1 at
> the tightest).

`caretPairs` publishes **one** pair:

```ts
export const caretPairs: readonly ContrastPair[] = [
  ["primaryText", "input", "mark"],
];
```

The other eight surfaces are the `primaryTextPairs` text pairs. The same
function's own `contrast.ts` JSDoc says this correctly (“the other eight surfaces
… are already held by `primaryTextPairs`”), and the README says “`caretPairs`
holds it on the field's `input` fill beside the eight surfaces the `primaryText`
text pairs already cover.” The hover text on `nativeFieldTheme` is the only
surface that credits one pair with nine.

Nothing holds it: `native-field-caret.test.ts` proves the caret clears the mark
floor on its local `caretSurfaces` list, but no case reads the sentence or ties
that list to the two published pair lists.

## Scope

Documentation truth only. The nine surfaces, the ratios and the pair lists are
already correct.

## Exact steps

### 1. `packages/tokens/src/styles.ts`

Replace the sentence with:

> `primaryText` clears the floor on all nine surfaces a field sits on —
> `primaryTextPairs` holds the eight and {@link caretPairs} adds the field's own
> `input` fill as a mark — in all 24 shipped sets (5.587:1 at the tightest).

### 2. `packages/tokens/src/native-field-caret.test.ts`

Add one case, `"states which pair publishes each of the nine surfaces"`:

- read `styles.ts` with `node:fs` (same documentation-test pattern as
  `docs.test.ts`; the package ships no runtime dependency);
- assert the normalized sentence names `primaryTextPairs`, `caretPairs` and
  “the eight”;
- derive the eight from `contrastPairs`: every `primaryText` pair whose surface
  is in `caretSurfaces` and whose class is not `mark`; assert there are eight and
  that they plus the one `caretPairs` surface cover `caretSurfaces` exactly.

The derivation fails if `caretPairs` grows a second entry, if a `primaryText`
pair loses its surface, or if the sentence credits the wrong list.

### 3. Truth files

- `TODO.md`: add a ticked row and advance **303/379 → 304/380**.
- `.agents/slop/plans/README.md`: add the plan row, status `done`.
- This plan: status `done` plus an execution record.

## Commands and expected results

```sh
nub run --filter @gpuixui/tokens test src/native-field-caret.test.ts
# expected: FAIL before step 1 — the sentence does not name `primaryTextPairs`.

# after step 1
nub run --filter @gpuixui/tokens test src/native-field-caret.test.ts
# expected: PASS.

nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## STOP conditions

- `caretSurfaces` no longer has nine members, or `contrastPairs` no longer
  yields eight non-mark `primaryText` pairs on those surfaces — report the
  discrepancy instead of widening the sentence.
- A token value, pair, floor, metric or shipped theme would have to move.

## Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| sentence names the two owners | the original false credit | Yes — pre-fix text fails |
| eight non-mark pairs + one mark pair cover `caretSurfaces` | a pair list or surface list drifting apart | Yes — remove a pair from `caretPairs`/the text list |

## Acceptance criteria

- The sentence credits `primaryTextPairs` with the eight and `caretPairs` with
  the field's `input` fill.
- The new case fails before the fix and passes after it.
- All gates are green; no token value moves.
