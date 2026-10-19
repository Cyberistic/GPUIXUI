# 574 — A page summary names every subject it owns

**Workstream:** docs-site · **Phase:** F (search quality; `MISSION.md`'s
"component search" and information architecture) · **Depends on:** 410, 413,
419, 431, 448, 490, 500, 504, 505, 507, 518, 561, 563, 564, 566, 568, 569 ·
**Status:** done

Plan 568 made a hand-authored page's **frontmatter description** a search name:
a page without a component record is scored by its summary one tier below its
own title, and a page whose body never repeats the subject word is still a
candidate. The rule works — `table` reaches Data display, `aria` reaches
Accessibility — but it can only act on the words an author wrote. Four pages
whose subjects are token groups, type families, preview tiers and data
presentation describe themselves without naming those subjects, so a reader who
types the subject lands on incidental prose.

Measured on this branch (2026-10-19, `3d9bbc3e`) with the real search module:

| Query | First result today | Page that owns the subject | Its summary today |
| ----- | ------------------ | -------------------------- | ----------------- |
| `spacing` | Tokens API (three chunks) | Theming | *Semantic roles, light and dark themes, and the extension mechanism.* |
| `radius` | Box, then Box, then Skeleton | Theming | same |
| `density` | Tokens API (three chunks) | Theming | same |
| `elevation` | Box, then Box, then Tokens API | Theming | same |
| `font` | rank 5 — Tokens API, Icons, Settings form | Typography | *How GPUIXUI scales and renders text.* |
| `font family` | Tokens API (two chunks) | Typography | same |
| `font weight` | Tokens API (three chunks) | Typography | same |
| `wasm` | Values API | Previews | *How every preview is labelled, and what each label proves.* |
| `screenshot` | Architecture, Native smoke suite | Previews | same |
| `approximation` | Architecture (two chunks) | Previews | same |
| `virtualized` | Message scroller, Roadmap, Accessibility | Data display | *Tables, selection, and virtualised data presentation.* |

`virtualised` (the site's own spelling) already reaches Data display; only the
US spelling a reader may type is missing. `font` already ranks Typography fifth.

`split panes` also returned the Roadmap, but that is **intended**: plan 564
promotes the inventory target of that name, so a reader who asks for it learns
the target's real status. It is out of scope here and its absence is recorded in
the guard.

The cause is metadata, not ranking: the pages that own these subjects are
generated-table pages whose prose names the rows, and their one-line summaries
were written before the tables existed. No ranker change can recover a word the
summary does not contain.

## 1. The rule

1. **The summary is the page's search identity, so it names every subject the
   page owns.** A group of generated tables (spacing, radius, density,
   elevation), a type scale (font family, weight) and a preview vocabulary
   (wasm, screenshot, approximation) and a data-presentation term (virtualized)
   each belong to exactly one hand-authored page; that page's description says
   so.
2. **The wording stays reader-facing.** Descriptions are the `<meta
   name="description">` and the search snippet (plan 413); they are edited as
   prose, never appended as a keyword list. Every sentence must remain true of
   the page.
3. **The ranker is unchanged.** `descriptionMatchRank` already scores exact,
   whole-word, word-prefix and every-word-of-a-phrase matches; a description
   match is `DESCRIPTION_MATCH_RANK` (4) below the page's title and above prose.
   This plan is content metadata, not a second ranking rule.
4. **The pages are guarded by their own words.** A table of
   `[query, owning page]` pairs in `src/lib/search.test.ts` runs each query
   through the real index and requires the page **first**; it fails by name when
   a summary loses a subject. No component page joins the table, because a
   component's summary deliberately never ranks (plan 568).
5. **The production index is proven too.** `smoke:build` gains three `first`
   checks — `spacing` → Theming, `font family` → Typography, `screenshot` →
   Previews — because the dev suite is not the release gate.
6. **Single spellings are named once.** Data display writes the US spelling
   (`virtualized`) in its summary while its body keeps the site's British
   `virtualised`; both queries now reach the page. No stemming rule is added.

## 2. Files

| Path | Change |
| ---- | ------ |
| `apps/docs/content/docs/theming.mdx` | frontmatter description names colour roles, spacing, radius, density and elevation |
| `apps/docs/content/docs/typography.mdx` | description names font families, weights, sizes and line heights |
| `apps/docs/content/docs/previews.mdx` | description names the live wasm surface, screenshot and browser approximation |
| `apps/docs/content/docs/data-display.mdx` | description says `virtualized` (US spelling) as well as keeping the body's `virtualised` |
| `apps/docs/src/lib/search.test.ts` | `PAGE_SUBJECTS` table, one `it` per subject, header comment naming the bug |
| `apps/docs/scripts/smoke-build.ts` | three production `searchChecks` rows |
| `apps/docs/README.md` | one paragraph in `## Search` naming the metadata rule and the guard |
| `.agents/slop/plans/README.md` | the `574` row |
| `TODO.md` | tick the docs-site task and update the plan count |
| `PLAN.md` | decision `D49` |

## 3. Implementation

### 3.1 Content

Change only the `description:` line in each frontmatter block.

`theming.mdx`:

> Semantic colour roles, spacing, radius, density and elevation, light and dark
> themes, and the extension mechanism.

`typography.mdx`:

> How GPUIXUI scales and renders text, from the font family and weight to the
> size and line height of every role.

`previews.mdx`:

> How every preview is labelled — live wasm surface, native run, screenshot or
> browser approximation — and what each label proves.

`data-display.mdx`:

> Tables, selection, and virtualized data presentation.

Do not touch the bodies, the titles, or any heading id: `smoke:build` compares
1 000+ fragment anchors and every page's outline.

### 3.2 `src/lib/search.test.ts`

Append one `describe` inside the existing `search` suite (it reuses the index
that file already builds; a new file would pay the cold build again):

```ts
/**
 * Plan 574: a hand-authored page names every subject it owns in its summary.
 * Before the fix these queries returned the Tokens API, Box, Architecture or
 * the Values API — the pages that mention the word, not the page that owns it.
 */
const PAGE_SUBJECTS = [
  ["spacing", "/docs/theming"],
  ["radius", "/docs/theming"],
  ["density", "/docs/theming"],
  ["elevation", "/docs/theming"],
  ["font", "/docs/typography"],
  ["font family", "/docs/typography"],
  ["font weight", "/docs/typography"],
  ["wasm", "/docs/previews"],
  ["screenshot", "/docs/previews"],
  ["approximation", "/docs/previews"],
  ["virtualized", "/docs/data-display"],
] as const;

it.each(PAGE_SUBJECTS)("%s reaches the page that owns it", async (query, url) => {
  const results = await search(query, 5);
  expect(`${query} -> ${results[0]?.url.split("#")[0]}`).toBe(`${query} -> ${url}`);
});
```

The header comment of the file gains one paragraph naming this bug class, as
plans 561/568/569 do.

### 3.3 `scripts/smoke-build.ts`

Add to `searchChecks` (all `first: true`):

| Query | Expected | What |
| ----- | -------- | ---- |
| `spacing` | `/docs/theming` | a token group named by the page that owns it |
| `font family` | `/docs/typography` | a type family named by the typography page |
| `screenshot` | `/docs/previews` | a preview tier named by the preview guide |

### 3.4 `apps/docs/README.md`

In `## Search`, after the description paragraph (plan 568), add: the summary is
the page's search identity, it must name every subject the page owns (token
groups, type families, preview tiers), `PAGE_SUBJECTS` in
`src/lib/search.test.ts` runs each subject through the index, and `smoke:build`
checks three of them against the production index.

