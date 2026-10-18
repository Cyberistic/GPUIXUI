# 350 — Tier 4 feasibility: application chrome — a toolbar, a pinned status bar and a breadcrumb trail

**Status:** planned 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `158`, `166`, `173`, `176`, `185`,
`338`, `349`.

## 1. Why this plan exists

Three Tier 4 rows in `COMPONENTS.md` are still `GPUix support: ?` with no
runtime evidence:

| Row | Current note |
| --- | ------------ |
| Status bars | `div` + `<text>`. |
| Toolbars | `div` + Button groups. |
| Breadcrumb navigation | Breadcrumbs + navigation. |

Every ingredient has been measured separately — a horizontal scroller with
clipped children that keep painted bounds (`tab-strip-overflow` `173`), a
component-owned reveal with `scrollTo` (`173`, `338`), a virtual list and its
anchor (`166`), roving focus and Enter activation (`158`, `344`), and the
AccessKit `Navigation`/`Link` roles (`344`) — but **no probe has composed an
application shell**: a fixed toolbar over a two-pane body over a status bar that
must stay pinned while both panes scroll independently.

The open questions are the shell's own:

1. Does a `flexShrink: 0` status bar stay at the shell's bottom edge when a
   sibling body scrolls or its content grows?
2. Does a toolbar narrower than its item row clip the trailing items (keeping
   their painted bounds), and does one `renderer.scrollTo` reveal them so they
   hit-test?
3. Can a breadcrumb collapse its middle segment from app state, keep the first
   and last visible, and keep each crumb a `Link` with native focus and an
   Enter activation?
4. Does the status bar's text track the pane that last took input, without the
   two panes' scroll offsets leaking into each other?

This plan changes **no package code**.

## 2. What will be proven

Capability: `chrome` (new). Scenario: `app-chrome`; live twin: `live-app-chrome`.

View: a 640 × 420 shell (toolbar 36, body 360, status 24). The toolbar is a
380 px `overflowX: "scroll"` viewport over a 560 px item row: a four-segment
breadcrumb trail, three action buttons, a 1 px separator and a trailing `sync`
button that starts clipped. The body holds a 200 px sidebar list (20 rows, its
own vertical scroller) and a 440 px `<virtual-list>` of 40 lines. The status bar
prints the active pane, the list line, the sidebar selection, the action count,
the trail depth and the toolbar offset.

| Area | Check |
| ---- | ----- |
| shell geometry | the toolbar is 36 px at the top; the status bar is 24 px and its bottom edge is the shell's; the body fills the space between them (360 px) |
| pinned status | a wheel in the sidebar and a wheel in the main list both move their scroller and leave the status bar's `y` unchanged |
| independent panes | a sidebar wheel (`-100`) changes the sidebar offset and leaves the list anchor at 0; a list wheel (`-240`) anchors the list at line 10 and leaves the sidebar at `-100` |
| active pane | clicking a sidebar row sets `sel` and `pane=sidebar`; clicking a virtual line sets `line` and `pane=main` |
| toolbar clipping | at rest the trailing `sync` button's painted x is past the toolbar's right edge; a `pan end` control (`renderer.scrollTo(-180)`) moves the offset to `-180`, the button's x by `-180`, and a click then runs it once |
| toolbar actions | `new` increments the action count once; the separator is 1 px |
| breadcrumb collapse | collapsing hides the **middle** segment (`src` is absent from the painted text) and keeps the first and last; expanding restores all four |
| breadcrumb navigation | clicking a middle crumb truncates the trail to that depth; a crumb takes native focus and Enter activates it |
| a11y | the trail is a `Navigation` named `Trail`, each crumb is a `Link`, the status bar is a `Status` |
| live | a paced real click + wheel in the window: the status bar stays at the bottom, the two scrollers stay independent, the toolbar pan reveals and runs `sync`, and the breadcrumb collapses by a real click |

The probe does **not** re-measure generic scrolling, virtual-list windowing,
menus or the shipped Breadcrumb component (`344`). It does not claim
measurement-driven toolbar overflow (moving items into a menu); the measured
route is a scroller plus an explicit reveal.

## 3. Files

Create:

- `apps/playground/src/scenarios/app-chrome.tsx` — the view and the `app-chrome`
  scenario. No pure module: the trail/collapse rules are three lines and the
  view's own state; a model would be scaffolding.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"chrome"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"chrome"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add
  `live-app-chrome` after `live-data-grid-columns`.
