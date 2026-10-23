/**
 * What a box painted at `opacity: 0` still does to the pointer and the keyboard,
 * and the arithmetic the `faded-hitbox-lifecycle` probe reads it with.
 *
 * `opacity-paint` measured what the share paints — the page at zero. It did not
 * measure whether the box is still **there** for input, which is the question a
 * leaving surface asks: `@gpuixui/motion` fades a surface out and
 * `presenceStyle` has to guard its pointer path, and the components cover the
 * controls a dismissed shell keeps mounted with `PresenceShield`. If a fade
 * removed the hitbox those guards would be optional; if it does not, a ghost
 * would swallow the press meant for the screen behind it.
 *
 * The probe mounts three shapes:
 *
 *   - a control at `opacity: 0` on its own row, which answers whether the fade
 *     removes its tab stop, its press and its keys;
 *   - a painted target with a transparent cover over it, which answers whether
 *     the cover takes the press the target should receive;
 *   - the same pair with `pointerEvents: "none"` on the cover, the opt-out the
 *     library's shields declare.
 *
 * Native-free on purpose: the ids, the readout and the check count are testable
 * on a host with no binding.
 */

/** Every id the window reports, one per box and the probe's readout. */
export const FADED_IDS = {
  probe: "faded-probe",
  before: "faded-before",
  control: "faded-control",
  coveredTarget: "faded-covered-target",
  cover: "faded-cover",
  inertTarget: "faded-inert-target",
  inertCover: "faded-inert-cover",
  readout: "faded-readout",
} as const;

/** The share a ghost is painted at: the capture's page and no ink. */
export const FADED_OPACITY = 0;
/** The size every control-shaped box in the probe is built at. */
export const FADED_WIDTH = 200;
export const FADED_HEIGHT = 32;
/** The key typed at the faded control once the probe focuses it from code. */
export const FADED_KEY = "a";

/** The counters the readout spells, each one input a box did or did not hear. */
export interface FadedPresses {
  /** Presses the faded control itself heard. */
  readonly faded: number;
  /** Keys the faded control heard while it held focus. */
  readonly keys: number;
  /** Presses the transparent cover over a target heard. */
  readonly cover: number;
  /** Presses the covered target heard while the cover was in front of it. */
  readonly target: number;
  /** Presses the inert cover's handler heard — the opt-out keeps the handler. */
  readonly inertCover: number;
  /** Presses the target under the inert cover heard. */
  readonly inertTarget: number;
}

/** The readout's one spelling. */
export const fadedReadout = (presses: FadedPresses): string =>
  `faded=${presses.faded} keys=${presses.keys} cover=${presses.cover} target=${presses.target} inertCover=${presses.inertCover} inertTarget=${presses.inertTarget}`;

/**
 * The check count the probe asserts, in the order it asks them:
 *
 * - the two roles the paint reads compare against (2) and the capture's device
 *   scale (1);
 * - the faded control reports its **200×32** box, the frame holds the sampled
 *   point and the page paints there, so the share removed the ink and not the
 *   layout (5);
 * - Tab from the control before it lands on the faded control, so a fade keeps
 *   its tab stop (1);
 * - a press at that control's centre reaches it (1);
 * - a key typed while it holds focus reaches it (1);
 * - the transparent cover reports its box, its point is sampled, the target's
 *   fill paints through it, and the cover takes the press while the target
 *   behind it hears none (4);
 * - the inert cover's target reports its box, its point is sampled and paints,
 *   and the press reaches the target while the cover's handler still runs (4).
 */
export const FADED_CHECKS = 3 + 5 + 1 + 1 + 1 + 4 + 4;

/** The ids a press is aimed at, with the shape each one stands for. */
export const FADED_PRESS_CASES: ReadonlyArray<{
  readonly aimedAt: string;
  readonly hears: keyof FadedPresses;
  readonly rule: string;
}> = [
  {
    aimedAt: FADED_IDS.control,
    hears: "faded",
    rule: "a share of zero removes the ink, not the box it was painted on",
  },
  {
    aimedAt: FADED_IDS.coveredTarget,
    hears: "cover",
    rule: "a transparent cover is still in the pointer's path",
  },
  {
    aimedAt: FADED_IDS.inertTarget,
    hears: "inertTarget",
    rule: "pointerEvents none lets the press through, while the cover's own handler still runs",
  },
];
