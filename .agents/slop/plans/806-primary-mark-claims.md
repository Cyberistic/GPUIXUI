# 806 — `primary` is measured as a fill, and as nine marks

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `082`, `332`,
`341`, `347`, `516`, `557`, `563`, `698`, `749`.

## 1. The defect

Plan `332` split a solid role's two jobs: a fill behind a label, and a **mark**
— a glyph, a bar or a dot that carries information. `markPairs` and
`trackMarkPairs` have held `primary`, `success` and `destructive` to the 3:1
mark floor (4.5:1 at AAA) ever since, and plans `341`, `347`, `516`, `557` and
`698` added the compositions a mark actually paints: a selected option's check,
the value groove, the slider's track ring, the native caret, the chosen and
pressed option fills.

`primary` therefore has **four** measurement classes, derived from
`contrastPairs` on the committed tree:

```
primary -> secondary:1 mark:9 surface:5 step:1
```

- `surface`: five fill-on-panel pairs — `background`, `card`, `popover`,
  `muted`, `input`;
- `secondary`: `primaryForeground` on `primary`;
- `step`: `primaryHover` → `primary`;
- `mark`: **nine** — `primary` on `background`, `card`, `popover`, `muted`,
  `input`, `hover`, `selected`, `selectedActive` and `track`.

Two present-tense passages still say the opposite, and both are read as
instructions by someone copying a theme:

1. `docs/tokens.md`, *The same fill-versus-text split applies to the brand
   action*: "`primary` is a surface: it carries `primaryForeground`, and it is
   **measured only as a fill**."
2. `packages/tokens/README.md`, *Usage*: "`primary` is a fill: it carries
   `primaryForeground`, and it is **only measured as a fill**."

