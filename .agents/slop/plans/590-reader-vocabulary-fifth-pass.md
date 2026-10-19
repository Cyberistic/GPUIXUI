# 590 — Reader vocabulary, fifth pass: the quickstart, overview, props table and repository words

**Phase:** F (search completeness and contribution docs)
**Workstream:** docs-site
**Depends on:** 410, 411, 413, 419, 431, 568, 574, 579, 583, 588
**Status:** implemented

## 1. The measured defect

Measured on 2026-10-19 against the real docs search index
(`apps/docs/src/lib/search.ts`, the same index `/api/search` serves), first
result, limit 3:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `quickstart` | **nothing** | Getting started (`/docs/getting-started`) |
| `hello world` | Accessibility (`/docs/accessibility`) | Getting started |
| `overview` | **nothing** | Introduction (`/docs`) |
| `props table` | Component pages → `#the-guards` | API reference (`/docs/api-reference`) |
| `appearance` | Range slider → `#variants` | Dark mode (`/docs/dark-mode`) |
| `system appearance` | **nothing** | Dark mode |
| `github` | **nothing** | Contributing (`/docs/contributing`) |
| `bugs` | **nothing** | Contributing |
| `issues` | **nothing** | Contributing |

`system theme` is deliberately **not** in the table: the Switch live scene paints
the assertion text `System theme applied` and its instruction says "turn the
system theme on", so the scene index honestly owns that phrase (plan 582). The
concept the Dark mode page owns — the OS appearance the runtime does not
expose — is `system appearance`.

Every owning page already exists; only its authored summary (which plan 568
made a search signal) does not name the reader's word. The Contributing page is
the exception in a second way: it has **no repository, issue or pull-request
link at all**, so `github`, `bugs` and `issues` have nothing honest to match.
`MISSION.md` requires a "clear contribution and maintenance workflow", and the
page currently describes the gates without saying where a change goes.

`hello world` returning Accessibility is the visible failure: the index matched
the words inside unrelated prose and no page claimed the phrase.

## 2. What to build

### 2.1 Authored summaries (the plan 568 mechanism)

Edit only the frontmatter `description`; do not add a ranker rule. Each sentence
must stay a natural description of the page, not a keyword list.

| File | New description |
| ---- | --------------- |
| `apps/docs/content/docs/getting-started.mdx` | `The quickstart: render a GPUix window, mount a theme provider and place the first GPUIXUI component (hello world).` |
| `apps/docs/content/docs/index.mdx` | `An overview of GPUIXUI: a native UI component library rendered by GPUix — not a webview — documented honestly.` |
| `apps/docs/content/docs/api-reference.mdx` | `Props, types and defaults for every component, as generated props tables.` |
| `apps/docs/content/docs/dark-mode.mdx` | `Switch light, dark and high-contrast themes from application state; the library ships no OS appearance listener, so the application owns the system theme.` |
| `apps/docs/content/docs/contributing.mdx` | `How to work on GPUIXUI on GitHub, where to report bugs or open issues and pull requests, and the gates a change must pass.` |

Each added word is a whole word in the description, so
`descriptionMatchRank` scores it `1` (exact) or `3` (every phrase term is a word
prefix), plus `DESCRIPTION_MATCH_RANK` (`4`). That beats a prose chunk
(`Infinity`) and stays one tier below a page title, which is exactly plan 568's
contract.

### 2.2 `apps/docs/content/docs/contributing.mdx` — a real destination

Add `## Issues and pull requests` after `## Worktrees` and before `## Gates`:

- The source is at `https://github.com/Cyberistic/GPUIXUI`.
- Report a bug or request a change as a GitHub issue; send a fix as a pull
  request.
- A component change also needs its docs page and inventory record, linking to
  `#components` and `/docs/component-pages`.

No new external-links guard is added: the repository URL is a stable product
fact, and the built-site smoke already fails on dead **internal** links. The
section itself is guarded by `docs-checks.test.ts`.

### 2.3 Tests

- `apps/docs/src/lib/search.test.ts` — one table test, nine queries, first
  result's destination must equal the owning page. The comment names the defect
  and says each row fails when its summary word is removed.
- `apps/docs/src/lib/search.test.ts` — one regression table: `theme`,
  `table`, `aria` and `webview` keep the pages earlier passes assigned, so the
  new summary words cannot steal them.
