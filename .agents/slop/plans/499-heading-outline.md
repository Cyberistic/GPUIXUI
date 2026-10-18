# 499 — Every page's heading outline is ordered

**Phase:** F (docs accessibility and structure) · **Owner:** docs-site
**Depends on:** 410 (the site), 417 (component index), 441 (API reference), 490
(Values API), 439 (the built-site crawl)
**Status:** implemented

## 1. Why this plan exists

A structural audit of the production build (90 pages, real browser, every page's
`h1`–`h6` in document order) found **three pages that jump from `h1` to `h3`**:

| Page | First heading after the `h1` |
| ---- | ---------------------------- |
| `/docs/components` | `Tier 1 — Foundational` (`<ComponentIndex>`, `h3`) |
| `/docs/api-reference` | `Tier 1 — Foundational` (`<ApiIndex>`, `h3`) |
| `/docs/api-values` | `@gpuixui/tokens 36 exports` (`<ValueIndex>`, `h3`) |

The three generated indexes render each group as an `<h3>` although nothing
above them is an `<h2>`. A screen reader's heading navigation therefore skips a
level on the site's three index pages, and their groups are not exposed as
top-level sections even though they are. The rest of the site is ordered
correctly (the audit found no other jump).

`smoke:build` already proves each page renders one `<h1>` and one `<main>`; it
never looked at the levels in between, so the defect shipped.

## 2. Goal and acceptance

- the three generated indexes start their groups at `<h2>`;
- the built-site crawl fails, naming the page and the jump, when any page's
  heading order skips a level — so a fourth index cannot regress it;
- the existing one-`h1` rule is preserved;
- nothing else changes: no content, no registry record, no component.

## 3. Exact changes

### 3.1 `apps/docs/src/components/component-index.tsx`

Change the group heading (around line 169) from `<h3 className="mb-3 text-lg font-medium">`
to `<h2 …>`, and its closing tag. The groups are the page's top-level sections;
the component itself is rendered once, on `/docs/components` (plan 417).

### 3.2 `apps/docs/src/components/api-index.tsx`

Same change at its group heading (around line 27). The page's only other `##`
heading, **How the tables are generated**, is already an `h2`, so the groups
belong at that level.

### 3.3 `apps/docs/src/components/value-index.tsx`

Same change at its package heading (around line 48). **How the index is
generated** is already an `h2`.

### 3.4 `apps/docs/scripts/smoke-build.ts`

Replace the `<h1>` count with an outline check in `auditPage`:

```ts
const headingLevels = [
  ...page.body.matchAll(/<h([1-6])[^>]*>/g),
].flatMap((match) => {
  const level = match[1];
  return level === undefined ? [] : [Number.parseInt(level, 10)];
});
const h1Count = headingLevels.filter((level) => level === 1).length;
if (h1Count !== 1) fail(`expected one <h1>, found ${h1Count}`);
const jump = headingLevels.reduce<string | null>((found, level, index) => {
  if (found !== null) return found;
  const previous = headingLevels[index - 1];
  return previous !== undefined && level > previous + 1
    ? `h${previous} → h${level}`
    : null;
}, null);
if (jump !== null) fail(`heading order skips: ${jump}`);
```

This runs over every sitemap page, so it also protects the hand-written pages.
The 404 body keeps its own one-`<h1>` check.

### 3.5 `TODO.md` and the plan index

Add the row to the docs workstream (with the measured three pages), tick it, and
raise the count `99/99` → `100/100`; add `499-heading-outline.md` to the plan
index.

## 4. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter docs test` | every suite passes |
| 2 | `nub run --filter docs smoke:build` **before** the heading fix | exits `1` on the three pages with `heading order skips: h1 → h3` |
| 3 | `nub run --filter docs build` then `nub run --filter docs smoke:build --no-build` **after** the fix | exits `0`; 90 pages / 109 links |
| 4 | `nub run check` | test quality, lint, format and types pass |
| 5 | `nub run test` | every workspace test passes |

## 5. STOP conditions

- **STOP** if a heading change alters the sidebar or table of contents in a way
  that breaks `content.test.ts` or `component-pages.test.ts`. The index is a
  page, not a record; a failing page guard means the heading was not the only
  problem — read the failure before changing it.
- **STOP** if the crawl reports a jump on a hand-written page. That is a new
  defect, not this plan's: record it in `TODO.md` and fix the page in a
  separate change.
- **STOP** if the outline check reports a jump caused by Fumadocs' own chrome
  rather than page content. Report the heading and page; do not exempt the
  check, or the guarantee is void.

## 6. Test plan

| Test | Catches | Two-direction proof |
| ---- | ------- | ------------------- |
| `smoke:build` → one `<h1>` per page | a page losing its title heading (existing rule, kept) | covered by plan 439 |
| `smoke:build` → no level skips | any page whose generated section starts at `h3`, including a fourth index | run it before the fix: `/docs/components`, `/docs/api-reference` and `/docs/api-values` fail with `heading order skips: h1 → h3`; after the fix all 90 pass |
| the existing unit suites | the index data and links are unchanged by the element swap | `nub run --filter docs test` (55 files) |

## 7. Results

Implemented 2026-10-18.

- The three generated indexes now open their groups at `<h2>`; the group markup
  is otherwise unchanged, so the sidebar, filter, cards, links and class names
  are identical.
- `smoke:build` now checks the full outline of every sitemap page, not only the
  `<h1>` count. Measured with the check added and the headings untouched, the
  crawl exited `1` with exactly three problems:
  `/docs/api-reference: heading order skips: h1 → h3`,
  `/docs/api-values: heading order skips: h1 → h3` and
  `/docs/components: heading order skips: h1 → h3`. After the element swap the
  same crawl exits `0` over 90 pages / 109 links.
- The two-direction proof is the crawl itself: the check is what failed before
  the swap and what passes after it. A structural audit of the rendered document
  (90 pages) now reports no heading jump, no unlabelled control and no duplicate
  id.
- The docs suite is 55 files / 361 tests, unchanged by this plan. No page prose,
  registry record or inventory row changed.
