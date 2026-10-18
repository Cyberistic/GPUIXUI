# 502 — The site is usable at a phone width

**Phase:** F (docs quality)
**Depends on:** 410 (site), 439 (built-site smoke), 446 (browser smoke), 470
(every check documented), 495 (shared CDP session)
**Owner:** docs-site
**Status:** planned

## 1. The gap

`MISSION.md` lists **responsive layout** as part of showcase quality. Plan 410
verified the 390 px sidebar **once, by hand**, and every later plan added pages:
the site is now 90 sitemap pages with generated prop tables, wide code includes,
token tables and live-preview frames. Nothing after plan 410 reads a narrow
viewport, so a table or a preview can grow the document past the screen and
every existing gate stays green — the crawler (`smoke:build`) uses `fetch` and
has no layout engine, and the browser smokes (`smoke:browser`,
`smoke:keyboard`, `smoke:preview`) run at 640 px or wider.

Measured on this branch, 2026-10-18, with a 390×844 CDP viewport: the seven
representative pages reported `document.scrollWidth === 390` (no page-level
overflow), and Fumadocs' `Open Sidebar` button revealed the full 90-link
navigation. So this is a **guard for a real regression class, not a fix** — the
check is added because the property is currently unproven on 86 of the 90 pages
and after every future layout change.

## 2. Exact change

### 2.1 A viewport in the shared session

`apps/docs/scripts/chrome-session.ts` gains one method (it already owns the CDP
connection, colour-scheme emulation and key dispatch):

```ts
readonly setViewport: (width: number, height: number) => Promise<void>;
```

implemented with
`Emulation.setDeviceMetricsOverride { width, height, deviceScaleFactor: 1, mobile: true }`.
The 640×720 window two other smokes use is unchanged; they never call it.

### 2.2 A responsive smoke

New file `apps/docs/scripts/smoke-responsive.ts`, cloned from
`smoke-keyboard.ts`'s CLI shape (`--base-url`, `--chrome`, `--no-build`; exit
`0` pass, `1` the site is wrong, `2` could not run):

- `WIDTH = 390`, `HEIGHT = 844` — a phone viewport; the number is named once
  and printed.
- **Every sitemap page**, derived from `/sitemap.xml` like `smoke:browser`'s
  page list, so a new page joins the check by existing. The recon set was one
  page per layout shape — `/`, `/docs`, `/docs/components`,
  `/docs/components/button`, `/docs/api-reference`, `/docs/theming` — and the
  shipped check covers those plus the other 84.
- For each page: set the viewport, navigate, wait for hydration
  (`document.documentElement?.dataset.platform !== undefined` and
  `location.pathname` equal to the target). Then read one snapshot:

  ```js
  {
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    container: { id, client, scroll },   // #nd-page, or #main-content on /
  }
  ```

  Two failures, both by page:
  `scrolls horizontally (… > 390)` when `document > viewport + 1`, and
  `clips content in #nd-page (… > …)` when the container's
  `scrollWidth > clientWidth + 1`. The second one matters because Fumadocs'
  `#nd-docs-layout` has `overflow-x: clip`: a wide block does not grow the
  document, it silently loses its tail — the measured failure this plan found
  (see §3).
- **The mobile navigation works** (checked once, on the buttons page, because
  every docs page shares the shell): the resting visible `/docs` link count is
  read; `button[aria-label="Open Sidebar"]` is clicked; the check waits until
  a visible `a[href="/docs/installation"]` exists, clicks it, and waits for
  `location.pathname === "/docs/installation"`. A missing button, an overlay
  that never opens and a link that does not navigate each fail by name.
- Prints `smoke: <n> pages responsive checked` and
  `smoke: mobile navigation checked`, then `smoke: ok` when clean.

### 2.3 The layout fix the check found

