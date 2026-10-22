/**
 * The conversation's state machine.
 *
 * A chat is a stream with four states, and every way it can move is a named
 * command so the composer, the transcript and the consumer's transport cannot
 * disagree about what is allowed. Two rules carry the weight:
 *
 * - **A busy chat refuses a submit.** `submit` from `submitting` or `streaming`
 *   emits nothing, so pressing Enter twice cannot send two messages.
 * - **Stop never submits.** `stop` from a busy state ends it and emits the stop
 *   intent — the opposite of submitting — and from `idle`/`error` it is refused,
 *   so a stray Escape does nothing.
 *
 * `Chat` owns no transport: it applies these moves to its own status and hands
 * the emitted intent to the caller's `onSubmit`/`onStop`/`onRetry`. A consumer
 * driving a stream from its own state uses the same function for the token
 * events (`begin`, `delta`, `complete`, `fail`), so the transcript and the
 * consumer's status cannot drift apart.
 */

import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/**
 * Where a conversation is. `submitting` is the wait before the first token,
 * `streaming` is an open reply, and `error` is a failed reply that can be
 * retried.
 */
export const ChatStatus = Schema.Literals([
  "idle",
  "submitting",
  "streaming",
  "error",
]);

/** Where a conversation is. */
export type ChatStatus = typeof ChatStatus.Type;

/** Narrows an unknown value to a {@link ChatStatus}. */
export const isChatStatus = Schema.is(ChatStatus);

/** Every way a conversation can move. */
export type ChatCommand =
  | "submit"
  | "retry"
  | "stop"
  | "begin"
  | "delta"
  | "complete"
  | "fail";

/** What the component hands back to its caller, once per accepted command. */
export type ChatEmit = "submit" | "stop" | "retry";

/** The state after a command, and the intent the caller must carry out. */
export interface ChatMove {
  readonly status: ChatStatus;
  /** `None` when the command was refused or carries no intent. */
  readonly emit: Option.Option<ChatEmit>;
}

/** A move that carries no intent, whether it changes the state or not. */
const noIntent = (status: ChatStatus): ChatMove => ({
  status,
  emit: Option.none(),
});

/** A move to `status` that asks the caller for `emit`. */
const calls = (status: ChatStatus, emit: ChatEmit): ChatMove => ({
  status,
  emit: Option.some(emit),
});

/** Whether a reply is open: the composer's submit and the stop control are off. */
export const isChatBusy = (status: ChatStatus): boolean =>
  status === "submitting" || status === "streaming";

/** Whether a new message may be sent: an idle or failed conversation only. */
export const canChatSubmit = (status: ChatStatus): boolean =>
  !isChatBusy(status);

/**
 * Apply one command.
 *
 * Stream events are the consumer's to send: `begin` on the first token, `delta`
 * on every later one, then `complete` or `fail`. They are refused from `idle`
 * so a stray token cannot start a conversation nobody asked for.
 */
export const chatMove = (status: ChatStatus, command: ChatCommand): ChatMove =>
  Match.value(command).pipe(
    Match.when("submit", () =>
      canChatSubmit(status) ? calls("submitting", "submit") : noIntent(status),
    ),
    Match.when("retry", () =>
      status === "error" ? calls("submitting", "retry") : noIntent(status),
    ),
    Match.when("stop", () =>
      isChatBusy(status) ? calls("idle", "stop") : noIntent(status),
    ),
    Match.when("begin", () =>
      status === "submitting" ? noIntent("streaming") : noIntent(status),
    ),
    Match.when("delta", () =>
      isChatBusy(status) ? noIntent("streaming") : noIntent(status),
    ),
    Match.when("complete", () =>
      isChatBusy(status) ? noIntent("idle") : noIntent(status),
    ),
    Match.when("fail", () =>
      isChatBusy(status) ? noIntent("error") : noIntent(status),
    ),
    Match.exhaustive,
  );
