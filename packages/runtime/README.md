# `@gpuixui/runtime`

The pinned GPUix runtime's capability matrix, typed refusals, and
runtime-detected helpers. Dependency-light on purpose: `effect` (the typed
error) and `@gpuix/react` (the runtime surface it describes).

```ts
import { capabilities, isTerminal, unsupportedFeature } from "@gpuixui/runtime";

if (capabilities.transform.supported === false) {
  // capabilities.transform.reason, capabilities.transform.workaround
}

const refusal = unsupportedFeature("gridSpan");
// UnsupportedRuntimeFeature { feature: "gridSpan", reason, workaround }

if (isTerminal()) {
  // No titlebar: drop the macOS traffic-light space.
}
```

## Capabilities

`capabilities` has one literal-typed entry per capability the runtime provides
or does not. A `supported: false` entry carries the honest `reason` and
`workaround`; a `supported: true` entry needs neither.

| Capability | 0.11.0 |
| ---------- | ------ |
| `transform` | **no** — `StyleDesc` has no `transform`; animate with `@gpuixui/motion` |
| `gridSpan` | **no** — only `gridColumnMin`/`gridRowMin` and integer track counts |
| `canvas` | **no** — a blank host element, no 2D-context/draw props |
| `imeComposition` | **no** — no composition events |
| `globalShortcut` | **no** — key events fire only while the window is focused |
| `tray` | **no** — no tray/menu-bar/status-item host |
| `nativeView` | **no** — no webview/native child-view host |
| `terminal` | **yes** — `render(<App />, { terminal: true })`, `isTerminal()` |
| `headlessDialog` | **yes** — `@gpuix/react/dialog` with a one-per-window Escape layer |
| `tabNavigation` | **yes** — Tab/Shift+Tab move focus by default |

## The guards keep the matrix honest

`src/guards.ts` is a compile-time suite of `@ts-expect-error` assertions that
each fail the build the moment the runtime adds a key this matrix claims is
absent (`transform`, `gridColumn`, `gridRow` on `StyleDesc`, or a `CanvasProps`
draw surface). A `false` row cannot go stale silently: TypeScript fails with
TS2578 first.

## `isTerminal()`

Re-exported from `@gpuix/react`. `false` until `init()` runs, so read it while
rendering, not at module scope.
