# 707 — Explicit quit mode (live without windows)

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) |
| Owner | runtime owner |
| Depends on | 702 |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/app.rs:343`, `QuitMode`, macOS `ActivationPolicy`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | tray/daemon apps; the landing's tray story |

---
## Goal

Keep the process alive after the last window closes, until `quit()` is called.

## Why

GPUI quits when the last window closes; a tray app must not.

## Work

- Port `QuitMode::{Automatic, Explicit}` and `App::set_quit_mode`.
- Set the macOS activation policy so no dock icon is required for a menu-bar app.
- Binding: `setQuitMode("explicit")` at startup; `quit()` keeps working.
- Document the interaction with `on_window_close_quit` (the opposite behaviour,
  already upstream).

## Tests

- Runtime macOS: close the only window with explicit mode — the process survives
  and the tray still reports a click; automatic mode exits.
- Rust: policy unit test.

## Acceptance

The tray example survives closing its window and quits from the menu.

## STOP

If the macOS policy needs an Info.plist key the packaging owns, document it and
leave the code behind a flag.
