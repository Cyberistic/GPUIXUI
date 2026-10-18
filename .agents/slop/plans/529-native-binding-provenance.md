# 529 — The native evidence is built from a newer source than the published 0.10.0

- **Status:** planned (execution in progress)
- **Phase:** B/F (evidence integrity — blocks every `verified 0.10.0` verdict)
- **Depends on:** `140` (the build recipe), `110` (the smoke suite), `189` (the live suite)
- **Owner:** playground workstream (`apps/playground`, `packages/testing`)
- **Amends:** `.agents/adr/0003-darwin-x64-source-build.md`, plan `140` §3/§4

## 1. The bug

Every `verified 0.10.0` row in `COMPONENTS.md` rests on a binding built on
2026-10-17 from `references/gpuix`. That clone is **not** the published 0.10.0
release:

| What | Value |
| ---- | ----- |
| Published release tag `@gpuix/native@0.10.0` | `9fcd628863e354e9c58019fc3bf38981a1e64158` |
| Source the binding was built from (`references/gpuix` HEAD) | `515df198fef2685f5ed7dd120bf0db638eb5c360` (main) |
| Zed pinned by the release tag | `81c99f816b4a5f69d3c014774068034c24d1d7af` |
| Zed actually compiled into the binding | `2565b8a3e33537c3d3f56d0d45f11e50a17e512d` (main) |
| `packages/native/src` diff between the two | **12 files, 3,330 lines** |

The published release is two versions of the source behind **and** uses a
different GPUI fork revision, so the local artifact is not "the published 0.10.0
with a different shader path". ADR 0003's sentence *"same version (0.10.0), same
source revision, same Rust code as the published package; only the
shader-compilation feature differs"* is **false**.

### 1.1 Proof from the published binary

The published `darwin-arm64` 0.10.0 binary can be inspected on this x64 host
without running it. Rust `serde` field names are string literals, so a
capability that exists in the compiled source appears in the binary:

```sh
cd /private/var/folders/_6/kh_1khh12ng5lqv93r_x912c0000gp/T/opencode/gpuix-prov
# (create it once, see §3.1)
for s in focusVisible keyboardFocusDim outlineWidth registerFont \
         setFrameWakeCallback scrollbarColor aspectRatio keystrokeId scrollX; do
  printf '%-22s published:%s local:%s\n' "$s" \
    "$(strings -a arm64/package/gpuix-native.darwin-arm64.node | grep -c "$s")" \
    "$(strings -a ../../../../Users/cyberistic/GPUIXUI/workspaces/playground/node_modules/.store/node_modules/@gpuix/native/gpuix-native.darwin-x64.node | grep -c "$s")"
done
```

Measured (2026-10-18):

| Marker | Published arm64 0.10.0 | Local x64 binding |
| ------ | ---------------------- | ----------------- |
| `focusVisible` | 0 | 1 |
| `keyboardFocusDim` | 0 | 1 |
| `outlineWidth` | 0 | 1 |
| `registerFont` | 0 | 1 |
| `setFrameWakeCallback` | 0 | 1 |
| `scrollbarColor` | 0 | 1 |
| `borderStyle` | 0 | 1 |
| `keystrokeId` / `scrollX` / `scrollY` | 0 / 0 / 0 | 1 / 1 / 1 |
| `lineClamp`, `selectionColor`, `zoomWindow`, `getDebugFrameOverlayStats` | 1+ | 1+ |

So the local binding carries capabilities a published consumer cannot use
(`registerFont`, `:focus-visible`, native outlines, keyboard-focus dimming,
scrollbar styling, `border-style`, `fill: "window"` on `<anchored>`, extra event
payload fields, BGRA image uploads) and a different implementation of surfaces we
did measure:

- painted-bounds tracking: `bounds_tracker` (a child node per element) was
  replaced by `track_host_bounds` (`on_painted`) — affects retained-node counts
  (`scale-cost`, `qr-code`), the "retained but unpainted reports no bounds" rule
  (`live-scroller`, `live-float`) and `visibility: hidden`;
- hit testing: `elements_at` gained deferred `anchored` layers;
- frames: `setFrameWakeCallback` (display-link wake) and `if dirty {
  request_invalidate() }` — affects every `frame-stats`/`live-frames` number;
- input: `emit_key_event` + `keystrokeId`;
- search: a pre-built `Needle` (performance only);
- `aspectRatio`, inset/multi-layer `boxShadow`, `borderStyle`, `scrollbarColor`.

### 1.2 Why it happened

Plan `140` copied `references/gpuix` (the moving reference clone, which tracks
`main`) into the scratch build, and took that clone's `zed` pin. Nothing pinned
the release tag. The plan then recorded the copied clone as "the published
source". The artifact is gitignored, so no diff ever surfaced.

### 1.3 Consequence if left alone

Any statement of the form "GPUix 0.10.0 does X" is currently unproven: it may be
main-only behaviour. Three published ledger entries are already known to be
wrong for published 0.10.0 in the opposite direction (they describe main as
unreleased): plan `017`'s "no `outline*`, no `focusVisible`" is **correct for
published 0.10.0** and false for our binding; plan `052`'s `registerFont` is
blocked because published 0.10.0 has no such API, not because the build cannot
prove it; `frame-stats` describes a frame model that includes main's dirty gate.

