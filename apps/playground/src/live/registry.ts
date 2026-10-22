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
      "Overlay: the shipped Tooltip opens on hover and on a keyboard focus above its trigger, closes on leave and dismisses on Escape",
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
    id: "selection-lifecycle",
    title:
      "Text: a real pointer drag over the shipped Text paints the selection, getSelectedText reports it, Cmd+C copies it, and a default node opts out",
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
    id: "window-chrome",
    title:
      "Window: the app's layout starts at the window's top edge, the reported insets carry no titlebar band in either titlebar mode, and an app insets its own chrome",
    capability: "workspace",
  },
] as const satisfies ReadonlyArray<LiveProbeMeta>;

/** The id of a registered live probe. */
export type LiveProbeId = (typeof liveRegistry)[number]["id"];
