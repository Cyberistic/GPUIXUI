# 634 — Driver automation: the runtime's app driver has a page

**Phase:** F (documentation completeness; a measured documentation gap)
**Depends on:** 410, 411, 412, 419, 431, 561, 568, 587, 598, 610, 613, 628
**Status:** implemented — see §11
**Owner:** docs-site workstream (`apps/docs`, `docs/preview-strategy.md`, the component-page template)

---

## 1. The gap this plan closes

`@gpuix/native@0.10.0` ships a **driver for a running app**: the
`./automation` subpath (an `App`/`Locator` client over an SSE-framed protocol),
the app-side `enableAutomation`/`installBrowserAutomation` in `./runtime`, and
`@gpuix/react`'s re-export of `enableAutomation`. No page owns any of it.

Measured on 2026-10-21 in this worktree, against the real `/api/search` ranker
(`npx`-free: a scratch vitest that calls `search()`; deleted afterwards):

| Query | First result before this plan | Correct owner |
| ----- | ----------------------------- | ------------- |
| `automation` | `/docs/components/icon` | this page |
| `ui automation` | `/docs/porting-from-shadcn#not-a-web-ui-library` | this page |
| `locator` | `/docs/components/icon` | this page |
| `getByTestId` | **nothing** | this page |
| `automation tree` | `/docs/components/icon` | this page |
| `connectStdio` | **nothing** | this page |
| `stdio` | **nothing** | this page |
| `dragTo` | **nothing** | this page |
| `sse` | `/docs/roadmap` | this page (the transport, not a roadmap item) |
| `capture frames` | `/docs/native-testing#the-host-boundary` | this page |
| `e2e` / `end to end` | `/docs/testing` | this page (Testing is the offscreen renderer) |
| `axidentifier` / `uia` | `/docs/components/card` | this page |

Two further facts make the page necessary rather than nice:

1. **Testing's absence list has a real alternative it never names.** Plan 628
   correctly records that Playwright, WebDriver, jsdom and Storybook are absent;
   the runtime's answer to "drive the real app" is this protocol, and the page
   says "Playwright is not part of it" without a link to what is.
2. **`component-pages.mdx` line 172 already says** "The smoke runs them through
   the renderer's own automation API", naming a surface the site never explains.

**The page must be honest about evidence.** A repository scan
(`grep -rn "@gpuix/native/automation|connectStdio|InProcessBackend|new Locator" apps packages examples`)
finds **zero** consumers: no workspace launches a real app over this protocol.
So the page documents the declared, type-checked API and states that the
end-to-end path has no run in this repository yet. It must not claim one.

---

## 2. What the page says (and where each claim comes from)

Page: `/docs/automation`, title **Automation**, sidebar after `testing`.

Sections, in order:

1. **`## What it is`** — a driver for a *running* GPUix app: the app serves a
   protocol over stdio; the test process gets an `App` with `Locator`s. Compare
   with the other two layers in a table:
   - pure logic — no window;
   - `TestRenderer` (Testing) — an offscreen window in the test process;
   - automation — the real app process and its real window.
   Sources: `dist/automation/client.d.ts`, `dist/runtime.d.ts`.
2. **`## Turn it on in the app`** — `enableAutomation(renderer)` is
   `serveAutomationStdio(new InProcessBackend(liveRendererAsTest(renderer)))`
   (source: `dist/runtime.js`). `createNativeRenderer` calls it automatically
   when `process.stdin` is not a TTY, which `launch()` guarantees by spawning
   with a pipe — so a React app started by `launch` needs no code change. The
   explicit call and `installBrowserAutomation(renderer)` for a browser/wasm app
   cover the rest. Include a compiled `ts` fence.
3. **`## Connect from the test`** — `launch`, `connectStdio`, `connectTest`,
   `InProcessBackend`/`SseBackend`, `handleAutomationRequest`,
   `serveAutomationStdio`. Include the compiled `ts` fence: `launch` → fill →
   click → `waitFor("Saved")` → `close()`.
4. **`## Find an element`** — `Locator` table (17 methods) and the selector
   fields `testId`, `text`, `type`, `parent`; `getByTestId` is the recommended
   selector and links to Component API's shared host props, which owns `testId`
   as a prop.
5. **`## Act on it`** — the action methods (`click`, `hover`, `wheel`,
   `dragTo`, `dragBy`, `fill`, `press`) and `App.mouse` (6 raw methods) for
   empty space and marquees; `DragOptions.steps` default 8 and why.
