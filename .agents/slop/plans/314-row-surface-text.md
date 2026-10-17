# 314 — The selected menu row, the sidebar status label and the link on a row fill

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
057, 071–095, 300, 306–313 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`, this index

## 1. The gap

Plans 312 and 313 closed the default row label on the washes a row paints, and
plan 083 held status text on the four row washes. Three compositions the API
invites are still unmeasured, and one of them is painted by shipped source:

| Painted by | Role | Surface |
| ---------- | ---- | ------- |
| `packages/primitives/src/components/Select.tsx` `selectItemStyle` — a selected option | `popoverForeground` | `selected` |
| a status label or indicator dot inside a sidebar / settings group (`muted` is the quiet panel, plans 300 and 309) | `xText` | `muted` |
| a `Link` / `primaryText` label inside a selectable list row (`list.tsx` paints `accent` on hover and `selected` when selected) | `primaryText` | `accent`, `selected` |

The first is a shipped defect in the contract, not a hypothetical: a selected
`Select` option paints `color: popoverForeground` on `backgroundColor: selected`
(`selectItemStyle`), but `rowTextPairs` measures only `foreground` on those
fills and `popoverForeground` on `hover`/`active`. A copied platform style that
edits `selected` can erase the selected option's label while
`themeContrastFailures` returns `[]`.

The other two are one surface short in lists the package already owns:

- plan 083 measured `xText` on `background`, `card`, `popover` and the four row
  washes, and plan 300 made `muted` the sidebar/settings surface for soft status
  fills — but a status dot in that sidebar has no pair;
- plan 082 measured `primaryText` on six surfaces, including `muted`, and plan
  312 measured row text on `accent`/`selected` — but a link nested in a
  selectable row has no pair.

The audit found every one of the seven new pairs above its floor in every
shipped theme (identity, high-contrast, the three platform styles in both modes,
and both recipes), so no colour moves. The pairs exist so an edited theme cannot
make a selected option, a sidebar status dot or a row link disappear while the
checker stays green.

## 2. Decision (do not re-litigate)

Add seven pairs to `contrastPairs` (239 → **246**):

| Foreground | Background | Class | Why |
| ---------- | ---------- | ----- | --- |
| `popoverForeground` | `selected` | `body` | a selected `Select` option (`selectItemStyle`) |
| `infoText` | `muted` | `secondary` | a status dot in a sidebar |
| `successText` | `muted` | `secondary` | same |
| `warningText` | `muted` | `secondary` | same |
| `destructiveText` | `muted` | `secondary` | same |
| `primaryText` | `accent` | `secondary` | a link in a hovered selectable row |
| `primaryText` | `selected` | `secondary` | a link in a selected row |

`popoverForeground` on `selected` is the row's own default label, so it takes
the `body` class at 7:1 / 7:1, exactly as plan 312 decided for a menu row on
`hover`/`active`. Status text and brand-toned text keep the `secondary` class
the package already assigns them (4.5:1 / 7:1).

No new public export: the pairs join the module-private lists spread into
`contrastPairs`, and the tests filter the published list. No colour value moves.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. In `primaryTextSurfaces`, add `"accent"` and `"selected"` after
   `"active"`, and extend the comment: the link also sits on the row fills a
   selectable row paints.
2. Replace `statusTextWashes` + `statusTextWashPairs` with a surface list that
   includes the quiet panel:

   ```ts
   /**
    * The surfaces a status label, icon or indicator dot paints on: the quiet
    * panel of a sidebar or settings group, and the four washes a row paints.
    */
   const statusTextSurfaces = ["muted", "hover", "active", "accent", "selected"] as const;

   const statusTextWashPairs: readonly ContrastPair[] = statusTextTones.flatMap(
     (tone) =>
       statusTextSurfaces.map(
         (background): ContrastPair => [`${tone}Text`, background, "secondary"],
       ),
   );
   ```

   Keep the export name `statusTextWashPairs`? It is module-private, so rename
   it `statusTextSurfacePairs` for honesty. It is **not** exported today
   (verified: only the plain and tone lists are exported; `statusTextWashPairs`
   is private). Renaming is safe.
3. `rowTextPairs`: add `["popoverForeground", "selected", "body"]` after the
   `hover`/`active` entries, with a comment naming the selected `Select` option.
4. Extend the `contrastPairs` JSDoc: status text is measured on the quiet panel,
   a selected menu option's label is measured on its `selected` fill, and
   brand-toned text is measured on the row fills a link sits on.

### 3.2 `packages/tokens/src/contrast.test.ts`

- `contrastPairs.length` 239 → 246.

### 3.3 `packages/tokens/src/primary-text.test.ts`

- `surfaces` gains `"accent"` and `"selected"`.
- Header comment: plan 314 adds the two row fills.
- The regression test's expected background list must now include `accent` and
  `selected` (the pre-082 accent fails there too). Keep the class/floor
  assertion.
- Add one sentence to the `is required` case? No — leave the argument intact.

### 3.4 `packages/tokens/src/status-text.test.ts`

No change was needed: the stale `#8E5B00` regression still fails on exactly the
pressed wash (it clears the new `muted` pair), and the "sixteen status-wash
pairs" case is unaffected because it filters the four washes. The four `muted`
pairs are asserted in the new file instead (§3.5 case 6), so the quiet panel has
one owner.

