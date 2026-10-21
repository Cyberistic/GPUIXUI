# 809 — `RadioGroup` paints its option description on the label's line

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `080`, `081`, `355`, `368`, `380`, `500`, `577`, `589`, `747`, `748`, `799` |
| Status | done |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

An option description is one concept with one documented shape. `CheckboxGroup`
and the standalone `Checkbox`/`Switch` rows paint a description as a **caption
under the name**, in the row's text column
(`selectionRowTextStyle`, `src/core/selection.ts`):

> A row's label is one shrinkable run, and an optional description is a second
> line in the same column rather than a sibling of the box.

`RadioGroup` is the one row that does not use that column: it paints the box,
the label `Text` and the caption `Text` as three **siblings** in a row-shaped
flex row, so the caption lands to the right of the name.

Measured on this host (release-tag binding, probe window 1280 × 800, theme's
`lg` surface padding), mounting a described `RadioGroup` and a described
`CheckboxGroup` in the same window:

| Surface | Element | Bounds |
| ------- | ------- | ------ |
| `RadioGroup` | label `Weekly` | `x 34, y 12, 43 × 17` |
| `RadioGroup` | caption `Every Monday.` | `x 83, y 12.5, 80 × 16` |
| `CheckboxGroup` | label `Email` | `x 34, y 52, 47 × 17` |
| `CheckboxGroup` | caption `A digest.` | `x 34, y 71, 47 × 16` |

