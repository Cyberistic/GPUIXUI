# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## How "GPUix support" is decided

Three sources. Only the first two are measured
(`.agents/adr/0001-native-smoke-host.md`, `0002-two-gpuix-versions.md`,
`0003-darwin-x64-source-build.md`,
`.agents/slop/plans/140-gpuix-native-darwin-x64-build.md`):

- **`verified 0.10.0`** — the native smoke suite ran **on this host** against
  the pinned `@gpuix/native@0.10.0`, built from the pinned source with
  `runtime_shaders` (ADR 0003), and the capability passed. Reproduce with
  `nub run --filter playground build && node apps/playground/dist/smoke/run.js`;
  every measured fact is plan `140` §4.
- **`verified 0.5.1`** — measured with the published `@gpuix/native@0.5.1` (the
  last `darwin-x64` release) by `apps/playground/legacy-probe`. Evidence about
  the runtime and the hardware; **never** the basis for a component status.
- **`docs`** — the upstream README/types document it and a probe exists, but no
  run has confirmed it here (e.g. `<canvas>`, `<img>`).
- **`unverified`** — no evidence.

`verified 0.10.0` **is** the basis for a component `done` row: the run happened
here. It is not the published binary's shader path (ADR 0003), so a row names
its provenance; the CI task in `TODO.md` is the gold-standard confirmation with
the published binary.

The suite is **12/12 green here** (exit `0`). What it settled, and what changed
the plans: focus/blur events **do** work on 0.10.0 (they never did on 0.5.1);
synthetic wheel scrolling **does** work (`deltaY` negative scrolls down, the
opposite of the DOM); a `<virtual-list>` **retains** every row but **paints** a
window (~9 of 5 000); an `<anchored>` paints no surface of its own, so overlay
handlers belong on the content div; `autoFocus` takes native focus without
dispatching `onFocus`; and the app-level window key handler
(`render({ onKeyDown })`) receives a keystroke after the focused element's
`onKeyDown` — the command-palette / application-menu path.

