/**
 * The dismiss stack behind every overlay.
 *
 * `@gpuix/react@0.10.0` ships no `DismissableLayer`, so the question "which
 * Escape or outside press closes what" is answered here: open overlays push
 * themselves onto one module-level stack, and only the topmost layer may consume
 * a given event.
 *
 * **Topmost is nesting, not open order.** A modal's depth is how many modal
 * surfaces enclose it, so a confirmation mounted together with its dialog is
 * above it even though React ran the confirmation's effect first — the measured
 * defect plan 730 fixed. Open order still breaks ties between siblings, which is
 * why a popover inside a dialog closes before the dialog.
 *
 * The runtime hands **each handler its own payload copy** for one event
 * (measured, plan `187` §9), so object identity cannot carry consumption. The
 * shared field claim in `event-claim.ts` can: the first handler claims the
 * event, every enclosing handler sees the claim. `EventPayload` has no
 * `preventDefault` in 0.10.0, so this is the smallest honest replacement.
 *
 * **A layer answers for its own surface.** An ancestor is told a press is
 * "outside" it by bounds alone, so a nested surface painted beyond the ancestor's
 * box arrives as an outside press for every enclosing overlay. The topmost layer
 * therefore owns the presses inside its own surface (plan `816`): a picker
 * popup, menu panel or popover hanging below a dialog keeps the press that was
 * meant for its row.
 */

import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { claimEvent, isEventClaimed } from "./event-claim.js";

/** A layer's dismiss handler: it must close only the overlay that pushed it. */
export type DismissHandler = (event: EventPayload) => void;

/**
 * Whether a press belongs to a layer: it landed inside the surface the layer
 * paints. 0.10.0 reports `mouseDownOutside` by bounds, so an enclosing overlay
 * is told that a press on a nested surface is outside it; the topmost layer
 * answers for itself (plan 816).
 */
export type DismissOwnership = (event: EventPayload) => boolean;

/** One open overlay: its handler, its nesting depth and its painted surface. */
interface DismissLayer {
  readonly onDismiss: DismissHandler;
  readonly depth: number;
  readonly owns: DismissOwnership | undefined;
}

let layers: ReadonlyArray<DismissLayer> = [];

/**
 * Painted overlay surfaces that are not dismiss layers. A toast card floats above
 * the app but Escape must not close it, so it registers its box instead of a
 * layer; a press on it belongs to the card, never to the overlay beneath it
 * (plan `820`).
 */
let pressSurfaces: ReadonlyArray<DismissOwnership> = [];

/** Register a painted surface that owns presses. Returns the removal function. */
export const registerPressSurface = (owns: DismissOwnership): (() => void) => {
  pressSurfaces = Arr.append(pressSurfaces, owns);
  return () => {
    pressSurfaces = Arr.filter(
      pressSurfaces,
      (candidate) => candidate !== owns,
    );
  };
};

/**
 * Make `onDismiss` the topmost layer at `depth`. Returns the removal function,
 * which the overlay calls when it closes or unmounts. Pass `owns` so a press on
 * the layer's own surface never dismisses it.
 */
export const pushDismissLayer = (
  onDismiss: DismissHandler,
  depth = 0,
  owns?: DismissOwnership,
): (() => void) => {
  layers = Arr.append(layers, { onDismiss, depth, owns });
  return () => {
    layers = Arr.filter(layers, (layer) => layer.onDismiss !== onDismiss);
  };
};

/**
 * Offer `event` to the topmost layer: the deepest one, and the latest of equals.
 * Returns whether a layer consumed it — the second payload copy of the same
 * event is always `false`, so one Escape or outside press dismisses one overlay.
 */
export const dismissTopLayer = (event: EventPayload): boolean => {
  if (isEventClaimed(event)) return false;
  // A press on a painted surface that is not a layer (a toast card) belongs to
  // that surface: the control under the pointer runs, and nothing is dismissed
  // or claimed (plan 820).
  if (Arr.some(pressSurfaces, (owns) => owns(event))) return false;
  const topmost = Arr.reduce(
    layers,
    Option.none<DismissLayer>(),
    (best, layer) =>
      Option.match(best, {
        onNone: () => Option.some(layer),
        onSome: (current) =>
          Option.some(layer.depth >= current.depth ? layer : current),
      }),
  );
  return Option.match(topmost, {
    onNone: () => false,
    onSome: (layer) => {
      // A press inside the layer's own surface is not an outside press, so
      // nothing is dismissed and nothing is claimed: the click that follows
      // belongs to the row or control under the pointer (plan 816).
      if (layer.owns?.(event) === true) return false;
      claimEvent(event);
      layer.onDismiss(event);
      return true;
    },
  });
};

/** Whether a layer deeper than `depth` is open. Focus entry asks this. */
export const hasDeeperLayer = (depth: number): boolean =>
  Arr.some(layers, (layer) => layer.depth > depth);

/** How many layers are open. For the stack's own suite; not a component API. */
export const dismissLayerCount = (): number => Arr.length(layers);