- `apps/playground/README.md` — a `## Application chrome (plan 350)` section and
  the new file under `Structure`.
- `COMPONENTS.md` — the `chrome` capability row and the measured evidence on
  **Status bars**, **Toolbars** and **Breadcrumb navigation** (status stays
  `todo`: the probe is the runtime contract, not a shipped package).
- `TODO.md` — tick the new playground task with the measured counts.
- `.agents/slop/plans/README.md` — add the `350` row; the next free number is
  `351`.

Do **not** change any other package, `apps/docs`, or the shell.

## 4. The view (`app-chrome.tsx`)

Constants: `SHELL = { width: 640, height: 420 }`, `TOOLBAR_HEIGHT = 36`,
`STATUS_HEIGHT = 24`, `BODY_HEIGHT = 360`, `TOOLBAR_VIEWPORT = 380`,
`TOOLBAR_ROW_WIDTH = 560`, `TOOLBAR_MAX_PAN = -180`, `SIDEBAR_WIDTH = 200`,
`MAIN_WIDTH = 440`, `ROW_HEIGHT = 24`, `SIDEBAR_ROWS = 20`,
`LIST_ROWS = 40`, `CRUMBS = ["Workspace", "Project", "src", "file.ts"]`,
`COLLAPSED = 3`.

State: `actions`, `sync`, `depth` (the trail length, 1…4), `collapsed`,
`selection` (`Option<number>`), `line`, `pane` (`"sidebar" | "main"`),
`toolbarX`, `sidebarY`.

`chrome-frame` (640, column, 8 px gap) holds the shell and a control row
(`chrome-pan-home`, `chrome-pan-end`, `chrome-collapse`).

**Shell** `testId="chrome-shell"` (640 × 420, column):
1. **Toolbar** `testId="chrome-toolbar"`: 380 × 36, `overflowX: "scroll"`,
   `onScroll` reads `renderer.getScrollOffset` into `toolbarX`,
   `role="toolbar"`, `aria-label="Workspace toolbar"`, muted background. Its
   child `chrome-toolbar-row` is 560 × 36, row flex, 4 px gap, 4 px left
   padding, and holds:
   - a breadcrumb `testId="chrome-trail"` `role="navigation"`
     `aria-label="Trail"`: the shown crumbs are `CRUMBS.slice(0, depth)`; when
     `collapsed` and more than three are shown, the middle is replaced by one
     `…` text. Each crumb is a `Pressable` (the shared focusable button div) with
     `testId={`crumb-${index}`}`, `role="link"`, `aria-label={label}`,
     `onClick` → `depth = index + 1` and `onKeyDown` Enter/Space →
     `depth = index + 1`. Segments are separated by a muted `/` text.
   - `chrome-new`, `chrome-split`, `chrome-close` (`Pressable`, 44 × 24,
     `padding: 0`, centred) — each increments `actions`;
   - a 1 px `chrome-separator` div (height 20, border colour);
   - `chrome-sync` (`Pressable`, 44 × 24) — increments `sync`.
2. **Body** `testId="chrome-body"`: 640 × 360, row flex.
   - `chrome-sidebar`: 200 × 360, `overflowY: "scroll"`, `onScroll` reads its
     offset. 20 rows of 24 px, `testId={`chrome-item-${index}`}`, `tabIndex={0}`,
     `onClick` → `selection = index`, `pane = "sidebar"`; the selected row paints
     `accent`.
   - `chrome-main`: 440 × 360. A `<virtual-list testId="chrome-list">` (440 ×
     360, `estimatedItemHeight: 24`, `onVisibleRange` → read
     `renderer.getListScrollTop` into `line` and `pane = "main"`; the handler
     must **not** set `pane`, only a click does — keep the anchor read pure).
     40 rows of 24 px, `testId={`chrome-line-${index}`}`, `onClick` →
     `line = index`, `pane = "main"`.
3. **Status bar** `testId="chrome-status"`: 640 × 24, `flexShrink: 0`,
   `role="status"`, `aria-label="Status"`, top border, muted background; one
   `<text testId="chrome-status-text">` printing
   `pane=<pane> line=<line> sel=<id|none> actions=<n> trail=<depth> sync=<n> x=<toolbarX>`.

