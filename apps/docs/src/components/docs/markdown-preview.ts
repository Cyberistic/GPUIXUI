import { closeFences } from "@gpuixui/editor/markdown/logic";
import * as Option from "effect/Option";

/**
 * The markdown editor preview's block reader.
 *
 * The native editor's preview is the runtime's own `<markdown>` host; a browser
 * page has no such element, so the preview reads the same source into the four
 * blocks a reader expects — a heading, a paragraph, a list and a fenced block —
 * and renders them as DOM. `closeFences` is the package's rule, so a document
 * being written mid-fence previews as the block it means instead of swallowing
 * the rest of the page.
 */

export type MarkdownBlock =
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "list"; readonly items: ReadonlyArray<string> }
  | { readonly kind: "code"; readonly text: string };

interface State {
  readonly blocks: ReadonlyArray<MarkdownBlock>;
  readonly paragraph: ReadonlyArray<string>;
  readonly list: ReadonlyArray<string>;
  /** The open fence's lines; `None` between blocks. */
  readonly fence: Option.Option<ReadonlyArray<string>>;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;

const empty: State = {
  blocks: [],
  paragraph: [],
  list: [],
  fence: Option.none(),
};

/** End the paragraph and the list, leaving any open fence alone. */
const flush = (state: State): State => ({
  blocks: [
    ...state.blocks,
    ...(state.paragraph.length === 0
      ? []
      : [{ kind: "paragraph" as const, text: state.paragraph.join(" ") }]),
    ...(state.list.length === 0
      ? []
      : [{ kind: "list" as const, items: state.list }]),
  ],
  paragraph: [],
  list: [],
  fence: state.fence,
});

const step = (held: State, line: string): State =>
  Option.match(held.fence, {
    onSome: (lines) =>
      line.startsWith("```")
        ? {
            blocks: [...held.blocks, { kind: "code", text: lines.join("\n") }],
            paragraph: [],
            list: [],
            fence: Option.none(),
          }
        : { ...held, fence: Option.some([...lines, line]) },
    onNone: () => {
      if (line.startsWith("```")) {
        return { ...flush(held), fence: Option.some([]) };
      }
      const heading = HEADING.exec(line);
      if (heading !== null) {
        const flushed = flush(held);
        return {
          ...flushed,
          blocks: [
            ...flushed.blocks,
            {
              kind: "heading",
              level: heading[1]?.length ?? 1,
              text: heading[2] ?? "",
            },
          ],
        };
      }
      const bullet = BULLET.exec(line);
      if (bullet !== null) {
        return {
          ...held,
          paragraph: [],
          list: [...held.list, bullet[1] ?? ""],
        };
      }
      return line.trim() === ""
        ? flush(held)
        : {
            ...held,
            list: [],
            paragraph: [...held.paragraph, line.trim()],
          };
    },
  });

/** The blocks a source renders, with an unclosed fence closed first. */
export const parseMarkdown = (source: string): ReadonlyArray<MarkdownBlock> =>
  flush(closeFences(source).split("\n").reduce(step, empty)).blocks;