## Tier 1 — foundational

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | verified 0.10.0 (text) | |
| Icons | todo | docs (`<svg>`, `<img>`) | not probed |
| Separators | todo | verified 0.10.0 (layout) | |
| Spacers | todo | verified 0.10.0 (layout) | |
| Stack / layout primitives | todo | verified 0.10.0 (layout) | flex/grid/gap/absolute, bounds exact |
| Boxes / containers | todo | verified 0.10.0 (layout) | |
| Scrollable containers | todo | verified 0.10.0 (scroll) | wheel + `onScroll` + `scrollTo`/`scrollIntoView`; `deltaY` negative scrolls down |
| Buttons | todo | verified 0.10.0 (click) | no native `<button>`; a `tabIndex` div + `onClick` |
| Button groups | todo | verified 0.10.0 (layout) | composition |
| Labels | todo | verified 0.10.0 (text) | |
| Text inputs | todo | verified 0.10.0 (input) | `onChange`/`onSubmit` fire; `autoFocus` or a click needed for keys |
| Text areas | todo | verified 0.10.0 (input) | multiline verified |
| Checkboxes | todo | docs (composition; click verified 0.10.0) | |
| Radio groups | todo | docs (composition; focus verified 0.10.0) | `onFocus`/`onBlur` fire |
| Selects | todo | docs (composition; overlay + Escape verified 0.10.0) | |
| Switches | todo | docs (composition; click verified 0.10.0) | |
| Progress | todo | docs (layout verified 0.10.0) | |
| Tooltips | todo | docs (anchored overlay verified 0.10.0) | |
| Skeletons | todo | docs (layout verified 0.10.0) | |
| Loading indicators | todo | docs (layout verified 0.10.0) | |

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | todo | verified 0.10.0 (layout) | |
| Badges | todo | docs (layout verified 0.10.0) | |
| Avatars | todo | docs (layout verified 0.10.0) | |
| Lists / list items | todo | verified 0.10.0 (layout) | |
| Empty states | todo | docs (layout verified 0.10.0) | |
| Alerts | todo | docs (layout verified 0.10.0) | |
| Inline validation | todo | docs (input verified 0.10.0) | |
| Toasts / notifications | todo | docs (anchored overlay verified 0.10.0) | |
| Dialogs | todo | verified 0.10.0 (overlay) | open, Escape, outside click; handlers on the content div |
| Confirmation dialogs | todo | docs (Dialog composed with a form) | |
| Popovers | todo | verified 0.10.0 (overlay) | |
| Dropdown menus | todo | verified 0.10.0 (overlay + click) | |
| Context menus | todo | docs (anchored overlay; no z-index, deferred layers only) | |
| Command menus | todo | docs | |
| Tabs | todo | verified 0.10.0 (workspace) | tab click/active verified; drag between panes verified |
| Accordions | todo | docs (layout verified 0.10.0) | |
| Collapsible sections | todo | docs (layout verified 0.10.0) | |
| Breadcrumbs | todo | docs | |
| Pagination | todo | docs | |
| Search inputs | todo | docs (input verified 0.10.0) | |
| Comboboxes | todo | docs (input + overlay verified 0.10.0) | |
| Date / time pickers | todo | docs | |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | verified 0.10.0 (scenario `table-select-sort`) | composition: flex rows, `overflow:"scroll"` parent |
| Sortable tables | todo | verified 0.10.0 (scenario `table-select-sort`) | sort is React state |
| Row selection | todo | verified 0.10.0 (scenario `table-select-sort`) | a row scrolled out of the parent is laid out beyond the window, so a click at its bounds misses |
| Column configuration | todo | docs | |
| Resizable columns | todo | verified 0.10.0 (scenario `table-column-resize`) | pointer capture; drag + clamp |
| Filtering controls | todo | docs | |
| Data toolbars | todo | docs | |
| Virtualized lists | todo | verified 0.10.0 (scenario `virtual-list-window`) | children mode retains all rows, GPUI **paints** ~9 of 5 000; `getPaintedText` is the window; no own bounds; `onVisibleRange` fires on scroll |
| Virtualized tables | todo | docs (probe: plan `130` `table-select-sort`) | |
| Tree views | todo | docs (composition over verified layout primitives) | |
| Expandable rows | todo | docs (composition) | |
| Key-value displays | todo | docs | |
| Property panels | todo | docs (composition) | |
| Statistic / metric cards | todo | docs | |
| Charts | todo | unsupported (no canvas: `<canvas>` has no painted bounds). Alternative: `<img>` + `setImagePixels` | |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | verified 0.10.0 (scenario `panel-resize`) | pointer capture + inclusive clamp |
| Panel groups | todo | verified 0.10.0 (nested split panes) | |
| Collapsible sidebars | todo | docs | |
| Tabbed panels | todo | verified 0.10.0 (scenario `workspace-tab-drag`) | |
| Detachable / movable tabs | todo | **partial**: moving a tab *between panes* verified 0.10.0; detaching to a new window unsupported (no multiple windows) | |
| Docking layouts | todo | docs (nested flex + state; no z-index, deferred overlays only) | |
| Nested panel arrangements | todo | docs (nested flex; nested scrolling is unsupported) | |
| Workspace layouts | todo | docs (composition) | |
| Persistent panel state | todo | docs (no storage primitive; app boundary owns it) | |
| Keyboard navigation | todo | verified 0.10.0 (focus + `focusNext`/`focusPrevious`) | `onFocus`/`onBlur` fire; a synthetic `"tab"` keystroke reaches `onKeyDown` but does not itself traverse in the `TestRenderer` |
| Command palette | todo | verified 0.10.0 (window key handler + overlay + input + virtual-list) | app-level `render({ onKeyDown })` verified (scenario `window-key-shortcut`) |
| Application menus | todo | docs (app-level window key handler verified 0.10.0) | |
| Status bars | todo | verified 0.10.0 (layout) | |
| Toolbars | todo | verified 0.10.0 (layout) | |
| Breadcrumb navigation | todo | docs | |
| Inspector panels | todo | docs (composition) | |
| Property editors | todo | docs | |
| File trees | todo | docs (tree view + `onFileDrop`) | |
| Log viewers | todo | docs (`<virtual-list>` verified 0.10.0) | |
| Terminal surfaces | todo | unsupported as a terminal (no PTY element). Alternative: `<code>` output + `<input>` line | |
| Search and replace | todo | docs (`highlight` + `useTextSearch` in 0.10) | |
| Multi-pane editing layouts | todo | docs (composition) | |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | docs (`<code>` is display-only; `<textarea>` edits plain text) | |
| Syntax highlighting | todo | docs (`<code>`; paint verified 0.10.0) | |
| Diff viewer | todo | docs (`<diff>` native element) | |
| Rich-text editing | todo | unsupported (no document model) | |
| Image preview | todo | docs (`<img>`: path, data URL, http(s); `setImagePixels`) | |
| File / folder selection | todo | docs (0.10 `onFileDrop`, `promptForPaths`; absent in 0.5.1) | |
| Drag and drop | todo | docs (internal drag verified 0.10.0 via pointer capture; no native drag-out) | |
| Notification centre | todo | docs (portal/anchored layer) | |
| Multi-step forms | todo | docs (composition) | |
| Virtualized hierarchical data | todo | docs (`<virtual-list>` + flattening) | |
| Advanced filtering / query builders | todo | docs (composition) | |
