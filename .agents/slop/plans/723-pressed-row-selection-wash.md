# 723 — The pressed selected row's text selection

**Phase:** F (the state matrix of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 081/087 (the selection wash on the pointer washes), 524 (the wash
on the `disabled` fill), 651 (the selected row's press, `selectedActive`), 689
(the field's typed text through the wash), 700 (the pressed option's label) ·
**Number block:** 500–699 is taken across the worktrees; 721 and 722 are the
`components` worktree's, so this takes **723** ·
**Status:** done

> **Status: executed 2026-10-20.** Execution evidence is at the end of this plan.

## Why

`selectedActive` is the fill a **chosen row** keeps while the pointer is held
(plan 651): `selectionPressStepPairs` publishes its step from `selected`, and
`selectionPressPairs` measures the eleven pairs a pressed row paints **at rest**.

The text-selection contract walks `selectionSurfaces`, which holds nine
surfaces: `background`, `card`, `muted`, `hover`, `active`, `accent`,
`popover`, `input`, `selected`. Two of them are the transient pointer states of
an **unselected** row — `hover` and `active` — and they are there because a
reader drags a selection with the pointer down:

```
selectionSurfaces  hover, active  ←  pointer down on an unselected row
selectedActive                    ←  pointer down on a selected row
```

`selectedActive` is absent. Plans 651, 689 and 700 excluded it with one
sentence: *"a row is selected at rest"*. That reason contradicts the list it
sits beside: `hover` and `active` are pointer states, not rest states, and they
are selection surfaces. A reader who click-drags across a chosen row's text is
hovering **and** pressing that row, exactly like a reader dragging across an
unchosen one; the only difference is which fill the row paints.

**Measured consequence.** A probe over all 24 shipped sets confirms the wash
pair `["selection", "selectedActive", "surface"]` is absent from
`selectionWashPairs` (the list is ten) while `["selection", "active", "surface"]`
is present. Every shipped set already clears the 1.05:1 perceivability floor
there — the tightest is **1.185:1** (`High contrast dark`) — so no shipped colour
can move, and the list's own tightest figure stays 1.061:1 (`High contrast dark`
on `active`).

A planted theme proves the diagnostic is missing, not only the shipped value:

```ts
import { alpha, extendTheme, getTheme } from "@gpuixui/tokens";

const light = getTheme("light");
const regressed = extendTheme(light, {
  colors: { selection: alpha(light.colors.selectedActive, 0.4) },
});
```

The wash is the pressed fill at 40%, so its composite over `selectedActive` is
`selectedActive` and the highlight measures **1.000:1** on the only surface a
reader drags over while the row is pressed. On the pre-fix tree the theme passes
every check, because the pair does not exist; the wash over `background`, `card`,
`selected` and the other eight surfaces is still visible (the planted fraction is
40%, not 0%), so the witness is surgical: one missing pair, not a broken theme.

This is exactly the gap plan 524 closed for the `disabled` fill: *"a highlight
that matches that fill erases the selection while every text pair still passes"*.

## Decision

1. Publish `["selection", "selectedActive", "surface"]` in
   `selectionWashPairs`, after the `["selection", "disabled", "surface"]` entry
   plan 524 added, and say why in the list's JSDoc.
2. Do **not** add `selectedActive` to `selectionSurfaces`. That index is also the
   filter `figures.ts` uses to derive the caret's surface list
   (`caretInkPairs`), whose entries are named "the caret's nine surfaces" in four
   figures and in `caretPairs`' JSDoc; growing it to ten would silently change a
   different guarantee's universe. `disabled` took the same explicit-pair route
   in plan 524 for the same reason.
3. Do **not** move the pressed row's text pairs into the washed lists. They are
   measured at rest in `selectionPressPairs` (plan 651/659/700), and plan 700
   settled that the pressed row's own label belongs there. This plan answers the
   one question those lists cannot: whether the highlight a reader drags over
   that fill can be seen at all.
4. No colour, floor, metric, role or type moves. `contrastPairs` stays **464**;
   `selectionWashPairs` moves 10 → **11**.
5. State the supersession in the documents that carry the old reason: the
   pressed row stays out of the **scrim** and **elevation** walks (a dialog opens
   and a shadow falls at rest), but it is a selection surface like the other
   pointer states.

## Exact files and changes

### 1. `packages/tokens/src/contrast.ts`

In `selectionWashPairs` (search `export const selectionWashPairs`), add the pair
after the `disabled` entry:

```ts
export const selectionWashPairs: readonly ContrastPair[] = [
  ...selectionSurfaces.map(
    (surface): ContrastPair => ["selection", surface, "surface"],
  ),
  // The unavailable label is selected with the copy around it (plan 510), so
  // the wash must stay visible on the fill it keeps.
  ["selection", "disabled", "surface"],
  // A reader click-drags across a chosen row's text with the button held, so the
  // fill under the selection is the pressed `selectedActive` (plan 651) — the
  // pointer state of a selected row, exactly as `hover` and `active` are the
  // pointer states of an unselected one (plan 723).
  ["selection", "selectedActive", "surface"],
];
```

Extend the list's JSDoc. It currently ends with the `disabled` sentence; append:

```
 * The pressed `selectedActive` fill joins them (plan 723). Plans 651, 689 and
 * 700 excluded it as "a row is selected at rest", but the list already holds
 * `hover` and `active`, the pointer states of an unselected row: a reader drags
 * a selection with the button held, and on a chosen row that is the pressed
 * fill. The printed veil used to pick the selection's text and the scrim a
 * dialog opens over stay at rest, so `selectedActive` remains outside those
 * walks.
```

Also extend `themeContrastFailures`' JSDoc list (search
`` `selectionPairs`, `selectionStatusPairs`, `selectionWashPairs` ``) only if it
enumerates the wash surfaces; it names lists, not members, so no change there.

