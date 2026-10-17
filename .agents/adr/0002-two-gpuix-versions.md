# 0002 — Two GPUix versions: 0.10.0 is the library target, 0.5.1 is the only runnable host

- Status: accepted
- Date: 2026-10-17
- Deciders: playground workstream (swarm)
- Related: `0001-native-smoke-host.md` (superseded in part by this record),
  `.agents/slop/plans/110-native-smoke-test.md`,
  `.agents/slop/plans/120-app-playground.md`

## Context

ADR 0001 established that no **0.10.0** binding exists for this Intel Mac
(`darwin-x64`) and that the smoke suite therefore cannot run here. A second,
deeper probe changed the picture: **0.5.1 was the last release with a
`darwin-x64` binding**, and it runs on this machine for real.

Verified on this exact host (Intel i7-8750H, `darwin-x64`, Node 24.18.0,
`@gpuix/react@0.5.1` + `@gpuix/native@0.5.1`, `react@19.2.0`):

| Probe | Result | Evidence |
| ----- | ------ | -------- |
| Binding loads | yes | `hasNativeTestRenderer === true` |
| Offscreen `TestGpuixRenderer` runs the real GPUI pipeline | yes | painted text, real bounds `[16,16,120,32]`; a click updates React state to `clicks=1` |
| **Live window** opens, paints and screenshots | yes | 1400×1040 RGBA PNGs captured from a real window |
| Layout bounds | yes | parent/child/absolute bounds exact |
| Text | yes | `getAllText`, `getPaintedText`; `<code>`/`<markdown>` paint their own text |
| Input editing | yes | `nativeSimulateKeystrokes` types into `<input>`/`<textarea>`; `onChange`, `onSubmit` fire |
| Overlay | partial | `<anchored>` paints above the tree; `onMouseDownOutside` fires; Escape reaches `onKeyDown`; the anchored node itself reports no painted bounds |
| Panel resize (pointer capture + clamp) | yes | divider drag `320 → 380`; a large negative drag clamps at `80`; pane bounds follow |
| Virtual list | yes | 500 declared rows, **5 built** |
| Programmatic scroll | yes | `scrollTo(id, 0, -40)` moves row 0 from y=118 to y=78; `getScrollOffset` = `[0,-40]` |
| **Wheel scroll** | **no** | `nativeSimulateScrollWheel`, `dispatchScrollWheel` and live `locator.wheel(0,200)` all leave the offset at `[0,0]` and the content unmoved; only the `onScroll` *delta* handler fires |
| **Focus / blur events** | **no** | `onFocus`/`onBlur` never fire — click, Tab, `focusElement(id)`, and live `press("tab")` all leave a `focus=` readout at `none` |
| Live keyboard injection | **no** | `AutomationError: keystrokes are not live yet` |
| `canvas` element | **no** | the element type exists; it has no painted bounds |
| `onLayout` / `onScrollChange` / `getElementsAt` / `getFocusedElementId` / `role`/`aria-*` / `focusVisible` | **absent** | 0.5.1 `StyleDesc`/`Props`/`TestRenderer` declarations |

The raw reports are in `.agents/slop/rd/gpuix-0.5.1-*.txt` and
`.agents/slop/scratch/gpuix-probe/` (both gitignored agent state).

So the choice is genuinely structural:

- **0.5.1** runs here, but never delivers a focus or blur event. A component
  library cannot implement focus rings, keyboard focus state, `:focus-visible`
  behaviour or dialog focus management on top of that. It also lacks
  `onLayout`, `onScrollChange`, `role`/`aria-*`, `focusVisible` and the headless
  `Button`/`Dialog`/`Tooltip` primitives that the component plans need.
- **0.10.0** is the version those APIs come from, and it cannot execute here at
  all.

## Decision

1. **The library and the playground target `@gpuix/react@0.10.0` +
   `@gpuix/native@0.10.0`** (exact pins, same version on both). The component
   API must not be designed around a runtime that cannot report focus.
2. **The smoke suite remains the verification gate, and it exits `2`
   ("unverified") on this host** — ADR 0001's consequence stands for 0.10.0.
   No component may be marked `done` on the strength of a run that did not
   happen.
3. **A separate, clearly-labelled `legacy-probe` runs against 0.5.1 on this
   host.** Its purpose is to answer the mission's *underlying* feasibility
   question with real GPU output on this machine: does GPUI-on-this-hardware
   do layout, text, input, overlay anchoring, pointer-capture resizing, virtual
   lists and programmatic scroll? Its verdicts are labelled
   `verified on GPUix 0.5.1 (legacy host)` and are **never** used to mark a
   0.10 component `done`.
4. **The unverifiable interactions are named, not smoothed over**:
   focus/blur, wheel scrolling, live keyboard injection, `canvas`, and
   everything in 0.5.1's absent-API row above. Each gets a limitation record in
   `COMPONENTS.md` and the docs, with the resolution being a supported host.
5. **The upgrade/verification path stays open and small**: the same suite, run
   on an Apple Silicon Mac, x64 Windows, or x64 Linux host
   (`.agents/slop/plans/110-native-smoke-test.md` §4), is the only thing that
   turns `unverified` into `verified` for 0.10.0.

## Consequences

**Easier**

- The component API is designed against a runtime that has focus, layout
  events, accessibility props and headless primitives.
- The mission's biggest risk is answered with a real window on this hardware,
  in the capabilities that do not need 0.10's event model.
- A future agent does not have to re-derive any of this: the probes are
  reproducible scripts with recorded output.

**Harder**

- Per-component native verification still cannot happen here, so Phase B's exit
  condition ("at least one component running in GPUix") is met only in the
  legacy probe, not for the shipped components. This must be visible in
  `TODO.md` and `COMPONENTS.md`.
- The playground cannot render components on this host; `dev` exits `2` with
  the evidence. A human can still run the legacy probe to see a real window.

**Rejected alternatives**

- *Target 0.5.1 to keep everything runnable*: rejected — no focus events means a
  component library with fake focus states, which `MISSION.md` explicitly
  forbids.
- *Target both versions behind an adapter*: rejected — two divergent prop
  surfaces (`onLayout`, `focusVisible`, `aria-*` vs not) would infect every
  component with conditionals for one host's sake.
- *Use the shipped wasm renderer as native evidence*: rejected — a browser
  canvas is not the native runtime (see ADR/decision D8 in `PLAN.md`).
