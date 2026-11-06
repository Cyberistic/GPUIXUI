import { Effect, Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const SECOND_WINDOW_IDS = {
  probe: "second-window-probe",
  attempt: "second-window-attempt",
  marker: "second-window-marker",
  readout: "second-window-readout",
} as const;

export const SECOND_WINDOW_SIZE = { width: 320, height: 200 } as const;

export const SECOND_WINDOW_TITLE = "GPUIXUI second window";

export const SECOND_WINDOW_REFUSAL =
  "A GPUI application already exists on this thread";

export const SECOND_WINDOW_MARKER = "#FF3B30";

export const SECOND_WINDOW_CHECKS = 8;

export interface SecondWindowRenderer {
  readonly init: () => void;
  readonly isInitialized: () => boolean;
}

export type SecondWindowAttempt =
  | { readonly _tag: "opened"; readonly started: boolean }
  | {
      readonly _tag: "refused";
      readonly message: string;
      readonly started: boolean;
    };

const messageOf = (cause: unknown): string =>
  Match.value(cause).pipe(
    Match.when(Schema.is(Schema.String), (text) => text),
    Match.when(
      Schema.is(Schema.Struct({ message: Schema.String })),
      (error) => error.message,
    ),
    Match.orElse(() => "the attempt threw without a message"),
  );

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

export interface SecondWindowTally {
  readonly attempts: number;

  readonly refused: number;

  readonly opened: number;

  readonly started: boolean;

  readonly after: number;

  readonly last: string;
}

export const NO_SECOND_WINDOW: SecondWindowTally = {
  attempts: 0,
  refused: 0,
  opened: 0,
  started: false,
  after: 0,
  last: "none",
};

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

export const recordMarkerPress = (
  tally: SecondWindowTally,
): SecondWindowTally => ({ ...tally, after: tally.after + 1 });

export const secondWindowReadout = (tally: SecondWindowTally): string =>
  `attempts=${tally.attempts} refused=${tally.refused} opened=${tally.opened} started=${tally.started} after=${tally.after} last=${tally.last}`;
