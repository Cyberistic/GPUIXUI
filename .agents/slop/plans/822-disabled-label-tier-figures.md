# 822 — The disabled label's tier figures, and the one attributed to the wrong set

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `392`, `500`,
`510`, `520`, `537`, `623`, `729`.

## 1. The defect

`docs/tokens.md` §*Inactive* explains the disabled label's place in the text
hierarchy after plans `510` and `520` moved its value:

> The values stay below `mutedForeground` by 1.301:1 (identity dark) and
> 1.168:1 (AAA dark) at the tightest, and **1.542:1 below
> `softActionForeground` (identity dark)**, so an unavailable label is still
> distinguishable from secondary text …

The last figure belongs to **high-contrast dark**, not identity dark. Measured
on this tree with the measurement `themeTextTierFailures` uses:

| Pair | Set | Tightest surface | Step |
| ---- | --- | ---------------- | ---- |
| `disabledForeground` below `mutedForeground` | identity dark | `input` | 1.3009 |
| the same | high-contrast dark | `infoSoft` | 1.1684 |
| `disabledForeground` below `softActionForeground` | identity dark | `softAction` / `successSoft` | **1.8767** |
| the same | high-contrast dark | `softAction` / `successSoft` | **1.5424** |

So the sentence quotes the AAA figure and attributes it to the identity's dark
palette. Plan `537` found exactly this provenance error on the *other* passage
(the §*Text hierarchy* list, where it said "identity dark" for `1.542:1` and was
corrected to high-contrast dark) but this sentence kept it.

`figures.ts`'s `panelActionTierFigure` already derives `1.542:1` and holds the
§*Text hierarchy* sentence; `figures.test.ts` also rebuilds the design system's
one summary sentence, which lists the same figure without a provenance. The
catalogue's §*Inactive* sentence and the design system's §*Text selection* prose
("staying 1.301:1 (identity dark) and 1.168:1 (AAA dark) below secondary text at
the tightest") are read by no test — `1.301` appears in no suite at all — so a
palette edit that moves either role leaves both passages quoting a figure the
package no longer produces, and the wrong-set attribution survived the plan that
fixed its twin.

No colour, pair, floor, metric, role or shipped theme moves: every figure except
the provenance is correct today.

## 2. What the package produces today

```
identity dark      disabled below muted   1.3009  (input)
high-contrast dark disabled below muted   1.1684  (infoSoft)
identity dark      disabled below panel   1.8767  (softAction = successSoft)
high-contrast dark disabled below panel   1.5424  (softAction = successSoft)
```

`softAction` and `successSoft` resolve to one colour in the dark identity
palettes, which is why the two surfaces tie; the figure table names
`successSoft`, and this plan does not change it.

## 3. Decisions

1. **Correct the provenance, not the number.** The catalogue says
   `1.542:1 … (identity dark)`; it becomes `1.542:1 … (high-contrast dark, where
   identity dark measures 1.877:1)`, so the reader meets both figures and can
   tell which set produces the tightest step.
2. **Add a purpose-named claims suite**, matching plans `815`, `818` and `821`:
   these are two documents' narrative restatements, not a `documentedFigures`
   entry with one sentence form. The suite derives every figure with the
   `tierStep`/`tierMinimum` measurement the hierarchy check uses (via
   `tierSurfaces` and `contrastRatio`), so it reads the same paint the contract
   does.
3. **Do not move a value.** The four figures are correct; one attribution is
   wrong and two passages are unowned.

## 4. Files to change

1. **create** `packages/tokens/src/disabled-label-tier-claims.test.ts`.
2. `docs/tokens.md` — the §*Inactive* sentence's last figure's provenance.
3. `TODO.md` — a ticked row and the workstream counter.
4. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.

No token value, pair, floor, metric, role or shipped theme changes.

## 5. Step 1 — `packages/tokens/src/disabled-label-tier-claims.test.ts`

Header states the bug: the catalogue attributes the `1.542:1`
`disabledForeground`-below-`softActionForeground` step to identity dark, which
measures `1.877:1`; `1.542:1` is the high-contrast dark set's, and the two
documents' passages that state the three figures are read by no test (`1.301`
appears in no suite).

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastRatio`, `extendTheme`, `getTheme`, `shippedThemes`,
`textTierSurfaces` from `./index.js`; `type ThemeColors` from `./color.js`.

Helpers (module scope):

```ts
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

/** The step from a dimmer role to a brighter one, as the hierarchy checks it. */
const step = (
  colors: ThemeColors,
  surface: keyof ThemeColors,
  dimmer: keyof ThemeColors,
  brighter: keyof ThemeColors,
): number =>
  contrastRatio(colors[brighter], colors[surface]) /
  contrastRatio(colors[dimmer], colors[surface]);

/** The tightest step of one pair over the surfaces both roles are text on. */
const tightest = (
  colors: ThemeColors,
  dimmer: keyof ThemeColors,
  brighter: keyof ThemeColors,
) => … // textTierSurfaces(dimmer) ∩ textTierSurfaces(brighter), min by step

const fixed = (value: number): string => value.toFixed(3);

