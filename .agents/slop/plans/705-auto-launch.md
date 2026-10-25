# 705 — Auto-launch at login

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | binding (`remorses/gpuix`) |
| Owner | runtime owner |
| Depends on | 704 (the launched instance must be the only one) |
| Source | `references/fc-gpui` (Apache-2.0) `platform/linux/auto_launch.rs` (61), macOS `SMAppService`/LaunchAgent, Windows `Run` key; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | tray/daemon apps; `MISSING` in our docs |

---
## Goal

Let an app register itself to start at login, and report the current state.

## Why

A tray app that forgets to start is a tray app the user uninstalls.

## Work

- macOS: `SMAppService.mainApp.register()` (13+) with a LaunchAgent fallback for
  older systems; `is_enabled` reads the same service.
- Linux: write/remove an XDG autostart `.desktop` entry.
- Windows: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` value.
- API: `setAutoLaunch(enabled)`, `isAutoLaunchEnabled()`, both idempotent and
  returning a typed error when the OS refuses.
- The app must be packaged for macOS to register itself — document that a dev run
  returns the service error verbatim.

## Tests

- Rust: enable → `is_enabled` true → disable → false, on macOS and (compile-checked)
  Windows/Linux; the Linux test writes into a temp `XDG_CONFIG_HOME`.
- Binding: the error path is surfaced as a rejection with the OS message.

## Acceptance

The example registers on this Mac and appears in Login Items; a second run toggles
it off.

## STOP

If `SMAppService` needs signing/entitlements this environment cannot produce,
report the exact requirement instead of writing a LaunchAgent workaround.
