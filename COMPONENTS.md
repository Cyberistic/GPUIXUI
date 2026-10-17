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
| Text / typography | wip | yes | `Text` resolves a semantic role (`display`…`caption`, `code`, `codeBlock`) to size/weight/family/tone; `textStyle` in `core/style.ts`, covered by `style.test.ts`. Docs page + example pending (docs-site / `examples/basic-app`). |
| Icons | wip | partial | `packages/icons`: 45 icons as 24x24 markup for `<svg source>`, size scale, a11y rule (decorative ⇒ `role="presentation"`), 18 tests proven in both directions. **Unverified on screen:** that GPUix paints the markup, tints `stroke="#000"` from `style.color`, and scales it from `style.width`. Needs the native runtime — plan 020 §3. |
| Separators | wip | yes | `Separator` is one border on `theme.colors.border`, with an optional inset step and a label slot; `ruleStyle` test. |
| Spacers | wip | yes | `Spacer` either fills (`flexGrow`) or takes a fixed spacing step; `layout.test.ts`. |
| Stack / layout primitives | wip | yes | `Stack` (direction/gap/align/justify/wrap/grow) and `Grid` — the runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. `stackStyle`/`gridStyle` tests. |
| Boxes / containers | wip | yes | `Box` carries surface/tone/padding/radius/border/elevation variants and is the only place a caller's raw `style` merges; `surfaceStyle` test. |
| Scrollable containers | wip | partial | `ScrollArea` sets `overflowX`/`overflowY` only. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; `onScroll` exists but there is no `onScrollChange` to observe a change in one place. |
| Buttons | wip | ours | `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's: Enter on key **down**, Space on key **up**, a held key ignored, `defaultPrevented` unobservable. `loading` stays focusable but refuses to activate. `Button.test.tsx` + `keyboard.test.ts`. |
| Button groups | wip | yes | `attached` (shared radius, single border) or `separated`; `role="group"`, variant and size forwarded to each child. |
| Labels | wip | partial | There is **no `aria-labelledby`** in the runtime, so `Label` is visible text only and `labelledBy(name)` builds the control's own `aria-label`; the name is written once and passed to both. |
| Text inputs | wip | yes | The native `<input>` holds its own text and reports edits through `onChange`'s `event.value`; controlled/uncontrolled is `core/state.ts`'s decision. Enter arrives through `onSubmit`. `fields.test.tsx` + `state.test.ts`. |
| Text areas | wip | yes | Native `<textarea>`; `minRows`/`maxRows` are the runtime's own height controls, so a textarea's height is rows rather than the control height. |
| Checkboxes | wip | partial | **No `aria-checked`** — the state is reported through `aria-valuetext` (`checked`/`unchecked`/`mixed`), which is the supported way to make it legible. |
| Radio groups | wip | partial | Options are **data**, not compound children, because the group owns the roving index and the arrow contract over them (a deviation from shadcn's shape, recorded here). Arrows move the selection and wrap; `initialActiveIndex` tested. |
| Selects | wip | reuse | A thin themed wrapper over the published `@gpuix/react/select`; the open state, dismissal and arrow navigation are GPUix's, only the paint is ours. |
| Switches | wip | partial | `role="switch"`; Space/Enter toggle. The thumb is positioned by the track's `justifyContent` because the runtime has no `transform`. |
| Progress | wip | partial | **No `aria-valuenow`** — the value rides on `aria-valuetext` (`"42%"`, or `"loading"`) and is clamped to 0–100 in `core/style.ts`. |
| Tooltips | wip | reuse | A thin themed wrapper over the published `@gpuix/react/tooltip`; positioning, delay and dismissal are GPUix's. A mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). |
| Skeletons | wip | partial | Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. |
| Loading indicators | wip | partial | `Spinner` **cannot rotate**, so it advances a discrete lit dot per step on a timer (`core/loading.ts`); `Progress` with no `value` is the alternative. |

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
