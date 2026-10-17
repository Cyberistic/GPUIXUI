# 081 — The selection wash on the surfaces text is selected on

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `071` (contrast contract), `063` (platform styles), `069` (selection reach), `076`–`080` |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`selectionStyle(theme)` maps the `selection` role to `selectionColor`, which
inherits down the tree and paints behind every selected glyph. The contract
measures it on **two** surfaces, `background` and `card`. Text is selected on
more: a dialog's body (`popover`), text typed into a field (`input`), a quiet
panel (`muted`), a row under the pointer (`hover` / `active`), the accent a
selectable row uses (`accent`), and a selected row (`selected`).

The audit measured each surface with the role that is actually painted there —
`popoverForeground` on `popover`, `inputForeground` on `input`, `foreground` on
the neutral surfaces and washes, and `selectedForeground` on a selected row (the
contract already holds that role to the `secondary` floor). Four shipped sets
drop below the floor the library applies to body text:

| Variant | Pair | Before | Floor |
| ------- | ---- | ------ | ----- |
| high-contrast dark (`selection` `#C7CBFF4D`) | `foreground` over `selection` on `hover` | **6.48:1** | 7:1 |
| high-contrast dark | `foreground` over `selection` on `active` | **5.49:1** | 7:1 |
| Linux dark (`selection` `#78AEED33`) | `foreground` over `selection` on `active` | **6.92:1** | 7:1 |
| Windows dark (`selection` `#4CC2FF33`) | `foreground` over `selection` on `active` | **6.84:1** | 7:1 |

The selected row is a `secondary` pair, not a body pair: `selectedForeground`
over the wash on `selected` measures 4.80:1 in macOS light (the lowest shipped
set) against the 4.5:1 floor, so that case passes and stays on its own row.

The platform styles are the same failure mode plans `076`–`080` fixed: each dark
variant carried its light accent as the selection base, so the wash *lightened* a
surface that white text already sits on. Every light set passes with margin.

## 2. Design decisions (do not re-litigate)

1. **Measure the role the surface paints.** `popoverForeground` on `popover`,
   `inputForeground` on `input`, `foreground` on `background`, `card`, `muted`,
   `hover`, `active` and `accent`, and `selectedForeground` on `selected`. A
   surface's own text role is what a selected glyph shows.
2. **The selected row keeps the secondary floor.** It is already a `secondary`
   pair (`selectedForeground` on `selected`); measuring body text at 7:1 there
   would contradict the role's own contract and cannot be met by any wash that
   also stays perceivable.
3. **Darken the three dark washes; do not move a fill.** The canvas composes a
   wash over the surface; to keep white text at 7:1 the wash must not lighten the
   surface. The alpha stays as shipped (30% AAA, 20% on the platform variants),
   so the documented "24% default / 30% high contrast" identity sentence and the
   platform values' own translucency are unchanged — only the base colour moves.
