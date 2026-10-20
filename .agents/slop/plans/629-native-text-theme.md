# 629 — Native text theme: `GpuixTheme`, `SyntaxTheme` and `GpuixMetrics`

**Phase:** F (docs completeness — a runtime API surface with no owner)
**Workstream:** docs-site
**Depends on:** 410 (site), 419/431 (search), 479 (generated table rows are
dropped from search), 568/574/598 (page summary and alias vocabulary), 606
(styling), 624 (refs), 626 (native elements), 627 (selection and find)
**Status:** implemented

---

## 1. The measured gap

The runtime's native text elements take a **second theme**, separate from
`@gpuixui/tokens`: `GpuixTheme` with its `SyntaxTheme` and `GpuixMetrics`
children. It decides the caret and placeholder colour of every native
`<input>`, and the syntax palette, row heights, gutters and markdown metrics of
`<code>`, `<diff>` and `<markdown>`. The library already maps its tokens onto it
through `nativeTextTheme`, and no page explains any of it.

Measured 2026-10-20 at `db5a8f5e` with the real search API (`search(query, 3)`):

| Query | First result before |
| ----- | ------------------- |
| `native text theme` / `native text` | `/docs/components/text` |
| `syntax theme` | `/docs/theming` |
| `syntax colors` / `diff colors` / `caret color` | `/docs/components/color-picker` |
| `syntax colours` | `/docs/theming#semantic-roles` |
| `code theme` / `diff theme` / `markdown theme` | `/docs/theming` |
| `code metrics` / `markdown metrics` | `/docs/theming#scales-and-control-metrics` |
| `gutter` | **nothing** |
| `GpuixTheme` / `SyntaxTheme` / `GpuixMetrics` | **nothing** |
| `textFaint` / `codeTextSize` / `diffHunkBg` / `mdHeadingSizes` | **nothing** |
| `nativeTextTheme` | `/docs/components/text-input#theming` |

The cause is structural: this is a renderer API surface, not a component, so no
record, page, generated props table or search document owns it. The two places
that mention it — Text input's Theming paragraph and the Values API row — name
the helper without explaining the type it returns.

## 2. The surface that exists (installed declarations)

`@gpuix/native/dist/host.d.ts`, re-exported by `@gpuix/react`:

- **`GpuixTheme` — 18 fields**
  - `appearance?: "dark" | "light"` — the built-in palette the rest layers on.
  - palette: `bg`, `border`, `text`, `textMuted`, `textFaint`, `textDim`,
    `accent`, `caret`.
  - text surfaces: `codeText`, `codeWash`, `diffAdd`, `diffDel`, `diffHunkBg`.
  - fonts: `fontSans`, `fontMono`.
  - children: `syntax?: SyntaxTheme`, `metrics?: GpuixMetrics`.
  - every field is optional and "layers on top of the built-in dark theme (or
    light, via `appearance`)".
- **`SyntaxTheme` — 24 capture classes**: `comment`, `keyword`, `string`,
  `stringSpecial`, `escape`, `number`, `boolean`, `typeName`, `typeBuiltin`,
  `constructor`, `function`, `functionBuiltin`, `macroName`, `property`,
  `constant`, `variable`, `variableSpecial`, `parameter`, `operator`,
  `punctuation`, `tag`, `attribute`, `label`, `invalid`. Each is a CSS colour.
- **`GpuixMetrics` — 29 numbers** in three families:
  - code (5): `codeTextSize`, `codeLineHeight`, `codeGutterDigitWidth`,
    `codeGutterPaddingRight`, `codeGutterMinWidth`.
  - diff (10): `diffTextSize`, `diffLineHeight`, `diffFileHeaderHeight`,
    `diffHunkHeaderHeight`, `diffNoticeHeight`, `diffBodyBottomPad`,
    `diffGutterWidth`, `diffMarkerWidth`, `diffAccentBarWidth`,
    `diffRowPaddingX`.
  - markdown (14): `mdTextSize`, `mdLineHeight`, `mdBlockGap`,
    `mdHeadingSizes` (`[h1, h2, h3, h4to6]`), `mdHeadingLineHeights`,
    `mdTableCellPadding`, `mdTableMinColumnWidth`, `mdTableMinColumnContent`,
    `mdInlineCodeRadius`, `mdCodePaddingX`, `mdCodePaddingY`, `mdCodeRadius`,
    `mdCodeHeaderPaddingY`, `mdCodeHeaderTextSize`.
  - The declaration says the numbers live in the theme, not Rust constants, so
    tuning a row height is a framework render with no native rebuild.

