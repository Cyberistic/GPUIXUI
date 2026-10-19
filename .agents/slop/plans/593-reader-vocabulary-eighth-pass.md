# 593 — Reader vocabulary, eighth pass: inflected summaries, icon words and roadmap drop

**Phase:** F (search completeness)
**Workstream:** docs-site
**Depends on:** 410, 411, 419, 431, 566, 568, 574, 579, 583, 585, 588, 590, 591, 592
**Status:** implemented

## 1. The measured defect

Measured on 2026-10-19 against the real docs search index
(`apps/docs/src/lib/search.ts`, the same index `/api/search` serves) with a
throwaway vitest sweep over the query list below, `search(query, 3)`, before any
change in this plan:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `svg` | Architecture → `#library-packages` (text) | Icons (`/docs/components/icon`) |
| `glyph` | Confirmation dialogs → `#accessibility-and-limitations` (text) | Icons |
| `overflow` | Scrollable containers → `#variants` (text) | Scrollable containers (`/docs/components/scroll-area`) |
| `mit` | License → `#recorded-today` (text) | License (`/docs/license`) |
| `planned` | Architecture → `#library-packages` (text) | Roadmap (`/docs/roadmap`) |
| `tier` | Settings form (page) | Roadmap |
| `resize` | Separators → `#accessibility-and-limitations` (text) | Workspace (`/docs/workspace`) |
| `drop` | Dropdown menus (page) | Roadmap (`Drag and drop` target) |

Two mechanisms are missing:

1. **A component summary never ranks.** `Icons`' summary already says "glyph"
   and `Scrollable containers`' says "scrolls overflow content", but plans 568
   and 569 deliberately score only hand-authored pages by their description;
   a component's identity is its title, exported names, parts and aliases
   (plan 566). The two missing words therefore belong in the alias table.
2. **A summary word is compared literally.** `descriptionMatchRank` uses
   `words.some((word) => word.startsWith(needle))`, so `resize` does not match
   `resizable` (the sixth letter differs). Page **titles** already compare
   English stems (plan 585), but that stem only handles plurals, gerunds and a
   trailing `e`; it does not handle `-able`/`-ed`, so the first implementation
   of this plan still failed the row (measured before the correction below).

> **Deliberately not changed: `selected`.** The same stem rule would match
> Data display's `selectable rows`, but `Selects`' title stem (`select`) is a
> stronger rank and wins. That result is honest — Select is the component a
> reader may mean — and forcing Data display through a new rule or alias would
> steal the dropdown's name. The plan leaves `selected` where the ranker puts
> it and does not test for it.

