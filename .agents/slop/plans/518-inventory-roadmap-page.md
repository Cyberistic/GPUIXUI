# 518 — The public roadmap: every tracked target, generated from the inventory

**Phase:** F (docs information architecture and honest status)
**Owner:** `docs-site`
**Depends on:** 410, 411, 417, 429, 443, 469, 470, 487, 504, 505, 507
**Status:** implemented

## 1. The gap, measured

`MISSION.md` asks the site for "a complete component collection" whose
"implementation status when incomplete" is visible, and `COMPONENTS.md` is the
source of truth for the whole target inventory. The site currently shows only
the **delivered** half:

| Surface | What it shows today |
| ------- | ------------------- |
| `/docs/components` | the component registry: 66 delivered pages, every record `wip` or `done` |
| `/docs/data-display` | a paragraph about `@gpuixui/data-grid` and the measured table/tree/log probes |
| `/docs/workspace` | a paragraph about `@gpuixui/docking` and the measured panel/workspace probes |
| `/docs/capabilities` | the 15 measured GPUix **capabilities**, not the component targets |

Measured on 2026-10-19:

- `COMPONENTS.md` tracks **54** Tier 3–5 targets (15 + 22 + 17), and every one
  is `todo`; none is rendered anywhere on the site.
- `apps/docs/src/component-meta/entries.ts` contains **zero** `planned(...)`
  records, so the index copy "`planned` means no implementation exists yet"
  describes a state no row is in. A reader cannot discover the tables, panels,
  editors or query builders the library is aiming at.
- `data-display.mdx` and `workspace.mdx` name the target *tiers* but not the
  rows, and Tier 5 has no page at all.
- A generated React table is invisible to the MDX search index, which is the
  exact gap plans 504, 505 and 507 closed for tokens, scenario ids and icons.

Why this is worth doing now: the remaining Tier 3–5 work is the largest part of
the mission, it is blocked on packages, and no page lets a reader see the
target, its status, or the measured GPUix support behind it. Publishing the
inventory is the honest counterpart to publishing the 66 delivered pages, and
it makes every target searchable from ⌘K.

## 2. Exact changes

All paths below are inside `apps/docs` unless marked otherwise. `COMPONENTS.md`
is **read only**; this plan does not edit it.

### 2.1 `apps/docs/src/lib/roadmap.ts` (new)

A pure derivation module with a vitest-only filesystem boundary, following
`src/lib/icon-catalogue.ts` and `src/lib/capabilities.ts`.

```ts
export type RoadmapTier = 3 | 4 | 5;

export interface RoadmapTarget {
  readonly tier: RoadmapTier;
  /** The heading's label, e.g. `"data presentation"` (verbatim from COMPONENTS.md). */
  readonly tierTitle: string;
  readonly name: string;
  readonly status: string;
  readonly support: string;
  /** The inventory's note, verbatim. */
  readonly note: string;
}
```

Required exports:

- `parseInventory(markdown: string): ReadonlyArray<RoadmapTarget>`
  - Find the sections `## Tier 3 — …`, `## Tier 4 — …`, `## Tier 5 — …`
    (the separator is an em dash in the file).
  - Read the section until the next `## ` heading.
  - Keep every line matching
    `/^\| (.*?) \| (.*?) \| (.*?) \| (.*?) \|$/`; skip the header row
    (`Component`) and the separator row (`---`).
  - Cells in order: name, status, support, note. Preserve file order.
  - `tierTitle` is the heading text after the em dash, trimmed and lowercased
    (`"data presentation"`, `"desktop workspace"`, `"specialised"`).
- `roadmapProblems(targets)`, `deriveRoadmap({ root })` and
  `renderGeneratedModule(targets)` as below.
- `renderGeneratedModule` must emit the exact bytes oxfmt accepts, including the
  quote style (a note containing `"` and no apostrophe is single-quoted), or the
  freshness test and `nub run fmt` will disagree.

The inline Markdown is **not** parsed here. `apps/docs/src/lib/roadmap-note.ts`
is a second, browser-safe module:

- `RoadmapSpan` (`text` / `code` / `strong`) and
  `noteSpans(note: string): ReadonlyArray<RoadmapSpan>`;
- `plainNote(note: string): string` for search;
- code inside bold is still code (the inventory has
  `**… \`chat\`**`), and a bold marker inside a code span is left alone;
- no `node:` import, because `<RoadmapTable />` calls `noteSpans` in the browser.

This file may read `node:fs`; it never runs in the browser.

### 2.2 `apps/docs/scripts/roadmap.ts` (new)

Same shape and exit contract as `scripts/icons.ts`:

```sh
nub run --filter docs roadmap
```

