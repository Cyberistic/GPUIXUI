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
] as const satisfies ReadonlyArray<LiveProbeMeta>;

/** The id of a registered live probe. */
export type LiveProbeId = (typeof liveRegistry)[number]["id"];
