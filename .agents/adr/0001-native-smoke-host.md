# 0001 — The native smoke test cannot run on the current build host

- Status: **superseded in part by `0002-two-gpuix-versions.md`** (its 0.10.0
  evidence stands; a 0.5.1 legacy probe *does* run here and its consequences are
  recorded in 0002), and **amended by `0003-darwin-x64-source-build.md`** (the
  0.10.0 binding is built from source on this host, so the suite runs here)
- Date: 2026-10-17
- Deciders: playground workstream (swarm)
- Related: `.agents/slop/plans/100-package-testing.md`,
  `.agents/slop/plans/110-native-smoke-test.md`,
  `.agents/slop/plans/120-app-playground.md`, `PLAN.md` §5 (open questions)

## Context

`MISSION.md` requires a **real native smoke test early**: the biggest risk is
whether GPUix supports the layout, input, focus, overlay, scroll and panel
primitives the component API needs, and every component row in `COMPONENTS.md`
may only say `done` after an interaction is verified in the real runtime (or a
verified compatible environment).

The swarm runs on one machine. It is an **Intel Mac**:

```
$ node -p "process.arch + ' ' + process.platform"   # x64 darwin
$ sysctl -n machdep.cpu.brand_string                # Intel(R) Core(TM) i7-8750H
```

GPUix publishes **no `darwin-x64` binding**, and never has:

```
$ nub view @gpuix/native optionalDependencies
{ "@gpuix/native-darwin-arm64": "0.10.0",
  "@gpuix/native-linux-x64-gnu": "0.10.0",
  "@gpuix/native-win32-x64-msvc": "0.10.0" }
```

`references/gpuix/packages/native/package.json` → `napi.targets`:
`aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`,
`aarch64-pc-windows-msvc`. The same shape holds at 0.9.0, 0.8.0 and 0.7.0
(`nub view @gpuix/native@<v> optionalDependencies`).

Installing succeeds; loading fails:

```
$ node -e "import('@gpuix/native')…"
Cannot find native binding. npm has a bug related to optional dependencies
(https://github.com/npm/cli/issues/4828). …
```

A source build is not available either: `cargo` and `rustc` are not installed,
`xcode-select -p` points at `CommandLineTools`, and `xcrun -f metal` fails —
the Metal toolchain ships with Xcode. The machine's GPUs report `Metal 3`, so
the hardware is not the obstacle; the prebuilt binary and the toolchain are.

## Decision

1. **The native smoke suite is authored and shipped now**, as a first-class
   deliverable, but on this host it reports **exit 2 "unverified"** with the
   evidence above. It does not report success, and it does not silently skip.
2. **No capability and no component may be marked verified/done on the strength
   of a run that did not happen.** `COMPONENTS.md` records
   `unverified (no supported host — ADR 0001)` until a supported host runs the
   suite and the report is quoted.
3. The suite runs on any of: **Apple Silicon macOS**, **x64 Windows**, or
   **x64 Linux** (Linux for live-app smoke only — `TestRenderer` is
   macOS/Windows because wgpu read-back is missing there). The commands are in
   `.agents/slop/plans/110-native-smoke-test.md` §4.
4. Supporting static evidence (upstream README sections and installed types) may
   justify *writing* a probe and *provisional* planning, and must be labelled
   `probe-able (docs)`; it never justifies `verified`.
5. The GPUix **wasm** browser build shipped in `@gpuix/native/wasm` is not used
   as native evidence. It is a real GPUix renderer, but it is a browser canvas,
   not the Metal/DirectX window; the docs-site workstream may evaluate it as an
   *embedding* (strategy 1 in MISSION's preview rules) with its own ADR.

## Consequences

**Easier**

- The gate is honest: a green smoke run anywhere is unambiguous evidence, and
  the harness is written so a first run on a supported host is a single command.
- Component plans get a precise contract ("this capability's verdict comes from
  scenario X") without a second test framework.
- The blocker is recorded once, in an ADR and in `TODO.md`, instead of being
  rediscovered by every agent that tries to render a window.

**Harder**

- Phase B's exit condition ("at least one component running in GPUix") cannot be
  satisfied on this machine. Either a supported host is provided, or the
  project must accept that native verification is deferred — which blocks every
  Tier 1–4 `done` row.
- Screenshots and interaction proof for the docs site cannot be produced here.

**Not possible here**

- Any native window, `TestRenderer`, Metal/DirectX read-back, or real GPUix
  input dispatch. There is no workaround that is not a lie.
