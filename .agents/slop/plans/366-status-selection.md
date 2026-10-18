# Plan 366 — the status label through a text selection

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
083 (status text on the state washes), 087 (secondary text through the wash),
354 (the interaction-state table), 362 (text selection in a status panel).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Three selection lists name the text a user can drag over:

- `selectionPairs` — the body role each surface uses (`foreground`,
  `popoverForeground`, `inputForeground`, `selectedForeground`, `cardForeground`)
  and `mutedForeground`, on the nine `selectionSurfaces`;
- `selectionSoftPairs` — a status panel's title, body and caption on the four soft
  status fills;
- `selectionFillPairs` — the on-colour foreground through `selectionOnFill`.

None of them names the **status label**. `xText` is the documented role for
"labels, icons and dots" on `background`, `card`, `popover`, the `muted` panel and
the `hover`/`active`/`accent`/`selected` washes (`statusTextSurfacePairs`, plans
083 and 314), and plan 057's `components` migration moves inline status text onto
it. A selectable list, table or tree row selects that label with the copy around
it, so the composited wash applies to it exactly as it does to a description.

The wash is accent-tinted over a light surface, which lowers the ratio of the
dark status tones. The probe over the 24 shipped sets finds **162 pairs** below
the floor the set declares:

| Set | Role / surface | Ratio | Floor |
| --- | -------------- | ----- | ----- |
| XP light | `successText` on `active` | **3.671:1** | 4.5 |
| macOS light | `successText` on `active` | 3.826:1 | 4.5 |
| Linux light | `successText` on `active` | 3.851:1 | 4.5 |
| Windows light | `successText` on `active` | 3.850:1 | 4.5 |
| Aero light | `successText` on `selected` | 3.721:1 | 4.5 |
| identity light | `successText` on `active` | 4.049:1 | 4.5 |
| identity light | `destructiveText` on `active` | 4.403:1 | 4.5 |
| high-contrast light | all four `xText` on `active` | 6.124–6.722:1 | 7 |

The dark sets already pass (tightest 5.07:1, Linux dark `destructiveText` on
`selected`; AAA dark 8.29:1), so this is a light-palette defect, not a wash
defect. The platform light styles inherit the identity's status ramp, so one
change per role fixes every variant.

## 2. Decision

Publish `selectionStatusPairs`: the four `xText` roles over the composited
`selection` wash on all nine `selectionSurfaces`, at the `secondary` floor
(4.5:1, 7:1 at AAA) — the same class the static status pairs already use. Add
them to `themeContrastFailures` through `textOverWashFailures`, so an edited
theme is checked exactly like the shipped ones.

Move six light values one designed half-step darker, between the ramp steps the
role already uses:

| Role | Was | Becomes |
| ---- | --- | ------- |
| light `successText` | `green[700]` `#116A43` | `#0E5739` |
| light `destructiveText` | `red[700]` `#A5262B` | `#8F2126` |
| AAA light `infoText` | `blue[900]` `#152F6B` | `#102352` |
| AAA light `successText` | `green[900]` `#0A3A26` | `#082C1D` |
| AAA light `warningText` | `amber[900]` `#4B3100` | `#3A2500` |
| AAA light `destructiveText` | `red[900]` `#5C1619` | `#4E1215` |

After the move every shipped set clears its floor; the tightest default set is
**4.661:1** (XP light `infoText` on `active`) and the tightest AAA set
**7.370:1** (identity light high `warningText` on `active`). No dark value moves.

Rejected alternatives, with reasons:

- **Lower the selection alpha** — the wash is a design decision shared by every
  role, and body and secondary text already pass; weakening the highlight on
  every surface to accommodate four tones inverts the fix.
- **Exempt status text** — `xText` exists for labels on row washes, so the
  composition is supported by the role's own documentation; the six values are a
  small designed step, not a reason to carve out a role.
- **Change the dark sets** — they pass; moving them would be a visual change with
  no measured failure.
- **Add `xText` on the four soft fills** — a status panel's own title is
  `xSoftForeground` and is already measured through the wash (plan 362); an
  `xText` label inside a panel would mix two tonalities and is not a shipped
  composition.
- **Include `primaryText`** — an accent-toned link is the documented omission
  (plans 087 and 362). It stays out, but the design-system non-goal now says
  **links**, not "a link or status tone", because the status half is closed.
