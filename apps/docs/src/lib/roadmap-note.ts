/**
 * The roadmap's inline formatting rule (plan 518). `COMPONENTS.md` writes its
 * notes as Markdown-lite: `` `code` `` and `**strong**`, sometimes nested
 * (`**shadcn/ui's AI Elements \`chat\`**`). The generated module keeps the note
 * verbatim; this pure module is what turns it into spans the React page can
 * render without showing the punctuation.
 *
 * Browser-safe: no filesystem, no Node import. The derivation and its script
 * live in `roadmap.ts`.
 */

export type RoadmapSpan =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "strong"; readonly text: string };

const CODE_TOKEN = /`([^`]+)`/g;
const STRONG_TOKEN = /\*\*([\s\S]*?)\*\*/g;

/** `text` outside code, `code` inside backticks; the fallback kind carries bold. */
const splitCode = (
  text: string,
  plain: "text" | "strong",
): ReadonlyArray<RoadmapSpan> => {
  const matches = [...text.matchAll(CODE_TOKEN)];

  const { spans, cursor } = matches.reduce<{
    readonly spans: ReadonlyArray<RoadmapSpan>;
    readonly cursor: number;
  }>(
    (state, match) => {
      const index = match.index ?? 0;
      const code = match[1] ?? "";
      const before =
        index > state.cursor
          ? [{ kind: plain, text: text.slice(state.cursor, index) } as const]
          : [];
      return {
        spans: [...state.spans, ...before, { kind: "code", text: code }],
        cursor: index + match[0].length,
      };
    },
    { spans: [], cursor: 0 },
  );

  return [
    ...spans,
    ...(cursor < text.length
      ? [{ kind: plain, text: text.slice(cursor) } as const]
      : []),
  ].filter((span) => span.text.length > 0);
};

/**
 * Split a note into text, `code` and **strong** spans. Code inside bold is
 * still code; bold inside a code span is left alone.
 */
export const noteSpans = (note: string): ReadonlyArray<RoadmapSpan> => {
  const matches = [...note.matchAll(STRONG_TOKEN)];

  const { spans, cursor } = matches.reduce<{
    readonly spans: ReadonlyArray<RoadmapSpan>;
    readonly cursor: number;
  }>(
    (state, match) => {
      const index = match.index ?? 0;
      const content = match[1] ?? "";
      return {
        spans: [
          ...state.spans,
          ...splitCode(note.slice(state.cursor, index), "text"),
          ...splitCode(content, "strong"),
        ],
        cursor: index + match[0].length,
      };
    },
    { spans: [], cursor: 0 },
  );

  return [...spans, ...splitCode(note.slice(cursor), "text")].filter(
    (span) => span.text.length > 0,
  );
};

/** The note as one plain string, for search and assertions. */
export const plainNote = (note: string): string =>
  noteSpans(note)
    .map((span) => span.text)
    .join("");
