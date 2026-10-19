# 613 — The content ring's quoted figures

**Status:** ready
**Phase:** F (docs truth)
**Depends on:** 611 (the ring and its figures), 544 (the quoted-figure table)
**Owner paths:** `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`

## 1. The defect

Plan 611 added the two-tone content ring and quoted its derived bound on five
surfaces:

| Surface | Figures |
| ------- | ------- |
| `docs/tokens.md` | identity light 3.98:1, AAA 4.58:1, tightest `Dark · Linux` 3.70:1 |
| `docs/design-system.md` | tightest 3.70:1 |
| `packages/tokens/README.md` | tightest 3.70:1 |
| `COMPONENTS.md` | tightest 3.70:1, AAA 4.58:1 |
| `packages/tokens/src/ring.ts` JSDoc | pair 15.86:1 → 3.98:1, pair 21:1 → 4.58:1, tightest 3.70:1 |

`docs.test.ts` has one case — "states the bounds the shipped sets guarantee" —
that derives the three numbers and requires `docs/tokens.md` to **contain** them
somewhere. That is a presence check, not a sentence check: a page that quoted
3.70 for the identity-light sentence and 3.98 for the tightest set would pass,
and nothing derives the **named set**, the design-system figure, the README
figure, the two `COMPONENTS.md` figures or any figure in the source JSDoc.

`figures.ts` — the table plan 544 built for exactly this — has no measurement
for a ring: its `FigureKind` is `plain | selection | overlay | dim`, all of which
measure a pair directly, while the ring's worst case is
`sqrt(contrast(outer, inner))`.

A palette edit can therefore move `foreground`/`background` (and with them every
ring figure, including which set is tightest) while four of the five surfaces —
and the named set even in the catalogue — keep quoting the old numbers and every
check returns `[]`. That is the plan-336 / plan-544 defect class one plan later.
The `docs.test.ts` case is left in place; the table adds the sentence and the set
association it cannot see.

## 2. The fix

Teach `figures.ts` the ring measurement, then add one table entry per quoted
sentence. No token, colour, pair, floor, metric or shipped theme moves.

### 2.1 `packages/tokens/src/figures.ts`

1. Extend `FigureKind` with:

   ```ts
   /**
    * A two-tone content ring's worst case over an arbitrary content colour:
    * the geometric mean of the tone pair's contrast,
    * `sqrt(contrast(outer, inner))`.
    */
   | "ring"
   ```

2. Add the case to `measure` (the switch is exhaustive, so this is required):

   ```ts
   case "ring":
     return Math.sqrt(contrastRatio(colors[foreground], colors[background]));
   ```

3. Extend `FigureDocument` with `"packages/tokens/src/ring.ts"` so the source
   JSDoc is read like a document.

4. Add a helper beside `identityTheme`/`platformTheme`:

   ```ts
   const ringFigure = (
     document: FigureDocument,
     name: string,
     provenance: ShippedThemeProvenance,
     claim: FigureClaim,
     sentence: string,
   ): DocumentedFigure => ({
     document,
     name,
     pairs: [["foreground", "background", "mark"]],
     kind: "ring",
     claim,
     provenance,
     decimals: 2,
     sentence,
   });
   ```

5. Add a `ringFigures` array and spread it into `documentedFigures`. The exact
   sentences (whitespace-collapsed substrings of the documents) are:

   `docs/tokens.md`
   - `"The identity light pair guarantees **{figure}:1**"` — ring, identity
     light, `value`.
   - `"the AAA pairs **{figure}:1**"` — ring, identity light high, `value`.
   - ``"the tightest shipped set (`Dark · Linux`) guarantees **{figure}:1**"`` —
     ring, Linux dark, `tightest`.

   `docs/design-system.md`
   - `"{figure}:1 at the tightest shipped set, above the mark floor"` — ring,
     Linux dark, `tightest`.

   `packages/tokens/README.md`
   - `"({figure}:1 at the tightest shipped set, above the mark floor)"` — ring,
     Linux dark, `tightest`.

   `COMPONENTS.md`
   - ``"{figure}:1 at the tightest shipped set, `Dark · Linux`"`` — ring, Linux
     dark, `tightest`.
   - `"{figure}:1 at AAA"` — ring, identity light high, `value`.

   `packages/tokens/src/ring.ts`
   - `"identity light pair ({figure}:1) guarantees"` — plain, identity light,
     `value`, 2 decimals.
   - `"guarantees **{figure}:1**, the AAA pairs"` — ring, identity light,
     `value`.
   - `"the AAA pairs ({figure}:1)"` — plain, identity light high, `value`,
     **0 decimals** (the pair is exactly 21).
   - `"**{figure}:1**, and the tightest shipped set"` — ring, identity light
     high, `value`.
   - ``"the tightest shipped set (`Dark · Linux`) **{figure}:1**"`` — ring, Linux
     dark, `tightest`.

   Provenances use the existing `identityTheme(mode, contrast)` and
   `platformTheme("linux", "dark", "default")` helpers. A `"tightest"` entry is
   held to `tightestProvenance`, so naming a set that does not produce the
   minimum fails even when the number is right.

