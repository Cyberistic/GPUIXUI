/**
 * What a `RippleButton`'s disc really paints, and the arithmetic the
 * `ripple-lifecycle` probe reads a window with.
 *
 * The catalogue's *Ripple button* row makes four claims a renderer suite cannot
 * settle: the disc is the **action's own label ink at a faint share** (not a
 * second colour beside it), it is a **circle** rather than a box, it **grows
 * from the press point** until it covers the control, and it is **clipped by the
 * control and takes no pointer input**. Every one of them is a fact about the
 * glass: `src/behaviour/ripple-button.test.tsx` reads the layer's reported box
 * and the layer's declarations, so a wash painted in the action's own fill, a
 * square layer, a disc that starts at the window origin or a layer that eats the
 * next press all pass there.
 *
 * The fixture is the smallest composition that asks them: one labelled action
 * with **no visible label** (so the disc is the only paint inside its box), a
 * pointer press aimed by fraction of the action's own box, and the renderer's
 * motion clock frozen so a frame is a progress rather than a race.
 *
 * Two reads carry the wash. The **fill** is sampled from the frame under the
 * pointer, because a pointer hovering a filled action repaints it in the theme's
 * `filledHover` role — a probe that assumed `primary` would measure a wash over
 * a colour the glass never showed. The **ink** is
 * `actionOnColor(theme, "primary")`, the role the component mixes. A sample is
 * then a wash of that ink when every channel where the ink and the fill differ
 * enough to measure answers the **same** share: a second colour, a translucent
 * fill or the ink itself fails that agreement, whatever the frame's progress.
 *
 * Native-free: the ids, the fractions, the geometry, the algebra and the check
 * count live here so the view, the steps, the README and the unit test read one
 * source.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The `testId`s the view and the steps share. */
export const RIPPLE_IDS = {
  probe: "ripple-probe",
  action: "ripple-action",
  readout: "ripple-readout",
} as const;

/** The action's own box, painted through `style` so the geometry is known. */
export const RIPPLE_ACTION = { width: 240, height: 160 } as const;

/**
 * Where the two presses land, as a fraction of the action's box.
 *
 * The first is off-centre on both axes, so a disc born at the element's centre
 * (or at the window's origin) cannot pass. The second is far enough away that a
 * disc centred on it is visibly another place.
 */
export const RIPPLE_PRESS = {
  first: { across: 0.35, down: 0.5 },
  second: { across: 0.75, down: 0.5 },
} as const;

/**
 * How far the frozen motion clock is stepped while looking for a frame, in ms.
 *
 * Coarse on purpose: the disc's removal is a real `setTimeout`, so the whole
 * search has to finish inside its 500 ms window. Twelve steps of 25 ms reach
 * the far side of the tween with room for two captures.
 */
export const RIPPLE_STEP_MS = 25;

/** The most steps the search spends — more than the tween's length. */
export const RIPPLE_STEPS = 20;

/**
 * The diameter band the disc's own frame is sampled in.
 *
 * The floor makes the disc big enough to sample away from its antialiased edge;
 * the ceiling keeps its whole box inside the action, so the box's corners are
 * the action's fill and not the page.
 */
export const RIPPLE_SMALL_MIN = 40;
export const RIPPLE_SMALL_MAX = 150;

/** How far past the action's left edge the clip frame's disc must reach. */
export const RIPPLE_CLIP_GAP = 8;

/** The share of the disc's box a corner sample is taken in from the corner. */
export const RIPPLE_CORNER_INSET = 0.1;

/** How far outside the action the clipped paint is sampled. */
export const RIPPLE_OUTSIDE = 8;

/** How far a sample keeps from the action's left edge, inside it. */
export const RIPPLE_INSIDE = 4;

/**
 * The smallest span an ink channel must have before it can measure a share.
 *
 * A channel where the ink and the fill differ by a few bytes is rounding, not
 * evidence: two channels either side of it would disagree about the share they
 * imply for the same paint.
 */
export const RIPPLE_MIN_SPAN = 32;

/** How far two channels' shares may differ and still describe one paint. */
export const RIPPLE_SHARE_AGREEMENT = 0.02;

/**
 * The band a disc's wash has to fall in.
 *
 * A ripple is a journey, not an opaque layer: the ink is laid at its own faint
 * alpha and the layer fades as it grows, so a sample under 1% is indistinguishable
 * from the fill and one over 12% is the ink or a second colour, not a wash.
 */
export const RIPPLE_SHARE_MIN = 0.01;
export const RIPPLE_SHARE_MAX = 0.12;

/** How much fainter the later frame has to be before the fade is a measurement. */
export const RIPPLE_FADE_STEP = 0.004;

/** A painted box, as the runtime's layout report gives it. */
export interface RippleBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A colour channel triple, as a frame sample or a theme role gives it. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** A fraction of a box: across it, and down it. */
export interface RippleFraction {
  readonly across: number;
  readonly down: number;
}

