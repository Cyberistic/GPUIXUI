# Plan 664 — The ledger's pair counts and the pressed fill in the hierarchy

## Why

`COMPONENTS.md` is the inventory ledger, and its **Theme contrast check** row is
the only place outside test code that publishes the size of every selection pair
list. `inventory.test.ts` holds ten of those phrases to their lists, but six are
still hand-typed:

| Phrase in the row | Ledger says | Package ships |
| ----------------- | ----------- | ------------- |
| pressed-row pairs | **9** | `selectionPressPairs.length` is **10** — plan 659 added `placeholder` on `selectedActive` |
| status labels on the pressed row | four | `statusTones.length` is four (correct, unguarded) |
| inactive-selection text pairs | 14 | `selectionInactivePairs.length` is 14 (correct, unguarded) |
| fill-selection text pairs | 8 | `selectionFillPairs.length` is 8 (correct, unguarded) |
| fill-veil pairs | 8 | `selectionFillWashPairs.length` is 8 (correct, unguarded) |
| panel-action inactive pair | 1 | `inactivePanelActionPairs.length` is 1 (correct, unguarded) |

The same drift reaches the hierarchy prose. Plan 651 added `selectedActive` and
`selectionPressPairs` holds the selected row's label on it, so
`themeTextTierFailures` now compares `selectedForeground` against `foreground`
on **five** fills — `hover`, `active`, `accent`, `selected` and `selectedActive`.
Three surfaces still say four:

| Document | Claim | Contract |
| -------- | ----- | -------- |
| `COMPONENTS.md` (**Total theme check** row) | held below `foreground` "on the four fills it keeps" | five |
| `docs/design-system.md` §11 | "on the four fills it keeps" and "documented only on those four fills" | five |
| `packages/tokens/src/contrast.ts` (`textTiers` JSDoc) | "the four fills both roles are documented on — `hover`, `active`, `accent` and `selected`" | five, including `selectedActive` |

`figures.test.ts` builds the design-system sentence with the literal words
"on the four fills it keeps", so the stale count is asserted rather than
derived: the guard passes while the sentence under-reports the fills the check
compares.

No colour, contrast pair, floor, metric, check or shipped theme changes.

## Scope

Documentation truth only, plus the guards that hold it:

- `COMPONENTS.md` — one stale numeral, one derived numeral, one stale fill count.
- `docs/design-system.md` — the tier paragraph's two fill counts.
- `packages/tokens/src/contrast.ts` — the `textTiers` JSDoc list.
- `packages/tokens/src/inventory.test.ts` — derive the six unguarded pair
  phrases and the total-check row's fill count from the lists.
- `packages/tokens/src/figures.test.ts` — build the tier sentence's fill count
  from `tierSurfaces` instead of the literal "four".

## Files

| File | Change |
| ---- | ------ |
| `COMPONENTS.md` | Theme contrast row: `9 pressed-row pairs` → `10 pressed-row pairs`. Total theme check row: `on the four fills it keeps (plan 623)` → `on the five fills it keeps (plan 623)`. |
| `docs/design-system.md` | §11 tier paragraph: `the four fills it keeps` and `only on those four fills` → `five`. |
| `packages/tokens/src/contrast.ts` | `textTiers` JSDoc: name the five fills, `selectedActive` included. |
| `packages/tokens/src/inventory.test.ts` | Extend the pair-count case with six derived phrases; add a case for the total row's fill word. |
| `packages/tokens/src/figures.test.ts` | The tier sentence takes its fill count word from `tierSurfaces`. |

## Exact edits

### 1. `COMPONENTS.md`

In the `| Theme contrast check |` row, change

```
9 pressed-row pairs and the four status labels on the pressed row
```

to

```
10 pressed-row pairs and the four status labels on the pressed row
```

Leave the surrounding counts alone; they already match the package
(`460`, `24`, `26`, `36`, `13`, `16`, `14`, `10`, `4`, `8`, `8`, `1`, `21`,
`21`).

In the `| Total theme check |` row, change

```
on the four fills it keeps (plan 623)
```

to

```
on the five fills it keeps (plan 623)
```

Do not edit the historical "Plan 525 … other four fills" clause in the contrast
row: it describes the state at plan 525, before `selectedActive` existed.

### 2. `docs/design-system.md`

In the §11 paragraph that begins "A theme that raises `disabledForeground` to
body strength…", replace both occurrences:

- `and a selected row's inherited label 1.106:1 below its title on the four fills it keeps.`
  → `… on the five fills it keeps.`
- `and it is documented only on those four fills.`
  → `… only on those five fills.`

Keep the figure unchanged; plan 537 derives it from the tier minimum.

### 3. `packages/tokens/src/contrast.ts`

In the `textTiers` JSDoc (around line 1209), replace

```
 * inherited label (`selectedForeground`) stays one step below its title
 * (`foreground`) on the four fills both roles are documented on — `hover`,
 * `active`, `accent` and `selected` — and a status-panel action's unavailable
```

