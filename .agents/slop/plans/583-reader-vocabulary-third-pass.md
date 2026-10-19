# 583 — Reader vocabulary, third pass: the words a third sweep still misses

**Phase:** F (search quality)
**Workstream:** docs-site
**Depends on:** 410 (docs site), 419/431 (search), 561/564 (name ranks),
566 (the first alias table), 568/569 (page description and generated-name
ranks), 574 (page subjects), 579 (the second alias pass), 582 (the last
search-facing change)
**Status:** planned

## 1. The measured defect

Plans 566 and 579 built one guarded reader-vocabulary table, and plans 568, 574
and 579 made a page's authored description a search signal for the subjects the
page owns. Both mechanisms were measured against the terms reported at the
time. A third sweep on 2026-10-19, run through the real `search()` function over
the real Fumadocs index, found three residual classes:

1. **A component named the way readers say it still returns nothing or the
   wrong component.** The registry document is built from the title, summary,
   parts and props types; the alias table covers the terms plans 566 and 579
   measured, not the next set.
2. **A platform or workspace subject named by a page's summary does not use the
   word a reader types.** Theming owns the platform styles but does not name
   macOS, Linux or Windows; Workspace owns resizable splits and inspector panels
   but names neither in its summary, so prose from other pages wins.
3. **A real limitation has no page at all.** `rtl` returns nothing: the layout
   pages list what the runtime cannot do, but not right-to-left layout.

Measured before the fix (`search(term, 3)`, first three URLs):

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `cmdk` | *nothing* | Command menus |
| `autosuggest` | *nothing* | Comboboxes |
| `auto suggest` | `/docs/components/text-area#accessibility-and-limitations` | Comboboxes |
| `gauge` | *nothing* | Meter |
| `gauges` | *nothing* | Meter |
| `pill` | `/docs/components/range-slider#accessibility-and-limitations` | Badges |
| `callout` | `/docs/theming#the-docs-site-itself` | Alerts |
| `callouts` | *nothing* | Alerts |
| `busy` | `/docs/components/confirm-dialog#accessibility-and-limitations` | Loading indicators |
| `sheet` | `/docs/components/keycap#composition` | Drawers |
| `macos` | `/docs/components/hotkey-input#states` | Theming (platform styles) |
| `linux` | `/docs/components/keycap#variants` | Theming (platform styles) |
| `windows` | `/docs/components/keycap#accessibility-and-limitations` | Theming (platform styles) |
| `resizable` | `/docs/components/dialog#accessibility-and-limitations` | Workspace |
| `inspector` | `/docs/components/stack#composition` | Workspace |
| `rtl` | *nothing* | Layouts |

Every one of these is a real reader word for a page the site already ships. The
failure is not a ranker defect: the alias table has no entry, the summary has no
word, or the page has no sentence. Plans 566 and 579 measured the same class of
bug; this is the next measured set, not a new keyword policy.

The existing mechanisms are already the right ones:

- `src/lib/component-aliases.ts` (plan 566) feeds the registry index, the
  ranker (`aliasRank`) and the component index's filter. An alias matches the
  **whole** query only (plan 579), so a generic word cannot steal another
  component's subject.
- A hand-authored page's frontmatter `description` is scored one tier below its
  title (plan 568), and plan 574's rule is that the summary names every subject
  the page owns. Alternate names are authored metadata, not a ranker rule.
- A limitation the runtime cannot implement belongs in the page's own "what the
  runtime cannot do" prose (plan 426), where a reader searching the limitation
  finds the answer instead of an empty result.

## 2. What to build

### 2.1 `apps/docs/src/lib/component-aliases.ts`

Extend the existing map. Keep it alphabetical-ish by slug as it is today; no new
table, no new ranker rule, no schema field. Add only the measured terms:

| Slug | Add |
| ---- | --- |
| `command-menu` | `cmdk` |
| `combobox` | `autosuggest`, `auto suggest` |
| `meter` | `gauge`, `gauges` |
| `badge` | `pill` |
| `alert` | `callout`, `callouts` |
| `spinner` | `busy` |
| `drawer` | `sheet` |

Rules:

- Lower-case and trimmed; the generic guard rejects anything else.
- Do not add a bare `pills` or `sheets`: the plural forms already reach Badges
  and Drawers through prose, so they would be entries with no measured defect.
- Do not add `keybinding`: `key binding` already reaches Keycap and the term is
  ambiguous between the display (Keycap) and the recorder (Hotkey-recorder
  input). Ambiguity is not a recovery.
- Do not add `omnibox`, `spotlight` or `palette`: the Command menu page already
  owns `command bar`, `command k` and `palette`; a second browser-vocabulary word
  would be a guess, not a measured reader word.
