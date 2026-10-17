# 084 — The control boundary on the washes a row paints

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014`, `063`, `071`–`083` (the contrast contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`borderStrong` is the **essential control boundary**: a text field's edge while
hovered, and an unchecked checkbox or radio's edge while hovered or pressed
(`packages/primitives/src/core/variants.ts`, `core/selection.ts`). It is held to
the non-text floor (3:1, 4.5:1 at high contrast).

The contract measures it on `background`, `card`, `input` and `popover` only.
The controls that paint it sit inside rows, quiet panels and lists, whose fill
changes with state or is `muted`:

- a table row or list row with row-selection checkboxes paints `hover` while the
  pointer moves and `active` while pressed, and `accent`/`selected` when the row
  is selectable or selected (the same four washes plan 079 defined);
- a settings group on a `muted` panel carries checkboxes and fields.

No pair measured the boundary there. The audit found **six shipped sets below
the floor**:

| Set | Surface | Measured | Floor |
| --- | ------- | -------- | ----- |
| identity light | `muted` / `hover` / `accent` / `selected` | **2.92:1** | 3:1 |
| identity light | `active` | **2.62:1** | 3:1 |
| macOS light | `muted` | **2.92:1** | 3:1 |
| macOS light | `hover` | **2.82:1** | 3:1 |
| macOS light | `active` | **2.52:1** | 3:1 |
| identity dark | `active` | **2.81:1** | 3:1 |
| identity dark | `accent` / `selected` | **2.80:1** | 3:1 |
| Linux dark | `selected` | **2.97:1** | 3:1 |
| high-contrast dark (all variants) | `active` | **4.15:1** | 4.5:1 |

The suite stayed green because the pairs were absent, not because the values
were safe — the same failure mode as plans `074`–`083`. Windows light and dark,
macOS dark and the light high-contrast set already pass.

## 2. Design decisions (do not re-litigate)

1. **Five surfaces, one role.** `borderStrong` joins `muted`, `hover`, `active`,
   `accent` and `selected` as `boundary` pairs. No new class: these are the
   surfaces a bounded control can sit on, exactly as plans 079/083 defined the
   row washes.
2. **Five values move, one step each; no wash or fill moves.**
   - identity light `#848E9E` → `palette.neutral[500]` (`#737C8C`), a designed
     ramp step;
   - identity dark `#6B7484` → `#77808F`;
   - high-contrast dark `#A0A0A0` → `#AAAAAA`;
   - macOS light `#8A8A8E` → `#6E6E73` (Apple's secondary label grey, already
     the platform's placeholder);
   - Linux dark `#9A9996` → `#A09F9C`.
3. **Windows light, Windows dark, Linux light and macOS dark do not move.** Their
   boundaries already clear every surface.
4. **No floor changes and no `border` changes.** `border` stays the decorative
   role plan 080 separated; this plan only measures the functional edge.
5. **One description.** The suites iterate `contrastPairs`; the documents are
   built from the implementation where possible.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/084-control-boundary-on-state-washes.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | a generated `controlBoundaryPairs` block; JSDoc |
| `packages/tokens/src/color.ts` | identity light/dark and high-contrast dark `borderStrong` |
| `packages/tokens/src/platform-styles/macos.ts` | light `borderStrong`; JSDoc sentence |
| `packages/tokens/src/platform-styles/linux.ts` | dark `borderStrong`; JSDoc sentence |
| `packages/tokens/src/contrast.test.ts` | header, pair count `96` → `101` |
| `packages/tokens/src/control-boundary.test.ts` | **new** — the regression test |
| `packages/tokens/src/docs.test.ts` | contrast-surface sentence, §9 floor row |
| `docs/tokens.md` | colour table values, checking and verification prose |
| `docs/design-system.md` | §7 boundary bullet, §9 floor row |
| `packages/tokens/README.md` | the checking paragraph |
| `COMPONENTS.md` | the *Theme contrast check* row |
| `TODO.md` | one ticked row and the section bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add one generated block after `controlFillPairs`:

```ts
/**
 * The surfaces a bounded control sits on beyond the plain ones: the quiet panel
 * that groups fields and checkboxes, and the four washes a row paints. A
 * checkbox in a hovered, pressed, selectable or selected row paints its
 * `borderStrong` edge against that fill, so the boundary floor applies.
 */
const controlBoundarySurfaces = ["muted", "hover", "active", "accent", "selected"] as const;

const controlBoundaryPairs: readonly ContrastPair[] = controlBoundarySurfaces.map(
  (background): ContrastPair => ["borderStrong", background, "boundary"],
);
```

Spread `...controlBoundaryPairs` on the `borderStrong` pairs, after `popover`.
Expand the JSDoc of `contrastPairs` and `themeContrastFailures` to say the
boundary is measured on the quiet panel and the state washes.

### 4.2 `packages/tokens/src/color.ts`

- `lightColors.borderStrong: "#848E9E"` → `palette.neutral[500]`.
- `darkColors.borderStrong: "#6B7484"` → `"#77808F"`.
- `highContrastDarkColors.borderStrong: "#A0A0A0"` → `"#AAAAAA"`.

Update the `ThemeColors.borderStrong` comment: "on plain surfaces, a quiet panel
and the state washes a row paints".

### 4.3 `packages/tokens/src/platform-styles/macos.ts`

`colors.light.borderStrong: "#8A8A8E"` → `"#6E6E73"`. Add one JSDoc sentence:
the light boundary is Apple's secondary label grey, so a checkbox in a row keeps
its edge (plan 084).

### 4.4 `packages/tokens/src/platform-styles/linux.ts`

`colors.dark.borderStrong: "#9A9996"` → `"#A09F9C"`. Add one JSDoc sentence:
the dark boundary is one step lighter so a checkbox edge clears the floor on the
selected row (plan 084).

### 4.5 `packages/tokens/src/contrast.test.ts`

- Header: add the plan 084 paragraph (the defect and the five moved values).
- `covers every documented pair`: `96` → `101`.

### 4.6 `packages/tokens/src/control-boundary.test.ts` (new)

Header comment: the bug guarded — `borderStrong` was measured only on
`background`, `card`, `input` and `popover`, so an unchecked checkbox in a
pressed row measured 2.62:1 on the identity, 2.52:1 on macOS light, 2.81:1 on
the identity dark and 4.15:1 on high-contrast dark, under 3:1 / 4.5:1.

Tests (vitest, inert data):

1. `every shipped theme keeps its control boundary perceivable` — build the
   sixteen themes with `getTheme` / `getPlatformTheme`; read the five boundary
   pairs from `contrastPairs` (filter `foreground === "borderStrong"` and
   background in the five surfaces); collect misses as
   `theme / background / ratio`; assert the array is empty.
2. `keeps a checkbox edge visible in a pressed row` — the named regression:
   identity, macOS, Linux and Windows light `borderStrong` on `active` is
   `>= 3`; identity light uses `#737C8C`, macOS light `#6E6E73`.
3. `holds the high-contrast boundary to its floor on the pressed wash` — the
   four high-contrast dark variants use `#AAAAAA` and clear 4.5 on `active`.
4. `the checker names the wash pair when a theme regresses` — extend the identity
   light theme with `borderStrong: "#848E9E"` and assert `themeContrastFailures`
   returns exactly `muted`, `hover`, `active`, `accent` and `selected` at the
   `boundary` class, floor 3.
5. `publishes the five boundary surfaces` — assert exactly five
   `borderStrong` pairs outside `background`/`card`/`input`/`popover`, one per
   surface, and no duplicates.

### 4.7 `packages/tokens/src/docs.test.ts`

- The contrast-surface sentence ends: "the `borderStrong` boundary is measured on
  `popover` and on the `muted` panel and the four state washes, so a checkbox or
  field inside a quiet panel, a hovered, pressed, selectable or selected row
  still shows its edge." (Replace the current final clause.)
- The §9 floor row becomes:
  `| focus ring and essential boundaries, including the ring on the \`hover\`/\`active\`/\`selected\` washes and a control boundary on \`popover\`, \`muted\` and the four state washes | 3:1 | 4.5:1 |`.

### 4.8 `docs/tokens.md`

- Colour table: light `borderStrong` `#848E9E` → `#737C8C`, dark `#6B7484` →
  `#77808F`; high-contrast table `#A0A0A0` → `#AAAAAA`. The Use cell becomes
  "essential control boundaries, including on row washes".
- The paragraph above the table (line 65) says the boundary is "held to 3:1" —
  add the surfaces it is held on.
- *Checking a theme*: the `contrastPairs` description adds the `borderStrong`
  boundary on the quiet panel and four washes.
- *Verification*: the boundary clause names the surfaces and the defect (2.52–2.92
  on the light washes, 4.15 on the high-contrast pressed wash) and the five moved
  values.
- The contrast-surfaces paragraph carries the new sentence pinned by §4.7.

### 4.9 `docs/design-system.md`

- §7 `borderStrong` bullet: "It meets 3:1 against the canvas" gains the surfaces
  it is also held on — the `muted` panel and the `hover`/`active`/`accent`/
  `selected` washes — because a bounded control sits in rows.
- §9 table row: the row in §4.7.

### 4.10 `packages/tokens/README.md`

- *Checking a theme*: the boundary clause adds the `muted` panel and the four
  washes, and the plan 084 defect sentence.

### 4.11 `COMPONENTS.md`

- *Theme contrast check* row: `96` → `101` pairs; add the plan 084 paragraph —
  the boundary on the quiet panel and the four state washes, the six shipped
  sets below 3:1 (worst macOS light `active` at 2.52:1) and the five moved
  values.
- *Design tokens* row: mention the boundary surfaces beside the secondary and
  status text washes.

### 4.12 `TODO.md`

- Add a ticked row:
  `[x] Hold the essential control boundary on the quiet panel and state washes — a checkbox edge in a pressed row measured 2.52:1 on macOS light and 2.62:1 on the identity, and high-contrast dark 4.15:1 (plan 084)`.
- Move the section bar `51/67` → `52/68`.

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including `control-boundary.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Revert identity light `borderStrong` to `#848E9E`; the suite must fail the
   identity `muted`/`hover`/`accent`/`selected` (2.92) and `active` (2.62) pairs
   in the new suite and the generic loops. Restore.
2. Revert high-contrast dark `borderStrong` to `#A0A0A0`; the suite must fail
   `active` at 4.15 in all four high-contrast dark variants. Restore.
3. Delete `...controlBoundaryPairs`; the pair count must fail (`expected 96 to be
   101`), the five-pair test must fail, and the consumer compile must report the
   unused block. The document guards do not derive the boundary surfaces, so the
   count is the shrink guard here. Restore.

Record the exact failure text in §8.

## 6. STOP conditions

Stop and report with evidence if:

- **Any shipped set still fails a new boundary pair after the five moves.** The
  margins are in §2.2; a different failure means another value moved. Do not
  lower the floor.
- **A value collides with `border` in the same set.** The divider must stay a
  step away from the functional edge (plan 080). Check the pair before choosing
  a value.
- **A consumer package hard-codes the old `borderStrong` value.** Record it in
  `TODO.md`; do not edit the other workstream.
- **The §9 row cannot be generated from the pair list.** Build the surfaces from
  `contrastPairs` in the guard rather than retyping them.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `control-boundary` #1 | unit | a shipped theme losing the boundary on a quiet panel or a wash |
| `control-boundary` #2 | unit | the exact light pressed-row regression (2.52–2.92) |
| `control-boundary` #3 | unit | the AAA boundary dropping under 4.5 on `active` |
| `control-boundary` #4 | unit | the public checker silently dropping the boundary surfaces |
| `control-boundary` #5 | unit | the contract shrinking or growing without a deliberate edit |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| `color.test.ts` / `platforms.test.ts` generic loops | unit | any shipped colour set failing a documented pair |
| `docs.test.ts` floor row + sentence | unit | a document that stops naming a surface the contract checks |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **101** pairs: 96 + `borderStrong` on `muted`,
  `hover`, `active`, `accent` and `selected`.
- The five moved values and their worst pair after the move:
  - identity light `#737C8C` — 3.33 on `active` (was 2.62);
  - identity dark `#77808F` — 3.31 on `accent`/`selected` (was 2.80);
  - high-contrast dark `#AAAAAA` — 4.68 on `active` (was 4.15);
  - macOS light `#6E6E73` — 3.71 on `active` (was 2.52);
  - Linux dark `#A09F9C` — 3.20 on `selected` (was 2.97).
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - identity light back to `#848E9E` produced **11 failed / 1287 passed**:
    `light borderStrong on muted/hover: 2.9218111123555843`,
    `on active: 2.619857830165589`, `on accent/selected: 2.9229778869412266`,
    the boundary contract and pressed-row tests, the AAA shipped-theme test,
    the quiet-brand expectations and the colour-table guard;
  - high-contrast dark back to `#A0A0A0` produced **5 failed / 1293 passed**:
    `high-contrast dark borderStrong on active: expected 4.153853420262708 to be
    greater than or equal to 4.5`, the shipped-theme and AAA boundary tests and
    the macOS label assertion;
  - removing `...controlBoundaryPairs` produced **4 failed / 1244 passed**
    (`expected 96 to be 101`, the five-pair test, the checker's wash list, and
    the unused-block compile error) — the document guards do not derive the
    boundary surfaces, so the pair count is the shrink guard;
  - restoring all of them made every suite green: **22 files, 1298 tests**.
