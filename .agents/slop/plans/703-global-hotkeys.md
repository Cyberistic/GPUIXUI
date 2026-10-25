# 703 — Global hotkeys

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) + binding |
| Owner | runtime owner |
| Depends on | 700 (focus/keys not required, but the same platform seam) |
| Source | `references/fc-gpui` (Apache-2.0) `platform/mac/global_hotkey.rs` (357), `platform/linux/global_hotkey.rs` (263), `platform/windows/global_hotkey.rs` (125); upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | the `Global / OS shortcut registration` gap in `COMPONENTS.md` |

---
## Goal

Register an OS-wide shortcut that fires while the app is unfocused.

## Why

A tray app (plan 702) that cannot be summoned by a shortcut is half the feature;
`COMPONENTS.md` records the gap as unfiled.

## Work

- Port the per-OS backends with the same `Platform` default/no-op seam the tray
  uses: macOS `RegisterEventHotKey` (Carbon), Windows `RegisterHotKey`,
  Linux `XGrabKey`.
- Public model: `GlobalHotkey { id, keystroke }`, `register_global_hotkey`,
  `unregister_global_hotkey`, `on_global_hotkey(id)`.
- Document the measured limits: no Wayland support, registration fails on a
  conflict, and a shortcut is consumed system-wide.
- Binding: `registerGlobalHotkey(id, keystroke)` / `unregisterGlobalHotkey(id)` on
  the renderer, events through `tick()`.
- `@gpuix/react`: a `useGlobalHotkey`-free API (plain functions, per AGENTS) or a
  `HotkeyProvider` only if it must re-render.

## Tests

- Pure parsing/conflict tests in `gpui`, and a macOS runtime check that a
  registered chord fires while another app is frontmost (manual, documented).
- Binding: registering an invalid keystroke returns a typed error with the parse
  message.

## Acceptance

A registered shortcut fires with the app in the background on macOS; Windows/Linux
compile-checked with their documented limits.

## STOP

If Carbon is deprecated enough that the port needs a new dependency, report and
leave macOS unimplemented rather than shipping a private-API hack.
