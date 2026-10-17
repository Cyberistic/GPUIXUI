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

/**
 * Every distinct message `schema` produces for `value`, in issue order, so a
 * field's message appears where the schema declared it.
 *
 * Decoding runs with `errors: "all"` — the runtime's default stops at the first
 * failing field, which is why `validate` and this function disagree on purpose.
 */
export const validateAll =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Effect.Effect<ReadonlyArray<string>> => {
    const result = Schema.decodeUnknownResult(schema, { errors: "all" })(value);
    return Effect.succeed(
      Result.isFailure(result)
        ? pipe(messagesOf(result.failure.issue), Arr.dedupe)
        : [],
    );
  };
