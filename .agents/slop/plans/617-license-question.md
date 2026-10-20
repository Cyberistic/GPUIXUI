# 617 — The licence question has an answer

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 413, 419, 489, 568, 597, 598, 604, 610, 616

## 1. Why this plan exists

`MISSION.md` asks for "clear install, usage, contribution and extension
instructions" and a "licence inventory before release". The site answers the
first three. The one question every consumer asks before the first three —
*can I use this, and on what terms?* — has no answer anywhere, and the one page
that looks like it owns the question answers a different one (which licences the
**references** carry).

Measured 2026-10-20 at `0a0a0b43`, through the real index:

| Query | First result |
| ----- | ------------ |
| `is it free` | `/docs/components/list` |
| `is it open source` | `/docs/components/list` |
| `can i use this` | `/docs/components/text#variants` |
| `can i use it` | `/docs/components/list` |
| `commercial use` | `/docs/components/text-area#accessibility-and-limitations` |
| `pricing` | *(none)* |
| `price` | `/docs/components/range-slider` |
| `free` | `/docs/native-testing` |
| `copyright` | *(none)* |
| `terms` | `/docs/component-pages#search-vocabulary` |

`license`, `licence`, `licensing`, `open source`, `mit` and `attribution` already
reach `/docs/license` through its title or summary. The question forms do not,
because each one names a concept the page never states in words the ranker can
score — and because the repository has never declared the library's own licence.

The repository check (measured the same day):

```sh
git ls-files | grep -E '(^|/)LICEN[CS]E'   # LICENSES/README.md, LICENSES/base-gpui.md only
git grep -n '"license"' -- '**/package.json'   # no match
```

There is no root `LICENSE`, and no workspace manifest carries a `license` field.
The only licence the repository records is **base-gpui's MIT**, which the page
already names correctly as a *reference*. So the current page is not wrong; it is
silent on the one fact a consumer needs, and the site's own summary ("Open source
licences, including the recorded MIT reference…") reads as if the library itself
were licensed.

This is the same class plan 489 fixed for the inventory: the page must state what
is recorded **and** what is not, and a guard must read the repository so the
statement cannot outlive the files.

## 2. The decision

1. **The page states the library's own licence status.** Today that is "no
   licence has been declared": no root `LICENSE` file, no `license` field in any
   workspace manifest, so no permission is granted and no price or commercial
   terms are published. The page does **not** choose a licence — that is the
   owner's release decision, recorded as a cross-team task in `TODO.md`.
2. **A guard reads the repository, in both directions.** The page may claim "no
   licence has been declared" only while that is true; the moment a root licence
   file or a manifest `license` field appears, the test fails by name and the page
   must be updated. When a licence is declared, the page must name it.
3. **The question forms are exact aliases to `/docs/license`.** The existing
   page-alias table (plan 598) is exact-whole-query only, which is exactly the
   shape of a typed question; no ranker change is needed. Thirteen terms are
   added. Bare `cost` is deliberately **not** added: `/docs/performance` owns a
   real cost model and the query currently reaches it. `terms` is not added
   either — it reaches the search-vocabulary section of the component-page
   guide, and `terms of use` names the licence subject unambiguously.

Out of scope, measured and recorded in `TODO.md` for a later pass: the
natural-question and workspace-frame misses (`how to contribute` → Toggle,
`does it work with next.js` → Workspace, `title bar` → Alert, `status bar` →
Roadmap, `split view` → Preview card, `coming soon` → Porting). They are a
different subject and need their own evidence table.

