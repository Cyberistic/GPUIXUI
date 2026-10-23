/**
 * The live-window probe registry — the single source of truth for `--list` and
 * the CLI's id guard.
 *
 * This module imports no GPUix or React code, so a host with no binding can
 * still list and validate ids. `capability` reuses the headless model, so a
 * live pass aggregates into the same report.
 */
import type { Smoke } from "@gpuixui/testing";

/** One live probe's identity: what it is called and which capability it proves. */
export interface LiveProbeMeta {
  readonly id: string;
  readonly title: string;
  readonly capability: Smoke.Capability;
}

/**
 * The probes a real window can prove.
 *
 * `focus-visible` and `keyboard-focus-dim` are plan `053`'s STOP gate: whether
 * the runtime's declared `focusVisible` state paints for keyboard focus (and
 * not for a press or a programmatic focus), and whether `keyboardFocusDim`
 * dims the other focusables. Each probe asserts the native focus id of every
 * state and reads the paint out of the captured frame, so the evidence is a
 * check, not a claim.
 *
 * `register-font` is plan `052`'s native half: a window reports no style, so a
 * face is proved by its **metrics** — the installed family lays the sample word
 * out at its own advances, and a family no runtime knows lays it out at the
 * fallback's width.
 *
 * `font-registration-late` precedes `register-font` on purpose: it measures what
 * happens when a face arrives *after* the first layout, and a probe that
 * installed the same family earlier in the run would leave it known at mount and
 * void the measurement. Its own "the face was not painted before it was
 * installed" check fails if that order is ever broken.
 */
