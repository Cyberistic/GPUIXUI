# 585 — Search reaches an inflected page name and the words a roadmap target is known by

**Workstream:** docs-site (`apps/docs`, search, information architecture).
**Phase:** F (integration and polish).
**Depends on:** 410 (site), 419/431/561 (ranker), 504–507 (generated
documents), 566/574/579/583 (reader vocabulary and page summaries), 518
(roadmap document).
**Status:** implemented — measured results and forced defects in §8.

## 1. The measured gap

Measured 2026-10-19 against the production build (`nub run --filter docs build`,
then `/api/search?query=…&limit=3`) at the plan-584 commit. The first result is
the destination a reader gets:

| Query | First result now | What the reader wanted |
| ----- | ---------------- | ---------------------- |
| `theme` | `/docs/tokens-api` (page) | Theming |
| `capability` | a text chunk of `/docs/native-testing` | GPUix capabilities |
| `tree` | a Checkbox limitations chunk | Data display (tree views) |
| `log` | Dialogs (page) | Data display (log viewers) |
| `diff` | a Spacer limitations chunk | Roadmap (`Diff viewer`) |
| `editor` | an Architecture packages chunk | Roadmap (`Code editor integration`) |
| `markdown` | a Text-area limitations chunk | Roadmap (`Rich-text editing`) |
| `drag` | a Carousel limitations chunk | Roadmap (`Drag and drop`) |
| `toolbar` | a Popover composition chunk | Roadmap (`Toolbars`) |
| `keybinding` | **nothing** | Keycap / Keyboard shortcuts |
| `chart` / `charts` | Roadmap (page) | Data display (charts) |
| `key value` | Roadmap (page) | **not a gap** — the phrase names the promoted target `Key-value displays`; plan 564's target rule legitimately keeps the row, and Data display's summary names the subject beneath it |
| `focus` | a Native-testing chunk | Accessibility |
| `rich text` | Text (page) | Roadmap (`Rich-text editing`) |

Two different causes:

1. **The name matcher compares spellings, not words.** `matchRank` treats
   `theme` vs `Theming` and `capability` vs `capabilities` as different words
   (prefix matching cannot cross the `e`/`ing` or `y`/`ies` boundary), so the
   page's own title earns no rank and a body chunk or another page's description
   wins. The same rule is why the *singular* of a page title can miss while the
   plural works.
2. **A multiword generated name is promoted only for the whole name or a
   multiword phrase.** The roadmap promotes `Diff viewer`, `Drag and drop`,
   `Code editor integration`, `Rich-text editing` and `Toolbars`, so `diff
   viewer` and `code editor` reach the page but `diff`, `drag`, `editor`,
   `markdown` and `toolbar` do not. A reader names the thing, not its inventory
   title.

`tree`, `log`, `chart` and `key value` are not roadmap-only: Data display is the
page that owns the subject (it renders the measured tree, log and virtual-list
matrix and links the roadmap). Its summary does not name them, so the
description rule (plan 568) cannot score it. The same is true of `focus` and the
Accessibility page.

## 2. The fix, in four parts

All four are measured rules, not memory. Each one has a guard that fails by
query when the rule is removed.

### 2.1 Match a word's inflected form (ranker)

`apps/docs/src/lib/search.ts`:

- Add a module-local `stem(word)` that normalises only the forms English titles
  use:
  - plural `-ies` → `-y` (`capabilities` → `capability`);
  - plural `-es` after `s/x/z/ch/sh`, otherwise `-s` (never `-ss`, `-us`,
    `-is`);
  - gerund `-ing`, collapsing a doubled final consonant (`running` → `run`);
  - silent final `-e` (`theme` → `them`);
  - stems shorter than three characters stay as they are.
- Use it **only after** the existing exact/prefix checks in `matchRank`, so
  rank `0` is untouched and the new tiers are:
  - a word whose stem equals the query stem → the existing prefix rank (`1`
    for a single-word name, `2` for a word inside a multiword name);
  - a word whose stem starts with the query stem (or the reverse) → rank `2`.
- Leave the substring rank (`3`) on the original spelling: a fragment inside a
  word still matches, exactly as plan 568 measured.
- Do not use the stem in `aliasMatchRank` or `promotedNameRank`; aliases are
  editorial exact terms, and a promoted name is a name.

Expected after this part: `theme` → `/docs/theming` first; `capability` →
`/docs/capabilities` first; `themes`, `capabilities` likewise.

### 2.2 The pages that own a subject name it (authored summaries)

