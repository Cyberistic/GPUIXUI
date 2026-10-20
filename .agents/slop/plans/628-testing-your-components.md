# 628 — Testing your components: the runtime's test renderer

**Phase:** F (docs completeness — an adopter-facing capability with no owner)
**Workstream:** docs-site
**Depends on:** 410 (site), 412 (honesty), 419/431/561/568 (search), 504–507
(generated index documents), 587 (host props), 591 (page subjects), 603
(troubleshooting), 627 (selection and find)
**Status:** planned

---

## 1. The measured gap

A consumer of this library cannot answer "how do I test my screen?" from the
site. `@gpuix/react/testing` publishes a complete offscreen renderer —
`createTestRoot`, `TestRenderer`, `hasNativeTestRenderer` — and the docs never
name it. `/docs/native-testing` documents *this repository's* smoke suite
(`@gpuixui/testing` + the playground), which is the repo's own infrastructure,
not a consumer's test surface.

Measured 2026-10-20 at `425adc57` with the real search API (`search(query, 3)`):

| Query | First result before |
| ----- | ------------------- |
| `createTestRoot` | **nothing** |
| `hasNativeTestRenderer` | **nothing** |
| `test renderer` | `/docs/components/hotkey-input#accessibility-and-limitations` |
| `TestRenderer` | `/docs/components/otp-field#accessibility-and-limitations` |
| `component test` | `/docs/components` |
| `unit test` | `/docs/site-search#adding-a-searchable-surface` |
| `jsdom` | **nothing** |
| `testing library` | `/docs/accessibility#related` |
| `react testing library` | `/docs/tokens-api#react` |
| `playwright` | **nothing** |
| `storybook` | **nothing** |
| `jest` | `/docs/api-values` |
| `mock` | `/docs/components/icon` |
| `mocking` | `/docs/roadmap` |
| `spy` | **nothing** |
| `fixture` | **nothing** |
| `snapshot` | `/docs/architecture#what-runs-where` |
| `visual regression` | `/docs/components/text-input#states` |
| `golden` | **nothing** |
| `e2e` | `/docs/components/icon` |
| `end to end` | `/docs/components/slider` |
| `waitfor` | **nothing** |
| `flush` | **nothing** |
| `simulate` | `/docs/patterns/confirmation-flow` |
| `a11y tree` | `/docs/components/checkbox#accessibility-and-limitations` |
| `keyboard test` | `/docs/components/keycap` |
| `captureScreenshot` | **nothing** |
| `webdriver` | **nothing** |

The cause is structural: the test renderer is a runtime API, not a component, so
no registry record, preview tier or generated props table owns it. The subject
is exactly the one an adopter hits before writing a single assertion.

## 2. The surface that exists (installed declarations)

`@gpuix/react/dist/testing.d.ts`:

```ts
export interface TestRoot { root: Root; renderer: TestRenderer;
  render: (node: ReactNode) => void; unmount: () => void }
export declare function createTestRoot(options?: TestWindowOptions): TestRoot;
export { TestRenderer, hasNativeTestRenderer };
export * from "@gpuix/native/testing";
```

`@gpuix/native/dist/testing.d.ts`, in declaration order:

- `TestRendererOptions` — `width?`, `height?`, `dispatchEvent?` (native default
  1280×800).
- `TestWindowOptions` — `TestRendererOptions & WindowKeyEventHandlers`, so it
  adds `onKeyDown?`, `onKeyUp?`, `onSelectionChange?`.
- `hasNativeTestRenderer` — boolean; false when the binding cannot load.
- `TestElement` — `id`, `type`, `style`, `text`, `events`, `children`,
  `parentId`, `testId`, `customProps`.
- `A11yTreeDump` — `root?`, `nodes?`, each node carrying `aria` with `role`,
  `label`, `description`, `value`, `author_id`, `expanded`, `selected`, `level`,
  `on_action`.
- `class TestRenderer implements NativeRenderer` — 61 public members (excluding
  `constructor`). The ones a component test uses are listed in §4; the rest are
  excluded with an owner so nothing is silently undocumented.

