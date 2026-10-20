# 530 — `zIndex` in the GPUix binding: paint order and hit order

| Field | Value |
| ----- | ----- |
| Status | landed, then **opt-in** (plan `811`): the default build is release-parity and the suite refuses an artifact that carries the extension |
| Phase | F (native capability) |
| Owner | gpuix-zindex workstream |
| Depends on | `140` (the source build), `529` (binding provenance) |
| Feeds | plan `524` §5 (`packages/tw`), Toast / Dialog / Popover stacking |
| Amends | `524` §5 (the GPUix extension is designed and available behind `GPUIX_ZINDEX=1`) |

> **Amendment (plan `811`, 2026-10-20).** The artifact this plan measured is no
> longer installed: the suite's build hook restores `apps/playground/native/`,
> which is plan `529`'s release-tag build, and the installed release artifact
> carries no `zIndex` (`strings` count `0`; release style keys appear once).
> Because the published package cannot type or install the field, the extension
> is now **opt-in** (`GPUIX_ZINDEX=1`), and the binding fingerprint refuses an
> artifact that carries it, so no run can claim `verified 0.10.0` on a runtime a
> consumer cannot install. There is still **no scenario** for `zIndex`; the Rust
> unit tests below are its only automated guard.

## 1. Goal

GPUix 0.10.0 has no stacking primitive: siblings paint in tree order and
`elements_at` walks that order backwards. A Surface, Tooltip or Toast therefore
has to be the **last** child of the root, and a component cannot lift a card
over a later sibling.

Add the smallest field that removes that constraint — `StyleDesc.zIndex` — and
use one ordering rule for both paint and hit testing.

**Non-goals:** `transform` / `scale` / `rotate` / `backdropFilter` (GPUI has no
element transform at the pinned revision; plan `524` §2 records the
`0xErwin1/zed` branch that would be needed), CSS stacking contexts, `zIndex` on
in-flow children, and `pointer-events` changes.

## 2. Design

- `style.rs`: `z_index: Option<i64>` (`zIndex` in the JSON contract). `i64`
  because a level is an integer; a fractional value is a decode error, not a
  silently truncated order.
- `retained_tree.rs`: `RetainedTree::paint_order(children) -> Cow<[u64]>`, the
  one shared rule:
  - with no positioned (`absolute` / `fixed`) child that declares a `zIndex`,
    the tree order is returned **borrowed and untouched** — every existing app
    paints exactly as before and pays nothing;
  - otherwise in-flow children keep tree order and come first, then the
    positioned ones stable-sort by `zIndex` (unset is 0). Equal levels keep
    tree order.
  - `Cow` keeps the no-`zIndex` path allocation-free.
- `renderer.rs`: the host-container child loop and the custom-element child
  loop build children in `paint_order`. Only out-of-flow boxes can move, so no
  in-flow layout changes: `absolute` / `fixed` children take their position
  from insets, not from their index.
- `collect_hits`: walks `paint_order` **reversed**, including a deferred
  `anchored` layer's children, so the topmost painted element is the first hit.
- `js/host.ts`: `zIndex?: number` on `StyleDesc`. `packages/react/src/types/host.ts`
  re-exports that type (`export * from "@gpuix/native/host"`), so it needs no
  second definition.

### Why the patch, not the reference clone

`references/` is read-only. The change lands as
`apps/playground/patches/gpuix-zindex.patch`, applied by
`apps/playground/scripts/build-native-binding.sh` after it copies
`references/gpuix` into `.agents/slop/scratch/gpuix-build/gpuix`. The script
reverse-dry-runs the patch first, so a rebuild is idempotent, and a patch that
neither applies nor reverses stops the build instead of producing an artifact
with no `zIndex`.

## 3. Test plan

Rust unit tests in `retained_tree.rs` (they fail when the rule is removed):

