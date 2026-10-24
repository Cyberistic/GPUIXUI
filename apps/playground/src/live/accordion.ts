/**
 * The scene `accordion-lifecycle` paints and the arithmetic it reads it with.
 *
 * The shipped `Accordion` is the one disclosure surface whose sections are
 * **coordinated**: opening one closes the one before it, a disabled header is
 * refused by every route, and the arrows move real focus from header to header
 * without opening anything. A window can answer all three, and it can answer
 * the layout question the reveal asks — a section's body is measured by
 * `AutoHeight`, so the sections below it must move by exactly the difference
 * between the two measured bodies.
 *
 * Four sections with four different body heights: alpha starts open, gamma is
 * disabled, and beta is taller than alpha so a switch between them has a
 * non-zero shift to read. Alpha and beta are the pair the shift is derived
 * from, so no two heights in the scene may be equal.
 */
import * as Arr from "effect/Array";
import * as P from "effect/Predicate";

/** The sections, in declaration order. */
export type AccordionSection = "alpha" | "beta" | "gamma" | "delta";

/** The body each section reveals. Every step is distinct, so a shift names a pair. */
export const ACCORDION_BODIES: Readonly<Record<AccordionSection, number>> = {
  alpha: 120,
  beta: 200,
  gamma: 80,
  delta: 60,
};

/** Declaration order: the order the arrows and the dividers see. */
export const ACCORDION_ORDER: ReadonlyArray<AccordionSection> = [
  "alpha",
  "beta",
  "gamma",
  "delta",
];

/** The one header no path may reach, which every arrow step has to skip. */
export const ACCORDION_DISABLED: AccordionSection = "gamma";

/** The headers a traversal, an arrow or a jump can land on. */
export const ACCORDION_ENABLED: ReadonlyArray<AccordionSection> = Arr.filter(
  ACCORDION_ORDER,
  (section) => section !== ACCORDION_DISABLED,
);

/** The section single, non-collapsible mode starts with open. */
export const ACCORDION_START: AccordionSection = "alpha";

/** Whether a value is one of this scene's sections. */
export const isAccordionSection = (value: unknown): value is AccordionSection =>
  P.isString(value) && Arr.contains(ACCORDION_ORDER, value);

/**
 * The section a reported value names, or `none`.
 *
 * The component reports `string | null` because it is generic over its values;
 * this scene's value is a section, so the boundary narrows rather than casts —
 * and a value outside the scene reads as the absence every open-body check
 * fails on, which is a report rather than a crash.
 */
export const accordionOpen = (
  value: string | null,
): AccordionSection | "none" =>
  value !== null && isAccordionSection(value) ? value : "none";

/** The width the accordion is laid out at; a reveal animates height, never width. */
export const ACCORDION_WIDTH = 300;

/** The probe's own boxes: the mount guard and the readout. */
export const ACCORDION_IDS = {
  probe: "accordion-probe",
  readout: "accordion-readout",
} as const;

/** A section's header, named by the value the accordion reports for it. */
export const accordionTrigger = (section: AccordionSection): string =>
  `accordion-${section}-trigger`;

/** The clipping box `AutoHeight` settles on the measured body. */
export const accordionClip = (section: AccordionSection): string =>
  `accordion-${section}-clip`;

/** The caller's body, whose fixed height the reveal measures. */
export const accordionBody = (section: AccordionSection): string =>
  `accordion-${section}-body`;

/** What the readout publishes: the open section and the notifications it got. */
export interface AccordionState {
  /**
   * The open section, or `none`. Non-collapsible single mode never reports the
   * absence, so `none` is the readout a section that closed everything paints —
   * every open-body check then fails naming it.
   */
  readonly open: AccordionSection | "none";
  readonly changes: number;
}

/** The readout's one spelling, so the probe and its record print the same line. */
export const accordionReadout = (state: AccordionState): string =>
  `open=${state.open} changes=${state.changes}`;

/** The state before any input: alpha open, nothing reported yet. */
export const ACCORDION_REST: AccordionState = {
  open: ACCORDION_START,
  changes: 0,
};

/** One arrow or jump: the key, where focus stands, and where it lands. */
export interface AccordionMove {
  readonly key: "down" | "up" | "home" | "end";
  readonly from: AccordionSection;
  readonly to: AccordionSection;
  /** The rule the move proves, printed in the check's name. */
  readonly rule: string;
}

/**
 * Five moves from the header a press leaves focused: down skips the disabled
 * section, both ends wrap, and Home/End jump to the enabled edges.
 */
export const ACCORDION_MOVES: ReadonlyArray<AccordionMove> = [
  {
    key: "down",
    from: "beta",
    to: "delta",
    rule: "Down skips the disabled header",
  },
  {
    key: "down",
    from: "delta",
    to: "alpha",
    rule: "Down wraps past the last enabled header",
  },
  {
    key: "up",
    from: "alpha",
    to: "delta",
    rule: "Up wraps to the last enabled header",
  },
  {
    key: "home",
    from: "delta",
    to: "alpha",
    rule: "Home jumps to the first enabled header",
  },
  {
    key: "end",
    from: "alpha",
    to: "delta",
    rule: "End jumps to the last enabled header",
  },
];

/**
 * How far the sections below move when `from` closes and `to` opens.
 *
 * Both boxes are the reveal's measured height, so this is the layout the
 * window has to paint rather than the sum of two caller numbers by assumption.
 */
export const accordionShift = (
  from: AccordionSection,
  to: AccordionSection,
): number => ACCORDION_BODIES[to] - ACCORDION_BODIES[from];

/**
 * The checks the probe asserts, by the step that makes them:
 *
 * - rest: the readout, the open body painting and its height (two sites: the
 *   box and the size), the settled clip, and the two closed sections that mount
 *   nothing (6);
 * - the first press: the readout, the body and its height, the settled clip,
 *   the body that closed, its clip, and the shift the pair produces (7);
 * - the focus the press leaves on its own header (1);
 * - one per arrow or jump (5);
 * - the open section the arrows left alone (1);
 * - `Enter`: the readout, the body and its height, the clip, and the section
 *   that closed (5);
 * - `Space` on the open section: the readout and the body that stays (2);
 * - the disabled header: the readout and the body it never mounts (2).
 */
export const ACCORDION_CHECKS = Arr.reduce(
  [6, 7, 1, ACCORDION_MOVES.length, 1, 5, 2, 2],
  0,
  (total, part) => total + part,
);
