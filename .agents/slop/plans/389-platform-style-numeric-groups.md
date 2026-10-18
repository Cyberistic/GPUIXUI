# 389 — A platform style carries every numeric scale

**Workstream:** `tokens-theme`
**Phase:** B/F
**Depends on:** 011 (package), 051 (platform type styles), 063 (platform style
variants), 311 (recipes), 321 (total merges), 353 (component dimensions),
358 (metric contract), 385 (typeface contract)
**Owns:** `packages/tokens/**`, `docs/tokens.md`, `docs/design-system.md`

---

## 1. Why

MISSION requires that a platform style is a **real, editable token theme**, not a
preset: "a consumer can take one platform theme file, edit it, and ship their own
look … change any of its values." Today `PlatformStyle` carries:

- type families (`types`),
- radii, density and motion (`structure`),
- colours and elevation.

It cannot carry the **type scale**, **spacing**, **border widths**, **icon
sizes**, **avatar sizes** or **component dimensions**. A consumer who copies
`platform-styles/macos.ts` and wants 15px body text, 10px section spacing or a
240px overlay must leave the platform file and call `extendTheme` separately —
so the file they were told to own is not the whole look.

The audit also checked the alternative reading ("`extendTheme` is enough"): a
platform style is applied by `applyPlatformStyle`, which builds a
`ThemeOverrides` from `structure`; `extendTheme` already accepts every group. The
capability is one merge away, and no shipped style has to move.

## 2. Exact files

Change:

1. `packages/tokens/src/platform-types.ts`
   - `PlatformStyleStructure` gains, all optional and documented:
     - `typography?: Partial<Record<TextRole, Partial<TextStyle>>>` — type roles
       only; families stay in `types` so a style cannot name two different UI
       families.
     - `spacing?: Partial<Spacing>`
     - `borderWidth?: Partial<BorderWidth>`
     - `iconSize?: Partial<IconSize>`
     - `avatarSize?: Partial<AvatarSize>`
     - `dimensions?: Partial<Dimensions>`
   - Imports are `import type` only: `platform-types.ts` already imports
     `Typography` indirectly? It does not. `typography.ts` imports `platforms.ts`
     at runtime for the default families; `platform-types.ts` importing
     `typography.js` **type-only** keeps the runtime graph acyclic (the import is
     erased). Do not import `platforms.ts` here.
2. `packages/tokens/src/theme.ts`
   - In `platformOverrides`' `structural` object, add:
     ```ts
     typography: { sans, mono, ...(style.structure.typography ?? {}) },
     spacing: style.structure.spacing,
     borderWidth: style.structure.borderWidth,
     iconSize: style.structure.iconSize,
     avatarSize: style.structure.avatarSize,
     dimensions: style.structure.dimensions,
     ```
     replacing the current `typography: { sans, mono }` line. `extendTheme`
     already merges each group field by field, including the type roles.
   - The groups are structural: they apply at **every** contrast level, like
     radii and motion, because they are geometry, not colour.
3. `packages/tokens/src/platform-extension.example.ts` (new)
   - `contosoDensityPlatformStyle`, a complete `PlatformStyle` shaped like a
     copied platform file, with `types` (Contoso families), `structure` naming
     every new group with values that pass the contract on every density preset,
     plus the existing colour/elevation shape.
   - Use type values that do not disturb fit: `code` size 12/18, `spacing.md` 10,
     `borderWidth.strong` 3, `iconSize.md` 18, `avatarSize.sm` 28,
     `dimensions.overlayWidth` 240.
4. `packages/tokens/src/platform-extension.test.ts` (new)
5. `packages/tokens/src/platforms.example.ts`
   - Link the new example? Only if it reads cleanly. Otherwise leave it and rely
     on `examples.test.ts`, which already imports every `*.example.ts`.
6. `docs/tokens.md`
   - `### Authoring a platform style`: the `PlatformStyle` block gains the six
     fields, and a sentence states that they are structural (applied at both
     contrast levels), merge field by field like `extendTheme`, and that `types`
     owns the families. Link the new example beside `contosoPlatformStyle`.
7. `docs/design-system.md`
   - §11 Extension: one sentence that a copied platform style carries the numeric
     scales too, so the "copy a file and own the look" path covers type sizes,
     spacing, borders, icon/avatar sizes and component dimensions — not only
     colours.
