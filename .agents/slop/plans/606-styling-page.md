# 606 — Styling has a page: the style surface, and the CSS that is not there

Phase: F
Depends on: 410, 413, 416, 419, 431, 482, 504, 520, 565, 587, 598, 600, 603
Status: planned

## 1. The measured defect

A React reader's first move is `className`. GPUix has no CSS, no selectors and no
class attribute — every host element takes a `style` object instead — and the
site says so only in passing (Component API's *State-aware styles*, one Stack
limitation, one Theming paragraph). Measured 2026-10-20 at `f84d20fa` against the
real `search()` the `/api/search` route calls:

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `className` | **(none)** | Styling |
| `tailwind` | **(none)** | Styling |
| `css` | Stack › *Accessibility and limitations* | Styling |
| `css class`, `css variable` | Stack › *Accessibility and limitations* | Styling |
| `sx` | Icon names | Styling |
| `stylesheet` | Theming › *The docs site itself* | Styling |
| `style`, `styles`, `styling` | Theming › *Platform styles* | Styling |
| `style prop` | Theming › *Platform styles* | Styling |
| `inline style` | Inline edit | Styling |
| `media query` | Mention input › *States* | Styling |
| `pseudo class` | Dark mode › *A resolved theme, not a class* | Styling |
| `custom styles`, `override styles`, `hover style` | Theming › *Platform styles* | Styling |
| `fontWeight`, `lineClamp`, `rowGap`, `gridTemplateColumns`, `selectionColor`, `textOverflow` | **(none)** | Styling |
| `pointerEvents` | Toast › *Keyboard and focus* | Styling |
| `userSelect` | Text › *Theming* | Styling |
| `borderColor` | Keycap › *Accessibility and limitations* | Styling |
| `margin` | Spacer › *Accessibility and limitations* | Styling |
| `padding` | Buttons › *Sizes* | Styling |

Two facts make this structural, not a missing sentence:

1. **The supported surface is only visible 66 times.** `StyleDesc` declares 73
   fields (measured from the installed `@gpuix/native` declarations). Each
   component page's generated props table repeats the bare `style?: StyleDesc`
   row, and the type-table rows are deliberately dropped from search (plan 479),
   so no page renders the field list and no query can retrieve a field name.
2. **The absent surface has no owner.** "No `className`", "no stylesheet" and
   "no media query" are statements a reader needs *before* writing a component,
   not a limitation on one of them.

What the site already has, and must keep as separate owners:

- **Theming** — where values come from (roles, scales, providers, platform
  styles, high contrast).
- **Component API** — how a *part* exposes state (`style` as a function of
  `<Part>State`, `mergeStyles` semantics, hover/active).
- **Typography** — the type scale and families.
- **Layouts / Accessibility / Troubleshooting** — the layout box, the ARIA
  surface, and the failure that a wrong colour produces.

## 2. What to build

### 2.1 The page — `content/docs/styling.mdx`

Placed in the sidebar between `typography` and `components` (readers style a
component before they read about theming tokens in anger; Theming stays after).
Sections, in order:

1. Intro — a style is data: one `StyleDesc` object per host element, values
   resolved from the active theme. One sentence each on what replaces CSS.
2. `## What is not here` — a table of concepts and the honest alternative:
   `className` / CSS classes, stylesheets, Tailwind and `sx`, CSS custom
   properties, pseudo-classes (`:hover`, `:active`, `:focus-visible`), media
   queries, `!important`. Rendered from `absentStylingConcepts`.
3. `## The style prop` — every host element accepts `style?: StyleDesc`;
   a component merges its themed base with the caller's object using a
   **shallow spread**, so a field you pass wins and `hover`/`active` are
   replaced whole, not deep-merged (measured: `mergeStyles` in
   `@gpuix/react/floating` is `{ ...base, ...override }`; the primitives'
   `mergeStyle` is the same one-liner). One copyable `tsx` example.
4. `## The supported surface` — `<auto-type-table>` for the real `StyleDesc`
   from the installed `@gpuix/native` declarations, then the seven field
   families (layout, size, spacing, border, colour, text, interaction) as prose
   with their prefixes and the field that anchors each family.
5. `## Values come from the theme` — `useTheme()`, `alpha`, `textStyle`,
   `focusRing`, `elevationShadow`, one copyable `tsx` example.
6. `## Variants and state` — a variant is a named style resolved from roles
   (`core/variants.ts`); state is the function form, owned by Component API.
