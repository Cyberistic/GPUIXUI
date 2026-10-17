# 079 — The secondary text the state washes never measured

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (status tones), `057` (status text), `063` (platform styles), `071`–`078` (the contrast contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`themeContrastFailures` is documented as **the library's guarantee in one
assertion**, and plans `074`, `076` and `078` closed the surfaces it had never
measured — the focus ring on the state washes, the soft status surfaces, and the
loading skeleton. The class left open is **secondary text on those same state
washes**.

`mutedForeground` is the role for metadata and row descriptions. The shipped
components paint it *inside* rows whose background changes with state:

- `List.ItemDescription` sets `mutedForeground` explicitly (`components/src/list.tsx`),
  and a selectable list row paints `accent` on hover, `active` on press and
  `selected` when selected (`list.tsx` row style);
- a combobox option paints `hover` / `active` and its description is
  `mutedForeground` (`components/src/combobox.tsx`);
- a menu item paints `hover` / `active` (`components/src/menu/item.tsx`).

The contract checks `mutedForeground` only on `muted`, `background`, `card` and
`popover`. It checks ghost `foreground` on `hover`/`active`, but never the
secondary role, and never `accent` or `selected`.

The audit found a **real defect in a shipped platform style**, the same class as
plans `076`/`078`: macOS dark inherits the identity's wash idea but uses much
lighter greys, so its secondary text sinks below the floor the design system
states.

| Variant | Pair | Measured | Floor |
| ------- | ---- | -------- | ----- |
| macOS dark | `mutedForeground` on `hover` (`#A1A1A6` on `#3A3A3C`) | **4.41:1** | 4.5:1 |
| macOS dark | `mutedForeground` on `active` (`#A1A1A6` on `#48484A`) | **3.55:1** | 4.5:1 |

Every other shipped set passes both (identity dark: 6.33 / 5.60; Linux dark:
6.19 / 5.13; Windows dark: 6.94 / 5.67). The suite stayed green because the
pairs were absent, not because the values were safe — exactly the failure mode
plans `076` and `078` fixed.

## 2. Design decisions (do not re-litigate)

1. **The washes are surfaces, so they join the `secondary` class as pairs.** No
   new class, no new export: `mutedForeground` on a wash is the same floor as
   `mutedForeground` on `muted`, already expressed by `ContrastPairClass`.
2. **Four washes, each one painted.** `hover` and `active` are the pointer
   states; `accent` is the hover a *selectable* list row uses; `selected` is the
   selected fill, and `List.ItemDescription` overrides the row's
   `selectedForeground`, so its metadata is `mutedForeground` on `selected`.
   `secondary`/`muted` are not washes a row paints behind a description.
3. **Fix macOS dark by moving both sides, not one.** The active wash `#48484A`
   is close enough to the hover `#3A3A3C` that darkening it alone cannot clear
   4.5:1 without erasing the pressed state. Lighten `mutedForeground` one step
   (`#A1A1A6` → `#AEAEB2`) and darken the pressed wash one step
   (`#48484A` → `#404042`). Measured on the variant: 5.13 on hover, 4.68 on
   active, 5.30 on accent, 5.32 on selected; `hover`/`active` remain distinct
   (1.10:1) and both stay clear of the card (1.23 / 1.35). Reach for no other
   theme.
4. **High contrast passes untouched.** Every high-contrast `mutedForeground` is
   near-black/near-white on its washes (8.2–13.5:1), and
   `applyPlatformStyle` applies no colours at AAA, so no value moves there.
5. **One description.** The pair list stays the only place the floor is stated;
   the suites keep iterating `contrastPairs`, and the documents are built from
   the implementation. No bespoke wash block in a test.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/079-secondary-text-state-washes.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | a generated `secondaryTextPairs` block; JSDoc |
| `packages/tokens/src/platform-styles/macos.ts` | dark `mutedForeground` and `active` |
| `packages/tokens/src/contrast.example.ts` | the quiet high-contrast value and JSDoc |
| `packages/tokens/src/contrast.test.ts` | header, pair count, brand/quiet expectations |
| `packages/tokens/src/state-text.test.ts` | **new** — the regression test |
| `packages/tokens/src/platforms.test.ts` | header comment only (the generic loop guards it) |
| `docs/tokens.md` | checking/verification paragraphs |
| `docs/design-system.md` | §8 hover/pressed prose, §9 floor row |
| `packages/tokens/README.md` | the checking paragraph |
| `COMPONENTS.md` | the *Theme contrast check* row and the *Design tokens* note |
| `TODO.md` | one ticked row and the section progress bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add one generated block beside `softSurfacePairs` / `surfacePairs`:

```ts
/**
 * The state washes a row paints behind its own text: pointer hover, press, the
 * accent a selectable row uses on hover, and the selected fill. Secondary text
 * sits on all four, so the `secondary` floor applies to each.
 */
const stateWashes = ["hover", "active", "accent", "selected"] as const;

const secondaryTextPairs: readonly ContrastPair[] = stateWashes.map(
  (background): ContrastPair => ["mutedForeground", background, "secondary"],
);
```

Spread `...secondaryTextPairs` in `contrastPairs` beside `...surfacePairs`.
Expand the JSDoc of `contrastPairs` and `themeContrastFailures`: "including
secondary text on the state washes". Keep the exported array a literal; only the
generated blocks are derived.

### 4.2 `packages/tokens/src/platform-styles/macos.ts`

In `colors.dark`:

- `mutedForeground: "#A1A1A6"` → `"#AEAEB2"`
- `active: "#48484A"` → `"#404042"`

Add one sentence to the file's JSDoc: the dark secondary grey and pressed wash
are set so secondary text clears the 4.5:1 floor on both washes (plan 079).

### 4.3 `packages/tokens/src/contrast.example.ts`

The quiet AAA example is `#6B6B6B`, which is 4.21:1 on the high-contrast
`accent`/`selected` washes — it would now fail the *default* floors too, and the
test that proves the declared level is read expects it to pass at `"default"`.
Change it to `"#5D5D5D"`: 6.58:1 on the AAA canvas (under 7:1, so the example
still loses AAA) and ≥4.53:1 on every wash, so it still passes the default
floors. Update the JSDoc figure.

### 4.4 `packages/tokens/src/contrast.test.ts`

- Header: add the plan 079 paragraph.
- `covers every documented pair`: `66` → `70`.
- `names every pair a brand theme misses, and only those`: the quiet brand now
  misses the washes too. Expect `8` and the backgrounds
  `["active", "accent", "background", "card", "hover", "muted", "popover", "selected"]`
  (sorted), all `mutedForeground` / `secondary` / `4.5`.
- `reads the level a theme declares`: `4` → `8`, same foreground/floor shape.

### 4.5 `packages/tokens/src/state-text.test.ts` (new)

Header comment: the bug guarded — macOS dark's secondary text measured 4.41:1
and 3.55:1 on the hover and active washes, under the 4.5:1 the design system
states, because no pair measured a wash.

Tests (vitest, no Effect needed — inert data):

1. `every shipped theme clears the state-wash floors` — iterate `lightTheme`,
   `darkTheme`, both high-contrast themes and the six real platform variants;
   read the four pairs from `contrastPairs` (filter
   `foreground === "mutedForeground"` and background in the wash set) and assert
   each measured ratio meets `contrastFloors[theme.contrast].secondary`.
2. `macOS dark keeps its secondary text readable on both pointer washes` — the
   named regression: assert `contrastRatio(...)` on `hover` and `active` is
   `>= 4.5`, and that the hover and pressed washes are still different colours.
3. `the checker names the wash pair when a theme regresses` — extend the macOS
   dark theme with the old `#A1A1A6` and assert `themeContrastFailures` returns
   exactly the `hover` and `active` wash pairs at the `secondary` floor (the
   other two washes pass at that value).

### 4.6 `packages/tokens/src/platforms.test.ts`

Add one header paragraph: plan 079 extends the contract to secondary text on the
state washes, so the generic loop guards it on every variant (macOS dark was the
fail).

### 4.7 `docs/tokens.md`

- *Checking a theme*: the list of pair kinds gains "secondary text on the state
  washes (`hover`, `active`, `accent`, `selected`)". Do not state a count here
  (the page states none today).
- *Verification*: add secondary text on the four washes to the sentence that
  currently lists muted text on `background`, `card` and `popover`, and note that
  the shipped platform variants are held to it (macOS dark was the defect).

### 4.8 `docs/design-system.md`

- §8: the hover/pressed rows name the washes; add that metadata keeps its
  `mutedForeground` role inside them, which is why the floor covers it.
- §9 table: add a row
  `secondary text (mutedForeground) on the hover, active, accent and selected washes | 4.5:1 | 7:1`.

### 4.9 `packages/tokens/README.md`

The *Checking a theme* paragraph gains the same sentence: the list holds
secondary text on the state washes, so a description inside a hovered, pressed
or selected row stays readable.

### 4.10 `COMPONENTS.md`

- *Theme contrast check* row: `66` → `70` pairs; name the secondary-text washes
  and the macOS dark defect (4.41:1 hover, 3.55:1 active) as the plan 079 fix.
- *Design tokens* row: mention that status and secondary text are checked on the
  state washes.

### 4.11 `TODO.md`

Add a ticked row under the tokens/theme section:
`[x] Hold secondary text on the hover/active/accent/selected washes to the
contrast floors — macOS dark measured 4.41:1 and 3.55:1 (plan 079)`, and move the
section bar `46/61` → `47/62`.

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including the new `state-text.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Set macOS dark `mutedForeground` back to `"#A1A1A6"`, run
   `nub run --filter @gpuixui/tokens test`; the suite must fail in
   `state-text.test.ts` (hover 4.41 / active 3.55 at the 4.5 floor) and in the
   `platforms.test.ts` generic pair loop.
2. Restore `"#AEAEB2"` and the suite must be green.
3. Set `active` back to `"#48484A"`, run the suite; it must fail on the active
   pair; restore `"#404042"`.

Record the exact failure text in §8.

## 6. STOP conditions

Stop and report with evidence if:

- **Any shipped set still fails a wash pair after the value change.** The
  measured margins are in §2.3; a different failure means a different set moved.
  Do not lower the floor.
- **The new pairs break a documented pair count the page cannot regenerate.** Add
  the derived figure to the doc guard rather than retyping it.
- **A change outside the owned paths is required.** Record it in `TODO.md` and do
  not edit it.
- **`quietHighContrastTheme` cannot both pass `"default"` and fail at `"high"`.**
  The window is narrow (4.53–6.58 at `#5D5D5D`); if a future floor makes it empty,
  split the example instead of weakening the test.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `state-text` #1 | unit | a shipped theme (identity, high contrast or platform) losing secondary text on a state wash |
| `state-text` #2 | unit | the exact macOS dark regression: `mutedForeground` too quiet on hover/press, or the pressed wash collapsed into the hover one |
| `state-text` #3 | unit | the public checker silently dropping a wash pair |
| `contrast.test.ts` pair count | unit | the contract shrinking or growing without a deliberate edit |
| `contrast.test.ts` brand expectations | unit | the new pairs not being reported for a theme that misses them |
| `color.test.ts` / `platforms.test.ts` generic loops | unit | any shipped colour set failing a documented pair |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **70** pairs: 66 + the four wash pairs.
- macOS dark: `mutedForeground` `#AEAEB2`, `active` `#404042`. Measured on the
  variant: hover **5.13:1**, active **4.68:1**, accent **5.30:1**, selected
  **5.32:1**; the washes stay distinct (hover/active 1.10:1, active/card
  1.35:1).
- `quietHighContrastTheme` moved from `#6B6B6B` to `#5D5D5D` (6.58:1 on the AAA
  canvas, ≥4.53 on every wash): it still fails AAA and still passes the default
  floors, so the declared-level test keeps its meaning.
- Two-direction proof (5 failed / 956 passed then 4 failed / 957 passed, both
  restored to 961 passed):
  - reverting `mutedForeground` to `#A1A1A6` failed the generic loop with
    `darwin dark mutedForeground on hover: expected 4.412065855688128 to be
    greater than or equal to 4.5` and the active pair at 4.02, plus
    `state-text.test.ts` (`clears the declared floor on every shipped theme`,
    `keeps macOS dark readable on both pointer washes`) and the variant contract
    test;
  - reverting `active` to `#48484A` failed on the active pair
    (`expected 4.126680018065068 to be greater than or equal to 4.5`) and the
    same two state-text tests;
  - restoring both values made every suite green.
