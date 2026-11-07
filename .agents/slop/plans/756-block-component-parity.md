# 756 — Blocks paint with the library's own drawings

| Field | Value |
| --- | --- |
| Status | done — every block page uses the shared tab strip, the shared rail toggle and the package's chart geometry; the pages carry a GitHub source link and no implementation prose |
| Phase | F (docs polish) |
| Depends on | 728–730 (the block contract), 750 (the prose pass), 751–754 (charts) |
| Workstream | docs |
| Risk | low — the drawings are browser approximations; the shared components are docs-side and do not change the library |

## 1. Problem

The block previews grew their own controls. The mail, notification, kanban and
settings drawings each painted a tab strip with a different marker (or none at
all), the rails collapsed with a bare chevron instead of the sidebar's panel
control, and the dashboard hand-stacked its columns with its own axis while the
package's stacked-bar geometry sat unused. The pages also narrated the runtime
and the reference's composition under the screen, and none of them linked the
file that paints the block.

## 2. What landed

- `apps/docs/src/components/docs/tab-strip.tsx` — one animated switcher: a
  measured indicator, roving focus, Arrow/Home/End keys, joined block classes.
  The Tabs page, the notification centre, the mail categories and contact
  history, the kanban views and the Settings block all mount it.
- `RailToggle` draws the sidebar's `panel-left` mark at the same 28px box as
  `SbTrigger`; the mail, kanban, conversations, file-manager and settings rails
  share it.
- The dashboard's three charts read `@gpuixui/data/chart/logic` and
  `geometry`: `groupedBarMarks` (week), `stackedBarMarks` + `stackedScale`
  (hourly) and `ringSegments` (donut), with `axisTicks`/`tickLabel` for the
  axes. `hourlyStack` is the new tested seam. The dashboard-01 and Charts-page
  area curves use `curvePath`; the local `chart-smooth.ts` spline is deleted.
- Single-screen block pages render at the full column (`DocsPage full`), so a
  page-level composition is no longer squeezed into the reading measure; the
  sidebar collection keeps its table of contents. The mail drawing was rebuilt
  for that width: actions on one row, the categories on their own bar, a
  wrapped sender line and prose leading instead of the docs' 28px box.
- Every block page links its drawing on GitHub (`Block source on GitHub` plus
  the repository path); the sidebar collection links each of its sixteen.
- `dashboard.mdx` and `dashboard-01.mdx` keep only the preview. The block-page
  test now budgets prose at 40 words per page, holds the GitHub link's file to
  existence, and holds the dashboard drawing to the package's marks.

## 3. Verification

```sh
nub run --filter @gpuixui/docs test src/lib/block-page.test.ts \
  src/components/docs/tab-strip.test.tsx \
  src/components/docs/dashboard.test.ts \
  src/components/docs/email-inbox-block.test.tsx
nub run --filter @gpuixui/docs check-types
nub run --filter @gpuixui/docs build
nub run --filter @gpuixui/docs blocks:thumbnails --url <dev-server>
```

Checked in the browser at 1280×1000: the indicator moves between tab presses
(`translateX` 0 → 64px, width 62 → 84px, 180ms), ArrowRight moves focus and the
selection, the rail animates 180 → 64px and announces `Expand sidebar`, and
every block page reports a non-zero stage width (948px at the full column).

## 4. Remaining

- `dashboard-01`'s treemap, sankey and sunburst drawings still carry their own
  layout; they should move onto the scene compiler's marks the way the
  dashboard's three charts now do. Recorded in `.agents/slop/TODO.md`.
