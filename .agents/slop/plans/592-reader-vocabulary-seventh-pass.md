# 592 — Reader vocabulary, seventh pass: sorting, filtering, columns, package managers and worktrees

**Phase:** F (search completeness)
**Workstream:** docs-site
**Depends on:** 410, 411, 413, 419, 431, 566, 568, 574, 579, 583, 585, 588, 590, 591
**Status:** implemented

## 1. The measured defect

Measured on 2026-10-19 against the real docs search index
(`apps/docs/src/lib/search.ts`, the same index `/api/search` serves) with a
throwaway vitest sweep over the query list below, `search(query, 3)`, before any
change in this plan:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `sort` | Data display → a prose chunk | Data display (`/docs/data-display`) |
| `sorting` | **nothing** | Data display |
| `sortable` | Data display → a prose chunk | Data display |
| `filtering` | Data display → a prose chunk | Data display |
| `filter` | Project browser (a working composition) | Data display (the subject owner) |
| `column` | Stack → `#variants` | Data display |
| `columns` | Navigation menu → a prose chunk | Data display |
| `npm` | **nothing** | Installation (`/docs/installation`) |
| `pnpm` | **nothing** | Installation |
| `yarn` | **nothing** | Installation |
| `registry` | Architecture → `#tooling` | Installation |
| `publish` | Extending → `#the-two-layers` | Installation |
| `package manager` | Examples → a prose chunk | Installation |
| `worktree` | Extending → `#related` | Contributing (`/docs/contributing`) |

Every owning page already exists and its body already contains the word:

- `data-display.mdx` says "tables, sortable and selectable rows, column
  configuration, resizable columns, filtering controls" but its frontmatter
  summary names none of those words.
- `installation.mdx` has a `## Packages are not published yet` section and an
  install section written with `nub`, but its summary never says npm, pnpm, yarn,
  registry, publish or package manager.
- `contributing.mdx` has a `## Worktrees` section, but its summary does not name
  it.

`filter` is the one deliberate destination change: the Project browser is a
working composition that filters, but Data display is the page that owns
"filtering controls" as a subject (the same rule plan 585 applied to `tree`,
`log` and `chart`). Once Data display's summary names filtering, its shorter
title wins the tie at equal rank; the regression table records that new
destination rather than adding a rule to keep the pattern page first.

This is the mechanism plan 568 made a ranking signal and plans 574, 579, 583,
588, 590 and 591 extended: a hand-authored page's authored summary is a search
name one tier below its title. The page index tokenises bodies, so a body word
that the summary omits is returned as a text chunk (`type: "text"`) or is lost
behind another page's prose.

No ranker rule, no alias row and no generated index needs to change.

## 2. What to build

### 2.1 Authored summaries (the plan 568 mechanism)

Edit only the frontmatter `description`. Each sentence stays a natural
description, not a keyword list. A whole word scores `1`, a word prefix `2`, and
every term of a phrase with a word prefix `3`, each plus
`DESCRIPTION_MATCH_RANK` (`4`), so any of them beats a prose chunk
(`Infinity`) and stays below a page title.

| File | Current description | New description |
| ---- | ------------------- | --------------- |
| `apps/docs/content/docs/data-display.mdx` | `Tables, datagrids, selection, tree views, log viewers, charts, key-value displays and virtualized data presentation.` | `Tables, sorting, sortable and selectable rows, filtering controls, column configuration, resizable columns, datagrids, tree views, log viewers, charts, key-value displays and virtualized data presentation.` |
| `apps/docs/content/docs/installation.mdx` | `Add GPUIXUI to a GPUix application: setup, prerequisites and system requirements, platform support for the native binding targets on macOS, Linux and Windows, and the install commands.` | `Add GPUIXUI to a GPUix application: setup, prerequisites and system requirements, package managers (nub, npm, pnpm, yarn), whether the packages are published to a registry, platform support for the native binding targets on macOS, Linux and Windows, and the install commands.` |
| `apps/docs/content/docs/contributing.mdx` | `How to work on GPUIXUI on GitHub, where to report bugs or open issues and pull requests, and the gates a change must pass.` | `How to work on GPUIXUI on GitHub in worktrees, where to report bugs or open issues and pull requests, and the gates a change must pass.` |

There is no component record for these three pages, so no `entries.ts` summary
has to move with them.

### 2.2 Why each new word is honest

- **Data display** is the page that will own `@gpuixui/data-grid`; its body
  already says sorting, filtering and column configuration are the targets, and
  the roadmap rows for sortable tables, filtering controls and column
  configuration are generated from that same inventory. Naming the words in the
  summary does not claim the components ship.
