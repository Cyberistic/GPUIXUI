# 715 — Tray title, tray badge and dock badge

| Field | Value |
| ----- | ----- |
| Status | **planned — `set_title` already shipped in zed#15; dock badge and the icon badge recipe remain** |
| Phase | runtime (GPUI fork) + binding |
| Owner | runtime owner |
| Depends on | 702 (icon bytes, tray anchor), zed#15 |
| Source | `references/fc-gpui` `crates/gpui-macos/src/mac/dock.rs:24`, `crates/gpui/src/app.rs:1461`, `crates/gpui/src/platform.rs:439`; `NSStatusItem.button.title`; SNI `XAyatanaLabel` |
| Feeds | a menu-bar app that must show pending work while it has no window; the tray row in `COMPONENTS.md` |

---
## Goal

Let a tray app show a count or a dot without a window, and set the numeric dock
badge when it has a dock icon.

## Why

There is no native **tray** badge on any platform, so "badge on the tray icon"
has to be assembled from what each one actually offers:

| Platform | Real mechanism | Badge? |
| -------- | -------------- | ------ |
| macOS | `NSStatusItem.button.title` (text beside the icon) | text/count, native |
| macOS | `NSApp.dockTile.badgeLabel` | numeric badge, **needs a dock icon** |
| Windows | nothing on the notification-area icon; `ITaskbarList3::SetOverlayIcon` needs an `HWND` + `HICON` + a taskbar button | none on the tray |
| Linux SNI | `XAyatanaLabel` on some hosts (`XAyatanaLabel` is not universal); `IconPixmap` otherwise | text, host-dependent |

fc-gpui carries the only real one: `set_dock_badge(label)` →
`dock.rs:24` `dockTile.setBadgeLabel`. Its `Platform` default (`platform.rs:439`)
is an empty body and neither `gpui_windows` nor `gpui_linux` overrides it, so
their doc comment "taskbar overlay text" is aspirational. Do not copy that.

## Work

1. **`setDockBadge(label: Option<SharedString>)`** — port `dock.rs` as-is; macOS
   only. Document that it needs `ActivationPolicy::Regular`: a pure menu-bar app
   (`Accessory`) has no dock tile to badge, so the call is a visible no-op there.
   Windows/Linux return a typed `unsupported`-style no-op with that reason; do
   not pretend an overlay icon is a badge.
2. **`setTrayTitle(text: Option<SharedString>)`** — **already landed** as
   `TrayHandle::set_title` in zed#15 (`df99375`): macOS sets the status item's
   button title, Windows/Linux are documented no-ops. Do not add a second name.
   The remaining work is Linux: set `XAyatanaLabel` behind a best-effort path
   where the host supports it, and document that most SNI hosts ignore it. Text
   is the honest cross-platform count ("3", "9+"), and it is what menu-bar users
   expect.
3. **`setTrayBadge(count: Option<u32>)`** — the dot/count case, implemented as a
   documented recipe over plan 702's icon bytes: the caller composes the icon and
   passes it; we add no rasterizer. If two shipped apps need it, revisit a Rust
   compositor as its own plan.
4. **Binding** — `setDockBadge`, `setTrayTitle`, `setTrayBadge` on the renderer;
   `@gpuix/react` helpers that take a count and format `9+`; no hook (these are
   commands, not state).
5. **Docs** — `docs/gpuix-capabilities.md` tray row gains the three calls with
   their per-platform truth; `COMPONENTS.md` stops claiming "no tray badge".

## Tests

- Rust: label formatting (`None` clears, `Some("3")` sets, `Some("9+")`
  passes through unchanged, a non-ASCII label survives the `NSString` bridge).
- macOS runtime: set `"3"`, screenshot the menu bar strip containing the status
  item, assert the title renders; clear and assert it is gone; with a `Regular`
  policy set a dock badge and read it back from `NSApp.dockTile.badgeLabel`.
- Windows/Linux: compile-checked no-ops; the call reports `unsupported` rather
  than succeeding silently.

## Acceptance

The tray example shows a count beside the icon, clears it, and (with a dock icon)
sets and clears the dock badge; both are readable in a screenshot.

## STOP

If `setTrayTitle` on macOS and the follow-up's `set_title` disagree on units
(point vs pixel) or duplicate the field, stop and reconcile the two names before
shipping both. If making the dock badge work requires forcing `Regular` policy
on an app that chose `Accessory`, do not force it: document the requirement.
