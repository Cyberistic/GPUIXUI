# 747 — A group root must shrink to the row it is in

| Field | Value |
| ----- | ----- |
| Phase | F — the D40 containment rule, one level above the row (plans `368`, `369`, `380`) |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the ToggleGroup / RadioGroup / CheckboxGroup rows in `COMPONENTS.md`, `TODO.md`, the plan index) |
| Depends on | `041` (runtime suite), `097` (style merge order), `368` (control label containment), `369` (a group shares its width), `380` (a row's content floor) |
| Status | **done** — the three data-driven group roots carry `shrinkLayoutStyle`, so a bounded row shrinks a `ToggleGroup` (254 → 220 in a 220 px row) and a `RadioGroup` (255 → 220) with their items/rows inside, while a group with room still hugs its options. 6 scoped runtime cases; four mutation directions proven; full runtime 68 files / 884 tests, offline 70 files / 961 tests |

## 0. Why

D40 says a control contains its own content. Plan `368` fixed the label **inside**
a control and plan `369` made a horizontal `ButtonGroup` share its width;
plan `380` removed the automatic content floor from a **selection row**, so a
horizontal `RadioGroup` that is *stretched* to 220 px shares that width and wraps
its labels.

The group **root** is one flex item further up, and it kept the same floor.
Measured on this host (2026-10-20, 1280 × 800, release-tag binding) with a
`220 px` column holding one `Stack direction="row"` per case, three options
labelled `Align left` / `Align centre` / `Align right`:

| Mounted in a 220 px row | Root painted | Outside the row |
| ----------------------- | ------------ | --------------- |
| `ToggleGroup` (horizontal) | `x 12…266` (254) | **34 px** |
| `RadioGroup horizontal` | `x 12…267` (255) | **35 px** |
| `CheckboxGroup horizontal` | `x 12…232` (220) | 0 |
| `ButtonGroup` (attached and separated) | `x 12…232` (220) | 0 |
| `ToggleGroup` in a 220 px **column** | `x 12…232` (220), items 64.5 / 80 / 71.5 | 0 |

So the same `ToggleGroup` fits when its parent is a column (the parent stretches
it) and paints 34 px outside when its parent is a row — the constraint is
identical, the paint is not. `RadioGroup` is the same 35 px. `CheckboxGroup` and
`ButtonGroup` already shrink, so the two groups are the outliers, not the rule.

The pages already promise containment. `docs/toggle-group.mdx` says "a long
option in a constrained group never paints outside it" and
`docs/radio-group.mdx` says the row's `minWidth: 0` makes a horizontal group
share its width. Both are true of a *stretched* group and false of one in a row.

With `minWidth: 0` added to the two roots (applied by hand, then reverted):

| Case after the fix | Root painted | First item |
| ------------------ | ------------ | ---------- |
| `ToggleGroup` in the 220 px row | `x 12…232` (220) | 74 → 64.5, label clipped |
| `RadioGroup` in the 220 px row | `x 12…232` (220) | rows wrap |

The group still hugs its options when it has room (`minWidth` removes a floor;
it does not stretch), and the caller's `style` still wins last.

**Out of scope, recorded:** a long-label `Button` alone in the same 220 px row
paints `x 12…249` (237, 17 px outside). That is the reference's own `shrink-0`
(shadcn's button never shrinks in a row); the library size that with
`fullWidth`/`style` instead. An `OTPField` with eight 36 px cells needs 342 px
by design — a code field's cell count is intrinsic, not a width to share.

## 1. The contract

1. A group root is a flex item: it removes the runtime's automatic content floor
   (`minWidth: 0`) exactly like a selection row (plan `380`) and a `Text` run
   (plan `383`), so a bounded parent shrinks it instead of letting it paint
   outside.
2. The **items/rows then shrink inside the root** with the rule each already
   has: a toggle item clips its label to one line, a radio row wraps its label.
3. A group with room keeps its content width — the group hugs its options; the
   rule never stretches it.
4. The same paint for either parent axis: a stretched group (column) and a
   shrunk group (row) both end at the space they were given.
5. A caller's `style` still merges last, so `style={{ minWidth: 400 }}` wins.
6. `CheckboxGroup` gets the same seam for one rule across the three data-driven
   groups; measured, it changes nothing today (its root already fits), and the
   plan says so rather than inventing a failing case for it.
7. No public prop changes and no change to the tab stop, the keyboard, the
   names or the a11y tree.

## 2. Files to change

### 2.1 `packages/primitives/src/core/style.ts`

Extend `shrinkLayoutStyle`'s docstring with the third consumer — it is the one
helper that owns "a flex item may shrink below its content":

> A flex item that may shrink: a text run in a row, a group item whose width is
> imposed, or a **group root** in a bounded row.

No code change in this file.

### 2.2 `packages/primitives/src/components/ToggleGroup.tsx`

In `renderToggleGroup`'s root `style` object (the `display: "flex"` literal),
spread `shrinkLayoutStyle` **inside the base object**, before `resolvePartStyle`
so `props.style` still wins:

```ts
style={resolvePartStyle(
  {
    ...shrinkLayoutStyle,
    display: "flex",
    flexDirection: orientation === "horizontal" ? "row" : "column",
    alignItems: "center",
    gap: theme.spacing["2xs"],
  },
  props.style,
  { disabled: groupDisabled(props.disabled === true, options) },
)}
```

`shrinkLayoutStyle` is already imported for the items.

### 2.3 `packages/primitives/src/components/RadioGroup.tsx`

The same spread on the root's `display: "flex"` object (`selectionRowStyle` is
for the rows; the root is the missing seam). `shrinkLayoutStyle` is already
imported.

### 2.4 `packages/primitives/src/components/CheckboxGroup.tsx`

The same spread on the root object, for uniformity. Import `shrinkLayoutStyle`
from `../core/style.js` (already imported in this file for the row text).

### 2.5 `packages/primitives/runtime/group-containment.runtime.test.tsx` (new)

Standard file header (the bug measured, in the `runtime-hygiene` shape). Mount
one `220 px` column; each case is a `Stack direction="row"` holding one group.
Cases:

1. `"shrinks a ToggleGroup to the row it is in"` — the root's right edge equals
   the row's right edge (`≤`, and `> 220` fails), and its last item's right edge
   is inside the root.
2. `"shrinks a RadioGroup to the row it is in"` — same, on rows.
3. `"shrinks a CheckboxGroup to the row it is in"` — the liveness case (§1.6).
4. `"keeps a group that has room at its content width"` — the same `ToggleGroup`
   in a `600 px` row paints narrower than 600 (it hugs; the fix must not
   stretch it).
5. `"keeps the stretched-column paint"` — a `ToggleGroup` in the 220 px column
   still ends at the column's edge with its items inside (the pre-existing
   plan-368/380 behaviour must not regress).
