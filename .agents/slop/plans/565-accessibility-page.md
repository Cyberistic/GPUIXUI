# 565 — The accessibility page: the runtime's real ARIA surface, the substitutes, and every recorded limitation

**Workstream:** docs-site · **Phase:** F (information architecture and truth) ·
**Depends on:** 410, 411, 412, 429, 443, 448, 454, 461, 479, 482, 491, 512,
516 · **Status:** in progress

`MISSION.md` requires every component page to carry accessibility
considerations and limitations, and every page does. What the site lacks is the
**cross-cutting** answer a consumer asks before adopting the library: *which
ARIA attributes does the pinned runtime actually accept, what does the library
do when one is missing, and which components record a gap?* Today that
knowledge is split between one hand-written table on `/docs/component-api` and
66 pages of prose. The table is not guarded by anything; a dependency upgrade
that adds `aria-checked` would leave the site claiming it does not exist.

Plan 565 adds `/docs/accessibility`, derives the supported/absent attribute
sets from the **installed** `@gpuix/native` declarations, and renders every
delivered component's recorded limitations from the registry. The generated
surfaces get their own search index document, as D32 requires.

## 1. What exists now (measured 2026-10-19, `fe156eac`)

```sh
nub run --filter docs test          # 79 files / 557 tests pass
grep -n 'aria-' apps/docs/node_modules/@gpuix/native/dist/host.d.ts
```

`HostProps` accepts exactly these `aria-*` keys:

`aria-label`, `aria-description`, `aria-id`, `aria-expanded`,
`aria-selected`, `aria-valuetext`, `aria-level`.

Every other ARIA attribute in the table below is absent from the installed
declarations. The site currently states the supported/absent split only as
author-written prose in `content/docs/component-api.mdx`; no test reads the
declarations, and no page aggregates the per-component limitations.

The generated tables are rendered React, so Fumadocs' page index cannot see
their rows (D32; plans 419, 490, 504, 505). `aria-valuenow` returns no result
today, and `aria-checked` reaches only the Checkbox page's prose.

## 2. The rule

1. **The supported set is not authored.** `src/lib/accessibility.ts` exports
   the attributes with their meanings; `src/lib/accessibility.test.ts` parses
   `interface HostProps` from the installed `@gpuix/native` declarations and
   fails when:
   - a listed-supported attribute is absent from `HostProps`;
   - a listed-absent attribute is present in `HostProps`;
   - `HostProps` gains an `aria-*` key neither list names;
   - the same attribute appears in both lists;
   - a row has an empty meaning or substitute.
2. **The absent list names a substitute, not only a gap.** Every absent
   attribute says what the library does instead, from the shipped source:
   `aria-checked` → `aria-valuetext` (`Checkbox`, `Switch`); `aria-pressed` →
   `aria-valuetext` (`Toggle`); `aria-valuenow/min/max` → `aria-valuetext`
   (`Slider`, `RangeSlider`, `Meter`, `Progress`); `aria-labelledby` /
   `aria-describedby` → a required `label` and a visible `Label`; `aria-modal`
   → `role="dialog"` plus a required `label` and the Tab trap;
   `aria-activedescendant` → native focus moves to the highlighted row;
   `aria-live` / `aria-atomic` → `role="status"` / `role="alert"` plus visible
   text; `aria-disabled` → read-only, out of the tab order, disabled roles;
   `aria-invalid` → the destructive border and visible error text;
   `aria-busy` → `aria-description="Loading"`; `aria-current` →
   `aria-selected`; `aria-haspopup` → `aria-expanded` on the trigger where the
   runtime accepts it. The page never invents a substitute the components do
   not ship.
3. **The per-component index is the registry.** Delivered records with one or
   more `limitations` render under their tier/group heading with the exact
   strings the page's status block shows, linked to
   `/docs/components/<slug>#accessibility-and-limitations`. A record with no
   limitation is counted, not invented.
4. **The generated surfaces are searchable.** One generated document indexes
   every ARIA attribute with its meaning or substitute, every limitation
   string and its component title. Its promoted names are the `aria-*`
   attributes only, so `aria-valuenow` reaches `/docs/accessibility` first
   while `Checkbox` still reaches its page.
5. **The page states its evidence limits.** The native suites assert AccessKit
   roles, names and values in the real renderer; the docs run axe over every
   page in both schemes. No manual screen-reader session is recorded, the Wasm
   surface is a canvas outside the browser accessibility tree, and focus is
   not distinguishable between pointer and keyboard (`focusVisible` is
   absent). The page says all three, and links the pages that own the detail.

