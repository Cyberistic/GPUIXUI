# 748 — A visible description inside a labelled `Checkbox` and `Switch`

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — removes two documented Tier 1 limitations |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the two inventory rows in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `500` (a row description reaches assistive technology), `577` (a blank caption is not a caption), `586` (a blank description is not a description), `740` (the labelled row), `743` (a blank child is not a label), `746` (a nested text child is the name) |
| Status | **done** — `description` paints a `caption` under a labelled row's name, is announced as the row's `aria-description`, joins a slot tip after it, and leaves the tree byte-identical when blank; 5 element + 2 scoped runtime cases, all seven failing in the old direction (offline 70 files / 966 tests, scoped live 10/10, examples live 19/19) |

## 0. Why

Plan `740` gave a standalone `Checkbox` and `Switch` the shape a settings screen
needs: a text child becomes a visible label, and the **row** is the control
(role, name, tab stop, keyboard, hit area) with the box/track as decoration.
What the row still cannot carry is a **second line**. Both pages say so:

- `docs/checkbox.mdx` §Limitations: "A child label is one run of text — no
  description line; use `CheckboxGroup` when an option needs a label **and** a
  description."
- `docs/switch.mdx` §Limitations: "…a child label is one run of text with no
  description line."

`CheckboxGroup`'s option rows already have the shape (plan `500`): the visible
caption **is** the row's `aria-description`, gated on `hasText` so a computed
blank string paints no line and announces nothing (plans `577`, `586`). The
standalone control has the same accessible surface and no way to fill it, so a
one-boolean settings row with a hint has to become a one-option
`CheckboxGroup`, or hand-roll a row that no longer matches the library's
keyboard, focus-ring and tooltip contracts.

The example demonstrates the cost: `examples/checkbox.example.tsx` puts each
asset's size in a trailing `Text` outside the row, because the row cannot say
it — and its header comment points readers at `CheckboxGroup` for exactly this.

## 1. The API

One additive prop on each control:

```tsx
<Checkbox description="At most one summary per day.">
  Email notifications
</Checkbox>

<Switch description="Pauses every background sync.">Pause syncing</Switch>
```

Rules:

1. `description` is a **visible caption** under the label, inside the labelled
   row. The row stays one hit area, one tab stop and one accessibility node.
2. It is announced as the row's `aria-description`, trimmed (`ariaName`).
3. **Blank is absent.** A whitespace-only description paints no caption, adds no
   gap and announces nothing (`hasText`). The row then renders exactly today's
   tree — no wrapper column.
4. A **slot tip** (`Tooltip`'s `asChild`, which writes the same runtime
   `aria-description`) is composed after the visible hint: one announcement
   `"hint. tip"`, the join `Button` already uses for `"Loading. tip"`
   (plan `586`). A blank side drops out; both blank is absent. The **paint** of
   the tip is unchanged.
5. **Without children there is no row to paint into.** The description is still
   announced (never silently dropped) but paints nothing. Documented, with
   `children` as the shape that shows it.
6. Without a description the element tree is **byte-identical** to plan `740`'s
   labelled row and to the bare control; `size`, `accent`, `invalid`, `disabled`,
   `style`, the ring on the box/track and the slot contract are unchanged.
