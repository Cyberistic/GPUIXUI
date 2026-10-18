# Plan 384 — a size that must fit must fit the content box

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
353 (component dimensions), 358 (the numeric contract), 360 (a control fits its
row), 365 (an overlay fits a row), 372 (a named size is a positive size).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

The numeric contract already claims, in `metrics.ts` and in both documents, that
**an icon and a field adornment fit the smallest control** and that **a chip
fits in a field**. It enforces those claims with the wrong bounds:

```ts
...atMost("iconSize", "md", iconSize.md, density.controlHeight.sm),
...atMost("dimensions", "fieldAdornmentSize", fieldAdornmentSize, controlHeight.sm),
...atMost("dimensions", "chipMinWidth", chipMinWidth, fieldMinWidth),
```

A control is painted with its **two borders inside its height**
(`primitives/src/core/style.ts`: `height = controlHeight[size]`, `borderWidth =
borderWidth.thin`, `paddingLeft/Right = controlPaddingX[size]`), and a field's
minimum width likewise contains its two borders and its horizontal padding. So a
glyph or chip equal to the outer metric does **not** fit the content box; it
overflows it. The probe on the shipped light theme returns `[]` for all three
impossible themes:

```ts
themeMetricFailures(
  extendTheme(lightTheme, {
    density: { controlHeight: { sm: 24 } },
    dimensions: { fieldAdornmentSize: 24 },
  }),
); // []

themeMetricFailures(
  extendTheme(lightTheme, {
    dimensions: { fieldMinWidth: 200, chipMinWidth: 200 },
  }),
); // []

themeMetricFailures(
  extendTheme(lightTheme, {
    density: { controlHeight: { sm: 24 } },
    iconSize: { xs: 18, sm: 20, md: 24, lg: 25, xl: 26 },
  }),
); // []
```

Each theme declares a glyph exactly as tall as the box that holds it, and a chip
exactly as wide as the field, so a 24px icon in a 22px content box and an 80px
chip in a field with 20px of padding are reported as usable. The chip case has a
second variant that is more obviously broken: `fieldMinWidth: 90` with the
shipped 80px chip passes the current `chipMinWidth ≤ fieldMinWidth`, while the
field's content box is `90 − 2×10 − 2×1 = 68`, so the chip overflows by 12px.

Every shipped set fits comfortably — icon `md` 16 + 2 = 18 in `controlHeight.sm`
24/28/32, adornment 16 + 2 = 18 in the same, chip 80 + 2×(8/10/12) + 2 = 98–106
in `fieldMinWidth` 200 — so **no token value moves**. This is a guard, like
plans 358, 360 and 365.

## 2. Decision

Replace the three outer-size comparisons with **content-box** bounds, expressed
on the container metric the value must fit into:

```
density.controlHeight.sm ≥ iconSize.md         + 2 × borderWidth.thin
density.controlHeight.sm ≥ fieldAdornmentSize  + 2 × borderWidth.thin
dimensions.fieldMinWidth ≥ chipMinWidth + 2 × density.controlPaddingX.md
                                         + 2 × borderWidth.thin
```

The first two report `controlHeight.sm` (`density` group), the third reports
`fieldMinWidth` (`dimensions` group). That matches the existing fit rules, which
name the container they hold to a bound: plan 360 reports `controlHeight.sm`
against the label line plus two borders and `rowHeight` against the `md`
control; plan 365 reports `overlayMaxHeight` against `rowHeight`.

Rejected alternatives, with reasons:

- **Add `2 * thin` to the compared value but keep `atMost`** — `atMost("dimensions",
  "fieldAdornmentSize", adornment, controlHeight.sm - 2 * thin)` also works, but
  the other fit rules name the container, and a diagnostics table groups the
  failure under the metric the reader must raise. Keep one convention.
- **Use the field's default `md` control for the adornment** — the docs say
  "smallest control", and `fieldAdornmentSize` is painted at every field size;
  `sm` is the tightest, so it is the bound. Plan 360 already uses `sm` for the
  same rule class.
- **Include the field's vertical padding in the adornment bound** — the control
  style paints only horizontal padding (`paddingLeft`/`paddingRight`); the
  height is the content box plus borders. Adding vertical padding would invent a
  metric the control does not paint.
- **Count the chip's own padding** — `chipMinWidth` is documented as the chip's
  *content* width and the theme ships no chip-padding token, so the bound covers
  the field's chrome only. A copied theme that adds chip padding inside
  `chipMinWidth` stays the caller's composition.
