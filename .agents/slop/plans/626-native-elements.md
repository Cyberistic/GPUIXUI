# 626 — Native elements: the runtime's twelve JSX tags, and what happens when a render throws

**Phase:** F (docs completeness — the substrate a custom component is written in)
**Workstream:** docs-site
**Depends on:** 410 (site), 411 (component pages), 479 (generated type tables are
dropped from search), 587 (shared host props), 606 (the styling page and the
declaration-parser pattern), 624 (refs), 625 (the installed-declarations guard
pattern), 603 (Troubleshooting)
**Status:** implemented

---

## 1. The measured gap

The library documents how to *style* a host element (`/docs/styling`), which
props every part inherits (`/docs/component-api#shared-host-props`), which
accessibility attributes exist (`/docs/accessibility`) and the window around the
tree (`/docs/window`). **No page says which JSX tags exist.**

The runtime declares exactly twelve (`@gpuix/native/dist/host.d.ts:137`,
`ElementType`): `div`, `text`, `img`, `svg`, `canvas`, `input`, `textarea`,
`anchored`, `code`, `diff`, `markdown`, `virtual-list`. Six of them have no
library component and no documentation at all: `canvas`, `code`, `diff`, `markdown`
have no component at all, `img` is used only inside `Avatar`, and `svg` only by
`Icons` and `Rating`. A reader writing their own component — or asking "can I
show an image?" — has nowhere to look.

Measured 2026-10-20 at `eb85c6b4` with the real search API (`search(query, 3)`,
first two results; the full sweep is §9):

| Query | First result before |
| ----- | ------------------- |
| `native elements` | `/docs/native-testing` (the smoke suite) |
| `intrinsic elements` | `/docs/components/scroll-area#sizes` |
| `jsx` | `/docs/installation#typescript` |
| `img` | `/docs/components/avatar#accessibility-and-limitations` |
| `image element` | `/docs/components/avatar#accessibility-and-limitations` |
| `set image` / `load image` | `/docs/patterns/settings-form`, `/docs/components/spinner` |
| `svg element` | `/docs/architecture#library-packages` |
| `canvas` | `/docs/components/toggle#composition` |
| `markdown` / `render markdown` | `/docs/roadmap`, `/docs/components/text-area#accessibility-and-limitations` |
| `code block` | `/docs/typography` |
| `syntax highlighting` | `/docs/roadmap` |
| `diff` / `diff viewer` | `/docs/roadmap` |
| `virtual list` | `/docs/roadmap`, `/docs/components/list` |
| `uncaught error` / `error boundary` | `/docs/components/inline-validation` |
| `onUncaughtError` | **nothing** |
| `queryselector` | **nothing** |

Two structural causes:

1. The elements are a **runtime** surface, not a component: no registry record,
   no preview tier and no generated props table owns them.
2. The render-error path lives in `@gpuix/react`'s reconciler. Troubleshooting
   already tells a reader that a missing provider "reaches the console or your
   error boundary" — a page that does not exist and a mechanism the site never
   names.

`MISSION.md` requires exactly this: "Do not assume DOM events, CSS, Radix or
HTML semantics exist in the native runtime", and "establish what is genuinely
supported". The roadmap already asserts facts about `<img>` ("loads raster and
SVG from path/data URL/http(s)"), `<code>`, `<diff>` and `<markdown>`; the site
never explains them.

## 2. The surface that exists (read from the installed declarations)

`node_modules/@gpuix/native/dist/host.d.ts` (resolved from `apps/docs`):

- `type ElementType = "div" | "text" | "img" | "svg" | "canvas" | "input" |
  "textarea" | "anchored" | "code" | "diff" | "markdown" | "virtual-list"`
  (line 137).
- `HostProps` (line 277) — `style`, 19 `on*` handlers, `highlight`, `autoFocus`,
  `tabIndex`, `role`, the seven `aria-*` names, `testId`, `motion`. Already
  documented on Component API; **not** repeated on the new page.
