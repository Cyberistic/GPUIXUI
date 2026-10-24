/**
 * The `carousel-lifecycle` probe's fixture: three slides whose fills and inks
 * are the only paint a capture reads, and the invariants the carousel's three
 * paint claims rest on.
 *
 * `Carousel` shipped with an offscreen suite that reads the tree and the box a
 * component was handed. Three of its claims are claims about what reached the
 * frame:
 *
 * 1. **Only the slide on screen is mounted**, so no other slide paints at all
 *    — a spare slide mounted with `display: none` would paint beside the active
 *    one on this runtime, which is why the component unmounts instead.
 * 2. **The frame takes its height from the slide on screen**, which is the
 *    reason the track does not travel between slides.
 * 3. **The active indicator is an 18×6 pill that grows from the 6×6 dot** on
 *    the runtime's clock, while the two inks change in the same frame (motion
 *    interpolates numbers and has no colour).
 *
 * Each slide therefore carries its own fill *and* its own label ink, so a
 * capture can tell which slide's subtree painted by looking at the colours
 * only it can produce, and a height no other slide shares, so the frame's box
 * names the slide it is sized by.
 *
 * The arithmetic here is expressed over the boxes the runtime reports rather
 * than over the component's own layout code: a second copy of the layout would
 * agree with itself. Kept native-free, as every fixture is.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** A colour as the fixture declares it: the channels and the hex a page prints. */