- **A new rule name** — these are still `at-least` failures; `metricRules` does
  not change.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

In the `density` block, after the `controlHeight.sm` label-line `atLeast`, add:

```ts
// A control paints its two borders inside the height, so a glyph or an
// icon-sized field adornment equal to the height overflows the content box.
...atLeast(
  "density",
  "controlHeight.sm",
  density.controlHeight.sm,
  iconSize.md + 2 * borderWidth.thin,
),
...atLeast(
  "density",
  "controlHeight.sm",
  density.controlHeight.sm,
  dimensions.fieldAdornmentSize + 2 * borderWidth.thin,
),
```

In the `dimensions` block, replace:

```ts
...atMost(
  "dimensions",
  "fieldAdornmentSize",
  dimensions.fieldAdornmentSize,
  density.controlHeight.sm,
),
```

with nothing (the density rule above subsumes it), and replace:

```ts
...atMost(
  "dimensions",
  "chipMinWidth",
  dimensions.chipMinWidth,
  dimensions.fieldMinWidth,
),
```

with:

```ts
// The chip sits inside the field's content box: the field's two borders and
// its horizontal control padding are inside `fieldMinWidth`.
...atLeast(
  "dimensions",
  "fieldMinWidth",
  dimensions.fieldMinWidth,
  dimensions.chipMinWidth +
    2 * density.controlPaddingX.md +
    2 * borderWidth.thin,
),
```

Remove the now-unused `atMost` helper **only if** no other call site remains
(`grep -n "atMost(" packages/tokens/src/metrics.ts`); the helper is still used
by nothing else in that file after this edit, so delete it and its comment to
keep the module lean. If `grep` shows another caller, leave the helper.

Update the JSDoc:

- `density` bullet: the smallest control fits one label line **and the default
  icon**, plus its two borders, and a field adornment fits the same content box.
- `dimensions` bullet: "a chip fits in the field's **content box** — its minimum
  width less the field's two borders and horizontal padding".

### 3.2 `packages/tokens/src/content-box-fit.test.ts` (new)

Header comment states the bug being guarded: three fit rules compared an item
to the **outer** metric, so a theme whose icon/adornment equalled the control
height or whose chip equalled the field width returned `[]` while the glyph or
chip overflowed the content box. Cases:

1. **Adornment equal to the control height is reported** — `density:
   { controlHeight: { sm: 24 } }, dimensions: { fieldAdornmentSize: 24 }`
   returns exactly one failure: `{ group: "density", member: "controlHeight.sm",
   rule: "at-least", actual: 24, bound: 26 }`.
2. **A shipped-size adornment passes** — `fieldAdornmentSize: 16` on the light
   theme returns `[]`.
3. **Chip equal to the field width is reported** — `fieldMinWidth: 200,
   chipMinWidth: 200` returns exactly one failure: `{ group: "dimensions",
   member: "fieldMinWidth", rule: "at-least", actual: 200, bound: 222 }`.
4. **The chip must fit the content box, not the outer width** — `fieldMinWidth:
   90, chipMinWidth: 80` returns the same failure with bound 102; this is the
   case the old `chipMinWidth ≤ fieldMinWidth` rule passed.
5. **The chip fits at the shipped size** — `fieldMinWidth: 200,
   chipMinWidth: 80` returns `[]`.
6. **Icon equal to the control height is reported** — `density: { controlHeight:
   { sm: 24 } }, iconSize: { xs: 18, sm: 20, md: 24, lg: 25, xl: 26 }` returns
   exactly one failure: `{ group: "density", member: "controlHeight.sm",
   rule: "at-least", actual: 24, bound: 26 }`.
7. **Every shipped set passes** — iterate `themeModes × themeContrasts`,
   `platformNames × themeModes` and both Windows recipes in both modes (the same
   loops as `metrics.test.ts`); `themeMetricFailures` returns `[]` for each.

A `// check-tests-ok:` argument is not needed: every case asserts a concrete
failure list or the empty list against a real edit.

### 3.3 `packages/tokens/src/metrics.test.ts`

Update the case **"reports an icon larger than the smallest control"** (around
line 323). The current edit (`controlHeight.sm: 20`, `iconSize.md: 21`) no longer
breaks any rule — 21 + 2 = 23 > 20 *does* break the new rule, but the expected
shape names the removed `iconSize/md/at-most` pair. Rewrite it as:

```ts
it("reports a control that cannot fit the default icon", () => {
  // The icon ladder must still step, so the size is raised with its larger
  // neighbours; the control's content box is two borders shorter than its
  // height, so a 23px icon does not fit a 24px control.
  expect(
    failuresOf({
      density: { controlHeight: { sm: 24 } },
      iconSize: { md: 23, lg: 24, xl: 25 },
    }),
  ).toEqual([
    {
      group: "density",
      member: "controlHeight.sm",
      rule: "at-least",
      actual: 24,
      bound: 25,
    },
  ]);
});
```

Leave every other case. Re-run the suite: no other case sets an icon, adornment
or chip.

### 3.4 `docs/tokens.md`

In **§Numeric metrics**, replace:

> an icon and a field adornment must fit the smallest control; a chip must fit
> in a field

with:

> the smallest control must fit one `label` line, the default `iconSize.md` and a
> field adornment **plus its two borders**; a chip must fit inside the field's
> content box — `fieldMinWidth` less its two borders and its
> `controlPaddingX.md` padding — because a glyph or chip equal to the outer
> metric has no room for the chrome painted inside it

Also update the earlier sentence that lists the control rules so it does not
repeat "one `label` line plus its two borders" twice.

### 3.5 `packages/tokens/README.md`

In **Checking the numbers**, add to the list of edits the check catches: "fit an
icon, a field adornment or a chip into a content box shorter or narrower than
they are". Keep the paragraph's existing sentence structure.

### 3.6 `COMPONENTS.md`

In the **Theme metric check** row, append after the overlay sentence:

> A glyph or a chip is held to the **content box**, not the outer metric: the
> default icon and a field adornment must fit `controlHeight.sm` less its two
> borders, and a chip must fit `fieldMinWidth` less its borders and horizontal
> padding, because a size equal to the outer metric overflows the chrome painted
> inside it (plan 384).

### 3.7 `.agents/slop/plans/README.md`

- Table row under the tokens block:

  ```
  | [384](./384-content-box-fit.md) | A size that must fit must fit the content box | F | 353, 358, 360, 365, 372 | done |
  ```

- Closing paragraph: the three outer-size bounds, the three `[]` probes, the
  content-box bounds, and that no shipped value moves.

### 3.8 `TODO.md`

One ticked row under the design tokens section, and the progress bar
`148/200` → `149/201` (keep the same filled-block count; 149/201 rounds to the
same seven blocks).

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run \
  src/content-box-fit.test.ts src/metrics.test.ts)
# EXPECT: cases 1, 3, 4 and 6 of content-box-fit FAIL with `[]` where a failure
# is expected (and the rewritten metrics case fails); the shipped-set and
# fits-at-shipped-size cases pass either way, and every other metrics case
# passes.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run \
  src/content-box-fit.test.ts src/metrics.test.ts)
# EXPECT: every case passes.
```

Then:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run check-types
```

Expected: all files pass (90 → 91 files, 4467 → ~4474 tests), `check:tests`,
oxlint, oxfmt and `tsc --noEmit` clean.

Guarded documents:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/snippets.test.ts
```

## 5. STOP conditions

- A shipped set fails a new bound (it must not: check `controlHeight.sm`,
  `iconSize.md`, `fieldAdornmentSize`, `chipMinWidth`, `fieldMinWidth` and
  `controlPaddingX.md` on every shipped set before editing).
- The fix needs a new token or a new metric rule.
- A case passes on the pre-fix `metrics.ts` when it should fail.
- `nub run check` or `nub run lint` fails outside these files.
- `atMost` has another caller after the edits (keep the helper).

## 6. Acceptance criteria

- `themeMetricFailures` reports `controlHeight.sm` / `at-least` for an icon or
  adornment equal to the control height, and `fieldMinWidth` / `at-least` for a
  chip that only fits the outer width.
- The shipped sizes still pass; no token, colour, pair, floor, platform style or
  recipe changes.
- The two documents, the README, the ledger and the plan index state the
  content-box rule; every guarded suite passes.
- No path outside `packages/tokens`, `docs/tokens.md`, `COMPONENTS.md`,
  `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

`components` and `primitives` will read `theme.dimensions` (TODO rows for plan
353). The token they receive now holds the advertised relationship; their
literals stay theirs to migrate. No path here changes.