### 2. `packages/tokens/src/selection-press-wash.test.ts` (new)

Header comment states the bug:

```
/**
 * Guards the gap plan 723 closes: `selectedActive` is the fill a chosen row
 * keeps while the pointer is held, and a reader click-drags a text selection
 * with the button down, so the composited `selection` wash must stay visible on
 * it. The wash walk held the nine `selectionSurfaces` — `hover` and `active`
 * among them, the pointer states of an *unselected* row — plus the `disabled`
 * fill plan 524 added, and never the pressed selected row: a theme whose wash
 * composited to `selectedActive` returned `[]` from `themeFailures` while the
 * highlight measured 1.000:1 on the only surface a reader drags over while the
 * row is pressed.
 */
```

Cases:

```ts
describe("the selection wash on the pressed selected row", () => {
  it("publishes the wash on the pressed fill once", () => {
    const pair = ["selection", "selectedActive", "surface"] as const;
    expect(selectionWashPairs).toContainEqual([...pair]);
    expect(
      selectionWashPairs.filter(
        ([role, surface]) => role === pair[0] && surface === pair[1],
      ),
    ).toHaveLength(1);
    // The pair belongs to the wash walk, not the plain contract.
    expect(contrastPairs).not.toContainEqual([...pair]);
  });

  it("holds every shipped set above the perceivability floor there", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const ratio = contrastRatio(
        compositeOver(theme.colors.selection, theme.colors.selectedActive),
        theme.colors.selectedActive,
      );
      const floor = contrastFloors[theme.contrast].surface;
      return ratio >= floor ? [] : [`${theme.name}: ${ratio} < ${floor}`];
    });
    expect(failures).toEqual([]);
  });

  it("pins the pressed fill's tightest figure", () => {
    const worst = shippedThemes
      .map(
        ({ theme }) =>
          [
            theme.name,
            contrastRatio(
              compositeOver(theme.colors.selection, theme.colors.selectedActive),
              theme.colors.selectedActive,
            ),
          ] as const,
      )
      .reduce((tightest, current) =>
        current[1] < tightest[1] ? current : tightest,
      );
    expect([worst[0], Number(worst[1].toFixed(3))]).toEqual([
      "High contrast dark",
      1.185,
    ]);
  });

  it("reports a highlight erased on the pressed fill", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { selection: alpha(light.colors.selectedActive, 0.4) },
    });
    const erased = themeContrastFailures(regressed).filter(
      ({ foreground, background, wash }) =>
        foreground === "selection" &&
        background === "selectedActive" &&
        wash === "selection",
    );

    expect(erased).toHaveLength(1);
    expect(erased[0]?.pairClass).toBe("surface");
    expect(erased[0]?.floor).toBe(contrastFloors.default.surface);
    // The planted wash is still visible on the other surfaces, so the case names
    // the missing pair and not a broken palette.
    expect(
      themeContrastFailures(regressed).filter(
        ({ foreground, background, wash }) =>
          foreground === "selection" &&
          background !== "selectedActive" &&
          wash === "selection",
      ),
    ).toEqual([]);
  });
});
```

