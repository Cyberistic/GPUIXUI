#!/bin/sh
# Build the pinned @gpuix/native cdylib from source for this host and install it
# into apps/playground/node_modules/@gpuix/native/.
#
# Only needed where the published package has no binding for this platform —
# macOS x86_64 (darwin-x64). GPUix publishes no darwin-x64 build from 0.6.0 on,
# and the blocking `xcrun metal` step is optional: gpui_macos forwards a
# `runtime_shaders` feature that compiles the identical shader source through the
# OS Metal runtime compiler, so the pinned Rust toolchain and Command Line Tools
# are enough. See .agents/adr/0003-darwin-x64-source-build.md and
# .agents/slop/plans/140-gpuix-native-darwin-x64-build.md.
#
# apps/playground/patches/gpuix-zindex.patch adds `StyleDesc.zIndex` (paint and
# hit order) to the pinned source; step 4 applies it idempotently.
#
# Everything lands under .agents/slop/scratch/ (agent state, gitignored); only
# the final .node is copied into node_modules (also gitignored).
#
# Usage:  sh apps/playground/scripts/build-native-binding.sh
set -eu

root=$(cd "$(dirname "$0")/../../.." && pwd)
scratch="$root/.agents/slop/scratch/gpuix-build"
ref="$root/references/gpuix"
app="$root/apps/playground"

[ -d "$ref" ] || { echo "missing reference clone at $ref" >&2; exit 1; }

case "$(uname -m)" in
  x86_64) target=x86_64-apple-darwin ;;
  arm64)  target=aarch64-apple-darwin ;;
  *) echo "unsupported arch $(uname -m)" >&2; exit 1 ;;
esac
[ "$(uname -s)" = "Darwin" ] || { echo "this script is macOS-only" >&2; exit 1; }

# 1. Pinned Rust toolchain, installed into the scratch dir (no sudo, no ~ edits).
export RUSTUP_HOME="$scratch/toolchain/rustup" CARGO_HOME="$scratch/toolchain/cargo"
if [ ! -x "$CARGO_HOME/bin/cargo" ]; then
  mkdir -p "$scratch"
  curl -sS -o "$scratch/rustup-init" \
    https://static.rust-lang.org/rustup/dist/$(uname -m)-apple-darwin/rustup-init
  chmod +x "$scratch/rustup-init"
  "$scratch/rustup-init" -y --no-modify-path --profile minimal \
    --default-toolchain 1.97.1 --target "$target"
fi
PATH="$CARGO_HOME/bin:$PATH"

# 2. A writable copy of the pinned GPUix source plus its zed submodule.
if [ ! -d "$scratch/gpuix/packages/native" ]; then
  rm -rf "$scratch/gpuix"
  cp -R "$ref" "$scratch/gpuix"
  rm -rf "$scratch/gpuix/zed"
fi
if [ ! -f "$scratch/gpuix/zed/crates/gpui/Cargo.toml" ]; then
  rev=$(git -C "$ref" ls-tree HEAD zed | awk '{print $3}')
  [ -n "$rev" ] || { echo "cannot read the pinned zed revision" >&2; exit 1; }
  curl -sSL -o "$scratch/zed.tar.gz" \
    "https://codeload.github.com/zed-industries/zed/tar.gz/$rev"
  mkdir -p "$scratch/gpuix/zed"
  tar -xzf "$scratch/zed.tar.gz" -C "$scratch/gpuix/zed" --strip-components=1
fi

# 3. The one change that removes the build-time Metal dependency.
manifest="$scratch/gpuix/packages/native/Cargo.toml"
if ! grep -q 'runtime_shaders' "$manifest"; then
  sed -i '' 's/features = \["font-kit"\]/features = ["font-kit", "runtime_shaders"]/' \
    "$manifest"
  grep -q 'runtime_shaders' "$manifest" || {
    echo "could not apply the runtime_shaders feature to $manifest" >&2; exit 1; }
fi

# 4. The zIndex extension: `StyleDesc.zIndex` orders paint and hit testing.
#    The reference clone is read-only, so the change travels as a patch and is
#    applied after the copy. Reverse-dry-run first, so a rebuild is idempotent.
patch_file="$root/apps/playground/patches/gpuix-zindex.patch"
if ( cd "$scratch/gpuix" && patch -p1 -R --dry-run -s < "$patch_file" 2>/dev/null ); then
  echo "gpuix-zindex.patch already applied"
elif ( cd "$scratch/gpuix" && patch -p1 -s < "$patch_file" ); then
  echo "applied $(basename "$patch_file")"
else
  echo "cannot apply $patch_file to $scratch/gpuix" >&2
  exit 1
fi

# 5. Build. LTO off so the codegen units parallelise; the crate sets lto = true.
( cd "$scratch/gpuix/packages/native" &&
  CARGO_PROFILE_RELEASE_LTO=false cargo build --release --locked --target "$target" )

# 6. Install the artifact where the package's own loader looks for it.
lib="$scratch/gpuix/packages/native/target/$target/release/libgpuix_native.dylib"
dest="$app/node_modules/@gpuix/native"
[ -d "$dest" ] || { echo "run 'nub install' first: $dest is missing" >&2; exit 1; }
cp "$lib" "$dest/gpuix-native.darwin-x64.node"
echo "installed $dest/gpuix-native.darwin-x64.node"