## 3. Files

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/license.mdx` | new `## The library's own licence` section; the summary names the library's status; the owed list names the missing `LICENSE` |
| `apps/docs/src/lib/page-aliases.ts` | thirteen exact terms on `/docs/license` |
| `apps/docs/src/lib/page-aliases.test.ts` | thirteen `owned` rows |
| `apps/docs/src/license-page.test.ts` | the both-direction guard over the repository |
| `apps/docs/scripts/smoke-build.ts` | two production search checks |
| `apps/docs/README.md` | a short "Licence status" paragraph |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | one ticked docs-site task, one cross-team licensing task, one pending vocabulary task; the progress fraction |

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/617-license-question.md` | this plan |

Nothing outside `apps/docs/` (plus `TODO.md` and the plan index) is edited.

## 4. The page

`apps/docs/content/docs/license.mdx`:

1. Replace the frontmatter description. Keep the words the index already scores
   (`licence`, `open source`, `MIT`, `attribution`) and add the library status:

   ```yaml
   description: Whether you can use the library, the open-source licences recorded for its references (including the MIT reference), and the attribution still owed.
   ```

   `open source` currently reaches this page only through the description; do not
   drop it.

2. Insert this section **before** `## How a licence is verified` (exact text; the
   test reads the first sentence):

   ```md
   ## The library's own licence

   No licence has been declared for the library itself. The repository has no
   `LICENSE` file at its root and no workspace package manifest carries a
   `license` field, so the terms a consumer can rely on are not published: it is
   not yet accurate to call this library open source, free to use, or licensed
   for commercial use.

   The records below are the **references'** licences and the evidence rule for
   them, not a grant for this code. Until the owner declares the library's
   licence and the published packages carry it, do not redistribute or ship it.
   This page states the status; it does not choose the licence.
   ```

3. Add one row to `## Still owed before release`'s list:

   ```md
   - `LICENSE` — the library's own licence, and a `license` field in every
     published package manifest.
   ```

   The existing `LICENSES/...` path guard only compares backticked
   `LICENSES/…` paths, so this row does not trip "keeps the owed list honestly
   owed".

No other prose changes. Do not name a candidate licence (MIT, Apache, …) for the
library itself; that is the owner's decision.

## 5. The aliases

In `apps/docs/src/lib/page-aliases.ts`, extend the `/docs/license` entry:

```ts
[
  "/docs/license",
  [
    "credits",
    "acknowledgements",
    "acknowledgments",
    "is it free",
    "is it open source",
    "is this free",
    "can i use this",
    "can i use it",
    "can i use this commercially",
    "commercial use",
    "commercial license",
    "price",
    "pricing",
    "free",
    "copyright",
    "terms of use",
  ],
],
```

Rules the guard already enforces (do not weaken them): lower-case, one page per
term, no term equal to a page title or a component name/alias. `cost`, `terms`,
`apache` and `license fee` are deliberately absent — the first two have a real
owner today and the last two have no recorded answer.

## 6. The guards

### 6.1 `license-page.test.ts` — the repository, both directions

Add, beside the existing repository reads (same `node:fs`/`node:path` pattern,
same comment explaining why a browser app reads the repository):

1. `declaredLibraryLicences()` — returns the identifiers currently declared for
   the **library itself**:
   - every regular file directly under `repoRoot` whose name matches
     `/^(licen[cs]e|copying|unlicense)(\..*)?$/i` (the `LICENSES/` directory is
     not a match because it is a directory);
   - every `apps/*/package.json`, `packages/*/package.json`,
     `examples/*/package.json` and the root `package.json` whose `license` field
     is a string.
   Decode each manifest with Effect Schema at the boundary:
   `Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Struct({ license: Schema.OptionFromOptionalKey(Schema.String) })))`.
2. `it("states the library's own licence status")`:

   ```ts
   const undeclared = page.includes(
     "No licence has been declared for the library itself",
   );
   expect(undeclared).toBe(declared.length === 0);
   ```

   This is the two-direction test: with the section removed it fails (nothing is
   declared, but the page no longer says so); with a temporary root `LICENSE` it
   fails the other way (something is declared, but the page still says none).
3. `it("names every declared library licence")` — every identifier from (1) must
   appear in the page. Vacuously empty today; it is the half that forces a real
   update when a licence lands.

### 6.2 `page-aliases.test.ts` — the measured queries

Add one `owned` row per term added in §5. These run through the real index, so a
term that is not wired (or that loses to a component token) fails by name.

### 6.3 `smoke:build` — the production index

Add two entries to `searchChecks` in `apps/docs/scripts/smoke-build.ts`:

```ts
{
  query: "is it free",
  expected: "/docs/license",
  first: true,
  what: "the licence question the page now answers",
},
{
  query: "commercial use",
  expected: "/docs/license",
  first: true,
  what: "the commercial-use question the page now answers",
},
```

## 7. Commands and expected results

