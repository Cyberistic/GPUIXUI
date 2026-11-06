import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export interface MentionQuery {
  readonly start: number;
  readonly query: string;
}

export const mentionQuery = (text: string): Option.Option<MentionQuery> => {
  const at = Str.lastIndexOf("@")(text);
  if (Option.isNone(at)) return Option.none();
  const start = at.value;
  const before = start === 0 ? "" : Str.slice(start - 1, start)(text);
  const query = Str.slice(start + 1)(text);
  if (before !== "" && before !== " " && before !== "\n") return Option.none();
  if (Str.includes(" ")(query) || Str.includes("\n")(query)) {
    return Option.none();
  }
  return Option.some({ start, query });
};

export const applyMention = (
  text: string,
  start: number,
  value: string,
): string => `${Str.slice(0, start)(text)}@${value} `;

export const mentionMaxVisible = 6;

export const normalizeMaxVisible = (maxVisible: number): number =>
  Number.isNaN(maxVisible)
    ? mentionMaxVisible
    : Math.max(0, Math.floor(maxVisible));

export const rankMentions = (
  values: ReadonlyArray<string>,
  query: string,
  maxVisible: number,
): ReadonlyArray<string> => {
  const needle = Str.toLowerCase(query);
  const matches = Arr.filter(values, (value) =>
    Str.includes(needle)(Str.toLowerCase(value)),
  );
  const prefixes = Arr.filter(matches, (value) =>
    Str.startsWith(needle)(Str.toLowerCase(value)),
  );
  const rest = Arr.filter(
    matches,
    (value) => !Str.startsWith(needle)(Str.toLowerCase(value)),
  );
  return Arr.take(
    Arr.appendAll(prefixes, rest),
    normalizeMaxVisible(maxVisible),
  );
};
