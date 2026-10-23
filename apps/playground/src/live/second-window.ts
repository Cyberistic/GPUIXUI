/**
 * Whether a running application can open a second window, and the arithmetic
 * the `second-window-lifecycle` probe reads the attempt with.
 *
 * Several surfaces in this repository state that "the binding opens one window
 * per process" — the Tier 4 rows for detachable tabs, workspace layouts and
 * drag-and-drop, the capability record's Portals, Movable tabs and Drag reorder
 * rows, the `portal-layer`, `movable-tabs-lifecycle` and `drag-reorder` sections
 * — and none of them cites a measurement. The sentence is an inference from
 * there being no window verb in the typings, and two Tier 4 interactions rest on
 * it: a **detached tab**, and a tab dropped from one window into another.
 *
 * The probe makes the attempt an application would make: construct a second
 * renderer and call `init()`, the only verb in the published binding that opens
 * a window, while the probe's own window is running. The answer is read here so
 * the fixture stays native-free and its own tests need no binding.
 */
import { Effect, Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** Every id the window reports. */
export const SECOND_WINDOW_IDS = {
  probe: "second-window-probe",
  attempt: "second-window-attempt",
  marker: "second-window-marker",
  readout: "second-window-readout",
} as const;

/** The size the attempted window asks for, distinct from the runner's own. */
export const SECOND_WINDOW_SIZE = { width: 320, height: 200 } as const;

/** The title the attempted window asks for, so a stray window is recognisable. */
export const SECOND_WINDOW_TITLE = "GPUIXUI second window";

/**
 * The refusal a second window answers with, as measured on 0.11.0.
 *
 * The platform holds one GPUI application per thread, so a second `init()` is
 * refused before it touches AppKit. The probe asserts the whole message rather
 * than a prefix: an application that reads the error to decide "a detached tab
 * needs a second process" reads this text.
 */
export const SECOND_WINDOW_REFUSAL =
  "A GPUI application already exists on this thread";

/**
 * The running window's marker fill.
 *
 * A literal, not a role: this is the frame's own colour, and the probe counts
 * it to prove the first window still paints after the attempt.
 */
export const SECOND_WINDOW_MARKER = "#FF3B30";

/** The checks the probe's steps assert, so the README prints a derived count. */
export const SECOND_WINDOW_CHECKS = 8;

/**
 * The renderer surface one attempt uses.
 *
 * Structural on purpose: the probe hands over a real `GpuixRenderer`, while a
 * unit case hands over a stub that throws, so the classification is testable on
 * a host with no binding.
 */
export interface SecondWindowRenderer {
  readonly init: () => void;
  readonly isInitialized: () => boolean;
}

/**
 * What one attempt did.
 *
 * `started` is read from the second renderer **after** the attempt either way,
 * so "refused" and "half-initialised" are separate facts rather than one word.
 */
export type SecondWindowAttempt =
  | { readonly _tag: "opened"; readonly started: boolean }
  | {
      readonly _tag: "refused";
      readonly message: string;
      readonly started: boolean;
    };

/** The message a throw carries, without trusting `String(error)`. */
const messageOf = (cause: unknown): string =>
  Match.value(cause).pipe(
    Match.when(Schema.is(Schema.String), (text) => text),
    Match.when(
      Schema.is(Schema.Struct({ message: Schema.String })),
      (error) => error.message,
    ),
    Match.orElse(() => "the attempt threw without a message"),
  );

/**
 * Runs one attempt and classifies it.
 *
 * `init` is the only route to a window in the published binding, and the flag
 * is read afterwards: a refusal that left a renderer initialised would be a
 * window the application cannot see or close, which is worse than no window.
 */
export const secondWindowOutcome = (
  second: SecondWindowRenderer,
): Effect.Effect<SecondWindowAttempt> =>
  Effect.map(
    Effect.match(
      Effect.try({ try: () => second.init(), catch: (cause) => cause }),
      {
        onFailure: (cause) => Option.some(messageOf(cause)),
        onSuccess: () => Option.none<string>(),
      },
    ),
    (refusal) =>
      Option.match(refusal, {
        onNone: () => ({
          _tag: "opened" as const,
          started: second.isInitialized(),
        }),
        onSome: (message) => ({
          _tag: "refused" as const,
          message,
          started: second.isInitialized(),
        }),
      }),
  );

/** The counters the readout spells. */
export interface SecondWindowTally {
  /** Attempts the application made. */
  readonly attempts: number;
  /** Attempts the window refused. */
  readonly refused: number;
  /** Attempts that opened, which no window on this host should. */
  readonly opened: number;
  /** What the last attempt's renderer reported for `isInitialized()`. */
  readonly started: boolean;
  /** Presses the running window's marker heard after the attempts. */
  readonly after: number;
  /** The last attempt's answer: its message, `opened`, or `none` before any. */
  readonly last: string;
}

/** The tally before the first attempt. */
export const NO_SECOND_WINDOW: SecondWindowTally = {
  attempts: 0,
  refused: 0,
  opened: 0,
  started: false,
  after: 0,
  last: "none",
};

/** Records one attempt's answer into the tally. */
export const recordSecondWindowAttempt = (
  tally: SecondWindowTally,
  attempt: SecondWindowAttempt,
): SecondWindowTally =>
  Match.value(attempt).pipe(
    Match.when({ _tag: "refused" }, (refused) => ({
      ...tally,
      attempts: tally.attempts + 1,
      refused: tally.refused + 1,
      started: refused.started,
      last: refused.message,
    })),
    Match.when({ _tag: "opened" }, (opened) => ({
      ...tally,
      attempts: tally.attempts + 1,
      opened: tally.opened + 1,
      started: opened.started,
      last: "opened",
    })),
    Match.exhaustive,
  );

/** Counts a press the running window's marker heard. */
export const recordMarkerPress = (
  tally: SecondWindowTally,
): SecondWindowTally => ({ ...tally, after: tally.after + 1 });

/** The readout's one spelling. */
export const secondWindowReadout = (tally: SecondWindowTally): string =>
  `attempts=${tally.attempts} refused=${tally.refused} opened=${tally.opened} started=${tally.started} after=${tally.after} last=${tally.last}`;