Neither is guarded. `docs.test.ts` reads the `primaryText` half of both
paragraphs (`describe("docs primaryText surfaces")`) and the macOS accent
figures below it; no case reads the `primary` half. The phrase survives because
nothing greps for it: `grep -rn "only as a fill\|only measured"` over the two
pages, the README and the package's non-test modules returns exactly those two
sentences (the third hit is plan `341`'s history in `contrast.ts`).

Why it matters rather than being pedantic:

- A reader who believes the role is "only a fill" has no reason to check the
  mark floor before painting `primary` as a progress segment, a slider fill or
  thumb ring, a rating star, a combobox check or a timeline dot — the five
  shipped compositions plan `332` added. On a copied palette those are the
  pixels that vanish first: the tightest shipped primary mark is **3.149:1**
  (macOS light, `primary` on `track`), which clears the 3:1 default floor by a
  hair, and an edit that pulls `primary` toward `track` is caught by the
  contract but not by the sentence.
- The same paragraph exists to explain the fill-versus-text split, and "fill" is
  one of **three** jobs the role does. A role description that undercounts its
  obligations is the class of defect plans `747`, `749`, `750`, `757` and `781`
  fixed for the disabled fill, the placeholder, the tint and three platform
  headers.

The role table's `primary` row ("primary action") repeats the omission in a
scannable place; the `ThemeColors.primary` JSDoc says only "Primary action
background."

## 2. What the contract measures today

Derived on this tree with `contrastPairs`/`markPairs`/`trackMarkPairs`
(`nub exec vitest run` probe, deleted again):

```
primary classes, in contrastPairClasses order
  secondary  1   primaryForeground/primary
  mark       9   primary/{track,background,card,popover,muted,input,
                 hover,selected,selectedActive}
  surface    5   primary/{background,card,popover,muted,input}
  step       1   primaryHover/primary

primary mark surfaces, derived from the two published lists
  [background, card, popover, muted, input, hover, selected, selectedActive,
   track]                                                             = 9

floors (contrastFloors)
  default.mark = 3      high.mark = 4.5

tightest shipped primary mark
  Light · macOS, primary on track                            3.1488 → 3.149
```

No colour, pair, floor, metric, role or shipped theme moves. The plan owns
prose and one guard.

## 3. Decision

1. Correct the two sentences so they state the four classes and name the mark
   lists, without quoting a ratio (the prose stays free of figures a test would
   have to own; `docs.test.ts` already derives the figures the same paragraph
   quotes for macOS).
2. Extend the catalogue's `primary` table row and the `ThemeColors.primary`
   JSDoc the same way, so the three surfaces a reader meets — the paragraph, the
   table, the type — agree.
3. Add `packages/tokens/src/primary-mark-claims.test.ts`: a guard that derives
   `primary`'s classes and mark surfaces from the contract and holds all three
   sources to them, and that rejects the pre-806 phrasing (with a case proving
   the predicate can fail).

The design system needs no edit: §3 says "`primary` is a surface with
`primaryForeground` on it" without limiting it to a fill, and its §9 graphic-mark
row already names the mark compositions and is derived by `docs.test.ts`
(plan `351`). `COMPONENTS.md`'s `Design tokens` and `Theme contrast check` rows
say "`primary` is a fill" as the rationale for `primaryText`, which stays true;
no row claims it is *only* a fill.

## 4. Files to change

1. `docs/tokens.md` — the brand-action paragraph, and the `primary` table row's
   Use cell.
2. `packages/tokens/README.md` — the `primary`/`primaryText` paragraph.
3. `packages/tokens/src/color.ts` — `ThemeColors.primary`'s JSDoc.
4. **create** `packages/tokens/src/primary-mark-claims.test.ts`.
5. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
6. `TODO.md` — a ticked row, and the section counter.

No other file changes; no token value moves.

## 5. Step 1 — `docs/tokens.md`

Replace the first three sentences of the brand-action paragraph (currently
lines 207–208, wrapping is free because the guard reads collapsed prose):

```
The same fill-versus-text split applies to the brand action. `primary` is a
surface: it carries `primaryForeground`, and it is measured as one — a fill on
`background`, `card`, `popover`, `muted` and the field's `input` fill, the
`primaryForeground` label on it, and the `primaryHover` → `primary` step. It is
also a **mark**: a progress segment, a slider fill or thumb ring, a rating star,
a combobox check and a timeline dot paint it, so the same role is held at the
mark floor — 3:1, 4.5:1 at AAA — on `background`, `card`, `popover`, `muted`,
the field's `input` fill, the `track` groove and the
`hover`/`selected`/`selectedActive` fills a chosen option marks (`markPairs`,
`trackMarkPairs`). It is not text.
Brand-toned text — a link, a label, an icon — reads `primaryText`, held to
4.5:1 on `background`, `card`, `popover` and `muted`, on the `hover` and
`active` washes the Link variant paints behind its own label, on the
`accent`/`selected` fills a selectable row paints under it and the pressed
`selectedActive` it keeps, and on the four soft status fills a link in a status
panel sits on. The split is not
cosmetic: … (unchanged to the end of the paragraph)
```

Only the opening three sentences and the connector "Brand-toned text" →
"It is not text." change. The macOS accent figure sentence and the
`src/primary-text.example.ts` link stay byte-for-byte, because
`docs.test.ts` derives both. The sentence must keep the capital
`Brand-toned text — a link` the existing `docs.test.ts` case anchors on (plan
672); the guard below reads the same words.

The mark clause names all nine surfaces — including the four plain panels the
fill clause also names — because the guard slices the clause rather than the
paragraph: a surface dropped from the mark list fails even while the fill list
still carries it.

The `primary` table row's Use cell:

```
| `primary` | `#5F4BDB` | `#A7A9FF` | primary action fill; also the mark a progress segment, slider fill or thumb ring, rating star, combobox check and timeline dot paint, at the mark floor |
```

The `light`/`dark` cells stay derived values; `documentedRows` parses only those
three columns, so the Use cell is free prose.

## 6. Step 2 — `packages/tokens/README.md`

Replace the paragraph's opening (lines 73–80) up to "reads `primaryText`":

```
`primary` is a fill: it carries `primaryForeground`, and it is measured on the
five panels it fills — `background`, `card`, `popover`, `muted` and the field's
`input` fill — and as the label on it. It is also a mark: a progress segment, a
slider fill or thumb ring, a rating star, a combobox check and a timeline dot
paint it, so the same role is held at the 3:1 mark floor (4.5:1 at AAA) on
`background`, `card`, `popover`, `muted`, the field's `input` fill, `track` and
the `hover`/`selected`/`selectedActive` fills a chosen option marks (`markPairs`,
`trackMarkPairs`). Brand-toned text — a link, a label, an icon — reads
`primaryText`, which is held to the text floor on the plain surfaces, the
`hover`/`active` washes a link paints, the `accent`/`selected`/`selectedActive`
fills a link sits on inside a row (plan 314) and the four soft status fills a
link in a status panel sits on (plan 346), and through the text-selection wash
on all thirteen of those surfaces (plan 528). A brand that changes `primary`
should set `primaryText` beside it.
```

The rest of the paragraph is unchanged; `readme.test.ts` holds its counts and
`docs.test.ts` its figures.

## 7. Step 3 — `ThemeColors.primary`'s JSDoc

```ts
  /**
   * Primary action background. Also the fill a progress segment, a slider fill
   * or thumb ring, a rating star, a combobox check and a timeline dot paint, so
   * the role is measured as a mark as well as a fill (`markPairs`,
   * `trackMarkPairs`).
   */
  readonly primary: string;
```

`docs.test.ts`'s type index prints the JSDoc? It does not, so this is a source
document only. `snippets.test.ts` does not read JSDoc prose for roles.

## 8. Step 4 — `primary-mark-claims.test.ts`

Header states the bug: two present-tense sentences called the role "measured
only as a fill" after plan 332 gave it nine mark pairs; the catalogue's
`primaryText` half was guarded and the `primary` half was not.

```ts
/**
 * Guards the three places that describe what `primary` is measured as.
 *
 * Plan 332 split a solid role into a fill and a mark, so `primary` carries nine
 * `mark` pairs beside its five `surface` pairs, its on-colour pair and its
 * step. `docs/tokens.md` and the package README still said the role was
 * "measured only as a fill", and neither sentence was read by a suite: the same
 * paragraph's `primaryText` half is held by `docs.test.ts` and its `primary`
 * half was not, while the mark compositions — a progress segment, a slider
 * fill or thumb ring, a rating star, a combobox check, a timeline dot — are
 * exactly the pixels a copied palette erases first (the tightest shipped
 * primary mark is 3.149:1).
 *
 * The classes and surfaces below are derived from `contrastPairs`,
 * `markPairs`, `trackMarkPairs` and `contrastFloors`, so a contract change and
 * a document edit cannot land apart, in either direction.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFloors, contrastPairClasses, contrastPairs, markPairs, trackMarkPairs } from "./contrast.js";

/** A document read as one line, so a wrapped claim is not a substring. */
const prose = (url: URL): string =>
  readFileSync(url, "utf8").replaceAll(/\s+/g, " ");

const catalogue = prose(new URL("../../../docs/tokens.md", import.meta.url));
const readme = prose(new URL("../README.md", import.meta.url));
const source = prose(new URL("./color.ts", import.meta.url));

/** The slice of `text` between two markers a reader sees. */
const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  expect(from, start).toBeGreaterThanOrEqual(0);
  const to = text.indexOf(end, from + start.length);
  expect(to, `${start} … ${end}`).toBeGreaterThan(from);
  return text.slice(from, to);
};

