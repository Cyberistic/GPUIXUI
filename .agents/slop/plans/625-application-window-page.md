# 625 — The application window: options, methods, insets, chrome and the file picker

**Phase:** F (docs completeness — a whole runtime surface with no owner)
**Workstream:** docs-site
**Depends on:** 410 (site), 448 (capabilities), 584 (installation pins),
607 (typography/insets vocabulary), 615 (app-shell composition), 624 (the
installed-declarations guard pattern)
**Status:** implemented

---

## 1. The measured gap

The library documents what happens **inside** one GPUix window and nothing about
the window itself. `@gpuix/react`'s `render()` opens it, `@gpuix/native`'s
`WindowOptions` configures it, and `GpuixRenderer` exposes ten methods for it —
none of which the site names.

Measured 2026-10-20 at `69dc06ef` with the real search API (`search(query, 3)`,
first three results):

| Query | First result before the fix |
| ----- | --------------------------- |
| `window` | `/docs/theming`, `/docs/patterns/app-shell`, `/docs/performance` |
| `application window` | `/docs/patterns/app-shell`, `/docs/installation`, `/docs/dark-mode#the-application-owns-the-mode` |
| `titlebar` | `/docs/patterns/app-shell` |
| `title bar transparent` | `/docs/components/alert`, `/docs/patterns/app-shell` |
| `traffic lights` | `/docs/api-values`, `/docs/theming#semantic-roles` |
| `traffic light position` | `/docs/dark-mode#a-resolved-theme-not-a-class` |
| `window controls` | `/docs/theming#scales-and-control-metrics`, `/docs/patterns` |
| `window size` | `/docs/styling`, `/docs/components/spinner#accessibility-and-limitations` |
| `window insets` | `/docs/components/skeleton`, `/docs/performance#the-painted-window` |
| `safe area` | `/docs/components/text-area`, `/docs/components/scroll-area` |
| `ime` | `/docs/roadmap`, `/docs/components/otp-field` |
| `keyboard inset` | `/docs/components/keycap`, `/docs/theming#motion` |
| `fullscreen` | **nothing** |
| `minimize` | **nothing** |
| `maximize` | **nothing** |
| `set window title` | `/docs/patterns/settings-form`, `/docs/components/alert` |
| `wayland` | **nothing** |
| `layer shell` | `/docs/patterns/app-shell` |
| `gnome` / `kde` | **nothing** |
| `system tray` | `/docs/dark-mode`, `/docs/theming` |
| `menu bar` | `/docs/components/navigation-menu` |
| `native menu` | `/docs/components/context-menu`, `/docs/components/dropdown-menu` |
| `app menu` | `/docs/roadmap`, `/docs/patterns/app-shell` |
| `debug frame overlay` / `frame overlay` | `/docs/patterns/app-shell` |
| `devtools` | **nothing** |
| `transparent window` | `/docs/performance#the-painted-window` |
| `blurred background` | `/docs/styling#the-supported-surface` |
| `app id` | `/docs/patterns/app-shell` |
| `init window` | `/docs/performance#the-painted-window` |
| `render options` | `/docs/components/combobox`, `/docs/components/radio-group` |
| `file dialog` | `/docs/components/dialog`, `/docs/components/confirm-dialog` |

The pattern is structural: the window is not a component, so no component page,
no preview tier and no generated props table owns it. `MISSION.md` requires
window-level chrome (Tier 4 title bars, status bars, toolbars) and honest
documentation of what the runtime provides; the App shell pattern draws an
in-content frame but never says where the real window's configuration lives.

## 2. The surface that exists (read from the installed declarations)

`node_modules/@gpuix/native/index.d.ts` (resolved from `apps/docs`):

- `interface WindowOptions` — 17 fields: `title`, `appName`, `width`, `height`,
  `minWidth`, `minHeight`, `resizable`, `fullscreen`, `transparent`,
  `titlebarTransparent`, `windowBackground`, `trafficLightX`, `trafficLightY`,
  `focus`, `show`, `appId`, `layerShell`.
