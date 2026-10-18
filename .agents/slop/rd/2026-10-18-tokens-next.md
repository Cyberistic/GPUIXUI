# tokens-theme — next-unit audit (2026-10-18)

Where the workstream stands after plan 529.

## Queue state

- The tokens/theme plan set (010–019, 050–099, 300–399, 500–529) is implemented;
  the only `[ ]` rows in `TODO.md` are cross-team handoffs to `components`,
  `primitives`, `docs-site`, `playground` and the integration owner.
- Gates at 529: `nub run check`, `nub run lint`, `nub run test` green;
  `packages/tokens` is 121 files / 5514 tests.

## Remaining token-native candidates (not yet planned)

1. **Fixed surface metrics plan 353 missed.** `apps/docs`/`components` still
   hardcode a drawer width triple (320/400/560), a chat composer min height
   (160) and a carousel indicator dot (8). `theme.dimensions` owns overlay,
   field, chip, toast, preview-card and keycap metrics; a coherent follow-up
   would add the missing surfaces with cross-team migration rows. Bigger than a
   pair fix: new `Dimensions` fields, every fixture, docs table and metric rule.
2. **Marks on row washes.** `markPairs` covers the plain surfaces, the `input`
   fill and a combobox check on `hover`. A `primary` glyph inside `accent` /
   `selected` / `active` has no pair today, but no shipped composition paints
   one (the shipped check on a selected `Select` option is `accent`, already a
   cross-team defect). Revisit if a component adopts a primary mark there.
3. **Docs-toggle adoption.** Recorded cross-team at plan 529; the docs-site
   parser still reads only `platform`.
