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
| Text / typography | todo | docs | |
| Icons | todo | docs | |
| Separators | todo | docs | |
| Spacers | todo | docs | |
| Stack / layout primitives | todo | docs | |
| Boxes / containers | todo | docs | |
| Scrollable containers | todo | docs | |
| Buttons | todo | docs | |
| Button groups | todo | docs | |
| Labels | todo | docs | |
| Text inputs | todo | docs | |
| Text areas | todo | docs | |
| Checkboxes | todo | docs | |
| Radio groups | todo | docs | |
| Selects | todo | docs | |
| Switches | todo | docs | |
| Progress | todo | docs | |
| Tooltips | todo | docs | |
| Skeletons | todo | docs | |
| Loading indicators | todo | docs | |

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | todo | docs | |
| Badges | todo | docs | |
| Avatars | todo | docs | |
| Lists / list items | todo | docs | |
| Empty states | todo | docs | |
| Alerts | todo | docs | |
| Inline validation | todo | docs | |
| Toasts / notifications | todo | docs | |
| Dialogs | todo | docs | |
| Confirmation dialogs | todo | docs | |
| Popovers | todo | docs | |
| Dropdown menus | todo | docs | |
| Context menus | todo | docs | |
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
| Tables | todo | docs | |
| Sortable tables | todo | docs | |
| Row selection | todo | docs | |
| Column configuration | todo | docs | |
| Resizable columns | todo | docs | |
| Filtering controls | todo | docs | |
| Data toolbars | todo | docs | |
| Virtualized lists | todo | docs | |
| Virtualized tables | todo | docs | |
| Tree views | todo | docs | |
| Expandable rows | todo | docs | |
| Key-value displays | todo | docs | |
| Property panels | todo | docs | |
| Statistic / metric cards | todo | docs | |
| Charts | todo | docs | |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | docs | |
| Panel groups | todo | docs | |
| Collapsible sidebars | todo | docs | |
| Tabbed panels | todo | docs | |
| Detachable / movable tabs | todo | docs | |
| Docking layouts | todo | docs | |
| Nested panel arrangements | todo | docs | |
| Workspace layouts | todo | docs | |
| Persistent panel state | todo | docs | |
| Keyboard navigation | todo | docs | |
| Command palette | todo | docs | |
| Application menus | todo | docs | |
| Status bars | todo | docs | |
| Toolbars | todo | docs | |
| Breadcrumb navigation | todo | docs | |
| Inspector panels | todo | docs | |
| Property editors | todo | docs | |
| File trees | todo | docs | |
| Log viewers | todo | docs | |
| Terminal surfaces | todo | docs | |
| Search and replace | todo | docs | |
| Multi-pane editing layouts | todo | docs | |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | docs | |
| Syntax highlighting | todo | docs | |
| Diff viewer | todo | docs | |
| Rich-text editing | todo | docs | |
| Image preview | todo | docs | |
| File / folder selection | todo | docs | |
| Drag and drop | todo | docs | |
| Notification centre | todo | docs | |
| Multi-step forms | todo | docs | |
| Virtualized hierarchical data | todo | docs | |
| Advanced filtering / query builders | todo | docs | |
