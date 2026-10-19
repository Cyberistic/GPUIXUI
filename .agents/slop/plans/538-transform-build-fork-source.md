# 538 — Transform build plumbing: fetch the GPUix Zed fork and apply the patch

| Field | Value |
| ----- | ----- |
| Status | source integration done — build verification deferred |
| Phase | infra (renderer) |
| Owner | transform-build workstream |
| Depends on | `525` (the port and its provenance), `530` (the zIndex patch and the source build), `140` (the darwin-x64 build script) |
| Feeds | any local GPUI transform evaluation; not a shipping path (plan `525` §7) |
| Paths | `apps/playground/scripts/build-native-binding.sh`, `patches/gpui/` |

## 1. Goal

`apps/playground/scripts/build-native-binding.sh` downloaded the **upstream**
`zed-industries/zed` tarball at the GPUix pin. That tree cannot accept
`patches/gpui/0001-transform.patch`: the patch is a port onto the `remorses/zed`
`gpuix` commit `2565b8a3e33537c3d3f56d0d45f11e50a17e512d`, whose `crates/gpui`
carries 61 GPUix commits and 1 866 upstream commits the patch already resolves
against.

Make the script fetch the GPUix fork at the gitlink pin, and add an **opt-in**
`GPUIX_TRANSFORM=1` step that applies the transform patch to that checkout.
The default build must stay exactly what plan `530` shipped: zIndex on
`packages/native`, `runtime_shaders` in the manifest, no renderer transform.

**Non-goals:** exposing transform in GPUix `StyleDesc`, shipping a fork
(plan `525` gates), a CI matrix, rotation, and any `cargo` invocation in this
plan. The 12-minute binding build belongs to the next step (§6).

## 2. The script change

### 2.1 Source: fork, from the pin

Before, step 2 read only the revision and downloaded
`https://codeload.github.com/zed-industries/zed/tar.gz/<rev>`.

Now it reads **both** facts from the pinned GPUix clone and nothing is hardcoded:

```sh
rev=$(git -C "$ref" ls-tree HEAD zed | awk '{print $3}')
url=$(git -C "$ref" config -f .gitmodules submodule.zed.url)
```

Then a blobless shallow fetch of that exact commit into `$scratch/gpuix/zed`:

```sh
git init -q "$zed"
git -C "$zed" config extensions.partialClone origin
git -C "$zed" remote add origin "$url"
git -C "$zed" fetch -q --filter=blob:none --depth=1 origin "$rev"
git -C "$zed" checkout -q --detach FETCH_HEAD
```

`extensions.partialClone` is required: Apple Git 2.24 rejects `--filter`
without it (`fatal: --filter can only be used when extensions.partialClone is
set`). A shallow fetch makes the checkout reproducible without Zed's history,
and every blob in the pin's tree is present, so `git apply --3way` has its
preimages. The scratch checkout is verified against the gitlink before use:

```sh
head=$(git -C "$zed" rev-parse HEAD)
[ "$head" = "$rev" ] || {
  echo "$zed is at $head, not the pinned $rev; remove $scratch/gpuix to refetch" >&2
  exit 1; }
```

The 113 MB checkout is a **detached** HEAD at the pin. That is deliberate: the
GPUIX rule against detaching `zed/` applies to the real GPUix checkout, not to
this throwaway build tree.

### 2.2 The optional transform

Step 5, after the zIndex patch, default off:

```sh
if [ "${GPUIX_TRANSFORM:-0}" = "1" ]; then
  # reverse-dry-run first, then `git apply --3way`
else
  # if currently applied, reverse it
fi
```

The `else` branch is not cosmetic. The scratch tree survives a rebuild, so a
one-off `GPUIX_TRANSFORM=1` run would otherwise leave `crates/gpui` patched and
silently change later baseline builds. The step makes the tree match the flag
in both directions.

### 2.3 zIndex: `git apply`, not `patch(1)`

The old reverse-dry-run was `patch -p1 -R --dry-run -s < "$patch_file"`. On a
clean tree `patch(1)` prints, four times:

```
Unreversed (or previously applied) patch detected!  Ignore -R? [y]
```

It treats `-R` as a mistake, ignores it, applies the patch **forward** in the
dry run, and exits `0`. The script then printed `already applied` and moved on
with a tree that had **no zIndex** — verified on a fresh copy that had no
`z_index`/`paint_order`. Plan `530`'s build only worked because its scratch copy
had already been patched.

Step 4 now uses `git apply`, which is exact and never prompts:

```sh
if ( cd "$scratch/gpuix" && git apply --reverse --check "$patch_file" 2>/dev/null ); then
  echo "gpuix-zindex.patch already applied"
elif ( cd "$scratch/gpuix" && git apply "$patch_file" ); then
  echo "applied $(basename "$patch_file")"
else
  echo "cannot apply $patch_file to $scratch/gpuix" >&2
  exit 1
fi
```

Both patches keep their own tree: zIndex on `packages/native`, transform on
`crates/gpui`.

## 3. Exact commands run

From the worktree root (`workspaces/transform-build`; `references` is the
usual symlink to `~/GPUIXUI/references`):