export interface CarouselColour {
  readonly hex: string;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** An RGBA value the capture counter compares with. */
export const rgbaOf = (colour: CarouselColour): Pixels.Rgba =>
  new Pixels.Rgba({ r: colour.r, g: colour.g, b: colour.b, a: 0xff });

/** The slide names, in the order the carousel mounts them. */
export type CarouselSlideName = "canvas" | "inspector" | "timeline";

/** One slide: its fill, the ink its label paints, and the height it asks for. */
export interface CarouselSlideSpec {
  readonly name: CarouselSlideName;
  readonly label: string;
  readonly height: number;
  readonly fill: CarouselColour;
  readonly ink: CarouselColour;
}

/**
 * The three slides.
 *
 * Every colour is one the shipped dark palette and the page around it cannot
 * produce, so a count of it is a count of that slide's paint. The three
 * heights differ on purpose: a frame sized by the tallest slide would paint
 * the same box on every slide, and a frame sized by the slide on screen moves.
 */
export const CAROUSEL_SLIDES = [
  {
    name: "canvas",
    label: "Canvas",
    height: 120,
    fill: { hex: "#2A6BF2", r: 0x2a, g: 0x6b, b: 0xf2 },
    ink: { hex: "#FFF200", r: 0xff, g: 0xf2, b: 0x00 },
  },
  {
    name: "inspector",
    label: "Inspector",
    height: 160,
    fill: { hex: "#1F9D55", r: 0x1f, g: 0x9d, b: 0x55 },
    ink: { hex: "#FF8AF5", r: 0xff, g: 0x8a, b: 0xf5 },
  },
  {
    name: "timeline",
    label: "Timeline",
    height: 100,
    fill: { hex: "#B45309", r: 0xb4, g: 0x53, b: 0x09 },
    ink: { hex: "#00FFC8", r: 0x00, g: 0xff, b: 0xc8 },
  },
] as const satisfies ReadonlyArray<CarouselSlideSpec>;

/** The slides in documentation order, for a sweep. */
export const carouselSlides = (): ReadonlyArray<CarouselSlideSpec> => [
  CAROUSEL_SLIDES[0],
  CAROUSEL_SLIDES[1],
  CAROUSEL_SLIDES[2],
];

/** A slide by name, so a probe never indexes the list by position. */
export const carouselSlide = (name: CarouselSlideName): CarouselSlideSpec =>
  Option.getOrElse(
    Arr.findFirst(carouselSlides(), (slide) => slide.name === name),
    () => CAROUSEL_SLIDES[0],
  );

/** The width every slide paints: the track's own box. */
export const CAROUSEL_TRACK_WIDTH = 360;

/** The track's border, which is also the inset the slide paints inside. */
export const CAROUSEL_BORDER = 1;

/**
 * The height the frame paints for the slide at `index`.
 *
 * The track is styled with no height of its own, so it wraps its one mounted
 * slide; the border is the only addition. A frame that laid every slide out
 * would take the tallest slide's height on every index.
 */
export const carouselFrameHeight = (index: number): number =>
  Option.getOrElse(Arr.get(carouselSlides(), index), () => CAROUSEL_SLIDES[0])
    .height +
  2 * CAROUSEL_BORDER;

/** The indicator's own geometry, as the component declares it. */
export const CAROUSEL_DOT = {
  /** The press target around every drawing, the 24px floor. */
  target: 24,
  /** Every dot's height. */
  height: 6,
  /** A dot that is not the selected slide. */
  rest: 6,
  /** The selected slide's pill. */
  active: 18,
} as const;

/** The width dot `index` paints while `active` is the selected slide. */
export const dotWidth = (index: number, active: number): number =>
  index === active ? CAROUSEL_DOT.active : CAROUSEL_DOT.rest;

/**
 * The indicator's timing: `@gpuixui/motion`'s `fast` level.
 *
 * The component passes its dot to the runtime as a `motion` target at that
 * level; the probe reads the tween on the renderer's motion clock, so the
 * offsets are the level's own and not wall time.
 */
export const CAROUSEL_LEVEL_MS = 160;

/** The offset the probe freezes partway through the level. */
export const CAROUSEL_PARTIAL_MS = 40;

/**
 * How far an exact-colour width may sit from the drawing's declared width.
 *
 * A dot's ends are rounded, so the pixels that paint the ink *exactly* stop a
 * point short of its box: a 6px dot measures 5 and an 18px pill 17 at this
 * host's 2× capture. The band is wider than that loss and far narrower than the
 * gap between the two widths, so a dot still cannot be read as a pill.
 */
export const CAROUSEL_WIDTH_TOLERANCE = 1.5;

/** Whether a width read off a capture is the width it should be. */
export const sameWidth = (measured: number, expected: number): boolean =>
  Math.abs(measured - expected) <= CAROUSEL_WIDTH_TOLERANCE;

/** Whether a frozen mid-tween width is a size between a dot and the pill. */
export const travelling = (measured: number): boolean =>
  measured > CAROUSEL_DOT.rest + 2.5 && measured < CAROUSEL_DOT.active - 2.5;

/** The `testId`s the view and the steps share. */
export const CAROUSEL_IDS = {
  probe: "carousel-probe",
  readout: "carousel-readout",
  /** The caller's loop preference, so one window measures both rules. */
  loop: "carousel-loop",
  root: "carousel-root",
  track: "carousel-track",
  previous: "carousel-previous",
  next: "carousel-next",
  /** The indicators' group; each press target is `${dots}-${index}`. */
  dots: "carousel-dots",
} as const;

/** The press target of dot `index`. */
export const dotId = (index: number): string => `${CAROUSEL_IDS.dots}-${index}`;

/** The slide element's id: a mounted slide is the only one the window paints. */
export const slideId = (name: CarouselSlideName): string =>
  `carousel-slide-${name}`;

/** What the probe's readout prints, so every check reads one line. */
export const carouselReadout = (state: {
  readonly active: number;
  readonly reports: number;
  readonly loop: boolean;
}): string =>
  `active=${state.active} reports=${state.reports} ` +
  `loop=${state.loop ? "on" : "off"}`;

/**
 * The checks the probe asserts, so its documentation cannot drift.
 *
 * Every check the probe records, including the reads its helpers make on the
 * way (a painted box, a capture at a whole device scale, a dot's drawing): the
 * first slide's frame and paint, the step to the second, the keys, the
 * disabled edges and the wrap, the dots' roles and widths, and the frozen,
 * partial and settled frames of the indicator's journey.
 */
export const CAROUSEL_CHECKS = 97;
