# 591 — Reader vocabulary, sixth pass: setup, testing, borders, shadows, overlays and helper text

**Phase:** F (search completeness)
**Workstream:** docs-site
**Depends on:** 410, 411, 413, 419, 431, 566, 568, 574, 579, 583, 585, 588, 590
**Status:** implemented

## 1. The measured defect

Measured on 2026-10-19 against the real docs search index
(`apps/docs/src/lib/search.ts`, the same index `/api/search` serves), first
result, limit 3:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `setup` | **nothing** | Installation (`/docs/installation`) |
| `test` | Component pages → `#the-gesture-vocabulary` | Native smoke suite (`/docs/native-testing`) |
| `testing` | Accessibility → `#related` | Native smoke suite |
| `border` | Tokens API → a paragraph chunk | Theming (`/docs/theming`) |
| `shadow` | Tokens API → `#functions` | Theming |
| `overlay` | Tokens API → `#functions` | Component API (`/docs/component-api`) |
| `compound` | Extending → `#related` | Component API |
| `helper text` | Text / typography | Inline validation (`/docs/components/inline-validation`) |
| `error message` | Message scroller → prose | Inline validation |
| `time` | Timeline | Time pickers (`/docs/components/time-picker`) |

Every owning page already exists. Eight queries are page-subject words the
authored summary does not name (the mechanism plan 568 made a signal and plan
574/579/583/588/590 extended). Two are component synonyms the record cannot
spell (`helper text`, `error message`) and one is a shorter name for a component
whose title starts with the same letters (`time` vs `Timeline`), which is the
guarded alias table's job (plan 566).

`overlay` is deliberately a **summary** word, not a promoted generated name:
plan 589's decision D51 keeps `overlay`/`portal` as prose so it does not steal
Tooltip's use of the word. Naming it in the Component API summary respects that
rule; promoting it to the layering index would not.

## 2. What to build

### 2.1 Authored summaries (the plan 568 mechanism)

Edit only the frontmatter `description`; no ranker rule changes. Each sentence
stays a natural description, not a keyword list. A whole word scores `1`, a
word prefix `2`, and every term of a phrase with a word prefix `3`, each plus
`DESCRIPTION_MATCH_RANK` (`4`), so any of them beats a prose chunk
(`Infinity`) and stays below a page title.

| File | New description |
| ---- | --------------- |
| `apps/docs/content/docs/installation.mdx` | `Add GPUIXUI to a GPUix application: setup, prerequisites and system requirements, platform support for the native binding targets on macOS, Linux and Windows, and the install commands.` |
| `apps/docs/content/docs/native-testing.mdx` | `The platform-free test harness, the testing commands and the playground adapter that prove GPUix behaviour.` |
| `apps/docs/content/docs/theming.mdx` | `Semantic colour roles, spacing, radius, border widths, shadows, density and elevation, light, dark and high-contrast themes, platform styles for macOS, Linux and Windows, and the extension mechanism.` |
| `apps/docs/content/docs/component-api.mdx` | `The conventions every component follows — parts, compounds, controlled state, state-aware styles, overlay layering, shared host props, keyboard and accessibility.` |
| `apps/docs/content/docs/components/inline-validation.mdx` | `Field-level error message and helper text around one input.` |

`inline-validation`'s record summary in
`apps/docs/src/component-meta/entries.ts` must change to the same sentence:
`component-pages.test.ts` requires a finished page's description to equal its
record's summary.

### 2.2 Guarded aliases (the plan 566 mechanism)

Add to `apps/docs/src/lib/component-aliases.ts`:

| Record | Terms |
| ------ | ----- |
| `inline-validation` | `helper text`, `error message` |
| `time-picker` | `time` |

Each term is a whole-query alias (`aliasMatchRank`), so `error message` and
`helper text` reach Inline validation at rank `0` while `message` and `error`
alone keep their current destinations. `time` is not a title or an exported
symbol, so the shadow guard allows it; the record document contains it in
`Time pickers`, so the index guard passes.

### 2.3 The URL slug is a name (measured separately)

A reader who copies a component's URL may type its slug. Measured the same day
against all 66 records, **8 slugs do not reach their page**:

| Slug | Before |
| ---- | ------ |
| `button-group` | Settings form pattern |
| `text-input` | Confirmation flow pattern |
| `text-area` | Settings form pattern |
| `radio-group` | Settings form pattern |
| `empty-state` | Project browser pattern |
| `command-menu` | Command palette pattern |
| `search-input` | Project browser pattern |
| `time-picker` | Date pickers |

