# Plan 365 — the overlay list must fit a row

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
353 (component dimensions), 360 (rowHeight is held to the default control).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` governs each `theme.dimensions` member with `positive`,
plus two documented relationships: `overlayMinWidth < overlayWidth`,
`previewCardMinWidth < previewCardMaxWidth`, `fieldAdornmentSize` fits the
smallest control and `chipMinWidth` fits `fieldMinWidth`.

`overlayMaxHeight` — documented as "the height at which a long overlay list
starts to scroll" — is only checked for being positive. A theme that sets it to
`20` while `density.rowHeight` is `32` (comfortable) therefore returns `[]`,
while every menu, select and combobox list using the token scrolls in a viewport
shorter than one of its rows: the first option is clipped and no complete option
can ever be shown. Plan 360 established the same class of rule one metric over —
`rowHeight` must fit the default `md` control it holds — and left the overlay
height ungoverned.

The probe on the shipped light theme:

```ts
themeMetricFailures(
  extendTheme(getTheme("light"), {
    dimensions: { overlayMaxHeight: 20 },
  }),
); // [] before this plan
```

Every shipped theme, platform variant and recipe ships **320** against
`rowHeight` 32 (comfortable), 28 (compact) or 36 (spacious), so **no token value
moves**. The rule is a guard, like plans 358, 360 and 364.

## 2. Decision

One `atLeast` rule in the `dimensions` group:

```
overlayMaxHeight ≥ density.rowHeight
```

The bound is the row the list paints, not `controlHeight.md`: a menu, select or
combobox item is a row, and plan 360 already holds `rowHeight ≥
controlHeight.md`, so the row bound implies the control bound and states the real
composition.

Rejected alternatives, with reasons:

- **Bind to `controlHeight.md`** — weaker (`rowHeight` already contains it) and
  it describes a control inside a row, not the row itself the scroll list holds.
- **Bind to a row count** (e.g. three rows) — the token only promises a scroll
  threshold, not how many options a menu shows; a two-row maximum is a valid
  compact design. One complete row is the floor below which the list is unusable.
- **A new `dimensions` field for the list row** — the row is `density.rowHeight`;
  a second metric would duplicate it.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

In the `dimensions` block, after `positive("dimensions", "overlayMaxHeight", …)`:

```ts
// The overlay scrolls a list of rows, so its maximum height must fit one
// complete row; a viewport shorter than a row clips every option.
...atLeast(
  "dimensions",
  "overlayMaxHeight",
  dimensions.overlayMaxHeight,
  density.rowHeight,
),
```

Update the `dimensions` bullet in the `themeMetricFailures` JSDoc:

> … every surface metric is positive, each documented range has a minimum below
> its default, an adornment fits the smallest control, a chip fits in a field,
> and the overlay scroll height fits one row — a list viewport shorter than a
> row clips every option.

### 3.2 `packages/tokens/src/overlay-height.test.ts` (new)

Header states the bug guarded: `overlayMaxHeight` was only `positive`, so a
height below `rowHeight` returned `[]` while every menu and combobox list
scrolled in a viewport shorter than one option.

Cases:

1. **A height below the row is reported.** Extending the light theme with
   `dimensions: { overlayMaxHeight: 20 }` returns exactly one failure:
   `{ group: "dimensions", member: "overlayMaxHeight", rule: "at-least", actual: 20, bound: 32 }`.
2. **Exactly one row is the floor.** The same edit with `32` returns `[]`.
3. **A denser row lowers the bound.** Extend the light theme with
   `density: "compact"` (row 28) and `overlayMaxHeight: 30`; it returns `[]`,
   because the bound is the active density's row, not a fixed 32.
4. **Every shipped set passes.** Iterate the identity themes, the platform
   variants and both recipes as `metrics.test.ts` does; `themeMetricFailures`
   returns `[]` and every `overlayMaxHeight` is at least its theme's
   `density.rowHeight`.

### 3.3 `docs/tokens.md`

- **§Numeric metrics**, in the list of breakage rules: an overlay's
  `overlayMaxHeight` must fit one `density.rowHeight`, because a menu that
  scrolls in a viewport shorter than one row shows no complete option.
- **§Component dimensions** (the table that lists the nine metrics): note beside
  `overlayMaxHeight` that it is held to the active row height.

### 3.4 `packages/tokens/README.md`

**Checking the numbers** paragraph: add "scroll an overlay in less than one row"
to the list of edits the numeric check catches.

### 3.5 `COMPONENTS.md`

**Theme metric check** row: append — the overlay scroll height must fit one
`density.rowHeight`, because a list viewport shorter than a row clips every
option (plan 365).

### 3.6 `.agents/slop/plans/README.md`

- Table row under the tokens block:

  ```
  | [365](./365-overlay-scroll-height.md) | The overlay list must fit a row | F | 353, 360 | done |
  ```

- Closing paragraph: the positive-only rule, the `20`-against-`32` probe, the
  row bound, and that no shipped value moves.

### 3.7 `TODO.md`

One ticked row under the tokens section; progress bar `132/182` → `133/183`.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/overlay-height.test.ts)
# EXPECT: case 1 FAILS (the rule is absent, so the checker returns `[]`); cases
# 2–4 pass — 2 and 4 are valid shipped/short-row edits, and 3 is a valid compact
# edit that would pass either way, so it documents the bound rather than
# distinguishing the fix.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/overlay-height.test.ts)
# EXPECT: every case passes.
```

Then:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: all files pass (76 → 77 files, ~4297 → ~4301 tests), `check:tests`,
oxlint, oxfmt and `tsc --noEmit` clean.

Guarded documents:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/metrics.test.ts
```

## 5. STOP conditions

- A shipped set fails the rule (its `overlayMaxHeight` is below `rowHeight` —
  investigate before moving a value).
- The bound needs a new `dimensions` field (the plan forbids it).
- The regression passes on the pre-fix `metrics.ts`.
- `nub run check` or `nub run lint` fails outside these files.

## 6. Acceptance criteria

- `themeMetricFailures` reports `overlayMaxHeight` / `at-least` / actual / bound
  for a height below the active row.
- Exactly one row passes; a compact density moves the bound to 28.
- Every shipped set still returns `[]`; no token, colour, pair, floor, platform
  style or recipe changes.
- The two docs pages, the README, the ledger and the plan index state the rule;
  every guarded suite passes.
- No path outside `packages/tokens`, `docs/tokens.md`, `COMPONENTS.md`,
  `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The `components` rows that migrate the overlay literals onto
`theme.dimensions` (plan 353) gain a token they can trust; no path changes here.
