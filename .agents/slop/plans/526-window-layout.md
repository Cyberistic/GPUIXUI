# 526 — The window as the layout root: `useWindowSize`, a real resize and the overlay that follows it

| Field | Value |
| ----- | ----- |
| Status | landed — `window-layout` 27 checks + `live-window` 29; suite `98 → 99` (3428 → 3455 checks), `window=verified`, exit `0`; five mutation proofs (§6/§8) |
| Phase | B→F (layout contract / Tier 4 desktop shell) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100` (harness), `110`/`120` (suite + shell), `140` (0.10.0 runs here), `182` (keyed remount), `197` (the live host reads the renderer it owns), `350` (app chrome) |
| Answers | the last unmeasured layout boundary: every desktop workspace sits on the *window*, and no probe has measured the size the runtime reports or whether a resize reaches React |

## 1. Question

`@gpuix/react` exports `useWindowSize` / `useWindowInsets`, and the playground
already uses the first for every window-sized veil (`dialog`, `modal`,
`command-palette`, `toast`, …). But the suite has never measured the contract
those components rest on:

1. What size does the hook report — the runner's configured window, or a
   default?
2. Does a **real** window resize reach React, or is the hook a mount-time read?
3. Does a layout derived from it reflow, and does an absolutely positioned
   window-sized overlay track the new size?
4. What do the insets report on a desktop window?
5. Is a window-level breakpoint the only responsive route, or is there a
   container query?

Reconnaissance on this host (0.10.0, this plan's scratch scripts, deleted):

```
headless  useWindowSize() → 1280x800   (createTestRoot's size), renders 1 → 1
                                     after advanceTime(500)
live open useWindowSize() → 1100x720   (the runner's WINDOW), renders 2
live zoom zoomWindow()    → 1680x923   renders 3   (observer fired)
live back zoomWindow()    → 1100x720   renders 4
fullscreen  toggleFullscreen() → 1680x1050 → 1100x720 (not used by this probe)
insets       safeArea/ime/effective all 0,0,0,0 (open and fullscreen)
frame stats  getDebugFrameOverlayStats() → {frames, samples, currentMs,
             p90Ms, p99Ms, maxMs} (works live; not asserted here)
window drag  no drag/move-window method exists in the 0.10.0 renderer types
```

So: the hook is the window, headless it reports the offscreen size, live it
observes a real zoom and restore, and the desktop insets are zero. A custom
title bar can paint under the traffic lights (`titlebarTransparent`,
`trafficLightX/Y`) but **cannot move the window** — there is no drag API.

Why this is load-bearing:

- `Dialog`/`AlertDialog` size their veil from `useWindowSize()`. If the hook
  were stale after a resize, the veil would cover the old window and a press
  outside the dialog would miss.
- A workspace shell's breakpoints (a collapsed sidebar, a folded toolbar) can
  only come from this hook: 0.10.0 has no container query and no `onLayout`
  (`collapsible-height`, plan `186`), so a pane's own width is a
  `getElementBounds` read, not a React value.
- "An interaction is not complete until it is tested in the actual native
  runtime" (AGENTS §4). The veil/breakpoint interaction has only ever been
  exercised at one fixed size.

## 2. Source evidence (confirm in the run, do not assume)

- `@gpuix/react` `dist/hooks/use-window-size.js`: `useState(() =>
  readWindowSize(renderer))`, then `observeWindowSize(renderer, setSize, {
  intervalMs: 100 })`.
- `@gpuix/native` `dist/host-runtime.js`: `readWindowSize` calls
  `renderer.getWindowSize()` and falls back to `DEFAULT_WINDOW_SIZE`;
  `observe` only calls back when the value changes (`sameWindowSize`), which is
  why the headless run does not churn.
- `@gpuix/native/dist/testing.d.ts`: `TestRenderer.getWindowSize()` — "The
  offscreen window size, so `useWindowSize()` works under test."
- `@gpuix/native/index.d.ts`: `GpuixRenderer.getWindowSize`,
  `getWindowInsets`, `zoomWindow`, `toggleFullscreen`, `minimizeWindow`,
  `activateWindow`, `setWindowTitle`; no window-drag/`startWindowDrag` symbol.
- `apps/playground/src/smoke/run.ts` → `createTestRoot({ width: 1280, height:
  800 })`; `apps/playground/src/live/run.ts` → `WINDOW = { width: 1100, height:
  720 }` (exported from `live/scenarios.tsx`).

**STOP** and amend this plan if the run contradicts any of these (§7).

## 3. Design

One new capability `window`, one pure layout model with unit tests, one
headless scenario, one live twin, and two host verbs (`windowSize` on both
hosts, `zoomWindow` on the async host). The view is exported once and reused by
the live twin.

### 3.1 `apps/playground/src/scenarios/window-layout-model.ts` (new)

```ts
/** The window-driven layout rule. 0.10.0 has no container query: the window is the only breakpoint source. */
export const WIDE_MIN = 1200;
export const SIDEBAR_WIDTH = 240;
export const TOOLBAR_HEIGHT = 36;

export interface WindowSize {
  readonly width: number;
  readonly height: number;
}
export type WindowMode = "wide" | "compact";
export interface WindowLayout {
  readonly mode: WindowMode;
  readonly sidebar: number; // 0 when compact
  readonly actions: number;
}

export const layoutFor = (size: WindowSize): WindowLayout;
```

`layoutFor`: `mode = width >= WIDE_MIN ? "wide" : "compact"`; `sidebar =
mode === "wide" ? SIDEBAR_WIDTH : 0`; `actions = mode === "wide" ? 6 : 3`.
Clamp a non-positive width to `compact` (a zero-sized window is not "wide").

### 3.2 `apps/playground/src/scenarios/window-layout-model.test.ts` (new)

Pure tests (vitest, co-located): the boundary pair `1199 → compact` /
`1200 → wide`; `sidebar` `0` vs `240`; `actions` `3` vs `6`; a `0 × 0` size is
compact; the mode is width-only (a tall narrow and a short wide window answer
differently); a negative width is compact. Each assertion compares a derived
value, so `check-tests` accepts it.

### 3.3 `apps/playground/src/scenarios/window-layout.tsx` (new)

Export `WindowLayoutProbe` and `windowLayoutScenario` (id `window-layout`,
capability `window`).

The view reads the window **once** and derives everything from it:

```tsx
const size = useWindowSize();
const insets = useWindowInsets();
const layout = layoutFor(size);
```

Tree (one root — plan `522`):

- `wl-frame` — `{ width: size.width, height: size.height, position: "relative",
  display: "flex", flexDirection: "column" }`;
- `wl-veil` — first child, `position: "absolute"`, `top: 0`, `left: 0`,
  `width: size.width`, `height: size.height`, a muted token surface: the
  window-sized overlay a dialog would use;
- `wl-toolbar` — `height: TOOLBAR_HEIGHT`, `flexShrink: 0`, a row of
  `<text>`s: `wl-size` = `${width}x${height}`, `wl-mode` = `mode=${mode}`,
  `wl-insets` = `safe=${safeArea.top},${right},${bottom},${left} ime=${...}`,
  `wl-actions` = `actions=${actions}`;
- body row `{ flexGrow: 1, display: "flex", flexDirection: "row" }`:
  - `wl-sidebar` only when `layout.sidebar > 0`, width `layout.sidebar`, text
    `sidebar`;
  - `wl-main` `{ flexGrow: 1 }`, text `main`.

Colours come from `useTheme()` (`background` for the frame, `muted` for the
veil and sidebar); no literals.

### 3.4 Assertions — `window-layout` (headless)

| # | Label | Assertion |
| - | ----- | --------- |
| 1 | the hook reports the runner's window | `wl-size` = `1280x800` |
| 2 | the breakpoint is derived from it | `wl-mode` = `mode=wide` |
| 3 | the desktop insets are zero | `wl-insets` = `safe=0,0,0,0 ime=0,0,0,0` |
| 4 | the frame fills the window | `wl-frame` = `(0, 0, 1280, 800)` ± 1 |
| 5 | the window-sized veil matches it | `wl-veil` = `(0, 0, 1280, 800)` ± 1 |
| 6 | the toolbar is the declared height | `wl-toolbar` height = 36 ± 1 |
| 7 | the wide layout exposes six actions | `wl-actions` = `actions=6` |
| 8 | the sidebar paints only in the wide layout | `wl-sidebar` bounds is `Some` |
| 9 | the sidebar is the declared width | width = 240 ± 1 |
| 10 | the sidebar starts below the toolbar | `sidebar.y` = `toolbar.y + toolbar.height` ± 1 |
| 11 | the sidebar ends at the window's bottom | `sidebar.y + sidebar.height` = 800 ± 1 |
| 12 | the poll re-reads without changing the layout | after `advance(600)`, `wl-size` is still `1280x800` and `wl-mode` still `mode=wide` |

Check 12 is not a churn claim (the recon measured one render, because
`observe` compares); it asserts the observer's re-read neither blanks nor
duplicates the value.

### 3.5 Host verbs

`packages/testing/src/smoke.ts`:

- `CAPABILITIES`: add `"window"`.
- `SmokeHost`: `readonly windowSize: () => WindowSize;` where
  `class WindowSize extends Schema.Class<WindowSize>("WindowSize")({ width:
  Schema.Number, height: Schema.Number }) {}` (beside `Bounds`; a class because
  the live host constructs it at the boundary).
- `AsyncSmokeHost`: the same as an `Effect`, plus
  `readonly zoomWindow: () => Effect.Effect<void, SmokeHostError>;` documented
  as "the platform zoom/maximize; a second call restores, measured".

`packages/testing/src/native.ts`: add `getWindowSize(): { width: number;
height: number }` to `NativeRenderer` and implement `windowSize` in
`createHost` (`renderer.getWindowSize()`).

`packages/testing/src/test-support.ts`: `nullHost.windowSize = () => ({ width:
0, height: 0 })`, `nullAsyncHost.windowSize = () => Effect.succeed({ width: 0,
height: 0 })`, `nullAsyncHost.zoomWindow = () => Effect.void`.

`packages/testing/src/native.test.ts`: `FakeRenderer` gains
`getWindowSize = () => ({ width: 400, height: 300 })` (its root's size); add one
assertion that `createHost(...).windowSize()` reports the renderer's value, so
the adapter rule is proven without a window.

`apps/playground/src/live/host.ts`: add `"getWindowSize" | "zoomWindow"` to the
`Pick<>`; implement `windowSize` with `Effect.try` and `zoomWindow` with
`Effect.try` (naming the verb on failure).

### 3.6 Live twin — `live-window` (in `apps/playground/src/live/scenarios.tsx`)

`view: windowLayoutScenario.view`, `ready: "wl-size"`.

1. `wl-size` = `1100x720`; `host.windowSize()` = `{ 1100, 720 }`; both agree.
2. `wl-mode` = `mode=compact`; `wl-sidebar` bounds is `null`.
3. `wl-veil` = `(0, 0, 1100, 720)` ± 1.
4. `wl-insets` is the zero line.
5. `host.zoomWindow()`; wait (bounded, 3 s) until `wl-size` differs from the
   open text.
6. the new `wl-size` equals `host.windowSize()`; its width is greater than
   `1100`.
7. `wl-mode` = `mode=wide`; `wl-sidebar` paints 240 wide.
8. the sidebar's height is `newHeight − 36` ± 1.
9. `wl-veil` equals the **new** window size at `(0, 0)` — the overlay followed
   the resize, which is the whole point.
10. restore with a second `zoomWindow()`; wait for `wl-size` to be `1100x720`
    again; `wl-mode` = `mode=compact`; `wl-sidebar` is `null`.
11. screenshot.

The steps hold a `Ref<boolean>` "zoomed": it is set after the first zoom and
cleared after the restore, and `Effect.ensuring` calls `zoomWindow` again only
when it is still true, so a failed assertion cannot leave the window maximised
for the next scenario. Never minimise or go fullscreen: measured to work, but
they leave the session in a state the rest of the suite does not expect.

### 3.7 Registry

`apps/playground/src/scenarios/index.ts`: import both scenarios; add `"window"`
to `PROBE_CAPABILITIES`; put `windowLayoutScenario` first (it is the base every
other view sits on). `scenarioProblems` then covers the capability mapping.
Because the shell mounts the **first** registry entry, `shell-selection`'s
"the stage starts on the first scenario" lookup moves from `layout-flex` to
`window-layout` — one line in `scenarios/shell.tsx`, not an assertion change.

## 4. Documentation

- `COMPONENTS.md`: capability row `| window | window-layout, live-window | verified |`; a prose paragraph after the `root` paragraph with the measured numbers (sizes, zoom/restore, zero insets, no window-drag API) and the consequence for a custom title bar; add one sentence to the `Workspace layouts` row that the window is the layout root and the hook observes a real zoom.
- `apps/playground/README.md`: a "Window layout" subsection with the two ids and the two facts a consumer must know (the hook is the window; a resize needs the poll, there is no event; insets are zero on desktop; no title-bar drag).
- `.agents/slop/plans/README.md`: index this plan; update the number note ("the next playground plan takes `527`").
- `TODO.md`: tick the new task under the playground section; add a cross-team row for `docs-site` (its `capabilities.test.ts` requires the `window` capability and both ids) — do not edit `apps/docs`.

## 5. Commands and expected results

From the repository root:

```sh
nub run --filter playground build
# expect: exit 0 (testing build + vendor + tsc)

nub run --filter playground test
# expect: exit 0; the new model tests pass (and the existing scenarioProblems test)

nub apps/playground/dist/smoke/run.js --only window-layout
# expect: 1/1 scenario, 12/12 checks, exit 0, window = verified

nub apps/playground/dist/live/run.js --list
# expect: live-window listed, no window opened, exit 0

nub apps/playground/dist/live/run.js --only live-window
# expect: 1/1 live scenario, 11/11 checks, exit 0, one screenshot,
#         window = verified; the window is back at 1100x720 afterwards
```

The headless CLI takes one `--only`; the live CLI's is repeatable. Then the
gates:

```sh
nub run check
nub run lint
nub run test
```

And because this change is cross-cutting (capability model + both host
interfaces + registry + live suite), the **full headless** suite once:

```sh
nub apps/playground/dist/smoke/run.js
# expect: 97 → 98 scenarios, exit 0; record the new check total
```

The full live suite is a **merge/release gate**, not an iteration step: it is
not run here, and no live total is claimed. Record the exact ids that ran.

## 6. Mutation proofs (the two-direction requirement)

Apply, run the focused suite, record the observed failure here, revert.

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | `SIDEBAR_WIDTH` 240 → 200 (or a literal 200 in the view) | `window-layout`: "the sidebar is the declared width" — expected 240 ± 1, got 200 |
| M2 | `WIDE_MIN` 1200 → 1400 | `window-layout`: "the breakpoint is derived from the window" — `expected "mode=wide", got "mode=compact"` |
| M3 | sidebar height from `size.height` instead of the body's flex | `window-layout`: "the sidebar ends at the window's bottom" — the bottom lands one toolbar below the window |
| M4 | size the veil from a constant `1100 × 720` instead of the hook | headless still passes; `live-window` fails at "the veil tracks the zoomed window" (expected the new size, got 1100×720) — the reason the live twin exists |
| M5 | make `zoomWindow` a no-op in `live/host.ts` | `live-window`: the bounded wait expires and "the zoomed window is wider than the open one" fails with `1100`; the `ensuring` restore is a no-op too, so the next scenario is unaffected |

M4 and M5 are the pair that proves the live scenario is not decoration.

## 7. STOP conditions

Stop and report; do not improvise:

- Headless `wl-size` is not `1280x800` (the runner's fixture changed). Record
  the measured value and amend §3.4/§3.6 rather than widening to a range.
- `zoomWindow()` does not change the window within 3 s, or does not restore it
  exactly. Record the measured sizes. The authorised fallback is to keep
  `live-window` checks 1–4 and 10 (open size, compact layout, zero insets,
  restored size) and record the resize as unobservable on this host — **not**
  to leave a check that cannot fail.
- Insets are not zero. Assert the measured values and record the platform fact;
  do not force zeros.
- A mutation in §6 passes. The check does not measure what it claims; fix the
  check before continuing.
- The live run exits `2` (no window). That is missing evidence: report it and
  leave the live twin unlanded rather than claiming a live verdict.
- Adding `"window"` breaks a test outside this workstream (`apps/docs`). Do not
  edit `apps/docs`; record the exact assertion in `TODO.md`.

## 8. Results

Executed 2026-10-18. Both focused scenarios ran; the full headless suite ran
once (the change touches the capability model, both host interfaces and the
registry). The full live suite is the merge gate and was **not** run; no live
total is claimed.

| Item | Result |
| ---- | ------ |
| `window-layout` | **27/27 checks**, exit `0`, `window=verified`; `1280x800`, `mode=wide`, `safe=0,0,0,0 ime=0,0,0,0`, frame and veil `(0,0,1280,800)`, toolbar `36`, sidebar `240` from `y=36` to `y=800`, six actions, unchanged after `advance(600)` |
| `live-window` | **29/29 checks**, exit `0`, `window=verified`, one screenshot; `1100x720` compact → `zoomWindow()` → `1680x923` wide (sidebar `240`, ending at the window's bottom, veil tracking both axes) → restored `1100x720` compact, no sidebar |
| M1 | `SIDEBAR_WIDTH` 240 → 200 → "the sidebar is the declared width: expected 240 ± 1, got 200", exit `1` |
| M2 | `WIDE_MIN` 1200 → 1400 → "the breakpoint is derived from the window: expected \"mode=wide\", got \"mode=compact\"", exit `1` |
| M3 | sidebar height `size.height` instead of the body's share → "the sidebar ends at the window's bottom: expected 800 ± 1, got 836", exit `1` |
| M4 | freeze the hook's first value (`useState(useWindowSize())`) → headless passes; live fails "the hook observed the resize: expected \"1680x923\", got \"1100x720\"", exit `1` |
| M5 | `zoomWindow` a no-op in `live/host.ts` → live fails "the zoomed window is wider than the open one: expected true, got false", exit `1`; the `ensuring` restore saw no resize and did not toggle |
| full headless | `99/99` scenarios, **3455 checks**, exit `0` (`98 → 99`, `3428 → 3455`) |
| gates | `nub run check` = `0`, `nub run lint` = `0`, `nub run test` = `0`; playground `389` tests (30 files, `+7`), `packages/testing` `54` |

Two measured notes that changed the implementation:

- A row's children are **content-sized**, not stretched: the sidebar first
  painted `26` px tall (`y=36…62`), so the view sizes it from the window
  (`size.height - TOOLBAR_HEIGHT`) — which is also what makes the
  bottom-edge assertion meaningful. `alignItems: "stretch"` did not stretch it.
- The first record of M1 **passed**, because the scenario asserted the painted
  width against the model constant it had just changed. The assertion now uses
  the literal `240` (and `36` for the toolbar), and the model test pins the
  three constants — the D52 lesson ("assert chrome metrics against literals").

The headless check count is 27 rather than the planned 12 because each
`textOf(ctx, id)` records its own "`<id>` is painted" check before the
comparison; that is the suite's existing convention, and it names a missing
readout.
