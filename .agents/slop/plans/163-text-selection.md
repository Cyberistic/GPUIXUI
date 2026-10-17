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
colours from `useTheme`.

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
2. drag from `select-toolbar` to `select-after`: the selection is **empty** —
   an anchor inside `userSelect: "none"` produces no selection at all (measured,
   §8); the drag is then repeated from `select-body-2` to `select-after` and
   contains `second line` and `after toolbar` but **not** `toolbar chrome` —
   a selection that crosses the region excludes it.
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
the last element's right edge, vertically inset by 2 px. Ending 2 px inside the
right edge truncates the last glyph, so the drag must reach the edge.

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

**Suite: 29/29 green on this host, exit `0`**, `selection=verified`, with the 28
prior scenarios unchanged.

Exact selections from the run:

| Drag | Selection |
| ---- | --------- |
| `select-heading` → `select-body-2` | `Selection heading\nfirst line\nsecond line` |
| `select-toolbar` → `select-after` (anchor inside `userSelect: "none"`) | **`""` — no selection at all** |
| `select-body-2` → `select-after` (crossing the toolbar) | contains `second line` and `after toolbar`, **not** `toolbar chrome` |
| `select-code` → itself | `alpha();\nbeta();` — **no line numbers** |
| `select-before-diff` → `select-diff` | `before diff\nconst removed = 1\nconst added = 1` — **no file header, hunk header, gutter or marker** |
| `clearSelection()` | `""` |
| a click on `select-body-1` | `""` — a tap is not a drag |

- **Cross-element selection works.** Adjacent `<text>` nodes join with a newline
  in document order, exactly as the README documents.
- **`userSelect: "none"` is stronger than "excluded":** an anchor inside the
  unselectable subtree produces **no selection at all**, not a selection that
  starts at the next selectable run. A cross-selection that merely passes over
  the region (body → after) skips it correctly. Consequence: a log viewer must
  start the drag in a text row, never in a gutter or toolbar.
- **Native content is selectable with clean copy.** `<code>` yields only code
  lines (line numbers are `chrome_text`), and `<diff>` yields only line text —
  the file header, hunk header, gutters and `+`/`−` markers are all excluded.
  The removed line precedes the added one, matching the patch.
- **`clearSelection` and taps** both leave the selection empty.
- **Harness note:** a drag that ends 2 px inside the right edge truncates the
  last glyph (`second lin`); `SmokeHost.selectText` ends at the element's right
  edge and starts 2 px inside the top-left. The first attempt is recorded in
  §7's spirit: the failure named the truncated selection.
- **Two-direction proof** (both run, outputs quoted):
  1. removing `userSelect: "none"` from the toolbar wrapper: **exit `1`**, `a
     drag anchored in userSelect none selects nothing: expected "", got
     "toolbar chrome\nafter toolbar"`. Restored.
  2. removing `clearSelection()`: **exit `1`**, `clearSelection empties the
     selection: expected "", got "before diff\nconst removed = 1\nconst added =
     1"`. Restored.
- **Not force-failed:** the line-number and diff-header exclusions are positive
  assertions (the selection string contains none of the chrome); forcing a leak
  would need an upstream change to `chrome_text`, which is out of scope. The
  `userSelect` proof above is the demonstrated two-direction case.