7. `## What the runtime will not do` — no selectors, no CSS variables, no media
   queries, no pseudo-classes, no `z-index` (link Layering), `position:
   "absolute"` resolves against the mount parent (plan 112), no transform or
   colour interpolation in `motion` (plan 600). Each row links its evidence.
8. `## Where to go next` — Theming, Component API, Typography, Troubleshooting.

No new MDX component and no new script: the page renders the existing
`<auto-type-table>` tag, so `mdx-components.test.ts` and the Contributing check
list are untouched.

### 2.2 `src/lib/styling.ts` (new, pure)

```ts
export interface StyleField { readonly name: string; readonly type: string }

/** `StyleDesc`'s fields, in declaration order, from installed declarations. */
export const styleFields = (declarations: string): ReadonlyArray<StyleField>;

export interface StyleFieldFamily {
  readonly title: string;
  readonly prefixes: ReadonlyArray<string>;   // matched against the field name
  readonly fields: ReadonlyArray<string>;     // explicit members the prefixes miss
  readonly anchor: string;                    // a field the page's prose names
}

export const styleFieldFamilies: ReadonlyArray<StyleFieldFamily>;

export interface AbsentConcept {
  readonly concept: string;
  readonly replacement: string;
}

export const absentStylingConcepts: ReadonlyArray<AbsentConcept>;

/** Every way the page's claims can disagree with the installed declarations. */
export const stylingViolations = (input: {
  readonly declarations: string;
  readonly families: ReadonlyArray<StyleFieldFamily>;
  readonly absent: ReadonlyArray<AbsentConcept>;
}): ReadonlyArray<string>;
```

`styleFields` parses the `interface StyleDesc { … }` body only (the
`hostPropsBody` rule in `src/lib/accessibility.ts` is the precedent), skips
comment lines, and reads `name?: type;`.

`stylingViolations` reports, by name: a field no family classifies; a family
whose anchor is not a field; two families claiming one field; an absent concept
that a `StyleDesc` field now declares (the runtime gained it, so the claim is
stale); a concept or replacement with empty text; and a declaration that yields
no fields.

Families (prefix-based, so a new `paddingBlock` falls into spacing without a
page edit): layout (`display`, `visibility`, `flex*`, `align*`, `justify*`,
`gap`, `rowGap`, `columnGap`, `grid*`, `position`, `top/right/bottom/left`,
`overflow*`), size (`width`, `height`, `min*`, `max*`), spacing (`padding*`,
`margin*`), border (`border*`, `boxShadow`), colour (`background*`, `color`,
`opacity`, `selectionColor`), text (`font*`, `text*`, `line*`, `white*`),
interaction (`cursor`, `pointerEvents`, `userSelect`, `hover`, `active`).

### 2.3 `src/lib/style-field-search.ts` (new, generated document)

One `GeneratedSearchEntry` (D32): the index lists every field with its family,
so a pasted `pointerEvents` retrieves it; `names` promotes the **distinctive**
(camelCase) field names only, so `gap`, `color` and `padding` stay prose and the
pages that own those words keep them. No ownership exclusions are needed: every
promoted spelling is unique to this table — Theming promotes the token names
(`radius.md`, `spacing.md`) and `elevationShadow`, Typography promotes its text
roles (`body`, `displayLg`), and none of those is a field name.

> Amended while implementing (§8): the draft excluded `fontSize`, `lineHeight`,
> `fontWeight`, `fontFamily`, the radius fields and `boxShadow` in favour of
> Typography and Theming. That premise was wrong — those pages promote *roles,
> scales and helpers*, not field names, so the exclusion made the field
> unreachable without protecting anything. The rule is now "a field name belongs
> to the field table".

### 2.4 Vocabulary

`src/lib/page-aliases.ts` gains `/docs/styling`, whole-query only (D45):
`classname`, `class name`, `css`, `css class`, `tailwind`, `sx`, `sx prop`,
`stylesheet`, `style prop`, `inline style`, `style attribute`, `media query`,
`pseudo class`, `pseudo element`, `custom styles`, `override styles`. The page's
own title and summary own `style`, `styles` and `styling`; `css variables` keeps
Component API (it documents the state-aware `style` form), and `spacing` keeps
Theming (the token scale).

Frontmatter summary must name the subject it owns: *the `style` prop,
`StyleDesc`, and what replaces CSS: `className`, Tailwind, stylesheets, CSS
variables, pseudo-classes and media queries*.

## 3. Files

