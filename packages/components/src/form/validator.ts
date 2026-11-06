import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { locatedMessages, type LocatedMessage } from "../validation/logic.js";

export interface SchemaFormError {
  readonly form: string | undefined;
  readonly fields: Readonly<Record<string, ReadonlyArray<string>>>;
}

export type SchemaValidator = (props: { readonly value: unknown }) => unknown;

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

export const fieldSchemaValidator =
  <T>(schema: Schema.ConstraintDecoder<T>): SchemaValidator =>
  ({ value }) =>
    Option.getOrUndefined(firstMessage(schema)(value));