- `interface LayerShellOptions` — 7 fields: `namespace`, `layer`, `anchor`,
  `exclusiveZone`, `exclusiveEdge`, `margin`, `keyboardInteractivity`.
- `interface WindowInsets` — `safeArea`, `ime`, `effective` (each `EdgeInsets`
  with `top`, `right`, `bottom`, `left`). `dist/host-runtime.d.ts` extends the
  same name with `keyboardTop`, `keyboardVisible` and `visibleHeight`, which is
  the shape `useWindowInsets()` returns; the page documents all six.
- `interface PathPromptOptions` — `files`, `directories`, `multiple`, `prompt`.
- `class GpuixRenderer` window methods: `init`, `getWindowSize`,
  `getWindowInsets`, `activateWindow`, `minimizeWindow`, `zoomWindow`,
  `toggleFullscreen`, `setWindowTitle`, `promptForPaths`,
  `setDebugFrameOverlay`, `cycleDebugFrameOverlay`, `getDebugFrameOverlay`,
  `resetDebugFrameOverlayStats`, `getDebugFrameOverlayStats`.

`node_modules/@gpuix/react/dist/reconciler/renderer.d.ts`:

- `RenderOptions extends WindowOptions, WindowKeyEventHandlers` plus `onEvent`,
  `renderer`, `debugFrameOverlay`.
- `render(node, options?)` is the entry; `createRoot(renderer, handlers?)`
  mounts a custom root; `resetRender()` clears the mount state.

`node_modules/@gpuix/react/dist/hooks/use-window-size.d.ts`:

- `useWindowSize(options?)` and `useWindowInsets(options?)`, sampled every 100 ms
  by default.

`apps/playground/src/main.tsx` is the real entry: `render(<App />, { title,
width: 1100, height: 720 })` after a runtime preflight, and its header records
that `render()` is called exactly once because GPUix throws on a second call.

### What is not provided (each claim must stay true)

- No system-tray or menu-bar-item API: no `tray` symbol in the declarations.
- No native application-menu API: the `appName` doc says macOS takes the menu
  title from the executable and only a `.app` bundle changes it; `appName` names
  the Hide/Quit items only.
- No window position (`x`/`y`) and no always-on-top field in `WindowOptions`.
- One window per process: `render()` is not re-entrant.
- No browser DevTools or element inspector; the runtime's own debug frame
  overlay is the built-in frame tool.

## 3. The page: `/docs/window` — "Application window"

Placement: after `workspace` in `content/docs/meta.json`, because it is the
desktop frame the workspace compositions live in.

Sections, in order:

1. **Intro** — the library paints inside one native window; `@gpuix/react` opens
   it, `@gpuix/native` owns the options, the component library owns nothing
   outside the window.
2. `## Opening the window` — `render` signature, the playground's real call, a
   note that a second `render()` throws.
3. `## Options` — `<WindowOptionsTable />`, grouped into identity, geometry,
   appearance, lifecycle, Linux.
4. `## Window methods` — `<WindowMethodsTable />` and the recipe
   `const renderer = useGpuixRequired(); renderer.toggleFullscreen?.()` — the
   methods are optional on `NativeRenderer`, so they are optional calls.
5. `## Size and insets` — `<WindowInsetsTable />`, `useWindowSize` /
   `useWindowInsets`, safe area vs IME vs effective, 100 ms sampling.
6. `## Custom window chrome` — `titlebarTransparent`, `trafficLightX/Y`,
   `windowBackground` (`opaque`/`transparent`/`blurred`), why the traffic lights
   stay native, link to the App shell pattern for the in-content frame.
7. `## Wayland layer shell` — `<LayerShellTable />`, the bar/dock/overlay use,
   `appId` being required in practice for compositor rules.
8. `## Native file picker` — `promptForPaths` + `<PathPromptTable />`, cancel
   returns `null`, the picker is the OS dialog and not a component.
