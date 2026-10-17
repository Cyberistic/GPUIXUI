# 431 — Search relevance: a component name must find its page

- **Workstream:** docs-site
- **Phase:** F (showcase quality)
- **Owns:** `apps/docs/src/lib/search.ts`, `apps/docs/src/lib/search.test.ts`,
  the docs rows in `TODO.md`
- **Depends on:** 410 (search route), 411 (registry), 417 (index filter), 419
  (registry index), 421 (planned deep link)
- **Depended on by:** nothing. This plan amends plan 419's merge order; 419's
  decision (two indexes, one route) is unchanged.

## 1. Why — two measured defects

Measured 2026-10-17 on `1c8cd3d`, dev server on `localhost:3000`:

1. **A component's own page can be absent from its search results.** Plan 419
   appends the registry after the page index and slices the merge to `limit`.
   The page index already returns `limit` text hits, so the registry tail (and
   the component's page entry) is cut:

   ```sh
   curl -s 'localhost:3000/api/search?query=button' | python3 -c \
     "import json,sys; print([r['url'] for r in json.load(sys.stdin)])"
   ```

   Observed: ten results, none of them `/docs/components/button`. The same holds
   for `input` (`/docs/components/text-input` missing). `search('button')` in
   `search.test.ts` does not assert any of this, so the suite is green.

2. **An empty query is not empty.** Plan 419 §4 states "Empty query → both
   servers return `[]`". Measured: `curl -s 'localhost:3000/api/search'`
   returns a `Typography` result. `search('')` therefore has no honest answer,
   and the route serves arbitrary prose for a missing parameter.

Both are regressions of plan 419's acceptance criteria ("⌘K finds component
names from any page" and `200 []`), not new features.

## 2. Root cause

`search()` in `apps/docs/src/lib/search.ts`:

```ts
const [pageResults, registryResults] = await Promise.all([
  pageSearch.search(query, { limit }),
  registrySearch.search(query, { limit }),
]);
return [...pageResults, ...registryResults].slice(0, limit);
```

- Each index gets the **final** limit, so page text can consume every slot before
  the registry is appended.
- Registry results carry no signal about *why* they matched, so the merge cannot
  tell an exact component title from a body-text hit. Rank is positional only.
- A delivered component's page and its registry record point at the same URL, so
  the merged list repeats it (`/docs/components/toast` appeared twice).

## 3. Decision

Keep two indexes and one route. Replace the positional append with a small,
pure ranking function in `search.ts`:

1. **Empty query returns `[]`.** `query.trim().length === 0` short-circuits before
   either index is queried.
2. **Fetch wider than the answer.** Both indexes are queried with
   `MAX_SEARCH_LIMIT`, so the merge has candidates to rank; the final `slice`
   still caps the response at the caller's `limit`.
3. **Promote component title matches.** For each result whose URL is a component
   URL (`componentSearchUrl(record)`), score the record's **title** against the
   query:
   - `0` — equal, case-insensitive (`Progress` for `progress`);
   - `1` — title starts with the query (`Buttons` for `button`);
   - `2` — a title word starts with the query (`Text inputs` for `input`);
   - `3` — title contains the query anywhere;
   - no match — unranked.
4. **Stable order.** Sort by score, then by title length (so `Buttons` precedes
   `Button groups`), then by original position. Original position already puts
   page results before registry results, so every non-title match keeps plan
   419's "pages first, registry tail" order.
5. **One entry per page.** After sorting, keep the first `type: "page"` result
   per URL. Text/heading results keep their fragment URLs and are not merged.
6. Slice to `limit`.

This is a ~30-line pure function. It does not touch the indexes, the route, the
dialog or the URL shapes.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.ts` | the empty guard, the wider fetch, `matchRank` + `mergeResults`, and a comment naming plan 431 |
| `apps/docs/src/lib/search.test.ts` | four new regression tests (§5) |
| `TODO.md` | tick the new search-relevance row; amend the plan-419 row |
| `apps/docs/README.md` | one paragraph under the command list naming the ranking rule |

Nothing else. `componentSearchUrl`, `componentSearchIndex`, `parseSearchLimit`
and the route are unchanged.

## 5. Test plan (write the failing test first)

In `apps/docs/src/lib/search.test.ts`, with the header comment naming the two
bugs being guarded:

| Test | Fails before the fix because |
| ---- | --------------------------- |
| `search("button")[0].url === "/docs/components/button"` | the page is not even in the ten results |
| `search("input")` contains `/docs/components/text-input` | the page is crowded out by other pages |
| `search("")` and `search("   ")` equal `[]` | the page index returns prose for an empty query |
| `search("toast")` has exactly one `type: "page"` entry for `/docs/components/toast` | the page and the registry record both survive |

Existing tests stay and must still pass: page-first ranking for `installation`,
planned components still reachable (`drawer`), the limit cap, and `[]` for an
unknown term.

**Two-direction proof.** Run the new suite before `search.ts` changes and record
the failures; after the change, run it again. Then disable one rule at a time:
remove the empty guard → the empty test fails; remove the title promotion →
the `button`/`input` tests fail; remove the dedupe → the toast test fails.
Restore each and re-run.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all files pass, the four new tests included |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `curl -s 'localhost:3000/api/search'` | `[]` |
| `curl -s 'localhost:3000/api/search?query=button'` | first result `/docs/components/button` |
| `curl -s 'localhost:3000/api/search?query=input'` | includes `/docs/components/text-input` |
| `curl -s 'localhost:3000/api/search?query=drawer'` | one planned result, `/docs/components?q=Drawer` |
| `nub run check`, `nub run lint`, `nub run test` | pass |

## 7. STOP conditions

- A title match cannot be tied to a result because a component URL is not unique:
  stop and report the pair; do not guess.
- The ranking changes the dialog's rendering (it expects Fumadocs'
  `breadcrumbs`/`content` shape): stop, report the shape, and leave `search.ts`
  on the old merge until the dialog is understood.
- `search("")` still returns prose after the guard because the empty string is
  normalised somewhere else: report where, do not add a second guard.
- Any existing test in `search.test.ts` fails for a reason other than the
  intended ordering change: stop rather than update it.

## 8. Acceptance

- A component's exact name finds its page in the top results, including when the
  name is a prefix (`button` → Buttons) or a word (`input` → Text inputs).
- A planned component remains reachable and honestly labelled.
- A missing/blank query returns `200 []`.
- No page is listed twice as a page result.
- All docs suites, type-check, build and the repository gate pass; `TODO.md`,
  the plan index and `apps/docs/README.md` are updated; the change is pushed on
  `agent/docs-site`.

## 9. Progress (2026-10-17)

- **Implemented.** `search.ts` now short-circuits an empty/blank query, fetches
  both indexes at `MAX_SEARCH_LIMIT`, scores component titles (`matchRank`), and
  merges with a stable sort plus one-page-per-URL dedupe (`mergeResults`).
- **Measured before the fix:** `search("button")` returned ten results with no
  `/docs/components/button`; `search("input")` missed `/docs/components/text-input`;
  `/api/search` with no query returned a `Typography` page; `search("toast")`
  listed `/docs/components/toast` twice.
- **Measured after:** `button` → first result `/docs/components/button`;
  `input` → `/docs/components/text-input` present; empty query → `[]`; `toast`
  → one page entry; `drawer` still `/docs/components?q=Drawer`.
- **Two directions proven:** without the empty guard the blank-query test failed
  (`1 failed | 156 passed`); without title promotion `button` and the two
  `mergeResults` ranking tests failed (`3 failed | 154 passed`); without the
  dedupe the duplicate test failed (`1 failed | 156 passed`). Restored:
  `157 passed`, type-check and build green.
- **Scope note:** the dedupe collapses `type: "page"` results by URL. The page
  index also emits `type: "text"` hits whose URL is the bare page (intro prose
  above the first heading); those stay, because each carries a distinct snippet.
  The duplication this plan removed is the page hit plus the registry record for
  the same component.
