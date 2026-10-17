# 120 — Plan: `apps/playground` (native GPUix playground + smoke runner)

| Field | Value |
| ----- | ----- |
| Status | ready to execute |
| Phase | B |
| Owner | playground workstream |
| Depends on | `100-package-testing.md`; `@gpuix/react@0.10.0` + `@gpuix/native@0.10.0` |
| Reads | `110-native-smoke-test.md` (what to prove), `130-tier3-4-feasibility-probes.md` (probe scenarios) |

## 1. Goal

One app that does three jobs, with no duplication between them:

1. **The playground**: a real GPUix window showing the scenarios, so a human can
   drive each primitive by hand (`nub run dev:playground` from the root).
2. **The native smoke runner**: the same scenarios exercised by synthetic GPUI
   input in a `TestRenderer`, producing the report of plan `110`
   (`nub run --filter playground smoke`).
3. **The evidence source for the docs**: scenario ids, readouts and screenshots
   are what `apps/docs` links to instead of faking a native preview.

The scenarios are the single source of truth: the playground's sidebar *is* the
scenario list, and the smoke runner *is* the same list driven automatically.

## 2. Verified facts that shape the implementation

| Fact | Evidence |
| ---- | -------- |
| GPUix runs on Node (not only Bun); no Bun on this host | `references/gpuix/README.md` §"Build from scratch" ("React apps also run on Node.js, as `disktree` does"); `which bun` → not found |
| `render()` must be called once, at the end of an entry module; a second call throws | `references/gpuix/README.md` §Hot reload |
| JSX needs `"jsxImportSource": "@gpuix/react"` | README §1; installed `@gpuix/react/jsx-runtime.d.ts` |
| `createTestRoot()` + `TestRenderer` are GPU-backed and macOS/Windows only | installed `@gpuix/native/js/testing.ts`; Linux throws in the constructor |
| The test renderer exposes exactly the input the adapter needs | installed `TestRenderer`: `nativeSimulateClick/MouseDown/MouseMove/MouseUp/ScrollWheel/Keystrokes`, `getElementBounds`, `getElementsAt`, `getFocusedElementId`, `getAllText`, `getPaintedText`, `getScrollOffset`, `captureScreenshot`, `advanceTime` |
| `testId` exists on every host element, including `<virtual-list>` in 0.10.0 | installed `@gpuix/native/dist/host.d.ts:340,371` |
| Mouse event payload `x`/`y` are **window** coordinates | `references/gpuix/examples/timeline.tsx:880,915`; automation docs |
| `<input>` needs `autoFocus` or a click before it receives keys | installed `@gpuix/native/dist/host.d.ts:316` |
| Pointer capture arms on the pressed element from the **left** button only | README §Supported Events |
| `@gpuix/react/jsx-runtime` and `@gpuix/native/host` are pure; `render`, `createRoot`, `@gpuix/react/testing` load the binding | probe: `jsx-runtime.js` re-exports `react/jsx-runtime`; `dist/host.js` re-exports pure helpers |

**Because of the last row: the smoke CLI must import the native modules
dynamically, after a successful preflight.** A static import anywhere in the CLI
module graph would crash before the report can explain why.

### 2.1 Plan amendments (measured against the installed `@gpuix/*@0.10.0`)

The design below was written against upstream `main`; the installed `0.10.0`
package is narrower. Each amendment was verified against the installed `dist`
before implementing, and the app README repeats them for a consumer.

1. **The host adapter is synchronous, over `TestRenderer`** (`src/smoke/host.ts`),
   not the async `automation` `Locator`/`App`. Every `TestRenderer` input and
   inspection method (`nativeSimulate*`, `getElementBounds`, `getAllText`,
   `getPaintedText`, `getScrollOffset`, `getFocusedElementId`, `captureScreenshot`,
   `advanceTime`) is synchronous, and `SmokeHost` is synchronous; the async
   locator would force every scenario to await for no extra capability.
2. **`getElementsAt`, `onLayout` and `onScrollChange` do not exist in 0.10.0**
   (`grep -r` over `react/dist` and `native/dist` finds none). §3.2's hit-test,
   §3.5's `onLayout`-derived `max`, and §3.3's `onScrollChange` readout are
   replaced: the overlay asserts the popup is *painted* and dismissible, the
   panel takes `max` as a prop, and the scroll scenario reads
   `renderer.getScrollOffset` directly.
