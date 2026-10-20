# 803 — A label that mixes an icon with text paints on one line

**Phase:** C/F (Tier 1 paint correctness)
**Depends on:** `030`, `040`, `041`, `047`, `059`, `097`, `368`, `582`, `740`,
`743`, `746`, `748`, `782`
**Status:** done — implemented in this worktree. Offline **75 files / 1054
tests**; the new native file **10/10**; six scoped runtime files **114/114**.
Five mutation directions were reverted one at a time and each failed its named
case (§8).

## 1. Why

GPUix's default box direction is **column**: a `div` (and a `<text>` host) stacks
its element children on the cross axis unless the style says otherwise. Plans
`740`/`746`/`748` taught `Button`, `Toggle`, `Checkbox` and `Switch` to derive
their accessible name from text nested beside an icon, and both selection pages
advertise the shape:

```tsx
<Checkbox>
  <Icon name="star" /> Accept
</Checkbox>
```

Measured on this host (release-tag build, 1280 × 800), that shape paints the
icon **above** the word:

| Part | Old paint (window px) |
| ---- | --------------------- |
| `Checkbox` label `Text` | `x 34, y 12, 40 × 33` — the 16 px star at `y 12…28`, the word at `y 28…45` |
| `Switch` label `Text` | `x 46, y 12, 37 × 33` — the 16 px star at `y 12…28`, the word at `y 28…45` |
| `Button` label | `x 627, y 12, 26 × 36` — the 16 px star at `y 12…28`, the word at `y 28…48` |
| `Toggle` label | same container shape as `Button` |

So a control documented as “an icon beside the label” paints a two-line column,
grows its row to 33 px (a text-only `Checkbox` row is 17 px), and — on a fixed
height `Button` — squeezes the word under the icon inside the 36 px recipe. The
name is correct; the paint is not.

Measured in the same probe, the fix works: a `div` or `<text>` host given
`display: flex; flexDirection: row; alignItems: center` lays the same children
inline (`x 12…28` icon, `x 28…58` word, one 18 px line), and `gap` puts a themed
space between the parts.

## 2. Decision

**A label whose children mix an opaque element (an icon, a badge) with text is
one row; a text-only label is unchanged.** The row is a core resolver so the
four parts cannot drift, and the change is gated on a pure predicate so the
common text-only path keeps its exact existing tree and paint.

Affected parts, all four of which render a caller label container:

| Part | Container today | Mixed-label style |
| ---- | --------------- | ----------------- |
| `Button` | `controlLabelStyle` (one shrinkable, one-line item) | `controlLabelStyle` + row layout |
| `Toggle` | `controlLabelStyle` | `controlLabelStyle` + row layout |
| `Checkbox` | `Text role="label" style={shrinkLayoutStyle}` | `shrinkLayoutStyle` + row layout |
| `Switch` | the same `Text role="label"` | `shrinkLayoutStyle` + row layout |

`ToggleGroup` and `Select` use `controlLabelStyle` for **plain strings** only, so
they are not touched.

Gap: `spacing.xs` (4 px), the step used for inline icon spacing elsewhere; the
row keeps the container's existing shrink floor.

## 3. Exact files

Change:

1. `packages/primitives/src/core/style.ts`
   - add `labelRowLayout(theme): StyleDesc` — `display: "flex"`,
     `flexDirection: "row"`, `alignItems: "center"`, `gap: theme.spacing.xs`,
     `flexShrink: 1`, `minWidth: 0`, with a docstring naming the measured bug
     (plan `803`).
   - keep `controlLabelStyle` and `shrinkLayoutStyle` exactly as they are.
2. `packages/primitives/src/core/index.ts` — export `labelRowLayout`.
3. `packages/primitives/src/components/content.ts`
   - add `hasOpaqueContent(children): boolean` beside `paintsContent`: looks
     through a `Text` run and a fragment (as `paintsContent` does) and returns
     true for any other element. Docstring: the row rule is the paint-side twin
     of the name rule.
