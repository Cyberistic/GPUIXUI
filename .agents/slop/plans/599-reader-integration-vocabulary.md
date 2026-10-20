# 599 — A reader's integration phrase reaches the page that answers it

**Phase:** F (documentation platform, search)
**Workstream:** docs-site
**Depends on:** 410, 419, 431, 566, 568, 574, 585, 590, 598
**Status:** implemented — §6 records the commands, the 52-test suite and the seven two-direction proofs

## 1. The measured defect

Plan 598 built the page-alias table and proved it works. A fresh sweep of the
reader's *integration* vocabulary — the words for wiring the library into an
app, for the type scale, for a keyboard convention and for the data-presentation
tasks — measures the same ranker limit on seven more queries. Measured
2026-10-20 at `7c5fe60d` against the real `search()` the `/api/search` route
calls:

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `react` | `/docs/tokens-api` | Getting started (absent from the top four) |
| `react provider` | `/docs/tokens-api` | Getting started (`#providers`) |
| `provider` | `/docs/components/toast` | Getting started (3rd) |
| `providers` | `/docs/tokens-api` | Getting started (2nd) |
| `mono` | `/docs/components/text#variants` | Typography (`#families`) |
| `mono font` | `/docs/components/text#variants` | Typography (`#families`) |
| `monospace` | `/docs/dark-mode#platform-and-mode-are-independent` | Typography (`#families`, 2nd) |
| `select row` | `/docs/components/select` | Data display |
| `selectable rows` | `/docs/components/select` | Data display (2nd) |
| `escape` | `/docs/components/command-menu#keyboard-and-focus` | Component API (`## Keyboard`) |
| `escape key` | `/docs/components/keycap` | Component API (`## Keyboard`) |
| `disabled` | `/docs/components/accordion#states` | Component API (`## State-aware styles`, 1st of seven hits) |
| `disabled state` | `/docs/components/empty-state` | Component API (`## State-aware styles`) |
| `how to install` | `/docs/components/toggle` | Installation |

Why each is structural:

- **The word belongs to a section, not a title.** `react` and `provider` are
  answered by the Tokens API's provider section and by a component page that
  happens to mention a provider; the page that *teaches* the wiring (Getting
  started, `## Providers`) has neither a title token nor a summary phrase that
  outranks them.
- **A component page wins a type-scale word.** `mono` is a Typography family
  name, but Text's `#variants` heading carries it. `monospace` returns the
  Dark mode platform table because that table names a mono face per platform.
- **A form control wins a data-presentation verb.** `select row` and
  `selectable rows` name the Tier 3 row-selection task, which Data display owns
  and Select does not.
- **A convention has no owner.** `escape`, `escape key` and `disabled` name the
  shared keyboard and state contracts, which Component API states once; today
  the query lands on whichever component page repeats the word most.
- **A stop-word phrase loses its verb.** `how to install` is the same shape as
  plan 590's `how to use`, which was aliased; the installation twin was missed.

## 2. What to build

### 2.1 Extend the page-alias table

`apps/docs/src/lib/page-aliases.ts` — add to the existing map. No new module and
no new rank: plan 598's exact-whole-query rule already answers this class.

```ts
["/docs/getting-started", ["how to use", "import", "imports", "react", "react provider", "provider", "providers"]],
["/docs/component-api", ["escape", "escape key", "disabled", "disabled state"]],
["/docs/data-display", ["select row", "selectable rows"]],
["/docs/installation", ["version", "versions", "how to install"]],
["/docs/typography", ["mono", "mono font", "monospace"]],
```

The header comment gains one sentence: the second measured pass covers the
integration vocabulary (plan 599).

### 2.2 The guards

Extend `apps/docs/src/lib/page-aliases.test.ts` — the mechanism's suite, so the
mechanism keeps one guard set:

- the `owned` table gains the fourteen queries above, each expecting its owning
  page **first**;
- the `regressions` table gains `select`, `keycap`, `text`, `empty state`,
  `command menu`, `toggle`, `installation`, `typography` — the pages each new
  term could steal;
- no new guard is needed: the eight plan-598 table guards already reject a key
  outside the page set, a component page, a shared term, and a term that
  shadows a page or component name.

### 2.3 The production check

`apps/docs/scripts/smoke-build.ts`'s `searchChecks` gains two `first: true`
rows: `react` → `/docs/getting-started` and `how to install` →
`/docs/installation`. Both are phrases the page index does not retrieve today,
so the check proves the alias against the served build.

### 2.4 The maintainer note

`apps/docs/README.md`'s page-alias paragraph gains one sentence: the second
measured pass, the seven words, and the two production queries. No new
paragraph — the mechanism is already documented.

### 2.5 Measured non-fixes (do not "fix" these)

| Query | Today | Why it stays |
| ----- | ----- | ------------ |
| `row selection` | `/docs/roadmap` | The roadmap promotes the target of that exact name; for an unshipped feature the roadmap is the honest answer |
| `motion`, `animation`, `easing` | Card, Accordion limitation, nothing | No motion tokens ship (`packages/tokens` plan 019 is in progress). Documenting motion is that plan's job; an alias to a page that cannot answer would be a misroute |
| `disabled button` | `/docs/components/button` | Already the right page; overriding it would steal a component's own name from a phrase that names it |
| `click`, `duration`, `transition` | host-boundary prose, component pages | Component-specific or host-specific; no page owns the word, and none of the three is a task a reader starts from |