4. **Values.**

   | Role | Before | After | Worst body pair |
   | ---- | ------ | ----- | --------------- |
   | high-contrast dark `selection` | `#C7CBFF4D` | `#4C39B54D` | 10.24:1 on `active` |
   | Linux dark `selection` | `#78AEED33` | `#1C71D833` | 8.39:1 on `active` |
   | Windows dark `selection` | `#4CC2FF33` | `#0067C033` | 8.91:1 on `active` |

   The wash stays a tint of the platform accent (iris 700 in AAA, Adwaita's light
   accent on Linux, Fluent's light accent on Windows), so it still reads as the
   same family's selection.
5. **A public list, not a private loop.** `selectionPairs` exports the nine
   surface/role pairs beside `contrastPairs`, so the checker, the tests and the
   documents read one description.
6. **No state fill, divider or text role moves.** Only the three wash bases.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/081-selection-on-painted-surfaces.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | `selectionPairs` export; the checker reads it |
| `packages/tokens/src/color.ts` | high-contrast dark `selection` |
| `packages/tokens/src/platform-styles/linux.ts` | dark `selection` |
| `packages/tokens/src/platform-styles/windows.ts` | dark `selection` |
| `packages/tokens/src/contrast.test.ts` | header; opaque-wash expectation |
| `packages/tokens/src/selection-text.test.ts` | **new** — the regression test |
| `packages/tokens/src/docs.test.ts` | §9 selection rows |
| `docs/tokens.md` | the three colour rows, the checking and verification prose |
| `docs/design-system.md` | §9 selection rows |
| `packages/tokens/README.md` | the checking paragraph |
| `COMPONENTS.md` | the *Theme contrast check* row |
| `TODO.md` | tick the row and move the progress bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add beside `controlFillPairs`:

```ts
/**
 * The surfaces a selected glyph is painted on, with the role that surface uses
 * for its own body text. The selection wash is composited over each before the
 * ratio is taken, so a theme is held to the contrast of text as it actually
 * paints.
 */
export const selectionPairs: readonly ContrastPair[] = [
  ["foreground", "background", "body"],
  ["foreground", "card", "body"],
  ["foreground", "muted", "body"],
  ["foreground", "hover", "body"],
  ["foreground", "active", "body"],
  ["foreground", "accent", "body"],
  ["popoverForeground", "popover", "body"],
  ["inputForeground", "input", "body"],
  ["selectedForeground", "selected", "secondary"],
];
```

Replace the private `selectionSurfaces` list and the hardcoded `foreground` /
`body` block in `themeContrastFailures` with a loop over `selectionPairs`,
taking the floor from `floors[pairClass]`. Keep `wash: "selection"`. Extend the
JSDoc of both exports to name the surfaces.

### 4.2 Colours

- `highContrastDarkColors.selection`: `"#C7CBFF4D"` → `"#4C39B54D"`.
- `linuxPlatformStyle.colors.dark.selection`: `"#78AEED33"` → `"#1C71D833"`.
- `win32PlatformStyle.colors.dark.selection`: `"#4CC2FF33"` → `"#0067C033"`.

One JSDoc sentence each: the wash is a darker tint so selected text keeps the
body floor on the fills a row paints (plan 081).

### 4.3 `packages/tokens/src/contrast.test.ts`

- Header: add the plan 081 paragraph.
- `reports an opaque selection wash over both surfaces` → `…over every painted
  surface`: with an opaque `#000000` wash, expect nine failures in pair order —
  `foreground` on `background`, `card`, `muted`, `hover`, `active`, `accent`,
  `popoverForeground` on `popover`, `inputForeground` on `input` and
  `selectedForeground` on `selected`.

### 4.4 `packages/tokens/src/selection-text.test.ts` (new)

Header: the bug guarded — the selection wash was measured on `background` and
`card` only; high-contrast dark measured 6.48:1 on `hover` and 5.49:1 on
`active`, Linux dark 6.92:1 and Windows dark 6.84:1 on `active`, under the 7:1
body floor, while every suite stayed green.

Tests:

1. `documents one pair per surface a selected glyph paints on` — assert
   `selectionPairs` maps to the nine surfaces in order, with the role each
   surface uses.
2. `clears the declared floor on every shipped theme` — iterate identity, both
   high-contrast themes and the six platform variants; composite the wash and
   measure each pair at `contrastFloors[theme.contrast][pairClass]`.
3. `keeps selected text readable on a row that is already painted` — the named
   regression: high-contrast dark, Linux dark and Windows dark measure
   `foreground` over the wash on `active` at ≥7:1, and the wash is not the
   wash's old light base.
4. `names the surface when a theme regresses` — extend high-contrast dark with
   the old `selection: "#C7CBFF4D"` and assert `themeContrastFailures` reports
   exactly `hover` and `active` at the `body` floor (7), both with
   `wash: "selection"`.

### 4.5 `packages/tokens/src/docs.test.ts`

The §9 table now carries two selection rows:

```
| text selection (body text over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`) | 7:1 | 7:1 |
| text selection in a selected row (`selectedForeground` over the wash on `selected`) | 4.5:1 | 7:1 |
```

built from `contrastFloors`.

### 4.6 `docs/tokens.md`

- The high-contrast colour table: `selection` dark `#4C39B54D`.
- *Checking a theme*: "the selection wash is measured as it paints" names the
  nine surfaces and their roles.
