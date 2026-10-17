# 140 — Plan: build `@gpuix/native` for `darwin-x64` on this host (blocker B1)

| Field | Value |
| ----- | ----- |
| Status | **landed** — the binding builds, loads, and the suite is **11/11 green on this host** (§4) |
| Phase | B (unblocks the native smoke test — B1) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `110`, `120`, `130` (all landed) |
| Feeds | `COMPONENTS.md` GPUix-support column; ADR 0001's `unverified` verdicts; every component `done` row |
| Blocker | `~/GPUIXUI/BLOCKERS.md` **B1** — "GPUix native bindings fail to install" |

## 1. Goal

Resolve B1 **on this Intel Mac** by building the pinned `gpuix-native` cdylib for
`x86_64-apple-darwin` from source, so `apps/playground` can mount a real
`TestRenderer` and the plan-`110` smoke suite can produce a report — turning the
eight `unverified` capability rows into measured verdicts without faking a run.

The whole reason this is possible at all is the feature found in §2.4: the only
missing build dependency (`xcrun metal`) is **optional**. `gpui_macos` ships a
`runtime_shaders` feature that compiles the identical shader source at runtime
through the OS Metal framework, so the pinned toolchain (Rust + Command Line
Tools) is sufficient.

## 2. Verified facts (commands run in this worktree, results quoted)

### 2.1 The host has no package manager and no Rust

```
$ for t in cargo rustc rustup brew; do command -v $t; done   # all missing
$ xcode-select -p        # /Library/Developer/CommandLineTools
$ xcrun -f metal         # error: unable to find utility "metal"
$ sw_vers                # macOS 15.8.1 (24H32)
$ uname -m               # x86_64
$ df -h / | tail -1      # 121 GiB available
```

### 2.2 Network is fast enough to fetch Rust and the zed tree

```
$ curl -sS -m 60 -o /dev/null -w '%{speed_download}' \
    https://static.rust-lang.org/rustup/dist/x86_64-apple-darwin/rustup-init
2164458 B/s          # 12.9 MB rustup-init in 6.0 s
$ curl -sS -m 30 https://static.rust-lang.org/dist/channel-rust-1.97.1.toml
# http 200 — the pinned channel exists (cargo 0.98.0, 2026-06-30)
$ curl -sS -m 60 -r 0-5242879 https://codeload.github.com/zed-industries/zed/tar.gz/2565b8a3e33537c3d3f56d0d45f11e50a17e512d
# http 200, ~24 MB in 10.7 s (~2.2 MB/s); the pinned revision is fetchable
```

### 2.3 The pinned versions, from the reference clone

```
$ cat references/gpuix/rust-toolchain.toml
[toolchain]
channel = "1.97.1"
profile = "minimal"
$ git -C references/gpuix submodule status
-2565b8a3e33537c3d3f56d0d45f11e50a17e512d zed     # NOT checked out
```

`references/gpuix/packages/native/Cargo.toml` depends on `../../zed/crates/gpui`,
`gpui_platform`, `gpui_macos`, `reqwest_client`, `http_client`. It has a
`Cargo.lock` (819 packages) and no `[workspace]`; there is **no** root
`Cargo.toml` in `references/gpuix`, so `packages/native` is a standalone package.

### 2.4 The decisive fact: shader compilation is optional

`references/gpuix/packages/native/build.rs` is only `napi_build::setup()` — no
Metal. The Metal step lives in `zed/crates/gpui_apple/build.rs`:

```rust
#[cfg(feature = "runtime_shaders")]
emit_stitched_shaders(&header_path);
#[cfg(not(feature = "runtime_shaders"))]
compile_metal_shaders(&header_path);   // the only `xcrun metal` caller
```

`zed/crates/gpui_macos/Cargo.toml` forwards it:

```toml
[features]
runtime_shaders = ["gpui_apple/runtime_shaders"]
```

With `runtime_shaders`, `metal_renderer.rs` uses
`include_str!("…/stitched_shaders.metal")` and builds the pipeline through the
Metal runtime compiler (`MTLDevice.newLibraryWithSource`), which ships with
macOS — **no Xcode Metal toolchain required**.

