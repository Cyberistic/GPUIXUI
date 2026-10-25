# 714 — Power, idle and network events

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) |
| Owner | runtime owner |
| Depends on | 702 (a background app is the consumer) |
| Source | `references/fc-gpui` (Apache-2.0) `platform/{mac,linux,windows}/power.rs`, `network.rs`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | a tray app that pauses work on battery, on screen lock, or offline |

---
## Goal

Tell an app when the machine sleeps/wakes, locks, goes on battery, goes idle, or
loses the network.

## Why

The user asked for it; fc-gpui ships these and a background app is exactly the
consumer.

## Work

- Port the narrow set: `onSystemPowerEvent(Suspend|Resume|Lock|Unlock|Ac`,
  `Battery`), `systemIdleTime()`, `onNetworkStatusChange(status)`,
  `startPowerSaveBlocker(kind)` / `stop`.
- macOS: `NSWorkspace` notifications + `IOPM`; Windows: `WM_POWERBROADCAST` +
  `SystemEvents`; Linux: logind D-Bus + NetworkManager.
- Bind events through the existing `tick()` pump; no new JS thread.
- Document what each platform cannot report (measured, not assumed).

## Tests

- Pure: the event enum mapping and the idle-time conversion.
- macOS runtime: sleep/wake and network off/on observed from the example, printed.

## Acceptance

The example prints suspend/resume and network changes, and a power-save blocker
keeps the display awake while active.

## STOP

If a backend needs a privileged entitlement (e.g. IOPM on a sandboxed app),
document it and leave that event unsupported rather than shipping a workaround.
