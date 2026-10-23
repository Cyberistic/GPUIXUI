/**
 * The markdown editor's rules: the view a mode names, the fence a preview must
 * close and the counts a status line prints.
 *
 * The runtime has no editable rich-text host — `<markdown>` renders, `<textarea>`
 * edits, and nothing joins them (the `editor-overlay` and `editor-surface`
 * probes measure the gap). So a "rich text" editor in this library edits the
 * **source** and previews it; this module is the part of that split worth
 * testing without a renderer.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import * as Schema from "effect/Schema";

/** The three views the editor offers. */
export const MARKDOWN_MODES = ["split", "source", "preview"] as const;

/** The three views the editor offers. */
export const MarkdownMode = Schema.Literals(MARKDOWN_MODES);
/** The three views the editor offers. */
export type MarkdownMode = typeof MarkdownMode.Type;

/** Whether a stored value is a view this editor paints. */
export const isMarkdownMode = Schema.is(MarkdownMode);

/** A view, or the fallback when a stored one is not a mode. */
export const modeOf = (
  value: unknown,
  fallback: MarkdownMode = "split",
): MarkdownMode => (isMarkdownMode(value) ? value : fallback);

/** A fence line: up to three spaces, then at least three ticks or tildes. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * The fence a preview must close, if any.
 *
 * An unclosed fence swallows every line after it, so the preview of a document
 * being written mid-block shows the rest of the page as one code block. The
 * **source** is not repaired: closing it here keeps the reader's text as they
 * typed it while the preview shows what they mean. Fences of the two families
 * are counted apart, because a `~~~` does not close a ``` block.
 */
export const openFence = (source: string): Option.Option<string> => {
  const state = Arr.reduce(
    Str.split(source, "\n"),
    { ticks: false, tildes: false },
    (open, line) => {
      const match = FENCE.exec(line);
      const marker = match?.[1];
      if (marker === undefined) return open;
      return Str.startsWith("`")(marker)
        ? { ...open, ticks: !open.ticks }
        : { ...open, tildes: !open.tildes };
    },
  );
  if (state.ticks) return Option.some("```");
  if (state.tildes) return Option.some("~~~");
  return Option.none();
};

/** The source with the fence a preview needs closed, and only that. */
export const closeFences = (source: string): string =>
  Option.match(openFence(source), {
    onNone: () => source,
    onSome: (fence) => `${source}\n${fence}`,
  });

/** What a status line prints about a document. */
export interface MarkdownStats {
  /** Lines, with an empty document at zero. */
  readonly lines: number;
  /** Whitespace-separated runs. */
  readonly words: number;
  /** Unicode code points, so an emoji counts once. */
  readonly characters: number;
}

/** The counts a status line prints, in code points rather than UTF-16 units. */
export const markdownStats = (source: string): MarkdownStats => ({
  lines: Str.isEmpty(source) ? 0 : Arr.length(Str.split(source, "\n")),
  words: Arr.length(Arr.filter(Str.split(source, /\s+/), Str.isNonEmpty)),
  characters: Arr.length(Arr.fromIterable(source)),
});

/** The status line's sentence. */
export const statsLabel = (stats: MarkdownStats): string =>
  `${stats.lines} ${stats.lines === 1 ? "line" : "lines"} · ${stats.words} ${
    stats.words === 1 ? "word" : "words"
  }`;