**Which props accept it (declaration-checked):**

| Element | Prop interface | `theme` field |
| ------- | -------------- | ------------- |
| `<input>` | `InputProps` | yes |
| `<textarea>` | `TextareaProps extends InputProps` | inherited |
| `<code>` | `CodeProps` | yes |
| `<diff>` | `DiffProps` | yes |
| `<markdown>` | `MarkdownProps` | yes |

`<div>` and `<text>` are the runtime's two **built-in** element types; the React
reconciler forwards only its `UNIVERSAL_PROPS` set to them
(`@gpuix/native/dist/mutations.js`), and `theme` is not in that set. A `theme` on
a `div`/`text` is dropped, not inherited. Every other element forwards all
non-reserved props.

**Not provided:** no global theme setter on `GpuixRenderer` (no `setTheme`), no
CSS variables, no `registerFont` (Typography owns that absence), and no component
in this library wraps `<code>`, `<diff>` or `<markdown>` — those are roadmap
targets (plan 626).

**The library's mapping** — `packages/primitives/src/core/style.ts`:

`nativeTextTheme(theme)` maps **9** fields and leaves **9** at the runtime
defaults:

- mapped: `appearance`, `bg`, `text`, `textMuted`, `textFaint`, `accent`,
  `caret`, `fontSans`, `fontMono`.
- unmapped: `border`, `textDim`, `codeText`, `codeWash`, `diffAdd`, `diffDel`,
  `diffHunkBg`, `syntax`, `metrics` — the field chrome draws its border as a
  `StyleDesc` and the library ships no code/diff/markdown component, so there is
  nothing to paint with them yet.

It is applied by `Input`, `TextArea`, `NumberField` and `OTPField`
(`fieldHostProps` and the two value fields), and exported from
`@gpuixui/primitives` and `@gpuixui/primitives/core`. The Values API already
indexes it.

**Evidence level:** the declarations and the reconciler source are installed
facts; the playground scenario `text-native` proves `<code>` and `<markdown>`
paint their own text. No probe in this repository measures a theme's painted
colour, so the page must say that the syntax palette and metrics are declared and
forwarded, not screenshot-diffed.

## 3. The page: `/docs/native-text-theme` — "Native text theme"

Placement: after `selection`, before `components`. Title: **Native text theme**.
Frontmatter description must name the subjects: *The runtime's `GpuixTheme` — the
palette, syntax colours, code/diff/markdown metrics and font families behind
native code, diff, markdown, input and textarea elements — how the library maps
its tokens onto it and what it leaves unset.*

Sections:

1. **Intro** — two themes, not one: `@gpuixui/tokens` describes the React
   components; `GpuixTheme` describes the runtime's text engine. They meet in
   `nativeTextTheme`. Link native elements, styling and typography.
2. `## Which elements take a theme` — `<NativeTextElements />`, the five rows
   above, plus the built-in forwarding rule (div/text drop it) and the absence of
   a global setter.
3. `## The palette` — `<NativeTextThemeFields />`, 18 rows in five groups
   (appearance, palette, text surfaces, fonts, children), with each field's
   meaning.
4. `## Syntax colours` — `<SyntaxThemeFields />`, 24 capture classes; each is a
   CSS colour; unspecified classes keep the runtime default; `syntax` reaches
   `<code>` and fenced blocks inside `<markdown>`/`<diff>`.
5. `## Row metrics` — `<GpuixMetricsFields />`, 29 rows in the code/diff/markdown
   families, with the heading-array rule and the "no native rebuild" note.
6. `## Mapping the design system` — a compiling example calling
   `nativeTextTheme(theme)`, the 9 mapped fields named, and the 9 left unset with
   the reason. Link the Text input page, which already points here.
7. `## A code block` — a compiling `<code>` example with a small `GpuixTheme`
   override; note that `<code>` paints no surface, so `style` is the surface, and
   that `<code>` is a read-only element, not the roadmap's editor.
8. `## Diff and markdown` — one compiling example each or one combined; name
   `diffAdd`/`diffDel`/`diffHunkBg`, `codeWash`, `mdHeadingSizes`, and the events
   that stay on the element page. Link Native elements instead of repeating its
   prop table.
9. `## What is not provided` — `<NativeTextAbsences />`: no global setter; no
   CSS variables; no theme on `div`/`text`; no `registerFont`; no component
   wrapper for code/diff/markdown; no measured colour capture in this repository.
10. `## Verifying a theme` — the installed types and `text-native` scenario as
    the evidence, and what a consumer can assert.

