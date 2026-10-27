/**
 * Browser preview for the Code block page.
 *
 * The native block paints a title bar — the file name on the start edge, the
 * language and the copy action on the end — an optional line-number gutter and
 * the tokenized source, each token a run in `syntaxColors(theme)`. The preview
 * draws the same chrome and the same palette, through the `--syntax-*` variables
 * the theme bridge publishes, so switching the platform style repaints the code.
 */

type SyntaxRole =
  | "boolean"
  | "comment"
  | "function"
  | "functionBuiltin"
  | "keyword"
  | "number"
  | "property"
  | "string"
  | "typeBuiltin"
  | "typeName";

interface Run {
  readonly text: string;
  readonly role?: SyntaxRole;
}

const run = (text: string, role?: SyntaxRole): Run => ({ text, role });

const lines: ReadonlyArray<ReadonlyArray<Run>> = [
  [
    run("import", "keyword"),
    run(" { "),
    run("Effect", "typeName"),
    run(" } "),
    run("from", "keyword"),
    run(" "),
    run('"effect"', "string"),
    run(";"),
  ],
  [],
  [run("type", "keyword"), run(" "), run("Charge", "typeName"), run(" = {")],
  [
    run("  "),
    run("cents", "property"),
    run(": "),
    run("number", "typeBuiltin"),
    run(";"),
  ],
  [
    run("  "),
    run("paid", "property"),
    run(": "),
    run("boolean", "typeBuiltin"),
    run(";"),
  ],
  [run("};")],
  [run("// Retry twice, then settle.", "comment")],
  [
    run("export", "keyword"),
    run(" "),
    run("const", "keyword"),
    run(" "),
    run("charge", "function"),
    run(" = ("),
    run("n"),
    run(": "),
    run("number", "typeBuiltin"),
    run(") =>"),
  ],
  [
    run("  "),
    run("Effect", "typeName"),
    run("."),
    run("map", "functionBuiltin"),
    run("("),
    run("settle", "function"),
    run("(n), (cents) => ({"),
  ],
  [
    run("    "),
    run("cents", "property"),
    run(": "),
    run("Math", "typeName"),
    run("."),
    run("round", "functionBuiltin"),
    run("(n * "),
    run("100", "number"),
    run("),"),
  ],
  [
    run("    "),
    run("paid", "property"),
    run(": "),
    run("true", "boolean"),
    run(","),
  ],
  [run("  }));")],
];

const CopyIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="14"
    viewBox="0 0 16 16"
    width="14"
  >
    <rect
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
      width="9"
      x="5"
      y="5"
    />
    <path
      d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

export function CodeBlockDemo() {
  return (
    <div className="gx-codeblock">
      <div className="gx-codeblock-head">
        <span className="gx-codeblock-title">src/charge.ts</span>
        <div className="gx-codeblock-actions">
          <span className="gx-codeblock-lang">ts</span>
          <button aria-label="Copy" className="gx-codeblock-copy" type="button">
            <CopyIcon />
          </button>
        </div>
      </div>
      <pre className="gx-codeblock-body">
        {lines.map((line, index) => (
          <span className="gx-codeblock-line" key={index}>
            <span aria-hidden="true" className="gx-codeblock-num">
              {index + 1}
            </span>
            <code className="gx-codeblock-code">
              {line.map((token, tokenIndex) =>
                token.role === undefined ? (
                  token.text
                ) : (
                  <span data-token={token.role} key={tokenIndex}>
                    {token.text}
                  </span>
                ),
              )}
            </code>
          </span>
        ))}
      </pre>
    </div>
  );
}

export const codeBlockDemoSource = `import { CodeBlock } from "@gpuixui/components/code-block";

<CodeBlock
  code={source}
  title="src/charge.ts"
  language="ts"
  lineNumbers
/>;`;