- Derive from the repository root.
- If `roadmapProblems` is non-empty: print `roadmap: N problem(s), nothing
  written`, one indented line per problem, set exit code `1`, write nothing.
- Otherwise write `src/lib/roadmap.generated.ts` and print
  `roadmap: 54 targets from COMPONENTS.md`.
- Expected first run: exit `0`, exactly that line, and a changed/new generated
  file; a second run keeps the file byte-identical.

Add `"roadmap": "nub scripts/roadmap.ts"` to `apps/docs/package.json` scripts,
next to `"icons"`.

### 2.3 `apps/docs/src/lib/roadmap.generated.ts` (committed output)

```ts
// Generated by `nub run --filter docs roadmap` from COMPONENTS.md (plan 518).
// Do not edit: `src/lib/roadmap.test.ts` fails when this file is stale.
import type { RoadmapTarget } from "./roadmap.js";

export const roadmapTargets: readonly RoadmapTarget[] = [
  {
    tier: 3,
    tierTitle: "data presentation",
    name: "Tables",
    status: "todo",
    support: "?",
    note: "No `<table>` element; grid + `div` rows.",
  },
  // … one entry per COMPONENTS.md Tier 3–5 row, in file order
];
```

The exact notes depend on the file; the committed file is the script's output,
not a hand copy. No `node:` import may appear in this module.

### 2.4 `apps/docs/src/components/roadmap-table.tsx` (new)

`export function RoadmapTable()` renders the committed targets, grouped in the
order 3, 4, 5. For each tier:

- `<h2 id={"tier-" + tier}>` with `Tier 3 — Data presentation` (title-cased
  from `tierTitle`; one shared helper, not three literals).
- one sentence of context linking the tier's own page:
  - Tier 3 → `/docs/data-display`
  - Tier 4 → `/docs/workspace`
  - Tier 5 → `/docs/capabilities`
- a derived summary, never hand-counted:
  `54 tracked targets, 0 shipped` per tier or a sentence naming the count.
- a scrollable table region (the accessibility pattern `CapabilityMatrix` uses):
  `<div role="region" aria-label={"Tier " + tier + " targets"} tabIndex={0}
  className="not-prose my-4 overflow-x-auto">`.
- columns: **Component** (the name, `font-medium`), **Status**
  (`data-roadmap-status`), **GPUix support**, **Notes** (`noteSpans` from
  `src/lib/roadmap-note.ts` turns `code` into `<code>`, `strong` into
  `<strong>`, text plain).
- each `<tr>` carries `data-roadmap-target={target.name}` and
  `data-roadmap-status={target.status}` so the page test can compare rows with
  the inventory in both directions.

An empty tier renders a sentence (`No targets are tracked in this tier.`) rather
than a bare table; `roadmapProblems` makes that unreachable, but the component
must not crash on it.

### 2.5 `apps/docs/content/docs/roadmap.mdx` (new) + `meta.json`

Frontmatter:

```yaml
---
title: Roadmap
description: Every component target in the inventory, its status and the measured GPUix support behind it.
---
```

Body, in this order:

1. One paragraph naming `COMPONENTS.md` as the source of truth and stating that
   the table is generated from it, so a row cannot disagree with the inventory.
2. `<RoadmapTable />`.
3. A short "What a status means" list: `todo` is tracked and not built; `wip` is
   partial; `done` requires the full bar (code, test, example, page, native
   verification); `blocked`/`unsupported` link to
   [GPUix capabilities](/docs/capabilities) for the evidence.
4. "Where the delivered work lives" linking
   [Components](/docs/components), [Data display](/docs/data-display),
   [Workspace](/docs/workspace) and [Patterns](/docs/patterns).

Add `"roadmap"` to `apps/docs/content/docs/meta.json` immediately after
`"components"`.

### 2.6 `apps/docs/src/components/mdx.tsx`

Import `RoadmapTable` and add it to `getMDXComponents`' object. No other change.

### 2.7 Search: `apps/docs/src/lib/roadmap-search.ts` (new)

One generated document, same contract as `capability-search.ts`:

- `content`: every target as
  `"<name> (Tier <n>): <status>; GPUix support <support>. <plainNote>"`, joined
  by newlines, plus the tier titles.
- `keywords`: every name.
- `names` (promoted by exact match): target names that contain a space (for
  example `Resizable split panes`, `Multi-step forms`). A single plain word
  (`Tables`, `Toolbars`, `Charts`) is indexed but **not** promoted, so a page
  that owns the word keeps the first result (the lesson of plans 504/505).
- `index`: title `Roadmap`, description as the page, url `/docs/roadmap`,
  breadcrumbs `["Roadmap"]`.

Register it in `apps/docs/src/lib/search.ts`'s `generatedEntries`.

