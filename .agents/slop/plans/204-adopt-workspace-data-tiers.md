# 204 — Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4

| Field | Value |
| ----- | ----- |
| Phase | D (data and workspace components) — the semantics reference, written in Phase A |
| Owner | docking + data-grid workstreams (the packages the semantics feed) |
| Depends on | `203-adopt-capability-map.md` (what GPUix provides), `020-gpuix-runtime-capability.md` §3 (what can be verified), PanelUI docs (panel semantics) |
| Status | planned |
| Source | `references/adabraka-ui/src/components/{split_pane,resizable,dock}.rs`, `src/virtual_list.rs`, `src/navigation/{file_tree,status_bar}.rs`, `src/overlays/command_palette.rs` (MIT, `Copyright (c) 2025 Adabraka Team`), commit `e158684` |

This plan is self-contained. Tier 4 is the hardest tier and PanelUI is
documentation-only; `adabraka` ships real implementations of exactly these pieces,
with 144 runnable examples. This plan reads them and writes the **semantics**
down. It is a re-expression task: `adabraka` is Rust over a **GPUI fork**, so no
source is copied.

---

## 1. GPUix already provides some of this — start there

Audit before writing anything (verified against published 0.10.0):

| `adabraka` piece | GPUix 0.10.0 | Verdict |
| ---------------- | ------------ | ------- |
| `virtual_list` (`UniformVirtualList`, `VariableVirtualList`) | `<virtual-list>` host element with visible-range and scroll-anchor APIs | **provided** — API-shape work, not implementation |
| `dock` (panel groups) | `div` + flexbox + `motion` | **new** — semantics ours |
| `split_pane` (ratio + min/max + collapse) | `div` + pointer events; `col-resize`/`row-resize` cursors provided | **new** |
| `resizable` (`ResizablePanelGroup`) | as above | **new** |
| `file_tree` | `<virtual-list>` + indentation | **new** — hierarchical virtualization ours |
| `status_bar` | `div` + `<text>` | **new** |
| `command_palette` | `<input>` + `FloatingLayer` + `<anchored>` + `<virtual-list>` | **new** — the overlay and list are provided primitives |
| `app_menu` | the macOS menu bar is a renderer API; cross-platform menus are ours | **new (partial)** |
| `data_grid` | grid + `<virtual-list>` | **new** |

Do **not** re-implement `<virtual-list>`; do **not** claim `dock` is provided.

## 2. The document to write

Create `docs/workspace-semantics.md`. For each piece, record the state model and
the interaction rules in React/GPUix terms — the same shape plan `201` mandates
(pure runtime, commands in, style-state out):

1. **`split_pane`** — `SplitPaneState`: `ratio`, `minFirst`, `maxFirst`,
   `minSecond`, `maxSecond`, `collapse`, `expand`, `toggleCollapse`;
   `SplitDirection`; `CollapsiblePane`. Rules: which edge wins when both min
   constraints conflict; the drag-to-resize command sequence; the collapse
   threshold; keyboard resize (arrow keys) and its step.
2. **`resizable`** — `ResizablePanelGroup` composition over `split_pane`: panel
   ids, default sizes, persistence hook (app-owned — no renderer storage).
3. **`dock`** — panel groups, nested arrangements, tab movement, and the
   detach/move question. **Record honestly** that detachable tabs need a
   drag-and-portal model and that GPUix has no drag host feature (verified) — so
   detachable tabs are `unverified` until the smoke test proves a pointer-driven
   move works.
4. **`virtual_list`** — cite GPUix's `<virtual-list>` API directly (`itemCount`,
   overscan, visible-range, scroll-anchor); do not restate `adabraka`'s
   `UniformVirtualList`/`VariableVirtualList` except to name the row-height
   strategy each implies.
5. **`file_tree`** — flattening a tree into a `<virtual-list>` of visible rows,
   expansion state, keyboard navigation, and the selection model.
6. **`status_bar`** — slots, priority/overflow under narrow width.
7. **`command_palette`** — the open/close lifecycle over `FloatingLayer`, the
   query → filtered-rows pipeline, keyboard selection, and the `aria-*` subset
   (`role`, `aria-selected`) — no `aria-activedescendant` (unsupported).
8. **`data_grid`** — column model, sort, selection, resize, and how rows map onto
   `<virtual-list>`.

Close with a **dependency order** for Tier 3–4: `split_pane` → `resizable` →
`dock` → (`tabs` + panels) → `status_bar`; and `data_grid` → (`tree views` →
`file_tree`); `command_palette` depends only on `200`/`201`.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `docs/workspace-semantics.md` | **create** — §2 |
| `docs/README.md` | add the `workspace-semantics.md` row (Phase A/D) |
| `PLAN.md` §4 | decision row: Tier 3–4 semantics follow this document; `<virtual-list>` is reused, not re-implemented |
| `LICENSES/adabraka-ui.md` | MIT + `Copyright (c) 2025 Adabraka Team`; **semantics referenced, no source or asset copied** |
| `TODO.md` | a Phase D task per §2's dependency order, and the detachable-tabs `unverified` item |

Do **not** create `packages/docking` or `packages/data-grid` here — this plan
produces the semantics those plans consume.

## 4. Commands and expected results

```sh
ls references/adabraka-ui/examples | wc -l                     # expected: 144
grep -n "min_first\|minSecond\|minFirst" docs/workspace-semantics.md   # expected: >= 1
grep -n "virtual-list" docs/workspace-semantics.md             # expected: reused, not re-implemented
grep -n "unverified" docs/workspace-semantics.md               # expected: detachable tabs + terminal surfaces
nub run check                                                   # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- a semantics rule cannot be stated without a GPUix capability plan `203` marks
  not supported (drag, sticky, scroll snap, z-index) — mark the piece
  `unverified`, name the missing capability, and stop short of promising it;
- you are about to copy Rust source rather than re-express the semantics;
- `<virtual-list>`'s published API differs from the README (re-read
  `workspaces/*/node_modules/@gpuix/native/dist/host.d.ts` and
  `@gpuix/react/dist/index.d.ts` first);
- you are tempted to copy `adabraka`'s assets (3,274 unlicensed icon files, Inter
  / JetBrains Mono TTFs, `sample.mp3`) — never.

## 6. Test plan

- A `docs/` contract test asserts `workspace-semantics.md` names the
  `<virtual-list>` API and marks detachable tabs `unverified`; removing the
  `unverified` marker fails it.
- The **behavioural** tests belong to the Tier 3–4 component plans: each state
  rule here becomes a pure-runtime test (plan `201` shape) that fails when the
  rule is broken. This plan ships no behaviour, so it ships no runtime test.
- Where a rule is unverified, the plan's acceptance requires the honest marker,
  not a test.

## 7. Acceptance criteria

- `docs/workspace-semantics.md` exists, covers all nine pieces, and states each
  piece's GPUix provision honestly.
- The dependency order is recorded and `TODO.md` has a Phase D task per step.
- `<virtual-list>` is reused, not re-implemented; detachable tabs are
  `unverified` with the reason.
- No source and no asset copied.
