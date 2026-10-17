# What GPUix 0.5.1 measured on this host

Evidence for `.agents/adr/0002-two-gpuix-versions.md`. The library targets
**0.10.0**, which has no `darwin-x64` binding, so this probe exists to answer the
mission's underlying feasibility question — does GPUI on this hardware do
layout, text, input, overlay anchoring, pointer-capture resizing, virtual lists
and scrolling? — with real GPU output rather than prose.

Reproduce with `./run.sh probe` (see `README.md`). Host: Intel i7-8750H,
`darwin-x64`, Node 24.18.0, `@gpuix/react@0.5.1`, `@gpuix/native@0.5.1`,
`react@19.2.0`.

## Offscreen test renderer (`run.sh probe`)

| Check | Measured |
| ----- | -------- |
| Binding loads | `hasNativeTestRenderer = true` |
| Layout bounds | divider `[336,500,8,36]`, pane A `[16,500,320,36]` |
| Text | `getAllText()` returns every `<text>`; `<code>`/`<markdown>` paint via `getPaintedText()` (`const a = 1`, `const b = 2`) |
| Input editing | `fill("hello gpuix")` → `value=hello gpuix`; `press("enter")` → `submits=1`; textarea → `value=line one` |
| Click | `clicks=1` through the React handler |
| Overlay | `<anchored>` painted text `overlay-open` is present on top |
| Click outside | `onMouseDownOutside` → `outside=yes` |
| Escape | `onKeyDown` receives `escape` → `escape=yes` |
| Panel resize | divider drag `+60` → `split=380`, pane A bounds `[16,500,380,36]`; a `-400` drag clamps to `split=80` |
| Virtual list | 500 declared rows, **5 built** (`v-0` … `v-4`) |
| Programmatic scroll | `scrollTo(id, 0, -40)` moves row 0 from y=544 to y=504; `getScrollOffset = [0,-40]` |
| Wheel scroll | **not applied**: `wheel(0,200)` fires `onScroll` (`delta=200`) but leaves row 0 at y=544 and the offset at `[0,0]` |
| Focus events | **never delivered**: click and Tab both leave `focus=none` |
| `canvas` | element type exists; `getElementBounds` is `null` (no paint) |
| Clock, screenshot | `clockPause/FastForward/Resume`; PNG captured |

## Live window

Measured once with `live-app.mjs` + `live-driver.mjs` (a real 1400×1040 Metal
window, screenshots under `.artifacts/`):

- the window opened, painted and screenshotted;
- divider drag worked in the live window too (`split=380`, pane bounds follow);
- `focus=none` after a click, exactly as offscreen;
- `locator.wheel(0,200)` left the scroller at `delta=0`, content unmoved;
- `fill`/`press` failed with `AutomationError: keystrokes are not live yet`.

The live driver is **not** wired into `run.sh`: on 0.5.1 its `dragBy` step never
settles when the window is not interactive, so a headless agent run hangs. Run
it by hand from the throwaway project (see `README.md`) to watch the window.

## What this means

- The primitives the component library depends on **do** work on this hardware
  (layout, text, input, overlays, drag, virtual lists, programmatic scroll).
- Two interactions cannot be verified on 0.5.1 at all: **focus/blur events**
  (so no focus states can be built) and **synthetic wheel scrolling**. That is
  why the library targets 0.10.0, where those APIs exist, and why this probe
  never sets a component status.
- Full verification needs a supported host for 0.10.0: Apple Silicon macOS, x64
  Windows, or x64 Linux (live-app path).
