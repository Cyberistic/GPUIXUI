# 438 — Internal link integrity

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 411, 424, 426, 437

## 1. Why

`content/docs/layouts.mdx` says every layout primitive "has its own page" and
links `Grid` to `/docs/components/grid`. That page does not exist: `Grid` shares
the Stack page, because the inventory row is **"Stack / layout primitives"** and
the registry has one `stack` record covering both (`COMPONENTS.md`, Tier 1).
A reader clicking the link gets the 404 page.

Nothing caught it. `content.test.ts` checks the sidebar, not prose links;
`content-references.test.ts` checks `<include>` and `<auto-type-table>` targets;
`prose-truth.test.ts` checks backticked repository paths, not site URLs. A page
can therefore link to any `/docs/...` route and stay green until a human clicks
it.

This plan fixes the broken link and adds the missing guard: **every literal
`/docs` link in the content tree and in the app's own components resolves to a
page that exists.** The guard is the regression test; it fails on the shipped
tree before the content fix.

## 2. Measured current state (2026-10-17, `bea7c83`)

- 38 markdown links of the form `](/docs…)` across `content/docs/**/*.mdx`.
- Resolving each the way Fumadocs resolves a route (`x.mdx` or `x/index.mdx`,
  `/docs` → `content/docs/index.mdx`) leaves exactly one failure:
  `content/docs/layouts.mdx: /docs/components/grid`.
- `/docs/components/grid.mdx` is absent. `packages/primitives/src/components/Stack.tsx`
  exports both `Stack` and `Grid`; the registry's `stack` entry and
  `content/docs/components/stack.mdx` document both, including two
  `<auto-type-table>` blocks (`StackProps`, `GridProps`).
- The app links to `/docs`, `/docs/components`, `/docs/installation` and
  `/docs/getting-started` from `src/components/landing.tsx`,
  `src/components/not-found.tsx` and the not-found route; all four resolve.
- `nub run --filter docs test` → 31 files, **182 passed**.

## 3. Exact changes

### 3.1 New file `apps/docs/src/internal-links.test.ts`

A vitest content test beside the other content guards. It must be readable and
derive its facts from disk — no hard-coded allowed-URL list.

Contract:

1. **Sources.** Every `content/docs/**/*.mdx` page, plus every non-test
   `.tsx`/`.ts` file under `apps/docs/src`, contributes links. The content tree
   is read with `node:fs`/`node:path` like the sibling guards (there is no
   Effect runtime in `apps/docs`); source files are scanned for literal
   `href="/docs…"` and `<Link href="/docs…"` attributes.
2. **Extraction.** Match markdown destinations `](/docs...)` in MDX and
   `href="/docs..."` in source. Ignore template strings (`${` in the
   destination) — those are computed and belong to their own component test.
   Strip a query string and a `#fragment` before resolving.
3. **Resolution.** A destination `/docs` resolves to
   `content/docs/index.mdx`; `/docs/a/b` resolves to
   `content/docs/a/b.mdx` or `content/docs/a/b/index.mdx`; a trailing `/` is
   dropped. Anything that resolves to neither is a violation.
4. **Non-vacuous.** Assert the scan found more than 30 links, so a broken walk
   or a changed syntax cannot pass by finding nothing.
5. **Report.** A violation string is `<page>: <destination>`, and the assertion
   is `expect(violations).toEqual([])`.

Header comment must state the bug guarded: *"Bug guarded (plan 438):
`layouts.mdx` linked `/docs/components/grid`, a route with no page, and no test
noticed; prose links now resolve like the sidebar does."*

The guard is intentionally route-shape only: it proves the destination page
exists. It does not parse headings, so an in-page `#fragment` is accepted
without validating the anchor (a later plan can add heading extraction if a
broken anchor ever ships).

### 3.2 `apps/docs/content/docs/layouts.mdx`

`Grid` shares the Stack page, so the prose must say that and link to the page
that exists:

- Change the lead-in from "each has its own page" to a sentence that is true:
  the layout family's pages carry the real source, generated props and runtime
  observations (Stack carries both `Stack` and `Grid`).
- Change the Grid bullet destination from `/docs/components/grid` to
  `/docs/components/stack`, and say "documented with `Stack`" so the reader
  knows why the page is shared.

No other link changes: the other 37 resolve.

## 4. Commands and expected results

1. Write §3.1 only. Run `nub run --filter docs test` → **FAIL** in
   `internal link integrity > resolves every /docs link to a page`, with
   `content/docs/layouts.mdx: /docs/components/grid` and no other entry.
2. Apply §3.2.
3. `nub run --filter docs test` → **PASS**, 32 files, `184 passed (184)`.
4. `nub run --filter docs check-types` → exit `0`.
5. `nub run --filter docs build` → exit `0` and the route tree includes
   `/docs/components/stack` (no `/docs/components/grid`).
6. Root gates: `nub run check`, `nub run lint`, `nub run test` → exit `0`.
7. Browser: `nub run --filter docs dev`, open `/docs/layouts`, click the `Grid`
   bullet → the Stack page renders with its `Grid` section and API table; the
   old `/docs/components/grid` URL still shows the 404 page (correct: it is not
   a route).

## 5. STOP conditions

- STOP if any **other** `/docs` link fails after step 1. The plan fixes one
  known defect; a second one is a new decision (fix page or add redirect) and
  must be reported, not silently patched.
- STOP if the guard needs a list of allowed exceptions. If a link cannot
  resolve, either the page is missing or the link is wrong; an allowlist would
  hide the next defect.
- STOP if scanning `src` produces template-literal false positives. Restrict to
  literal attributes; do not weaken the content-tree check to compensate.
- STOP if Fumadocs resolves a route the file system does not (for example a
  dynamic route under `src/routes`). The site's content routes are file-derived;
  report the route instead of inventing a mapping.

## 6. Test plan and two-direction proof

- **Fail first:** §4.1 runs the new guard against the shipped content and must
  fail on exactly the Grid link. Record the assertion output in §7.
- **Pass second:** §3.2 makes the same test pass. No other test changes; the
  count moves 182 → 184 because the file adds two tests.
- The guard is the automated regression: reintroducing
  `[Grid](/docs/components/grid)` fails it; deleting the link entirely also
  fails the non-vacuous floor if the count drops below 30 (it will not, so the
  meaningful failure is the resolution one).
- `scripts/verify-two-directions.sh` is jj-based and does not run in this
  worktree (`TODO.md`); record both commands and outputs in §7 instead.
- No runtime test: this is build-time content integrity, verified by the docs
  build and the dev-server click in §4.7.

## 7. Completion evidence (2026-10-17)

**Fail first.** Guard added, content untouched:

```
FAIL src/internal-links.test.ts > internal link integrity > resolves every /docs link to a page
- Expected  []
+ Received  [
+   "content/docs/layouts.mdx: /docs/components/grid",
+ ]
Test Files  1 failed | 31 passed (32)
     Tests  1 failed | 183 passed (184)
```

**Pass after the content fix.** `32 passed (32)` files, `184 passed (184)`.

**Gates.** `nub run --filter docs check-types` and `nub run --filter docs build`
exited `0`; `nub run check`, `nub run lint` and `nub run test` at the root
exited `0`.

**Browser.** With `nub run --filter docs dev`, `/docs/layouts` renders and the
Grid bullet opens `/docs/components/stack`; the Stack page shows its `Grid`
section and both API tables. `/docs/components/grid` is not a route.

## 8. Acceptance

- No prose or app link points at a missing `/docs` page.
- The layouts page links Grid to the page that documents it and no longer
  claims a separate page exists.
- A new test resolves every literal `/docs` link from disk and fails on the
  original defect; the tree is green after the fix.
- All gates and the docs build are green.