3. **No programmatic focus from component code.** `PublicInstance` has no
   `focus()`; the app boundary owns `renderer.focusElement`. §3.3's "focus
   returns to the trigger" cannot be a component contract, so the overlay
   scenario does not claim it and the README records the limitation.
4. **`style.gridTemplateColumns` is a column count** (`number`), not a CSS track
   list — §3.5 of plan `130` uses flex rows with fixed widths instead.
5. **The pure math is `src/panels/resize.ts` and the component is
   `src/panels/split-pane.tsx`**, not `split.ts` + `split.tsx`: two files with
   the same basename emit the same `split.js` and `tsc` rejects the collision.
6. **`beforeEach` is a new optional argument on `Smoke.runScenarios`** so the app
   can mount each scenario's own `view()` before its `steps` run. It is optional,
   so the platform-free tests still need no renderer, and it is unit-tested
   (`packages/testing`).
7. **Artifacts use `@effect/platform-node`'s `NodeFileSystem`/`NodePath`**
   (EF-21). `nub install --force` was needed once to materialise the package
   into `apps/playground/node_modules`; a plain `nub install` reported "up to
   date" against stale `.modules.yaml` metadata.

## 3. Design

### 3.1 Files (budget: ≤ 900 LOC of `src`, tests and scenarios included)

```
apps/playground/package.json
apps/playground/tsconfig.json          # noEmit; check-types
apps/playground/tsconfig.build.json    # emits dist/, jsxImportSource @gpuix/react
apps/playground/.gitignore             # .artifacts/
apps/playground/README.md              # updated: run, smoke, evidence, blocker
apps/playground/src/theme.ts           # playground-local semantic roles (see §3.6)
apps/playground/src/ui.tsx             # Panel, Label, Readout, Toolbar, Divider
apps/playground/src/panels/split.ts    # pure resize math (clampSize, nextSize)
apps/playground/src/panels/split.tsx   # SplitPane: divider with pointer capture
apps/playground/src/scenarios/index.ts # registry + integrity checks
apps/playground/src/scenarios/layout.tsx
apps/playground/src/scenarios/text.tsx
apps/playground/src/scenarios/input.tsx
apps/playground/src/scenarios/focus.tsx
apps/playground/src/scenarios/overlay.tsx
apps/playground/src/scenarios/scroll.tsx
apps/playground/src/scenarios/panel.tsx
apps/playground/src/scenarios/virtual-list.tsx
apps/playground/src/scenarios/table.tsx        # probe, plan 130
apps/playground/src/scenarios/workspace.tsx    # probe, plan 130
apps/playground/src/smoke/host.ts      # createNativeHost(root): SmokeHost adapter
apps/playground/src/smoke/run.ts       # CLI entry (preflight → scenarios → report)
apps/playground/src/panels/split.test.ts
apps/playground/src/smoke/run.test.ts
apps/playground/src/main.tsx           # render(<App/>) — the only render() call
apps/playground/src/app.tsx            # shell: sidebar of scenarios + stage + results
apps/playground/legacy-probe/*         # the 0.5.1 evidence probe (plan 110 §3.4)
```

`package.json`:

```json
{
  "name": "playground",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nub run --filter @gpuixui/testing build && tsc -p tsconfig.build.json",
    "dev": "nub run build && node --watch dist/main.js",
    "smoke": "nub run build && node dist/smoke/run.js",
    "check-types": "nub run --filter @gpuixui/testing build && tsc -p tsconfig.json",
    "test": "nub run --filter @gpuixui/testing build && vitest run"
  },
  "dependencies": {
    "@gpuix/native": "0.10.0",
    "@gpuix/react": "0.10.0",
    "@gpuixui/testing": "workspace:*",
    "effect": "catalog:",
    "react": "19.2.4"
  },
  "devDependencies": {
    "@effect/vitest": "catalog:",
    "@types/node": "catalog:",
    "@types/react": "^19.2.0",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

Exact pins are deliberate: GPUix requires adapter and native at the same exact
version (README §"Build from scratch"). The `build`/`check-types`/`test`
prefixes exist because `@gpuixui/testing` is consumed from `dist`; document that
in the README. `nub run dev:playground` at the root already points here.

`tsconfig.json`: extends `@gpuixui/config/tsconfig.base.json`, adds
`"jsx": "react-jsx"`, `"jsxImportSource": "@gpuix/react"`, `"module":
"nodenext"`, `"moduleResolution": "nodenext"`, `"noEmit": true`,
`"types": ["node"]`. `tsconfig.build.json` extends it with
`"noEmit": false, "outDir": "dist", "rootDir": "src"` and excludes `**/*.test.*`.
Relative imports use `.js` specifiers (Node ESM output).

### 3.2 The host adapter (`smoke/host.ts`)

```ts
export const createNativeHost = (
  renderer: TestRenderer,                 // type-only import
  app: AutomationApp,                     // `connectTest(renderer)` from @gpuix/react/automation
  options: { readonly artifactsDir: string; readonly all?: boolean; readonly scenarioId?: string }
): SmokeHost
```

Two surfaces, and the reason for each:

- **Input** goes through the **automation `App`** (`connectTest(renderer)`):
  `locator.click()`, `.hover()`, `.wheel(dx, dy)`, `.dragBy(dx, dy)`,
  `.fill(text)`, `.press(key)`, `.bounds()`, `.textContent()`, `.waitFor()`.
  This is the API upstream maintains for exactly this job, and it is the same
  family on 0.5.1 and 0.10.0 (measured: plan `110` §2.2).
- **Inspection** goes through the **`TestRenderer`**: `getAllText`,
  `getPaintedText`, `getElementBounds`, `getElementsAt` (0.10 only),
  `getFocusedElementId` (0.10 only), `getScrollOffset`, `captureScreenshot`,
  `advanceTime`, `clockPause/FastForward`.

| `SmokeHost` | Implementation |
| ----------- | -------------- |
| `text(testId)` | `locator.textContent()` (upstream's readout channel; it walks descendants, which `TestElement.text` does not) |
| `paintedText()` | `renderer.getPaintedText()` |
| `bounds(testId)` | `locator.bounds()` → `Bounds`, falling back to `renderer.getElementBounds(id)` |
| `focused()` | `renderer.getFocusedElementId()` → `getElement(id)?.testId`; on a version without it, `Option.none` and the scenario asserts focus through an `onFocus` readout instead |
| `click(testId)` | `locator.click()` |
| `clickWindow(x, y)` | `app.mouse.click(x, y)` |
| `key(keystroke)` | `locator.press()` for a focused target, else `renderer.nativeSimulateKeystrokes(id, keys)` |
| `wheel(testId, dx, dy)` | `locator.wheel(dx, dy)` |
| `drag(testId, dx, dy)` | `locator.dragBy(dx, dy)` |
| `scrollOffset(testId)` | `renderer.getScrollOffset(id)` |
| `screenshot(path)` | `renderer.captureScreenshot(path)` |
| `advance(ms)` | `renderer.advanceTime(ms)` |

A missing `testId` is a **scenario bug**: the adapter returns `Option.none` and
the scenario's own `expectSome` fails with a label naming the missing id.

### 3.2.1 Version guards

`SmokeHost` is the seam that keeps the suite honest across GPUix versions: the
adapter checks for an optional renderer method (`getFocusedElementId`,
`getElementsAt`, `onScrollChange`) and, when absent, **skips the check with an
explicit `unverified` result**, never a silent pass. The suite's report must
show which checks were skipped and why. `MISSION.md`'s rule ("never claim a
test passed unless it ran") is enforced here.

### 3.3 The smoke CLI (`smoke/run.ts`)

Shape (Effect-first, `Effect.runPromise` only here):

```ts
const program = Effect.gen(function* () {
  const runtime = yield* detectRuntime({ platform: process.platform, arch: process.arch,
                                         load: () => import("@gpuix/react/testing") })
  if (runtime._tag === "RuntimeUnsupported") {
    yield* Console.error(formatUnsupported(runtime))
    yield* Console.error("exit 2: no native evidence was produced (ADR 0001)")
    return exitCodes.unverified           // 2
  }
  const { createTestRoot } = yield* loadNative()          // Effect.tryPromise
  const scenarios = (yield* loadScenarios()).filter(...)  // dynamic import, --only filter
  const root = createTestRoot({ width: 1280, height: 800 })
  const report = yield* runScenarios(createNativeHost(root.renderer, ...), scenarios, meta)
  yield* writeArtifacts(report)                            // FileSystem + Path services
  yield* Console.log(formatReport(report))
  if (flags.json) yield* Console.log(reportJson(report))
  return exitCode(report)
})
```

- Flags, parsed by hand from `process.argv` (four flags do not justify a
  dependency): `--json`, `--only <scenario-id>`, `--screenshots`,
  `--artifacts <dir>` (default `apps/playground/.artifacts`).
- `writeArtifacts` uses `FileSystem.FileSystem` and `Path.Path` with
  `NodeFileSystem.layer` + `NodePath.layer` from `@effect/platform-node`
  (already in the repo catalog) — no `node:fs`. Screenshots go through the
  adapter, so the app never touches a raw path.
- `process.exitCode` is set at the boundary; `Effect.runPromise` runs once.
- Preflight output on this host must name the platform, arch, the loader's
  message, and the remedy from `bindingHint`.

### 3.4 The playground shell (`app.tsx`)

- Left: scenario list (id, capability badge, last outcome) — clicking selects.
- Right: the stage (the selected scenario's `view()`), a `SplitPane` divider, and a
  results panel below showing per-check pass/fail from a manual "Run checks"
  action (which does not need the test renderer: it drives the same `steps`
  against a *live* host adapter built on the real `renderer`/window — see below).
- The shell must work without the smoke host: the stage renders, checks are
  disabled with a "requires the native test host" note. This keeps `dev` usable.

**Live host (optional, plan 120 step 7):** the live window can expose the same
`SmokeHost` through `@gpuix/react`'s automation surface (`enableAutomation` /
the `globalThis.gpuix` locator API) so a human click on "Run checks" exercises
the same steps against the production window. Build it only if the test-renderer
path is already green; it is an enhancement, not a prerequisite.

### 3.5 `SplitPane` and the pure resize math

`panels/split.ts` (pure, tested here even though the runtime cannot run):

```ts
export interface ResizeInput { readonly start: number; readonly pointerDelta: number
                               readonly min: number; readonly max: number }
export const nextSize: (input: ResizeInput) => number   // Number.clamp of start + delta
```

`panels/split.tsx` — pointer capture is the whole trick:

```tsx
<div style={{ width: size, flexShrink: 0 }}>{primary}</div>
<div testId={`${id}-divider`} style={{ width: 6, cursor: "col-resize", hover: {...} }}
     onMouseDown={(e) => setDrag({ pointerX: e.x ?? 0, size })}
     onMouseMove={(e) => drag && onResize(nextSize({ start: drag.size,
       pointerDelta: (e.x ?? 0) - drag.pointerX, min, max }))}
     onMouseUp={() => setDrag(null)} />
<div style={{ flexGrow: 1, minWidth: 0 }}>{secondary}</div>
```

`minWidth: 0` on the flexible pane (flex children need it to shrink), and
`onLayout` on the container reports the total so `max = total - divider - min`.
The divider carries `testId` so both a human and a scenario can grab it.

### 3.6 Theme

`theme.ts` holds the playground's own semantic roles (`surface`, `panel`,
`border`, `text`, `muted`, `accent`, `danger`) as flat constants, deliberately
**not** a library and **not** scattered literals inside components. It carries:

```ts
// TODO: replace with @gpuixui/tokens once the tokens workstream lands; this
// file is app-local and is deleted at that point.
```

Do not import `@gpuixui/tokens` before it exists; do not copy token values out
of the components workstream. One task in `TODO.md` tracks the swap.

## 4. Steps

1. Write the plan set (this file, `100`, `110`, `130`). Commit plans alone.
2. Implement `100`; run its tests.
3. Scaffold the app: package.json, tsconfigs, `.gitignore`, README.
4. Implement `theme.ts`, `ui.tsx`, `panels/split.ts(x)` + `split.test.ts`.
5. Implement the eight scenarios of plan `110` §3.3 and the registry.
6. Implement `smoke/host.ts`, `smoke/run.ts`, `main.tsx`, `app.tsx`.
7. `nub run --filter playground check-types` → clean; `nub run --filter
   playground test` → app tests pass (pure ones).
8. `nub run --filter playground smoke` on this host → **exit 2** with the
   unsupported-host evidence; paste the output into the commit and `TODO.md`.
9. `nub run check` at the root → clean.
10. Commit in slices: scaffold → ui/split → scenarios → cli/app → tests.

## 5. Test plan

Pure tests only (this host has no binding); each states the bug it guards and
must be able to fail.

`src/panels/split.test.ts`
1. `nextSize` grows and shrinks by the pointer delta. Fails if the sign flips.
2. `nextSize` clamps to `min` and to `max`, inclusive at both bounds. Fails if
   clamping is missing or exclusive.
3. `nextSize` with a huge negative delta returns `min`, never a negative width.
   Fails if the divider can invert the pane.

`src/smoke/run.test.ts`
4. `formatUnsupported(runtime)` contains platform, arch, the loader message and
   the `bindingHint` text. Fails if the CLI would print an unactionable message.
5. The flag parser treats `--only layout-flex` as `{ only: "layout-flex" }` and
   `--screenshots` as boolean, ignores unknown flags loudly (a message naming
   the flag). Fails if a typo silently runs everything or nothing.
6. `scenarios` registry integrity: ids unique and non-empty; `capability` in the
   union; all eight core capabilities represented. Fails if a scenario is
   added with a missing capability.
7. Given a fake `detectRuntime` that reports unsupported, `runScenarioCli`
   returns exit `2` and writes no report. Fails if the CLI reports success on an
   unsupported host. (`runScenarioCli` must be a separate exported function
   taking its dependencies, so this test does not need the binding — *this is
   the reason the CLI is split into `program` and `runScenarioCli`*.)

Two-direction proof for test 2: temporarily replace `Number.clamp` with a plain
`start + delta` and confirm test 2 fails; restore. Record it in the commit.

## 6. STOP conditions

- **If `tsc` cannot emit this app with `jsxImportSource: "@gpuix/react"`** (TS
  7 compatibility), stop and report; do not switch to `React.createElement`
  hand-writes without approval.
- **If the app cannot start on this host for a reason other than the missing
  binding**, stop and report the error; do not add a fallback window.
- **If `nub run --filter @gpuixui/testing build` does not work from the app's
  directory**, stop and report; do not duplicate the harness source into the app.
- **Never** import `@gpuix/react/testing` or `render` statically in
  `smoke/run.ts` or anything it imports; that breaks the preflight (§2).
- **Never** add a component import from a `@gpuixui/*` package that does not
  exist yet; the playground consumes GPUix primitives until those land.
- Do not add `bun` as a dependency. Node 24.18.0 is the runtime.

## 7. Acceptance criteria

- `apps/playground` has the files in §3.1; `nub run --filter playground
  check-types` and `test` pass; root `nub run check` passes.
- `nub run --filter playground smoke` exits `2` on this host with the §2.1
  evidence and no report file (assert with `echo $?`).
- `nub run --filter playground dev` fails with the actionable preflight
  message on this host, not a stack trace. (The `dev` script itself is
  `node --watch dist/main.js`; `main.tsx` must therefore preflight *before*
  `render()` and print the same remedy, then exit 2. Add that to `main.tsx`.)
- The playground shell renders and the scenario list is complete (a human
  reading the code can see one view per capability).
- `apps/playground/README.md` documents run, smoke, evidence paths, exit codes
  and the host blocker.
- On a supported host the same commands produce a green report (deferred
  verification, plan `110` §4.4).

## 8. Handoff

- `130-tier3-4-feasibility-probes.md` adds `table.tsx` and `workspace.tsx` to
  the same registry; the registry integrity test is what forces their
  capability declarations to be correct.
- The docs-site workstream links `apps/playground` (never a browser fake) and
  may cite `.artifacts/smoke-report.json` paths.
- When `@gpuixui/tokens` and `@gpuixui/primitives` land, this app is the first
  consumer to switch to them; the `TODO.md` task tracks it.
