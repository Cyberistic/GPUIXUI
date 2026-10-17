# 181 — Tier 5 feasibility: a markdown surface

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | B→D (feasibility probe) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `160` (a11y), `163` (selection) |
| Closes | `COMPONENTS.md` Tier 5 → *Rich-text editing* and the content surface the Tier 2 *AI message* row will render |

## 1. Question

`COMPONENTS.md` says: "`<markdown>` renders markdown; editing is not provided
(verified). Its text is selectable and copyable (`text-selection` covers the
shared selection path)." The second half is an assumption: `text-selection`
never mounted a `<markdown>`. The library needs the real contract before a rich
text preview, a docs surface or the AI message row is built on it.

Four claims:

1. **Render** — does a `<markdown source>` paint paragraphs, headings, lists,
   tables and fenced code, and are those runs addressable text?
2. **Links** — does `onLinkClick` fire, and can a click be aimed at a link
   without knowing the glyph layout?
3. **Selection** — can a drag cross a markdown block and copy its text, the way
   `text-selection` measured for plain text, `<code>` and `<diff>`?
4. **Composition** — does React children stay out of the paint (the `<svg>` and
   `<canvas>` shape), and what accessibility role does the element expose?

## 2. Source evidence (reconnaissance — confirm in the run)

Read from the pinned `@gpuix/native@0.10.0`:

- `packages/native/src/custom_elements/markdown.rs` → parses GitHub-flavoured
  markdown (tables, strikethrough, task lists), renders through
  `markdown::render::render_tree`, registers every block in the shared selection
  registry **in document order**, hit-tests links **per byte range**, and
  ignores React children (it appends only its own body to the container).
- `MarkdownProps` is `source`, `theme` (`GpuixTheme`) and `onLinkClick`; the
  container is `w_full`, so its width is the parent's, not the text's.
- `custom_surface` applies `role`/`aria-*` from the host props to the container.

The consequence to test: a link click must be aimed at the **text**, not the
element centre, and the markdown container is full width — so the fixture puts a
long link first, at the element's left edge, for a centre click to land on it.

## 3. Design

New scenario `markdown-surface`, capability `content` (an existing capability —
no new report row: this is the same content-surface family as `svg`/`img`/
`diff`), in `apps/playground/src/scenarios/markdown.tsx`.

View (width 560):

- `md-before`: a `<text>` anchor for a cross-element selection.
- `md-doc`: `<markdown testId="md-doc" role="article" aria-id="md-doc"
  aria-label="Release notes" source={DOC} />`, where `DOC` contains:
  a heading (`# Release notes`), a bold/emphasis paragraph, an inline code
  span, a bullet list, a two-column table (`| Metric | Value |` …), and a
  fenced `ts` block. No link in this document, so its click does nothing.
- `md-link-doc`: a second `<markdown>` whose whole source is one long link
  (`[Open the documentation site for the whole project](https://example.test/docs)`),
  with `onLinkClick` writing `md-link` = `url=<value>`.
- `md-after`: a `<text>` anchor after `md-doc`.
- `md-child`: `<markdown testId="md-child" source="# Child">{<text
  testId="md-child-text">md-child-text</text>}</markdown>`.
- Readout `md-link` starts `url=none`.

### Assertions

| # | Check | Why |
| - | ----- | --- |
| 1 | `md-doc` is retained as type `markdown`, painted with a real width and height | it is a real host element |
| 2 | painted text contains `Release notes`, the list item, the table header and cell, and the code line | all block kinds render |
| 3 | a drag from `md-before` to `md-after` selects the markdown text in document order | rich text is copyable |
| 4 | clicking `md-link-doc`'s centre fires `onLinkClick` with `https://example.test/docs` | a link is a real target |
| 5 | clicking `md-doc` (no link) leaves `url=none` | prose is not a link |
| 6 | `md-child-text` is retained in the tree but absent from the paint | children are ignored, like `<svg>` |
| 7 | the element is exposed as AccessKit `Article` named `Release notes` | it is a named region |

## 4. Files

```
apps/playground/src/scenarios/markdown.tsx     NEW
apps/playground/src/scenarios/index.ts         EDIT  import + registry (capability `content`)
apps/playground/README.md                      EDIT  "Markdown surfaces (plan 181)", structure, evidence row
COMPONENTS.md                                  EDIT  Rich-text editing (Tier 5) + the content-surface paragraph
TODO.md                                        EDIT  tick the probe
.agents/slop/plans/README.md                   EDIT  index this plan
.agents/slop/plans/181-markdown-feasibility.md EDIT  §8 measured result
```