### 2.8 Tests

**`apps/docs/src/lib/roadmap.test.ts` (new)**

- Parses the real `COMPONENTS.md` through `deriveRoadmap` and asserts:
  - exactly the 54 expected names, in file order, tier by tier (derive the
    expected names from a second read of the file's table lines — do not hand
    list them);
  - every row's `status`/`support`/note text matches the file;
  - no Tier 1 or Tier 2 component name appears;
  - `roadmapProblems` is empty.
- `noteSpans` on the real `Virtualized tables` note yields code spans for
  `onVisibleRange` and a strong span for the warning, and `plainNote` contains no
  literal backticks or `**`.
- `renderGeneratedModule(deriveRoadmap(...))` equals the committed
  `roadmap.generated.ts` byte-for-byte, read as a string. This is the freshness
  guard, and it also proves the emitter is oxfmt-stable.
- The generated module's source contains no `node:` import.

**`apps/docs/src/roadmap-page.test.tsx` (new)**

- The page exists, carries the frontmatter title/description, renders
  `<RoadmapTable />`, and names no placeholder (`TODO`, `coming soon`).
- `meta.json` lists `roadmap` after `components`.
- `renderToStaticMarkup(<RoadmapTable />)`:
  - contains one `data-roadmap-target` per committed target and no extra;
  - the set of names equals `roadmapTargets.map(t => t.name)` (both directions);
  - contains an `<h2>` for each tier and the three tier-page links.
- The page links to `/docs/components`, `/docs/data-display`,
  `/docs/workspace`, `/docs/capabilities` and `/docs/patterns`.

**`apps/docs/src/lib/roadmap-search.test.ts` (new)**

- The entry's content includes every target name, status, support string and
  the plain note.
- Promoted names are exactly the targets whose name contains a space (both
  directions), and no single-word target is promoted.
- `await search("Resizable split panes", 5)` returns `/docs/roadmap` first.
- `await search("Toolbars", 5)` still returns a result; the roadmap is in the
  first five even though the name is not promoted (indexing, not promotion).

### 2.9 Cross-links and commands

- `apps/docs/content/docs/components/index.mdx`: after the status paragraph,
  add one sentence linking [Roadmap](/docs/roadmap) for the 54 tracked targets
  that do not have a page yet.
- `apps/docs/content/docs/data-display.mdx` and `workspace.mdx`: one sentence
  each linking the Roadmap for the full target list (keep the measured
  capability sections unchanged).
- `apps/docs/README.md`: add `nub run --filter docs roadmap` to the command
  block (between `icons` and `studio`) and one sentence in the authoring/status
  area naming the generated file and its guard.
- `apps/docs/content/docs/contributing.mdx`: add the `roadmap` command to the
  generation commands list, saying it regenerates the page from
  `COMPONENTS.md` and that the test fails while it is stale. It is not a smoke
  check, so the `docs-checks.test.ts` smoke list is unchanged.

### 2.10 Plan index and `TODO.md`

- Add the plan row to the docs-site table in
  `.agents/slop/plans/README.md` as `implemented` with the measured result.
- Add and tick one row under "Docs site workstream (plans 410–499, plus
  500–518)": the roadmap page, the generated module, the search document, the
  guards and the counts. Bump the progress bar if it is a fraction.

## 3. Commands and expected results

```sh
cd apps/docs
nub run roadmap                                    # roadmap: 54 targets from COMPONENTS.md
nub run roadmap                                    # byte-identical file, same line
nub run test -- src/lib/roadmap.test.ts src/roadmap-page.test.tsx src/lib/roadmap-search.test.ts
                                                   # the three new suites, all green
nub run test                                       # every docs suite green
nub run check-types                                # tsc clean (fumadocs-mdx first)
cd ../..
nub run check                                      # test-quality, lint, format, types
nub run lint                                       # oxlint clean
nub run test                                       # workspace suites green
nub run --filter docs smoke:build                  # one more page; 92 pages, exit 0
```

`smoke:build` derives the sitemap, so no sitemap edit is needed. Expected page
count after the change: **92** (91 + `roadmap`), and the built crawl's search
check may add one production query (optional; if added, name it in §7).

## 4. Two-direction proof (record the measured result in this plan)

Before calling the work done, run each and capture the failure text:

1. Delete one Tier 3 row from `COMPONENTS.md`, run `nub run roadmap` → it writes
   a smaller module; the coverage test fails naming the missing row. Restore.
2. Add a fake row to `roadmap.generated.ts` only → the freshness test fails
   (generated ≠ derived). Restore by re-running the command.
