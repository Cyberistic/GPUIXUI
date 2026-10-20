# 607 — Reader vocabulary, ninth pass: one-edit typos, line height, platform questions and localization

Phase: F
Depends on: 410, 413, 419, 431, 561, 566, 568, 574, 579, 583, 585, 590, 592, 593, 598, 599, 601, 603, 606
Status: implemented

## 1. The measured defect

Plan 606 recorded the leftovers of its own sweep in `TODO.md`. Measured
2026-10-20 at `cb8fed63` against the real `search()` the `/api/search` route
calls (top three results, exact command in §4 step 1):

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `line height` | Timeline › page | Typography |
| `line-height` | Badge › *Sizes* (text) | Typography |
| `line spacing` | Timeline › page | Typography |
| `leading` | List › *Composition* (text) | Typography |
| `does it work on windows` | Workspace › page | Installation › *Native bindings* |
| `does it work on linux` | Workspace › page | Installation › *Native bindings* |
| `works on windows` | Workspace › page | Installation › *Native bindings* |
| `localization`, `localisation` | **(none)** | Layouts (text direction) |
| `internationalization`, `translation`, `mirroring` | **(none)** | Layouts |
| `i18n` | Date pickers › *Accessibility and limitations* | Layouts |
| `locale` | Countdown / Time picker › limitations | Layouts |
| `right to left` | Toggle › page | Layouts |
| `text direction` | Text › page | Layouts |
| `botton`, `buton` | Toggle › page | Buttons |
| `theem` | Values API › page | Theming |
| `seach` | Icon names › page | Search inputs |
| `componet` | Roadmap › page | Components |
| `acordian`, `dropdwon` | **(none)** | Accordions / Dropdown menus |

Three causes, one per group:

1. **A typo has no tier.** The lexical index tolerates most misspellings (it
   still returns *some* page for `botton`, `theem`, `seach`, `componet`), but
   nothing in the ranker knows the query is one edit from a name, so an
   incidental prose or suffix match decides. When the index returns nothing
   (`acordian`, `dropdwon`) the page cannot be reached at all. Plan 585's stem
   tier is the nearest rule, but it compares inflections, never errors.
2. **`line height` is a three-way tie.** Typography's summary already says
   "line height", but its phrase rank is `3 + DESCRIPTION_MATCH_RANK = 7`, and
   Timeline, Inline edit and Inline validation each earn the same `7` because
   their titles *end* with `line` (`Timeline`, `Inline edit`), which is plan
   431's suffix tier offset by `TOKEN_MATCH_RANK`. The shorter title wins the
   tie (`Timeline`, 8 characters, before Typography, 10).
3. **Two subjects have no vocabulary and one has no question phrasing.**
   Installation's *Native bindings* section answers "does it work on Windows?"
   but the exact question is not a phrase any page owns, and its two tokens
   (`work`, `windows`) are matched by Workspace's title token. Nothing in the
   site names i18n, localization or translation, so a reader asking about them
   lands on a component's limitation paragraph or nowhere.

What must stay where it is: `spacing` → Theming (the token scale),
`font size`/`font family` → Typography, `platform support`/`native binding` →
Installation (already correct), `rtl` → Layouts, `theme` → Theming,
`table`/`panel`/`aria` → their owners. None of the rules below may move them.

## 2. What to build

### 2.1 `src/lib/typo.ts` (new, pure, dependency-free)

The site may not import `effect` (`src/architecture.test.ts`), so this module
uses plain arithmetic and native arrays, the same deliberate exception
`src/lib/search.ts` records.

