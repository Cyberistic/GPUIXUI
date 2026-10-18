/**
 * The Chat status contract, without React or GPUix.
 *
 * The app owns the async work (it starts the request, receives tokens, and
 * decides the outcome); the component owns what may be emitted in each state.
 * Every transition is total: an intent that does not apply returns the same
 * status value, so a late completion cannot resurrect a stream the user stopped.
 */

import * as Schema from "effect/Schema";

/** What the conversation is doing. `error` carries the failure to show. */
export const ChatStatus = Schema.TaggedUnion({
  idle: {},
  submitting: {},
  streaming: {},
  error: { message: Schema.String },
});

/** A conversation status. */
export type ChatStatus = typeof ChatStatus.Type;

/** Whether the composer may emit a new submit. */
export const canSubmit = (status: ChatStatus): boolean =>
  ChatStatus.isAnyOf(["idle", "error"])(status);

/** Whether the composer may emit a stop. */
export const canStop = (status: ChatStatus): boolean =>
  ChatStatus.isAnyOf(["submitting", "streaming"])(status);

/** Ask to send: only `idle` and `error` (a retry) become `submitting`. */
export const beginSubmit = (status: ChatStatus): ChatStatus =>
  canSubmit(status) ? { _tag: "submitting" } : status;

/** The first token arrived: `submitting` becomes `streaming`. */
export const beginStream = (status: ChatStatus): ChatStatus =>
  ChatStatus.guards.submitting(status) ? { _tag: "streaming" } : status;

/** The stream finished: only `streaming` becomes `idle`. */
export const endStream = (status: ChatStatus): ChatStatus =>
  ChatStatus.guards.streaming(status) ? { _tag: "idle" } : status;

/** The reader stopped: `submitting` and `streaming` become `idle`. */
export const stopStream = (status: ChatStatus): ChatStatus =>
  canStop(status) ? { _tag: "idle" } : status;

/** The stream failed: `submitting` and `streaming` carry the message. */
export const failStream = (status: ChatStatus, message: string): ChatStatus =>
  canStop(status) ? { _tag: "error", message } : status;
