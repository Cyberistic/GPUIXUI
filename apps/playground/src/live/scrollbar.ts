import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const SCROLLBAR_IDS = {
  probe: "scrollbar-probe",
  tinted: "scrollbar-tinted",
  tintedContent: "scrollbar-tinted-content",
  wide: "scrollbar-wide",
  wideContent: "scrollbar-wide-content",
  short: "scrollbar-short",
  shortContent: "scrollbar-short-content",
  floor: "scrollbar-floor",
  floorContent: "scrollbar-floor-content",
  horizontal: "scrollbar-horizontal",
  horizontalContent: "scrollbar-horizontal-content",
  default: "scrollbar-default",
  defaultContent: "scrollbar-default-content",
  swatch: "scrollbar-default-swatch",
} as const;

export const SCROLLBAR_VIEWPORT = { width: 260, height: 160 } as const;

export const SCROLLBAR_FILL = "#1E2A38";

export const SCROLLBAR_DEFAULT_WIDTH = 6;

export const SCROLLBAR_MIN_THUMB = 20;

export const SCROLLBAR_FLOOR_CONTENT = 10_000;

export const SCROLLBAR_SCROLLED_BY = 400;

export type ScrollAxis = "vertical" | "horizontal";

export interface ScrollbarCase {
  readonly id: string;

  readonly contentId: string;

  readonly axis: ScrollAxis;

  readonly content: number;

  readonly tint: Option.Option<string>;

  readonly width: Option.Option<number>;
}

export const SCROLLBAR_TINTED: ScrollbarCase = {
  id: SCROLLBAR_IDS.tinted,
  contentId: SCROLLBAR_IDS.tintedContent,
  axis: "vertical",
  content: 1000,
  tint: Option.some("#FF00AA"),
  width: Option.some(10),
};

export const SCROLLBAR_WIDE: ScrollbarCase = {
  id: SCROLLBAR_IDS.wide,
  contentId: SCROLLBAR_IDS.wideContent,
  axis: "vertical",
  content: 500,
  tint: Option.some("#00E5FF"),
  width: Option.some(18),
};

export const SCROLLBAR_SHORT: ScrollbarCase = {
  id: SCROLLBAR_IDS.short,
  contentId: SCROLLBAR_IDS.shortContent,
  axis: "vertical",
  content: 100,
  tint: Option.some("#FFD400"),
  width: Option.some(10),
};

export const SCROLLBAR_FLOOR: ScrollbarCase = {
  id: SCROLLBAR_IDS.floor,
  contentId: SCROLLBAR_IDS.floorContent,
  axis: "vertical",
  content: SCROLLBAR_FLOOR_CONTENT,
  tint: Option.some("#B6FF3B"),
  width: Option.some(10),
};

export const SCROLLBAR_CASES: ReadonlyArray<ScrollbarCase> = [
  SCROLLBAR_TINTED,
  SCROLLBAR_WIDE,
  SCROLLBAR_SHORT,
  SCROLLBAR_FLOOR,
];

export const SCROLLBAR_HORIZONTAL: ScrollbarCase = {
  id: SCROLLBAR_IDS.horizontal,
  contentId: SCROLLBAR_IDS.horizontalContent,
  axis: "horizontal",
  content: 1000,
  tint: Option.some("#FF6B00"),
  width: Option.some(10),
};

export const SCROLLBAR_HORIZONTAL_SCROLLED_BY = 400;

export const SCROLLBAR_DEFAULT: ScrollbarCase = {
  id: SCROLLBAR_IDS.default,
  contentId: SCROLLBAR_IDS.defaultContent,
  axis: "vertical",
  content: 1000,
  tint: Option.none(),
  width: Option.none(),
};

export const SCROLLBAR_VIEWPORTS: ReadonlyArray<ScrollbarCase> = [
  ...SCROLLBAR_CASES,
  SCROLLBAR_HORIZONTAL,
  SCROLLBAR_DEFAULT,
];

export const trackOf = (
  axis: ScrollAxis,
  viewport: {
    readonly width: number;
    readonly height: number;
  } = SCROLLBAR_VIEWPORT,
): number => (axis === "horizontal" ? viewport.width : viewport.height);

export const maxOffset = (content: number, track: number): number =>
  Math.max(0, content - track);