6. `"lets the caller keep a wider group"` — `ToggleGroup style={{ minWidth: 400 }}`
   in the 220 px row paints 400 wide (the merge order, plan `097`).

Use `runtime.paintBounds` for the div roots and `runtime.bounds` for nothing
here (all six hosts are `div`s; the plan-597 box model note applies — no
`Button` is measured).

### 2.6 Docs

- `packages/primitives/docs/toggle-group.mdx` — the limitations bullet that says
  a constrained group never paints outside it: state that the **group** now
  shrinks and clips its items' labels to the width it is given, and name the
  measured case (254 → 220 in a 220 px row; plan `747`).
- `packages/primitives/docs/radio-group.mdx` — the `selectionRowStyle` paragraph:
  add that the root carries the same floor removal, so a horizontal group in a
  row shares that row's width (255 → 220).
- `packages/primitives/docs/checkbox-group.mdx` — one sentence in Theming: the
  root shrinks like the other two groups; its rows wrap.
- Each page's **Verification** list: name the new runtime file and its case.

### 2.7 `COMPONENTS.md`

One clause per row (Toggle group, Radio groups, Checkbox group): **Root
containment (747):** the group root drops the automatic content floor, so a
bounded row shrinks the group (measured 254/255 → 220 in a 220 px row) and its
items/rows shrink inside it; a group with room still hugs its options.