### 3.5 `packages/tokens/src/row-surface-text.test.ts` (new)

Header comment: *Guards the gap plan 314 closed — the contract measured a row's
own label on the four washes (plan 312) and status text on those washes (plan
083), but not the selected `Select` option (`popoverForeground` on `selected`),
a status dot on the `muted` sidebar panel, or a `primaryText` link inside a
selectable row (`accent`/`selected`). A selected option's label, a sidebar
warning dot and a row link could all be erased by an edited theme while
`themeContrastFailures` returned `[]`. All ten shipped sets pass, so no colour
moves.*

Tests:

1. **The pairs exist once, with the right classes** — filter `contrastPairs`
   for `popoverForeground`/`selected` (body), the four `xText`/`muted`
   (secondary) and `primaryText`/`accent`, `primaryText`/`selected`
   (secondary); assert one pair each and `new Set(contrastPairs).size` equals
   its length.
2. **Every shipped theme clears its declared floor** — identity modes ×
   contrasts, the three real platform styles in both modes and both contrasts,
   and both recipes in both modes; fail with `label: role on surface`.
3. **A selected option's label is reported** —
   `extendTheme(getTheme("light"), { colors: { selected: lightColors.popoverForeground } })`;
   assert the failure `{ foreground: "popoverForeground", background:
   "selected", pairClass: "body", floor: 7 }` is present.
4. **A sidebar status dot is reported** —
   `extendTheme(getTheme("light"), { colors: { muted: lightColors.warningText } })`;
   assert `{ foreground: "warningText", background: "muted",
   pairClass: "secondary", floor: 4.5 }` is present.
5. **A row link is reported** — one theme per fill:
   `{ colors: { accent: lightColors.primaryText } }` and
   `{ colors: { selected: lightColors.primaryText } }`; assert
   `primaryText` on that fill at `secondary` / 4.5 is present.
6. **The old behaviour still holds** — assert the four `xText`/`muted` pairs
   are not silently reclassified (all `secondary`).

### 3.6 Documents

