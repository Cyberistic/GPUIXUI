# 579 — Reader vocabulary, second pass: the words the index still misses

**Phase:** F (search quality)
**Workstream:** docs-site
**Depends on:** 410 (docs site), 419/431 (search), 561/564 (name ranks),
566 (the first alias table), 568/569 (page description and generated-name
ranks), 574 (page subjects), 577 (the last search-facing change)
**Status:** implemented

## 1. The measured defect

Plan 566 built one guarded reader-vocabulary table and plan 574 made a page's
authored description a search signal. Both were measured against the terms
reported at the time. A second sweep on 2026-10-19, run through the real
`search()` function over the real Fumadocs index, found two residual classes:

1. **A component named the way readers say it still returns nothing or the
   wrong component.** The registry document is built from the title, summary,
   parts and props types; the alias table covers the terms 566 measured, not
   the next set.
2. **A page whose summary names the subject does not name the alternate word.**
   `datagrid` is not `data grids`, and `sidebar` is not `panels, splits, tabs`.

Measured before the fix (`search(term, 3)`, first three URLs):

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `pin code` | `/docs/components/text#variants` | OTP Field |
| `passcode` | *nothing* | OTP Field |
| `verification code` | `/docs/components/otp-field#accessibility-and-limitations` | OTP Field (headings, not the page) |
| `typeahead` | *nothing* | Comboboxes |
| `auto complete` | `/docs/components/timeline#states` | Comboboxes |
| `autocomplete` | `/docs/components/tag-input#accessibility-and-limitations` | Comboboxes |
| `hover card` | `/docs/components/card` | Preview Card |
| `hovercard` | *nothing* | Preview Card |
| `menubar` | *nothing* | Navigation Menu |
| `menu bar` | `/docs/components/context-menu` | Navigation Menu |
| `collapse` | `/docs/components/accordion#accessibility-and-limitations` | Collapsible sections |
| `vstack` | `/docs/api-values` | Stack |
| `hstack` | `/docs/api-values` | Stack |
| `icon button` | `/docs/components/icon` | Buttons |
| `fab` | `/docs/api-values` | Buttons |
| `segmented control` | `/docs/theming#scales-and-control-metrics` | Button groups |
| `segmented` | `/docs/components/meter#variants` | Button groups |
| `toggle group` | `/docs/components/toggle` | Button groups |
| `wizard` | *nothing* | Stepper |
| `side panel` | `/docs/components/tabs#composition` | Drawer |
| `sidepanel` | *nothing* | Drawer |
| `banner` | `/docs/component-pages#the-blocks` | Alerts |
| `scrollview` | *nothing* | Scrollable containers |
| `popup` | `/docs/components/combobox#keyboard-and-focus` | Popovers |
| `dropdown list` | `/docs/components/list` | Selects |
| `swatch` | `/docs/components/color-picker#keyboard-and-focus` | Color picker |
| `datagrid` | *nothing* | Data display |
| `sidebar` | `/docs/components/stack#composition` | Workspace |

`data grid` is deliberately **not** in the recovery set. It reached Stack through
`Grid`, a real exported layout primitive whose symbol plan 564 promotes; the
tabular meaning needs its own word. `data-display.mdx` therefore names
`datagrids`, and the stack page keeps `data grid`.

Every one of these is a real reader word for a page the site already ships. The
failure is not a ranker defect: the alias table simply has no entry, and the
summary has no word for the alternate name. Plan 566 measured the same class of
bug for `textbox`, `navbar`, `snackbar`, `kbd`, `searchbox`, `modal`, `check
box` and `one time password`; this is the next measured set, not a new keyword
policy.

The existing mechanisms are already the right ones:

- `src/lib/component-aliases.ts` (plan 566) feeds the registry index, the
  ranker (`aliasRank`) and the component index's filter. An alias matches the
  **whole** query only, so `modal focus` keeps the capability row.
- A hand-authored page's frontmatter `description` is scored one tier below its
  title (plan 568), and plan 574's rule is that the summary names every subject
  the page owns. Alternate names are authored metadata, not a ranker rule.

## 2. What to build

### 2.1 `apps/docs/src/lib/component-aliases.ts`

Extend the existing map. Keep it alphabetical-ish by slug as it is today; no new
table, no new ranker rule, no schema field. Add only the measured terms:

| Slug | Add |
| ---- | --- |
| `otp-field` | `pin code`, `passcode`, `verification code` |
| `combobox` | `typeahead`, `autocomplete`, `auto complete`, `auto-complete`, `suggestions` |
| `preview-card` | `hover card`, `hovercard` |
| `navigation-menu` | `menubar`, `menu bar`, `hamburger`, `hamburger menu` |
| `collapsible` | `collapse`, `collapsed section` |
| `stack` | `vstack`, `hstack`, `v stack`, `h stack`, `vertical stack`, `horizontal stack`, `flex`, `flexbox` |
| `button` | `icon button`, `icon-only button`, `fab`, `floating action button` |
| `button-group` | `segmented control`, `segmented`, `toggle group`, `toggle-group` |
| `stepper` | `wizard`, `multi step`, `multi-step`, `multi step form` |
| `drawer` | `side panel`, `sidepanel` |
| `alert` | `banner` |
| `scroll-area` | `scrollview`, `scroll view`, `scroll pane` |
| `popover` | `popup` |
| `select` | `select box`, `dropdown list`, `multi select`, `multi-select` |
| `color-picker` | `swatch`, `swatches` |

Rules:

- Lower-case and trimmed; the generic guard rejects anything else.
- Do not add a bare `pin` (the Message scroller documents a pinned state) or a
  bare `panel` (Workspace owns it). The alias must be unambiguous.
- `popup` goes to Popovers because that page owns the popup primitive; the
  Combobox popup is a detail of that component's own page.
- `flex` goes to Stack because Stack is the layout primitive that documents the
  runtime's flex layout; it is not a component title or symbol.