- Per-element props beyond `HostProps`:
  - `InputProps` — `value`, `placeholder`, `readOnly`, `theme`.
  - `TextareaProps extends InputProps` — adds `minRows`, `maxRows`.
  - `ImgProps` — `src`, `objectFit`, `alt`.
  - `SvgProps` — `src`, `source`.
  - `CodeProps` — `code`, `language`, `path`, `showLineNumbers`, `theme`.
  - `DiffProps` — `patch`, `wordDiff`, `collapsedPaths`, `scroll`, `maxLines`,
    `theme`, `onToggleFile`, `onShowMore`, `onLineClick`.
  - `MarkdownProps` — `source`, `theme`, `onLinkClick`.
  - `AnchoredProps` — `position`, `side`, `align`, `gap`, `anchor`, `offset`,
    `fit`, `snapMargin`, `deferred`, `priority`, `occlude`.
  - `VirtualListProps` — a union of `VirtualListShared` (`style` **without**
    `hover`/`active`, `alignment`, `followTail`, `overdraw`, `onVisibleRange`,
    the aria names and `testId`) with `{ estimatedItemHeight }` or
    `{ itemCount; estimatedItemHeight; windowStart? }`. It does **not** extend
    `HostProps`: no `onClick`, `onKeyDown` or `tabIndex`.
- `@gpuix/react/jsx-runtime.d.ts` maps the same twelve names in
  `JSX.IntrinsicElements` (`div`/`text`/`canvas` → `Props`, `input` →
  `InputProps`, `textarea` → `TextareaProps`, `img`/`svg`/`code`/`diff`/
  `markdown`/`anchored`/`virtual-list` → their interfaces). This is the file
  that proves a tag is **usable** in TSX, as opposed to merely declared.
- `@gpuix/react/dist/types/host.d.ts` — `ImgInstance extends Instance` with
  `setImage(bytes)` and `setImagePixels(width, height, pixels)`; the renderer
  also exposes `setImage` on `NativeRenderer`.

**Which component composes which element** (measured by scanning
`packages/*/src/**/*.tsx`, tests excluded):

| Element | Used by |
| ------- | ------- |
| `div` | every layout component and most parts |
| `text` | `Text`, `Label`, and 27 part files |
| `input` | `Input`, `OTPField`, `NumberField`, `Field`, `InlineEdit`, `TimePicker`, `TagInput`, `CommandMenu` |
| `textarea` | `Input` (`multiline`) |
| `svg` | `packages/icons/src/Icon.tsx`, `Rating` (stars) |
| `anchored` | `Popover`, `Dialog`, `Drawer`, `ContextMenu` |
| `virtual-list` | `MessageScroller` |
| `img`, `canvas`, `code`, `diff`, `markdown` | **nothing** — no component ships |

**What is not an element:** `button`, `a`, `ul`/`ol`/`li`, `table`/`tr`/`td`,
`h1`–`h6`, `p`, `span`, `form`, `label`, `select`, `dialog`. Each has a
component-level replacement, and several need a `role` to be read correctly
(`Accessibility` owns the aria surface). No DOM querying exists either: the
renderer mutates by element id, so `querySelector`/`document` do not apply.

## 3. The render-error path (read from `@gpuix/react`)

`dist/reconciler/renderer.js`:

- `render()` calls `installRuntimeErrorHandlers()` (line 14), which listens to
  `process` `uncaughtException` and `unhandledRejection` so the process survives
  a throw (the source comment: "A dead process stops AppKit pumps").
- `mountRoot()` passes `onUncaughtError: (error, info) =>
  scheduleRuntimeError(error, info.componentStack)` to `createRoot`.
- `showRuntimeError` replaces the tree with `runtimeErrorOverlay(formatted,
  reloadApp)`: heading "Uncaught runtime errors:", `testId
  "runtime-error-overlay"`, a scrollable stack (`testId
  "runtime-error-stack"`) and a reload control that re-renders the last tree.
- `createRoot(renderer, rootEventHandlers?)` accepts `onUncaughtError`; without
  one it falls back to `console.error`. **`RenderOptions` does not expose
  `onUncaughtError`**, so `render()` always installs the overlay.
- `installRuntimeErrorHandlers` is not exported from the package root — the
  page must not tell a reader to call it.
- A class error boundary with `static getDerivedStateFromError` works in the
  GPUix renderer: `packages/components/src/behaviour/parts.test.tsx` uses one to
  catch part-position throws in the real native suite. That file is the
  evidence and the pattern.

