# 702 — Tray: separators, click kinds, icon bytes, anchor

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) + binding |
| Owner | runtime owner |
| Depends on | zed#15 merged |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/app.rs:1209-1233`, `platform/mac/tray.rs`, `platform/{windows,linux}/tray.rs`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | the tray row's `partial` support; a tray-anchored popover (plan 706) |

---
## Goal

Finish the tray surface to the shape fc-gpui ships and an app actually needs.

## Why

Our draft (zed#15) has create/menu/tooltip/one event. fc-gpui's model shows the
missing bits matter: separators, distinct left/right/double clicks, an icon passed
as bytes (React can hand a Buffer), and a menu-item anchor so a popover can open
beside the item.

## Work

- Add `TrayMenuItem::Separator` and map it on all three backends.
- Replace `TrayEvent::Click` with `TrayEvent::{Click { button, count }, MenuItem(id)}`
  or an equivalent narrow union; keep the current variant as a deprecated alias
  only if a consumer already uses it.
- Accept `icon: Option<Vec<u8>>` (PNG; macOS converts to `NSImage`, Windows decodes
  to an HICON so `.ico` is no longer required, Linux keeps `IconPixmap`) plus an
  explicit rendering mode for template images.
- Return the item's screen bounds (or `TrayAnchor`) so `WindowPosition::TrayAnchored`
  can place a panel.
- Document the pitfalls fc-gpui measured: a menu can swallow the click, SNI hosts
  may never send `Activate` (always provide a menu), and there are no Wayland
  global hotkeys.

## Tests

- Rust model tests for the new enum and anchor math (`window_positioner`-style pure
  function: open above/below, clamp to the screen).
- macOS runtime: a menu with a separator and both click kinds prints the expected
  event (the zed#15 example, extended).
- Windows/Linux compile checks as in zed#15.

## Acceptance

The tray example shows a separator, reports left vs right click, decodes a PNG
icon on all three platforms (compile-checked on Win/Linux), and a popover can be
anchored to it.

## STOP

If Windows HICON from PNG needs a codec the repo does not already depend on, keep
`.ico` for Windows and report; do not add an image crate to gpui_windows.
