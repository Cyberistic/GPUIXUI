# 315 — Typed text on the canvas field

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
059, 071–095, 088, 306–314 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md`, this index

## 1. The gap

`inputForeground` is the role for text typed into a field, and plan 059 measured
it on the `input` fill only (`["inputForeground", "input", "body"]`). But five
shipped components paint the input on the **canvas** instead of the `input`
fill — a transparent field inside a chrome box, or a field whose root is
`background`:

| Component | Paint |
| --------- | ----- |
| `components/src/search-input.tsx` | root `backgroundColor: background`, inner `<input>` `color: inputForeground` |
| `components/src/inline-edit.tsx` | input `backgroundColor: background`, `color: inputForeground` |
| `components/src/color-picker.tsx` | input `backgroundColor: background`, `color: inputForeground` |
| `components/src/tag-input.tsx` | root `background`, transparent `<input>` `inputForeground` |
| `components/src/mention-input.tsx` | root `background`, transparent `<input>` `inputForeground` |

A copied platform style that darkens or retints `background` while keeping the
identity's `inputForeground` can therefore erase typed text in a search box, an
inline edit or a tag field while `themeContrastFailures` returns `[]`. Every
shipped theme passes today, so no colour moves; the pair is what makes an edited
theme safe.

The same audit found an adjacent **cross-team** defect that this plan does not
fix: those transparent fields leave the placeholder to the runtime default
colour (they set no `placeholder` role), so `placeholder` is only meaningful on
the `input` fill it is measured against. Recorded in `TODO.md` for the
`components` workstream.

## 2. Decision (do not re-litigate)

Add one pair to `contrastPairs` (246 → **247**):

| Foreground | Background | Class | Why |
| ---------- | ---------- | ----- | --- |
| `inputForeground` | `background` | `body` | a transparent field painted on the canvas |

`body`, not `secondary`: typed text is the content a reader enters, and it takes
the 7:1 / 7:1 floor the `input` pair already uses. The `input` pair stays.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

Next to the existing `["inputForeground", "input", "body"]` entry, add:

```ts
["inputForeground", "background", "body"],
```

and extend the `contrastPairs` JSDoc: typed text is measured on the `background`
canvas a transparent field paints, as well as on the `input` fill.

### 3.2 `packages/tokens/src/contrast.test.ts`

- `contrastPairs.length` 246 → 247.

### 3.3 `packages/tokens/src/canvas-input-text.test.ts` (new)

Header comment: *Guards the gap plan 315 closed — `inputForeground` was measured
only on the `input` fill, but SearchInput, InlineEdit, ColorPicker, TagInput and
MentionInput paint a transparent input on the `background` canvas. An edited
theme could erase typed text in any of them while `themeContrastFailures`
returned `[]`. Every shipped set passes, so no colour moves.*

Tests:

1. **The pair exists once, as body** — one `inputForeground`/`background`/`body`
   pair and one `inputForeground`/`input`/`body` pair; no duplicates.
2. **Every shipped theme clears its declared floor** — identity modes ×
   contrasts, the three real platform styles in both modes and both contrasts,
   and both recipes in both modes.
3. **A canvas whose value equals the typed text is reported** —
   `extendTheme(getTheme("light"), { colors: { background: lightColors.inputForeground } })`;
   assert the failure `{ foreground: "inputForeground", background:
   "background", pairClass: "body", floor: 7 }` is present.
4. **The `input` pair is still measured** — the same regression that only moves
   `input` reports `inputForeground` on `input`, proving the new pair did not
   replace it.

### 3.4 Documents

- `docs/tokens.md`
  - The `inputForeground` colour-table rows (default and high contrast): the
    "Use" column gains "including on the `background` canvas a transparent field
    paints".
  - The verification paragraph the docs test pins: “typed text is
    `inputForeground` on the `input` fill and on the `background` canvas a
    transparent field paints”.
  - The verification section's list of measured roles: name the canvas field.
  - Add the new total (246 → 247) next to the plan 314 sentence.
- `docs/design-system.md`
  - §9 floor table: the body-text row names typed text on `background` and
    `input`.
- `packages/tokens/README.md`: one clause in the body-text paragraph naming the
  canvas field.
- `COMPONENTS.md`: "Theme contrast check" row 246 → 247 and a clause for the
  typed-text pair.
- `TODO.md`: add and tick the task; move the progress bar to 83/109; add the
  cross-team placeholder row (owner: `components`).
- This index: add 315 as done with a closing paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1: the new test fails on the missing pair; after: green |
| 2 | `nub run check` | exit 0 |
| 3 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- `inputForeground` on `background` fails its floor in a shipped theme (the
  premise was "no colour moves"; a failure is a shipped defect);
- a component is found painting typed text on a different fill than `background`
  or `input` (name it in the plan before adding a third pair);
- a change is needed outside the paths listed above.

## 6. Acceptance

- [x] `contrastPairs` is 247 with the canvas typed-text pair.
- [x] Every shipped theme clears its declared floor on it.
- [x] Both regressions are reported by `themeContrastFailures`.
- [x] Documents, ledger and TODO are current; gates pass; committed and pushed.

## 7. Outcome

- The audit found the pair already far above its floor: the tightest shipped set
  is **14.27:1** (Windows XP light), so no colour moves and no theme needed an
  edit.
- The pair is `["inputForeground", "background", "body"]`, beside the `input`
  pair; `contrastPairs` moves 246 → **247**. The public surface is unchanged.
- `canvas-input-text.test.ts` states both directions: a light `background`
  equal to `inputForeground` reports the canvas pair, and a light `input` equal
  to `inputForeground` still reports the fill pair. With the new entry removed,
  the pair-list and canvas-regression cases fail; restored, the suite passes.
- The audit also found that the five transparent fields leave placeholder colour
  to the runtime default, so the `placeholder` role is only painted on the
  `input` fill. That is a `components` change, not this package's, and is
  recorded as a cross-team `TODO.md` row.
- Green: **47 test files, 3036 tests**; `nub run check`, `nub run lint` (inside
  check) and `nub run test` were run and passed. Committed and pushed.
