/**
 * Effect/Schema validation through the `@tanstack/form-core` validator seam.
 *
 * form-core runs a validator per cause (`onMount`, `onChange`, `onBlur`,
 * `onSubmit`), passing the value it owns and reading the returned error. This
 * module adapts a `Schema.ConstraintDecoder` into that shape: `schemaValidator`
 * decodes the whole value with `Schema.decodeUnknownEffect` and returns a
 * `{ form, fields }` error, so form-core attaches each message to the field its
 * path names; `fieldSchemaValidator` decodes one field's value and returns its
 * first message. Both run the decode synchronously — a `ConstraintDecoder` pins
 * its decoding services to `never`, so `Effect.runSync` is safe.
 *
 * The module is DOM-free: it imports only form-core's validator *shape* (a
 * function of `{ value }`) and Effect, so it runs where `window` and `document`
 * are undefined (see `validator.test.ts`).
 */

import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { locatedMessages, type LocatedMessage } from "../validation/logic.js";

/**
 * The form-core error a whole-value decode produces: one form-level message and
 * the per-field messages keyed by the field path the schema issue named.
 */
export interface SchemaFormError {
  readonly form: string | undefined;
  readonly fields: Readonly<Record<string, ReadonlyArray<string>>>;
}

/**
 * A form-core validator: it reads the value form-core owns and returns an error
 * (`undefined` for none). The parameter names only `value` so the function is
 * assignable to every form-core validator slot, field and form alike.
 */
export type SchemaValidator = (props: { readonly value: unknown }) => unknown;

/** The form-core field name a property-key path maps to (`["a", 0]` → `a[0]`). */
const fieldName = (path: ReadonlyArray<PropertyKey>): string =>
  pipe(
    Arr.map(path, (segment, index) =>
      P.isNumber(segment)
        ? `[${String(segment)}]`
        : index === 0
          ? String(segment)
          : `.${String(segment)}`,
    ),
    Arr.join(""),
  );

const appendFieldError = (
  fields: Readonly<Record<string, ReadonlyArray<string>>>,
  name: string,
  message: string,
): Readonly<Record<string, ReadonlyArray<string>>> =>
  R.set(
    fields,
    name,
    Arr.append(
      Option.getOrElse(R.get(fields, name), () => []),
      message,
    ),
  );

/** The `{ form, fields }` error for every located message, in issue order. */
const toFormError = (
  messages: ReadonlyArray<LocatedMessage>,
): SchemaFormError => {
  const empty: {
    readonly form: Option.Option<string>;
    readonly fields: Readonly<Record<string, ReadonlyArray<string>>>;
  } = { form: Option.none(), fields: {} };
  const grouped = Arr.reduce(messages, empty, (acc, { path, message }) =>
    Arr.match(path, {
      onEmpty: () => ({
        form: Option.orElse(acc.form, () => Option.some(message)),
        fields: acc.fields,
      }),
      onNonEmpty: () => ({
        form: acc.form,
        fields: appendFieldError(acc.fields, fieldName(path), message),
      }),
    }),
  );
  return { form: Option.getOrUndefined(grouped.form), fields: grouped.fields };
};

/** Decode `value` with `schema`, `None` when it fails. */
export const decode =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Option.Option<T> => {
    const result = Effect.runSync(
      Schema.decodeUnknownEffect(schema)(value).pipe(Effect.result),
    );
    return Result.isFailure(result)
      ? Option.none()
      : Option.some(result.success);
  };

/** The first message a decode failure carries, `None` when `value` is accepted. */
const firstMessage =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Option.Option<string> => {
    const result = Effect.runSync(
      Schema.decodeUnknownEffect(schema)(value).pipe(Effect.result),
    );
    return Result.isFailure(result)
      ? Arr.head(
          Arr.map(
            locatedMessages(result.failure.issue),
            ({ message }) => message,
          ),
        )
      : Option.none<string>();
  };

/**
 * A form-level validator: decodes the whole value and returns the messages
 * mapped to fields, so form-core shows each failure on the field it belongs to.
 */
export const schemaValidator =
  <T>(schema: Schema.ConstraintDecoder<T>): SchemaValidator =>
  ({ value }) => {
    const result = Effect.runSync(
      Schema.decodeUnknownEffect(schema, { errors: "all" })(value).pipe(
        Effect.result,
      ),
    );
    return Result.isFailure(result)
      ? toFormError(locatedMessages(result.failure.issue))
      : undefined;
  };

/**
 * A field-level validator: decodes one field's value and returns its first
 * message, `undefined` when the schema accepts it.
 */
export const fieldSchemaValidator =
  <T>(schema: Schema.ConstraintDecoder<T>): SchemaValidator =>
  ({ value }) =>
    Option.getOrUndefined(firstMessage(schema)(value));
