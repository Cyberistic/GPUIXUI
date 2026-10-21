# 833 — Every remaining figure in a live cross-team row, and the ring row's set

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `057`, `079`,
`311`, `332`, `343`, `344`, `347`, `348`, `394`, `603`, `611`, `737` and `831`.

## 1. The defect

Plan `831` gave the three most-quoted live rows a derived owner. The rest of the
ledger's live rows still state figures as prose, and one of them is already
wrong:

| Row | Says today | Measures today |
| --- | ---------- | -------------- |
| `primitives` pressed selection control | `ring` is **1.000:1** on `primary` in *ten named* sets, and **1.02–1.42:1** on `destructive` | 1.000:1 in **16 of the 24** sets, and **1.024–1.609:1** on `destructive` |
| `components` message bubble | the `selection` wash composites to **1.000:1** on `primary` in six named palettes | the six are correct |
| `primitives` invalid field | `inputForeground` on `destructive` is **1.97:1** (both AAA dark) to **3.48:1** (Aero light) | 1.974 and 3.480 |
| `components` secondary Button | under the 1.05:1 step in **23 of 24**, the same value in **19** | 23 and 19 |
| `components` avatar dot | light `warning` is **1.89:1** on its card | 1.890 |
| `components` timeline dot | `muted` is **1.036:1** on the identity light canvas and **1.014:1** on Aero light | 1.036 and 1.014 |
| `components` menu highlight bar / check glyph | `accent` is **1.118–1.392:1** on `popover` and **1.000–1.113:1** on `hover` | the same |
| `components` Toast countdown | `muted` **1.000:1** on `popover` in the six default dark sets; `track` **1.069:1** at the tightest | 1.000 in those six; 1.069 (`Dark · Windows`) |
| `primitives` unchecked control | `input` is `#FFFFFF` in every light set, so a box on a white card is **1.000:1** | six light sets, five white cards (XP's is `#FFFDF4`) |
| `primitives` native field hint | the runtime grey `#8F8F8F` is **3.23:1** on the light `input` | 3.234 |

The ring row is also an incomplete enumeration presented as the affected set:
ten of the sixteen sets where `ring` equals `primary` are named, and the other
six are not, so a reader cannot tell whether the identity light set is affected
(it is not) or the AAA light variants are (they are not).

All conclusions stand. This plan fixes the one wrong range, replaces the
incomplete enumeration with a derived count, and puts every figure above under
the guard plan `831` started.

## 2. Decisions

1. **One suite, not two.** Plan `831`'s `ledger-status-figures.test.ts` becomes
   `ledger-figure-claims.test.ts` (`git mv`), because it now owns every live
   row's figures rather than only the status rows. Its three existing cases and
   helper stay as they are.
2. **Derive a count instead of enumerating.** The ring row says "16 of the 24
   shipped sets" (the suite asserts the number and that `ring` equals `primary`
   in exactly those), so a palette edit that aliases one more set moves the
   figure. Name the two groups that clear 3:1, not the 16 sets.
3. **Guard the honest qualifier.** The unchecked row's "a white card" is true
   for five of the six light sets and XP's beige card is the exception; the
   suite asserts all six `input` values are `#FFFFFF` and the ratio is 1 in the
   five whose card is white, so the sentence cannot drift into an absolute.
4. **No source, no document, no colour moves.** Only `TODO.md`, the renamed
   suite and this plan set change.

## 3. Files to change

1. `packages/tokens/src/ledger-status-figures.test.ts` → `git mv` to
   `packages/tokens/src/ledger-figure-claims.test.ts`, extend its header and
   add the cases in §4.
2. `TODO.md` — the pressed-selection row; one ticked row; counter `380/455` →
   `381/456`.
3. `.agents/slop/plans/README.md` — the row and the closing paragraph.

## 4. The suite's new cases

All helpers are the ones plan `831` wrote (`prose`, `liveRow`, `ratio`,
`fixed`, `light`, `defaultLight`). Add `compositeOver` to the imports.

