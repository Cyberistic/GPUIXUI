# Plan 663 — Name every fill a pressed selected row's label is measured on

## Why

Plan `651` added the pressed selected row. `selectionPressPairs` holds
`selectedForeground` on `selectedActive`, so the inherited label is now measured
on **five** fills: the four resting ones in `selectionPairs` (`selected`,
`hover`, `active`, `accent`) and the pressed `selectedActive`. Plan `659` then
added typed text (`inputForeground`) to the same list, so `selectionPressPairs`
now carries **six** text roles, not five.

The prose did not follow either edit:

| Document | Claim | Contract |
| -------- | ----- | -------- |
| `docs/tokens.md` (three places) | `selectedForeground` is on "all **four** fills it keeps" | five backgrounds |
| `docs/tokens.md` (row-text paragraph) | the label is held on `accent`, `hover` and `active`, "all three ... matching ... on `selected`" | the pressed fill is missing |
| `docs/tokens.md` (pressed-row paragraph) | "`selectionPressPairs` holds the **five** text roles" | six foregrounds |
| `docs/design-system.md` (interaction table, `selected` row) | "the label is held on `selected`, the `hover`/`active` pointer washes and the `accent` wash" | the pressed fill is missing |

No suite reads these counts or the label's fill list, so the catalogue and the
design system currently under-report what the checker enforces. A reader copying
a selected-row label style is told there are four measured fills and five
pressed-row roles where the package publishes five and six.

## Scope

Documentation truth only. **No colour, pair, floor, metric, check or shipped
theme changes**; `contrastPairs` stays at its shipped size and
`selectionPressPairs` keeps its ten entries.

## Files

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | three "four fills" sentences say "four resting fills" and name the pressed fill; the row-text paragraph adds the pressed fill; "five text roles" becomes the derived word for six |
| `docs/design-system.md` | the `selected` interaction row's label clause names every fill the pair list measures, the pressed `selectedActive` included |
| `packages/tokens/src/docs.test.ts` | two cases: the pressed-row text-role count derives from `selectionPressPairs`, and the label's fill list derives from `selectionPairs` + `selectionPressPairs` and is required in the design-system row |

## Exact edits

### 1. `docs/tokens.md`

1. Line ~1574 (the plan `506` paragraph): "and the four fills measure
   **8.533:1** at the tightest" → "and the four resting fills measure
   **8.533:1** at the tightest". This figure is about `selectionPairs`; the
   pressed fill has its own pair and figure.
2. Lines ~1625, ~2257 and ~3810: "on all four fills it keeps" →
   **"on all four resting fills it keeps, plus the pressed `selectedActive`"**
   (the three sentences describe `selectionPairs`; the press lives in
   `selectionPressPairs`).
3. Line ~3290 (the "other row text roles" paragraph): replace
   "on `accent`, `hover` and `active`; all three take the secondary floor,
   matching `selectedForeground` on `selected`" with
   "on `accent`, `hover`, `active` and the pressed `selectedActive`; all four
   take the secondary floor, matching `selectedForeground` on `selected`".
4. Line ~3428 (the pressed-row paragraph): "holds the five text roles" →
   "holds the six text roles".

### 2. `docs/design-system.md`

Line ~415, the `| selected |` row: the label clause becomes

> the label is held on `selected`, the `hover`/`active` pointer washes, the
> `accent` wash and the pressed `selectedActive`

The rest of the row is unchanged.

### 3. `packages/tokens/src/docs.test.ts`

Import `selectionPairs` and `selectionPressPairs` from `./contrast.js`.

Add to `describe("docs/tokens.md contract counts")`:

```ts
it("states the pressed row's text-role count from the published pair", () => {
  const prose = markdown.replace(/\s+/g, " ");
  const textRoles = selectionPressPairs
    .filter(([, , pairClass]) => pairClass === "body" || pairClass === "secondary")
    .map(([foreground]) => foreground);

  // Derived, not typed: a seventh text role moves the word with it.
  expect(textRoles.length).toBeGreaterThan(0);
  expect(prose).toContain(
    `\`selectionPressPairs\` holds the ${countWord(textRoles.length)} text roles`,
  );
  expect(prose).not.toContain("`selectionPressPairs` holds the five text roles");
});
```

Add a new `describe("docs selected-row label fills")` case:

```ts
it("names every fill the inherited label is measured on", () => {
  const fillsFor = (pairs: ReadonlyArray<ContrastPair>) =>
    pairs.filter(([foreground]) => foreground === "selectedForeground").map(([, background]) => background);
  const resting = fillsFor(selectionPairs);
  const pressed = fillsFor(selectionPressPairs);
  const all = contrastPairs
    .filter(([foreground]) => foreground === "selectedForeground")
    .map(([, background]) => background);

  expect(resting).toHaveLength(4);
  expect(pressed).toEqual(["selectedActive"]);
  expect([...resting, ...pressed].sort()).toEqual([...all].sort());

  const prose = markdown.replace(/\s+/g, " ");
  expect(prose).toContain(
    `on all ${countWord(resting.length)} resting fills it keeps`,
  );
  expect(prose).not.toContain("on all four fills it keeps");

  const row = designSystemSource
    .split("\n")
    .find((line) => line.startsWith("| selected |"));
  expect(row).toBeDefined();
  const clause = row!.slice(
    row!.indexOf("the label is held on"),
    row!.indexOf("; a chosen row"),
  );
  for (const fill of [...resting, ...pressed]) {
    expect(clause, fill).toContain(`\`${fill}\``);
  }
});
```

`ContrastPair` is already the type name in `contrast.ts`; import it if it is not
already in scope, or type the helper parameter inline.

## Commands, in order

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts
```

**Before the documentation edit** this must fail with the new cases:
`states the pressed row's text-role count …` (the document says five) and
`names every fill …` (the design-system clause omits `selectedActive`, and the
catalogue says "four fills"). Record the failure in the commit message. A green
run on the pre-fix text means the guard does not exercise the claim — stop.

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/selection-press.test.ts src/contrast.test.ts
nub run check-types
```

Then the workstream gates from the repository root:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green; `nub run test` runs the whole tokens suite (the shipped
count is 6651 tests before this plan; the two new cases take it to 6653).

## STOP conditions

- `selectionPairs` or `selectionPressPairs` no longer hold the shapes this plan
  derives (for example, `selectedForeground` gains or loses a background):
  stop and report; do not bend the prose to a changed contract.
- Any documented figure other than the wording above needs to move: stop. This
  plan moves no colour, pair, floor or metric.
- A test outside `docs.test.ts` fails: stop and report the failure rather than
  editing an unrelated document.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | Run the two new cases on the pre-fix documents: five vs six, and the design-system clause missing `selectedActive` |
| Passes with the fix | Same cases after the edits; full suite green |
| Cannot pass by deleting the sentence | The positive `toContain` derives the word from the pair list, so removing the sentence fails as surely as the stale word |

## Acceptance

- [ ] `docs/tokens.md` states the pressed row's six text roles and names the
      pressed fill beside the four resting fills in every label sentence.
- [ ] `docs/design-system.md`'s `selected` row names every fill the label pair
      list measures.
- [ ] The two guards derive their expectations from `selectionPairs`,
      `selectionPressPairs` and `contrastPairs`.
- [ ] No colour, pair, floor, metric, check or shipped theme moves.
- [ ] `nub run check`, `nub run lint` and `nub run test` are green.
