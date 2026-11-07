import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export interface CarouselColour {
  readonly hex: string;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export const rgbaOf = (colour: CarouselColour): Pixels.Rgba =>
  new Pixels.Rgba({ r: colour.r, g: colour.g, b: colour.b, a: 0xff });

export type CarouselSlideName = "canvas" | "inspector" | "timeline";

export interface CarouselSlideSpec {
  readonly name: CarouselSlideName;
  readonly label: string;
  readonly height: number;
  readonly fill: CarouselColour;
  readonly ink: CarouselColour;
}

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

export const carouselSlides = (): ReadonlyArray<CarouselSlideSpec> => [
  CAROUSEL_SLIDES[0],
  CAROUSEL_SLIDES[1],
  CAROUSEL_SLIDES[2],
];

export const carouselSlide = (name: CarouselSlideName): CarouselSlideSpec =>
  Option.getOrElse(
    Arr.findFirst(carouselSlides(), (slide) => slide.name === name),
    () => CAROUSEL_SLIDES[0],
  );

export const CAROUSEL_TRACK_WIDTH = 360;

export const CAROUSEL_BORDER = 1;

export const carouselFrameHeight = (index: number): number =>
  Option.getOrElse(Arr.get(carouselSlides(), index), () => CAROUSEL_SLIDES[0])
    .height +
  2 * CAROUSEL_BORDER;

export const CAROUSEL_DOT = {
  target: 24,

  height: 6,

  rest: 6,

  active: 18,
} as const;

export const dotWidth = (index: number, active: number): number =>
  index === active ? CAROUSEL_DOT.active : CAROUSEL_DOT.rest;

export const CAROUSEL_LEVEL_MS = 160;

export const CAROUSEL_PARTIAL_MS = 40;

export const CAROUSEL_WIDTH_TOLERANCE = 1.5;

export const sameWidth = (measured: number, expected: number): boolean =>
  Math.abs(measured - expected) <= CAROUSEL_WIDTH_TOLERANCE;

export const travelling = (measured: number): boolean =>
  measured > CAROUSEL_DOT.rest + 2.5 && measured < CAROUSEL_DOT.active - 2.5;

export const CAROUSEL_IDS = {
  probe: "carousel-probe",
  readout: "carousel-readout",

  loop: "carousel-loop",
  root: "carousel-root",
  track: "carousel-track",
  previous: "carousel-previous",
  next: "carousel-next",

  dots: "carousel-dots",
} as const;

export const dotId = (index: number): string => `${CAROUSEL_IDS.dots}-${index}`;

export const slideId = (name: CarouselSlideName): string =>
  `carousel-slide-${name}`;

export const carouselReadout = (state: {
  readonly active: number;
  readonly reports: number;
  readonly loop: boolean;
}): string =>
  `active=${state.active} reports=${state.reports} ` +
  `loop=${state.loop ? "on" : "off"}`;

export const CAROUSEL_CHECKS = 97;
