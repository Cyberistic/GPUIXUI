# 627 — Selection, highlighting and find: the runtime's text surfaces

**Phase:** F (docs completeness — a runtime capability with no owner)
**Workstream:** docs-site
**Depends on:** 410, 448 (capabilities), 479 (generated tables are dropped from
search), 587 (host props), 606 (styling), 624 (refs), 626 (native elements)
**Status:** implemented

---

## 1. The measured gap

GPUix selects text natively, paints match washes and exposes a find controller.
None of it is documented. The only mentions of selection are Styling's two
style fields and component-level limitations.

Measured 2026-10-20 at `eb2e6a27` with the real search API (`search(query, 2)`):

| Query | First result before |
| ----- | ------------------- |
| `text selection` / `select text` | `/docs/components/text`, `/docs/components/select` |
| `get selected text` | `/docs/components/text` |
| `getSelectedText` | **nothing** |
| `clear selection` | `/docs/components/time-picker` |
| `onSelectionChange` | **nothing** |
| `observeSelectedText` | **nothing** |
| `search highlight` | `/docs/components/search-input` |
| `highlight matches` | `/docs/components/mention-input#states` |
| `match count` | `/docs/components/countdown` |
| `find in page` / `find text` | `/docs/components/inline-edit`, `/docs/components/text` |
| `useTextSearch` / `findRanges` | `/docs/roadmap` |
| `clipboard` | `/docs/components/otp-field#accessibility-and-limitations` |

The cause is structural: this is a renderer capability, not a component, so no
record, preview tier or generated props table owns it.

## 2. The surface that exists (installed declarations)

`@gpuix/native/index.d.ts`, `GpuixRenderer`:

- `getSelectedText(): string | null` — the current selection in document order.
- `clearSelection(): void` — drop it and request a repaint.
- `getPaintedHighlights(): Array<HighlightMatch>` — one entry per painted wash,
  with `elementId`, `sub`, `text`, `start`, `end`, `active` and `rects`
  (`x`, `y`, `width`, `height`) so a wrap produces one box per visual row.
- `setWindowSelectionChange(enabled, eventId)` — what the React renderer calls
  when `onSelectionChange` is passed.

`dist/host.d.ts`:

- `HighlightSpec` — `query`, `caseSensitive`, `wholeWord`, `ranges`
  (`[start, end)` UTF-16 pairs), `color`, `activeColor`, `activeIndex`,
  `matchIndexOffset`, `radius`. The doc comments state: a match never crosses a
  line but crosses interpolated nodes; ranges index the declaring subtree's
  text with a newline between lines; a surrogate-splitting pair is rejected;
  native text (`<code>`, `<markdown>`, `<diff>`) is not part of that text; the
  colours default to the accent at 30 % and 65 %; `activeIndex` is compared
  against `matchIndexOffset + n`; a negative or fractional offset refuses the
  whole spec.
- `HostProps.highlight` (`HighlightSpec | HighlightSpec[] | null`) — the nearest
  declaration wins for its subtree; on the root it searches the window.
- `HostProps.onHighlight` — `event.matchCount` counts every retained match, not
  only the painted ones.
- `EventPayload.matchCount`.

`dist/host-runtime.d.ts`:

- `findRanges({ text, query, caseSensitive?, wholeWord? })` →
  `Array<[number, number]>`.
- `observeSelectedText(renderer, subscribe, callback)` — calls back immediately
  with the current text, then on each selection event (`event.value`).
- `TextSearchOptions` — `query`, `caseSensitive`, `wholeWord`, `color`,
  `activeColor`, `radius`, `matches: { total, indexOffset }`.
- `TextSearchSnapshot` — `props` (`highlight` + `onHighlight`), `total`,
  `active`; `TextSearchController` adds `next`, `previous`, `goTo`,
  `subscribe`; `createTextSearchController()` returns one.

`@gpuix/react/dist/hooks/use-text-search.d.ts` — `useTextSearch(options)` returns
the snapshot plus `next`/`previous`/`goTo`; the hook keeps a controller in state
and subscribes to it. `render()` enables selection events from
`RenderOptions.onSelectionChange` (`WindowKeyEventHandler`), and disables them on
unmount (`reconciler.js:63`, `:79`).

**Not provided:** any clipboard read/write, `window.getSelection`, DOM `Range`,
`execCommand`, or a replace operation. A highlight is a paint, not an
accessibility-tree annotation.

## 3. The page: `/docs/selection` — "Selection and find"

Placement: after `native-elements`, before `components`.