```sh
# 1. fetch the fork at the gitlink pin
ref=references/gpuix
rev=$(git -C "$ref" ls-tree HEAD zed | awk '{print $3}')
url=$(git -C "$ref" config -f .gitmodules submodule.zed.url)
zed=.agents/slop/scratch/gpuix-build/gpuix/zed
mkdir -p "${zed%/*}"
git init -q "$zed"
git -C "$zed" config extensions.partialClone origin
git -C "$zed" remote add origin "$url"
git -C "$zed" fetch --filter=blob:none --depth=1 origin "$rev"
git -C "$zed" checkout --detach FETCH_HEAD
git -C "$zed" rev-parse HEAD          # 2565b8a3e33537c3d3f56d0d45f11e50a17e512d

# 2. the patch applies, without building
sh patches/gpui/check.sh "$zed"

# 3. the zIndex patch still applies to the read-only reference clone
git -C "$ref" apply --check "$PWD/apps/playground/patches/gpuix-zindex.patch"

# 4. syntax
sh -n apps/playground/scripts/build-native-binding.sh
```

The script's own steps were exercised with a stub `cargo`
(`.agents/slop/scratch/gpuix-build/toolchain/cargo/bin/cargo`, `exit 0`), so the
fetch, both patches and the flag transitions ran while the install step stopped
at the missing `apps/playground/node_modules` — no `cargo`, no node_modules
write.

## 4. Results (2026-10-18)

| Check | Result |
| ----- | ------ |
| `git fetch --filter=blob:none --depth=1 origin 2565b8a3…` | pass; `HEAD` is the pin, 113 MB |
| `sh patches/gpui/check.sh <scratch>/zed` | `ok: …/0001-transform.patch applies` |
| `git -C references/gpuix apply --check …/gpuix-zindex.patch` | pass; reference clone clean afterwards |
| `sh -n apps/playground/scripts/build-native-binding.sh` | pass |
| script, default | `applied gpuix-zindex.patch`; no transform; install stops because `node_modules` is absent here |
| script, `GPUIX_TRANSFORM=1` | `applied 0001-transform.patch`; exactly the 7 files in `patches/gpui/README.md` |
| script, `GPUIX_TRANSFORM=1` again | `0001-transform.patch already applied` (idempotent) |
| script, default again | `reverted 0001-transform.patch…`; `git status --porcelain` empty |
| `check.sh` after revert | pass |

**Not run:** `cargo build`, any GPUI test, the playground smoke suite, and the
12-minute binding build. A binding-gaps build was running in another worktree;
this plan is source integration only.

## 5. STOP conditions

1. The gitlink or `.gitmodules` cannot be read, or the URL is not
   `https://github.com/remorses/zed.git`.
2. The fetch returns a different commit than the gitlink, or the scratch
   checkout is at another commit. Delete `$scratch/gpuix` and retry once; if it
   still differs, stop.
3. `sh patches/gpui/check.sh <scratch>/zed` fails. Do not run the build; report
   `git apply --3way --check` output.
4. Either patch fails or needs fuzz. Do not edit the patch or the fetched
   source to make it apply.
5. `git apply --reverse --3way` cannot revert the transform when the flag is
   off. The tree is dirty; report `git -C <zed> status` and diff.
6. A build is already running in any worktree, or `apps/playground/node_modules`
   is the shared store. Wait; never build concurrently or write the store.
7. The transform build fails in GPUix code outside `crates/gpui`. That needs a
   binding-side plan, not a patch edit.

## 6. Deferred build verification

Run only after the binding-gaps build finishes, from
`workspaces/transform-build` (or any worktree with the same script commit):

```sh
GPUIX_TRANSFORM=1 sh apps/playground/scripts/build-native-binding.sh
```

Expected: `applied gpuix-zindex.patch` (or `already applied` on a warm scratch),
`applied 0001-transform.patch`, a release build of
`packages/native/target/x86_64-apple-darwin/release/libgpuix_native.dylib`,
then `installed apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node`.
The build takes ~12 minutes cold; LTO-off parallelism is already in the script.

Then, in the GPUI checkout:

```sh
cargo test --release --locked --target x86_64-apple-darwin --lib -p gpui
```

Expected: the 26 transform tests from `patches/gpui/README.md` are present and
the suite is green. This is a separate ~10-minute CPU job; the plan does not
claim it ran.

The **baseline** build is proven unchanged only by rebuilding without the flag
and seeing `reverted 0001-transform.patch` or no transform line, plus the zIndex
`27 passed` test set from plan `530`. That rebuild is also deferred.

After the build, hash the installed `.node` before and after any smoke run: the
store is shared with other worktrees (plan `530` §5).

## 7. Acceptance criteria

- [x] The Zed source comes from `remorses/zed` at the gitlink pin, URL and rev
      read from the reference clone, not hardcoded.
- [x] The fetch is blobless, shallow, reproducible, and verified against the
      pin.
- [x] `GPUIX_TRANSFORM=1` applies `patches/gpui/0001-transform.patch` with
      `git apply --3way`; repeat runs are no-ops and the default path reverts a
      stale application.
- [x] zIndex still applies to `references/gpuix` and to the scratch copy; the
      `runtime_shaders` step is untouched.
- [x] `patches/gpui/check.sh` passes on the fetched checkout.
- [x] `sh -n` passes.
- [ ] Transform-enabled binding built, GPUI tests green, playground smoke green
      (§6, deliberately deferred).
