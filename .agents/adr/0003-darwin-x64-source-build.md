# 0003 — The `darwin-x64` binding is built from source with runtime shaders

- Status: accepted (resolves blocker **B1**; amends `0001-native-smoke-host.md`)
- Date: 2026-10-17
- Deciders: playground workstream (swarm)
- Related: `0001-native-smoke-host.md`, `0002-two-gpuix-versions.md`,
  `.agents/slop/plans/140-gpuix-native-darwin-x64-build.md`

## Context

ADR 0001 established that GPUix publishes **no `darwin-x64` binding** for
0.10.0, so the native smoke suite could not run on this Intel Mac and every
capability row was `unverified`. ADR 0002 added the 0.5.1 legacy probe, which
runs here but never delivers focus/blur events — so it cannot verify a component
library either.

B1 (in `~/GPUIXUI/BLOCKERS.md`) said to try the documented alternatives,
including **build-from-source**. That avenue had been closed on the grounds that
the Metal toolchain (`xcrun metal`) ships with Xcode, which this host lacks
(Command Line Tools only). Re-reading the pinned source showed that premise is
incomplete: the Metal step is **optional**.

`zed/crates/gpui_apple/build.rs` branches on a feature:

```rust
#[cfg(feature = "runtime_shaders")]
emit_stitched_shaders(&header_path);       // compile at runtime, in-process
#[cfg(not(feature = "runtime_shaders"))]
compile_metal_shaders(&header_path);       // the only `xcrun metal` caller
```

`gpui_macos` re-exports it (`runtime_shaders = ["gpui_apple/runtime_shaders"]`).
With it enabled, `metal_renderer.rs` builds the pipeline through the OS Metal
runtime compiler (`MTLDevice.newLibraryWithSource`), which ships with macOS.
`packages/native/build.rs` itself is only `napi_build::setup()`.

## Decision

1. **Build the pinned `gpuix-native` cdylib for `x86_64-apple-darwin` from
   source on this host**, with `runtime_shaders` added to the `gpui_macos`
   dependency. Recipe, commands and STOP conditions: plan `140`.
2. **Install the artifact** as
   `apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node`
   (the filename the package's own loader resolves). It is a build product:
   gitignored, reproducible, and its provenance recorded — same version, same
   source revision, same Rust code as the published package; only the
   shader-compilation feature differs.
3. **The native smoke suite is the verification gate, and it is green here**:
   11/11 scenarios, exit `0`, a written `smoke-report.json`. The measured
   per-capability facts live in plan `140` §4; the scenarios are the
   reproducible form.
4. **The 0.5.1 legacy probe stays** as historical hardware evidence; its
   verdicts remain labelled and never set a component status. The published
   binary's own shader path (a build-time `metallib`) still differs, so a run
   with the published binary on a supported host remains the gold standard and
   is recorded as a CI task for the `.github/` owner.

## Consequences

**Easier**

- Phase B's "runs in GPUix" exit condition is met on this machine, and every
  Tier 1–4 component can be verified against real GPUix 0.10.0 without a second
  host.
- The whole class of "is this primitive supported?" questions now has measured
  answers (plan `140` §4), including the ones that change plans: focus/blur
  **do** work, wheel scroll **does** work, `autoFocus` does not dispatch
  `onFocus`, and a `<virtual-list>` paints only a window.

**Harder**

- A fresh checkout does not have the binding: the build must be repeated (or the
  artifact obtained), which the suite reports honestly as exit `2` until then.
- The locally-built artifact is not byte-identical to the published one, so a
  `verified` verdict names its provenance in `COMPONENTS.md`.

**Rejected alternatives**

- *Do nothing and wait for a supported host*: rejected — the build works here.
- *Target 0.5.1*: rejected in ADR 0002 (no focus events).
- *Ship the wasm browser build as evidence*: rejected — a browser canvas is not
  the native runtime.

## Amendment 1 — the source was not the release (2026-10-18, plan `529`)

Decision 2 and the "same source revision" provenance sentence above were
**wrong**. The scratch tree was a copy of `references/gpuix` at its **HEAD**
(`515df19`, `main`), not the published release, and it used that clone's zed
submodule (`2565b8a3`) rather than the release's (`81c99f81`).

Evidence (plan `529` §1):

- the release tag is `@gpuix/native@0.10.0` = `9fcd6288…`; the zed submodule it
  pins is `81c99f81…`;
- `packages/native/src` differs between the two commits by **12 files, 3,330
  lines** (bounds tracking, hit testing, frame pacing, event payload, style);
- the published `darwin-arm64` 0.10.0 binary contains none of
  `focusVisible`, `keyboardFocusDim`, `outlineWidth`, `registerFont`,
  `setFrameWakeCallback`, `scrollbarColor`, `borderStyle`, `keystrokeId`,
  `scrollX`/`scrollY`; the local x64 artifact contains all of them.

Decision 2 is amended: **the artifact is built from the release tag
`9fcd6288…` with zed `81c99f81…`**, and the suite pins that provenance, prints
it in every report and refuses a binary that carries a capability the release
does not have (plan `529` §3.6). A `verified 0.10.0` verdict may only cite the
re-baselined artifact. The shader feature remains the only difference from the
published package.
