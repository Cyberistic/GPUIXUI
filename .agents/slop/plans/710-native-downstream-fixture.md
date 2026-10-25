# 710 — Downstream compile fixture against the GPUI pin

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | tooling (CI) |
| Owner | runtime owner |
| Depends on | none |
| Source | `references/fc-gpui` (Apache-2.0) `remorses/gpuix` (a new `tests/downstream-*` crate); upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | catching GPUI pin drift before a release; every runtime plan |

---
## Goal

A tiny crate that compiles against `@gpuix/native`'s Rust crate and the pinned
`zed` GPUI, in CI, so a pin bump or a re-export change fails by name.

## Why

fc-gpui's `tests/downstream-*` fixtures catch "renamed dependency key" drift that
a workspace build hides. We have the same risk every time the submodule moves.

## Work

- Add `tests/downstream-gpui/Cargo.toml` depending on `gpuix-native` by path and
  `gpui` through it, with one file that imports the public custom-element surface
  (plan 110) and `gpui`.
- A CI job (or `nub run check:downstream`) that builds it on each OS.
- Failure messages must name the missing symbol.

## Tests

The fixture is the test: deleting a re-export fails the job; restoring it passes.
Prove both directions in the PR.

## Acceptance

`nub run check:downstream` passes locally and is wired into `check`.

## STOP

If CI cannot build the native crate without the Metal toolchain, document the
prerequisite in the workflow and keep the job macOS-only.
