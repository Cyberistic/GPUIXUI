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
    id: "tooltip-lifecycle",
    title:
      "Overlay: the shipped Tooltip opens on hover above its trigger, closes on leave and dismisses on Escape, while a keyboard focus does not open it",
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
] as const satisfies ReadonlyArray<LiveProbeMeta>;

/** The id of a registered live probe. */
export type LiveProbeId = (typeof liveRegistry)[number]["id"];
