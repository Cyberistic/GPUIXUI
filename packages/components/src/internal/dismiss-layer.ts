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
 * node up through every enclosing overlay, and the runtime rebuilds the payload
 * per handler — the native side queues one event per element — so object
 * identity identifies nothing: `keystrokeId` is the id GPUI gives every handler
 * of the same key dispatch, and a press is identified by the fields every
 * handler of it shares (`pressShape`) for as long as one gesture can last.
 * Without that guard the combobox would close and then the dialog would close on
 * the same keystroke, and one outside press would close two overlays.
 * `preventDefault` alone would stop the platform default but not the second
 * overlay's own handler.
 *
 * The stack is ordered by **containment depth**, not by when an overlay pushed:
 * React runs a child's layout effect before its parent's, so two surfaces open
 * in one first render would otherwise put the parent on top and hand it the
 * first Escape. Each surface declares the depth it sits at (`dismiss-scope.tsx`
 * provides it to the children it renders), and a layer pushed at the same depth
 * by the same commit keeps push order — the later one is above.
 */

import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { monotonicNanos } from "./clock.js";

/** A layer's dismiss handler: it must close only the overlay that pushed it. */
export type DismissHandler = (event: EventPayload) => void;

/** An open overlay, with the containment depth of the surface it owns. */
interface Layer {
  readonly onDismiss: DismissHandler;
  readonly depth: number;
}

let layers: ReadonlyArray<Layer> = [];

/**
 * The last key dispatch a layer consumed. Key payloads are rebuilt per handler,
 * so identity is not shared; `keystrokeId` is. It is cleared when the stack
 * empties, because a renderer numbers keystrokes from its own start.
 */
let dismissedKeystroke: Option.Option<number> = Option.none();

/** A press as every handler of it sees it, and when the stack consumed it. */
interface Press {
  readonly shape: string;
  readonly at: bigint;
}

/** The last press a layer consumed, at the monotonic time it was offered. */
let dismissedPress: Option.Option<Press> = Option.none();

/**
 * How long a press shape identifies the same gesture. The runtime queues one
 * payload per handler, and every one of them is dispatched in the frame the
 * press arrived in; a reader cannot press twice inside that window, and a
 * second click at one point counts 2 anyway. The window is **four frames**, not
 * one: the topmost surface's close re-renders the tree between two deliveries
 * of one press, and the migrated action paint made that re-render outlast a
 * single 16 ms frame — measured as two overlays closing on one outside press.
 * The shape carries `clickCount`, so a real second press at the same point is
 * always a different shape once the platform counts it as a double click.
 */
export const pointerGestureWindow: Duration.Duration = Duration.millis(64);

const PRESS_WINDOW_NANOS =
  BigInt(Duration.toMillis(pointerGestureWindow)) * 1_000_000n;

/**
 * The parts of a press every handler of it shares. `elementId` is left out: it
 * names the handler's own element, so the two overlays one outside press reaches
 * carry different ids for the same gesture.
 */
const pressShape = (event: EventPayload): string =>
  Arr.join(":")(
    Arr.map(
      [event.eventType, event.x, event.y, event.button, event.clickCount],
      (part) => (part === undefined ? "" : `${part}`),
    ),
  );

/** Whether an earlier layer already consumed this press. Records it if not. */
const consumedPress = (event: EventPayload, now: bigint): boolean => {
  const shape = pressShape(event);
  const repeated = Option.exists(
    dismissedPress,
    (press) => press.shape === shape && now - press.at <= PRESS_WINDOW_NANOS,
  );
  if (!repeated) dismissedPress = Option.some({ shape, at: now });
  return repeated;
};

/** Whether an earlier layer already consumed this key dispatch. Records it if not. */
const consumedKeystroke = (keystrokeId: number): boolean => {
  if (Option.contains(dismissedKeystroke, keystrokeId)) return true;
  dismissedKeystroke = Option.some(keystrokeId);
  return false;
};

/**
 * Whether an earlier layer already consumed `event`. Records the event, so the
 * answer differs on a second call for the same gesture.
 */
const consume = (event: EventPayload, now: bigint): boolean =>
  Option.match(Option.fromNullishOr(event.keystrokeId), {
    onNone: () => consumedPress(event, now),
    onSome: consumedKeystroke,
  });

const byDepth: Order.Order<Layer> = Order.mapInput(
  Order.Number,
  (layer: Layer) => layer.depth,
);

/** The deepest open surface; among equally deep ones, the last pushed. */
const topmost = (): Option.Option<DismissHandler> =>
  Option.map(Arr.last(Arr.sort(layers, byDepth)), (layer) => layer.onDismiss);

/**
 * Make `onDismiss` the layer at `depth`. Returns the removal function, which the
 * overlay calls when it closes or unmounts.
 */
export const pushDismissLayer = (
  onDismiss: DismissHandler,
  depth: number,
): (() => void) => {
  const layer: Layer = { onDismiss, depth };
  layers = Arr.append(layers, layer);
  return () => {
    layers = Arr.filter(layers, (candidate) => candidate !== layer);
    if (Arr.length(layers) === 0) {
      dismissedKeystroke = Option.none();
      dismissedPress = Option.none();
    }
  };
};

/**
 * Offer `event` to the topmost layer. Returns whether a layer consumed it — a
 * second call for the same gesture is always `false`, so one keystroke or press
 * dismisses one overlay.
 *
 * `now` is the monotonic reading a press is measured against; tests pass it to
 * model two gestures, the runtime takes the frame's.
 */
export const dismissTopLayer = (
  event: EventPayload,
  now: bigint = monotonicNanos(),
): boolean => {
  if (consume(event, now)) return false;
  return Option.match(topmost(), {
    onNone: () => false,
    onSome: (onDismiss) => {
      onDismiss(event);
      return true;
    },
  });
};

/** How many layers are open. For the stack's own suite; not a component API. */
export const dismissLayerCount = (): number => Arr.length(layers);
