# `legacy-probe` — the GPUix 0.5.1 evidence probe

This is **not** part of the app build and **not** a test of the library. It is
the reproducible probe behind
[`.agents/adr/0002-two-gpuix-versions.md`](../../../../.agents/adr/0002-two-gpuix-versions.md):
`@gpuix/native-darwin-x64@0.5.1` is the last Intel-macOS binding, and the
library targets `0.10.0`, which has none. The probe measures what GPUI actually
does on *this* hardware, so the mission's feasibility question is answered with
real GPU output rather than documentation.

Two rules keep it honest:

- it never sets a `COMPONENTS.md` status — its verdicts are `verified on GPUix
  0.5.1 (legacy host)`, evidence about the runtime and the hardware;
- it pins 0.5.1 exactly. Nothing in `apps/playground/src` imports it.

## Run the offscreen probe

```sh
apps/playground/legacy-probe/run.sh probe
```

`nub install` cannot install a nested non-workspace package, and the repo must
not carry a second GPUix version in its workspace, so `run.sh` builds a
throwaway project in `$TMPDIR/gpuix-legacy-probe`, installs the 0.5.1 pins
there, copies the scripts in (Node resolves `react`/`@gpuix` from the importing
file's directory), and runs them. Output is one `LEGACY_PROBE { … }` JSON line;
`REPORT.md` records what it measured. Artifacts land in `.artifacts/`
(gitignored).

## What it establishes

See `REPORT.md` for the measured table. In short: layout, text, input, overlay
anchoring, click-outside, Escape, pointer-capture resizing, virtual lists and
programmatic scrolling all work here; **focus/blur events and synthetic wheel
scrolling do not**, and `<canvas>` does not paint. That is why the library
targets 0.10.0 (where those APIs exist) rather than 0.5.1 (which runs here).

## The live window, by hand

`live-app.mjs` renders a real window with focus/input/drag/scroll readouts and
`live-driver.mjs` drives it over GPUix's automation stdio protocol. It produced
the live-window numbers in `REPORT.md` once (a 1400×1040 Metal window with
screenshots). It is deliberately not wired into `run.sh`: on 0.5.1 the driver's
`dragBy` step never settles when the window is not interactive, so an agent run
would hang.

```sh
cd "${TMPDIR:-/tmp}/gpuix-legacy-probe"   # after run.sh probe has installed it
node live-driver.mjs
```

## Files

| File | What it is |
| ---- | ---------- |
| `run.sh` | installs the 0.5.1 pins in `$TMPDIR` and runs `probe.mjs` |
| `probe.mjs` | the offscreen capability probe: one isolated step per claim; every measurement in `REPORT.md` comes from here and prints as one `LEGACY_PROBE` JSON line |
| `live-app.mjs` | a real window with readouts for focus, input, drag and scroll |
| `live-driver.mjs` | drives `live-app.mjs` over the automation protocol and screenshots it |
| `REPORT.md` | the measured results, with the interactions that could **not** be verified |
| `.artifacts/` | screenshots and probe output (gitignored) |