### 2.2 `packages/tokens/src/figures.test.ts`

Add the source file to the typed `documents` record:

```ts
"packages/tokens/src/ring.ts": readFileSync(
  new URL("./ring.ts", import.meta.url),
  "utf8",
),
```

The existing loop runs every new entry; no other test change is needed there.

### 2.3 `docs/tokens.md`

In the Verification section, the figure-table sentence currently says
**sixteen** entries. The table now holds 28 (`documentedFigures` 21 +
`documentedTierFigures` 7), and the source JSDoc is a new surface. Change it to:

```
`packages/tokens/src/figures.ts` holds the ratios the current-figure sentences
state — `documentedFigures` and `documentedTierFigures`, **28** entries across
this page, the design system, the README, the ledger and the ring's JSDoc — and
```

The docs count guard derives the number (`countWord(28)` is `"28"`), so the new
count and the guard agree. No other prose changes; every quoted figure is
already correct (see §3).

### 2.4 Index and ledger

- Add this plan to `.agents/slop/plans/README.md` (row after 611).
- Add a ticked `TODO.md` row under the tokens workstream describing the drift
  surface and its guard; correct the audit row's "every documented figure" claim
  to point at this plan.

## 3. Expected results

- Derived values today: identity light pair 15.859… → `15.86`, ring 3.982… →
  `3.98`; AAA pair 21 → `21` (0 decimals), ring 4.582… → `4.58`; tightest
  `Dark · Linux` 3.701… → `3.70`. Every document already quotes those, so the
  suite goes green without moving a value.
- `themeRingFailures` and `contrastRing` are unchanged.

## 4. Commands

```sh
cd packages/tokens && nub exec vitest run src/figures.test.ts src/docs.test.ts src/ring.test.ts
nub run check-types
cd ../.. && nub run check
nub run test
```

Expected: the focused files pass; type-check passes; the full gates pass
(160 files / 6,028 tests before the change; the figure loop adds twelve cases
inside `figures.test.ts`, so 6,040).

## 5. Test plan — both directions

The new entries are the tests; each must be able to fail.

1. **A stale figure.** Edit `docs/tokens.md` `3.98:1` → `3.97:1` and run
   `nub exec vitest run src/figures.test.ts`: the identity-light ring case must
   fail on `quotesFigure`. Restore → green.
2. **A wrong set.** Change the `docs/tokens.md` tightest entry's provenance from
   `linuxDark` to `identityLight` and run the same file: the
   `tightestProvenance` assertion must fail. Restore → green.
3. **A moved palette.** Temporarily set `lightColors.background` to
   `palette.neutral[25]` and run `src/figures.test.ts`: the identity-light ring
   entry must fail because the derived figure is now 4.05 and the source-JSDoc
   pair entry must fail at 16.44. Restore → green. (The catalogue's `docs.test.ts`
   content-ring case also fails in this state; the two guards overlap on the
   value, and the table adds the sentence/set association it cannot see.)
4. **The count.** Change `**28**` to `**27**` in the Verification sentence and
   run `nub exec vitest run src/docs.test.ts`: the table-size case must fail.
   Restore → green.

## 6. STOP conditions

- Stop and report if a derived figure differs from the quoted one (the plan is a
  guard, not a palette change; a mismatch means a document is already stale).
- Stop if `toFixed` of the AAA pair is not `"21"` at 0 decimals, or any ring
  value is not `3.98` / `4.58` / `3.70` at 2 decimals today.
- Do not change a palette value, a pair, a floor or a metric to make a sentence
  fit.

## 7. Acceptance

- `figures.ts` measures `"ring"` and holds twelve entries across the five
  surfaces.
- `figures.test.ts` reads `ring.ts` and every entry derives the quoted figure
  and the named set.
- `docs/tokens.md` states the derived table size.
- `nub run check`, `nub run lint`, `nub run test` are green.
- The both-directions steps in §5 are observed and reported.
