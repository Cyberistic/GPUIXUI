import * as Option from "effect/Option";
import { pointerRating } from "@gpuixui/primitives/core";

export interface StarBox {
  readonly x: number;
  readonly width: number;
}

export const rateAt = (
  star: number,
  x: number | null | undefined,
  box: StarBox | null | undefined,
  half = false,
): number =>
  pointerRating(star, Option.fromNullishOr(x), Option.fromNullishOr(box), half);
