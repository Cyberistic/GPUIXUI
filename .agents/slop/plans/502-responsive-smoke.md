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
- Six targets cover every layout shape in the site:

  | Path | What it adds |
  | ---- | ------------ |
  | `/` | the landing layout, not the docs shell |
  | `/docs` | the introduction page |
  | `/docs/components` | the index grid |
  | `/docs/components/button` | generated API tables, source include, previews |
  | `/docs/api-reference` | the widest generated table set |
  | `/docs/theming` | token tables and the platform toggle |

- For each target: set the viewport, navigate, wait for hydration
  (`document.documentElement?.dataset.platform !== undefined` and
  `location.pathname` equal to the target). Then read one snapshot:

  ```js
  {
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }
  ```

  A failure is `document > viewport + 1` (a 1 px rounding tolerance):
  `scrolls horizontally (421 > 390)`.
- **The mobile navigation works** (checked once, on the buttons page, because
  every docs page shares the shell): the resting visible `/docs` link count is
  read; `button[aria-label="Open Sidebar"]` is clicked; the check waits until
  a visible `a[href="/docs/installation"]` exists, clicks it, and waits for
  `location.pathname === "/docs/installation"`. A missing button, an overlay
  that never opens and a link that does not navigate each fail by name.
- Prints `smoke: <path> responsive checked`, then `smoke: ok` when clean.

### 2.3 Wiring

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
   `responsive checked` lines.
2. **A page too wide.** Add `<div style={{ width: "600px" }} />` at the end of
   `content/docs/components/button.mdx`, rebuild, rerun → exit `1`,
   `FAIL /docs/components/button: scrolls horizontally (… > 390)`. Restore.
3. **A missing mobile nav.** Temporarily start the session with a 1200×900
   viewport (`WIDTH`/`HEIGHT` constants) → exit `1`, naming the missing
   `Open Sidebar` button on the buttons page. Restore 390×844.
4. **No regressions.** `nub run --filter docs test` (369 tests),
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

*(filled in by the executor.)*