- An alias names the **whole** query. Plan 566 said so, but `aliasRank` used
  `matchRank`, whose word tier matched a generic word inside a multiword alias:
  adding `side panel` made `panel` reach Drawer and stole Workspace's subject
  (measured by plan 574's `panel` case). `search.ts` gains a small
  `aliasMatchRank` — exact `0`, query prefix `1`, nothing else — and
  `aliasRank` uses it. This is the implementation of the rule that was already
  documented, not a new ranking tier. The existing plain-word cases (`input`,
  `label`, `menu`, `field`, `select`, `list`, `panel`) must stay green.

### 2.2 Page summaries (plan 568/574 mechanism)

- `apps/docs/content/docs/data-display.mdx` — change the description to:

  ```yaml
  description: Tables, datagrids, selection, and virtualized data presentation.
  ```

- `apps/docs/content/docs/workspace.mdx` — change the description to:

  ```yaml
  description: Panels, sidebars, splits, tabs and docking for desktop applications.
  ```

No other page summary changes: `layouts.mdx` already owns `grids` for the layout
`Grid`, and `data-display.mdx` is the page that owns tabular data. `data grid`
is not recovered by the summary because `Grid` is a real exported layout
primitive; the summary's `datagrids` gives the table meaning an unambiguous
word.

### 2.3 `apps/docs/src/lib/search.test.ts`

Add the new terms to the existing plan-566 table (`finds a component by the words
readers use for it`) and add a focused case for the summary words, so the bug is
named where a future reader can see it:

```ts
/**
 * Plan 579: a second measured sweep. The first alias table and the first
 * summary pass covered the terms plan 566/574 reported; `typeahead`,
 * `passcode`, `wizard`, `datagrid` and `sidebar` still returned nothing or a
 * different page. These cases fail by query when a term is dropped.
 */
it("finds a component by the second set of reader words (plan 579)", async () => {
  const expected = [
    ["pin code", "otp-field"],
    ["passcode", "otp-field"],
    ["verification code", "otp-field"],
    ["typeahead", "combobox"],
    ["autocomplete", "combobox"],
    ["auto complete", "combobox"],
    ["hover card", "preview-card"],
    ["hovercard", "preview-card"],
    ["menubar", "navigation-menu"],
    ["menu bar", "navigation-menu"],
    ["collapse", "collapsible"],
    ["vstack", "stack"],
    ["hstack", "stack"],
    ["icon button", "button"],
    ["fab", "button"],
    ["segmented control", "button-group"],
    ["segmented", "button-group"],
    ["toggle group", "button-group"],
    ["wizard", "stepper"],
    ["side panel", "drawer"],
    ["sidepanel", "drawer"],
    ["banner", "alert"],
    ["scrollview", "scroll-area"],
    ["popup", "popover"],
    ["dropdown list", "select"],
    ["swatch", "color-picker"],
  ] as const;
  // …same `misses` shape as the plan-566 case…
});

it("reaches a page by the alternate name its summary names (plan 579)", async () => {
  const expected = [
    ["datagrid", "/docs/data-display"],
    ["sidebar", "/docs/workspace"],
  ] as const;
  // …asserts the first result is a `type: "page"` under the URL…
});
```

The plan-566 table keeps its existing entries; do not replace them. The new
case is additive so a regression names the plan that introduced the term.

### 2.4 `apps/docs/scripts/smoke-build.ts`

Add two production checks to `searchChecks`:

```ts
{
  query: "typeahead",
  expected: "/docs/components/combobox",
  first: true,
  what: "reader vocabulary recovered by the second alias pass",
},
{
  query: "datagrid",
  expected: "/docs/data-display",
  first: true,
  what: "an alternate name authored in a page summary",
},
```

Two checks are enough to prove both mechanisms in the built index; the unit
suite owns the full list.

### 2.5 `apps/docs/README.md`

In **Search**, extend the reader-vocabulary paragraph with one sentence and name
plan 579: the second pass added the measured terms (`typeahead`, `passcode`,
`wizard`, `pin code`, `segmented control`, `hover card`, …), and the Data
display/Workspace summaries now name `datagrids` and `sidebars`. State that the
same table and the same summary rule are used; no new mechanism was added.

### 2.6 `.agents/slop/plans/README.md` and `TODO.md`

Add the plan row to the docs table and a ticked task to the docs workstream
after the gates pass. Do not add a `COMPONENTS.md` row: no component changed.

## 3. Tests

### 3.1 `apps/docs/src/lib/component-aliases.test.ts` (existing)

No new test file: its generic guards already prove every new term.

- every key is a record;
- every term is lower-case and trimmed;
- no term is shared between records;
- no term shadows another record's title or exported symbol;
- every term appears in its record's search document.

Run it; a shadowing term (for example `button` as an alias for `button-group`)
must fail by name.

### 3.2 `apps/docs/src/lib/search.test.ts` (extended)

- The plan-566 table gains no entries in place; the plan-579 case owns the new
  terms and fails by `query -> first URL`.
- The summary case asserts the first result is a **page** under the expected
  URL, not a heading. `datagrid` must reach `/docs/data-display`; `sidebar` must
  not remain on Stack.
- The existing "keeps a plain word on the page that titles it" case must stay
  green, including `input`, `label`, `menu`, `field`, `select`, `list` and
  `panel`. The `panel` case is what caught the alias word-tier leak in §2.1.

### 3.3 `apps/docs/scripts/smoke-build.ts`

The two added checks run against the built `/api/search`, so a production build
that loses the alias table or the summary change fails by URL and plan name.

### 3.4 Two-direction proofs

Record the measured result in §6:

1. Remove `typeahead` from the Combobox aliases → `search.test.ts` fails
   `typeahead -> nothing`.
2. Remove `datagrids` from the Data display description → the summary case fails
   `datagrid -> …`.
3. Remove `sidebars` from the Workspace description → the summary case fails
   `sidebar -> …`.
4. Restore `matchRank` in `aliasRank` → plan 574's `panel` case fails
   `panel -> /docs/components/drawer`.
5. Add `button` as an alias for `button-group` → `component-aliases.test.ts`
   fails the shadow guard by term.
6. Restore all five; the suite is green again.

## 4. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

```sh
# 1. focused unit suites; expect green
cd apps/docs
nub x vitest run src/lib/search.test.ts src/lib/component-aliases.test.ts

# 2. all docs tests; expect 93 files / 66x tests green
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
- A term needs a page-level alias rather than an authored summary: stop. Plan
  574 chose the summary as the page mechanism; do not add a second keyword
  system in this change.
- `search("popup")` becomes a different page because a new page ships later:
  update the measured table only if the new page owns the popup primitive;
  otherwise stop.
- The Data display or Workspace description changes meaning (for example it
  stops naming tables or panels): rewrite it so both the original subject and
  the alternate name are present; do not move the word to another page.
- A docs test outside the touched files fails: read it before changing any
  expectation. A new alias can legitimately change one assertion; it cannot
  justify deleting a case.
- `smoke:build` exits `2`: report the exact command and output; do not mark the
  plan done.

## 6. Results (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `cd apps/docs && nub x vitest run src/lib/search.test.ts src/lib/component-aliases.test.ts` | 2 files / **67 tests passed** |
| `nub run --filter docs test` | **93 files / 666 tests passed** |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | **98 pages, 121 links, 1 277 anchors**, exit `0`; `typeahead` and `datagrid` green |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |

Two-direction proofs, each run alone with the focused suite and then restored:

| Forced defect | Measured failure |
| ------------- | ---------------- |
| `typeahead` alias removed | `typeahead -> nothing` in the plan-579 component case |
| `datagrids` removed from Data display | the summary case failed by `datagrid` |
| `sidebars` removed from Workspace | `sidebar -> text:/docs/components/stack#composition` |
| `aliasRank` reverted to `matchRank` | plan 574's case failed `panel -> /docs/components/drawer` |
| `button` added as an alias for `button-group` | `component-aliases.test.ts`: `expected [ 'button' ] to deeply equal []` |
| all five restored | 67 focused tests green again |

## 7. Acceptance

- The 28 measured queries in §1 reach the page that owns the subject; the 26
  component terms reach their component page first and the 2 page terms reach
  their page first.
- No new ranker, schema field, page-alias table or hand-written search document
  exists; the change is the existing alias table plus two authored summaries.
- `component-aliases.test.ts`, `search.test.ts` and `smoke:build` fail by term
  when a new alias or summary word is removed.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`,
  `nub run lint` and `nub run test` pass; the plan index, `TODO.md` and
  `apps/docs/README.md` record the change.