6. **`## Read and wait`** — `all`, `count`, `element`, `bounds`, `center`,
   `textContent`, `waitFor`; no built-in assertion and no idle/network wait.
7. **`## Control time`** — `App.clock` (`pause`, `set`, `fastForward`,
   `resume`) and what it is for (toasts, countdowns, debounce) — links Testing's
   two-clock section, which owns the `TestRenderer` clock.
8. **`## Capture frames`** — `App.screenshot({ path })`, `captureFrames(dir,
   timesMs)`; a PNG is an artifact, never an assertion (the rule plan 150 set).
9. **`## The wire protocol`** — `PROTOCOL_VERSION` (1), the four declared
   capabilities (`input`, `screenshot`, `clock`, `tree`), the 25 method names,
   the eight `AutomationError` codes, the nine `TreeNode` fields, and the
   parse/encode helpers. This section is for a driver in another language;
   `App`/`Locator` is what a TypeScript consumer uses.
10. **`## What it is not`** — the absences, each with a substitute or owner
    (see §4.6), including: no test runner, no assertions, no visual diff, no
    network/idle wait, no multi-window control, no app log capture, no DOM or
    accessibility tree, no headless mode, no clipboard.
11. **`## Evidence on this site`** — declared and type-checked; no workspace
    connects to a real app yet; the playground ask is tracked in `TODO.md`.
12. **`## Related`** — Testing, Native smoke suite, Component API (`testId`),
    Selection and find (clipboard absence), Accessibility (AX tree), Previews
    (site screenshots).

---

## 3. Files to create

All paths relative to `apps/docs/`.

### 3.1 `src/lib/automation.ts` (new)

Browser-safe data + a pure guard, mirroring `updater.ts`.

Exports:

```ts
export interface AutomationRow { readonly name: string; readonly summary: string }
export interface AutomationGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: ReadonlyArray<AutomationRow>;
}

export const automationEntryGroups: ReadonlyArray<AutomationGroup>; // 4 groups, 38 exports
export const appSideFunctions: ReadonlyArray<AutomationRow>;        // runtime.d.ts: 4
export const locatorMethods: ReadonlyArray<AutomationRow>;          // 17
export const appMethods: ReadonlyArray<AutomationRow>;              // 7
export const mouseMethods: ReadonlyArray<AutomationRow>;            // 6
export const clockMethods: ReadonlyArray<AutomationRow>;            // 4
export const protocolMethods: ReadonlyArray<AutomationRow>;         // 25
export const protocolErrorCodes: ReadonlyArray<AutomationRow>;      // 8
export const treeNodeFields: ReadonlyArray<AutomationRow>;          // 9
export const automationCapabilities: ReadonlyArray<AutomationRow>;  // 4
export interface AutomationAbsence {
  readonly subject: string;
  readonly statement: string;
  readonly owner?: string; // page that answers it instead
}
export const automationAbsences: ReadonlyArray<AutomationAbsence>;  // 9
export const automationSurfaceViolations: (input: AutomationSurfaceInput) => ReadonlyArray<string>;
```

`AutomationSurfaceInput`:

```ts
{
  readonly automationEntry: string;  // dist/automation/index.d.ts
  readonly client: string;           // dist/automation/client.d.ts
  readonly protocol: string;         // dist/automation/protocol.d.ts
  readonly runtime: string;          // dist/runtime.d.ts
  readonly groups?, locator?, app?, mouse?, clock?, protocolMethods?,
  errorCodes?, treeNode?, capabilities?, absences?
}
```

Derivation rules (all pure, declaration text in, strings out):

- **Entry exports** — parse `export { … }` and `export type { … }` from
  `index.d.ts`, trim each identifier. Every value and type must be a row in
  `automationEntryGroups` (one group per purpose), and every row must be
  exported. Exclusions are **none**: the entry is 38 names and all are
  documentable.
- **Locator / App methods** — `classBody` between `export declare class Locator {`
  and `\n}`; names from `/^ {2}([A-Za-z][A-Za-z0-9]*)\(/gmu`, minus
  `constructor`. `App`'s object-literal members `clock` and `mouse` are read
  from the same body with `/\b(clock|mouse): \{([\s\S]*?)\n  \};/u` and the same
  method regex, so an added clock or mouse method fails by name.
