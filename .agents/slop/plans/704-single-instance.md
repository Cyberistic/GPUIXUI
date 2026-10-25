# 704 — Single-instance lock and activation

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | binding (`remorses/gpuix`) |
| Owner | runtime owner |
| Depends on | 702 (a tray app is the consumer) |
| Source | `references/fc-gpui` (Apache-2.0) `platform/single_instance.rs` (182); upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | a tray/daemon app that must not run twice; `MISSING` in our docs |

---
## Goal

Make a second launch hand its arguments to the running app and exit.

## Why

A tray app launched twice shows two icons and two notification posters. There is
no lock today.

## Work

- Port the unix-socket (macOS/Linux) and named-mutex (Windows) implementation.
- API: `acquireSingleInstance(name) -> "primary" | "secondary"`, plus
  `on_second_instance(cb)` delivering the argv of the launch that lost.
- Binding: `acquireSingleInstance` at startup, before the renderer; a second
  process exits with the documented code.
- Document the scope: per user session, not per machine.

## Tests

- Rust: two processes in a test harness — the second returns `secondary` and the
  first receives its argv.
- Binding: a JS test that constructs two renderers? No — the lock is process-wide;
  test at the Rust level and keep the JS surface behind a startup call.

## Acceptance

Launching the example twice leaves one window/tray and the first process receives
the second's args.

## STOP

If the socket path cannot be made per-user without a platform dir crate, report
the path and ask before adding a dependency.
