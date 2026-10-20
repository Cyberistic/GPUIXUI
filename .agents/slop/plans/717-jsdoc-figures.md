# 717 — The figures the package's own JSDoc and five page sentences state, and the one hard set count

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth / the figure-drift series).
**Depends on:** 536, 544 (the `documentedFigures` table and its extent), 613
(the ring figures), 637 (the panel action's figures), 705/706/714/716 (the last
four figure-drift plans).

## 1. The defect

Five current ratios in this package are quoted in **six** places and no test
reads any of them. Measured on 2026-10-20 over `shippedThemes` with the
checker's own measurement, all five are **correct today**; the defect is that
nothing holds them, so the next palette or platform-ink move leaves the
package's own rationale describing a value it no longer ships — the failure
plans 705, 706, 714 and 716 each found one instance of.

| Claim | Quoted | Where | Derived today? |
| ----- | ------ | ----- | -------------- |
| `primaryText` on the nine surfaces a field sits on, tightest | 5.587:1 | `contrast.ts` (`caretPairs` JSDoc), `styles.ts` (`nativeFieldTheme` JSDoc), `docs/tokens.md` (caret section), `docs/design-system.md` (caret paragraph) | **no** |
| the native gutter number, `textFaint` at 80% on Aero light's quiet panel | 3.595:1 | `native-text-check.ts` (`nativeTextFades` JSDoc), `docs/tokens.md` (native-text fades) | **no** |
| the native unchanged marker, `textFaint` at 50% | 2.082:1 | the same two places | **no** |
| `destructiveText` on its own 28% word-level diff wash, `Dark · Linux` | 4.389:1 | `native-text-check.ts` (`nativeTextOverFades` JSDoc), `docs/tokens.md` (deliberate omission) | **no** |
| `track` on the Toast's `popover` card, tightest | 1.069:1 | `toast-countdown.example.ts` | **no** (the page's copy of the same figure **is** derived by `docs.test.ts`; the example's is not) |

**Evidence that nothing reads them.** All five were falsified in place —
`5.587 → 5.586`, `3.595 → 3.594`, `2.082 → 2.081`, `4.389 → 4.388` across
`docs/tokens.md`, `docs/design-system.md`, `contrast.ts`, `styles.ts` and
`native-text-check.ts` — and the whole package suite stayed green:

```
Test Files  195 passed (195)
     Tests  6835 passed (6835)
```

That is the plan-350 failure mode (a documented claim with no test behind it),
five claims wide.

**The table cannot express the two compositions.** `figures.ts` can measure a
`plain` pair, a `selection` wash, an `overlay` scrim, a `dim` group and a
`ring`, but not the two paints the runtime fades produce: a role at a fraction
on a tone (the gutter fades) and a role on a wash of a role (the word-level
diff). That is *why* these figures stayed outside the table while every plain
ratio beside them joined it. Adding those two kinds is the structural half of
this plan; the six claims are the data half.

**The table's extent has no owner.** `docs/tokens.md` says the table holds
"**33** entries across this page, the design system, the README, the ledger and
the ring's JSDoc". The count is derived, the document list is not: a seventh
document can join `documentedFigures` while the page keeps naming six, and four
of the six documents above prove it already has.

**One hard count in source prose.** `styles.ts` says `primaryText` clears the
nine surfaces "in all 24 shipped sets". `24` is `shippedThemes.length` and no
test reads it: a fifth platform or a third recipe falsifies the sentence while
every suite stays green. Plan 567 made document and test prose count-free for
exactly this reason; source JSDoc was never swept.