Not provided, and provable from the repository: no DOM (`querySelector`,
`getBoundingClientRect`, `innerHTML` appear nowhere in the native declarations),
and no browser/e2e/Storybook/snapshot tooling in any workspace manifest
(`storybook`, `playwright`, `cypress`, `webdriverio`, `jsdom`, `happy-dom`,
`@testing-library/*`). `@gpuixui/testing` is the repo's scenario model, not a
component test framework (its README says so).

## 3. The page: `/docs/testing` — "Testing your components"

Placement: after `native-testing`, before `troubleshooting` (the smoke suite
proves the library; this page is the consumer side).

1. **Intro** — GPUix paints a native tree, so there is no DOM to query; the
   runtime ships an offscreen renderer that runs the real pipeline under vitest.
   Three layers: pure logic, component behaviour (this page), capability smoke
   (`/docs/native-testing`).
2. `## Render a component` — `createTestRoot({ width, height })`, `render`,
   `unmount`; the one-window rule (a second root takes the window over, so
   unmount first); `hasNativeTestRenderer` for gating; the binding loads
   eagerly, so a static import fails to *load* on an unsupported host (the
   measured reason this repo puts behaviour suites in a second vitest project).
   One compiling example: a component rendered, clicked at its measured centre
   and asserted.
3. `## Finding what rendered` — `<TestElementTable />` over the nine fields,
   and the find/read methods (`findByTestId` first; `testId` on every part is
   the selector).
4. `## Driving input` — the ten `nativeSimulate*`/`simulateKeystrokes` methods;
   `simulateKeystrokes` sends to whatever holds focus (the only way to prove a
   click moved focus), `nativeSimulateKeystrokes` focuses an element first;
   `keyDown`/`keyUp` for a held key; mouse down/move/up for a drag; wheel
   `deltaY` is negative to scroll down.
5. `## Focus` — `focusElement`, `getFocusedElementId`, `focusNext`,
   `focusPrevious`, `focusNextWithin`/`focusPreviousWithin` (the dialog Tab trap).