3. Remove `<RoadmapTable />` from `roadmap.mdx` → the page test fails.
4. Remove `roadmap` from `content/docs/meta.json` → the sidebar test fails.
5. Drop `roadmapSearchEntry` from `generatedEntries` in `search.ts` → the
   search test for `Resizable split panes` fails (or returns prose first).
6. Add `"Tables"` to the promoted names → the promotion test fails.
7. Remove one tier link from the page → the page test fails naming the href.
8. Corrupt a note's code span (replace `` `div` `` with `div`) → the span test
   fails on the real note.

Record each observed message under §7.

## 5. STOP conditions

- STOP if `COMPONENTS.md`'s Tier 3–5 tables cannot be parsed with the four-cell
  row regex (a note contains an unescaped `|`). Report the row; do not hand-edit
  the generated file or weaken the parser silently.
- STOP if the generated module would need `node:fs` at runtime, or if importing
  it pulls a package outside `@gpuixui/tokens` (the architecture guard).
- STOP if the page needs a browser or a build to test; this is a source and
  static-render guard, like `capability-matrix` and `component-page-docs`.
- STOP if `smoke:build` reports a heading-order, fragment, link, a11y or
  responsive failure caused by the new table. Fix the markup in this plan's
  files; do not add an allowlist.
- STOP if a row's status in `COMPONENTS.md` is `done`; then the roadmap is no
  longer the right home and the component needs a page first. Report it.

## 6. Acceptance

- `/docs/roadmap` renders every Tier 3, 4 and 5 row from `COMPONENTS.md` with
  its exact status, GPUix support and note, grouped by tier, with no hand-typed
  count.
- The page is reachable from the sidebar, from the component index, from Data
  display and from Workspace; every target name is findable from ⌘K.
- `src/lib/roadmap.generated.ts` is produced by the command, never hand-edited,
  and a stale file fails the suite.
- `COMPONENTS.md` is unchanged (the page mirrors it; it does not move it).
- `nub run check`, `nub run lint`, `nub run test`, docs type-check and
  `smoke:build` are green.
- `TODO.md` and the plan index are current; the two-direction proofs are in §7.

## 7. Implementation record

**Landed.** `apps/docs/src/lib/roadmap.ts` derives the inventory and
`apps/docs/src/lib/roadmap-note.ts` renders its inline Markdown in the browser;
the command `nub run --filter docs roadmap` writes
`apps/docs/src/lib/roadmap.generated.ts` (54 targets: 15 + 22 + 17);
`<RoadmapTable />` renders three tier sections with derived counts and links;
`/docs/roadmap` sits after Components in the sidebar and is linked from the
component index, Data display and Workspace; `roadmapSearchEntry` makes every
target findable from ⌘K and promotes only multiword names.

Measured two-direction proofs (each run over the docs suite, then the file
restored and the generator re-run):

| Direction | Command | Observed |
| --------- | ------- | -------- |
| a row deleted | `nub run roadmap` after deleting `Tables` from `COMPONENTS.md` | `roadmap: 53 targets from COMPONENTS.md`; `roadmap.test.ts` fails: `expected 'Sortable tables' to be 'Tables'` (the first row moved) |
| a fake generated row | hand-added `Fake target` to `roadmap.generated.ts` | three failures: stale bytes, `expected { extra: [ 'Fake target' ] }`, `expected [ 'Fake target' ] to deeply equal []` |
| the block removed | deleted `<RoadmapTable />` from `roadmap.mdx` | page test: `expected '---\ntitle: Roadmap…' to contain '<RoadmapTable />'` |
| the sidebar entry removed | deleted `"roadmap"` from `meta.json` | `content.test.ts` reports `expected [ 'roadmap' ] to deeply equal []`; the page test's sidebar regex fails |
| the search entry dropped | removed `roadmapSearchEntry` from `generatedEntries` | `Resizable split panes` returns `/docs/workspace` first, not `/docs/roadmap`; the single-word check fails |
| a plain word promoted | added `"Tables"` to `names` | promotion test: `expected [ 'Sortable tables', …(51) ] to deeply equal [ 'Sortable tables', …(50) ]` |
| a tier link removed | changed the Tier 3 `href` to `/docs/data` | page test: `expected [ '/docs/data-display' ] to deeply equal []` |
| a note span corrupted | removed the backticks around `onVisibleRange` in `COMPONENTS.md`, regenerated | span test: `expected [ 'virtualized-table', …(1) ] to include 'onVisibleRange'` |

Final counts: **70 files / 490 docs tests**, **92 built pages**; `nub run check`,
`nub run lint`, `nub run test`, `smoke:build` (92 pages, 115 links, 1 162
anchors), `smoke:a11y --only /docs/roadmap` (1 page × 2 schemes, 0 violations)
and `smoke:responsive` (92 pages, 390 px) all green. `COMPONENTS.md` untouched.