const catalogueInactive = /* slice of ../../../docs/tokens.md between
  "The values stay below `mutedForeground` by" and "The parts are public too." */;
const designInactive = /* slice of ../../../docs/design-system.md between
  "staying 1.301:1 (identity dark)" and "The same gap exists one role over." */;
```

Cases:

1. **the disabled label's step below secondary text is the shipped one** — for
   `getTheme("dark")` and `getTheme("dark", "high")`, `tightest(colors,
   "disabledForeground", "mutedForeground")` is `1.301` and `1.168`; both the
   catalogue and design-system slices quote `1.301:1 (identity dark)` and
   `1.168:1 (AAA dark)`.
2. **the panel action's step belongs to the high-contrast set** — identity
   dark's `tightest(colors, "disabledForeground", "softActionForeground")` is
   `1.877` and high-contrast dark's is `1.542`; the catalogue slice contains
   `1.542:1 below \`softActionForeground\` (high-contrast dark, where identity
   dark measures 1.877:1)` and does not contain the pre-fix
   `1.542:1 below \`softActionForeground\` (identity dark)`.
3. **the guard reads the page, not a constant** — a `names(slice, figure, set)`
   predicate returns `true` on the catalogue slice and `false` on the pre-fix
   sentence plan `537`/`510` wrote, and on the slice with one digit changed.
4. **the figures can move** — `extendTheme(getTheme("dark"), { colors: {
   disabledForeground: getTheme("dark").colors.mutedForeground } })` derives
   `1.000` for the first pair, so the page's `1.301` claim would be false and the
   predicate fails; the tree needs no change, because the shipped values are
   correct.

## 6. Test plan

```sh
nub run --filter @gpuixui/tokens test src/disabled-label-tier-claims.test.ts
```

Expected after: one file, four cases green.

**Prove every case in both directions** (apply, run the file, restore):

1. Restore `(identity dark)` after `1.542:1` in the catalogue: case 2 fails.
   Before the suite exists the same restoration leaves the whole package suite
   green — the §1 evidence.
2. Change `1.301` to `1.302` in both documents: case 1 fails on each.
3. Change `(AAA dark)` to `(identity dark)` beside `1.168`: case 1 fails.
4. Set identity dark's `disabledForeground` to its `mutedForeground` in
   `src/color.ts`: case 1 fails (`1.000`) and case 4's planted palette proves
   the same. Restore.
5. Reflow a passage across lines: passes — `prose` normalises whitespace.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

No native scenario changes: no runtime behaviour or token value moves. Record
the ids that were run (none) in the execution record.

## 7. STOP conditions

- Stop if a colour, pair, floor, metric or shipped theme has to move. All four
  figures are correct; one attribution is wrong.
- Stop if correcting the provenance needs a value change (e.g. identity dark's
  own figure does not measure as stated); record it in `TODO.md` instead.
- Do not touch `figures.ts` or its `panelActionTierFigure`: it owns the
  §*Text hierarchy* sentence and the design system's summary, both of which are
  already derived.
- Do not add the design system's summary sentence to this guard: `figures.test.ts`
  rebuilds it whole, so a second reader would be duplicated ownership.

## 8. Acceptance

- `disabled-label-tier-claims.test.ts` derives all four figures with the
  hierarchy's own measurement, holds both passages, rejects the pre-fix
  attribution, and proves the figures can move.
- The catalogue names high-contrast dark for `1.542:1` and states identity
  dark's `1.877:1`; no other prose value changes.
- Each mutation in §6 fails the file, and the tree is restored afterwards.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are clean.
- `TODO.md` ticks the row and keeps the counter current; the plan index lists
  `822`.

## 9. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states: restoring
  `1.542:1 below \`softActionForeground\` (identity dark)` in the catalogue failed
  case 2 of the new suite and left the rest of the package green.
  `disabled-label-tier-claims.test.ts` derives the four figures with
  `textTierSurfaces` and the hierarchy's ratio-of-ratios measurement:
  identity dark `1.301` (`input`), high-contrast dark `1.168` (`infoSoft`),
  identity dark `1.877` and high-contrast dark `1.542` for the panel action.
- Every §6 mutation was applied alone, the new file run and the tree restored:
  the restored attribution failed case 2; `1.301` → `1.302` in both pages failed
  cases 1 and 3; `(AAA dark)` → `(identity dark)` failed case 1; identity dark's
  `disabledForeground` at `#8B93A1` failed cases 1 and 2 (`2.016` and `2.909`);
  the restored tree passed.
- The catalogue's §*Inactive* sentence now reads "1.542:1 below
  `softActionForeground` (high-contrast dark, where identity dark measures
  1.877:1)". The design system needed no figure change; both passages are now
  held.
- `nub run --filter @gpuixui/tokens test` → **224 files / 7147 tests** green
  (223 / 7143 before; one file with four cases added). `nub run check` clean.
- **No native scenario was run**: no runtime code or token value moves, and this
  worktree has no `apps/playground/dist` build (`apps/playground/dist/smoke/run.js`
  is absent — the playground build is blocked by `BLOCKERS.md` B1, another
  workstream's task).