6. `## Time` — `clockPause/Set/FastForward/Resume` move the **motion** clock;
   `advanceTime` runs due **timers** (a toast's dismissal is this one). Link
   Theming's motion section.
7. `## Scrolling` — `scrollTo` (negative y down), `scrollToItem` (with the
   pixel-stable `offsetInItem` rule), `scrollIntoView`, `getScrollOffset`,
   `getListScrollTop` (the `<virtual-list>` anchor).
8. `## What it painted, and its accessibility` — `getPaintedText` (native
   `<code>`/`<diff>` text `getAllText` cannot see), `getA11yTree`, `getWindowSize`,
   `captureScreenshot` (an artifact, never an assertion), `setImage` /
   `setImagePixels` (bytes for an `<img>`, so an image test needs no fixture
   file). Link Selection and find for `dragSelect`, `getSelectedText`,
   `getPaintedHighlights`, `clearSelection`.
9. `## The render loop` — `flush` → `drainEvents` → `dispatchNativeEvents`;
   `applyBatch` is what `render` calls. No `act` and no `waitFor`: the loop is
   synchronous.
10. `## The suite this repository runs` — a compact table of the layers with
    their real commands: `nub run test` (logic), `nub run --filter
    @gpuixui/components test:behaviour` (this renderer, second vitest project),
    `nub run --filter playground smoke` (capability scenarios), the docs browser
    smokes (the docs site only). Link Contributing and Native smoke suite.
11. `## What is not provided` — `<TestingAbsences />`: a DOM, jsdom/happy-dom,
    React Testing Library, Playwright/Cypress/WebDriver, Storybook, snapshot and
    golden-image assertions, `act`/`waitFor`, renderer mocking, coverage — each
    with the honest substitute.

## 4. Data module — `apps/docs/src/lib/test-surface.ts`

Browser-safe: declaration text is passed in, never read from disk. Export:

```ts
export interface TestingField { readonly name: string; readonly summary: string }
export interface TestingMethod { readonly name: string; readonly summary: string }
export interface TestingGroup { readonly id: string; readonly title: string;
  readonly note: string; readonly methods: ReadonlyArray<TestingMethod> }
export interface ExcludedTestingMethod { readonly name: string;
  readonly owner: string }
export interface TestingAbsence { readonly subject: string;
  readonly statement: string; readonly symbol?: RegExp }
```

- `testWindowFields` (5 rows): `width`, `height`, `dispatchEvent`, `onKeyDown`,
  `onKeyUp`. `onSelectionChange` is an exclusion row owned by Selection and
  find.
- `testElementFields` (9 rows): `id`, `type`, `style`, `text`, `events`,
  `children`, `parentId`, `testId`, `customProps`.
- `testMethodGroups` (7 groups, 45 rows), exactly:
  1. **find** — `getRoot`, `getElement`, `findByTestId`, `findByText`,
     `findByType`, `getAllText`, `getPaintedText`, `toJSON`,
     `getRetainedElementCount`, `getElementBounds`.
  2. **input** — `simulateKeystrokes`, `nativeSimulateKeystrokes`,
     `nativeSimulateKeyDown`, `nativeSimulateKeyUp`, `nativeSimulateClick`,
     `nativeSimulateMouseDown`, `nativeSimulateMouseUp`,
     `nativeSimulateMouseMove`, `nativeSimulateScrollWheel`,
     `nativeSimulateFileDrop`.
  3. **focus** — `focusElement`, `getFocusedElementId`, `focusNext`,
     `focusPrevious`, `focusNextWithin`, `focusPreviousWithin`.
  4. **time** — `clockPause`, `clockSet`, `clockFastForward`, `clockResume`,
     `advanceTime`.
  5. **scroll** — `scrollTo`, `scrollToItem`, `scrollIntoView`,
     `getScrollOffset`, `getListScrollTop`.
  6. **render** — `flush`, `drainEvents`, `dispatchNativeEvents`, `applyBatch`.
  7. **inspect** — `getA11yTree`, `getWindowSize`, `captureScreenshot`,
     `setImage`, `setImagePixels`.
- `excludedTestMethods` (16 rows with an owner):
  `dragSelect`, `getSelectedText`, `clearSelection`, `getPaintedHighlights` →
  Selection and find; `promptForPaths`, `setWindowSelectionChange`,
  `setWindowKeyEvents` → The Application window / Selection and find (renderer
  wiring; `createTestRoot` takes the handlers); `getSyntaxCacheStats` →
  Performance; the five `*DebugFrameOverlay*` members → The Application window;
  `getAutomationTree` → Previews; `dispatchScrollWheel`, `dispatchMouseMove` →
  Performance (they deliberately skip the surrounding flushes for sampling).
- `testingAbsences` (9 rows):
  1. a DOM — symbol `/querySelector|getBoundingClientRect|innerHTML/u`.
  2. jsdom / happy-dom — `noPackage("jsdom", "happy-dom")`.
  3. React Testing Library — `noPackage(/^@testing-library\//u)`.
  4. an e2e driver — `noPackage("playwright", "cypress", "webdriverio")`.
  5. Storybook — `noPackage(/^storybook$|^@storybook\//u)`.
  6. snapshot / golden-image assertions — no symbol; the page states it and
     `native-testing.mdx` keeps "A screenshot is an artifact, never an
     assertion".
  7. `act` / `waitFor` — no symbol; the loop is `flush` +
     `dispatchNativeEvents`.
  8. renderer mocking — `hasNativeTestRenderer` gates a suite; the renderer is
     the real one.
  9. coverage — link the Roadmap's measured-coverage statement.

`testingViolations(input)` returns a `ReadonlyArray<string>` with exactly these
message forms (so a forced failure can assert the string):

- `TestRenderer: <name> is documented but not declared`
- `TestRenderer: <name> is declared but undocumented`
- `TestRenderer: <name> is both documented and excluded`
- `TestWindowOptions: <name> is documented but not declared`
- `TestWindowOptions: <name> is declared but undocumented`
- `TestElement: <name> is documented but not declared`
- `TestElement: <name> is declared but undocumented`
- `<subject>: the page says it is absent, but <detail>`
- `<subject>: no package in the workspace declares <dependency>` must never
  fire; the absence guard fails when a denied dependency appears.

Parsing helpers (reuse what exists; do not reimplement a regex twice):

- `interfaceFieldsIn(declarations, name)` from `./native-elements` for
  `TestRendererOptions`, `WindowKeyEventHandlers` and `TestElement`.
- A new `testRendererMethodNames(declarations)` in `test-surface.ts` that
  extracts, between `export declare class TestRenderer` and the closing `}`, both
  `^  name(` methods and `^  readonly name:` members, excluding `constructor`.
  `rendererMethodNames` in `window-surface.ts` only reads method syntax, so it
  cannot see `focusNext`/`focusPrevious`.

## 5. Renderer — `apps/docs/src/components/test-surface.tsx`

Four components, registered in `src/components/mdx.tsx`:

- `<TestWindowTable />` — two columns (field, meaning), grouped as one table.
- `<TestElementTable />` — the nine fields.
- `<TestMethodGroups />` — one `<h3>` per group with the note and a table of
  method/meaning.
- `<TestingAbsences />` — one row per absence with its substitute.

Every cell reads `test-surface.ts`; the MDX page retypes no name.

## 6. Search

New `apps/docs/src/lib/testing-search.ts` exporting `testingSearchEntry`:

- `names`: `TestRenderer`, `TestElement`, `TestWindowOptions`,
  `TestRendererOptions`, `A11yTreeDump`, `createTestRoot`,
  `hasNativeTestRenderer`, plus the documented camelCase method names
  (`findByTestId`, `nativeSimulateKeystrokes`, `advanceTime`, `getPaintedText`,
  `getA11yTree`, `captureScreenshot`, …). Do **not** promote `testId` (Component
  API owns it, plan 587), or the selection methods (Selection and find owns
  them).
- `index`: title "Testing your components", a description naming the renderer,
  the seams, and the absent DOM/browser tools; `content` is the rendered rows
  plus the absence statements; `url: "/docs/testing"`.
- Add it to `generatedSearchEntries` in `src/lib/search.ts`, and one matching row
  to `indexedSurfaces` in `src/lib/search-docs.ts` (that list is compared with
  `generatedSearchEntries`).

Page aliases in `src/lib/page-aliases.ts`, one `/docs/testing` block (exact whole
query only):

`jsdom`, `happy-dom`, `happy dom`, `react testing library`, `testing library`,
`playwright`, `cypress`, `webdriver`, `webdriverio`, `storybook`, `jest`,
`mock`, `mocking`, `spy`, `fixture`, `test fixture`, `snapshot test`,
`snapshot tests`, `golden image`, `golden test`, `visual regression`,
`visual regression test`, `e2e`, `end to end`, `component test`, `component
tests`, `unit test`, `unit tests`, `test renderer`, `test setup`, `testing
setup`, `mock renderer`, `mocking renderer`, `a11y tree`, `keyboard test`.

Regression rows (must keep their owner): `vitest`, `ci`, `github actions`
(Contributing); `screenshot` (Previews); `coverage` (Roadmap); `selection`
(Selection and find); `accessibility tree` (Accessibility); `headless`
(Installation); `test` and `smoke test` (Native smoke suite) — the last only if
the built index agrees; measure and record any correction in §8.

## 7. Test plan

New `apps/docs/src/lib/test-surface.test.ts` (co-located guard, vitest), with
this header comment: the bug guarded is a consumer-facing testing API with no
page, so `createTestRoot`, `hasNativeTestRenderer`, `jsdom`, `playwright` and
`storybook` returned nothing (measured 2026-10-20).

1. `the installed testing surface / agrees with the declarations in both
   directions` — `testingViolations(base)` → `[]`.
2. `fails when a documented method is not declared` — add `{ name: "clickOnce" }`
   → contains `TestRenderer: clickOnce is documented but not declared`.
3. `fails when a declared method is undocumented` — drop `advanceTime` from its
   group → contains `TestRenderer: advanceTime is declared but undocumented`.
4. `fails when a method is both documented and excluded` — add `flush` to the
   exclusions → contains `TestRenderer: flush is both documented and excluded`.
5. `fails when a window field drifts` — rename `dispatchEvent` →
   two `TestWindowOptions:` messages.
6. `fails when a TestElement field drifts` — rename `customProps` → two
   `TestElement:` messages.
7. `fails when a claimed absence becomes real` — add `{ subject: "Fixture",
   statement: "Not provided.", symbol: /StyleDesc/u }` → contains
   `Fixture: the page says it is absent, but the declarations now contain
   StyleDesc`.
8. `no denied testing dependency is installed` — read every `package.json`
   under the repo root (`apps/*`, `packages/*`, `examples/*`, root) and assert no
   dependency matches the denied set. Prove both directions: the deliberate
   negative is the fixtures list containing `storybook`; the real check is
   `[]`.
9. Page guard — `content/docs/testing.mdx` includes the four components and the
   eleven headings; its frontmatter description names `test renderer`, `dom`,
   `playwright` and `storybook`; `/docs/testing` is served and `meta.json`
   contains `"testing"`.
10. Search — owned table (every §6 alias, every promoted name, `test renderer`,
    `component test`, `unit test`, `a11y tree`, `keyboard test`) returns
    `/docs/testing` first; regressions keep their owner.

Also update, where the existing guards require it:

- `src/lib/page-aliases.test.ts` — add the plan-628 block to the header and the
  owned/regression rows.
- `src/lib/search-docs.test.ts` — passes once `indexedSurfaces` has the row.
- `src/mdx-components.test.ts` — passes once the four components are registered.
- `src/components/preview/preview-gaps.test.ts`, `component-pages.test.ts` — no
  change: `/docs/testing` is not a component page.

## 8. Two-direction proofs to run and record

| Deliberate defect | Expected failure |
| ----------------- | ---------------- |
| remove `<TestingAbsences />` from the page | `page guard` names the missing block |
| remove `advanceTime` from its group | `TestRenderer: advanceTime is declared but undocumented` |
| rename `getFocusedElementId` in a group | two `TestRenderer:` messages |
| drop the `/docs/testing` alias block | owned queries fail by name, e.g. `playwright → nothing` |
| remove the entry from `generatedSearchEntries` | `createTestRoot` fails its owned row |
| add `"storybook"` to a fixture manifest | the denial guard prints the package and dependency |
| delete the new page from `meta.json` | the page guard's sidebar assertion fails |

Record the measured before/after for every §1 query in the results section.

## 9. Commands

1. `cd apps/docs && nub exec vitest run src/lib/test-surface.test.ts`
2. `cd apps/docs && nub exec vitest run src/lib/search.test.ts src/lib/page-aliases.test.ts src/lib/search-docs.test.ts src/mdx-components.test.ts`
3. `nub run --filter docs check-types`
4. `nub run --filter docs build && nub run --filter docs smoke:build`
5. `nub run --filter docs smoke:a11y && nub run --filter docs smoke:responsive`
6. `nub run check && nub run lint && nub run test`

Expected: all exit `0`; `smoke:build` reports one more page (110 → 111) and the
new production query; axe clean on the new page in both schemes.

## 10. STOP conditions

- `@gpuix/react/testing` no longer resolves, or `createTestRoot` is not exported
  by the installed package: stop and re-measure; do not document a symbol that
  is not installed.
- The installed `TestRenderer` member set differs from §2 (a dependency bump):
  stop, re-derive the 45/16 split, and update this plan before writing rows.
- A denial (`no playwright`, `no storybook`, …) is false for this repository:
  remove the row and document what is actually installed.
- A §6 alias cannot keep its owner without a ranker change: record the measured
  limit and keep the exact phrase, as plans 607/608 do.
- An adopter test cannot be written with only the documented seams: label the
  gap in `TODO.md` rather than inventing an API.

## 11. Acceptance criteria

- `/docs/testing` renders the 5 window fields, 9 element fields, 45 methods in
  7 groups, the 16 exclusions with their owners, and the 9 absences — all from
  `test-surface.ts`.
- `test-surface.test.ts` agrees with the installed declarations in both
  directions, with every forced failure in §7 recorded.
- Every §1 query reaches `/docs/testing` first; every regression row keeps its
  owner; the production index answers two of them in `smoke:build`.
- A compiling copyable example on the page.
- `TODO.md`, the plan index, `PLAN.md` (one decision row) and the branch updated;
  gates from §9 run and recorded.
