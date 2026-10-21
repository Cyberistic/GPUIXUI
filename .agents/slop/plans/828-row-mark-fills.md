# 828 — The unread dot's two row fills, and the ledger rows plan 698 left behind

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `332`, `341`,
`351`, `511`, `557`, `619`, `651`, `698`, `705`, `806`, `823`.

## 1. The defect

Plan `332` split a solid role into a fill and a **mark**, and every later plan
that found a mark painted somewhere new added its surface: `341` the combobox
check on the `hover` wash, `563`/`557` the native caret on the field's `input`
fill, `698` the selected option's check on the `selected` and `selectedActive`
fills, `347`/`733` the progress fill and the switch knob on `track`.

One shipped mark is still only half measured. The Notification centre draws its
unread dot with `primary` (`components/src/notification-centre.tsx`, six pixels,
`backgroundColor: theme.colors.primary`), and its row paints **three** fills:

```tsx
backgroundColor: active ? theme.colors.accent : undefined, // the current row
hover: { backgroundColor: theme.colors.hover },            // under the pointer
active: { backgroundColor: theme.colors.active },          // while pressed
```

`markPairs` holds `primary` on `hover` (plan `341`), on `selected` and
`selectedActive` (plan `698`), on the four plain surfaces and on `track`. It does
**not** hold `primary` on `accent` or on `active`, so an edited theme whose accent
fill collapses into the dot's fill returns `[]` from every check while the dot
disappears on a hovered or pressed row — the exact failure plan `698` closed one
state over. Measured on this tree with the shipped light theme:

```ts
extendTheme(lightTheme, { colors: { accent: lightTheme.colors.primary } })
themeFailures(...) // []  — and the dot measures 1.000:1 on the row it marks
```

The ledger already names the composition: `TODO.md`'s cross-team row asks
`components` to move the dot to `primaryText` because "the row's own states take
the dot onto the `active` pressed wash and the `accent` fill". The contract never
confirms either.

The same two rows of the ledger are also **stale**, because plan `698` moved
macOS dark's accent from `#0A84FF` to `#2E93FF` and plan `705` swept five
documents — but not `TODO.md`:

| Passage | Says today | Measures today |
| ------- | ---------- | -------------- |
| `TODO.md` Notification row | macOS dark's `primary` is **2.836:1** on `active` and **2.748:1** on `selected`, "under the 3:1 mark floor, so a pressed or selected unread notification loses its dot" | **3.317:1** on `active`, **3.214:1** on `selected` — over the floor in all 24 shipped sets |
| same row | `primaryText` "clears the same surfaces at 5.587:1 and 5.675:1" | 5.587:1 (`active`) and **5.688:1** (`selected`), both `Dark · Windows` |
| `TODO.md` Accordion row | `primary` "measures 4.21:1 on the macOS light canvas and **3.82:1 on a card**" | 4.209:1 on that canvas, 4.392:1 on its quiet panel, **4.697:1 on its card** — the card clears 4.5:1 in all twelve light sets |

`3.82:1` is not a composition the current palette produces at all: it was plan
`332`'s "tightest shipped mark" across every role and surface, quoted beside the
accordion's *card*. A live cross-team row is the instruction the next person
follows; both rows now argue from numbers the package no longer produces, and one
argues from a conclusion it refutes.

No colour, pair, floor, metric, role, platform style or shipped theme is wrong:
the defect is one missing surface pair and three ledger sentences.

## 2. What the package produces today

`primary` as a mark, per surface, across all 24 `shippedThemes`, with the floor
each set declares (`contrastFloors[theme.contrast].mark`, 3 default / 4.5 AAA):

```
background     4.2090 (Light · macOS)   .. 13.4148   measured
card           4.4688 (Dark · macOS)    .. 12.4154   measured
popover        4.4688 (Dark · macOS)    .. 11.7683   measured
muted          4.3924 (Light · macOS)   .. 11.1179   measured
input          4.6967 (Light · macOS)   .. 12.4154   measured
hover          3.6391 (Dark · macOS)    ..  8.8215   measured (plan 341)
accent         3.7572 (Dark · macOS)    ..  9.6511   UNMEASURED
active         3.3170 (Dark · macOS)    ..  7.4369   UNMEASURED
selected       3.2141 (Dark · macOS)    ..  7.9760   measured (plan 698)
selectedActive 3.8341 (Light · macOS)   ..  9.5111   measured (plan 698)
track          3.1488 (Light · macOS)   ..  7.5437   measured (plan 347)
```

Every set clears its own mark floor on all eleven surfaces, so adding the two
pairs moves no colour. `primaryText` on the same row fills, for the row's
replacement evidence: `accent` 7.1022 (Light · Windows XP), `active` 5.5869
(Dark · Windows), `selected` 5.6879 (Dark · Windows).