- `apps/docs/content/docs/data-display.mdx` description gains the Tier 3
  subjects it renders: **tree views, log viewers, charts, key-value displays**.
  Keep the existing words (`Tables`, `datagrids`, `selection`, `virtualized`).
  A two-word phrase that exactly words a promoted roadmap target (`key value` →
  `Key-value displays`) keeps the roadmap row: plan 564's target rule outranks a
  description, by design. The summary still names the subject for the reader
  who opens the page from the roadmap.
- `apps/docs/content/docs/accessibility.mdx` description gains **keyboard
  focus** (the page already documents the focus substitutes and the
  `focusVisible` absence).
- Do **not** add `tables` or `panels` to the Roadmap summary: Data display and
  Workspace own those words, and a longer title-shorter tie-break would move
  them to Roadmap.

Expected after this part: `tree`, `log`, `chart(s)` and `key value` reach
`/docs/data-display` first; `focus` reaches `/docs/accessibility` first;
`table`, `panel`, `input`, `label` keep their current first result.

### 2.3 The roadmap promotes the one-word names of its multiword targets

New file `apps/docs/src/lib/roadmap-aliases.ts`, in the shape of
`component-aliases.ts` (plan 566):

```ts
export const roadmapAliases: ReadonlyMap<string, readonly string[]> = new Map([
  ["Diff viewer", ["diff"]],
  ["Code editor integration", ["editor"]],
  ["Drag and drop", ["drag"]],
  ["Rich-text editing", ["markdown", "rich text"]],
  ["Toolbars", ["toolbar"]],
]);
```

`apps/docs/src/lib/roadmap-search.ts` adds these terms to
`roadmapSearchEntry.names` (the multiword target names stay). An exact term is
rank `0` through the existing `promotedNameRank`, so it outranks prose without a
new ranker rule.

Guards in `apps/docs/src/lib/roadmap-search.test.ts`:

- every key is a real `roadmapTargets` name;
- every term is lower-case and trimmed, and appears (case-insensitively) in the
  target's own `name` or `note` — no invented vocabulary;
- no term is shared between targets;
- no term equals a component title or exported symbol, a page title, or another
  component alias (the misroute class);
- each term is in `roadmapSearchEntry.names`.

Expected after this part: `diff`, `editor`, `drag`, `markdown`, `rich text` and
`toolbar` reach `/docs/roadmap` first; `diff viewer`, `code editor`, `drag and
drop`, `rich text editing` keep reaching it through plan 564's variant rule.

### 2.4 The last missing reader word: keybindings

`apps/docs/src/lib/component-aliases.ts` adds to the `keycap` row:
`keybinding`, `keybindings`, `key binding`, `key bindings`.

The existing table guards (`component-aliases.test.ts`) prove the terms are
lower-case, unshared, non-shadowing and present in the record's search document.

Expected after this part: `keybinding` and `keybindings` reach
`/docs/components/keycap` first.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.ts` | `stem` + inflected matching in `matchRank` |
| `apps/docs/src/lib/search.test.ts` | one measured table (14 queries) and three `mergeResults` cases |
| `apps/docs/src/lib/roadmap-aliases.ts` | new guarded table |
| `apps/docs/src/lib/roadmap-search.ts` | append alias terms to `names` |
| `apps/docs/src/lib/roadmap-search.test.ts` | four table guards |
| `apps/docs/src/lib/component-aliases.ts` | four `keycap` terms |
| `apps/docs/content/docs/data-display.mdx` | description names four subjects |
| `apps/docs/content/docs/accessibility.mdx` | description names keyboard focus |
| `apps/docs/scripts/smoke-build.ts` | four production queries |
| `apps/docs/README.md` | the plan-585 paragraph under `## Search` |
| `.agents/slop/plans/README.md` | index row |
| `TODO.md` | tick the task; keep the progress bar current |

No preview, registry, component or package change is involved.

## 4. Steps and exact commands

1. Edit the files above.
2. `cd apps/docs && nub run test`
   - Expected: every suite passes; the new plan-585 tests are among them.
3. Prove each direction before ticking (see §5); record the measured
   before/after in §8 of this plan.
4. `nub run lint`
   - Expected: exit `0`.
5. `nub run check`
   - Expected: exit `0`; `check:tests` accepts every new test.
6. `nub run --filter docs smoke:build`
   - Expected: build, crawl (98+ pages), search checks including the four new
     queries, exit `0`.
7. Update `README.md`, the plan index and `TODO.md`; commit and push
   `agent/docs-site`.

## 5. Test plan (each test must be able to fail)

`apps/docs/src/lib/search.test.ts`:

- **Plan-585 measured table** — one query per row, first result must be the
  owning page after removing the fragment:
  `theme` → Theming, `capability` → GPUix capabilities, `tree` → Data display,
  `log` → Data display, `chart`/`charts` → Data display, `focus` →
  Accessibility, `diff`/`editor`/`drag`/`markdown`/`rich text`/`toolbar` →
  Roadmap, `keybinding` → Keyboard shortcuts (14 queries).
