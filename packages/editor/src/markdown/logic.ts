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

/** The fence a preview has open: its family and the length it must match. */
interface OpenFence {
  readonly family: "ticks" | "tildes";
  readonly length: number;
}

/**
 * Read one line against the fence a block opened with.
 *
 * A closing fence is at least as long as the opening one and carries nothing
 * after its run; a shorter run, or one followed by an info string, is content
 * inside the block. Reading either as a close would end the preview's block
 * early — the same swallowed document this module exists to prevent.
 */
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

/**
 * The fence a preview must close, if any.
 *
 * An unclosed fence swallows every line after it, so the preview of a document
 * being written mid-block shows the rest of the page as one code block. The
 * **source** is not repaired: closing it here keeps the reader's text as they
 * typed it while the preview shows what they mean. Fences of the two families
 * are counted apart, because a `~~~` does not close a ``` block, and the
 * returned marker is the opening run (`````` for a four-tick block).
 */
export const openFence = (source: string): Option.Option<string> =>
  Option.map(
    Arr.reduce(Str.split(source, "\n"), Option.none<OpenFence>(), foldFence),
    (held) => Str.repeat(held.length)(held.family === "ticks" ? "`" : "~"),
  );

/** The source with the fence a preview needs closed, and only that. */
export const closeFences = (source: string): string =>
  Option.match(openFence(source), {
    onNone: () => source,
    onSome: (fence) => `${source}\n${fence}`,
  });

/**
 * The document a stored value carries.
 *
 * A draft restored from storage, or read out of a saved record, writes `null`
 * where it carried no document. The status line and the preview read the text
 * directly, so that value threw out of the render instead of painting the empty
 * state the editor documents. The text is **not** trimmed: leading spaces and
 * newlines are the document's own.
 */
export const draftOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

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

/**
 * The share of the split a pane may take. A quarter each way keeps both views
 * readable and leaves the divider inside the editor at every width.
 */
const SPLIT_MIN_SHARE = 0.25;
const SPLIT_MAX_SHARE = 0.75;

/** The source pane's bounds for a body of `available` points. */
export const splitBounds = (
  available: number,
): { readonly min: number; readonly max: number } => {
  const width = Math.max(0, available);
  return {
    min: Math.floor(width * SPLIT_MIN_SHARE),
    max: Math.floor(width * SPLIT_MAX_SHARE),
  };
};

/**
 * The source pane a stored split names, held inside the view's band.
 *
 * A split restored from storage may be absent, unreadable or outside the band;
 * it reads as the middle of the body, so a saved NaN cannot paint a pane with
 * no width. A readable value steps to the nearest half-point and is clamped.
 */
export const splitOf = (value: unknown, available: number): number => {
  const { min, max } = splitBounds(available);
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), min), max)
    : Math.floor(Math.max(0, available) / 2);
};