### 2.5 Where the built binding must land

`@gpuix/native`'s generated loader resolves the file
`./gpuix-native.darwin-x64.node` (installed `index.js:209`, `index.cjs:206`),
falling back to the optional `@gpuix/native-darwin-x64` package. This host has
neither (verified: `find apps/playground/node_modules/@gpuix -name '*.node'` →
no output), which is exactly why `detectRuntime` reports unsupported.

### 2.6 `@gpuix/native-darwin-x64` is published only up to 0.5.1

```
$ curl -sS https://registry.npmjs.org/@gpuix%2Fnative-darwin-x64 | node -e …
0.1.0 0.2.0 0.3.0 0.4.0 0.5.0 0.5.1        # latest 0.5.1
```

Confirms ADR 0002: no prebuilt path to 0.10.0. A source build is the only route.

## 3. Design

Build in a **writable scratch tree**, never in `references/` (read-only per
`AGENTS.md`): `.agents/slop/scratch/gpuix-build/` (gitignored agent state).

```
.agents/slop/scratch/gpuix-build/
  gpuix/            # copy of references/gpuix (writable)
  gpuix/zed/        # the zed tree at 2565b8a3… (tarball extract)
  toolchain/        # rustup CARGO_HOME/RUSTUP_HOME (kept out of $HOME)
  out/              # the produced gpuix-native.darwin-x64.node
```

The one source change (the whole point of the plan):

```toml
# gpuix/packages/native/Cargo.toml
# before
gpui_macos = { path = "../../zed/crates/gpui_macos", default-features = false, features = ["font-kit"] }
# after — add the feature that removes the build-time Metal dependency
gpui_macos = { path = "../../zed/crates/gpui_macos", default-features = false, features = ["font-kit", "runtime_shaders"] }
```

Build the cdylib (release, LTO disabled so 16 codegen units parallelise; the
crate's own `[profile.release] lto = true` is overridden by the env var):

```sh
CARGO_PROFILE_RELEASE_LTO=false \
  cargo build --release --locked --target x86_64-apple-darwin
```

The cdylib is `target/x86_64-apple-darwin/release/libgpuix_native.dylib`;
copy it to `gpuix-native.darwin-x64.node` and drop it into
`apps/playground/node_modules/@gpuix/native/`. A napi-rs `.node` is a dylib that
exports `napi_register_module_v1`; `napi_build::setup()` (run by the crate's
build script) sets the linker flags, so no `@napi-rs/cli` is required.

The artifact is **gitignored** (it is a build product, not source) but its
provenance is recorded: same version (0.10.0), same source revision, same Rust
code, only the shader-compilation feature differs. That provenance lives in ADR
0003, the `COMPONENTS.md` preamble and the app README — the ledgers a status row
is read from — rather than in the report's `host` string (which names the
version, as before); a machine-readable marker would cost more machinery than the
one label is worth.

## 4. Measured facts (this host, `@gpuix/native@0.10.0` from source)

The build succeeded and the suite ran. Verbatim outcomes; the suite is
reproducible with `apps/playground/dist/smoke/run.js` after the build in §5.

**Build**

- Rust `1.97.1` (cargo `0.98.0`), zed `2565b8a3…`, `runtime_shaders` on.
- `cargo build --release --locked --target x86_64-apple-darwin` → `EXIT=0` in
  **9 m 59 s**; `libgpuix_native.dylib`, 25.7 MB, `Mach-O x86_64`.
- `import("@gpuix/native")` loads and exports `TestGpuixRenderer`,
  `hasTestGpuixRenderer`.
- Binding provenance: same version (0.10.0), same source revision, same Rust
  code as the published package; **only** the shader-compilation feature
  differs (runtime Metal compilation instead of a build-time `metallib`).

**Suite**

```
12/12 scenarios passed · capabilities: layout=verified text=verified
input=verified focus=verified overlay=verified scroll=verified panel=verified
virtual-list=verified table=verified workspace=verified
```

Exit `0`; `smoke-report.json` and 9 screenshots written. Two-direction proof
(§6.3): with `panel-resize`'s expected delta changed `+80 → +81` the suite
exits `1`, names `drag grew the pane by 80`, and reports `panel=failed`.