| Action | Path |
| ------ | ---- |
| create | `apps/docs/content/docs/styling.mdx` |
| create | `apps/docs/src/lib/styling.ts` |
| create | `apps/docs/src/lib/styling.test.ts` |
| create | `apps/docs/src/lib/style-field-search.ts` |
| edit | `apps/docs/src/lib/search.ts` — register the entry in `generatedEntries` |
| edit | `apps/docs/src/lib/page-aliases.ts` — the alias block |
| edit | `apps/docs/content/docs/meta.json` — `"styling"` after `"typography"` |
| edit | `apps/docs/scripts/smoke-build.ts` — production queries `className`, `tailwind` |
| edit | `apps/docs/README.md` — one paragraph: the page and its guard |
| edit | `.agents/slop/plans/README.md` — index row |
| edit | `PLAN.md` — decision D55 |
| edit | `TODO.md` — tick the task, add the measured follow-ups |

## 4. Order of work and commands

Run from `apps/docs` unless stated. Each command's expected result is stated;
a different result is a STOP condition, not a thing to work around.

1. Write `styling.ts`, then `nub exec vitest run src/lib/styling.test.ts` →
   fixture tests pass; the real-declarations test passes with 73 fields.
2. Write `styling.mdx`, `meta.json`, the search entry and the aliases, then
   `nub exec vitest run src/lib/styling.test.ts src/lib/search.test.ts
   src/lib/page-aliases.test.ts` → pass.
3. `nub run --filter docs test` → 117+ files, all green (baseline 116 / 971).
4. `nub run --filter docs check-types` → no output, exit `0`.
5. `nub run --filter docs smoke:build` → every page renders; the two new
   production queries return `/docs/styling` first; exit `0`.
6. From the repo root: `nub run check`, `nub run lint`, `nub run test` → green.

## 5. STOP conditions

- **The installed declarations do not parse to 73 fields.** Do not hand-write a
  field list; record what changed and stop.
- **`<auto-type-table>` over `node_modules/@gpuix/native/dist/host.d.ts` renders
  fewer than 70 rows.** The page must not ship a heading with no table; report
  the generator output and stop.
- **A promoted field name steals a page another document owns.** Remove the
  promotion and record it; do not renumber the ownership table to make the test
  pass.
- **`smoke:build` fails for a reason unrelated to this change.** Fix only what
  this change broke; record the rest in `TODO.md`.

## 6. Test plan

`src/lib/styling.test.ts` (real declarations + fixtures):