### 3. `packages/tokens/src/disabled-wash.test.ts`

Its header names plan 524 as the owner of the `disabled` entry; add one sentence
that plan 723 gives the list its second pointer-state entry (the pressed selected
row) so a reader of that file knows the list has grown. Do not change its cases.

### 4. `docs/tokens.md`

Three passages name the wash list. Each gains the pressed row:

- Search `` `selectionWashPairs` holds the wash itself to the `` (the
  `selectionSurfaces` paragraph, ~line 1681): after "on each surface" add "and on
  the `disabled` fill an unavailable label keeps and the pressed `selectedActive`
  a chosen row holds (plan `723`)".
- Search `It also holds the `disabled` fill` (~line 2364): add the second entry
  and the reason:

  ```md
  It also holds the `disabled` fill, because plan `510` measures the unavailable
  label through this wash on the fill it keeps — a highlight that matches that
  fill would erase the selection while every text pair still passed — and the
  pressed `selectedActive` fill, because a reader click-drags across a chosen
  row's text with the button held, so that is the pointer state the selection
  lands on (plan `723`).
  ```

- Search `` `selectionWashPairs` holds the wash itself to the 1.05:1 `` (the
  Verification paragraph, ~line 3962): extend "on each plain surface and on the
  `disabled` fill an unavailable label keeps" with "and on the pressed
  `selectedActive` a chosen row keeps under the pointer".

### 5. `docs/design-system.md`

The interaction-state table's `text selection` row (§8) ends the wash clause with
"including on the `disabled` fill an unavailable label keeps". Add:

```md
including on the `disabled` fill an unavailable label keeps and on the pressed
`selectedActive` a chosen row keeps under the pointer (plan `723`)
```

`docs.test.ts` pins no exact text for this clause (it derives rows from the pair
lists), so only the page changes.

### 6. `packages/tokens/README.md`

The selection paragraph (search `` `selectionWashPairs` also holds the ``) gains:

```md
including the `disabled` fill an unavailable label keeps, because plan 510
measures that label through the same wash, and the pressed `selectedActive` a
chosen row keeps while the button is held, because that is when a reader drags a
selection across it (plan 723)
```

### 7. `COMPONENTS.md`

- **Theme contrast check** row: `10 wash pairs` → `11 wash pairs`.
- Append to the same row, before the closing `|`:

  ```md
  Plan `723` holds the selection wash on the pressed selected row — a reader
  click-drags across a chosen row's text with the button held, so the fill under
  the highlight is `selectedActive` (plan 651), but the wash walk held the nine
  `selectionSurfaces` — `hover` and `active`, the pointer states of an
  *unselected* row, among them — plus the `disabled` fill, and never the pressed
  one; a theme whose wash composited to `selectedActive` returned `[]` from
  `themeFailures` while the highlight measured **1.000:1** there. The pair joins
  `selectionWashPairs` (10 → 11), every shipped set already clears the floor
  **1.185:1** at the tightest (`High contrast dark`), so no colour moves and
  `contrastPairs` stays 464.
  ```

### 8. `TODO.md`

Add one completed row at the end of *Design tokens and theming* and move the
counter `327/405` → `328/406` (both the header bar and the fraction):

```
`[x]` Hold the selection wash on the pressed selected row — a reader
click-drags across a chosen row's text with the button held, so the fill under
the highlight is `selectedActive`, but `selectionWashPairs` held the nine
`selectionSurfaces` (the pointer states of an *unselected* row, `hover` and
`active`, among them) plus the `disabled` fill and never the pressed one, and
plans 651/689/700 justified the exclusion with "a row is selected at rest" —
a reason the list itself contradicts; a theme whose wash composited to
`selectedActive` returned `[]` from `themeFailures` while the highlight measured
**1.000:1**. The pair joins the wash walk (10 → 11), every shipped set already
clears **1.185:1** at the tightest (`High contrast dark`), so no colour moves and
`contrastPairs` stays 464 (plan 723)
```

