import * as Arr from "effect/Array";

export const HIDDEN_IDS = {
  probe: "hidden-probe",
  before: "hidden-before",
  displayWrapper: "hidden-display-wrapper",
  displayControl: "hidden-display-control",
  visibilityFrame: "hidden-visibility-frame",
  visibilityWrapper: "hidden-visibility-wrapper",
  visibilityControl: "hidden-visibility-control",
  carousel: "hidden-carousel",
  activeSlide: "hidden-active-slide",
  activeSlideFrame: "hidden-active-slide-frame",

  inactiveSlide: "hidden-inactive-slide",

  inactiveSlideFrame: "hidden-inactive-slide-frame",
  after: "hidden-after",
  readout: "hidden-readout",
} as const;

export const HIDDEN_KEY = "a";

export interface HidingCase {
  readonly word: "display" | "visibility";

  readonly wrapper: string;

  readonly control: string;

  readonly consequence: string;
}

export const HIDING_CASES: ReadonlyArray<HidingCase> = [
  {
    word: "display",
    wrapper: HIDDEN_IDS.displayWrapper,
    control: HIDDEN_IDS.displayControl,
    consequence:
      "a display:none box would paint, lay out and keep a live tab stop",
  },
  {
    word: "visibility",
    wrapper: HIDDEN_IDS.visibilityWrapper,
    control: HIDDEN_IDS.visibilityControl,
    consequence:
      "a visibility:hidden box would paint or take layout space it should not",
  },
];

export const HIDDEN_WALK = 8;

export const hiddenReadout = (state: {
  readonly slide: number;
  readonly invisibleKeys: number;
}): string => `slide=${state.slide} invisibleKeys=${state.invisibleKeys}`;

export const HIDDEN_STOPS: ReadonlyArray<string> = [
  HIDDEN_IDS.before,
  HIDDEN_IDS.displayControl,
  HIDDEN_IDS.carousel,
  HIDDEN_IDS.activeSlide,
  HIDDEN_IDS.after,
];

export const HIDDEN_CHECKS = 2 + 1 + 4 + 5 + 2 + 4 + 4 + 2;

export const isHiddenControl = (id: string): boolean =>
  Arr.some(HIDING_CASES, (entry) => entry.control === id);
