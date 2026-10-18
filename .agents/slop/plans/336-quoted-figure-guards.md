# 336 — The catalogue's last unpinned tightest figures

Phase: F (docs truth) · Workstream: `tokens-theme` ·
Depends on: 071, 075, 326, 335 · Block: `300–399` (free)

## 1. The defect

`docs/tokens.md` quotes eight **current** tightest contrast figures that no test
holds:

| Sentence | Pair | Quoted | Theme |
| -------- | ---- | ------ | ----- |
| “the tightest shipped pair is …” | `primaryText` on `selected` | **4.53:1** | Linux dark |
| row text | `foreground` on `selected` | **7.47:1** | Linux dark |
| row text | `popoverForeground` on `selected` | **7.95:1** | Linux dark |
| row text | `selectedForeground` on `active` | **5.21:1** | macOS light |
| row text | `selectedForeground` on `accent` | **5.81:1** | macOS light |
| status text | `successText` on `muted` | **5.92:1** | Aero light |
| field edge | `border` on `input` (weakest shipped set) | **1.25:1** | Linux dark |
| modal scrim | AAA dark `overlay` on its canvas | **1.388:1** | identity dark high |

Every **pair** is enforced by `contrastPairs` and the shipped-set loops, so a
palette edit that drops a pair below its floor fails. What is not enforced is
the **figure**: which set is the tightest, and what it measures. Plan 075 fixed
this for the warning and selection-wash figures, plan 326 for the contract's
sizes, and plans 334/335 pin their own new figures — these eight predate that
discipline and can go stale while every test stays green. That is a documentation
lie: a reader comparing an edited theme to “5.92:1 (Aero light)” would be
reading a number the package no longer produces.

This plan adds no token, pair, floor or document value. It is a test that
derives each quoted figure from the shipped themes.

## 2. Baseline (measured, current)

A probe over the shipped sets gives exactly the quoted values, rounded to two
decimals (`node` probe against `dist`; `toFixed(2)`):

```
linux dark   primaryText/selected          4.532390365726041  -> 4.53
linux dark   foreground/selected           7.466053059334611  -> 7.47
linux dark   popoverForeground/selected    7.945323430376959  -> 7.95
darwin light selectedForeground/active     5.212495716229169  -> 5.21
darwin light selectedForeground/accent     5.808778602167973  -> 5.81
aero light   successText/muted             5.923998506213205  -> 5.92
linux dark   border/input                  1.2532746770118144 -> 1.25
identity dark high overlay/background (composited)            -> 1.388
```

AAA dark `overlay` is `#FFFFFF26`; `0x26 / 255 = 14.9%`, which the page calls a
“15% white wash”. Each is the **only** tightest set for its pair (the next set
is 5.37, 8.62, 9.17, 7.49, 7.80, 5.96 and 1.30 respectively), so the labels are
unambiguous.

## 3. Files to change

### 3.1 `packages/tokens/src/docs.test.ts` (the only source change)

Add one `describe("docs/tokens.md quoted tightest figures", …)` after the
existing `quoted figures` block (it currently ends around the warning-figure
case). Imports to add:

- `compositeOver` is already imported; `contrastRatio` is already imported.
- `getTheme`, `themeModes` from `./theme.js` (alongside the existing
  `getPlatformTheme`, `highContrastThemes`, `themes`).
- `getPlatformRecipeTheme` and `type PlatformRecipeName` from
  `./platform-recipes.js` (it already imports `platformRecipeNames`).
- `type PlatformName` from `./platforms.js` (it already imports `platformNames`).
- `type ThemeColors` from `./color.js` (it already imports `alpha`,
  `colorRoles`, `palette`).

Build the documentation's own labels, so a label cannot drift either:

```ts
const platformLabels: Readonly<Record<PlatformName, string>> = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows",
  default: "Default",
};

const recipeLabels: Readonly<Record<PlatformRecipeName, string>> = {
  xp: "XP",
  aero: "Aero",
};

const quotedSets: ReadonlyArray<readonly [string, typeof themes.light]> = [
  ...themeModes.map(
    (mode): readonly [string, typeof themes.light] => [
      `identity ${mode}`,
      getTheme(mode),
    ],
  ),
  ...themeModes.flatMap((mode) =>
    platformNames
      .filter((platform) => platform !== "default")
      .map((platform): readonly [string, typeof themes.light] => [
        `${platformLabels[platform]} ${mode}`,
        getPlatformTheme(platform, mode),
      ]),
  ),
  ...platformRecipeNames.map((recipe): readonly [string, typeof themes.light] => [
    `${recipeLabels[recipe]} light`,
    getPlatformRecipeTheme(recipe, "light"),
  ]),
];
```

(`typeof themes.light` is the `Theme` type already in scope through the imported
record; if a weaker executor prefers, import `type Theme` from `./theme.js` and
use that — do not add a cast.)

```ts
const tightest = (
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
): readonly [string, number] =>
  quotedSets
    .map(
      ([label, theme]) =>
        [label, contrastRatio(theme.colors[foreground], theme.colors[background])] as const,
    )
    .reduce((worst, current) => (current[1] < worst[1] ? current : worst));
```

Case 1 — the six pair figures. For each tuple, assert the derived label and
two-decimal value, then that the whitespace-collapsed page contains the sentence
fragment:

```ts
const quoted = [
  ["primaryText", "selected", "Linux dark", 4.53],
  ["foreground", "selected", "Linux dark", 7.47],
  ["popoverForeground", "selected", "Linux dark", 7.95],
  ["selectedForeground", "active", "macOS light", 5.21],
  ["selectedForeground", "accent", "macOS light", 5.81],
  ["successText", "muted", "Aero light", 5.92],
] as const;

for (const [foreground, background, label, value] of quoted) {
  const [actualLabel, ratio] = tightest(foreground, background);
  expect([actualLabel, Number(ratio.toFixed(2))], `${foreground}/${background}`)
    .toEqual([label, value]);
  expect(prose).toContain(
    `\`${foreground}\` on \`${background}\` at **${value}:1** (${label})`,
  );
}
```

Case 2 — the weakest field edge. Derive it the same way and assert the page's
different phrasing:

```ts
const [edgeLabel, edgeRatio] = tightest("border", "input");
expect([edgeLabel, Number(edgeRatio.toFixed(2))]).toEqual(["Linux dark", 1.25]);
expect(prose).toContain(
  `the weakest shipped set is ${edgeLabel} at **1.25:1**`,
);
```

Case 3 — the AAA scrim. Derive the value, the alpha percentage and the ratio
from the theme, not from the document:

```ts
const scrimTheme = highContrastThemes.dark;
const scrim = scrimTheme.colors.overlay;
const painted = compositeOver(scrim, scrimTheme.colors.background);
const scrimRatio = Number(
  contrastRatio(painted, scrimTheme.colors.background).toFixed(3),
);
const percent = Math.round((Number.parseInt(scrim.slice(7), 16) / 255) * 100);

expect([scrim, percent, scrimRatio]).toEqual(["#FFFFFF26", 15, 1.388]);
expect(prose).toContain(`${scrim}, ${scrimRatio}:1`);
expect(prose).toContain(`${percent}% white wash`);
```

`prose` is the same local the existing cases build:
`markdown.replace(/\s+/g, " ")` — use that name inside the new case.

### 3.2 `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)”, after the plan-335 row:

```
`[x]` Pin the catalogue's last unpinned tightest figures — the eight current
ratios it quotes (the four row-text values, `successText` on `muted`, the field
edge, the AAA scrim and its wash strength) were computed once by hand and no
test held them, so a palette edit could leave the page quoting a number the
package no longer produces while every pair still passed; `docs.test.ts` now
derives each figure, its theme label and the scrim's percentage (plan 336)
```

Keep the progress bar current (`103/136` → `104/137`).

### 3.3 `.agents/slop/plans/README.md`

- Table row after 335:

```
| [336](./336-quoted-figure-guards.md) | The catalogue's last unpinned tightest figures | F | 071, 075, 326, 335 | done |
```

- Rationale paragraph after the 335 paragraph: eight current figures were quoted
  but unpinned; `docs.test.ts` derives each one, its theme and the scrim
  percentage, so the page cannot quote a ratio the shipped themes no longer
  produce. No token, pair or document value changes.

## 4. Commands and expected results

```bash
nub run --filter @gpuixui/tokens test
```

Expected: **57 test files, all green**; the new case adds assertions to the
existing `docs.test.ts`, so the file count is unchanged and the test count grows
by one case.

```bash
nub run check
nub run lint
nub run test
```

Expected: all green. A failure outside `packages/tokens` or `TODO.md` is another
workstream's: stop and record it.

## 5. Two-directions proof

1. Change one quoted figure in `docs/tokens.md` (for example `5.92:1` →
   `5.93:1`) and run
   `nub run --filter @gpuixui/tokens test -- src/docs.test.ts`. Expect the new
   case to fail naming `successText`/`muted`. Restore the figure.
2. Change a palette value that moves a quoted pair (for example the Linux dark
   `primaryText`) and confirm the derived-label assertion fails. Restore it.
3. Record both observed outputs in the commit message; do not claim the proof
   without running it.

## 6. STOP conditions

- A derived figure does not match the page. Then the document is stale: correct
  the page to the derived value (and the theme label) in this plan, and say so in
  the outcome. Do not change a token to match a document.
- More than one theme ties for the tightest value. Then the label in the page is
  ambiguous: stop, record the tie, and amend the page to name the set the
  contract's reduction actually reports.
- `docs.test.ts` would need a cast, an `any`, or a duplicate `Theme` type to
  compile. Stop and record it; the tokens package does not accept unsafe types
  for a documentation guard.

## 7. Acceptance criteria

- Every current tightest figure quoted in `docs/tokens.md` is derived by a test,
  including its theme label and the AAA scrim's percentage.
- No token, pair, floor or document value changes.
- The new case fails when a quoted figure is edited and when the underlying
  palette value moves (both directions observed).
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` pass; the work is committed on `agent/tokens-theme` and pushed.

## 8. Outcome (recorded by the executor)

- All eight derived figures matched the page exactly at two decimals, including
  the theme labels and the AAA scrim (`#FFFFFF26`, 15%, 1.388:1). No document
  value changed.
- Two directions observed, twice:
  - editing the quoted `successText` figure (`5.92:1` → `5.93:1`) failed
    `docs.test.ts` with **1 failed | 74 passed**;
  - moving the Linux dark `primaryText` one step failed the same case with the
    same counts;
  - both were restored, and the file passes.
- The case is three tests (the six pair figures, the field edge, the scrim), so
  the suite moved from 3686 to **3689 tests** in the same **57 files**.
- `nub run check`, `nub run lint` and `nub run test` pass.
