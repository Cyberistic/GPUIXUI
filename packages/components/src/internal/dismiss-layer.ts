/**
 * The dismiss stack behind every overlay.
 *
 * `@gpuix/react@0.11.0` ships a `DismissableLayer`, but it models one layer's
 * dismissal, not "which Escape or outside press closes what" across a nested
 * tree. That question is answered here: open overlays push themselves onto one
 * module-level stack, and only the topmost layer may consume a given event.
 * Nesting therefore dismisses outside-in — a popover inside a dialog closes the
 * popover first.
 *
 * The event itself is the unit of consumption. A key or press bubbles from the
 * focused node up through every enclosing overlay, so without the identity guard
 * the popover would close and then the dialog would close on the same keystroke.
 * A `WeakSet` of handled events is the guard; `preventDefault` alone would stop
 * the platform default but not the second overlay's own handler.
 */

import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A layer's dismiss handler: it must close only the overlay that pushed it. */
export type DismissHandler = (event: EventPayload) => void;

let layers: ReadonlyArray<DismissHandler> = [];
const handled = new WeakSet<EventPayload>();

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
 * second call for the same event is always `false`, so one keystroke dismisses
 * one overlay.
 */
export const dismissTopLayer = (event: EventPayload): boolean => {
  if (handled.has(event)) return false;
  return Option.match(Arr.last(layers), {
    onNone: () => false,
    onSome: (onDismiss) => {
      handled.add(event);
      onDismiss(event);
      return true;
    },
  });
};

/** How many layers are open. For the stack's own suite; not a component API. */
export const dismissLayerCount = (): number => Arr.length(layers);