1. **Pressed selection control** (`liveRow("Cross-team: `primitives` gives a
   pressed selection control")`): `ring` on `primary` is exactly `1` in 16 of
   `shippedThemes`; `ring` on `destructive` ranges `1.024`–`1.609`; the row
   contains `16 of the 24` and `` `1.02–1.61:1` ``, and does not contain
   `1.02–1.42`.
2. **Message bubble** (`liveRow("Cross-team: `components` applies
   `selectionStyle(theme, \"fill\")`")`): for every shipped set derive
   `contrastRatio(primary, compositeOver(selection, primary))` and collect the
   sets where it is exactly `1`; assert the six names are `Dark`,
   `Light · macOS`, `Dark · macOS`, `Light · Linux`, `Light · Windows` and
   `Light · Windows 7`, and that the row contains `identity dark`,
   `macOS light and dark`, `Linux light`, `Windows light` and `Aero light`.
3. **Invalid field** (`liveRow("Cross-team: `primitives` must not paint an
   invalid field")`): every high-contrast dark set measures `1.974`; the Aero
   light set measures `3.480`; the row contains `**1.97:1**`, `**3.48:1**` and
   `both AAA dark`.
4. **Secondary Button** (`liveRow("Cross-team: `components` moves the secondary
   Button")`): across 24 sets, `contrastRatio(secondary, hover) < 1.05` in 23
   and `secondary` equals `hover` in 19; the row contains `23 of 24` and `19`.
5. **Wrong-role marks** (the avatar row, `liveRow("Cross-team: `components`
   moves the Avatar presence dot")`): identity light `warning` on `card` is
   `1.890`; the row contains `**1.89:1**`. The timeline row
   (`liveRow("Cross-team: `components` moves the Timeline upcoming dot")`):
   identity light `muted` on `background` is `1.036`, Aero light is `1.014`;
   the row contains `**1.036:1**` and `1.014:1`.
6. **Menu accent** (both rows, `liveRow("Cross-team: `components` moves the menu
   row's highlight bar")` and `liveRow("Cross-team: `components` moves the menu
   checkbox item")`): derive the `accent` range on `popover`, on `hover` and on
   `active`; assert `1.118`–`1.392` and `1.000`–`1.113`, and that each row
   contains its own rounded form (`1.118–1.392:1` / `1.000–1.113:1` for the
   bar, `1.11–1.39` / `1.00–1.08` for the checkbox).
7. **Toast countdown** (`liveRow("Cross-team: `components` paints the Toast
   countdown")`): the six default dark sets have `muted` equal to `popover`;
   `track` on `popover` is `1.069` at the tightest (`Dark · Windows`); the row
   contains `**1.000:1**` and `1.069:1`.
8. **Unchecked control** (`liveRow("Cross-team: `primitives` paints an unchecked
   checkbox/switch border")`): all six default light sets have `input`
   `#FFFFFF`; the five whose `card` is white measure `1`; the row contains
   `1.000:1` and `` `#FFFFFF` ``.
9. **Native field hint** (`liveRow("Cross-team: `primitives` stops trusting
   `nativeTextTheme`")`): `#8F8F8F` on the light `input` is `3.234`; the row
   contains `3.23:1`.
10. **The derivation moves** — repeat `831`'s proof for a role this plan adds:
    `extendTheme(lightTheme, { colors: { warning: lightTheme.colors.card } })`
    makes the avatar figure `1`, proving the table is derived rather than
    restated.

Use `toCloseTo(value, 3)` for measured ratios and the raw string only where the
row's own rounding is the claim (`1.11–1.39`, `1.00–1.08`).

## 5. Step 2 — the pressed-selection row

Replace

```
`active: { borderColor: ring }` on a filled box whose fill is `primary` or
`destructive`, and `ring` measures **1.000:1** on `primary` in the identity dark,
Linux dark, Windows dark, the XP and Aero dark recipes and both AAA dark sets,
1.000:1 on `primary` in the macOS, Linux and Windows light variants, and
1.02–1.42:1 on `destructive` — so a pressed checked checkbox or switch shows no
change on its only state signal;
```

with

```
`active: { borderColor: ring }` on a filled box whose fill is `primary` or
`destructive`, and `ring` measures **1.000:1** on `primary` in 16 of the 24
shipped sets — the default light platform variants and recipes, the default dark
sets except macOS, and the AAA dark sets — and **1.02–1.61:1** on `destructive`
— so a pressed checked checkbox or switch shows no change on its only state
signal in those sixteen sets;
```

The range's max is the identity light set's `1.609`; every other set is at or
below `1.42`, so "1.02–1.42" was true of ten sets and false of the identity.

## 6. Step 3 — `TODO.md`

Add above the plan-831 row:

```
`[x]` Own every remaining figure in a live cross-team row — the pressed
selection control's ring set and range (16 of 24, 1.02–1.61), the message
bubble's six palettes, the invalid field's 1.97/3.48, the secondary Button's
23/19, the avatar's 1.89, the timeline's 1.036/1.014, the menu accent's two
ranges, the Toast countdown's 1.000/1.069, the unchecked control's `#FFFFFF`
and the native hint's 3.23; `ledger-figure-claims.test.ts` derives each from
`shippedThemes`; no colour, pair, floor, metric, role or shipped theme moves
(plan 833)
```

and bump the counter to `381/456`.

## 7. Step 4 — the index

```
| [833](./833-live-row-figures.md) | Every remaining figure in a live cross-team row, and the ring row's set | F | 057, 079, 311, 332, 343, 344, 347, 348, 394, 603, 611, 737, 831 | done |
```

plus a closing paragraph naming the ring row's correction and the rows the
suite now owns.

## 8. Test plan and commands

```sh
git mv packages/tokens/src/ledger-status-figures.test.ts packages/tokens/src/ledger-figure-claims.test.ts
nub run --filter @gpuixui/tokens test ledger-figure-claims.test.ts
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
```

Expected: 16 cases in the renamed file; the package green at 227 files /
7200 tests (six from plan `831` plus ten new); types clean.

Both directions:

1. **Fails before the ring fix.** Run the new file against the current row:
   the ring case fails on `1.02–1.42` and on the ten-set enumeration.
2. **Fails on a moved role.** Set the identity light `warning` to its `card` in
   `color.ts`, run, expect the avatar case and the derivation case to fail;
   restore.
3. **Passes after.** The full package and root gates green.

**Native scenarios.** None; the change edits the ledger, the suite name and the
plan index. Record "no scenario ran".

## 9. STOP conditions

- Stop if a derived figure differs from the table in §1. Re-derive it, correct
  the table and the row, and record the difference in the commit message; do not
  bend the assertion to the row.
- Stop if `liveRow` cannot find a row or its next live row. Re-anchor the start
  string against the current `TODO.md`; never widen the slice to the whole file.
- Stop if the renamed file changes any existing case's behaviour. It must be a
  name and header change only, plus the new cases.
- Stop if `nub run check` reports a test with no assertion. The two-direction
  proof uses derived values, not literals compared to themselves.

## 10. Acceptance

- The pressed-selection row states `16 of the 24` and `1.02–1.61:1`, and the
  ten-set enumeration is gone.
- Every live row's figure listed in §1 is asserted from `shippedThemes`, with
  the two visual ranges held in each row's own rounding.
- `ledger-figure-claims.test.ts` has 16 cases; the package and root gates pass;
  no colour, pair, floor, metric, role or shipped theme moves.

## 11. Not changed

- Every `Theme` value, contract list, floor, metric and shipped set; no
  `docs/` page and no `COMPONENTS.md` row (these figures are ledger-only).
- `packages/components`, `packages/primitives` and `apps/*`; every migration
  stays a cross-team row.