**Per-capability findings** (each shaped a scenario; the scenario comments cite
this section)

| Capability | Measured |
| ---------- | -------- |
| layout | flex/grid/gap/absolute bounds exact; `div` is block unless `display:"flex"` |
| text | `getAllText` for `<text>`; `getPaintedText` for `<code>`/`<markdown>` |
| input | `nativeSimulateKeystrokes`/`simulateKeystrokes` edit; `onChange`/`onSubmit` fire |
| focus | **`onFocus`/`onBlur` fire** (0.5.1 never delivered them) on a click and on native traversal. `autoFocus` takes **native** focus but does **not** dispatch `onFocus`. A synthetic `"tab"` keystroke reaches the focused element's `onKeyDown` but does **not** itself traverse in the `TestRenderer`; `focusNext()`/`focusPrevious()` (GPUI's `window.focus_next`) do — and need an explicit `dispatchNativeEvents()` to deliver the focus events to React |
| overlay | the `<anchored>` node paints **no surface of its own** (`getElementBounds` is `null`), so `onMouseDownOutside`/`onKeyDown` must be on the **content div inside** it (as GPUix's own `FloatingLayer` does). The popup takes focus on open (`autoFocus`); Escape then reaches its `onKeyDown`; a click outside the content div fires `onMouseDownOutside`. Escape does **not** bubble to a `deferred` `<anchored>` ancestor |
| modal | `useGpuix().renderer` can move native focus from component code: `focusElement` focuses a node, `getFocusedElementId` reports it, and `focusNextWithin`/`focusPreviousWithin` **wrap** inside a container (`content → a → b → open-popover → close → content`, reverse for Shift-Tab). That is the Dialog's Tab trap. Focus returns by focusing the id saved before open, guarded by `getElementBounds` (null = gone). A nested popover's Escape closes only the popover — the keystroke never reaches the modal — so one dismiss stack must close layers outside-in (`modal-focus-trap`) |
| floating | `<anchored side align gap>` is exact: `side="bottom"` lands at `anchor.bottom + gap`, `side="right"` at `anchor.right + gap`, `align="start"`/`"end"` align the panel edges. **`align="center"` is off by half the panel size**: it puts the panel's end on the anchor's centre line (`anchored.rs` wraps the layer in a full-size zero box *and* positions it from the anchor point), compensated only by a known-size `alignOffset`. `fit="snap"` clamps to `window − snapMargin` but **does not flip**: a bottom layer can cover its trigger, so a component chooses `side="top"` near the bottom itself (`floating-placement`) |
| scroll | wheel **works**; `deltaY` is **negative to scroll down** (the opposite of the DOM `WheelEvent` — a positive delta clamps at the top). `onScroll` fires; `scrollTo`/`scrollIntoView` work |
| panel | pointer-capture divider drag + inclusive clamp verified |
| virtual-list | children mode **retains every row** (5 000) but GPUI **paints only ~9** — `getPaintedText()`, not the retained count, is the window. The element has no own bounds (`getElementBounds` is `null`). `onVisibleRange` fires **on scroll**; its first event reports the *pre-scroll* range, so the window moving is asserted on the painted rows |
| table | row click, sort, `onKeyDown` down/up, wheel scroll and column drag all verified. A row scrolled out of a `overflow:"scroll"` parent is laid out beyond the window, so a click at its bounds **misses** — select a visible row. **Virtualized table** (`virtualized-table`): fixed-height flex rows with fixed-width cells lay out inside `<virtual-list>`; ~9 of 500 rows are painted; a painted row is hittable and selects; selection is React state and repaints after the row leaves and re-enters the window. `onVisibleRange` **lags the painted window by one gesture** (after two wheels the painted rows were `32–40` while the range read `16`), so an index-driven feature must not treat the event as the current window |
| tree | `paddingLeft` is honoured: depth-1 labels sit `16px` and depth-2 labels `32px` right of the root. Expand/collapse paints and unpaints the subtree. A clicked row **takes native focus** and receives `down`/`up`/`left`/`right` in `onKeyDown` (`tree-view`) |
| log | `<virtual-list alignment="bottom" followTail>` starts at the tail and re-anchors on appended lines. The two props overlap: `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up and then appending does **not** snap back — a follow toggle is app state plus an explicit scroll (`log-viewer`) |
| workspace | tab click, tab drag between panes and split resize verified. **Pointer capture needs `onMouseMove`**: a `mouseUp` after the pointer left the pressed element only reaches it when the element also declares `onMouseMove` (the drop is therefore decided during the move). The **app-level window key handler** is the one input path the element scenarios do not cover: GPUix delivers window keys only through `render({ onKeyDown })` (the `TestRenderer`'s `createTestRoot({ onKeyDown })`), after the focused element's `onKeyDown`, with `event.modifiers` set — the command-palette / application-menu mechanism (scenario `window-key-shortcut`) |
| components | the shipped `@gpuixui/primitives` mount in the playground through the tokens theme and behave natively: `Button` on click / Enter-down / Space-up, `disabled`/`loading` refusal, the component's focus ring appearing and dropping in `paintedStyle`, controlled `Input` edits plus `onSubmit`, disabled-field read-only, `Checkbox`/`Switch` state on `aria-valuetext`, themed `Select` commit and Escape dismissal, `Slider` arrow steps, `Progress`/`Meter` value text, a painted `Skeleton` and a hover `Tooltip` (`primitives-actions`, `primitives-fields`, `primitives-display`). `simulateKeystrokes("space")` delivers **no key up**, so the harness exposes `keyDown`/`keyUp` (plan `168` §8). `RadioGroup` selects and moves focus with the arrows (wrapping), `Rating` clamps and clears, `NumberField` steps and clamps on commit, and `OTPField` fills forward, advances focus and deletes exactly one character on Backspace — all through their own `testId` dispatch (`primitives-choice`, `primitives-entry`, plan `169` §8) |

## 5. Steps

Steps 2–6 are automated by `apps/playground/scripts/build-native-binding.sh`
(idempotent; it stages everything under `.agents/slop/scratch/gpuix-build/` and
installs the artifact). Run it for a normal rebuild; the steps below are the
record of exactly what it does.

Each step states its exact command and expected result.

1. **Plan only.** Write this file and index it; commit
   `plan(playground): build the darwin-x64 GPUix binding from source (B1)`.
   (STOP: do not start step 2 before the plan is committed.)

2. **Install the pinned toolchain** (no sudo; fully under
   `.agents/slop/scratch/gpuix-build/toolchain`):

   ```sh
   cd .agents/slop/scratch/gpuix-build
   curl -sS -o rustup-init https://static.rust-lang.org/rustup/dist/x86_64-apple-darwin/rustup-init
   chmod +x rustup-init
   RUSTUP_HOME=$PWD/toolchain/rustup CARGO_HOME=$PWD/toolchain/cargo \
     ./rustup-init -y --no-modify-path --default-toolchain 1.97.1 --profile minimal \
     --target x86_64-apple-darwin
   ```

   Expected: `rustup` installs; `…/toolchain/cargo/bin/cargo --version` →
   `cargo 1.97.1`. **STOP** if the channel is unavailable or the install needs
   sudo.

3. **Materialise the source tree**:

   ```sh
   cp -R references/gpuix gpuix
   curl -sSL -o zed.tar.gz \
     https://codeload.github.com/zed-industries/zed/tar.gz/2565b8a3e33537c3d3f56d0d45f11e50a17e512d
   mkdir gpuix/zed && tar -xzf zed.tar.gz -C gpuix/zed --strip-components=1
   ```

   Expected: `gpuix/zed/crates/gpui/Cargo.toml` and
   `gpuix/zed/crates/gpui_apple/build.rs` exist. **STOP** if the tarball's top
   directory is not `zed-2565b8a3…` (adjust `--strip-components`, do not guess
   further).

4. **Apply the one-line feature change** (§3) with `edit`.

5. **Build** (§3 command), run from `gpuix/packages/native`, with
   `RUSTUP_HOME`/`CARGO_HOME` pointing at `toolchain/`. Expected: a
   `libgpuix_native.dylib` in the target dir. Long build (hundreds of crates);
   run it in the background and keep working. **STOP** if it fails in
   `gpui_apple`'s build script (the feature was not applied) or in a Metal
   linker step (the runtime-shader path is not real — record it and go to
   step 8's fallback).

6. **Install the artifact** into the app's `@gpuix/native`:

   ```sh
   cp gpuix/packages/native/target/x86_64-apple-darwin/release/libgpuix_native.dylib \
      apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node
   ```

   Expected: `node -e "import('@gpuix/native').then(m => console.log('loaded'))"`
   from `apps/playground` prints `loaded` (not the "Cannot find native binding"
   error).

7. **Run the smoke suite for real**:

   ```sh
   nub run --filter playground build && node apps/playground/dist/smoke/run.js; echo $?
   ```

   Expected: exit `0`, a written `apps/playground/.artifacts/smoke-report.json`,
   and screenshots. Paste the report summary into `TODO.md` and
   `COMPONENTS.md`. If any scenario `failed`, record the measured numbers — a
   real regression is a finding, not a reason to weaken the check (plan `110`
   §6).

8. **Fallback (only if step 5 or 7 fails).** Do **not** improvise a second
   shader path. Record the exact error in `legacy-probe/REPORT.md`-style
   evidence under `.agents/slop/rd/`, update ADR 0001 with the new fact
   ("a source build was attempted; it failed at <step> because <error>"), keep
   every row `unverified`, and record the CI-runner option as a task for the
   owner of `.github/` (this workstream does not own that path):

   > Add a `.github/workflows/native-smoke.yml` running `nub run --filter
   > playground smoke` on `macos-14` (Apple Silicon) — a supported host per ADR
   > 0001 §3 — and paste the report.

9. **Update the records**: `COMPONENTS.md` GPUix-support cells get the report
   field they came from; `PLAN.md` §4 gains a decision row; ADR 0001 is marked
   resolved (or amended by the fallback). Commit in slices.

## 6. Test plan

1. **The binding loads** — `node -e "import('@gpuix/native')"` from
   `apps/playground` exits `0`. Fails (with the §2.5 error) if the artifact is
   missing or misnamed.
2. **The suite reports, not exits 2** — step 7 exits `0`/`1`, never `2`, and
   writes a report. Fails if `detectRuntime` still sees an unsupported host.
3. **A real regression fails the suite** (plan `110` §5.1) — temporarily change
   `panel-resize`'s expected delta `+80 → +81`, confirm exit `1` naming that
   check, revert. This is the proof the run is real and not a stub.
4. **The report is honest** — `capabilities` contains no `verified` for a
   capability whose scenarios errored; `host` names the locally-built binding.
5. **`packages/testing`'s own tests still pass** — unaffected (platform-free).

## 7. STOP conditions

- **If the toolchain or the source build needs `sudo`**, stop and report.
- **If `gpui_apple`'s build script still calls `xcrun metal` after the feature
  change**, stop: the feature is not what this plan claims, and the premise is
  wrong.
- **If the built binding loads but the first scenario crashes the process**
  (e.g. an ObjC selector or a missing symbol), stop and report the crash; do
  not "fix" it by editing GPUix source beyond the §3 feature line without a new
  plan.
- **Never** mark a capability `verified` from a screenshot or from a build that
  did not actually run the scenario.
- **Never** commit the `.node` artifact or the scratch tree (both gitignored);
  commit only the report *numbers* and their provenance.
- **Never** edit anything under `references/` — copy out first (§3).

## 8. Acceptance criteria

- The scratch build produces `gpuix-native.darwin-x64.node`, `@gpuix/native`
  loads it, and `node apps/playground/dist/smoke/run.js` exits `0`/`1` with a
  written `smoke-report.json` — **or** the fallback records a precise,
  reproduced failure and the CI task.
- `COMPONENTS.md` rows cite the report field and the provenance of the binding.
- `nub run check`, `nub run lint`, `nub run test` still pass.
- ADR 0001/0002 reflect the outcome; `PLAN.md` gains the decision row; `TODO.md`
  ticks B1's task (or records the fallback).