```ts
/** The stem `search.ts` matches names by, shared with the typo tier. */
export const stem: (word: string) => string;

/** Camel-case, dotted, hyphenated and spaced names as lower-case words. */
export const splitWords: (value: string) => ReadonlyArray<string>;

/**
 * A word's typo identity: lower-case, repeated letters collapsed, then the
 * shared stem (`theem` -> `them`, `accordions` -> `acordion`,
 * `components` -> `component`).
 */
export const typoKey: (value: string) => string;

/** The `typoKey` of every word in a name. */
export const typoWords: (name: string) => ReadonlyArray<string>;

/** One substitution, insertion, deletion or adjacent transposition. */
export const withinOneEdit: (left: string, right: string) => boolean;

export interface TypoName {
  readonly name: string;
  readonly url: string;
  /** A title, slug, exported symbol or part; an alias is editorial. */
  readonly kind: "name" | "alias";
}

export interface TypoTarget {
  readonly url: string;
  /** The name that matched, used as the synthesized result's content. */
  readonly name: string;
  /** `0` whole name, `1` whole alias, `2` a name word, `3` an alias word. */
  readonly tier: number;
}

/** The one target a one-edit query names, or `undefined`. */
export const typoMatch: (
  query: string,
  names: ReadonlyArray<TypoName>,
) => TypoTarget | undefined;
```

Rules, each forced by the measured table:

- **One edit**, after `typoKey`: `botton` → `button` is one substitution once
  the doubled `t` is collapsed, and `acordian` → `accordion` is one substitution
  once the doubled `c` is collapsed. Collapsing repeats is what makes a doubled
  letter — itself the typo — not count twice.
