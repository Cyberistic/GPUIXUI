/**
 * The native scrollbar thumb a `ScrollArea` hands the runtime, asked six ways.
 *
 * GPUix 0.11.0 paints the thumb itself: `scrollbarColor` turns it on for each
 * axis with more to show and `scrollbarWidth` sizes it, and the shipped
 * `ScrollArea` tints its viewport from the theme's `scrollbar` role and takes a
 * caller's thickness. What was never read was the **paint**: the offscreen
 * suites prove the style the component passes (`layout.runtime.test.tsx`,
 * `presentational.test.tsx`), and the shipped scroll probes measure offsets and
 * events, not the thumb. So every consumer's resting appearance — a preview
 * pane, a table body, a code host — was the typings' claim.
 *
 * The arithmetic lives here, once, so the window probe and the README cannot
 * disagree about it. The binding's rule, which the measured numbers confirm:
 * on an axis of `track` px where the content can move `maxScroll` px, the thumb
 * is `track * track / (track + maxScroll)` long (at least
 * `SCROLLBAR_MIN_THUMB`, never longer than the track) and starts
 * `progress * (track - length)` down it, where `progress` is how much of the
 * distance the offset has covered. Both are rounded to whole pixels when
 * painted, and the thumb sits **flush against the trailing edge**, over the
 * content rather than in a gutter — so the content box keeps the viewport's
 * full width.
 *
 * The `scrollbar-short` viewport is the control: its content fits, so the rule
 * says no thumb at all. That is the half a style-only test cannot see — a thumb
 * painted for a scroller with nothing to scroll is a false affordance. The
 * `scrollbar-floor` viewport is the other end: 10 000 px of content against a
 * 160 px track is a 2.5 px share, so the minimum is what paints, which is the
 * only case that can tell a floor from a formula. The `scrollbar-horizontal`
 * viewport asks the same rule on the other axis, where the track is the width
 * and the thumb lies along the bottom edge.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The ids the window and the renderer report, one per painted box. */
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

/** The box every scroller is given: the track the thumb is measured against. */
export const SCROLLBAR_VIEWPORT = { width: 260, height: 160 } as const;

/** The content fill, distinct from every tint and from the theme's scrollbar. */
export const SCROLLBAR_FILL = "#1E2A38";

/** The shipped `ScrollArea`'s thickness when the caller names none. */
export const SCROLLBAR_DEFAULT_WIDTH = 6;

/** The shortest a thumb gets, however much content it stands for. */
export const SCROLLBAR_MIN_THUMB = 20;

/**
 * The content that makes the floor bite: 10 000 px against a 160 px track is a
 * 2.5 px share, so the rule answers the 20 px minimum rather than the share.
 */
export const SCROLLBAR_FLOOR_CONTENT = 10_000;

/** The distance the tinted scroller is moved before the second capture. */
export const SCROLLBAR_SCROLLED_BY = 400;

/** The axis a scroller moves along, and the one its thumb is laid out on. */
export type ScrollAxis = "vertical" | "horizontal";

/** One scroller the view mounts and the steps measure. */
export interface ScrollbarCase {
  /** The viewport's locator — the element the runtime scrolls and paints on. */
  readonly id: string;
  /** The content root's locator, for the no-gutter read. */
  readonly contentId: string;
  /** Which axis the scroller scrolls, so the rule knows its track. */
  readonly axis: ScrollAxis;
  /** The content's height (vertical) or width (horizontal), in px. */
  readonly content: number;
  /**
   * The thumb tint, or `None` for the shipped `ScrollArea`'s own default: the
   * theme's `scrollbar` role, sampled from a swatch in the same frame.
   */
  readonly tint: Option.Option<string>;
  /** The thickness the caller asks for, or `None` for the platform's. */
  readonly width: Option.Option<number>;
}

/**
 * The narrow strip over long content: the case every move below is measured on.
 */
export const SCROLLBAR_TINTED: ScrollbarCase = {
  id: SCROLLBAR_IDS.tinted,
  contentId: SCROLLBAR_IDS.tintedContent,
  axis: "vertical",
  content: 1000,
  tint: Option.some("#FF00AA"),
  width: Option.some(10),
};

/**
 * The wide strip over shorter content, so its thumb is longer as well as
 * thicker — the two properties cannot be read from one case.
 */
export const SCROLLBAR_WIDE: ScrollbarCase = {
  id: SCROLLBAR_IDS.wide,
  contentId: SCROLLBAR_IDS.wideContent,
  axis: "vertical",
  content: 500,
  tint: Option.some("#00E5FF"),
  width: Option.some(18),
};

/** The control: content that fits, so the rule says no thumb at all. */
export const SCROLLBAR_SHORT: ScrollbarCase = {
  id: SCROLLBAR_IDS.short,
  contentId: SCROLLBAR_IDS.shortContent,
  axis: "vertical",
  content: 100,
  tint: Option.some("#FFD400"),
  width: Option.some(10),
};

/**
 * Far more content than the other cases, so the viewport's share would be ~2.5 px
 * and the rule's minimum is what paints. Without it the shortest-thumb claim is
 * arithmetic the window never had to answer.
 */
export const SCROLLBAR_FLOOR: ScrollbarCase = {
  id: SCROLLBAR_IDS.floor,
  contentId: SCROLLBAR_IDS.floorContent,
  axis: "vertical",
  content: SCROLLBAR_FLOOR_CONTENT,
  tint: Option.some("#B6FF3B"),
  width: Option.some(10),
};

/** The scrollers with a tint and a thickness of their own. */
export const SCROLLBAR_CASES: ReadonlyArray<ScrollbarCase> = [
  SCROLLBAR_TINTED,
  SCROLLBAR_WIDE,
  SCROLLBAR_SHORT,
  SCROLLBAR_FLOOR,
];