1. **Intro** — the operating system owns text selection; the runtime exposes
   what is selected and paints match washes; the library has no component for
   either.
2. `## Reading the selection` — the `onSelectionChange` option on `render()`
   (enabled exactly when passed, `event.value` is the text), `getSelectedText`
   for a pull, `clearSelection`, and `observeSelectedText` for a host that
   supplies its own subscription. Link Styling's `userSelect`/`selectionColor`.
3. `## Highlighting matches` — the `highlight` prop and the
   `<HighlightFields />` table rendered from `src/lib/selection.ts`; the scoping
   rule; the two colour defaults; `activeIndex` and `onHighlight`'s
   `matchCount`.
4. `## A find bar` — `useTextSearch({ query })` spread onto the container
   (`{...search.props}`), `total`/`active`/`next`/`previous`/`goTo`, and
   `createTextSearchController()` for a non-React host. One compiling example.
5. `## Virtualized content` — `matchIndexOffset` is a match count, not a row
   index; sum `findRanges` over rows before `windowStart`; the refusal rule.
6. `## Native text and ranges` — `<code>`/`<markdown>`/`<diff>` are outside the
   subtree text (use `query`), ranges are UTF-16 with a newline between lines, a
   match never crosses a line, a surrogate split is rejected.
7. `## What is not provided` — `<SelectionAbsences />`: clipboard, DOM
   Selection, replace, accessibility annotation, with the honest alternative.
8. `## Proving a highlight` — `getPaintedHighlights()` and the `HighlightMatch`
   geometry (one rect per wrapped row), which is how the native suites can
   assert a wash without a screenshot.

## 4. Data module and guards

New `apps/docs/src/lib/selection.ts` (browser-safe, takes declaration text):

- `highlightFields: ReadonlyArray<{ name, summary }>` — 10 authored rows.
- `textSearchFields` — 7 rows; `findRangeFields` — 3 rows.
- `selectionMethods` — `getSelectedText`, `clearSelection`,
  `getPaintedHighlights`, `setWindowSelectionChange`, each with a summary.
- `selectionAbsences` — subject, statement, and a `symbol` regex that would
  falsify the absence.