- **At least four characters** in the query and in the name it matches. Three
  characters are too weak to name a page (plan 431's rule).
- **Single-word queries only.** A phrase keeps the existing token rules; a typo
  tier over every word of a sentence would guess.
- **Name before alias, whole before word**: whole name (`0`) beats a whole
  alias (`1`), which beats one word of a name (`2`), which beats one word of an
  alias (`3`). A title outranks an editorial alias, and a name that *is* the
  query outranks a word inside a longer one.
- **Never guess between two plausible names**: if two or more URLs tie at the
  winning tier, the query is not promoted at all. `dropdwon` names Dropdown
  menus (a title word) ahead of Select (the alias `dropdown list`) because the
  tiers differ; a genuine tie returns `undefined`.

### 2.2 Wiring in `src/lib/search.ts`

- Move `stem` out of `search.ts` into `typo.ts` and import it back, so there is
  one stem rule.
- Build `typoNames` once at module load: every component record's title, slug,
  exported symbols and declared parts (kind `name`) plus its aliases (`alias`);
  every page title (`name`); every page-alias term (`alias`). Component URLs use
  `componentSearchUrl`, so a planned record cannot promise a page.
- `TYPO_MATCH_RANK = 8` — one above the highest real rank (`3` description
  phrase + `DESCRIPTION_MATCH_RANK = 4`), so a real match always wins.
- `mergeResults` computes `typoMatch(query, typoNames)` once and scores a
  `type: "page"` candidate whose URL is that target at `TYPO_MATCH_RANK`. A text
  chunk at the same URL stays prose (the rule plan 569 set for generated
  documents).
- `typoHits(query)` synthesizes one page candidate when the lexical index
  returned nothing for the winning URL (the rule `pageTitleHits` uses). It is
  added beside the other synthetic hits in `search()`.

### 2.3 Content and vocabulary (no new page)

- **Typography** (`content/docs/typography.mdx` is unchanged; the page already
  explains the line height of every role and its table shows it) gains the
  whole-query aliases `line height`, `line-height`, `line spacing`, `leading`.
  The alias is a rank `0` name for the page that owns the subject, which breaks
  the three-way tie plan 585's stem tier created.
- **Installation** gains the question and platform phrasings a reader types:
  `does it work on windows`, `does it work on linux`, `does it work on mac`,
  `does it work on macos`, `works on windows`, `work on windows`,
  `works on linux`, `runs on windows`, `runs on linux`, `is windows supported`,
  `is linux supported`, `is mac supported`, `native binding` is already correct
  through the section heading and needs no alias.
- **Layouts** gains `## Localization and direction`, before the closing
  limitation paragraph, and the paragraph folds into it. It states, with a link
  to the page that proves each fact: no i18n layer and fixed English labels
  (Date pickers, Confirmation flow, Countdown), no `locale` prop, no number or
  date formatting (Time pickers' fixed 24-hour form), no `direction` in the
  runtime's style surface so nothing mirrors for RTL (the paragraph that is
  already there), and the honest alternative — the app supplies its own labels
  where a component takes them and owns direction at the composition level.
  The page summary becomes *"Stacks, boxes, grids, separators and scroll
  containers from @gpuixui/primitives, and the localization and
  right-to-left limits."*
  Aliases, whole-query only: `localization`, `localisation`, `i18n`,
  `internationalization`, `internationalisation`, `translation`,
  `translations`, `locale`, `locales`, `rtl`, `ltr`, `right to left`,
  `left to right`, `text direction`, `mirroring`, `mirrored layout`.

The alias table's existing guards decide collisions: a term that shadows a page
title or a component name, or that another page already owns, is dropped and
recorded in §8 rather than forced.

## 3. Files

| Action | Path |
| ------ | ---- |
| create | `apps/docs/src/lib/typo.ts` |
| create | `apps/docs/src/lib/typo.test.ts` |
| edit | `apps/docs/src/lib/search.ts` — import `stem`/`typoMatch`, `typoNames`, `TYPO_MATCH_RANK`, `typoHits`, merge rank |
| edit | `apps/docs/src/lib/search.test.ts` — typo and content tables, regressions |
| edit | `apps/docs/src/lib/page-aliases.ts` — three blocks |
| edit | `apps/docs/src/lib/page-aliases.test.ts` — the new terms in `owned` and `regressions` |
| edit | `apps/docs/content/docs/layouts.mdx` — the localization section and summary |
| edit | `apps/docs/scripts/smoke-build.ts` — production queries |
| edit | `apps/docs/README.md` — the typo tier and the ninth pass |
| edit | `.agents/slop/plans/README.md` — index row |
| edit | `PLAN.md` — decision D56 |
| edit | `TODO.md` — tick the ninth pass, record what remains |

## 4. Order of work and commands

Run from `apps/docs` unless stated. Every command's expected result is stated; a
different result is a STOP condition.

1. **Baseline.** `nub exec vitest run src/lib/search.test.ts src/lib/page-aliases.test.ts`
   → green (this is the suite the change must not break). Record the file/test
   totals from `nub run --filter docs test` (baseline 117 files / 983 tests).
2. Write `typo.ts` and `typo.test.ts`, then
   `nub exec vitest run src/lib/typo.test.ts` → the unit tables pass, including
   the ambiguity and two-edit cases.
3. Wire `search.ts`, then
   `nub exec vitest run src/lib/search.test.ts` → the new typo table passes and
   every regression row is unchanged.
4. Add the three alias blocks and the Layouts section, then
   `nub exec vitest run src/lib/page-aliases.test.ts src/lib/search.test.ts`
   → green.
5. `nub run --filter docs test` → all files pass (baseline + the new file and
   cases).
6. `nub run --filter docs check-types` → no output, exit `0`.
7. `nub run --filter docs smoke:build` → every page renders and the new
   production queries return their page first; exit `0`.
8. From the repo root: `nub run check`, `nub run lint`, `nub run test` → green.

The measurement harness used to produce §1 is a temporary `src/lib/zz-*.test.ts`
that writes to `/private/tmp/opencode/`; delete it before the first commit.

## 5. STOP conditions

- **The typo tier moves a measured real query.** Any query in §1's "must stay"
  list, or in `page-aliases.test.ts`'s `regressions` table, changing its first
  result is a stop: report the two results and the distance, do not widen or
  narrow the tier to make it pass.
- **Two measured typo queries are ambiguous at the winning tier.** Report the
  candidates; do not add a keyword alias to break the tie. The rule is "never
  guess", and the plan's §8 records what stays broken.
- **A proposed alias term is rejected by the existing guard** (shared, shadowing
  a page or component name, or malformed). Drop that term, record it, continue;
  do not edit the guard.
- **The Layouts facts cannot be sourced.** Every sentence needs a real page or
  declaration behind it; if one cannot be tied to source, leave it out and
  record the gap instead of asserting it.
- **`smoke:build` fails for a reason unrelated to this change.** Fix only what
  this change broke; record the rest in `TODO.md`.

## 6. Test plan

`src/lib/typo.test.ts`:

| Test | Fails when |
| ---- | ---------- |
| `withinOneEdit` accepts an equal word, one substitution, insertion, deletion and an adjacent transposition, and rejects a second edit or a longer gap | the predicate degrades to plain Levenshtein (a transposition becomes `2`) or counts a match twice |
| `typoKey` collapses repeated letters, drops a plural and applies the shared stem | `theem` no longer keys to `them`, or `components` stops keying to `component` |
| `typoWords` splits camelCase, dotted, hyphenated and spaced names | a part name (`DropdownMenuGroup`) is compared as one opaque token |
| a whole name beats a word of a longer name (`botton`, `buton`, `componet`) | the tier order is lost and Button groups or Component API wins |
| a name beats an alias (`dropdwon` → Dropdown menus, not Select) | aliases are compared in the name tier |
| two URLs tied at the winning tier return `undefined` | the rule guesses between two plausible names |
| a query shorter than four characters, a phrase, and a two-edit word return `undefined` | the tier over-reaches |
| every measured typo in §1 resolves to the page named there, except the ones §8 records as ambiguous | a name, its URL or the tier rule drifts |

`src/lib/search.test.ts` — integration, against the real index:

| Query | Expected first result |
| ----- | --------------------- |
| `botton`, `buton` | `/docs/components/button` |
| `acordian` | `/docs/components/accordion` (synthesized: the index returned nothing) |
| `dropdwon` | `/docs/components/dropdown-menu` (synthesized) |
| `seach` | `/docs/components/search-input` |
| `theem` | `/docs/theming` (whole name, by stem) |
| `componet` | `/docs` components index |
| `line height`, `line-height`, `line spacing`, `leading` | `/docs/typography` |
| `does it work on windows`, `works on windows` | `/docs/installation` |
| `localization`, `i18n`, `rtl`, `right to left`, `text direction` | `/docs/layouts` |

Regressions (first result unchanged): `button`, `accordion`, `dropdown`,
`theme`, `search`, `table`, `panel`, `aria`, `styling`, `className`, `spacing`,
`font size`, `platform support`, `native binding`.

`page-aliases.test.ts`: every new term joins `owned`.

**Two-direction proofs (run each, record the command and the failure):**

1. Remove `...typoHits(query)` from `search()` → `acordian` and `dropdwon` fall
   back to nothing, and the integration rows fail by query.
2. Change `TYPO_MATCH_RANK` to `7` (the description tier) → `line height` and a
   typo query fight at the same rank and a regression row moves; restore `8`.
3. Delete the alias block for Typography → `line height` returns Timeline again.
4. Delete the skeleton of `## Localization and direction` → `i18n` returns the
   Date picker fragment and `localization` returns nothing.
5. Drop `kind` from the typo target and treat every name alike → `dropdwon`
   resolves to Select through its alias and the unit tier test fails.
6. Make the ambiguity rule return the first target → the ambiguity unit test
   fails with the two URLs it guessed between.

`smoke:build` gains four queries: `line height` → `/docs/typography`,
`does it work on windows` → `/docs/installation`, `i18n` → `/docs/layouts`,
`botton` → `/docs/components/button`.

## 7. Acceptance

- The measured typo queries reach their page first, except the ones §8 records
  as ambiguous or two-edit, which are logged with the exact distance.
- `line height` reaches Typography, the platform question reaches Installation,
  and every localization word reaches Layouts.
- Every "must stay" query keeps its owner.
- `nub run check`, `nub run lint`, `nub run test` and
  `nub run --filter docs smoke:build` are green.
- §8 records what shipped, the before/after table, every command's real result
  and the two-direction proofs.

## 8. Results

Implemented 2026-10-20.

### 8.1 What shipped

- `src/lib/typo.ts` — `stem` (moved from `search.ts`), `splitWords`, `typoKey`,
  `typoWords`, `withinOneEdit` (one substitution, insertion, deletion or
  adjacent transposition), and `typoMatch` with its four tiers and the
  ambiguity rule.
- `src/lib/search.ts` — `typoNames` built from every component name and alias,
  every page title and every page alias; `TYPO_MATCH_RANK = 8`;
  `typoHits(query)` synthesizes the page; `mergeResults` scores only a
  `type: "page"` candidate whose URL is the typo target.
- `src/lib/page-aliases.ts` — Typography gains `line height`, `line-height`,
  `line spacing`, `leading`; Installation gains nine platform question and
  support phrasings; Layouts gains sixteen localization and direction terms.
- `content/docs/layouts.mdx` — `## Localization and direction` with the four
  sourced limits (Date pickers, Time pickers, Countdown, the confirmation
  flow), the absent `locale` and formatter, the RTL limitation, and the
  app-owned alternative; the summary now names localization and right-to-left.
- `src/lib/typo.test.ts` (14 tests) and `src/lib/layouts-page.test.ts`
  (3 tests); `search.test.ts` gains the seven-query typo table, the real-name
  regression, the rank-invariant/merge test and the text-chunk rule; the new
  alias terms join `page-aliases.test.ts`'s `owned` table; `smoke:build` gains
  `line height`, `does it work on windows`, `i18n`, `botton` and `acordian`.

### 8.2 Measured before / after

Same queries, same `search()`, before at `cb8fed63` and after this change:

| Query | Before | After |
| ----- | ------ | ----- |
| `line height`, `line-height`, `line spacing`, `leading` | Timeline / Badge / Timeline / List | `/docs/typography` |
| `does it work on windows`, `does it work on linux`, `works on windows`, `is windows supported` | Workspace | `/docs/installation` |
| `localization`, `localisation`, `i18n`, `internationalization`, `translation`, `locale`, `rtl`, `right to left`, `text direction`, `mirroring` | nothing, Date pickers, Countdown, Text, Toggle | `/docs/layouts` |
| `botton`, `buton` | Toggle | `/docs/components/button` |
| `acordian`, `dropdwon` | **(nothing)** | `/docs/components/accordion`, `/docs/components/dropdown-menu` |
| `componet` | Roadmap | `/docs/components` |
| `theem` | Values API | `/docs/theming` |
| `seach` | Icon names | `/docs/components/search-input` |
| `spacing`, `font size`, `platform support`, `native binding` | — | unchanged (Theming, Typography, Installation) |

The `line height` cause was measured, not assumed: Timeline, Inline edit,
Inline validation and Typography each earned rank `7` (a suffix token match for
the first three; the summary phrase for Typography), and the shorter title won
the tie. The alias gives Typography rank `0`; no ranker rule changed.

Suite: 117 files / 983 tests → **119 files / 1 026 tests**. Pages: 102
unchanged (no new page).

### 8.3 Commands run

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/lib/typo.test.ts` | 14 passed |
| `nub exec vitest run src/lib/search.test.ts` | 90 passed |
| `nub exec vitest run src/lib/page-aliases.test.ts` | 148 passed |
| `nub exec vitest run src/lib/layouts-page.test.ts` | 3 passed |
| `nub run --filter docs test` | 119 files / 1 026 tests passed |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | `smoke: ok` — 102 pages, search checked, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` (root) | green |

### 8.4 Two-direction proofs (each run, then reverted)

1. Removed `...typoHits(query)` from `search()` → four rows failed:
   `acordian -> nothing`, `dropdwon -> nothing`, `theem -> /docs/api-values`,
   `componet -> /docs/roadmap`.
2. Set `TYPO_MATCH_RANK = 7` → `scores a typo below every real rank` failed on
   the invariant (`expected 7 to be greater than 7`).
3. Removed the Typography alias block → `line height` failed with Timeline
   first.
4. Removed the `## Localization and direction` heading → two guard tests
   failed (empty section, no links).
5. Made every typo target a `name` → `prefers a name over an alias` failed;
   `dropdwon` tied between Dropdown menus and Select's alias and was not
   promoted.
6. Returned the first tied target instead of refusing → `refuses to guess
   between two equally plausible names` failed.

### 8.5 Measured limits, deliberately not fixed

- **A phrase is not typo-matched.** `theem editr` gets no typo tier; only a
  single word is compared, so a typo over every word of a sentence cannot
  guess.
- **A typo more than one edit away is not promoted.** `btton` collapses to
  `bton`, still two edits from `buton`; the tier stops at one, which is what
  keeps `team`/`them`-class near words from naming unrelated pages.
- **An alias never outranks a title.** `dropdwon` reaches Dropdown menus, not
  Select, even though Select's alias is `dropdown list`; that is the tier
  order working as designed.
- The Layouts section links four component pages rather than repeating their
  claims inline; each page still owns its own limitation, and the links are
  guarded against a page the site does not serve.