/** The pair classes the contract measures for a role, in floor-class order. */
const classesOf = (role: string): ReadonlyArray<string> =>
  contrastPairClasses.filter((pairClass) =>
    contrastPairs.some(
      ([foreground, background, measured]) =>
        measured === pairClass &&
        (foreground === role || background === role),
    ),
  );

/** The surfaces a role marks, from the two published mark lists. */
const markSurfacesOf = (role: string): ReadonlyArray<string> => [
  ...new Set([
    ...markPairs
      .filter(
        ([foreground, , pairClass]) =>
          foreground === role && pairClass === "mark",
      )
      .map(([, background]) => background),
    ...trackMarkPairs
      .filter(([foreground]) => foreground === role)
      .map(([, background]) => background),
  ]),
];

/** The claim the two documents made before plan 806. */
const claimsOnlyFill = (text: string): boolean =>
  /measured only as a fill|only (?:measured )?as a fill/.test(text);

const primaryMarks = markSurfacesOf("primary");
const markFloor = `${contrastFloors.default.mark}:1`;
const highMarkFloor = `${contrastFloors.high.mark}:1`;
```

Cases:

1. **`primary` is four classes, not one** — `primaryClasses` equals
   `["secondary", "mark", "surface", "step"]` (in `contrastPairClasses` order),
   and `primaryMarks` equals
   `["background", "card", "popover", "muted", "input", "hover", "selected",
   "selectedActive", "track"]`. The expectation is written as the domain claim,
   the value is derived, so a lost mark pair fails here before it can be
   documented.
2. **the catalogue's mark clause names every mark surface** — slice the
   brand-action paragraph
   (`"The same fill-versus-text split applies to the brand action."` →
   `"A runnable example lives in"`), then slice its mark clause
   (`"It is also a **mark**"` → `"a chosen option marks"`) and assert each of
   the nine derived surfaces appears there backticked, both derived floors
   appear, and the five compositions are named. The clause, not the paragraph,
   is the unit, so dropping a surface from the mark list fails even while the
   fill list still names it.
3. **the README's mark clause does the same** — the same two slices over the
   README paragraph (`` "`primary` is a fill:" `` → `"A runnable example lives
   in"`, then `"It is also a mark"` → `"a chosen option marks"`); the paragraph
   also names both lists.
