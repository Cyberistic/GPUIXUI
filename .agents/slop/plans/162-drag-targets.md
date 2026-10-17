# 162 — Plan: cross-element drag targets and file drops

| Field | Value |
| ----- | ------- |
| Status | planned (measured facts land in §8) |
| Phase | B (feasibility) → feeds Tier 4 tab dragging / docking, Tier 5 drag and drop, file upload |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `159` (adds the last pointer input) |
| Feeds | `@gpuixui/components` (drag and drop, detachable tabs), `@gpuixui/docking` (tab move between panes), file upload |

## 1. Goal

The library's drag interactions are built on GPUI pointer capture, which
`panel-resize` and `workspace-tab-drag` already use: the element that received
`onMouseDown` keeps receiving `onMouseMove` while the button is held. Nobody has
measured what happens **across elements**:

- where does `onMouseUp` fire when the gesture ends over a different element —
  the captured source, or the element under the pointer?
- does the element under the pointer receive `onMouseEnter`/`onMouseLeave`
  **during** a captured drag, or is hover frozen until the gesture ends?
- does the source's `onMouseLeave` fire when the pointer leaves it mid-drag?
- does `nativeSimulateFileDrop` reach `onFileDrop` with the paths and the drop
  point, and does an element without a handler stay silent?

These decide whether a tab-drag or a drag-and-drop component can use hover to
pick a drop target, or must hit-test from pointer coordinates itself. A failed
verdict is a real outcome: the component then does its own geometry.

## 2. What is documented, and what the source says

- `onMouseDown`/`onMouseMove`/`onMouseUp`/`onMouseEnter`/`onMouseLeave` and
  `onFileDrop` are in the typed props. `onFileDrop` receives `paths` (absolute
  Unicode paths) and `x`/`y` from the drop point.
- `TestRenderer.nativeSimulateMouseDown/Move/Up` hit-test through GPUI;
  `nativeSimulateMouseMove(x, y, pressedButton)` carries the pressed button, and
  the existing `SmokeHost.drag` helper already performs down → N moves → up.
- `nativeSimulateFileDrop(x, y, paths)` exists. GPUI's drop target is the
  hovered element that declares `onDrop`; the README says `<virtual-list>` does
  not take the event, and lists the elements that do.
- The split-pane/table/tab code already relies on capture for moves. What is
  unmeasured is the **end** of the gesture and the **hover edges** of the other
  element, so those are exactly what this probe logs.

## 3. Scenario `drag-targets` (capability `drag`)

New view `apps/playground/src/scenarios/drag-targets.tsx`. Three 100 × 100 boxes
in one row with a 60 px gap: `drag-a` (source, handlers on all five mouse
events), `drag-b` (target, handlers on all five plus `onFileDrop`),
`drag-c` (a plain box with `onFileDrop` deliberately absent). Every handler
appends one entry to a React state log; a `drag-log` readout joins the entries
with `>`. A `drag-drops` readout holds `path@x,y` for each drop.

The drag is `host.drag("drag-a", 170, 0)` — A's centre to B's centre (A centre is
50 px in, B centre is 100 + 60 + 50 = 210 px in, so +170). Eight steps, so the
pointer leaves A on the third move and is over B by the seventh.

Steps (assertions in this order; measurements replace hypotheses in §8):

1. the log starts `A:down`, so hit-testing reached the source on press;
2. **moves** — `A:move` appears, `B:move` does not: capture keeps the gesture on
   the source;
3. **up** — exactly one of `A:up` / `B:up` appears; assert which one the
   measurement showed (the component design depends on it);
4. **hover edges** — assert the measured truth for `B:enter`/`B:leave` and
   `A:leave` during the drag. If hover follows the pointer during capture, a
   drop target can be hover-driven; if it is frozen, it cannot, and the finding
   is recorded in `COMPONENTS.md`;
5. **drop** — `host.fileDrop("drag-b", [\"/tmp/report.png\", \"/tmp/data.csv\"])`
   appends a `B:drop` entry carrying both paths and a non-negative `x`/`y`; A
   receives none;
6. **no handler, no event** — `host.fileDrop("drag-c", [\"/tmp/ignored.png\"])`
   changes neither readout: an element must declare `onFileDrop` to be a
   target;
7. **not stuck** — after the drag and drops, `host.click("drag-b")` fires
   `B:click` and `host.hover("drag-a")` delivers `A:enter`, so the gesture left
   no capture or hover state behind.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/162-drag-targets.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `162` |
| `packages/testing/src/smoke.ts` | `CAPABILITIES` gains `drag`; `SmokeHost` gains `fileDrop: (testId: string, paths: ReadonlyArray<string>) => void` |
| `packages/testing/src/test-support.ts` | `nullHost.fileDrop` is a no-op |
| `apps/playground/src/smoke/host.ts` | `fileDrop` maps the `testId` to a centre and calls `renderer.nativeSimulateFileDrop(x, y, paths)` |
| `apps/playground/src/scenarios/drag-targets.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | register it; add `drag` to `PROBE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | the registry test expects `drag` |
| `apps/playground/README.md` | a "Cross-element drag and file drops" section; suite count 27 → 28 |
| `COMPONENTS.md` | capability row; Drag and drop / Detachable tabs / File upload notes cite the measurement |
| `TODO.md` | the pending probe task is ticked with its result; suite count updated |

## 5. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only drag-targets` → `1/1`, exit
   `0`, `drag=verified`.
5. `nub apps/playground/dist/smoke/run.js` → **28/28**, exit `0`.
6. `nub run check`, `nub run lint`, `nub run test` → all exit `0`.

## 6. STOP conditions

- **STOP** if `nativeSimulateFileDrop` cannot find a target (no `B:drop`), and
  record whether it needs prior hover or a different coordinate. Do not fake the
  event by calling the React handler.
- **STOP** if the drag log is non-deterministic between runs (a hover or up
  entry that sometimes appears). Record the two runs; a component cannot build
  on a flaky signal.
- **STOP** if capture is not armed for the left button in the test renderer,
  i.e. `B:move` also appears. Record it; the component must then hit-test from
  coordinates.
- **DO NOT** change `SmokeHost.drag`'s gesture shape to make a check pass; it is
  the shape `panel-resize` and `workspace-tab-drag` already depend on.

## 7. Test plan (two directions)

- The scenario fails if capture stops (a `B:move` appears), if the up target
  changes, if the drop loses its paths or coordinates, if `drag-c` starts
  receiving a drop it never declared, or if the gesture leaves hover/capture
  stuck (step 7).
- Two-direction proof, recorded in §8:
  1. give `drag-b` an `onMouseMove` that logs, and confirm the assertion that
     `B` receives no moves fails with the log it measured. Restore.
  2. remove `onFileDrop` from `drag-b` and confirm the drop check fails with an
     empty drop readout. Restore.

## 8. Measured facts

_To be filled by the implementation run. Record: the exact full log; which
element received the up; whether hover edges fired during capture; the drop
payload and coordinates; the behaviour of an element with no handler; the
after-gesture click/hover; the two-direction outputs._
