# 130 — Plan: Tier 3/4 feasibility probes

| Field | Value |
| ----- | ----- |
| Status | ready to execute (probe *authoring*); runtime verdicts blocked (ADR 0001) |
| Phase | B (feasibility) → feeds D (data + workspace components) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120` |
| Feeds | `packages/data-grid`, `packages/docking`, `packages/editor` plans; `COMPONENTS.md` Tier 3/4 rows |

## 1. Goal

Answer, with evidence, which Tier 3 (data presentation) and Tier 4 (desktop
workspace) inventory items GPUix can genuinely support, and **which it
cannot** — so those packages are not planned on capabilities that do not exist.

Two kinds of evidence, kept strictly apart:

- **Documented**: upstream docs/types in `references/gpuix` and the installed
  `@gpuix/*@0.10.0` packages. Enough to write a probe; **not** enough to mark a
  capability supported.
- **Measured**: the probe scenarios below, run by plan `110`'s suite on a
  supported host, reported as `verified`/`failed`.

## 2. Capability matrix (documented; each cell cites its source)

| Tier 3/4 need | GPUix primitive | Verdict from docs | Evidence |
| ------------- | --------------- | ----------------- | -------- |
| Table layout (columns align) | `div` + `display:grid` + `gridTemplateColumns`, or flex rows with fixed widths | probe-able | `README.md` §Supported Styles (`display: "grid"`, `gridTemplateColumns`) |
| Horizontally scrolling wide table | parent `overflowX: "scroll"` + `flexShrink: 0` rows | probe-able, with a caveat: **X-only** overflow is the documented exception to "no nested scrolling"; a vertical scroller must not be inside | `README.md` §Scrolling |
| Virtualized rows (plain rows) | `<virtual-list>` children mode | probe-able | §Virtual lists |
| Virtualized rows (windowed React) | `itemCount` + `windowStart` + `estimatedItemHeight` | probe-able | §Programmatic scrolling / performance model |
| Variable row heights | measured per row, `estimatedItemHeight` as a hint | probe-able | §Row heights |
| Row/column resize by drag | pointer capture (`onMouseDown`+`onMouseMove`+`onMouseUp` on the handle), `cursor: col-resize` | probe-able | §Supported Events (capture), §Cursors |
| Column width read-back | `onLayout` (border box, next frame) | probe-able, **one-frame lag** | §Supported Events (`onLayout`) |
| Sort / filter / select | React state + `onClick`; no native table | trivially supported (pure React) | — |
| Keyboard row navigation | `tabIndex`, `onKeyDown`, `focusVisible`, `keyboardFocusDim` | probe-able | §Focus and keyboard navigation |
| Expandable rows / tree view | composition + indent + state | trivially supported (pure React) | — |
| Sticky/frozen header | **not** supported natively; own the offset in React and translate panes | documented limitation + workaround | §Panes that must move together |
| Charts with a drawing surface | **no `canvas`** ("planned") | **unsupported**; alternative: render bytes off-screen and push with `<img>.setImagePixels` (RGBA/BGRA) | §Status (`[ ] Canvas element`), §Images (`setImagePixels`) |
| Split panes / panel groups | flex + divider drag (plan `120` §3.5) | probe-able | §Supported Events |
| Collapsible sidebar | React state + optional `motion.div` | probe-able | §Native animations |
| Tabbed panels | React state + `Button` primitive ("Enter"/"Space") | probe-able | §Button |
| Tab drag between panes | pointer capture + token state | probe-able, with a caveat: no floating tab preview can be `position: fixed`; use an `<anchored>` layer or accept a same-pane ghost | §Overlay menus, §Supported Styles (`fixed` lays out like `absolute`) |
| Detachable tabs / multiple windows | **no multiple windows** ("`[ ] Multiple windows`"); `render()` twice throws | **unsupported** — document; the honest alternative is a modal/popover-style "float panel" inside the one window | §Status, §Hot reload |
| Docking layouts | nested flex + state; overlays only via `<anchored deferred>`; no `z-index` (tree order is paint order) | probe-able with the z-index caveat | §Overlay menus, §Find what is under a point |
| Persistent panel state | **no storage primitive** (no `localStorage`); must cross the Node boundary (Effect `FileSystem`, or `Config`) | supported at the app boundary, **not** in a component | `@gpuix/native` host surface has no storage export |
| Context menus | `<anchored deferred>` + `DismissableLayer` | probe-able | §Overlay menus, §Escape closes the top layer |
| Command palette | `Dialog` + `<input>` + `<virtual-list>`; `render({ onKeyDown })` for the global shortcut | probe-able | §Renderer keyboard callbacks, §Dialog |
| Log viewer | `<virtual-list>` + `alignment="bottom"` + `followTail` | probe-able | §Chat tail behavior |
| File tree | tree view + `onFileDrop` for the OS path | probe-able | §Supported Events (`onFileDrop`) |
| Terminal surface | **no PTY/terminal element**; `<code>` is display-only; `<input>`/`<textarea>` are editors | **unsupported as a terminal**; honest alternative: a component that renders captured output in `<code>` + an input line, with the process owned outside the UI | §Supported Elements |
| Code editor | `<code>` is display-only (no caret/selection); `<textarea>` edits plain text; `highlight` paints ranges | **partially supported**: a read-only highlighted viewer is real; an editable highlighted editor needs an overlay aligned by measured layout and is a probe, not a promise | §Native text components, §Text highlighting and search |
| Diff viewer | `<diff>` native element | supported | §Native text components |
| Rich-text editing | no document model | **unsupported**; document with evidence | §Supported Elements |
| Drag and drop (internal) | pointer capture; sortable list by index math | probe-able | §Supported Events |
| Drag and drop (files in/out) | `onFileDrop` (in) only; no native drag-out | partially supported | §Supported Events |
| Multi-step forms | composition (Dialog + inputs + validation state) | trivially supported | — |
| Advanced filtering | composition (Select/Combobox + list) | probe-able | §Headless controls |

## 3. Probe scenarios (added to the plan-`110` registry)

Three probes, each an executable scenario with numeric assertions. They are
probes: their purpose is a verdict, and a `failed` verdict is a valid outcome
that the owning package plan must then design around.

### 3.1 `table-select-sort` (capability `table`)

View: 200 rows, header with `testId="table-header-name"` and a sort `Button`;
each row a `div` with `gridTemplateColumns: "120px 1fr 80px"`, `testId="table-row-N"`,
`aria-selected`, and a click handler; horizontal overflow on the parent.

Steps:

1. `ctx.text("table-readout")` shows `rows=200 sorted=name-asc selected=none`.
2. Click the header: readout becomes `name-desc`; assert the first visible row's
   readout text is the expected last name (sort is real, not a label).
3. Click row 3: readout `selected=r3`; `aria-selected` selectable.
4. Keyboard: `key("tab")` until a row is focused; `key("down")` moves selection;
   assert focus id and readout (proves keyboard row navigation, not just click).
5. Wheel on the table: `scrollOffset("table-scroll")` y < 0 and the header stays
   in place (frozen header is **not** native: assert the limitation with the
   readout, then the documented "own the offset" alternative if the owner asks
   for it).

### 3.2 `table-column-resize` (capability `table`)

View: header with a `testId="col-name-handle"` divider (`cursor: col-resize`)
inside the table above; readout `w=240`.

Steps:

1. `ctx.drag("col-name-handle", 60, 0, 6)` → readout `w=300` (±2).
2. Drag left past the minimum → readout `w=<min>` (clamp).
3. Drag with the pointer leaving the table's parent and returning → width
   tracks the whole gesture (pointer capture held; assert with a two-leg drag).
4. `onLayout` read-back: the row's first cell bounds width equals the header
   width within 1px (columns really align).

### 3.3 `workspace-tab-drag` (capability `workspace`)

View: two panes side by side; pane A has tabs `one`/`two` (`Button`), pane B is
empty; a `SplitPane` divider between them; readout
`aTabs=one,two bTabs= firing=none split=320`.

Steps:

1. Click tab `two` (Enter/Space through the `Button` primitive) → readout
   `active=two`; content text changes.
2. Keyboard: `key("tab")` to the tab strip, `key("left")`/`key("right")` move the
   active tab (a component-level keyboard contract, not a GPUix one).
3. Drag tab `one` from pane A onto pane B: `ctx.drag("tab-one", dx, 0, 8)` ending
   over pane B's tab strip (a second `testId` target). Readout
   `aTabs=two bTabs=one` — proves tab *movement* by pointer capture.
4. Resize the split to `240` and back to `320`: readout follows; then re-render
   the same view (the CLI remount) and assert the width re-initialises to the
   default — i.e. **without an app-boundary store, panel state does not
   persist**. That is the honest note for `packages/docking`: persistence is the
   app's, via Effect `FileSystem`/`Config`.

### 3.4 As implemented (deviations from the sketches above)

Verified against the installed `@gpuix/*@0.10.0` before implementing:

- **`style.gridTemplateColumns` is a column count** (`number`), not a CSS track
  list, so §3.1's `"120px 1fr 80px"` does not exist. The table cells use explicit
  flex widths, which also makes the column-resize arithmetic measurable.
- **0.10.0 has no `onLayout`**, so the table's inner width is state
  (`nameWidth + status + size`), not read back from the runtime.
- **A tab drag cannot float a preview** (no `position: fixed`) *and* pointer
  capture keeps every move on the pressed tab, so `workspace-tab-drag` decides
  the drop from the pointer delta crossing a threshold. It is a documented
  heuristic, and the probe asserts the tab really moved panes.
- **Keyboard row navigation** is a component contract (`onKeyDown` down/up on a
  `tabIndex` row), not a GPUix table feature; the probe asserts the readout
  changed, so a dead handler fails.
- `table-select-sort` and `table-column-resize` share one `TableProbe` view; the
  registry mounts each scenario's own `view()` (via `Smoke.runScenarios`'
  `beforeEach`), so they cannot interfere.

Verdicts remain `unverified` on this host: the suite exits `2` before running
(ADR 0001/0002).

## 4. Steps

1. Write the three probes as scenarios in `apps/playground/src/scenarios/`
   following plan `120` §3.1, and register them (the registry integrity test
   covers `table` and `workspace`).
2. Add one paragraph per Tier 3/4 inventory row to `COMPONENTS.md`'s
   "GPUix support" cell: `probe-able (scenario <id>)`, `unsupported
   (evidence: README §<section>)`, or `partial (evidence …)`.
3. Run the suite (on a supported host) and replace `probe-able` with
   `verified`/`failed` **only** from the report; on this host they stay
   `unverified (no supported host — ADR 0001)`.
4. Record the unsupported verdicts first, because they change plans: no chart
   canvas, no multi-window detach, no terminal surface, no `z-index`.
5. Commit:
   `feat(playground): Tier 3/4 feasibility probes (table, columns, workspace)`.

## 5. Test plan

1. **Registry integrity** (plan `120` test 6) now demands the `table` and
   `workspace` capabilities — it fails if a probe declares no capability.
2. **Each probe's assertions can fail**: the sort check compares against the
   *sorted* expected order, so returning the input order fails; the resize check
   asserts a 60px delta with ±2 tolerance, so a dead drag fails; the tab-drag
   check asserts the tab *moved between panes*, so a no-op drag fails.
3. **Unsupported claims carry evidence**: a docs test (any workstream) or review
   checklist verifies that every `unsupported` cell names a section of
   `references/gpuix/README.md` or a source path. This is the anti-fake gate for
   this plan; state it in the commit message.
4. Two-direction proof: on a supported host, break `nextSize` (drop the clamp)
   and confirm `table-column-resize` fails on the min-width leg; restore.

## 6. STOP conditions

- **If a probe's assertion can only pass by weakening it** (e.g. tolerance
  raised until a dead drag "passes"), stop: record `failed` with the numbers.
- **If the horizontal-overflow table turns out to steal the vertical wheel**,
  stop and report it: it contradicts the documented X-only exception, and every
  data-grid plan depends on the answer.
- **If tab drag needs a floating preview**, do not add a second window or a
  fake `position: fixed`; use an `<anchored>` layer or document the ghost as
  same-pane only.
- **Never** plan a Tier 4 package on `z-index`, nested scrolling, multi-window,
  or storage; those do not exist.
- **Never** mark a probe `verified` from a screenshot.

## 7. Acceptance criteria

- Three probes exist, registered, with numeric assertions.
- `COMPONENTS.md` Tier 3/4 rows carry a support verdict with evidence; the
  `unsupported` ones name the upstream section.
- The unsupported list (canvas/charts, multi-window detach, terminal surface,
  rich-text editing, native sticky headers, component-level persistence) is
  recorded in `docs/` (docs-site workstream) and in the owning package plans.
- On this host, every probe is `unverified (no supported host — ADR 0001)` and
  the suite exits `2`.

## 8. Handoff

- `packages/data-grid` plan: the table layout, resize, virtualization and the
  X-only scroll answer come from `table-select-sort` + `table-column-resize`.
- `packages/docking` plan: split/tab/drag from `workspace-tab-drag`; persistence
  is an app-boundary concern, and there is no multi-window detach.
- `packages/editor` plan: `<code>` viewer is real; editable highlighted editing
  is a probe; rich text is unsupported.
- Charts: the only honest native path is `<img>` + `setImagePixels`; the
  component must own the off-screen render and cannot be called "native
  drawing".
