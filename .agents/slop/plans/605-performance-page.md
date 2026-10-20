# 605 — Performance: what the runtime measurably does with large data

Status: implemented
Phase: F (integration and polish — the "performance" half)
Depends on: 410 (site), 412 (preview tiers), 448 (capability matrix),
140/152/153/154 (the native virtualisation probes), 574/598 (summary and
page-alias search rules)

## 1. The measured gap

Measured 2026-10-20 on `agent/docs-site` at `67cdee11`, by running the real
`search()` from `apps/docs/src/lib/search.ts` over the production index:

| Query | First result before this plan |
| ----- | ----------------------------- |
| `performance` | **nothing** |
| `benchmark` | **nothing** |
| `fps` | **nothing** (Token-search fragment) |
| `frame rate` | Rating (a rating's `frames`?) — not a performance page |
| `10k rows` | List — a *non*-virtualised component |
| `memory` | Command menu limitation prose |
| `localization` | **nothing** |

The site states virtualisation facts in three separate places — `Data display`
(the probe paragraph), `GPUix capabilities` (the measured matrix) and the
`List` page's "No virtualisation: every row mounts" limitation — but no page
answers the reader's actual question: *how many rows can this handle, what does
it cost, and what has nobody measured?* `MISSION.md` lists **performance** in
Phase F and asks for honest limits; the repository has four native probes and a
measured window, and the site never puts them together.

The page must not invent numbers. Every count it states is derived from the
shipped probe source, and its "not measured" section states the absences that
would otherwise read as claims (frame time, memory, startup).

## 2. What the page states, and the source of each fact

| Claim | Source |
| ----- | ------ |
| `<virtual-list>` retains every row and paints a window around the viewport | `apps/playground/src/scenarios/virtual-list.tsx` header; `src/lib/capabilities.ts` (`virtual-list`) |
| The probe declares 5 000 rows (child count 5 000, painted count ~9) | `const ROWS = 5000` in `virtual-list.tsx`; `capabilities.ts` "about nine" |
| The table probe declares 500 fixed-height (32 px) rows in 220/100/80 px cells | `const ROWS = 500`, `ROW_HEIGHT = 32`, `COLUMNS` in `virtual-table.tsx` |
| A painted row is hittable and selection survives the row leaving and re-entering the window | `virtual-table.tsx` steps; plan 152 §8 |
| `onVisibleRange` reports the pre-gesture range | `virtual-list.tsx` step comment; plan 152 §8 |
| The log probe starts at the tail and re-anchors on append; no snap-back after a scroll | `apps/playground/src/scenarios/log-viewer.tsx`; plan 154 §8 |
| The tree probe's indentation is exact per depth and expand/collapse repaints | `apps/playground/src/scenarios/tree.tsx`; plan 153 §8 |
| `List` mounts every row; long collections belong in `<virtual-list>` | `content/docs/components/list.mdx` limitation (existing) |
| The live WebAssembly surface is a ~20 MB download | `apps/docs/README.md` (tier L), `src/components/preview/live-surface.*` |

Explicitly **not** claimed: a frame rate, a memory figure, a startup time, or a
maximum row count. The probes are evidence of behaviour, never a benchmark.

## 3. Files to create or change

1. **Create** `apps/docs/content/docs/performance.mdx`
   - Frontmatter: `title: Performance`; a description naming *performance, large
     lists, virtualized rows, the painted window and what is not measured*. The
     description is a search signal (plan 568) and must **not** contain
     `virtualized` alone in a way that steals the pinned `virtualized → Data
     display` rule (plan 574) — use "virtualised rows" only if the test still
     passes; otherwise "virtual rows".
   - `<CapabilityMatrix only={["virtual-list", "table", "tree", "log"]} />`.
   - `## What is measured` — the four probes, each with its scenario id and what
     it establishes; counts stated as `5,000` and `500` (comma-formatted).
   - `## The painted window` — the cost model and its four consequences (fixed
     row height, painted-row hit-testing, the one-gesture `onVisibleRange` lag,
     selection surviving the window).
   - `## Choosing a container` — a Markdown table: `List` (small), the
     `<virtual-list>` table pattern (thousands), the log probe (tail), the tree
     probe (hierarchy), `Message scroller` (chat tail). Every linked component
     is a real page.
   - `## What is not measured` — frame time, memory, startup and bundle cost,
     and that the probe sizes are not limits. Must contain the words
     `frame`, `memory` and `startup`.
   - `## Running the probes` — the exact commands:
     ```sh
     nub run --filter playground build
     nub apps/playground/dist/smoke/run.js --only virtual-list-window --only virtualized-table --only tree-view --only log-viewer
     ```
   - A closing paragraph naming the limitation honestly: the numbers are
     behaviour measurements from one host, not a benchmark suite.

2. **Change** `apps/docs/content/docs/meta.json` — add `"performance"` after
   `"capabilities"` (measured support, then measured data volume). This is
   required by `content.test.ts` ("orders every top-level page on disk in the
   sidebar").

3. **Change** `apps/docs/src/lib/page-aliases.ts` — one always-on-vocabulary
   entry for `/docs/performance` with the whole-query aliases the measurement
   showed dead:
   `benchmark`, `benchmarks`, `fps`, `frame rate`, `frames per second`,
   `10k rows`, `10000 rows`, `memory`, `memory usage`, `slow list`,
   `slow table`.
   Do **not** add `large list` or `virtualized`: both already resolve to a page
   (List and Data display) and the pinned tables in `search.test.ts` /
   `page-aliases.test.ts` must keep them. Extend the file's header comment with
   the sixth pass and this page's vocabulary.

4. **Change** `apps/docs/src/lib/search.test.ts` — one new case in the measured
   tables: `performance`, `benchmark`, `frame rate`, `10k rows` and `memory`
   each return `/docs/performance` first, and the existing pinned rows
   (`table`/`tables`/`virtualized` → Data display, `list` → List) still pass.

5. **Create** `apps/docs/src/performance-page.test.ts` — the guard (§5).

6. **Change** `apps/docs/scripts/smoke-build.ts` — one production search check:
   `benchmark` → `/docs/performance`, `first: true`. (`performance` itself is
   also acceptable; use the alias so the check proves the vocabulary entry and
   not only the title.)

7. **Change** `apps/docs/content/docs/data-display.mdx` — one sentence linking
   `/docs/performance` from the virtualisation paragraph, so the subject page
   points at the reading it owns.

8. **Docs index**: add the plan row to `.agents/slop/plans/README.md`, and a
   task row in `TODO.md` under the docs-site workstream. Record the measured
   before/after queries in this plan's §6 after implementation.

## 4. Commands and expected results

Run inside the worktree (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`), in
this order.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter docs check-types` | exit 0; `fumadocs-mdx` regenerates and both `tsc` projects pass |
| 2 | `nub run --filter docs test` | exit 0; the previous 953 tests plus the new ones; the new guard is named in the output |
| 3 | `nub run --filter docs smoke:build` | exit 0; the page count is the previous total + 1; the `benchmark` production query passes |
| 4 | `nub run check` (repo root) | exit 0; `check:tests`, lint, format and types |
| 5 | `nub run lint` / `nub run test` are covered by the root gate for this change; run them if any file outside `apps/docs` changed | exit 0 |

The native probes are **not** re-run for this plan: the page reports measurements
already recorded by plans 140/152/153/154, and §5's guard pins the numbers to the
shipped scenario sources so they cannot drift silently. If a probe must be
re-run, the command is in the page and requires `--only <id>` (never `--all`
while iterating).

### STOP conditions

- `search()` returns a **different** first result for a pinned query after the
  alias entry, e.g. `large list` or `virtualized` moves off List/Data display.
  STOP: narrow or remove the alias; do not edit the pinned test.
- A row count in `virtual-list.tsx` or `virtual-table.tsx` differs from the
  numbers this plan quotes. STOP: use the source value, and note the difference
  in §6.
- `smoke:build` reports a page count that did not grow, or a sitemap page is not
  in the sidebar. STOP: the `meta.json` edit did not apply.
- Any test asks for a number the page cannot derive (a frame rate, a memory
  figure). STOP: the test is testing a claim the repository cannot support.

## 5. Test plan

`apps/docs/src/performance-page.test.ts` — header comment states the bug:
*the site documented virtualisation in three fragments and answered `performance`,
`benchmark` and `fps` with nothing, while the probe's row counts could drift from
any page that repeated them.*

| Test | What it catches | Two-direction proof |
| ---- | --------------- | ------------------- |
| reads `const ROWS = <n>` from both scenario files and requires the page to contain the comma-formatted values | the page remembering a count the probe changed | change `5000` to `6000` in the scenario → test fails naming the expected string; revert |
| every scenario id the page names comes from `capabilities.ts`, and the four performance capabilities are named | a renamed or removed probe the page still cites | rename `virtualized-table` in `capabilities.ts` → test fails; revert |
| `<CapabilityMatrix only={...}>` lists exactly `virtual-list`, `table`, `tree`, `log` | a subset that silently drops a probe | remove `log` from the page → test fails; revert |
| `## What is not measured` names frame time, memory and startup | the honesty section being trimmed to a sentence | delete the memory bullet → test fails; revert |
| the page contains no timing claim (`\d+ fps`, `\d+ ms`) | a benchmark invented to make the page look stronger | add "60 fps" → test fails; revert |
| the page links `/docs/data-display`, `/docs/capabilities` and `/docs/native-testing` | a page that cannot be reached from or to the measured evidence | remove a link → the existing `internal-links`/new assertion fails |

`src/lib/search.test.ts` additions are the reader-level proof: the five queries
must return the page **first**, not merely somewhere in the top ten.

## 6. Results

Implemented 2026-10-20.

**Reader-level search, measured through the real `search()`:**

| Query | Before | After |
| ----- | ------ | ----- |
| `performance` | nothing | `/docs/performance` (page) |
| `benchmark` | nothing | `/docs/performance` (page) |
| `fps` | nothing | `/docs/performance` (page) |
| `frame rate` | Rating | `/docs/performance` (page) |
| `10k rows` | List | `/docs/performance` (page) |
| `memory` | Command menu prose | `/docs/performance` (page) |
| `virtualized` | Data display | **unchanged** — Data display |
| `list` | List | **unchanged** — List |

**Guard, keyed to the shipped probes.** `src/performance-page.test.ts` (6 tests)
derives `5,000` and `500` from `const ROWS` in
`apps/playground/src/scenarios/{virtual-list,virtual-table}.tsx`, derives the
matrix subset from `capabilities.ts`, and asserts the page's "not measured"
section names frame time, memory and startup. Four forced defects were run and
reverted:

1. page states `6,000 rows` → "states the row counts the scenarios declare"
   fails with `to contain '5,000 rows'`;
2. scenario declares `const ROWS = 6000` → the same test fails with
   `to contain '6,000 rows'` (the page follows the source, not a memory);
3. the memory bullet is replaced with "every row is retained by design" →
   "states the measurements it does not have" fails on `memory`;
4. `60 fps` is added to the introduction → "claims no duration it cannot
   measure" fails with `[ '60 fps' ]`;
5. `log` is removed from the matrix subset → "renders every capability its
   cited probes prove" fails on the missing key.

**Gates run** (recorded here, not claimed):

- `nub run --filter docs check-types` — exit 0.
- `nub run --filter docs test` — 116 files / 971 tests, exit 0.
- `nub run --filter docs smoke:build` — exit 0; **101 pages** (was 100),
  223 links, 1 316 anchors, `search checked`, and the new `benchmark`
  production query passed.
- `nub run check` (root: test-quality, lint, format, every package's types) —
  exit 0 after `oxfmt` formatted the new test file.
- `nub run lint` — exit 0.
- `nub run test` (root) — exit 0; the docs suite is the 116/971 above.

The native probes themselves were **not** re-run: this change reports
measurements already recorded by plans 140/152/153/154, and the guard pins every
number it repeats to the scenario source.

## 7. Acceptance criteria

- `performance`, `benchmark`, `fps`, `frame rate`, `10k rows` and `memory`
  return `/docs/performance` first in the real index.
- The page states both probe row counts from source, renders the four
  capability rows, and contains an explicit "what is not measured" section.
- No pinned search expectation moved.
- `nub run check`, `nub run lint`, `nub run test`, the docs suite and
  `smoke:build` all pass; the new page is in the sitemap, the sidebar and the
  built crawl.
- `TODO.md`, this index and `apps/docs/README.md` (if it names the page set) are
  current.
