/**
 * The `rating-lifecycle` fixture: the ratings the probe paints, the state its
 * readout prints, and the inks a window's frame is read with.
 *
 * `Rating` states its paint in two roles and one clip: a filled star is the
 * theme's `primary`, an empty one `mutedForeground`, a failed validation's
 * filled star `destructive`, and a **half** star is the filled glyph painted
 * whole inside a box clipped at the star's midpoint. A renderer suite reads the
 * icon's `style.color` and the `star-filled` markup; only a frame says the ink
 * reached the glass, and only the two halves of a capture say the clip cut the
 * glyph where the component claims.
 *
 * Every paint reading is confined to one rating's own `max={1}` box, so a star
 * on another row cannot stand in for it. The fixture holds no hex of its own:
 * each ink is a role, so a palette change moves the expectation with it.
 */
import * as Option from "effect/Option";
import { blend } from "@gpuixui/tokens";

/**
 * The share a disabled star's fill keeps.
 *
 * `ratingStarClass` compiles `disabled:opacity-50`, and `renderRating` merges
 * that state onto the star — so the fill a window paints is the role at this
 * share over the page behind it.
 */
export const DISABLED_OPACITY = 0.5;

/** The `testId`s the view, the steps and the unit suite share. */
export const RATING_IDS = {
  probe: "rating-probe",
  readout: "rating-readout",
  empty: "rating-empty",
  full: "rating-full",
  half: "rating-half",
  invalid: "rating-invalid",
  disabled: "rating-disabled",
  interactive: "rating-interactive",
} as const;

/**
 * How many stars a rating paints by default, and how many the two groups the
 * probe drives carry. Five is the component's documented default.
 */
export const RATING_STARS = 5;

/** The interactive group's starting score: unrated. */
export const RATING_INITIAL = 0;

/** What the probe's readout prints. */
export interface RatingState {
  /** The interactive group's controlled score. */
  readonly value: number;
  /** How many times the interactive group's `onChange` ran. */
  readonly reports: number;
  /** How many times the disabled group's `onChange` ran. */
  readonly disabled: number;
}

/** The readout: the score, then the interactive and disabled report counts. */
export const ratingReadout = (state: RatingState): string =>
  `value=${state.value} reports=${state.reports} disabled=${state.disabled}`;

/** The score a readout names, or `None` for a blank. */
export const valueOf = (readout: string): Option.Option<number> =>
  Option.map(Option.fromNullishOr(/^value=(\S+)/.exec(readout)?.[1]), Number);

/** One counter a readout names, or `None` when the field is absent. */
export const counterOf = (
  readout: string,
  field: "reports" | "disabled",
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(new RegExp(`\\b${field}=(\\d+)`).exec(readout)?.[1]),
    Number,
  );

/** The checks the probe asserts on a green run. */
export const RATING_CHECKS = 47;

/** The ink a filled star paints: the theme's `primary` role. */
export const filledInk = (primary: string): string => primary;

/** The ink an empty star paints: the theme's `mutedForeground` role. */
export const emptyInk = (mutedForeground: string): string => mutedForeground;

/** The ink a failed validation's filled star paints. */
export const invalidInk = (destructive: string): string => destructive;

/**
 * The ink a disabled star's fill paints.
 *
 * A disabled rating dims its stars to half opacity (`disabled:opacity-50`), so
 * a filled star is the brand role composited over the page it sits on rather
 * than the role itself — the reason a frame read of a disabled star must look
 * for the composite and not for `primary`.
 */
export const disabledInk = (primary: string, page: string): string =>
  blend(primary, page, DISABLED_OPACITY);

/**
 * How close a frame's pixel must be to an ink to count as that ink.
 *
 * A 16-point outline star is a 1.33-point stroke, so no pixel is fully covered
 * — the same measured shape the exclusive-choice menu's mark has. Sixty counts
 * every part of a glyph and none of the page, the label or the other role: the
 * primary, muted and destructive inks are further apart than that on every
 * shipped palette.
 */
export const STAR_INK_TOLERANCE = 60;

/** A `#rrggbb` colour's channels, or `None` when it is not that shape. */
export const rgbOf = (
  hex: string,
): Option.Option<{
  readonly r: number;
  readonly g: number;
  readonly b: number;
}> => {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  return Option.map(Option.fromNullishOr(match), (parsed) => ({
    r: Number.parseInt(parsed[1] ?? "0", 16),
    g: Number.parseInt(parsed[2] ?? "0", 16),
    b: Number.parseInt(parsed[3] ?? "0", 16),
  }));
};

/** The RGB distance between a frame pixel and an ink. */
export const inkDistance = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): number => Math.hypot(r - ink.r, g - ink.g, b - ink.b);

/** Whether a pixel's channels are `ink` within {@link STAR_INK_TOLERANCE}. */
export const isStarInk = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): boolean => inkDistance(r, g, b, ink) <= STAR_INK_TOLERANCE;

/**
 * Where a rating's box splits into the two halves a half star claims.
 *
 * The left half is the clipped fill and the right half the outline behind it,
 * so a `max={1}` rating's own box is the whole measurement: `${left}` is the
 * box's floored midpoint in device pixels.
 */
export const halfSplit = (width: number): number => Math.floor(width / 2);