### 9. `.agents/slop/plans/README.md`

Add one row after `720`:

```
| [723](./723-pressed-row-selection-wash.md) | The pressed selected row's text selection | F | 081, 524, 651, 689, 700 | done |
```

Add a paragraph after the `720` summary with the defect, the one added wash pair,
the measured tightest figure and the fact that no shipped set or role moves.

## Commands

Run from the worktree root.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New regression only | `nub run --filter @gpuixui/tokens test -- src/selection-press-wash.test.ts` | pass after the change; the wash pair named once |
| Prove it fails without the fix | remove the new `selectionWashPairs` entry and rerun the command above | "publishes the wash on the pressed fill once" and "reports a highlight erased on the pressed fill" fail; the shipped cases fail on the pin |
| Package suite | `nub run --filter @gpuixui/tokens test` | every file green |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | all workspaces' suites pass |

`scripts/verify-two-directions.sh` is still written against `jj` while the repo
pins git (a cross-team row in `TODO.md`), so the both-directions proof is the
manual sequence above: the pair-existence case and the planted case must fail
with the entry removed and pass with it restored.

## Test plan

- **Can the new test fail?** Yes. The pair-existence case requires an entry that
  does not exist on the pre-fix tree, and the planted case requires a
  `selection`/`selectedActive` `surface` failure the pre-fix checker cannot emit
  because it never reads that surface.
- **Surgical witness:** the planted theme's wash stays visible on the other ten
  entries (40% of a distinct fill), so the case fails only for the missing pair.
- **Shipped sets:** all 24 clear 1.05:1 on the pressed fill; the tightest is
  `High contrast dark` at **1.185:1**, pinned from the source.
- **No colour move:** the probe measured every set; the existing contrast,
  selection, platform, direction, docs and inventory suites must stay green.
- **No list move:** `selectionSurfaces` stays nine (the caret figures derive from
  it), and `contrastPairs` stays 464.

## Acceptance

- [ ] `selectionWashPairs` holds `["selection", "selectedActive", "surface"]`
      once and `contrastPairs` does not.
- [ ] `themeContrastFailures` reports the planted erased highlight and returns
      `[]` for every shipped set.
- [ ] `selectionWashPairs` is 11 pairs; `contrastPairs` is 464.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
      `COMPONENTS.md`, `TODO.md` and the plan index state the new entry, the
      count and the figure, and the pressed row's exclusion from the scrim and
      elevation walks survives in the catalogue.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## STOP conditions

- **Any shipped set below the 1.05:1 wash floor on `selectedActive`** → stop and
  report the set and ratio. The probe says the tightest is 1.185:1; do not move a
  palette from this plan.
- **The planted wash fails on a surface other than `selectedActive`** → stop and
  report: the witness is no longer surgical, and the planted fraction must change
  until it is.
- **A guard wants `selectedActive` inside `selectionSurfaces`** → leave the pair
  explicit and report the guard: that index also derives the caret's four
  "nine surfaces" figures, and growing it silently changes that guarantee.
- **A guard wants the pressed row's text roles moved into the washed lists** →
  stop and report: plan 700 settled that they live at rest in
  `selectionPressPairs`, and this plan does not reopen it.
- **A docs or inventory guard disagrees with the derived count** → update the
  document to the list, never the list to the prose.
- **A gate fails in a file this plan does not own** → report it; do not edit
  another workstream's tree.

## Execution (2026-10-20)

- `selectionWashPairs` now holds `["selection", "selectedActive", "surface"]`
  after the `disabled` entry; the list is **11** pairs and `contrastPairs` stays
  **464**.
- Tightest shipped ratio on the new pair: **1.185:1** (`High contrast dark`);
  the list's own tightest stays 1.061:1 (the same set, on `active`). No colour,
  floor, metric or role moves.
- `selectionSurfaces` is untouched at nine, so the caret's four "nine surfaces"
  figures and `caretInkPairs` are unchanged.
- The new regression fails with the entry removed (the pair-existence case, the
  pin and the planted erased-highlight case) and passes with it restored. The
  package suite, `nub run check` and the repo test gate are recorded in the
  commit.
