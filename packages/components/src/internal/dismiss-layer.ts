/**
 * The dismiss stack behind every overlay.
 *
 * `@gpuix/react@0.10.0` ships no `DismissableLayer`, so the question "which
 * Escape or outside press closes what" is answered here: open overlays push
 * themselves onto one module-level stack, and only the topmost layer may consume
 * a given event. Nesting therefore dismisses outside-in — a popover inside a
 * dialog closes the popover first.
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

let layers: ReadonlyArray<DismissHandler> = [];

/**
 * Make `onDismiss` the topmost layer. Returns the removal function, which the
 * overlay calls when it closes or unmounts.
 */
export const pushDismissLayer = (onDismiss: DismissHandler): (() => void) => {
  layers = Arr.append(layers, onDismiss);
  return () => {
    layers = Arr.filter(layers, (candidate) => candidate !== onDismiss);
  };
};

/**
 * Offer `event` to the topmost layer. Returns whether a layer consumed it — the
 * second payload copy of the same event is always `false`, so one Escape or
 * outside press dismisses one overlay.
 */
export const dismissTopLayer = (event: EventPayload): boolean => {
  if (isEventClaimed(event)) return false;
  return Option.match(Arr.last(layers), {
    onNone: () => false,
    onSome: (onDismiss) => {
      claimEvent(event);
      onDismiss(event);
      return true;
    },
  });
};

/** How many layers are open. For the stack's own suite; not a component API. */
export const dismissLayerCount = (): number => Arr.length(layers);
