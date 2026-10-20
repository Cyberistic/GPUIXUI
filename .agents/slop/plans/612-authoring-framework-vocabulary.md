# 612 — The authoring, framework and performance vocabulary

**Phase:** F (docs truth and search quality)
**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`, the
component-page template)
**Depends on:** 410, 419, 431, 561, 566, 568, 574, 585, 593, 598, 599, 601,
603, 605, 606, 607, 608, 610, 611
**Status:** planned

## 1. What is wrong, measured

A sweep of the production ranker (the same `search()` the `/api/search` route
uses) on 2026-10-20 measured the phrases below. Each is a phrase a reader types
when they mean the page in the third column. The right-hand column is the actual
first result before this plan.

| Query | Before | Owner the reader means |
| ----- | ------ | ---------------------- |
| `add component` | Components index | `/docs/component-pages` |
| `new component` | Components index | `/docs/component-pages` |
| `component template` | Components index | `/docs/component-pages` |
| `first component` | Components index | `/docs/component-pages` |
| `create component` | Components index | `/docs/component-pages` |
| `write a component` | Components index | `/docs/component-pages` |
| `component docs` | Components index | `/docs/component-pages` |
| `ci` | Skeleton variants | `/docs/contributing` |
| `github actions` | Toast actions | `/docs/contributing` |
| `checks` | Troubleshooting | `/docs/contributing` |
| `quality gate` | Accessibility | `/docs/contributing` |
| `bundle size` | Spinner limitations | `/docs/performance` |
| `download size` | Spinner limitations | `/docs/performance` |
| `page weight` | Component pages | `/docs/performance` |
| `virtualization` | Roadmap | `/docs/data-display` |
| `callback` | Keycap states | `/docs/component-api` |
| `callbacks` | **nothing** | `/docs/component-api` |
| `nextjs` | **nothing** | `/docs/porting-from-shadcn` |
| `next.js` | **nothing** | `/docs/porting-from-shadcn` |
| `remix` | **nothing** | `/docs/porting-from-shadcn` |
| `tauri` | **nothing** | `/docs/porting-from-shadcn` |
| `electron` | Introduction | `/docs/porting-from-shadcn` |

Two of these are not alias problems:

- **The authoring phrases** mean "how do I add a component page?", and the page
  that answers it (`/docs/component-pages`) exists. `component page`, `page
  template`, `mdx` and `new page` already reach it; the verb phrases do not,
  because the word "component" is also the Components index's title.
- **The framework phrases** have no sentence to reach. The porting page says a
  shadcn component renders DOM while this library renders GPUix host elements,
  but it never answers the next question: can I render this in Next.js, Remix,
  Electron or Tauri? That is the most common arrival path from a React project,
  and the honest answer — this is not a web UI library — is not written down.
  An alias cannot fix that without lying, so the page gains a section.

The other four are one exact phrase each that a page already owns but whose
words are a component's token or prose elsewhere. `page-aliases.ts` matches the
whole query only, so they cannot steal a shorter query.

## 2. Design

Do not add a ranker rule. Use the two mechanisms the site already has:

1. **Exact page aliases** (`apps/docs/src/lib/page-aliases.ts`) for phrases
   whose page already explains the subject. An alias ranks `0` and is compared
   with the whole trimmed, lower-cased query, so `bundle` and `component` keep
   their existing owner.
2. **One authored section** on `/docs/porting-from-shadcn` for the framework
   question. The aliases point at content that answers the query; they are not a
   substitute for it.

Add a `## Not a web UI library` section to the porting page that states:

- every component renders a GPUix host element, not a DOM node; there is no
  server renderer and no hydration phase;
- React frameworks whose output is a browser tree (Next.js, Remix) cannot
  render a GPUIXUI component;
- desktop shells that embed a browser view (Electron, Tauri) host a webview, so
  they have the same boundary;
- the one browser-rendered path is the docs site's isolated live surface on
  `@gpuix/native`'s published WebAssembly renderer, which is labelled as a
  browser renderer and is not the desktop binary;
- for a web product the honest choice is a DOM library such as shadcn/ui.

Add a `## Continuous integration` section to `/docs/contributing` that states
the gates are what CI runs and that no workflow file is committed yet, so a
green pull request is a local run; the published-binary confirmation is still
owed. The `ci`, `continuous integration`, `github actions`, `checks` and
`quality gate` aliases point here only after that sentence exists.

Do **not** touch `virtual list`, `row selection`, `keyboard navigation`,
`disabled button`, `tabel` or `read only`; those are measured non-fixes in plans
594, 599, 607 and 608 and their regression rows must keep passing.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/page-aliases.ts` | add six blocks / extend four existing blocks with the terms in §4.1 |
| `apps/docs/content/docs/porting-from-shadcn.mdx` | add `## Not a web UI library` (§4.2) |
| `apps/docs/content/docs/contributing.mdx` | add `## Continuous integration` (§4.3) |
| `apps/docs/src/lib/page-aliases.test.ts` | add every recovered query to `owned`; add the non-fixes that share a word to `regressions` |
| `apps/docs/src/porting-page.test.tsx` | require the new heading and the four framework names, and assert the aliases reach the page |
| `apps/docs/src/contributing-page.test.ts` | require the new section and its no-workflow sentence |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | tick the completed task under the docs-site workstream |

