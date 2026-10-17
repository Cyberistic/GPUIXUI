# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | wip | yes (inline style values) | 37 semantic roles, 10 type roles, spacing/radii/density/elevation; light + dark; 118 tests incl. WCAG floors. Native visual proof pending the playground gallery. |
| Theme extension | wip | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`; docs in `docs/tokens.md`. Provider test is a server render; native switch pending. |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 37 roles; `getTheme(mode, "high")`; contrast test covers both variants. Docs in `docs/tokens.md`. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land. |
| Native theme gallery | todo | yes | `apps/playground`; visual evidence for the rows above. Owner: playground workstream. |

## Tier 1 — foundational

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | ? | |
| Icons | todo | ? | |
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
| Cards | done | yes | `variant` outline/elevated/plain; behaviour suite passes in the real renderer (5 tests, `test:behaviour`) |
| Badges | done | yes | seven variants (neutral/primary/4 status tones/outline), two sizes sized by type role; 7 native behaviour tests. Not interactive by design; no icon or dismiss slot yet |
| Avatars | done | yes | four diameters, deterministic unicode-safe initials fallback (8 logic tests), presence dot; 7 native behaviour tests. No image loading/error state in v1 — a missing file paints nothing and does not restore the initials |
| Alerts | done | yes | four tones from the shared status palette, required `title`, optional icon slot and dismiss control; 10 native behaviour tests (real click, keyboard activation, alert role). Dismiss uses the local button stand-in; live-region announcement not verifiable here |
| Lists / list items | done | yes | `selectionMode` none/single with a roving tab stop, wrap-around over disabled rows, real focus (`focusElement`), controlled + uncontrolled; 12 native behaviour tests. Single selection only — no multi-select, type-ahead or virtualisation |
| Empty states | done | yes | title + optional description/action/icon, no surface of its own; 6 native behaviour tests including a real click on the action. Wrap width is a component constant (no measure token) |
| Inline validation | todo | ? | |
| Toasts / notifications | todo | ? | |
| Dialogs | done | partial | local overlay over an `anchored` veil at window coordinates (0.10.0 ships no Dialog parts and no portal); 12 native behaviour tests + 5 dismiss-stack logic tests. No `aria-modal`/`aria-labelledby` in 0.10.0 — named through the required `label` |
| Confirmation dialogs | done | partial | Cancel holds initial focus (Enter cancels); confirm never closes the dialog itself, the caller does; `loading` disables both actions and suppresses Escape/backdrop; 5 native behaviour tests. Busy indicator is a `…` glyph until a Spinner exists |
| Popovers | done | yes | anchored through GPUix's `FloatingLayer`; Escape restores focus, Tab and outside presses do not; share the dismiss stack with Dialog and a mouse-down re-open guard; 8 native behaviour tests, both themes |
| Dropdown menus | done | partial | anchored `FloatingLayer` surface with a shared row/highlight core; arrow/Home/End wrap and skip disabled rows, Enter activates and restores focus, checkbox and destructive rows; 9 native behaviour tests, both themes. No submenus, no type-ahead, `aria-selected` instead of `aria-checked` in 0.10.0 |
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
