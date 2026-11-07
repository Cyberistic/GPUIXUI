import * as Arr from "effect/Array";
import * as P from "effect/Predicate";

export type AccordionSection = "alpha" | "beta" | "gamma" | "delta";

export const ACCORDION_BODIES: Readonly<Record<AccordionSection, number>> = {
  alpha: 120,
  beta: 200,
  gamma: 80,
  delta: 60,
};

export const ACCORDION_ORDER: ReadonlyArray<AccordionSection> = [
  "alpha",
  "beta",
  "gamma",
  "delta",
];

export const ACCORDION_DISABLED: AccordionSection = "gamma";

export const ACCORDION_ENABLED: ReadonlyArray<AccordionSection> = Arr.filter(
  ACCORDION_ORDER,
  (section) => section !== ACCORDION_DISABLED,
);

export const ACCORDION_START: AccordionSection = "alpha";

export const isAccordionSection = (value: unknown): value is AccordionSection =>
  P.isString(value) && Arr.contains(ACCORDION_ORDER, value);

export const accordionOpen = (
  value: string | null,
): AccordionSection | "none" =>
  value !== null && isAccordionSection(value) ? value : "none";

export const ACCORDION_WIDTH = 300;

export const ACCORDION_IDS = {
  probe: "accordion-probe",
  readout: "accordion-readout",
} as const;

export const accordionTrigger = (section: AccordionSection): string =>
  `accordion-${section}-trigger`;

export const accordionClip = (section: AccordionSection): string =>
  `accordion-${section}-clip`;

export const accordionBody = (section: AccordionSection): string =>
  `accordion-${section}-body`;

export interface AccordionState {
  readonly open: AccordionSection | "none";
  readonly changes: number;
}

export const accordionReadout = (state: AccordionState): string =>
  `open=${state.open} changes=${state.changes}`;

export const ACCORDION_REST: AccordionState = {
  open: ACCORDION_START,
  changes: 0,
};

export interface AccordionMove {
  readonly key: "down" | "up" | "home" | "end";
  readonly from: AccordionSection;
  readonly to: AccordionSection;

  readonly rule: string;
}

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

export const accordionShift = (
  from: AccordionSection,
  to: AccordionSection,
): number => ACCORDION_BODIES[to] - ACCORDION_BODIES[from];

export const ACCORDION_CHECKS = Arr.reduce(
  [6, 7, 1, ACCORDION_MOVES.length, 1, 5, 2, 2],
  0,
  (total, part) => total + part,
);
