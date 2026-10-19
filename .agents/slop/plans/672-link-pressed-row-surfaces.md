# Plan 672 — The pressed row in the link's surface lists

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `docs/tokens.md`, `packages/tokens/README.md`,
> `packages/tokens/src/docs.test.ts`, `TODO.md`,
> `.agents/slop/plans/README.md`. No token value, pair, floor or metric moves.

## Execution record (2026-10-19)

- The three new `docs primaryText surfaces` cases failed on the untouched
  documents: the contrast-contract paragraph named eight of the nine derived
  surfaces, both `primaryText` role-table cells omitted `selectedActive`, and
  the *Brand action* paragraph and README did too.
- The at-rest list first derived to 13 because `contrastPairs` also carries
  `primaryText` on the four soft status fills through `softPanelTextPairs`; the
  case filters the `*Soft` roles, because the sentence names those separately.
- After the edits: `docs.test.ts` is **212/212**, the five documentation suites
  are **314/314**, and `nub run check-types` is clean.

## Why

Plan `651` gave a selected row its press (`selectedActive`) and added
`primaryText` on that fill to `selectionPressPairs`. The contrast contract now
measures brand-toned text on nine at-rest surfaces:

```ts
// contrastPairs, primaryText at the secondary floor:
// background, card, popover, muted, hover, active, accent, selected
// + selectedActive from selectionPressPairs
```

Plan `651` also changed one catalogue sentence from "the eight surfaces a link
paints" to "the nine surfaces a link paints" — but it did not add the ninth
surface to the enumerated list. The sentence now reads:

> Brand-toned text is checked on the nine surfaces a link paints —
> `background`, `card`, `popover`, `muted`, the `hover`/`active` washes and the
> `accent`/`selected` fills a selectable row paints — and on the four soft
> status fills …

Nine is stated, eight are named; the pressed `selectedActive` row is missing.
The same omission is repeated in three more places that no suite reads:

- `docs/tokens.md` role table, `primaryText` use cell (identity table):
  "the `accent`/`selected` row fills".
- `docs/tokens.md` role table, `primaryText` use cell (high-contrast table):
  the same phrase.
- `docs/tokens.md`, *Brand action*: "on the `accent`/`selected` fills a
  selectable row paints under it".
- `packages/tokens/README.md`: "the `accent`/`selected` fills a link sits on
  inside a row".

`docs.test.ts` already derives the nine surfaces for the design-system's
interaction-state table:

```ts
const linkSurfaces = contrastPairs
  .filter(([role, , pairClass]) => role === "primaryText" && pairClass === "secondary")
  .map(([, background]) => background);
expect(missing("link", linkSurfaces)).toEqual([]);
```

That row names `accent`/`selected`/`selectedActive`, so the guard is green while
four other documents omit the pressed row. Nothing else reads those sentences.

## Scope

- Name `selectedActive` in the catalogue paragraph, both role-table use cells,
  the *Brand action* paragraph and the package README.
- Extend the suite with a derived guard that reads the same nine surfaces from
  `contrastPairs` and holds every one of those four prose surfaces to them.
- No source, token, colour, pair, floor, metric or shipped theme changes.

