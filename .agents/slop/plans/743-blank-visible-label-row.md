# 743 — A blank text child is not a visible label (standalone `Checkbox`/`Switch`)

| Field | Value |
| ----- | ----- |
| Phase | F — the blank-text rule reaches the labelled selection rows |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Checkboxes and Switches rows in `COMPONENTS.md`) |
| Depends on | `026` (blank label), `041` (runtime suite), `093` (name matrix), `396` (blank explicit label), `577` (blank caption), `740` (the labelled rows) |
| Status | **done** — a blank text/number child no longer creates a labelled row on `Checkbox` or `Switch`; the bare box/track is painted, `label` still names it, and a blank run beside real text is ignored. 2 element + 2 runtime cases, all four failing against the old `children.length` gate (§4); offline 69 files / 955 tests, scoped live 1 file / 8 |

## 0. Why

Plan `740` made a text child the visible label of a standalone `Checkbox` and
`Switch`: the root becomes one row with the box/track plus a `Text`, and that
row is the hit area, the tab stop and the accessible name. The row gate is
`Children.toArray(props.children).length === 0`, so **any** child — including a
string that trims to nothing — turns the bare box into a labelled row.

That contradicts the package's own blank-text rule. Plans `026`, `396`, `577`,
`578`, `579` and `586` all establish "blank text is absent": an explicit blank
`label` already falls back to the text child (`controlName`), and a blank
caption paints nothing. But:

- `<Checkbox label="   " children="   " />` currently paints a two-child row
  with an **empty** label and **no accessible name** — a focusable, unnamed
  control, the exact failure plan `073` named for `InfoTip`.
- `<Checkbox label="Alerts" children="   " />` is named `Alerts` but still
  paints an empty text run and the row's `sm` gap for content that says
  nothing.
- The existing element case only asserts the missing name; it never asserts
  that the row should not exist.

The honest shape for a blank child is the pre-`740` bare box: the box is still
the control, `label` still names it, and no empty row is painted.

## 1. The contract

1. A **text or number child that trims to nothing** does not make a labelled
   row. `<Checkbox>{maybeEmpty}</Checkbox>` with `maybeEmpty === "   "` is the
   bare box, exactly like `{false}` today.
2. A **real explicit `label`** plus blank child(ren) renders the bare box named
   by that label. The label is not erased; only the empty row is.
3. A **non-text child** (an element) still makes a row: it paints something of
   its own. The existing naming rule is unchanged — a mixed or icon-only child
   list needs `label` for a name, and the library does not invent one.
4. No label and no meaningful child stays the bare, unnamed box. That is the
   documented caller contract for a standalone control (`label` is how you name
   it); this plan adds no fallback name.
5. A whitespace-only child **beside** real text (`["  ", "Email"]`) still makes
   a row named `"Email"`; only a child list with nothing to paint is skipped.
6. No public prop, role, name or key contract changes. `CheckboxGroup`'s rows
   are data-driven and already resolve `optionText`; they are untouched.

## 2. Files to change

### 2.1 `packages/primitives/src/components/internal.ts`

Add one helper beside `textOf`/`controlName`, using the same Effect modules the
file already imports (`Arr`, `P`, `Str`):

```ts
/**
 * Whether a child list paints anything.
 *
 * `Children.toArray` already drops `null`, `undefined` and booleans, so what
 * remains is text/numbers — meaningful only when they say something — or an
 * element, which paints its own content. A control uses this to decide whether
 * a visible label exists at all; blank text is absent, the rule `ariaName` and
 * `hasText` already apply (plans `026`, `396`, `577`, `740`, `743`).
 */
export const paintsContent = (children: ReactNode): boolean =>
  Arr.some(Children.toArray(children), (part) =>
    P.isString(part) || P.isNumber(part)
      ? Str.isNonEmpty(Str.trim(`${part}`))
      : true,
  );
```

### 2.2 `packages/primitives/src/components/Checkbox.tsx`

- Import `paintsContent` from `./internal.js`.
- Replace the row gate
  `if (Children.toArray(props.children).length === 0)` with
  `if (!paintsContent(props.children))`.
- Remove the now-unused `Children` import if nothing else uses it.
- Update the `children` JSDoc: "A **real** text child makes the row; a blank
  one is not a label and leaves the bare box (plan `743`)."

### 2.3 `packages/primitives/src/components/Switch.tsx`

The identical change: import `paintsContent`, gate the row with it, drop the
unused `Children` import, and add the same sentence to the `children` JSDoc.

### 2.4 `packages/primitives/src/components/selection.test.tsx`

Extend the existing blank-label cases (do not duplicate them):

1. In `"lets an explicit label win, and a blank one fall back to the text"`,
   assert the third render (`label: "   ", children: "   "`) has
   `elementChildren(...)` of length **0** — the bare box, not an empty row.
2. Add `"does not paint an empty row for a blank text child"` under
   `describe("Checkbox")`:
   - `{ children: "   " }` → children length 0 and no name;
   - `{ label: "Alerts", children: "   " }` → children length 0 and the name
     `"Alerts"`;
   - `{ children: ["  ", "Email"] }` → children length 2 and the name
     `"Email"` (a blank run beside real text is still a label).