9. `## The frame overlay` — `setDebugFrameOverlay("hidden" | "minimal" |
   "full")`, `cycleDebugFrameOverlay`, the stats tuple, the `debugFrameOverlay`
   render option; this is the runtime's measurement tool, not DevTools.
10. `## What the window does not provide` — the five absences in §2, each with
    its evidence, and what to do instead (App shell for chrome, the app owns the
    menu, one window).
11. `## Related` — App shell, Styling, Performance, Installation, Dark mode.

The page is a host-application page, not a component page: it has no record, no
preview tier and no `auto-type-table`. Every table is rendered from
`src/lib/window-surface.ts`, so a runtime upgrade changes the page by regenerating
a module, not by remembering.

## 4. Files to create or change

Create:

1. `apps/docs/src/lib/window-surface.ts`
   - `WindowField { name, summary }`, `WindowFamily { id, title, note, fields }`,
     `WindowMethod { name, summary }`, `WindowAbsence { subject, statement,
     symbol }`, `pathPromptFields`.
   - `windowFamilies` covering all 17 `WindowOptions` fields exactly once.
   - `layerShellFields` covering all 8 `LayerShellOptions` fields.
   - `windowInsets`: the three `WindowInsets` names with their meanings.
   - `windowRendererMethods`: the 14 methods in §2 with reader-facing summaries.
   - `pathPromptFields`: the 4 `PathPromptOptions` fields.
   - `windowAbsences`: the five rows in §2.
   - Pure parsers: `interfaceBody(declarations, name)`,
     `interfaceFieldNames(body)`, `rendererWindowMethodNames(declarations)`,
     and `windowSurfaceViolations({ declarations, families, layerShell,
     insets, methods, pathPrompt, absences })` returning named strings.
2. `apps/docs/src/lib/window-surface.test.ts` — the pure rule against the
   installed declarations plus fixtures; both directions.
3. `apps/docs/src/components/window-tables.tsx` — `WindowOptionsTable`,
   `WindowMethodsTable`, `WindowInsetsTable`, `LayerShellTable`,
   `PathPromptTable`, sharing one `Rows` renderer. `data-window-field`,
   `data-window-method`, `data-window-absence`, `data-layer-field`,
   `data-inset`, `data-path-field` attributes for the markup guard.
4. `apps/docs/src/components/window-tables.test.tsx` — `renderToStaticMarkup`
   over each table; one row per declared name, no dropped summary.
5. `apps/docs/content/docs/window.mdx` — the page in §3.
6. `apps/docs/src/window-page.test.ts` — page/declaration/search guards.

Change:

7. `apps/docs/src/components/mdx.tsx` — register the five table components.
8. `apps/docs/content/docs/meta.json` — add `"window"` after `"workspace"`.
9. `apps/docs/src/lib/page-aliases.ts` — a new block for `/docs/window`:
   `traffic light`, `traffic lights`, `window controls`, `window chrome`,
   `native title bar`, `titlebar`, `title bar transparent`, `fullscreen`,
   `full screen`, `minimize`, `maximize`, `set window title`, `window title`,
   `wayland`, `layer shell`, `safe area`, `window insets`, `keyboard inset`,
   `ime`, `system tray`, `tray icon`, `native menu`, `application menu`,
   `transparent window`, `blurred background`, `debug frame overlay`,
   `frame overlay`, `devtools`, `file dialog`, `file picker`, `path picker`,
   `app id`. `gnome` and `kde` join Theming's platform aliases instead: a Linux
   desktop-environment question is about the platform **style**, not the window.
   Extend the doc comment with the measured block (plan 625).
10. `apps/docs/src/lib/page-aliases.test.ts` — the same terms as `owned` rows,
    plus regressions: `title bar`, `titlebar` and `window chrome` stay
    `/docs/patterns/app-shell`, `window size` stays `/docs/styling`, `menu bar`
    stays `/docs/components/navigation-menu`, `dialog` stays
    `/docs/components/dialog`, `menu` stays on the menu pages, `windows` stays
    `/docs/theming` (the platform style), and `window` pins the new page's
    title-token match.
