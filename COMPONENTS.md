# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## Tier 1 — foundational

| Component | Status | GPUix support | Docs / example | Notes / limitations |
| --------- | ------ | ------------- | -------------- | ------------------- |
| Text / typography | wip | yes | [text](packages/primitives/docs/text.mdx) · typography | **Runtime (041):** paints its string, and its box height is the role's line height. `textStyle` in `core/style.ts` covered by `style.test.ts`. Accepts `testId` (043), like every other primitive. |
| Icons | wip | yes | [icon](packages/icons/docs/icon.mdx) · icons | **Runtime (041):** the raw `<svg source>` paints at 20×20 (`lg`) / 24×24 (`xl`); a decorative icon is absent from the a11y tree, a labelled one is an `Image`; a red vs blue capture differs byte-wise, so the tint reaches the paint. 18 offline tests. |
| Separators | wip | yes | [separator](packages/primitives/docs/separator.mdx) · layout | **Runtime (041):** one border step across the surface. `ruleStyle` test. |
| Spacers | wip | yes | [spacer](packages/primitives/docs/spacer.mdx) · layout | **Runtime (041):** a filler pushes its sibling to the far edge. `layout.test.ts`. |
| Stack / layout primitives | wip | yes | [stack](packages/primitives/docs/stack.mdx) · [grid](packages/primitives/docs/grid.mdx) · layout | **Runtime (041):** row and column gaps equal the theme step. The runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. |
| Boxes / containers | wip | yes | [box](packages/primitives/docs/box.mdx) · layout | **Runtime (041):** padding equals the theme's step; density moves height and leaves colour alone. Every primitive merges a caller's `style` last; `Box` is where an app overrides a surface. |
| Scrollable containers | wip | partial | [scroll-area](packages/primitives/docs/scroll-area.mdx) · layout | **Runtime (041/048):** a wheel with `deltaY -100` leaves the offset at `y -100`, and a caller's `onScroll` receives that delta. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; there is no absolute offset (`onScrollChange`). |
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). `minRows`/`maxRows` are the runtime's own height controls. |
| Checkboxes | wip | partial | [checkbox](packages/primitives/docs/checkbox.mdx) · selection | **Runtime (041):** click and Space-up toggle, and `aria-valuetext` flips `unchecked → checked`; indeterminate reads `mixed`; AccessKit role is `CheckBox`. **No `aria-checked`.** |
| Radio groups | wip | partial | [radio-group](packages/primitives/docs/radio-group.mdx) · selection | **Runtime (041/044/048):** AccessKit roles are `RadioGroup` and `RadioButton`; arrows move the selection, wrap, and **skip disabled options** (044); Home/End jump to the nearest **enabled** end (048); exactly one item is the tab stop; a click on the circle selects. Options are **data**, not compound children (D13). |
| Selects | wip | reuse | [select](packages/primitives/docs/select.mdx) · form | **Runtime (041):** opens, paints its options, commits a clicked option. A thin themed wrapper over `@gpuix/react/select`; open state and dismissal are GPUix's. |
| Switches | wip | partial | [switch](packages/primitives/docs/switch.mdx) · selection | **Runtime (041):** a click toggles; AccessKit role is `Switch` and the value flips `unchecked → checked`. **No `aria-checked`**; Space/Enter toggle. The thumb moves by the track's `justifyContent` because the runtime has no `transform`. |
| Progress | wip | partial | [progress](packages/primitives/docs/progress.mdx) · form | **Runtime (041):** `aria-valuetext` is `"42%"`, role is `ProgressIndicator`, the fill tracks the value and clamps outside 0–100. **No `aria-valuenow`.** |
| Tooltips | wip | reuse | [tooltip](packages/primitives/docs/tooltip.mdx) · feedback | **Runtime (041):** opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. A thin wrapper over `@gpuix/react/tooltip`; a mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). |
| Skeletons | wip | partial | [skeleton](packages/primitives/docs/skeleton.mdx) · feedback | **Runtime (041):** opacity samples take both `1` and `0.6`. Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. |
| Loading indicators | wip | partial | [spinner](packages/primitives/docs/spinner.mdx) · feedback | **Runtime (041):** the lit dot changes index (the accent-coloured dot proves a theme colour reaches the paint) and AccessKit reports role `Status` with its label. `Spinner` **cannot rotate**; `Progress` with no `value` is the alternative. |

`Runtime (041)` = observed by
`nub run --filter @gpuixui/primitives test:runtime` on 2026-10-17 (63 tests in 7
files after the 048 follow-ups; 54 at the 041 baseline, locally-built GPUix
0.10.0 binding). Details: plan 041 §9. The seventh file mounts every example in
`packages/primitives/examples/` (plan 047).

**Both themes (042):** every painted colour in the Tier 1 scene comes from the
active palette, and re-rendering with the dark palette repaints every asserted
role (plan 042 §8). The palettes are test doubles — the real `lightTheme` /
`darkTheme` belong to `@gpuixui/tokens`, which is not in this tree yet.

**No row is `done`** until the published-binary run lands and the docs site
(docs-site workstream) has its page. The in-package docs page and the mounted
example exist for every row (plan 047); the runtime column is the honest
locally-built-binding result.

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