- Parsers: `interfaceFieldsIn` (local, depth-aware like plan 626's) and a reuse
  of `rendererMethodNames` from `window-surface.ts`.
- `selectionViolations({ declarations, fields, methods, absences })` — both
  directions for every interface, both directions for the methods,
  and a failure when an absence's symbol appears.

New `src/lib/selection-search.ts` — generated entry; promoted names are the
distinctive API spellings only: `HighlightSpec`, `HighlightMatch`,
`TextSearchOptions`, `TextSearchController`, `useTextSearch`,
`createTextSearchController`, `findRanges`, `observeSelectedText`,
`getSelectedText`, `getPaintedHighlights`, `matchIndexOffset`,
`activeColor`. Plain words (`highlight`, `selection`, `find`) stay indexed, not
promoted.

New `src/components/selection-tables.tsx` — `HighlightFields`,
`TextSearchFields`, `SelectionAbsences`, following the `overflow-x-auto`
`role="region"` table pattern.

## 5. Files

Create: `src/lib/selection.ts`, `src/lib/selection.test.ts`,
`src/lib/selection-search.ts`, `src/components/selection-tables.tsx`,
`src/components/selection-tables.test.tsx`,
`content/docs/selection.mdx`.

Change: `src/lib/search.ts` (register), `src/lib/search-docs.ts` (row),
`src/components/mdx.tsx` (three components), `content/docs/meta.json`,
`src/lib/page-aliases.ts` (see §6), `src/lib/page-aliases.test.ts`,
`scripts/smoke-build.ts` (one query), `.agents/slop/plans/README.md`, `TODO.md`.

## 6. Search: measured results

Measured 2026-10-20 after the page landed (`search(query, 1)`):

| Query | First result after |
| ----- | ------------------ |
| `text selection`, `select text`, `selected text`, `get selected text`, `clear selection` | `/docs/selection` |
| `find in page`, `find text`, `search highlight`, `highlight matches`, `match count`, `text highlight` | `/docs/selection` |
| `getSelectedText`, `onSelectionChange`, `observeSelectedText`, `useTextSearch`, `findRanges` | `/docs/selection` |
| `highlight` | `/docs/selection` — **moved from Mention input's states** |
| `selection` | `/docs/selection` — **moved from Radio group's limitations** |
| `find` | `/docs/selection` — was nothing |
| `clipboard` | `/docs/selection` — **moved from OTP Field's limitations** |
| `radio group` | `/docs/components/radio-group` |
| `select`, `select row`, `search` | Select, Data display, Search input |

Four deliberate moves, each recorded rather than hidden behind an alias:

- `highlight`, `selection` and `find` name the runtime capability the page is
  about; their previous owners were a mention-input states section, a radio
  group limitation and nothing. The page title and summary earn them.
- `clipboard` now reaches the page that states the absence, which is the honest
  answer to "can I copy?"; OTP Field's limitation stays where it is.
- `copy` and `paste` did **not** move (Theme editor, Troubleshooting), because
  they are about the docs site's controls and a paste failure, not the runtime.

## 7. Test plan

1. Parser fixtures: `HighlightSpec`, `TextSearchOptions` and `FindRangesOptions`
   bodies, a nested object, and a missing interface.
2. Installed agreement: one `selectionViolations` call with the real
   declarations expecting `[]`; permanent mutations for a missing field, an
   extra field, a renamed renderer method, and an absence whose symbol appears.
3. Tables: one row per field, one row per method, one absence row each; the page
   mounts all three.
4. Page guard: the eight section headings, each component mount, every absence
   owner resolves, the description names "selection", "highlight" and "find".
5. Search: the measured ownership table and the regression table, plus
   `getSelectedText` and `useTextSearch` reaching the page.
6. Build smoke: one query (`text selection`) against `/api/search`.
7. `smoke:a11y` (both schemes) and `smoke:responsive` for the new page.

Measured forced failures:

| Change reverted | Failure |
| --------------- | ------- |
| the whole `/docs/selection` alias block (key renamed) | seven owned queries fail by name, e.g. `text selection → /docs/components/text`, `match count → /docs/components/countdown` |
| `<HighlightFields />` removed from the page | `expected [ '<HighlightFields />' ] to deeply equal []` in both the page guard and the table suite |
| `getSelectedText` renamed in the authored method list | `GpuixRenderer: readSelectedText is documented but not declared` and `GpuixRenderer: getSelectedText is a selection method but undocumented` (permanent cases) |

## 8. Commands

1. `cd apps/docs && nub exec vitest run src/lib/selection.test.ts src/components/selection-tables.test.tsx`
2. `cd apps/docs && nub exec vitest run src/lib/search.test.ts src/lib/page-aliases.test.ts`
3. `nub run --filter docs check-types`
4. `nub run --filter docs build && nub run --filter docs smoke:build`
5. `nub run --filter docs smoke:a11y && nub run --filter docs smoke:responsive`
6. `nub run check && nub run lint && nub run test`

Expected: all exit 0; `smoke:build` reports one more page (109 → 110) and the
new query green.

## 9. STOP conditions

- The installed declarations differ from §2 (a dependency bump): stop and
  re-measure.
- An absence cannot be falsified by a symbol (for example a clipboard method
  appears): remove the row and document the capability instead.
- A §6 plain-word row cannot keep its owner without a ranker change: record the
  measured limit, keep the phrase form.
- Any native behaviour can only be proven on the playground: label it unverified
  and add a `TODO.md` row rather than claiming it.

## 10. Acceptance criteria

- `/docs/selection` renders every `HighlightSpec`, `TextSearchOptions`,
  `FindRangesOptions` field and the four renderer methods from the installed
  declarations, the five absences, and a compiling find-bar example.
- `selection.test.ts` agrees in both directions, with recorded forced failures.
- Every §1 query reaches the page first; every regression row keeps its owner.
- The build, a11y, responsive and root gates are run and recorded.
- `TODO.md`, the plan index and the branch are updated.

## 11. Measured results

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/lib/selection.test.ts src/components/selection-tables.test.tsx` | 14 tests pass |
| `nub run --filter docs test` | 143 files / 1 526 tests pass |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0 — 110 pages, 241 links, 1 419 anchors, `text selection` green |
| `nub run --filter docs smoke:a11y` | exit 0 — 110 pages × 2 schemes, 0 violations |
| `nub run --filter docs smoke:responsive` | exit 0 — 110 pages at 390×844 |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

Corrections measured during implementation:

1. `FindRangesOptions` has four fields, not three (`text`, `query`,
   `caseSensitive`, `wholeWord`).
2. `HighlightSpec` has nine fields; `radius` and `matchIndexOffset` are easy to
   miss because they sit after the colour fields.
3. The find-bar example first used a `<button>`, which this runtime does not have
   (plan 626); the page now composes `Button` and links the element page.
4. The table registration in `mdx.tsx` initially shipped without its imports —
   seven suites caught it by name through `getMDXComponents()`, which is exactly
   what that guard is for.
