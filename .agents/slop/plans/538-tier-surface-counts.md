# 538 — The tier paragraph's surface counts

Status: ready. Depends on 392 (the tier list and its surfaces), 500 (the surface
body roles), 527 (the hint's nine surfaces), 537 (the tier figure table).

## The bug

`docs/tokens.md` → *Theme API → Text hierarchy* states the size of each tier's
surface set as prose and nothing derives it:

> The surfaces are derived from `contrastPairs`, not retyped: **12** shared
> surfaces for secondary text below body copy, **one** `card` for
> `cardForeground`, **four** for `popoverForeground` (`popover` and the three
> row washes it shares), the **nine** surfaces typed text is documented on for
> `inputForeground`, **12** for the inactive label below secondary text, **nine**
> for a hint and a caption, and **five** for the disabled panel-action label
> below the enabled one.

Every count is correct today. None is held: `docs.test.ts` derives the
`selectionSurfaces`, `inactiveSurfaces`, chip-edge and overlay counts, the
figures for each tier (plan 537), and the tier *names* (plan 392), but not these
counts. A surface joining both roles' pairs — `contrastPairs` is the only place
that decides — changes the tier's comparison set and can leave the paragraph
quoting the old size while every figure still passes: a new surface whose step
is larger than the minimum never moves the figure the plan-537 cases assert.

The same paragraph's panel-action sentence repeats one of them — "on the
**five** surfaces the two labels share" — with the same exposure.

## The decision

Derive each count through `tierSurfaces` (plan 537), the table's copy of the
checker's surface rule, and assert the phrase beside it. Normalise the two
numerals to the words the rest of the paragraph uses (`12` → `twelve`) so a
single `countWord` builder can express every phrase.

Add one case to `docs.test.ts`'s existing *contract counts* suite:

```ts
it("states the shared-surface count of every tier", () => {
  const prose = markdown.replace(/\s+/g, " ");
  const shared = (dimmer, brighter) => tierSurfaces([dimmer, brighter]).length;

  [
    `${countWord(shared("mutedForeground", "foreground"))} shared surfaces for secondary text below body copy`,
    `${countWord(shared("mutedForeground", "cardForeground"))} \`card\` for \`cardForeground\``,
    `${countWord(shared("mutedForeground", "popoverForeground"))} for \`popoverForeground\``,
    `the ${countWord(shared("mutedForeground", "inputForeground"))} surfaces typed text is documented on for \`inputForeground\``,
    `${countWord(shared("disabledForeground", "mutedForeground"))} for the inactive label below secondary text`,
    `${countWord(shared("placeholder", "mutedForeground"))} for a hint and a caption`,
    `${countWord(shared("disabledForeground", "softActionForeground"))} for the disabled panel-action label below the enabled one`,
    `${countWord(shared("disabledForeground", "softActionForeground"))} surfaces the two labels share`,
  ].forEach((phrase) => expect(prose, phrase).toContain(phrase));
});
```

`tierSurfaces` is test-shaped source in `figures.ts`, like `full-set-claims.ts`;
`docs.test.ts` may import it. The phrase list is the page's own wording, so the
guard fails on a changed count and on reflowed prose (whitespace is normalised
on both sides).

## Files

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | `12` → `twelve` twice in the tier paragraph; nothing else |
| `packages/tokens/src/docs.test.ts` | import `tierSurfaces`; the count case |
| `TODO.md` | new row, ticked; the fraction |
| `.agents/slop/plans/README.md` | index plan 538 |

## Steps

1. Read `figures.ts`'s `tierSurfaces`, `docs.test.ts`'s *contract counts* suite
   and the tier paragraph in `docs/tokens.md`.
2. Add the case and run `nub run --filter @gpuixui/tokens test`. Expected: one
   failure (the two `12` phrases), the other six pass.
3. Change the two numerals to `twelve`; re-run. Expected: 127 files green.
4. Prove both directions: change `twelve` to `13` → the first phrase fails;
   restore. (The case is value-derived, so the pre-word form also fails.)
5. Tick `TODO.md`, index the plan, run `nub run check`, `nub run lint` and
   `nub run test`.

## STOP conditions

- **STOP** if a derived count disagrees with the page other than the two numeral
  spellings. Report the tier, the derived count and the phrase; do not change a
  pair list or a colour to make a number match.
- **STOP** if the fix needs a public export: `tierSurfaces` already ships in the
  test-shaped module.
- **STOP** if any shipped theme fails a check.

## Test plan

- The case fails on the pre-538 page because `countWord(12)` renders `twelve`
  and the page writes `12`.
- Replacing a derived count with a neighbour (e.g. `13`) fails the phrase, so
  the case is not merely asserting the page contains a number.
- The other six phrases already pass, so the case is not a rewrite of the
  paragraph: it pins the existing wording.
- No colour, pair, floor, metric or role changes, so every other suite is
  untouched.

## Acceptance

- Each tier's documented surface count is derived from `tierSurfaces`.
- `nub run check`, `nub run lint` and `nub run test` pass; `packages/tokens`
  is 127 files.
- `TODO.md` has the row ticked and the plan index names 538.
