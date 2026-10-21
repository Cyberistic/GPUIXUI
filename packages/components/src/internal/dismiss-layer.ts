/**
 * The dismiss stack behind every overlay.
 *
 * `@gpuix/react@0.11.0` ships a `DismissableLayer`, but it models one layer's
 * dismissal, not "which Escape or outside press closes what" across a nested
 * tree. That question is answered here: open overlays push themselves onto one
 * module-level stack, and only the topmost layer may consume a given event.
 * Nesting therefore dismisses outside-in — a combobox inside a dialog closes
 * the combobox first.
 *
 * The event itself is the unit of consumption. A key bubbles from the focused
 * node up through every enclosing overlay, and the runtime hands each handler
 * its own payload object, so object identity cannot identify one keystroke:
 * `keystrokeId` is the id GPUI gives every handler of the same key dispatch.
 * Without that guard the combobox would close and then the dialog would close on
 * the same keystroke. A pointer event is one shared object, so a `WeakSet`
 * identifies it. `preventDefault` alone would stop the platform default but not
 * the second overlay's own handler.
 *
 * The stack is ordered by push. An overlay opened by a trigger pushes after the
 * surface it sits in, which is every real nesting. Two overlays that are both
 * open in the first render push child-first (React runs a child's effect first),
 * so the parent is briefly topmost; open the inner one after mount when both
 * must be open, or give it the first Escape.
 */

import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** A layer's dismiss handler: it must close only the overlay that pushed it. */
export type DismissHandler = (event: EventPayload) => void;

let layers: ReadonlyArray<DismissHandler> = [];
const handled = new WeakSet<EventPayload>();

/**
 * The last key dispatch a layer consumed. Key payloads are rebuilt per handler,
 * so identity is not shared; `keystrokeId` is. It is cleared when the stack
 * empties, because a renderer numbers keystrokes from its own start.
 */
let dismissedKeystroke: Option.Option<number> = Option.none();

/**
 * Whether an earlier layer already consumed `event`. Records the event, so the
 * answer differs on a second call for the same gesture.
 */
const consume = (event: EventPayload): boolean => {
  if (handled.has(event)) return true;
  handled.add(event);
  if (event.keystrokeId === undefined) return false;
  if (Option.contains(dismissedKeystroke, event.keystrokeId)) return true;
  dismissedKeystroke = Option.some(event.keystrokeId);
  return false;
};

/**
 * Make `onDismiss` the topmost layer. Returns the removal function, which the
 * overlay calls when it closes or unmounts.
 */
export const pushDismissLayer = (onDismiss: DismissHandler): (() => void) => {
  layers = Arr.append(layers, onDismiss);
  return () => {
    layers = Arr.filter(layers, (candidate) => candidate !== onDismiss);
    if (Arr.length(layers) === 0) dismissedKeystroke = Option.none();
  };
};

/**
 * Offer `event` to the topmost layer. Returns whether a layer consumed it — a
 * second call for the same gesture is always `false`, so one keystroke or press
 * dismisses one overlay.
 */
export const dismissTopLayer = (event: EventPayload): boolean => {
  if (consume(event)) return false;
  return Option.match(Arr.last(layers), {
    onNone: () => false,
    onSome: (onDismiss) => {
      onDismiss(event);
      return true;
    },
  });
};

/** How many layers are open. For the stack's own suite; not a component API. */
export const dismissLayerCount = (): number => Arr.length(layers);
