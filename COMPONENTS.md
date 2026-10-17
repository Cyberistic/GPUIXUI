# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## Tier 1 — foundational

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | ? | |
| Icons | wip | partial | `packages/icons`: 45 icons as 24x24 markup for `<svg source>`, size scale, a11y rule (decorative ⇒ `role="presentation"`), 18 tests proven in both directions. **Unverified on screen:** that GPUix paints the markup, tints `stroke="#000"` from `style.color`, and scales it from `style.width`. Needs the native runtime — plan 020 §3. |
| Separators | todo | ? | |
| Spacers | todo | ? | |
| Stack / layout primitives | todo | ? | |
| Boxes / containers | todo | ? | |
| Scrollable containers | todo | ? | |
| Buttons | todo | ? | |
| Button groups | todo | ? | |
| Labels | todo | ? | |
| Text inputs | todo | ? | |
| Text areas | todo | ? | |
| Checkboxes | todo | ? | |
| Radio groups | todo | ? | |
| Selects | todo | ? | |
| Switches | todo | ? | |
| Progress | todo | ? | |
| Tooltips | todo | ? | |
| Skeletons | todo | ? | |
| Loading indicators | todo | ? | |

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | todo | ? | |
| Badges | todo | ? | |
| Avatars | todo | ? | |
| Lists / list items | todo | ? | |
| Empty states | todo | ? | |
| Alerts | todo | ? | |
| Inline validation | todo | ? | |
| Toasts / notifications | todo | ? | |
| Dialogs | todo | ? | |
| Confirmation dialogs | todo | ? | |
| Popovers | todo | ? | |
| Dropdown menus | todo | ? | |
| Context menus | todo | ? | |
| Command menus | todo | ? | |
| Tabs | todo | ? | |
| Accordions | todo | ? | |
| Collapsible sections | todo | ? | |
| Breadcrumbs | todo | ? | |
| Pagination | todo | ? | |
| Search inputs | todo | ? | |
| Comboboxes | todo | ? | |
| Date / time pickers | todo | ? | |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | ? | |
| Sortable tables | todo | ? | |
| Row selection | todo | ? | |
| Column configuration | todo | ? | |
| Resizable columns | todo | ? | |
| Filtering controls | todo | ? | |
| Data toolbars | todo | ? | |
| Virtualized lists | todo | ? | |
| Virtualized tables | todo | ? | |
| Tree views | todo | ? | |
| Expandable rows | todo | ? | |
| Key-value displays | todo | ? | |
| Property panels | todo | ? | |
| Statistic / metric cards | todo | ? | |
| Charts | todo | ? | |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | ? | |
| Panel groups | todo | ? | |
| Collapsible sidebars | todo | ? | |
| Tabbed panels | todo | ? | |
| Detachable / movable tabs | todo | ? | |
| Docking layouts | todo | ? | |
| Nested panel arrangements | todo | ? | |
| Workspace layouts | todo | ? | |
| Persistent panel state | todo | ? | |
| Keyboard navigation | todo | ? | |
| Command palette | todo | ? | |
| Application menus | todo | ? | |
| Status bars | todo | ? | |
| Toolbars | todo | ? | |
| Breadcrumb navigation | todo | ? | |
| Inspector panels | todo | ? | |
| Property editors | todo | ? | |
| File trees | todo | ? | |
| Log viewers | todo | ? | |
| Terminal surfaces | todo | ? | |
| Search and replace | todo | ? | |
| Multi-pane editing layouts | todo | ? | |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | ? | |
| Syntax highlighting | todo | ? | |
| Diff viewer | todo | ? | |
| Rich-text editing | todo | ? | |
| Image preview | todo | ? | |
| File / folder selection | todo | ? | |
| Drag and drop | todo | ? | |
| Notification centre | todo | ? | |
| Multi-step forms | todo | ? | |
| Virtualized hierarchical data | todo | ? | |
| Advanced filtering / query builders | todo | ? | |
