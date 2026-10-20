# 608 — Reader vocabulary, tenth pass: phrase typos, stem-transparent typos, and the subjects still owned by nothing

Phase: F
Depends on: 410, 413, 419, 431, 561, 566, 568, 574, 579, 583, 585, 590, 592, 593, 598, 599, 601, 603, 606, 607
Status: implemented

## 1. The measured defect

Plan 607 exhausted its own sweep and recorded two boundaries in §8.5: a phrase
with a misspelling gets no typo tier (`theem editr`), and a word more than one
edit away is not promoted (`btton`). `TODO.md` asks the tenth pass to sweep the
remaining reader phrases and to record any further boundary rather than widen a
tier silently.

Measured 2026-10-20 at `0418831d` against the real `search()` the `/api/search`
route calls (top result, exact harness in §4 step 1):

| Query | First result today | Owning page / subject |
| ----- | ------------------ | --------------------- |
| `theem editr` | `/docs/roadmap` | Theme editor |
| `buton group` | `/docs/components/radio-group` | Button group |
| `dropdwon menu` | `/docs/components/context-menu` | Dropdown menus |
| `seach input` | `/docs/components/text-input` | Search inputs |
| `theem toggle` | `/docs/components/toggle` | Dark mode (`theme toggle`) |
| `acordian panel` | `/docs/components/tabs#composition` | Accordions |
| `themnig` | **(nothing)** | Theming |
| `tag input` | `/docs/components/text-input` | Tag / token input |
| `state management` | `/docs/components/empty-state` | Component API (`## State ownership`) |
| `controlled component` | `/docs/components` (index) | Component API (`## Controlled and uncontrolled`) |
| `controlled state` | `/docs/components/empty-state` | Component API |
| `keyboard navigation` | `/docs/roadmap` | Component API (`## Keyboard`) |
| `transparency` | **(nothing)** | Styling (`opacity`) |
| `rounded`, `corner radius` | Button group limitations / Tokens API | Styling (`borderRadius`) |
| `width`, `height` | Theming / Typography | Styling (`## Size`) |
| `responsive design`, `breakpoint(s)` | Text limitations / Stack limitations | Styling (`## Media queries` absence) |
| `letter spacing`, `tracking` | OTP field limitations / Accessibility | Styling (no `letterSpacing` field) |
| `rendering` | Typography | Architecture (`## What runs where`) |
| `server`, `server side rendering` | Date picker limitations | Architecture |
| `speed` | **(nothing)** | Performance |
| `credits`, `acknowledgements` | nothing / nothing | License |
| `vitest` | **(nothing)** | Contributing (`## Tests`) |
| `colourblind`, `colorblind` | nothing / nothing | Theming (`## High contrast`) |
| `panle` | Drawer | Workspace (`###### panel`) |
| `acordian panel` | Tabs composition | — see §8.5 |
| `tabel` | Label | — see §8.5 |

Three causes, one per group:

1. **A phrase is not typo-matched.** `typoMatch` returns `undefined` for any
   query containing whitespace, so a reader who misspells one word of a two-word
   name gets the plain lexical answer instead of the name. The single-word tier
   already had the answer for each of these pairs; only the phrase gate blocked
   it.
2. **The stem hides a suffix typo.** `typoKey` applies `stem` *before* comparing,
   so a name that stems (`theming` → `them`) and a misspelling that does not
   (`themnig` → `themnig`) are compared as `them` vs `themnig` — three edits
   apart — even though the two spellings are one adjacent transposition apart.
3. **A subject has no phrase vocabulary in the table that owns it.** The pages
   already own these subjects — Styling renders the 73 `StyleDesc` fields and
   the absent-CSS table, Component API owns state and keyboard, Architecture
   owns "what runs where", Theming owns high contrast — but the exact reader
   phrase is not an alias, so a component title token, a limitation paragraph or
   nothing wins.

What must stay where it is: `spacing` → Theming, `font size`/`font family` →
Typography, `table`/`tables` → Data display, `panel` → Workspace, `state` →
Empty state (no page owns the bare word; see §8.5), `split panes` → Roadmap,
`border radius` → Styling, `media queries` → Styling, `platform support`/`native
binding` → Installation, `theme` → Theming, `styling` → Styling, `className` →
Styling, `read only` → Troubleshooting (recorded, §8.5), `paste` → Troubleshooting
(recorded, §8.5), `tabel` → Label (recorded, §8.5). None of the rules below may
move them.

## 2. What to build

### 2.1 `src/lib/typo.ts` — one word *or a whole phrase*

Keep every single-word rule from plan 607. Add a phrase arm and make the edit
comparison stem-transparent.

