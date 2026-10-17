# 189 — The real-window smoke run: the playground driven through the automation API

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | B (foundation) → F (release evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `188` |
| Feeds | the docs' native previews, `TODO.md`'s published-binary CI task, Phase G |

## 1. Goal

Every native verdict in this repo comes from `TestRenderer`, an offscreen
renderer. That is a real GPUI pipeline, but it is **not a window**: the
interactive entrypoint (`nub run dev:playground`) has never been exercised by
the suite, and the mission's gold standard is the actual runtime.

Two measured facts make a real-window run possible now:

1. `nub run dev:playground` **does open a window on this host**
   (`[gpuix] created native window`, `[gpuix] mount complete`), so the earlier
   "no display session" assumption is not true for this worktree.
2. `@gpuix/native/automation` ships a complete in-process E2E client —
   `connectTest(liveRendererAsTest(renderer))` gives an `App` with
   `getByTestId`, `click`, `press`, `fill`, `hover`, `wheel`, `dragBy`,
   `textContent`, `waitFor`, `screenshot` and clock control. Measured in the
   spike: clicking `nav-text-native` switched the stage, `Enter` on
   `nav-text-entry` switched the stage, and `fill("hi")` reached the input's
   `onChange` (`input-readout` read `value=hi`).

The probe delivers a **second runner** with the same report and exit-code
contract, mounting the real `App` in a real window and driving the shipped
playground. It is not a duplicate of the 56-scenario suite; it is the
gold-standard confirmation that the core facts transfer to a window, plus
real-window screenshots the docs can use.

## 2. What is measured, and what cannot be

The automation API exposes: bounds, the tree (id/type/testId/text/children —
**no style**), painted text, scroll offset, selection, focus, mouse, keys,
clock and screenshots. It does **not** expose `paintedStyle`, the AccessKit
dump, `getListScrollTop`, `scrollIntoView`/`scrollToItem`, or highlights. So
the live suite covers the mechanisms those channels are not needed for:

| Live scenario | Capability | Checks |
| ------------- | ---------- | ------ |
| `live-shell` | `layout` | the window opens at the requested size; `app-shell` bounds equal it; clicking `nav-text-native` paints that scenario's title in `stage-title` and its own text in the stage; `Enter` on `nav-input-edit` switches the stage; a screenshot is written |
| `live-input` | `input` | clicking `nav-input-edit` mounts the field; `fill("hi")` makes the readout read `value=hi`; `Enter` sets `submits=1`; a screenshot is written |
| `live-scroll` | `scroll` | the virtual-list scenario's container scrolls under the wheel (`getScrollOffset` moves, `deltaY` negative), a later row's text becomes painted, and the offset is read from the live renderer |

Colour, style-report and accessibility assertions stay where their channels
exist: the `TestRenderer` suite (`theme-*`, `a11y-tree`). The live run is
evidence of **window** behaviour, not a replacement.

## 3. Design

### 3.1 An async host, because the automation protocol is a promise API

`Smoke.SmokeHost` is synchronous; `connectTest`'s `App` is async. Rather than
duplicate the check model, make the context generic over its host:

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | `SmokeContext<Host = SmokeHost>` (default keeps every existing use source-compatible); `runScenarios` delegates to a host-generic `runScenario`. Add `AsyncSmokeHost` (same verbs, each returning `Effect<A, SmokeHostError>`) and `runAsyncScenarios(host, scenarios, meta, beforeEach?)` returning the **same** `SmokeReport`, so `Report.formatReport`/`Report.exitCode` and the JSON encoding are reused unchanged. |
| `packages/testing/src/smoke.test.ts` | a test for the async runner: two scenarios, one passing one failing, asserting the aggregation and that a host failure becomes an `errored` check, not a throw |

`SmokeHostError` is a `Schema.TaggedError` carrying the verb name and the
underlying cause, so a live host failure names the call that failed.

### 3.2 The live host

New `apps/playground/src/live/host.ts`:

```ts
export const createHost = (app: AutomationApp, renderer: GpuixRenderer): AsyncSmokeHost => ({ ... })
```

It keeps one `Map<string, number>` of test ids (refreshed by `getTree`) and
implements:

- `text(testId)` → `Locator.textContent()` (subtree text, like the smoke host);
- `bounds(testId)` → `Locator.bounds()`;
- `paintedText()` / `allText()` → `app.call("getPaintedText" | "getAllText")`;
- `click`/`press`/`movePointer`/`releasePointer`/`hover`/`wheel` → the `App`
  mouse API; `key` → `call("keystrokes", { keys })`; `keyDown`/`keyUp` →
  `call("keyDown"/"keyUp", { elementId, keystroke, isHeld })`;
- `focused()` → the renderer's `getFocusedElementId` is **not** in the
  automation protocol, so this verb is `Effect.succeed(null)` and no live
  scenario asserts it (**documented limitation**);
- `screenshot` → `App.screenshot`;
- `advance`/`pauseMotion`/`fastForwardMotion` → `App.clock.*`;
- `scrollOffset` → `call("getScrollOffset", { elementId })`;
- every channel the protocol lacks (`paintedStyle`, `a11y`, `highlights`,
  `listScrollTop`, `scrollIntoView`, `scrollToItem`, `selectText`,
  `selectedText`, `clearSelection`, `focusNext`, `focusPrevious`, `drag`,
  `fileDrop`, `rightClick`, `clickWindow`) → returns its empty value or a
  `SmokeHostError`, **never a silent fake**. A live scenario that needs one
  fails with the verb's name.

The tree is refreshed after each input call, because a re-render can replace
ids.

### 3.3 The runner

New `apps/playground/src/live/run.ts`, built to `dist/live/run.js`:

1. `createRenderer()` (the event-wired constructor — **not**
   `new GpuixRenderer()`, which has no React event callback and receives no
   input; measured in the spike).
2. `renderer.init({ title: "GPUIXUI live smoke", width: 1100, height: 720 })`
   inside `Effect.try`: a host with no display fails here and the runner exits
   **`2`** with `live smoke: no display …` and no report written.
3. `startFrameLoop(renderer, { onTerminated: () => … })` — an injected renderer
   starts no loop of its own.
4. `render(<App list={scenarios}/>, { renderer, title, width, height })`.
5. `connectTest(liveRendererAsTest(renderer))`.
6. `Smoke.runAsyncScenarios(host, liveScenarios, meta, beforeEach)` where
   `beforeEach` clicks the needed nav entry (each live scenario mounts the
   shipped `App`; the mirror of the keyed `Fragment`, plan `182`).
7. Write `.artifacts/live-report.json`, one screenshot per scenario under
   `.artifacts/live/`, print `Report.formatReport`, `loop.stop()`, exit with
   `Report.exitCode`.

New scenarios: `apps/playground/src/live/scenarios.tsx` (the three in §2).

### 3.4 Commands

```json
"smoke:live": "nub run build && nub dist/live/run.js"
```

## 4. Files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/189-real-window-smoke.md` | this plan; append §9 |
| `packages/testing/src/smoke.ts` | generic context, `AsyncSmokeHost`, `runAsyncScenarios` |
| `packages/testing/src/smoke.test.ts` | async-runner tests (§5) |
| `packages/testing/src/index.ts` | export nothing new beyond the `Smoke` namespace (it already re-exports the module) |
| `apps/playground/src/live/host.ts` | **new** — the automation host |
| `apps/playground/src/live/scenarios.tsx` | **new** — the three live scenarios |
| `apps/playground/src/live/run.ts` | **new** — the CLI |
| `apps/playground/package.json` | `smoke:live` script |
| `apps/playground/README.md` | the live runner, exit codes, what it does not cover |
| `COMPONENTS.md` | one sentence: which verdicts are also confirmed in a real window |
| `TODO.md` | tick the task; tick/split the "gold standard" CI item (window confirmed locally; the published-binary run stays) |
| `PLAN.md` | a decision row if the async runner becomes the pattern |
| `.agents/slop/plans/README.md` | index row for `189` |

## 5. Test plan

- `packages/testing`: `runAsyncScenarios` — a passing scenario yields one
  `Passed`; a failing assertion yields one `Failed` and the run continues; a
  host verb that fails its `Effect` yields an `Errored` check; capabilities
  aggregate `verified` only when every scenario of that capability passed.
- The live scenarios are their own tests; each can fail (§6).
- `nub run check`, `nub run test` stay green (the live runner is never part of
  them: it needs a window).

## 6. Two-direction proof

| # | Mutation | Must fail |
| - | -------- | --------- |
| L1 | remove the nav entry's `onClick` | *clicking an entry switches the stage* |
| L2 | remove the nav entry's `onKeyDown` | *Enter switches the stage* |
| L3 | make the `input-field` `readOnly` | *fill reaches onChange* (readout stays `value=`) |
| L4 | remove `overflowY: "scroll"` from the virtual-list container | *the wheel moves the offset* |
| L5 | have `live-scroll` assert the offset without a wheel | *the offset moved* (expected 0 gets a negative) |

## 7. STOP conditions

- `renderer.init` throws without a display: that is the **exit `2`** path, not a
  failure. Report the error text and keep the code.
- The automation `App` cannot resolve a `testId` used by a live scenario: fix
  the id in the scenario, do not add a hidden wrapper.
- `fill`/`press` do not reach the app although a click does: record the verb,
  the element id and the painted frame; scope the check to what the protocol
  delivers and record the gap in §9. Do not fall back to the TestRenderer and
  call it live.
- A check needs a channel the protocol does not expose (`paintedStyle`, a11y,
  `listScrollTop`): that check belongs to the TestRenderer suite. Do not
  approximate it with a screenshot.
- The window steals focus and the run takes longer than ~30 s: stop after the
  scenario that hung, report `Errored`, and record it. A live run must never
  block the suite.

## 8. Acceptance criteria

- `nub run --filter playground smoke:live` exits `0` on this host, writes
  `.artifacts/live-report.json` and three screenshots.
- The same command exits `2` (not `1`) when no display is available.
- §9 records: the window size, each scenario's checks, the exit codes, and each
  mutation's failing label.
- `COMPONENTS.md`, `TODO.md` and the playground README state exactly which
  verdicts are now window-confirmed and which remain `TestRenderer`-only.
