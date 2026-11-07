import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import * as Schema from "effect/Schema";

export const MARKDOWN_MODES = ["split", "source", "preview"] as const;

export const MarkdownMode = Schema.Literals(MARKDOWN_MODES);

export type MarkdownMode = typeof MarkdownMode.Type;

export const isMarkdownMode = Schema.is(MarkdownMode);

export const modeOf = (
  value: unknown,
  fallback: MarkdownMode = "split",
): MarkdownMode => (isMarkdownMode(value) ? value : fallback);

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

interface OpenFence {
  readonly family: "ticks" | "tildes";
  readonly length: number;
}

const foldFence = (
  open: Option.Option<OpenFence>,
  line: string,
): Option.Option<OpenFence> => {
  const match = FENCE.exec(line);
  const marker = match?.[1];
  if (match === null || marker === undefined) return open;
  const family = Str.startsWith("`")(marker) ? "ticks" : "tildes";
  const rest = Str.trim(Str.slice(match[0].length)(line));
  return Option.match(open, {
    onNone: () => Option.some({ family, length: marker.length }),
    onSome: (held) =>
      held.family === family &&
      marker.length >= held.length &&
      Str.isEmpty(rest)
        ? Option.none()
        : open,
  });
};

export const openFence = (source: string): Option.Option<string> =>
  Option.map(
    Arr.reduce(Str.split(source, "\n"), Option.none<OpenFence>(), foldFence),
    (held) => Str.repeat(held.length)(held.family === "ticks" ? "`" : "~"),
  );

export const closeFences = (source: string): string =>
  Option.match(openFence(source), {
    onNone: () => source,
    onSome: (fence) =>
      Str.endsWith("\n")(source) ? `${source}${fence}` : `${source}\n${fence}`,
  });

export { draftOf } from "../internal/text.js";

export interface MarkdownStats {
  readonly lines: number;

  readonly words: number;

  readonly characters: number;
}

export const markdownStats = (source: string): MarkdownStats => ({
  lines: Str.isEmpty(source) ? 0 : Arr.length(Str.split(source, "\n")),
  words: Arr.length(Arr.filter(Str.split(source, /\s+/), Str.isNonEmpty)),
  characters: Arr.length(Arr.fromIterable(source)),
});

export const statsLabel = (stats: MarkdownStats): string =>
  `${stats.lines} ${stats.lines === 1 ? "line" : "lines"} · ${stats.words} ${
    stats.words === 1 ? "word" : "words"
  }`;

const SPLIT_MIN_SHARE = 0.25;
const SPLIT_MAX_SHARE = 0.75;

export const splitBounds = (
  available: number,
): { readonly min: number; readonly max: number } => {
  const width = Math.max(0, available);
  return {
    min: Math.floor(width * SPLIT_MIN_SHARE),
    max: Math.floor(width * SPLIT_MAX_SHARE),
  };
};

export const splitOf = (value: unknown, available: number): number => {
  const { min, max } = splitBounds(available);
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), min), max)
    : Math.floor(Math.max(0, available) / 2);
};
