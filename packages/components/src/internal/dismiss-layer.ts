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
 */

import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { claimEvent, isEventClaimed } from "./event-claim.js";

/** A layer's dismiss handler: it must close only the overlay that pushed it. */
export type DismissHandler = (event: EventPayload) => void;

/** One open overlay: its handler and how deeply it is nested in modal surfaces. */
interface DismissLayer {
  readonly onDismiss: DismissHandler;
  readonly depth: number;
}

let layers: ReadonlyArray<DismissLayer> = [];

/**
 * Make `onDismiss` the topmost layer at `depth`. Returns the removal function,
 * which the overlay calls when it closes or unmounts.
 */
export const pushDismissLayer = (
  onDismiss: DismissHandler,
  depth = 0,
): (() => void) => {
  layers = Arr.append(layers, { onDismiss, depth });
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