- **Installation** already states that packages are not on a registry yet. The
  summary's `package managers (nub, npm, pnpm, yarn)` and `published to a
  registry` describe the page's real content; they do not claim an npm package
  exists. The body gains one sentence (see §2.3) so the words a reader searches
  are also readable, not only in metadata.
- **Contributing** has a real `## Worktrees` section (AGENTS §6); naming
  `worktrees` in the summary is the same rule.

### 2.3 Installation body sentence

The summary must not be the only place a reader can read the words. Add one
sentence under `## Packages are not published yet`, immediately before the code
block:

> The workspace installs with `nub`; once the packages are published, the same
> package names install with npm, pnpm or yarn.

Do not add an `npm install` command block: the packages do not resolve from a
registry today, and a copyable command that fails is worse than a sentence.

### 2.4 Tests

- `apps/docs/src/lib/search.test.ts` — one table test, `seventh-pass reader
  vocabulary`, with the fourteen queries in §1; each row's first result must be
  a `type: "page"` whose destination (fragment removed) equals the owning page.
  The header comment names the measured defects and says each row fails when its
  summary word is removed.
- `apps/docs/src/lib/search.test.ts` — one regression table: `table`,
  `tables`, `virtualized`, `datagrid`, `theme`, `panel`, `input`, `label`,
  `spacing`, `screen reader` keep the destinations earlier passes assigned.
  `filter` moves to Data display by the decision in §1 and is not a regression.
- `apps/docs/scripts/smoke-build.ts` — three `first: true` production queries:
  `sorting` → `/docs/data-display`, `npm` → `/docs/installation`,
  `worktree` → `/docs/contributing`.

## 3. Exact commands

Run from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/docs-site`):

```sh
nub run --filter docs test
nub run --filter docs check-types
nub run --filter docs smoke:build
```

Expected:

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 105 files / **762 tests** pass (760 before; 2 new) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages, 121 links, 1 283 anchors, search checked, exit `0`; the three new queries pass |

Then the completion gate:

```sh
nub run check
nub run lint
nub run test
```

Expected: each exits `0`; the root `test` run reports every workspace green.

## 4. STOP conditions

- A query's first result is not the owning page **and** the summary edit in §2.1
  is already applied: stop, record the actual result in this plan, and do not
  add a ranker rule, a second keyword table or a component alias.
- `filter` no longer reaches `/docs/patterns/project-browser`: this is the
  recorded §1 decision, not a failure. If a later change makes `filter` stop
  reaching Data display, stop and report.
- `table` loses `/docs/data-display`, or `input`, `label`, `panel`, `theme`,
  `spacing` or `screen reader` move: stop and report the stolen term.
- A description edit changes the page count, link count or anchor count:
  stop; a summary edit must not add or remove a page, link or heading.
- The smoke build cannot run (build or preview failure): report exit `2`; never
  report it as a pass.

## 5. Acceptance

- The fourteen queries in §1 return their owning page first.
- The eleven regression queries keep their previous destinations.
- `npm`, `pnpm` and `yarn` are readable in Installation's body, not only in its
  metadata.
- All docs tests, the type check, the built-site crawl, the root gates and the
  two-direction proofs in §6 pass.
- `TODO.md` gains and ticks the task; the plan index lists this plan as
  implemented.

## 6. Measured results

Run on 2026-10-19 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 105 files / **762 tests** pass (760 before; 2 new) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages, 1 283 anchors, search checked, exit `0`; the three new queries pass |
| `nub run check` (root) | exit `0` |
| `nub run lint` (root) | exit `0` |
| `nub run test` (root) | every workspace green; `apps/docs` 762, `packages/components` 308, `packages/primitives` 282 |

All fourteen §1 queries now return their owning page first, and the regression
table keeps its destinations. `filter` now reaches Data display, the destination
change recorded in §1.

### Two-direction proofs

Each was measured by applying the defect and running
`nub exec vitest run src/lib/search.test.ts -t "seventh set"`, then reverting it:

1. Restoring Data display's old summary failed seven rows:
   `sort -> text:/docs/data-display`, `sorting -> nothing:nothing`,
   `sortable -> text:/docs/data-display`,
   `filtering -> text:/docs/data-display`,
   `filter -> page:/docs/patterns/project-browser`,
   `column -> text:/docs/components/stack`,
   `columns -> text:/docs/components/navigation-menu`.
2. Restoring Installation's old summary (with the new body sentence still
   present, so the page was retrievable only as a chunk) failed six rows:
   `npm -> text:/docs/installation`, `pnpm -> text:/docs/installation`,
   `yarn -> text:/docs/installation`,
   `registry -> text:/docs/architecture`,
   `publish -> text:/docs/extending`,
   `package manager -> text:/docs/examples`.
3. Restoring Contributing's old summary failed one row:
   `worktree -> text:/docs/extending`.