The check's first run on the Buttons page reported `clips content in #nd-page
(476 > 390)`. Two long suite paths were inline code in prose:

- `packages/primitives/runtime/controls.runtime.test.tsx` in the tier-V notice
  (`RuntimeCoverage`);
- `packages/primitives/runtime/examples.runtime.test.tsx` in a sentence on the
  page.

`src/styles/app.css` gains one rule, so **every** page's inline code may wrap
and no page needs a bespoke class:

```css
:where(:not(pre) > code) {
  overflow-wrap: anywhere;
}
```

Code blocks stay unwrapped and keep their own horizontal scroll. `theme.test.ts`
pins the rule (the file already pins the focus and skip-target rules).

### 2.4 Wiring

- `apps/docs/package.json`: `"smoke:responsive": "nub scripts/smoke-responsive.ts"`.
- `content/docs/contributing.mdx`: a sixth row — "no page scrolls sideways at a
  390 px viewport, and the mobile sidebar opens and navigates" — with the same
  `1` / `2` contract. `src/docs-checks.test.ts` already fails when a `smoke:*`
  script has no row.
- `apps/docs/README.md`: list the command and add a short "Responsive layout"
  section naming the width, the six page shapes and what each failure means.
- `TODO.md`: one docs-site row, ticked when green; plan index row.

## 3. Test plan — prove both directions

The property is only observable in a layout engine, so the smoke is the test
(the precedent is plans 446/496). Run each step and record it in §7.

1. **Baseline.** `nub run --filter docs build && nub
   apps/docs/scripts/smoke-responsive.ts --no-build` → exit `0`, six
   `responsive checked` lines and `mobile navigation checked`.
2. **A real clipped column (the bug this found).** Before the fix, the Buttons
   page reported `clips content in #nd-page (476 > 390)`: the tier-V notice's
   suite path and a sentence's suite path could not wrap, and Fumadocs clipped
   them. Fix it at the source of the class — inline code wraps
   (`src/styles/app.css`, `:where(:not(pre) > code) { overflow-wrap: anywhere }`),
   with a unit test in `src/styles/theme.test.ts` — then the same page reports
   `responsive checked`. Record both runs.
3. **A missing mobile nav.** Temporarily start the session at 1200×900
   (`WIDTH`/`HEIGHT` constants) → exit `1`,
   `FAIL /docs/components/button: no visible Open Sidebar button at a phone
   width`. Restore 390×844.
4. **No regressions.** `nub run --filter docs test`,
   `check-types`, `build`; then `nub run check`, `nub run lint`,
   `nub run test`.

## 4. STOP conditions

- **STOP** if a baseline failure names real horizontal overflow: fix the
  offending page (or the preview/table container) in this workstream; do not
  raise the tolerance or drop the page.
- **STOP** if `Emulation.setDeviceMetricsOverride` does not change
  `window.innerWidth` in this Chrome build: the check would be false comfort.
  Record the measured values and stop.
- **STOP** if the mobile sidebar selector is not stable across two runs
  (Fumadocs markup changes): report the selector and do not guess a second.
- Do not add a screenshot or a pixel diff: this check is about layout
  geometry, and the repo commits no browser screenshots (plan 412).

## 5. Documentation and ledger

README, Contributing, TODO and the plan index as in §2.3. No `COMPONENTS.md`
row: this is a docs-site check, not a component.

## 6. Acceptance

- `smoke:responsive` exits `0` on the production build, names the viewport and
  each page it covered, and fails by name on overflow or a broken mobile nav.
- Both forced defects in §3 fail, and the restored build passes.
- The five repo gates stay green.

## 7. Results

Measured on `agent/docs-site`, 2026-10-18.

**The bug the check found.** The first run of the container assertion on the
built site failed — not on a contrived defect, but on the shipped Buttons page:

```
FAIL /docs/components/button: clips content in #nd-page (476 > 390)
```

`#nd-page` was 476 px wide inside a 390 px column, and `#nd-docs-layout`'
`overflow-x: clip` made the extra width unreachable. The offending elements
were two inline `<code>` paths — the tier-V notice's
`packages/primitives/runtime/controls.runtime.test.tsx` (447 px) and a sentence's
`packages/primitives/runtime/examples.runtime.test.tsx` (423 px).

Wrapping only the `RuntimeCoverage` block reduced the overflow to 443 px; the
page's sentence still clipped. The fixed rule is the general one in §2.3
(`:where(:not(pre) > code) { overflow-wrap: anywhere }`), after which the
Buttons page reports `responsive checked`.

**A full sweep.** The shipped check crawls every sitemap page, not a sample: the
page list comes from `/sitemap.xml` the way `smoke:browser`'s list comes from
the MDX tree. After the fix it reports:

```
smoke: viewport 390x844
smoke: 90 pages responsive checked
smoke: mobile navigation checked
smoke: ok
```

Before it was generalised, a one-off pass over the same 90 pages at 390×844
reported `checked 90 pages; 0 clip` — the fix is not a sample-specific win.

**Direction 2 — the mobile nav is load-bearing.** At a 1200×900 viewport the
same script exits `1`:

```
FAIL /docs/components/button: no visible Open Sidebar button at a phone width
smoke: 1 problem(s)
```

Restored to 390×844; green again.

**Regressions:** `nub run --filter docs test` 56 files / **370 tests** (the new
`theme.test.ts` rule pin included), `check-types` green, `build` green, and
`nub run check`, `nub run lint`, `nub run test` exit `0`.

**False positives recorded:** the Effect enforcer flags the shared-session
`try/catch`, `fetch`, `console.*`, `JSON.parse` and the `for` loop in the smoke
scripts. `apps/docs` deliberately has no Effect runtime (the bundle boundary is
enforced by `src/architecture.test.ts`), and every script under
`apps/docs/scripts` is a plain Node boundary with the same conventions; no
change made.