## 2. Decision

**Re-baseline the whole suite against the published 0.10.0 source**, because the
library targets the published package (PLAN.md D9/D22):

1. Build the binding from the release tag `9fcd6288…` and the zed fork at
   `81c99f81…` with `runtime_shaders`, replacing the current artifact.
2. Run the full headless suite on it; every failure is a measured delta.
3. Correct each scenario to the published behaviour (or record a limitation),
   with the two-direction proof for each changed assertion.
4. Correct the provenance ledgers and add a **binary fingerprint guard** so a
   main-derived artifact can never silently pass as `0.10.0` again.
5. Run the full live suite (merge gate) on the re-baselined binding.

No new capability probe is started until this lands; every probe result measured
on the old artifact is suspect until re-run.

## 3. Steps

### 3.1 Prepare the published source (exact)

```sh
SCRATCH=~/GPUIXUI/workspaces/playground/.agents/slop/scratch/gpuix-build
RELEASE=9fcd628863e354e9c58019fc3bf38981a1e64158
ZED=81c99f816b4a5f69d3c014774068034c24d1d7af
PROV=/private/var/folders/_6/kh_1khh12ng5lqv93r_x912c0000gp/T/opencode/gpuix-prov

mkdir -p "$PROV" "$SCRATCH/release"
cd "$PROV"
curl -sSL -o gpuix-release.tgz "https://codeload.github.com/remorses/gpuix/tar.gz/$RELEASE"
curl -sSL -o zed-release.tgz   "https://codeload.github.com/remorses/zed/tar.gz/$ZED"
tar -xzf gpuix-release.tgz -C "$SCRATCH/release"
tar -xzf zed-release.tgz   -C "$SCRATCH/release"
mv "$SCRATCH/release/gpuix-$RELEASE" "$SCRATCH/release/gpuix"
mv "$SCRATCH/release/zed-$ZED"       "$SCRATCH/release/gpuix/zed"
```

Expected: `$SCRATCH/release/gpuix/packages/native/Cargo.toml` exists and its
`version` is `0.10.0`; `grep -c outline_width
packages/native/src/style.rs` prints `0`.

Then the single authorised edit — the same one plan 140 made:

```toml
# $SCRATCH/release/gpuix/packages/native/Cargo.toml
gpui_macos = { path = "../../zed/crates/gpui_macos", default-features = false, features = ["font-kit", "runtime_shaders"] }
```

### 3.2 Build

```sh
cd "$SCRATCH/release/gpuix/packages/native"
export RUSTUP_HOME="$SCRATCH/toolchain/rustup" CARGO_HOME="$SCRATCH/toolchain/cargo"
export PATH="$CARGO_HOME/bin:$PATH"
CARGO_PROFILE_RELEASE_LTO=false CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16 \
  cargo build --release --locked --target x86_64-apple-darwin
```

Expected: `EXIT=0`, ~10 min, `target/x86_64-apple-darwin/release/libgpuix_native.dylib`.

**STOP** if `--locked` fails because the release's `Cargo.lock` disagrees with
the zed tree: report the exact cargo error. Do not run `cargo update`; the lock
is part of the release provenance.

**STOP** if the build needs `xcrun metal` (a `runtime_shaders` compile error):
report it; the tag proves the feature exists in `gpui_apple/build.rs` (lines
20–23), so a failure here means a different cause.

### 3.3 Install and fingerprint

```sh
cp target/x86_64-apple-darwin/release/libgpuix_native.dylib \
  ~/GPUIXUI/workspaces/playground/apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node
```

> The package may be linked from `node_modules/.store/...`; install to the path
> `@gpuix/native/index.js` actually resolves (the loader looks for
> `./gpuix-native.darwin-x64.node` next to it). Verify with
> `node -e 'import("@gpuix/native").then(m=>console.log(typeof m.TestGpuixRenderer))'`.

Expected: the new artifact must **not** contain the main-only markers:

```sh
for s in focusVisible keyboardFocusDim outlineWidth registerFont setFrameWakeCallback; do
  printf '%-20s %s\n' "$s" "$(strings -a <installed .node> | grep -c "$s")"
done
```

All zero. If any is non-zero, the wrong tree was copied — **STOP**.

### 3.4 Re-baseline the headless suite

```sh
cd ~/GPUIXUI/workspaces/playground
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --all
```

Expected: exit `0` only if published 0.10.0 is behaviourally compatible with the
current assertions. Record the exact failing scenario/check text in §6 of this
plan as it is observed — do not "fix" anything in the same command.

**STOP and report** if any of these fail structurally (they would mean the
published runtime cannot run the suite at all, not a delta):

- all `layout-*`/`shell-*` scenarios fail;
- `preflight` reports no binding / exit `2`;
- the harness itself throws (a host verb missing from 0.10.0).

### 3.5 Triage protocol (per failing check)

