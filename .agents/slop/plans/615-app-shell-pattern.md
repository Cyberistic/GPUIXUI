# 615 — App shell: the composed desktop layout on the live surface

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 427, 455, 456, 486, 503, 517, 521, 522, 523, 575

## 1. Why this plan exists

`MISSION.md` asks the site to show realistic compositions, and the two pages
that own the question "what does an application look like?" — `/docs/layouts`
and `/docs/workspace` — answer it with a list of primitives and a roadmap link.
Neither page shows the layout composed, and no live scene anywhere proves the
layout primitives together: every tier-L scene is one component or one task
panel.

This plan adds **one docs-owned composition**, `/docs/patterns/app-shell`: a
title bar, a collapsible navigation rail, a scrolling content region and a
status bar, built only from shipped packages. It is the fifth composed live
scene and the fourth pattern page with a real surface.

It is deliberately **not** a docking component. `packages/docking` is still a
target; resizable splits, panel groups and detachable tabs remain its job. The
page states that boundary and links the roadmap, exactly as
`/docs/patterns/project-browser` says it is a list and not a table.

## 2. Current state (measured 2026-10-20, `468e91d3`)

- `LIVE_SCENES` has **49** keys: **45** record scenes and **four** composed pages
  (`showcase`, `confirmation-flow`, `command-palette`, `project-browser`).
- **26** scenes are gesture-driven (`SCENE_GESTURE`), **23** mount in the state
  they document. `SceneStep` supports `click`, `click-text`, `hover`, `press`,
  `fill` and `wheel`.
- `preview-gaps.test.ts` derives every prose total from those tables: the
  document's scene count, record/composed split, gesture counts (document **and**
  README), README's `(N today)` and `N of those`, the template's scene count and
  pattern-page word, and one gesture-table row per gesture scene.
- `pattern-pages.test.ts` requires every pattern page to carry
  `## The task`, `## Composition`, `## State`, `## What is verified`,
  `## Source`, `## Related`, a real `<include>`, a sidebar entry, an index link,
  no placeholder prose, and every `nub run --filter` command to exist.
- The shipped primitives that make the composition real: `Stack` (`grow`,
  `fullWidth`, `fullHeight`), `Box` (surface tone, padding, border), `Separator`
  (horizontal/vertical), `ScrollArea`, `Text` (roles + tones), `Button`
  (variant/size/label/leading), `useTheme`. `Badge`, `Avatar` and `Tooltip` come
  from `@gpuixui/components`.
- Measured runtime facts the layout must respect: a flex child needs
  `minHeight: 0` before `overflowY: "scroll"` scrolls `COMPONENTS.md`), and the
  window is 640×520 (`preview/main.tsx`).

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `apps/docs/preview/patterns/app-shell.tsx` | the real composition: title bar, nav rail, content, status bar; owns the nav-open flag |
| `apps/docs/content/docs/patterns/app-shell.mdx` | the pattern page |
| `.agents/slop/plans/615-app-shell-pattern.md` | this plan |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scene-contract.ts` | `app-shell` in `LIVE_SCENES`; `SCENE_PAGE`, `SCENE_LABEL`, `SCENE_GESTURE`, `SCENE_INTERACTION` |
| `apps/docs/preview/scenes.ts` | the `SCENE_TEXT` expectation |
| `apps/docs/preview/scene-views.tsx` | import `AppShell` and register it in `LIVE_SCENE_VIEWS` |
| `apps/docs/content/docs/patterns/meta.json` | sidebar entry after `project-browser` |
| `apps/docs/content/docs/patterns/index.mdx` | a fifth pattern section |
| `apps/docs/content/docs/layouts.mdx` | link the composition as the worked example |
| `apps/docs/content/docs/workspace.mdx` | link the composition and keep the docking boundary |
| `apps/docs/content/docs/component-pages.mdx` | 50 scenes; four pattern pages with a scene |
| `apps/docs/README.md` | 27 of those; four composed pattern screens |
| `docs/preview-strategy.md` | 50 scenes, 45 + five composed, 27 gestures, tier-L composed names, one gesture row |
| `apps/docs/src/lib/search.test.ts` | one integration query: `app shell` reaches the page |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | the workstream task and the progress count (181 → 182) |

## 4. The composition

`apps/docs/preview/patterns/app-shell.tsx`, with
`/** @jsxImportSource @gpuix/react */` on the first line (every preview file
needs it). Imports by subpath for components and from `@gpuixui/primitives` for
the layout.

```text
Stack(column, fullWidth, fullHeight, background)
├─ Box(background, padding md)            title bar
│  └─ Stack(row, between, align center)
│     ├─ Stack(row, gap sm, align center)
│     │  ├─ Text(bodyStrong)  "GPUIXUI"
│     │  └─ Badge(neutral, sm) "Desktop"
│     └─ Stack(row, gap sm, align center)
│        ├─ Button(primary, sm) "New project"      onActivate -> adds a row
│        └─ Avatar(name="Ada Lovelace", sm, online)
├─ Separator
├─ Stack(row, grow)
│  ├─ Box(muted, padding sm, width 176 | 44)          nav rail
│  │  └─ Stack(column, gap xs)
│  │     ├─ Button(ghost, sm, square, label="Toggle navigation",
│  │     │         leading=<Icon name="chevrons-up-down" .../>,
│  │     │         testId="scene-shell-toggle")
│  │     └─ open ? nav items : null
│  ├─ Separator(vertical)
│  └─ ScrollArea(style {grow:1, minHeight:0})         content
│     └─ Stack(column, gap lg, padding lg)
│        ├─ Text(h2) "Deployments"
│        ├─ Text(caption, muted) "3 environments · last deploy 4 minutes ago"
│        └─ three Card rows: name, Badge status, Text description
├─ Separator
└─ Box(muted, padding sm)                 status bar
   └─ Stack(row, between)
      ├─ Text(caption, muted) "Connected · 3 people"
      └─ Text(caption, mono?) "⌘K"