11. `apps/docs/src/pattern-pages.test.ts` or `apps/docs/src/lib/page-aliases`?
    **No** — only the two files above.
12. `apps/docs/content/docs/patterns/app-shell.mdx` — the "not docking" paragraph
    links Application window for the real OS chrome.
13. `apps/docs/content/docs/performance.mdx` — the "not measured" list links the
    runtime's frame overlay as the available tool.
14. `apps/docs/scripts/smoke-build.ts` — two production search checks:
    `traffic lights` → `/docs/window`, `fullscreen` → `/docs/window`.
15. `apps/docs/README.md` — a short paragraph beside the other page-ownership
    notes: what the page owns, its tables and its guards.
16. `TODO.md` — a ticked docs-site row for plan 625.
17. `.agents/slop/plans/README.md` — index row for 625.

## 5. Guards, in both directions

`windowSurfaceViolations` fails, by name, when:

- the installed declarations declare no `WindowOptions` body (the parse target
  moved);
- an authored field is not in the installed interface (a rename or a typo);
- an installed field has no authored row (a new runtime option the page cannot
  explain);
- a field is authored twice, or a family has no fields;
- the installed `LayerShellOptions` / `WindowInsets` / `PathPromptOptions`
  names and the authored rows disagree;
- an authored window method is missing from `GpuixRenderer`, or the installed
  class carries a window-shaped method (`init`, `activateWindow`,
  `*Window*`, `*Fullscreen*`, `*Title*`, `*Minimize*`, `*Zoom*`,
  `*DebugFrameOverlay*`, `*Insets*`, `promptForPaths`) the page does not list;
- an absence claim's symbol now exists in the declarations.

`window-page.test.ts` fails when:

- the page is missing, its title is not `Application window`, or its
  description does not name the window subjects (search evidence);
- one of the five table blocks is missing or duplicated;
- a required section heading is gone;
- each absence sentence is not present;
- an owned query (`traffic lights`, `fullscreen`, `wayland`, `system tray`,
  `devtools`, `file dialog`, `window insets`, `safe area`, `minimize`,
  `set window title`, `layer shell`, `debug frame overlay`) does not return
  `/docs/window` first from the real `search()`;
- a regression query loses its owner (`title bar` → App shell, `dialog` →
  Dialogs, `menu` → a menu page, `table` → Data display).

`window-tables.test.tsx` fails when a table renders fewer rows than the module
declares, prints a raw enum, or drops a summary.

## 6. Two-direction proofs to run (and record)

1. Delete `trafficLightX` from `windowFamilies` → `window-surface.test.ts`
   fails: `trafficLightX: installed but undocumented`.
2. Add a fixture field `setWindowOpacity` to the renderer class fixture →
   the method rule fails by name.
3. Remove `<WindowOptionsTable />` from `window.mdx` → the page test fails:
   `Options table is missing`.
4. Remove the `traffic lights` alias → the owned query returns
   `/docs/api-values` and `window-page.test.ts` fails.
5. Rename the authored method `toggleFullscreen` → `toggleFullScreen` → the
   method guard fails: not on `GpuixRenderer`.
6. Add a `TrayOptions`/`alwaysOnTop` symbol to a declarations fixture → the
   absence rule fails: the page still says it is absent.

Each reverted proof is recorded in §9 after implementation.

## 7. Commands and expected results

Run from `apps/docs`:

```sh
nub exec vitest run src/lib/window-surface.test.ts
nub exec vitest run src/components/window-tables.test.tsx
nub exec vitest run src/window-page.test.ts src/lib/page-aliases.test.ts
nub run check-types
```

Expected: every file passes; the page test prints the 12 owned queries with
`/docs/window` first.

From the repository root:

```sh
nub run --filter docs smoke:build
```

Expected: the build serves one more page (107 → 108), the crawl passes, and both
new production queries answer with `/docs/window`.

```sh
nub run check
nub run lint
nub run test
```

