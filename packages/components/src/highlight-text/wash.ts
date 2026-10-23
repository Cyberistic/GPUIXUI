/**
 * The wash HighlightText hands the runtime's `highlight` spec.
 *
 * A search's matches are the one text surface still painted from the runtime's
 * own palette when a host names no colour, and that palette is not a theme: the
 * active share leaves body text under the floor in every shipped style.
 * `findHighlight` derives the pair a theme can carry, so the component takes it
 * as its default and overrides only what its caller names.
 *
 * The active match is an index across the marks **this phrase** paints. A find
 * bar over a document counts matches across every row, so a row converts its
 * document-wide index to the row's own before passing it (`matchIndexOffset` in
 * the capability record is the same conversion for the runtime's spec).
 */

import * as Option from "effect/Option";
import { findHighlight, type Theme } from "../internal/theme.js";

/** The colours a caller may name, and the mark it may make active. */
export interface WashInput {
  /** Every match's wash. Default: the theme's `findHighlight` colour. */
  readonly color?: string | undefined;
  /** The active match's wash. Default: the theme's `findHighlight` active colour. */
  readonly activeColor?: string | undefined;
  /** Which painted mark is the active one, if any. */
  readonly activeIndex?: number | undefined;
}

/** The `highlight` spec a theme and a caller resolve to. */
export interface Wash {
  readonly color: string;
  readonly activeColor: string;
  readonly radius: number;
  /** The active mark, or `undefined` when the index names none on screen. */
  readonly activeIndex: number | undefined;
}

/**
 * The mark a caller's index addresses among the marks painted so far.
 *
 * A sweep paints its marks one at a time, so an index past the painted count is
 * a mark the reader cannot see yet: the host is handed none rather than an
 * index it would apply to another match. A fractional, negative or
 * non-finite index is not a mark either.
 */
export const activeMarkOf = (
  index: number | undefined,
  painted: number,
): number | undefined =>
  Option.getOrUndefined(
    Option.filter(Option.fromNullishOr(index), (value) =>
      Number.isInteger(value) && value >= 0 && value < painted,
    ),
  );

/**
 * The wash a component paints: the theme's measured find pair unless the caller
 * names a colour, and the corner the theme's radius scale carries.
 */
export const washFor = (
  theme: Theme,
  input: WashInput,
  painted: number,
): Wash => {
  const derived = findHighlight(theme);
  return {
    color: input.color ?? derived.color,
    activeColor: input.activeColor ?? derived.activeColor,
    radius: derived.radius,
    activeIndex: activeMarkOf(input.activeIndex, painted),
  };
};