The registry document is built from the title, summary, parts and props types,
and the ranker scores the same fields; the slug is the page's URL identity and
belongs in both. Add it in two places:

- `apps/docs/src/lib/search.ts` — `componentSearchIndex`'s `content` and
  `keywords` include `component.slug`, so the lexical index can retrieve it;
- `apps/docs/src/lib/search.ts` — `componentNames` includes `component.slug`,
  so an exact slug is ranked like an exact title (`0`).

This is not a new ranker rule: `matchRank` already scores a name; the slug was
simply missing from the name list. The change also makes `time-picker` reach
Time pickers without a second alias.

### 2.4 Tests

- `apps/docs/src/lib/search.test.ts` — one table test, ten queries above; each
  row's first result must be a `type: "page"` whose destination equals the
  owning page. The header comment names the measured defects and says each row
  fails when its summary word or alias is removed.
- `apps/docs/src/lib/search.test.ts` — one exhaustive slug test over
  `components`: `search(component.slug)` returns that component's page first.
  It fails for the eight slugs in §2.3 when the slug is dropped from either the
  document or the name list.
- `apps/docs/src/lib/search.test.ts` — one regression table: `theme`, `table`,
  `aria`, `spacing`, `radius`, `density`, `elevation`, `font`, `message`,
  `error` and `time picker` keep the pages earlier passes assigned, so the new
  words cannot steal them.
- `apps/docs/src/lib/component-aliases.test.ts` needs no new test: its existing
  guards cover the key, uniqueness, shadowing and indexing rules for both new
  rows.
- `apps/docs/scripts/smoke-build.ts` — three `first: true` production queries:
  `setup` → `/docs/installation`, `helper text` →
  `/docs/components/inline-validation`, `compound` → `/docs/component-api`.

## 3. Commands

Run in `apps/docs`:

```sh
nub run --filter docs test
nub run --filter docs check-types
nub run --filter docs smoke:build
```

Then in the repo root:

```sh
nub run check
nub run lint
nub run test
```

Expected: the docs suite grows by two tests and every one passes; `check-types`
exits `0`; `smoke:build` reports the same page count as before (98) and the
three new queries pass; the root gates exit `0`.

## 4. STOP conditions

- A query's first result is not the owning page **and** the summary/alias table
  above is already applied: stop, record the actual result in this plan, and do
  not add a ranker rule or a second keyword table.
- `component-aliases.test.ts` rejects a term (shared, shadowing, malformed, not
  indexed): stop and report which rule rejected it; do not weaken the rule.
- The page description and record summary differ: fix the copy, not the guard.
- A regression query loses its page: revert that summary word and report it.
- `smoke:build` page count changes: stop; a description edit must not add or
  remove a page or a link.

## 5. Acceptance

- The ten queries in §2.3 return their owning page first.
- The eleven regression queries keep their previous destinations.
- All existing docs tests, type checks, the built-site crawl, the root gates and
  the two-direction proofs in §6 pass.
- `TODO.md` ticks the task and the plan index lists this plan as implemented.

## 6. Measured results

Run on 2026-10-19 in `apps/docs`:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 105 files / **760 tests** pass (757 before; 3 new) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages, 121 links, 1 283 anchors, search checked, exit `0` |
| `nub run check` (root) | exit `0` |
| `nub run lint` (root) | exit `0` |
| `nub run test` (root) | every workspace green; `apps/docs` 760, `packages/primitives` 282, `packages/components` green |

All ten §1 queries now return their owning page first, all 66 slugs return
their own page, and all eleven regression queries keep their destinations.

### Two-direction proofs

Each was measured by applying the defect and running
`nub exec vitest run src/lib/search.test.ts`, then reverting it:

1. Reverting Installation's summary → `setup -> nothing:nothing`, one failing
   row in the sixth-pass table.
2. Dropping the slug from `componentNames` → the exhaustive slug test failed
   with 25 destinations, including the eight measured in §2.3
   (`button-group`, `text-input`, `text-area`, `radio-group`, `empty-state`,
   `command-menu`, `search-input`, `time-picker`).
3. Removing the `helper text` alias → `helper text -> page:/docs/components/text`
   in the sixth-pass table.

