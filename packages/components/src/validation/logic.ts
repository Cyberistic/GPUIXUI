import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";

const format = SchemaIssue.makeFormatterDefault();

const isTag =
  <T extends SchemaIssue.Issue["_tag"]>(tag: T) =>
  (
    issue: SchemaIssue.Issue,
  ): issue is Extract<SchemaIssue.Issue, { _tag: T }> =>
    issue._tag === tag;

export interface LocatedMessage {
  readonly path: ReadonlyArray<PropertyKey>;

  readonly message: string;
}

export const locatedMessages = (
  issue: SchemaIssue.Issue,
  prefix: ReadonlyArray<PropertyKey> = [],
): ReadonlyArray<LocatedMessage> =>
  Match.value(issue).pipe(
    Match.when(isTag("Composite"), (composite) =>
      Arr.flatMap(composite.issues, (child) => locatedMessages(child, prefix)),
    ),
    Match.when(isTag("Pointer"), (pointer) =>
      locatedMessages(pointer.issue, Arr.appendAll(prefix, pointer.path)),
    ),
    Match.when(isTag("Encoding"), (encoding) =>
      locatedMessages(encoding.issue, prefix),
    ),
    Match.orElse((leaf) => [{ path: prefix, message: format(leaf) }]),
  );

const messagesOf = (issue: SchemaIssue.Issue): ReadonlyArray<string> =>
  Arr.map(locatedMessages(issue), ({ message }) => message);

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
