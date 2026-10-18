# 530 — `zIndex` in the GPUix binding: paint order and hit order

| Field | Value |
| ----- | ----- |
| Status | in progress |
| Phase | F (native capability) |
| Owner | gpuix-zindex workstream |
| Depends on | `140` (the source build), `529` (binding provenance) |
| Feeds | plan `524` §5 (`packages/tw`), Toast / Dialog / Popover stacking |
| Amends | `524` §5 (the GPUix extension is now applied, not just designed) |

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

## 4. Results

_Filled by the execution run._

## 5. Limitations

- Transform, scale and rotate are **not** part of this change; `zoom-in-95` and
  other shadcn transforms stay unsupported (plan `524` §2).
- Only `absolute` / `fixed` children read `zIndex`; an in-flow child keeps tree
  order, because moving it would change flex layout.
- No stacking contexts: `zIndex` orders siblings of one parent only. A nested
  positioned child does not escape its parent's paint slot.
