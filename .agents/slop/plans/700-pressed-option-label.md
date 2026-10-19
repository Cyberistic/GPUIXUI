# 700 — A menu option's label on the pressed selected fill

**Phase:** F (the state matrix of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 314 (the selected option's label on `selected`), 651 (the
selected row's press, `selectedActive`), 698 (the executed `checked-control`
example and its pressed fill) ·
**Number block:** 500–699 is full for other worktrees; 699 is taken by the
playground, so this takes **700** ·
**Status:** done

> **Status: executed 2026-10-19.** Execution evidence is at the end of this plan.

## Why

`checked-control.example.ts` (shipped by plan 698) declares the composition a
selected option paints:

```ts
export const selectedOption = (theme: Theme) => ({
  background: theme.colors.selected,
  pressedBackground: theme.colors.selectedActive,
  foreground: theme.colors.popoverForeground,
  check: theme.colors.primary,
});
```

Its own JSDoc says a selected option "at rest sits on `selected`" and the check
is measured "there and on `selectedActive`". The **label** is
`popoverForeground`.

The label's pairs are split across two lists, as every pressed row's are:

- `rowTextPairs` (`packages/tokens/src/contrast.ts`) measures
  `popoverForeground` on `hover`/`active`/`selected` at the `body` floor — a menu
  row's and a selected `Select` option's label (plans 312 and 314).
- `selectionPressPairs` owns the pressed fill: `foreground` (a list row's title),
  `selectedForeground`, `mutedForeground`, `inputForeground`, `placeholder`,
  `primaryText`, the disabled label and three chrome roles on `selectedActive`
  (plan 651, extended by plan 659 with the typed text).

`popoverForeground` on `selectedActive` is in neither. So the example declares a
label on the pressed fill that the contract never measures: a theme can set
`popoverForeground` close to `selectedActive` and erase the label of the option
it just chose while `themeFailures` returns `[]`. This is the exact gap plan 698
closed one role over (the check glyph on the same two fills), left open for the
label.

**Measured gap (shipped).** A probe over all 24 shipped sets confirms
`["popoverForeground", "selectedActive", "body"]` is absent from `contrastPairs`
(the list is 463), while `popoverForeground` on `selected` is present. Every
shipped set already clears the 7:1 body floor on the pressed fill: the tightest
is `Dark · Linux` at **11.592:1**, above its `selected` figure of 8.984:1 — the
pressed fill steps toward the canvas, so a light theme's near-black label and a
dark theme's near-white label both gain contrast there. No shipped colour can
move.

A planted theme proves the diagnostic is missing, not only the shipped value:

```ts
const regressed = extendTheme(getTheme("light"), {
  colors: { popoverForeground: getTheme("light").colors.selectedActive },
});
```

On the pre-fix tree `themeContrastFailures(regressed)` reports no
`popoverForeground`/`selectedActive` pair, because the pair does not exist.

## Decision

1. Publish `["popoverForeground", "selectedActive", "body"]` in
   `selectionPressPairs`, after `["foreground", "selectedActive", "body"]`. The
   pressed selected fill is owned by `selectionPressPairs` — exactly as
   `foreground` on `selectedActive` is, while its `selected` counterpart lives in
   `rowTextPairs` — so the menu option's label joins the pressed-row contract
   rather than the resting-wash list.
2. Do **not** add a new pair list or check kind. `selectionPressPairs` is spread
   into `contrastPairs`, so the new pair is reported by `themeContrastFailures`
   and by `themeFailures` with no composition change.
3. Do **not** touch `selectionPairs`: it walks the text-selection wash on the
   nine *persistent* surfaces, and `selectedActive` is the transient press the
   list deliberately excludes (plan 359/651).
4. No colour, floor, metric or role moves; the pair is a coverage guard.

The pair count moves 463 → **464** (one `body` pair). No pair class, floor,
metric, role or colour moves.

## Exact files and changes

### 1. `packages/tokens/src/contrast.ts`

Add the pair to `selectionPressPairs` (after `["foreground", "selectedActive",
"body"]`) and name the label in the list's JSDoc:

```ts
/**
 * The text and chrome a pressed selected row paints. `selectedActive` is a row
 * surface like `selected`: a title (`foreground`), the inherited label
 * (`selectedForeground`), a menu option's own label (`popoverForeground`),
 * metadata, typed text in an in-place editor, a hint, a brand-toned link and a
 * disabled control sit on it; the four status labels are
 * derived from
 * {@link statusTextSurfaces}, which names it too, and the row's control edge, focus ring,
 * divider and loading skeleton paint there too. The groove and the skeleton are
 * measured through {@link trackSurfacePairs} and {@link skeletonPulsePairs}, and
 * the fill on the surfaces it paints on through {@link stateFillSurfacePairs}.
 *
 * The transient state is deliberately outside the selection-wash, modal-scrim
 * and elevation walks: a reader drags a selection or opens a dialog at rest, so
 * the persistent `selected` fill is what those contracts measure, exactly as
 * plan 359 excludes the `hover`/`active` washes from the scrim.
 */
export const selectionPressPairs: readonly ContrastPair[] = [
  ["foreground", "selectedActive", "body"],
  ["popoverForeground", "selectedActive", "body"],
  ["selectedForeground", "selectedActive", "secondary"],
  ...
];
```

`rowTextPairs` and the big `contrastPairs` JSDoc do not change: the resting
`popoverForeground` pairs are unchanged, and the pressed perspective is already
named as owned by `selectionPressPairs`.

### 2. `packages/tokens/src/selection-press.test.ts`

The list pin at the top of the file must gain the role:

```ts
    expect(selectionPressPairs.map(([foreground]) => foreground)).toEqual([
      "foreground",
      "popoverForeground",
      "selectedForeground",
      "mutedForeground",
      "inputForeground",
      "placeholder",
      "primaryText",
      "disabledForeground",
      "borderStrong",
      "ring",
      "border",
    ]);
```

Extend the file header with the gap this plan closes:

```
 * Plan 700 closes the pressed row's last own label: `checked-control.example.ts`
 * (plan 698) declares a selected option's `foreground` as `popoverForeground` on
 * both `selected` and the pressed `selectedActive`, but only the resting fill
 * was measured. The menu option's label joins this list at the body floor.
```

Add one `describe` (each case must be able to fail):

```ts
describe("a menu option's label on the pressed fill", () => {
  const pressedLabelFailures = (theme: ReturnType<typeof getTheme>) =>
    themeContrastFailures(theme).filter(
      ({ foreground, background }) =>
        foreground === "popoverForeground" && background === "selectedActive",
    );

  it("publishes the option's label on the pressed fill once", () => {
    const pair = ["popoverForeground", "selectedActive", "body"] as const;
    expect(selectionPressPairs).toContainEqual([...pair]);
    expect(
      contrastPairs.filter(
        ([foreground, background, pairClass]) =>
          foreground === pair[0] &&
          background === pair[1] &&
          pairClass === pair[2],
      ),
    ).toEqual([pair]);
  });

  it("holds every shipped set above the body floor on the pressed fill", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const floor = contrastFloors[theme.contrast].body;
      const ratio = contrastRatio(
        theme.colors.popoverForeground,
        theme.colors.selectedActive,
      );
      return ratio >= floor
        ? []
        : [`${theme.name}: ${ratio} < ${floor}`];
    });
    expect(failures).toEqual([]);
  });

  it("pins the pressed-fill figure the catalogue quotes", () => {
    const worst = shippedThemes
      .map(
        ({ theme }) =>
          [
            theme.name,
            contrastRatio(
              theme.colors.popoverForeground,
              theme.colors.selectedActive,
            ),
          ] as const,
      )
      .reduce((tightest, current) =>
        current[1] < tightest[1] ? current : tightest,
      );
    expect([worst[0], Number(worst[1].toFixed(3))]).toEqual([
      "Dark · Linux",
      11.592,
    ]);
  });

  it("reports the option's label erased on the pressed fill", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { popoverForeground: light.colors.selectedActive },
    });
    const erased = pressedLabelFailures(regressed);

    expect(erased).toHaveLength(1);
    expect(erased[0]?.pairClass).toBe("body");
    expect(erased[0]?.floor).toBe(contrastFloors.default.body);
  });
});
```

The planted case fails on the pre-fix tree because the pair list has no
`popoverForeground`/`selectedActive` entry; the shipped cases pass because the
pressed fill only raises the label's contrast.

### 3. `docs/tokens.md`

- The row-text paragraph (search `The other row text roles have their own
  pairs.`): the selected `Select` option clause gains the pressed fill, and the
  tightest-value list gains the new figure. The sentence reads:

  ```md
  A menu row paints
  `popoverForeground` on `hover`/`active`, a selected `Select` option paints it on
  `selected` — the shipped `selectItemStyle` keeps the menu foreground when the row
  fills — and on the pressed `selectedActive` while the chosen option is held
  (plan `700`), and a selected row under the pointer keeps its inherited
  `selectedForeground` on `accent`, `hover`, `active` and the pressed
  `selectedActive`; all four take the secondary floor, matching
  `selectedForeground` on `selected`.
  ```

  and the tightest list gains, after `popoverForeground` on `selected`:

  ```md
  `popoverForeground` on `selectedActive` at **11.59:1** (Linux dark),
  ```

- The pressed-row paragraph (search `selectionPressPairs` holds the six text
  roles): `six` → `seven`.

- The pair-count history (search `taking it from`): the terminal figure becomes
  `**464**` and the plan list gains `700`.

### 4. `docs/design-system.md`

The floor table's menu-label row (search `a menu row's label (`) gains the
pressed fill:

```md
| a menu row's label (`popoverForeground` on `hover`/`active`, on `selected` for a selected `Select` option and on the pressed `selectedActive` while it is held) | 7:1 | 7:1 |
```

`docs.test.ts` pins this row's exact text, so section 5 updates the guard with it.

### 5. `packages/tokens/src/docs.test.ts`

- The floor-table row guard (search `a menu row's label (`) must match section 4:

  ```ts
  `| a menu row's label (\`popoverForeground\` on \`hover\`/\`active\`, on \`selected\` for a selected \`Select\` option and on the pressed \`selectedActive\` while it is held) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
  ```

- The quoted-figures list (search `["popoverForeground", "selected",`): add

  ```ts
  ["popoverForeground", "selectedActive", "Linux dark", 11.59],
  ```

### 6. `packages/tokens/README.md`

The row-text paragraph (search `A menu row's `popoverForeground` is measured on
the three washes`): name the pressed fill and the plan, e.g. "a menu row's
`popoverForeground` is measured on the three washes it highlights with, on the
`selected` fill a selected `Select` option keeps and on the pressed
`selectedActive` while the option is held (plans 525 and 700); the selected
row's inherited `selectedForeground` on all five fills it keeps".

### 7. `packages/tokens/src/resting-fill-scrim.test.ts` and
`packages/tokens/src/contrast.test.ts`

The two hard-coded totals move with the pair: `expect(contrastPairs.length).toBe(463)`
→ `464` in both files (search `463`).

### 8. `COMPONENTS.md`

- **Theme contrast check** row: `the same 463 contrast pairs` → `464`, and
  `10 pressed-row pairs` → `11 pressed-row pairs`.
- Append to the same row's plan history, before the closing `|`:

  ```md
  Plan 700 holds a menu option's label on the pressed selected fill — the
  `checked-control.example.ts` plan 698 shipped declares its `foreground` as
  `popoverForeground` on both `selected` and the pressed `selectedActive`, but
  only the resting fill was measured, so an edited theme could erase the chosen
  option's label while the checker returned `[]`; the pair joins
  `selectionPressPairs` (every shipped set already clears 11.592:1 at the
  tightest, `Linux dark`), and the contract grows 463 → **464** pairs.
  ```

`inventory.test.ts` derives both counts from the exported lists, so it fails by
name until the row and the lists agree.

### 9. `TODO.md`

Add one completed row under *Design tokens and theming* and move the counter
from `315/392` to `316/393`:

```
`[x]` Hold a menu option's label on the pressed selected fill — the
`checked-control.example.ts` plan 698 shipped declares a selected option's
`foreground` as `popoverForeground` on both `selected` and the pressed
`selectedActive`, but `selectionPressPairs` measured a list row's `foreground`
there and not the menu option's label, so an edited `popoverForeground` equal to
`selectedActive` erased the chosen option's label while `themeFailures` returned
`[]`; the pair joins the pressed-row list, every shipped set already clears
**11.592:1** at the tightest (`Linux dark`), so no colour moves and the contract
grows 463 → 464 (plan 700)
```

### 10. `.agents/slop/plans/README.md`

Add one row to the tokens table after `698`:

```
| [700](./700-pressed-option-label.md) | A menu option's label on the pressed selected fill | F | 314, 359, 651, 659, 698 | done |
```

Add a short paragraph after the `698` summary stating the defect, the one added
pair, the measured tightest figure and that no shipped set or role moves.

## Commands

Run from the worktree root unless stated.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New regression only | `nub run --filter @gpuixui/tokens test -- src/selection-press.test.ts` | pass after the change; the new pair named once |
| Prove it fails without the fix | temporarily remove the new `selectionPressPairs` entry and rerun the command above | "publishes the option's label on the pressed fill once" and "reports the option's label erased on the pressed fill" fail |
| Package suite | `nub run --filter @gpuixui/tokens test` | all files green, 464 pairs |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | all workspaces' suites pass |

`scripts/verify-two-directions.sh` is written against `jj` while the repo pins
git (recorded in `TODO.md` as a cross-team tooling row), so the both-directions
proof is the manual sequence above: the pair-existence case and the planted case
must fail with the entry removed and pass with it restored. Do not rewrite the
script from this plan.

## Test plan

- **Can the new test fail?** Yes. The pair-existence case requires an entry that
  does not exist on the pre-fix tree; the planted case requires a
  `popoverForeground`/`selectedActive` `body` failure the pre-fix checker cannot
  emit.
- **The shipped sets:** all 24 must clear the 7:1 / 7:1 `body` floor on
  `selectedActive`. The tightest is `Dark · Linux` at **11.592:1**; the figure is
  pinned from the source, not typed prose.
- **No palette move:** the pressed fill steps toward the canvas, so the label's
  contrast only rises; the probe measured every shipped set, and the existing
  contrast, platform, direction, docs and inventory suites must stay green.
- **No selection-wash change:** `selectionPairs` and the composited-wash guards
  are untouched, because `selectedActive` is the transient fill those lists
  exclude by design.

## Acceptance

- [ ] `selectionPressPairs` holds `popoverForeground` on `selectedActive` at the
      `body` floor.
- [ ] `themeContrastFailures` reports a `popoverForeground`/`selectedActive`
      failure for the planted theme and returns `[]` for every shipped set.
- [ ] `contrastPairs` is **464**; the two hard-coded totals and the `COMPONENTS.md`
      pair counts agree with the lists.
- [ ] One executed example declaration (`checked-control.example.ts`) now has a
      pair behind its pressed label.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
      `COMPONENTS.md`, `TODO.md` and the plan index state the new pair, count and
      figure.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## STOP conditions

- Any other shipped set falls below the `body` floor on `popoverForeground` over
  `selectedActive` → stop and report the set and ratio. The probe says none can;
  do not move a palette from this plan.
- The new pair reports a failure in any shipped set → stop and report the pair.
  This plan is a coverage guard, not a palette move.
- A docs or inventory guard disagrees with the measured count → update the
  document to the derived list and re-run; never edit a list to satisfy prose.
- A guard wants the pair in `selectionPairs` (the text-selection wash) → leave it
  in `selectionPressPairs` and report the guard: `selectedActive` is the
  transient press the selection walk excludes by design.
- A gate fails in a file this plan does not own → report it; do not edit another
  workstream's tree.

## Execution (2026-10-19)

- `selectionPressPairs` now holds `["foreground", "selectedActive", "body"]`
  followed by `["popoverForeground", "selectedActive", "body"]`.
- `contrastPairs`: 463 → 464.
- Tightest new pair: `popoverForeground` on `selectedActive` **11.592:1**
  (`Dark · Linux`); no other shipped set or role moves.
- The new regression fails with the pair entry removed (two cases) and passes
  with it restored. The package suite, `nub run check` and the repo test gate are
  recorded in the commit.