```ts
/** A word's spellings for comparison: the stemmed key, then the collapsed word. */
export const typoForms: (value: string) => ReadonlyArray<string>;

/** `true` when either form of `left` is one edit from either form of `right`. */
export const formsWithinOneEdit: (left: string, right: string) => boolean;
```

Rules, each forced by the measured table:

- **Forms.** `typoForms("theming")` is `["them", "theming"]`;
  `typoForms("themnig")` is `["themnig"]`; the two are one adjacent
  transposition apart through the raw form. `theem`/`theming` still match
  through the stemmed form. A form shorter than four characters is not compared.
- **Phrase alignment is positional and complete.** Split the query and the
  *whole* name/alias into words with the existing `splitWords`; the counts must
  be equal, and word *i* of the query is compared with word *i* of the target.
  A typo does not reorder a name (`group button` is not `button group`), and a
  query with an invented extra noun (`acordian panel`) is not a typo of a
  one-word title.
- **Every word matches, at least one word is changed.** A word matches when it
  is spelled identically, or when it is at least four characters and
  `formsWithinOneEdit` accepts it. If every word is identical, the real ranker
  owns the query and `typoMatch` returns `undefined`.
- **Only whole names and whole aliases enter the phrase tier.** A phrase is
  compared with the whole target, never with one word of it, so the tier is
  `0` (a name) or `1` (an alias) — the same name-before-alias order as the
  single-word tier.
- **The same ambiguity rule.** Two URLs tied at the winning tier are not
  promoted; the tier never guesses.
- **Single-word behaviour is unchanged**, including the exact-spelling,
  four-character, one-edit and ambiguity guards.

`targetTier` switches from `typoKey` to `formsWithinOneEdit`; `typoMatch` routes
a multi-word query to a new `phraseTarget`. No other module changes shape.

### 2.2 `src/lib/component-aliases.ts` — one measured tie

- `tag-input` gains `tag input`. Its title is `Tag / token input`, so neither the
  whole query nor one token matches it, and `Text inputs` wins the tie on the
  shorter title. This is the plan-566 rule: a reader word the record cannot
  match.

### 2.3 `src/lib/page-aliases.ts` — the owner a phrase was missing

Whole-query aliases only, and each one names a subject the page already proves:

| Page | Terms added | What the page already shows |
| ---- | ----------- | --------------------------- |
| `/docs/styling` | `transparency`, `rounded`, `corner radius`, `width`, `height`, `responsive`, `responsive layout`, `responsive design`, `breakpoint`, `breakpoints`, `letter spacing`, `letter-spacing`, `tracking`, `character spacing` | the `opacity`, `borderRadius` and size fields, the absent media-query row and (new) the absent letter-spacing row |
| `/docs/component-api` | `state management`, `state ownership`, `controlled state`, `controlled component`, `uncontrolled state`, `keyboard navigation` | `## Controlled and uncontrolled`, `## State ownership`, `## Keyboard` |
| `/docs/architecture` | `rendering`, `server`, `server side`, `server side rendering`, `client side` | `## What runs where` |
| `/docs/performance` | `speed` | the measured probes and the cost model |
| `/docs/license` | `credits`, `acknowledgements`, `acknowledgments` | `## Recorded today` and `## Identity` |
| `/docs/contributing` | `vitest` | `## Tests` (a sentence added in §2.5) |
| `/docs/workspace` | `panel`, `panels`, `pane`, `panes` | the panel/split subject |
| `/docs/theming` | `colourblind`, `colorblind`, `colour blindness`, `color blindness` | `## High contrast` (the palette a low-vision or colour-vision reader can choose) |

The table's guards decide collisions: a term that shadows a page title or a
component name, or that another page already owns, is dropped and recorded in
§8 rather than forced.

### 2.4 `src/lib/styling.ts` — the letter-spacing absence is a row, not a guess

Add one `AbsentConcept`:

```ts
{
  concept: "Letter spacing and tracking",
  replacement:
    "There is no letterSpacing field; a family's own spacing is what the runtime paints.",
  wouldBeFields: ["letterSpacing", "tracking"],
}
```

`styleFieldViolations` already fails when a concept claimed absent is declared
by the installed `StyleDesc`, so a future runtime that adds the field forces the
row and the search alias to be revisited. No other row changes.

### 2.5 `content/docs/contributing.mdx` — one sourced sentence

`## Tests` gains: "The suites are vitest files beside the code
(`src/**/*.test.ts`); `nub run test` runs them." That is what `AGENTS.md` and
the workspace scripts already state, and it is why `vitest` can name the page.