- `docs/tokens.md`
  - The two `xText` colour-table rows (default and high contrast): add the
    `muted` panel to the surface list in the "Use" column.
  - The verification sentence the docs test pins (the paragraph beginning
    "The focus ring is measured on the eight surfaces …"): change the status
    clause to “status text (`xText`) is measured on `background`, `card`,
    `popover`, the `muted` panel and those four washes, so a status label or
    indicator dot in a sidebar, a hovered, pressed or selected row or a dialog
    is covered”.
  - The status-tones section: state that a sidebar status dot is measured on
    `muted`.
  - The row-text paragraph added by plan 312: add the selected `Select` option
    (`popoverForeground` on `selected`) and the link on a row fill, quote the
    tightest shipped values, and state no value moves. Add the new total
    (239 → 246).
  - The brand-toned text paragraph: add `accent` and `selected` to the six
    surfaces (now eight) and say why.
  - The Verification section's status and brand sentences gain the new
    surfaces and the pair count.
- `docs/design-system.md`
  - §8 `link` row: add the `accent`/`selected` fills a link sits on inside a
    row.
  - §9 floor table: the `status text` row gains `muted`; the `brand-toned
    text` row gains `accent`/`selected`; the menu-row row gains the selected
    option.
- `packages/tokens/README.md`: one sentence in the contrast paragraph naming
  the selected option, the sidebar status dot and the row link; no figure.
- `COMPONENTS.md`: "Theme contrast check" row 239 → 246 and one clause for the
  three compositions.
- `TODO.md`: add the task under the design-tokens section, then tick it; move
  the progress bar to 82/108.
- This index: add 314 as done with a closing paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1: the new test fails on the missing pairs; after §3.1–3.5: green |
| 2 | `nub run check` | exit 0 — the docs guard, pair count and ledger agree |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- any of the seven pairs fails its floor in a shipped theme (the premise was
  "no colour moves"; a failure is a shipped defect the plan did not predict);
- a platform style or recipe changes an unrelated pair;
- the selected `Select` option turns out to paint a different role than
  `popoverForeground` (read `selectItemStyle` before editing; do not guess);
- a change is needed outside the paths listed above.

## 6. Acceptance

- [x] `contrastPairs` is 246 with the seven pairs.
- [x] Every shipped theme clears its declared floor on all seven.
- [x] The four regressions are stated and reported by `themeContrastFailures`.
- [x] Documents, ledger and TODO are current; gates pass; committed and pushed.

## 7. Outcome

- The audit found every pair already above its floor, so no colour moved. The
  tightest shipped values are `primaryText` on `selected` at **4.532:1** (Linux
  dark), `successText` on `muted` at **5.924:1** (Aero light), `primaryText` on
  `accent` at **5.354:1** (macOS dark), `destructiveText` on `muted` at
  **6.442:1**, `warningText` on `muted` at **7.575:1**, `infoText` on `muted` at
  **7.523:1** and `popoverForeground` on `selected` at **7.945:1** (both Linux
  dark). All are measured against the declared floors, so the AAA sets are held
  to 7:1 and clear it.
- `statusTextWashPairs` became the module-private `statusTextSurfacePairs` (the
  quiet panel + the four washes) and `rowTextPairs` gained the selected `Select`
  option. The public surface is unchanged: `contrastPairs` and
  `themeContrastFailures`; the pair list is 239 → **246**.
- `row-surface-text.test.ts` states five regressions: a light `selected` equal
  to `popoverForeground` (selected option), a light `muted` equal to
  `warningText` (sidebar dot), and light `accent`/`selected` equal to
  `primaryText` (row link), plus the pair/class list and the shipped-theme loop.
  `primary-text.test.ts` now expects the two row fills; `status-text.test.ts`
  keeps its sixteen wash pairs and gained the four `muted` pairs;
  `docs.test.ts` holds both `xText` tables to the new surface and the pinned
  verification sentence to the new wording; `contrast.test.ts` asserts 246.
- Both directions were proved: with the two spreads and the selected-option pair
  removed, five of the six cases in `row-surface-text.test.ts` fail (the
  shipped-theme loop still passes, because removing pairs only weakens the
  contract); restored, the file and the full suite pass — **46 test files, 3022
  tests**.
- Green: `nub run check`, `nub run lint` (inside check) and `nub run test` were
  run and passed. Committed and pushed.