7. The row's cross-axis alignment is `"flex-start"` **only** when the caption
   paints, so the box/track aligns with the label's first line instead of the
   middle of a two-line block; otherwise it stays `"center"` (today's paint).
8. `description` is a plain string. A node description is out of scope: the
   caption is a `Text` run and the announcement is one string, exactly like
   `CheckboxGroup`'s option description.

## 2. Files to change

### 2.1 `packages/primitives/src/core/selection.ts`

Hoist the text column `CheckboxGroup` keeps privately (`rowTextStyle`) so the
three rows share one layout:

```ts
/** The label column of a selection row: a name, and a caption under it. */
export const selectionRowTextStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
});
```

TSDoc is required on exported values (`src/tsdoc.test.ts`).

### 2.2 `packages/primitives/src/components/internal.ts`

One join rule for the two description sources:

```ts
/**
 * Two description sources as one announcement: a visible hint, then a slot tip.
 *
 * The runtime carries one `aria-description` string, and a `Tooltip` trigger
 * writes its text into it. Each source is trimmed and blank is absent, so a
 * computed empty hint cannot leave a dangling `". "` (plans `586`, `577`).
 */
export const joinDescription = (
  first: string | undefined,
  second: string | undefined,
): string | undefined => {
  const a = ariaName(first);
  const b = ariaName(second);
  if (a === undefined) return b;
  return b === undefined ? a : `${a}. ${b}`;
};
```

### 2.3 `packages/primitives/src/components/Checkbox.tsx`

- Add `readonly description?: string` to `CheckboxProps`, with a doc comment
  stating rules 1–7 above (including the bare-control rule and the tip join).
- Import `hasText`, `joinDescription`, `selectionRowTextStyle`.
- In `renderCheckbox`:
  - `const description = ariaName(props.description);` — the readable hint;
  - `const caption = hasText(props.description) && paintsContent(props.children);`
    — paint only inside a real row;
  - the control's `aria-description` becomes
    `joinDescription(props.description, props["aria-description"])`;
  - the labelled branch's row alignment becomes
    `{ disabled: props.disabled === true, align: caption ? "flex-start" : "center" }`;
  - the text column: when `caption`, wrap the label `Text` and the caption
    `Text role="caption" tone="muted" style={shrinkLayoutStyle}` in
    `<div style={selectionRowTextStyle(theme)}>`; otherwise keep today's single
    `Text` child (identical tree).
- The bare branch keeps its single box and the description announcement; no new
  element.

### 2.4 `packages/primitives/src/components/Switch.tsx`

The same change, with the track as the decoration. `Switch` paints the same
`role="switch"` row.

### 2.5 `packages/primitives/src/components/CheckboxGroup.tsx`

Delete the private `rowTextStyle` and use `selectionRowTextStyle`. No behaviour
change; this is the one-owner rule.

### 2.6 `packages/primitives/src/components/selection.test.tsx`

Element-tree cases (the existing `renderCheckbox` / `renderSwitch` helpers):

1. `Checkbox` with children **and** a description paints the row with two
   children; the second is a column whose second child is a `caption`-role `Text`
   carrying the hint; the row's `aria-description` is the hint; `align` is
   `flex-start`.
2. `Switch` — the same case against the track.
3. A blank description (`"   "`) paints **today's** tree: two children, the
   second a `Text`, no `aria-description`, `align` `center`.
4. A description plus a slot tip announces `"hint. tip"`; a blank hint plus a tip
   announces the tip alone.
5. A bare `Checkbox` (no children) with a description announces it and renders
   one child (no caption).

### 2.7 `packages/primitives/runtime/labelled-selection.runtime.test.tsx`

Two real-runtime cases:

1. A labelled `Checkbox` with a description: the row's accessibility node
   carries `description`; the caption is painted (`allText()`); a press on the
   row's centre (the text column, which now includes the caption) still toggles
   it. One `Switch` case on the same shape.
2. A blank description paints no caption text and publishes no description.

The two-direction proof: delete the caption/announcement (or gate the caption on
`undefined` instead of `hasText`) and the element cases 1–3 and the runtime case
1/2 fail by name.

### 2.8 `packages/primitives/examples/checkbox.example.tsx`

Use the new shape where it belongs: each asset row becomes
`<Checkbox description={asset.detail}>` and the trailing `Spacer` + muted
`Text` are deleted (fewer elements, one hit area, the hint announced). Update the
header comment (the "use `CheckboxGroup` … plus descriptions" sentence is no
longer the only shape).

### 2.9 `packages/primitives/docs/checkbox.mdx`, `docs/switch.mdx`

- API table: one `description` row (visible caption in the labelled row; blank
  absent; announced; composed after the name and before a slot tip's text).
- Usage: one two-line snippet.
- Accessibility: the row remains **one** node; the caption is its
  `aria-description`; a bare control announces a description it cannot paint.
- Limitations: replace the "no description line" sentence with the real
  remaining limits (a node description, a description without a row, and no
  per-part `descriptionStyle`).
- Verification: the new cases.

### 2.10 `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`

- Checkboxes and Switches rows: one sentence with the plan number and the
  measured result.
- A `[x]` row in the primitives section, plus the tick in the plan index.

## 3. Commands and expected results

```sh
# 1. Offline: the new element cases and the whole package suite.
nub run --filter @gpuixui/primitives test
# expected: 70+ files, 961 + 5 tests, 0 failed

# 2. Types.
nub run --filter @gpuixui/primitives check-types
# expected: exit 0

# 3. The scoped runtime file, then the examples file the changed example mounts.
nub run --filter @gpuixui/primitives test:runtime -- runtime/labelled-selection.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime -- runtime/examples.runtime.test.tsx
# expected: every case green (9 in the first file, the second file green)

# 4. The guards that read props/pages/examples.
nub run --filter @gpuixui/primitives test -- src/contract.test.ts src/exports.test.ts src/tsdoc.test.ts src/callback-names.test.ts src/example-coverage.test.ts
# expected: green (the API table must name the new prop)

# 5. End-of-task gates.
nub run check
nub run lint
nub run test
# expected: green, except any failure recorded in TODO.md against another workstream
```

Scenario ids: this change touches no playground scenario; the runtime proof is
the package's own suite. If a smoke id is needed for the record, use
`input-edit` and `focus-traversal` (the controls are inputs), but do not run the
full suites.

## 4. Test plan — both directions

| Direction | Mutation | Must fail |
| --------- | -------- | --------- |
| Missing paint | drop the caption element | element 1/2, runtime 1 |
| Missing announcement | drop `joinDescription` from `aria-description` | element 1/4, runtime 1 |
| Blank not gated | gate the caption on `props.description !== undefined` | element 3, runtime 2 |
| Tip clobbered | assign `ariaName(props.description)` directly | element 4 |
| Alignment | keep `align: "center"` with a caption | element 1 (`flex-start`) |
| Regression | — | the existing labelled/bare cases, the a11y name and description matrices, and the examples suite stay green |

Every case must be able to fail: the assertion names the caption text, the
`aria-description` string or the `align` value, never "a tree exists".

## 5. STOP conditions

Stop and report rather than improvise if:

- the labelled row's accessible name, role, tab stop or activation changes (this
  is additive; `CheckboxGroup`'s row is the reference);
- the runtime publishes **two** accessibility nodes for the row (the caption must
  be a child of the one row, not a sibling node) — that means the runtime treats
  the caption as its own node and the design has to be re-measured;
- the blank description still paints a line or a gap;
- a `Tooltip` around a labelled control stops opening on hover/focus, or its tip
  text replaces the visible hint instead of joining it;
- the fix needs a change outside `packages/primitives` (record it in `TODO.md`
  instead);
- the full runtime suite has to be run to prove it (scope is the two files).

## 6. Acceptance

- A labelled `Checkbox` and `Switch` paint a visible caption, announce it once,
  and keep one node, one tab stop and one hit area.
- A blank description changes nothing; a bare control announces without painting.
- A slot tip and a visible hint compose into one announcement, and the tip keeps
  working.
- The example uses the new shape and is still mounted green.
- Both pages, `COMPONENTS.md`, `TODO.md` and the plan index tell the truth.
- `check-types` and the package suites pass; the end-of-task gates are run and
  their exact result recorded.

## 7. Result (this host, 2026-10-20)

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | pass |
| `nub run --filter @gpuixui/primitives test` | **70 files / 966 tests**, 0 failed (961 before; +5) |
| `nub exec vitest run --config vitest.runtime.config.ts labelled-selection` | **10/10** (8 before; +2) |
| `nub exec vitest run --config vitest.runtime.config.ts examples` | **19/19** after the example change |
| full runtime suite (one run, before the example edit) | **68 files / 886 tests**, 0 failed |
| `nub run check:tests` | pass |
| `nub run lint` | pass |
| `nub run check-types` (repo) | pass |
| `nub run test` (repo) | pass |
| `nub run fmt` | **fails on `apps/docs/src/components/docs/demos.tsx` only** — the docs-site row already recorded in `TODO.md`; every primitives file is formatted |
| `nub run check` | stops at `fmt` for that same outside file; the other three gates were run separately above |

Both directions measured: with the caption removed, element cases 1–2 and
runtime cases 1–2 fail; with the caption gated on `!== undefined` and the
announcement reverted to the slot value, all five element cases and both runtime
cases fail. Restored, every count above is the green one.

### Containment probe (not shipped as a test)

A 220 px row holding a 58-character label and a 62-character hint was mounted
in the real runtime and every retained element's right edge was compared with
the row's: **9 elements, none past it** (`right 232`, the theme's `lg` padding
included). The new text column therefore does not need its own containment
fix. The probe is deliberately **not** a test: removing the label's
`minWidth: 0` did not make it fail (the column still wraps), so it could not be
shown to fail in a realistic regression — the package's rule is that a test
must be able to fail.