### 2.8 `TODO.md` and `.agents/slop/plans/README.md`

- Add a ticked primitives bullet for plan `747` with the measured result.
- Add plan `747` to the primitives table with its status.

## 3. Commands and expected results

```sh
# 1. The new runtime matrix, first WITHOUT the fix, to record the failing
#    direction, then with it.
nub run --filter @gpuixui/primitives test:runtime runtime/group-containment.runtime.test.tsx
# expect before: cases 1 and 2 fail by name with the root 34/35 px past the row;
#    cases 3-6 pass.
# expect after: 1 file / 6 tests pass.

# 2. The suites that already measure these groups.
nub run --filter @gpuixui/primitives test:runtime runtime/row-feedback.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/selection-mark.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/pointer-feedback.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/roving-arrows.runtime.test.tsx
# expect: unchanged and green.

# 3. The offline suites for the three groups and the style-order guard.
nub run --filter @gpuixui/primitives test src/components/ToggleGroup.test.tsx
nub run --filter @gpuixui/primitives test src/components/selection.test.tsx
nub run --filter @gpuixui/primitives test src/components/style-order.test.tsx
# expect: green.

# 4. The package gates.
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
```

## 4. Test plan — both directions

| Direction | How it is produced | What fails |
| --------- | ------------------ | ---------- |
| Old behaviour | remove the `shrinkLayoutStyle` spread from `ToggleGroup` | case 1 by name, `266 > 232` |
| Old behaviour | remove it from `RadioGroup` | case 2 by name, `267 > 232` |
| Over-broad (stretch) | replace `minWidth: 0` with `width: "100%"` | case 4, a group with room stretched to the full row |
| Over-broad (no shrink) | set `flexShrink: 0` beside `minWidth: 0` | cases 1/2, the root keeps its content width |
| Merge order | apply the caller's style before the spread | case 6, `minWidth: 400` clipped to 220 |
| Regression | — | cases 3, 5 and the four neighbouring runtime suites stay green |

The matrix must be able to fail: a group that never overflows (the current
`CheckboxGroup`) is a liveness case, and the plan says so instead of asserting
it as a fix.

## 5. STOP conditions

Stop and report rather than improvise if:

- a group with room starts painting at the full row width (the seam must remove
  the floor, not stretch);
- the horizontal `RadioGroup` rows stop wrapping their labels, or a toggle
  item's label stops clipping, after the root shrinks (the item/row seam is
  then wrong, and the fix belongs there);
- the tab stop, focus ring, roving arrows or the a11y tree change (they must
  not: this is a layout-only change);
- a `ToggleGroup` inside a `Tooltip` (which hugs its trigger) collapses to zero
  width — its measured width would then depend on the root floor and the
  tooltip needs `style={{ width }}` (the plan-345 rule);
- the fix needs a change outside `packages/primitives` (record it in `TODO.md`
  instead).

## 6. Acceptance

- A `ToggleGroup` and a `RadioGroup` in a bounded row end at that row's edge,
  with their items/rows shrunk inside, matching `CheckboxGroup` and
  `ButtonGroup`.
- A group with room still hugs its options; a stretched group is unchanged; a
  caller's `style` still wins.
- The new matrix is 6/6 with the fix, fails by name without it, and the four
  neighbouring runtime suites and the three offline suites stay green.
- The three pages, `COMPONENTS.md`, `TODO.md` and the plan index tell the truth
  about what shrinks.
- `nub run --filter @gpuixui/primitives test` and `check-types` pass; the
  end-of-task `nub run check` is green.
