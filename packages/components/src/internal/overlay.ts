import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { recipeStyle } from "./recipe.js";
import {
  alpha,
  elevationShadow,
  type BoxShadow,
  type ElevationLevel,
  type Theme,
} from "./theme.js";

export const OVERLAY_WASH = 0.55;

export const overlayVeilColor = (theme: Theme): string =>
  alpha(theme.colors.background, OVERLAY_WASH);

const isEdge = (shadow: BoxShadow): boolean =>
  shadow.blurRadius === 0 && shadow.spreadRadius > 0;

const shadows = (painted: StyleDesc["boxShadow"]): ReadonlyArray<BoxShadow> =>
  Option.match(Option.fromNullishOr(painted), {
    onNone: () => [],
    onSome: (value) => Arr.ensure(value),
  });

export const overlaySurfaceStyle = (
  recipe: string,
  className: string | undefined,
  theme: Theme,
  elevation?: ElevationLevel,
): StyleDesc => {
  const style = recipeStyle(cn(recipe, className), theme);
  const lift = Option.fromNullishOr(elevation).pipe(
    Option.flatMap((level) =>
      Option.fromNullishOr(elevationShadow(theme, level)),
    ),
  );

  return Option.match(lift, {
    onNone: () => style,
    onSome: (shadow) => {
      const painted = shadows(style.boxShadow);
      const lost = Arr.every(painted, isEdge) && painted.length > 0;
      return lost ? { ...style, boxShadow: [shadow, ...painted] } : style;
    },
  });
};