- **Target phrase boundary** — `key value` stays on `/docs/roadmap`; the test
  guards the rule from §2.2 and fails if a description starts outranking a
  promoted target.
- **Inflected title** — `mergeResults` fixture: a page candidate titled
  `Theming` against a prose candidate sorts first for `theme`; the same fixture
  with `matchRank`'s stem branch removed fails.
- **Plural and gerund** — `capabilities` finds `GPUix capabilities`, and a
  component named `Buttons` is found by `button` (guards the plural path and the
  no-regression path).
- **Ownership stays put** — `table` → Data display, `panel` → Workspace,
  `input` → Text inputs, `label` → Labels, `menu` → Context menus. These are the
  words the new summaries and aliases must not steal.

`apps/docs/src/lib/roadmap-search.test.ts`:

- every alias target exists; every term is in the target's name or note; no
  shared term; no shadowing of a component title/symbol, page title or
  component alias; every term is promoted.

Two-direction proofs to record in §8 of this plan:

1. Remove the `stem` branch → `theme` and `capability` rows fail by name.
2. Remove `tree views` from Data display's description → `tree` fails; remove
   `keyboard focus` from Accessibility → `focus` fails.
3. Remove `diff` from `roadmapAliases` → `diff` returns the Spacer chunk again.
4. Remove `keybinding` from the keycap alias row → the query returns nothing.

## 6. STOP conditions

- A measured query still lands on its old destination after the change.
- `table`, `panel`, `input` or `label` changes first result.
- An alias term shadows a component title, exported symbol, page title or
  another component alias.
- The stemming rule changes an exact-match (`rank 0`) ordering, or a test that
  would pass without the stem branch is added.
- `smoke:build` reports fewer pages than before (a page lost from the tree).
- `nub run lint` or `nub run check` fails on a rule that cannot be fixed inside
  `apps/docs` — record the failure and stop, do not weaken the gate.

## 7. Acceptance

- The 14 measured queries return their owning page first, from the real index.
- The four existing ownership queries are unchanged.
- Every new guard fails when its rule is removed (measured, not asserted).
- `nub run test`, `nub run lint`, `nub run check` and
  `nub run --filter docs smoke:build` are green.
- `README.md`'s search section, the plan index and `TODO.md` describe the rule
  and the measured result.

## 8. Measured runs (2026-10-19)

Baseline, production build at the plan-584 commit (`/api/search`, first result):

| Query | Before | After |
| ----- | ------ | ----- |
| `theme` | `/docs/tokens-api` | `/docs/theming` |
| `capability` | text `/docs/native-testing#the-check-model` | `/docs/capabilities` |
| `tree` | text `/docs/components/checkbox#accessibility-and-limitations` | `/docs/data-display` |
| `log` | `/docs/components/dialog` | `/docs/data-display` |
| `chart` / `charts` | `/docs/roadmap` | `/docs/data-display` |
| `focus` | text `/docs/native-testing#the-host-boundary` | `/docs/accessibility` |
| `diff` | text `/docs/components/spacer#accessibility-and-limitations` | `/docs/roadmap` |
| `editor` | text `/docs/architecture#library-packages` | `/docs/roadmap` |
| `drag` | text `/docs/components/carousel#accessibility-and-limitations` | `/docs/roadmap` |
| `markdown` | text `/docs/components/text-area#accessibility-and-limitations` | `/docs/roadmap` |
| `rich text` | `/docs/components/text` | `/docs/roadmap` |
| `toolbar` | text `/docs/components/popover#composition` | `/docs/roadmap` |
| `keybinding` | nothing | `/docs/components/keycap` |
| `table`, `panel`, `input`, `label` | unchanged | unchanged (`key value` stays on `/docs/roadmap`) |

Forced defects, each applied alone, run against `src/lib/search.test.ts -t
"plan 585"`, then reverted:

1. Removed the stem branch from `matchRank` → **3 tests failed**:
   `theme -> /docs/tokens-api`, `capability -> /docs/native-testing`, and the
   two `mergeResults` inflection cases.
2. Removed `tree views, log viewers` from Data display and `keyboard focus`
   from Accessibility → `tree -> /docs/components/checkbox`,
   `log -> /docs/components/text`, `focus -> /docs/native-testing`.
3. Removed `["Diff viewer", ["diff"]]` → `diff -> /docs/components/spacer`.
4. Removed the `keycap` keybinding terms → `keybinding -> nothing`.

With every rule restored: 100 test files / 724 tests pass.
