/**
 * The toast domain model: what a caller may push and what the queue keeps.
 *
 * `ToastInput` is the boundary type. `ToastStore.push` decodes it, so an empty
 * title or an unknown tone fails there with a `SchemaError` and nothing is
 * queued — a half-toast never reaches the viewport.
 *
 * A toast has a **phase** because a promise toast is one card that changes
 * state, not a card that is replaced: `loading` never auto-dismisses, and the
 * success or failure step settles the same row. Base UI models the same split
 * with its `type: 'loading'` slot; here it is a decoded field, so a caller
 * cannot queue a loading card by accident through a tone.
 */

import { Effect } from "effect";
import * as Schema from "effect/Schema";

/** The status tone a toast carries: the four tones Alert and Badge also offer. */
export const ToastTone = Schema.Literals([
  "info",
  "success",
  "warning",
  "danger",
]);

/** See {@link ToastTone}. */
export type ToastTone = typeof ToastTone.Type;

/** Whether a toast is waiting on work or has its answer. */
export const ToastPhase = Schema.Literals(["loading", "settled"]);

/** See {@link ToastPhase}. */
export type ToastPhase = typeof ToastPhase.Type;

/** The tone a draft gets when it does not name one. */
const defaultTone: ToastTone = "info";

/** The phase a draft gets when it does not name one. */
const defaultPhase: ToastPhase = "settled";

/**
 * A duration a caller may write.
 *
 * `Schema.Duration` accepts the `Duration` object the examples use; the millis
 * form is Base UI's `timeout: 0`, the one spelling every toast document in the
 * wild uses for a sticky card (`duration: 0`). Both decode to a `Duration`, so
 * the store reads one type and `0` really means "never".
 */
const DurationInput = Schema.Union([
  Schema.Duration,
  Schema.DurationFromMillis,
]);

/** One labelled action a toast may offer, e.g. Undo. */
export class ToastAction extends Schema.Class<ToastAction>("ToastAction")({
  label: Schema.NonEmptyString,
}) {}

/**
 * What `push` accepts. `tone` defaults to `"info"` and `phase` to `"settled"`.
 * An absent `duration` uses the store's default; a duration that is not
 * positive and finite (zero or infinite) keeps the toast until it is dismissed.
 * `action` is the label of an optional action control; the handler is supplied
 * to `push` beside the draft, because a function cannot cross the schema
 * boundary.
 */
export class ToastInput extends Schema.Class<ToastInput>("ToastInput")({
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  action: Schema.OptionFromOptionalKey(ToastAction),
  tone: ToastTone.pipe(Schema.withDecodingDefault(Effect.succeed(defaultTone))),
  phase: ToastPhase.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPhase)),
  ),
  duration: Schema.OptionFromOptionalKey(DurationInput),
}) {}

/** A toast a caller may push, as plain data. */
export type ToastDraft = typeof ToastInput.Encoded;

/** One step of a promise toast: a draft, or the draft its answer produces. */
export type ToastPromiseStep<Value> =
  | ToastDraft
  | ((value: Value) => ToastDraft);

/** The draft a promise step resolves to. */
export const toastStep = <Value>(
  step: ToastPromiseStep<Value>,
  value: Value,
): ToastDraft => (typeof step === "function" ? step(value) : step);

/** A queued toast. `id` is the store's counter, so an id is never reused. */
export class Toast extends Schema.Class<Toast>("Toast")({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  action: Schema.OptionFromOptionalKey(ToastAction),
  tone: ToastTone,
  phase: ToastPhase,
}) {}