/** A logical point in the window. */
export interface RipplePoint {
  readonly x: number;
  readonly y: number;
}

/** The offset a press names, from the action's own top-left corner. */
export const pressOffset = (fraction: RippleFraction): RipplePoint => ({
  x: RIPPLE_ACTION.width * fraction.across,
  y: RIPPLE_ACTION.height * fraction.down,
});

/** The window point a press at `fraction` of the action lands on. */
export const pressPoint = (
  action: RippleBox,
  fraction: RippleFraction,
): RipplePoint => ({
  x: action.x + action.width * fraction.across,
  y: action.y + action.height * fraction.down,
});

/** The centre of the disc the runtime reports. */
export const discCentre = (disc: RippleBox): RipplePoint => ({
  x: disc.x + disc.width / 2,
  y: disc.y + disc.height / 2,
});

/**
 * The four points at the corners of the disc's **box**, inset a little.
 *
 * A disc is a circle inscribed in its box, so those points are the action's own
 * fill on a round layer and the wash on a square one — the measurement the
 * component's `borderRadius` claim needs.
 */
export const cornerPoints = (
  disc: RippleBox,
  inset: number = RIPPLE_CORNER_INSET,
): ReadonlyArray<RipplePoint> => {
  const inX = disc.width * inset;
  const inY = disc.height * inset;
  return [
    { x: disc.x + inX, y: disc.y + inY },
    { x: disc.x + disc.width - inX, y: disc.y + inY },
    { x: disc.x + inX, y: disc.y + disc.height - inY },
    { x: disc.x + disc.width - inX, y: disc.y + disc.height - inY },
  ];
};

/** The point beside the disc, inside the action's own box. */
export const insideActionPoint = (
  action: RippleBox,
  y: number,
): RipplePoint => ({ x: action.x + RIPPLE_INSIDE, y });

/** The point outside the action, where a clipped disc would spill. */
export const outsideActionPoint = (
  action: RippleBox,
  y: number,
): RipplePoint => ({ x: action.x - RIPPLE_OUTSIDE, y });

/** Whether a reported disc is a frame the wash can be sampled in. */
export const isSmallFrame = (disc: RippleBox): boolean =>
  disc.width >= RIPPLE_SMALL_MIN &&
  disc.width <= RIPPLE_SMALL_MAX &&
  disc.height >= RIPPLE_SMALL_MIN &&
  disc.height <= RIPPLE_SMALL_MAX;

/** Whether the disc's box reaches past the action's left edge by the gap. */
export const passesLeftEdge = (action: RippleBox, disc: RippleBox): boolean =>
  disc.x <= action.x - RIPPLE_CLIP_GAP;

/**
 * The share of `ink` a sample carries over `fill`, when it is a wash of it.
 *
 * One share per channel whose ink and fill differ enough to measure; `None` when
 * fewer than two do, or when the channels disagree beyond
 * {@link RIPPLE_SHARE_AGREEMENT} — a value off the fill-to-ink line is another
 * colour, whatever its lightness.
 */
export const washShare = (
  observed: Rgb,
  fill: Rgb,
  ink: Rgb,
): Option.Option<number> => {
  const shares = Arr.getSomes(
    Arr.map(["r", "g", "b"] as const, (channel) => {
      const span = ink[channel] - fill[channel];
      return Math.abs(span) < RIPPLE_MIN_SPAN
        ? Option.none<number>()
        : Option.some((observed[channel] - fill[channel]) / span);
    }),
  );
  if (Arr.length(shares) < 2) return Option.none();
  const spread =
    Arr.reduce(shares, -Infinity, (highest, share) =>
      Math.max(highest, share),
    ) -
    Arr.reduce(shares, Infinity, (lowest, share) => Math.min(lowest, share));
  if (spread > RIPPLE_SHARE_AGREEMENT) return Option.none();
  const total = Arr.reduce(shares, 0, (sum, share) => sum + share);
  return Option.some(total / Arr.length(shares));
};

/** Whether a share is a faint wash rather than the fill or the ink. */
export const isWash = (share: number): boolean =>
  share > RIPPLE_SHARE_MIN && share <= RIPPLE_SHARE_MAX;

/** Whether a later frame's share is faint enough to be the same disc fading. */
export const isFainter = (later: number, earlier: number): boolean =>
  later <= earlier - RIPPLE_FADE_STEP;

/** The readout's one spelling, so the probe and its record print the same line. */
export const rippleReadout = (presses: number): string => `presses=${presses}`;

/**
 * The checks the probe asserts, as the run reports them.
 *
 * The count is the **executed** number, so it is larger than the source's
 * assertion sites: the closures (`box`, `captureFrame`, `sample`) assert once
 * per call, and the four corner samples are one call each. The steps' own
 * `ctx.expect*` sites are the floor the suite holds this to.
 */
export const RIPPLE_CHECKS = 51;