export interface ThumbBox {
  readonly start: number;
  readonly length: number;
}

export const thumbOf = (
  track: number,
  content: number,
  offset: number,
): Option.Option<ThumbBox> =>
  thumbBox(track, maxOffset(content, track), offset);

export const thumbBox = (
  track: number,
  maxScroll: number,
  offset: number,
): Option.Option<ThumbBox> => {
  if (track <= 0 || maxScroll <= 0) return Option.none();
  const length = Math.min(
    Math.max(
      (track * track) / (track + maxScroll),
      Math.min(SCROLLBAR_MIN_THUMB, track),
    ),
    track,
  );
  const progress = Math.min(Math.max(-offset / maxScroll, 0), 1);
  return Option.some({
    start: Math.round(progress * (track - length)),
    length: Math.round(length),
  });
};

export interface ScrollbarThumb {
  readonly id: string;
  readonly axis: ScrollAxis;
  readonly tint: Option.Option<string>;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

const thumbAtRest = (scroller: ScrollbarCase): Option.Option<ScrollbarThumb> =>
  Option.map(thumbOf(trackOf(scroller.axis), scroller.content, 0), (thumb) => {
    const thickness = Option.getOrElse(
      scroller.width,
      () => SCROLLBAR_DEFAULT_WIDTH,
    );
    return {
      id: scroller.id,
      axis: scroller.axis,
      tint: scroller.tint,
      box:
        scroller.axis === "horizontal"
          ? {
              x: thumb.start,
              y: SCROLLBAR_VIEWPORT.height - thickness,
              width: thumb.length,
              height: thickness,
            }
          : {
              x: SCROLLBAR_VIEWPORT.width - thickness,
              y: thumb.start,
              width: thickness,
              height: thumb.length,
            },
    };
  });

export const SCROLLBAR_THUMBS: ReadonlyArray<ScrollbarThumb> = Arr.getSomes(
  Arr.map(
    [
      SCROLLBAR_TINTED,
      SCROLLBAR_WIDE,
      SCROLLBAR_FLOOR,
      SCROLLBAR_HORIZONTAL,
      SCROLLBAR_DEFAULT,
    ],
    thumbAtRest,
  ),
);

export const SCROLLBAR_TINTED_THUMBS: ReadonlyArray<ScrollbarThumb> =
  Arr.filter(SCROLLBAR_THUMBS, (thumb) => Option.isSome(thumb.tint));

export interface ScrollbarStop {
  readonly delta: number;

  readonly offset: number;
  readonly label: string;
  readonly thumb: ThumbBox;

  readonly endsAtTrack: boolean;
}

const stopAt = (
  scroller: ScrollbarCase,
  delta: number,
  offset: number,
  label: string,
): Option.Option<ScrollbarStop> => {
  const track = trackOf(scroller.axis);
  const maxScroll = maxOffset(scroller.content, track);
  return Option.map(thumbOf(track, scroller.content, offset), (thumb) => ({
    delta,
    offset,
    label,
    thumb,
    endsAtTrack: offset === -maxScroll,
  }));
};

export const SCROLLBAR_STOPS: ReadonlyArray<ScrollbarStop> = Arr.getSomes([
  stopAt(
    SCROLLBAR_TINTED,
    -SCROLLBAR_SCROLLED_BY,
    -SCROLLBAR_SCROLLED_BY,
    "one wheel",
  ),
  stopAt(
    SCROLLBAR_TINTED,
    -100_000,
    -maxOffset(SCROLLBAR_TINTED.content, trackOf(SCROLLBAR_TINTED.axis)),
    "past the end",
  ),
]);

export const SCROLLBAR_HORIZONTAL_STOP: Option.Option<ScrollbarStop> = stopAt(
  SCROLLBAR_HORIZONTAL,
  -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
  -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
  "one sideways wheel",
);

export const SCROLLBAR_SWATCH = 24;

export const SCROLLBAR_CHECKS =
  1 +
  2 +
  SCROLLBAR_VIEWPORTS.length * 3 +
  SCROLLBAR_THUMBS.length * 5 +
  1 +
  SCROLLBAR_TINTED_THUMBS.length +
  2 +
  SCROLLBAR_STOPS.length * 4 +
  1 +
  4 +
  2 +
  4;