## 3. Decisions

1. **Extend the row-fill mark list; do not add a Notification-specific export.**
   `comboboxCheckPairs` is private and is already the `primary`-on-a-row-fill
   list; it becomes `rowMarkPairs` over the five fills a row paints (`hover`,
   `accent`, `active`, `selected`, `selectedActive`) with both compositions named
   in its JSDoc. One list, one class, no duplicate composition.
2. **Only `primary`.** The unread dot is `primary`; `success`/`destructive` marks
   paint on plain surfaces, on the field's `input` fill and on `track`, never
   directly on a row fill in a shipped component. A fifth status family or a new
   glyph adds its own list when it ships.
3. **Correct the ledger; do not touch history.** `TODO.md`'s two live cross-team
   rows are current-state claims and get today's figures. Ticked rows and plan
   narratives that record the pre-698 fill (`TODO.md` plan `557`, the catalogue
   audit, the source JSDoc) stay as written: they state what was measured then.
4. **Keep both cross-team rows.** The unread dot still belongs on `primaryText`
   — the ink is the designed mark role on a row wash and carries 5.587–7.102:1
   against the fill's 3.214–3.757:1 — but the row now says *why* instead of
   claiming a dot that is invisible today. The accordion trigger still belongs on
   `primaryText`: its canvas and quiet-panel measurements are under the secondary
   floor, and only its card is not.
5. **No value moves.** Every shipped set already passes both new pairs at
   3.757:1 and 3.317:1 at the tightest.
6. **A purpose-named claims suite**, matching plans `815`, `818`, `821`, `823`:
   the contract's new list, the ledger's two rows and the documents' mark
   enumerations are held from `markPairs`, `shippedThemes` and
   `contrastFloors`, and the guard proves it can fail.

## 4. Files to change

1. `packages/tokens/src/contrast.ts` — rename `comboboxCheckPairs` to
   `rowMarkPairs`, add `accent` and `active`, update both JSDoc blocks.
2. `packages/tokens/src/primary-mark-claims.test.ts` — the expected mark-surface
   list gains `accent` and `active` in contract order.
3. `packages/tokens/src/contrast.test.ts` — `contrastPairs.length` 470 → 472.
4. `packages/tokens/src/resting-fill-scrim.test.ts` — same count.
5. `packages/tokens/src/row-mark-claims.test.ts` — **create**.
6. `docs/tokens.md` — the brand-action mark enumeration, the verification
   paragraph's mark list, and the pair-count history (`396 to **470**` → `472`,
   plans list gains `828`).
7. `docs/design-system.md` — §9's graphic-marks floor row.
8. `packages/tokens/README.md` — the front door's `primary` mark enumeration.
9. `COMPONENTS.md` — the live "the same 470 contrast pairs" phrase and the
   graphic-mark description in the Theme contrast check row.
10. `TODO.md` — the two live rows, a ticked row for this plan, the workstream
    counter (`378/453` → `379/454`).
11. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.

## 5. Step 1 — `packages/tokens/src/contrast.ts`

Replace the private list and its JSDoc (currently `comboboxCheckPairs`, above
`markPairs`) with:

```ts
/**
 * A `primary` mark painted directly on a row fill. Two shipped glyphs do:
 * `ComboboxItem` draws its check on the `hover` wash a highlighted row paints,
 * on the `selected` fill a chosen one keeps and on the `selectedActive` fill it
 * presses to; the Notification centre draws its unread dot on the same `hover`
 * wash, on the `accent` fill the current row paints and on the `active` wash a
 * pressed row paints.
 *
 * Plan 341 measured only the highlighted combobox surface, so a selected option
 * at rest painted its check with no pair behind it — macOS dark measured
 * **2.748:1** on `selected` while every check returned `[]` (plan 698); plan 698
 * added the chosen and pressed fills and moved the macOS dark accent one
 * designed step (`#0A84FF` → `#2E93FF`). The unread dot's own two fills were
 * never added: `accent` and `active` are the row states a list paints under the
 * pointer and while pressed, and an edited theme whose accent collapsed into
 * the dot's fill returned `[]` with the dot gone. All five are published inside
 * {@link markPairs}.
 */
