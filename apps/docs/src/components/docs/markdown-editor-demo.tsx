import {
  MARKDOWN_MODES,
  markdownStats,
  statsLabel,
  type MarkdownMode,
} from "@gpuixui/editor/markdown/logic";
import { Match } from "effect";
import { useState, type ReactNode } from "react";
import { parseMarkdown, type MarkdownBlock } from "./markdown-preview";

/**
 * Browser preview for the MarkdownEditor page.
 *
 * The native editor edits the **source** and previews it through the runtime's
 * `<markdown>` host — it is the honest rich-text alternative, not a rich-text
 * field. The preview reads the same draft into DOM blocks (`markdown-preview.ts`
 * runs the package's own `closeFences` rule) and offers the same three views;
 * the split's divider is drawn at the component's default half, and the status
 * line is the package's own `statsLabel`.
 */

export const MARKDOWN_SAMPLE = `# Release notes

A **small** release with \`@gpuixui/editor\` fixes.

- The split keeps its size
- An unclosed fence is closed for the preview

\`\`\`ts
const value = "source";
\`\`\`
`;

const INLINE = /(`[^`]*`|\*\*[^*]+\*\*)/g;

/** A paragraph's bold and code runs, as the runtime's markdown host paints them. */
const inline = (text: string): ReactNode =>
  text
    .split(INLINE)
    .filter((part) => part !== "")
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={index}>{part}</span>
      ),
    );

const HEADINGS = ["h2", "h3", "h4", "h5", "h6"] as const;

const Block = ({ block }: { readonly block: MarkdownBlock }) =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("kind")({
      heading: (heading) => {
        const Tag =
          HEADINGS[Math.min(heading.level, HEADINGS.length) - 1] ?? "h2";
        return <Tag className="gx-md-heading">{inline(heading.text)}</Tag>;
      },
      paragraph: (paragraph) => <p>{inline(paragraph.text)}</p>,
      list: (list) => (
        <ul>
          {list.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ul>
      ),
      code: (code) => (
        <pre>
          <code>{code.text}</code>
        </pre>
      ),
    }),
  );

export const MarkdownEditorDemo = () => {
  const [source, setSource] = useState(MARKDOWN_SAMPLE);
  const [mode, setMode] = useState<MarkdownMode>("split");
  const stats = markdownStats(source);

  return (
    <div className="gx-md">
      <div className="gx-md-bar">
        <div className="gx-md-modes" role="group" aria-label="Editor view">
          {MARKDOWN_MODES.map((option) => (
            <button
              aria-pressed={mode === option}
              className="gx-btn gx-btn-secondary gx-btn-sm"
              key={option}
              onClick={() => setMode(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <span className="gx-md-status">{statsLabel(stats)}</span>
      </div>
      <div className="gx-md-body" data-mode={mode}>
        {mode === "preview" ? null : (
          <textarea
            aria-label="Markdown editor source"
            className="gx-md-source"
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            value={source}
          />
        )}
        {mode === "split" ? <span className="gx-md-divider" /> : null}
        {mode === "source" ? null : (
          <div className="gx-md-preview" aria-label="Markdown editor preview">
            {parseMarkdown(source).map((block, index) => (
              <Block block={block} key={index} />
            ))}
          </div>
        )}
      </div>
      <p className="gx-md-hint">
        The preview is the browser's rendering of the source; the shipped editor
        previews through the runtime's own markdown host.
      </p>
    </div>
  );
};

export const markdownEditorDemoSource = `import { MarkdownEditor } from "@gpuixui/editor";

<MarkdownEditor
  value={value}
  onValueChange={setValue}
  label="Release notes"
  width={640}
  height={300}
/>;`;
