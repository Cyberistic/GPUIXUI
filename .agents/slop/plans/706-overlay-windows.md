# 706 — Overlay and pop-up windows (the honest second window)

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) + binding |
| Owner | runtime owner; reviewed by the components workstream |
| Depends on | 702 (tray anchor), 700 (a11y for the popover) |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/platform.rs:2000`, `window.rs` (`show_window`/`hide_window`), `platform/window_positioner.rs` (161); upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | the `second window` gap; tray-anchored panels; command palette as a floating surface |

---
## Goal

A second **surface** inside the one renderer: overlay, pop-up and floating windows
with show/hide, click-through and anchoring — without a second `GpuixRenderer`.

## Why

`COMPONENTS.md` records "a detached tab is a second process" because a second
renderer is refused. fc-gpui shows the useful half: window kinds on the one app,
positioned by a pure anchor function. That fits our single-renderer bridge.

## Work

- Port `WindowKind::{Overlay, PopUp, Floating}`, `Window::show_window/hide_window`,
  `WindowOptions.show/focus`, `set_mouse_passthrough`, `resize_anchored` and
  `platform/window_positioner.rs` (`compute_window_bounds`).
- Binding: `openOverlay({ kind, anchor, size, clickThrough })` returning an id;
  `showWindow`/`hideWindow`/`closeWindow`; events through `tick()`.
- React: an `Overlay` component that renders children into the overlay surface;
  the command palette and tray panel compose it.
- Keep the existing Dialog/Popover untouched until the new surface is measured.

## Tests

- Pure: `compute_window_bounds` for tray-anchored, centered and clamped cases
  (off-screen, screen edge, multi-monitor).
- Runtime macOS: a tray-anchored overlay opens under the item, hides on Escape,
  and a click-through flag lets a press through to the app below.

## Acceptance

A demo opens a floating panel from the tray without a second renderer; the bounds
tests pass on all pure cases.

## STOP

If a window kind needs renderer work (its own Metal layer) rather than an app-level
surface, report which kind and stop; ship only the kinds that are surfaces.