## 3. Order of work and commands

Run from `apps/docs`.

1. `src/lib/page-aliases.ts`: the five entries and the header sentence.
2. `src/lib/page-aliases.test.ts`: the `owned` and `regressions` tables.
3. `nub run --filter docs test src/lib/page-aliases.test.ts` → every case passes.
4. The two-direction proofs in §5.
5. `scripts/smoke-build.ts` two queries; README sentence.
6. `nub run --filter docs check-types` → exit `0`.
7. `nub run --filter docs test` → exit `0`; record the file and test counts the
   run reports (never the expected number).
8. `nub run --filter docs smoke:build` → exit `0`, 99 pages, search checked.
9. Root gates: `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 4. STOP conditions

- Stop if a regression query changes owner; report the query and both results
  instead of adding a ranker tier.
- Stop if a term needs a rank other than `0`, or a prefix/inner-word match;
  that is plan 566's component rule, not the page rule.
- Stop if a term equals a page title, a component title/slug/part/props
  type/component alias, or another page's term. The owning page must be chosen
  differently or the term dropped.
- Stop if `smoke:build` cannot run (exit `2`); report it as unverified rather
  than a pass.
- Do not touch `motion`, `animation`, `easing` or `row selection` (§2.5).

## 5. Test plan

The two-direction proofs, each run and reverted:

1. Remove `"react"` from Getting started → the `react` case fails by name.
2. Remove the Component API entry → `escape` and `disabled` fail.
3. Remove `"select row"` → the case fails and `select row` returns Select again.
4. Remove `"monospace"` → the case fails.
5. Add `"select"` to Data display → the shadow guard fails by name.
6. Add `"mono"` to Typography **and** leave it on the table twice → the
   uniqueness guard fails by name.

Regressions checked by hand and recorded in §6: `select` → Select, `keycap` →
Keycap, `text` → Text, `command menu` → Command menu, `empty state` → Empty
state, `toggle` → Toggle, `typography` → Typography, `installation` →
Installation, `theme` → Theming, `disabled button` → Button, `row selection` →
Roadmap.

## 6. Measured results

Filled by the runs in §3. Nothing in this section may be written before the
command it reports has run.

### 6.1 What shipped

- `apps/docs/src/lib/page-aliases.ts` — five keys extended, fourteen terms
  added, and the header names the second measured pass.
- `apps/docs/src/lib/page-aliases.test.ts` — 52 tests now (was 31): the eight
  plan-598 table guards unchanged, 29 measured queries, 15 regressions.
- `apps/docs/scripts/smoke-build.ts` — `react` and `how to install` added.
- `apps/docs/README.md` — one sentence on the second pass and the non-fixes.

No ranker, no new module and no page content changed: the owning subjects were
already documented; only the vocabulary that reaches them was missing.

### 6.2 Commands run

From `apps/docs`:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test src/lib/page-aliases.test.ts` | 1 file / **52 tests** pass |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs test` | **111 files / 862 tests** pass |
| `nub run --filter docs smoke:build` | 99 pages, 220 links, 1 288 anchors, search checked, **exit `0`** |

From the repository root: `nub run check`, `nub run lint`, `nub run test` — all
exit `0` (the docs package reports 111 files / 862 tests).

### 6.3 Two-direction proofs (each run, then reverted)

| # | Forced defect | Measured failure |
| - | ------------- | ---------------- |
| 1 | remove `"react"` | `react → /docs/getting-started` fails: `expected '/docs/tokens-api' to be '/docs/getting-started'` |
| 2 | remove the Component API entry | 4 fail: `escape` → Command menu `#keyboard-and-focus`, `escape key` → Keycap, `disabled` → Accordion `#states`, `disabled state` → Empty state |
| 3 | remove `"select row"` | the case fails: `expected '/docs/components/select' to be '/docs/data-display'` |
| 4 | remove `"monospace"` | the case fails: `expected '/docs/dark-mode#platform-and-mode-are-independent' to be '/docs/typography'` |
| 5 | add `"select"` to Data display | `does not shadow a component title, name or alias` fails with `[ 'select' ]` |
| 6 | store `"mono"` twice | `uses a term for one page only` fails with `[ 'mono' ]` |
| 7 | remove `react` and `how to install`, then `smoke:build` | **exit `1`** naming both: `FAIL /api/search?query=react: … not under /docs/getting-started` and `FAIL /api/search?query=how%20to%20install: … not under /docs/installation`; restored → `smoke: search checked`, `smoke: ok` |

Regressions measured green in the same suite: `select` → Select, `keycap` →
Keycap, `text` → Text, `empty state` → Empty state, `command menu` → Command
menu, `toggle` → Toggle, `typography` → Typography, `installation` →
Installation, `theme` → Theming, `disabled button` → Button, `row selection` →
Roadmap.

