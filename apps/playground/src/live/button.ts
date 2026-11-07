import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const BUTTON_ACTIVATION_PROBE = "button-activation-probe";
export const BUTTON_CAPTION = "button-activation-caption";

export const BUTTON_ENABLED = "button-enabled";
export const BUTTON_DISABLED = "button-disabled";
export const BUTTON_BUSY = "button-loading";
export const BUTTON_AFTER = "button-after";

export const BUTTON_TAB_ORDER: ReadonlyArray<string> = [
  BUTTON_ENABLED,
  BUTTON_BUSY,
  BUTTON_AFTER,
];

export const BUTTON_READOUT = "button-activation-readout";
export const BUTTON_REFUSAL_READOUT = "button-activation-refusals";

export type ActivationKind =
  | "none"
  | "click"
  | `keyDown:${string}`
  | `keyUp:${string}`;

export interface ActivationEvent {
  readonly eventType: string;
  readonly key?: string;
}

const keyKind = (
  phase: "keyDown" | "keyUp",
  key: string | undefined,
): ActivationKind =>
  Option.match(Option.fromNullishOr(key), {
    onNone: () => "none",
    onSome: (name) =>
      Match.value(phase).pipe(
        Match.when("keyDown", () => `keyDown:${name}` as const),
        Match.when("keyUp", () => `keyUp:${name}` as const),
        Match.exhaustive,
      ),
  });

export const activationKind = (event: ActivationEvent): ActivationKind =>
  Match.value(event.eventType).pipe(
    Match.when("click", () => "click" as const),
    Match.when("keyDown", () => keyKind("keyDown", event.key)),
    Match.when("keyUp", () => keyKind("keyUp", event.key)),
    Match.orElse(() => "none" as const),
  );

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ActivationCounts {
  readonly host: number;
  readonly activates: number;
  readonly last: ActivationKind;
}

const formatPoint = (point: Option.Option<Point>): string =>
  Option.match(point, {
    onNone: () => "x=none y=none",
    onSome: ({ x, y }) => `x=${Math.round(x)} y=${Math.round(y)}`,
  });

export const formatCounts = (counts: ActivationCounts): string =>
  `host=${counts.host} activates=${counts.activates} last=${counts.last}`;

export const formatActivation = (
  counts: ActivationCounts,
  point: Option.Option<Point> = Option.none(),
): string => `${formatCounts(counts)} ${formatPoint(point)}`;

export interface Refusals {
  readonly disabled: number;
  readonly busy: number;
}

export const formatRefusals = (refusals: Refusals): string =>
  `disabled=${refusals.disabled} busy=${refusals.busy}`;

export interface ActivationRoute extends ActivationCounts {
  readonly gesture: ButtonGesture;

  readonly caption: string;
}

export const BUTTON_GESTURES = [
  "click",
  "enter-press",
  "enter-release",
  "space-press",
  "space-release",
] as const;

export type ButtonGesture = (typeof BUTTON_GESTURES)[number];

const route = (
  gesture: ButtonGesture,
  caption: string,
  host: number,
  activates: number,
  last: ActivationKind,
): ActivationRoute => ({ gesture, caption, host, activates, last });

const byGesture: Record<ButtonGesture, ActivationRoute> = {
  click: route("click", "a pointer press on the enabled button", 1, 1, "click"),
  "enter-press": route("enter-press", "Enter's press", 1, 2, "keyDown:enter"),
  "enter-release": route(
    "enter-release",
    "Enter's release",
    1,
    2,
    "keyDown:enter",
  ),
  "space-press": route("space-press", "Space's press", 1, 2, "keyDown:enter"),
  "space-release": route(
    "space-release",
    "Space's release",
    1,
    3,
    "keyUp:space",
  ),
};

export const BUTTON_ROUTES: ReadonlyArray<ActivationRoute> = Arr.map(
  BUTTON_GESTURES,
  (gesture) => byGesture[gesture],
);

export const buttonRoute = (gesture: ButtonGesture): ActivationRoute =>
  byGesture[gesture];

export const fieldOf = (
  readout: string,
  field: string,
): Option.Option<number> =>
  pipe(
    Str.split(readout, " "),
    Arr.findFirst((token) => Str.startsWith(`${field}=`)(token)),
    Option.flatMap((token) =>
      Option.fromNullishOr(Number(Str.slice(`${field}=`.length)(token))),
    ),
    Option.filter(Number.isFinite),
  );
