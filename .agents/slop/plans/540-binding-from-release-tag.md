# 540 — Restore a truthful native binding: build `@gpuix/native@0.10.0` from its release tag

| Field | Value |
| ----- | ----- |
| Phase | F (verification truth) |
| Owner | components workstream (`packages/components`) — the fix itself writes only this worktree's store |
| Depends on | `140` (the original x64 build), `536` (the measurement of the replaced binding), `539` |
| Status | planned |
| Blocker | `~/GPUIXUI/BLOCKERS.md` **B1** — the native binding; B1's fix regressed, so its evidence is stale |

This plan is self-contained. Run every command; do not claim a test passed
unless it ran.

---

## 1. Why — the shared store holds a binding that is not the release

`@gpuix/native@0.10.0` publishes no `darwin-x64` binary, so plan `140` built one
from source (md5 `c5…` then, `c0e554b…` today) and installed it into each
worktree's store. On 2026-10-18 the `gpuix-zindex` workstream rebuilt that store
artifact **in place** from `references/gpuix` `main` (`515df19`) with its own
source edits, not from the release tag. Plan `536` measured the consequences:

- `getElementBounds` now reports a **content-box origin** (`x + border + padding`)
  with a padding-box width, so every absolute-position assertion is off by the
  two elements' different insets (4–13 px).
- Native `focusElement`/`focusNext`/pointer focus moves deliver **no React
  `onFocus`/`onBlur`**, so every ring-paints and blur-commits case is blind.

`@gpuix/native@0.10.0`'s release tag is `9fcd628` (confirmed through the GitHub
tags API: `@gpuix/native@0.10.0` → `9fcd628`). At that commit
`packages/native/src/renderer.rs` still uses `automation::bounds_tracker` and
`ElementBounds::from_painted` — the code the suite was written against — and it
pins the zed submodule at `81c99f81`, not `2565b8a`.

Measured on this host at `HEAD` (2026-10-18 23:10, binding md5
`c0e554bab26858296faa295dbbe65c21`):

```
Test Files  19 failed | 32 passed (51)
     Tests  59 failed | 656 passed (715)
```

Every failing case is explained by the two differences above (position:
`popover`, `preview-card`, `dropdown-menu`, `drawer`, `command-menu`,
`context-menu`; focus: `list`, `tabs`, `time-picker`, `color-picker`,
`inline-edit`, `hotkey-recorder`, and every "paints the focus ring" case;
scroll: `message-scroller` follows `main`'s changed scroll bookkeeping).

## 2. Goal

Produce `gpuix-native.darwin-x64.node` from **the published 0.10.0 source**
(commit `9fcd628`, zed `81c99f81`) with the one documented deviation
(`runtime_shaders`, so no `xcrun metal` is needed), install it **into this
worktree's store only**, and re-run the behaviour suite.

Acceptance: `nub run --filter @gpuixui/components test:behaviour` exits `0` with
715/715, and the artifact's md5 is recorded with its provenance. If cases still
fail, each remaining failure is classified and reported — no assertion is
weakened to make the number green.

## 3. Steps

All scratch state lives under `.agents/slop/scratch/gpuix-release/` in this
worktree (gitignored). The toolchain is reused read-only from the
`gpuix-zindex` worktree's build, which installed Rust 1.97.1 exactly as plan
`140` §5.2 specifies; if that path is gone, run plan `140` step 2 into this
scratch instead.

1. **Reuse the toolchain (read-only).**

   ```sh
   TOOL=/Users/cyberistic/GPUIXUI/workspaces/gpuix-zindex/.agents/slop/scratch/gpuix-build/toolchain
   RUSTUP_HOME=$TOOL/rustup CARGO_HOME=$TOOL/cargo $TOOL/cargo/bin/cargo --version
   ```

   Expected `cargo 1.97.1`. **STOP** if the path is missing — install per plan
   `140` §5.2 rather than borrowing another tree's toolchain.

2. **Materialise the release source.**

   ```sh
   mkdir -p .agents/slop/scratch/gpuix-release
   cd .agents/slop/scratch/gpuix-release
   curl -sSL -o gpuix.tar.gz https://codeload.github.com/remorses/gpuix/tar.gz/9fcd628
   mkdir gpuix && tar -xzf gpuix.tar.gz -C gpuix --strip-components=1
   curl -sSL -o zed.tar.gz https://codeload.github.com/remorses/zed/tar.gz/81c99f816b4a5f69d3c014774068034c24d1d7af
   mkdir gpuix/zed && tar -xzf zed.tar.gz -C gpuix/zed --strip-components=1
   ```

   Expected: `gpuix/packages/native/src/renderer.rs` contains
   `bounds_tracker(` and `gpuix/zed/crates/gpui_apple/build.rs` exists.
   **STOP** if either tree is not at the requested revision.

3. **Apply the one documented deviation** to
   `gpuix/packages/native/Cargo.toml`:

   ```toml
   gpui_macos = { path = "../../zed/crates/gpui_macos", default-features = false, features = ["font-kit", "runtime_shaders"] }
   ```

   Expected: exactly one changed line vs the tag.

4. **Build.**

   ```sh
   cd gpuix/packages/native
   RUSTUP_HOME=$TOOL/rustup CARGO_HOME=$TOOL/cargo CARGO_PROFILE_RELEASE_LTO=false \
     $TOOL/cargo/bin/cargo build --release --locked --target x86_64-apple-darwin
   ```

   Expected: `libgpuix_native.dylib`, `file` reports `Mach-O 64-bit ... x86_64`.
   **STOP** on a build-script failure in `gpui_apple` (feature not applied) or a
   Metal link step (the runtime-shader path is not real — report it).

5. **Install into this worktree's store** (never a shared path):

   ```sh
   cp gpuix/packages/native/target/x86_64-apple-darwin/release/libgpuix_native.dylib \
      /Users/cyberistic/GPUIXUI/workspaces/components/node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/gpuix-native.darwin-x64.node
   ```

   Expected: `md5` changes; `nub -e "import('@gpuix/native').then(m => console.log(typeof m.TestRenderer))"`
   prints `function`.

6. **Re-run the suite** and record the result in this plan and the index.

## 4. Test plan

- `nub run --filter @gpuixui/components test:behaviour` — expected 715/715,
  exit `0`. If not, classify every remaining failure with its measured value;
  do not edit an assertion without a plan row saying what changed and why.
- `nub run check && nub run lint && nub run test` — the gates.
- Record the new md5 and the two source revisions in `TODO.md` and the plan-set
  index so a later rebuild can be recognised as the same artifact.

## 5. STOP conditions

- The tag's source does not compile on this toolchain → report with the compiler
  error; do not substitute `main`.
- The rebuilt artifact still lacks focus/blur or reports content-box bounds →
  the release build is not the cause; report and re-open plan `536`'s
  classification instead of touching tests.
- Anything needs a write outside `packages/components` and
  `.agents/slop/scratch/gpuix-release/` → record it in `TODO.md` for its owner.