with

```
 * inherited label (`selectedForeground`) stays one step below its title
 * (`foreground`) on the five fills both roles are documented on — `hover`,
 * `active`, `accent`, `selected` and the pressed `selectedActive` — and a
 * status-panel action's unavailable
```

Keep the rest of the paragraph.

### 4. `packages/tokens/src/inventory.test.ts`

Extend the import from `./contrast.js` with:

```ts
inactivePanelActionPairs,
selectionFillPairs,
selectionFillWashPairs,
selectionInactivePairs,
selectionPressPairs,
```

and import `tierSurfaces` from `./figures.js` and `statusTones` from
`./styles.js`.

Add these phrases to the existing
`"states the contract's pair counts from the pair lists"` case:

```ts
`${selectionPressPairs.length} pressed-row pairs`,
`${countWord(statusTones.length)} status labels on the pressed row`,
`${selectionInactivePairs.length} inactive-selection text pairs`,
`${selectionFillPairs.length} fill-selection text pairs`,
`${selectionFillWashPairs.length} fill-veil pairs`,
`${inactivePanelActionPairs.length} panel-action inactive pair`,
```

Add a new case in the same `describe`:

```ts
it("states the hierarchy's selected-label fill count from its tier", () => {
  const fills = tierSurfaces(["selectedForeground", "foreground"]);
  const total = row("Total theme check");

  // Derived, not typed: a sixth shared fill moves the word with it.
  expect(fills).toContain("selectedActive");
  expect(total).toContain(`on the ${countWord(fills.length)} fills it keeps`);
  expect(total).not.toContain("on the four fills it keeps");
});
```

### 5. `packages/tokens/src/figures.test.ts`

Import `tierSurfaces` beside the existing `tierMinimum` import (both come from
`./figures.js`).

In `"quotes the design system's four groups from the tier list"`, before the
`const sentence =` assignment, derive the selected-label fill count and a word
for it:

```ts
const tierWord = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;
const countWord = (count: number): string => tierWord[count] ?? String(count);
const selectedLabelFills = tierSurfaces([
  "selectedForeground",
  "foreground",
]);
```

Then build the last clause of the sentence as

```ts
`and a selected row's inherited label ${minimum("selectedForeground", "foreground")}:1 below its title on the ${countWord(selectedLabelFills.length)} fills it keeps.`;
```

Do not change the other clauses. The sentence must still match
`docs/design-system.md` exactly after the document edit.

## Commands, in order

Before the edits, prove the new guards can fail:

```sh
cd packages/tokens
nub exec vitest run src/inventory.test.ts src/figures.test.ts
```

Expected: `inventory.test.ts` fails on
`${selectionPressPairs.length} pressed-row pairs` (the ledger says 9), and
`figures.test.ts` fails on the design-system sentence once the sentence is
derived but the document still says four. If either passes before the edits,
the guard does not exercise the claim — stop and report.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/inventory.test.ts src/figures.test.ts src/docs.test.ts
nub run check-types
```

Then the workstream gates from the repository root:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. Do not quote a test count in the commit message; the
tokens suite's size moves as cases are added, and plan 663 already showed how a
stale count becomes its own defect.

## STOP conditions

- `tierSurfaces(["selectedForeground", "foreground"])` does not contain
  `selectedActive`, or `selectionPressPairs` is no longer length 10: stop and
  report; the contract changed shape rather than the prose drifting.
- `figures.test.ts` needs a figure other than the fill word to change: stop.
  This plan moves no colour, pair, floor or metric.
- A test outside the three named files fails: stop and report rather than
  editing an unrelated document.
- The `COMPONENTS.md` row contains a count this plan did not audit that no
  longer matches its list: note it in the report and leave it for a dedicated
  audit plan instead of widening this one silently.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | Run the extended `inventory` case and the derived `figures` case before the document edits: the pressed-row phrase reports 10 against the ledger's 9, and the tier sentence expects `five` while the page says `four`. |
| Passes with the fix | The same cases after the edits, then the three workstream gates. |
| Cannot pass by deleting the claim | Each positive `toContain` derives its numeral and word from the list, so removing the sentence or the row fails as surely as keeping the stale number. |
| Cannot pass by widening the wrong list | The fill count comes from `tierSurfaces`, the same helper `figures.test.ts` already uses to prove the hierarchy check's reported surfaces, so the document and the check read one owner. |

## Acceptance

- [ ] `COMPONENTS.md` says 10 pressed-row pairs and five selected-label fills.
- [ ] `docs/design-system.md` says five fills in both tier sentences.
- [ ] The `textTiers` JSDoc names `selectedActive` among the five fills.
- [ ] Every pair count in the Theme contrast check row is derived by
      `inventory.test.ts`, including the six that were unguarded.
- [ ] The total-check row's fill word derives from `tierSurfaces`.
- [ ] No colour, pair, floor, metric, check or shipped theme moves.
- [ ] `nub run check`, `nub run lint` and `nub run test` are green.
