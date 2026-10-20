# 618 — Reader questions and the workspace frame vocabulary

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 411, 412, 419, 431, 519, 561, 566, 568, 574, 579, 583, 585, 588, 590–593, 598, 599, 601, 603, 605, 607, 608, 610–612, 614, 615, 617

## 1. Why this plan exists

Plan 617 closed the licence question and recorded that **nine measured queries**
still answer with the wrong page. `TODO.md` carries them as the last open
docs-site task. They are two classes:

- **A reader's question form** — a sentence with interrogative words and a
  subject (`how to contribute`, `does it work with next.js`, `where is the
  source`, `coming soon`, `coverage`). The page-alias table matches the **whole
  query**, so every measured spelling must be an alias row; the ranker already
  scores words, which is why each sentence lands on whichever component or
  prose chunk happens to contain one of them.
- **The workspace frame vocabulary** — the words a desktop developer uses for
  the window frame and its parts (`title bar`, `status bar`, `split view`). The
  site composes and documents these on App shell and Workspace, but neither page
  owns the words in search, and one of them (`no data`) names an empty state.

Measured 2026-10-20 at `ad09c1fc`, through the real index (`search(query, 5)`):

| Query | First result | Real owner |
| ----- | ------------ | ---------- |
| `how to contribute` | `/docs/components/toggle` | Contributing |
| `does it work with next.js` | `/docs/workspace` | Porting's `## Not a web UI library` |
| `title bar` | `/docs/components/alert` | App shell (the composition paints one) |
| `status bar` | `/docs/roadmap` | App shell (the composition paints one) |
| `split view` | `/docs/components/preview-card` | Workspace (resizable splits) |
| `where is the source` | `/docs/theming` | Contributing (the repository URL) |
| `coming soon` | `/docs/porting-from-shadcn` | Roadmap (every target's status) |
| `no data` | `/docs/data-display` | Empty states (the component that explains an absence) |
| `coverage` | `/docs/architecture#preview-strategy` | Roadmap (status coverage; test evidence is elsewhere) |

Each destination already contains the answer except `coverage`: the Roadmap page
renders every target's status but never says that "coverage" is what its table
is, and never says what it is **not** (no line or branch coverage is measured).
So this plan adds one sourced section there, vocabulary rows in the two existing
guarded tables, and one integration case for the component alias.

## 2. The decision

1. **Vocabulary, not ranker surgery.** `page-aliases.ts` (plan 598) and
   `component-aliases.ts` (plan 566) are the established owners of "a reader's
   words that the title and summary cannot score". Every new term is an exact
   whole-query match, so it cannot steal a shorter word (`status bar` cannot make
   `bar` reach App shell). No new ranking tier is added.
2. **The measured question forms are catalogued per page**, and the plan names
   the limit: a phrasing nobody measured is not covered until an alias row is
   added. This is the same trade-off plan 607/608 recorded for typos.
3. **Roadmap owns "coverage" and says what it means.** A new section states
   that the table is the inventory's status coverage, that no line/branch
   coverage figure is measured or published, and where the evidence actually
   lives (GPUix capabilities for the runtime, Native smoke suite for what the
   suite proves, Previews for the tier vocabulary). It also defines `todo` as
   the site's "coming soon" answer.
4. **Regressions stay pinned.** `split panes` must keep reaching the roadmap
   target `Resizable split panes` (plan 564/574 decided this), `empty state`
   must keep reaching the component page, and `data` must keep reaching Data
   display. The new `split view` alias must not absorb `split panes`.

## 3. Files

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/page-aliases.ts` | thirteenth block: Contributing (question + source forms), Porting (framework question forms), App shell (frame words), Workspace (`split view`), Roadmap (`coming soon`, `coverage` forms) |
| `apps/docs/src/lib/component-aliases.ts` | `empty-state` gains `no data` |
| `apps/docs/content/docs/roadmap.mdx` | new `## What coverage means here` section |
| `apps/docs/src/lib/page-aliases.test.ts` | owned rows for every new term; regression rows pinning `split panes` and `data` (`empty state` is already pinned) |
| `apps/docs/src/lib/search.test.ts` | one component case: `no data` → Empty states |
| `apps/docs/src/lib/roadmap.test.ts` | a guard: the coverage section exists, links its three owners and states the absence |
| `apps/docs/scripts/smoke-build.ts` | three production queries: `how to contribute`, `title bar`, `coverage` |
| `apps/docs/README.md` | one sentence in "Site search" naming the question-form rule |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | tick the task, update the docs-site progress fraction |

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/618-reader-questions-and-frame-vocabulary.md` | this plan |

Nothing outside `apps/docs/` (plus `TODO.md` and the plan index) is edited.

## 4. Exact vocabulary

`page-aliases.ts` — append to the existing arrays (do **not** create a second
table; the guards expect one map):

| Page | Terms |
| ---- | ----- |
| `/docs/contributing` | `how to contribute`, `how do i contribute`, `how can i contribute`, `contribute`, `contributing guide`, `where is the source`, `where is the source code`, `where is the code`, `source code` |
| `/docs/porting-from-shadcn` | `does it work with next.js`, `does it work with nextjs`, `does it work with remix`, `does it work with electron`, `does it work with tauri` |
| `/docs/patterns/app-shell` | `title bar`, `titlebar`, `title bars`, `status bar`, `statusbar`, `window frame`, `app frame`, `application frame`, `app chrome`, `window chrome` |
| `/docs/workspace` | `split view`, `split views` |
| `/docs/roadmap` | `coming soon`, `unreleased`, `not yet available`, `planned components`, `future components`, `coverage`, `coverage map`, `what is implemented` |

`component-aliases.ts`: `["empty-state", ["no data"]]`.

`status bars` (plural) is deliberately absent: it is the roadmap target
`Status bars`, and a measured before-run showed the roadmap row wins that exact
query. Adding it to App shell would either steal it or collide with the
target's own name, so the singular `status bar` (the reader's frame word) is the
row and the plural stays with the roadmap.

Before implementing, re-check the two guards' invariants by hand:

- no term equals a page title or a component title/symbol/part/alias
  (`page-aliases.test.ts` fails by name);
- no term is used by two pages/records;
- `see` the measured regressions: `split panes` → `/docs/roadmap`,
  `empty state` → `/docs/components/empty-state`, `data` → `/docs/data-display`.

## 5. Steps

1. Write this plan; append the row to `.agents/slop/plans/README.md`.
2. Add the vocabulary rows and the component alias.
3. Add the Roadmap section (exact content below).
4. Add the test rows and the roadmap guard.
5. Run the scoped checks in §6, fix, then run the end-of-task checks.
6. Append the measured result and the two-direction proofs to §8, tick
   `TODO.md`, commit and push.

Roadmap section (place after the intro paragraph, before `<RoadmapTable />`):

```mdx
## What coverage means here

This table is the **status coverage** of the inventory: one row per Tier 3–5
target, generated from `COMPONENTS.md`, so a target cannot be missing without
the
[inventory](https://github.com/Cyberistic/GPUIXUI/blob/master/COMPONENTS.md)
changing. "Coming soon" means a row whose status is `todo`; it has no
implementation and no page yet.

It is not a code-coverage figure. No line, branch or function coverage is
measured or published, and a component's `done` status is not a claim about one.
The evidence that does exist lives on three pages: the
[GPUix capabilities](/docs/capabilities) matrix (what the runtime can do, with
the scenario that proves it), the [Native smoke suite](/docs/native-testing)
(what the suite proves and what it does not), and [Previews](/docs/previews)
(how each page's evidence is labelled).
```

## 6. Test plan and commands

Every command runs from the workspace root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test -- src/lib/page-aliases.test.ts src/lib/search.test.ts src/lib/roadmap.test.ts` | exit `0`; the new owned rows and the `no data` case pass |
| `nub run --filter docs test` | exit `0`; the whole docs suite (125 files / 1 225 tests before this plan) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0`; the crawl reports the same page count (**106**) because `roadmap.mdx` gains a section, not a page; the three new production queries pass |
| `nub run check` | exit `0` (includes `lint`, `fmt`, `check-types`, `check:tests`) |

**Two-direction proofs to run and record (each reverted before continuing):**

1. Remove `coverage` from the Roadmap aliases → `pageAliases` row fails with
   `coverage → …`, and `smoke:build` fails the production query by name.
2. Remove `no data` from `component-aliases.ts` → the `search.test.ts` case fails
   with `no data -> /docs/data-display`.
3. Delete the Roadmap `## What coverage means here` section → the new
   `roadmap.test.ts` guard fails by name.
4. Change `split view` to `split pane` in the Workspace aliases → the
   `split panes` regression row fails (`split panes → /docs/workspace`), proving
   the phrase is exact-only.
5. Rename `how to contribute` to `how to contributions` → the owned row and the
   production query fail by name.

**STOP conditions**

- A new term collides with an existing page title, component name or alias, and
  the guard reports it: stop and choose a different term; do not weaken the
  guard or delete the pre-existing owner.
- `status bar` or `title bar` starts stealing the roadmap target `Status bars`
  in a way that breaks a shipped regression: stop and record the conflict in
  §8 instead of removing the roadmap target's generated name.
- `smoke:build` reports a page-count change other than zero: stop; a vocabulary
  row must not add a page.
- Any command exits `2`: stop and report it as unverified, never as a pass.

## 7. Acceptance

- All nine measured queries return their owner first, through the real index.
- Every new term is guarded twice: the unit table and (for three) the built
  production index.
- The Roadmap page states what coverage it publishes and that no code-coverage
  figure exists.
- `nub run check`, the docs suite, the docs type-check, the build and
  `smoke:build` are green, and the run commands are recorded in §8.

## 8. Results

Measured 2026-10-20 on `agent/docs-site`, after the change, through the real
index (`search(query, 5)`):

| Query | First result |
| ----- | ------------ |
| `how to contribute` | `/docs/contributing` |
| `does it work with next.js` | `/docs/porting-from-shadcn` |
| `title bar` | `/docs/patterns/app-shell` |
| `status bar` | `/docs/patterns/app-shell` |
| `split view` | `/docs/workspace` |
| `where is the source` | `/docs/contributing` |
| `coming soon` | `/docs/roadmap` |
| `no data` | `/docs/components/empty-state` |
| `coverage` | `/docs/roadmap` |

Commands run from the workspace root:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | exit `0` — 125 files / **1 264** tests (up from 1 225) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0` — **106** pages, `smoke: search checked`; page count unchanged |
| `nub run check` | exit `0` — `check:tests`, `lint`, `fmt`, `check-types` |

The 39 new cases are the 36 alias rows (34 owned + the two pinned regressions),
the `no data` search case and the two roadmap guards.

### Two-direction proofs

Each mutation was applied, the named test run, and the mutation reverted before
continuing.

1. **Removed `coverage` from the Roadmap aliases** → the owned row failed with
   `Received: "/docs/roadmap#what-coverage-means-here"`. This also exposed a
   caveat: the production `coverage` check uses `startsWith`, so it still passes
   on the fragment. The unit row is the load-bearing guard for the exact page.
2. **Removed `no data` from `component-aliases.ts`** → the search case failed;
   the phrase fell back to its pre-plan owner, `/docs/data-display`.
3. **Deleted the Roadmap `## What coverage means here` section** → both roadmap
   guards failed by name.
4. **Changed `split view` to `split pane`** → the `split panes` regression row
   failed with `Received: "/docs/workspace"`. `aliasMatchRank` matches a query
   prefix, so `split pane` steals `split panes` from the roadmap target; `split
   view` is a phrase the target does not prefix.
5. **Renamed `how to contribute` to `how to contributions`** → the owned row
   failed, proving the row — not incidental word scoring — reaches Contributing.

### Recorded conflicts

- **`status bars`** was dropped from the App shell aliases. The measured query
  `status bars` already answers with the roadmap target `Status bars`; the
  singular `status bar` is the frame word and is the only row added. §4 records
  the reason beside the vocabulary table.
- **`split pane`** cannot be added for Workspace: because the alias matcher
  compares query prefixes, it would capture `split panes`, which plan 564 pinned
  to the roadmap target. `split view`/`split views` carry the intent instead.

### Not done here

- Root `nub run test` (every workspace) was not run for this docs-only change;
  the docs suite above is the scoped check, and merge-time verification is the
  workstream gate.
- Phrasings nobody measured are not covered. A new question form needs a
  reviewed alias row; that is the same limit plans 607/608 recorded for typos.