Expected: all three exit `0`.

## 8. STOP conditions

Stop and report instead of improvising when:

- the installed `WindowOptions` (or `LayerShellOptions`, `WindowInsets`,
  `PathPromptOptions`) shape differs from §2 — the page is planned against the
  pinned 0.10.0 declarations, and a different shape is a new plan;
- `@gpuix/react` no longer exports `render`, `useWindowSize` or
  `useWindowInsets`, or `RenderOptions` no longer extends `WindowOptions`;
- adding the page needs a change outside `apps/docs` (the tabs, the installed
  package, `scripts/` beyond the docs app);
- `smoke:build` reports a page that fails the crawl for a reason unrelated to
  this page;
- an owned query cannot return `/docs/window` first without changing the
  ranker — that is a separate measured plan (the page-alias table exists for
  exactly this, and a ranker change is not in scope).

## 9. Measured results

Implemented 2026-10-20 on `agent/docs-site`.

- `src/lib/window-surface.test.ts` — 10 tests; the installed declarations agree
  (`[]` violations), the interface parser finds 7 layer-shell fields and the union
  of the six inset fields, and the renderer scan finds the 14 window methods and
  excludes `setWindowKeyEvents` / `setWindowSelectionChange`.
- `src/components/window-tables.test.tsx` — 6 tests; 17 option rows across five
  families, 7 layer rows, 6 inset rows, 4 path rows, 14 method rows and 5 absence
  rows render, with no empty meaning cell.
- `src/window-page.test.ts` — 21 tests; six table blocks, ten sections, the
  sidebar position, the summary words and 12 owned queries + 4 regressions.
- `src/lib/page-aliases.test.ts` — 427 tests, including the new owned terms.
- The docs suite is **139 files / 1 489 tests**, all green.
- `nub run --filter docs check-types` green.
- `nub run --filter docs smoke:build` green at **108 pages / 1 396 anchors**, and
  both new production queries (`traffic lights`, `fullscreen`) answer
  `/docs/window`.

Two-direction proofs, run and reverted:

1. Removed the `trafficLightX` row →
   `WindowOptions: trafficLightX is declared but undocumented` (1 failed, 9
   passed).
2. Removed `<WindowOptionsTable />` from the page → `renders each generated
   table exactly once` fails with length 1 instead of 2 (1 failed, 20 passed).
3. Renamed the authored `toggleFullscreen` to `toggleFullScreen` → two failures:
   the invented name is not on `GpuixRenderer`, and the real method is
   undocumented (2 failed, 8 passed).
4. Removed the `devtools` alias → `devtools → /docs/window` returns `undefined`
   (1 failed, 20 passed). This is the alias-load-bearing case: removing
   `traffic lights` still passed, because the page's summary and body already
   name it.
5. The `setWindowOpacity` fixture proves an added runtime method fails by name,
   and the `TrayOptions` fixture proves a filled absence fails by name (both are
   permanent cases, not manual runs).

Corrections made during implementation, recorded because they changed the plan:

- `gnome` and `kde` moved from `/docs/window` to `/docs/theming`: a Linux
  desktop-environment question is about the platform style, and the window page
  does not claim to support a specific compositor.
- `titlebar`, `window chrome`, `window size`, `menu bar` and `windows` already
  had owners; the new table could not take them, so they are pinned as
  regressions instead (`App shell`, `Styling`, `Navigation menu` and Theming).
- `WindowInsets` is declared twice in the installed package; the union is what
  `useWindowInsets()` returns, so the page documents six fields, not three.

## 10. Acceptance

- `/docs/window` renders every window option, layer-shell field, inset field,
  path-prompt field and window method from the installed declarations, in
  grouped tables.
- The page states the five absences with evidence, links the App shell pattern
  and the Performance overlay.
- Twelve measured queries return the page first; four regressions keep their
  owners; two production queries pass in `smoke:build`.
- `nub run check`, `nub run lint` and `nub run test` pass.
- The plan index has a 625 row and `TODO.md` is ticked.