## 4. The page: `/docs/native-elements` — "Native elements"

Placement in `content/docs/meta.json`: after `styling`, before `components` —
the style surface and the element surface are the two halves of "what you paint
with".

Sections, in order:

1. **Intro** — the runtime paints twelve element types; every component in the
   library is built from them; this is not HTML. One sentence naming `<text>`
   as the inline text unit.
2. `## The twelve elements` — `<NativeElementsTable />` renders one row per
   element: tag, what it paints, its own props, and the library component(s)
   that compose it (or "no component — roadmap target", linking the target).
3. `## What has no component` — the five uncomposed elements, each with the
   roadmap target that would wrap it: Image preview (`img`), Syntax
   highlighting (`code`), Diff viewer (`diff`), Rich-text editing (`markdown`),
   and `canvas` (declared and typed, but **no probe in this repository has
   painted one** — recorded as unverified, never as working).
4. `## Images` — `<img src>` (filesystem path, data URL, http(s)), `objectFit`,
   `alt`; bytes through a ref: `instance.setImage(bytes)` /
   `instance.setImagePixels(w, h, pixels)`; the `alt` maps to the accessible
   name only with a `role`. Links Refs and element handles, Roadmap.
5. `## Vector graphics` — `<svg src>` (desktop local path) versus `<svg
   source>` (raw markup, portable to the browser live surface); `Icons` uses the
   former, the docs site draws icon markup with the latter.
6. `## Code, diffs and markdown` — the three read-only content surfaces, one
   short paragraph each: `<code>` paints no surface of its own (style it), rows
   never wrap and it scrolls itself; `<diff>` takes a unified patch and reports
   file toggles, hidden-line counts and clicked lines; `<markdown>` is
   GitHub-flavoured and reports link clicks instead of opening them.
7. `## Virtual lists` — the two prop shapes, `alignment`, `followTail`,
   `overdraw`, `onVisibleRange`; the measured fact that it retains every row
   but paints a window (`Data display`, `Performance`); it has no `onClick`.
8. `## Floating layers` — `<anchored>` positions a child against its parent
   with `side`/`align`/`gap`/`anchor`/`offset`/`fit`; the two measured defects
   (plan 156: `align="center"` lands off by half the panel; `fit="snap"` clamps
   without flipping) with a link to `Component API#layering`.
9. `## What is not an element` — `<AbsentElements />` renders the authored
   absence table: tag, what replaces it, and the page that owns the
   replacement. Includes "no `type` attribute on `<input>`" and "no DOM
   querying".
10. `## Writing your own element` — the three rules a custom component follows:
    allowed tags only, `style` not `className`, events from `HostProps`; link
    Extending and Styling. Ends with a five-line TSX snippet.

Frontmatter description (this is a search name, D46):

> "The runtime's twelve JSX elements — div, text, img, svg, canvas, input,
> textarea, anchored, code, diff, markdown and virtual-list — their props, which
> components compose them, and the HTML elements that do not exist (button, a,
> table, headings)."

## 5. The data module

New file `apps/docs/src/lib/native-elements.ts`:

```ts
export interface NativeElement {
  /** The `ElementType` value and the JSX tag — the same string. */
  readonly tag: string;
  /** What the tag paints, one sentence. */
  readonly paints: string;
  /** Props beyond `HostProps`, in declaration order. */
  readonly props: ReadonlyArray<string>;
  /** Component titles that render it; empty when none ships. */
  readonly composedBy: ReadonlyArray<string>;
  /** The roadmap target that would wrap it, when none does. */
  readonly roadmap?: string;
  /** A measured or declared caveat the table shows. */
  readonly note?: string;
}

export interface AbsentElement {
  readonly tag: string;
  readonly replacement: string;
  /** A docs path that explains the replacement. */
  readonly owner: string;
}

export const nativeElements: ReadonlyArray<NativeElement> = [...12 rows...];
export const absentElements: ReadonlyArray<AbsentElement> = [...];
```