- **Protocol methods** — `^ {4}readonly ([A-Za-z]+): \{` in `protocol.d.ts`.
- **Error codes** — the array literal after `automationErrorCodes`.
- **Capabilities** — the keys of the `z.ZodEnum<{ … }>` inside
  `initialize`'s `capabilities` field; the guard fails if the declaration shape
  changes and no keys are found.
- **TreeNode fields** — `interfaceFieldsIn(protocol, "TreeNode")` from
  `native-elements.ts` (reuse, do not re-implement).
- **App-side functions** — `export declare function (\w+)` in `runtime.d.ts`
  (4: `createNativeRenderer`, `startFrameLoop`, `enableAutomation`,
  `installBrowserAutomation`); all four documented, because the first two
  explain when automation exists at all.
- **Absences** — every absence has a regex over the concatenated declaration
  text that would make it false; the violations function reports
  `<subject> is now declared; the absence claim is stale` if it matches.
  Specific rules:
  - no assertion layer → no name matches `/assert|expect|matcher/iu`;
  - no visual diff → no name matches `/diff|baseline|snapshot/iu` **in the
    automation entry** (the protocol has no screenshot comparison);
  - no network/idle wait → no protocol method matches `/idle|network|waitFor/iu`
    (the locator's `waitFor` is element polling, not idle);
  - no multi-window control → no protocol method or method param matches
    `/window/i` (`initialize` returns one `window`);
  - no log capture → no export matches `/log|console/iu`;
  - no DOM/AX tree → no export matches `/dom|accessib|ax/iu`;
  - no headless flag → `launch` options have no `headless` key
    (`/headless\??:/u` absent);
  - no clipboard → no export matches `/clipboard|paste|copy/iu`;
  - no test runner → no export matches `/runner|vitest|jest/iu`.

### 3.2 `src/components/automation-tables.tsx` (new)

Small server components (no hooks), one shared `<Table rows>` helper:

`<AppSideTable />`, `<EntryTables group="connect|locator|protocol|browser" />`
(or one `<EntryTable group>`), `<LocatorTable />`, `<AppMethodsTable />`,
`<MouseMethodsTable />`, `<ClockTable />`, `<ProtocolMethodsTable />`,
`<ProtocolErrors />`, `<TreeNodeTable />`, `<AutomationCapabilities />`,
`<AutomationAbsences />`.

Register every export in `src/components/mdx.tsx`.

### 3.3 `src/lib/automation-search.ts` (new)

One `GeneratedSearchEntry` for `/docs/automation`:

- `content`: every documented name + summary, every protocol method, every error
  code, every absence subject.
- `names`: the distinctive orchestration names a reader types —
  `connectStdio`, `connectTest`, `launch`, `getByTestId`, `getByText`,
  `getByType`, `dragTo`, `dragBy`, `captureFrames`, `waitFor`, `textContent`,
  `InProcessBackend`, `SseBackend`, `browserRendererAsTest`,
  `liveRendererAsTest`, `browserKeystrokeInit`, `IME_MIRROR_SELECTOR`,
  `PROTOCOL_VERSION`, `AutomationError`, `TreeNode`, `ElementBounds`,
  `enableAutomation`, `installBrowserAutomation`, `createNativeRenderer`,
  `Locator` — **not** `App` (a plain word that every page's prose uses) and not
  `methods`.
- `keywords`: the same names plus the protocol method names.

### 3.4 `content/docs/automation.mdx` (new)

Frontmatter:

```yaml
title: Automation
description: "Drive a running GPUix app from a test: enableAutomation over stdio, launch/connectStdio, Locator selectors by testId, mouse and clock control, screenshots and the wire protocol — and what it does not replace."
```

Body: the 12 sections of §2, rendering the tables from 3.2, two compiled fences
(app side `ts`; test side `ts`), and the evidence paragraph. The fences must be
standalone modules (they are added to `example-snippets.test.ts`'s
`extraPages`, which runs the repository's own `tsc`).

### 3.5 `src/automation.test.ts` (new)

Guards (see §5). `node:fs` is a test-boundary import, as in
`window-surface.test.ts`; the docs bundle never imports the runtime.

---

## 4. Files to change

| File | Change |
| ---- | ------ |
| `src/lib/search.ts` | import `automationSearchEntry`; add it to `generatedSearchEntries`. |
| `src/lib/search-docs.ts` | add `{ title: "Automation", url: "/docs/automation", what: "the app driver, every Locator method and the wire protocol" }` to `indexedSurfaces` (count derives, no hand number). |
| `src/lib/page-aliases.ts` | new block for `/docs/automation` (§6) + a header paragraph. |
| `src/lib/page-aliases.test.ts` | `owned` rows for each alias; `regressions` for `e2e`-adjacent words that must keep their owner (`test id` → Component API, `screenshot` → Previews, `playwright` → Testing). |
| `src/components/mdx.tsx` | register the table components. |
| `content/docs/meta.json` | `"automation"` immediately after `"testing"`. |
| `content/docs/testing.mdx` | new `## Driving a real window` section before `## What is not provided`, linking `/docs/automation`; the Playwright absence sentence gains the link. |
| `content/docs/component-pages.mdx` | the existing "renderer's own automation API" sentence links `/docs/automation`. |
| `src/example-snippets.test.ts` | `extraPages` gains `"automation"`, so both fences compile. |
| `scripts/smoke-build.ts` | two production queries: `automation` → `/docs/automation` (first), `getByTestId` → `/docs/automation` (first). |
| `.agents/slop/plans/README.md` | index row for this plan. |
| `PLAN.md` | decision **D65** (see §8). |
| `TODO.md` | tick this task; add the cross-team follow-up (§9). |

---

## 5. Test plan — every assertion must be able to fail

`src/automation.test.ts`, in three describes.

### 5.1 The surface agrees with the installed declarations

1. `expect(violations()).toEqual([])` against the real install.
2. **Fails when Locator gains a method** — feed `client` with
   `  getByRole(role: string): Locator;` inserted into the Locator body; expect
   `Locator: getByRole is declared but undocumented`.
3. **Fails when a documented method disappears** — remove
   `  fill(text: string): Promise<void>;`; expect
   `Locator: fill is documented but not declared`.
4. **Fails when the protocol gains a method** — add
   `        readonly clipboardRead: {` inside `methods`; expect
   `protocol: clipboardRead is declared but undocumented`.
5. **Fails when an error code is added** — replace the array with one
   containing `RateLimited`; expect `error code: RateLimited is declared but undocumented`.
6. **Fails when an entry export is added** — append
   `export declare function snapshot(): void;` to `automationEntry`; expect
   `automation entry: snapshot is declared but undocumented`.
7. **Fails when an app-side function is added** — add
   `export declare function connectSocket(): void;` to `runtime`; expect
   `runtime: connectSocket is declared but undocumented`.
8. **Fails when an absence becomes false** — add `headless?: boolean` to the
   `launch` options fixture (or a `clipboard` export); expect the exact
   `<subject> … stale` message.
9. `treeNodeFields`, `protocolMethods`, `automationCapabilities` have the
   derived lengths (9 / 25 / 4) and no duplicates.

### 5.2 The page is honest and complete

10. The page exists, is in `meta.json` after `testing`, and its title is
    `Automation`.
11. Its `##` headings equal the 12 in §2 (exact array, like the updater test).
12. It renders the data (`<LocatorTable />`, `<EntryTable …>`,
    `<AutomationAbsences />` present in the MDX; the table module references
    the data module).
13. It states the zero-config fact:
    `createNativeRenderer` + non-TTY stdin → `enableAutomation`; and the
    browser path `installBrowserAutomation`.
14. It states the absence sentences, including
    "no test runner", "no visual diff", "no headless mode".
15. It does **not** claim a run: contains
    "No workspace in this repository connects to a running app over this
    protocol yet" and does not match `/verified in the runtime|has been verified/iu`.
16. It links Testing, Native smoke suite, Component API, Accessibility and
    Selection (the five cross-owners).
17. Every registered MDX component used on the page is in
    `getMDXComponents()` (`mdx-components.test.ts` already sweeps all pages;
    this test only asserts the new names are used).

### 5.3 It is findable

18. `generatedSearchEntries` contains the entry; `search-docs.ts` lists the URL.
19. `it.each` over the measured queries, each **first**:
    `automation`, `ui automation`, `e2e`, `end to end`, `locator`,
    `getByTestId`, `connectStdio`, `automation tree`, `dragTo`, `sse`,
    `capture frames`, `axidentifier`.
20. Regressions, first result unchanged:
    `screenshot` → `/docs/previews`; `playwright` → `/docs/testing`;
    `test id` → `/docs/component-api`; `testid` → `/docs/component-api`;
    `selection` → `/docs/selection`.

### 5.4 Commands

Run from the worktree root unless stated:

```sh
nub exec --filter docs vitest run src/automation.test.ts   # 20 cases green
nub run --filter docs check-types                          # tsc, exit 0
nub run --filter docs test                                 # full docs suite, exit 0
nub run --filter docs build                                # production build, exit 0
nub --filter docs run smoke:build                          # crawls every page, two new queries
nub run check                                              # root gate
nub run lint                                               # root gate
```

Prove the search rows fail without the fix: temporarily remove the alias block
and the generated entry, run case 19, and restore. The measured run is in §11.3.

---

## 6. Search vocabulary (page alias block)

Key `/docs/automation`:

```
ui automation, automation api, app automation, e2e, e2e test, end to end,
end-to-end, end to end test, end-to-end test, integration test,
locator, locators, element locator, selector, test selector,
automation tree, element tree, drive the app, drive a real app,
simulate input, fake mouse, simulate mouse, control the clock,
capture frames, app screenshot, save screenshot, screenshot test,
launch the app, stdio automation, sse, server sent events,
```

Deliberately absent: `automation` (equals the page title — the shadow guard
forbids it; the title answers it), `screenshot` (Previews owns the site's
captures and gained that exact alias), `test id`/`testid` (Component API owns
the prop), `playwright` and `webdriver` (Testing owns the absence), `selection`
(Selection and find), `tree` (Data display owns the subject).

---

## 7. STOP conditions

Stop and report instead of improvising if:

1. `@gpuix/native/automation` or `dist/runtime.d.ts` is absent from the installed
   package (the whole plan assumes 0.10.0 as pinned). Record the version.
2. The declarations do not parse into the counts in §3.1 (25 / 8 / 9 / 4 / 38 /
   4). Report the actual names; do not relax the guard to match.
3. A fence fails `example-snippets` because a subpath type is unresolvable
   (e.g. `zod` missing). Do not add a dependency; replace the fence with a
   `ts` block that imports only `@gpuix/react`, and record the limitation.
4. Any regression query in 5.3 changes owner. Do not add an alias that steals
   it; record the measured collision and stop.
5. `smoke:build` needs a server that cannot start in this worktree. Report the
   exact error rather than skipping the command.

---

## 8. Decision (recorded in `PLAN.md` as D70)

> **A runtime driver is documented where a consumer tests, and the absent tools
> link to it.** `/docs/automation` renders every export of
> `@gpuix/native/automation`, the four app-side runtime functions and the wire
> protocol from the installed declarations, guarded in both directions; Testing
> keeps the offscreen renderer and links here for a real window. No workspace
> launches an app over the protocol yet, so the page states that instead of
> showing a fake run.

Rationale: the site's testing page named Playwright, WebDriver and Storybook as
absent without naming the runtime's own answer, and `component-pages.mdx`
already referenced an "automation API" no page explained.

---

## 9. Out of scope (record in `TODO.md`)

- **Cross-team (playground):** expose the automation server from a playground
  scenario so `launch` + `Locator` + `screenshot` have one measured end-to-end
  run, and link the evidence from the page. Owner: playground workstream; the
  page currently states the gap.
- CPU throttling (`@gpuix/native/cpu-throttle`) and the raw `./runtime` renderer
  constructors are not automation; they stay with Window/Performance owners.

---

## 10. Acceptance criteria

- `/docs/automation` builds, is in the sidebar after Testing, and has the 12
  sections.
- Both fences compile through the repository's own `tsc`.
- `automation.test.ts` has at least 20 cases; at least five are proven to fail
  by a forced declaration change (cases 2–8 are written as fixtures for this).
- `automation`, `ui automation`, `getByTestId`, `connectStdio`, `dragTo`, `sse`
  and `capture frames` return `/docs/automation` first in the production index;
  `screenshot`, `playwright`, `test id` and `selection` keep their owners.
- `nub run check`, `nub run lint`, the full docs suite and `smoke:build` pass.
- `TODO.md`, `PLAN.md` and the plan index are updated in the same commit series.

---

## 11. Implementation record (2026-10-21)

### 11.1 What landed

**Created**

- `apps/docs/src/lib/automation.ts` — 38 entry exports in five groups, the four
  runtime functions, 17 `Locator` methods, 7 `App` + 6 mouse + 4 clock members,
  25 protocol methods, 8 error codes, 9 `TreeNode` fields, 4 capabilities,
  9 absences, and `automationSurfaceViolations`.
- `apps/docs/src/lib/automation-search.ts` — one generated document; only
  distinctive names are promoted.
- `apps/docs/src/components/automation-tables.tsx` — 11 table components, every
  row from the data module.
- `apps/docs/content/docs/automation.mdx` — the 12 sections (§2), two compiled
  fences.
- `apps/docs/src/automation.test.ts` — 35 cases.

**Changed**

`search.ts`, `search-docs.ts`, `page-aliases.ts`, `mdx.tsx`, `meta.json`,
`testing.mdx`, `component-pages.mdx`, `example-snippets.test.ts`,
`smoke-build.ts`, `test-surface.test.ts` (moves `e2e` from Testing),
`troubleshooting-page.test.ts` (sidebar offset), `TODO.md`, `PLAN.md`, the plan
index.

### 11.2 Measured declaration counts

The installed package yields exactly the counts the rows claim:

| Surface | Count |
| ------- | ----- |
| automation entry exports | 38 |
| runtime functions | 4 |
| `Locator` methods | 17 |
| `App` methods / `mouse` / `clock` | 7 / 6 / 4 |
| protocol methods | 25 |
| error codes | 8 |
| `TreeNode` fields | 9 |
| capabilities | 4 |

Two parser corrections were required and are part of the guard now:
declaration class members are indented four spaces in `client.d.ts` (not two),
and `App.call` declares a generic parameter (`call<M extends MethodName>(`).

### 11.3 Forced directions (each measured, then reverted)

| Forced defect | Failure |
| ------------- | ------- |
| `Locator.getByRole` added to `client.d.ts` | `Locator: getByRole is declared but undocumented` |
| `Locator.fill` removed | `Locator: fill is documented but not declared` |
| protocol method `snapshot` added | `protocol: snapshot is declared but undocumented` |
| error code `RateLimited` added | `error code: RateLimited is declared but undocumented` |
| entry export `snapshot` added | `automation entry: snapshot is declared but undocumented` |
| runtime function `connectSocket` added | `runtime: connectSocket is declared but undocumented` |
| `headless?: boolean` added | `a headless flag is now declared; the absence claim is stale` |
| `readClipboard` export added | `a clipboard method is now declared; the absence claim is stale` |
| `enableAutomation` removed from React declarations | `@gpuix/react no longer declares enableAutomation; the re-export claim is stale` |
| alias block and generated entry removed | **3** findability cases failed: `e2e`, `end to end`, `sse` (`3 failed | 8 passed | 24 skipped`); restored, `35 passed` |

The search proof is narrower than §5.4 predicted: without the alias block the
plain `automation`, `locator`, `getByTestId`, `connectStdio`, `dragTo` and
`capture frames` **still** reach the page, because the authored page body now
answers them lexically. The alias block is load-bearing for the three phrases
whose old owners (Testing, the Roadmap) win on prose: `e2e`, `end to end`,
`sse`. That is the measured result, not the hoped-for one.

### 11.4 Corrections made while implementing

- **`screenshot` was stolen** by the new page's prose; plan 628's regression
  keeps it on Previews, so Previews gained the exact aliases `screenshot` and
  `screenshots`. The automation page documents app capture and links Previews.
- **`testId` must not be promoted.** It is a `TreeNode` field but also the
  shared host prop Component API owns (plan 587); promoting it moved `testid`
  to automation, so it is excluded along with the selection methods
  (`getSelectedText`, `clearSelection`) and the painted-text reads
  (`getPaintedText`, `getAllText`) that Selection and Testing own.
- **`axidentifier`/`uia` were removed from the owned-query table.** They name
  the accessibility identifier Accessibility owns, not this driver.
- Testing's `e2e` row moved to Automation deliberately; Testing keeps
  `playwright`, `webdriver`, `jsdom`, `storybook` and `visual regression`.

### 11.5 Gates run

| Command | Result |
| ------- | ------ |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs test` | 152 files / 1 764 tests passed |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0 — 115 pages, 251 links, 1 483 anchors, search (two new queries), llms and markdown checks |
| `nub scripts/smoke-a11y.ts --only /docs/automation` | exit 0 — 1 page × 2 schemes, 0 violations |
| `nub scripts/smoke-responsive.ts` | exit 0 — 115 pages, phone controls and mobile navigation |
| `nub run check` | exit 0 (after `nub run fmt:fix`) |
| `nub run lint` | exit 0 |
| `nub run test` | every workspace green |

### 11.6 Follow-up recorded

`TODO.md` gains a cross-team row for the playground: expose a scenario over
`enableAutomation` so `launch` + `Locator` + `screenshot` have one measured
end-to-end run the page can link. Until then the page's evidence section states
the gap.
