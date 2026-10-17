/**
 * The toast domain model: what a caller may push and what the queue keeps.
 *
 * `ToastInput` is the boundary type. `ToastStore.push` decodes it, so an empty
 * title or an unknown tone fails there with a `SchemaError` and nothing is
 * queued — a half-toast never reaches the viewport.
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

/** The tone a draft gets when it does not name one. */
const defaultTone: ToastTone = "info";

/**
 * What `push` accepts. `tone` defaults to `"info"`. An absent `duration` uses
 * the store's default; a duration that is not positive and finite (zero or
 * infinite) keeps the toast until it is dismissed.
 */
export class ToastInput extends Schema.Class<ToastInput>("ToastInput")({
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  tone: ToastTone.pipe(Schema.withDecodingDefault(Effect.succeed(defaultTone))),
  duration: Schema.OptionFromOptionalKey(Schema.Duration),
}) {}

/** A queued toast. `id` is the store's counter, so an id is never reused. */
export class Toast extends Schema.Class<Toast>("Toast")({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  tone: ToastTone,
}) {}