`mit` and `planned`/`tier` are authored-summary omissions: the body contains
the word, so the page index returns a text chunk; `drop` is a roadmap target
whose one-word alias is missing (plan 585's table).

## 2. What to build

### 2.1 Inflected summary words (one shared stem rule)

`apps/docs/src/lib/search.ts` — extend the existing `stem` helper (plan 585) to
strip the derivational suffixes a summary uses (`-able`, `-ible`, `-ed`), then
use it for the whole-word tier in `descriptionMatchRank`. Keep the
exact-description tier, the prefix tier and the phrase tier unchanged.

Current `stem`:

```ts
  const gerund = plural.replace(/ing$/, "").replace(/([a-z])\1$/, "$1");
  const base = gerund.length < 3 ? plural : gerund;
  return base.length > 3 ? base.replace(/e$/, "") : base;
```

New:

```ts
  const gerund = plural.replace(/ing$/, "").replace(/([a-z])\1$/, "$1");
  const derived = gerund.replace(/(?:able|ible|ed)$/, "");
  const base = derived.length >= 3 ? derived : gerund;
  return base.length > 3 ? base.replace(/e$/, "") : base;
```

The `derived.length >= 3` guard keeps a short strip (`used` → `us`) from
creating a two-letter stem; it falls back to the gerund form. Measured pair:
`resize`/`resizable` → `resiz`; `theming`/`themes` → `them` (plan 585 still
passes).

`descriptionMatchRank` then compares:

```ts
  if (words.includes(needle)) return 1;
  const needleStem = stem(needle);
  if (words.some((word) => stem(word) === needleStem)) return 1;
  if (words.some((word) => word.startsWith(needle))) return 2;
```

Why this is safe: the stem tier returns the **same rank** as an exact word, so
an inflected summary word behaves exactly like the word itself. Only a whole
word is stemmed; a fragment inside a word still matches nothing (the rule plan
568 introduced), and a title still outranks a summary.

Measured effect expected after the edit: `resize` → Workspace
(`resizable splits`). The page already owns the subject and already carries the
word; no content edit is needed for it.

### 2.2 Two component aliases

`apps/docs/src/lib/component-aliases.ts` — extend the existing entries:

| Slug | Add | Why |
| ---- | --- | --- |
| `icon` | `svg`, `glyph`, `glyphs` | The Icons page defines each icon as SVG markup; `glyph` is already its summary word but a component summary does not rank. |
| `scroll-area` | `overflow` | The page's own summary says "scrolls overflow content"; readers type the CSS concept. |

Keep every term lower-case and unique. The existing
`component-aliases.test.ts` proves each key is a real record, each term is
indexed in that record's document, and no term shadows another component's
title or exported name.

### 2.3 Two authored summaries

Edit only the frontmatter `description`; keep it a sentence, not a keyword
list.

| File | Current description | New description |
| ---- | ------------------- | --------------- |
| `apps/docs/content/docs/license.mdx` | `Licences and provenance for the library and its references.` | `Licences, including the recorded MIT reference, and provenance for the library and its references.` |
| `apps/docs/content/docs/roadmap.mdx` | `Every component target in the inventory, its status and the measured GPUix support behind it.` | `Every Tier 3–5 component target in the inventory — planned, delivered or blocked — with its status and the measured GPUix support behind it.` |

Why each new word is honest:

- **License** already records `LICENSES/base-gpui.md` as MIT, read at commit
  `64b2233`. Naming MIT in the summary does not claim the owed inventory,
  provenance or NOTICE files exist; the page keeps its "what is still owed"
  section. `apache` is deliberately **not** claimed here: GPUix's Apache-2.0
  record is still owed in `LICENSES/` (tracked in `TODO.md`, owner licensing).
- **Roadmap** is generated from the Tier 3, 4 and 5 sections of
  `COMPONENTS.md`; every row has a status, so `Tier 3–5`, `planned` and
  `blocked` describe what the page renders.

### 2.4 One roadmap alias

`apps/docs/src/lib/roadmap-aliases.ts` — add `drop` to the existing `Drag and
drop` row:

```ts
  ["Drag and drop", ["drag", "drop"]],
```

The alias guard (`roadmap-search.test.ts`) already proves the term is a word the
target contains and that it shadows no component, page title or other alias.

### 2.5 Tests

- `apps/docs/src/lib/search.test.ts` — one table, `eighth-pass reader
  vocabulary`, with the eight queries in §1. Each row's first result must be a
  `type: "page"` whose destination (fragment removed) equals the owning page.
  The header comment names the measured defects and says every row fails when
  the matching summary word, alias or ranker tier is removed.
- `apps/docs/src/lib/search.test.ts` — one regression table for the previous
  passes' destinations: `sort`, `filter`, `npm`, `worktree`, `table`, `panel`,
  `input`, `label`, `spacing`, `screen reader`. This is the guard against the
  stem tier stealing a subject (`state`/`states` is the risk worth watching).
- `apps/docs/scripts/smoke-build.ts` — three production queries, each
  `first: true`: `svg` → `/docs/components/icon`, `planned` → `/docs/roadmap`,
  `resize` → `/docs/workspace`.
- The alias tables are already guarded by `component-aliases.test.ts` and
  `roadmap-search.test.ts`; no new fixture is needed.

## 3. Exact commands

Run from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/docs-site`):

```sh
cd apps/docs
nub exec vitest run src/lib/search.test.ts src/lib/component-aliases.test.ts src/lib/roadmap-search.test.ts
cd ../..
nub run --filter docs test
nub run --filter docs check-types
nub run --filter docs smoke:build
```

| Command | Expected |
| ------- | -------- |
| focused vitest | all three files pass; `search.test.ts` includes the two new tables |
| `nub run --filter docs test` | 105 files / **764 tests** pass (762 before; 2 new) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages, 1 283 anchors, search checked, exit `0`; the three new queries pass |

Then the completion gate:

```sh
nub run check
nub run lint
nub run test
```

Expected: each exits `0`; the root `test` run reports every workspace green.

## 4. STOP conditions

- A §1 query's first result is not the owning page **after** the §2 edits:
  stop, record the actual result here, and do not add a second keyword table or
  change `DESCRIPTION_MATCH_RANK`.
- `sort`, `filter`, `npm`, `worktree`, `table`, `panel`, `input`, `label`,
  `spacing` or `screen reader` moves: stop and report the stolen term. In
  particular, `state`/`states` must not be "fixed" by lowering a title rank.
- The alias guards reject a new term (shadowing a title, symbol, page title or
  another alias): stop and report the conflicting name; do not rename a
  component or a page to make a search word fit.
- A description edit changes the page, link or anchor count: stop; a summary
  edit must not add or remove a page, link or heading.
- The smoke build cannot run (build or preview failure): report exit `2`; never
  report it as a pass.

## 5. Acceptance

- The eight queries in §1 return their owning page first, as `type: "page"`.
- The ten regression queries keep their previous destinations.
- The new component aliases and the roadmap `drop` alias pass their existing
  guards.
- All docs tests, the type check, the built-site crawl, the root gates and the
  two-direction proofs in §6 pass.
- `TODO.md` gains and ticks the task; the plan index lists this plan as
  implemented.

## 6. Measured results

Run on 2026-10-19 in this worktree:

| Command | Result |
| ------- | ------ |
| focused vitest (3 files) | 96 tests pass |
| `nub run --filter docs test` | 105 files / **764 tests** pass (762 before; 2 new) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages, 121 links, 1 283 anchors, search checked, exit `0`; `svg`, `planned` and `resize` pass |
| `nub run check` (root) | exit `0` |
| `nub run lint` (root) | exit `0` |
| `nub run test` (root) | every workspace green; `apps/docs` 764, `packages/components` 308, `packages/primitives` 282 |

All eight §1 queries now return their owning page first, and the ten regression
queries keep their destinations.

### Two-direction proofs

Each was measured by applying the defect and running
`nub exec vitest run src/lib/search.test.ts -t "eighth set"` in `apps/docs`, then
reverting it:

1. Removing the description stem tier failed one row:
   `resize -> text:/docs/components/separator`.
2. Reverting the two summaries, removing the two component aliases and the
   roadmap `drop` alias failed seven rows:
   `svg -> text:/docs/architecture`,
   `glyph -> text:/docs/components/confirm-dialog`,
   `overflow -> text:/docs/components/scroll-area`,
   `mit -> text:/docs/license`,
   `planned -> text:/docs/architecture`,
   `tier -> page:/docs/patterns/settings-form`,
   `drop -> page:/docs/components/dropdown-menu`.

The `selected` row was measured and deliberately removed from the table; §1
records why (`Selects`' title stem wins, which is an honest destination).

One existing guard moved with the Roadmap summary: `roadmap-page.test.tsx` pins
the frontmatter sentence, so it now expects the new description. Its intent is
unchanged — the page must keep its frontmatter and its generated table.
