import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { monotonicNanos } from "./clock.js";

export type DismissHandler = (event: EventPayload) => void;

interface Layer {
  readonly onDismiss: DismissHandler;
  readonly depth: number;
}

let layers: ReadonlyArray<Layer> = [];

let dismissedKeystroke: Option.Option<number> = Option.none();

interface Press {
  readonly shape: string;
  readonly at: bigint;
}

let dismissedPress: Option.Option<Press> = Option.none();

export const pointerGestureWindow: Duration.Duration = Duration.millis(64);

const PRESS_WINDOW_NANOS =
  BigInt(Duration.toMillis(pointerGestureWindow)) * 1_000_000n;

const pressShape = (event: EventPayload): string =>
  Arr.join(":")(
    Arr.map(
      [event.eventType, event.x, event.y, event.button, event.clickCount],
      (part) => (part === undefined ? "" : `${part}`),
    ),
  );

const consumedPress = (event: EventPayload, now: bigint): boolean => {
  const shape = pressShape(event);
  const repeated = Option.exists(
    dismissedPress,
    (press) => press.shape === shape && now - press.at <= PRESS_WINDOW_NANOS,
  );
  if (!repeated) dismissedPress = Option.some({ shape, at: now });
  return repeated;
};

let lastDismissedPoint: Option.Option<{
  readonly point: string;
  readonly at: bigint;
}> = Option.none();

const pointOf = (event: EventPayload): string =>
  Arr.join(":")(
    Arr.map([event.x, event.y, event.button], (part) =>
      part === undefined ? "" : `${part}`,
    ),
  );

export const isDismissalClick = (
  event: EventPayload,
  now: bigint = monotonicNanos(),
): boolean =>
  Option.exists(
    lastDismissedPoint,
    (dismissed) =>
      dismissed.point === pointOf(event) &&
      now - dismissed.at <= PRESS_WINDOW_NANOS,
  );

const consumedKeystroke = (keystrokeId: number): boolean => {
  if (Option.contains(dismissedKeystroke, keystrokeId)) return true;
  dismissedKeystroke = Option.some(keystrokeId);
  return false;
};

const consume = (event: EventPayload, now: bigint): boolean =>
  Option.match(Option.fromNullishOr(event.keystrokeId), {
    onNone: () => consumedPress(event, now),
    onSome: consumedKeystroke,
  });

const byDepth: Order.Order<Layer> = Order.mapInput(
  Order.Number,
  (layer: Layer) => layer.depth,
);

const topmost = (): Option.Option<DismissHandler> =>
  Option.map(Arr.last(Arr.sort(layers, byDepth)), (layer) => layer.onDismiss);

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

export const dismissTopLayer = (
  event: EventPayload,
  now: bigint = monotonicNanos(),
): boolean => {
  if (consume(event, now)) return false;
  return Option.match(topmost(), {
    onNone: () => false,
    onSome: (onDismiss) => {
      lastDismissedPoint = Option.some({ point: pointOf(event), at: now });
      onDismiss(event);
      return true;
    },
  });
};

export const dismissLayerCount = (): number => Arr.length(layers);