4. `packages/primitives/src/components/Button.tsx`
   - label container: `hasOpaqueContent(props.children)` chooses
     `mergeStyle(controlLabelStyle, labelRowLayout(theme))`, else
     `controlLabelStyle`.
5. `packages/primitives/src/components/Toggle.tsx` — the same.
6. `packages/primitives/src/components/Checkbox.tsx`
   - `label` `Text` style: mixed → `mergeStyle(shrinkLayoutStyle,
     labelRowLayout(theme))`, else `shrinkLayoutStyle`.
7. `packages/primitives/src/components/Switch.tsx` — the same.
8. `packages/primitives/examples/checkbox.example.tsx` — one row mounts the
   documented shape, e.g. `<Icon name="star" /> Star this release` with a
   `testId`, so the examples runtime suite paints it in both palettes.
9. `packages/primitives/docs/checkbox.mdx` and `docs/switch.mdx` — one measured
   sentence in the visible-label paragraph: an icon and the words share one
   line; without the row rule they stacked. Add the new test files to
   `## Verification`.
10. `packages/primitives/docs/button.mdx` and `docs/toggle.mdx` — one sentence
    in `## API`'s `children` row (and `leading`/`trailing` note where useful):
    an element child beside text shares the line; prefer `leading`/`trailing`
    for a leading or trailing icon, which have always been inline.
11. `packages/primitives/README.md` — the runtime **file** count rises by one.
12. `COMPONENTS.md` — a “Mixed label (803)” sentence on the **Buttons**,
    **Toggle**, **Checkboxes** and **Switches** rows.
13. `TODO.md` — a ticked row under the primitives workstream.
14. `.agents/slop/plans/README.md` — index this plan.
15. `PLAN.md` — D53: a mixed label is one row, gated on opaque content.

Tests (new):

16. `packages/primitives/src/components/label-row.test.tsx` — element-tree
    cases for `Button`, `Toggle`, `Checkbox`, `Switch`: a mixed child list
    carries `display: "flex"`, `flexDirection: "row"`, `alignItems: "center"`
    and the theme's `xs` gap on the label container; a text-only label carries
    none of those properties (the tree is unchanged). Header comment records
    the bug.