The radio caption starts 49 px to the right of its label (label ends at `x 77`,
the row's `sm` gap is 6) and sits inside the label's 17 px band. The checkbox
caption starts on the label's own x and 19 px below it.

### 0.2 Why it matters

- Two options with the same `{ label, description }` shape paint two different
  layouts, and the `selection.example.tsx` screen mounts both: a `CheckboxGroup`
  with captions under their names directly above a `RadioGroup` whose caption
  runs on the name's line.
- The row is **not deterministic under a narrow group**: both texts are
  shrinkable flex items in one line, so depending on the label/caption widths
  the caption wraps into a column beside the name instead of under it, and the
  row's `alignItems: "center"` centres the circle against whatever height that
  produces.
- It contradicts the package's own row contract (`selectionRowTextStyle`) that
  the other three rows follow, and the `RadioGroup` page's prose ("a caption
  beside the name") is the only place that describes the outlier — so nothing
  has guarded the shape: the existing tests assert the accessible description
  and a child count, never where the caption paints.

### 0.3 What must not change

- a row with **no** description keeps its current, byte-identical tree (box +
  one label `Text`), its `alignItems: "center"` and its height;
- a blank/whitespace description paints **no** caption and no wrapper (plans
  `577`, `589`);
- the row remains one interactive `role="radio"` node with one name and one
  `aria-description`, and one hit area (the whole row, caption included);
- `optionStyle` keeps merging last and keeps receiving the same
  `RadioOptionState` (the wrapper is layout only);
- the `RadioGroup` root's roving stop, ring, read-only and `autoFocus` contracts
  are untouched;
- the row must stay contained in a bounded group (plans `368`, `380`, `747`).

## 1. The decision

**A described `RadioGroup` row paints its label and caption in the shared
`selectionRowTextStyle` column, and aligns its content to `flex-start` only when
a caption paints.** An undescribed row keeps the flat label and `center`
alignment exactly as it is today.

This is the rule plan `748` already applies to the standalone `Checkbox`/`Switch`
label rows ("the row aligns `flex-start` only when a caption paints"), and the
rule `CheckboxGroup` already follows. No new helper is introduced: the column and
the `hasText` gate exist.

The `RadioGroup` page's "caption beside the name" sentence is wrong and is the
reason the defect survived; it is corrected to "under the name".

## 2. The rule

In `renderRadioGroup`'s option row (`src/components/RadioGroup.tsx`):

```tsx
const described = hasText(option.description);
...
style={resolvePartStyle(
  selectionRowStyle(
    {
      disabled,
      readOnly: props.readOnly === true,
      align: described ? "flex-start" : "center",
    },
    theme,
  ),
  props.optionStyle,
  { ...unchanged state... },
)}
>
  <div style={selectionBoxStyle(spec, theme)}>…</div>
  {described ? (
    <div style={selectionRowTextStyle(theme)}>
      <Text role="label" …>{text}</Text>
      <Text role="caption" tone="muted" style={shrinkLayoutStyle}>
        {option.description}
      </Text>
    </div>
  ) : (
    <Text role="label" …>{text}</Text>
  )}
</div>
```

Imports: add `hasText` from `../core/text.js` and `selectionRowTextStyle` from
`../core/selection.js` (both already exist and are imported by
`CheckboxGroup`).

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/RadioGroup.tsx` | the row rule above |
| `packages/primitives/src/components/selection.test.tsx` | the "blank description paints no line" case counts the **text column's** children (the row now has two children in both directions); the stale "description is a sibling" comment is corrected |
| `packages/primitives/src/components/label-row.test.tsx` or a new `describe` in `selection.test.tsx` | one element-tree case for the new column shape and the `center` half |
| `packages/primitives/runtime/option-description.runtime.test.tsx` | two native geometry cases (described row under; bounded row contained) and the checkbox control |
| `packages/primitives/docs/radio-group.mdx` | "beside" → "under", plus the alignment rule and the verification entry |
| `COMPONENTS.md` | a `Description caption (809)` note on the Radio groups row |
| `TODO.md` | a ticked task for this plan |
| `.agents/slop/plans/README.md` | the plan row |

No other workstream's path is touched.

## 4. Commands and expected results

Run from the package directory (`packages/primitives`):

| Command | Expected |
| ------- | -------- |
| `nub run test:runtime runtime/option-description.runtime.test.tsx` | fails **before** the fix: the new geometry case reports the caption's x/y on the label's line; passes after, 4 tests |
| `nub run test -- selection.test.tsx` | after the element-case update, green |
| `nub run test` | 75 files / 1075+ tests (the current 1073 + the new element cases) |
| `nub run check-types` | exit 0 |
| `nub run test:runtime runtime/selection-read-only.runtime.test.tsx runtime/controls.runtime.test.tsx` | green (the rows' activation/read-only contracts are unchanged) |
| `nub run lint` / `nub run fmt` | exit 0 for the touched files |

## 5. Test plan and the two-direction proof

### 5.1 Element tree (`selection.test.tsx`)

1. **Described row shape** — `renderRadioGroup` with one described option: the
   row has two children; the second is a `div` whose style has
   `flexDirection: "column"` and `gap` `2xs`; its children are the label and the
   caption; the row's `alignItems` is `"flex-start"`.
2. **Undescribed row shape** — one option without a description: the row's second
   child is the label text itself, `alignItems` is `"center"`, and the row has
   exactly two children (the box and the label).
3. **Blank description** — the same as (2) for `"   "` (the plan `577` rule).
   The existing test's **intent** ("no description line") is preserved by
   counting the text column's children rather than the row's.

### 5.2 Native (`runtime/option-description.runtime.test.tsx`)

4. **Geometry** — mount a described `RadioGroup` and a described
   `CheckboxGroup`; find each label and caption by text and read
   `renderer.getElementBounds`. Assert for the radio, exactly as for the
   checkbox control:
   - the caption's `x` equals the label's `x`;
   - the caption's `y` is at least the label's `y + height`;
   - the described row is taller than an undescribed row in the same group.
5. **Containment** — a 220 px-wide described `RadioGroup` in a `row` keeps the
   label, the caption and the text column inside the group's painted box
   (`x + width ≤ group right`), and the label wraps instead of painting past it.

### 5.3 Two directions (require a failing run before the fix)

| Direction | Expected failure |
| --------- | ---------------- |
| Old code (caption as a sibling) | case 4: caption `x` `83 ≠ 34` (or `y` inside the label's band); case 1: the second child is a `text`, not a column |
| Caption always wrapped (no `hasText` gate) | case 3 / case 2: an undescribed row gains a column (the plan `577` regression) |
| `align` always `flex-start` | the existing "row centres its content" assertion in the undescribed fixture fails |
| Wrapper without `minWidth`/shrink | case 5: the caption or column paints past the group |

Each mutation is reverted after it fails.

## 6. STOP conditions

Stop and report rather than improvise if:

- the runtime measurement does not show the caption on the label's line (the
  premise is wrong — record the dump and do not "fix" it);
- `selectionRowTextStyle` needs a second layout rule to stay contained (then the
  defect is broader than this row; record it in `TODO.md` and plan it);
- the change would alter an undescribed row's element tree or geometry;
- a docs/contract guard rejects the correction because another page repeats the
  "beside" claim (fix the page; do not relax the guard);
- any edit would land outside `packages/primitives` or `COMPONENTS.md`/`TODO.md`
  (record it instead).

## 7. Outcome

Measured 2026-10-21 in this worktree (release-tag binding):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1075 tests** green (was 1073; +2 element cases) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/option-description.runtime.test.tsx` | 1 file / **4 tests** green (was 2; +2 native cases) |
| `test:runtime runtime/selection-read-only… runtime/examples…` | 3 files / 32 tests green |
| `test:runtime runtime/controls… runtime/row-feedback…` | 2 files / 61 tests green |
| `nub run lint` / `nub run fmt` | exit 0 / both touched files clean (the only remaining format report is the docs-site `demos.tsx` this workstream does not own) |

### 7.1 The measured layout

| Element | Before | After |
| ------- | ------ | ----- |
| `RadioGroup` label `Weekly` | `x 34, y 12, 43 × 17` | `x 34, y 12, 80 × 17` |
| `RadioGroup` caption `Every Monday.` | `x 83, y 12.5, 80 × 16` | `x 34, y 31, 80 × 16` |
| `RadioGroup` described row | `x 12, y 12, 1256 × 17` | `x 12, y 12, 1256 × 35` |
| `CheckboxGroup` label / caption (control) | `x 34` / `x 34, y 71` | unchanged |

The caption now starts on the name's column and 2 px (`2xs`) under the label's
line; the described row grows from 17 to 35 px while its undescribed sibling
stays one 17 px line. The label `Text` fills the column's width (`80`) as it does
in the `CheckboxGroup` row (which is why its box width changed from 43 to 80
while its glyphs still start at `x 34`).

### 7.2 Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| The old layout restored (`git checkout` of `RadioGroup.tsx`, caption as a third sibling) | native `paints…` (`expected 83 to be 34`), native `keeps a described row inside…` (`expected 14 to be ≥ 80`); element `paints no description line…`, element `paints an option's description in the row's text column` |
| The `hasText` gate removed (caption always wrapped; `align` always `flex-start`) | element `paints no description line…`, `keeps an undescribed option's row as one line, centred`, `gives every enabled RadioGroup row the theme's wash`, `names a blank-labelled row by its value…` (4) |

The containment case passes in the old direction on the horizontal axis (the
caption already stayed inside the group), so its assertion that carries the
defect is the vertical one; the horizontal half still guards a future wrapper
without a shrinkable column.

## 8. Acceptance

- A described `RadioGroup` row paints its caption under its name, at the name's
  x, with the row aligned `flex-start`; an undescribed row is byte-identical to
  today and stays `center`; a blank description paints no caption or wrapper.
- The `RadioGroup` page and the inventory record the measured rule; the new
  native case fails against the old layout.
- `check-types`, the offline suite, the scoped runtime files, `lint` and `fmt`
  are green, with exact commands and totals recorded.