1. Decide which side is wrong:
   - **main-only expectation** → change the assertion to the published
     behaviour; cite the check in this plan and in `PLAN.md` D68.
   - **harness assumption** (a verb/semantics main added) → fix the adapter in
     `packages/testing` or the scenario helper.
   - **published 0.10.0 is worse** (a real defect/main-only fix) → record it as a
     limitation in the affected `COMPONENTS.md` row and keep the assertion only
     if it tests the *library's* contract, otherwise downgrade honestly.
2. Every changed assertion lands with a two-direction proof in §6: state the
   failure seen on the old artifact and the value on the published one.
3. Never widen a tolerance to hide a delta; a number changes only with a
   measured reason.

**STOP** if more than 20 scenarios fail or if a failure implies a core capability
(layout/input/focus/scroll/overlay) does not exist on published 0.10.0. Report
with the full list instead of mass-editing.

### 3.6 Guard: the binary fingerprint

Add to `packages/testing` (my path):

- `src/binding.ts`:
  - `BindingPin` — `Schema.Class` `{ package, version, gpuix, zed, shaders }`,
    decoded from the committed pin file.
  - `MAIN_ONLY_MARKERS` — the marker list in §1.1, with a comment naming this
    plan as the source.
  - `fingerprintIssue(bytes | string, pin)` → `Option<string>`: for pin
    `0.10.0`, a marker found in the binary is an issue (`Some("… is not in
    0.10.0")`).
- `src/binding.test.ts` — fixture strings, not the real binary:
  - a buffer with `focusVisible` and pin `0.10.0` → an issue naming the marker;
  - a buffer without any marker → `None`;
  - a pin for a future version (e.g. `0.11.0`) → `None` (the marker list is
    version-scoped, not a permanent ban).
  This test fails if the detector is deleted or inverted.
- `apps/playground/src/native-binding.ts` — the committed pin
  (`{ package: "@gpuix/native", version: "0.10.0", gpuix: "9fcd6288…", zed:
  "81c99f81…", shaders: "runtime" }`), imported by `smoke/run.ts` and the live
  runner's `hostLabel`, so every report says which source produced it.
- `apps/playground/src/smoke/run.ts`: read the installed binary through
  `FileSystem` (it is a build product; absent → skip the fingerprint but keep
  exit `2` for a missing binding), and **fail exit 1** with the plan number and
  the rebuild command when `fingerprintIssue` is `Some`.
- `apps/playground/src/native-binding.test.ts`: `describeBinding` includes the
  source pin (so the report can never claim a bare version again); the pin's
  version matches the installed `@gpuix/native/package.json` (`skipIf` absent).

### 3.7 Ledgers to correct (exact text)

- `.agents/adr/0003-darwin-x64-source-build.md`: replace the "same source
  revision" claim with the two commits and the zed pins; add that the artifact
  is rebuilt from the release tag, and that the fingerprint guard exists.
- This plan's §6 holds the measured deltas; `PLAN.md` gains **D68**:
  "Native evidence is pinned to the published release tag, and the binding is
  fingerprinted; a binding built from `main` is not `verified 0.10.0`".
- `COMPONENTS.md` preamble: name `gpuix 9fcd6288, zed 81c99f81, runtime_shaders`.
- `TODO.md`: tick the re-baseline task; add a cross-team task only if a
  measured delta changes a component's documented contract.
- `.agents/slop/plans/README.md`: index this plan; correct plan `140`'s status
  line.
- `README.md`: the suite count is stale (`95 scenarios`); set it from the
  registry after the run.

## 4. Test plan

| Test | What it must catch | Two-direction proof |
| ---- | ------------------ | ------------------- |
| `binding.test.ts` (unit) | a marker-bearing binary accepted as 0.10.0 | feed `focusVisible` → issue; feed clean → `None` |
| `native-binding.test.ts` (unit) | the report label dropping the source pin | remove the pin from `describeBinding` → fails |
| `smoke` full suite | every delta the published runtime has | the old artifact must show the old numbers; record both in §6 |
| `live` full suite | live-only deltas (frame pacing, bounds, payload) | run once before the change? (not required — the old numbers are in plans 189–528) |

Commands: `nub run --filter @gpuixui/testing test`,
`nub run --filter playground test`, then the suites in §3.4 and §5.

## 5. Completion gate

- `nub run check`, `nub run lint`, `nub run test` pass.
- Headless full suite exits `0` on the published-tag binding; the report's host
  label names the pins; the fingerprint check runs and passes.
- The full **live** suite exits `0` (this plan is cross-cutting, so it owns the
  merge gate).
- Every changed number has a two-direction note in §6.
- The ledgers in §3.7 are corrected and committed.
- The old artifact is replaced (or the suite refuses to run it).

## 6. Measured deltas (filled during execution)

_Empty until §3.4 runs._

## 7. Rollback

The old artifact is reproducible: plan `140`'s scratch tree
(`.agents/slop/scratch/gpuix-build/gpuix`, HEAD `515df19`) still exists, and so
does its `build.sh`. Restore it only to reproduce a pre-529 number, never to
claim a published-0.10.0 verdict.