17. `packages/primitives/runtime/label-row.runtime.test.tsx` — native bounds:
    - for each of the four parts, the icon and the text overlap on the **y**
      axis and the icon is left of the text (old direction: the icon's bottom
      edge equals the text's top edge → no overlap);
    - the mixed label is one line (its height is the text run's height, not
      the old two-line 33 px);
    - a long mixed label stays inside a bounded control (D40 containment) —
      record the measured result in the plan's §8; if the row clips without an
      ellipsis, state that in the two selection pages rather than claiming one;
    - a text-only row paints exactly the pre-fix box for `Checkbox`/`Switch`
      (17 px at `md`), so the common path is not re-baselined.

## 4. Commands and expected results

Run from the repo root:

```sh
nub run --filter @gpuixui/primitives check-types      # exit 0
nub run --filter @gpuixui/primitives test             # offline suite green
nub run --filter @gpuixui/primitives test:runtime runtime/label-row.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/labelled-selection.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
```

- The scoped runtime form is the **positional file**, never `-- --run <file>`
  (plan `700`).
- Expected: the new file passes; the labelled-selection, examples and controls
  suites still pass (they mount the text-only shapes this plan leaves alone).
- `nub run check` and `nub run test` are the end-of-task gate.

## 5. Test plan (must be able to fail)

- **Element tree**: remove the row style from each part → the mixed-label case
  fails on `display`; apply the row unconditionally → the text-only case fails
  on an extra property (the guard proves the gated rule, not a blanket one).
- **Runtime**: restore the old label container → the overlap assertion fails for
  that part by name (icon bottom 28 = text top 28) and the height assertion
  reads 33 instead of one line; the text-only box case keeps 17, so a fix that
  changes the common path fails it.
- Record the exact failing case names in the plan's §8 after each mutation.

## 6. STOP conditions

Stop and report instead of improvising if:

- `display: "flex"` on the `<text>` host changes the typed run's font metrics
  (the text-only cases must keep their exact 13/17 label box);
- the row cannot keep a long mixed label inside a bounded `Button` and the
  clipping is worse than a documented hard cut — record the measurement and
  keep the honest limitation, do not shrink the text below legibility;
- the row changes the accessible name (it must not: `controlName` reads text
  leaves, and plan `746`'s name cases must stay green);
- a change is needed in another workstream's paths — record it in `TODO.md`
  instead.

## 7. Acceptance

- A mixed icon-and-text label paints on one line in `Button`, `Toggle`,
  `Checkbox` and `Switch`; a text-only label's tree and box are unchanged.
- The four pages state the rule; the checkbox example mounts it; the inventory,
  README, `TODO.md`, `PLAN.md` and the plan index are current.
- Offline, the new file, the four affected scoped runtime files,
  `nub run check` and `nub run test` are green, with the exact totals recorded.

## 8. Result

Measured 2026-10-20/21 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1054 tests** green (was 74 / 1041; +1 file, +13 tests) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/label-row.runtime.test.tsx` | 1 file / **10 tests** green |
| six scoped runtime files (`label-row`, `examples`, `labelled-selection`, `controls`, `overflow`, `toggle`) | 6 files / **114 tests** green |
| `nub run lint` | exit 0 |
| `nub run check-types` (repo root) | exit 0 |
| `nub run test` (repo root) | exit 0 — every workspace's suite green |
| `nub run check` | red **only** on `apps/docs/src/components/docs/demos.tsx` formatting, the docs-site row already recorded in `TODO.md`; the primitives formatter, lint, test guard and type check all pass |

Measured paint before → after (release-tag build, 1280 × 800):

| Part | Old label box | New label box |
| ---- | ------------- | ------------- |
| `Checkbox` | `40 × 33` — star `y 12…28`, word `28…45` | `60 × 17` — star `x 34…50`, word `x 54…94`, both `y 12…29` |
| `Switch` | `37 × 33` — star above the word | `57 × 17` — star `x 46…62`, word `x 66…103` |
| `Button` | `26 × 36` — star above the word | `46 × 20` — star `x 617…633`, word `x 637…663`, one 20 px line |
| `Toggle` | star above the word | `48 × 17` — star `x 616…632`, word `x 636…664` |

Containment: in a 220 px frame the long mixed `Button` label is `188 × 20` with
its text run `168` wide (`x 48…216`, inside the control); the long mixed
`Checkbox` row wraps to three lines (`51` high) with its text `178` wide
(`x 54…232` at the control's right edge). A text-only label's box is unchanged
(`17` px for the selection rows, `20` px for the button label).

Mutation proofs (each reverted after it failed):

- Button's row style removed → offline `Button > lays an icon and the words on
  one row` and runtime `Button puts an icon and its word on one line` fail.
- Button's `labelParts` split removed while the row stays → runtime `Button
  keeps a long mixed label inside a narrow control` fails (the text paints past
  the frame).
- Checkbox's `hasOpaqueContent` gate forced on → offline `Checkbox > keeps a
  text-only label out of the row` and runtime `Checkbox keeps a text-only label
  free of the row layout` fail.
- Switch's mixed branch disabled → runtime `Switch puts an icon and its word on
  one line` fails.
- Toggle's mixed branch disabled → runtime `Toggle puts an icon and its word on
  one line` fails.

One finding changed the plan: the row alone was not enough. A flex row gives
every child its own automatic content floor, so the raw text beside the icon
painted 398 px wide in a 220 px button (the plan-368 class). The label is now
split into opaque elements and **contiguous** text runs, and each text run keeps
the existing fitted container; the grouped split also stops the row's gap from
appearing between every word.
