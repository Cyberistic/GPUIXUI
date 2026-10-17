# 163 — Plan: native text selection and copy

| Field | Value |
| ----- | ------- |
| Status | planned (measured facts land in §8) |
| Phase | B (feasibility) → feeds Tier 3 Log viewer, Tier 5 Code editor / Diff viewer / Rich text |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `161` |
| Feeds | `@gpuixui/components` (log viewer copy, code block, diff viewer), `@gpuixui/editor` (search and replace, multi-pane editing) |

## 1. Goal

Every desktop text surface the inventory promises — the log viewer's copy, a
code block, a diff, markdown — depends on native selection working **across
elements**, on native content (`<code>`, `<diff>`) being selectable, and on
`userSelect: "none"` excluding chrome (line numbers, gutters, toolbars). The
published README documents all three; nobody has run them on 0.10.0.

This probe answers with a run:

- does a drag from one `<text>` to another select both, joined in document
  order?
- is text inside `<code>` and `<diff>` selectable, and are their gutters,
  markers and file/hunk headers excluded as chrome?
- does `userSelect: "none"` on an ancestor exclude its text from a selection
  that starts before it and ends after it?
- does a click (no drag) leave the selection empty, and does `clearSelection`
  empty an existing one?

## 2. What is documented

- `TestRenderer.dragSelect(x1, y1, x2, y2)` performs a selection drag and
  **flushes between every step**, because selection listeners are registered
  during paint. A hand-rolled `simulateMouseDown/Move/Up` selects nothing.
- `getSelectedText()` is the joined selection in document order, or `null`;
  `clearSelection()` empties it.
- `userSelect: "text" | "none" | "auto"` inherits down the tree.
- `<code>` and `<diff>` paint their text inside GPUI and register selectable
  runs; their gutters/markers/headers use `chrome_text`, which is painted but
  deliberately **not** selectable.

The probe turns those claims into a failing test.

## 3. Scenario `text-selection` (capability `selection`)

New view `apps/playground/src/scenarios/text-selection.tsx`. A column, all
colours from `useTheme`, one `selection-note` readout that shows
`len=<selected length>` so a human can see the current selection.

| Element | Props |
| ------- | ----- |
| `select-heading` | `<text>Selection heading</text>` |
| `select-body` | `<text>first line</text>` and a second `<text>second line</text>` |
| `select-toolbar` | `<text>` inside `<div style={{ userSelect: "none" }}>toolbar chrome</div>` |
| `select-after` | `<text>after toolbar</text>` |
| `select-code` | `<code code={"alpha();\nbeta();"} language="ts" showLineNumbers />` |
| `select-diff` | `<diff patch={PATCH} />` with the same two-line `example.ts` patch as plan `161` |

Steps:

1. drag from `select-heading` to the second body text: the selection contains
   `Selection heading`, `first line` and `second line`, in that order.
2. drag from `select-toolbar` to `select-after`: the selection contains
   `after toolbar` and **not** `toolbar chrome` — `userSelect: "none"` is
   excluded even though the drag starts inside it.
3. drag across `select-code`: the selection contains `alpha();` and `beta();`
   and **no line numbers** (the code has no digits of its own, so any `1`/`2`
   would be a gutter leak).
4. drag across `select-diff`: the selection contains `const added = 1` and
   `const removed = 1`, and **not** `example.ts` or `@@` — the file and hunk
   headers are chrome.
5. `clearSelection()` then `selectedText()` is `None` (or empty).
6. a plain click on `select-body` selects nothing (a tap is not a drag).

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/163-text-selection.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `163` |
| `packages/testing/src/smoke.ts` | `CAPABILITIES` gains `selection`; `SmokeHost` gains `selectText`, `selectedText`, `clearSelection` |
| `packages/testing/src/test-support.ts` | the three null-host members |
| `apps/playground/src/smoke/host.ts` | `selectText` maps both `testId`s to bounds and calls `renderer.dragSelect`; `selectedText`/`clearSelection` pass through |
| `apps/playground/src/scenarios/text-selection.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | register it; add `selection` to `CORE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | the registry test expects `selection` |
| `apps/playground/README.md` | a "Native text selection" section; suite count 28 → 29 |
| `COMPONENTS.md` | capability row; Log viewer / Code editor / Diff viewer / Rich text notes cite the measurement |
| `TODO.md` | one new task, ticked on landing; suite count updated |

`selectText` starts at the first element's top-left inset by 2 px and ends at
the last element's bottom-right inset by 2 px, so the drag anchors inside the
text rather than on its border.

## 5. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only text-selection` → `1/1`, exit
   `0`, `selection=verified`.
5. `nub apps/playground/dist/smoke/run.js` → **29/29**, exit `0`.
6. `nub run check`, `nub run lint`, `nub run test` → all exit `0`.

## 6. STOP conditions

- **STOP** if `dragSelect` returns `null` for a drag across plain `<text>`;
  record the coordinates and the tree. Selection is then not usable and the
  log/code/diff copy claims must be withdrawn.
- **STOP** if `<code>`/`<diff>` selection includes chrome text (line numbers,
  markers, headers). Record exactly what leaked; the component cannot rely on
  copy being clean.
- **STOP** if `userSelect: "none"` still selects. Record it and the alternative
  (render chrome outside the selectable container).
- **DO NOT** implement selection by hand in the probe, or synthesise a
  selection string. The renderer's own `dragSelect`/`getSelectedText` is the
  only evidence.

## 7. Test plan (two directions)

- The scenario fails if selection loses an element, stops crossing elements,
  includes a `userSelect: "none"` region or chrome text, or if `clearSelection`
  leaves text behind.
- Two-direction proof, recorded in §8:
  1. remove `userSelect: "none"` from the toolbar wrapper and confirm the
     "excludes toolbar chrome" check fails with the selection that leaked.
     Restore.
  2. remove `showLineNumbers` from the code block and confirm the "no line
     numbers" **cannot** fail — instead, keep it and change the assertion to
     require the code lines; the meaningful proof is step 1 plus dropping
     `showLineNumbers` to show selection is unchanged. Record both.
  3. remove `chrome_text` from a diff header is an upstream change and is out of
     scope; if the diff leaks its header, record it as a limitation.

## 8. Measured facts

_To be filled by the implementation run. Record: the exact selections for each
step; whether `null` or `""` comes back for an empty selection; whether clicks
select; the two-direction outputs._