## 4. Data module and guards

New `apps/docs/src/lib/native-text.ts` (browser-safe; takes declaration and
source text as arguments):

- `themeFields: ReadonlyArray<NativeTextField>` — 18 rows `{ name, group,
  summary }`, in declaration order.
- `syntaxFields` — 24 rows `{ name, summary }`.
- `metricFields` — 29 rows `{ name, group, summary }`.
- `themeElements: ReadonlyArray<NativeTextElement>` — 5 rows `{ tag,
  interfaceName, what, usedBy }`.
- `mappedFields` / `unmappedFields` — the 9 + 9 sets, with a summary for each
  unmapped field's reason.
- `nativeTextAbsences` — 5 rows `{ subject, statement, symbol? }`.
- Reuse `interfaceFieldsIn` from `./native-elements` and `rendererMethodNames`
  from `./window-surface`.
- `nativeTextThemeKeys(source)` — the object-literal keys of the returned
  `GpuixTheme` in `core/style.ts` (a brace-depth-aware scan from
  `nativeTextTheme` to its closing `});`).
- `nativeTextViolations({ declarations, mutations, helperSource, ... })`:
  - both directions for `GpuixTheme`, `SyntaxTheme` and `GpuixMetrics`;
  - every authored element declares `theme`, and a `theme`-declaring interface
    the table omits fails;
  - `nativeTextTheme`'s keys equal `mappedFields` in both directions and every
    mapped key is a declared field;
  - declared minus mapped equals `unmappedFields` in both directions;
  - every absence's `symbol` does not appear in the renderer declarations or the
    mutations source;
  - `theme` is not in `UNIVERSAL_PROPS`, and `div`/`text` are in
    `BUILT_IN_TYPES`.

New `apps/docs/src/lib/native-text-search.ts` — a generated entry at
`/docs/native-text-theme`:

- promoted names: `GpuixTheme`, `SyntaxTheme`, `GpuixMetrics`,
  `nativeTextTheme`, plus every **camelCase** field from the three tables
  (`isDistinctiveName`), so `codeTextSize`, `diffHunkBg`, `mdHeadingSizes` and
  `textFaint` are promoted.
- plain syntax capture words (`comment`, `keyword`, `string`, `label`,
  `invalid`, …) are indexed but **not** promoted, so they cannot steal a
  component page.
- `exactNamesOnly` is not set: `syntax theme` and `code metrics` are page alias
  phrases, not generated names.

New `apps/docs/src/components/native-text-tables.tsx`:
`NativeTextElements`, `NativeTextThemeFields`, `SyntaxThemeFields`,
`GpuixMetricsFields`, `NativeTextAbsences`, each using the existing
`overflow-x-auto` `role="region"` table pattern.

## 5. Files

Create:

- `apps/docs/content/docs/native-text-theme.mdx`
- `apps/docs/src/lib/native-text.ts`
- `apps/docs/src/lib/native-text.test.ts`
- `apps/docs/src/lib/native-text-search.ts`
- `apps/docs/src/lib/native-text-search.test.ts`
- `apps/docs/src/components/native-text-tables.tsx`
- `apps/docs/src/components/native-text-tables.test.tsx`
- `apps/docs/src/native-text-page.test.ts`

Change:

- `apps/docs/src/lib/search.ts` — import and register the entry in
  `generatedSearchEntries`.
- `apps/docs/src/lib/search-docs.ts` — one `IndexedSurface` row.
- `apps/docs/src/lib/search-docs.test.ts` — only if its count/list logic needs
  the new row (it derives from the lists; expect no edit).
- `apps/docs/src/components/mdx.tsx` — register the five table components.
- `apps/docs/content/docs/meta.json` — `"native-text-theme"` after `selection`.
- `apps/docs/src/lib/page-aliases.ts` — the new block in §6.
- `apps/docs/src/lib/page-aliases.test.ts` — the owned rows and regressions.
- `apps/docs/scripts/smoke-build.ts` — two production queries.
- `apps/docs/src/lib/search.test.ts` — an integration case for two names.
- `apps/docs/content/docs/native-elements.mdx` — one link from the code/diff/
  markdown section to the new page (not a rewrite).
- `apps/docs/content/docs/components/text-input.mdx` — point its Theming
  sentence at the new page.
- `.agents/slop/plans/README.md`, `TODO.md`, `PLAN.md` (D65 row).

## 6. Search ownership

Aliases (exact whole query only) on `/docs/native-text-theme`:

`syntax theme`, `syntax themes`, `syntax colors`, `syntax colours`, `syntax
color`, `syntax colour`, `code theme`, `code colors`, `code colours`, `code
metrics`, `diff theme`, `diff colors`, `diff colours`, `diff metrics`,
`markdown theme`, `markdown colors`, `markdown colours`, `markdown metrics`,
`gutter`, `gutters`, `caret color`, `caret colour`, `text theme`.

Must reach the page first after the change:

| Query | Rule |
| ----- | ---- |
| `native text theme`, `native text` | title |
| `GpuixTheme`, `SyntaxTheme`, `GpuixMetrics` | promoted generated names |
| `nativeTextTheme`, `textFaint`, `codeTextSize`, `diffHunkBg`, `mdHeadingSizes` | promoted generated names |
| `syntax theme`, `syntax colors`, `code theme`, `code metrics`, `diff theme`, `diff colors`, `markdown theme`, `markdown metrics`, `gutter`, `caret color` | page aliases |

Must keep their owner (regression table):

| Query | Owner |
| ----- | ----- |
| `theme`, `theme editor`, `dark mode` | Theming / Theme editor / Dark mode |
| `text`, `text area`, `input`, `textarea theme` | Text / Text area / Text inputs |
| `syntax highlighting`, `code editor`, `diff viewer`, `rich text` | Roadmap (component targets) |
| `word diff`, `line numbers`, `markdown table` | Native elements |
| `monospace`, `font family` | Typography |
| `caret` (plain) | unchanged (Number field limitation) |
| `selection`, `highlight` | Selection and find |

`code block` is expected to move from Typography to the new page; record it as a
deliberate move, because Typography's mention is incidental and `<code>` is the
element that owns the subject. If it does not move, record the measured limit
instead of adding a ranker rule.

## 7. Test plan

1. **Parser fixtures** (`native-text.test.ts`): a `GpuixTheme` body with a nested
   `syntax`/`metrics` pair, a missing interface, an extra field, a renamed field;
   a `nativeTextTheme` source with one key removed and one invented key; a
   `mutations.js` body with `theme` added to `UNIVERSAL_PROPS`.
2. **Installed agreement**: one `nativeTextViolations` call with the real
   declarations, `mutations.js` and `core/style.ts` expecting `[]`; then a
   permanent mutation per rule (field missing, field extra, wrong element, helper
   key mismatch, absence symbol present).
3. **Tables** (`native-text-tables.test.tsx`): 18 / 24 / 29 / 5 / 5 rows, the
   group headings, one summary per row, no empty cell.
4. **Page guard** (`native-text-page.test.ts`): the nine section headings, every
   table mount, the description names "GpuixTheme", "syntax" and "metrics",
   every link target resolves, and no denial of the shipped surface.
5. **Search** (`native-text-search.test.ts` + `search.test.ts`): every §6 owned
   row reaches the page first; every regression row keeps its owner; the
   generated entry is registered and renders in the Site search reference list.
6. **Build smoke** (`smoke-build.ts`): `GpuixTheme` and `syntax theme` against
   the production `/api/search`.
7. **Gates**: `check-types`, `smoke:build` (112 pages expected), `smoke:a11y`
   (112×2), `smoke:responsive` (112), then root `check`, `lint`, `test`.

Two-direction proofs to run and record:

| Change reverted | Expected failure |
| --------------- | ---------------- |
| one authored `GpuixTheme` field removed | `GpuixTheme: textFaint is declared but undocumented` |
| one helper key invented | `nativeTextTheme: codeText is mapped but not declared` |
| the whole page alias block removed | `syntax theme → /docs/theming`, `gutter → []` |
| `<SyntaxThemeFields />` removed from the page | page guard names the missing mount |
| `theme` added to `UNIVERSAL_PROPS` in a fixture | the built-in absence row fails by name |

## 8. Commands

1. `nub run --filter docs test src/lib/native-text.test.ts src/lib/native-text-search.test.ts src/components/native-text-tables.test.tsx src/native-text-page.test.ts`
2. `nub run --filter docs test src/lib/page-aliases.test.ts src/lib/search.test.ts src/lib/search-docs.test.ts`
3. `nub run --filter docs check-types`
4. `nub run --filter docs build && nub run --filter docs smoke:build`
5. `nub run --filter docs smoke:a11y && nub run --filter docs smoke:responsive`
6. `nub run check && nub run lint && nub run test`

Expected: every command exits `0`; `smoke:build` reports one more page
(111 → 112) and both new queries green.

## 9. STOP conditions

