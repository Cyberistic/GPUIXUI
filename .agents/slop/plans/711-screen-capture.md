# 711 — Screen capture

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) + binding |
| Owner | runtime owner |
| Depends on | none |
| Source | `references/fc-gpui` (Apache-2.0) `platform/scap_screen_capture.rs` (fc-gpui), `crates/gpui-macos/src/mac/screen_capture.rs`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | screenshots from an app; the runtime has no canvas, so capture is the other way to pixels |

---
## Goal

Capture a screen or window to pixels from inside the app.

## Why

The user asked for it; fc-gpui ships a working implementation (ScreenCaptureKit on
macOS).

## Work

- Port the capture API with a narrow surface: `captureScreen(displayId?)` and
  `captureWindow(windowId)` returning raw RGBA + size, asynchronously.
- macOS: ScreenCaptureKit (needs the Screen Recording permission; document the
  prompt and the denial path).
- Windows: Windows.Graphics.Capture; Linux: XDG portal `Screenshot`. Ship macOS
  first and return a typed "unsupported" elsewhere.
- Binding: `captureScreen` on the renderer; React: a helper returning
  `{ width, height, bytes }`.
- Do **not** wire it into the `<img>` pipeline until plan 706's surfaces exist.

## Tests

- Pure: the RGBA length matches `width × height × 4`; a denied permission returns a
  typed error, not a panic.
- Runtime macOS: capture the app's own window and assert the known background
  colour at a pixel.

## Acceptance

The example captures its own window and writes a PNG; the permission-denied path
reports the OS message.

## STOP

If ScreenCaptureKit requires a signed entitlement this environment cannot produce,
report the requirement and leave the code behind a feature gate.
