/**
 * Schema-to-message validation for form fields: `validate` yields the first
 * user-facing message and `validateAll` every distinct one.
 *
 * Message text is always the schema's own — `SchemaIssue.makeFormatterDefault`,
 * the formatter the runtime uses for `SchemaError.message` — so a `message`
 * annotation on a check reaches the user verbatim and a raw issue never does.
 * This module only decides how many messages a caller sees, and in what order.
 */

import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";

const format = SchemaIssue.makeFormatterDefault();

/**
 * `SchemaIssue` exports no refinements, and `Match`'s object patterns do not
 * match these class instances, so the two tags the walk needs are matched here.
 */
const isTag =
  <T extends SchemaIssue.Issue["_tag"]>(tag: T) =>
  (
    issue: SchemaIssue.Issue,
  ): issue is Extract<SchemaIssue.Issue, { _tag: T }> =>
    issue._tag === tag;

/**
 * Every message an issue carries, in issue order.
 *
 * A `Composite` reports one failure per field, so all of its messages are kept.
 * `Pointer` and `Encoding` only record where the failure was — the JSON pointer
 * to the field, and the class's encode/decode seam — so both are transparent and
 * the path is dropped: the caller already knows which field it asked about. Any
 * other node (a filter, a union) reads as one message.
 */
const messagesOf = (issue: SchemaIssue.Issue): ReadonlyArray<string> =>
  Match.value(issue).pipe(
    Match.when(isTag("Composite"), (composite) =>
      Arr.flatMap(composite.issues, messagesOf),
    ),
    Match.when(isTag("Pointer"), (pointer) => messagesOf(pointer.issue)),
    Match.when(isTag("Encoding"), (encoding) => messagesOf(encoding.issue)),
    Match.orElse((leaf) => Arr.of(format(leaf))),
  );

/**
 * The first message `validateAll` would report for `value`, or `None` when the
 * schema accepts it. Reading the walk rather than `SchemaError.message` keeps
 * the two functions consistent: the runtime's own message keeps the field's
 * JSON pointer, which a form has no use for.
 *
 * `Schema.ConstraintDecoder` pins the decoding services to `never`: messages are
 * read synchronously, so a schema whose decode needs a service is rejected at
 * the type level rather than failing at run time.
 */
export const validate =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Effect.Effect<Option.Option<string>> => {
    const result = Schema.decodeUnknownResult(schema)(value);
    return Effect.succeed(
      Result.isFailure(result)
        ? pipe(messagesOf(result.failure.issue), Arr.head)
        : Option.none<string>(),
    );
  };

/** One schema failure, located by its key path in the decoded input. */
export interface FieldMessage {
  /** Root-first keys; `[]` for a failure on the value itself. */
  readonly path: ReadonlyArray<PropertyKey>;
  /** The schema's own message for this issue. */
  readonly message: string;
}

/** Key-by-key equality, so a nested path and its prefix are not equal. */
const samePath = (
  left: ReadonlyArray<PropertyKey>,
  right: ReadonlyArray<PropertyKey>,
): boolean =>
  Arr.length(left) === Arr.length(right) &&
  Arr.every(left, (key, index) => key === right[index]);

/**
 * Every failure a located walk finds, with the path accumulated from the
 * enclosing `Pointer` nodes. A `Composite` holds one child per failing field, so
 * all of them are kept; `Encoding` only records the class seam and is
 * transparent.
 */
const fieldMessagesOf = (
  issue: SchemaIssue.Issue,
  path: ReadonlyArray<PropertyKey> = [],
): ReadonlyArray<FieldMessage> =>
  Match.value(issue).pipe(
    Match.when(isTag("Composite"), (composite) =>
      Arr.flatMap(composite.issues, (child) => fieldMessagesOf(child, path)),
    ),
    Match.when(isTag("Pointer"), (pointer) =>
      fieldMessagesOf(pointer.issue, Arr.appendAll(path, pointer.path)),
    ),
    Match.when(isTag("Encoding"), (encoding) =>
      fieldMessagesOf(encoding.issue, path),
    ),
    Match.orElse((leaf) => [{ path, message: format(leaf) }]),
  );

/**
 * Every distinct failure with the path that produced it, in issue order.
 *
 * Duplicates are removed only when both the path and the message match: one
 * message on two fields is two entries, because each belongs under its own
 * control. Decoding runs with `errors: "all"` for the same reason.
 */
export const validateFields =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Effect.Effect<ReadonlyArray<FieldMessage>> => {
    const result = Schema.decodeUnknownResult(schema, { errors: "all" })(value);
    return Effect.succeed(
      Result.isFailure(result)
        ? Arr.dedupeWith(
            fieldMessagesOf(result.failure.issue),
            (left, right) =>
              samePath(left.path, right.path) && left.message === right.message,
          )
        : [],
    );
  };

/** A single key is one segment; an array is already a path. */
const toPath = (
  path: PropertyKey | ReadonlyArray<PropertyKey>,
): ReadonlyArray<PropertyKey> =>
  Match.value(path).pipe(
    Match.when(P.isString, (key) => [key]),
    Match.when(P.isNumber, (key) => [key]),
    Match.when(P.isSymbol, (key) => [key]),
    Match.orElse((segments) => segments),
  );

/**
 * The message located at `path`, or `None`. A single key addresses a top-level
 * field; pass an array for a nested path.
 */
export const fieldMessageAt = (
  fields: ReadonlyArray<FieldMessage>,
  path: PropertyKey | ReadonlyArray<PropertyKey>,
): Option.Option<string> => {
  const wanted = toPath(path);
  return pipe(
    Arr.findFirst(fields, (field) => samePath(field.path, wanted)),
    Option.map((field) => field.message),
  );
};

/**
 * Whether two validation passes report exactly the same failures, in the same
 * order. `Form` and `MultiStepForm` use it to keep the previous array identity
 * when a re-check finds nothing new, so an unrelated re-render cannot repaint.
 */
export const sameFieldMessages = (
  left: ReadonlyArray<FieldMessage>,
  right: ReadonlyArray<FieldMessage>,
): boolean =>
  Arr.length(left) === Arr.length(right) &&
  Arr.every(
    Arr.zip(left, right),
    ([leftField, rightField]) =>
      samePath(leftField.path, rightField.path) &&
      leftField.message === rightField.message,
  );

/**
 * Every distinct message `schema` produces for `value`, in issue order, so a
 * field's message appears where the schema declared it.
 *
 * Decoding runs with `errors: "all"` — the runtime's default stops at the first
 * failing field, which is why `validate` and this function disagree on purpose.
 * The messages are the located walk's, deduplicated across fields.
 */
export const validateAll =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Effect.Effect<ReadonlyArray<string>> =>
    Effect.map(validateFields(schema)(value), (fields) =>
      Arr.dedupe(Arr.map(fields, (field) => field.message)),
    );