8. `packages/tokens/README.md`
   - The platform variants paragraph gains the same clause; keep it one sentence.
9. `COMPONENTS.md`
   - The **Platform style variants** row gains the new groups and the example.
10. `.agents/slop/plans/README.md`
    - Index row for 389.
11. `TODO.md`
    - Tick a new row under *Design tokens and theming*.

No other path is touched. `platform-styles/*` shipped files are unchanged: every
new field is optional and omitted, so no shipped pixel, metric or pair moves.

## 3. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
# expect: exit 0

nub run --filter @gpuixui/tokens test
# expect: every file green, including platform-extension.test.ts

nub run check
# expect: check:tests clean, oxlint clean, oxfmt clean, type checks clean

nub run lint
nub run test
# expect: exit 0
```

Two-direction proof (no `jj` on this box, so do it by hand; record the output):

```sh
# 1. Remove the six added lines from `platformOverrides` in theme.ts.
nub run --filter @gpuixui/tokens test -- platform-extension
# expect: FAIL — the applied style still carries the base scale.

# 2. Restore the lines.
nub run --filter @gpuixui/tokens test -- platform-extension
# expect: PASS.
```

## 4. Test plan

`platform-extension.test.ts` states the bug in its header: *a copied platform
style could not carry the numeric scales, so the file a consumer owns was only
part of the look.*

Cases that can fail:

1. **Every group applies** — build a style naming each of the six groups, apply
   it to `getTheme("dark")`, and assert each value is the style's, not the base's.
2. **Omitted groups inherit** — a style with only `spacing` leaves
   `iconSize`/`avatarSize`/`dimensions`/`borderWidth`/`typography` equal to the
   base.
3. **`undefined` is omitted** — `borderWidth: { thin: undefined }` inherits the
   base thin, the same total-merge rule plan 321 states.
4. **Structural at high contrast** — apply the style with `"high"` and assert the
   numeric groups apply while the palette is the AAA one.
5. **The example passes the total check** — `themeFailures` returns `[]` for the
   example applied to the identity in both modes.
6. **Shipped styles are unchanged** — for each shipped style in both modes and
   both contrasts, the resolved `spacing`, `borderWidth`, `iconSize`,
   `avatarSize`, `dimensions` and type sizes equal the identity's (they name no
   new group), so this plan moves no shipped value.

Cases must not compare a value with itself or assert a stubbed value back:
each asserts a style value against the base's different value.

## 5. STOP conditions

Stop and report rather than improvise if:

- adding the fields creates an import cycle or a `tsc` error even with
  `import type` — report the cycle and the exact error; do not move
  `typography.ts` or `platforms.ts`.
- a shipped theme changes any colour, pair, metric or resolved value — revert;
  the fields must be omitted in every shipped style.
- `themeFailures` on the example is non-empty on either mode — choose different
  example values that pass; do not relax the contract.
- a docs or snippet guard fails because the new example is not imported or the
  `PlatformStyle` block drifts — fix the document/example, never the guard.

## 6. Acceptance

- `PlatformStyleStructure` carries the six numeric groups with JSDoc.
- `applyPlatformStyle` applies them in both modes and both contrasts.
- `platform-extension.example.ts` runs in the suite and passes `themeFailures`.
- `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md` and the
  plan index state the new capability.
- No shipped theme, platform style, recipe, colour, pair, floor or metric moves.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Audit findings recorded, not fixed here

The same audit compared the current `components` branch's compositions with the
contract. Two defects belong to that workstream and are TODO rows:

- `menu/radio.tsx:168` paints `MenuRadioItem`'s selected dot in `accent`, the same
  wash-as-glyph defect plan 339 recorded for `menu/item.tsx:286`; both sit on
  `popover`/`hover` at 1.0–1.4:1. The corrected role is `popoverForeground` or,
  when the mark should stay brand-toned, `primaryText` — both already measured
  there.
- `color-picker.tsx:161` paints the selected swatch's ring in `foreground` on the
  swatch's own fill. The six default swatches include `foreground`, so that ring
  is **1.000:1** in every theme and `primary`/`destructive` sit at 1.56–2.98:1.
  No single palette role can guarantee contrast with a user-supplied swatch; the
  ring needs two tones or a check glyph.

The probe output that produced these figures is summarised in the two TODO rows;
no token value changes because the fix is a consumer composition.