- `sheet` goes to Drawers because `side sheet` and `side panel` already do; a
  spreadsheet meaning is not a component in this library.
- `busy` goes to Loading indicators because the spinner is the busy state; the
  Confirm dialog merely mentions it in a limitation.
- `cmdk` is the ecosystem name for the command palette primitive; it is not a
  component title or symbol, so the shadow guard stays green.

### 2.2 Page summaries (plan 568/574 mechanism)

- `apps/docs/content/docs/theming.mdx` — change the description to:

  ```yaml
  description: Semantic colour roles, spacing, radius, density and elevation, light and dark themes, platform styles for macOS, Linux and Windows, and the extension mechanism.
  ```

  Truth: the page owns `## Platform styles`, renders the platform values,
  the structural diff and the previews. The platform style currently changes
  typography and the theme name (plan 576); naming the three platforms does not
  claim colours have shipped.

- `apps/docs/content/docs/workspace.mdx` — change the description to:

  ```yaml
  description: Panels, resizable splits, sidebars, tabs, docking and inspector panels for desktop applications.
  ```

  Truth: the page's prose says "resizable split panes", and "Inspector panels"
  is a Tier 4 inventory target the Workspace page owns (generated on the
  Roadmap). Naming it does not claim the package is published; the page says it
  is not.

No other page summary changes: `layouts.mdx` keeps its existing description, and
`data-display.mdx` keeps `datagrids` (plan 579).

### 2.3 `apps/docs/content/docs/layouts.mdx`

Add to the closing paragraph, after the existing responsive/ragged/tinted list:

> Right-to-left layout is not implemented: the pinned runtime's style surface has
> no `direction`, and the primitives place children with `row`/`column` only, so
> nothing mirrors for an RTL locale. That is a library limitation, not a theme
> option.

Do not promise RTL, a roadmap row or a plan number: the site cannot serve a
plan file, and the component inventory has no RTL target yet.

### 2.4 `apps/docs/src/lib/search.test.ts`

Add one focused case after the plan-579 vocabulary case. Keep the existing
tables; the new case is additive so a regression names the plan that introduced
the term.

```ts
/**
 * Plan 583: a third measured sweep. `cmdk`, `autosuggest`, `gauge`, `pill`,
 * `callout`, `busy` and `sheet` still returned nothing or another page; the
 * Theming summary did not name the three platform styles it owns, and the
 * Workspace summary did not name the resizable splits or inspector panels. The
 * Layouts page had no RTL sentence, so the limitation had no answer.
 */
it("finds the third set of reader words and page subjects (plan 583)", async () => {
  const expected = [
    ["cmdk", "/docs/components/command-menu"],
    ["autosuggest", "/docs/components/combobox"],
    ["auto suggest", "/docs/components/combobox"],
    ["gauge", "/docs/components/meter"],
    ["gauges", "/docs/components/meter"],
    ["pill", "/docs/components/badge"],
    ["callout", "/docs/components/alert"],
    ["callouts", "/docs/components/alert"],
    ["busy", "/docs/components/spinner"],
    ["sheet", "/docs/components/drawer"],
    ["macos", "/docs/theming"],
    ["linux", "/docs/theming"],
    ["windows", "/docs/theming"],
    ["resizable", "/docs/workspace"],
    ["inspector", "/docs/workspace"],
    ["rtl", "/docs/layouts"],
  ] as const;
  // …same `misses` shape as the plan-579 cases: the first result's URL, split
  // at "#", must equal the expected page; a text result still counts when the
  // page is the destination.
});
```

The assertion for the platform/workspace/limitation rows is the **page**, not a
heading: split the result URL at `#` and compare. The component rows assert the
same page-through-URL shape, so `pill → range-slider` fails by query.

### 2.5 `apps/docs/scripts/smoke-build.ts`

Add two production checks to `searchChecks`:

```ts
{
  query: "cmdk",
  expected: "/docs/components/command-menu",
  first: true,
  what: "reader vocabulary recovered by the third alias pass",
},
{
  query: "macos",
  expected: "/docs/theming",
  first: true,
  what: "a platform name authored in the Theming summary",
},
```

Two checks are enough to prove both mechanisms in the built index; the unit
suite owns the full list.

### 2.6 `.agents/slop/plans/README.md`, `TODO.md` and `apps/docs/README.md`

- Add the plan row to the docs table.
- Add a ticked task to the docs workstream after the gates pass; keep the
  progress bar current.
- In the README's **Search** section, extend the reader-vocabulary paragraph with
  one sentence naming plan 583 and the measured terms, and state that the
  Theming/Workspace summaries and the Layouts limitation are the same summary
  and prose mechanism, not a new ranker.

Do not add a `COMPONENTS.md` row: no component changed.

## 3. Tests