```

Nav items are data (`Overview`, `Members`, `Activity`, `Settings`). They render
only while the rail is open, so the gesture has an observable result.

Rules:

- Every colour, space, radius and type value comes from the theme or a
  component's own props. No colour literal, no pixel spacing except the rail's
  two widths (the runtime needs a bounded width; the pages already use numbers
  for geometry) and the scene's own content.
- `Stack`/`Box` take `grow`, `fullWidth`, `fullHeight`; the content region is the
  only scroller and gets `minHeight: 0` (the measured scroll rule).
- No `position`, no z-index, no portal: the shell is normal flex flow.
- The composition is one file. No separate logic module — the only rule is
  "include the nav labels when open", which is a boolean.

### 4.1 The gesture

```ts
"app-shell": [{ kind: "click", testId: "scene-shell-toggle" }]
```

`SCENE_TEXT["app-shell"] = "Members"`. The rail starts **closed**, so the first
frame is a real shell with a narrow rail; the toggle opens it and `Members`
appears. An open rail on mount would paint the word before the step, which the
smoke's before-assertion refuses. (The expectation was first written as
`Activity`, which also occurs in another scene's heading, so the contract guard
could not prove the nav item was the source; `Members` occurs in this
composition only.)

The toggle's `testId` is on the `Button`; the smoke finds it by test id (the
`scene-contract` guard checks the literal occurs in the view source).

## 5. The page

`content/docs/patterns/app-shell.mdx` follows the pattern contract.

- **Frontmatter:** `title: App shell`; description naming the composition
  (title bar, collapsible navigation, scrolling content, status bar) and the
  boundary (not docking).
- **Intro:** the task and the honest tier (GPUix's published WebAssembly
  renderer, not the desktop binary); resizable splits and panel groups remain
  `packages/docking`.
- `## The task` — an application window: a title bar, a nav rail a reader can
  collapse, a scrolling content region, a status bar; the composition owns the
  rail's open state.
- `## Composition` — `<LiveSurface scene="app-shell" title="App shell" />`, then
  the parts list with what each owns.
- `## State` — the rail flag and the deployment list are the page's; the
  primitives own nothing here; no persistence (an application owns its storage;
  `packages/docking` will own panel state).
- `## What is verified` — a table with `nub run --filter docs smoke:preview`
  (clicks the toggle, asserts `Activity` absent before / present after),
  the component and primitive suites the composition relies on, and
  `nub run --filter docs test` (the scene contract, the page's sections and the
  derived totals). Limits: wasm renderer, in-memory rows, no resizing, no
  persistence.
- `## Source` — `<include>` of `preview/patterns/app-shell.tsx`.
- `## Related` — Layouts, Workspace, Stack, Box, ScrollArea, Separator,
  Patterns, Roadmap.

`/docs/layouts` gains one sentence under its primitive list linking the
composition; `/docs/workspace` gains one sentence saying the shipped layout is
composed today and that resizable splits/docking remain `packages/docking`.

## 6. Derivation updates (the guards force these)

| Where | From | To |
| ----- | ---- | -- |
| `LIVE_SCENES` | 49 | 50 |
| record scenes | 45 | 45 (unchanged) |
| composed pages | four | five |
| gesture scenes | 26 | 27 |
| pattern pages with a scene | three | four |
| `docs/preview-strategy.md` | 49 / 45 / four / 26 / 26 | 50 / 45 / five / 27 / 27; tier-L composed names gain App shell; one gesture row |
| `apps/docs/README.md` | `(45 today)`, three composed pattern, 26 of those | four composed pattern, 27 of those |
| `component-pages.mdx` | 49 scenes, three pattern pages | 50 scenes, four pattern pages |

