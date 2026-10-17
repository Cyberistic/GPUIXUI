# 083 — The status text on the state washes

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (status tones), `057` (status text roles), `063` (platform styles), `071`–`082` (the contrast contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`themeContrastFailures` is documented as **the library's guarantee in one
assertion**. Plans `074`–`082` closed the surfaces it had never measured, each
time finding a shipped defect behind the missing pair. The class left open is
**status text on the state washes**.

`xText` (`infoText`, `successText`, `warningText`, `destructiveText`) is the
tonality for a status label, icon or indicator dot drawn on a *surface*. The
contract measures it on `background`, `card` and `popover` only. But the
mission asks for status **indicator dots**, and every row-based component paints
a state wash behind its own content:

- a list or table row paints `hover` / `active` while the pointer moves and
  `accent` / `selected` where the row is selectable;
- a menu item paints `hover` / `active` (`components/src/menu/item.tsx`);
- a destructive menu item already paints `destructiveText`
  (`components/src/menu/item.tsx:76`, recorded in `TODO.md`).

A status dot or label in any of those rows sits on a wash, not on a plain
surface. Nothing measured that.

The audit found a real defect in **every light set**, in the same class as plans
`076`, `078` and `079`:

| Set | `warningText` on `active` | Floor |
| --- | ------------------------- | ----- |
| identity light | **4.56:1** (passes by 0.06) | 4.5:1 |
| macOS light | **4.22:1** | 4.5:1 |
| Linux light | **4.24:1** | 4.5:1 |
| Windows light | **4.36:1** | 4.5:1 |
| high-contrast light | **5.83:1** | 7:1 |

High-contrast light also fails the other three washes: `hover` **6.92:1**,
`accent` and `selected` **6.70:1**, all under the AAA 7:1 floor the design system
states for status text. Linux light `selected` (4.55:1) and Windows light
`selected` (4.54:1) clear the floor by four hundredths. The suite stayed green
because the pair was absent, not because the values were safe — the same failure
mode as plans `076`–`082`.

`infoText`, `successText` and `destructiveText` clear the floors on every wash in
every shipped set; only `warningText` must move.

## 2. Design decisions (do not re-litigate)

1. **Four tones × four washes, `secondary` class.** A status label is text with
   the same floor as the plain surfaces already documented (4.5:1 default, 7:1
   at high contrast). No new pair class and no new export: `statusTextWashPairs`
   is generated beside `secondaryTextPairs`.
2. **The four washes are the ones rows paint**, exactly as plan 079 defined
   them: `hover`, `active`, `accent` (a selectable row's hover) and `selected`.
   `secondary` and `muted` are not state washes and stay out of this slice.
3. **Fix identity light `warningText` one ramp step darker**:
   `palette.amber[700]` (`#8E5B00`) → `palette.amber[800]` (`#6B4500`). That is
   the value the high-contrast light set uses today, so it is already a designed
   step. Measured after the move: 7.49 / 6.71 / 7.49 / 7.49 on the identity, and
   6.21–7.44 on the three platform variants' washes — every light default set
   clears 4.5:1 with margin.
4. **Fix high-contrast light `warningText` one ramp step darker**:
   `palette.amber[800]` (`#6B4500`) → `palette.amber[900]` (`#4B3100`).
   Measured: 9.86 / 8.31 / 9.55 / 9.55 — every AAA wash clears 7:1 with margin.
5. **No wash, surface or other `xText` value moves.** `infoText`,
   `successText` and `destructiveText` already pass on all four washes; the dark
   sets pass by a wide margin (8.4:1 and up).
6. **One description.** The pair list stays the only place the floor is stated;
   both suites keep iterating `contrastPairs`, and the documents are built from
   the implementation.
7. **This does not adopt the role for `components`.** The consumer row in
   `TODO.md` stays open; this plan only makes the contract catch a regressed wash
   when it does adopt `destructiveText` for menu labels.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/083-status-text-state-washes.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | a generated `statusTextWashPairs` block; JSDoc |
| `packages/tokens/src/color.ts` | light and high-contrast light `warningText`; role JSDoc |
| `packages/tokens/src/contrast.test.ts` | header, pair count `80` → `96` |
| `packages/tokens/src/status-text.test.ts` | **new** — the regression test |
| `packages/tokens/src/docs.test.ts` | status-table surfaces, contrast-surface sentence, §9 floor row |
| `docs/tokens.md` | colour table values, status section, checking and verification prose |
| `docs/design-system.md` | §4 status paragraph, §8 status row, §9 status-text row |
| `packages/tokens/README.md` | the checking paragraph and the status-tones section |
| `COMPONENTS.md` | the *Theme contrast check* and *Status tones* rows |
| `TODO.md` | one ticked row, the section bar, and the consumer row's note |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add one generated block after `primaryTextPairs`:

```ts
/**
 * The state washes a row paints behind a status label, icon or indicator dot:
 * pointer hover, press, the accent a selectable row uses on hover, and the
 * selected fill. A status dot in a list, table or menu sits on all four, so the
 * `secondary` floor applies to each.
 */
const statusTextWashes = ["hover", "active", "accent", "selected"] as const;

const statusTextWashPairs: readonly ContrastPair[] = (["info", "success", "warning", "destructive"] as const).flatMap(
  (tone) =>
    statusTextWashes.map(
      (background): ContrastPair => [`${tone}Text`, background, "secondary"],
    ),
);
```

Spread `...statusTextWashPairs` after the four plain `xText` blocks and before
`...primaryTextPairs`. Expand the JSDoc of `contrastPairs` and
`themeContrastFailures`: "including status text on the state washes". Keep the
exported array a literal; only generated blocks are derived.

### 4.2 `packages/tokens/src/color.ts`

- `lightColors.warningText: palette.amber[700]` → `palette.amber[800]`.
- `highContrastLightColors.warningText: palette.amber[800]` →
  `palette.amber[900]`.
- The four `xText` role comments change "on plain surfaces" to "on plain
  surfaces and the state washes a row paints", so the role comment matches the
  contract.

Do not touch any other colour.

### 4.3 `packages/tokens/src/contrast.test.ts`

- Header: add the plan 083 paragraph (the defect and the two moved values).
- `covers every documented pair`: `80` → `96`.

No other assertion changes: the quiet brand and quiet high-contrast examples
override `mutedForeground` only.

### 4.4 `packages/tokens/src/status-text.test.ts` (new)

Header comment: the bug guarded — status text was measured only on
`background`/`card`/`popover`, so a warning label in a pressed row measured
4.22:1 on macOS light, 4.24:1 on Linux light and 4.36:1 on Windows light under
the 4.5:1 floor, and high-contrast light measured 5.83:1 on `active`, 6.70:1 on
`accent`/`selected` and 6.92:1 on `hover` under 7:1.

Tests (vitest, inert data — no Effect needed):

1. `every shipped theme clears the status-wash floors` — build the sixteen themes
   (identity and the three real platform variants, both modes, both contrast
   levels) with `getTheme` / `getPlatformTheme`; read the status wash pairs from
   `contrastPairs` (filter foreground ends with `Text` and is not
   `primaryText`); collect every ratio below
   `contrastFloors[theme.contrast].secondary` as
   `theme / foreground / background / ratio` and assert the array is empty.
2. `keeps a warning label readable in a pressed row` — the named regression:
   identity, macOS, Linux and Windows light `warningText` on `active` is
   `>= 4.5`, and the three variants use the identity's moved value
   (`lightTheme.colors.warningText`). Assert the old `#8E5B00` is gone.
3. `holds the high-contrast warning tonality to AAA on every wash` — iterate the
   four washes on `highContrastLightTheme`, assert each ratio is `>= 7`, and
   assert `#4B3100` is the value.
4. `the checker names the wash pair when a theme regresses` — extend the macOS
   light theme with `warningText: "#8E5B00"` and assert
   `themeContrastFailures` returns exactly one `warningText`/`active` failure at
   the `secondary` class, floor 4.5, with a ratio below 4.5.
5. `the contract publishes all sixteen status-wash pairs` — assert
   `contrastPairs.filter(...)` has 16 entries, one for each tone and wash.

### 4.5 `packages/tokens/src/docs.test.ts`

- `names every surface the contract checks status text on, in both tables`:
  `expect(surfaces.length, tone).toBe(3)` → `7`.
- The contrast-surfaces sentence gains status text on the four washes: append
  "status text (`xText`) is measured on those four washes as well as on
  `popover`, so a status label inside a hovered, pressed or selected row is
  covered; the `borderStrong` boundary is also measured on `popover`."
- The §9 floor row becomes:
  `| status text (\`xText\`) on \`background\`/\`card\`/\`popover\` and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes | 4.5:1 | 7:1 |`.

### 4.6 `docs/tokens.md`

- Colour table, light `warningText` row: `#8E5B00` → `#6B4500`; high-contrast
  table row: `#6B4500` → `#4B3100`. Both rows' Use cell becomes "warning text and
  indicators on plain surfaces and the state washes".
- *Status tones*: `xText` is described as the readable tonality for the plain
  surfaces **and the state washes a row paints**; state that the held surfaces
  are `background`/`card`/`popover` and `hover`/`active`/`accent`/`selected`, at
  4.5:1 / 7:1.
- *Checking a theme*: the `contrastPairs` description adds status text on the
  state washes beside secondary text.
- *Verification*: the status-text clause gains the four washes, and a sentence
  names the defect: platform light pressed washes shipped at 4.22–4.36:1 and
  high-contrast light at 5.83–6.92:1 until plan 083 moved the two warning steps.
- The contrast-surfaces paragraph carries the new status-wash sentence (the
  guard in §4.5 pins it).

### 4.7 `docs/design-system.md`

- §4 status paragraph: `xText` is for labels, icons and indicator dots on plain
  surfaces **and the washes a row paints**, not only `background`/`card`.
- §8 status row: name the washes for indicator dots.
- §9 table row: the status-text row in §4.5.

### 4.8 `packages/tokens/README.md`

- *Checking a theme*: add status text on `hover`/`active`/`accent`/`selected` to
  the list, and the plan 083 defect sentence (platform light 4.22–4.36:1,
  high-contrast light 5.83:1).
- *Status tones*: the `xText` paragraph names the state washes as well as plain
  surfaces.

### 4.9 `COMPONENTS.md`

- *Theme contrast check* row: `80` → `96` pairs; add the plan 083 paragraph —
  status text on the four state washes, the platform light pressed-wash defect
  and the two moved warning steps.
- *Status tones* row: the `xText` surfaces listed become plain surfaces plus
  the four state washes.

### 4.10 `TODO.md`

- Add a ticked row under the tokens/theme section:
  `[x] Hold status text on the state washes a row paints — the platform light pressed wash measured 4.22–4.36:1 and high-contrast light 5.83:1 (plan 083)`.
- Move the section bar `50/66` → `51/67`.
- In the existing `components` consumer row about `destructiveText`, replace
  "the two menu washes can join it once the role is adopted" with "the contract
  already checks `destructiveText` on `hover`/`active` (plan 083)".

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including the new `status-text.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Set `lightColors.warningText` back to `palette.amber[700]`, run
   `nub run --filter @gpuixui/tokens test`; `status-text.test.ts` must fail on the
   macOS/Linux/Windows light `active` pair (4.22 / 4.24 / 4.36 at the 4.5 floor)
   and the generic pair loops in `color.test.ts` / `platforms.test.ts` must fail
   on the same pairs. Restore.
2. Set `highContrastLightColors.warningText` back to `palette.amber[800]`, run
   the suite; it must fail on all four high-contrast light washes at the 7:1
   floor (6.92 / 5.83 / 6.70 / 6.70). Restore.
3. Delete `...statusTextWashPairs` from `contrastPairs`, run the suite; the pair
   count must fail (`expected 80 to be 96`), the sixteen-pair test must fail, and
   the docs status-table guard must fail. Restore.

Record the exact failure text in §8.

## 6. STOP conditions

Stop and report with evidence if:

- **Any shipped set still fails a new pair after the two value moves.** The
  measured margins are in §2.3–2.4; a different failure means another value
  moved. Do not lower the floor.
- **A test outside `packages/tokens` starts failing.** That is a consumer
  assertion (a hard-coded `#8E5B00` or pair count): record it in `TODO.md` as a
  cross-team row, do not edit the other workstream's file.
- **The docs status-table guard cannot be satisfied with the seven surfaces.**
  The row text must name each surface; shorten the prose, not the list.
- **`warningText` on a plain surface becomes unreadable in either mode.** The
  moves only increase contrast; a regression means the wrong role moved.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `status-text` #1 | unit | a shipped theme (identity, high contrast or platform) losing status text on a state wash |
| `status-text` #2 | unit | the exact platform light regression: a pressed row's warning label under 4.5:1 |
| `status-text` #3 | unit | the AAA warning tonality dropping under 7:1 on any wash |
| `status-text` #4 | unit | the public checker silently dropping the status wash pair |
| `status-text` #5 | unit | the contract shrinking or growing without a deliberate edit |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| `color.test.ts` / `platforms.test.ts` generic loops | unit | any shipped colour set failing a documented pair |
| `docs.test.ts` status table + floor row | unit | a document that stops naming a surface the contract checks |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **96** pairs: 80 + the four tones on four washes.
- `lightColors.warningText` moved `#8E5B00` → `#6B4500`; measured on the light
  identity **7.49 / 6.71 / 7.49 / 7.49** on `hover` / `active` / `accent` /
  `selected`, and 6.21–7.44 on the three platform variants' washes.
- `highContrastLightColors.warningText` moved `#6B4500` → `#4B3100`; measured
  **9.86 / 8.31 / 9.55 / 9.55** on the same four washes.
- Every other status tone already cleared its floors on all four washes; no
  other colour moved.
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - reverting the light value to `#8E5B00` produced **7 failed / 1236 passed**,
    including `platforms.test.ts` ("darwin light warningText on active:
    expected 4.217255744118373 to be greater than or equal to 4.5", Linux
    4.242700956420351, Windows 4.362453886795726), the `status-text` floor and
    pressed-row tests, the variant contract test, and the colour-table guard
    (the document still carried `#6B4500`);
  - reverting the high-contrast value to `#6B4500` produced **10 failed / 1233
    passed**: hover 6.920927566441438, active 5.83460363798379, accent and
    selected 6.703696684142231 against the 7:1 floor, plus the AAA contract and
    the docs table;
  - removing `...statusTextWashPairs` produced **5 failed / 1078 passed**:
    `expected 80 to be 96`, `expected 3 to be 7` (the docs status-table surface
    count), the unused-block type error in the consumer compile, and empty
    results from `themeContrastFailures` and the published-pairs test;
  - restoring all three made every suite green: **21 files, 1243 tests**.