const rowMarkPairs: readonly ContrastPair[] = [
  ["primary", "hover", "mark"],
  ["primary", "accent", "mark"],
  ["primary", "active", "mark"],
  ["primary", "selected", "mark"],
  ["primary", "selectedActive", "mark"],
];
```

Update `markPairs`' JSDoc to say "the combobox check and the unread dot on the
`hover`/`accent`/`active`/`selected`/`selectedActive` fills a row paints", and
spread `...rowMarkPairs`.

## 6. Step 2 — the count guards

`contrast.test.ts` and `resting-fill-scrim.test.ts` both assert
`contrastPairs.length`; 472. Nothing else in either file changes.

## 7. Step 3 — `packages/tokens/src/primary-mark-claims.test.ts`

The expected order is `markPairs` order, then `trackMarkPairs`:

```ts
expect(primaryMarks).toEqual([
  "background",
  "card",
  "popover",
  "muted",
  "input",
  "hover",
  "accent",
  "active",
  "selected",
  "selectedActive",
  "track",
]);
```

The suite's two document cases derive each surface from `primaryMarks`, so the
catalogue and README paragraphs must name `accent` and `active` too (§9).

## 8. Step 4 — `packages/tokens/src/row-mark-claims.test.ts` (new)

Header: the bug — the unread dot's `accent` and `active` fills were in no pair,
so a theme could erase it while `themeFailures` returned `[]`, and `TODO.md`'s
two live rows quote pre-698 and plan-332 figures.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastFloors`, `contrastRatio`, `contrastPairs`, `markPairs`,
`extendTheme`, `getPlatformTheme`, `getTheme`, `lightTheme`,
`themeContrastFailures`, `themeFailures` from `./index.js` (or the modules that
export them, following the neighbouring suites); `shippedThemes` from
`./shipped-themes.js`.

Cases:

1. **"holds a primary mark on every fill a row paints"** — the five fills are
   `hover`, `accent`, `active`, `selected`, `selectedActive`; derive them from
   `markPairs.filter(([role, , cls]) => role === "primary" && cls === "mark")`
   restricted to row fills, and assert exactly those five. Then, for every
   `shippedThemes` entry, assert `primary` clears
   `contrastFloors[theme.contrast].mark` on each, and assert the tightest pair is
   `3.2141` (`Dark · macOS`, `selected`).
2. **"reports a primary that collapses into a row fill"** — for `accent` and
   `active`, build `extendTheme(lightTheme, { colors: { [fill]: lightTheme
   .colors.primary } })` and assert `themeContrastFailures` contains
   `{ foreground: "primary", background: fill, pairClass: "mark" }`. This is the
   case that fails before step 1 and passes after it — the both-directions proof.
3. **"publishes the pair once"** — no repeated `[foreground, background, class]`
   in `contrastPairs` (a Set of joined keys), so the renamed list cannot double
   the `hover` pair.
4. **"states today's unread-dot figures"** — read `TODO.md` as one string and
   hold the Notification row to figures derived from
   `getPlatformTheme("darwin", "dark")`: `3.317` on `active`, `3.214` on
   `selected`, `5.587` on `active` and `5.688` on `selected` for `primaryText`;
   assert the row does **not** contain `2.836:1` or `2.748:1`, and that it names
   the two pair lists.
5. **"states the accordion's real surfaces"** — the row must contain `4.21:1`
   for the macOS light canvas and `4.39:1` for its quiet panel, must not contain
   `3.82:1`, and must name `primaryText`. Derive 4.209/4.392/4.697 from
   `getPlatformTheme("darwin", "light")` so a palette edit fails the row.
6. **"names the two row fills wherever the mark class is documented"** — read
   `docs/tokens.md`, `docs/design-system.md` and `packages/tokens/README.md`,
   and assert each names `` `accent` `` and `` `active` `` in its mark passage
   (the catalogue's brand-action paragraph, its verification paragraph, §9's
   graphic-marks row and the README paragraph).

Use `readFileSync` with `new URL(..., import.meta.url)` like the neighbouring
suites; `TODO.md` is `new URL("../../../TODO.md", import.meta.url)`.

## 9. Step 5 — the documents

- `docs/tokens.md`, brand-action paragraph: after "the `hover`/`selected`/
  `selectedActive` fills a chosen option marks" add "and the `accent`/`active`
  fills the Notification centre's unread dot sits on".
- `docs/tokens.md`, verification paragraph ("A solid role painted as a **mark**"
  … "so all three are measured"): name the unread dot's two fills beside the
  combobox check's three.
- `docs/tokens.md`, pair-count history: `**470**` → `**472**`, and the plan list
  gains `828` (keep the existing wrap).
- `docs/design-system.md`, §9 graphic-marks row: replace the trailing "plus the
  `selected` and `selectedActive` fills the chosen option marks" with the five
  fills and both glyphs, e.g. "… and `primary` on the `hover`/`accent`/`active`/
  `selected`/`selectedActive` fills a row paints under the combobox check and the
  Notification centre's unread dot".
- `packages/tokens/README.md`, `primary` paragraph: the same two fills, same
  wording as the catalogue.