No package source changes. No new dependency. No new page.

## 4. Implementation

### 4.1 Aliases

Add to the `/docs/component-pages` block (create it after the
`/docs/deployment` block; keep the table's existing grouping style):

```ts
[
  "/docs/component-pages",
  [
    "add component",
    "add a component",
    "adding a component",
    "new component",
    "create component",
    "create a component",
    "write a component",
    "component template",
    "first component",
    "component docs",
  ],
],
```

Extend the existing blocks:

- `/docs/contributing`: `ci`, `continuous integration`, `github actions`,
  `checks`, `quality gate`.
- `/docs/performance`: `bundle size`, `download size`, `page weight`.
- `/docs/data-display`: `virtualization`, `virtualisation`.
- `/docs/component-api`: `callback`, `callbacks`.
- `/docs/porting-from-shadcn`: `nextjs`, `next.js`, `remix`, `tauri`,
  `electron`, `webview`.

The alias table's own guard rejects a term that another page already owns, a
term equal to a page title or a component title/name/alias, and a malformed
term. If any of these fails, STOP: the term is already owned and the query must
be routed by content, not by a second alias.

### 4.2 The porting section

Insert after `## What changes in the code` (after the two consequence bullets)
and before `## A port in practice`:

```mdx
## Not a web UI library

Every component here renders a GPUix host element, not a DOM node: there is no
server renderer and no hydration phase. React frameworks whose output is a
browser tree — Next.js and Remix — cannot render a GPUIXUI component, and desktop
shells that embed a browser view — Electron and Tauri — have the same boundary
because the webview, not the native renderer, would paint the tree.

The one browser-rendered path is this site's isolated live surface: the
published `@gpuix/native` WebAssembly renderer, labelled as a browser renderer
and never presented as the desktop binary. If the product is a web application,
the honest choice is a DOM library such as shadcn/ui; the [Styling](/docs/styling)
page states what replaces CSS, and [Architecture](/docs/architecture) states
which renderer paints what.
```

The section must stay factual to the shipped packages. It may name only
`@gpuix/native`'s WebAssembly build, which plan 455 measured; it may not claim a
generic browser support.

### 4.3 The CI section

Insert after `## Gates` and before `## Tests`:

```mdx
## Continuous integration

The [Gates](#gates) above are what CI runs. No workflow file is committed yet, so a
green pull request is currently a local run rather than a CI run; the
published-binary run of the native suite is still owed. A check that exits `2`
did not run — treat it as "run it where it can run", never as a pass
([Native smoke suite](/docs/native-testing)).
```

### 4.4 Tests

`page-aliases.test.ts`:

- add each query in §1 to `owned`, with the URL from the table;
- keep the existing table guards untouched; they prove the new terms are
  unique, lower-case, and do not shadow a title or component name;
- do not add a regression row for a word inside a new phrase (`component`,
  `bundle`, `page`): the alias matcher is exact-only, so `component` cannot
  reach the component-pages block through `add component`;
- `webview` was measured and **rejected**: the Introduction already owns it
  (plan 588), and a second alias would steal it. The porting vocabulary is
  `nextjs`, `next.js`, `remix`, `tauri` and `electron` only.

`porting-page.test.tsx`:

- add `"## Not a web UI library"` to the required-heading list;
- assert the section body names `Next.js`, `Remix`, `Electron`, `Tauri` and
  `WebAssembly`;
- extend the adoption-vocabulary `it.each` with `nextjs`, `next.js`, `remix`,
  `tauri` and `electron`.

`contributing-page.test.ts`:

- add a `describe("Contributing — continuous integration")` that reads the new
  section with a `topSection()` helper that splits on `## `;
- assert the page names `nub run check`, `nub run lint` and `nub run test`, and
  that the new section carries the `[Gates](#gates)` link, the phrase
  `No workflow file is committed yet`, a link to `/docs/native-testing` and the
  `2` exit-code rule. The commands stay in Gates; the CI section links them
  instead of pasting a second copy.

### 4.5 Order

1. Write the plan index row and this plan.
2. Edit the two MDX pages.
3. Edit `page-aliases.ts`.
4. Edit the three tests.
5. Run the scoped commands in §5.
6. Tick `TODO.md`, update the plan index status to `implemented`, commit.

## 5. Commands and expected results

Run from the repository root unless stated.

```sh
nub run --filter docs test -- src/lib/page-aliases.test.ts
```

Expected: 1 file, all tests pass **after** the aliases and the section are in
place. Before the alias edit the same command must fail on the new `owned` rows;
record that run in the commit message or the plan result.

```sh
nub exec --filter docs vitest run src/porting-page.test.tsx src/contributing-page.test.ts --reporter=verbose
```

Expected: both files pass; the porting file's vocabulary rows fail if an alias
is removed, and the heading row fails if the section is removed.

```sh
nub run --filter docs test
```

Expected: every docs test file passes. At the time of writing the suite is 124
files / 1144 tests; this plan adds tests, so the number must be greater, never
smaller.

```sh
nub run --filter docs check-types
```

Expected: exit `0`.

```sh
nub run --filter docs smoke:build
```

Expected: exit `0`, the page count is at least the current 104, and the
production search answers the new query list. If the smoke exposes a page that
no longer renders, STOP and report the page.

`smoke:search`, `smoke:a11y` and `smoke:responsive` are not required for an
alias-only + prose change; run them only if the new MDX section changes the
page's layout in a way that could affect a gate, or before merging.

## 6. Two-direction proofs (required before "done")

Each proof is a deliberate break, a run, and a revert. Record the command and
the failing message in the plan result.

1. **Alias group removed:** delete the `/docs/component-pages` block. The
   `add component` row in `page-aliases.test.ts` must fail with the Components
   URL, naming the query.
2. **One alias removed:** delete `"ci"` only. The `ci` row must fail with
   Skeleton's URL (or the then-current wrong page), naming the query.
3. **Section removed:** delete `## Not a web UI library`. The porting heading
   guard must fail naming the heading.
4. **Framework word removed:** delete `Tauri` from the section. The porting
   body guard must fail naming `Tauri`.
5. **Alias shadow:** add `"button"` to the component-pages block. The alias
   table's shadow guard must fail naming `button`; revert.
6. **CI sentence removed:** delete `No workflow file is committed yet`. The
   Contributing guard must fail; revert.

A proof that does not fail is a broken test and must be fixed before the change
is called done.

## 7. STOP conditions

- A new alias is already owned by another page, a page title or a component
  name → STOP; the query is not an alias candidate, and the page content must
  change instead.
- The porting page cannot stay factual about Next.js/Remix/Electron/Tauri
  without a claim this repository cannot support → STOP, remove the unprovable
  name from the section and the aliases, and record the limit.
- `smoke:build` exits `2` (Chrome/server missing) → STOP; do not report it as a
  pass.
- The page count drops or a page fails to render → STOP; the MDX edit broke a
  page, revert it and report the page.
- The docs suite total is lower than before → STOP; a test file was skipped or
  removed.

## 9. Result

Implemented 2026-10-20 on `agent/docs-site`.

- The alias table gained 27 terms over six pages (`component-pages`, the first
  new key; `contributing`, `performance`, `data-display`, `component-api` and
  `porting-from-shadcn`), and both MDX sections landed.
- `page-aliases.test.ts` carries the 29 new owned rows and the six guards; the
  full docs suite is **123 files / 1 178 tests** (the temporary sweep file was
  deleted before the count).
- `smoke:build` exited `0`: 105 sitemap pages, 231 links, 1 356 anchors, brand
  assets, install metadata, llms discovery, page markdown, search, 404 and
  robots all checked.
- `nub run check` and `nub run test` exited `0` at the root; every workspace
  suite is green.

Two-direction proofs (each run and reverted; the failure text named the query):

| Break | Command | Observed |
| ----- | ------- | -------- |
| `add component` renamed to `add component x` | `vitest run src/lib/page-aliases.test.ts -t "add component →"` | `add component` → `/docs/components`, expected `/docs/component-pages` |
| `ci` alias deleted | `... -t "ci →"` | the `ci` row failed with the then-current first result |
| `## Not a web UI library` renamed | `vitest run src/porting-page.test.tsx -t "keeps the tables and headings"` | the heading row failed naming `## Not a web UI library` |
| `Tauri` removed from the section | `... -t "answers the framework question"` | the body row failed listing `Tauri` |
| `button` added to the component-pages block | `vitest run src/lib/page-aliases.test.ts -t "does not shadow a component title"` | the shadow guard failed naming `button` |
| `No workflow file is committed yet` removed | `vitest run src/contributing-page.test.ts -t "states that no workflow"` | the CI guard failed |

Measured limit: `webview` was also considered for the porting page but is
already owned by the Introduction (plan 588), so it stays there; it is not in
the alias table and the porting vocabulary deliberately omits it.

## 10. Acceptance

- Every query in §1 returns its owner first, measured by
  `page-aliases.test.ts`.
- `/docs/porting-from-shadcn` contains `## Not a web UI library` and names the
  four framework families and the one WebAssembly path.
- `/docs/contributing` contains `## Continuous integration` and states that no
  workflow is committed.
- All six two-direction proofs were run and reverted.
- `nub run --filter docs test`, `check-types` and `smoke:build` exit `0`.
- `TODO.md` records the task as done with the measured counts; the plan index
  row says `implemented`.

