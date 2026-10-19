# 563 — Search is proved where readers use it: the index filter and the phone palette

**Phase:** F/G (docs search and responsive quality).
**Owner:** `docs-site`.
**Depends on:** 410, 417, 419, 421, 431, 454, 502, 506, 519, 561.
**Status:** ready to implement.

## 0. Why

`smoke:search` proves the palette at the session's default 640×720 and always
opens it with **⌘K**. Two reader paths have no browser gate:

1. **The phone palette.** At 390 px the header hides the full search field and
   leaves a 34 px `button[aria-label="Open Search"]`. A phone reader has no
   Command key, so the click path is the only one. The dialog could fail to
   open, overflow the viewport, or land focus on `<body>` and every existing
   gate would pass: `smoke:responsive` measures layout but never opens search.
   Measured 2026-10-19 at 390×844: the trigger is visible at `x=312`, and the
   palette opens at `8…382` with its input focused and no sideways scroll — so
   the current site is right; the path is simply unproven.
2. **The component index filter.** `/docs/components` has its own search field
   (`#component-filter`), separate from the palette and from `/api/search`. The
   matching rules are unit-tested (`matchesComponent`, `filterGroups`), but the
   hydrated wiring — input → React state → visible cards → the `?q=` history
   mirror → the empty state's clear button → the live count — has only a
   one-off manual check from plan 417. A broken `onChange` would leave 66 cards
   on screen and every gate green.

Both belong in the existing search smoke: they are the same promise ("a reader
finds a page") on the two surfaces the palette does not cover.

## 1. Design

Extend `scripts/smoke-search.ts` after its five palette steps:

### 1.1 The index filter (desktop)

On `/docs/components`:

1. open `?q=zzzzzz` — the filter applies a query from the URL in its mount
   effect, so waiting for the empty state is also the hydration signal
   (`data-platform` lands before the article's handlers are attached: measured,
   typing straight after it left the DOM value set and React state empty);
   assert the live count is `0 of <total>` and the empty state names the query;
2. click the empty state's **Clear filter** button; assert the count returns to
   `<total> of <total>` and `location.search` no longer carries `q`;
3. focus the field and type `combobox`; assert the count is
   `1 of <total> components`, exactly one rendered card links
   `/docs/components/combobox`, and the typed query reaches `?q=combobox`.

The total is read from the registry
(`components.length`, imported from `../src/component-meta/registry.ts`), not
scraped from the page under test.

### 1.2 The phone palette

At 390×844 on `/docs/components/button`:

1. assert the full search field is not displayed and a visible
   `button[aria-label="Open Search"]` is inside the viewport;
2. click it; assert the palette opens with its input focused (the same
   `paletteState` the desktop path uses);
3. type `installation`; press Enter; assert the path is `/docs/installation`,
   the palette closed, focus is on the destination `#nd-page`, and
   `document.documentElement.scrollWidth` did not grow past the viewport.

The phone step runs **after** the desktop steps, so a failure names the path in
the message (`phone palette: …`) rather than stopping at the first surface.

## 2. Exact files

| Action | Path | What |
| ------ | ---- | ---- |
| edit | `apps/docs/scripts/smoke-search.ts` | the index-filter and phone-palette steps |
| edit | `apps/docs/content/docs/contributing.mdx` | the `smoke:search` row names both surfaces |
| edit | `apps/docs/README.md` | the search smoke section names both paths |
| edit | `.agents/slop/plans/README.md` | index this plan |
| edit | `TODO.md` | add and tick the task in the docs-site block |

No new dependency and no production code change: this proves behaviour that is
already shipped.

## 3. Steps

1. Add the two helpers and steps in §1 to `smoke-search.ts`.
2. Update the Contributing row and the README section.
3. Run §5 and record the measured run in §6.
4. Apply the two forced failures in §4, record them, revert.
5. Tick `TODO.md`, index the plan, commit and push `agent/docs-site`.

## 4. Forced failures (recorded in §6, then reverted)

- **Index filter.** Remove `onChange={...}` from `src/components/component-index.tsx`'s
  input. The gate must exit `1` at step 3 with the count still
  `<total> of <total>`. Revert.
- **Phone trigger.** Add `button[aria-label="Open Search"] { display: none; }`
  to `src/styles/app.css`. The gate must exit `1` at step 2.1 with "expected a
  visible Open Search button", and the desktop Escape step must lose its focus
  target too because the rule hides the trigger at every width. Revert.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | exit 0 |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:search` | exit 0; `smoke: search palette checked` covers the filter and the phone path |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

## 6. Results

Run 2026-10-19 on `agent/docs-site` against the production build (66 component
records, 95 sitemap pages).

### The clean run

| Command | Result |
| ------- | ------ |
| `nub run --filter docs smoke:search` | exit 0 — `search palette, index filter and phone path checked` |
| `nub run --filter docs test` | exit 0 |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

### What the two new paths measured

- **Index filter.** `?q=zzzzzz` → `0 of 66 components`, the empty state, no
  card link; **Clear filter** → `66 of 66`, `?q` gone; typing `combobox` →
  `1 of 66`, the one card `/docs/components/combobox`, `?q=combobox`.
  The card selector is `#nd-page ul > li > a[href^="/docs/components/"]`,
  because the page's prev/next footer link is also a component link.
- **Phone palette.** At 390×844: a visible `Open Search` trigger and no full
  field; a click opens the palette focused; `installation` lists the page;
  Enter opens `/docs/installation`, focus lands on `#nd-page`, and the document
  does not scroll sideways.

The phone check accepts **at least one** visible trigger: after the palette
steps the header and sidebar can both contribute one, and requiring exactly one
made the gate depend on the order the two are hidden. Clicking the first
visible trigger is the reader's path either way.

### Forced failures (applied, observed, reverted)

1. **`onChange` removed** from `component-index.tsx` — exit `1` with
   `component filter: "combobox" left "66 of 66 components" with 66 card link(s)`.
2. **The trigger hidden** (`button[aria-label="Open Search"] { display: none; }`
   in `app.css`) — exit `1` with
   `no visible search trigger to return focus to` and
   `phone palette: expected one visible Open Search button and no full field, found 0 and 0`
   (the committed wording is now "expected a visible Open Search button"). Both
   paths are covered by the same control, so hiding it broke the desktop Escape
   assertion too.

## 7. STOP conditions

- The index filter's expected count disagrees with the registry. Stop and
  report the query and both numbers; the unit rules and the rendered cards are
  then out of sync, which is a real bug, not a smoke tolerance.
- The phone trigger is not visible or the palette does not fit. Stop and report
  the measured box; that is a responsive defect for a follow-up plan, and the
  gate must not be widened to accept it.
- Opening the palette by click needs a production code change (for example a
  new id). Stop: this plan proves the shipped path, it does not add one.

## 8. Acceptance

- The Components filter is driven in a real browser: one match, no match, the
  clear control and the live count.
- The 390 px palette opens from the only control a phone reader has, navigates,
  restores focus to the destination and does not scroll sideways.
- Both forced failures fail by name, and the clean run passes with every gate in
  §5.
