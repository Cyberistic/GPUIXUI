# 566 — Search vocabulary: a component a reader names in their own words reaches its page

**Workstream:** docs-site · **Phase:** F (polish; `MISSION.md`'s component
search) · **Depends on:** 410, 411, 419, 431, 442, 454, 481, 490, 500, 504, 505,
507, 561, 563, 564 · **Status:** done

`MISSION.md` asks for "component search". Plans 431, 561 and 564 made a
component's **title**, its exported symbols, its part names and its generated
rows rank first, and they taught the ranker to match a multiword phrase where
every word prefixes part of a name. What none of them can do is match a reader
who names a component with a word the component never uses. Measured against
the production index on 2026-10-19 (`52ec5b7e`):

| Query | First result today | What the reader meant |
| ----- | ------------------ | --------------------- |
| `textbox` | *nothing* | Text inputs |
| `navbar` | *nothing* | Navigation Menu |
| `snackbar` | *nothing* | Toasts / notifications |
| `kbd` | *nothing* | Keyboard shortcuts / keycap display |
| `searchbox` | *nothing* | Search inputs |
| `text box` | Text / typography | Text inputs |
| `check box` | Boxes / containers | Checkboxes |
| `combo box` | Boxes / containers | Comboboxes |
| `radio button` | Buttons | Radio groups |
| `one time password` | prose rows, no page | OTP Field |
| `modal` | prose rows, no page | Dialogs |
| `search box` | Boxes / containers | Search inputs |
| `number input` | Text inputs | Number Field |
| `tags input` | Text inputs | Tag / token input |
| `field group` | Inline validation | Fieldset |
| `side sheet` | prose rows, no page | Drawer |
| `colour picker` | Colour roles (Theming) | Color picker |
| `chips` | prose rows, no page | Tag / token input |

The cause is structural, not a ranking bug: the Fumadocs registry document is
built from the record's `title`, `summary`, `parts` and `api`, so a term that
occurs in none of them is not in the index at all. `textbox` cannot be rescued
by a ranker because the registry never returns the document.

## 1. The rule

1. **Reader vocabulary is one reviewed table, not a keyword dump.**
   `apps/docs/src/lib/component-aliases.ts` maps a record slug to the terms a
   reader really types when the record's own fields cannot match them:
   `textbox`, `text box`, `text field` for `text-input`; `one time password`
   for `otp-field`; `modal` for `dialog`. A term that merely repeats the title
   (`buttons`) does not belong. A term that names another component is
   forbidden, because it would misroute a query.
2. **The alias is a search fact, not a component fact.** It does not enter the
   record schema: `ComponentMeta` describes the component (status, source,
   props, limitations), while a synonym is editorial search metadata used by
   two consumers. One table keeps the vocabulary reviewable in one diff and
   avoids a schema migration across 68 records and their fixtures.
3. **All three readers use it.** The registry index adds every alias to the
   document's content and keywords (retrieval), `componentRank` ranks an alias
   exactly like a name (ranking), and `matchesComponent` searches it in the
   component index's own filter (the same words work without ⌘K).
4. **The table is guarded.** `src/lib/component-aliases.test.ts` fails when a
   key is not a record, a term is empty/uppercase/whitespace-padded, one term
   is used by two records, a term shadows another record's title or exported
   symbol, or an alias is missing from its record's search document.
5. **The production index is proven.** `smoke:build` queries two aliases that
   return nothing today (`textbox`, `one time password`) and requires the
   component page first — the dev-only suite is not the release gate.
6. **The rule is documented** on `/docs/component-pages` (the record and its
   guards) and in `apps/docs/README.md` (`## Search`).

## 2. Files

| Path | Change |
| ---- | ------ |
| `apps/docs/src/lib/component-aliases.ts` | new — `componentAliases`, `aliasesFor` |
| `apps/docs/src/lib/component-aliases.test.ts` | new — the table guards and the document guard |
| `apps/docs/src/lib/search.ts` | `componentSearchIndex` content/keywords, `componentRank` |
| `apps/docs/src/lib/search.test.ts` | new integration cases: every alias reaches its page first; a plain word keeps its page |
| `apps/docs/src/components/component-index.tsx` | `matchesComponent` includes the record's aliases |
| `apps/docs/src/components/component-index.test.tsx` | one filter case using an alias |
| `apps/docs/scripts/smoke-build.ts` | two `searchChecks` rows |
| `apps/docs/content/docs/component-pages.mdx` | `### Search vocabulary` under `## The record` |
| `apps/docs/README.md` | one paragraph in `## Search` |
| `TODO.md`, `.agents/slop/plans/README.md`, `PLAN.md` | tick, index and record D45 |

No package, token, preview, theme, navigation or component-page file changes.
Every page that gains a search result already exists.

## 3. The table