- The installed declarations differ from §2 (a dependency bump changes a field,
  count or element): stop, re-measure and update the plan before writing rows.
- `nativeTextTheme` no longer maps exactly the nine fields: stop and re-derive;
  do not document a mapping the source does not have.
- The built-in forwarding rule cannot be read from the installed source: drop
  the `div`/`text` absence row and say only that the prop is declared on five
  interfaces.
- Any syntax or metrics claim needs a painted capture to be honest: label it
  "declared and forwarded, not screenshot-diffed" and add a `TODO.md` row rather
  than claiming measured colour.
- A §6 alias steals a component word that cannot be kept: drop that alias and
  record the measured limit; do not change the ranker in this plan.

## 10. Acceptance criteria

- `/docs/native-text-theme` renders all 18 `GpuixTheme`, 24 `SyntaxTheme` and 29
  `GpuixMetrics` fields, the five elements, the 9 + 9 mapping and the five
  absences from the installed declarations and real source.
- `nativeTextTheme`'s mapped keys are guarded against the package source both
  ways.
- Every §1 missing query reaches the page; every regression row keeps its owner.
- A compiling `nativeTextTheme` example and a compiling `<code>` example ship.
- Build, a11y, responsive and root gates are run and recorded.
- The plan index, `TODO.md` and `PLAN.md` D65 are updated; the branch is pushed.

## 11. Measured results

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test src/lib/native-text.test.ts src/lib/native-text-search.test.ts src/components/native-text-tables.test.tsx src/native-text-page.test.ts` | 20 tests pass |
| `nub run --filter docs test src/lib/search.test.ts` | 99 tests pass |
| `nub run --filter docs test` | 148 files / 1 580 tests pass |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0 — 112 pages, 245 links, 1 443 anchors; `GpuixTheme` and `syntax theme` both green |
| `nub run --filter docs smoke:a11y` | exit 0 — 112 pages × 2 schemes, 0 violations |
| `nub run --filter docs smoke:responsive` | exit 0 — 112 pages at 390×844 |
| `nub apps/playground/dist/smoke/run.js --only text-native` | exit 0 — 1/1; `text=verified` (the scenario the page cites) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

Measured after the page landed (`search(query, 3)`), first result:

| Query | After |
| ----- | ----- |
| `native text theme`, `native text`, `text theme` | `/docs/native-text-theme` |
| `syntax theme`, `syntax colors`, `syntax colours`, `code theme`, `code metrics`, `diff theme`, `diff colors`, `markdown theme`, `markdown metrics`, `gutter`, `caret color` | `/docs/native-text-theme` |
| `GpuixTheme`, `SyntaxTheme`, `GpuixMetrics`, `nativeTextTheme`, `textFaint`, `codeTextSize`, `diffHunkBg`, `mdHeadingSizes` | `/docs/native-text-theme` |
| `theme` | Theming (kept) |
| `text` / `input` | Text / Text inputs (kept) |
| `syntax highlighting`, `code editor`, `diff viewer`, `rich text` | Roadmap (kept) |
| `word diff`, `line numbers`, `markdown table` | Native elements (kept) |
| `monospace` | Typography (kept) |
| `caret` (plain) | unchanged (kept) |
| `selection`, `highlight` | Selection and find (kept) |

Forced failures measured and reverted:

| Change | Failure |
| ------ | ------- |
| `<NativeTextThemeFields />` removed from the page | `mounts every generated table: expected [ '<NativeTextThemeFields />' ] to deeply equal []` and the same failure in the table suite |
| the `textFaint` row removed from `themeFields` | `agrees with the installed declarations…` fails, and the count test reports `expected [ { name: 'appearance', …(2) }, …(16) ] to have a length of 18 but got 17` |

Corrections measured during implementation:

1. `GpuixTheme` has **18** fields, not the 17 the initial plan sketch implied;
   `GpuixMetrics` has **29** and `SyntaxTheme` **24**.
2. The five absences are runtime absences. The painted-colour limit is an
   evidence statement, not a missing API, so it lives in
   `## Evidence and limits` rather than in `<NativeTextAbsences />`.
3. `native text theme` as a page alias shadows the page's own title, and
   `page-aliases.test.ts` rejects it. The title already answers the query; the
   alias was removed.
4. `code block` still reaches Typography first; the new page's `## A code block`
   heading ranks second. Recorded as a measured limit rather than widening the
   ranker.
5. `src/native-text-page.test.ts` reads a component page to prove the Text input
   cross-link, so `component-page-docs.test.tsx` found it and required the guard
   table on `/docs/component-pages` to name it.

