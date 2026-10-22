/**
 * The overlay recipe seam.
 *
 * Dialog, Popover, DropdownMenu, ContextMenu and CommandMenu compose their
 * resting appearance through {@link overlaySurfaceStyle}: a shadcn recipe
 * compiled against `@gpuixui/tw`'s **default** registry (fixed metrics), with
 * the caller's `className` joined last via `cn` so it wins conflicts. The
 * caller's `style` is still merged last by each component, so a consumer can
 * override one rule without forking the part.
 *
 * The other two halves of the overlay contract already have their own homes and
 * are referenced, not re-implemented, here:
 *
 * - **z-layering** — `internal/dismiss-layer.ts` owns the topmost-layer-wins
 *   Escape/outside-press stack (the "which overlay closes on Escape" answer),
 *   and the `<anchored>` `priority`/`occlude` props own paint order.
 * - **motion** — `@gpuixui/tw`'s `motionFromClasses` (and its `overlayMotion` /
 *   `dialogMotion` presets) derive the enter/exit motion a recipe names
 *   (`animate-in`, `fade-in-0`, `slide-in-from-*`). The overlay components do
 *   not animate yet; the recipe keeps those classes for provenance.
 *
 * The recipes' positioning classes (`fixed`, `top-1/2`, `z-50`,
 * `-translate-*`) do not become `StyleDesc` values — the renderer has no
 * transform or z-index — so the compiler records them as unsupported and the
 * components own their positioning through `<anchored>` / `<FloatingLayer>`.
 */

import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { recipeStyle } from "./recipe.js";
import {
  elevationShadow,
  type BoxShadow,
  type ElevationLevel,
  type Theme,
} from "./theme.js";

/**
 * Whether a painted shadow is an edge rather than a lift.
 *
 * `@gpuixui/tw` compiles `ring-<n>` to a zero-blur shadow with a positive
 * spread — a hairline line around the border box — while every elevation level
 * blurs. It also writes both through the one `boxShadow` slot, and applies the
 * ring after the utilities, so a recipe naming `shadow-*` and `ring-*` keeps
 * only the ring.
 */
const isEdge = (shadow: BoxShadow): boolean =>
  shadow.blurRadius === 0 && shadow.spreadRadius > 0;

/** The shadows a compiled surface paints, in order. */
const shadows = (painted: StyleDesc["boxShadow"]): ReadonlyArray<BoxShadow> =>
  Option.match(Option.fromNullishOr(painted), {
    onNone: () => [],
    onSome: (value) => Arr.ensure(value),
  });

/** Compile an overlay recipe (surface or scrim) to its resting `StyleDesc`.
 *
 * The caller's `className` is joined after the recipe so it wins conflicts;
 * motion and the renderer-unowned positioning classes stay out of the result.
 *
 * `elevation` is the level the surface is raised to. A recipe that already
 * paints its own lift keeps it — one level is one shadow. A recipe whose
 * `ring-*` edge consumed the slot gets the theme's lift back **beside** the
 * edge, because the runtime paints a shadow list and the design has two
 * declarations (a lift and a hairline), not one.
 */
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