Keep it to the measured vocabulary and the few obvious neighbours; a term is
only added when a reader would type it and the record's fields cannot match.

```ts
export const componentAliases: ReadonlyMap<string, readonly string[]> =
  new Map<string, readonly string[]>([
    ["text-input", ["textbox", "text box", "text field"]],
    ["checkbox", ["check box", "tick box"]],
    ["radio-group", ["radio button", "radio buttons"]],
    ["combobox", ["combo box"]],
    ["otp-field", ["one time password", "one-time password", "one time code", "one-time code"]],
    ["dialog", ["modal", "modal window"]],
    ["navigation-menu", ["navbar", "nav bar"]],
    ["search-input", ["searchbox", "search box", "search bar", "search field"]],
    ["number-field", ["number input", "numeric input"]],
    ["tag-input", ["chips", "chips input", "tags input"]],
    ["hotkey-input", ["shortcut recorder"]],
    ["drawer", ["side sheet"]],
    ["fieldset", ["field group"]],
    ["toast", ["snackbar"]],
    ["keycap", ["kbd"]],
    ["color-picker", ["colour picker", "colourpicker"]],
  ]);
```

`aliasesFor(slug)` returns `[]` for every other record, so call sites never
branch. The exact spelling is lower-case because `matchRank` normalises the
query, and a whole-query alias match earns rank `0` — the same as a title —
while a translated phrase such as `one time password` is only reachable as a
whole term, never by its individual words (`time` stays on Timeline, `password`
matches nothing).

Terms deliberately **not** added, because they are another component's title or
are ambiguous: `box` (Boxes), `input` (Text inputs), `search` (Search inputs),
`menu` (three menus), `popup` (Dialog or Popover), `sheet` (Drawer or a data
grid), `toolbar` (a roadmap target), and `confirm modal` (the confirmation-flow
pattern is a legitimate first result).

## 4. Steps

1. Write `component-aliases.ts` and `component-aliases.test.ts` with the table
   above. Wire the three readers. Run:

   ```sh
   nub run --filter docs test -- src/lib/component-aliases.test.ts
   ```

   Expected: pass. Removing `"textbox"` from the map is caught by the search
   integration test in step 2 (`textbox -> nothing`), not by the table guard —
   the guard proves the table's shape and its wiring, and the integration test
   proves the term is present and reaches the page. Adding
   `["dialog", ["box"]]` fails the shadow guard with `box`.

2. Add the integration cases to `src/lib/search.test.ts` and run them **before**
   the wiring is complete, to record the failing direction:

   ```sh
   nub run --filter docs test -- src/lib/search.test.ts
   ```

   Expected before wiring: `finds a component by the words readers use` fails
   for `textbox` (`nothing`), `navbar`, `snackbar`, `kbd`, `searchbox`, `check
   box` (Boxes first), `one time password` (no page), `modal` (no page), and
   the rest of the table. Expected after: pass.

3. Add the filter case to `src/components/component-index.test.tsx`:

   ```sh
   nub run --filter docs test -- src/components/component-index.test.tsx
   ```

   Expected: `matchesComponent(record("checkbox"), "check box")` is `true`,
   `matchesComponent(record("box"), "check box")` is `false`, and the rendered
   `?q=textbox` view holds exactly the Text inputs card.

4. Add the two production checks to `scripts/smoke-build.ts`:

   ```ts
   { query: "textbox", expected: "/docs/components/text-input", first: true,
     what: "reader vocabulary for a component's title" },
   { query: "one time password", expected: "/docs/components/otp-field", first: true,
     what: "reader vocabulary that is an abbreviation's expansion" },
   ```

5. Document the rule in `content/docs/component-pages.mdx` (three sentences
   plus the guard row) and `apps/docs/README.md` (`## Search`).

6. Run the full gate:

   ```sh
   nub run --filter docs test
   nub run --filter docs check-types
   nub run --filter docs build
   nub run --filter docs smoke:build
   nub run check
   nub run lint
   ```

   Expected: 85 test files pass (was 84 / 584), type-check and build exit `0`,
   the crawl reports `search checked`, and both root gates exit `0`. The crawl
   builds, so `smoke:build` is the slow step; run it after the unit suite is
   green.

7. Tick `TODO.md`, add the plan row to the plan index, record D45 in
   `PLAN.md`, commit and push `agent/docs-site`.

## 5. Test plan (what each test can catch)

