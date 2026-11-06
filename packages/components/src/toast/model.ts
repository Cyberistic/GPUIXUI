import { Effect } from "effect";
import * as Schema from "effect/Schema";

export const ToastTone = Schema.Literals([
  "info",
  "success",
  "warning",
  "danger",
]);

export type ToastTone = typeof ToastTone.Type;

export const ToastPhase = Schema.Literals(["loading", "settled"]);

export type ToastPhase = typeof ToastPhase.Type;

const defaultTone: ToastTone = "info";

const defaultPhase: ToastPhase = "settled";

const DurationInput = Schema.Union([
  Schema.Duration,
  Schema.DurationFromMillis,
]);

export class ToastAction extends Schema.Class<ToastAction>("ToastAction")({
  label: Schema.NonEmptyString,
}) {}

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

export type ToastDraft = typeof ToastInput.Encoded;

export type ToastPromiseStep<Value> =
  | ToastDraft
  | ((value: Value) => ToastDraft);

export const toastStep = <Value>(
  step: ToastPromiseStep<Value>,
  value: Value,
): ToastDraft => (typeof step === "function" ? step(value) : step);

export class Toast extends Schema.Class<Toast>("Toast")({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  action: Schema.OptionFromOptionalKey(ToastAction),
  tone: ToastTone,
  phase: ToastPhase,
}) {}
