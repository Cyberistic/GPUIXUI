# 568 — Search reads a page's authored description

**Workstream:** docs-site · **Phase:** F (polish; `MISSION.md`'s component and
page search) · **Depends on:** 410, 419, 431, 448, 454, 470, 490, 500, 504, 505,
507, 518, 561, 563, 564, 566 · **Status:** done

`MISSION.md` asks for "component search" on a site whose index is 96 pages of
prose, source includes and generated tables. Plans 431–566 taught the ranker to
promote a **component title**, an exported symbol, a part name, a token, a
scenario id, an icon and a reader alias. A reader who types the *subject* of a
hand-authored page instead of its title still gets body prose, because the
Fumadocs page index ranks by term frequency and the merge has no signal for
authored metadata.

Measured against the production index on 2026-10-19 (`f799ba06`), with the
server built from this branch:

| Query | First result today | The page that names the subject |
| ----- | ------------------ | ------------------------------- |
| `table` | Component pages (10 chunks of one page) | Data display — summary: *Tables, selection, and virtualised data presentation.* |
| `tables` | API reference | Data display |
| `panel` | Tabs (four chunks, then Navigation Menu) | Workspace — summary: *Panels, splits, tabs and docking for desktop applications.* |
| `aria` | Values API, then Cards, Alerts, Badges | Accessibility — the page whose subject is the ARIA surface |
| `screen reader` | Message scroller's limitations | Accessibility |

The pattern is one cause: **the page's own description is never a search
signal.** Every page already owes a description (plan 413, guarded by
`page-meta.test.ts`), and it is the author's one-sentence statement of what the
page is about. A summary that says *Tables* should reach Data display, not a
guide that mentions tables in passing.

## 1. The rule

1. **A page's description is a weaker name than its title — for pages without a
   component record.** The ranker scores a `page` result by its authored
   description with the same four whole-word ranks a title uses — exact, whole
   word, word prefix, every word of a phrase — then offsets it by
   `DESCRIPTION_MATCH_RANK` (4). A title match (0–3) still wins, and a
   component's whole-name match still wins; prose (no rank) stays behind both.
   A **component page** is excluded: its title, symbols and aliases already
   identity it, and its summary is prose where an incidental mention would
   outrank the page that owns the subject (measured: `table` promoted Keycap
   because its summary says *shortcut table*, and `panel` promoted Drawer
   because its summary says *edge-anchored panel*).
2. **Only whole words count.** A description is prose, so a substring match
   (`lab` inside `collaboration`) would promote a page for a fragment its
   author never wrote. The title ranker's existing `includes` tier is not
   copied; the description matcher compares words.
3. **A description-only page is still a candidate.** `pageTitleHits` already
   synthesizes a page hit when the index answered a title query with headings
   only (`theming`). `pageDescriptionHits` does the same from the summary, so a
   page whose body never repeats the subject word — the exact case a summary
   exists to cover — is not invisible.
4. **The metadata is read once from the source.** `pageMetadata` is a
   `Map<url, { title, description }>` built from `source.getPages()` in
   `search.ts`; `mergeResults` takes it as an optional fourth argument so the
   pure unit tests keep passing fixtures and never depend on the content tree.
5. **The measured summaries name their subject.** Only one page needs a wording
   change: `/docs/accessibility` currently says *what assistive technology
   receives* and never uses **ARIA** or **screen reader**, the two words a
   reader types. The new summary names them and stays true (the page states the
   `aria-*` surface, the substitutes, and the limits of the evidence). Data
   display and Workspace already name *Tables* and *Panels*; they are not
   touched.
6. **The production index is proven.** `smoke:build` adds queries for `table`
   (Data display) and `aria` (Accessibility), each required **first**. The dev
   suite is not the release gate.
7. **The rule is documented** in `apps/docs/README.md` (`## Search`).

## 2. Files

| Path | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.ts` | `PageMetadata`, `descriptionMatchRank`, `pageDescriptionHits`, `DESCRIPTION_MATCH_RANK`, `mergeResults` fourth argument, `search()` wiring |
| `apps/docs/src/lib/search.test.ts` | unit cases for description rank + the word-boundary rule + synthesis; integration cases for the five measured queries; header comment |
| `apps/docs/content/docs/accessibility.mdx` | frontmatter description names ARIA and screen readers |
| `apps/docs/scripts/smoke-build.ts` | two `searchChecks` rows: `table` → `/docs/data-display`, `aria` → `/docs/accessibility` |
| `apps/docs/README.md` | one paragraph in `## Search` |
| `.agents/slop/plans/README.md` | the 568 row |
| `TODO.md` | the docs-site task row |
| `PLAN.md` | decision `D46` |

## 3. Implementation

### 3.1 `search.ts`

```ts
/** A page's authored metadata; only the two fields ranking reads. */
export interface PageMetadata {
  readonly title: string;
  readonly description: string | undefined;
}

/** A summary names the page's subject one tier below its title. */
export const DESCRIPTION_MATCH_RANK = 4;

const descriptionMatchRank = (
  description: string,
  query: string,
): number | undefined => {
  /* exact 0, whole word 1, word prefix 2, every word of a phrase 3 */
};
```

- `mergeResults(pageResults, registryResults, query, pages = new Map())`:
  for `result.type === "page"` **without a component record**, read
  `pages.get(result.url)`, add
  `descriptionMatchRank(...) + DESCRIPTION_MATCH_RANK` to `ranks`, and use the
  real page title for the `titleLength` tie-break. `sourceRank` stays `0` only
  for a title hit.