### 2.6 Wiring

No change to `search.ts`: it already builds `typoNames` from every component
name/alias and every page title/page alias, and it already synthesizes
`typoHits`. The phrase arm and the new aliases flow through it unchanged.

## 3. Files

| Action | Path |
| ------ | ---- |
| edit | `apps/docs/src/lib/typo.ts` — `typoForms`, `formsWithinOneEdit`, phrase arm |
| edit | `apps/docs/src/lib/typo.test.ts` — phrase and stem-transparency tables |
| edit | `apps/docs/src/lib/component-aliases.ts` — `tag input` |
| edit | `apps/docs/src/lib/page-aliases.ts` — six blocks, eight page keys |
| edit | `apps/docs/src/lib/page-aliases.test.ts` — new `owned` and `regressions` rows |
| edit | `apps/docs/src/lib/styling.ts` — the letter-spacing absence row |
| edit | `apps/docs/src/lib/styling.test.ts` — the new row is rendered and guarded |
| edit | `apps/docs/content/docs/contributing.mdx` — the vitest sentence |
| edit | `apps/docs/src/lib/search.test.ts` — phrase-typo table, subject table, regressions |
| edit | `apps/docs/scripts/smoke-build.ts` — four production queries |
| edit | `apps/docs/README.md` — the phrase/phrase-typo rules and the tenth pass |
| edit | `.agents/slop/plans/README.md` — index row |
| edit | `PLAN.md` — decision D57 |
| edit | `TODO.md` — tick the tenth pass, record the measured limits |

## 4. Order of work and commands

Run from `apps/docs` unless stated. Every command's expected result is stated; a
different result is a STOP condition.

1. **Baseline and measurement.** `nub exec vitest run src/lib/search.test.ts src/lib/typo.test.ts src/lib/page-aliases.test.ts` → green (baseline 104 + 148 + 14 tests across those files). Reproduce §1 with a temporary `src/lib/zz-measure.test.ts` that writes `/private/tmp/opencode/docs-tenth-pass.tsv`; delete it before the first commit.
2. Write the `typo.ts` forms and phrase arm, then
   `nub exec vitest run src/lib/typo.test.ts` → the phrase table passes and the
   existing single-word table is unchanged.
3. Add the aliases, the styling row and the Contributing sentence, then
   `nub exec vitest run src/lib/page-aliases.test.ts src/lib/styling.test.ts`
   → green.
4. Add the integration rows to `search.test.ts`, then
   `nub exec vitest run src/lib/search.test.ts` → the new rows pass and every
   regression row is unchanged.
5. `nub run --filter docs test` → all files pass (baseline + the new cases).
6. `nub run --filter docs check-types` → no output, exit `0`.
7. `nub run --filter docs smoke:build` → every page renders and the new
   production queries return their page first; exit `0`.
8. From the repo root: `nub run check`, `nub run lint`, `nub run test` → green.

## 5. STOP conditions

- **A phrase typo moves a measured real query.** Any query in §1's "must stay"
  list, or in `page-aliases.test.ts`'s `regressions` table, changing its first
  result is a stop: report both results and the word that matched, and do not
  widen or narrow the tier to make it pass.
- **A phrase typo is ambiguous at the winning tier.** Report the candidates; do
  not add an alias to break the tie. The rule is "never guess"; §8 records what
  stays broken.
- **A proposed alias term is rejected by the existing guard** (shared, shadowing
  a page or component name, or malformed). Drop that term, record it, continue;
  do not edit the guard.
- **The letter-spacing row contradicts the installed runtime** (the guard reports
  `letterSpacing` or `tracking` as declared). Stop: the runtime gained the field,
  so the page and the alias need a positive section instead of an absence row.
- **A Contributing sentence cannot be sourced.** The vitest sentence is sourced
  from `AGENTS.md` and the workspace scripts; if either changes before the
  sentence lands, leave the sentence and the alias out and record the gap.
- **`smoke:build` fails for a reason unrelated to this change.** Fix only what
  this change broke; record the rest in `TODO.md`.

## 6. Test plan

`src/lib/typo.test.ts`:

| Test | Fails when |
| ---- | ---------- |
| `typoForms` returns the stemmed key and the collapsed word, and compares either (`themnig`/`theming`) | the stem is applied before the edit distance again, so a suffix transposition is invisible |
| a phrase aligns word by word and accepts one edit in any word (`theem editr`, `buton group`, `seach input`) | a phrase is still rejected wholesale or word order is ignored |
| a phrase with an extra or missing word returns `undefined` (`acordian panel`, `buton`) | the tier guesses beyond the name's word count |
| a phrase whose words are all exact returns `undefined` | the typo tier duplicates a real match |
| a phrase name beats a phrase alias | the phrase arm loses plan 607's tier order |
| two phrase URLs tied at the winning tier return `undefined` | the phrase arm guesses |
| every measured phrase in §1 resolves to the page named there, except §8.5 | a name, its URL or the rule drifts |