- **Move the whole green/red/blue/amber ramp** — a ramp step is shared with the
  solid fills, soft foregrounds and borders; a role-scoped half-step is the
  smallest change that keeps the palette intact.

## 3. Exact edits

### 3.1 `packages/tokens/src/color.ts`

- `lightColors`: `successText: "#0E5739"`, `destructiveText: "#8F2126"`.
- `highContrastLightColors`: `infoText: "#102352"`, `successText: "#082C1D"`,
  `warningText: "#3A2500"`, `destructiveText: "#4E1215"`.
- Extend the two comment blocks: the light status roles gain a half-step so a
  status label keeps the secondary floor when it is selected on the pressed row
  (plan 366); the AAA status roles do the same at 7:1.

### 3.2 `packages/tokens/src/contrast.ts`

After `selectionPairs`:

```ts
/**
 * The status labels a reader selects with the copy around them. `xText` is the
 * role for a label, icon or dot on the plain surfaces and the four row washes
 * (plan 083), and a selectable row's label is dragged over like any other text,
 * so the four tones are held through the composited wash exactly like body and
 * secondary text.
 */
export const selectionStatusPairs: readonly ContrastPair[] =
  statusTones.flatMap((tone) =>
    selectionSurfaces.map(
      (surface): ContrastPair => [`${tone}Text`, surface, "secondary"],
    ),
  );
```

In `themeContrastFailures`, after `textOverWashFailures(selectionPairs, …)`:

```ts
...textOverWashFailures(selectionStatusPairs, "selection", theme, floors),
```

Extend the `themeContrastFailures` JSDoc with one clause: the four `xText` roles
through the wash on the nine surfaces, reported with `wash: "selection"`.

### 3.3 `packages/tokens/src/selection-status.test.ts` (new)

Header states the bug guarded: a status label on a selectable row was measured
only at rest; through the selection wash XP light `successText` measured
3.671:1 and identity light high every tone 6.12–6.72:1 while
`themeContrastFailures` returned `[]`.

Cases:

1. **Every shipped set clears the floor.** Iterate identity × modes × contrasts,
   the three platform variants × modes × contrasts and both recipes × modes ×
   contrasts (the `selection-status-panel.test.ts` loop); every
   `["${tone}Text", surface]` pair through `compositeOver(selection, surface)` is
   at or above `contrastFloors[theme.contrast].secondary`.
2. **The two tightest figures.** XP light `infoText` on `active` is
   `Number(ratio.toFixed(3)) === 4.661`; identity light high `warningText` on
   `active` is `7.37` (two decimals).
3. **The list is the four tones on nine surfaces.** 36 entries, one per
   `statusTones` × `selectionSurfaces`, every class `secondary`, and no
   `primaryText` entry (the documented omission).
4. **The checker reports an erased label.** Set `successText` to
   `compositeOver(selection, "active")` on the light theme; expect exactly one
   failure for `successText`/`active` with `wash: "selection"`, class
   `secondary`, floor 4.5 and ratio 1.
5. **The historical regression does not return.** Assert the pre-fix
   `#116A43` on the XP light wash (`#…`, derive from
   `getPlatformRecipeTheme("xp", "light")`) is below 4.5, so the recorded bug is
   the one guarded.

### 3.4 `packages/tokens/src/contrast.test.ts`

- Add `["selectionStatusPairs", selectionStatusPairs]` to `publishedPairLists`
  (the uniqueness guard).
- Extend the opaque-wash expectation with
  `...selectionStatusPairs.map(([foreground, background]) => [foreground, background])`
  after the `mutedForeground` block and before `selectionSoftPairs`.
- `expect(selectionStatusPairs).toHaveLength(36)` in "covers every documented
  pair".
- Add the list to `measuredRoles` in "contract completeness".
- Import the new export.

### 3.5 `docs/tokens.md`

- Default role table rows: `successText` `#0E5739`, `destructiveText` `#8F2126`.
- High-contrast table rows: `infoText` `#102352`, `successText` `#082C1D`,
  `warningText` `#3A2500`, `destructiveText` `#4E1215`.