### 3.1 `apps/docs/src/lib/component-aliases.test.ts` (existing)

No new test file: its generic guards already prove every new term.

- every key is a record;
- every term is lower-case and trimmed;
- no term is shared between records;
- no term shadows another record's title or exported symbol;
- every term appears in its record's search document.

Run it; a shadowing term (for example `sheet` as an alias for `drawer` while a
record is titled "Sheets") must fail by name.

### 3.2 `apps/docs/src/lib/search.test.ts` (extended)

- The plan-583 case fails by `query -> first URL` for all sixteen rows.
- The existing plain-word cases stay green: `input`, `label`, `menu`, `field`,
  `select`, `list`, `panel`, `table`, `aria`, `spacing` and `focus ring` must not
  move.
- The `panel` case is the regression guard for a broad alias: do not add `panel`
  to Drawers or any other record.

### 3.3 `apps/docs/scripts/smoke-build.ts`

The two added checks run against the built `/api/search`, so a production build
that loses the alias table or the summary change fails by URL and plan name.

### 3.4 Two-direction proofs

Record the measured result in §6:

1. Remove `cmdk` from Command menus → the plan-583 case fails
   `cmdk -> nothing`.
2. Remove `pill` from Badges → the case fails `pill -> /docs/components/range-slider#…`.
3. Remove `busy` from Loading indicators → the case fails
   `busy -> /docs/components/confirm-dialog#…`.
4. Remove `macOS` from the Theming description → the case fails
   `macos -> /docs/components/hotkey-input#…`.
5. Remove `inspector` from the Workspace description → the case fails
   `inspector -> /docs/components/stack#…`.
6. Remove the RTL sentence from Layouts → the case fails `rtl -> nothing`.
7. Add `panel` as a Drawer alias → plan 574's `panel` case fails, proving the
   whole-query alias rule still protects the Workspace subject.
8. Restore all seven; the suite is green again.

## 4. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

```sh
# 1. focused unit suites; expect green
cd apps/docs
nub exec vitest run src/lib/search.test.ts src/lib/component-aliases.test.ts

# 2. all docs tests; expect 97 files / 700+ tests green
cd ../..
nub run --filter docs test

# 3. strict types; expect exit 0
nub run --filter docs check-types

# 4. production build and crawl; expect exit 0 and the two new queries green
nub run --filter docs smoke:build

# 5. repository gates; expect exit 0
nub run check
nub run lint
nub run test
```

`smoke:build` exits `2` when it cannot build or serve; that is "unverified",
never a pass. A command that did not run is not a pass.

## 5. STOP conditions

- A proposed term is another component's title or exported symbol: stop and
  report it; do not weaken the shadow guard.
- A term needs a page-level alias rather than an authored summary: stop. Plans
  568/574 chose the summary as the page mechanism; do not add a second keyword
  system in this change.
- `macos`, `linux` or `windows` reaches a component page after the Theming
  description change: stop and report the measured URLs; the summary rule may
  need the subject word in a different position, not a new ranker.
- `inspector` or `resizable` reaches a component page after the Workspace
  description change: stop and report; do not add a synthetic roadmap entry.
- The RTL sentence becomes false because the library gains direction support in
  the same change: stop; this plan documents a limitation and must not outlive
  it.
- A docs test outside the touched files fails: read it before changing any
  expectation. A new alias can legitimately change one assertion; it cannot
  justify deleting a case.
- `smoke:build` exits `2`: report the exact command and output; do not mark the
  plan done.

## 6. Results (measured 2026-10-19)

_To be filled by the executor after the gates run._

| Command | Result |
| ------- | ------ |
| focused search/alias suites | |
| `nub run --filter docs test` | |
| `nub run --filter docs check-types` | |
| `nub run --filter docs smoke:build` | |
| `nub run check` | |
| `nub run lint` | |
| `nub run test` | |

Two-direction proofs, each run alone with the focused suite and then restored:

| Forced defect | Measured failure |
| ------------- | ---------------- |
| `cmdk` alias removed | |
| `pill` alias removed | |
| `busy` alias removed | |
| `macOS` removed from Theming summary | |
| `inspector` removed from Workspace summary | |
| RTL sentence removed from Layouts | |
| `panel` added as a Drawer alias | |
| all restored | |

## 7. Acceptance

- The 16 measured queries in §1 reach the page that owns the subject (the first
  result's URL, split at `#`).
- No new ranker, schema field, page-alias table or hand-written search document
  exists; the change is the existing alias table plus two authored summaries and
  one limitation sentence.
- `component-aliases.test.ts`, `search.test.ts` and `smoke:build` fail by term
  when a new alias, summary word or sentence is removed.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`,
  `nub run lint` and `nub run test` pass; the plan index, `TODO.md` and
  `apps/docs/README.md` record the change.
