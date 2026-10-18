#!/bin/sh
# Verify that 0001-transform.patch applies cleanly to a pinned GPUix Zed checkout.
#
# Usage: sh patches/gpui/check.sh /path/to/zed
#
# The checkout must be the GPUix zed submodule at
# 2565b8a3e33537c3d3f56d0d45f11e50a17e512d and must have no conflicting local
# changes. The script does not modify the tree: it only checks the patch.
set -eu

patch=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/0001-transform.patch
repo=${1:-}

if [ -z "$repo" ]; then
  echo "usage: $0 /path/to/zed" >&2
  exit 1
fi
git -C "$repo" rev-parse --git-dir >/dev/null 2>&1 || {
  echo "not a git checkout: $repo" >&2
  exit 1
}

pin=2565b8a3e33537c3d3f56d0d45f11e50a17e512d
head=$(git -C "$repo" rev-parse HEAD)
if [ "$head" != "$pin" ]; then
  echo "warning: HEAD is $head, not the pinned $pin" >&2
fi

paths=$(git -C "$repo" apply --numstat "$patch" | awk '{print $3}')
for path in $paths; do
  case "$path" in
    crates/gpui/*) ;;
    *)
      echo "refusing: the patch touches $path, outside crates/gpui" >&2
      exit 1
      ;;
  esac
done

git -C "$repo" apply --3way --check "$patch"
echo "ok: $patch applies to $repo"