export const liveRegistry = [
  {
    id: "focus-visible",
    title:
      "Focus: focusVisible paints for Tab, not for a press or a programmatic focus",
    capability: "focus",
  },
  {
    id: "focus-ring-offset",
    title:
      "Focus: an outline offset leaves a gap of the page and takes no layout space",
    capability: "focus",
  },
  {
    id: "action-ring",
    title:
      "Focus: a filled action paints its ring on the page, one strong-border gap clear of its own fill",
    capability: "focus",
  },
  {
    id: "keyboard-focus-dim",
    title: "Focus: the runtime dims other focusables, and one element opts out",
    capability: "focus",
  },
  {
    id: "filled-action-dim",
    title:
      "Focus: a filled action keeps its fill in the dim, a ghost action keeps the cue",
    capability: "focus",
  },
  {
    id: "floating-sides",
    title:
      "Floating: left/right sides and the align=center offset measure the same in a window",
    capability: "floating",
  },
  {
    id: "font-registration-late",
    title:
      "Text: a face installed after the first layout paints on the next re-layout",
    capability: "text",
  },
  {
    id: "register-font",
    title:
      "Text: registerFonts makes a family paint, and an unknown family falls back",
    capability: "text",
  },
  {
    id: "text-input",
    title:
      "Input: the shipped Input takes typed keys through onChange and Enter through onSubmit",
    capability: "input",
  },
  {
    id: "field-ink",
    title:
      "Input: a host paints its own grey hint under any theme, a field's painted hint is the placeholder role, and a value paints the element's colour",
    capability: "input",
  },
  {
    id: "checkbox-toggle",
    title:
      "Input: the shipped Checkbox toggles on a press and on Space in a window",
    capability: "input",
  },
  {
    id: "tabs-lifecycle",
    title:
      "Input: the shipped Tabs selects by press and by arrow, skips a disabled tab, and the measured pill follows",
    capability: "input",
  },
  {
    id: "slider-lifecycle",
    title:
      "Input: the shipped Slider positions by press, steps by key and ignores a disabled track",
    capability: "input",
  },
  {
    id: "list-lifecycle",
    title:
      "Input: the shipped List selects and focuses by press, moves by arrow over a disabled row, selects on Enter and Space, and extends with Shift and Cmd+A",
    capability: "input",
  },
  {
    id: "tooltip-lifecycle",
    title:
      "Overlay: the shipped Tooltip opens on hover above its trigger, fades and rises into place, closes on leave and dismisses on Escape, while a Tab traversal leaves it closed in this window",
    capability: "overlay",
  },
  {
    id: "drag-between-panes",
    title:
      "Workspace: a drag across two panes reaches the target's move and release",
    capability: "workspace",
  },
  {
    id: "dialog-lifecycle",
    title:
      "Modal: the shipped Dialog opens on a press, focuses its surface, and Escape returns focus",
    capability: "modal",
  },
  {
    id: "surface-fade",
    title:
      "Motion: a surface fades into its resting frame over its level, and a reduced preference removes the journey",
    capability: "modal",
  },
  {
    id: "menu-lifecycle",
    title:
      "Overlay: the shipped DropdownMenu opens, moves real focus, activates and dismisses",
    capability: "overlay",
  },
  {
    id: "context-menu-lifecycle",
    title:
      "Overlay: the shipped ContextMenu opens at a right press, places from the trigger on Shift+F10 and returns focus on dismiss",
    capability: "overlay",
  },
  {
    id: "motion-geometry",
    title:
      "Layout: motion animates a box's painted geometry over frames, and the content inside it is clipped rather than reflowed",
    capability: "layout",
  },
  {
    id: "toast-lifecycle",
    title:
      "Overlay: the shipped toast system queues a toast and dismisses it from its own control",
    capability: "overlay",
  },
  {
    id: "notification-centre-lifecycle",
    title:
      "Overlay: the toast store keeps three cards and expires the oldest, so a centre panel owns the history while the viewport paints the live stack",
    capability: "overlay",
  },
  {
    id: "command-palette",
    title:
      "Workspace: the shipped CommandMenu filters by typing, highlights without moving focus, and runs the highlighted action",
    capability: "workspace",
  },
  {
    id: "popover-lifecycle",
    title:
      "Overlay: the shipped Popover opens beside its trigger, compensates the runtime's centring and flips when it does not fit",
    capability: "floating",
  },
  {
    id: "modal-focus-restore",
    title:
      "Focus: a modal gives the focus back only when its own surface held it",
    capability: "focus",
  },
  {
    id: "content-surfaces",
    title:
      "Content: svg markup, an image buffer and a data URL paint; a canvas paints nothing",
    capability: "content",
  },
  {
    id: "scroll-lifecycle",
    title:
      "Scroll: a window's wheel is hit-tested, onScroll and onScrollChange report the move, and the offset clamps at both ends",
    capability: "scroll",
  },
  {
    id: "keyboard-scroll-lifecycle",
    title:
      "Scroll: a traversal reaches the region, arrows/page/Home/End move the renderer's offset, a field keeps its keys and an opted-out region answers none",
    capability: "scroll",
  },
  {
    id: "nested-scroll-lifecycle",
    title:
      "Scroll: a wheel inside a nested scroller moves every scrollable ancestor by its delta, so the page and the list scroll together",
    capability: "scroll",
  },
  {
    id: "message-scroller-lifecycle",
    title:
      "Scroll: the shipped MessageScroller follows a page while pinned, leaves an unpinned reader's offset alone, counts arrivals and returns on jump",
    capability: "scroll",
  },
  {
    id: "split-pane-lifecycle",
    title:
      "Panel: a window's divider drag resizes its pane, clamps at the caller's bounds, and ignores a drag on the pane",
    capability: "panel",
  },
  {
    id: "dock-split-lifecycle",
    title:
      "Panel: the shipped SplitPane is a Tab stop that resizes from the keyboard in a window",
    capability: "panel",
  },
  {
    id: "virtual-list-lifecycle",
    title:
      "Table: a window's <virtual-list> paints only its visible rows and reports the range it moved to",
    capability: "virtual-list",
  },
  {
    id: "window-shortcut-lifecycle",
    title:
      "Workspace: a window's app-level cmd-k opens the palette from any focus, and Escape closes it",
    capability: "workspace",
  },
  {
    id: "pointer-capture",
    title:
      "Input: a press captures the pointer for a mouseDown+mouseMove element, not for a move-only one, and the Slider follows it off the track",
    capability: "input",
  },
  {
    id: "clipboard-lifecycle",
    title:
      "Input: the platform's copy, paste and cut reach a shipped field, and only some of them reach the application",
    capability: "input",
  },
  {
    id: "otp-paste-lifecycle",
    title:
      "Input: a code pasted into a shipped OTPField fills its cells from the cell that took it, truncates to six, and completes once",
    capability: "input",
  },
  {
    id: "otp-keys-lifecycle",
    title:
      "Input: a shipped OTPField's arrows move on key up, Home/End reach the ends, and one Backspace clears one cell in a window",
    capability: "input",
  },
  {
    id: "selection-lifecycle",
    title:
      "Text: a real pointer drag over the shipped Text paints the selection, getSelectedText reports it, Cmd+C copies it, and a default node opts out",
    capability: "text",
  },
  {
    id: "window-selection-lifecycle",
    title:
      "Selection: a window reports a drag's run and the clear to the app's root handler, and a non-selectable line reports nothing",
    capability: "text",
  },
  {
    id: "select-lifecycle",
    title:
      "Overlay: the runtime's Select opens its list below the trigger, selects by press and by key, skips a disabled row and dismisses on Escape or an outside press",
    capability: "overlay",
  },
  {
    id: "combobox-lifecycle",
    title:
      "Overlay: the shipped Combobox takes focus in its search field, filters by typed query, skips a disabled row and dismisses on Escape or an outside press",
    capability: "overlay",
  },
  {
    id: "virtual-tree-lifecycle",
    title:
      "Tree: a 4 000-row file tree paints only its window, opens in place, moves real focus by key and reveals a deep index",
    capability: "tree",
  },
  {
    id: "portal-layer",
    title:
      "Overlay: createPortal paints beside its target, escapes a clipped ancestor, keeps context and takes pointer and key input",
    capability: "overlay",
  },
  {
    id: "loading-row-correction",
    title:
      "Table: a page arriving while a loading row is the anchor is re-anchored on the message under it, so the splice does not replace the screen",
    capability: "virtual-list",
  },
  {
    id: "window-resize-reflow",
    title:
      "Workspace: the renderer's window size is the box the layout fills, useWindowSize follows it, and a zoom reflows a flexible pane",
    capability: "workspace",
  },
  {
    id: "drag-reorder",
    title:
      "Workspace: a row that captures the pointer resolves its drop by hit-testing, and the painted order follows",
    capability: "workspace",
  },
  {
    id: "table-lifecycle",
    title:
      "Table: a header press sorts by the column it hit, a row press selects and focuses, arrows rove, and the header holds still under one shared scroller",
    capability: "table",
  },
  {
    id: "frozen-column-lifecycle",
    title:
      "Table: a frozen column and its grid mirror either pane's wheel in a window, the frozen column ignores a pan, and a frozen cell selects the row",
    capability: "table",
  },
  {
    id: "dock-focus-lifecycle",
    title:
      "Workspace: a dock's Tab traversal reaches its panes in tree order, a closed sidebar's unguarded control keeps its stop while the guarded one leaves, and a rail step carries focus and the pane",
    capability: "workspace",
  },
  {
    id: "header-menu-lifecycle",
    title:
      "Table: a column menu anchored inside a scrolled header opens under its trigger, follows the wheel, dismisses with Escape and hides a column",
    capability: "table",
  },
  {
    id: "window-backdrop",
    title:
      "Window: a windowBackground paints the surface the app leaves empty — opaque fills it, transparent and blurred leave it to the desktop",
    capability: "layout",
  },
  {
    id: "chart-raster",
    title:
      "Content: a chart paints from a pixel buffer in its own colours, updates when its data changes, and takes multi-colour SVG bytes",
    capability: "content",
  },
  {
    id: "chart-surface-lifecycle",
    title:
      "Content: the shipped data charts paint one tint per series in a window, stack, ring and spark beside their text, and repaint a changed value",
    capability: "content",
  },
  {
    id: "window-chrome",
    title:
      "Window: the app's layout starts at the window's top edge, the reported insets carry no titlebar band in either titlebar mode, and an app insets its own chrome",
    capability: "workspace",
  },
  {
    id: "workspace-restore",
    title:
      "Workspace: a saved arrangement paints again after a re-mount — the panes, the chosen document and the inspector's scroll — while a corrupt string opens the default and an out-of-bounds width is clamped",
    capability: "workspace",
  },
  {
    id: "theme-switch-lifecycle",
    title:
      "Theme: a provider switch repaints the page and the card, and a platform look re-lays an md control out at its own density while a high-contrast palette keeps its colours",
    capability: "theme",
  },
  {
    id: "confirm-dialog-lifecycle",
    title:
      "Modal: the shipped ConfirmDialog holds Cancel's focus, reports a confirm once, cancels on Enter and Escape, and returns focus to the app's opener",
    capability: "modal",
  },
  {
    id: "validation-lifecycle",
    title:
      "Input: the shipped Field submits on Enter, paints the schema's message and the destructive role when invalid, keeps the focus, and clears both on a valid value",
    capability: "input",
  },
  {
    id: "nested-overlay-lifecycle",
    title:
      "Overlay: a dialog holding a popover holding a menu dismisses exactly one surface per Escape, outside-in, and returns focus at each layer",
    capability: "overlay",
  },
  {
    id: "editor-overlay",
    title:
      "Editor: a transparent field over a code layer lets the code paint through, keeps its caret, and reports the offset a long file needs",
    capability: "editor",
  },
  {
    id: "multi-pane-editor",
    title:
      "Editor: two panes share one text session by press, the splitter resizes them without touching either buffer, and a closed pane keeps its file",
    capability: "editor",
  },
  {
    id: "table-filter-lifecycle",
    title:
      "Table: a typed filter narrows the painted rows, keeps the field's session, clears a hidden selection, and steps in the filtered order",
    capability: "table",
  },
  {
    id: "table-columns-lifecycle",
    title:
      "Table: hiding a column shifts later columns, a restore re-grows the content, the offset clamps to the new end, and a move re-orders header and cells together",
    capability: "table",
  },
  {
    id: "svg-pattern",
    title:
      "Content: a generated svg path is scaled from its view box by the element's width, clipped at the view box's edge, and paints above and below a box it does not fit",
    capability: "content",
  },
  {
    id: "inspector-lifecycle",
    title:
      "Workspace: an inspector beside its preview reads one object four ways, a field edits it without losing the session, a toolbar action sizes all three views, and its own wheel scrolls only the inspector",
    capability: "workspace",
  },
  {
    id: "text-truncation",
    title:
      "Content: a clipped run stops at its box and slices the last glyph, an ellipsis replaces the tail, ellipsis-start keeps it, a clamp cuts a paragraph, and an unclipped box lets the run escape",
    capability: "content",
  },
  {
    id: "box-paint",
    title:
      "Content: a dashed border covers less of its band than a solid one, a per-corner radius and a per-side width paint where they are asked, and a two-stop gradient grades across its box",
    capability: "content",
  },
  {
    id: "aspect-ratio-paint",
    title:
      "Layout: an aspect ratio derives the axis a box leaves open, two definite dimensions leave it unconsulted, and a row's stretch gives it no width",
    capability: "layout",
  },
  {
    id: "image-box",
    title:
      "Content: a loaded bitmap replaces a style's aspect ratio, two definite dimensions pin the box against it, and an unsized image paints its intrinsic edge",
    capability: "content",
  },
  {
    id: "elevation-paint",
    title:
      "Content: a box shadow paints the band its offset covers, a blur fades past the edge, a spread paints every side, an inset paints inside, a list paints every entry, and the shipped levels shade the page",
    capability: "content",
  },
  {
    id: "opacity-paint",
    title:
      "Content: opacity mixes a box with the page in its share's direction, zero is the page, above one is the fill, a parent fades the ink its child paints, and a faded box's shadow fades with it",
    capability: "content",
  },
  {
    id: "movable-tabs-lifecycle",
    title:
      "Workspace: a dragged tab lands in the strip the drop is over, its panel follows with the app's draft, a gap is a miss, and Cmd+Shift+Arrow steps it without wrapping",
    capability: "workspace",
  },
  {
    id: "slider-vertical-lifecycle",
    title:
      "Input: a vertical slider takes the caller's height, runs from the floor, positions by press and drag on the other axis, and its range moves only the nearer end",
    capability: "input",
  },
  {
    id: "modifier-select-lifecycle",
    title:
      "Table: a modified press carries the chord, shift ranges from the anchor, cmd toggles one record, cmd-shift adds the range, and a second press still reports one click",
    capability: "table",
  },
  {
    id: "rtl-text",
    title:
      "Text: a Hebrew run paints right to left against a Latin control, and a non-joiner changes an Arabic run's advance, so the platform shapes and mirrors the string",
    capability: "text",
  },
  {
    id: "syntax-palette",
    title:
      "Text: a code host paints the keyword its syntax palette names, and one handed no palette paints the runtime's own",
    capability: "text",
  },
  {
    id: "markdown-fence",
    title:
      "Text: a markdown fence paints its body fill and language strip, and the syntax palette's keyword on that composite",
    capability: "text",
  },
  {
    id: "find-highlight",
    title:
      "Search: a find paints the theme's resting and active washes, and a host handed no colour paints the runtime's own",
    capability: "search",
  },
  {
    id: "press-routing-lifecycle",
    title:
      "Input: a press or key on a composite row's inner element names every handler it runs, in the order it runs",
    capability: "input",
  },
  {
    id: "list-row-press",
    title:
      "Input: a status badge in a selectable row's trailing slot reaches the row, and a pill handed the pointer back does not",
    capability: "input",
  },
  {
    id: "column-resize-lifecycle",
    title:
      "Table: a column's divider keeps a drag past its own box, header and cells share the width it clamps to, and a move-only divider keeps none of it",
    capability: "table",
  },
  {
    id: "button-activation-lifecycle",
    title:
      "Input: the shipped Button activates on Enter's press and Space's release, carries the press point, and a disabled or busy button refuses every route",
    capability: "input",
  },
  {
    id: "date-picker-lifecycle",
    title:
      "Input: the shipped DatePicker opens on a day cell, moves real focus by key and clamps to its bounds, chooses on Enter, and Escape and Clear return the focus",
    capability: "input",
  },
  {
    id: "data-tree-lifecycle",
    title:
      "Tree: the shipped tree moves one tab stop with the cursor, opens and closes branches by arrow, jumps by type-ahead, and reveals a deep file",
    capability: "tree",
  },
  {
    id: "virtual-table-lifecycle",
    title:
      "Table: the shipped virtualized table retains one window of a thousand rows, reveals a far row that was never mounted, and holds its header while the rows move",
    capability: "table",
  },
  {
    id: "data-table-lifecycle",
    title:
      "Table: the shipped data table selects and focuses the row a press hit, walks records by arrow, keeps a selection through a sort and a hidden column, and resizes its track",
    capability: "table",
  },
  {
    id: "surface-origin",
    title:
      "Layout: a surface moved by a layout above delivers no layout report, and a nudged one-pixel probe reports the origin it has now",
    capability: "layout",
  },
  {
    id: "hover-routing-lifecycle",
    title:
      "Input: a filled child is the boundary a row's native hover stops at, while its unfilled and pointer-inert children leave the row's fill and its enter event intact",
    capability: "input",
  },
  {
    id: "multi-step-form-lifecycle",
    title:
      "Input: a multi-step form gates each step, keeps its draft across Back, and submits only the record its schema decodes",
    capability: "input",
  },
  {
    id: "image-fit",
    title:
      "Content: fill stretches a bitmap, contain letterboxes it, cover crops it, scaleDown centres its own size, none anchors it top-left, and an absent prop paints contain",
    capability: "content",
  },
  {
    id: "grid-focus-lifecycle",
    title:
      "Focus: a grid is one tab stop, arrows move real focus with a clamped roving cell, and Tab re-enters at the cell the reader pressed",
    capability: "focus",
  },
  {
    id: "document-type",
    title:
      "Text: a document host paints the code size, leading and caption strip the theme hands it, and one handed no theme paints the runtime's own",
    capability: "text",
  },
  {
    id: "system-theme-follow",
    title:
      "Theme: a running window follows a desktop palette without a restart or a remount, and returns to its own theme when the palette is deleted",
    capability: "theme",
  },
  {
    id: "flex-sizing",
    title:
      "Layout: a row's leftover goes to its growers, a basis of zero splits it evenly, an item shrinks only when it may, and alignSelf overrides a stretch",
    capability: "layout",
  },
  {
    id: "scrollbar-thumb",
    title:
      "Scroll: a scroller paints a native thumb in its own tint and thickness, at the viewport's share of the content, and none at all when the content fits",
    capability: "scroll",
  },
  {
    id: "scrollbar-thumb-both",
    title:
      "Scroll: a scroller that overflows both axes paints a native thumb on each trailing edge, and none when its content fits on both",
    capability: "scroll",
  },
  {
    id: "collapsible-lifecycle",
    title:
      "Layout: the shipped Collapsible measures its body in a window, clips to it and unmounts it when it closes",
    capability: "layout",
  },
  {
    id: "scrollbar-drag",
    title:
      "Scroll: the runtime's scrollbar is painted with no hitbox, so its thumb takes no pointer drag and only the wheel moves it",
    capability: "scroll",
  },
  {
    id: "hidden-subtree-lifecycle",
    title:
      "Focus: a display:none box still paints and keeps its tab stop while visibility:hidden paints nothing, and a carousel mounts only the slide on screen",
    capability: "focus",
  },
  {
    id: "crop-overlay",
    title:
      "Content: a crop frame masks a bitmap with four veil bars that take no press, and a corner handle drags the hole inside the bitmap's own bounds",
    capability: "content",
  },
  {
    id: "faded-hitbox-lifecycle",
    title:
      "Input: a box at opacity zero paints nothing yet keeps its tab stop, its press and its keys, so only an opt-out lets a press through a ghost",
    capability: "input",
  },
  {
    id: "empty-error-states-lifecycle",
    title:
      "Layout: a failed load paints its error surface and recovers, an empty panel paints no surface of its own, and both actions are real controls",
    capability: "layout",
  },
  {
    id: "blur-delivery-lifecycle",
    title:
      "Focus: a window whose app never activates delivers no onFocus or onBlur on any route — press, traversal, blur or unmount — while the focus id and keys still move",
    capability: "focus",
  },
  {
    id: "breadcrumb-navigation-lifecycle",
    title:
      "Navigation: a trail budgeted from its pane's own width keeps one row where the unbudgeted trail wraps, and the levels a budget hides are reachable through a menu the app composes",
    capability: "layout",
  },
  {
    id: "key-hold-lifecycle",
    title:
      "Input: a held key arrives with isHeld set, the shipped Button activates once through the repeats, and the app-level channel carries the same flag",
    capability: "input",
  },
  {
    id: "text-undo-lifecycle",
    title:
      "Input: a field's own cmd-z restores its text and reports it through onChange, a value pushed in from outside clears the history, and the text area undoes too",
    capability: "input",
  },
  {
    id: "focus-reveal-lifecycle",
    title:
      "Focus: a traversal focuses a control past its pane's fold without revealing it, while a roving list reveals the row its own key moved onto",
    capability: "focus",
  },
  {
    id: "z-index-lifecycle",
    title:
      "Layout: a local zIndex orders positioned siblings for paint and hit testing, no level keeps tree order, and a level on an in-flow child is inert",
    capability: "layout",
  },
  {
    id: "floating-reflow-lifecycle",
    title:
      "Floating: an open panel rests with the anchor a window reflow lays out again, on both the primitive and the shipped popover",
    capability: "floating",
  },
  {
    id: "sidebar-clip-lifecycle",
    title:
      "Panel: a collapsing sidebar's outer clip hides its content in the paint and the press, not only in the layout report",
    capability: "panel",
  },
  {
    id: "media-frame-lifecycle",
    title:
      "Content: a clip has no media host, so its frame is an image buffer the app's clock re-pushes and its transport is app-drawn",
    capability: "content",
  },
  {
    id: "menu-radio-lifecycle",
    title:
      "Input: an exclusive-choice menu paints its mark on the chosen row, a choice closes it, and the chosen row reports nothing",
    capability: "input",
  },
  {
    id: "app-chrome-lifecycle",
    title:
      "Workspace: the shipped menu bar opens and navigates, the toolbar roves the native focus and overflows, and the status bar paints its tone roles",
    capability: "workspace",
  },
] as const satisfies ReadonlyArray<LiveProbeMeta>;

/** The id of a registered live probe. */
export type LiveProbeId = (typeof liveRegistry)[number]["id"];