## 4. Commands and expected results

From the repo root:

```sh
nub run --filter docs test
```

Expected: **88 files / 635 tests** before; **636 tests** after (one new case
covering 11 queries), every file green. Then:

```sh
nub run --filter docs smoke:build
```

Expected: build + serve + crawl exit `0`, with the three new search checks
listed as passed and the page/anchor counts unchanged.

```sh
nub run check
```

Expected: exit `0` (test quality, lint, format, types) — the MDX text changes
must not trip the prose guards.

## 5. Test plan

The 11-case table is the regression test. It **can fail**: before the content
edit, every row ran through the same module and produced the "today" column in
the table above (measured on `3d9bbc3e`; the plan's author ran the queries and
recorded the first three URLs for each).

Two-direction proof, recorded in §8 after implementation:

1. **Forward:** with the four descriptions edited, all 11 queries return their
   page first.
2. **Backward:** revert `theming.mdx`'s description to the old sentence; the
   four Theming rows fail by name (`spacing -> /docs/tokens-api` etc.). Restore;
   green. Repeat once for `previews.mdx` (three rows) to prove the failure is
   per-page, not a single global check.
3. **Production:** `smoke:build` exits `1` when one of the three checks is
   pointed at the wrong page (force it once, restore).

## 6. STOP conditions

- Any of the five pages' titles or headings would need to change → stop; the
  ranker must win on the summary alone.
- A query still returns the wrong page first after the edit → stop and report
  the measured URLs; do not add a keyword field, an alias table or a stemming
  rule in this plan.
- `smoke:build` reports a changed page or anchor count → stop; a frontmatter
  description edit must not move the IA.
- `nub run check` fails on a prose guard → stop and report the guard; do not
  weaken the guard.

## 7. Acceptance

- The 11 subject queries return their owning page first in the unit suite.
- Three of them are proven against the production index by `smoke:build`.
- Each summary reads as a sentence a reader benefits from, not a keyword list.
- `nub run --filter docs test`, `nub run --filter docs smoke:build` and
  `nub run check` pass; `TODO.md`, the plan index and `PLAN.md` are updated.

## 8. Results

Implemented 2026-10-19 on `agent/docs-site`.

**The edit.** Four `description:` lines (Theming, Typography, Previews, Data
display). `typography.mdx` quotes its description because the sentence contains
a colon; the first attempt without quotes failed the MDX parse with
`YAMLParseError: Nested mappings are not allowed in compact mappings`.

**The guard.** One new case in `src/lib/search.test.ts`, 11 queries; the file
now runs 57 cases. Before the edit the case reported exactly the measured URLs
in §0, including `font family -> /docs/tokens-api#functions` and
`virtualized -> /docs/components/message-scroller`.

**Two directions, measured.**

| Run | Command | Result |
| --- | ------- | ------ |
| forward | `nub run --filter docs test search` | 9 files / 120 tests green |
| theming reverted | `nub run --filter docs test src/lib/search.test.ts` | `1 failed`, `spacing -> /docs/tokens-api`, `radius`, `density`, `elevation` in the diff |
| previews reverted | same | `wasm -> /docs/api-values`, `screenshot` and `approximation` → `/docs/architecture#preview-strategy` |
| production forced | `nub scripts/smoke-build.ts --no-build` with `spacing` pointed at Tokens API | exit `1`: `the first result is not under /docs/tokens-api …` |

**`split panes` is out of scope, deliberately.** The first guard run failed on
it because the Roadmap's generated document promotes the inventory target of
that name (plan 564). That is the honest answer — the target is not built — so
the row was removed rather than the ranker changed, and the test comment records
why. The field's earlier `splits` wording stays.

**Gates.**

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 88 files / 636 tests green (was 635) |
| `nub run --filter docs smoke:build` | exit `0`; 97 pages, 120 links, 1 267 anchors, search checked |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0`; docs 88 / 636, every package green |

