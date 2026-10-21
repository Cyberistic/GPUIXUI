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
 * `focus-visible` is plan `053`'s STOP gate: whether the runtime's declared
 * `focusVisible` state paints for keyboard focus, and whether a programmatic
 * focus or a mouse press shows it. The probe records native focus ids and
 * captures each state; the outline's *paint* is judged from the captures (a
 * renderer reports no style for a window), so this is visual evidence, not a
 * style assertion.
 */
export const liveRegistry = [
  {
    id: "focus-visible",
    title:
      "Focus: focusVisible paints for Tab, not for a press or a programmatic focus",
    capability: "focus",
  },
] as const satisfies ReadonlyArray<LiveProbeMeta>;

/** The id of a registered live probe. */
export type LiveProbeId = (typeof liveRegistry)[number]["id"];
