# 506 — The selected row's title through the text-selection wash

**Phase:** F (integration and polish)
**Depends on:** 081 (selection measured on the surfaces a glyph is selected on),
087 (the wash's own perceivability), 312 (a selected row's title is
`foreground`), 363 (a card carries two text roles through the wash), 381 (the
selected row is a step past the accent wash), 387 (the shipped enumeration), 391
(the contract's reference).

**Owner:** `tokens-theme`. Paths: `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `TODO.md`, `COMPONENTS.md`.

---

## 1. The defect

Plan `312` established which role a selected row paints: `ListItemTitle`
overrides the row's inherited colour, so the **title** is `foreground` on the
`selected` fill, while the inherited label beside it stays
`selectedForeground` at the secondary strength. Plan `081` measures the
selection wash on `selected` — but only with `selectedForeground`, and `087`
adds `mutedForeground` there. Plan `363` added a card's second body role
(`cardForeground` beside the default `foreground`) after finding a card carries
two text roles. A selected row carries two as well, and only the
secondary-strength one is measured.

A reader who drags across a selected row's title therefore paints
`foreground` through the composited wash with no pair behind it. On the shipped
palettes the title falls under the body floor in five dark sets:

| Set | `selection` | `selected` | Title (before) |
| --- | --- | --- | --- |
| identity dark | `#A7A9FF33` (20%) | `#402F94` | **6.480:1** |
| Linux dark | `#1C71D833` (20%) | `#2B4F76` | **6.648:1** |
| Windows dark | `#0067C066` (40%) | `#094771` | **6.908:1** |
| Windows XP dark | inherits the Windows palette | `#094771` | **6.908:1** |
| Windows 7 (Aero) dark | inherits the Windows palette | `#094771` | **6.908:1** |

The floor is 7:1 (the `body` class, at both contrast levels). Every light set,
macOS dark (7.163:1) and both high-contrast sets already pass.

The failure is invisible to the contract: `themeContrastFailures` returns `[]`
for all 24 shipped sets, because the only pair measured on `selected` is
`selectedForeground` at 4.5:1 (identity dark measures 4.690:1 there). A
consumer who copies a dark palette and edits `selection` or `selected` can erase
a selected row's title while all six checks stay green.

## 2. The fix

Three changes, one contract.

**1. The contract measures the title.** `selectionPairs` gains
`["foreground", "selected", "body"]`, beside the existing
`selectedForeground` pair at the secondary floor and the explicit
`["cardForeground", "card", "body"]` plan `363` added. `selectionPairs` grows
19 → 20; the plain `contrastPairs` count does not move.

**2. Five dark washes move so the pair can pass.** The wash lightens a dark
fill, which takes contrast away from the light title; the selected fill is the
lightest row fill, so it is the worst case.

| File | Role | Before | After |
| --- | --- | --- | --- |
| `src/color.ts` (`darkColors`) | `selection` | `#A7A9FF33` (20%) | `#A7A9FF24` (14%) |
| `src/platform-styles/linux.ts` (`colors.dark`) | `selected` | `#2B4F76` | `#27476A` |
| `src/platform-styles/windows.ts` (`colors.dark`) | `selection` | `#0067C066` (40%) | `#0067C055` (33%) |

Both recipes take their dark half from `windowsPlatformStyle.colors.dark`
(plan `328`), so XP and Aero inherit the Windows change with no second edit.

Why this division: the identity wash has room to soften. Identity dark's wash
visibility is 1.394:1 on the lightest content surface, and after the move it is
1.264:1. Windows' own limit is different: plan `091` raised its wash to 40%
because a 20% tint was invisible on the dark-red `destructiveSoft` fill, so the
wash carries two floors at once — the title on `selected` and the highlight on
the soft fills. A 26% wash passes the title (7.516:1) but drops the soft
`destructiveSoft` highlight to **1.030:1**, under the floor; 40% keeps the
highlight and loses the title (6.908:1). The window is narrow, and 33% sits in
it: title 7.164:1, soft highlight 1.071:1. Linux dark has no alpha window at
all — its wash already sits at 1.123:1 and an alpha low enough for the title
leaves 1.052:1 — so its **selected fill** moves one designed step darker
instead, which raises the title *and* the wash visibility (1.125:1) while
keeping a 1.216:1 step from the `accent` wash it follows (the floor is 1.05:1).

Measured after the move:

| Set | Title | Inherited label | Wash visibility | Soft-fill wash | Selected step |
| --- | --- | --- | --- | --- | --- |
| identity dark | 7.144:1 | 5.170:1 | 1.264:1 | 1.229:1 | unchanged |
| Linux dark | 7.389:1 | 6.645:1 | 1.125:1 | unchanged | 1.216:1 |
| Windows / XP / Aero dark | 7.164:1 | 6.793:1 | 1.136:1 | 1.071:1 | unchanged |

No text, edge, ring, status or fill pair outside this composition moves, and no
light or high-contrast value moves.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

In `selectionPairs`, after the `["cardForeground", "card", "body"]` entry:

```ts
  // A selected row carries two text roles the way a card does: its title is
  // `foreground` — `ListItemTitle` overrides the inherited colour — and the
  // label beside it keeps `selectedForeground`. Only the second was measured
  // through the wash, so a dark palette could drop a title below 7:1.
  ["foreground", "selected", "body"],
```

Update the list's JSDoc: state that a card carries two roles — the default
`foreground` and its own `cardForeground` — and a selected row carries two — the
title `foreground` and the inherited label `selectedForeground` at the secondary
floor.

### 3.2 `packages/tokens/src/color.ts`

- `darkColors.selection`: `"#A7A9FF33"` → `"#A7A9FF24"`.
- The `darkColors` JSDoc says "the selection wash is 20%": change that clause to
  name 14% and why — the selected row's title (`foreground`) keeps the body
  floor through the wash at 14% while the highlight stays visible (plan 506).

### 3.3 `packages/tokens/src/platform-styles/linux.ts`

- `colors.dark.selected`: `"#2B4F76"` → `"#27476A"`.
- Extend the style's JSDoc paragraph: the dark selected row is one step darker
  than plan 381 left it, so the title (`foreground`) keeps the 7:1 body floor
  through the selection wash while the row stays a 1.216:1 step past its accent
  wash (plan 506).

### 3.4 `packages/tokens/src/platform-styles/windows.ts`

- `colors.dark.selection`: `"#0067C066"` → `"#0067C055"`.
- Extend the JSDoc paragraph: the dark wash is 33% rather than 40% so a selected
  row's title keeps the body floor through it; the highlight still measures
  1.136:1 on the selected fill and 1.071:1 on the soft `destructiveSoft` fill
  plan 091 tuned it for (plan 506).

No other palette, elevation, metric or type value changes.

### 3.5 Tests to update

- `src/contrast.test.ts`: `expect(selectionPairs.length).toBe(19)` → `20`, with a
  one-line comment naming the selected row's title.
- `src/docs.test.ts`:
  - the "quotes the selection wash strength each mode uses" sentence: it derives
    the dark percentage from `themes.dark.colors.selection`, so only the prose
    quote in `docs/tokens.md` has to move; the guard itself stays.
  - the §9 floor rows: add `selected` to the body-selection row's surface list
    (the title) and rename the selected-row row to the inherited label; both
    rows stay derived from `contrastFloors`.
  - add a case quoting the new tightest title: identity dark at **7.144:1**
    through `compositeOver(selection, selected)`.

### 3.6 New test file `packages/tokens/src/selected-title-selection.test.ts`

Header states the bug: a selected row's title is `foreground` on `selected`
(plan 312), but only the inherited `selectedForeground` was measured through the
wash, so identity dark 6.480:1, Linux dark 6.648:1 and the Windows palette
6.908:1 sat under the 7:1 body floor while the checker returned `[]`.

Cases:

1. **Every shipped set keeps its selected title.** Iterate `shippedThemes`;
   composite `selection` over `selected` and assert
   `contrastRatio(foreground, painted) >= contrastFloors[theme.contrast].body`.
   This fails before §3.1–§3.4 on the five dark sets above.
2. **The pair is published.** `selectionPairs` contains
   `["foreground", "selected", "body"]` exactly once, and its length is 20.
3. **The regression is reported.** `extendTheme(getTheme("dark"), { colors: {
   selection: alpha(getTheme("dark").colors.foreground, 0.9) } })` returns a
   `selection` failure whose `foreground` is `"foreground"`, `background` is
   `"selected"`, `wash` is `"selection"` and `pairClass` is `"body"`; the same
   theme before §3.1 reports nothing for that composition.
4. **The wash stays a highlight.** The three moved sets keep their wash at or
   above `contrastFloors.default.surface` on every member of
   `selectionSurfaces` (identity dark 1.264:1, Linux dark 1.125:1, Windows dark
   1.136:1 at the tightest), and Linux dark keeps `selected` one 1.05:1 step from
   `accent` (1.216:1).
5. **The exact figures.** The five moved sets' titles are the §2 values, and the
   tightest shipped title is identity dark at 7.144:1.

Use `shippedThemes` for case 1 (the plan-388 guard fails a claiming suite that
rebuilds its own list).

### 3.7 Docs

`docs/tokens.md`:

- `## Colour roles` prose above the selection discussion (~line 1201): the
  derived percentages change; keep the sentence's shape ("24% in the light
  default theme, 14% in dark and 30% at high contrast") and add one sentence:
  the selected row's title (`foreground`) is measured beside its inherited
  `selectedForeground`, and plan `506` moved the identity dark wash to 14% and
  the Windows dark wash to 33% while Linux dark's selected fill moved one step
  darker, because the title measured 6.480 / 6.648 / 6.908:1.
- The "plan 091" historical sentence (~line 1238) keeps its history and gains
  the plan-506 correction for the current wash.
- `## Selection` (~line 1516): the role list becomes "`selectedForeground` and
  the row's title `foreground` over `selected`".
- The verification paragraph (~line 1536): "`selectionPairs` names both of a
  card's text roles ... and both of a selected row's".
- Pair-count history (~line 2309): add plan `506` — `selectionPairs` 19 → 20,
  the five dark sets and the new figures; the plain `contrastPairs` count stays
  **394**.

`docs/design-system.md`:

- §8 text-selection row (~line 325): name the selected row's title beside its
  inherited label.
- §9 floor table: add `selected` to the body-selection surface list (the title)
  and label the selected-row row as the inherited label; both rows are guarded
  by `docs.test.ts`.

`packages/tokens/README.md`:

- The selection paragraph (~line 331): name the selected row's two text roles
  and the plan-506 figures.

`COMPONENTS.md`:

- **Design tokens** row: add the selected row's title to the selection sentence
  (`selectionPairs` holds it beside the inherited label).

`TODO.md`: add and tick one row in the tokens section (the defect, the three
moves, the contract growth and the tightest figure) and keep the section bar
current.

`.agents/slop/plans/README.md`: add the index row

```
| [506](./506-selected-row-title-selection.md) | The selected row's title through the text-selection wash | F | 081, 087, 312, 363, 381, 387, 391 | done |
```

and one prose paragraph after the plan-505 paragraph.

## 4. Commands and expected results

Run from the worktree root.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: green after the implementation. Before it, case 1 of
`selected-title-selection.test.ts` fails on identity dark, Linux dark, Windows
dark, XP dark and Aero dark (6.480 / 6.648 / 6.908), and case 2 fails because
`selectionPairs` has 19 entries.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0.

```sh
nub run check
nub run lint
nub run test
```

Expected: all green.

## 5. STOP conditions

Stop and report instead of improvising if:

- a shipped set fails the new pair after §3 — the figures above were measured on
  this tree; a new failure means a value was mistyped or another set changed;
- a wash visibility pair falls under 1.05:1 after the moves — the three figures
  are 1.264, 1.125 and 1.136;
- Linux dark's `selected` fails the 1.05:1 step from `accent` (measured 1.216);
- a light set or a high-contrast set moves — nothing outside the five dark sets
  should change;
- `docs.test.ts` disagrees with a derived percentage or figure — update the prose
  from the suite's output, never guess;
- a change would require editing `packages/primitives`, `packages/components`,
  `apps/docs` or `apps/playground` — record it in `TODO.md` and continue.

## 6. Test plan (prove both directions)

1. **Fails without the fix.** Add §3.6 before §3.1–§3.4. Run the package suite:
   case 1 fails with the five ratios above, case 2 fails at 19, and the checker
   case reports no `foreground`/`selected` failure. Keep the output.
2. **Passes with the fix.** Apply §3.1–§3.4 and re-run; all green.
3. **The regression can be re-broken.** Temporarily restore identity dark's
   `selection` to `#A7A9FF33`; case 1 and the quoted figure go red; restore.
   Repeat for Linux's `selected` and Windows' `selection`.
4. **The contract is not vacuous.** Case 3's opaque wash must be reported; a
   theme whose wash is the shipped value must not.
5. **Every shipped set.** `shippedThemes` is the only list; the plan-388 guard
   runs.
6. **Docs.** `docs.test.ts` passes with the derived 14% and the new rows.

## 7. Acceptance

- `selectionPairs` contains `["foreground", "selected", "body"]` and has 20
  entries; the plain `contrastPairs` count stays 394.
- Identity dark ships `selection: #A7A9FF24`, Linux dark ships
  `selected: #27476A`, Windows dark ships `selection: #0067C055`; XP and Aero
  inherit the Windows value.
- Every one of the 24 shipped sets passes `themeFailures`; the tightest selected
  title is identity dark at 7.144:1 from 6.480:1, and every moved set keeps its
  wash at or above 1.05:1.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md`, `TODO.md` and the plan index name the composition, the moves
  and the figures.
- The three gates are green and the branch is pushed.