| Test | Fails when |
| ---- | ---------- |
| `component-aliases.test.ts` — keys | an alias is keyed to a typo or a removed record |
| `component-aliases.test.ts` — normal form | a term is added as `Textbox`, with padding, or empty |
| `component-aliases.test.ts` — uniqueness | two records claim `modal`, so the winner is registry order |
| `component-aliases.test.ts` — shadowing | an alias equals another record's title (`buttons`) or exported symbol (`Spinner`) |
| `component-aliases.test.ts` — indexed | the table is written but `componentSearchIndex` never reads it |
| `search.test.ts` — vocabulary | any alias does not reach its own page first through the real Fumadocs + registry index |
| `search.test.ts` — plain words | an alias steals `box` (Boxes), `input` (Text inputs) or `search` (Search inputs) |
| `component-index.test.tsx` | the local filter does not search aliases, or matches a component whose alias belongs to another |
| `smoke:build` | the production index loses an alias, or a build-time change stops the registry document reaching `/api/search` |
| `nub run check` | a type, format or Effect-pattern regression in the new module |

## 6. STOP conditions

- Stop if an alias cannot reach its page **first** without moving another
  component off its own exact title. Report the measured list; do not weaken
  the existing title assertions in `search.test.ts`.
- Stop if `smoke:build` exits `2` (no server, no build): that is not a pass.
  Report the command and its output.
- Do not add aliases to `packages/*`, to `COMPONENTS.md`, to component records
  or to the MDX pages; this is docs search metadata only.
- Do not add a synonym that names a different shipped component or a roadmap
  target with its own page. If a term is genuinely ambiguous, leave it out and
  record it in §3.
- Do not add fuzzy matching, stemming or edit distance in this plan. A term a
  reader types is either in the table or it is not; a fuzzy ranker would hide
  an unknown vocabulary gap instead of making it a one-line fix.

## 7. Acceptance

- Every term in §3 returns its component's page first from `/api/search`.
- `box`, `input`, `search`, `menu` and the other plain words keep their current
  first result.
- The component index's filter finds a record by an alias, and no other record.
- The alias table's invariants are guarded, and the production crawl proves two
  terms that return nothing today.
- `nub run --filter docs test`, `check-types`, `build`, `smoke:build`,
  `nub run check` and `nub run lint` pass; the two-direction proofs are recorded
  in §8.

## 8. Measured result (2026-10-19)

- **Before** (`src/lib/search.test.ts`, the new vocabulary test, `52ec5b7e` +
  this plan's tests): 20 of 21 cases wrong —
  `textbox`, `navbar`, `searchbox`, `snackbar`, `kbd` → nothing;
  `text box` → Text / typography; `check box` and `tick box` → Boxes;
  `combo box` → Boxes; `radio button` → Buttons;
  `one time password` → Timeline; `one-time code`, `modal` and `chips` → prose
  fragments; `search box` → Boxes; `number input` and `tags input` → Text
  inputs; `side sheet` → Preview Card prose; `field group` → Inline validation;
  `colour picker` → Theming. `shortcut recorder` already reached its page.
- **After:** every §3 term reaches its component page first, and the plain-word
  guard still returns Boxes for `box`, Text inputs for `input`, Search inputs
  for `search`, Context menus for `menu`, Inline validation for `field`,
  Lists / list items for `list` and Selects for `select`.
- **Unit suite:** 85 files / 594 tests pass (was 84 / 584). New files:
  `src/lib/component-aliases.test.ts` (7 tests) plus the vocabulary and
  plain-word integration cases and the index-filter case.
- **Type-check, lint:** `nub run --filter docs check-types` and `nub run lint`
  exit `0`.
- **Built crawl:** `nub scripts/smoke-build.ts --no-build` reports
  `sitemap 96 pages`, `pages 96 checked`, `links 119 checked`,
  `anchors 1260 checked`, `search checked`, `ok`, exit `0`. The two new
  production checks (`textbox` → Text inputs, `one time password` → OTP Field)
  are inside that pass.
- **Regression found and fixed before landing:** ranking aliases through
  `nameRank` let the Dialogs alias `modal` outrank the
  `modal-focus-trap` capability row for `modal focus`
  (`capability-search.test.ts`: `expected '/docs/capabilities', received
  '/docs/components/dialog'`). Aliases now match the **whole query** only
  (`aliasRank`), so a phrase keeps the token rule for titles and the
  capability test is green.
- **Two-direction proofs, measured and reverted:**
  1. `textbox` removed from the table → the integration test failed
     `finds a component by the words readers use for it` with
     `[ 'textbox -> nothing' ]` (`1 failed | 592 passed`); restored, green.
  2. `"box"` added to the Dialog aliases → the table guard failed
     `does not shadow another record's title or exported symbol` with
     `expected [ 'box' ] to deeply equal []` (`1 failed | 592 passed`);
     restored, green.
  3. The `modal focus` defect above is a third measured direction: the
     capability suite failed while aliases entered the phrase ranker, and
     passed once they did not.
- **Documents changed:** `content/docs/component-pages.mdx` gains
  `### Search vocabulary` with its guard table; `apps/docs/README.md` gains the
  paragraph against `## Search`.