`src/lib/search.test.ts` — integration, against the real index:

| Query | Expected first result |
| ----- | --------------------- |
| `theem editr` | `/docs/theme-editor` |
| `buton group` | `/docs/components/button-group` |
| `dropdwon menu` | `/docs/components/dropdown-menu` |
| `seach input` | `/docs/components/search-input` |
| `theem toggle` | `/docs/dark-mode` |
| `themnig` | `/docs/theming` |
| `tag input` | `/docs/components/tag-input` |
| `state management`, `controlled state`, `controlled component`, `keyboard navigation` | `/docs/component-api` |
| `transparency`, `rounded`, `width`, `letter spacing`, `responsive design` | `/docs/styling` |
| `rendering`, `server side rendering` | `/docs/architecture` |
| `speed` | `/docs/performance` |
| `credits` | `/docs/license` |
| `vitest` | `/docs/contributing` |
| `panel`, `panle` | `/docs/workspace` |
| `colorblind` | `/docs/theming` |

Regressions (first result unchanged): `button`, `theme`, `theming`, `search`,
`table`, `tables`, `panel`, `spacing`, `font size`, `font family`,
`platform support`, `native binding`, `styling`, `className`, `state`,
`border radius`, `media queries`, `split panes`, `acordian`, `dropdwon`,
`botton`, `acordian panel`, `tabel`.

`page-aliases.test.ts`: every new term joins `owned`; the moved phrases join
`regressions` only where the owner is deliberately unchanged.

**Two-direction proofs (run each, record the command and the failure):**

1. Delete the phrase arm from `typoMatch` → `theem editr`, `buton group`,
   `dropdwon menu`, `seach input` and `theem toggle` fail by query.
2. Remove the raw collapsed form from `typoForms` → `themnig` returns nothing.
3. Compare phrase words by set instead of position → a test with
   `group buton` (or the existing alignment test) fails, proving order matters.
4. Remove the `at least one word changed` guard → an all-exact phrase is
   promoted as a typo and the unit test fails.
5. Delete the Styling alias block → `transparency` returns nothing and
   `width` returns Theming.
6. Delete the `tag input` component alias → it returns Text inputs again.
7. Delete the letter-spacing absence row → the styling guard fails (the row is
   catalogued but not rendered) and `letter spacing` still reaches OTP field.
8. Delete the Component API alias block → `state management` returns Empty
   state.

`smoke:build` gains four queries: `theem editr` → `/docs/theme-editor`,
`buton group` → `/docs/components/button-group`, `tag input` →
`/docs/components/tag-input`, `transparency` → `/docs/styling`.

## 7. Acceptance

- The measured phrase typos reach their page first; `themnig` reaches Theming;
  `tag input` reaches Tag / token input.
- Every subject in §2.3 reaches its page first.
- Every "must stay" query and every regression row keeps its owner.
- `nub run check`, `nub run lint`, `nub run test` and
  `nub run --filter docs smoke:build` are green.
- §8 records what shipped, the before/after table, every command's real result,
  the two-direction proofs and every boundary that remains.

## 8. Results

Implemented 2026-10-20.

### 8.1 What shipped

- `src/lib/typo.ts` — `typoForms` (the stemmed key and the raw collapsed word),
  `formsWithinOneEdit`, and a positional phrase arm that aligns every query
  word with a word of the *whole* name or alias, requires at least one changed
  word, and keeps the name-before-alias order and the ambiguity rule.
- `src/lib/page-aliases.ts` — the eight measured page blocks: Styling (14
  terms), Component API (6), Architecture (5), Performance (1), License (3),
  Contributing (1), Workspace (4), Theming (4).
- `src/lib/component-aliases.ts` — `tag input` for `tag-input`.
- `src/lib/styling.ts` — the "Letter spacing and tracking" absence row, guarded
  against the installed `StyleDesc`; `<AbsentStylingConcepts />` renders it.
- `content/docs/contributing.mdx` — `## Tests` names vitest and the file
  location.
- `src/lib/typo.test.ts` (21 tests), `src/lib/search.test.ts` (two new tables),
  `src/lib/page-aliases.test.ts` (new owned/regression rows),
  `src/lib/styling.test.ts` (the new row), and four `smoke:build` queries.