Out of scope: the design-system floor table and interaction-state row, which
already name `selectedActive`; the selection-wash list (`selectionLinkPairs`),
whose nine surfaces are the nine `selectionSurfaces`, not this at-rest list; and
the `primaryText` caret on `input`, which is a `mark` pair, not a link surface.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/docs.test.ts` | new `docs primaryText surfaces` cases. |
| `docs/tokens.md` | the four catalogue passages. |
| `packages/tokens/README.md` | the link-surface sentence. |
| `TODO.md`, `.agents/slop/plans/README.md` | ledger and index. |

## Exact edits

### 1. `packages/tokens/src/docs.test.ts`

Add a new describe after `describe("docs selected-row label fills", …)` (around
line 520), or after the interaction-state describe — either is fine as long as
it is module scope:

```ts
describe("docs primaryText surfaces", () => {
  const linkSurfaces = [
    ...new Set(
      contrastPairs
        .filter(
          ([role, , pairClass]) =>
            role === "primaryText" && pairClass === "secondary",
        )
        .map(([, background]) => background),
    ),
    // The four soft status fills are the second half of the sentence and are
    // owned by `softPanelTextPairs`; this list is the at-rest surfaces.
  ].filter((surface) => !surface.endsWith("Soft"));

  it("names the pressed selected row among the at-rest link surfaces", () => {
    expect(linkSurfaces).toHaveLength(9);
    expect(linkSurfaces).toContain("selectedActive");

    const from = markdownProse.indexOf(
      "Brand-toned text is checked on the",
    );
    const to = markdownProse.indexOf("`softPanelTextPairs`", from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);

    const clause = markdownProse.slice(from, to);
    expect(clause).toContain(`the ${countWord(linkSurfaces.length)} surfaces`);
    linkSurfaces.forEach((surface) =>
      expect(clause, surface).toContain(`\`${surface}\``),
    );
  });

  it("names the pressed row in both role tables", () => {
    const cells = markdown
      .split("\n")
      .filter((line) => line.startsWith("| `primaryText` |"));
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => expect(cell).toContain("`selectedActive`"));
  });

  it("names the pressed row in the brand-action paragraph and the README", () => {
    const from = markdownProse.indexOf("Brand-toned text — a link");
    const to = markdownProse.indexOf("A runnable example lives in", from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    expect(markdownProse.slice(from, to)).toContain("`selectedActive`");

    const readme = readmeSource.replace(/\s+/g, " ");
    expect(readme).toContain("`accent`/`selected`/`selectedActive` fills");
  });
});
```

`countWord`, `markdownProse`, `markdown`, `readmeSource` and `contrastPairs` are
already in scope in this module. The cases derive the count and the members from
the pair list, so a tenth at-rest surface or a removed one moves the words.

### 2. `docs/tokens.md` — the *Brand action* paragraph

Replace:

```
4.5:1 on `background`, `card`, `popover` and `muted`, on the `hover` and
`active` washes the Link variant paints behind its own label, on the
`accent`/`selected` fills a selectable row paints under it, and on the four soft
status fills a link in a status panel sits on.
```

with:

```
4.5:1 on `background`, `card`, `popover` and `muted`, on the `hover` and
`active` washes the Link variant paints behind its own label, on the
`accent`/`selected` fills a selectable row paints under it and the pressed
`selectedActive` it keeps, and on the four soft status fills a link in a status
panel sits on.
```

### 3. `docs/tokens.md` — the two `primaryText` role-table cells

Both rows (the identity table around line 229 and the high-contrast table around
line 533) contain the phrase:

```
the `accent`/`selected` row fills
```

Replace it with:

```
the `accent`/`selected`/`selectedActive` row fills
```

Use `replaceAll` or edit each occurrence; there are exactly two.

### 4. `docs/tokens.md` — the contrast-contract paragraph

Replace:

```
Brand-toned text is checked on the nine surfaces a link paints —
`background`, `card`, `popover`, `muted`, the `hover`/`active` washes and the
`accent`/`selected` fills a selectable row paints — and on the four soft status
fills a link in a status panel sits on
(`softPanelTextPairs`), so a platform accent cannot
```

with:

```
Brand-toned text is checked on the nine surfaces a link paints —
`background`, `card`, `popover`, `muted`, the `hover`/`active` washes, the
`accent`/`selected` fills a selectable row paints and the pressed
`selectedActive` it keeps — and on the four soft status fills a link in a status
panel sits on (`softPanelTextPairs`), so a platform accent cannot
```

### 5. `packages/tokens/README.md`

Replace:

```
the `accent`/`selected` fills a link sits on inside a row
```

with:

```
the `accent`/`selected`/`selectedActive` fills a link sits on inside a row
```

### 6. `TODO.md`

Add the completed row after the plan-671 row:

```
`[x]` Name the pressed row among the link's surfaces — plan 651 changed the
catalogue's "eight surfaces a link paints" to "nine" when it added
`primaryText` on `selectedActive`, but the sentence still enumerated eight, and
the two `primaryText` role-table use cells, the *Brand action* paragraph and the
package README repeated the omission while the design-system guard stayed green.
All five now name the pressed row, and a derived `docs.test.ts` case reads the
nine at-rest surfaces from `contrastPairs` and holds each passage to them; no
token value, pair, floor or metric moves (plan 672)
```

### 7. `.agents/slop/plans/README.md`

Add the row after `671` and one prose sentence after the plan-671 sentence.

## Commands, in order

Before the docs edits, prove the guard can fail:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts
```

Expected: the three new cases fail — `selectedActive` is absent from the clause,
both role-table cells and the README, while `linkSurfaces` already has nine
members. If the new cases pass on the untouched documents, **STOP** and
re-measure; this plan would be fixing nothing.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/readme.test.ts src/figures.test.ts src/snippets.test.ts src/inventory.test.ts
nub run check-types
```

Expected: all green.

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

## STOP conditions

- `linkSurfaces.length` is not 9, or does not contain `selectedActive`: the
  pair lists moved — re-derive the sentence and note the difference; do not
  hardcode a count.
- The role-table filter finds more or fewer than two `primaryText` rows: the
  table gained a section; adapt the case to the real row count rather than
  weakening it.
- A guard fails because the catalogue, README or role table has already been
  corrected: leave the corrected prose alone and report which passage was
  already true.
- Any colour, pair, floor or metric has to move: **STOP**. No shipped value
  moves in this plan.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | On the untouched documents the clause names eight of the nine derived surfaces, both `primaryText` cells omit `selectedActive`, the *Brand action* paragraph omits it and the README phrase is absent. |
| Passes with the fix | The same cases pass once all five passages name `selectedActive`; the count word and members come from `contrastPairs`. |
| Cannot pass by changing a literal | The expected count and members are derived from the pair list; the case asserts nine comes from the contract and each member is present in the prose. |
| No source change smuggled in | Only Markdown and the test file are touched; `git diff --name-only` lists no `src/*.ts` except the test. |

## Acceptance

- [x] The catalogue paragraph, both role-table use cells, the *Brand action*
      paragraph and the README name `selectedActive`.
- [x] The new cases fail on the pre-fix tree and pass after the edits.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed in `.agents/slop/plans/README.md`; `TODO.md` row ticked.
