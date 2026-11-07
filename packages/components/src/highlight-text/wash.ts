import * as Option from "effect/Option";
import { findHighlight, type FindHighlightSource } from "../internal/theme.js";

export interface WashInput {
  readonly color?: string | undefined;

  readonly activeColor?: string | undefined;

  readonly activeIndex?: number | undefined;
}

export interface Wash {
  readonly color: string;
  readonly activeColor: string;
  readonly radius: number;

  readonly activeIndex: number | undefined;
}

export const activeMarkOf = (
  index: number | undefined,
  painted: number,
): number | undefined =>
  Option.getOrUndefined(
    Option.filter(
      Option.fromNullishOr(index),
      (value) => Number.isInteger(value) && value >= 0 && value < painted,
    ),
  );

export const washFor = (
  source: FindHighlightSource,
  input: WashInput,
  painted: number,
): Wash | undefined => {
  const derived = findHighlight(source);
  if (derived === undefined) return undefined;
  return {
    color: input.color ?? derived.color,
    activeColor: input.activeColor ?? derived.activeColor,
    radius: derived.radius,
    activeIndex: activeMarkOf(input.activeIndex, painted),
  };
};