- **Text selection**: add a paragraph after the secondary-text paragraph —
  status labels are held through the same wash on the nine surfaces
  (`selectionStatusPairs`), the audit's worst values (XP light 3.671:1, Aero
  light 3.721:1, AAA light 6.124:1), the six half-steps and the new tightest
  figures (4.661:1 XP light `infoText` on `active`; 7.370:1 AAA light
  `warningText` on `active`). Change "An accent-toned link is the one deliberate
  omission" (already says link) and keep `primaryText` out.
- **Verification**: name `selectionStatusPairs` (36 pairs) beside the other
  selection lists; append plan 366 to the pair-count history with the figures;
  update "the tightest shipped value is `successText` on `muted` at 5.92:1" to
  the new derived value (7.69:1, Aero light).

### 3.6 `docs/design-system.md`

- §8 state table, **text selection** row: add that a status label (`xText`) keeps
  its floor through the wash.
- §9 floor table: add
  `| text selection of a status label (\`xText\` over the composited \`selection\` wash on \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`/\`selected\`) | 4.5:1 | 7:1 |`
  after the secondary-text selection row.
- §12 non-goals: scope the omission to accent-toned **links**; status tones are
  measured now (plan 366).

### 3.7 `packages/tokens/src/docs.test.ts`

- Update the full wash sentence (line ~561) to include the status clause.
- Add the new floor-table row to the `rows` array (~1330).
- Update the quoted `successText`/`muted` figure 5.92 → 7.69.
- Add a case deriving the two selection-status figures and requiring the docs
  sentence that quotes them.
- Keep the `selectionStatusPairs` prose claim in the list at ~581.

### 3.8 `packages/tokens/README.md` and `readme.test.ts`

- Add one sentence to **Checking a theme**: the four `xText` roles are measured
  through the wash on the nine surfaces, tightest XP light 4.661:1; change
  "accent-toned text stays the documented omission" to "accent-toned links".
- Extend the existing "secondary text and the wash" case (or add one) to require
  the status sentence, so the README cannot drift.

### 3.9 `COMPONENTS.md` and `inventory.test.ts`

- **Theme contrast check** row: add
  `${selectionStatusPairs.length} status-selection text pairs` and the plan 366
  evidence sentence.
- `inventory.test.ts`: import `selectionStatusPairs` and require that phrase in
  the `stateTheContract'sPairCounts` list.

### 3.10 `.agents/slop/plans/README.md`

- Table row: `| [366](./366-status-selection.md) | The status label through a text selection | F | 083, 087, 354, 362 | done |`
- Closing paragraph: the 162-pair probe, the six half-steps, the new counts and
  the omission that stays.

### 3.11 `TODO.md`

One ticked row under the tokens section; the progress bar moves 133/183 →
134/184.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/color.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-status.test.ts)
# EXPECT: cases 1 and 5 FAIL — the unchanged light `successText` is 3.671:1 on
# the XP wash and 4.049:1 on the identity wash; cases 2–4 fail too because the
# figures move with the value.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-status.test.ts)
# EXPECT: all six cases pass.

git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-status.test.ts)
# EXPECT: the suite cannot import `selectionStatusPairs` — the list is new.
git stash pop
```

Then:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: 77 → 78 files and ~4301 → ~4330 tests, all pass; `check:tests`, oxlint,
oxfmt and `tsc --noEmit` clean.

Guarded documents:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/contrast.test.ts
```

## 5. STOP conditions

- A shipped set still misses the floor after the six moves (re-derive the
  candidate; do not lower the floor).
- A static status pair breaks in a light set (would mean the step is too dark to
  be a status tone — report the measured pair instead of guessing).
- The new pairs change `contrastPairs.length` (they are a separate list; the
  count must stay 338).
- The docs or ledger derive a different tightest figure than the suite.
- `nub run check` or `nub run lint` fails outside these files.

## 6. Acceptance criteria

- `themeContrastFailures` reports a status label erased by the selection wash,
  with `wash: "selection"`; every shipped set returns `[]`.
- `selectionStatusPairs` has 36 entries; `primaryText` is still absent and the
  docs say why.
- The six light values move; no dark value, platform style, recipe, pair count
  for `contrastPairs`, floor or metric changes.
- The two docs pages, the README, the ledger and the plan index state the new
  guarantee and the figures; every guarded suite passes.
- No path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The `components` migration recorded in `TODO.md` (plan 057) moves inline
status text onto `statusTone(...).text`; this plan makes that role safe through
a selection before it lands.