## 7. Commands and expected results

Run from the repository root unless stated.

| Command | Expected |
| ------- | -------- |
| `cd apps/docs && nub exec vitest run src/components/preview/scene-contract.test.ts src/components/preview/preview-gaps.test.ts src/pattern-pages.test.ts` | all green once the scene, page and totals agree; **fails by name** before the page/totals are added |
| `nub run --filter docs check-types` | exit `0` — the composition type-checks against the real props |
| `nub run --filter docs test` | exit `0`, 125 files / 1 208 + new tests |
| `nub run --filter docs smoke:preview` | exit `0`; the app-shell scene and its page are listed as passing, with `Activity` asserted after one click |
| `nub run --filter docs smoke:build` | exit `0`; page count 105 → 106, links and anchors resolve |
| `nub run check` / `nub run lint` / `nub run test` (root) | exit `0` |

`smoke:preview` takes several minutes (Chrome + the 20 MB wasm); it is the only
gate that proves the gesture, so it is required for this change.

## 8. STOP conditions

- `smoke:preview` cannot run (Chrome or the preview build missing) → **STOP**;
  report exit `2` and do not claim the scene is verified.
- The composition needs a colour literal, a pixel gap, or a style the runtime
  rejects in the native check → **STOP**; report the runtime message instead of
  adding a workaround.
- The gesture cannot find `scene-shell-toggle` → **STOP** and report the scene
  tree; do not move the assertion to text that paints before the click.
- A pattern-contract rule cannot be met without inventing a command or a
  package → **STOP**; the page must not name a check that does not exist.

## 9. Test plan (two directions)

1. `scene-contract.test.ts` — the new expectation must occur in the composition
   source. **Forced defect:** delete the `Activity` nav item; the suite fails
   with `app-shell: Activity`.
2. `preview-gaps.test.ts` — every total is derived. **Forced defect:** leave the
   strategy at `49 scenes ship today`; the suite fails naming 50 vs 49.
3. `pattern-pages.test.ts` — missing section, missing sidebar entry or missing
   index link fails. **Forced defect:** remove `## What is verified` from the
   new page; the guard names it.
4. `smoke:preview` — the scene paints `Activity` only after the click, and the
   page loads the scene. **Forced defect:** render the nav labels unconditionally;
   the before-assertion fails.
5. `smoke:build` — the new page renders, is linked, and its anchors resolve.

Record each forced defect and revert it before committing.

## 10. Acceptance

- `/docs/patterns/app-shell` exists, is in the sidebar and the patterns index,
  and carries the six required sections.
- The scene is 50th in `LIVE_SCENES`, opens its nav with one real click, and is
  driven on its own page by `smoke:preview`.
- Every derived total in the strategy, the README and the template is updated by
  the guard, not by hand-counting.
- Layouts and Workspace link the composition; neither claims docking is shipped.
- `nub run check`, `nub run lint`, `nub run test`, `check-types`, `smoke:build`
  and `smoke:preview` pass.

## 11. Results (measured 2026-10-20)

| Command | Result |
| ------- | ------ |
| `nub run --filter docs check-types` | exit `0` — the composition type-checks against the real props (the first run caught the required `ScrollArea.axis`) |
| `nub run --filter docs test` | 125 files / **1 209** tests pass |
| `nub run --filter docs smoke:preview` | exit `0` — `scene app-shell opened by 1 step(s) — 640x520 canvas, 25 text nodes`; `/docs/patterns/app-shell loaded the live iframe — …&scene=app-shell&…&mode=dark (606x358)` |
| `nub run --filter docs smoke:build` | exit `0` — **106** pages, 233 links, 1 365 anchors |
| `nub run --filter docs smoke:a11y` | exit `0` — 106 pages × 2 schemes, 0 violations |
| `nub run --filter docs smoke:responsive` | exit `0` — 106 pages at 390 px, phone controls and mobile navigation |
| `nub run --filter docs smoke:console` | exit `0` — 106 pages, 0 console errors |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` — 1 209 docs tests |

Forced defects, each run and reverted:

1. **Removed the `Members` nav item** — `scene-contract.test.ts` failed with
   `app-shell: Members`. (The first expectation was `Activity`, which also
   occurs in `scene-views.tsx`'s "Activity log" heading; the guard could not see
   the difference. The expectation moved to a word only this composition
   paints.)
2. **Left the strategy at `49 scenes ship today`** — `preview-gaps.test.ts`
   failed naming 50 vs 49.
3. **Renamed `## What is verified`** — `pattern-pages.test.ts` failed with
   `app-shell: missing "## What is verified"`.
4. **Rendered the nav labels unconditionally** — `smoke:preview` failed with
   `FAIL live scene app-shell: "Members" was painted before the gesture; the
   scene opens itself`, then passed again once the open flag was restored.