| Test | Fails when |
| ---- | ---------- |
| parses `StyleDesc` fields and their types from a fixture | the parser reads comments, nested braces or a different interface |
| parses 73 fields from the installed `@gpuix/native` declarations | a dependency upgrade adds, renames or removes a field |
| every field belongs to exactly one family | a new field ships unclassified, or two families claim it |
| every family's anchor field exists | prose names a field the runtime removed |
| no absent concept is a declared field | the runtime gains `className`/`cursor`-style support and the page keeps denying it |
| duplicate, empty or unparsed rows are reported | the catalogue silently degrades |
| the page names every family and every absent concept, and carries the auto-type-table for `StyleDesc` | the page loses a section, a row or its table |
| the Styling page's table resolves to at least 70 rows through the app's own generator | a path or type rename blanks the API section (plan 581's rule) |

`src/lib/style-field-search.test.ts` (or the same file): a distinctive field
name ranks the Styling document at `0`; an owned-elsewhere name is not in
`names`; every promoted name resolves to a page that exists.

`src/lib/search.test.ts`: `className`, `tailwind`, `css`, `sx`, `style prop`,
`media query` and `pointerEvents` return `/docs/styling` first; `spacing` keeps
Theming, `fontSize` keeps Typography, and `table`/`panel`/`aria` do not move.

**Two-direction proofs (run each, record the command and the failure):**

1. Delete the `className` row from `absentStylingConcepts` → the page guard
   fails by name.
2. Add a fake field to a family → `every field belongs to exactly one family`
   fails (a field no longer classifies) and the family-anchor test fails.
3. Remove `/docs/styling` from `page-aliases.ts` → `className` falls back to
   `(none)` in the search test.
4. Point the page's `<auto-type-table>` at `host.d.ts` with name `Style` →
   the table-resolution test fails with `renders no rows`.
5. Remove the entry from `generatedEntries` in `search.ts` → `pointerEvents`
   stops reaching `/docs/styling`.

## 7. Acceptance

- `/docs/styling` exists in the sidebar, the sitemap and ⌘K.
- The 17 measured queries in §1 reach `/docs/styling` first, except the ones the
  ownership table keeps elsewhere, and every kept one still reaches its owner.
- The style surface is rendered from the installed declarations, and the suite
  fails in both directions when the package or the page drifts.
- `nub run check`, `nub run lint`, `nub run test` and
  `nub run --filter docs smoke:build` are green.

## 8. Results

Implemented 2026-10-20.

### 8.1 What shipped

- `content/docs/styling.mdx` — eight sections, placed between Typography and
  Components; the `StyleDesc` table is an `<auto-type-table>` over
  `node_modules/@gpuix/native/dist/host.d.ts` and renders all 73 entries.
- `src/lib/styling.ts` — the field parser, the seven families, the seven absent
  concepts (`wouldBeFields` included) and the two violation functions.
- `src/components/absent-styling-concepts.tsx` — the absence table, so the
  catalogue cannot drift from the page's prose; registered in `mdx.tsx`.
- `src/lib/styling-search.ts` + one `generatedEntries` row — the 50 promoted
  field names (54 distinctive, four kept as prose) and the absence vocabulary in
  the index, so a field name outranks a prose chunk elsewhere.
- `src/lib/page-aliases.ts` — 16 whole-query aliases; `smoke-build.ts` — the two
  production queries `className` and `tailwind`.

The draft's ownership exclusions were removed after measuring (§8.4).

### 8.2 Measured before / after

Same queries, same `search()`, before at `f84d20fa` and after this change:

| Query | Before | After |
| ----- | ------ | ----- |
| `className`, `tailwind` | **(none)** | `/docs/styling` |
| `css`, `css class`, `css variable`, `css variables` | Stack › limitations / Component API | `/docs/styling` |
| `sx`, `stylesheet`, `inline style`, `media query`, `pseudo class` | Icon names / Theming / Inline edit / Mention input / Dark mode | `/docs/styling` |
| `style`, `styles`, `styling`, `style prop`, `custom styles`, `override styles`, `hover style` | Theming › Platform styles | `/docs/styling` |
| `pointerEvents`, `userSelect`, `borderColor`, `margin`, `padding` | Toast / Text / Keycap / Spacer / Buttons | `/docs/styling` |
| `lineClamp`, `rowGap`, `gridTemplateColumns`, `selectionColor`, `textOverflow`, `fontWeight`, `borderWidth` | **(none)** (or Theming's scale for `borderWidth`) | `/docs/styling` |
| `spacing` | Theming | **Theming** (kept) |
| `font size`, `font family` | Typography | **Typography** (kept) |
| `table`, `panel`, `aria`, `theme switch`, `radius.md` | — | unchanged (kept) |

Total pages: 101 → **102** (the crawl). Suite: 116 files / 971 tests → **117 /
983**.

### 8.3 Commands run

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/lib/styling.test.ts` | 12 passed |
| `nub run --filter docs test` | 117 files / 983 tests passed |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | `ok` — 102 pages, 225 links, 1 327 anchors, search checked |
| `nub run --filter docs smoke:a11y` | 102 pages × 2 schemes, 0 violations |
| `nub run --filter docs smoke:responsive` | 102 pages at 390 px, phone controls and mobile navigation checked |
| `nub run check`, `nub run lint`, `nub run test` (root) | green |

### 8.4 Two-direction proofs (each run, then reverted)

1. Removed `<AbsentStylingConcepts />` from the page → `the page does not render
   <AbsentStylingConcepts />`.
2. Added `"gridGap"` to `styleFieldNames` → `gridGap is catalogued but StyleDesc
   does not declare it`.
3. Removed the `/docs/styling` alias block → `sx → /docs/components/icon` and
   `media query → /docs/components/mention-input#states` (the other alias words
   still reached the page through the generated document).
4. Renamed the table's `name` to `Style` → `expected [ 'Style' ] to include
   'StyleDesc'`.
5. Removed `stylingSearchEntry` from `generatedEntries` → `borderWidth →
   /docs/theming#scales-and-control-metrics`, and every promoted field name
   dropped from the clean page URL to a `#type-table-…` fragment.

### 8.5 Measured, not fixed

- `line height` still reaches Timeline. Typography owns the subject (plan 574),
  but its page does not name "line height"; recorded in `TODO.md`.
- The four text fields are indexed but not promoted: `promotedNameRank`'s
  variant tier would turn them into `font size` / `line height` phrases, which
  Typography owns. The camelCase spellings still reach `/docs/styling` through
  the index text.
- `className` and `tailwind` would still reach the page without the alias block
  (the generated document carries them); the aliases are load-bearing for `sx`
  and `media query` only.