4. **the type and the table agree** — the `color.ts` slice from
   `"Primary action background."` to `"Primary action background while
   hovered."` contains `markPairs` and `trackMarkPairs`; the catalogue's raw
   `primary` row contains `mark` and `rating star`.
5. **the pre-806 claim is gone, and the predicate can fail** — both documents
   reject `claimsOnlyFill`, and the helper returns `true` for the two removed
   sentences, so a future edit that reinstates either fails.
6. **the guard's scope is the mark rule's own list** — `markRoles` is
   `["primary", "success", "destructive"]`, each role's derived classes include
   `"mark"`, and both documents name `markPairs`; a fourth mark role cannot
   ship without the sentence covering it.

No case imports `shippedThemes`: the tightest shipped figure is quoted in the
header as history, not asserted as a present-tense document claim, and
`mark-contrast.test.ts` already holds every shipped set to the floor.

## 9. Test plan

From `packages/tokens`:

```sh
nub exec vitest run src/primary-mark-claims.test.ts src/docs.test.ts src/readme.test.ts
```

Expected: the new suite green; both documentation suites still green (the
`primaryText` surface cases, the macOS accent figures and the role tables read
the same paragraphs).

**Prove every case can fail** (revert each mutation, one at a time):

1. `docs/tokens.md`: put `measured only as a fill` back → case 5 fails.
2. `packages/tokens/README.md`: put `only measured as a fill` back → case 5
   fails.
3. `docs/tokens.md`: delete `trackMarkPairs` from the sentence → case 3 fails.
4. `packages/tokens/README.md`: delete `selectedActive` from its surface list →
   case 2 fails.
5. `docs/tokens.md`: change `4.5:1 at AAA` to `7:1 at AAA` → case 3 fails
   (`contrastFloors.high.mark` is 4.5).
6. `docs/tokens.md`: delete `rating star` → case 3 fails.
7. `color.ts`: revert the `primary` JSDoc to `Primary action background.` →
   case 4 fails.
8. `docs/tokens.md`: revert the `primary` table row's Use cell to
   `primary action` → case 4 fails.
9. `contrast.ts`: comment out the `["primary", "track", "mark"]` entry of
   `trackMarkPairs` → case 1 fails (eight marks), and case 2's catalogue slice
   then names `track`, which fails the same case from the other direction.

Then the workstream gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: **215** files and **7101** tests green (214/7095 before; six cases
added); `check` and `lint` clean.

## 10. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. This
  plan states what the contract already measures.
- Stop if a case needs a cast, `any`, a hand-typed ratio or a name-based set
  lookup where a derived set exists: every surface, class and floor comes from
  `contrastPairs`, `markPairs`, `trackMarkPairs` and `contrastFloors`.
- Do not change the `primaryText` half of either paragraph, the macOS accent
  figure sentence, the `primary-text.example.ts` links, or
  `docs/design-system.md` §3/§9 (both are accurate and already guarded).
- Do not add a `DocumentedFigure`: this plan quotes no ratio in the documents.
- If `docs.test.ts` or `readme.test.ts` fails on a sentence this plan rewrote,
  stop and record the case — do not tune prose to a test that was asserting the
  old claim.

## 11. Acceptance

- Both documents state the four classes and all nine mark surfaces, name
  `markPairs`/`trackMarkPairs`, the five mark compositions and both mark
  floors; the `primary` JSDoc and table row agree.
- The six cases fail under their §9 mutation and pass when reverted; every
  surface, class and floor is derived.
- `nub run --filter @gpuixui/tokens test` is green (215 files, 7101 tests),
  `nub run check-types` clean.
- `TODO.md` ticks the row and the plan index lists `806`.
