# 709 — Resource profiles for background apps

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork) |
| Owner | runtime owner |
| Depends on | 707 |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/resource_profile.rs` (483); upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | tray/daemon memory footprint; the performance row |

---
## Goal

Let an app pick a smaller text cache/atlas/arena budget when it is a background
watcher rather than an editor.

## Why

fc-gpui found a tray app paying an editor's memory bill; the profiles are mostly
constants and low risk.

## Work

- Port `AppProfile::{Desktop, Utility, Minimal}` and the sizes they cut.
- Expose `setResourceProfile("desktop" | "utility" | "minimal")` before the first
  frame (a profile chosen later does not shrink what is already allocated —
  document that).
- Measure resident memory for the tray example in each profile on macOS.

## Tests

- Pure: the profile constants are monotone (`minimal <= utility <= desktop`).
- Runtime: launch the example in each profile and report RSS in the PR.

## Acceptance

The tray example runs in `minimal` with a measured, reported footprint.

## STOP

If a profile requires touching the renderer's allocation strategy beyond
constants, report and keep only the constants that are safe.