- `apps/docs/src/docs-checks.test.ts` — a `Contributing page checks` case that
  requires `## Issues and pull requests` and the repository URL in the page.
- `apps/docs/scripts/smoke-build.ts` — four production queries, all `first:
  true`: `quickstart` → `/docs/getting-started`, `props table` →
  `/docs/api-reference`, `appearance` → `/docs/dark-mode`, `github` →
  `/docs/contributing`.

## 3. Files touched

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/getting-started.mdx` | description |
| `apps/docs/content/docs/index.mdx` | description |
| `apps/docs/content/docs/api-reference.mdx` | description |
| `apps/docs/content/docs/dark-mode.mdx` | description |
| `apps/docs/content/docs/contributing.mdx` | description and the issues/PR section |
| `apps/docs/src/lib/search.test.ts` | two query tables |
| `apps/docs/src/docs-checks.test.ts` | section and URL guard |
| `apps/docs/scripts/smoke-build.ts` | four production queries |
| `.agents/slop/plans/README.md`, `TODO.md` | index and result |

## 4. Commands and expected results

```sh
cd apps/docs
nub exec vitest run src/lib/search.test.ts src/docs-checks.test.ts
# Before implementation: the nine-query table fails by query and the
# Contributing section guard fails. After: both pass (the search file has a
# 120 s cold-index budget).

nub run --filter docs test
# Expected: every docs test passes.

nub run --filter docs check-types
# Expected: exit 0.

nub run --filter docs smoke:build
# Expected: exit 0; the four production queries are listed in the search
# section of the output.
```

## 5. Test plan (two directions)

| Test | What it catches | Forced defect |
| ---- | --------------- | ------------- |
| nine-query table | a page summary that stops naming the reader's word | delete `quickstart` from Getting started's description → `quickstart -> /docs/accessibility` or `nothing` |
| nine-query table | the wrong page answering a phrase | delete `hello world` → `hello world -> /docs/accessibility` |
| nine-query table | the props subject falling back to prose | delete `props tables` → `props table -> /docs/component-pages#…` |
| regression table | a new word stealing an earlier owner | add `theme` as a whole word to another summary and confirm the existing title rank still wins; the test guards `theme`, `table`, `aria`, `webview` |
| Contributing section | a contributor with no destination | delete `## Issues and pull requests` → `docs-checks.test.ts` fails |
| production queries | the same table only passing in unit tests | the built index must answer each query first after `smoke:build` |

Run each forced defect, record the observed failure, then restore the file and
re-run.

## 6. Acceptance

- Nine measured queries reach their owning page first; four of them also pass
  against the production index.
- The Contributing page links the repository and says where an issue or pull
  request goes.
- `nub run --filter docs test`, `check-types`, and `smoke:build` pass.
- No new ranker rule: the fix is authored metadata plus one real section.

## 7. Results (measured 2026-10-19)

The two query tables failed on the pre-fix content exactly as §1 recorded:

```
quickstart -> nothing:nothing
hello world -> page:/docs/accessibility
overview -> nothing:nothing
props table -> text:/docs/component-pages
appearance -> text:/docs/components/range-slider
system appearance -> nothing:nothing
github -> nothing:nothing
bugs -> nothing:nothing
issues -> nothing:nothing
```

`system theme` was removed from the table after measurement: the Switch live
scene paints `System theme applied` and its instruction says "turn the system
theme on", so the scene index already owns that phrase honestly. The Dark mode
page's concept is `system appearance`.

Forced defects (each observed, then restored):

| Forced change | Observed failure |
| ------------- | ---------------- |
| `The quickstart:` → `The guide:` | `quickstart -> nothing:nothing` |
| remove `(hello world)` | `hello world -> page:/docs/accessibility` |
| remove `as generated props tables` | `props table -> text:/docs/component-pages` |
| `## Issues and pull requests` → `## Contact` | `docs-checks.test.ts` fails on the missing heading |

Green after restore:

- `nub run --filter docs test` — 105 files / 757 tests.
- `nub run --filter docs check-types` — exit 0.
- `nub run --filter docs smoke:build` — 98 pages, 121 links, 1 283 anchors,
  search checked, not-found and robots checked, exit 0. The four new
  production queries are part of `smoke: search checked`.
- Root `nub run check`, `nub run lint` and `nub run test` — exit 0.