/**
 * The same rule on the other axis: content wider than the viewport, so the
 * thumb is laid out horizontally at the bottom edge and its length comes from
 * the **width** rather than the height. A table's sideways scroller and a
 * toolbar's overflow see this one, and nothing had measured it.
 */
export const SCROLLBAR_HORIZONTAL: ScrollbarCase = {
  id: SCROLLBAR_IDS.horizontal,
  contentId: SCROLLBAR_IDS.horizontalContent,
  axis: "horizontal",
  content: 1000,
  tint: Option.some("#FF6B00"),
  width: Option.some(10),
};

/** The distance the horizontal scroller is moved before its second capture. */
export const SCROLLBAR_HORIZONTAL_SCROLLED_BY = 400;

/**
 * The fourth scroller mounts the shipped `ScrollArea` with neither knob set, so
 * it paints the theme's `scrollbar` role at the platform's 6 px.
 */
export const SCROLLBAR_DEFAULT: ScrollbarCase = {
  id: SCROLLBAR_IDS.default,
  contentId: SCROLLBAR_IDS.defaultContent,
  axis: "vertical",
  content: 1000,
  tint: Option.none(),
  width: Option.none(),
};

/** Every scroller the view mounts, in the order it paints them. */
export const SCROLLBAR_VIEWPORTS: ReadonlyArray<ScrollbarCase> = [
  ...SCROLLBAR_CASES,
  SCROLLBAR_HORIZONTAL,
  SCROLLBAR_DEFAULT,
];

/** The track a scroller's thumb is measured against. */
export const trackOf = (
  axis: ScrollAxis,
  viewport: {
    readonly width: number;
    readonly height: number;
  } = SCROLLBAR_VIEWPORT,
): number => (axis === "horizontal" ? viewport.width : viewport.height);

/** How far the content can move on one axis — the offset's magnitude. */
export const maxOffset = (content: number, track: number): number =>
  Math.max(0, content - track);

/** Where a thumb starts and how long it paints, in the track's own pixels. */
export interface ThumbBox {
  readonly start: number;
  readonly length: number;
}

/**
 * The thumb the runtime paints on an axis, or `None` when the content fits.
 *
 * `offset` is the renderer's own: zero at the start, negative after. The raw
 * length places the start before either number is rounded, which is why a thumb
 * scrolled to the end still ends exactly at the track's edge.
 */
export const thumbOf = (
  track: number,
  content: number,
  offset: number,
): Option.Option<ThumbBox> =>
  thumbBox(track, maxOffset(content, track), offset);

/**
 * The same rule with the two numbers kept apart.
 *
 * A one-axis scroller's track **is** its viewport's extent, so `thumbOf` can
 * derive one from the other. A two-axis scroller shortens each thumb's track by
 * the other thumb's thickness (the corner is reserved) while the content still
 * moves the full viewport's worth — so the caller that knows both passes both.
 */
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

/** One scroller's thumb at rest: its axis, its tint and the predicted box. */
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

/**
 * The scrollers that must paint a thumb at rest. The short control is absent on
 * purpose: its content fits, so the rule answers `None` — and the test holds the
 * short id to that absence rather than letting the table shrink quietly.
 */
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

/** The resting thumbs whose tint the caller names, so a paint read is possible. */
export const SCROLLBAR_TINTED_THUMBS: ReadonlyArray<ScrollbarThumb> =
  Arr.filter(SCROLLBAR_THUMBS, (thumb) => Option.isSome(thumb.tint));

/** One wheel the probe sends, and the thumb box the rule predicts after it. */
export interface ScrollbarStop {
  /** The delta the wheel carries (GPUI's sign: negative scrolls forward). */
  readonly delta: number;
  /** The offset the renderer must hold afterwards. */
  readonly offset: number;
  readonly label: string;
  readonly thumb: ThumbBox;
  /** Whether this stop is the clamp, whose thumb must end at the track's edge. */
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

/**
 * The two moves the tinted scroller makes: one wheel down, then one past the
 * end. The rule predicts both boxes, so the second is the clamp a reader sees.
 */
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

/**
 * The one move the horizontal scroller makes: a sideways wheel, which the rule
 * places on the width rather than the height. `None` would mean the fixture's
 * content no longer overflows, so the test refuses it.
 */
export const SCROLLBAR_HORIZONTAL_STOP: Option.Option<ScrollbarStop> = stopAt(
  SCROLLBAR_HORIZONTAL,
  -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
  -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
  "one sideways wheel",
);

/** The width of the swatch that names the theme's default thumb colour. */
export const SCROLLBAR_SWATCH = 24;

/**
 * The checks the probe asserts, one term per group of reads:
 *
 * - the capture's device scale;
 * - the swatch's painted box and the role it names;
 * - per mounted scroller: its box, its content's box, and the cross-axis
 *   extent both share (a thumb laid out in a gutter would narrow the content);
 * - per resting thumb: its tint, its trailing edge, its start, its thickness
 *   and its length;
 * - the short control paints no thumb;
 * - per tinted thumb: the paint stays inside its own scroller;
 * - the tinted scroller's offset at rest and the thumb's start;
 * - per wheel stop: the tint, the offset the renderer reports, that offset's
 *   value and the thumb's start — plus the clamp's end edge;
 * - the sideways wheel: its offset read, the tint, the offset and the start;
 * - the hover keeps the thumb, in place;
 * - and the return to the top: the offset read, its zero, the thumb and its
 *   start.
 *
 * The handle on a stop and on the top re-reads the offset, so those groups are
 * larger than their visible assertions.
 */
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