The control row's `chrome-pan-end` calls
`renderer.scrollTo(toolbar, TOOLBAR_MAX_PAN, 0)` and mirrors it into
`toolbarX`; `chrome-pan-home` does the same with 0; `chrome-collapse` toggles
`collapsed`.

## 5. Steps for the executor

1. Read this plan, then `tab-overflow.tsx`, `workspace-panes.tsx`,
   `data-grid.tsx`, `tier2-navigation.tsx` (the Breadcrumb checks), `ui.tsx`
   and `probes.ts`.
2. Write `app-chrome.tsx`, register it and add the capability literal. Run:

   ```sh
   nub run --filter playground check-types
   nub run --filter playground test
   ```

   Expected: both exit `0`; `scenarioProblems` reports nothing.
3. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only app-chrome
   ```

   Expected: `1/1 scenarios passed`, exit `0`. A miss reports the readout or the
   bounds — fix geometry, never widen a tolerance past 2 px.
4. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `81/81 scenarios passed`, exit `0`, `chrome=verified`; record the
   check total.
5. Add `live-app-chrome` (`view: appChromeScenario.view`,
   `ready: "chrome-shell"`) using `settle` after every input and `waitForText`
   for the status text. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `32/32 scenarios passed`, exit `0`, one screenshot, record the
   check total. A live step may not assert style or the a11y dump (plan `197`).
6. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0` (run `nub run fmt:fix` if the formatter complains).
7. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, `PLAN.md`
   (a decision row) and the plan index with the measured counts and any measured
   surprise. Commit plan first, then the probe.

## 6. Test plan

### 6.1 The scenario

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the status bar's height changed to 32 | "the status bar is 24 px tall" |
| M2 | the list anchor read from the `onVisibleRange` payload instead of `getListScrollTop` | "the wheel anchors the list" (the payload lags a gesture) |
| M3 | `chrome-pan-end` calls `scrollTo(…, 0, 0)` | "the toolbar pan reaches the far edge" |
| M4 | the collapse rule ignores `collapsed` (shows every shown crumb) | "collapse hides the middle segment" (`src` still painted) |
| M5 | a crumb's click does not change `depth` | "a crumb truncates the trail" |
| M6 | a line click does not set `pane` | "a line click makes the main pane active" |

Reverse proof (consumer wiring): the sidebar row's `onClick` removed →
"a sidebar row selects" fails.

Run each mutation with `--only app-chrome`, record the exact failure, revert.

### 6.2 Two-direction checks by hand

- Full headless `81/81`, live `32/32`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 7. STOP conditions

- **The status bar does not stay at the shell's bottom** while the body scrolls
  or its list anchors. Stop; record the measured `y` of the bar and the body and
  amend §4. A shell whose chrome floats is the finding.
- **The clipped `sync` button has no painted bounds** (unlike the clipped tab in
  plan `173`). Stop and use a shorter row that still overflows by one item, or
  record the difference and assert the item is unaddressable until panned.
- **The toolbar does not pan** with `renderer.scrollTo` on its own id. Record
  whether the scroll must go to the row, and amend §4.
- **The two scrollers leak into each other** (a sidebar wheel moves the list
  anchor or vice versa). That is the core mechanism finding; record it, assert
  the measured behaviour with a label that says so, and write it up for any
  workspace component.
- **A check needs a tolerance above 2 px** or a screenshot. Stop; that is a
  mechanism question.
- **A live step cannot reach a clipped control.** Pan first (headless does); if
  it still cannot, narrow the live twin and say why.
- **A file outside §3 must change.** Stop and write the task in `TODO.md`.
- The suites are not `81/81` headless and `32/32` live, exit `0`. Stop and report
  the failing scenario.

## 8. Measured results

_(Filled by the executor: counts, the pinned-status and overflow facts, every
mutation proof with its exact failure text, and limits.)_

## 9. Acceptance

- `app-chrome.tsx`, the registry entry, the capability literal, the live twin,
  the README section, the inventory rows and the plan-index row.
- Headless `81/81`, live `32/32`, exit `0`; all three gates exit `0`.
- Five or more mutation proofs and one reverse proof recorded in §8.
- No component package changed; any defect is a `TODO.md` task with its own
  plan number.
