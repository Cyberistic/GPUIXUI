# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## How "GPUix support" is decided

Two sources, and they are not interchangeable
(`.agents/adr/0001-native-smoke-host.md`, `.agents/adr/0002-two-gpuix-versions.md`):

- **`verified`** — the native smoke suite ran on a supported host for the pinned
  GPUix version and the capability passed. Requires a
  `smoke-report.json` reference.
- **`verified 0.5.1`** — measured on this Intel Mac with GPUix 0.5.1 (the last
  `darwin-x64` release) by `apps/playground/legacy-probe`. Evidence about the
  runtime and hardware; **never** the basis for marking a 0.10 component `done`.
- **`docs`** — the upstream README/types in `references/gpuix` document it and a
  probe exists, but no run has confirmed it here.
- **`unverified`** — no evidence. The default until a supported host runs the
  suite.

Unless a row says otherwise, today's value is `unverified`: this machine cannot
load the pinned `@gpuix/native` (no `darwin-x64` binding from 0.6.0 on), so
Phase B's "runs in GPUix" exit condition is **not** met for the shipped
components. The measured 0.5.1 matrix is the current strongest evidence:
layout, text, input, overlay anchoring, click-outside, Escape, pointer-capture
resizing, virtual lists and programmatic scroll work; focus/blur events and
synthetic wheel scrolling do not; `<canvas>` does not paint.


## Tier 1 — foundational

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | verified 0.5.1 (text) | |
| Icons | todo | docs (`<svg>`, `<img>`) | |
| Separators | todo | verified 0.5.1 (layout) | |
| Spacers | todo | verified 0.5.1 (layout) | |
| Stack / layout primitives | todo | verified 0.5.1 (layout) | |
| Boxes / containers | todo | verified 0.5.1 (layout) | |
| Scrollable containers | todo | verified 0.5.1 (programmatic scroll); wheel unverified | |
| Buttons | todo | verified 0.5.1 (click); no native `<button>` | |
| Button groups | todo | docs | |
| Labels | todo | docs | |
| Text inputs | todo | verified 0.5.1 (input) | |
| Text areas | todo | verified 0.5.1 (input) | |
| Checkboxes | todo | docs (composition: click verified 0.5.1) | |
| Radio groups | todo | docs (composition; focus unverified) | |
| Selects | todo | docs | |
| Switches | todo | docs (composition: click verified 0.5.1) | |
| Progress | todo | docs | |
| Tooltips | todo | docs (0.5.1 `Tooltip`; anchored overlay verified 0.5.1) | |
| Skeletons | todo | docs | |
| Loading indicators | todo | docs | |

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | todo | verified 0.5.1 (layout) | |
| Badges | todo | docs | |
| Avatars | todo | docs | |
| Lists / list items | todo | verified 0.5.1 (layout) | |
| Empty states | todo | docs | |
| Alerts | todo | docs | |
| Inline validation | todo | docs | |
| Toasts / notifications | todo | docs | |
| Dialogs | todo | docs (anchored overlay + Escape + click-outside verified 0.5.1) | |
| Confirmation dialogs | todo | docs (Dialog composed with a form) | |
| Popovers | todo | docs (anchored overlay verified 0.5.1) | |
| Dropdown menus | todo | docs (anchored overlay verified 0.5.1) | |
| Context menus | todo | docs (anchored overlay; no z-index: deferred layer only) | |
| Command menus | todo | docs | |
| Tabs | todo | docs | |
| Accordions | todo | docs | |
| Collapsible sections | todo | docs | |
| Breadcrumbs | todo | docs | |
| Pagination | todo | docs | |
| Search inputs | todo | docs | |
| Comboboxes | todo | docs | |
| Date / time pickers | todo | docs | |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | docs (composition; probe: plan 130) | |
| Sortable tables | todo | docs | |
| Row selection | todo | docs | |
| Column configuration | todo | docs | |
| Resizable columns | todo | docs | |
| Filtering controls | todo | docs | |
| Data toolbars | todo | docs | |
| Virtualized lists | todo | verified 0.5.1 (virtual-list: 5 of 500 rows built) | |
| Virtualized tables | todo | docs (probe: plan 130 `table-select-sort`) | |
| Tree views | todo | docs (composition over verified layout primitives) | |
| Expandable rows | todo | docs (composition) | |
| Key-value displays | todo | docs | |
| Property panels | todo | docs (composition) | |
| Statistic / metric cards | todo | docs | |
| Charts | todo | unsupported (no canvas: 0.5.1 `<canvas>` has no painted bounds). Alternative: `<img>` + `setImagePixels` | |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | verified 0.5.1 (pointer-capture drag + clamp) | |
| Panel groups | todo | docs (nested split panes; resize verified 0.5.1) | |
| Collapsible sidebars | todo | docs | |
| Tabbed panels | todo | docs | |
| Detachable / movable tabs | todo | unsupported (no multiple windows) | |
| Docking layouts | todo | docs (nested flex + state; no z-index, deferred overlays only) | |
| Nested panel arrangements | todo | docs (nested flex; nested scrolling is unsupported) | |
| Workspace layouts | todo | docs (composition) | |
| Persistent panel state | todo | docs (no storage primitive; app boundary owns it) | |
| Keyboard navigation | todo | unverified (no focus/blur events on 0.5.1) | |
| Command palette | todo | docs (Dialog + `<input>` + `<virtual-list>`; window key handler) | |
| Application menus | todo | docs | |
| Status bars | todo | verified 0.5.1 (layout) | |
| Toolbars | todo | verified 0.5.1 (layout) | |
| Breadcrumb navigation | todo | docs | |
| Inspector panels | todo | docs (composition) | |
| Property editors | todo | docs | |
| File trees | todo | docs (tree view + `onFileDrop`) | |
| Log viewers | todo | docs (`<virtual-list>` + `followTail`) | |
| Terminal surfaces | todo | unsupported as a terminal (no PTY element). Alternative: `<code>` output + `<input>` line | |
| Search and replace | todo | docs (`highlight` + `useTextSearch` in 0.10) | |
| Multi-pane editing layouts | todo | docs (composition) | |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | docs (`<code>` is display-only; `<textarea>` edits plain text) | |
| Syntax highlighting | todo | docs (`<code>`; paint verified 0.5.1) | |
| Diff viewer | todo | docs (`<diff>` native element) | |
| Rich-text editing | todo | unsupported (no document model) | |
| Image preview | todo | docs (`<img>`: path, data URL, http(s); `setImagePixels`) | |
| File / folder selection | todo | docs (0.10 `onFileDrop`, `promptForPaths`; absent in 0.5.1) | |
| Drag and drop | todo | docs (internal drag verified 0.5.1; no native drag-out) | |
| Notification centre | todo | docs (portal/anchored layer) | |
| Multi-step forms | todo | docs (composition) | |
| Virtualized hierarchical data | todo | docs (`<virtual-list>` + flattening) | |
| Advanced filtering / query builders | todo | docs (composition) | |
