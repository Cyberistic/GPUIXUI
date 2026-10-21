# 842 — The selection contract's remaining present-tense minima

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `083`, `314`,
`362`, `366`, `506`, `509`, `528`, `536`, `595`, `717` and `840`.

## 1. The defect

The catalogue's *Text selection* and *Verification* narratives state fourteen
shipped minima in the present tense. None is a `documentedFigures` entry, so
mutating any of them leaves the package green (7226 tests). Plan `840` closed the
same class for the status label; this row closes the rest of the selection
contract and the three cross-theme figures beside it.

| Passage | States | Produced by |
| ------- | ------ | ----------- |
| soft-panel body / caption | **8.14:1** identity dark `infoSoft`; **5.08:1** Windows light `destructiveSoft` | `selectionSoftPairs`, washed |
| link through the wash | **5.69:1** Windows dark `selected`; **6.19:1** identity light `destructiveSoft` | two row fills plan `314` added; `softPanelTextPairs` |
| row text at rest | **8.44 / 8.98 / 11.59:1** Linux dark; **6.22 / 6.93:1** macOS light | five plain pairs |
| `selectionPairs` minimum | **4.801:1** Windows dark `mutedForeground` on `selected` | `selectionPairs`, washed — stated nowhere |
| field fill | **1.0695:1** Linux dark `selectedActive` on `input` | `stateFillSurfacePairs` on `input` |
| dialog face | **1.079:1** Linux dark on `destructive` | `dialogSurfacePairs`, `overlay` wash |
| `sm` shadow | **1.109:1** macOS dark on `input` | two surfaces plan `509` added |
| warning edge | **1.246 / 1.254 / 1.319:1** | identity light `warningSoftBorder` vs platform light `active`; own fill |

Two scopes had to be read before the entries could be written, or the table would
state a false superlative:

- The link's "tightest shipped pair" is the tighter of the two row fills plan
  `314` added (`accent`, `selected`). The whole nine-surface at-rest list is
  lower at Windows dark `primaryText` on `active` (**5.5869:1**), and no passage
  claims that list.
- The elevation sentence's **1.109:1** is the tighter of the two surfaces plan
  `509` added (`selected`, `input`). The whole `sm` walk is lower at identity
  dark on `background` (**1.0614:1**), and the passage names the two added pairs.

`selectionPairs`' true minimum (**4.801:1**) is stated in no passage, so the
catalogue gains a sentence for it.

## 2. Decisions

- **Add a `"cross"` kind** with an optional `against: ShippedThemeProvenance`.
  The pair's foreground comes from `provenance`, its background from `against`.
  A cross entry is `claim: "value"` only; the suite rejects a cross entry
  without `against`, and `against` on any other kind.
- **An `over-wash` may omit the wash fraction.** The modal `overlay` is
  translucent by design, so omitting the fraction means "the role's stored
  alpha". The dialog entry uses `{ opacity: 1, wash: { role: "overlay" } }`.
- **Scope the two minima** as above and say so in their sentences.
- **State the missing 4.801 passage** in `docs/tokens.md` §Text selection.
- **Remove the seven duplicate rows** (`5.69`, `8.44`, `8.98`, `11.59`, `6.22`,
  `6.93`, `6.19`) from `docs.test.ts`. The new entries own them with the exact
  set; the remaining two rows (`8.03`, `6.69`) stay.
- **Fix the dialog typo** `identity Linux dark` → `` `Dark · Linux` ``.

## 3. Files

- `packages/tokens/src/figures.ts` — `"cross"`, `against`, optional wash alpha,
  `measure`/`within`/`derivedAt` threading, `themeOf`, `deriveFigure`,
  `tightestProvenance`, seventeen entries, `documentedFigures` spread.
- `packages/tokens/src/figures.test.ts` — allow an omitted wash fraction; add
  the cross-field and cross-direction case.
- `packages/tokens/src/selection-figures.test.ts` — new regression suite.
- `packages/tokens/src/docs.test.ts` — remove the seven duplicate rows.
- `docs/tokens.md` — 4.801 sentence, `sm` reword, typo, entry count.
- `COMPONENTS.md` — `sm` reword.
- `TODO.md` — this row.

## 4. Test plan

`selection-figures.test.ts` states the regressions in its header and holds:

1. all seventeen entries exist, once, and derive;
2. occurrence counts: `8.14` three times, `5.08` three times, `1.079` twice;
3. the link entry measures only the two row fills plan `314` added, and the
   whole at-rest list is lower (so the scope is deliberate);
4. the elevation entry measures only `selected` and `input`, and the whole walk
   is lower;
5. the dialog entry composes `overlay` at its stored alpha;
6. the cross entries read one role from each named theme, and reading both from
   one theme differs;
7. `selectionPairs`' minimum is the Windows dark `selected` pair;
8. each entry rejects the value one rounding step away.

Verify both directions: mutate each figure and the `sm` set in place, confirm
the new suite fails; restore, confirm it passes.

## 5. Commands

```sh
nub exec vitest run src/figures.test.ts src/selection-figures.test.ts
nub exec vitest run src/docs.test.ts
nub run --filter @gpuixui/tokens test
nub run check && nub run lint && nub run test
```

## 6. STOP conditions

- A figure does not derive from the list and set above: stop and re-measure; do
  not edit the passage to fit the table.
- A doc sentence would need the scoped superlative to become a whole-list claim:
  stop; the two scopes in §1 are the contract.
- `nub run check` fails `check:tests`: the new suite must assert a derivable
  value, not a literal.