| Test | What it guards |
| ---- | -------------- |
| `z_index_orders_positioned_siblings_above_in_flow` | in-flow first, positioned by level |
| `no_z_index_leaves_the_paint_order_alone` | the gate: no declared `zIndex`, no reorder |
| `z_index_hit_order_is_reverse_paint_order` | hit order is the reverse of paint order |

`cargo test --release --lib` on the scratch tree, then the binding build and the
playground smoke suite.

## 4. Results (2026-10-18, darwin-x64)

**Build** — `sh apps/playground/scripts/build-native-binding.sh`: `EXIT=0` in
**11 m 55 s**; `libgpuix_native.dylib` 25 606 504 B, `Mach-O 64-bit dynamically
linked shared library x86_64`. Four warnings, all pre-existing (unused
`browser_platform_is_macos`, `is_empty`, `hash_into`, and the `aws-lc`
compact-unwind linker note); none names a patched file. The rebuild logged
`gpuix-zindex.patch already applied`, and the committed patch was separately
proven to apply forward to pristine files and to reverse-dry-run afterwards.

**Runtime probe** (`.agents/slop/scratch/zindex-probe.mjs`, outside the registry):
two overlapping boxes, id 2 `absolute` and declared **first**, id 3 in-flow.
Without `zIndex`, the click lands on `[3]`; with `zIndex: 2` on id 2 it lands on
`[2]`. That is paint order and GPUI's hit order in one measurement.

**Smoke** — `nub apps/playground/dist/smoke/run.js --only layout-flex`:
`1/1 scenarios passed · capabilities: layout=verified`; and
`--only input-edit` on an isolated package copy: `1/1 · input=verified`
(51 ms). The installed artifact hash was identical before and after the
layout run (`e8064859…`). That check matters:
`apps/playground/node_modules/@gpuix/native` resolves into the machine-wide nub
cache, where a concurrent workstream build replaced the binary mid-session. The
`input-edit` run therefore used a private copy of the package with the same
`e8064859…` binary, linked into `apps/playground/node_modules` for the run and
restored afterwards. `--list` is not a supported flag; the runner ignores it
and executes the whole suite, so the registry list is not a cheap probe.

**Rust** — `cargo test --release --locked --target x86_64-apple-darwin --lib --
retained_tree` in the scratch tree: `27 passed; 0 failed` (242 filtered out),
including
`z_index_orders_positioned_siblings_above_in_flow`,
`no_z_index_leaves_the_paint_order_alone` and
`z_index_hit_order_is_reverse_paint_order`.

**Playground** — `nub run --filter playground test`: **31 files, 397 tests**
passed.

**Gate** — `nub run check`: exit `0`.

A comment-only wording fix after the first build rebuilt in **2 m 50 s** to the
**same bytes** (`e8064859…`), so the smoke and probe measurements above apply to
the final patch. The race below forced one re-run: the isolated copy under
`.agents/slop/scratch/zindex-probe/` loaded `e8064859…` and reproduced
`[3]` → `[2]`.

## 5. Limitations

- Transform, scale and rotate are **not** part of this change; `zoom-in-95` and
  other shadcn transforms stay unsupported (plan `524` §2).
- Only `absolute` / `fixed` children read `zIndex`; an in-flow child keeps tree
  order, because moving it would change flex layout.
- No stacking contexts: `zIndex` orders siblings of one parent only. A nested
  positioned child does not escape its parent's paint slot.
- The **published** 0.10.0 TypeScript declarations (`dist/host.d.ts`) do not
  know `zIndex`; the patched source does. Code in this repo needs a rebuilt
  `@gpuix/native` package or a local type augmentation until the patch is
  published. The runtime accepts the field today because the style object is
  serialized generically.
- The `@gpuix/native` install path is a symlink into the machine-wide nub cache,
  so two worktrees rebuilding the binding overwrite each other's artifact. A
  verification run must hash the `.node` before and after; this run's smoke
  result was produced with the hash unchanged.
