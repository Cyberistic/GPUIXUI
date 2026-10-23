/**
 * What a window says about the two ways a library hides a subtree, and the
 * arithmetic the `hidden-subtree-lifecycle` probe reads it with.
 *
 * The pinned renderer accepts `display` and `visibility` on every element
 * (`StyleDesc`), but `apply_styles` only acts on two `display` values — `flex`
 * and `grid` — while `visibility: "hidden"` becomes GPUI's `invisible()`. So
 * the two words a component reaches for are not the same capability, and the
 * consequence is measured rather than typed: a `display: none` box still lays
 * out, paints and keeps its tab stop, while an invisible one paints nothing.
 *
 * The shipped `Carousel` rests on the first word: every slide stays mounted so
 * its state survives, and only the active one is laid out with `display`. This
 * probe mounts it beside a bare wrapper so a finding is about the runtime and
 * about the one component that relies on it.
 *
 * `dock-focus-lifecycle` measured the clipped shape — a control inside a
 * zero-width parent keeps its stop. This is the sibling question for the two
 * hiding words, and the answers a panel, a carousel or a tab strip must design
 * around.
 */
import * as Arr from "effect/Array";

/** Every id the window reports, one per painted box and the probe's readout. */
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

/** The key the probe types at a control it focused from code. */
export const HIDDEN_KEY = "a";

/** One hiding word, with the control inside it and what it costs if ignored. */
export interface HidingCase {
  /** The word the style sets. */
  readonly word: "display" | "visibility";
  /** The wrapper a probe can locate; the control is inside it. */
  readonly wrapper: string;
  /** The focusable control the menu of the subtree is about. */
  readonly control: string;
  /** What a reader or a pointer loses if the word does not hide the subtree. */
  readonly consequence: string;
}

/** The two words the runtime's style accepts, side by side. */
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
/**
 * How many Tab presses the walk may spend before it gives up.
 *
 * The visible stops are `before`, the display-hidden control, the carousel,
 * the active slide's control and `after`; two more presses reach a repeat even
 * when both hidden controls and the spare slide keep a stop each.
 */
export const HIDDEN_WALK = 10;

/**
 * The readout's one spelling: the slide on screen and the keys the invisible
 * control has heard.
 */
export const hiddenReadout = (state: {
  readonly slide: number;
  readonly invisibleKeys: number;
}): string => `slide=${state.slide} invisibleKeys=${state.invisibleKeys}`;

/**
 * The stops the probe expects to walk, in tree order, from the visible control
 * before the hidden shapes to the one after the carousel.
 *
 * A `display: none` wrapper is in this list because the renderer ignores the
 * word: the row is what the window measured, not what the CSS reads, and the
 * probe's record says which entry is the defect to flip.
 */
export const HIDDEN_STOPS: ReadonlyArray<string> = [
  HIDDEN_IDS.before,
  HIDDEN_IDS.displayControl,
  HIDDEN_IDS.carousel,
  HIDDEN_IDS.activeSlide,
  HIDDEN_IDS.inactiveSlide,
  HIDDEN_IDS.after,
];

/**
 * The checks the probe asserts, in the order it asks them:
 *
 * - the two roles the paint reads compare against (2) and the capture's device
 *   scale (1);
 * - the `display: none` control reports a box, keeps its 32-point height, and
 *   its centre is sampled and paints its own fill (4);
 * - the invisible control reports no box, its visible frame keeps the 32-point
 *   row it held, and that row's centre is sampled and paints the page (5);
 * - the walk starts where the probe put it and repeats the measured stops (2);
 * - both carousel slides paint their own box, share a row, and the spare one is
 *   laid out one slide-width along it (4) — the defect the record carries until
 *   the component stops trusting `display`;
 * - stepping the carousel moves the slide and both slides still paint (3);
 * - the invisible control focused from code reports what the window did, and a
 *   key typed at it proves whether it is live (2). The window reports the id as
 *   focused and delivers no key: a code focus is not proof of a live control.
 */
export const HIDDEN_CHECKS = 2 + 1 + 4 + 5 + 2 + 4 + 3 + 2;

/** Whether `id` is inside a subtree the probe's style hides. */
export const isHiddenControl = (id: string): boolean =>
  Arr.some(HIDING_CASES, (entry) => entry.control === id);