- `pageDescriptionHits(query, pages)` returns
  `{ id: "page-description:<url>", url, type: "page", content: title }` for
  every description that ranks; `search()` passes `summaryPages` (the page map
  minus component URLs), so a component gets no synthetic hit.
- `search()` builds `pageMetadata` once from `source.getPages()` and passes the
  full map to `mergeResults` (which skips component pages) and the filtered
  `summaryPages` to the synthesized hits.

### 3.2 Content

`accessibility.mdx` description becomes:

> The ARIA attributes the pinned GPUix runtime supports, what the library
> substitutes for the rest, and what assistive technology and screen readers
> receive.

The body already states the `aria-*` table, the three substitutes and the
evidence limits; no prose changes.

## 4. Commands and expected results

From the repo root:

```sh
nub run --filter docs test
```

Expected: **85 files / 594 tests** before; the new cases add the same file
(`src/lib/search.test.ts`), all green, no other suite changes.

```sh
nub run --filter docs check-types
nub run check
nub run lint
```

Expected: all green.

```sh
nub run --filter docs smoke:build
```

Expected: `smoke: ok`; the search table includes the two new rows; 96 pages.

## 5. Test plan (two directions)

Every guarded claim is measured before the fix or by reverting it.

| # | Claim | Direction 1 (must fail) | Direction 2 (must pass) |
| - | ----- | ----------------------- | ----------------------- |
| 1 | A summary beats prose | remove the `descriptionMatchRank` term from `mergeResults`; the five integration cases fail, `table` first = `/docs/component-pages` | restore; all five green |
| 2 | Data display's summary names tables | delete `Tables` from its description; `table`/`tables` fail | restore; green |
| 3 | Accessibility's summary names ARIA | restore the old description; `aria`/`screen reader` fail | new description; green |
| 4 | Whole words only | put `lab` in a description containing `collaboration`; the no-fragment unit case fails | remove; green |
| 5 | Title outranks description | give a second page a description matching a title query; the title page must stay first | unchanged green |
| 6 | A component summary never ranks | drop the `component !== undefined` guard; the Keycap-summary unit case fails (`table` moves Keycap first) | restore; green |
| 7 | A description-only page is found | drop `pageDescriptionHits`; the synthesis unit case fails | restore; green |
| 8 | Production index | remove the description term; `smoke:build` fails naming `table` and `aria` | restore; `smoke: ok` |

Unit cases (fake URLs, no content tree):

- a page whose description names the query outranks prose;
- a page title still outranks another page's description;
- a component title still outranks a page description;
- a description does **not** match a fragment inside a word;
- a description matches a phrase word-by-word;
- `pageDescriptionHits` synthesizes one page hit per matching summary and none
  for a non-match.

Integration cases (real `source`):

- `table` → `/docs/data-display` first;
- `tables` → `/docs/data-display` first;
- `panel` → `/docs/workspace` first;
- `aria` → `/docs/accessibility` first;
- `screen reader` → `/docs/accessibility` first;
- the existing invariants (`button`, `input`, `aria-label`, `modal focus`,
  `command palette`) stay green — no test is loosened.

## 6. STOP conditions

- **STOP** if a description edit changes any other page's first result for an
  existing suite query; report the query and the two URLs instead of weakening
  the test.
- **STOP** if a search result type other than `page` would need the description
  rank; this plan covers authored pages only.
- **STOP** if `pageDescriptionHits` needs a new index document — the Fumadocs
  page index already answers the page; only the candidate list changes.
- **STOP** if `smoke:build` cannot run (no Chrome is not needed for it; a build
  or server failure is exit `2`) — report exit `2`, never a pass.

## 7. Verification record

Measured on 2026-10-19 in `workspaces/docs-site`, before and after the change.

- **Before** (production index at `f799ba06`): `table` → Component pages,
  `tables` → API reference, `panel` → Tabs, `aria` → Values API, `screen
  reader` → Message scroller.
- **After**: `table`/`tables` → Data display, `panel` → Workspace, `aria`/
  `screen reader` → Accessibility; the unit suite is 49 cases in
  `src/lib/search.test.ts`.
- **Forced defects, each reverted:**
  - drop the description term from `mergeResults` → 3 tests fail
    (`reaches a page whose own summary names the subject`, the summary rank,
    the phrase rank), and `smoke:build` exits `1` with
    `FAIL /api/search?query=table` and `FAIL /api/search?query=aria`;
  - drop the `component !== undefined` guard → the component-summary test and
    the integration test fail (`table` moves Keycap first, `panel` Drawer);
  - delete `Tables` from the Data display summary → `table -> 
    /docs/component-pages#live-scenes`, `tables ->
    /docs/api-reference#how-the-tables-are-generated`;
  - restore the old Accessibility summary → `aria -> /docs/components/card`,
    `screen reader -> /docs/components/message-scroller#…`;
  - add a substring fallback to the description matcher → the
    no-fragment test fails;
  - return no synthesized hits from `pageDescriptionHits` → its unit case
    fails.
- **Gates:** `nub run --filter docs test` 85 files / **603 tests** (was 594);
  `nub run check` green; `nub run smoke:build` 96 pages, 119 links, 1 260
  anchors, `smoke: ok`; `nub run --filter docs smoke:search` green; the live
  preview gate (`smoke:preview`) ran green earlier the same day (exit `0`).
- **Measured surprise:** scoring every page's summary promoted Keycap for
  `table` (*shortcut table*) and Drawer for `panel` (*edge panel*). The
  component exclusion is the fix, and a unit case pins it.