3. Add the same three-shape case under `describe("Switch")`:
   `{ children: "   " }`, `{ label: "Wi-Fi", children: "   " }`, and the mixed
   list.

All three shapes fail against the old gate: the first two paint two children
(box/track plus `Text`) instead of zero.

### 2.5 `packages/primitives/runtime/labelled-selection.runtime.test.tsx`

Add two cases (the file already has a header naming plan `740`; extend it with
one sentence naming plan `743`):

1. `"does not paint an empty labelled row for a blank Checkbox child"` — mount
   `<Checkbox testId="c" label="Alerts">{"   "}</Checkbox>` in a `Surface`:
   - `runtime.element("c")` exists and has **no** children (the bare box);
   - the accessibility tree has one `CheckBox` named `"Alerts"`, and no
     unnamed checkbox node;
   - `runtime.allText()` does not contain a stray blank run (assert the row
     shape, not whitespace, where the helper permits).
2. `"does not paint an empty labelled row for a blank Switch child"` — the same
   shape with `<Switch testId="s" label="Wi-Fi">{"   "}</Switch>`, one `Switch`
   node named `"Wi-Fi"` and no child element.

Both cases fail against the old gate with one child id (the `Text`) on the
control.

### 2.6 `packages/primitives/docs/checkbox.mdx` and `docs/switch.mdx`

- In the visible-label section, state the rule: a **blank** text child is not a
  label — it does not paint an empty row, and `label` (when supplied) still
  names the bare box.
- API table `children` row: add "a blank child is ignored".
- Limitations: no change; a mixed/icon-only child list still needs `label`.

### 2.7 `COMPONENTS.md`

- Checkboxes row: one sentence, **Blank child (743):** a whitespace-only text
  child is not a label; the control stays the bare box (named by `label` when
  present), so no empty row or unnamed focus stop is painted.
- Switches row: the same sentence for `Switch`.

### 2.8 `TODO.md` and `.agents/slop/plans/README.md`

- Add the row to the primitives section and tick it; raise `167/167` to
  `168/168`.
- Add plan `743` to the primitives table in the plans index with its measured
  result.

## 3. Commands and expected results

```sh
# 1. the element suites — run this first with only the §2.4 tests added and
#    §2.2/§2.3 unchanged, to record the failing direction.
nub run --filter @gpuixui/primitives test
# expect before the fix: the two new element cases fail, each reporting two
# children where zero are expected (and the existing blank case's new assertion
# fails the same way); after the fix: 69 files / 955 tests pass.

# 2. the scoped runtime file
nub run --filter @gpuixui/primitives test:runtime runtime/labelled-selection.runtime.test.tsx
# expect before the fix: both new cases fail on `children` length 1; after:
# 1 file / 8 tests pass.

# 3. the suites the row gate touches
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/name.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/theme-matrix.runtime.test.tsx
# expect: unchanged and green; the labelled (non-blank) shapes and the name
# matrix do not move.

# 4. the package gates
nub run --filter @gpuixui/primitives check-types
```

## 4. Test plan — both directions

The gap: a whitespace-only text child turned a standalone control into a
labelled row with an empty `Text` and, when `label` was also blank, no
accessible name.

1. **Offline, before the fix.** `selection.test.tsx`'s new cases fail because
   `elementChildren` is `[box, Text]` (length 2) instead of `[box]` (length 0).
   Record the exact assertion text in the plan status line.
2. **Offline, after the fix.** The same cases pass; a real label, a real child
   and the mixed list are unchanged.
3. **Runtime, before the fix.** The two new cases fail because
   `runtime.element(testId).children` has one id (the `Text`), proving the empty
   row paints.
4. **Runtime, after the fix.** The control has no children and the named
   `CheckBox`/`Switch` node is the only node for it.
5. **Revert direction.** Restore `Children.toArray(props.children).length ===
   0` in `Checkbox.tsx` only: the Checkbox element and runtime cases fail by
   name while the Switch pair stays green. Restore it in `Switch.tsx` only: the
   reverse.
6. **No regression direction.** The existing labelled cases (real text, blank
   explicit label falling back to text, `{false}` bare box, the Tooltip trigger
   case) must stay green in both states.

## 5. STOP conditions

Stop and report rather than improvise if:

- `Children.toArray` cannot distinguish a blank string child from no child
  (then the rule needs a different seam and the contract must be re-decided);
- a real element child is dropped by the gate (an icon-plus-text row is still a
  row; only text that paints nothing is skipped);
- the runtime reports no `children` on the control, so the empty row cannot be
  observed (the case would need a painted-height assertion instead);
- the change moves any labelled control's name, role, tab stop or focus ring;
- `CheckboxGroup`/`RadioGroup`/`ToggleGroup` rows change (they are data-driven
  and out of scope).

## 6. Acceptance

- A blank text child no longer creates a visible label row on `Checkbox` or
  `Switch`; the bare box is painted, and `label` still names it.
- A blank explicit label with a blank child is the bare box with no invented
  name; a mixed child list with real text still makes a named row.
- The new element and runtime cases fail against the old gate by name and pass
  after it; the existing labelled, name, theme and trigger suites stay green.
- Both pages, `COMPONENTS.md`, `TODO.md` and the plans index tell the truth.
- `nub run --filter @gpuixui/primitives test`, the scoped runtime files and
  `check-types` pass.