## 3. Files

| Path | Change |
| ---- | ------ |
| `apps/docs/src/lib/accessibility.ts` | new — `supportedAria`, `supportedHostProps`, `missingAria` (attribute, substitute), `ariaAttributesInHostProps`, `accessibilityViolations` |
| `apps/docs/src/lib/accessibility.test.ts` | new — pure-rule fixtures plus the installed-declaration guard |
| `apps/docs/src/lib/accessibility-search.ts` | new — the generated search document |
| `apps/docs/src/lib/accessibility-search.test.ts` | new — every attribute and limitation is indexed; promotion ranks |
| `apps/docs/src/lib/search.ts` | add the entry to `generatedEntries` |
| `apps/docs/src/components/aria-support-table.tsx` | new — supported and absent tables from `accessibility.ts` |
| `apps/docs/src/components/accessibility-index.tsx` | new — delivered limitations grouped by tier from the registry |
| `apps/docs/src/components/accessibility-index.test.tsx` | new — every delivered limited record, its exact strings, its link |
| `apps/docs/src/accessibility-page.test.ts` | new — section order, the two generated blocks, the version and the links |
| `apps/docs/content/docs/accessibility.mdx` | new — the page |
| `apps/docs/content/docs/meta.json` | add `accessibility` directly after `component-api` |
| `apps/docs/content/docs/component-api.mdx` | replace the hand-written ARIA table with a link to the new page (keep the heading) |
| `apps/docs/content/docs/capabilities.mdx` | one cross-link under its matrix |
| `apps/docs/scripts/smoke-build.ts` | add `aria-valuenow` → `/docs/accessibility` first to `searchChecks` |
| `apps/docs/README.md` | one section under `## Search` or `## Layout` naming the page and its guards |
| `TODO.md`, `.agents/slop/plans/README.md`, `PLAN.md` | tick, index and record D44 |

No package, token, preview or native file changes.

## 4. The page

`content/docs/accessibility.mdx`, sections in this exact order:

1. `## What assistive technology sees` — AccessKit nodes need a role; the
   supported subset; `<AriaSupportTable />`; links to Component API and
   Capabilities.
2. `## Missing attributes have substitutes` — the three rules (use the
   supported attribute, use the strongest supported alternative, record the
   rest); the real examples from §2.2.
3. `## Keyboard` — Enter down / Space up, one roving tab stop, Escape returns
   focus, no `preventDefault`; links Component API's keyboard section.
4. `## Recorded limitations` — `<AccessibilityIndex />`, and the sentence
   "The rows are the registry's `limitations`, the same list each page's
   status block shows."
5. `## What is verified` — native AccessKit assertions and the docs gates
   (axe, keyboard, theme, platform, responsive), linking `/docs/native-testing`
   and `/docs/contributing`.
6. `## What is not verified` — no manual screen-reader session; the Wasm
   canvas is outside the browser accessibility tree; no `focusVisible`.