**Measured today** (`shippedThemes`, `toFixed(3)`, checker's measurement):

| Measurement | Figure | Set · where |
| ----------- | ------ | ----------- |
| `primaryText` over the nine field surfaces | 5.587 | `Dark · Windows` · `primaryText` on `active` |
| `textFaint` at 80% over the tone | 3.595 | `Light · Windows 7` (recipe `aero`, light) · on `muted` |
| `textFaint` at 50% over the tone | 2.082 | the same set · on `muted` |
| `destructiveText` on its own 28% wash over `card` | 4.389 | `Dark` · identity dark |
| `track` on `popover` | 1.069 | `Dark · Windows` |

## 2. Exact changes

### 2.1 `packages/tokens/src/figures.ts` — two kinds and one provenance helper

`FigureKind` (line ~35) gains two members and their documentation:

```ts
  /**
   * A role painted at a fraction on the tone, the way the native runtime fades
   * a document's text: the painted result is held to the tone it sits on.
   */
  | "fade"
  /**
   * A role painted whole on a wash of a role, the way a changed diff token sits
   * on the add/delete tint: the text is held to the washed tone, not the plain
   * one.
   */
  | "over-wash";
```

`DocumentedFigure` gains one field, beside `panel`:

```ts
  /**
   * The paints a `fade` or `over-wash` entry composes: the fraction the
   * foreground role is painted at, and — for `over-wash` — the role painted
   * behind it and its own fraction. Every other kind leaves it undefined, and
   * the suite fails an entry that needs it and omits it.
   */
  readonly composition?: {
    readonly opacity: number;
    readonly wash?: {
      readonly role: keyof ThemeColors;
      readonly opacity: number;
    };
  };
```

`FigureDocument` (line ~62) gains four members:

```ts
  | "packages/tokens/src/contrast.ts"
  | "packages/tokens/src/native-text-check.ts"
  | "packages/tokens/src/styles.ts"
  | "packages/tokens/src/toast-countdown.example.ts";
```

`measure` (line ~160) takes the entry instead of its fields, so a kind can read
the paints it composes:

```ts
const measure = (
  entry: DocumentedFigure,
  [foreground, background]: ContrastPair,
  colors: ThemeColors,
): number => {
  const composition = entry.composition;
  switch (entry.kind) {
    case "plain":
      return contrastRatio(colors[foreground], colors[background]);
    case "selection":
      return contrastRatio(
        colors[foreground],
        compositeOver(colors.selection, colors[background]),
      );
    case "overlay": {
      const painted = compositeOver(colors[foreground], colors[background]);
      return contrastRatio(painted, colors[background]);
    }
    case "dim": {
      if (entry.panel === undefined) {
        return Number.NaN;
      }
      const fill = compositeOver(
        alpha(colors[background], disabledDimOpacity),
        colors[entry.panel],
      );
      const label = compositeOver(
        alpha(colors[foreground], disabledDimOpacity),
        fill,
      );
      return contrastRatio(label, fill);
    }
    case "ring":
      return Math.sqrt(contrastRatio(colors[foreground], colors[background]));
    case "fade": {
      if (composition === undefined) {
        return Number.NaN;
      }
      const tone = colors[background];
      const painted = compositeOver(
        alpha(colors[foreground], composition.opacity),
        tone,
      );
      return contrastRatio(painted, tone);
    }
    case "over-wash": {
      const wash = composition?.wash;
      if (composition === undefined || wash === undefined) {
        return Number.NaN;
      }
      const washed = compositeOver(
        alpha(colors[wash.role], wash.opacity),
        colors[background],
      );
      const painted = compositeOver(
        alpha(colors[foreground], composition.opacity),
        washed,
      );
      return contrastRatio(painted, washed);
    }
  }
};
```

`within` changes one call (`measure(entry, pair, colors)`; it already takes the
entry).

A recipe provenance helper joins `platformTheme` and `identityTheme` (line ~384):

```ts
/** The provenance of a recipe in a given mode and contrast. */
const recipeTheme = (
  recipe: PlatformRecipeName,
  mode: ThemeMode,
  contrast: ThemeContrast,
): ShippedThemeProvenance => ({ source: "recipe", recipe, mode, contrast });
```

### 2.2 `packages/tokens/src/figures.ts` — eleven entries

Add, before `documentedFigures` and after the ring group, one group with a
header comment:

```ts
/**
 * The field's caret and the native document's fades — the compositions the
 * table could not express until it learned `fade` and `over-wash`. Quoted in
 * the two modules that own the contract and in the two pages that teach it;
 * none was held, so a falsified figure in any of the six places left the whole
 * suite green (plan 717).
 */
```

The nine field surfaces, derived rather than retyped:

```ts
/**
 * The nine surfaces a native field's caret sits on: its own `input` fill, where
 * the caret pair is a `mark`, and the eight text surfaces `primaryTextPairs`
 * holds — the four plain tones and the four washes a row or an in-place editor
 * paints. Derived from `contrastPairs` over {@link selectionSurfaces} so a new
 * persistent surface joins the entry with the contract.
 */
const caretInkPairs: ReadonlyArray<ContrastPair> = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "primaryText" &&
    selectionSurfaces.some((surface) => surface === background),
);
```

(`selectionSurfaces` is imported from `./contrast.js`.) This yields **9** pairs:
`background, card, popover, muted, hover, active, accent, selected, input`.

The entries (each `sentence` is an exact, single-line fragment of the document;
a TypeScript JSDoc keeps its ` * ` line breaks, so a sentence may not span two
source lines — `quotesFigure` collapses whitespace, not comment markers):

```ts
const caretFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "packages/tokens/src/contrast.ts",
    name: "the caret's nine surfaces, in caretPairs' JSDoc",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "({figure}:1 at the tightest, Windows dark on",
  },
  {
    document: "packages/tokens/src/styles.ts",
    name: "the caret's nine surfaces, in nativeFieldTheme's JSDoc",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "every shipped set (**{figure}:1** at the tightest)",
  },
  {
    document: "docs/tokens.md",
    name: "the caret's nine surfaces, in the catalogue",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "(**{figure}:1** at the tightest, Windows dark on `active`)",
  },
  {
    document: "docs/design-system.md",
    name: "the caret's nine surfaces, in the design system",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "surface with margin (**{figure}:1** at the tightest)",
  },
];

/** The gutter number: `textFaint` at the runtime's 80% on the quiet panel. */
const gutterNumberFigure = (document: FigureDocument, sentence: string) =>
  ({
    document,
    name: "the native gutter number",
    pairs: [["placeholder", "muted", "surface"]],
    kind: "fade",
    claim: "value",
    provenance: recipeTheme("aero", "light", "default"),
    composition: { opacity: 0.8 },
    decimals: 3,
    sentence,
  }) satisfies DocumentedFigure;

/** The unchanged marker: `textFaint` at the runtime's 50% on the quiet panel. */
const unchangedMarkerFigure = (document: FigureDocument, sentence: string) =>
  ({
    document,
    name: "the native unchanged marker",
    pairs: [["placeholder", "muted", "surface"]],
    kind: "fade",
    claim: "value",
    provenance: recipeTheme("aero", "light", "default"),
    composition: { opacity: 0.5 },
    decimals: 3,
    sentence,
  }) satisfies DocumentedFigure;

/** The 28% word-level diff wash: the token's own ink on a wash of itself. */
const wordLevelWashFigure = (document: FigureDocument, sentence: string) =>
  ({
    document,
    name: "the word-level diff wash",
    pairs: [["destructiveText", "card", "body"]],
    kind: "over-wash",
    claim: "value",
    provenance: identityTheme("dark", "default"),
    composition: {
      opacity: 1,
      wash: { role: "destructiveText", opacity: 0.28 },
    },
    decimals: 3,
    sentence,
  }) satisfies DocumentedFigure;

/** The Toast's designed groove on its floating card, tightest shipped set. */
const countdownGrooveFigure: DocumentedFigure = {
  document: "packages/tokens/src/toast-countdown.example.ts",
  name: "the Toast countdown's groove",
  pairs: [["track", "popover", "surface"]],
  kind: "plain",
  claim: "tightest",
  provenance: platformTheme("win32", "dark", "default"),
  decimals: 3,
  sentence: "it clears the floor on the toast card at **{figure}:1**",
};
```

and the group:

```ts
const nativePaintFigures: ReadonlyArray<DocumentedFigure> = [
  ...caretFigures,
  gutterNumberFigure(
    "packages/tokens/src/native-text-check.ts",
    "the line number measures **{figure}:1** at 80% on Aero light's",
  ),
  unchangedMarkerFigure(
    "packages/tokens/src/native-text-check.ts",
    "and the unchanged marker **{figure}:1** at 50%",
  ),
  gutterNumberFigure(
    "docs/tokens.md",
    "they measure {figure}:1 at 80%",
  ),
  unchangedMarkerFigure(
    "docs/tokens.md",
    "and {figure}:1 at 50% on Aero light's quiet panel",
  ),
  wordLevelWashFigure(
    "packages/tokens/src/native-text-check.ts",
    "28% wash measures **{figure}:1** in `Dark · Linux`",
  ),
  wordLevelWashFigure("docs/tokens.md", "on its own 28% wash measures **{figure}:1** (`Dark · Linux`)"),
  countdownGrooveFigure,
];
```

Then add `...nativePaintFigures` to `documentedFigures` (after the ring group).

**Note on the `plain` pair class field.** `ContrastPair` is
`readonly [role, role, ContrastPairClass]`; the third member is documentation
for the pair, and the table does not read it. Use `"surface"` for the gutter
fades and the groove, `"body"` for the word-level wash, `"secondary"` for the
caret pairs — matching the class the contract would give the composition.

### 2.3 `packages/tokens/src/native-text-check.ts` — make each figure its own clause

In the `nativeTextFades` JSDoc, replace:

```
 * The gutter fades sit below the secondary floor in shipped sets — 3.595:1 at
 * 80% and 2.082:1 at 50% on Aero light's quiet panel — because the runtime dims
 * chrome, so they are held to the perceivability floor rather than to a text
 * one.
```

with:

```
 * The gutter fades sit below the secondary floor in shipped sets, because the
 * runtime dims chrome, so they are held to the perceivability floor rather than
 * to a text one: the line number measures **3.595:1** at 80% on Aero light's
 * quiet panel, and the unchanged marker **2.082:1** at 50%.
```

In the `nativeTextOverFades` JSDoc, replace:

```
 * cannot be inspected, so both the painted run colour and the container
 * fallback are held over the 5% accent wash at the body floor. The runtime's 28%
 * word-level diff wash is deliberately absent: it paints a changed token's own
 * syntax colour over a wash of the add/delete family, which measures
 * **4.389:1** for `destructiveText` on its own wash in `Dark · Linux` and
 * cannot clear a text floor while staying visible; `docs/tokens.md` states the
 * omission.
```

with:

```
 * cannot be inspected, so both the painted run colour and the container
 * fallback are held over the 5% accent wash at the body floor. The runtime's 28%
 * word-level diff wash is deliberately absent: it paints a changed token's own
 * syntax colour over a wash of the add/delete family. `destructiveText` on its
 * own 28% wash measures **4.389:1** in `Dark · Linux` and cannot clear a text
 * floor while staying visible; `docs/tokens.md` states the omission.
```

No value changes.

### 2.4 `packages/tokens/src/styles.ts` — the count-free sentence

Replace:

```
 * the ink because `primaryText` clears all nine surfaces a field sits on in all
 * 24 shipped sets (5.587:1 at the tightest) — `primaryTextPairs` holds the
 * eight and {@link caretPairs} adds the field's own `input` fill as a mark.
```

with:

```
 * the ink because `primaryText` clears all nine surfaces a field sits on in
 * every shipped set (**5.587:1** at the tightest) — `primaryTextPairs` holds the
 * eight and {@link caretPairs} adds the field's own `input` fill as a mark.
```

### 2.5 `packages/tokens/src/contrast.ts` — no value change

Keep `caretPairs`' JSDoc sentence; it already reads
"(5.587:1 at the tightest, Windows dark on\n * `active`)". Only the figure
becomes held. (If the wrap moves during the edit, keep the fragment
`({figure}:1 at the tightest, Windows dark on` on one line.)

### 2.6 `packages/tokens/src/toast-countdown.example.ts` — no value change

Keep "at **1.069:1** in the tightest\n * shipped set"; the fragment
`it clears the floor on the toast card at **{figure}:1**` must stay on one line.

### 2.7 `docs/tokens.md` — the table's extent and its count

The four page sentences are already the ones the entries quote; **do not edit
their numbers**. Change only the verification paragraph (line ~4100):

```
`packages/tokens/src/figures.ts` holds the ratios the current-figure sentences
state — `documentedFigures` and `documentedTierFigures`, **44** entries across
this page, the design system, the README, the ledger and the package's own
JSDoc modules — and `packages/tokens/src/figures.test.ts` derives each one from
`shippedThemes` with the checker's own measurement and asserts both the figure
and the set (and surface) the sentence names.
```

`44` is `documentedFigures.length + documentedTierFigures.length` after this
plan (33 + 11); `docs.test.ts` derives it and will fail on any other number.

### 2.8 `packages/tokens/src/figures.test.ts` — read the new documents, hold the new rules

- Add the four new members to the `documents` record (the type makes this
  mandatory):
  `"packages/tokens/src/contrast.ts"`, `".../native-text-check.ts"`,
  `".../styles.ts"`, `".../toast-countdown.example.ts"`.
- New case **"composes the paints each kind needs"**: every entry whose kind is
  `fade` or `over-wash` has a `composition` with `opacity` in `0…1`, and an
  `over-wash` entry also has `composition.wash`; every other kind has none.
  *Catches* a new entry that would derive `NaN`.
- New case **"measures the caret on the nine surfaces a field sits on"**: the
  caret entries' pairs are 9, their backgrounds equal
  `["background", "card", "popover", "muted", "hover", "active", "accent",
  "selected", "input"]`, and the entry pair list equals the one derived from
  `contrastPairs` over `selectionSurfaces`. *Catches* a field surface added to
  the contract but not to the entry (the sentence says "nine").
- New case **"states the shipped-set count nowhere in its own prose"**: read
  every non-test module in `src/` (`readdirSync`), fail on
  `/\b\d+ (?:of the )?shipped sets\b/` with the message "the count is
  `shippedThemes.length`; say `every shipped set`". *This case fails today*
  (`styles.ts:473`) and passes after §2.4 — the both-directions proof.
- Extend the existing "derives …" loop automatically (it iterates
  `documentedFigures`), and add a **"rejects the pre-717 figures"** case: for
  each of the five measured values, build the fragment with the pre-fix number
  (`5.586`, `3.594`, `2.081`, `4.388`, and `1.069 → 1.068`) and assert
  `quotesFigure` is `false` for the entry that holds it. *Proves* the guard can
  fail rather than merely passing.

### 2.9 `packages/tokens/src/docs.test.ts` — the table's extent, in one place

In the case "names both suites that hold its figures, and the table's size",
after the count assertion, add a category check:

```ts
    // `documentedFigures` and `documentedTierFigures` may only read a document
    // the sentence names. The categories are the sentence's words; a new
    // document — a page, or a module's JSDoc — fails here until it is named.
    const categories: ReadonlyArray<
      readonly [string, (document: FigureDocument) => boolean]
    > = [
      ["this page", (document) => document === "docs/tokens.md"],
      ["the design system", (document) => document === "docs/design-system.md"],
      ["the README", (document) => document === "packages/tokens/README.md"],
      ["the ledger", (document) => document === "COMPONENTS.md"],
      [
        "the package's own",
        (document) => document.startsWith("packages/tokens/src/"),
      ],
    ];
    const figureDocuments = [
      ...documentedFigures,
      ...documentedTierFigures,
    ].map((entry) => entry.document);

    figureDocuments.forEach((document) => {
      expect(
        categories.some(([, includes]) => includes(document)),
        document,
      ).toBe(true);
    });
    categories.forEach(([label, includes]) => {
      expect(figureDocuments.some(includes), label).toBe(true);
      expect(paragraph).toContain(label);
    });
```

(`FigureDocument` is imported as a type; `documentedFigures` and
`documentedTierFigures` are already imported.)

## 3. Commands and expected results

Run from `packages/tokens` unless stated. Use `nub` — a bare `node`/`npx` on
this box is too old (`ERR_UNSUPPORTED_ESM_URL_SCHEME`).

1. `nub exec vitest run src/figures.test.ts`
   → before §2.8: the file fails to compile (`FigureDocument` has four members
   the `documents` record lacks, `composition` unknown) — that is the expected
   first result; after 2.1–2.8: all cases pass.
2. `nub exec vitest run src/docs.test.ts`
   → passes with **44** in the page; fails on any other number.
3. `nub run --filter @gpuixui/tokens check-types` (from the worktree root)
   → no output, exit 0.
4. `nub run --filter @gpuixui/tokens test`
   → `195` files pass with the new cases; total tests rise by the new cases.
5. `nub run check` and `nub run lint` (from the worktree root)
   → both green.
6. From the worktree root: `git diff --stat` shows `figures.ts`,
   `figures.test.ts`, `docs.test.ts`, `native-text-check.ts`, `styles.ts`,
   `docs/tokens.md`, the plan, `TODO.md`, the plan index. **No colour, pair,
   floor, metric or shipped theme may appear in the diff** (`git diff` must not
   contain `packages/tokens/src/color.ts`, `platform-styles/`, `contrast.ts`
   values, or a `#RRGGBB` literal).

**Spot-check the suite really reads the new figures.** After the suite is green,
change one digit in `contrast.ts` (`5.587` → `5.586`), run
`nub exec vitest run src/figures.test.ts`, and confirm it fails naming "the
caret's nine surfaces, in caretPairs' JSDoc"; then revert. Repeat once for
`docs/tokens.md`'s `3.595` and once for `toast-countdown.example.ts`'s `1.069`.

## 4. STOP conditions

Stop and report instead of improvising if any of these happen:

- A measured value differs from the table in §1 by more than `0.001` — the
  shipped palette moved after this plan was written; record the new value and
  do not silently change the page.
- `caretInkPairs` yields anything other than 9 pairs, or the nine are not
  `background, card, popover, muted, hover, active, accent, selected, input` —
  the caret contract changed; report.
- `FigureDocument` already has one of the four new members (another plan added
  it) — re-check the branch's `figures.ts` before editing.
- A quoted sentence cannot be made a single-line fragment without changing its
  meaning — report the sentence rather than splitting the claim.
- `nub run check`, `nub run lint` or `nub run test` fails for a reason outside
  this plan's files.
- Anything requires editing a path this workstream does not own
  (`packages/components`, `packages/primitives`, `apps/*`, `COMPONENTS.md`
  rows owned by another workstream). Record it as a `TODO.md` cross-team row.

## 5. Test plan

| Case | Catches | Fails without the fix? |
| ---- | ------- | ---------------------- |
| `figures.test.ts` "derives …" (existing loop, 11 new entries) | a figure that no longer matches `shippedThemes`, and a sentence that no longer quotes it | yes — this is the falsification probe in §1 |
| "composes the paints each kind needs" | a `fade`/`over-wash` entry missing its paints (would derive `NaN`) | yes — plant an entry without `composition` |
| "measures the caret on the nine surfaces" | a field surface added to the contract but not the entry, and the "nine" in the prose | yes — drop `input` from `caretInkPairs` |
| "states the shipped-set count nowhere in its own prose" | the `24 shipped sets` sentence returning, or a new one | **yes — it fails on today's tree** |
| "rejects the pre-717 figures" | a guard that cannot fail | yes — it asserts the old digits do not match |
| `docs.test.ts` "names both suites … and the table's size" | the count and every document the tables read | yes — add a `documentedFigures` entry for a page the sentence does not name |

Both directions are proved by §3's spot-check (falsify one digit per document,
watch the named case fail, revert) and by running the count guard before §2.4.

## 6. Acceptance criteria

- `figures.ts` measures a role at a fraction on a tone and a role on a wash of
  a role, documented in `FigureKind`, and fails closed (`NaN`) when an entry
  omits its paints.
- All five figures are derived from `shippedThemes` in all six places they are
  quoted, and falsifying any one of them fails a named case.
- `caretInkPairs` is derived from `contrastPairs` over `selectionSurfaces`, is
  9 pairs, and is held by a case.
- `styles.ts` states no count of shipped sets, and a case fails if one returns.
- `docs/tokens.md` states the table's derived size (**44**) and names every
  document category the tables read; a case fails on a new unnamed document.
- No colour, pair, floor, metric, platform style, recipe or shipped theme moves.
- `nub run check`, `nub run lint` and `nub run test` pass; `TODO.md` ticks the
  task and the plan index lists 717.