Rows are authored; §6 derives every claim. The `roadmap` value must be the
**exact** target name in `roadmap.generated.ts` ("Image preview", "Syntax
highlighting", "Diff viewer", "Rich-text editing") and the test resolves it
against `roadmapTargets`.

Pure guards, in the same module (style of `window-surface.ts`):

- `elementTypeNames(declarations)` — parses the `ElementType` union from
  `@gpuix/native` declarations.
- `jsxIntrinsicNames(jsxRuntime)` — parses the keys under
  `interface IntrinsicElements`.
- `interfaceFieldsIn(declarations, name)` — reuse the parser style from
  `window-surface.ts` (a separate local copy is acceptable; do not import the
  window module).
- `nativeElementViolations({ declarations, jsxRuntime, elements, absent,
  composedTags, roadmapNames })` returns `string[]`; empty means agreement:
  1. `ElementType` and the authored tags agree both ways (missing/extra/
     duplicate).
  2. `JSX.IntrinsicElements` and the authored tags agree both ways.
  3. For each of `InputProps`, `TextareaProps`, `ImgProps`, `SvgProps`,
     `CodeProps`, `DiffProps`, `MarkdownProps`, `AnchoredProps`, the authored
     `props` equal the interface's own fields minus its parent's fields
     (`TextareaProps` minus `InputProps`), both ways.
  4. `VirtualListProps` is guarded **one way only** — every authored prop name
     occurs in the installed declaration, and the shared body's field names are
     a subset of the authored list. The union-of-intersections shape makes a
     field-by-field both-direction check a test of the parser, not of the
     runtime; record that in the module comment.
  5. `composedBy.length === 0` exactly when no file under `packages/*/src`
     (excluding `*.test.tsx` and `runtime/`) renders `<tag`.
  6. Every `absentElements.owner` is a page `source.getPages()` serves (the
     search test can do this bit, since the module must stay browser-safe — see
     below).
  7. Every `roadmap` name exists in `roadmapTargets`.

The module must be importable by the browser (the page renders it), so it takes
declaration **strings** as arguments and performs no `node:fs` itself. The test
reads the files.

New file `apps/docs/src/lib/native-elements-search.ts`:

```ts
export const nativeElementsSearchEntry: GeneratedSearchEntry = {
  names: promotedNativeElementNames(),
  index: { title: "Native elements", description, content, url:
    "/docs/native-elements", breadcrumbs: ["Native elements"], keywords },
};
```

Promote only distinctive spellings: `IntrinsicElements`, `ElementType`,
`virtual-list`, `objectFit`, `wordDiff`, `collapsedPaths`, `showLineNumbers`,
`estimatedItemHeight`, `followTail`, `snapMargin`, `onVisibleRange`,
`setImagePixels`, `ImgInstance`. Plain element words (`div`, `text`, `input`,
`img`, `svg`, `canvas`, `markdown`, `diff`, `code`) are indexed but **not**
promoted, so `input`→Text inputs, `text`→Text and `code`→Typography keep their
pages; the page's description and headings carry the plain-word queries instead.

Register it in `src/lib/search.ts` (`generatedSearchEntries`) and add its row to
`indexedSurfaces` in `src/lib/search-docs.ts` (the existing test compares the two
lists exactly).

## 6. The component

New file `apps/docs/src/components/native-elements-table.tsx` — the pattern of
`host-props-table.tsx`: a `role="region"` `overflow-x-auto` wrapper (the 390 px
responsive smoke requires it), `data-native-elements` on the table, one row per
element keyed by `tag`, and a link to the roadmap target when `roadmap` is set.
A second export `AbsentElements` renders `absentElements` with a link to
`owner`.

Register both in `src/components/mdx.tsx`; `mdx-components.test.ts` already
compares every tag used in the corpus with `getMDXComponents()`, so a missed
registration fails by name.

## 7. Troubleshooting: a component throws

Add a section `## A component throws` after `## Nothing appears in the window`,
and change the intro's "eight" to "nine". It must state, with the evidence from
§3:

- **A render throw is caught by two different mechanisms.** A class error
  boundary (`static getDerivedStateFromError`) keeps the rest of the tree and
  swaps in your fallback; the components suite uses exactly this to observe
  part-position throws in the real renderer. The include block points at
  `packages/components/src/behaviour/parts.test.tsx`.
- **Without a boundary, `render()` paints the runtime's own overlay** — heading,
  scrollable stack, reload — and also keeps the process alive for an async
  rejection. `testId="runtime-error-overlay"` is how the native suite can prove
  it.
- **`createRoot(renderer, { onUncaughtError })` replaces that handler** when you
  own the root; `render()` cannot take one.
- **Limits:** no hook-based boundary; a boundary does not catch async
  rejections (the process handlers do); the overlay is the runtime's, is not
  themed, and is not a UI surface the library styles.

Add page aliases in `src/lib/page-aliases.ts`: `error boundary`, `uncaught
error`, `component throws`, `runtime error` → `/docs/troubleshooting`. Add one
generated document (`src/lib/troubleshooting-error-search.ts`) promoting
`onUncaughtError`, `getDerivedStateFromError` and `runtime-error-overlay`, so
`onUncaughtError` stops returning nothing. Do **not** promote the bare word
`error`: Inline validation owns error messages, and the regression table in §8
keeps it there.

## 8. Search: measured results, and the regressions that must not move

Measured 2026-10-20 after the page and both documents landed (`search(query, 1)`,
first result). Every plain-word row below is the measured *after* value; the
three that moved deliberately are marked.

| Query | First result after |
| ----- | ------------------ |
| `img`, `image element`, `set image`, `load image` | `/docs/native-elements` |
| `svg element`, `canvas`, `canvas element` | `/docs/native-elements` |
| `markdown element`, `render markdown` | `/docs/native-elements` |
| `diff element`, `unified diff` | `/docs/native-elements` (the phrase form lands on `#what-has-no-component`) |
| `code`, `code element`, `highlighted code` | `/docs/native-elements` — **moved from Typography**, see below |
| `intrinsic elements`, `jsx elements`, `native elements` | `/docs/native-elements` |
| `virtual-list` | `/docs/native-elements` — **moved from Capabilities** |
| `virtual-list-window` | `/docs/capabilities` |
| `error boundary`, `uncaught error`, `component throws`, `runtime error` | `/docs/troubleshooting` |
| `onUncaughtError` | `/docs/troubleshooting` |

Regressions that kept their owner:

| Query | First result after |
| ----- | ------------------ |
| `input` | `/docs/components/text-input` |
| `text` | `/docs/components/text` |
| `svg` | `/docs/components/icon` |
| `mono`, `font size` | `/docs/typography` |
| `diff viewer`, `syntax highlighting`, `image preview`, `rich text` | `/docs/roadmap` |
| `error` | `/docs/components/inline-validation` |
| `read only` | `/docs/native-elements` — **moved from Troubleshooting** |

Three ownership decisions, each forced by a measured tie and each recorded
rather than worked around with a ranker rule:

1. **`code` moves to Native elements.** The page's summary names `code`, so the
   summary rank beats Typography's text chunks. The element is the subject a
   reader types; Typography keeps `mono` and `font size`, which are pinned.
2. **`virtual-list` moves to Native elements, `virtual-list-window` stays on
   Capabilities.** The element owns the element; the scenario id owns the
   measured matrix. `capability-search.test.ts` now queries the scenario id —
   its rule (a hyphenated scenario id reaches the matrix) is unchanged.
3. **`read only` moves to Native elements.** Plan 608 recorded it as a measured
   limit on Troubleshooting; the page now owns three read-only surfaces, so the
   row in `page-aliases.test.ts` moved with a comment. `markdown` itself stays
   on the roadmap: `roadmap-aliases.ts` deliberately promotes it for the
   *Rich-text editing* target (plan 585), and the page's phrase form
   `markdown element` is the element's name.

## 9. Exact files

Create:

- `apps/docs/src/lib/native-elements.ts`
- `apps/docs/src/lib/native-elements.test.ts`
- `apps/docs/src/lib/native-elements-search.ts`
- `apps/docs/src/lib/troubleshooting-error-search.ts`
- `apps/docs/src/components/native-elements-table.tsx`
- `apps/docs/src/components/native-elements-table.test.tsx`
- `apps/docs/content/docs/native-elements.mdx`

Change:

- `apps/docs/src/lib/search.ts` — import and register two entries.
- `apps/docs/src/lib/search-docs.ts` — two `indexedSurfaces` rows.
- `apps/docs/src/components/mdx.tsx` — two component registrations.
- `apps/docs/content/docs/meta.json` — `"native-elements"` after `"styling"`.
- `apps/docs/content/docs/troubleshooting.mdx` — new section, intro count,
  frontmatter description.
- `apps/docs/src/lib/page-aliases.ts` — four error phrases.
- `apps/docs/src/lib/page-aliases.test.ts` — the phrase rows.
- `apps/docs/src/lib/search.test.ts` — the measured query table from §8.
- `apps/docs/scripts/smoke-build.ts` — two production queries
  (`intrinsic elements` → `/docs/native-elements` first, `img` →
  `/docs/native-elements` first).
- `.agents/slop/plans/README.md` — index this plan.
- `TODO.md` — the task row.

Do **not** touch `packages/*` or `apps/playground`; the page documents them.

## 10. Test plan — and the measured forced failures

Every test fails without its subject. The four proofs below were run by
reverting the named change and reading the failure, then restoring it.

1. **Parser fixtures** (`native-elements.test.ts`): `ElementType`,
   `IntrinsicElements` (including a quoted hyphenated key), an interface's own
   fields minus its parent's, a nested `position` object whose `x`/`y` are not
   props, and the virtual list's shared + union shape.
2. **Installed runtime agreement** — one call to `nativeElementViolations` with
   the real declarations, JSX runtime, package source and roadmap; expects `[]`.
   The permanent mutation cases fail by name: an extra tag
   (`button is documented but ElementType does not declare it`), a missing tag
   (`diff is an element but undocumented`), a renamed prop
   (`img: description is documented but ImgProps does not declare it` and
   `img: alt is declared by ImgProps but undocumented`), a false no-component
   row (`markdown: the table names Card, but no package source renders it`), a
   composed row with no source (`textarea: the table says no component renders
   it, but the package source does`), an absence that is now an element
   (`div: the page says it is absent, but ElementType now declares it`) and an
   unknown roadmap target.
3. **Tag composition** — the package source scan proves the column both ways;
   see the two composition messages above.
4. **Table render** (`native-elements-table.test.tsx`): one `data-element` row
   per element with its props, one `data-absent` row per absence, the roadmap
   link count, and the page's two mounts.
5. **Page guard** — the nine section headings, both components, the description
   naming all twelve tags, every absence owner resolving through
   `source.getPages()`, and every no-component row's roadmap target named in the
   prose.
6. **Search** — the measured table above and the regression table, plus
   `onUncaughtError` reaching the Troubleshooting page.
7. **Build smoke** — `intrinsic elements` and `img` against the production
   `/api/search`.
8. **Accessibility and responsive** — `smoke:a11y` (both schemes) and
   `smoke:responsive`.

Measured forced failures:

| Change reverted | Failure |
| --------------- | ------- |
| the five element phrase aliases in `page-aliases.ts` (key renamed so the aliases hit no page) | `expected [ …(5) ] to deeply equal []` with `image element → …`, `svg element → …`, `markdown element → …`, `diff element → …`, `code element → …` |
| `<AbsentElements />` removed from the page | `expected '---\ntitle: Native elements…' to contain '<AbsentElements />'` in both the page guard and the table suite |
| `onUncaughtError` dropped from the generated names | `expected '/docs/troubleshooting#a-component-thr…' to be '/docs/troubleshooting'` |
| a fake tag appended to the authored rows | the permanent mutation case (`button is documented but ElementType does not declare it`) |

## 11. Commands

Run from the repository root unless stated.

1. `cd apps/docs && nub exec vitest run src/lib/native-elements.test.ts src/components/native-elements-table.test.tsx`
   — expected: every test passes, with the real declarations. A failure names
   the tag, prop or section.
2. `cd apps/docs && nub exec vitest run src/lib/search.test.ts`
   — expected: the measured table passes. This file builds the Fumadocs index
   (budget 120 s).
3. `nub run --filter docs check-types`
   — expected: exit 0 (`fumadocs-mdx`, app and preview tsconfigs).
4. `nub run --filter docs build`
   — expected: exit 0; the sitemap gains `/docs/native-elements`.
5. `nub run --filter docs smoke:build`
   — expected: exit 0, one more page than before (108 → 109), both new queries
   green. Exit 1 names the missing page/anchor/query; exit 2 means no build.
6. `nub run --filter docs smoke:a11y`
   — expected: exit 0 across every page in light and dark.
7. `nub run --filter docs smoke:responsive`
   — expected: exit 0 at 390 px on every page.
8. `nub run check && nub run lint && nub run test`
   — expected: exit 0 each. `test` runs the whole workspace suite; the docs
   suite grows by the new files.

Record the exact counts each command prints in §8/§12. Do not claim a command
passed unless its output was read.

## 12. STOP conditions

- The installed `ElementType` is not the twelve names in §2 (a dependency bump
  or a stale install). **Stop** and re-measure; do not add or remove a row to
  make the guard pass.
- `@gpuix/react/jsx-runtime.d.ts` cannot be located from `createRequire` in the
  test environment. **Stop** and record the resolution problem; do not hand-copy
  the tag list into the guard.
- Any §8 row cannot reach its owner without stealing a listed regression.
  Record it as a measured limit, keep the phrase form, and do not edit
  `search.ts`'s ranking rules.
- The overlay/error claim cannot be reproduced from the installed package
  source. **Stop** and record what the source really does; never document the
  remembered behaviour.
- A native-runtime claim is needed that only the playground can prove (for
  example "a `<canvas>` paints"). Do not write it. Label it unverified and add a
  `TODO.md` row for the playground owner.

## 13. Acceptance criteria

- `/docs/native-elements` exists, is in the sidebar after Styling, renders all
  twelve elements with their real props, the four uncomposed elements linked to
  their roadmap targets, and the absence table with a real replacement page for
  each row.
- `native-elements.test.ts` agrees with the installed `ElementType`,
  `JSX.IntrinsicElements`, eight props interfaces and the package source in both
  directions; each guard has a recorded forced failure.
- `onUncaughtError`, `error boundary` and `uncaught error` reach Troubleshooting;
  the troubleshooting page states both the boundary and the overlay, with the
  real `parts.test.tsx` pattern included.
- Every §8 query returns its owner first in the unit suite and the two
  production queries pass in `smoke:build`; no regression row moved.
- `check-types`, `build`, `smoke:build`, `smoke:a11y`, `smoke:responsive`,
  `check`, `lint` and `test` were run and their results recorded.
- `TODO.md` and the plan index are updated and the branch is committed and
  pushed.

## 14. Corrections measured during implementation

1. **`<img>` is not uncomposed.** `Avatar` renders one when `src` is set
   (`packages/components/src/avatar.tsx:116`, a multi-line `<img` the plan's
   first grep pattern missed). The table now says `Avatar`, the note says there
   is no *general* image component, and the page's "no general wrapper" list
   keeps the roadmap link. `composedBy` is guarded against the source, so this
   cannot regress.
2. **`<textarea>` belongs to `TextArea`, not `Input`.** `Input` only shares its
   props type; `TextArea.tsx:47` is the render.
3. **`<anchored>` has a fifth source**: `menu/sub.tsx` composes it for the
   dropdown and context submenus.
4. **Four event props are shared host props.** `HostProps` itself declares
   `onToggleFile`, `onShowMore`, `onLineClick` and `onLinkClick`, so
   `<diff>`/`<markdown>` do not add them and the per-element column must not
   repeat them. They remain documented on Component API's shared table.
5. **The props parser needed brace depth.** `AnchoredProps.position` and
   `.offset` are inline objects whose `x`/`y` matched a naive field regex; the
   parser now counts braces and a fixture pins it.
6. **A doc comment cannot spell `packages/*/src`.** The `*/` closes the block
   comment and leaves an unterminated template literal — oxc reported a parse
   error forty lines later. Both comments were rewritten.
7. **`markdown` cannot move.** `roadmap-aliases.ts` promotes it for the
   *Rich-text editing* target (plan 585); the element page owns the phrase
   `markdown element` instead, recorded in §8.

Measured command results:

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/lib/native-elements.test.ts src/components/native-elements-table.test.tsx` | 23 tests pass |
| `nub run --filter docs test` | 141 files / 1 512 tests pass |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0 — 109 pages, 239 links, 1 411 anchors, search ok |
| `nub run --filter docs smoke:a11y` | exit 0 — 109 pages × 2 schemes, 0 violations |
| `nub run --filter docs smoke:responsive` | exit 0 — 109 pages at 390×844 |