- *Verification*: the same, plus the defect (high-contrast dark 6.48/5.49, Linux
  dark 6.92, Windows dark 6.84 before the wash moved).
- *Text selection*: the wash is now checked on every surface a glyph paints on.

### 4.7 `docs/design-system.md`

§9: replace the single selection row with the two rows above.

### 4.8 `packages/tokens/README.md`

The *Checking a theme* paragraph: the selection sentence names the surfaces and
the fix.

### 4.9 `COMPONENTS.md`

*Theme contrast check*: the selection wash is measured on the nine painted
surfaces, and plan 081 names the four sets that failed.

### 4.10 `TODO.md`

Tick the row that plan 081 answers and move the bar `48/64` → `49/65`.

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including `selection-text.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Revert high-contrast dark `selection` to `"#C7CBFF4D"`: the suite must fail
   on `hover` (6.48) and `active` (5.49) at the 7:1 body floor.
2. Revert Linux dark `selection` to `"#78AEED33"`: fail on `active` (6.92).
3. Revert Windows dark `selection` to `"#4CC2FF33"`: fail on `active` (6.84).
4. Restore every value: green.

Record the exact failure text in §8.

## 6. STOP conditions

Stop and report with evidence if:

- **A shipped set still fails a selection pair after the wash move.** The
  measured values are in §2.4; a different failure means a different set moved.
  Do not lower the floor and do not widen the selected row to the body floor.
- **The illustrated wash percentage changes.** It must not: only the base
  colour moves, never the alpha.
- **A text or boundary pair regresses.** `selection` is composited only here; a
  regression means a wash was applied to the wrong role.
- **A change outside the owned paths is required.** Record it in `TODO.md` and
  do not edit it.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `selection-text` #1 | unit | the contract dropping a surface a selected glyph paints on |
| `selection-text` #2 | unit | any shipped theme losing selected-text contrast on a surface |
| `selection-text` #3 | unit | the exact dark-row regression in the three sets |
| `selection-text` #4 | unit | the public checker not reporting the wash surface |
| `contrast.test.ts` opaque-wash expectation | unit | an opaque wash being reported on fewer surfaces than it paints on |
| `color.test.ts` / `platforms.test.ts` generic loops | unit | any shipped colour set failing a documented pair |

## 8. Outcome (executed on this host, 2026-10-17)

- `selectionPairs` now exports the nine painted surfaces: `foreground` on
  `background`, `card`, `muted`, `hover`, `active` and `accent`;
  `popoverForeground` on `popover`; `inputForeground` on `input`; and
  `selectedForeground` on `selected` at the secondary floor.
- Values: high-contrast dark `selection` `#4C39B54D`, Linux dark `#1C71D833`,
  Windows dark `#0067C033`. The alpha bytes are unchanged (30% AAA, 20% on the
  platform variants), so the documented wash percentage is intact.
- Measured on `active` (the worst body surface): high-contrast dark **10.24:1**,
  Linux dark **8.39:1**, Windows dark **8.91:1**. The rest of each set:
  - HC dark: background 17.92, card 16.37, muted 14.68, hover 12.07, accent
    13.95, popover 15.43, input 16.37, selected 11.03
  - Linux dark: background 12.84, card/popover/input/muted 11.07, hover 9.79,
    accent 9.75, selected 7.53
  - Windows dark: background 13.92, card/popover/input/muted 12.28, hover 10.54,
    accent 10.85, selected 8.80
- The selected row's lowest shipped value is macOS light at **4.80:1** against
  the 4.5:1 secondary floor, so it stays a `secondary` pair.
- Two-direction proof (all restored to 1011 passed):
  - HC dark back to `#C7CBFF4D` failed
    `high-contrast dark: foreground over selection on hover: expected
    6.47822655589457 to be greater than or equal to 7` and `… on active:
    expected 5.485818991044772…`.
  - Linux dark back to `#78AEED33` failed `… on active: expected
    6.110688755738601…` and the platform variant contract.
  - Windows dark back to `#4CC2FF33` failed `… on active: expected
    6.038550259867355…` and the platform variant contract.
  - Restoring the three values made every suite green.
