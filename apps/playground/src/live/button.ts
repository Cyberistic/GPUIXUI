/**
 * The `button-activation-lifecycle` fixture: the shipped `Button`'s activation
 * contract, as the readout each gesture must leave.
 *
 * `Button` is the one control every trigger, toolbar and dialog in the library
 * composes, and its keyboard rule is the platform's rather than an invention:
 * **Enter activates on the press, Space on the release, and the release never
 * activates twice** (`packages/primitives/src/core/keyboard.ts`). Until this
 * probe, that rule was proved by a pure function and a `TestRenderer`; a window
 * delivers its own events, and `AsyncSmokeHost.key`'s own doc records the half a
 * headless suite hides — the automation's `keystrokes` sends the key **down**
 * and no release, so Space only activates when the probe releases it.
 *
 * The table is cumulative: every row is the readout the frame must print after
 * that gesture, so a route that activates twice, activates on a Space press, or
 * runs the caller's host `onClick` from a key names the gesture it broke.
 *
 * The disabled and busy halves are counted apart (`BUTTON_REFUSAL_READOUT`),
 * because their contract is the opposite one: nothing activates, while the busy
 * button keeps its tab stop and both stay addressable from code.
 *
 * Kept native-free, so the table is testable on a host with no binding.
 */
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The probe's root, and the caption a reader sees beside the controls. */
export const BUTTON_ACTIVATION_PROBE = "button-activation-probe";
export const BUTTON_CAPTION = "button-activation-caption";

/** The enabled button the gestures drive, and the stops a traversal reaches. */
export const BUTTON_ENABLED = "button-enabled";
export const BUTTON_DISABLED = "button-disabled";
export const BUTTON_BUSY = "button-loading";
export const BUTTON_AFTER = "button-after";

/**
 * The `testId`s a `Tab` traversal reaches, in order.
 *
 * The disabled button is deliberately absent: it paints `tabIndex: -1`, so the
 * traversal skips it while `focusElement` still reaches it — the two halves of
 * the documented "out of the Tab order, not out of the element".
 */
export const BUTTON_TAB_ORDER: ReadonlyArray<string> = [
  BUTTON_ENABLED,
  BUTTON_BUSY,
  BUTTON_AFTER,
];

/** The readouts: the enabled button's counts, and the refused activations. */
export const BUTTON_READOUT = "button-activation-readout";
export const BUTTON_REFUSAL_READOUT = "button-activation-refusals";

/**
 * The event an activation came from, spelled as the readout prints it.
 *
 * A pointer activation is the runtime's `click`; a key names both its half and
 * its key (`keyDown:enter`, `keyUp:space`), because that pair is the whole
 * contract — the key alone would not say which half fired.
 */
export type ActivationKind =
  | "none"
  | "click"
  | `keyDown:${string}`
  | `keyUp:${string}`;

/** The half of an event a kind is derived from; `KeyEvent` satisfies it. */
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

/** The kind of activation an event is, or `none` for anything else. */
export const activationKind = (event: ActivationEvent): ActivationKind =>
  Match.value(event.eventType).pipe(
    Match.when("click", () => "click" as const),
    Match.when("keyDown", () => keyKind("keyDown", event.key)),
    Match.when("keyUp", () => keyKind("keyUp", event.key)),
    Match.orElse(() => "none" as const),
  );

/** A point the platform reported, in window coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The counts a gesture leaves: the caller's `onClick` and `onActivate`. */
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

/** The counters and the kind, without the point a pointer activation carries. */
export const formatCounts = (counts: ActivationCounts): string =>
  `host=${counts.host} activates=${counts.activates} last=${counts.last}`;

/**
 * The readout a frame prints: both counters, the kind of the last activation,
 * and the point the last pointer activation carried (absent until one happens).
 */
export const formatActivation = (
  counts: ActivationCounts,
  point: Option.Option<Point> = Option.none(),
): string => `${formatCounts(counts)} ${formatPoint(point)}`;

/** The disabled and busy buttons' reported activations, both of which must stay `0`. */
export interface Refusals {
  readonly disabled: number;
  readonly busy: number;
}

/** The refusal readout; `0` in both is the contract. */
export const formatRefusals = (refusals: Refusals): string =>
  `disabled=${refusals.disabled} busy=${refusals.busy}`;

/** One gesture the probe sends, and the readout it must leave behind. */
export interface ActivationRoute extends ActivationCounts {
  readonly gesture: ButtonGesture;
  /** The README table's description of the gesture. */
  readonly caption: string;
}

/** The gestures, in the order the probe sends them. */
export const BUTTON_GESTURES = [
  "click",
  "enter-press",
  "enter-release",
  "space-press",
  "space-release",
] as const;

/** One gesture the probe sends. */
export type ButtonGesture = (typeof BUTTON_GESTURES)[number];

const route = (
  gesture: ButtonGesture,
  caption: string,
  host: number,
  activates: number,
  last: ActivationKind,
): ActivationRoute => ({ gesture, caption, host, activates, last });

/**
 * The measured routes, on `@gpuix/native@0.11.0`.
 *
 * A pointer press is one activation that runs the caller's host `onClick` and
 * `onActivate`; Enter is one activation on the press that reaches `onActivate`
 * alone; its release adds nothing; a Space press adds nothing because the
 * control waits for the release; and the Space release is the activation.
 */
const byGesture: Record<ButtonGesture, ActivationRoute> = {
  click: route(
    "click",
    "a pointer press on the enabled button",
    1,
    1,
    "click",
  ),
  "enter-press": route(
    "enter-press",
    "Enter's press",
    1,
    2,
    "keyDown:enter",
  ),
  "enter-release": route(
    "enter-release",
    "Enter's release",
    1,
    2,
    "keyDown:enter",
  ),
  "space-press": route(
    "space-press",
    "Space's press",
    1,
    2,
    "keyDown:enter",
  ),
  "space-release": route(
    "space-release",
    "Space's release",
    1,
    3,
    "keyUp:space",
  ),
};

/** Every gesture, in the order the probe sends them. */
export const BUTTON_ROUTES: ReadonlyArray<ActivationRoute> = Arr.map(
  BUTTON_GESTURES,
  (gesture) => byGesture[gesture],
);

/** One route by gesture; total, because the gesture is the route. */
export const buttonRoute = (gesture: ButtonGesture): ActivationRoute =>
  byGesture[gesture];

/**
 * The number a readout prints for `field`, or `None`.
 *
 * A missing field and the word `none` are both absent, so a probe cannot
 * compare a cleared readout against a real coordinate.
 */
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