No capability is added: `content` already covers `svg`, `img`, `diff`, `canvas`
and now `markdown`.

## 5. Commands and expected results

```sh
nub run --filter playground build
# -> tsc exits 0

nub apps/playground/dist/smoke/run.js --only markdown-surface
# -> "1/1 scenarios passed", exit 0

nub apps/playground/dist/smoke/run.js
# -> 49/49 scenarios passed, content=verified, exit 0

nub run check && nub run lint && nub run test
```

## 6. Two directions

- Replace the heading in `DOC` with plain prose → the `painted text contains
  Release notes` check still passes; instead **remove the table rows** → the
  table check fails. Record the exact label.
- Remove `onLinkClick` from `md-link-doc` → the link check fails.
- Move the long link into a second paragraph with prose before it → a centre
  click misses the link and the check fails; that is the honest limit to record,
  not to paper over.
- Replace the source's code fence with a paragraph → the code-line check fails.
- At least two of these are recorded in §8.

## 7. STOP conditions

- **`onLinkClick` cannot be triggered by a coordinate click** anywhere in the
  element → stop claiming links are automatable. Record the absence, keep the
  render/selection checks, and mark link activation as app-verified only.
- **A selection cannot cross the markdown boundary** (empty or partial result) →
  record it; selection within a single markdown block may still work, and that
  is the honest claim.
- **Markdown text is not in `getPaintedText`** → the render check cannot be
  textual; fall back to bounds plus the screenshot artifact and record it.
- **No a11y node appears** even with `role`/`aria-label` → record the role that
  did appear (or the absence) rather than inventing one.

## 8. Measured result

Run 2026-10-17 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | pass |
| `--only markdown-surface` | 1/1, **21 checks**, `content=verified`, exit `0` |
| full suite | **49/49**, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | pass |

What the probe established (21 checks in `.artifacts/smoke-report.json`, visual
evidence in `.artifacts/screenshots/markdown-surface.png`):

- **Render.** `<markdown source>` is a real host element (`elementType ===
  "markdown"`) that fills its container (544 px inside the 560 px column) and
  paints a heading, prose with bold/emphasis/inline code, a bullet list, a
  bordered table with header and cells, and a fenced `ts` block with a language
  label and syntax highlighting. Every one of those runs is in
  `getPaintedText`, so markdown content is assertable text, not pixels.
- **Selection.** A drag from a `<text>` before the document to one after it
  returns a selection containing `Release notes` and `const total` — the
  markdown registers in the shared selection registry in document order, exactly
  as the source comments claim. Setting `userSelect: "none"` on the element
  excludes its text from the same crossing drag (`before\nafter`), which proves
  the selection was real.
- **Links.** A coordinate click at the link's glyphs fires `onLinkClick` with
  `https://example.test/docs`; a click on link-free prose fires nothing. The
  element is `w_full`, so a short link at the left is **not** reachable by the
  element's centre point — the fixture uses a one-line document and a long link,
  and that is a fixture constraint, not an API contract. A component that must
  expose links to synthetic input needs the link's glyph coordinates.
- **Composition.** React children are retained in the tree (`md-child-text`
  reads back) but never painted: the element appends only its own rendered body.
  The same shape as `<svg>` and `<canvas>`.
- **Accessibility.** `role="article"` + `aria-id` + `aria-label` on the element
  produces an AccessKit `Article` named `Release notes`; changing the role to
  `group` changes the reported role. The markdown's internal headings and table
  are **not** separate nodes — the document is one region, so a rich-text
  surface that needs per-heading navigation must build it.
- **Styling.** The rendered document uses the element's built-in `Theme`
  default (a dark palette): the container's own style did not recolour the text
  runs. `theme` is the typed styling prop, but only the default was measured
  here.

Two-direction proofs (mutation → the named check failed at exit `1` → file
restored):

| Mutation | Failing check |
| -------- | ------------- |
| `onLinkClick` ignores the event value | `a coordinate click on the link fires onLinkClick: expected "url=https://example.test/docs", got "url=none"` |
| the fenced code block is replaced by a paragraph | `a fenced code line paints: expected true, got false` |
| `role="article"` becomes `role="group"` | `the document reports the article role: expected "Article", got "Group"` |
| `style={{ userSelect: "none" }}` on the document | `the selection crosses the markdown boundary: expected a string containing "Release notes", got "before\nafter"` |