7. `## Building accessibly` — consumer checklist (label icon-only controls,
   keep visible labels, never colour alone, put important outcomes in text,
   test with the target platform's AT).
8. `## Related` — Component API, Capabilities, Native testing, Components,
   Contributing.

Frontmatter title `Accessibility`, description `What assistive technology
receives from the pinned GPUix runtime, what the library substitutes, and what
is not verified.`

## 5. Steps

1. Write `accessibility.ts` and its test; run:

   ```sh
   nub run --filter docs test -- src/lib/accessibility.test.ts
   ```

   Expected before the implementation exists: the import fails. After: all
   pass, and a temporary edit adding `aria-checked` to `supportedAria` fails
   with `aria-checked is absent from HostProps`.

2. Write the two components and `accessibility-index.test.tsx`; run:

   ```sh
   nub run --filter docs test -- src/components/accessibility-index.test.tsx
   ```

   Expected: every delivered record with a limitation appears once; removing
   one record from the component's source makes the expected count fail.

3. Write the page and `accessibility-page.test.ts`; add `accessibility` to
   `meta.json` after `component-api`, and replace the table in
   `component-api.mdx` with the link. Run:

   ```sh
   nub run --filter docs test -- src/accessibility-page.test.ts src/component-api-page.test.ts src/content.test.ts
   ```

   Expected: pass. Removing `accessibility` from `meta.json` fails
   `content.test.ts` ("orders every top-level page on disk in the sidebar").

4. Write the search entry and its test; add it to `search.ts`. Run:

   ```sh
   nub run --filter docs test -- src/lib/accessibility-search.test.ts src/lib/search.test.ts
   ```

   Expected: `promotedNameRank(entry, "aria-valuenow") === 0`; a missing
   attribute from the document fails the completeness assertion; `Checkbox`
   still outranks the generated document.

5. Add the production search check and run the full gates:

   ```sh
   nub run --filter docs test
   nub run --filter docs check-types
   nub run --filter docs build
   nub run --filter docs smoke:build
   nub run check
   nub run lint
   ```

   Expected: 80+ test files pass, type-check and build exit `0`, the built
   crawl reports the new page and `aria-valuenow` → `/docs/accessibility`, and
   the root gates exit `0`.

6. Run the accessibility sweep on the new page:

   ```sh
   nub run --filter docs smoke:a11y -- --only /docs/accessibility
   ```

   Expected: exit `0`, no violations. A table wrapped in `overflow-x-auto`
   must carry `role="region"`, `aria-label` and `tabIndex={0}`, as
   `capability-matrix.tsx` does.

7. Tick `TODO.md`, add the plan row to the index, record D44 in `PLAN.md`,
   commit and push.

## 6. Test plan (what each test can catch)

| Test | Fails when |
| ---- | ---------- |
| `accessibility.test.ts` — parser fixture | the parser accepts `aria_label` or misses a quoted key |
| `accessibility.test.ts` — direction 1 | a supported attribute is removed from `HostProps` (dependency downgrade) |
| `accessibility.test.ts` — direction 2 | an absent attribute appears in `HostProps` (upgrade adds `aria-checked`) |
| `accessibility.test.ts` — completeness | `HostProps` gains an `aria-*` key neither list names |
| `accessibility.test.ts` — both lists | an attribute is classified twice |
| `accessibility.test.ts` — substitute | a row ships an empty meaning or substitute |
| `accessibility.test.ts` — real run | the shipped module drifts from the installed declarations |
| `accessibility-index.test.tsx` | a delivered limited record is dropped, duplicated or linked to the wrong anchor; a limitation string is retyped |
| `accessibility-page.test.ts` | a section is renamed or removed; `<AriaSupportTable />` / `<AccessibilityIndex />` is lost; the page names a runtime version the package does not pin; the Component API link is lost |
| `accessibility-search.test.ts` | an attribute is not indexed; an attribute is not promoted; the limitation content is dropped |
| `content.test.ts` | the page is on disk but absent from the sidebar |
| `smoke:build` | the built page 404s, a fragment link misses, or `/api/search?query=aria-valuenow` no longer answers `/docs/accessibility` |
| `smoke:a11y` | the new tables or links violate WCAG 2.1 A/AA |

Two-direction proofs to record in the plan after the run:

1. `aria-checked` added to `supportedAria` → `accessibility.test.ts` fails by
   name; reverted.
2. `aria-valuenow` removed from the generated document → the search test and
   the built query fail; reverted.
3. One limitation string changed in `AccessibilityIndex` → the component test
   fails with the expected string; reverted.

## 7. STOP conditions

- Stop if `@gpuix/native`'s declarations cannot be resolved from `apps/docs`
  (the guard would read nothing and pass vacuously) — report the resolution
  error; do not replace the guard with a hand-written copy.
- Stop if the new search document changes `aria-checked`'s existing checkbox
  result in a way that removes the Checkbox page from the top ten; report the
  measured list instead of weakening the existing assertion.
- Stop if `smoke:build` cannot start the preview server or Chrome; exit `2`
  is not a pass.
- Do not add per-component accessibility data to the packages from this
  workstream; the registry and `COMPONENTS.md` own it.
- Do not claim a screen-reader test that was not run.

## 8. Acceptance

- `/docs/accessibility` is in the sidebar after Component API, in the sitemap,
  in `/llms.txt` and in search.
- The supported and absent sets equal the installed `HostProps` in both
  directions, proven by a test.
- Every delivered record with a limitation appears once, with its exact
  strings, linking to its page's `#accessibility-and-limitations`.
- `aria-valuenow` reaches the page first in the production search index;
  `Checkbox` still reaches its page.
- `nub run --filter docs test`, `check-types`, `build`, `smoke:build`,
  `smoke:a11y -- --only /docs/accessibility`, `nub run check` and
  `nub run lint` pass; the two-direction proofs above are recorded.
