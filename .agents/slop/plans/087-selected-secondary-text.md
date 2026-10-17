# 087 — Selected secondary text, and the wash that must stay visible

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `057` (status text), `071` (contrast contract), `079` (secondary text on washes), `081` (selection on painted surfaces), `086` (total contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

Plan `081` measured the selection wash on the nine surfaces a selected glyph is
painted on, but only with the **body** text role each surface uses:
`foreground`, `popoverForeground`, `inputForeground` and `selectedForeground`.
Text selection covers *every* text role on those surfaces. A row description, a
card caption, a table's metadata column and a message timestamp are all
`mutedForeground`, and a drag-select over body copy selects them too.

Measured with the shipped values, `mutedForeground` over
`compositeOver(selection, surface)` falls below the 4.5:1 secondary floor on
**seven of the ten shipped colour sets**:

| Set | `mutedForeground` | Worst selected pair | Ratio | Floor |
| --- | ----------------- | ------------------- | ----- | ----- |
| identity light | `#545D6C` | on `active` | **4.06:1** | 4.5:1 |
| identity dark | `#A1A9B7` | on `active` | **3.49:1** | 4.5:1 |
| macOS light | `#5A5A5F` | on `active` | **3.96:1** | 4.5:1 |
| macOS dark | `#AEAEB2` | on `active` | **3.89:1** | 4.5:1 |
| Linux light | `#5E5C58` | on `active` | **3.87:1** | 4.5:1 |
| Linux dark | `#C0BFBC` | on `selected` | **4.10:1** | 4.5:1 |
| Windows light | `#5C5C5C` | on `active` | **3.88:1** | 4.5:1 |

Windows dark, high-contrast light and high-contrast dark already pass (5.20:1,
8.36:1 and 7.76:1 at their worst selected secondary pair).

The other direction is unguarded too. `selection` is a translucent role, and
nothing in the contract measures whether the wash is **visible** on the surface
it paints. A future edit could make the seven pairs above pass by driving the
wash's alpha toward zero and every suite would stay green, while a reader could
no longer see what they had selected. This plan closes both directions at once.

## 2. Design decisions (do not re-litigate)

1. **The second text role joins the same nine surfaces.** `selectionPairs` gains
   `["mutedForeground", surface, "secondary"]` for every entry in
   `selectionSurfaces`, so body text and secondary text are measured on exactly
   the same set. The selected row stays on the secondary floor, as it does for
   `selectedForeground`.
2. **The text moves, not the wash.** The wash values shipped by plan `081` stay
   exactly as they are:

   - macOS dark with the shipped `mutedForeground` has **no** alpha that clears
     4.5:1 while keeping the wash at the library's 1.05:1 perceivability floor —
     the largest passing alpha is `0x0D` and the wash measures 1.037:1 there.
   - Linux light has a five-step window (`0x0C`–`0x14`, 5–8% alpha) whose wash
     measures at most 1.09:1, next to the 20% every platform variant ships.
   - Raising `mutedForeground`'s contrast also fixes the *plain* pair on the
     washes, not only the selected one, and cannot make the highlight vanish.

   Moving the text is the honest direction: the role was too weak, not the wash.
3. **Values: one deliberate step away from the canvas.** The identity moves one
   palette step (neutral 600 → 700 in light, 400 → 300 in dark); each platform
   style moves within its own grey family.

   | Set | Before | After | Worst selected secondary | Foreground hierarchy |
   | --- | ------ | ----- | ------------------------ | -------------------- |
   | identity light | `#545D6C` | `#3D4552` | 5.90:1 on `active` | 1.75 |
   | identity dark | `#A1A9B7` | `#CBD1DB` | 5.38:1 on `active` | 1.35 |
   | macOS light | `#5A5A5F` | `#48484A` | 5.26:1 on `active` | 1.85 |
   | macOS dark | `#AEAEB2` | `#C7C7CC` | 5.11:1 on `active` | 1.49 |
   | Linux light | `#5E5C58` | `#4A4844` | 5.30:1 on `active` | 1.85 |
   | Linux dark | `#C0BFBC` | `#D6D5D2` | 5.13:1 on `selected` | 1.30 |
   | Windows light | `#5C5C5C` | `#4A4A4A` | 5.14:1 on `active` | 1.91 |

   Windows dark, high-contrast light and high-contrast dark keep their values.
   No other role moves. `disabledForeground` is a separate role and is untouched.
4. **The wash is measured in the contract, not only in a test.** A new
   `selectionWashPairs` list holds one entry per `selectionSurfaces` entry, and
   `themeContrastFailures` reports a surface whose composited wash is below the
   `surface` floor (1.05:1 at both levels). The shipped minimum is high-contrast
   dark at 1.061:1, so no wash value changes.
5. **One list owns the surfaces.** `selectionSurfaces` is exported and
   `selectionPairs` / `selectionWashPairs` are derived from it, so a tenth
   surface cannot join one check and miss the other.
6. **Accent-toned text is deliberately not held through the wash.** At AAA a
   visible wash cannot keep a link or status tone at 7:1: high-contrast light's
   `primaryText` measures 6.75:1 over the `muted` panel with the shipped 30%
   wash and 5.48:1 on `active`, and no lower alpha that clears 7:1 keeps the wash
   above 1.1:1. The design system states this limitation under §9's deliberate
   omissions instead of pretending the guarantee covers every tone.
7. **No call-site change.** The wash is applied once through `selectionStyle`;
   the role values are internal to the palette, so components are untouched.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/087-selected-secondary-text.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | `selectionSurfaces`, secondary `selectionPairs`, `selectionWashPairs`, wash failures in `themeContrastFailures` |
| `packages/tokens/src/color.ts` | identity `mutedForeground` (light and dark) |
| `packages/tokens/src/platform-styles/macos.ts` | `mutedForeground` light and dark |
| `packages/tokens/src/platform-styles/linux.ts` | `mutedForeground` light and dark |
| `packages/tokens/src/platform-styles/windows.ts` | `mutedForeground` light |
| `packages/tokens/src/selection-secondary.test.ts` | **new** — the regression, the shipped sets and both guards |
| `packages/tokens/src/selection-text.test.ts` | the pair list is 18 entries, not 9; the regressed-wash expectation |
| `packages/tokens/src/contrast.test.ts` | the contract's measured roles include `selectionWashPairs`; the pair counts |
| `packages/tokens/src/readme.test.ts` | the README names the selected secondary pair and the wash guard |
| `packages/tokens/src/docs.test.ts` | the new §9 rows, the selection sentences, the contract sentence |
| `packages/tokens/README.md` | the checking paragraph gains the selected secondary and wash sentences |
| `docs/tokens.md` | the role row, the selection section, the checking section |
| `docs/design-system.md` | the state table, the floor table, the deliberate omission |
| `COMPONENTS.md` | the *Design tokens* and *Theme contrast check* rows |
| `TODO.md` | one ticked row and the section bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Replace the `selectionPairs` block with one surface list and two derived lists:

```ts
/**
 * The surfaces a selected glyph is painted on: the plain surfaces, the quiet
 * panel, the field, the three state washes and a selected row. A selection wash
 * that only covers the canvas leaves the other eight unprotected.
 */
export const selectionSurfaces = [
  "background",
  "card",
  "muted",
  "hover",
  "active",
  "accent",
  "popover",
  "input",
  "selected",
] as const;

const selectionForegrounds: Readonly<
  Record<(typeof selectionSurfaces)[number], keyof ThemeColors>
> = {
  background: "foreground",
  card: "foreground",
  muted: "foreground",
  hover: "foreground",
  active: "foreground",
  accent: "foreground",
  popover: "popoverForeground",
  input: "inputForeground",
  selected: "selectedForeground",
};

/**
 * Every text pair a selected glyph paints: the body role each surface uses on
 * the left, and secondary text (`mutedForeground`) on the same surface on the
 * right. A row description or a message timestamp is selected with the body
 * copy around it, so it carries the secondary floor through the same wash.
 */
export const selectionPairs: readonly ContrastPair[] = [
  ...selectionSurfaces.map(
    (surface): ContrastPair => [
      selectionForegrounds[surface],
      surface,
      surface === "selected" ? "secondary" : "body",
    ],
  ),
  ...selectionSurfaces.map(
    (surface): ContrastPair => ["mutedForeground", surface, "secondary"],
  ),
];

/**
 * The surfaces a selection wash must stay visible on. Each entry compares a
 * surface with itself through the wash, so a theme that makes the wash
 * imperceptible fails the `surface` floor even when every glyph is readable.
 */
export const selectionWashPairs: readonly ContrastPair[] =
  selectionSurfaces.map(
    (surface): ContrastPair => ["selection", surface, "surface"],
  );
```

In `themeContrastFailures`, after the existing `washFailures`, add:

```ts
const washVisibilityFailures: ReadonlyArray<ContrastFailure> =
  selectionWashPairs.flatMap(([foreground, background, pairClass]) => {
    const ratio = contrastRatio(
      compositeOver(theme.colors.selection, theme.colors[background]),
      theme.colors[background],
    );
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [
          {
            foreground,
            background,
            wash: "selection" as const,
            pairClass,
            floor,
            ratio,
          },
        ];
  });
return [...pairFailures, ...washFailures, ...washVisibilityFailures];
```

Update the JSDoc of `selectionPairs`, `themeContrastFailures` and
`ContrastFailure` (`foreground` already reads "the role carrying text, or the
surface being perceived" — the wash pair is the second case).

### 4.2 `packages/tokens/src/color.ts`

Two values, with the reason in the doc comment:

```ts
mutedForeground: palette.neutral[700], // was palette.neutral[600]; selected secondary text measured 4.06:1 on `active`
mutedForeground: palette.neutral[300], // was palette.neutral[400]; selected secondary text measured 3.49:1 on `active`
```

Update the `lightColors` / `darkColors` doc comments to name the selected-text
floor beside the divider note (plan 080 already explains the half-step border).

### 4.3 The platform styles

| File | Mode | Before | After |
| ---- | ---- | ------ | ----- |
| `platform-styles/macos.ts` | light | `#5A5A5F` | `#48484A` |
| `platform-styles/macos.ts` | dark | `#AEAEB2` | `#C7C7CC` |
| `platform-styles/linux.ts` | light | `#5E5C58` | `#4A4844` |
| `platform-styles/linux.ts` | dark | `#C0BFBC` | `#D6D5D2` |
| `platform-styles/windows.ts` | light | `#5C5C5C` | `#4A4A4A` |

Windows dark keeps `#C7C7C7` (5.20:1 through the wash). Update each file's doc
comment with the new measured worst selected pair; do not change any other role.

### 4.4 Tests

**New `packages/tokens/src/selection-secondary.test.ts`**, header comment
stating the bug: *secondary text was never measured through the selection wash;
identity light measured 4.06:1 and identity dark 3.49:1 on a pressed row while
every suite stayed green.*

- `selectionPairs` holds 18 entries: nine body pairs over `selectionSurfaces`,
  then nine `mutedForeground` pairs; `selectionWashPairs` holds nine.
- Every shipped set (identity light/dark, high-contrast light/dark, macOS, Linux
  and Windows light/dark) clears the secondary floor for `mutedForeground` over
  `compositeOver(selection, surface)` on every `selectionSurfaces` entry.
- **Both directions:** a theme extended with the pre-fix `#545D6C` reports the
  identity-light failure —

  ```ts
  const regressed = extendTheme(getTheme("light"), {
    colors: { mutedForeground: "#545D6C" },
  });
  const failures = themeContrastFailures(regressed).filter(
    ({ foreground, wash }) =>
      foreground === "mutedForeground" && wash === "selection",
  );
  // names `active` first, floor 4.5, ratio ≈ 4.06
  ```

  Removing `mutedForeground` from `selectionPairs` makes this array empty and
  fails the test.
- The wash guard: every shipped set keeps every `selectionWashPairs` entry at or
  above `contrastFloors[level].surface`; a theme with `selection: "#7567F205"`
  reports nine wash failures on `selectionSurfaces`.

**Update `packages/tokens/src/selection-text.test.ts`**: the pair-list assertion
becomes the 18-entry list; the pre-081 regressed wash now also fails the
secondary pairs on `hover`, `active` and `selected`. Keep the body assertions.

**Update `packages/tokens/src/contrast.test.ts`**: `measuredRoles` reads
`[...contrastPairs, ...selectionPairs, ...selectionWashPairs]` and the manual
`measuredRoles.add("selection")` is deleted; assert `selectionPairs.length` is
18 and `selectionWashPairs.length` is 9 beside the existing 103. The
"vanishes into its canvas" tests still filter `pairClass === "surface"` and now
also see wash entries only when the wash is invisible, so leave their themes
alone.

**Update `packages/tokens/src/docs.test.ts`**:

- the `design-system.md` floor rows gain
  `| text selection of secondary text (\`mutedForeground\` over the composited \`selection\` wash on ...) | 4.5:1 | 7:1 |`
  and
  `| text selection wash (\`selection\` composited over ...) | 1.05:1 | 1.05:1 |`,
  built from `contrastFloors`;
- the "names every wash the secondary text pairs are held against" test also
  reads the new `selectionPairs` entries;
- the contract sentence guard (the long paragraph at ~line 464) gains the
  selected-secondary and wash-guard clauses;
- a guard that `docs/tokens.md` names `selectionWashPairs` and
  `selectionSurfaces`.

**Update `packages/tokens/src/readme.test.ts`**: the README names
`mutedForeground` through the selection wash and `selectionWashPairs`.

### 4.5 Documents

- `docs/tokens.md`: the identity role table row (`#545D6C`/`#A1A9B7` →
  `#3D4552`/`#CBD1DB`); the *Text selection* section ("body text" becomes "body
  and secondary text", with the nine surfaces and the secondary floor); the
  *Checking a theme* section (selected secondary, the wash floor and
  `selectionWashPairs`); the contract-coverage paragraph.
- `docs/design-system.md` §8 state table: the text-selection row names body and
  secondary text and the wash's own perceivability. §9: two new rows (selected
  secondary text, selection wash) and a deliberate omission for accent-toned
  text under a wash (with the 6.75:1/5.48:1 evidence). §4's surface table does
  not quote `mutedForeground`, so it does not change.
- `packages/tokens/README.md`: the checking paragraph gains both sentences.
- `COMPONENTS.md`: *Design tokens* and *Theme contrast check* rows gain the
  selected-secondary and wash coverage; the pair count stays 103 for
  `contrastPairs`, and the row now also states 18 selection pairs and 9 wash
  pairs.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes (the new file is green and every existing
file still passes); type-check and `check` are clean; the root `lint` and `test`
pass.

**Two-direction proof, run before committing:**

1. Set identity light's `mutedForeground` back to `palette.neutral[600]` and run
   the package suite: `selection-secondary.test.ts` must fail, naming `active`
   at 4.06:1. Restore the value.
2. Set `lightColors.selection` to `"#7567F205"` and run the package suite: the
   wash guard must fail on every `selectionSurfaces` entry. Restore the value.
3. Confirm the final suite is green again.

## 6. STOP conditions

- If any shipped set cannot clear the secondary floor on all nine surfaces with
  a `mutedForeground` whose contrast against `foreground` stays at least 1.25
  (a visible hierarchy step), **stop** and report the set, the best ratio and
  the hierarchy. Do not lower the floor and do not touch the wash value.
- If `themeContrastFailures` returns any existing pair failure after the value
  changes (other than the intentionally regressed fixtures in the tests), stop:
  the palette move broke a contract, and the fix is not "widen the floor".
- If `docs.test.ts` cannot derive a sentence from `selectionPairs` /
  `selectionWashPairs` without hardcoding the nine surface names twice, stop and
  report; do not duplicate the list in prose and code.
- If the new wash failures make an existing test's expected failure list
  ambiguous (for example a fixture that was only meant to exercise body text),
  narrow that test by `pairClass` or `wash` rather than deleting its assertion.

## 7. Acceptance

- [ ] `selectionSurfaces` is the one list; both pair lists derive from it.
- [ ] `selectionPairs` holds 18 entries (nine body, nine secondary);
      `selectionWashPairs` holds nine.
- [ ] Every shipped colour set clears its secondary floor for selected
      secondary text and its `surface` floor for the wash itself.
- [ ] `themeContrastFailures` reports both a selected-secondary miss and an
      invisible wash, naming the surface, the class and the floor.
- [ ] The six failing values and Linux dark's value are the only colour changes;
      Windows dark and both high-contrast sets are unchanged.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` state the new coverage and the deliberate accent-text
      omission.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.
