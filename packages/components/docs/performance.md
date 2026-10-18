---
title: Performance
description: The measured cost of the largest supported collection, the method, and the known limitation.
---

The library is measured, not assumed. This page records the one collection shape
that has a large upper bound — a `List` of 1,000 rows — and the cost of the
interaction a user feels most: moving the roving focus one row.

## Method

```sh
nub run --filter @gpuixui/components test:perf
```

The suite (`src/perf/list.test.tsx`) renders 1,000 `ListItem`s through the real
GPUix test renderer at 1280×800, focuses the first row, presses `ArrowDown` once,
then re-renders the same tree. It times each phase with `performance.now()` and
asserts only a ceiling: mount < 10 s, a focus move < 5 s, a re-render < 5 s. The
ceilings are an order of magnitude above the baseline on purpose — a loaded host
is not a regression (plan 327). The suite also asserts that focus actually
moved, so a run that measured nothing cannot pass.

Numbers vary with host load, theme and tree size. The table is a baseline for
spotting an order-of-magnitude change, not a benchmark to optimise against.

## Baseline

Measured 2026-10-18 on the swarm's Intel macOS host (`@gpuix/native@0.10.0`,
locally built `darwin-x64` binding):

| Phase | 1,000 rows |
| ----- | ---------- |
| Mount | ≈ 1.1 s |
| One `ArrowDown` (roving focus) | ≈ 1.0–2.1 s |
| Full re-render, unchanged state | ≈ 0.15 s |

## The limitation

**A roving-focus move repaints every row.** `List` shares its active, selected
and tab-stop state through one React context, so a key press re-renders all
1,000 `ListItem`s and the runtime diffs every row's style — that is the ~1–2 s
figure, not layout or focus handling.

What to do today:

- Keep large collections virtualised or paginated; the library's `List` is
  designed for tens to low hundreds of rows.
- Prefer a menu or combobox for long option sets: they run the same shared
  collection core but render far fewer rows.

The follow-up is a row-level subscription (`useSyncExternalStore` per row, a
stable actions context) so a focus move repaints two rows instead of all of
them. It is recorded as a task in `TODO.md`; it is not claimed here.

## What is not measured

- Rendering under a GPU-bound paint workload (the test renderer measures the
  framework and native build path, not frame pacing).
- Memory growth over time.
- The other component families: they render bounded trees (menus, dialogs,
  tabs) where the per-component cost is not the bottleneck.