```sh
cd apps/docs
nub exec vitest run src/license-page.test.ts
# pre-fix (new tests present, section absent): 1 failure,
#   `expected false to be true` on "states the library's own licence status"
# post-fix: 8/8 pass
nub exec vitest run src/lib/page-aliases.test.ts
# pre-fix: 13 failing `owned` rows (`expected '/docs/components/list' to be '/docs/license'`, etc.)
# post-fix: 269/269 pass
nub run --filter docs test
# 125 files / 1 225 tests pass (1 210 + 13 owned rows + 2 licence guards)
nub run --filter docs check-types
# exit 0
```

From the repository root:

```sh
nub run check   # exit 0
nub run lint    # exit 0
```

The production check for this change is scoped to the built-site crawl (it reads
the search index and every page):

```sh
nub run --filter docs smoke:build
# exit 0; 106 pages / 233 links / 1 366 anchors, and the two new queries pass
```

No browser smoke is needed: this change adds no rendered control and no scene.
The new section is checked in both schemes by the existing `smoke:a11y` sweep
when the next cross-cutting docs change runs it.

## 8. Two-direction proof (measured 2026-10-20, `0a0a0b43` + this change)

1. **Page guard, missing/denied section:** replacing the section's first
   sentence with "The library is MIT licensed." made
   `nub exec vitest run src/license-page.test.ts` fail:
   `AssertionError: expected false to be true` on
   `states the library's own licence status`.
2. **Page guard, declared licence:** with the page restored and a temporary root
   `LICENSE` (`MIT License`), the same suite failed the other way:
   `AssertionError: expected true to be false`. Deleting the file and restoring
   the page returned 8/8 passing. This proves the guard reads the tree.
3. **Aliases:** removing `is it free` from `page-aliases.ts` made
   `nub exec vitest run src/lib/page-aliases.test.ts` fail on the owned row:
   `expected '/docs/components/list' to be '/docs/license'`; restoring it gave
   269/269 passing.
4. **Production, failing direction:** with `is it free` removed,
   `nub run --filter docs smoke:build` exited **1**:
   `FAIL /api/search?query=is%20it%20free: the first result is not under /docs/license for the licence question the page now answers`
   and `smoke: 1 problem(s)`.
5. **Production, passing direction:** with the alias restored,
   `smoke:build` printed `smoke: ok` (106 pages, 233 links, 1 366 anchors, 24 icon
   records) and exited **0**.
6. **Full suites:** `nub run --filter docs test` — 125 files / 1 225 tests pass;
   `check-types` exit 0; `nub run check` exit 0; `nub run lint` exit 0.
7. **Regressions:** `open source`, `license`, `credits`, `cost` → Performance's
   cost model and `terms` → the component-page guide stay green in the existing
   rows; `open source` is also a production check and passed.

## 9. STOP conditions

- Stop if a root `LICENSE` or a manifest `license` field exists when the work
  starts: the premise is stale. Report the file and the licence, and rewrite §2
  to name it instead of stating its absence.
- Stop if any proposed alias shadows a page title, a component title/name/alias,
  or is already used by another page — the guard will name it. Pick a different
  exact phrase; do not relax the shadow rules.
- Stop if `Schema.OptionFromOptionalKey` is not exported by the installed Effect
  version (it is used elsewhere in the repository): use
  `Schema.OptionFromNullOr` on a parsed record instead of hand-reading
  `unknown`.
- Do not choose, imply or recommend a licence for the library. Do not edit
  `LICENSES/`, the root `LICENSE` (it does not exist) or any `package.json`.
- Do not edit `docs/preview-strategy.md` or a component page for this task.

## 10. Acceptance

- `/docs/license` answers "can I use this?" with the truth: no licence is
  declared yet, what that means, and what is recorded instead.
- The status guard fails when the section is removed **and** when a licence is
  declared without updating the page; both runs are recorded in §8.
- `is it free`, `is it open source`, `is this free`, `can i use this`,
  `can i use it`, `can i use this commercially`, `commercial use`,
  `commercial license`, `price`, `pricing`, `free`, `copyright` and
  `terms of use` reach `/docs/license` first, proved in the unit suite and two
  of them in the production build.
- The description still scores `open source`, and `cost`/`terms` keep their
  current owners.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`,
  `nub run lint` pass.
- `TODO.md` records the task and the licensing decision; this plan is indexed.