- `COMPONENTS.md`: "the same 470 contrast pairs" → 472, and the Theme contrast
  check row's graphic-mark description gains the two fills.

## 10. Step 6 — `TODO.md`

Rewrite the live Notification row (currently lines 733–741):

```
`[ ]` Cross-team: `components` paints the Notification centre's unread dot with
the accent ink, not the fill — `notification-centre.tsx:833` marks an unread row
with a 6px `primary` dot, and the row paints `accent` while it is current,
`hover` under the pointer and `active` while pressed. The fill now clears the
mark floor on all five row fills in every shipped set (**3.214:1** at the
tightest, macOS dark on `selected`; 3.317:1 on `active`, 3.757:1 on `accent`,
since plan `698` moved that accent one designed step) and `rowMarkPairs` measures
all five, so the dot is no longer invisible — the ink is still the designed role
for a mark on a row and carries 5.587:1 (`active`) to 7.102:1 (`accent`) at the
tightest, plus the AAA margin, which is the care plan 557 applied to the native
field, one glyph over (plan 332's mark list and plan 828; owner: `components`)
```

Rewrite the live Accordion row so it states the canvas and the panel, not the
card:

```
`[ ]` Cross-team: `components` uses `primaryText` for the Accordion trigger's
hover label — `accordion.tsx:474` sets `color: primary` on hover, and the fill
role measures 4.21:1 on the macOS light canvas and 4.39:1 on its quiet panel,
under the 4.5:1 secondary floor, while the same fill clears 4.70:1 on its card;
`primaryText` is held on the six surfaces a link paints (plan 332; owner:
`components`)
```

Add a ticked row above them and bump the workstream counter to `379/454`.

## 11. Step 7 — the plan index

Add the row to the table and a closing paragraph, matching `821`–`825`:

```
| [828](./828-row-mark-fills.md) | The unread dot's two row fills, and the ledger rows plan 698 left behind | F | 332, 341, 351, 511, 557, 619, 651, 698, 705, 806, 823 | done |
```

## 12. Test plan and commands

From `packages/tokens`:

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
```

Expected: types clean; the suite green with **two more tests** than before
(226 files, 7157 → 7159 at the time of writing) and `contrastPairs.length` 472.

Both directions:

1. **Fails without the fix.** Before step 1, the new file's case 2 reports
   `[]` for both plants and case 1 has no `accent`/`active` pair; after step 1
   both pass. To re-prove it, comment out `...rowMarkPairs` in `markPairs`, run
   `nub exec vitest run src/row-mark-claims.test.ts`, expect the collapse case
   and the enumeration case to fail, then restore.
2. **The ledger guard can fail.** Replace `3.317:1` with `2.836:1` in the
   Notification row and `4.39:1` with `3.82:1` in the Accordion row, run the new
   file, expect both document cases to fail, then restore.

Then the root gates:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green.

**Native scenarios.** None. The change is a pair list, three documents, the
ledger and one test; no colour, metric or shipped theme moves, so no playground
scenario changes. Record "no scenario ran" in the commit message. If a later
step does move a value, run
`nub apps/playground/dist/smoke/run.js --only theme-gallery` and record the id.

## 13. STOP conditions

- Stop if any shipped set fails either new pair. That is a palette defect, not a
  contract gap: record the set and the ratio, do not weaken the floor.
- Stop if a test outside the files listed fails after the rename. Grep for
  `comboboxCheckPairs` first (`rg comboboxCheckPairs packages/`); it must appear
  in `contrast.ts` only.
- Stop if `contrastPairs.length` is not 472 after step 1: something else added or
  removed pairs, and the history sentence would lie.
- Stop if `docs.test.ts`'s graphic-marks case or `primary-mark-claims.test.ts`
  still passes with the old nine-surface list after step 4: the derivation was
  bypassed, and the plan's premise is wrong.

## 14. Acceptance

- `markPairs` holds `primary` on `hover`, `accent`, `active`, `selected` and
  `selectedActive`; `contrastPairs.length` is 472.
- A theme whose `primary` equals `accent` or `active` fails
  `themeContrastFailures` with `pairClass: "mark"`, proven by a planted theme.
- The catalogue, the design system and the README name the two new fills and the
  unread dot.
- `TODO.md`'s two live rows state today's figures and no refuted conclusion.
- Every package and root gate passes; no colour, pair class, floor, metric, role
  or shipped theme moves.

## 15. Not changed

- Every `Theme` value, `contrastFloors`, `markRoles`, `markSurfaces`,
  `trackMarkPairs`, the platform styles, the recipes and `shippedThemes`.
- `packages/components`, `packages/primitives`, `apps/*` and every other
  workstream's paths; the components migration stays a cross-team row.
- The historical plan narratives that quote the pre-698 fill.
