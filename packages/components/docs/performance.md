---
title: Performance
description: The measured cost of the largest supported collection, the method, and the remaining limit.
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
ceilings are deliberately loose — a loaded host is not a regression (plan 327) —
and the suite also asserts that focus actually moved, so a run that measured
nothing cannot pass.

Wall-clock numbers on this shared host vary by 3–4× with other agents' work. The
**deterministic** contract lives in the behaviour suite instead:
`src/behaviour/list.test.tsx` counts calls to each row's public `style` function
and requires a focus move to repaint exactly the two rows whose state changed
(plan 339). Use that test to judge a change; use this table for the order of
magnitude.

## Baseline

Measured 2026-10-18 on the swarm's Intel macOS host (`@gpuix/native@0.10.0`,
locally built `darwin-x64` binding), after plan 339's row subscriptions:

| Phase | 1,000 rows |
| ----- | ---------- |
| Mount | ≈ 1.1 s |
| One `ArrowDown` (roving focus) | ≈ 0.6 s idle, up to ≈ 1.6–2.5 s under load |
| Full re-render, unchanged state | ≈ 0.15 s |
| Rows repainted by one focus move | **2** (was 1,000 before plan 339) |

Before plan 339 the same move measured ≈ 1.0–2.1 s and re-rendered every row:
`List` passed active/selected/tab-stop state through one context. It now
publishes a per-row bit mask (`src/list/row-state.ts`) that each row subscribes
to, and the context carries only stable actions.

## The remaining limit

The repaint cost is now proportional to what changed, but the move still costs
hundreds of milliseconds on a 1,000-row list: the native focus call and the
reconciler's walk over 1,000 children scale with the collection, and this
component does not virtualise. So:

- Keep large collections virtualised or paginated; `List` is designed for tens to
  low hundreds of rows.
- Prefer a menu or combobox for long option sets: they run the same shared
  collection core but render far fewer rows.

## What is not measured

- Rendering under a GPU-bound paint workload (the test renderer measures the
  framework and native build path, not frame pacing).
- Memory growth over time.
- The other component families: they render bounded trees (menus, dialogs,
  tabs) where the per-component cost is not the bottleneck.
