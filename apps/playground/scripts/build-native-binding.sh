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
# The zed submodule comes from the GPUix fork (`remorses/zed`) at the commit
# pinned by references/gpuix, not from upstream; the transform patch is ported to
# that revision. `GPUIX_TRANSFORM=1` additionally applies
# patches/gpui/0001-transform.patch (GPUI `Style::transform`) to the scratch zed
# checkout. It is off by default and step 5 also reverts a stale application, so
# a build always matches the flag. See plan 538.
#
# Everything lands under .agents/slop/scratch/ (agent state, gitignored); only
# the final .node is copied into node_modules (also gitignored).
#
# Usage:  sh apps/playground/scripts/build-native-binding.sh
#         GPUIX_TRANSFORM=1 sh apps/playground/scripts/build-native-binding.sh
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

# 2. The pinned GPUix source, plus its zed submodule from the GPUix fork.
if [ ! -d "$scratch/gpuix/packages/native" ]; then
  rm -rf "$scratch/gpuix"
  cp -R "$ref" "$scratch/gpuix"
  rm -rf "$scratch/gpuix/zed"
fi

# The pinned revision lives in the GPUix gitlink, its URL in .gitmodules, so a
# submodule bump needs no edit here. A blobless shallow fetch of the exact commit
# keeps the scratch checkout reproducible without cloning Zed's history.
zed="$scratch/gpuix/zed"
rev=$(git -C "$ref" ls-tree HEAD zed | awk '{print $3}')
url=$(git -C "$ref" config -f .gitmodules submodule.zed.url)
[ -n "$rev" ] || { echo "cannot read the pinned zed revision" >&2; exit 1; }
[ -n "$url" ] || { echo "cannot read the zed submodule url" >&2; exit 1; }

if [ ! -d "$zed/.git" ] || [ ! -f "$zed/crates/gpui/Cargo.toml" ]; then
  rm -rf "$zed"
  git init -q "$zed"
  git -C "$zed" config extensions.partialClone origin
  git -C "$zed" remote add origin "$url"
  git -C "$zed" fetch -q --filter=blob:none --depth=1 origin "$rev"
  git -C "$zed" checkout -q --detach FETCH_HEAD
fi
head=$(git -C "$zed" rev-parse HEAD)
[ "$head" = "$rev" ] || {
  echo "$zed is at $head, not the pinned $rev; remove $scratch/gpuix to refetch" >&2
  exit 1; }

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
if ( cd "$scratch/gpuix" && git apply --reverse --check "$patch_file" 2>/dev/null ); then
  echo "gpuix-zindex.patch already applied"
elif ( cd "$scratch/gpuix" && git apply "$patch_file" ); then
  echo "applied $(basename "$patch_file")"
else
  echo "cannot apply $patch_file to $scratch/gpuix" >&2
  exit 1
fi

# 5. Optional GPUI transform (plan 538). The patch only adds renderer API; the
#    zIndex step above stays on packages/native. Reverse-dry-run first so a
#    rebuild is idempotent, and revert when the flag is off so a baseline build
#    never inherits a previous run's transform.
transform_patch="$root/patches/gpui/0001-transform.patch"
if [ "${GPUIX_TRANSFORM:-0}" = "1" ]; then
  if git -C "$zed" apply --reverse --check "$transform_patch" 2>/dev/null; then
    echo "0001-transform.patch already applied"
  elif git -C "$zed" apply --3way "$transform_patch"; then
    echo "applied $(basename "$transform_patch")"
  else
    echo "cannot apply $transform_patch to $zed" >&2
    exit 1
  fi
elif git -C "$zed" apply --reverse --check "$transform_patch" 2>/dev/null; then
  git -C "$zed" apply --reverse --3way "$transform_patch" || {
    echo "cannot revert $transform_patch from $zed" >&2; exit 1; }
  echo "reverted $(basename "$transform_patch"); set GPUIX_TRANSFORM=1 to include it"
fi

# 6. Build. LTO off so the codegen units parallelise; the crate sets lto = true.
( cd "$scratch/gpuix/packages/native" &&
  CARGO_PROFILE_RELEASE_LTO=false cargo build --release --locked --target "$target" )

# 7. Install the artifact where the package's own loader looks for it.
lib="$scratch/gpuix/packages/native/target/$target/release/libgpuix_native.dylib"
dest="$app/node_modules/@gpuix/native"
[ -d "$dest" ] || { echo "run 'nub install' first: $dest is missing" >&2; exit 1; }
cp "$lib" "$dest/gpuix-native.darwin-x64.node"
echo "installed $dest/gpuix-native.darwin-x64.node"
